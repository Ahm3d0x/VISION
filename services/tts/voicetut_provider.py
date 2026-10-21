import os
import sys
import io
import time
from typing import Dict, Any, List, Optional
import numpy as np
import soundfile as sf
import torch

from .base import TTSProvider
from .models import TTSResult, TTSError, EmptyTextError, InvalidSpeakerError, ModelLoadError, SynthesisError

SUPPORTED_SPEAKERS: List[str] = [
    "Abdelrahman", "Abdullah", "Kamal", "Hossam", "Mohamed",
    "Omar", "Sayed", "Zaki", "Asmaa", "Esraa", "Hanan",
    "Sarah", "Yasmin", "Aly", "Omnia", "Essam", "Ahmed"
]

class VoiceTutProvider(TTSProvider):
    """
    Native VoiceTut-TTS 0.6B Provider for VISION OS.
    Optimized for Egyptian/Standard Arabic and English on NVIDIA RTX 3060.
    Keeps model loaded in VRAM once.
    """
    def __init__(
        self,
        model_name: str = "mohammedaly22/VoiceTut-TTS",
        default_speaker: str = "Ahmed",
        device: str = "cuda:0",
        sample_rate: int = 24000
    ):
        self._name = "voicetut"
        self.model_name = os.environ.get("TTS_MODEL", model_name)
        self.default_speaker = os.environ.get("TTS_SPEAKER", default_speaker)
        self.device = os.environ.get("TTS_DEVICE", device)
        self.sample_rate = sample_rate
        self.model = None
        self._is_loading = False

        # Configure HF cache to non-C: location if present
        hf_home = os.environ.get("HF_HOME") or "E:\\VISION\\hf_cache"
        if os.path.exists(hf_home):
            os.environ["HF_HOME"] = hf_home
            os.environ["HF_HUB_CACHE"] = os.path.join(hf_home, "hub")

    @property
    def name(self) -> str:
        return self._name

    def is_loaded(self) -> bool:
        return self.model is not None

    def list_speakers(self) -> List[str]:
        return list(SUPPORTED_SPEAKERS)

    def _resolve_speaker(self, speaker_name: Optional[str]) -> str:
        req = (speaker_name or self.default_speaker).strip()
        for spk in SUPPORTED_SPEAKERS:
            if spk.lower() == req.lower():
                return spk
        # If not found in known list, raise error
        raise InvalidSpeakerError(f"Speaker '{req}' is not supported. Supported: {', '.join(SUPPORTED_SPEAKERS)}")

    def load(self) -> None:
        if self.model is not None or self._is_loading:
            return

        self._is_loading = True
        try:
            print(f"[VoiceTutProvider] Loading {self.model_name} on {self.device}...")
            sys.stdout.flush()

            from voicetut_tts import VoiceTutTTS

            self.model = VoiceTutTTS.from_pretrained(self.model_name)
            print(f"[VoiceTutProvider] {self.model_name} successfully loaded into VRAM on {self.device}.")
            sys.stdout.flush()
        except Exception as e:
            self.model = None
            raise ModelLoadError(f"Failed to load VoiceTut model: {e}") from e
        finally:
            self._is_loading = False

    def unload(self) -> None:
        if self.model is not None:
            print("[VoiceTutProvider] Unloading VoiceTut model from GPU VRAM...")
            sys.stdout.flush()
            del self.model
            self.model = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print("[VoiceTutProvider] VRAM cache cleared.")
            sys.stdout.flush()

    def synthesize(self, text: str, speaker: Optional[str] = None) -> TTSResult:
        if not text or not text.strip():
            raise EmptyTextError("Text for synthesis cannot be empty.")

        if self.model is None:
            self.load()

        clean_speaker = self._resolve_speaker(speaker)
        clean_text = text.strip()

        start_time = time.time()
        try:
            # VoiceTut synthesis returns float32 numpy array
            audio_array = self.model.synthesize(
                clean_text,
                speaker=clean_speaker,
                normalize=True
            )

            if audio_array is None or len(audio_array) == 0:
                raise SynthesisError("Model generated empty audio.")

            # Calculate duration in seconds
            duration = float(len(audio_array) / self.sample_rate)

            # Encode float32 numpy array to standard WAV in-memory buffer
            wav_buf = io.BytesIO()
            sf.write(wav_buf, audio_array, self.sample_rate, format='WAV', subtype='PCM_16')
            audio_bytes = wav_buf.getvalue()

            elapsed = round(time.time() - start_time, 3)
            print(f"[VoiceTutProvider] Synthesized ({duration:.2f}s audio in {elapsed}s) for speaker '{clean_speaker}'")
            sys.stdout.flush()

            return TTSResult(
                audio_bytes=audio_bytes,
                sample_rate=self.sample_rate,
                duration=duration,
                speaker=clean_speaker
            )
        except TTSError:
            raise
        except Exception as err:
            raise SynthesisError(f"Synthesis failed: {err}") from err

    def health(self) -> Dict[str, Any]:
        gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
        vram_allocated_mb = round(torch.cuda.memory_allocated() / (1024 * 1024), 1) if torch.cuda.is_available() else 0

        return {
            "provider": self.name,
            "model": self.model_name,
            "loaded": self.is_loaded(),
            "device": self.device,
            "gpu": gpu_name,
            "vram_allocated_mb": vram_allocated_mb,
            "default_speaker": self.default_speaker,
            "speakers": self.list_speakers()
        }
