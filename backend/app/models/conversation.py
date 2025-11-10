"""
Conversation model for chat sessions
"""

import enum
from sqlalchemy import Column, String, ForeignKey, Float, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from app.database import Base


class ConversationStatus(enum.Enum):
    ACTIVE = "active"
    ENDED = "ended"
    ESCALATED = "escalated"


class Conversation(BaseModel):
    __tablename__ = "conversations"

    session_id = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, index=True)  # Can be anonymous user identifier
    avatar_id = Column(UUID(as_uuid=True), ForeignKey("avatars.id"), nullable=False)
    status = Column(Enum(ConversationStatus), default=ConversationStatus.ACTIVE)
    context_summary = Column(Text)
    sentiment_score = Column(Float, default=0.0)
    escalation_triggered = Column(Boolean, default=False)
    escalated_to_human = Column(String)  # Human agent identifier if escalated

    # Relationships
    avatar = relationship("Avatar", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")