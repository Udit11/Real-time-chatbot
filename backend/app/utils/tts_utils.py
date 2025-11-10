# app/utils/tts_utils.py
import os
import uuid
import tempfile
from typing import Dict, Tuple

import edge_tts  # pip install edge-tts
# edge-tts: uses async Communicate().save(path) which we await in synthesize

# Map (gender, tone) -> Edge voice config with voice name and parameters
# Using more natural, expressive female voices by default
EDGE_VOICE_MAP: Dict[Tuple[str, str], Dict[str, str]] = {
    ("female", "warm_friendly"): {
        "voice": "en-US-AriaNeural",
        "rate": "+5%",      # Slightly faster for natural conversation
        "pitch": "+2Hz"     # Slightly higher for warmth
    },
    ("female", "professional"): {
        "voice": "en-US-JennyNeural",
        "rate": "+0%",
        "pitch": "+0Hz"
    },
    ("female", "casual"): {
        "voice": "en-US-SaraNeural",
        "rate": "+8%",
        "pitch": "+3Hz"
    },
    ("male", "warm_friendly"): {
        "voice": "en-US-GuyNeural",
        "rate": "+3%",
        "pitch": "+0Hz"
    },
    ("male", "professional"): {
        "voice": "en-US-ChristopherNeural",
        "rate": "+0%",
        "pitch": "+0Hz"
    },
    ("male", "casual"): {
        "voice": "en-GB-RyanNeural",
        "rate": "+5%",
        "pitch": "+0Hz"
    },
}

# Default configurations by gender
DEFAULT_BY_GENDER = {
    "female": {
        "voice": "en-US-AriaNeural",  # Natural, expressive female voice
        "rate": "+5%",
        "pitch": "+2Hz"
    },
    "male": {
        "voice": "en-US-GuyNeural",
        "rate": "+3%",
        "pitch": "+0Hz"
    },
}

# Absolute fallback if nothing matches
FALLBACK_CONFIG = {
    "voice": "en-US-AriaNeural",  # Default to natural female voice
    "rate": "+5%",
    "pitch": "+2Hz"
}


def get_voice_config(voice_characteristics: Dict) -> Dict[str, str]:
    """
    Get complete voice configuration including voice name, rate, and pitch.
    
    Args:
        voice_characteristics: Dict with 'gender' and 'tone' keys
        
    Returns:
        Dict with 'voice', 'rate', and 'pitch' keys
    """
    gender = (voice_characteristics or {}).get("gender", "").lower()
    tone = (voice_characteristics or {}).get("tone", "").lower().replace(" ", "_")

    # Try exact match (gender, tone)
    key = (gender, tone)
    if key in EDGE_VOICE_MAP:
        return EDGE_VOICE_MAP[key].copy()

    # Try matching only gender (any tone) - use first match
    for (g, t), config in EDGE_VOICE_MAP.items():
        if g == gender:
            return config.copy()

    # Fallback to gender default
    if gender in DEFAULT_BY_GENDER:
        return DEFAULT_BY_GENDER[gender].copy()
    
    # Ultimate fallback
    return FALLBACK_CONFIG.copy()


def pick_edge_voice(voice_characteristics: Dict) -> str:
    """
    Legacy function - returns just the voice name.
    Kept for backward compatibility.
    
    Args:
        voice_characteristics: Dict with 'gender' and 'tone' keys
        
    Returns:
        Voice short name string
    """
    config = get_voice_config(voice_characteristics)
    return config["voice"]


async def synthesize_edge_tts_to_file(text: str, voice_shortname: str, output_format: str = "audio-16khz-128kbitrate-mono-mp3") -> str:
    """
    Synthesize `text` with edge-tts using `voice_shortname`.
    Saves to a temp file and returns the file path (you must remove it later).
    output_format: optional; edge-tts supports a range of formats. Default returns mp3.
    """
    # create a unique temp path (avoid NamedTemporaryFile on Windows issues)
    tmpdir = tempfile.gettempdir()
    out_name = f"{uuid.uuid4().hex}.mp3"
    out_path = os.path.join(tmpdir, out_name)

    communicate = edge_tts.Communicate(text, voice=voice_shortname)

    # The save method will produce the audio file. We can set `input_text_type` if using SSML.
    # Optionally you can pass output format via environment or communicate API; edge-tts supports
    # setting the output format when saving in latest versions but using default mp3 is simplest.
    await communicate.save(out_path)  # creates out_path (mp3)
    return out_path