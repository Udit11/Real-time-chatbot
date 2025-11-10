"""
Database models initialization
"""

from .base import Base
from .user import User
from .avatar import Avatar
from .conversation import Conversation, ConversationStatus
from .message import Message, MessageType, MessageSender
from .analytics import Analytics, ABTest, TrainingData, AnalyticsEventType
from sqlalchemy.orm import declarative_base

Base = declarative_base()

__all__ = [
    "Base",
    "User",
    "Avatar",
    "Conversation",
    "ConversationStatus",
    "Message",
    "MessageType",
    "MessageSender",
    "Analytics",
    "ABTest",
    "TrainingData",
    "AnalyticsEventType"
]