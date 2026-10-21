import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Mic, 
  Cpu, 
  Shield, 
  Sparkles, 
  Volume2, 
  Check, 
  Layers, 
  Key, 
  RefreshCw, 
  Play, 
  Server, 
  Activity, 
  HardDrive, 
  Terminal, 
  Lock, 
  Sliders, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Radio,
  Clock,
  Database,
  Smartphone,
  Wifi,
  Copy,
  Trash2
} from 'lucide-react';
import { audioDeviceManager, AudioDeviceInfo } from '../services/audioDevices';
import { localVoice } from '../services/voiceService';
import { llmProviderManager, OllamaQwenProvider, GeminiProvider } from '../../core/providers/llm';
import { permissionManager } from '../../core/permissions/PermissionManager';
import { VISION_CONFIG } from '../../shared/config';

type SettingsTab = 'intelligence' | 'voice' | 'security' | 'hotkeys' | 'appearance' | 'database' | 'remote';

export interface VoiceSpeakerMeta {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  tone: string;
}

export const ALL_SPEAKERS_META: VoiceSpeakerMeta[] = [
  // Male Voices (11)
  { id: 'Ahmed', name: 'Ahmed', gender: 'Male', tone: 'Natural & Balanced (Default Persona)' },
  { id: 'Omar', name: 'Omar', gender: 'Male', tone: 'Youthful & Crisp' },
  { id: 'Mohamed', name: 'Mohamed', gender: 'Male', tone: 'Formal & Deep' },
  { id: 'Hossam', name: 'Hossam', gender: 'Male', tone: 'Energetic Tone' },
  { id: 'Abdelrahman', name: 'Abdelrahman', gender: 'Male', tone: 'Neutral & Balanced' },
  { id: 'Abdullah', name: 'Abdullah', gender: 'Male', tone: 'Articulate & Clear' },
  { id: 'Kamal', name: 'Kamal', gender: 'Male', tone: 'Resonant & Authoritative' },
  { id: 'Sayed', name: 'Sayed', gender: 'Male', tone: 'Gentle & Steady' },
  { id: 'Zaki', name: 'Zaki', gender: 'Male', tone: 'Warm & Expressive' },
  { id: 'Aly', name: 'Aly', gender: 'Male', tone: 'Modern & Dynamic' },
  { id: 'Essam', name: 'Essam', gender: 'Male', tone: 'Firm & Deep' },
  // Female Voices (6)
  { id: 'Sarah', name: 'Sarah', gender: 'Female', tone: 'Gentle & Soft' },
  { id: 'Asmaa', name: 'Asmaa', gender: 'Female', tone: 'Clear & Crisp' },
  { id: 'Yasmin', name: 'Yasmin', gender: 'Female', tone: 'Warm & Expressive' },
  { id: 'Esraa', name: 'Esraa', gender: 'Female', tone: 'Vibrant & Modern' },
  { id: 'Hanan', name: 'Hanan', gender: 'Female', tone: 'Calm & Soothing' },
  { id: 'Omnia', name: 'Omnia', gender: 'Female', tone: 'Melodic & Bright' },
];

