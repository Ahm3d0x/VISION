from abc import ABC, abstractmethod
from typing import Union, Dict, Any
from .models import TranscriptionResult

class ASRProvider(ABC):
    """
    Abstract interface for VISION ASR Providers.
    Decouples the speech engine (Qwen3-ASR, Whisper, etc.) from the server and Agent Core.
    """
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g. 'qwen3', 'whisper')"""
        pass

    @abstractmethod
    def load(self) -> None:
        """Load the model into memory / GPU."""
        pass

    @abstractmethod
    def is_loaded(self) -> bool:
        """Check if model is loaded and ready for inference."""
        pass

    @abstractmethod
    def transcribe(self, audio_data: Union[str, bytes], language: str = "Arabic") -> TranscriptionResult:
        """Transcribe audio (file path or raw bytes) to text."""
        pass

    @abstractmethod
    def unload(self) -> None:
        """Unload model from GPU memory to free VRAM if requested."""
        pass

    @abstractmethod
    def health(self) -> Dict[str, Any]:
        """Health and hardware status report."""
        pass
