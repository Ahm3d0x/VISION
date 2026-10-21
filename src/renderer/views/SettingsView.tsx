import React, { useState, useEffect } from 'react';
import { Settings, Mic, Cpu, Shield, Database, Sliders, Volume2, Key, Check, RefreshCw, Play, Server, Activity } from 'lucide-react';
import { audioDeviceManager, AudioDeviceInfo } from '../services/audioDevices';
import { localVoice } from '../services/voiceService';
import { llmProviderManager, OllamaQwenProvider, GeminiProvider } from '../../core/providers/llm';
import { permissionManager } from '../../core/permissions/PermissionManager';

export const SettingsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'intelligence' | 'voice' | 'general' | 'security' | 'database'>('intelligence');
  
  // AI Provider Settings
  const [provider, setProvider] = useState<string>(
    localStorage.getItem('vision_active_provider') || llmProviderManager.getActiveProviderName() || 'ollama'
  );
  const [ollamaUrl, setOllamaUrl] = useState<string>(
    localStorage.getItem('vision_ollama_url') || 'http://localhost:11434'
  );
  const [ollamaModel, setOllamaModel] = useState<string>(
    localStorage.getItem('vision_ollama_model') || 'qwen3:8b'
  );
  const [geminiApiKey, setGeminiApiKey] = useState(
    localStorage.getItem('vision_gemini_api_key') || ''
  );
  const [geminiModel, setGeminiModel] = useState(
    localStorage.getItem('vision_gemini_model') || 'gemini-3.6-flash'
  );
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [voiceInputLang, setVoiceInputLang] = useState('ar-EG, en-US');
  const [permissionThreshold, setPermissionThreshold] = useState<number>(
    permissionManager.getConfirmationThreshold()
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isPlayingTestAudio, setIsPlayingTestAudio] = useState(false);

  // Live Audio Devices
  const [inputDevices, setInputDevices] = useState<AudioDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>(audioDeviceManager.getSelectedMicId());
  const [ttsSpeaker, setTtsSpeakerState] = useState<string>(localVoice.getTtsSpeaker());

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

  useEffect(() => {
    const loadDevices = async () => {
      const { inputs } = await audioDeviceManager.refreshDevices();
      setInputDevices(inputs);
      setSelectedMicId(audioDeviceManager.getSelectedMicId());
    };

    loadDevices();

    const unsubscribe = audioDeviceManager.subscribe(() => {
      setInputDevices(audioDeviceManager.getInputDevices());
      setSelectedMicId(audioDeviceManager.getSelectedMicId());
    });

    return () => unsubscribe();
  }, []);

  const handleMicSelect = (deviceId: string) => {
    setSelectedMicId(deviceId);
    audioDeviceManager.setSelectedMicId(deviceId);
  };

  const handleRefreshMics = async () => {
    const { inputs } = await audioDeviceManager.refreshDevices();
    setInputDevices(inputs);
  };

  const handleTestVoice = async () => {
    setIsPlayingTestAudio(true);
    localVoice.setTtsSpeaker(ttsSpeaker);
    await localVoice.speak('Hello Ahmed, VISION system is fully operational and ready for your commands.', 'en');
    setIsPlayingTestAudio(false);
  };

  const handleSave = () => {
    localStorage.setItem('vision_active_provider', provider);
    localStorage.setItem('vision_ollama_url', ollamaUrl);
    localStorage.setItem('vision_ollama_model', ollamaModel);
    localStorage.setItem('vision_gemini_api_key', geminiApiKey);
    localStorage.setItem('vision_gemini_model', geminiModel);
    localVoice.setTtsSpeaker(ttsSpeaker);

    // Apply to managers
    llmProviderManager.setActiveProvider(provider);
    const ollamaProv = llmProviderManager.getProvider('ollama') as OllamaQwenProvider;
    if (ollamaProv) {
      ollamaProv.setModel(ollamaModel);
    }
    const geminiProv = llmProviderManager.getProvider('gemini') as GeminiProvider;
    if (geminiProv) {
      geminiProv.setApiKey(geminiApiKey);
      geminiProv.setModel(geminiModel);
    }

    permissionManager.setConfirmationThreshold(permissionThreshold as any);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const sections = [
    { id: 'intelligence', label: 'Intelligence Engine (Gemini)', icon: <Cpu className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice & Microphones', icon: <Mic className="w-4 h-4" /> },
    { id: 'general', label: 'General & Display', icon: <Sliders className="w-4 h-4" /> },
    { id: 'security', label: 'Security & Boundaries', icon: <Shield className="w-4 h-4" /> },
    { id: 'database', label: 'Local SQLite & Storage', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-vision-border pb-4">
        <div>
          <h1 className="text-sm font-mono font-bold tracking-widest text-vision-cyan flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>SYSTEM CONFIGURATION</span>
          </h1>
          <p className="text-xs font-mono text-vision-text-muted mt-1">
            Configure Google Gemini AI engine, hybrid rules, real-time voice hardware, and security thresholds.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-mono rounded bg-vision-cyan text-vision-bg font-bold shadow-glow-cyan-sm hover:opacity-90 transition-all"
        >
          {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
          <span>{savedSuccess ? 'Changes Saved' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1">
        {/* Navigation Tabs */}
        <div className="w-full md:w-56 space-y-1">
          {sections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded text-xs font-mono transition-all ${
                activeSection === sec.id
                  ? 'bg-vision-panel text-vision-cyan border border-vision-cyan/60 font-semibold shadow-glow-cyan-sm'
                  : 'text-vision-text-secondary hover:text-vision-text hover:bg-vision-panel/40 border border-transparent'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 hud-panel rounded-lg p-5 border border-vision-border font-mono text-xs space-y-5">
          {/* Intelligence Section */}
          {activeSection === 'intelligence' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-vision-cyan uppercase tracking-wider flex items-center justify-between">
                <span>AI Intelligence &amp; Agent Brain</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  ollamaStatus === 'connected' 
                    ? 'bg-vision-teal/15 text-vision-teal border-vision-teal/40' 
                    : ollamaStatus === 'checking'
                    ? 'bg-vision-gold/15 text-vision-gold border-vision-gold/40'
                    : 'bg-red-500/15 text-red-400 border-red-500/40'
                }`}>
                  {ollamaStatus === 'connected' ? '● Ollama Online (RTX 3060 12GB)' : ollamaStatus === 'checking' ? '○ Checking...' : '○ Ollama Offline'}
                </span>
              </h3>

              <div className="p-3 rounded bg-vision-surface border border-vision-border text-[11px] text-vision-text-secondary">
                <span className="text-vision-cyan font-bold block mb-1">VISION Hybrid Intelligence Architecture:</span>
                1. <strong>Local Qwen3 8B (RTX 3060):</strong> 100% private, zero-cloud latency, runs natively on your GPU.<br />
                2. <strong>Tool Registry &amp; Permissions:</strong> Qwen acts as the planning brain; all actions pass through the Permission Manager.<br />
                3. <strong>Google Gemini:</strong> Available as secondary fallback engine when needed.
              </div>

              <div className="space-y-1.5">
                <label className="text-vision-text-secondary block">Active Intelligence Engine</label>
                <select 
                  value={provider} 
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-vision-surface border border-vision-border text-vision-text px-3 py-1.5 rounded outline-none focus:border-vision-cyan"
                >
                  <option value="ollama">Local Model — Ollama Qwen3 8B (RTX 3060 GPU — Recommended)</option>
                  <option value="gemini">Google Gemini AI (Cloud Fallback)</option>
                </select>
              </div>

              {provider === 'ollama' ? (
                <div className="space-y-3 pt-1 border-t border-vision-border/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-vision-text-secondary block">Ollama Base URL</label>
                      <input
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border text-vision-text rounded outline-none focus:border-vision-cyan"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-vision-text-secondary block">Ollama Model</label>
                      <input
                        type="text"
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder="qwen3:8b"
                        className="w-full px-3 py-1.5 bg-vision-surface border border-vision-border text-vision-text rounded outline-none focus:border-vision-cyan"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded bg-vision-panel/50 border border-vision-border text-[11px]">
                    <div className="flex items-center space-x-2 text-vision-text">
                      <Server className="w-3.5 h-3.5 text-vision-cyan" />
                      <span>Local Server: {ollamaUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={checkOllamaHealth}
                      className="px-2.5 py-1 rounded bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/40 hover:bg-vision-cyan/25 transition-colors text-[10px]"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1 border-t border-vision-border/60">
                  <div className="space-y-1.5">
                    <label className="text-vision-text-secondary block">Gemini Model</label>
                    <select
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      className="w-full bg-vision-surface border border-vision-border text-vision-text px-3 py-1.5 rounded outline-none focus:border-vision-cyan"
                    >
                      <option value="gemini-3.6-flash">Gemini 3.6 Flash (Latest, Ultra-fast Multimodal — Recommended)</option>
                      <option value="gemini-3.7-flash">Gemini 3.7 Flash (Next-Gen Hybrid Reasoning)</option>
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast &amp; Accurate)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-vision-text-secondary block">Google Gemini API Key</label>
                    <div className="relative">
                      <Key className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-vision-text-muted" />
                      <input
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIzaSy••••••••••••••••••••••••"
                        className="w-full pl-8 pr-3 py-1.5 bg-vision-surface border border-vision-border text-vision-text rounded outline-none focus:border-vision-cyan"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Voice Section */}
          {activeSection === 'voice' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-vision-cyan uppercase tracking-wider">
                  Hardware Microphones &amp; Audio Input
                </h3>
                <button
                  onClick={handleRefreshMics}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-vision-surface hover:bg-vision-panel border border-vision-border text-vision-text-secondary hover:text-vision-cyan text-[11px] transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rescan Devices</span>
                </button>
              </div>

              {/* Dynamic Microphones Selector */}
              <div className="space-y-1.5">
                <label className="text-vision-text-secondary block">
                  Select Active Microphone Device ({inputDevices.length} Detected)
                </label>
                <div className="space-y-2">
                  {inputDevices.length === 0 ? (
                    <div className="p-3 rounded bg-vision-surface border border-vision-border text-vision-text-muted">
                      Default System Microphone
                    </div>
                  ) : (
                    inputDevices.map((device) => {
                      const isSelected = selectedMicId === device.deviceId || (selectedMicId === 'default' && device.deviceId === 'default');
                      return (
                        <div
                          key={device.deviceId}
                          onClick={() => handleMicSelect(device.deviceId)}
                          className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-vision-cyan/15 border-vision-cyan text-vision-text shadow-glow-cyan-sm font-semibold'
                              : 'bg-vision-surface border-vision-border text-vision-text-secondary hover:text-vision-text hover:border-vision-cyan/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 truncate pr-2">
                            <Mic className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-vision-cyan' : 'text-vision-text-muted'}`} />
                            <span className="truncate">{device.label || `Audio Input Device (${device.deviceId.slice(0, 8)})`}</span>
                          </div>

                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {device.isDefault && (
                              <span className="px-1.5 py-0.5 text-[10px] rounded bg-vision-panel text-vision-teal border border-vision-teal/40">
                                Default
                              </span>
                            )}
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-vision-cyan shadow-glow-cyan-sm"></span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* VoiceTut-TTS Speaker Selection */}
              <div className="space-y-1.5 pt-2 border-t border-vision-border/60">
                <label className="text-vision-text-secondary block">
                  VoiceTut-TTS Egyptian &amp; Arabic Speaker Voice
                </label>
                <select
                  value={ttsSpeaker}
                  onChange={(e) => {
                    setTtsSpeakerState(e.target.value);
                    localVoice.setTtsSpeaker(e.target.value);
                  }}
                  className="w-full bg-vision-surface border border-vision-border text-vision-text px-3 py-1.5 rounded outline-none focus:border-vision-cyan text-xs"
                >
                    <optgroup label="── Male Voices (11 Voices) ──">
                      <option value="Ahmed">Ahmed — Natural &amp; Balanced (Default)</option>
                      <option value="Omar">Omar — Youthful &amp; Crisp</option>
                      <option value="Mohamed">Mohamed — Formal &amp; Deep</option>
                      <option value="Hossam">Hossam — Energetic Tone</option>
                      <option value="Abdelrahman">Abdelrahman — Neutral &amp; Calm</option>
                      <option value="Abdullah">Abdullah — Articulate &amp; Clear</option>
                      <option value="Kamal">Kamal — Resonant &amp; Authoritative</option>
                      <option value="Sayed">Sayed — Gentle &amp; Steady</option>
                      <option value="Zaki">Zaki — Warm &amp; Friendly</option>
                      <option value="Aly">Aly — Modern &amp; Dynamic</option>
                      <option value="Essam">Essam — Firm &amp; Deep</option>
                    </optgroup>
                    <optgroup label="── Female Voices (6 Voices) ──">
                      <option value="Sarah">Sarah — Gentle &amp; Soft</option>
                      <option value="Asmaa">Asmaa — Clear &amp; Crisp</option>
                      <option value="Yasmin">Yasmin — Warm &amp; Expressive</option>
                      <option value="Esraa">Esraa — Vibrant &amp; Modern</option>
                      <option value="Hanan">Hanan — Calm &amp; Soothing</option>
                      <option value="Omnia">Omnia — Melodic &amp; Bright</option>
                    </optgroup>
                  </select>
                </div>

              {/* TTS Voice Output Test */}
              <div className="p-3 rounded bg-vision-surface border border-vision-border flex items-center justify-between mt-2">
                <div>
                  <div className="font-bold text-vision-text">Test JARVIS Voice Output (TTS)</div>
                  <div className="text-[11px] text-vision-text-muted">Hear JARVIS speak through your headphones or speakers.</div>
                </div>
                <button
                  onClick={handleTestVoice}
                  disabled={isPlayingTestAudio}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-vision-panel text-vision-cyan border border-vision-cyan/50 hover:bg-vision-cyan/20 transition-all text-xs"
                >
                  <Play className={`w-3.5 h-3.5 ${isPlayingTestAudio ? 'animate-spin' : ''}`} />
                  <span>{isPlayingTestAudio ? 'Speaking...' : 'Play Sample'}</span>
                </button>
              </div>
            </div>
          )}

          {activeSection === 'general' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-vision-cyan uppercase tracking-wider">General Environment &amp; Background Execution</h3>

              {/* Background Mode Status */}
              <div className="p-3 rounded-lg bg-vision-surface border border-vision-cyan/30 flex items-center justify-between">
                <div>
                  <div className="font-bold text-vision-text text-xs flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-vision-success shadow-glow-cyan-sm"></span>
                    <span>Background Resident Mode (System Tray)</span>
                  </div>
                  <div className="text-[11px] text-vision-text-muted mt-0.5">
                    VISION runs continuously in the Windows System Tray at full speed for instant hotkey activation and voice recognition.
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] rounded bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/40 font-mono font-bold">
                  ACTIVE
                </span>
              </div>

              {/* Global System Hotkeys Cheat-Sheet */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-vision-text-secondary uppercase">
                  Global System Hotkeys (Operates from any Windows Application)
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded bg-vision-surface border border-vision-border flex items-center justify-between">
                    <span className="text-vision-text">Trigger Voice Listening</span>
                    <kbd className="px-2 py-0.5 rounded bg-vision-panel border border-vision-cyan/50 text-vision-cyan font-bold">Ctrl + Alt + Space</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-vision-surface border border-vision-border flex items-center justify-between">
                    <span className="text-vision-text">Show / Hide Window</span>
                    <kbd className="px-2 py-0.5 rounded bg-vision-panel border border-vision-cyan/50 text-vision-cyan font-bold">Ctrl + Alt + V</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-vision-surface border border-vision-border flex items-center justify-between">
                    <span className="text-vision-text">Mute / Unmute Microphone</span>
                    <kbd className="px-2 py-0.5 rounded bg-vision-panel border border-vision-teal/50 text-vision-teal font-bold">Ctrl + Alt + M</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-vision-surface border border-vision-border flex items-center justify-between">
                    <span className="text-vision-text">Emergency Stop All Audio & Tasks</span>
                    <kbd className="px-2 py-0.5 rounded bg-vision-panel border border-vision-error/50 text-vision-error font-bold">Ctrl + Alt + S</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-vision-surface border border-vision-border flex items-center justify-between">
                    <span className="text-vision-text">Quit & Shutdown VISION OS</span>
                    <kbd className="px-2 py-0.5 rounded bg-vision-panel border border-vision-error/50 text-vision-error font-bold">Ctrl + Alt + Q</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-vision-surface border border-vision-border flex items-center justify-between">
                    <span className="text-vision-text">Cancel Current Action (In-App)</span>
                    <kbd className="px-2 py-0.5 rounded bg-vision-panel border border-vision-border text-vision-silver font-bold">Esc</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-vision-text-secondary block">Theme Mode</label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1.5 rounded bg-vision-cyan/15 border border-vision-cyan text-vision-cyan">Dark Solid HUD (Default)</span>
                  <span className="px-3 py-1.5 rounded bg-vision-surface border border-vision-border text-vision-text-muted">Industrial Light</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-vision-cyan uppercase tracking-wider">Security &amp; Action Boundaries</h3>

              <div className="space-y-1.5">
                <label className="text-vision-text-secondary block">Automatic Execution Threshold</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-vision-text cursor-pointer">
                    <input 
                      type="radio" 
                      name="perm_tier" 
                      checked={permissionThreshold === 2}
                      onChange={() => setPermissionThreshold(2)}
                      className="accent-vision-cyan" 
                    />
                    <span>Balanced: Auto-execute safe reads &amp; predefined rules; confirm privileged operations (Level 3+)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'database' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-vision-cyan uppercase tracking-wider">Local SQLite &amp; Storage</h3>
              <div className="p-2.5 rounded bg-vision-surface border border-vision-border text-vision-text text-xs">
                <code>C:\Users\khaled\.vision\vision-local.sqlite</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
