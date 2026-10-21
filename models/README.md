# VISION — Local AI Models & Runtimes

This directory stores offline/local model weights and inference runtimes for the VISION Speech and Vision engines.

> [!NOTE]
> Large binary model files (`*.bin`, `*.onnx`, executables, and DLLs) are intentionally excluded from the Git repository via `.gitignore` to maintain a lightweight repository size and comply with GitHub's 100MB file limit.

---

## 1. Directory Structure

```plaintext
models/
├── stt/                 # Speech-to-Text (Whisper / whisper.cpp)
│   └── whisper_cpp/
│       ├── ggml-base.bin         # Whisper GGML model weight (147 MB)
│       └── Release/              # Native whisper.cpp Windows C++ runtime DLLs & EXEs
├── tts/                 # Text-to-Speech (Piper / ONNX)
│   ├── ar_JO-kareem-low.onnx     # Arabic Jordanian / Levant voice model
│   ├── ar_JO-kareem-low.onnx.json
│   ├── en_US-lessac-medium.onnx  # English US female/male voice model
│   └── en_US-lessac-medium.onnx.json
└── vad/                 # Voice Activity Detection
    └── silero_vad.onnx           # Silero VAD model (real-time voice thresholding)
```

---

## 2. Model Download Instructions

### A. Speech-to-Text (Whisper GGML)
Download the `base` or `small` GGML model from the official Hugging Face / whisper.cpp repository:
```bash
# Example using curl or wget:
curl -L -o models/stt/whisper_cpp/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

### B. Text-to-Speech (Piper ONNX)
Download ONNX models and their corresponding `.json` configurations:
- **Arabic Voice (Kareem)**:
  - Model: [ar_JO-kareem-low.onnx](https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx)
  - Config: [ar_JO-kareem-low.onnx.json](https://huggingface.co/rhasspy/piper-voices/resolve/main/ar/ar_JO/kareem/low/ar_JO-kareem-low.onnx.json)
- **English Voice (Lessac)**:
  - Model: [en_US-lessac-medium.onnx](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx)
  - Config: [en_US-lessac-medium.onnx.json](https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json)

Place downloaded files into `models/tts/`.

### C. Voice Activity Detection (Silero VAD)
Download `silero_vad.onnx` from [snakers4/silero-vad](https://github.com/snakers4/silero-vad):
```bash
curl -L -o models/vad/silero_vad.onnx https://github.com/snakers4/silero-vad/raw/master/src/silero_vad/data/silero_vad.onnx
```

---

## 3. Alternative: Cloud Providers
If local models are not installed, VISION gracefully falls back to:
- **Cloud LLM / Vision**: Google Gemini API (`gemini-2.5-flash`, `gemini-1.5-pro`) or OpenAI.
- **Local LLM**: Ollama (`qwen2.5`, `llama3.2-vision`) running on `http://127.0.0.1:11434`.
- **Cloud STT/TTS**: Standard Web Speech API / Cloud Voice services.
