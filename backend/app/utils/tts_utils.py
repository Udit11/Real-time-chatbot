"""
Text-to-Speech utilities for voice selection and synthesis
"""

# Male voices from voice_list.txt (en-US)
MALE_VOICES = [
    "en-US-GuyNeural",           # Passion (primary)
    "en-US-ChristopherNeural",   # Reliable, Authority
    "en-US-EricNeural",          # Rational
    "en-US-RogerNeural",         # Lively
    "en-US-SteffanNeural",       # Rational
]

# Female voices from voice_list.txt (en-US)
FEMALE_VOICES = [
    "en-US-AriaNeural",          # Positive, Confident (default fallback)
    "en-US-JennyNeural",         # Friendly, Considerate, Comfort
    "en-US-MichelleNeural",      # Friendly, Pleasant
    "en-US-AnaNeural",           # Cute
]

# Default voice (female)
DEFAULT_VOICE = "en-US-AriaNeural"


def get_voice_config(voice_characteristics: dict) -> dict:
    """
    Get voice configuration based on voice characteristics.
    
    Args:
        voice_characteristics: Dict with 'gender' and optionally 'tone'
        Example: {"gender": "male", "tone": "warm_friendly"}
    
    Returns:
        Dict with 'voice' (shortname), 'rate', 'pitch'
    """
    gender = (voice_characteristics.get("gender") or "").strip().lower()
    tone = (voice_characteristics.get("tone") or "warm_friendly").strip().lower()
    
    print(f"[get_voice_config] Input gender: '{gender}', tone: '{tone}'")
    
    # Select voice based on gender
    if gender == "male":
        voice = MALE_VOICES[0]  # en-US-GuyNeural (Passion)
        print(f"[get_voice_config] ✓ Selected MALE voice: {voice}")
    elif gender == "female":
        voice = FEMALE_VOICES[0]  # en-US-AriaNeural (default)
        print(f"[get_voice_config] ✓ Selected FEMALE voice: {voice}")
    else:
        # For "neutral" or empty, default to female
        voice = DEFAULT_VOICE
        print(f"[get_voice_config] Gender '{gender}' -> defaulting to: {voice}")
    
    # Rate adjustments based on tone
    rate_map = {
        "calm": "-10%",
        "slow": "-15%",
        "fast": "+10%",
        "energetic": "+5%",
        "warm_friendly": "+0%",
    }
    rate = rate_map.get(tone, "+0%")
    
    # Pitch adjustments based on tone
    pitch_map = {
        "deep": "-10Hz",
        "high": "+10Hz",
        "warm_friendly": "+0Hz",
    }
    pitch = pitch_map.get(tone, "+0Hz")
    
    return {
        "voice": voice,
        "rate": rate,
        "pitch": pitch,
    }