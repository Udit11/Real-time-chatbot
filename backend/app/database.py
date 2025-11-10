# app/database.py
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, declarative_base, Session
import redis
from app.config.settings import settings  # adjust if your settings path differs

# Engine (Postgres)
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Shared metadata and Base for all models
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Redis client factory (keep if used)
try:
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
except Exception:
    redis_client = None

def get_redis():
    return redis_client
