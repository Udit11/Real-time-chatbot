"""
WebSocket service for managing real-time connections and events
"""

import json
import asyncio
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
import uuid
import logging
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..database import get_db, get_redis
from ..models import Avatar, Conversation

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and sessions"""

    def __init__(self):
        # Active connections by session_id
        self.active_connections: Dict[str, WebSocket] = {}

        # Session metadata
        self.session_metadata: Dict[str, dict] = {}

        # Room-based connections for future multi-user support
        self.room_connections: Dict[str, Set[str]] = {}

        # Typing indicators
        self.typing_users: Dict[str, Set[str]] = {}

        # Redis client for distributed sessions (may be None if not available)
        self.redis_client = None
        self.redis_available: bool = False
        self.in_memory_store: Dict[str, Dict[str, Any]] = {}

        # Try to obtain Redis client and verify connectivity
        try:
            rc = get_redis()
            # ping in a thread because redis-py is blocking
            asyncio.get_event_loop().run_until_complete(self._check_redis(rc))
            self.redis_client = rc
            self.redis_available = True
            logger.info("Connected to Redis for websocket session storage.")
        except Exception as e:
            logger.warning("Redis not available for websocket sessions: %s. Falling back to in-memory store.", e)
            self.redis_client = None
            self.redis_available = False

    async def _check_redis(self, rc):
        """Helper to ping redis using thread executor."""
        try:
            await asyncio.to_thread(rc.ping)
        except Exception as e:
            raise

    async def _hset(self, name: str, *args, mapping: Optional[Dict[str, Any]] = None):
        """
        Async-safe helper for HSET with fallback to in-memory store.
        Accepts either mapping=<dict> or name, key, value pairs.
        """
        # Normalize items into dict
        items: Dict[str, Any] = {}
        if mapping:
            items.update(mapping)
        else:
            # args like key, value, key2, value2
            for i in range(0, len(args), 2):
                try:
                    k = args[i]
                    v = args[i + 1]
                except IndexError:
                    break
                items[k] = v

        if self.redis_available and self.redis_client:
            try:
                # redis-py hset signature: hset(name, mapping=...)
                return await asyncio.to_thread(self.redis_client.hset, name, mapping=items)
            except Exception as e:
                logger.error("Redis hset failed, falling back to memory store: %s", e)
                self.redis_available = False

        # Fallback to in-memory store (simple emulation)
        if name not in self.in_memory_store:
            self.in_memory_store[name] = {}
        for k, v in items.items():
            self.in_memory_store[name][k] = v
        return 1

    async def _hgetall(self, name: str):
        """Get all fields for a hash (Redis HGETALL) with fallback."""
        if self.redis_available and self.redis_client:
            try:
                return await asyncio.to_thread(self.redis_client.hgetall, name)
            except Exception as e:
                logger.error("Redis hgetall failed, falling back to memory store: %s", e)
                self.redis_available = False

        return self.in_memory_store.get(name, {}).copy()

    async def _hdel(self, name: str, *keys: str):
        """Delete fields from a hash with fallback."""
        if self.redis_available and self.redis_client:
            try:
                return await asyncio.to_thread(self.redis_client.hdel, name, *keys)
            except Exception as e:
                logger.error("Redis hdel failed, falling back to memory store: %s", e)
                self.redis_available = False

        if name in self.in_memory_store:
            for k in keys:
                self.in_memory_store[name].pop(k, None)
            return 1
        return 0

    async def connect(self, websocket: WebSocket, session_id: str, metadata: dict = None):
        """Accept WebSocket connection and register session"""
        await websocket.accept()

        self.active_connections[session_id] = websocket
        self.session_metadata[session_id] = {
            "connected_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "status": "online",
            **(metadata or {})
        }

        # Store in Redis (or memory) for distributed access
        await self._hset(
            f"session:{session_id}",
            mapping={
                "status": "online",
                "connected_at": self.session_metadata[session_id]["connected_at"],
                "last_activity": self.session_metadata[session_id]["last_activity"]
            }
        )

        # Broadcast presence update
        await self.broadcast_presence_update(session_id, "online")

    async def disconnect(self, session_id: str):
        """Handle WebSocket disconnection"""
        if session_id in self.active_connections:
            try:
                del self.active_connections[session_id]
            except Exception:
                pass

        if session_id in self.session_metadata:
            self.session_metadata[session_id]["status"] = "offline"
            self.session_metadata[session_id]["disconnected_at"] = datetime.utcnow().isoformat()

        # Update Redis (or memory)
        await self._hset(
            f"session:{session_id}",
            mapping={
                "status": "offline",
                "disconnected_at": datetime.utcnow().isoformat()
            }
        )

        # Remove from typing indicators
        if session_id in self.typing_users:
            del self.typing_users[session_id]

        # Broadcast presence update
        await self.broadcast_presence_update(session_id, "offline")

    async def send_message(self, session_id: str, message: dict):
        """Send message to specific session"""
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            try:
                await websocket.send_text(json.dumps(message))
                # Update last activity
                self.session_metadata[session_id]["last_activity"] = datetime.utcnow().isoformat()
                await self._hset(
                    f"session:{session_id}",
                    "last_activity",
                    self.session_metadata[session_id]["last_activity"]
                )
            except Exception as e:
                logger.exception("Error sending message; disconnecting session %s: %s", session_id, e)
                # Connection might be broken, disconnect
                await self.disconnect(session_id)

    async def broadcast_to_room(self, room_id: str, message: dict, exclude_session: str = None):
        """Broadcast message to all sessions in a room"""
        if room_id in self.room_connections:
            disconnected_sessions = []
            for session_id in list(self.room_connections[room_id]):
                if session_id != exclude_session:
                    if session_id in self.active_connections:
                        await self.send_message(session_id, message)
                    else:
                        disconnected_sessions.append(session_id)

            # Clean up disconnected sessions
            for session_id in disconnected_sessions:
                self.room_connections[room_id].discard(session_id)

    async def set_typing(self, session_id: str, is_typing: bool, room_id: str = None):
        """Set typing indicator for a session"""
        if is_typing:
            if room_id:
                if room_id not in self.typing_users:
                    self.typing_users[room_id] = set()
                self.typing_users[room_id].add(session_id)
        else:
            if room_id and room_id in self.typing_users:
                self.typing_users[room_id].discard(session_id)

        # Broadcast typing update
        typing_message = {
            "type": "typing_indicator",
            "session_id": session_id,
            "is_typing": is_typing,
            "room_id": room_id,
            "timestamp": datetime.utcnow().isoformat()
        }

        if room_id:
            await self.broadcast_to_room(room_id, typing_message, exclude_session=session_id)

    async def update_presence(self, session_id: str, status: str):
        """Update presence status for a session"""
        if session_id in self.session_metadata:
            self.session_metadata[session_id]["status"] = status
            self.session_metadata[session_id]["last_activity"] = datetime.utcnow().isoformat()

            # Update Redis (or memory)
            await self._hset(
                f"session:{session_id}",
                mapping={
                    "status": status,
                    "last_activity": self.session_metadata[session_id]["last_activity"]
                }
            )

            # Broadcast presence update
            await self.broadcast_presence_update(session_id, status)

    async def broadcast_presence_update(self, session_id: str, status: str):
        """Broadcast presence status update"""
        presence_message = {
            "type": "presence_update",
            "session_id": session_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }

        # Broadcast to relevant rooms or globally
        await self.broadcast_to_room("global", presence_message)

    async def get_online_sessions(self) -> List[str]:
        """Get list of currently online sessions"""
        online_sessions = []
        for session_id, metadata in self.session_metadata.items():
            if metadata.get("status") == "online":
                online_sessions.append(session_id)
        return online_sessions

    async def heartbeat(self):
        """Periodic heartbeat to maintain connection health"""
        while True:
            await asyncio.sleep(30)  # 30-second heartbeat

            current_time = datetime.utcnow()
            expired_sessions = []

            # Check for expired connections
            for session_id, metadata in list(self.session_metadata.items()):
                if metadata.get("status") == "online":
                    try:
                        last_activity = datetime.fromisoformat(metadata["last_activity"])
                    except Exception:
                        last_activity = current_time
                    if (current_time - last_activity).seconds > 120:  # 2 minutes timeout
                        expired_sessions.append(session_id)

            # Clean up expired sessions
            for session_id in expired_sessions:
                await self.disconnect(session_id)


# Global connection manager instance
manager = ConnectionManager()


async def start_heartbeat():
    """Start the background heartbeat task"""
    asyncio.create_task(manager.heartbeat())
