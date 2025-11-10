"""
Analytics and performance tracking models
"""

import enum
from sqlalchemy import Column, String, ForeignKey, Integer, Float, JSON, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from app.database import Base


class AnalyticsEventType(enum.Enum):
    CONVERSATION_STARTED = "conversation_started"
    CONVERSATION_ENDED = "conversation_ended"
    MESSAGE_SENT = "message_sent"
    MESSAGE_RECEIVED = "message_received"
    ESCALATION_TRIGGERED = "escalation_triggered"
    AVATAR_CONFIGURATION_CHANGED = "avatar_configuration_changed"


class Analytics(BaseModel):
    __tablename__ = "analytics"

    event_type = Column(Enum(AnalyticsEventType), nullable=False, index=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    avatar_id = Column(UUID(as_uuid=True), ForeignKey("avatars.id"))
    user_id = Column(String, index=True)
    session_id = Column(String, index=True)
    event_data = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=BaseModel.created_at, index=True)

    # Relationships
    conversation = relationship("Conversation")
    avatar = relationship("Avatar")


class ABTest(BaseModel):
    __tablename__ = "ab_tests"

    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    avatar_a_id = Column(UUID(as_uuid=True), ForeignKey("avatars.id"), nullable=False)
    avatar_b_id = Column(UUID(as_uuid=True), ForeignKey("avatars.id"), nullable=False)
    traffic_split = Column(Integer, default=50)  # Percentage for variant A
    is_active = Column(Boolean, default=True)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    winner_avatar_id = Column(UUID(as_uuid=True), ForeignKey("avatars.id"))
    metrics = Column(JSON, default=dict)

    # Relationships
    creator = relationship("User", back_populates="ab_tests")
    avatar_a = relationship("Avatar", foreign_keys=[avatar_a_id])
    avatar_b = relationship("Avatar", foreign_keys=[avatar_b_id])
    winner_avatar = relationship("Avatar", foreign_keys=[winner_avatar_id])


class TrainingData(BaseModel):
    __tablename__ = "training_data"

    category = Column(String, index=True, nullable=False)
    intent = Column(String, index=True, nullable=False)
    user_input = Column(Text, nullable=False)
    avatar_response = Column(Text, nullable=False)
    context = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    quality_score = Column(Float, default=0.0)
    usage_count = Column(Integer, default=0)