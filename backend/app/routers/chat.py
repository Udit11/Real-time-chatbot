"""
Chat router with WebSocket endpoints for real-time communication
"""

import json
import uuid
from typing import Dict, Optional
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Avatar, Conversation, Message, MessageType, MessageSender
from ..services.websocket_service import manager
from ..config import settings

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    """Main WebSocket endpoint for chat communication"""
    try:
        # Accept connection
        metadata = {
            "user_agent": websocket.headers.get("user-agent", ""),
            "client_ip": websocket.client.host if websocket.client else "unknown"
        }
        await manager.connect(websocket, session_id, metadata)

        # Get or create conversation
        conversation = await get_or_create_conversation(db, session_id)

        # Send welcome message with avatar info
        if conversation and conversation.avatar:
            avatar_config = {
                "name": conversation.avatar.name,
                "visual_appearance": conversation.avatar.visual_appearance,
                "voice_characteristics": conversation.avatar.voice_characteristics,
                "personality_traits": conversation.avatar.personality_traits
            }

            welcome_message = {
                "type": "system_message",
                "content": f"Hello! I'm {conversation.avatar.name}. How can I help you today?",
                "sender": "avatar",
                "timestamp": datetime.utcnow().isoformat(),
                "avatar_config": avatar_config
            }
            await manager.send_message(session_id, welcome_message)

        # Handle ongoing messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)

                # Update last activity
                await manager.update_presence(session_id, "online")

                # Process message based on type
                await handle_message(db, session_id, conversation, message_data)

            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                error_message = {
                    "type": "error",
                    "content": "Invalid message format",
                    "timestamp": datetime.utcnow().isoformat()
                }
                await manager.send_message(session_id, error_message)

    except WebSocketDisconnect:
        pass
    finally:
        # Clean up connection
        await manager.disconnect(session_id)


