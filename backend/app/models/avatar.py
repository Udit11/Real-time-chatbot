"""
Avatar model for chatbot personality and appearance configuration
"""

from sqlalchemy import Column, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import BaseModel
from app.database import Base


class Avatar(BaseModel):
    __tablename__ = "avatars"

    name = Column(String, nullable=False, index=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    visual_appearance = Column(JSON, default=dict)
    voice_characteristics = Column(JSON, default=dict)
    personality_traits = Column(JSON, default=dict)
    animation_behaviors = Column(JSON, default=list)
    branding_elements = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True, index=True)

    # Relationships
    owner = relationship("User", back_populates="avatars")
    conversations = relationship("Conversation", back_populates="avatar")