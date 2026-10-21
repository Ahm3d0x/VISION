from typing import Dict
from .base import ASRProvider
from .qwen3_provider import Qwen3ASRProvider

_INSTANCES: Dict[str, ASRProvider] = {}

def get_asr_provider(provider_name: str = "qwen3") -> ASRProvider:
    """
    Factory function returning the active ASR provider singleton.
    """
    clean_name = provider_name.lower().strip()
    if clean_name not in _INSTANCES:
        if clean_name == "qwen3" or clean_name == "default":
            _INSTANCES[clean_name] = Qwen3ASRProvider()
        else:
            # Fallback to qwen3
            _INSTANCES[clean_name] = Qwen3ASRProvider()

    return _INSTANCES[clean_name]