async def get_or_create_conversation(db: Session, session_id: str) -> Optional[Conversation]:
    """Get existing conversation or create new one with default avatar"""
    conversation = db.query(Conversation).filter(
        Conversation.session_id == session_id,
        Conversation.status == "active"
    ).first()

    if not conversation:
        # Get a default avatar (first active one)
        default_avatar = db.query(Avatar).filter(Avatar.is_active == True).first()
        if default_avatar:
            conversation = Conversation(
                session_id=session_id,
                user_id=session_id,  # Using session_id as user_id for anonymous users
                avatar_id=default_avatar.id,
                status="active"
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

    return conversation


async def handle_message(
    db: Session,
    session_id: str,
    conversation: Optional[Conversation],
    message_data: Dict
):
    """Process incoming WebSocket message"""
    message_type = message_data.get("type", "text")

    if message_type == "text":
        await handle_text_message(db, session_id, conversation, message_data)
    elif message_type == "typing_start":
        await manager.set_typing(session_id, True, "global")
    elif message_type == "typing_stop":
        await manager.set_typing(session_id, False, "global")
    elif message_type == "voice":
        await handle_voice_message(db, session_id, conversation, message_data)
    elif message_type == "media_upload":
        await handle_media_upload(db, session_id, conversation, message_data)
    else:
        # Unknown message type
        error_message = {
            "type": "error",
            "content": f"Unknown message type: {message_type}",
            "timestamp": datetime.utcnow().isoformat()
        }
        await manager.send_message(session_id, error_message)


async def handle_text_message(
    db: Session,
    session_id: str,
    conversation: Optional[Conversation],
    message_data: Dict
):
    """Handle text message from user"""
    if not conversation:
        return

    content = message_data.get("content", "").strip()
    if not content:
        return

    # Save user message to database
    user_message = Message(
        conversation_id=conversation.id,
        sender=MessageSender.USER,
        content=content,
        message_type=MessageType.TEXT,
        timestamp=datetime.utcnow()
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # Echo user message back (for confirmation)
    echo_message = {
        "type": "message",
        "id": str(user_message.id),
        "sender": "user",
        "content": content,
        "timestamp": user_message.timestamp.isoformat()
    }
    await manager.send_message(session_id, echo_message)

    # Generate avatar response (placeholder for now)
    avatar_response_content = await generate_avatar_response(conversation, content)

    # Save avatar response to database
    avatar_message = Message(
        conversation_id=conversation.id,
        sender=MessageSender.AVATAR,
        content=avatar_response_content,
        message_type=MessageType.TEXT,
        timestamp=datetime.utcnow()
    )
    db.add(avatar_message)
    db.commit()
    db.refresh(avatar_message)

    # Send avatar response to user
    response_message = {
        "type": "message",
        "id": str(avatar_message.id),
        "sender": "avatar",
        "content": avatar_response_content,
        "timestamp": avatar_message.timestamp.isoformat(),
        "typing_duration": 1500  # Simulate typing delay
    }

    # Show typing indicator first
    typing_message = {
        "type": "typing_indicator",
        "sender": "avatar",
        "is_typing": True,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_message(session_id, typing_message)

    # Send actual response after delay
    import asyncio
    await asyncio.sleep(1.5)
    await manager.send_message(session_id, response_message)


async def handle_voice_message(
    db: Session,
    session_id: str,
    conversation: Optional[Conversation],
    message_data: Dict
):
    """Handle voice message from user"""
    # Placeholder for voice processing
    processing_message = {
        "type": "system_message",
        "content": "Voice message received. Processing...",
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_message(session_id, processing_message)


async def handle_media_upload(
    db: Session,
    session_id: str,
    conversation: Optional[Conversation],
    message_data: Dict
):
    """Handle media/file upload from user"""
    # Placeholder for media processing
    processing_message = {
        "type": "system_message",
        "content": "Media file received. Processing...",
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_message(session_id, processing_message)


async def generate_avatar_response(conversation: Conversation, user_message: str) -> str:
    """Generate avatar response to user message (placeholder)"""
    # This is a simple placeholder - will be replaced with NLP service integration
    avatar_name = conversation.avatar.name if conversation.avatar else "Assistant"

    # Simple response logic
    user_message_lower = user_message.lower()
    if any(greeting in user_message_lower for greeting in ["hello", "hi", "hey"]):
        return f"Hello there! I'm {avatar_name}. How can I assist you today?"
    elif any(question in user_message_lower for question in ["how are you", "how do you do"]):
        return f"I'm doing great, thank you for asking! As {avatar_name}, I'm here to help you with any questions you might have."
    elif "help" in user_message_lower:
        return f"I'd be happy to help! I can assist with answering questions, providing information, or just having a conversation. What would you like to know?"
    elif any(goodbye in user_message_lower for goodbye in ["bye", "goodbye", "see you"]):
        return f"It was great talking with you! Feel free to come back anytime if you need more help. Goodbye!"
    else:
        return f"That's interesting! Thank you for sharing that with me. Is there anything specific I can help you with regarding what you've mentioned?"


@router.get("/conversations/{session_id}")
async def get_conversation_history(
    session_id: str,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Get conversation history for a session"""
    conversation = db.query(Conversation).filter(
        Conversation.session_id == session_id
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.timestamp.desc()).limit(limit).all()

    return {
        "conversation_id": str(conversation.id),
        "session_id": session_id,
        "avatar_id": str(conversation.avatar_id),
        "status": conversation.status.value,
        "messages": [
            {
                "id": str(msg.id),
                "sender": msg.sender.value,
                "content": msg.content,
                "message_type": msg.message_type.value,
                "timestamp": msg.timestamp.isoformat()
            }
            for msg in reversed(messages)
        ]
    }


@router.post("/conversations/{session_id}/end")
async def end_conversation(
    session_id: str,
    db: Session = Depends(get_db)
):
    """End a conversation"""
    conversation = db.query(Conversation).filter(
        Conversation.session_id == session_id,
        Conversation.status == "active"
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Active conversation not found")

    conversation.status = "ended"
    db.commit()

    # Send end message to user if connected
    end_message = {
        "type": "conversation_ended",
        "content": "Thank you for chatting! Your conversation has been ended.",
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.send_message(session_id, end_message)

    return {"message": "Conversation ended successfully"}