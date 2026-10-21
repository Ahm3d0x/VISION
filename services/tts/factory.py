import os
from typing import Dict
from .base import TTSProvider
from .voicetut_provider import VoiceTutProvider

_INSTANCES: Dict[str, TTSProvider] = {}

def get_tts_provider(provider_name: str = "voicetut") -> TTSProvider:
    """
    Factory function returning the active TTS provider singleton.
    Configurable via TTS_PROVIDER environment variable.
    """
    resolved_name = os.environ.get("TTS_PROVIDER", provider_name).lower().strip()
    if resolved_name not in _INSTANCES:
        if resolved_name == "voicetut" or resolved_name == "default":
            _INSTANCES[resolved_name] = VoiceTutProvider()
        else:
            # Fallback to voicetut
            _INSTANCES[resolved_name] = VoiceTutProvider()

    return _INSTANCES[resolved_name]
