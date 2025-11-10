"""
CORS middleware configuration
"""

from fastapi.middleware.cors import CORSMiddleware
from ..config import settings


def add_cors_middleware(app):
    """Add CORS middleware to the FastAPI application"""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin, settings.chat_widget_url, "*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )