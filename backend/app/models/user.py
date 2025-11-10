"""
User model for admin authentication
"""

from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel
from app.database import Base

class User(BaseModel):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Relationships
    avatars = relationship("Avatar", back_populates="owner")
    ab_tests = relationship("ABTest", back_populates="creator")