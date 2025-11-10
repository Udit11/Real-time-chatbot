"""
Avatar service for managing avatar configurations and rendering
"""

import json
import uuid
import logging
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from ..models import Avatar
from ..database import get_redis

logger = logging.getLogger(__name__)


class AvatarService:
    """Service for avatar configuration management and rendering"""

    def __init__(self, db: Session):
        self.db = db

        # Safe Redis initialization
        try:
            self.redis_client = get_redis()
            # quick check
            self.redis_client.ping()
            self.redis_available = True
        except Exception as e:
            logger.warning("Redis not available for AvatarService: %s", e)
            self.redis_client = None
            self.redis_available = False

    async def create_avatar(
        self,
        name: str,
        owner_id: Optional[str] = None,
        visual_appearance: Optional[Dict] = None,
        voice_characteristics: Optional[Dict] = None,
        personality_traits: Optional[Dict] = None,
        animation_behaviors: Optional[List[Dict]] = None,
        branding_elements: Optional[Dict] = None
    ) -> Avatar:
        """Create a new avatar configuration"""

        # ✅ Ensure owner_id is a valid UUID
        try:
            if not owner_id or owner_id == "default_owner_id":
                owner_id = str(uuid.uuid4())
            else:
                # Validate UUID format
                owner_id = str(uuid.UUID(owner_id))
        except Exception:
            logger.warning("Invalid owner_id provided, generating new UUID.")
            owner_id = str(uuid.uuid4())

        avatar = Avatar(
            name=name,
            owner_id=owner_id,
            visual_appearance=visual_appearance or self._get_default_visual_appearance(),
            voice_characteristics=voice_characteristics or self._get_default_voice_characteristics(),
            personality_traits=personality_traits or self._get_default_personality_traits(),
            animation_behaviors=animation_behaviors or self._get_default_animation_behaviors(),
            branding_elements=branding_elements or self._get_default_branding_elements()
        )

        self.db.add(avatar)
        self.db.commit()
        self.db.refresh(avatar)

        # Cache avatar configuration safely
        await self._cache_avatar_config(avatar)

        return avatar

    async def get_avatar(self, avatar_id: str) -> Optional[Avatar]:
        """Get avatar by ID with caching"""
        if self.redis_available:
            try:
                cached_config = await self.redis_client.get(f"avatar:{avatar_id}")
                if cached_config:
                    avatar_data = json.loads(cached_config)
                    return Avatar(**avatar_data)
            except Exception as e:
                logger.warning("Redis get failed, skipping cache: %s", e)

        avatar = self.db.query(Avatar).filter(Avatar.id == avatar_id).first()
        if avatar and self.redis_available:
            await self._cache_avatar_config(avatar)

        return avatar

    async def update_avatar(
        self,
        avatar_id: str,
        name: Optional[str] = None,
        visual_appearance: Optional[Dict] = None,
        voice_characteristics: Optional[Dict] = None,
        personality_traits: Optional[Dict] = None,
        animation_behaviors: Optional[List[Dict]] = None,
        branding_elements: Optional[Dict] = None,
        is_active: Optional[bool] = None
    ) -> Optional[Avatar]:
        """Update avatar configuration"""
        avatar = self.db.query(Avatar).filter(Avatar.id == avatar_id).first()
        if not avatar:
            return None

        # Update fields if provided
        if name is not None:
            avatar.name = name
        if visual_appearance is not None:
            avatar.visual_appearance = visual_appearance
        if voice_characteristics is not None:
            avatar.voice_characteristics = voice_characteristics
        if personality_traits is not None:
            avatar.personality_traits = personality_traits
        if animation_behaviors is not None:
            avatar.animation_behaviors = animation_behaviors
        if branding_elements is not None:
            avatar.branding_elements = branding_elements
        if is_active is not None:
            avatar.is_active = is_active

        self.db.commit()
        self.db.refresh(avatar)

        # Update cache
        await self._cache_avatar_config(avatar)

        return avatar

    async def delete_avatar(self, avatar_id: str) -> bool:
        """Delete avatar configuration"""
        avatar = self.db.query(Avatar).filter(Avatar.id == avatar_id).first()
        if not avatar:
            return False

        self.db.delete(avatar)
        self.db.commit()

        # Remove from cache
        if self.redis_available:
            try:
                await self.redis_client.delete(f"avatar:{avatar_id}")
            except Exception as e:
                logger.warning("Redis delete failed: %s", e)

        return True

    async def get_user_avatars(self, owner_id: str) -> List[Avatar]:
        """Get all avatars for a user"""
        return self.db.query(Avatar).filter(Avatar.owner_id == owner_id).all()

    async def get_active_avatars(self) -> List[Avatar]:
        """Get all active avatars"""
        return self.db.query(Avatar).filter(Avatar.is_active == True).all()

    async def clone_avatar(self, avatar_id: str, new_name: str, owner_id: str) -> Optional[Avatar]:
        """Clone an avatar configuration"""
        original_avatar = await self.get_avatar(avatar_id)
        if not original_avatar:
            return None

        cloned_avatar = await self.create_avatar(
            name=new_name,
            owner_id=owner_id,
            visual_appearance=original_avatar.visual_appearance.copy(),
            voice_characteristics=original_avatar.voice_characteristics.copy(),
            personality_traits=original_avatar.personality_traits.copy(),
            animation_behaviors=original_avatar.animation_behaviors.copy(),
            branding_elements=original_avatar.branding_elements.copy()
        )

        return cloned_avatar

    async def _cache_avatar_config(self, avatar: Avatar):
        """Cache avatar configuration in Redis (safe fallback if Redis down)"""
        if not self.redis_available:
            return

        config = {
            "id": str(avatar.id),
            "name": avatar.name,
            "owner_id": str(avatar.owner_id),
            "visual_appearance": avatar.visual_appearance,
            "voice_characteristics": avatar.voice_characteristics,
            "personality_traits": avatar.personality_traits,
            "animation_behaviors": avatar.animation_behaviors,
            "branding_elements": avatar.branding_elements,
            "is_active": avatar.is_active,
            "created_at": avatar.created_at.isoformat(),
            "updated_at": avatar.updated_at.isoformat()
        }

        try:
            await self.redis_client.setex(
                f"avatar:{avatar.id}",
                3600,  # 1 hour TTL
                json.dumps(config)
            )
        except Exception as e:
            logger.warning("Redis setex failed: %s", e)

    # Default configurations (unchanged)
    def _get_default_visual_appearance(self) -> Dict:
        return {
            "face": {"shape": "round", "skin_tone": "#8B7355"},
            "clothing": {
                "type": "business_casual",
                "primary_color": "#2C5F8D",
                "secondary_color": "#5CA3D5",
            },
            "style": {
                "theme": "professional",
                "border_radius": "12px",
                "background_color": "#FFFFFF",
            },
        }

    def _get_default_voice_characteristics(self) -> Dict:
        return {
            "tone": "warm_friendly",
            "accent": "neutral_american",
            "speed": 1.0,
            "gender": "female",
            "pitch": 0,
            "stability": 0.5,
            "similarity_boost": 0.5,
            "style": 0.0,
        }

    def _get_default_personality_traits(self) -> Dict:
        return {
            "formality": "professional",
            "empathy": 0.8,
            "directness": 0.6,
            "humor": 0.3,
            "enthusiasm": 0.7,
            "patience": 0.9,
        }

    def _get_default_animation_behaviors(self) -> List[Dict]:
        return [
            {"trigger": "greeting", "animation": "wave_hand"},
            {"trigger": "thinking", "animation": "head_tilt"},
            {"trigger": "empathy", "animation": "nod_slowly"},
            {"trigger": "excited", "animation": "bounce"},
            {"trigger": "neutral", "animation": "idle_blink"},
        ]

    def _get_default_branding_elements(self) -> Dict:
        return {
            "logo_url": "",
            "background_color": "#FFFFFF",
            "theme_colors": ["#2C5F8D", "#5CA3D5", "#A8D0E6"],
            "font_family": "Inter, sans-serif",
            "company_name": "",
        }
