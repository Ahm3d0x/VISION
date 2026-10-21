from dataclasses import dataclass
from typing import Optional

@dataclass
class TTSResult:
    audio_bytes: bytes
    sample_rate: int = 24000
    duration: Optional[float] = None
    speaker: str = "Ahmed"

class TTSError(Exception):
    """Base exception for VISION TTS operations"""
    pass

class EmptyTextError(TTSError):
    pass

class InvalidSpeakerError(TTSError):
    pass

class ModelLoadError(TTSError):
    pass

class SynthesisError(TTSError):
    pass
