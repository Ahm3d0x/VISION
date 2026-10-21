import os

# Base paths
SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SERVICES_DIR)

# Network configuration
ASR_HOST = os.environ.get("ASR_SERVICE_HOST", "127.0.0.1")
ASR_PORT = int(os.environ.get("ASR_SERVICE_PORT", 8765))

TTS_HOST = os.environ.get("TTS_SERVICE_HOST", "127.0.0.1")
TTS_PORT = int(os.environ.get("TTS_SERVICE_PORT", 8766))

# Models and GPU hardware
DEFAULT_DEVICE = os.environ.get("VISION_DEVICE", "cuda:0")
ASR_MODEL_NAME = os.environ.get("ASR_MODEL", "Qwen/Qwen3-ASR-1.7B")
TTS_MODEL_NAME = os.environ.get("TTS_MODEL", "mohammedaly22/VoiceTut-TTS")
DEFAULT_TTS_SPEAKER = os.environ.get("TTS_SPEAKER", "Ahmed")

# Hugging Face Cache configuration
HF_CACHE_DIR = os.environ.get("HF_HOME") or "E:\\VISION\\hf_cache"
if os.path.exists(HF_CACHE_DIR):
    os.environ["HF_HOME"] = HF_CACHE_DIR
    os.environ["HF_HUB_CACHE"] = os.path.join(HF_CACHE_DIR, "hub")
