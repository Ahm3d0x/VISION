from abc import ABC, abstractmethod
from typing import Dict, Any, List
from .models import TTSResult

class TTSProvider(ABC):
    """
    Abstract interface for VISION TTS Providers.
    Decouples VoiceTut-TTS or future TTS engines from server and Agent Core.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the TTS provider (e.g. 'voicetut')"""
        pass

    @abstractmethod
    def load(self) -> None:
        """Load the model into GPU memory once."""
        pass

    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if model is currently resident in VRAM and ready for inference."""
        pass

    @abstractmethod
    def synthesize(self, text: str, speaker: str = "Ahmed") -> TTSResult:
        """Synthesize text to audio result containing WAV bytes."""
        pass

    @abstractmethod
    def list_speakers(self) -> List[str]:
        """Return list of supported speaker names."""
        pass

    @abstractmethod
    def unload(self) -> None:
        """Unload model from GPU memory to free VRAM if requested."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Hardware, VRAM, and provider readiness report."""
        pass
