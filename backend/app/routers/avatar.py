"""
Avatar router with CRUD endpoints for avatar configuration management
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Avatar
from ..services.avatar_service import AvatarService


# Pydantic models for request/response
class AvatarCreate(BaseModel):
    name: str
    visual_appearance: Optional[dict] = None
    voice_characteristics: Optional[dict] = None
    personality_traits: Optional[dict] = None
    animation_behaviors: Optional[list] = None
    branding_elements: Optional[dict] = None


class AvatarUpdate(BaseModel):
    name: Optional[str] = None
    visual_appearance: Optional[dict] = None
    voice_characteristics: Optional[dict] = None
    personality_traits: Optional[dict] = None
    animation_behaviors: Optional[list] = None
    branding_elements: Optional[dict] = None
    is_active: Optional[bool] = None


class AvatarResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    visual_appearance: dict
    voice_characteristics: dict
    personality_traits: dict
    animation_behaviors: list
    branding_elements: dict
    is_active: bool
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class AvatarClone(BaseModel):
    new_name: str


router = APIRouter()


def get_avatar_service(db: Session = Depends(get_db)) -> AvatarService:
    """Get avatar service instance"""
    return AvatarService(db)


@router.post("/", response_model=AvatarResponse, status_code=status.HTTP_201_CREATED)
async def create_avatar(
    avatar_data: AvatarCreate,
    service: AvatarService = Depends(get_avatar_service)
):
    """Create a new avatar configuration"""
    # For now, using a default owner_id - in real app, this would come from authentication
    owner_id = "default_owner_id"

    avatar = await service.create_avatar(
        name=avatar_data.name,
        owner_id=owner_id,
        visual_appearance=avatar_data.visual_appearance,
        voice_characteristics=avatar_data.voice_characteristics,
        personality_traits=avatar_data.personality_traits,
        animation_behaviors=avatar_data.animation_behaviors,
        branding_elements=avatar_data.branding_elements
    )

    return AvatarResponse(
        id=str(avatar.id),
        name=avatar.name,
        owner_id=str(avatar.owner_id),
        visual_appearance=avatar.visual_appearance,
        voice_characteristics=avatar.voice_characteristics,
        personality_traits=avatar.personality_traits,
        animation_behaviors=avatar.animation_behaviors,
        branding_elements=avatar.branding_elements,
        is_active=avatar.is_active,
        created_at=avatar.created_at.isoformat(),
        updated_at=avatar.updated_at.isoformat()
    )


@router.get("/", response_model=List[AvatarResponse])
async def get_avatars(
    owner_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    service: AvatarService = Depends(get_avatar_service)
):
    """Get avatar configurations"""
    if owner_id:
        avatars = await service.get_user_avatars(owner_id)
    elif is_active is not None:
        avatars = await service.get_active_avatars()
    else:
        # For now, return all avatars - in real app, would filter by current user
        avatars = await service.get_active_avatars()

    return [
        AvatarResponse(
            id=str(avatar.id),
            name=avatar.name,
            owner_id=str(avatar.owner_id),
            visual_appearance=avatar.visual_appearance,
            voice_characteristics=avatar.voice_characteristics,
            personality_traits=avatar.personality_traits,
            animation_behaviors=avatar.animation_behaviors,
            branding_elements=avatar.branding_elements,
            is_active=avatar.is_active,
            created_at=avatar.created_at.isoformat(),
            updated_at=avatar.updated_at.isoformat()
        )
        for avatar in avatars
    ]


@router.get("/{avatar_id}", response_model=AvatarResponse)
async def get_avatar(
    avatar_id: str,
    service: AvatarService = Depends(get_avatar_service)
):
    """Get specific avatar configuration"""
    avatar = await service.get_avatar(avatar_id)
    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )

    return AvatarResponse(
        id=str(avatar.id),
        name=avatar.name,
        owner_id=str(avatar.owner_id),
        visual_appearance=avatar.visual_appearance,
        voice_characteristics=avatar.voice_characteristics,
        personality_traits=avatar.personality_traits,
        animation_behaviors=avatar.animation_behaviors,
        branding_elements=avatar.branding_elements,
        is_active=avatar.is_active,
        created_at=avatar.created_at.isoformat(),
        updated_at=avatar.updated_at.isoformat()
    )


@router.put("/{avatar_id}", response_model=AvatarResponse)
async def update_avatar(
    avatar_id: str,
    avatar_data: AvatarUpdate,
    service: AvatarService = Depends(get_avatar_service)
):
    """Update avatar configuration"""
    avatar = await service.update_avatar(
        avatar_id=avatar_id,
        name=avatar_data.name,
        visual_appearance=avatar_data.visual_appearance,
        voice_characteristics=avatar_data.voice_characteristics,
        personality_traits=avatar_data.personality_traits,
        animation_behaviors=avatar_data.animation_behaviors,
        branding_elements=avatar_data.branding_elements,
        is_active=avatar_data.is_active
    )

    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )

    return AvatarResponse(
        id=str(avatar.id),
        name=avatar.name,
        owner_id=str(avatar.owner_id),
        visual_appearance=avatar.visual_appearance,
        voice_characteristics=avatar.voice_characteristics,
        personality_traits=avatar.personality_traits,
        animation_behaviors=avatar.animation_behaviors,
        branding_elements=avatar.branding_elements,
        is_active=avatar.is_active,
        created_at=avatar.created_at.isoformat(),
        updated_at=avatar.updated_at.isoformat()
    )


@router.delete("/{avatar_id}")
async def delete_avatar(
    avatar_id: str,
    service: AvatarService = Depends(get_avatar_service)
):
    """Delete avatar configuration"""
    success = await service.delete_avatar(avatar_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )

    return {"message": "Avatar deleted successfully"}


@router.post("/{avatar_id}/clone", response_model=AvatarResponse)
async def clone_avatar(
    avatar_id: str,
    clone_data: AvatarClone,
    service: AvatarService = Depends(get_avatar_service)
):
    """Clone an avatar configuration"""
    # For now, using default owner_id - in real app, this would come from authentication
    owner_id = "default_owner_id"

    cloned_avatar = await service.clone_avatar(
        avatar_id=avatar_id,
        new_name=clone_data.new_name,
        owner_id=owner_id
    )

    if not cloned_avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original avatar not found"
        )

    return AvatarResponse(
        id=str(cloned_avatar.id),
        name=cloned_avatar.name,
        owner_id=str(cloned_avatar.owner_id),
        visual_appearance=cloned_avatar.visual_appearance,
        voice_characteristics=cloned_avatar.voice_characteristics,
        personality_traits=cloned_avatar.personality_traits,
        animation_behaviors=cloned_avatar.animation_behaviors,
        branding_elements=cloned_avatar.branding_elements,
        is_active=cloned_avatar.is_active,
        created_at=cloned_avatar.created_at.isoformat(),
        updated_at=cloned_avatar.updated_at.isoformat()
    )


@router.get("/{avatar_id}/css-classes")
async def get_avatar_css_classes(
    avatar_id: str,
    service: AvatarService = Depends(get_avatar_service)
):
    """Get CSS classes for avatar visual appearance"""
    avatar = await service.get_avatar(avatar_id)
    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )

    css_classes = service.generate_css_classes(avatar)
    return {"css_classes": css_classes}


@router.get("/{avatar_id}/voice-config")
async def get_avatar_voice_config(
    avatar_id: str,
    service: AvatarService = Depends(get_avatar_service)
):
    """Get voice synthesis configuration for avatar"""
    avatar = await service.get_avatar(avatar_id)
    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )

    voice_config = service.generate_voice_config(avatar)
    return {"voice_config": voice_config}


@router.post("/{avatar_id}/select-animation")
async def select_avatar_animation(
    avatar_id: str,
    message_data: dict,
    service: AvatarService = Depends(get_avatar_service)
):
    """Select appropriate animation for avatar based on message content"""
    avatar = await service.get_avatar(avatar_id)
    if not avatar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avatar not found"
        )

    message_content = message_data.get("content", "")
    message_type = message_data.get("type", "text")

    animation = service.select_animation(avatar, message_content, message_type)
    return {"animation": animation}


@router.get("/templates/default")
async def get_default_avatar_template():
    """Get default avatar template for creating new avatars"""
    return {
        "visual_appearance": {
            "face": {
                "shape": "round",
                "skin_tone": "#8B7355"
            },
            "clothing": {
                "type": "business_casual",
                "primary_color": "#2C5F8D",
                "secondary_color": "#5CA3D5"
            },
            "style": {
                "theme": "professional",
                "border_radius": "12px",
                "background_color": "#FFFFFF"
            }
        },
        "voice_characteristics": {
            "tone": "warm_friendly",
            "accent": "neutral_american",
            "speed": 1.0,
            "gender": "female",
            "pitch": 0,
            "stability": 0.5,
            "similarity_boost": 0.5,
            "style": 0.0
        },
        "personality_traits": {
            "formality": "professional",
            "empathy": 0.8,
            "directness": 0.6,
            "humor": 0.3,
            "enthusiasm": 0.7,
            "patience": 0.9
        },
        "animation_behaviors": [
            {"trigger": "greeting", "animation": "wave_hand"},
            {"trigger": "thinking", "animation": "head_tilt"},
            {"trigger": "empathy", "animation": "nod_slowly"},
            {"trigger": "excited", "animation": "bounce"},
            {"trigger": "neutral", "animation": "idle_blink"}
        ],
        "branding_elements": {
            "logo_url": "",
            "background_color": "#FFFFFF",
            "theme_colors": ["#2C5F8D", "#5CA3D5", "#A8D0E6"],
            "font_family": "Inter, sans-serif",
            "company_name": ""
        }
    }


@router.get("/templates/presets")
async def get_avatar_presets():
    """Get available avatar presets"""
    return {
        "presets": [
            {
                "name": "Professional Assistant",
                "description": "Formal and professional for business applications",
                "template": {
                    "visual_appearance": {
                        "clothing": {"type": "business", "primary_color": "#1a1a1a"},
                        "style": {"theme": "professional"}
                    },
                    "voice_characteristics": {
                        "tone": "professional",
                        "gender": "female",
                        "speed": 1.1
                    },
                    "personality_traits": {
                        "formality": "professional",
                        "empathy": 0.6,
                        "directness": 0.8,
                        "humor": 0.1
                    }
                }
            },
            {
                "name": "Friendly Helper",
                "description": "Warm and approachable for customer service",
                "template": {
                    "visual_appearance": {
                        "clothing": {"type": "casual", "primary_color": "#4CAF50"},
                        "style": {"theme": "friendly"}
                    },
                    "voice_characteristics": {
                        "tone": "warm_friendly",
                        "gender": "female",
                        "speed": 0.9
                    },
                    "personality_traits": {
                        "formality": "casual",
                        "empathy": 0.9,
                        "directness": 0.4,
                        "humor": 0.5
                    }
                }
            },
            {
                "name": "Tech Expert",
                "description": "Knowledgeable and precise for technical support",
                "template": {
                    "visual_appearance": {
                        "clothing": {"type": "business_casual", "primary_color": "#2196F3"},
                        "style": {"theme": "modern"}
                    },
                    "voice_characteristics": {
                        "tone": "professional",
                        "gender": "male",
                        "speed": 1.2
                    },
                    "personality_traits": {
                        "formality": "professional",
                        "empathy": 0.5,
                        "directness": 0.9,
                        "humor": 0.2
                    }
                }
            }
        ]
    }