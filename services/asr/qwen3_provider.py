import os
import sys
import tempfile
from typing import Union, Dict, Any, Optional

import torch
from .base import ASRProvider
from .models import TranscriptionResult

class Qwen3ASRProvider(ASRProvider):
    """
    Native Qwen3-ASR 1.7B Provider for VISION OS.
    Runs on NVIDIA RTX 3060 via PyTorch + CUDA in bfloat16.
    """
    def __init__(
        self,
        model_name: str = "Qwen/Qwen3-ASR-1.7B",
        device: str = "cuda:0",
        dtype: torch.dtype = torch.bfloat16
    ):
        self._name = "qwen3"
        self.model_name = model_name
        self.device = device
        self.dtype = dtype
        self.model = None
        self._is_loading = False

    @property
    def name(self) -> str:
        return self._name

    def is_loaded(self) -> bool:
        return self.model is not None

    def load(self) -> None:
        if self.model is not None or self._is_loading:
            return

        self._is_loading = True
        try:
            print(f"[Qwen3ASRProvider] Loading {self.model_name} on {self.device} ({self.dtype})...")
            sys.stdout.flush()

            from qwen_asr import Qwen3ASRModel

            self.model = Qwen3ASRModel.from_pretrained(
                self.model_name,
                dtype=self.dtype,
                device_map=self.device,
            )
            print(f"[Qwen3ASRProvider] {self.model_name} successfully loaded into VRAM on {self.device}.")
            sys.stdout.flush()
        finally:
            self._is_loading = False

    def unload(self) -> None:
        if self.model is not None:
            print("[Qwen3ASRProvider] Unloading model from GPU VRAM...")
            sys.stdout.flush()
            del self.model
            self.model = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            print("[Qwen3ASRProvider] VRAM cache cleared.")
            sys.stdout.flush()

    def transcribe(self, audio_data: Union[str, bytes], language: str = "Arabic") -> TranscriptionResult:
        if self.model is None:
            self.load()

        temp_path: Optional[str] = None
        target_path: str = ""

        if isinstance(audio_data, bytes):
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(audio_data)
                temp_path = tmp.name
                target_path = tmp.name
        elif isinstance(audio_data, str):
            target_path = audio_data
        else:
            raise ValueError(f"Unsupported audio data type: {type(audio_data)}")

        try:
            # Execute Qwen3-ASR inference on GPU
            results = self.model.transcribe(
                target_path,
                language=language,
            )

            full_text = []
            detected_lang = language

            for res in results:
                if hasattr(res, "text") and res.text:
                    full_text.append(res.text.strip())
                if hasattr(res, "language") and res.language:
                    detected_lang = res.language

            cleaned_text = " ".join(full_text).strip()

            return TranscriptionResult(
                text=cleaned_text,
                language=detected_lang,
            )
        except Exception as e:
            print(f"[Qwen3ASRProvider Inference Error] {e}")
            sys.stdout.flush()
            return TranscriptionResult(
                text="",
                language=language,
            )

        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    def health(self) -> Dict[str, Any]:
        gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None"
        vram_allocated_mb = round(torch.cuda.memory_allocated() / (1024 * 1024), 1) if torch.cuda.is_available() else 0

        return {
            "provider": self.name,
            "model": self.model_name,
            "loaded": self.is_loaded(),
            "device": self.device,
            "gpu": gpu_name,
            "vram_allocated_mb": vram_allocated_mb,
        }
