// =========================================================================
// VISION Personal AI OS — Centralized Architecture Configuration
// =========================================================================

export const VISION_CONFIG = {
  // Service Ports & Endpoints
  ASR: {
    PORT: 8765,
    HOST: '127.0.0.1',
    get BASE_URL() {
      return `http://${this.HOST}:${this.PORT}`;
    },
    get TRANSCRIBE_URL() {
      return `${this.BASE_URL}/transcribe`;
    },
    get HEALTH_URL() {
      return `${this.BASE_URL}/health`;
    },
    MODEL_NAME: 'Qwen/Qwen3-ASR-1.7B',
  },

  TTS: {
    PORT: 8766,
    HOST: '127.0.0.1',
    get BASE_URL() {
      return `http://${this.HOST}:${this.PORT}`;
    },
    get SYNTHESIZE_URL() {
      return `${this.BASE_URL}/synthesize`;
    },
    get HEALTH_URL() {
      return `${this.BASE_URL}/health`;
    },
    get SPEAKERS_URL() {
      return `${this.BASE_URL}/speakers`;
    },
    DEFAULT_SPEAKER: 'Ahmed',
    MODEL_NAME: 'mohammedaly22/VoiceTut-TTS',
  },

  OLLAMA: {
    PORT: 11434,
    HOST: '127.0.0.1',
    get BASE_URL() {
      return `http://${this.HOST}:${this.PORT}`;
    },
    DEFAULT_MODEL: 'qwen3:8b',
  },

  GATEWAY: {
    PORT: 8767,
    HOST: '0.0.0.0',
    DISCOVERY_PORT: 8768,
    PAIRING_CODE_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
    PING_INTERVAL_MS: 10000,
    SYSTEM_NAME: 'VISION-PC',
    VERSION: '1.0',
  },

  STORAGE_KEYS: {
    ACTIVE_PROVIDER: 'vision_active_provider',
    OLLAMA_URL: 'vision_ollama_url',
    OLLAMA_MODEL: 'vision_ollama_model',
    GEMINI_API_KEY: 'vision_gemini_api_key',
    GEMINI_MODEL: 'vision_gemini_model',
    TTS_SPEAKER: 'vision_tts_speaker',
    SELECTED_MIC: 'vision_selected_mic_id',
    SELECTED_SPEAKER: 'vision_selected_speaker_id',
    PERSISTENT_MEMORY: 'vision_persistent_memory_data',
    TRUSTED_DEVICES: 'vision_trusted_remote_devices',
    GATEWAY_SETTINGS: 'vision_gateway_settings',
  },

  AUDIO: {
    SAMPLE_RATE: 16000,
    TTS_SAMPLE_RATE: 24000,
    SILENCE_DURATION_MS: 2500,
    MAX_RECORD_DURATION_MS: 45000,
    NO_SPEECH_TIMEOUT_MS: 12000,
  },

  MEMORY: {
    MAX_ACTIVE_TURNS: 6, // Keep up to 6 turns (12 messages) in live context window
    SUMMARIZE_TRIGGER_TURNS: 8, // Summarize older turns when session exceeds 8 turns
    MAX_RELEVANT_MEMORIES: 5, // Top relevant memories to inject per prompt
  },
} as const;
