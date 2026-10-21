import { audioDeviceManager } from './audioDevices';
import { VISION_CONFIG } from '../../shared/config';

export interface VoiceListenerCallbacks {
  onTranscript: (transcript: string) => void;
  onInterim?: (interimText: string) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
  onStateChange?: (state: 'idle' | 'listening' | 'speaking' | 'processing') => void;
}

// Convert AudioBuffer to standard 16kHz 16-bit Mono WAV
function encodeWAV(samples: Float32Array, sampleRate: number = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16 bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // PCM 16-bit
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Resample decoded AudioBuffer from hardware rate (44.1k/48k) to 16kHz for ASR
function resampleTo16k(audioBuffer: AudioBuffer): Float32Array {
  const channelData = audioBuffer.getChannelData(0);
  const sourceRate = audioBuffer.sampleRate;
  if (sourceRate === 16000) return channelData;

  const ratio = sourceRate / 16000;
  const targetLength = Math.round(channelData.length / ratio);
  const result = new Float32Array(targetLength);
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const lower = Math.floor(srcIndex);
    const upper = Math.min(lower + 1, channelData.length - 1);
    const weight = srcIndex - lower;
    result[i] = channelData[lower] * (1 - weight) + channelData[upper] * weight;
  }
  return result;
}

// Ambient noise & meaningless filler word filter
function isNoiseOrFiller(text: string): boolean {
  const clean = text.trim().replace(/[.,!؟?\-_،]/g, '').trim().toLowerCase();
  if (clean.length < 2) return true;

  const fillers = new Set([
    'آه', 'اه', 'أه', 'إه', 'ألا', 'الا', 'ليس', 'أنا', 'انا', 'إيه', 'ايه',
    'امم', 'همم', 'اممم', 'اووه', 'ها', 'هو', 'هي', 'يعني', 'طيب',
    'اهو', 'كده', 'شخصي', 'شخصي شخصي', 'uh', 'um', 'umm', 'ah', 'ahh', 'oh'
  ]);

  return fillers.has(clean);
}

