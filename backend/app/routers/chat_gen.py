# app/routers/chat_gen.py
import os
import io
import uuid
import base64
import asyncio
import re
import json
from typing import List, Optional, Dict
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, root_validator
from sqlalchemy.orm import Session

# Adjust these imports to your project structure if needed
from app.database import get_db
from app.models import Avatar
from app.services.avatar_service import AvatarService
from app.utils import tts_utils

import edge_tts
import google.generativeai as genai

router = APIRouter()

# ==============================
# Pydantic models
# ==============================
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None
    sentiment: Optional[str] = None


class ChatRequest(BaseModel):
    avatar_id: Optional[str] = Field(None, description="UUID of avatar or 'new'")
    messages: Optional[List[ChatMessage]] = None
    message: Optional[str] = None
    session_id: Optional[str] = None  # For context retention
    image_base64: Optional[str] = None  # For image input
    audio_base64: Optional[str] = None  # For voice input

    @root_validator(pre=True)
    def promote_message_to_messages(cls, values):
        if not values.get("messages") and values.get("message"):
            values["messages"] = [{"role": "user", "content": values["message"]}]
        return values


class SentimentResponse(BaseModel):
    sentiment: str  # positive, negative, neutral, urgent
    confidence: float
    intent: str  # question, complaint, request, casual
    should_escalate: bool
    reason: Optional[str] = None


# ==============================
# In-memory session storage (use Redis in production)
# ==============================
SESSION_STORE: Dict[str, List[ChatMessage]] = {}
SENTIMENT_THRESHOLD = 0.7  # Threshold for escalation


# ==============================
# Config
# ==============================
GEMINI_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")


# ==============================
# Helpers
# ==============================
def clean_text_for_tts(text: str) -> str:
    """Remove markdown and special characters for natural TTS."""
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    text = re.sub(r'^#+\s+', '', text, flags=re.MULTILINE)
    text = re.sub(r'```[^`]*```', '', text, flags=re.DOTALL)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
    text = re.sub(r'[/\\|<>{}[\]~]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_avatar_id(avatar_id_str: Optional[str]) -> Optional[uuid.UUID]:
    if not avatar_id_str or avatar_id_str == "new":
        return None
    try:
        return uuid.UUID(avatar_id_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="avatar_id must be a valid UUID or 'new'")


async def analyze_sentiment(text: str) -> SentimentResponse:
    """
    Analyze sentiment and intent from user message.
    Returns sentiment analysis with escalation recommendation.
    """
    # Simple keyword-based analysis (replace with ML model in production)
    text_lower = text.lower()
    
    # Negative indicators
    negative_words = ['angry', 'frustrated', 'terrible', 'awful', 'hate', 'worst', 
                     'disappointed', 'useless', 'horrible', 'problem', 'issue', 'broken']
    urgent_words = ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'help']
    
    # Positive indicators
    positive_words = ['great', 'good', 'thanks', 'excellent', 'love', 'perfect', 
                     'awesome', 'wonderful', 'happy', 'appreciate']
    
    # Intent indicators
    question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'can', 'could', 'would']
    complaint_words = ['complaint', 'complain', 'issue', 'problem', 'not working', 'broken']
    
    # Calculate scores
    negative_count = sum(1 for word in negative_words if word in text_lower)
    urgent_count = sum(1 for word in urgent_words if word in text_lower)
    positive_count = sum(1 for word in positive_words if word in text_lower)
    
    # Determine sentiment
    if urgent_count > 0 or negative_count >= 3:
        sentiment = "urgent"
        confidence = 0.85
        should_escalate = True
        reason = "High negative sentiment detected" if negative_count >= 3 else "Urgent request detected"
    elif negative_count > positive_count:
        sentiment = "negative"
        confidence = 0.75
        should_escalate = negative_count >= 2
        reason = "Multiple negative indicators" if should_escalate else None
    elif positive_count > negative_count:
        sentiment = "positive"
        confidence = 0.8
        should_escalate = False
        reason = None
    else:
        sentiment = "neutral"
        confidence = 0.6
        should_escalate = False
        reason = None
    
    # Determine intent
    if any(word in text_lower for word in complaint_words):
        intent = "complaint"
    elif any(text_lower.startswith(word) for word in question_words):
        intent = "question"
    elif "please" in text_lower or "need" in text_lower or "want" in text_lower:
        intent = "request"
    else:
        intent = "casual"
    
    return SentimentResponse(
        sentiment=sentiment,
        confidence=confidence,
        intent=intent,
        should_escalate=should_escalate,
        reason=reason
    )


