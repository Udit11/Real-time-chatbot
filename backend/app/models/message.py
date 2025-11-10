"""
Message model for individual chat messages
"""

import enum
from sqlalchemy import Column, String, ForeignKey, Text, JSON, Float, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from app.database import Base


class MessageType(enum.Enum):
    TEXT = "text"
    VOICE = "voice"
    IMAGE = "image"
    FILE = "file"


class MessageSender(enum.Enum):
    USER = "user"
    AVATAR = "avatar"
    HUMAN_AGENT = "human_agent"


class Message(BaseModel):
    __tablename__ = "messages"

    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False)
    sender = Column(Enum(MessageSender), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(Enum(MessageType), default=MessageType.TEXT)
    meta = Column(JSON, default=dict)
    intent_classification = Column(String, index=True)
    entities_extracted = Column(JSON, default=list)
    sentiment = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=BaseModel.created_at)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")