function sanitizeSpeechText(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Convert LaTeX math formulas into speakable phrases
  text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2');
  text = text.replace(/\\text\{([^}]+)\}/g, '$1');
  text = text.replace(/\\approx/g, 'approximately');
  text = text.replace(/\\times/g, 'times');
  text = text.replace(/\\le/g, 'less than or equal to');
  text = text.replace(/\\ge/g, 'greater than or equal to');
  text = text.replace(/\\neq/g, 'not equal to');
  text = text.replace(/\\cdot/g, 'times');

  // 2. Remove math delimiters $$ and $
  text = text.replace(/\$\$([^\$]+)\$\$/g, ' $1 ');
  text = text.replace(/\$([^\$]+)\$/g, ' $1 ');
  text = text.replace(/[\$\\]/g, '');

  // 3. Remove markdown symbols
  text = text.replace(/[*_#`~[\]()]/g, ' ');
  text = text.replace(/https?:\/\/\S+/g, 'link');

  // 4. Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

class LocalVoiceEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private animFrameId: number | null = null;
  private isListening: boolean = false;
  private silenceTimer: any = null;
  private maxDurationTimer: any = null;
  private noSpeechTimer: any = null;
  private hasDetectedSpeech: boolean = false;
  private sessionHadSpeech: boolean = false;
  private speechStartTime: number = 0;
  private ambientNoiseLevel: number = 18;
  private noiseSamples: number[] = [];
  private consecutiveSpeechFrames: number = 0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  // In-memory audio cache for zero-latency repeated phrase playback
  private audioBlobCache: Map<string, Blob> = new Map();

  // Natural conversational timings
  private readonly SILENCE_DURATION_MS = VISION_CONFIG.AUDIO.SILENCE_DURATION_MS;
  private readonly MAX_RECORD_DURATION_MS = VISION_CONFIG.AUDIO.MAX_RECORD_DURATION_MS;
  private readonly NO_SPEECH_TIMEOUT_MS = VISION_CONFIG.AUDIO.NO_SPEECH_TIMEOUT_MS;

  public async startListening(callbacks: VoiceListenerCallbacks): Promise<boolean> {
    if (this.isListening) {
      this.stopListening();
    }

    this.audioChunks = [];
    this.hasDetectedSpeech = false;
    this.sessionHadSpeech = false;
    this.speechStartTime = 0;
    this.consecutiveSpeechFrames = 0;
    this.noiseSamples = [];
    this.ambientNoiseLevel = 18;

    try {
      const selectedMicId = audioDeviceManager.getSelectedMicId();
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      if (selectedMicId && selectedMicId !== 'default') {
        audioConstraints.deviceId = { exact: selectedMicId };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      const options = { mimeType: 'audio/webm;codecs=opus' };
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        this.mediaRecorder = new MediaRecorder(this.mediaStream, options);
      } else {
        this.mediaRecorder = new MediaRecorder(this.mediaStream);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.audioChunks = [];

        // If no speech was detected, or speech was too brief (e.g. cough/breath < 400ms), silently return to idle
        const speechDuration = this.speechStartTime > 0 ? (Date.now() - this.speechStartTime) : 0;
        if (!this.sessionHadSpeech || (speechDuration > 0 && speechDuration < 400) || audioBlob.size < 1200) {
          callbacks.onStateChange?.('idle');
          callbacks.onInterim?.('');
          return;
        }

        callbacks.onStateChange?.('processing');
        callbacks.onInterim?.('⚡ جاري تحليل الكلام...');

        // Convert recorded audio to 16kHz mono PCM WAV for maximum transcription accuracy
        let wavBlob: Blob | null = null;
        try {
          // Native AudioContext without custom sampleRate to allow browser demuxer to decode WebM/Opus reliably
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const arrayBuffer = await audioBlob.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          const samples16k = resampleTo16k(decoded);
          wavBlob = encodeWAV(samples16k, 16000);
          await ctx.close();
        } catch (e) {
          console.warn('WAV encode error:', e);
        }

        // Only send if we have a valid WAV blob (> 100 bytes)
        if (!wavBlob || wavBlob.size < 100) {
          callbacks.onStateChange?.('idle');
          callbacks.onInterim?.('');
          return;
        }

        // Try Local Python STT Service (Qwen3-ASR 1.7B) with automatic retry
        let transcriptText = '';
        let lastFetchError: any = null;
        let isModelStillLoading = false;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch(VISION_CONFIG.ASR.TRANSCRIBE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'audio/wav' },
              body: wavBlob,
            });

            if (response.ok) {
              const data = await response.json();
              if (data.transcript && data.transcript.trim()) {
                transcriptText = data.transcript.trim();
                lastFetchError = null;
                break;
              }
            } else if (response.status === 503) {
              isModelStillLoading = true;
              callbacks.onInterim?.('⏳ جاري تحميل نموذج الصوت المحلي في الذاكرة...');
              await new Promise((r) => setTimeout(r, 600));
            }
          } catch (localErr) {
            lastFetchError = localErr;
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        if (transcriptText) {
          // Filter meaningless filler words or ambient room noise hallucinations
          if (isNoiseOrFiller(transcriptText)) {
            console.log(`[VoiceService] Filtered filler/noise utterance: "${transcriptText}"`);
            callbacks.onStateChange?.('idle');
            callbacks.onInterim?.('');
            return;
          }

          callbacks.onTranscript(transcriptText);
          return;
        }

        callbacks.onStateChange?.('idle');
        callbacks.onInterim?.('');

        if (isModelStillLoading) {
          callbacks.onError?.('نموذج الصوت (Qwen3-ASR) لا يزال قيد التحميل في الـ GPU. يرجى الانتظار بضع ثوانٍ ثم المحاولة مجددًا.');
        } else if (lastFetchError) {
          callbacks.onError?.('تعذر الاتصال بخدمة التعرف على الصوت المحلية (منفذ 8765). يرجى التأكد من تشغيل السيرفر.');
        } else {
          callbacks.onError?.('لم يتم التعرف على الصوت بوضوح، يرجى إعادة المحاولة.');
        }
      };

      this.mediaRecorder.start();

      // Audio Analyzer & Adaptive VAD
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isListening = true;
      callbacks.onStateChange?.('listening');
      callbacks.onInterim?.('🎙️ جاري الاستماع... تحدث بالعربية أو الإنجليزية');

      const startTime = Date.now();

      // Safeguard max duration timer (45 seconds)
      this.maxDurationTimer = setTimeout(() => {
        if (this.isListening) {
          this.stopListening();
        }
      }, this.MAX_RECORD_DURATION_MS);

      // Timeout if user starts mic but says nothing within 12 seconds
      this.noSpeechTimer = setTimeout(() => {
        if (this.isListening && !this.hasDetectedSpeech) {
          this.stopListening();
        }
      }, this.NO_SPEECH_TIMEOUT_MS);

      const monitorAudio = () => {
        if (!this.analyser || !this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));

        callbacks.onAudioLevel?.(normalizedLevel);

        // Calibrate ambient noise during first 450ms (safely clamped)
        const elapsed = Date.now() - startTime;
        if (elapsed < 450) {
          this.noiseSamples.push(normalizedLevel);
          if (this.noiseSamples.length > 5) {
            const avgNoise = this.noiseSamples.reduce((a, b) => a + b, 0) / this.noiseSamples.length;
            this.ambientNoiseLevel = Math.min(35, Math.max(14, Math.round(avgNoise)));
          }
        }

        // Higher threshold for intentional human speech (default min 28, ambient + 12)
        const speechThreshold = Math.max(28, this.ambientNoiseLevel + 12);

        if (normalizedLevel >= speechThreshold) {
          this.consecutiveSpeechFrames++;

          if (!this.hasDetectedSpeech && elapsed > 250 && this.consecutiveSpeechFrames >= 5) {
            this.hasDetectedSpeech = true;
            this.sessionHadSpeech = true;
            this.speechStartTime = Date.now();
            callbacks.onStateChange?.('speaking');
            callbacks.onInterim?.('● صوتك مسموع، جاري التقاط الأمر...');

            if (this.noSpeechTimer) {
              clearTimeout(this.noSpeechTimer);
              this.noSpeechTimer = null;
            }
          }

          if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        } else {
          this.consecutiveSpeechFrames = 0;
          if (this.hasDetectedSpeech && !this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
              if (this.isListening && this.hasDetectedSpeech) {
                this.stopListening();
              }
            }, this.SILENCE_DURATION_MS);
          }
        }

        this.animFrameId = requestAnimationFrame(monitorAudio);
      };

      monitorAudio();
      return true;
    } catch (err: any) {
      this.stopListening();
      callbacks.onStateChange?.('idle');
      callbacks.onAudioLevel?.(0);
      callbacks.onInterim?.('');
      callbacks.onError?.(err.message || 'Microphone error');
      return false;
    }
  }

  public stopListening(): void {
    this.isListening = false;
    this.hasDetectedSpeech = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (this.noSpeechTimer) {
      clearTimeout(this.noSpeechTimer);
      this.noSpeechTimer = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  // =========================================================================
  // HIGH-FIDELITY VOICETUT-TTS AUDIO PIPELINE (NO ROBOTIC FALLBACKS)
  // =========================================================================
  // =========================================================================
  // HIGH-FIDELITY VOICETUT-TTS SINGLE AUDIO MUTEX PIPELINE
  // GUARANTEES ZERO AUDIO OVERLAPPING EVER
  // =========================================================================
  private audioQueue: Array<{
    id: number;
    text: string;
    isFinal: boolean;
    speaker?: string;
    resolve?: () => void;
  }> = [];
  private isProcessingAudio: boolean = false;
  private isCurrentAudioFinal: boolean = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private currentAbortController: AbortController | null = null;
  private queueItemCounter: number = 0;
  private ttsSpeaker: string =
    (typeof localStorage !== 'undefined' && localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.TTS_SPEAKER)) ||
    VISION_CONFIG.TTS.DEFAULT_SPEAKER;

  public setTtsSpeaker(speaker: string): void {
    this.ttsSpeaker = speaker;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.TTS_SPEAKER, speaker);
    }
  }

  public getTtsSpeaker(): string {
    return this.ttsSpeaker;
  }

  public stopSpeaking(): void {
    // 1. Drain queue and resolve all waiters
    const pending = this.audioQueue;
    this.audioQueue = [];
    pending.forEach((item) => item.resolve?.());

    // 2. Abort ongoing TTS request if any
    if (this.currentAbortController) {
      try {
        this.currentAbortController.abort();
      } catch (e) {}
      this.currentAbortController = null;
    }

    // 3. Pause & destroy currently playing audio element
    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {}
      this.currentAudioElement = null;
    }

    this.isProcessingAudio = false;
    this.isCurrentAudioFinal = false;
  }

  public clearNarration(): void {
    // Discard pending intermediate narrations only
    this.audioQueue = this.audioQueue.filter((item) => item.isFinal);
  }

  // Synthesize text with VoiceTut-TTS on local GPU port 8766 (with 0ms in-memory cache)
  private async fetchTTSAudio(cleanText: string, speakerOverride?: string, signal?: AbortSignal): Promise<Blob | null> {
    try {
      // 1. Instant Cache Check: If phrase is already synthesized or pre-loaded, return with 0ms latency
      const cacheKey = `${cleanText}__${speakerOverride || ''}`;
      const cachedBlob = this.audioBlobCache.get(cacheKey) || this.audioBlobCache.get(cleanText);
      if (cachedBlob) {
        return cachedBlob;
      }

      const speaker = (speakerOverride && speakerOverride.length > 2 && speakerOverride !== 'ar' && speakerOverride !== 'en')
        ? speakerOverride
        : (this.ttsSpeaker || VISION_CONFIG.TTS.DEFAULT_SPEAKER);

      const resp = await fetch(VISION_CONFIG.TTS.SYNTHESIZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          speaker,
        }),
        signal,
      });

      if (resp.ok && resp.headers.get('content-type')?.includes('audio')) {
        const audioBlob = await resp.blob();
        if (audioBlob && audioBlob.size > 100) {
          // Cache in memory for instant future playback
          this.audioBlobCache.set(cacheKey, audioBlob);
          this.audioBlobCache.set(cleanText, audioBlob);
          return audioBlob;
        }
      } else {
        const errJson = await resp.json().catch(() => null);
        console.warn('[VoiceService] VoiceTut-TTS response error:', errJson);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('[VoiceService] VoiceTut-TTS service unreachable on port 8766:', err);
      }
    }
    return null;
  }

  private playAudioBlob(blob: Blob, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      if (signal?.aborted) {
        resolve();
        return;
      }

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      this.currentAudioElement = audio;

      const selectedSpeakerId = audioDeviceManager.getSelectedSpeakerId();
      if (selectedSpeakerId && selectedSpeakerId !== 'default' && (audio as any).setSinkId) {
        (audio as any).setSinkId(selectedSpeakerId).catch(() => {});
      }

      let isFinished = false;
      const cleanup = () => {
        if (!isFinished) {
          isFinished = true;
          if (this.currentAudioElement === audio) {
            this.currentAudioElement = null;
          }
          URL.revokeObjectURL(audioUrl);
          resolve();
        }
      };

      audio.onended = cleanup;
      audio.onerror = cleanup;

      if (signal) {
        signal.addEventListener('abort', () => {
          try {
            audio.pause();
          } catch (e) {}
          cleanup();
        });
      }

      // Safeguard timeout based on blob byte size
      const maxMs = Math.max(5000, blob.size / 24);
      setTimeout(cleanup, maxMs);

      audio.play().catch((err) => {
        console.warn('[VoiceService] Audio playback catch:', err);
        cleanup();
      });
    });
  }

  // Real-time live status updates during agent thinking and tool execution
  public narrate(text: string): void {
    const cleanText = sanitizeSpeechText(text);

    if (!cleanText) return;

    // Discard older pending intermediate narrations so queue does not build up a backlog
    this.audioQueue = this.audioQueue.filter((item) => item.isFinal);
    this.audioQueue.push({
      id: ++this.queueItemCounter,
      text: cleanText,
      isFinal: false,
    });

    this.pumpAudioQueue();
  }

  // Final response speech (enqueued, awaits completion for natural turn-taking)
  public async speak(text: string, speakerOrLang?: string): Promise<void> {
    const cleanText = sanitizeSpeechText(text);

    if (!cleanText) return;

    // Discard any pending intermediate narrations — final response has top priority
    this.audioQueue = this.audioQueue.filter((item) => item.isFinal);

    // If an intermediate narration is currently playing, interrupt it so final answer begins immediately
    if (this.currentAudioElement && !this.isCurrentAudioFinal) {
      if (this.currentAbortController) {
        try {
          this.currentAbortController.abort();
        } catch (e) {}
        this.currentAbortController = null;
      }
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch (e) {}
      this.currentAudioElement = null;
      this.isProcessingAudio = false;
    }

    return new Promise<void>((resolve) => {
      this.audioQueue.push({
        id: ++this.queueItemCounter,
        text: cleanText,
        isFinal: true,
        speaker: speakerOrLang,
        resolve,
      });

      this.pumpAudioQueue();
    });
  }

  // Single-channel mutex processor
  private async pumpAudioQueue(): Promise<void> {
    if (this.isProcessingAudio) {
      return; // A sound is already in synthesis or playback! Strict mutual exclusion.
    }

    if (this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingAudio = true;
    const item = this.audioQueue.shift()!;
    this.isCurrentAudioFinal = item.isFinal;
    this.currentAbortController = new AbortController();

    try {
      const audioBlob = await this.fetchTTSAudio(item.text, item.speaker, this.currentAbortController.signal);
      if (audioBlob && !this.currentAbortController.signal.aborted) {
        await this.playAudioBlob(audioBlob, this.currentAbortController.signal);
      }
    } catch (err) {
      console.warn('[VoiceService] Audio pump error:', err);
    } finally {
      this.currentAudioElement = null;
      this.currentAbortController = null;
      this.isProcessingAudio = false;
      this.isCurrentAudioFinal = false;

      // Notify caller that playback finished
      item.resolve?.();

      // Pump next queued item after a natural 100ms conversational cadence
      if (this.audioQueue.length > 0) {
        setTimeout(() => this.pumpAudioQueue(), 100);
      }
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  // Pre-load pre-generated WAV narrations from /audio/narrations/ into memory
  public async loadPreGeneratedNarrations(): Promise<void> {
    try {
      const resp = await fetch('/audio/narrations/manifest.json');
      if (resp.ok) {
        const manifest = await resp.json();
        if (Array.isArray(manifest)) {
          let loadedCount = 0;
          for (const item of manifest) {
            if (item.text && item.rel_path) {
              fetch(item.rel_path)
                .then((r) => r.blob())
                .then((blob) => {
                  if (blob && blob.size > 100) {
                    this.audioBlobCache.set(item.text, blob);
                    loadedCount++;
                  }
                })
                .catch(() => {});
            }
          }
          console.log(`[VoiceService] Pre-cached narration bank initializing (${manifest.length} phrases registered).`);
        }
      }
    } catch (_e) {
      // Manifest not found or offline; runtime TTS synthesis will handle gracefully
    }
  }
}

export const localVoice = new LocalVoiceEngine();
localVoice.loadPreGeneratedNarrations().catch(() => {});