async def call_gemini(messages: List[ChatMessage], max_words: int = 100, image_data: Optional[bytes] = None) -> str:
    """
    Call Gemini with optional image input.
    """
    if not GEMINI_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key missing")

    genai.configure(api_key=GEMINI_KEY)
    
    # Use vision model if image provided
    model_name = "gemini-2.0-flash-exp" if image_data else "gemini-2.5-flash"
    model = genai.GenerativeModel(model_name)

    formatted = []
    system_prompt = f"Keep responses under {max_words} words. Be helpful, friendly, and concise."
    
    for i, m in enumerate(messages):
        role = m.role.lower()
        content = m.content
        
        if i == 0 and role == "user":
            content = f"{system_prompt}\n\n{content}"
        
        # For image input on last message
        if i == len(messages) - 1 and role == "user" and image_data:
            parts = [content]
            # Add image part
            parts.append({
                "mime_type": "image/jpeg",
                "data": image_data
            })
            formatted.append({"role": "user", "parts": parts})
        elif role == "user":
            formatted.append({"role": "user", "parts": [content]})
        else:
            formatted.append({"role": "model", "parts": [content]})

    try:
        def _generate():
            resp = model.generate_content(formatted)
            return resp

        response = await asyncio.to_thread(_generate)
        reply_text = ""
        if not response:
            raise Exception("empty response from Gemini")
        reply_text = getattr(response, "text", None) or str(response)
        reply_text = reply_text.strip()
        
        words = reply_text.split()
        if len(words) > max_words:
            reply_text = ' '.join(words[:max_words]) + '...'
        
        return reply_text or "I couldn't generate a reply."
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API call failed: {e}")


