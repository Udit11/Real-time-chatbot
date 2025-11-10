"""
Application configuration settings
"""

from pydantic_settings import BaseSettings
from typing import Optional
from uuid import UUID


class Settings(BaseSettings):
    # Server
    app_name: str = "Real-Time Chatbot"
    debug: bool = True
    host: str = "0.0.0.0"
    port: int = 8000

    # Database
    database_url: str = "postgresql://username:password@localhost:5432/chatbot_db"
    redis_url: str = "redis://localhost:6379"

    # APIs
    google_gemini_api_key: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    cloudinary_cloud_name: Optional[str] = None
    cloudinary_api_key: Optional[str] = None
    cloudinary_api_secret: Optional[str] = None
    default_creator_id: Optional[UUID] = None


    # Security
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    cors_origin: str = "http://localhost:3000"

    # Chat Widget
    chat_widget_url: str = "http://localhost:3001"

    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()