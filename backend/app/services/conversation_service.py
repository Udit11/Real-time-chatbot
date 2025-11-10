"""
Conversation service for managing chat sessions and context
"""

import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import Conversation, Message, MessageSender, ConversationStatus
from ..database import get_redis


class ConversationService:
    """Service for managing conversation sessions and context"""

    def __init__(self, db: Session):
        self.db = db
        self.redis_client = get_redis()
        self.context_window_size = 10  # Number of messages to keep in context
        self.context_summary_threshold = 20  # Messages before creating summary

    async def create_conversation(
        self,
        session_id: str,
        user_id: Optional[str] = None,
        avatar_id: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation session"""
        conversation = Conversation(
            session_id=session_id,
            user_id=user_id or session_id,  # Use session_id as user_id for anonymous users
            avatar_id=avatar_id,
            status=ConversationStatus.ACTIVE
        )

        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)

        # Cache conversation context
        await self._cache_conversation_context(conversation)

        return conversation

    async def get_conversation(self, session_id: str) -> Optional[Conversation]:
        """Get conversation by session ID"""
        # Try cache first
        cached_context = await self.redis_client.get(f"conversation:{session_id}")
        if cached_context:
            context_data = json.loads(cached_context)
            conversation = self.db.query(Conversation).filter(
                Conversation.session_id == session_id
            ).first()
            if conversation:
                return conversation

        # Get from database
        conversation = self.db.query(Conversation).filter(
            Conversation.session_id == session_id
        ).first()

        if conversation:
            await self._cache_conversation_context(conversation)

        return conversation

    async def get_active_conversation(self, session_id: str) -> Optional[Conversation]:
        """Get active conversation for session"""
        return self.db.query(Conversation).filter(
            Conversation.session_id == session_id,
            Conversation.status == ConversationStatus.ACTIVE
        ).first()

    async def add_message(
        self,
        session_id: str,
        sender: MessageSender,
        content: str,
        message_type: str = "text",
        metadata: Optional[Dict] = None,
        intent_classification: Optional[str] = None,
        entities_extracted: Optional[List[Dict]] = None,
        sentiment: Optional[float] = None
    ) -> Optional[Message]:
        """Add message to conversation"""
        conversation = await self.get_active_conversation(session_id)
        if not conversation:
            return None

        message = Message(
            conversation_id=conversation.id,
            sender=sender,
            content=content,
            message_type=message_type,
            metadata=metadata or {},
            intent_classification=intent_classification,
            entities_extracted=entities_extracted or [],
            sentiment=sentiment or 0.0,
            timestamp=datetime.utcnow()
        )

        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        # Update conversation context
        await self._update_conversation_context(conversation, message)

        return message

    async def get_conversation_context(
        self,
        session_id: str,
        limit: Optional[int] = None
    ) -> Dict:
        """Get conversation context for NLP processing"""
        # Try cache first
        cached_context = await self.redis_client.get(f"conversation:{session_id}")
        if cached_context:
            context_data = json.loads(cached_context)

            # Apply limit if specified
            if limit and len(context_data["messages"]) > limit:
                context_data["messages"] = context_data["messages"][-limit:]

            return context_data

        # Build context from database
        conversation = await self.get_conversation(session_id)
        if not conversation:
            return {"messages": [], "summary": "", "total_messages": 0}

        messages = self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.timestamp.asc()).all()

        message_list = [
            {
                "sender": msg.sender.value,
                "content": msg.content,
                "message_type": msg.message_type.value,
                "timestamp": msg.timestamp.isoformat(),
                "sentiment": msg.sentiment,
                "intent_classification": msg.intent_classification,
                "entities_extracted": msg.entities_extracted
            }
            for msg in messages
        ]

        context_data = {
            "messages": message_list,
            "summary": conversation.context_summary or "",
            "total_messages": len(message_list),
            "session_id": session_id,
            "avatar_id": str(conversation.avatar_id) if conversation.avatar_id else None,
            "user_id": conversation.user_id
        }

        # Cache the context
        await self.redis_client.setex(
            f"conversation:{session_id}",
            3600,  # 1 hour TTL
            json.dumps(context_data)
        )

        return context_data

    async def get_recent_messages(
        self,
        session_id: str,
        limit: int = 10
    ) -> List[Message]:
        """Get recent messages for context window"""
        conversation = await self.get_active_conversation(session_id)
        if not conversation:
            return []

        return self.db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(desc(Message.timestamp)).limit(limit).all()

    async def update_context_summary(self, session_id: str) -> Optional[str]:
        """Generate and update context summary for long conversations"""
        context = await self.get_conversation_context(session_id)
        if context["total_messages"] < self.context_summary_threshold:
            return context["summary"]

        # Generate summary from recent messages
        recent_messages = context["messages"][-self.context_window_size:]
        summary = await self._generate_summary(recent_messages)

        # Update conversation in database
        conversation = await self.get_conversation(session_id)
        if conversation:
            conversation.context_summary = summary
            self.db.commit()

            # Update cache
            context["summary"] = summary
            await self.redis_client.setex(
                f"conversation:{session_id}",
                3600,
                json.dumps(context)
            )

        return summary

    async def check_escalation_triggers(self, session_id: str) -> Dict:
        """Check if conversation should be escalated to human agent"""
        context = await self.get_conversation_context(session_id)
        recent_messages = context["messages"][-5:]  # Last 5 messages

        # Check escalation triggers
        escalation_reasons = []

        # 1. Negative sentiment trigger
        negative_sentiment_count = sum(
            1 for msg in recent_messages
            if msg.get("sentiment", 0) < -0.6
        )
        if negative_sentiment_count >= 3:
            escalation_reasons.append("high_negative_sentiment")

        # 2. Escalation intent trigger
        escalation_intents = ["escalation", "human", "agent", "representative", "manager"]
        for msg in recent_messages:
            if msg.get("intent_classification") in escalation_intents:
                escalation_reasons.append("escalation_intent")
                break

        # 3. Failed resolution attempts (placeholder - would need actual tracking)
        if context["total_messages"] > 20:
            escalation_reasons.append("long_conversation")

        # 4. Frustration keywords
        frustration_keywords = ["frustrated", "angry", "disappointed", "useless", "helpless"]
        for msg in recent_messages:
            content_lower = msg.get("content", "").lower()
            if any(keyword in content_lower for keyword in frustration_keywords):
                escalation_reasons.append("frustration_keywords")
                break

        return {
            "should_escalate": len(escalation_reasons) > 0,
            "reasons": escalation_reasons,
            "confidence": min(len(escalation_reasons) * 0.3, 1.0)
        }

    async def escalate_conversation(
        self,
        session_id: str,
        reason: str,
        human_agent_id: Optional[str] = None
    ) -> bool:
        """Escalate conversation to human agent"""
        conversation = await self.get_active_conversation(session_id)
        if not conversation:
            return False

        conversation.status = ConversationStatus.ESCALATED
        conversation.escalation_triggered = True
        conversation.escalated_to_human = human_agent_id or "available_agent"

        self.db.commit()

        # Update cache
        await self._cache_conversation_context(conversation)

        # Log escalation event
        await self._log_conversation_event(
            session_id,
            "escalation_triggered",
            {"reason": reason, "agent_id": human_agent_id}
        )

        return True

    async def end_conversation(self, session_id: str, reason: str = "user_ended") -> bool:
        """End conversation session"""
        conversation = await self.get_active_conversation(session_id)
        if not conversation:
            return False

        conversation.status = ConversationStatus.ENDED
        self.db.commit()

        # Update cache
        await self._cache_conversation_context(conversation)

        # Log end event
        await self._log_conversation_event(
            session_id,
            "conversation_ended",
            {"reason": reason}
        )

        return True

    async def get_conversation_statistics(self, session_id: str) -> Dict:
        """Get conversation statistics and metrics"""
        context = await self.get_conversation_context(session_id)
        messages = context["messages"]

        if not messages:
            return {
                "total_messages": 0,
                "user_messages": 0,
                "avatar_messages": 0,
                "average_sentiment": 0.0,
                "conversation_duration": 0,
                "intents_detected": [],
                "entities_extracted": []
            }

        user_messages = [msg for msg in messages if msg["sender"] == "user"]
        avatar_messages = [msg for msg in messages if msg["sender"] == "avatar"]

        # Calculate sentiment metrics
        sentiments = [msg.get("sentiment", 0) for msg in messages if msg.get("sentiment") is not None]
        average_sentiment = sum(sentiments) / len(sentiments) if sentiments else 0.0

        # Extract unique intents and entities
        intents = list(set(msg.get("intent_classification") for msg in messages if msg.get("intent_classification")))
        all_entities = []
        for msg in messages:
            all_entities.extend(msg.get("entities_extracted", []))

        # Calculate conversation duration
        if len(messages) >= 2:
            start_time = datetime.fromisoformat(messages[0]["timestamp"])
            end_time = datetime.fromisoformat(messages[-1]["timestamp"])
            duration_seconds = (end_time - start_time).total_seconds()
        else:
            duration_seconds = 0

        return {
            "total_messages": len(messages),
            "user_messages": len(user_messages),
            "avatar_messages": len(avatar_messages),
            "average_sentiment": average_sentiment,
            "conversation_duration": duration_seconds,
            "intents_detected": intents,
            "entities_extracted": all_entities
        }

    async def _cache_conversation_context(self, conversation: Conversation):
        """Cache conversation context in Redis"""
        context_data = {
            "conversation_id": str(conversation.id),
            "session_id": conversation.session_id,
            "user_id": conversation.user_id,
            "avatar_id": str(conversation.avatar_id) if conversation.avatar_id else None,
            "status": conversation.status.value,
            "summary": conversation.context_summary or "",
            "messages": [],  # Will be populated on first message
            "total_messages": 0
        }

        await self.redis_client.setex(
            f"conversation:{conversation.session_id}",
            3600,  # 1 hour TTL
            json.dumps(context_data)
        )

    async def _update_conversation_context(self, conversation: Conversation, message: Message):
        """Update conversation context with new message"""
        cache_key = f"conversation:{conversation.session_id}"
        cached_context = await self.redis_client.get(cache_key)

        if cached_context:
            context_data = json.loads(cached_context)

            # Add new message
            message_data = {
                "sender": message.sender.value,
                "content": message.content,
                "message_type": message.message_type.value,
                "timestamp": message.timestamp.isoformat(),
                "sentiment": message.sentiment,
                "intent_classification": message.intent_classification,
                "entities_extracted": message.entities_extracted
            }

            context_data["messages"].append(message_data)
            context_data["total_messages"] += 1

            # Update conversation status
            context_data["status"] = conversation.status.value

            # Keep only recent messages in cache
            if len(context_data["messages"]) > self.context_window_size * 2:
                context_data["messages"] = context_data["messages"][-self.context_window_size:]

            await self.redis_client.setex(cache_key, 3600, json.dumps(context_data))

    async def _generate_summary(self, messages: List[Dict]) -> str:
        """Generate conversation summary from messages"""
        # Simple summary generation - in production, this would use NLP
        user_messages = [msg["content"] for msg in messages if msg["sender"] == "user"]
        avatar_messages = [msg["content"] for msg in messages if msg["sender"] == "avatar"]

        # Extract key topics (simplified)
        all_text = " ".join(user_messages).lower()

        topics = []
        if "help" in all_text:
            topics.append("help request")
        if "question" in all_text or "?" in all_text:
            topics.append("questions")
        if "problem" in all_text or "issue" in all_text:
            topics.append("problem resolution")
        if "information" in all_text or "details" in all_text:
            topics.append("information seeking")

        topic_str = ", ".join(topics) if topics else "general conversation"

        return f"Conversation covered {topic_str} with {len(user_messages)} user messages and {len(avatar_messages)} responses."

    async def _log_conversation_event(self, session_id: str, event_type: str, event_data: Dict):
        """Log conversation events for analytics"""
        event = {
            "event_type": event_type,
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": event_data
        }

        # Store in Redis for analytics processing
        await self.redis_client.lpush(
            f"conversation_events:{session_id}",
            json.dumps(event)
        )

        # Keep only last 100 events per session
        await self.redis_client.ltrim(f"conversation_events:{session_id}", 0, 99)