async def synthesize_edge_tts_to_bytes(text: str, voice_shortname: str, rate: str = "+0%", pitch: str = "+0Hz") -> bytes:
    """Synthesize speech with Edge TTS."""
    try:
        clean_text = clean_text_for_tts(text)
        communicate = edge_tts.Communicate(clean_text, voice=voice_shortname, rate=rate, pitch=pitch)
        audio_buf = bytearray()

        async for msg in communicate.stream():
            if not isinstance(msg, dict):
                continue
            if msg.get("type") == "audio" and msg.get("data"):
                data = msg["data"]
                if isinstance(data, (bytes, bytearray)):
                    audio_buf.extend(data)
                elif isinstance(data, str):
                    try:
                        audio_buf.extend(base64.b64decode(data))
                    except Exception:
                        audio_buf.extend(data.encode("utf-8"))
        return bytes(audio_buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Edge TTS synthesis failed: {e}")


def get_or_create_session(session_id: Optional[str]) -> tuple[str, List[ChatMessage]]:
    """Get existing session or create new one."""
    if not session_id:
        session_id = str(uuid.uuid4())
        SESSION_STORE[session_id] = []
    elif session_id not in SESSION_STORE:
        SESSION_STORE[session_id] = []
    
    return session_id, SESSION_STORE[session_id]


def save_session(session_id: str, messages: List[ChatMessage]):
    """Save conversation to session store."""
    SESSION_STORE[session_id] = messages[-50:]  # Keep last 50 messages


# ==============================
# Endpoints
# ==============================

@router.post("/api/chat/generate")
async def generate_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Main chat endpoint with all features:
    - Text/voice/image input
    - Context retention
    - Sentiment analysis
    - Auto-escalation
    """
    if not payload.messages or len(payload.messages) == 0:
        raise HTTPException(
            status_code=422,
            detail=[{"loc": ["body", "messages"], "msg": "Field required", "type": "missing"}],
        )

    # Get or create session
    session_id, session_history = get_or_create_session(payload.session_id)
    
    # Get last user message
    last_message = payload.messages[-1].content
    
    # Analyze sentiment
    sentiment_analysis = await analyze_sentiment(last_message)
    
    # Process image if provided
    image_bytes = None
    if payload.image_base64:
        try:
            image_bytes = base64.b64decode(payload.image_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {e}")
    
    # Combine session history with new messages
    full_context = session_history + payload.messages
    
    # Load avatar
    avatar_uuid = parse_avatar_id(payload.avatar_id)
    avatar_obj = None
    if avatar_uuid:
        avatar_obj = db.query(Avatar).filter(Avatar.id == avatar_uuid).first()
        if not avatar_obj:
            raise HTTPException(status_code=404, detail="Avatar not found")
    else:
        # === START: Minimal AB test selection block ===
        # If avatar_id is "new" or not provided, attempt to pick avatar from active AB test.
        # This is intentionally minimal: if no ABTest model exists, this block does nothing.
        try:
            # Attempt to import ABTest model (optional)
            from app.models.ab_test import ABTest  # type: ignore
            # Find first active AB test (adjust field names if your ABTest model differs)
            active_test = db.query(ABTest).filter(ABTest.is_active == True).first()
            if active_test:
                # simple deterministic pick based on session_id
                sid = session_id or str(uuid.uuid4())
                import hashlib
                h = hashlib.sha256(f"{active_test.id}:{sid}".encode("utf-8")).hexdigest()
                v = int(h[:8], 16) % 100
                variant = "A" if v < getattr(active_test, "traffic_split", 50) else "B"
                chosen_id = getattr(active_test, "avatar_a_id", None) if variant == "A" else getattr(active_test, "avatar_b_id", None)
                if chosen_id:
                    avatar_obj = db.query(Avatar).filter(Avatar.id == chosen_id).first()
        except Exception:
            # If AB test model doesn't exist or any error happens, silently continue with avatar_obj = None
            avatar_obj = avatar_obj
        # === END: Minimal AB test selection block ===

    # Check if should escalate to human
    if sentiment_analysis.should_escalate:
        escalation_msg = f"I understand this is {sentiment_analysis.sentiment}. Let me connect you with a human agent who can better assist you."
        
        # Generate voice for escalation
        voice_config = tts_utils.get_voice_config(
            avatar_obj.voice_characteristics if avatar_obj else {"gender": "female", "tone": "warm_friendly"}
        )
        audio_bytes = await synthesize_edge_tts_to_bytes(
            escalation_msg,
            voice_config["voice"],
            voice_config.get("rate", "+0%"),
            voice_config.get("pitch", "+0Hz")
        )
        
        return JSONResponse({
            "reply": escalation_msg,
            "voice_shortname": voice_config["voice"],
            "audio_base64": base64.b64encode(audio_bytes).decode("utf-8"),
            "session_id": session_id,
            "sentiment": sentiment_analysis.dict(),
            "escalated": True,
            "escalation_reason": sentiment_analysis.reason
        })

    # Call Gemini with context
    reply_text = await call_gemini(full_context, max_words=100, image_data=image_bytes)
    clean_reply = clean_text_for_tts(reply_text)

    # Add to session history
    full_context.append(ChatMessage(
        role="assistant",
        content=clean_reply,
        timestamp=datetime.now().isoformat(),
        sentiment=sentiment_analysis.sentiment
    ))
    save_session(session_id, full_context)

    # Get voice config
    voice_config = tts_utils.get_voice_config(
        avatar_obj.voice_characteristics if avatar_obj else {"gender": "female", "tone": "warm_friendly"}
    )
    
    # Synthesize audio
    audio_bytes = await synthesize_edge_tts_to_bytes(
        clean_reply,
        voice_config["voice"],
        voice_config.get("rate", "+0%"),
        voice_config.get("pitch", "+0Hz")
    )
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return JSONResponse({
        "reply": clean_reply,
        "voice_shortname": voice_config["voice"],
        "audio_base64": audio_b64,
        "session_id": session_id,
        "sentiment": sentiment_analysis.dict(),
        "escalated": False,
        "context_length": len(full_context)
    })


@router.post("/api/chat/transcribe")
async def transcribe_audio(audio_base64: str = Form(...)):
    """
    Transcribe audio to text using Web Speech API on client side.
    This is a placeholder - actual transcription happens in browser.
    For server-side transcription, integrate Whisper or Google Speech-to-Text.
    """
    return JSONResponse({
        "text": "Server-side transcription placeholder",
        "note": "Use browser Web Speech API for real-time transcription"
    })


@router.get("/api/chat/session/{session_id}")
async def get_session(session_id: str):
    """Retrieve conversation history for a session."""
    if session_id not in SESSION_STORE:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return JSONResponse({
        "session_id": session_id,
        "messages": [msg.dict() for msg in SESSION_STORE[session_id]],
        "message_count": len(SESSION_STORE[session_id])
    })


@router.delete("/api/chat/session/{session_id}")
async def clear_session(session_id: str):
    """Clear conversation history for a session."""
    if session_id in SESSION_STORE:
        del SESSION_STORE[session_id]
    
    return JSONResponse({"message": "Session cleared", "session_id": session_id})


@router.post("/api/avatar/{avatar_id}/synthesize")
async def synthesize_avatar_text(avatar_id: str, payload: Dict[str, str], db: Session = Depends(get_db)):
    """Synthesize arbitrary text with avatar's voice."""
    text = payload.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Missing text in request body")

    service = AvatarService(db)
    avatar = await service.get_avatar(avatar_id)
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    voice_config = tts_utils.get_voice_config(avatar.voice_characteristics or {})
    clean_text = clean_text_for_tts(text)
    
    audio_bytes = await synthesize_edge_tts_to_bytes(
        clean_text,
        voice_config["voice"],
        voice_config.get("rate", "+0%"),
        voice_config.get("pitch", "+0Hz")
    )
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

    return {"voice_shortname": voice_config["voice"], "audio_base64": audio_b64}