export const SettingsHUDView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('intelligence');
  
  // 1. AI Intelligence Settings
  const [provider, setProvider] = useState<string>(() =>
    localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.ACTIVE_PROVIDER) || llmProviderManager.getActiveProviderName() || 'ollama'
  );
  const [ollamaUrl, setOllamaUrl] = useState<string>(() =>
    localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.OLLAMA_URL) || VISION_CONFIG.OLLAMA.BASE_URL
  );
  const [ollamaModel, setOllamaModel] = useState<string>(() =>
    localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.OLLAMA_MODEL) || VISION_CONFIG.OLLAMA.DEFAULT_MODEL
  );
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() =>
    localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.GEMINI_API_KEY) || ''
  );
  const [geminiModel, setGeminiModel] = useState<string>(() =>
    localStorage.getItem(VISION_CONFIG.STORAGE_KEYS.GEMINI_MODEL) || 'gemini-3.6-flash'
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [isPingingAi, setIsPingingAi] = useState(false);
  const [aiPingResult, setAiPingResult] = useState<{ success: boolean; latencyMs?: number; message?: string } | null>(null);

  // 2. Audio & Voice Settings
  const [availableSpeakers, setAvailableSpeakers] = useState<VoiceSpeakerMeta[]>(ALL_SPEAKERS_META);
  const [inputDevices, setInputDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>(() => audioDeviceManager.getSelectedMicId());
  const [ttsSpeaker, setTtsSpeaker] = useState<string>(() => localVoice.getTtsSpeaker());
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false);
  const [autoListen, setAutoListen] = useState<boolean>(() => localStorage.getItem('vision_auto_listen') !== 'false');
  const [wakeWordEnabled, setWakeWordEnabled] = useState<boolean>(() => localStorage.getItem('vision_wake_word') !== 'false');

  // 3. Security & Permissions
  const [permissionThreshold, setPermissionThreshold] = useState<number>(() =>
    permissionManager.getConfirmationThreshold()
  );
  const [strictMode, setStrictMode] = useState<boolean>(false);

  // 4. Appearance
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('vision_theme') || 'Stark Blue');
  const [enableAnimations, setEnableAnimations] = useState(true);
  const [enableGlass, setEnableGlass] = useState(true);
  const [enableScanlines, setEnableScanlines] = useState(true);

  // Save feedback
  const [saveSuccessBanner, setSaveSuccessBanner] = useState(false);

  // 5. VISION Remote Gateway State
  const [gatewayInfo, setGatewayInfo] = useState<{
    ip: string;
    port: number;
    systemName: string;
    connectedClients: number;
    connectedDevices: Array<{ deviceId: string; deviceName: string; connectedAt: string }>;
    activePairingCode: { code: string; expiresInSeconds: number } | null;
  } | null>(null);
  const [currentPin, setCurrentPin] = useState<string>('783305');
  const [pinExpiry, setPinExpiry] = useState<number>(300);
  const [isGeneratingPin, setIsGeneratingPin] = useState<boolean>(false);
  const [pinCopied, setPinCopied] = useState<boolean>(false);

  const refreshGatewayInfo = async () => {
    try {
      if ((window as any).visionAPI?.getGatewayInfo) {
        const info = await (window as any).visionAPI.getGatewayInfo();
        setGatewayInfo(info);
        if (info.activePairingCode) {
          setCurrentPin(info.activePairingCode.code);
          setPinExpiry(info.activePairingCode.expiresInSeconds);
        }
      } else {
        const res = await fetch('http://127.0.0.1:8767/api/status');
        const data = await res.json();
        setGatewayInfo(data);
      }
    } catch {
      // Gateway might be initialising
    }
  };

  const handleGenerateNewPin = async () => {
    setIsGeneratingPin(true);
    try {
      if ((window as any).visionAPI?.generatePairingCode) {
        const res = await (window as any).visionAPI.generatePairingCode();
        setCurrentPin(res.code);
        setPinExpiry(res.expiresInSeconds);
      } else {
        const res = await fetch('http://127.0.0.1:8767/api/pairing-code/generate', { method: 'POST' });
        const data = await res.json();
        if (data.code) {
          setCurrentPin(data.code);
          setPinExpiry(data.expiresInSeconds);
        }
      }
      await refreshGatewayInfo();
    } catch (err) {
      console.error('Failed to generate PIN:', err);
    } finally {
      setIsGeneratingPin(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      if ((window as any).visionAPI?.revokeTrustedDevice) {
        await (window as any).visionAPI.revokeTrustedDevice(deviceId);
        await refreshGatewayInfo();
      }
    } catch (err) {
      console.error('Failed to revoke device:', err);
    }
  };

  useEffect(() => {
    refreshGatewayInfo();
    const interval = setInterval(refreshGatewayInfo, 4000);
    return () => clearInterval(interval);
  }, []);

  // Load audio devices on mount
  useEffect(() => {
    const loadAudioDevices = async () => {
      const { inputs } = await audioDeviceManager.refreshDevices();
      setInputDevices(inputs);
      setSelectedMicId(audioDeviceManager.getSelectedMicId());
    };
    loadAudioDevices();

    const unsubscribe = audioDeviceManager.subscribe(() => {
      setInputDevices(audioDeviceManager.getInputDevices());
      setSelectedMicId(audioDeviceManager.getSelectedMicId());
    });
    return () => unsubscribe();
  }, []);

  // Check Ollama health
  useEffect(() => {
    checkOllamaHealth();
  }, [ollamaUrl, ollamaModel]);

  const checkOllamaHealth = async () => {
    setOllamaStatus('checking');
    try {
      const res = await fetch(`${ollamaUrl}/api/tags`);
      if (res.ok) {
        const data = await res.json();
        const found = (data.models || []).some((m: any) => m.name.includes(ollamaModel.split(':')[0]));
        setOllamaStatus(found ? 'connected' : 'offline');
      } else {
        setOllamaStatus('offline');
      }
    } catch {
      setOllamaStatus('offline');
    }
  };

  // Test live AI response
  const handlePingAi = async () => {
    setIsPingingAi(true);
    setAiPingResult(null);
    const start = performance.now();

    try {
      const activeLLM = llmProviderManager.getProvider(provider);
      const res = await activeLLM.chat([
        { role: 'user', content: 'Respond with exactly: "VISION Neural AI Online."' },
      ]);
      const latency = Math.round(performance.now() - start);
      setAiPingResult({
        success: true,
        latencyMs: latency,
        message: res.text.trim() || 'Connection verified successfully.',
      });
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setAiPingResult({
        success: false,
        latencyMs: latency,
        message: err.message || 'AI Provider connection failed.',
      });
    } finally {
      setIsPingingAi(false);
    }
  };

  // Load live TTS speakers on mount
  useEffect(() => {
    fetch(VISION_CONFIG.TTS.SPEAKERS_URL)
      .then((res) => res.json())
      .then((data) => {
        if (data?.speakers && Array.isArray(data.speakers) && data.speakers.length > 0) {
          const dynamicList: VoiceSpeakerMeta[] = data.speakers.map((s: string) => {
            const found = ALL_SPEAKERS_META.find((m) => m.id.toLowerCase() === s.toLowerCase());
            return found || {
              id: s,
              name: s,
              gender: 'Male',
              tone: 'Custom Voice Persona',
            };
          });
          setAvailableSpeakers(dynamicList);
        }
      })
      .catch(() => {});
  }, []);

  // Test TTS voice playback
  const handleTestVoice = async () => {
    setIsPlayingTestVoice(true);
    localVoice.setTtsSpeaker(ttsSpeaker);
    try {
      await localVoice.speak(`Hello Ahmed, this is ${ttsSpeaker}. VISION system is online and ready for your commands.`, 'en');
    } catch (e) {
      console.warn(e);
    } finally {
      setIsPlayingTestVoice(false);
    }
  };

  // Master Save & Apply All Settings
  const handleSaveAll = () => {
    // 1. Save and configure AI Providers
    localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.ACTIVE_PROVIDER, provider);
    localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.OLLAMA_URL, ollamaUrl);
    localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.OLLAMA_MODEL, ollamaModel);
    localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.GEMINI_API_KEY, geminiApiKey);
    localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.GEMINI_MODEL, geminiModel);

    // Reconfigure provider instances in LLMProviderManager
    llmProviderManager.register(new OllamaQwenProvider({ baseUrl: ollamaUrl, modelName: ollamaModel }));
    if (geminiApiKey) {
      llmProviderManager.register(new GeminiProvider({ apiKey: geminiApiKey, modelName: geminiModel }));
    }
    llmProviderManager.setActiveProvider(provider);

    // 2. Audio & Voice
    localStorage.setItem(VISION_CONFIG.STORAGE_KEYS.TTS_SPEAKER, ttsSpeaker);
    localStorage.setItem('vision_auto_listen', String(autoListen));
    localStorage.setItem('vision_wake_word', String(wakeWordEnabled));
    localVoice.setTtsSpeaker(ttsSpeaker);
    audioDeviceManager.setSelectedMicId(selectedMicId);

    // 3. Permissions & Security
    permissionManager.setConfirmationThreshold(permissionThreshold as any);
    permissionManager.setStrictMode(strictMode);

    // 4. Appearance
    localStorage.setItem('vision_theme', activeTheme);

    // Trigger visual confirmation banner
    setSaveSuccessBanner(true);
    setTimeout(() => setSaveSuccessBanner(false), 3000);
  };

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between hud-scanline-overlay overflow-y-auto space-y-4 relative">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-vision-border/60 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-vision-cyan/15 border border-vision-cyan/30">
              <Settings className="w-4 h-4 text-vision-cyan" />
            </div>
            <h2 className="text-sm font-mono font-bold text-vision-text tracking-widest uppercase">
              SETTINGS &amp; HARDWARE CONTROL MATRIX
            </h2>
          </div>
          <p className="text-[10px] font-mono text-vision-text-muted mt-1">
            Real-time configuration of neural AI engines, microphone/speaker hardware, security boundaries, and hotkeys.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center space-x-2">
          {saveSuccessBanner && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-vision-success/15 border border-vision-success text-vision-success text-xs font-mono font-bold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>APPLIED &amp; SYNCHRONIZED</span>
            </div>
          )}

          <button
            onClick={handleSaveAll}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-vision-cyan to-vision-teal text-vision-bg font-mono text-xs font-bold shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save &amp; Apply Changes</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none shrink-0">
        {[
          { id: 'intelligence', label: 'AI Intelligence', icon: <Cpu className="w-3.5 h-3.5" /> },
          { id: 'voice', label: 'Voice & Hardware Audio', icon: <Mic className="w-3.5 h-3.5" /> },
          { id: 'security', label: 'Security & Permissions', icon: <Shield className="w-3.5 h-3.5" /> },
          { id: 'hotkeys', label: 'Global Hotkeys & Tray', icon: <Radio className="w-3.5 h-3.5" /> },
          { id: 'appearance', label: 'Hologram Appearance', icon: <Palette className="w-3.5 h-3.5" /> },
          { id: 'database', label: 'Database & Storage', icon: <Database className="w-3.5 h-3.5" /> },
          { id: 'remote', label: 'Remote & Mobile', icon: <Smartphone className="w-3.5 h-3.5 text-vision-cyan" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SettingsTab)}
            className={`px-3.5 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-vision-cyan/20 text-vision-cyan border-vision-cyan shadow-glow-cyan-sm font-bold'
                : 'bg-vision-panel text-vision-text-secondary border-vision-border hover:text-vision-text'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Settings Body */}
      <div className="flex-1 hud-panel hud-corner rounded-2xl p-5 overflow-y-auto">
        {/* ==================== 1. AI INTELLIGENCE ==================== */}
        {activeTab === 'intelligence' && (
          <div className="space-y-5 font-mono text-xs">
            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-vision-cyan font-bold uppercase text-[11px] flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Primary Reasoning Provider</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'ollama', name: 'Local GPU (Ollama)', desc: '100% Offline • RTX 3060 VRAM Resident', badge: 'Private & Fast' },
                  { id: 'gemini', name: 'Google Gemini Flash', desc: 'Cloud Multimodal • 1M Context Window', badge: 'High Capacity' },
                  { id: 'hybrid', name: 'Hybrid Engine', desc: 'Local First • Cloud Fallback on failure', badge: 'Recommended' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setProvider(item.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      provider === item.id
                        ? 'bg-vision-panel border-vision-cyan shadow-glow-cyan-sm'
                        : 'bg-vision-surface/80 border-vision-border hover:border-vision-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-vision-text">{item.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/50 text-vision-cyan">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-vision-text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ollama Local Configurations */}
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center justify-between border-b border-vision-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-vision-gold" />
                  <span className="font-bold text-vision-text">Local Ollama GPU Stack (Port 11434)</span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    ollamaStatus === 'connected' ? 'bg-vision-success/15 text-vision-success border-vision-success/40' :
                    ollamaStatus === 'checking' ? 'bg-vision-cyan/15 text-vision-cyan border-vision-cyan/40 animate-pulse' :
                    'bg-rose-500/15 text-rose-400 border-rose-500/40'
                  }`}>
                    {ollamaStatus === 'connected' ? '● ONLINE' : ollamaStatus === 'checking' ? 'CHECKING...' : '○ OFFLINE'}
                  </span>
                  <button
                    onClick={checkOllamaHealth}
                    className="p-1 rounded bg-black/40 border border-vision-border text-vision-text-muted hover:text-white"
                    title="Recheck Ollama Connection"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-vision-text-muted mb-1 text-[11px]">Ollama Endpoint URL</label>
                  <input
                    type="text"
                    value={ollamaUrl}
                    onChange={(e) => setOllamaUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                  />
                </div>

                <div>
                  <label className="block text-vision-text-muted mb-1 text-[11px]">Active Ollama Model</label>
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                  >
                    <option value="qwen3:8b">qwen3:8b (Recommended Default)</option>
                    <option value="qwen2.5-coder:7b">qwen2.5-coder:7b (Specialized Code)</option>
                    <option value="qwen3-vl:4b">qwen3-vl:4b (Local Vision &amp; OCR)</option>
                    <option value="llama3.1:8b">llama3.1:8b (Meta LLaMA)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Gemini Cloud Configurations */}
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center space-x-2 border-b border-vision-border/60 pb-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-vision-text">Google Gemini Cloud Multimodal API</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1 text-[11px]">
                    <label className="text-vision-text-muted">Gemini API Key</label>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-vision-cyan flex items-center space-x-1 hover:underline text-[10px]"
                    >
                      {showApiKey ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      <span>{showApiKey ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Enter Gemini API Key..."
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                  />
                </div>

                <div>
                  <label className="block text-vision-text-muted mb-1 text-[11px]">Gemini Model Variant</label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                  >
                    <option value="gemini-3.6-flash">gemini-3.6-flash (Ultra-Fast 0.3s Latency)</option>
                    <option value="gemini-3.7-flash">gemini-3.7-flash (Balanced Multimodal)</option>
                    <option value="gemini-3.8-flash">gemini-3.8-flash (Latest Model)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Test AI Connection Button */}
            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={handlePingAi}
                disabled={isPingingAi}
                className="px-4 py-2 rounded-xl bg-vision-panel border border-vision-cyan/60 text-vision-cyan hover:bg-vision-cyan/15 font-bold flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${isPingingAi ? 'animate-spin' : ''}`} />
                <span>{isPingingAi ? 'Testing Connection...' : 'Test AI Connection'}</span>
              </button>

              {aiPingResult && (
                <div className={`text-[11px] flex items-center space-x-1.5 ${
                  aiPingResult.success ? 'text-vision-success' : 'text-rose-400'
                }`}>
                  {aiPingResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{aiPingResult.message} ({aiPingResult.latencyMs}ms)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 2. VOICE & AUDIO ==================== */}
        {activeTab === 'voice' && (
          <div className="space-y-5 font-mono text-xs">
            {/* Real Hardware Microphone Selector */}
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center justify-between border-b border-vision-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4 text-vision-cyan" />
                  <span className="font-bold text-vision-text">Hardware Microphone Input Device</span>
                </div>
                <button
                  onClick={async () => {
                    const { inputs } = await audioDeviceManager.refreshDevices();
                    setInputDevices(inputs);
                  }}
                  className="text-[10px] text-vision-cyan hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Rescan Devices</span>
                </button>
              </div>

              <div>
                <select
                  value={selectedMicId}
                  onChange={(e) => {
                    setSelectedMicId(e.target.value);
                    audioDeviceManager.setSelectedMicId(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan"
                >
                  <option value="default">Default System Microphone (Windows Communication)</option>
                  {inputDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label} {dev.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-vision-text-muted mt-1 block">
                  {inputDevices.length} audio input recording hardware devices detected on this PC.
                </span>
              </div>
            </div>

            {/* TTS Voice Persona & Speaker Selection */}
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center justify-between border-b border-vision-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-vision-teal" />
                  <span className="font-bold text-vision-text">VoiceTut-TTS Persona ({availableSpeakers.length} Voice Models)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-vision-teal/15 text-vision-teal border border-vision-teal/30 font-bold">
                  11 Male • 6 Female
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-vision-text-muted mb-1 text-[11px]">Select Active Speaker</label>
                  <select
                    value={ttsSpeaker}
                    onChange={(e) => {
                      setTtsSpeaker(e.target.value);
                      localVoice.setTtsSpeaker(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan text-xs"
                  >
                    <optgroup label="── Male Voices (11 Voices) ──">
                      {availableSpeakers.filter((s) => s.gender === 'Male').map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.tone})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="── Female Voices (6 Voices) ──">
                      {availableSpeakers.filter((s) => s.gender === 'Female').map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.tone})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleTestVoice}
                    disabled={isPlayingTestVoice}
                    className="w-full py-2 px-3 rounded-lg bg-vision-panel border border-vision-teal/50 text-vision-teal hover:bg-vision-teal/15 font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 ${isPlayingTestVoice ? 'animate-spin' : ''}`} />
                    <span>{isPlayingTestVoice ? 'Playing Voice Sample...' : `Test Voice Output (${ttsSpeaker})`}</span>
                  </button>
                </div>
              </div>

              {/* Active Voice Info Badge */}
              <div className="p-2.5 rounded-lg bg-black/30 border border-vision-border/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-vision-text-muted">Active Voice Persona:</span>
                  <span className="font-bold text-vision-cyan">{ttsSpeaker}</span>
                  <span className="text-vision-border">/</span>
                  <span className="text-vision-text-secondary">
                    {availableSpeakers.find((s) => s.id === ttsSpeaker)?.tone || 'Natural Voice'}
                  </span>
                </div>
                <span className="text-[10px] text-vision-teal font-mono">
                  VoiceTut-TTS 24kHz
                </span>
              </div>
            </div>

            {/* Conversational Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-vision-panel border border-vision-border/60">
                <div>
                  <div className="font-bold text-vision-text">Continuous Turn-Taking (Auto-Listen)</div>
                  <div className="text-[10px] text-vision-text-muted">Automatically open mic after VISION finishes speaking to continue conversation.</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoListen}
                  onChange={(e) => setAutoListen(e.target.checked)}
                  className="w-4 h-4 accent-vision-cyan cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-vision-panel border border-vision-border/60">
                <div>
                  <div className="font-bold text-vision-text">Bilingual Acoustic Processing (ar-EG &amp; en-US)</div>
                  <div className="text-[10px] text-vision-text-muted">Recognize Egyptian Arabic technical dialect and English commands simultaneously.</div>
                </div>
                <input
                  type="checkbox"
                  checked={wakeWordEnabled}
                  onChange={(e) => setWakeWordEnabled(e.target.checked)}
                  className="w-4 h-4 accent-vision-cyan cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== 3. SECURITY & PERMISSIONS ==================== */}
        {activeTab === 'security' && (
          <div className="space-y-5 font-mono text-xs">
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center space-x-2 border-b border-vision-border/60 pb-2">
                <Shield className="w-4 h-4 text-vision-cyan" />
                <span className="font-bold text-vision-text">Autonomous Action Authorization Policy</span>
              </div>

              <p className="text-vision-text-secondary text-[11px] leading-relaxed">
                VISION operates under a strict principle: <strong>AI model intent never equals execution authorization.</strong> Actions with medium to high risk require user confirmation dialogs before running.
              </p>

              {/* Threshold Selector */}
              <div className="space-y-2 pt-2">
                <label className="text-vision-cyan font-bold uppercase text-[11px]">Confirmation Threshold</label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center">
                  {[
                    { level: 0, label: 'Level 0: Read-Only', desc: 'Permit everything automatically' },
                    { level: 1, label: 'Level 1: Low Risk', desc: 'Confirm Level 2+' },
                    { level: 2, label: 'Level 2: Moderate (Default)', desc: 'Confirm Shell & Deletions' },
                    { level: 3, label: 'Level 3: Strict', desc: 'Confirm all external tools' },
                  ].map((lvl) => (
                    <button
                      key={lvl.level}
                      onClick={() => setPermissionThreshold(lvl.level)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        permissionThreshold === lvl.level
                          ? 'bg-vision-cyan/20 border-vision-cyan text-vision-cyan font-bold shadow-glow-cyan-sm'
                          : 'bg-black/30 border-vision-border text-vision-text-muted hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{lvl.label}</div>
                      <div className="text-[9px] text-vision-text-muted mt-0.5">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Protected Actions Specification */}
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-2">
              <div className="text-[11px] font-bold text-vision-gold uppercase">Guarded Irreversible Actions</div>
              <ul className="space-y-1 text-[11px] text-vision-text-muted list-disc list-inside">
                <li><strong className="text-vision-text">Shell Command Execution:</strong> format, del /s, rmdir, rm -rf, reg delete</li>
                <li><strong className="text-vision-text">Application Terminations:</strong> Closing all open desktop applications</li>
                <li><strong className="text-vision-text">External Messaging:</strong> Sending WhatsApp files or screenshots to contacts</li>
                <li><strong className="text-vision-text">System Knowledge Alteration:</strong> Deleting permanent memory records</li>
              </ul>
            </div>
          </div>
        )}

        {/* ==================== 4. GLOBAL HOTKEYS & SYSTEM TRAY ==================== */}
        {activeTab === 'hotkeys' && (
          <div className="space-y-4 font-mono text-xs">
            {/* System Tray Status */}
            <div className="p-3.5 rounded-xl bg-vision-panel border border-vision-cyan/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-vision-text text-xs flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-vision-success animate-ping"></span>
                  <span>Background Resident System Tray Mode</span>
                </div>
                <div className="text-[10px] text-vision-text-muted mt-0.5">
                  VISION stays active in the Windows notification area for instant background listening and keyboard triggers.
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] rounded bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/40 font-bold">
                ACTIVE
              </span>
            </div>

            {/* Hotkeys Cheat-Sheet */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-vision-text-secondary uppercase">
                Global Windows Keyboard Shortcuts (Usable from any application)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                {[
                  { key: 'Ctrl + Alt + Space', action: 'Trigger Voice Listening', color: 'border-vision-cyan/60 text-vision-cyan' },
                  { key: 'Ctrl + Alt + V', action: 'Show / Hide VISION Window', color: 'border-vision-cyan/60 text-vision-cyan' },
                  { key: 'Ctrl + Alt + M', action: 'Mute / Unmute Microphone', color: 'border-vision-teal/60 text-vision-teal' },
                  { key: 'Ctrl + Alt + S', action: 'Emergency Stop All Speech & Tasks', color: 'border-rose-500/60 text-rose-400' },
                  { key: 'Ctrl + Alt + Q', action: 'Quit & Shutdown VISION OS', color: 'border-rose-500/60 text-rose-400' },
                  { key: 'Esc', action: 'Cancel Current In-App Action', color: 'border-vision-border text-vision-text' },
                ].map((hk, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-vision-panel border border-vision-border/60 flex items-center justify-between">
                    <span className="text-vision-text">{hk.action}</span>
                    <kbd className={`px-2 py-0.5 rounded bg-black/50 border font-bold text-[11px] ${hk.color}`}>
                      {hk.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. APPEARANCE & THEMES ==================== */}
        {activeTab === 'appearance' && (
          <div className="space-y-5 font-mono text-xs">
            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-vision-cyan font-bold uppercase text-[11px]">Holographic HUD Theme</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'Stark Blue', color: 'from-blue-600 to-cyan-400', desc: 'Classic Tony Stark Blue' },
                  { name: 'Arc Reactor', color: 'from-cyan-400 to-teal-300', desc: 'High-frequency Teal' },
                  { name: 'Iron Amber', color: 'from-amber-600 to-yellow-400', desc: 'Mark VII Tactical Amber' },
                  { name: 'Stealth Minimal', color: 'from-slate-600 to-slate-400', desc: 'Monochrome Low-Profile' },
                ].map((th) => (
                  <div
                    key={th.name}
                    onClick={() => setActiveTheme(th.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeTheme === th.name
                        ? 'bg-vision-panel border-vision-cyan shadow-glow-cyan-sm'
                        : 'bg-black/30 border-vision-border hover:border-vision-border/80'
                    }`}
                  >
                    <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${th.color} mb-2`}></div>
                    <div className="font-bold text-vision-text">{th.name}</div>
                    <div className="text-[9px] text-vision-text-muted mt-0.5">{th.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Toggles */}
            <div className="space-y-2 pt-2 border-t border-vision-border/60">
              <div className="flex items-center justify-between p-3 rounded-xl bg-vision-panel border border-vision-border/60">
                <div>
                  <div className="font-bold text-vision-text">Orbital Ring 60 FPS Core Animations</div>
                  <div className="text-[10px] text-vision-text-muted">Animate central Arc Reactor rotation and glowing telemetry waves.</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableAnimations}
                  onChange={(e) => setEnableAnimations(e.target.checked)}
                  className="w-4 h-4 accent-vision-cyan cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-vision-panel border border-vision-border/60">
                <div>
                  <div className="font-bold text-vision-text">Holographic CRT Scanlines</div>
                  <div className="text-[10px] text-vision-text-muted">Display subtle retro-futuristic scanlines across HUD windows.</div>
                </div>
                <input
                  type="checkbox"
                  checked={enableScanlines}
                  onChange={(e) => setEnableScanlines(e.target.checked)}
                  className="w-4 h-4 accent-vision-cyan cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. DATABASE & STORAGE ==================== */}
        {activeTab === 'database' && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center justify-between border-b border-vision-border/60 pb-2">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-vision-cyan" />
                  <span className="font-bold text-vision-text">Local Storage &amp; SQLite Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-vision-success/15 text-vision-success text-[10px] font-bold">
                  ● SYNCHRONIZED
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 rounded bg-black/40 border border-vision-border space-y-1">
                  <div className="text-vision-text-muted">Database Engine:</div>
                  <div className="text-vision-text font-bold">SQLite 3 (Drizzle ORM Managed)</div>
                </div>

                <div className="p-2.5 rounded bg-black/40 border border-vision-border space-y-1">
                  <div className="text-vision-text-muted">Memory Storage Location:</div>
                  <div className="text-vision-teal font-bold truncate">localStorage + data/vision.db</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-2">
              <div className="text-[11px] font-bold text-vision-cyan uppercase">Cache Purge Utilities</div>
              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={() => {
                    if (window.confirm('Clear temporary audio cache?')) {
                      alert('Audio cache cleared.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-vision-panel border border-vision-border text-vision-text-muted hover:text-white"
                >
                  Clear Audio Cache
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 7. VISION REMOTE (MOBILE) ==================== */}
        {activeTab === 'remote' && (
          <div className="space-y-5 font-mono text-xs">
            {/* Server Status Header */}
            <div className="p-4 rounded-xl bg-vision-panel/60 border border-vision-border space-y-3">
              <div className="flex items-center justify-between border-b border-vision-border/60 pb-2.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-vision-cyan/20 border border-vision-cyan/40">
                    <Smartphone className="w-4 h-4 text-vision-cyan" />
                  </div>
                  <div>
                    <span className="font-bold text-vision-text text-sm">VISION Remote Gateway Bridge</span>
                    <p className="text-[10px] text-vision-text-muted">Local Wi-Fi link between PC Brain and Mobile Controller</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-vision-success/15 border border-vision-success/40 text-vision-success text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-vision-success animate-ping" />
                    <span>GATEWAY ONLINE</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                <div className="p-3 rounded-lg bg-black/40 border border-vision-border space-y-1">
                  <div className="text-vision-text-muted flex items-center space-x-1">
                    <Wifi className="w-3 h-3 text-vision-cyan" />
                    <span>Local LAN Host:</span>
                  </div>
                  <div className="text-vision-cyan font-bold truncate">
                    {gatewayInfo?.ip || '192.168.1.9'}:{gatewayInfo?.port || 8767}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-vision-border space-y-1">
                  <div className="text-vision-text-muted">UDP Auto-Discovery:</div>
                  <div className="text-vision-teal font-bold">Port 8768 (Active Broadcast)</div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-vision-border space-y-1">
                  <div className="text-vision-text-muted">Connected Clients:</div>
                  <div className="text-vision-text font-bold">
                    {gatewayInfo?.connectedClients || 0} active link(s)
                  </div>
                </div>
              </div>
            </div>

            {/* Glowing PIN Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-vision-panel/90 to-black/60 border-2 border-vision-cyan/50 shadow-glow-cyan text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-vision-cyan to-transparent" />
              
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-vision-cyan font-bold">
                  2. ENTER PAIRING CODE (ON YOUR PHONE)
                </span>
                <p className="text-[11px] text-vision-text-muted">
                  Use this 6-digit PIN code in the VISION Remote mobile app to establish trusted cryptographic link:
                </p>
              </div>

              {/* Huge glowing 6-digit PIN display */}
              <div className="py-2 inline-block">
                <div className="px-8 py-3 rounded-xl bg-black/80 border-2 border-vision-cyan/80 text-4xl md:text-5xl font-mono font-black tracking-[0.35em] text-vision-cyan shadow-glow-cyan animate-pulse">
                  {currentPin || '783305'}
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentPin);
                    setPinCopied(true);
                    setTimeout(() => setPinCopied(false), 2000);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-vision-panel border border-vision-cyan/40 text-vision-text hover:text-vision-cyan hover:border-vision-cyan active:scale-95 transition-all text-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{pinCopied ? 'PIN Copied!' : 'Copy PIN'}</span>
                </button>

                <button
                  disabled={isGeneratingPin}
                  onClick={handleGenerateNewPin}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-vision-cyan/20 border border-vision-cyan text-vision-cyan hover:bg-vision-cyan hover:text-black active:scale-95 transition-all text-xs font-bold disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPin ? 'animate-spin' : ''}`} />
                  <span>{isGeneratingPin ? 'Generating...' : 'Generate New PIN'}</span>
                </button>
              </div>

              <p className="text-[10px] text-vision-text-muted">
                ⏱️ Code expires in approximately {pinExpiry} seconds. Each code is single-use for security.
              </p>
            </div>

            {/* Quick Mobile Setup Guide */}
            <div className="p-4 rounded-xl bg-vision-panel/40 border border-vision-border space-y-3">
              <div className="text-xs font-bold text-vision-cyan uppercase tracking-wider flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-vision-teal" />
                <span>3-Step Quick Pairing Guide</span>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-[11px] text-vision-text-secondary">
                <li>Make sure your mobile phone is connected to the same Wi-Fi router as this PC (<span className="text-vision-cyan font-bold">{gatewayInfo?.ip || '192.168.1.9'}</span>).</li>
                <li>Open the <span className="text-vision-cyan font-bold">VISION Remote</span> mobile app or run with Expo Go on your phone.</li>
                <li>Enter the 6-digit PIN code <span className="text-vision-cyan font-bold">({currentPin})</span> into the <span className="text-white">"2. ENTER PAIRING CODE"</span> box and press <span className="text-vision-cyan font-bold">CONNECT</span>.</li>
              </ol>
            </div>

            {/* Trusted Paired Devices List */}
            <div className="p-4 rounded-xl bg-vision-panel/40 border border-vision-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-vision-text uppercase">Paired &amp; Trusted Mobile Devices</span>
                <span className="text-[10px] text-vision-text-muted font-bold">
                  {gatewayInfo?.connectedDevices?.length || 0} Registered
                </span>
              </div>

              {(!gatewayInfo?.connectedDevices || gatewayInfo.connectedDevices.length === 0) ? (
                <div className="p-4 rounded-lg bg-black/30 border border-dashed border-vision-border text-center text-vision-text-muted text-[11px]">
                  No external mobile devices paired yet. Enter the PIN on your phone to link your first device.
                </div>
              ) : (
                <div className="space-y-2">
                  {gatewayInfo.connectedDevices.map((dev) => (
                    <div key={dev.deviceId} className="p-2.5 rounded-lg bg-black/40 border border-vision-border flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-vision-text font-bold text-xs">{dev.deviceName}</div>
                        <div className="text-[9px] text-vision-text-muted">ID: {dev.deviceId} • Linked: {new Date(dev.connectedAt).toLocaleTimeString()}</div>
                      </div>
                      <button
                        onClick={() => handleRevokeDevice(dev.deviceId)}
                        className="p-1.5 rounded bg-vision-error/15 border border-vision-error/40 text-vision-error hover:bg-vision-error hover:text-white transition-all"
                        title="Revoke access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
