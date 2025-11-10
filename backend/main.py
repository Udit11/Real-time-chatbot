"""
Main FastAPI application entry point
"""

import uvicorn
from fastapi import FastAPI, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os


from app.database import get_db, engine
from app.models import Base
from app.middleware import add_cors_middleware
from app.config import settings
from app.routers import chat_gen
# Create database tables
Base.metadata.create_all(bind=engine)
load_dotenv()
# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
    version="1.0.0"
)

app.include_router(chat_gen.router)
# Add middleware
add_cors_middleware(app)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Real-Time Chatbot API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0"
    }


# Include routers
from app.routers import chat, avatar
from app.services import start_heartbeat

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(avatar.router, prefix="/api/avatars", tags=["avatars"])

# Start background tasks
@app.on_event("startup")
async def startup_event():
    """Initialize background services"""
    await start_heartbeat()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )