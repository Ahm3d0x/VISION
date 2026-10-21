import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { HoloBackground } from './components/HoloBackground';
import { CommandCenterHUD } from './views/CommandCenterHUD';
import { ChatView } from './views/ChatView';
import { VisionHUDView } from './views/VisionHUDView';
import { ProjectsHUDView } from './views/ProjectsHUDView';
import { SystemHUDView } from './views/SystemHUDView';
import { ActivityView } from './views/ActivityView';
import { ToolsHUDView } from './views/ToolsHUDView';
import { SettingsHUDView } from './views/SettingsHUDView';
import { ActionsView } from './views/ActionsView';
import { MemoryView } from './views/MemoryView';
import { SessionsHUDView } from './views/SessionsHUDView';
import { SystemStatus, SystemTelemetry, WorkspaceTab, ActionRecord, ActivityLog, ActionLogStep, ConversationTurn } from '../shared/types';
import { JarvisHoloActionCanvas, HoloCard } from './components/JarvisHoloActionCanvas';
import { localVoice } from './services/voiceService';
import { matchPredefinedCommand } from './services/ruleEngine';
import { getLiveLocationAndWeather } from './services/weatherService';
import { agentCore } from '../core/agent/AgentCore';
import { executionEngine } from '../core/execution/ExecutionEngine';
import { llmProviderManager } from '../core/providers/llm';
import { memoryManager } from '../core/memory/MemoryManager';
import { sessionManager } from '../core/memory/SessionManager';
import { narrationManager } from '../core/narration/phraseBank';

const INITIAL_TELEMETRY: SystemTelemetry = {
  cpuUsage: 0,
  memoryUsageMb: 4200,
  totalMemoryMb: 16384,
  activeToolsCount: 17,
  micStatus: 'READY',
  visionStatus: 'READY',
  uptimeSeconds: 120,
  gpuName: 'NVIDIA GeForce RTX 3060',
  gpuUsage: 0,
  vramUsageMb: 7800,
  totalVramMb: 12288,
  gpuTemp: 41,
  networkUploadMbps: 0,
  networkDownloadMbps: 0,
};

const INITIAL_ACTIONS: ActionRecord[] = [];

const INITIAL_LOGS: ActivityLog[] = [
  { id: 'l1', timestamp: '18:14:00', level: 'INFO', source: 'VISION.Core', message: 'VISION Core initialized — Personal AI Operating System' },
  { id: 'l2', timestamp: '18:14:01', level: 'SUCCESS', source: 'Rule.Engine', message: 'Loaded predefined pattern rules (Instant Offline Execution)' },
  { id: 'l3', timestamp: '18:14:01', level: 'SUCCESS', source: 'Agent.Core', message: 'Local AI Stack (Qwen3 8B GPU / Ollama) & Agent Core mounted' },
  { id: 'l4', timestamp: '18:14:02', level: 'INFO', source: 'Voice.Engine', message: 'Local Voice VAD & Audio Processor mounted' },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('home');
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('READY');
  const [telemetry, setTelemetry] = useState<SystemTelemetry>(INITIAL_TELEMETRY);
  const [actions, setActions] = useState<ActionRecord[]>(INITIAL_ACTIONS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [holoCards, setHoloCards] = useState<HoloCard[]>([]);
  const agentToolCardsRef = useRef<Record<string, string>>({});

  // Periodic Telemetry sync (1200ms for responsive hardware monitoring)
  useEffect(() => {
    const updateStats = async () => {
      if (window.visionAPI?.getTelemetry) {
        try {
          const liveTelemetry = await window.visionAPI.getTelemetry();
          setTelemetry((prev) => ({
            ...liveTelemetry,
            micStatus: prev.micStatus,
          }));
        } catch (err) {}
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 1200);
    return () => clearInterval(interval);
  }, []);

  const addLog = (level: ActivityLog['level'], source: string, message: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: time,
      level,
      source,
      message,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Synchronized state references
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const autoListenRef = useRef(true);
  const isExecutingRef = useRef<boolean>(false);
  const commandQueueRef = useRef<Array<{
    id: string;
    text: string;
    source: 'remote' | 'voice' | 'text';
    taskId?: string;
    queuedAt: number;
  }>>([]);
  const activeCommandSourceRef = useRef<'remote' | 'voice' | 'text'>('text');
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const lastSubmittedCmdTimeRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const handleUpdateHoloCard = useCallback((id: string, updates: Partial<HoloCard>) => {
    setHoloCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const handleRemoveHoloCard = useCallback((id: string) => {
    setHoloCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleTriggerDemoAction = useCallback(async (type: 'vision' | 'whatsapp' | 'web' | 'all') => {
    if (type === 'vision') {
      let capturedUrl: string | undefined;
      try {
        if (window.visionAPI?.takeScreenshot) {
          const shot = await window.visionAPI.takeScreenshot();
          if (shot.success && shot.dataUrl) {
            capturedUrl = shot.dataUrl;
          }
        }
      } catch (e) {}

      const cardId = `vision-${Date.now()}`;
      const newCard: HoloCard = {
        id: cardId,
        type: 'vision_scan',
        title: 'OPTICAL NEURAL SCAN // REAL-TIME PERCEPTION',
        subtitle: 'Laser scanning & OCR detection matrix active',
        timestamp: new Date().toLocaleTimeString(),
        status: 'active',
        position: { x: 90, y: 70 },
        isExpanded: false,
        data: {
          imageUrl: capturedUrl,
          targetRegions: [
            { label: 'REGION A: SYSTEM UI', x: 12, y: 15, w: 38, h: 28, conf: 0.99 },
            { label: 'REGION B: OCR CODE', x: 55, y: 35, w: 40, h: 32, conf: 0.96 },
            { label: 'REGION C: FOCAL TARGET', x: 30, y: 65, w: 45, h: 22, conf: 0.98 },
          ],
          analysisNotes: [
            '✓ Captured live high-resolution desktop frame raster',
            '✓ Optical neural sweep running across display matrix',
            '✓ Extracted interactive UI bounding anchors',
            '✓ Visual reasoning complete. Ready for autonomous action.',
          ],
        },
      };

      setHoloCards((prev) => [newCard, ...prev.filter((c) => c.id !== cardId)]);
      addLog('INFO', 'Holo.Vision', 'Initiated real-time holographic screen analysis.');
      localVoice.speak('Analyzing optical visual data on holographic HUD.');

      // Auto-dock to side after 6 seconds (as requested by user!)
      setTimeout(() => {
        setHoloCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: 'docked' } : c)));
        addLog('SUCCESS', 'Holo.Vision', 'Screen analysis complete — docked to side tray.');
      }, 6000);
    } else if (type === 'whatsapp') {
      const cardId = `wa-${Date.now()}`;
      const newCard: HoloCard = {
        id: cardId,
        type: 'whatsapp_comm',
        title: 'COMMUNICATIONS PROTOCOL // WHATSAPP DESKTOP',
        subtitle: 'Dispatching encrypted payload to contact',
        timestamp: new Date().toLocaleTimeString(),
        status: 'active',
        position: { x: 160, y: 100 },
        isExpanded: false,
        data: {
          contactName: 'Ahmed Stark',
          contactPhone: '+20 100 234 5678',
          messageText: 'مرحباً، تم الانتهاء من فحص وتحليل المشروع وجميع البيانات جاهزة.',
          commStatus: 'DELIVERED',
        },
      };

      setHoloCards((prev) => [newCard, ...prev.filter((c) => c.id !== cardId)]);
      addLog('INFO', 'Holo.Comms', 'Connected to WhatsApp communication protocol.');
      localVoice.speak('Opening WhatsApp communications hologram.');

      setTimeout(() => {
        setHoloCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: 'docked' } : c)));
        addLog('SUCCESS', 'Holo.Comms', 'WhatsApp dispatch confirmed — docked to side tray.');
      }, 5500);
    } else if (type === 'web') {
      const cardId = `web-${Date.now()}`;
      const newCard: HoloCard = {
        id: cardId,
        type: 'web_research',
        title: 'ORBITAL SEARCH ENGINE // LIVE WEB RECON',
        subtitle: 'Synthesizing live knowledge from SERP index',
        timestamp: new Date().toLocaleTimeString(),
        status: 'active',
        position: { x: 220, y: 80 },
        isExpanded: false,
        data: {
          query: 'Latest autonomous personal AI OS architectures 2026',
          results: [
            {
              title: '1. Autonomous Agent Execution Pipelines — AI Systems Report',
              snippet: 'Modern personal AI OS architectures leverage multimodal perception and localized tool execution models.',
              url: 'https://arxiv.org/abs/2602.0491',
            },
            {
              title: '2. Low Latency On-Device Reasoning with GPU Acceleration',
              snippet: 'Quantized neural models achieve instant inference responses while maintaining security boundaries.',
              url: 'https://huggingface.co/papers/2026',
            },
          ],
        },
      };

      setHoloCards((prev) => [newCard, ...prev.filter((c) => c.id !== cardId)]);
      addLog('INFO', 'Holo.Web', 'Launched orbital web research reconnaissance portal.');
      localVoice.speak('Connecting to orbital web search portal.');

      setTimeout(() => {
        setHoloCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status: 'docked' } : c)));
        addLog('SUCCESS', 'Holo.Web', 'Web research synthesized — docked to side tray.');
      }, 6000);
    } else if (type === 'all') {
      addLog('INFO', 'Holo.Master', '⚡ Initiating Full Iron Man JARVIS Sequence...');
      localVoice.speak('Initiating full Iron Man protocol, Ahmed. Commencing multi-stage task execution.');

      let capturedUrl: string | undefined;
      try {
        if (window.visionAPI?.takeScreenshot) {
          const shot = await window.visionAPI.takeScreenshot();
          if (shot.success && shot.dataUrl) capturedUrl = shot.dataUrl;
        }
      } catch (e) {}

      // Stage 1: Spawn Vision Scan at center-left
      const vId = `vision-${Date.now()}`;
      const vCard: HoloCard = {
        id: vId,
        type: 'vision_scan',
        title: 'STAGE 1: OPTICAL NEURAL SCAN',
        subtitle: 'Analyzing image features with laser reticles',
        timestamp: new Date().toLocaleTimeString(),
        status: 'active',
        position: { x: 80, y: 70 },
        isExpanded: false,
        data: {
          imageUrl: capturedUrl,
          analysisNotes: [
            '✓ Captured live high-resolution frame raster',
            '✓ Neural bounding boxes mapped to visual anchors',
            '✓ OCR text extraction finished successfully',
          ],
        },
      };
      setHoloCards([vCard]);

      // Stage 2 (4.5s): Shrink and dock Vision Scan to side!
      setTimeout(() => {
        setHoloCards((prev) => prev.map((c) => (c.id === vId ? { ...c, status: 'docked' } : c)));
        localVoice.speak('Image scan complete. Archiving to side dock and routing to WhatsApp.');
      }, 4500);

      // Stage 3 (5.5s): Spawn WhatsApp Comms card at center
      const waId = `wa-${Date.now() + 1}`;
      setTimeout(() => {
        const waCard: HoloCard = {
          id: waId,
          type: 'whatsapp_comm',
          title: 'STAGE 2: WHATSAPP COMMS PROTOCOL',
          subtitle: 'Target: Ahmed Stark (+20 100 234 5678)',
          timestamp: new Date().toLocaleTimeString(),
          status: 'active',
          position: { x: 140, y: 90 },
          isExpanded: false,
          data: {
            contactName: 'Ahmed Stark',
            contactPhone: '+20 100 234 5678',
            messageText: 'مرحباً، تم الانتهاء من فحص وتحليل الصورة وإرسال التقرير.',
            commStatus: 'DELIVERED',
          },
        };
        setHoloCards((prev) => [waCard, ...prev]);
      }, 5500);

      // Stage 4 (9.5s): Shrink and dock WhatsApp to side!
      setTimeout(() => {
        setHoloCards((prev) => prev.map((c) => (c.id === waId ? { ...c, status: 'docked' } : c)));
        localVoice.speak('WhatsApp message confirmed. Launching orbital web recon.');
      }, 9500);

      // Stage 5 (10.5s): Spawn Web Recon card at center
      const webId = `web-${Date.now() + 2}`;
      setTimeout(() => {
        const webCard: HoloCard = {
          id: webId,
          type: 'web_research',
          title: 'STAGE 3: ORBITAL WEB RECONNAISSANCE',
          subtitle: 'Live search query & knowledge extraction',
          timestamp: new Date().toLocaleTimeString(),
          status: 'active',
          position: { x: 180, y: 80 },
          isExpanded: false,
          data: {
            query: 'Next generation personal AI OS architectures',
            results: [
              {
                title: '1. Autonomous Agent Execution Pipelines — AI Systems Report',
                snippet: 'Modern personal AI OS architectures leverage multimodal perception and localized tool execution models.',
              },
              {
                title: '2. Low Latency On-Device Reasoning with GPU Acceleration',
                snippet: 'Quantized neural models achieve instant inference responses while maintaining security boundaries.',
              },
            ],
          },
        };
        setHoloCards((prev) => [webCard, ...prev]);
      }, 10500);

      // Stage 6 (14.5s): Shrink and dock Web Recon to side!
      setTimeout(() => {
        setHoloCards((prev) => prev.map((c) => (c.id === webId ? { ...c, status: 'docked' } : c)));
        localVoice.speak('All tasks synthesized and docked to side tray. Systems ready, Ahmed.');
        addLog('SUCCESS', 'Holo.Master', '⚡ Full Iron Man sequence completed successfully.');
      }, 14500);
    }
  }, [addLog]);

  const handleSubmitCommandRef = useRef<(cmd: string, options?: { source?: 'remote' | 'voice' | 'text'; taskId?: string }) => Promise<void>>(async () => {});
  const handleConfirmActionRef = useRef<(actionId: string) => Promise<void>>(async () => {});
  const handleCancelActionRef = useRef<(actionId: string) => void>(() => {});
  const startListeningRef = useRef<() => Promise<boolean>>(async () => false);

  const stopListening = useCallback(() => {
    localVoice.stopListening();
    setSystemStatus('READY');
    setAudioLevel(0);
    setInterimTranscript('');
    setTelemetry((prev) => ({ ...prev, micStatus: 'READY' }));
    addLog('INFO', 'Voice.Engine', 'Voice listening stopped.');
  }, []);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (localVoice.getIsListening()) return true;

    setSystemStatus('LISTENING');
    setTelemetry((prev) => ({ ...prev, micStatus: 'ACTIVE' }));
    setInterimTranscript('');
    addLog('INFO', 'Voice.Engine', 'Microphone active (VAD listening)...');

    const success = await localVoice.startListening({
      onAudioLevel: (lvl) => setAudioLevel(lvl),
      onStateChange: (state) => {
        if (state === 'processing') setSystemStatus('PROCESSING');
        else if (state === 'listening' || state === 'speaking') setSystemStatus('LISTENING');
        else if (state === 'idle') setSystemStatus('READY');
      },
      onInterim: (text) => setInterimTranscript(text),
      onTranscript: (finalText) => {
        setAudioLevel(0);
        setInterimTranscript('');
        setSystemStatus('PROCESSING');
        setTelemetry((prev) => ({ ...prev, micStatus: 'READY' }));
        setLastTranscript(finalText);
        addLog('SUCCESS', 'Voice.STT', `Transcribed: "${finalText}"`);
        handleSubmitCommandRef.current(finalText, { source: 'voice' });
      },
      onError: (err) => {
        setAudioLevel(0);
        setInterimTranscript('');
        setSystemStatus('READY');
        setTelemetry((prev) => ({ ...prev, micStatus: 'READY' }));
        addLog('WARNING', 'Voice.Engine', err);
      },
    });

    if (!success) {
      setSystemStatus('READY');
      setTelemetry((prev) => ({ ...prev, micStatus: 'ERROR' }));
    }
    return success;
  }, []);

  startListeningRef.current = startListening;

  // Local Voice Trigger Controller
  const handleToggleMic = useCallback(async () => {
    if (systemStatus === 'LISTENING' || localVoice.getIsListening()) {
      stopListening();
    } else {
      await startListening();
    }
  }, [systemStatus, stopListening, startListening]);

  // Emergency Stop Handler (Cuts off speech, mic, and any running execution instantly)
  const handleEmergencyStop = useCallback(() => {
    // 1. Immediately cut off all speech and audio playback
    localVoice.stopSpeaking();
    // 2. Immediately stop microphone listening
    localVoice.stopListening();
    // 3. Mark executing flag false to stop agent loop
    isExecutingRef.current = false;
    // 4. Wipe pending waiting queue
    commandQueueRef.current = [];
    setQueuedCount(0);
    // 5. Update status & UI
    setSystemStatus('READY');
    setAudioLevel(0);
    setInterimTranscript('');
    setTelemetry((prev) => ({ ...prev, micStatus: 'READY' }));
    addLog('WARNING', 'System.Control', '⏹️ EMERGENCY STOP: Cut off speech, microphone, and cleared task queue.');
  }, []);

  // Shutdown Handler (Graceful exit with farewell voice)
  const handleShutdown = useCallback(async () => {
    addLog('SUCCESS', 'System.Control', '⏻ Shutdown triggered by user.');
    localVoice.stopSpeaking();
    localVoice.stopListening();
    isExecutingRef.current = false;
    try {
      await localVoice.speak('Goodbye Ahmed, VISION system is shutting down.', 'en');
    } catch (e) {}
    setTimeout(() => {
      if ((window.visionAPI as any)?.quitApp) {
        (window.visionAPI as any).quitApp();
      } else {
        window.visionAPI?.closeWindow();
      }
    }, 600);
  }, []);

  // Keyboard Shortcuts & IPC Global Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Escape key: Instant emergency stop / silence
      if (e.key === 'Escape') {
        e.preventDefault();
        handleEmergencyStop();
        return;
      }

      // 2. Ctrl + Q or Ctrl + Shift + Q: Instant shutdown
      if ((e.ctrlKey || e.metaKey) && (e.key === 'q' || e.key === 'Q')) {
        e.preventDefault();
        handleShutdown();
        return;
      }

      // 3. F8 or Pause or Ctrl+Space: Quick mic toggle
      if (e.key === 'F8' || e.key === 'Pause' || ((e.ctrlKey || e.metaKey) && e.code === 'Space')) {
        e.preventDefault();
        handleToggleMic();
        return;
      }

      // 4. Alt + M or Ctrl + B: Toggle HUD Navigation Matrix
      if ((e.altKey && (e.key === 'm' || e.key === 'M')) || ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B'))) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // IPC Global system hotkey listener from Electron (Active anywhere in Windows)
    if (window.visionAPI?.onSystemEvent) {
      window.visionAPI.onSystemEvent((data: any) => {
        if (data?.type === 'WAKE_AND_LISTEN') {
          addLog('INFO', 'Voice.Engine', 'Woken up from background via Global Hotkey (Ctrl+Alt+Space).');
          startListeningRef.current();
        } else if (data?.type === 'TOGGLE_MIC') {
          handleToggleMic();
        } else if (data?.type === 'EMERGENCY_STOP') {
          handleEmergencyStop();
        } else if (data?.type === 'SHUTDOWN') {
          handleShutdown();
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleEmergencyStop, handleShutdown, handleToggleMic]);

  // VISION Remote Gateway: Dedicated listener for mobile commands & confirmations (runs once on mount)
  useEffect(() => {
    if ((window.visionAPI as any)?.onRemoteCommand) {
      (window.visionAPI as any).onRemoteCommand((data: { cmdText: string; taskId: string }) => {
        addLog('INFO', 'Remote.Gateway', `Incoming command from VISION Remote: "${data.cmdText}"`);
        handleSubmitCommandRef.current?.(data.cmdText, { source: 'remote', taskId: data.taskId });
      });
    }

    if ((window.visionAPI as any)?.onRemoteConfirmationDecision) {
      (window.visionAPI as any).onRemoteConfirmationDecision((data: { actionId: string; decision: 'ALLOW' | 'DENY' }) => {
        addLog('INFO', 'Remote.Gateway', `Remote user confirmation: Action ${data.actionId} -> ${data.decision}`);
        if (data.decision === 'ALLOW') {
          handleConfirmActionRef.current?.(data.actionId);
        } else {
          handleCancelActionRef.current?.(data.actionId);
        }
      });
    }
  }, []);

  const speakAndListen = async (text: string, options?: { allowMicResume?: boolean }) => {
    try {
      await localVoice.speak(text);
      // Wait 400ms after speech ends to prevent mic capturing residual speaker echo
      await new Promise((resolve) => setTimeout(resolve, 400));

      // CRITICAL RULE:
      // 1. If this interaction originated from Mobile Remote, DO NOT open the PC microphone!
      // 2. If there are pending tasks in the waiting queue, DO NOT open the PC microphone!
      // 3. If allowMicResume is explicitly false, DO NOT open the PC microphone!
      const isFromRemote = activeCommandSourceRef.current === 'remote';
      const hasPendingQueue = commandQueueRef.current.length > 0;

      if (isFromRemote || hasPendingQueue || options?.allowMicResume === false) {
        if (isFromRemote) {
          addLog('DEBUG', 'Voice.Engine', 'Kept PC microphone idle (Interaction active on Mobile Remote).');
        } else if (hasPendingQueue) {
          addLog('DEBUG', 'Voice.Engine', 'Kept PC microphone idle (Executing next queued command).');
        }
        return;
      }

      if (autoListenRef.current) {
        await startListeningRef.current();
      }
    } catch (e) {
      console.warn('speakAndListen error:', e);
    }
  };

  const processNextQueuedCommand = () => {
    isExecutingRef.current = false;
    if (commandQueueRef.current.length > 0) {
      const nextItem = commandQueueRef.current.shift()!;
      setQueuedCount(commandQueueRef.current.length);
      addLog('INFO', 'Command.Queue', `▶️ Processing next task from waiting list (#${commandQueueRef.current.length} left): "${nextItem.text}"`);
      setTimeout(() => {
        handleSubmitCommand(nextItem.text, { source: nextItem.source, taskId: nextItem.taskId });
      }, 400);
    }
  };

// Egyptian Arabic Speech Normalizer (heals common phonetic ASR misrecognitions)
function normalizeEgyptianSpeechASR(raw: string): string {
  let text = raw.trim();
  text = text.replace(/بولاك\s*فيجن/gi, 'بقولك يا فيجن');
  text = text.replace(/عزك\s*كتغفل/gi, 'عايزك تقفل');
  text = text.replace(/عزك\s*تقفل/gi, 'عايزك تقفل');
  text = text.replace(/عزك\s*تشغل/gi, 'عايزك تشغل');
  text = text.replace(/عزك\s*تفتح/gi, 'عايزك تفتح');
  text = text.replace(/عاجز\s*تفتحه/gi, 'عايزك تفتحه');
  text = text.replace(/عاجز\s*تشغله/gi, 'عايزك تشغله');
  text = text.replace(/عاجز\s*تقفله/gi, 'عايزك تقفله');
  text = text.replace(/عاجز\s*تفتح/gi, 'عايزك تفتح');
  text = text.replace(/عاجز\s*تقفل/gi, 'عايزك تقفل');
  text = text.replace(/كيف\s*البرنامج/gi, 'اقفل البرنامج');
  return text;
}

  const handleSubmitCommand = async (
    rawCmdText: string,
    options?: { source?: 'remote' | 'voice' | 'text'; taskId?: string }
  ) => {
    const source = options?.source || 'text';
    const cmdText = normalizeEgyptianSpeechASR(rawCmdText);

    // 1. If coming from mobile, mute PC mic so room sounds don't interfere
    if (source === 'remote') {
      if (localVoice.getIsListening()) {
        localVoice.stopListening();
        setSystemStatus('READY');
        setAudioLevel(0);
        setInterimTranscript('');
        setTelemetry((prev) => ({ ...prev, micStatus: 'READY' }));
        addLog('INFO', 'Voice.Engine', 'Muted PC microphone for incoming remote mobile session.');
      }
    }

    // 2. Debounce rapid duplicate bursts (within 1500ms)
    const now = Date.now();
    if (
      lastSubmittedCmdTimeRef.current.text === cmdText &&
      now - lastSubmittedCmdTimeRef.current.time < 1500
    ) {
      addLog('DEBUG', 'Command.Queue', `Debounced rapid burst input: "${cmdText}"`);
      return;
    }
    lastSubmittedCmdTimeRef.current = { text: cmdText, time: now };

    // 3. Queue Handling: If currently busy executing
    if (isExecutingRef.current) {
      // Emergency cancellation check
      if (/^(توقف|الغاء|إلغاء|stop|cancel|abort)/i.test(cmdText.trim())) {
        addLog('WARNING', 'Command.Engine', 'Command execution cancelled by user.');
        commandQueueRef.current = [];
        setQueuedCount(0);
        handleEmergencyStop();
        return;
      }

      // Check if command is already in waiting list
      if (commandQueueRef.current.some((q) => q.text.trim() === cmdText.trim())) {
        addLog('INFO', 'Command.Queue', `Command already present in waiting list: "${cmdText}"`);
        return;
      }

      // Add to waiting list (FIFO)
      const queueItem = {
        id: `q_${now}_${Math.random().toString(36).substring(2, 6)}`,
        text: cmdText,
        source,
        taskId: options?.taskId,
        queuedAt: now,
      };
      commandQueueRef.current.push(queueItem);
      setQueuedCount(commandQueueRef.current.length);
      addLog('INFO', 'Command.Queue', `⏳ Task added to waiting list (#${commandQueueRef.current.length}): "${cmdText}"`);

      if (source === 'remote' && options?.taskId) {
        (window.visionAPI as any)?.streamRemoteProgress?.(
          options.taskId,
          0,
          `في قائمة الانتظار (الترتيب: #${commandQueueRef.current.length})`
        );
      }
      return;
    }

    isExecutingRef.current = true;
    activeCommandSourceRef.current = source;

    // 0. Check if an action is currently awaiting user authorization
    const pendingAction = actionsRef.current.find((a) => a.status === 'CONFIRMATION_REQUIRED');
    if (pendingAction) {
      const lower = cmdText.toLowerCase().trim();
      const isAffirmative =
        /^(أوكي|اوكي|تمام|أيوة|ايوة|نعم|موافق|أوافق|وافق|أصر|اصر|تأكيد|أكد|اكد|نفذ|استمر|كمل|دوس|ماشي|يلا|صحيح|أكيد|اكيد|بالتأكيد|yes|yeah|yep|confirm|proceed|ok|okay|sure|authorize|go\s*ahead|do\s*it|insist)/i.test(lower) ||
        lower.includes('أوكي') ||
        lower.includes('اوكي') ||
        lower.includes('أصر') ||
        lower.includes('اصر') ||
        lower.includes('تمام') ||
        lower.includes('موافق') ||
        lower.includes('أوافق') ||
        lower.includes('تأكيد') ||
        lower.includes('أكد') ||
        lower.includes('نفذ') ||
        lower.includes('استمر') ||
        lower.includes('كمل') ||
        lower.includes('ماشي') ||
        lower.includes('confirm') ||
        lower.includes('proceed') ||
        lower.includes('authorize');

      const isNegative =
        /^(لا|لأ|إلغاء|الغاء|ارفض|أرفض|رفض|وقف|بلاش|تراجع|مش\s*عايز|ما\s*تقفلش|متعملش|no|nope|cancel|deny|abort|stop|reject|never\s*mind)/i.test(lower) ||
        lower.includes('إلغاء') ||
        lower.includes('الغاء') ||
        lower.includes('ارفض') ||
        lower.includes('أرفض') ||
        lower.includes('تراجع') ||
        lower.includes('بلاش') ||
        lower.includes('cancel') ||
        lower.includes('deny') ||
        lower.includes('reject');

      if (isAffirmative) {
        addLog('INFO', 'Voice.STT', `Spoken authorization confirmed: "${cmdText}" for action ${pendingAction.id}`);
        handleConfirmAction(pendingAction.id);
        return;
      }
      if (isNegative) {
        addLog('INFO', 'Voice.STT', `Spoken authorization denied: "${cmdText}" for action ${pendingAction.id}`);
        handleCancelAction(pendingAction.id);
        return;
      }
    }

    const actionId = `act-${Date.now()}`;
    const startTime = new Date().toTimeString().split(' ')[0];
    setLastTranscript(cmdText);

    // 1. Tier 1: Check Predefined Local Rule Engine
    const ruleMatch = matchPredefinedCommand(cmdText);
    const isArabic = /[\u0600-\u06FF]/.test(cmdText);
    const activeProvider = llmProviderManager.getProvider();
    
    // Check if command is a fast local rule (no heavy LLM reasoning needed)
    const isPureChatGreeting = ruleMatch.matched && ruleMatch.actionType === 'chat';
    const isShutdown = ruleMatch.matched && ruleMatch.actionType === 'system' && ruleMatch.appCommand === 'exit';
    const isPCShutdown = ruleMatch.matched && ruleMatch.actionType === 'system' && (ruleMatch.appCommand === 'shutdown_pc' || ruleMatch.appCommand === 'restart_pc');
    const isTelemetryReport = ruleMatch.matched && ruleMatch.actionType === 'system' && ruleMatch.appCommand === 'telemetry_report';

    let intent = (isPureChatGreeting || isShutdown || isPCShutdown || isTelemetryReport) ? ruleMatch.intent : cmdText;
    let target = (isPureChatGreeting || isShutdown || isPCShutdown || isTelemetryReport)
      ? ruleMatch.target
      : `VISION Local Agent (${activeProvider.name.toUpperCase()} — ${activeProvider.defaultModel})`;
    let responseText = isArabic
      ? (ruleMatch.responseArabic || ruleMatch.responseSpeech)
      : (ruleMatch.responseSpeech || ruleMatch.responseArabic);

    // Customize Telemetry Response with live numbers
    if (isTelemetryReport) {
      responseText = isArabic
        ? `حالة النظام ممتازة يا أحمد: استهلاك المعالج ${telemetry.cpuUsage}٪، ومعالج الرسوميات RTX 3060 بنسبة ${telemetry.gpuUsage ?? 0}٪ والحرارة ${telemetry.gpuTemp ?? 50}° مئوية، والذاكرة ${(telemetry.memoryUsageMb / 1024).toFixed(1)} جيجابايت، وجميع الخدمات جاهزة.`
        : `System is running optimally, Ahmed: CPU at ${telemetry.cpuUsage}%, GPU load at ${telemetry.gpuUsage ?? 0}% (${telemetry.gpuTemp ?? 50}°C), and ${(telemetry.memoryUsageMb / 1024).toFixed(1)} GB RAM in use.`;
    }

    let requiresConfirm = false;
    if (cmdText.toLowerCase().includes('delete') || cmdText.toLowerCase().includes('مسح')) {
      requiresConfirm = true;
      responseText = isArabic ? 'هذا الإجراء يتطلب تصريحًا أمنيًا صريحًا. هل تؤكد المتابعة؟' : 'This action requires explicit authorization. Do you confirm?';
    }

    const newAction: ActionRecord = {
      id: actionId,
      commandText: cmdText,
      intent,
      target,
      status: requiresConfirm ? 'CONFIRMATION_REQUIRED' : 'EXECUTING',
      startedAt: startTime,
      steps: [
        { id: '1', timestamp: startTime, type: 'intent', message: `Intent identified: ${intent}`, status: 'success' },
      ],
    };

    setActions((prev) => [newAction, ...prev]);
    sessionManager.recordAction(newAction);
    addLog('INFO', 'User.Intent', `User Intent: "${cmdText}"`);
    addLog('INFO', 'Command.Engine', `Command received: "${cmdText}"`);

    // Immediate non-repeating spoken feedback from varied phrase bank
    const immediateAck = narrationManager.getPhrase('immediate_ack', {}, isArabic);
    if (!isShutdown && !isPCShutdown && !isPureChatGreeting && !isTelemetryReport) {
      localVoice.narrate(immediateAck);
      setInterimTranscript(`⚡ ${immediateAck}`);
    }

    if (requiresConfirm) {
      setSystemStatus('WAITING');
      setLastResponse(responseText);
      addLog('WARNING', 'Permission.Manager', `Action ${actionId} requires authorization (Level 3).`);
      if (source === 'remote') {
        (window.visionAPI as any)?.streamRemoteConfirmationRequired?.({
          actionId,
          toolName: 'system_confirm',
          reason: responseText,
          permissionLevel: 3,
          requestedAt: new Date().toISOString(),
        });
      }
      speakAndListen(responseText, { allowMicResume: source !== 'remote' });
      return;
    }

    setSystemStatus('EXECUTING');

    // Fast-Path 1: Shutdown & Exit VISION Assistant
    if (isShutdown) {
      addLog('SUCCESS', 'System.Control', 'Shutdown command recognized. Closing VISION...');
      const finishTime = new Date().toTimeString().split(' ')[0];
      setLastResponse(responseText);
      setActions((prev) =>
        prev.map((act) =>
          act.id === actionId
            ? { ...act, status: 'COMPLETED', completedAt: finishTime, durationMs: 200, outputSummary: responseText }
            : act
        )
      );
      setSystemStatus('READY');
      await localVoice.speak(responseText);
      setTimeout(() => {
        window.visionAPI?.closeWindow();
      }, 1000);
      return;
    }

    // Fast-Path 1.5: Shutdown or Restart Windows PC
    if (isPCShutdown) {
      const isRestart = ruleMatch.appCommand === 'restart_pc';
      addLog('SUCCESS', 'System.Control', isRestart ? 'Executing Windows PC Restart command...' : 'Executing Windows PC Force Shutdown command...');
      const finishTime = new Date().toTimeString().split(' ')[0];
      setLastResponse(responseText);
      setActions((prev) =>
        prev.map((act) =>
          act.id === actionId
            ? { ...act, status: 'COMPLETED', completedAt: finishTime, durationMs: 200, outputSummary: responseText }
            : act
        )
      );
      setSystemStatus('READY');
      await localVoice.speak(responseText);
      const cmd = isRestart ? 'shutdown /r /f /t 3' : 'shutdown /s /f /t 3';
      try {
        await window.visionAPI?.executeCommand({ command: cmd });
      } catch (e) {
        console.error('[App] Failed to execute PC shutdown command:', e);
      }
      setTimeout(() => {
        window.visionAPI?.closeWindow();
      }, 3000);
      return;
    }

    // Fast-Path 2: Pure Greeting or Instant Telemetry Status
    if (isPureChatGreeting || isTelemetryReport) {
      addLog('SUCCESS', 'Rule.Engine', `Matched fast-path: ${ruleMatch.intent}`);
      const finishTime = new Date().toTimeString().split(' ')[0];
      setLastResponse(responseText);
      setInterimTranscript('');

      setActions((prev) =>
        prev.map((act) => {
          if (act.id === actionId) {
            const updated = {
              ...act,
              status: 'COMPLETED' as const,
              completedAt: finishTime,
              durationMs: 300,
              steps: [
                ...act.steps,
                { id: '2', timestamp: finishTime, type: 'result' as const, message: `Action executed successfully`, status: 'success' as const },
              ],
              outputSummary: responseText,
            };
            sessionManager.recordAction(updated);
            return updated;
          }
          return act;
        })
      );

      setSystemStatus('READY');
      const fastTurn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        timestamp: finishTime,
        userPrompt: cmdText,
        agentResponse: responseText,
      };
      memoryManager.addTurn(cmdText, responseText);
      sessionManager.recordTurn(fastTurn);

      if (source === 'remote') {
        (window.visionAPI as any)?.streamRemoteCompleted?.(actionId, responseText, []);
      }

      await speakAndListen(responseText, { allowMicResume: source !== 'remote' });
      processNextQueuedCommand();
    } else {
      // 3. ALL Digital Actions, Tools, and Multi-Task Requests are Routed to Agent Core
      isExecutingRef.current = true;
      const provider = llmProviderManager.getProvider();
      addLog('INFO', 'Agent.Core', `Routing command to Agent Core [${provider.name}:${provider.defaultModel}]: "${cmdText}"`);
      
      try {
        const history = memoryManager.getConversationHistory();
        const agentResult = await agentCore.run(cmdText, history, {
          onStep: (step) => {
            const level = step.status === 'error' ? 'ERROR' : step.status === 'warning' ? 'WARNING' : 'SUCCESS';
            const detailsStr = step.result ? `\nDetails: ${typeof step.result === 'object' ? JSON.stringify(step.result, null, 2) : String(step.result)}` : '';
            addLog(level, `Agent.${step.type}`, `${step.message}${detailsStr}`);
            (window.visionAPI as any)?.streamRemoteStep?.(actionId, step);

            // Show the tool call when it starts, then replace its live state with the
            // actual observation. Completed cards remain available in the side dock.
            if (step.toolName && (step.type === 'tool_selection' || step.type === 'observation' || step.type === 'execution')) {
              const toolName = step.toolName;
              const normalizedName = toolName.toLowerCase();
              const isVision = /vision|analyze_screen|screenshot|analyze_image/.test(normalizedName);
              const isWhatsApp = /whatsapp/.test(normalizedName);
              const isWeb = /browser|web_search|fetch_web_page/.test(normalizedName);
              const isApp = /app_control|launch_app|close_app/.test(normalizedName);
              const type: HoloCard['type'] = isVision ? 'vision_scan' : isWhatsApp ? 'whatsapp_comm' : isWeb ? 'web_research' : isApp ? 'app_control' : 'terminal_exec';
              const cardId = agentToolCardsRef.current[toolName];
              const isStart = step.type === 'tool_selection';
              const outcome = step.status === 'error' ? 'FAILED' : step.status === 'warning' ? 'WAITING' : 'COMPLETED';
              const rawResult = step.result?.output ?? step.result;
              const resultSummary = typeof rawResult === 'string'
                ? rawResult
                : rawResult?.message || rawResult?.analysis || step.message;

              if (isStart || !cardId) {
                const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const args = step.args || {};
                const query = args.query || args.search_query || args.url || args.action || step.message;
                const newCard: HoloCard = {
                  id,
                  type,
                  title: isVision ? 'SCREEN & IMAGE ANALYSIS' : isWhatsApp ? 'WHATSAPP' : isWeb ? 'WEB RESEARCH' : isApp ? 'APPLICATION CONTROL' : `TOOL // ${toolName}`,
                  subtitle: isVision ? (args.file_path || args.image_path || 'Analyzing the current screen') : isWhatsApp ? `Target: ${args.recipient || args.contact_name || 'Resolving recipient'}${args.action === 'send_screenshot' || toolName.includes('screenshot') ? ' • SCREENSHOT' : ''}` : isWeb ? String(query) : isApp ? `Target: ${args.app_name || args.appName || 'Application'}` : step.message,
                  timestamp: new Date().toLocaleTimeString(),
                  status: 'active',
                  position: { x: Math.max(24, (window.innerWidth - 760) / 2), y: Math.max(74, (window.innerHeight - 680) / 2) },
                  isExpanded: true,
                  data: {
                    operationStatus: 'RUNNING',
                    ...(isVision ? { imageUrl: args.image_url || args.file_path } : {}),
                    ...(isWhatsApp ? {
                      contactName: args.recipient || args.contact_name,
                      messageText: args.message || args.caption,
                      actionType: args.action === 'send_screenshot' || toolName.includes('screenshot') ? 'send_screenshot' as const : args.action === 'send_file' ? 'send_file' as const : 'send_message' as const,
                      commStatus: 'CONNECTING' as const,
                    } : {}),
                    ...(isWeb ? { query: String(query), searchPhase: 'ORBITAL_SCAN' as const } : {}),
                    ...(isApp ? { appName: args.app_name || args.appName || 'Application', appStatus: 'LAUNCHING' as const } : {}),
                    ...(!isVision && !isWhatsApp && !isWeb && !isApp ? { command: step.message, outputs: ['Executing tool…'] } : {}),
                  },
                };
                agentToolCardsRef.current[toolName] = id;
                setHoloCards((prev) => [newCard, ...prev.map((item) => item.status === 'active' ? { ...item, status: 'docked' as const } : item)]);

                const screenshotAction = isWhatsApp && (args.action === 'send_screenshot' || toolName.includes('screenshot'));
                if (isVision && args.file_path && window.visionAPI?.readImageBase64) {
                  window.visionAPI.readImageBase64(args.file_path).then((preview) => {
                    if (preview.success && preview.dataUrl) {
                      setHoloCards((prev) => prev.map((item) => item.id === id
                        ? { ...item, data: { ...item.data, imageUrl: preview.dataUrl } }
                        : item));
                    }
                  }).catch(() => undefined);
                } else if ((isVision || screenshotAction) && window.visionAPI?.takeScreenshot) {
                  window.visionAPI.takeScreenshot({ screenIndex: args.screen_index || 0 }).then((preview) => {
                    if (!preview.success || !preview.dataUrl) return;
                    setHoloCards((prev) => prev.map((item) => item.id === id
                      ? { ...item, data: isVision
                        ? { ...item.data, imageUrl: preview.dataUrl }
                        : { ...item.data, mediaUrl: preview.dataUrl, mediaLabel: `LIVE DESKTOP // SCREEN ${args.screen_index || 0}` } }
                      : item));
                  }).catch(() => undefined);
                }
              } else {
                setHoloCards((prev) => prev.map((item) => {
                  if (item.id !== cardId) return item;
                  const data: HoloCard['data'] = {
                    ...item.data,
                    operationStatus: outcome,
                    resultSummary: String(resultSummary || ''),
                    ...(isVision ? {
                      imageUrl: rawResult?.dataUrl || rawResult?.output?.dataUrl || item.data.imageUrl,
                      analysisNotes: [String(resultSummary || step.message)],
                    } : {}),
                    ...(isWeb ? {
                      searchPhase: outcome === 'COMPLETED' ? 'COMPLETE' as const : 'EXTRACTING' as const,
                      results: Array.isArray(rawResult?.results)
                        ? rawResult.results
                        : Array.isArray(rawResult?.output?.results)
                          ? rawResult.output.results
                          : item.data.results || [],
                    } : {}),
                    ...(isApp ? { appStatus: outcome === 'COMPLETED' ? 'FOCUSED' as const : 'LAUNCHING' as const } : {}),
                    ...(isWhatsApp ? {
                      contactName: rawResult?.recipient || item.data.contactName,
                      contactPhone: rawResult?.phone || item.data.contactPhone,
                      ...(rawResult?.screenshotPath ? { mediaLabel: 'SENT SCREENSHOT ATTACHMENT' } : {}),
                      commStatus: outcome === 'COMPLETED' ? 'DELIVERED' as const : 'CONNECTING' as const,
                    } : {}),
                    ...(!isVision && !isWhatsApp && !isWeb && !isApp ? { outputs: String(resultSummary || step.message).split('\n').slice(0, 8) } : {}),
                  };
                  return { ...item, subtitle: resultSummary, status: outcome === 'COMPLETED' ? 'docked' : 'active', data };
                }));
                const screenshotPath = rawResult?.screenshotPath;
                if (isWhatsApp && screenshotPath && window.visionAPI?.readImageBase64) {
                  window.visionAPI.readImageBase64(screenshotPath).then((imageResult) => {
                    if (!imageResult.success || !imageResult.dataUrl) return;
                    setHoloCards((prev) => prev.map((item) => item.id === cardId
                      ? { ...item, data: { ...item.data, mediaUrl: imageResult.dataUrl, mediaLabel: 'SENT SCREENSHOT ATTACHMENT' } }
                      : item));
                  }).catch(() => undefined);
                }
                delete agentToolCardsRef.current[toolName];
              }
            }
          },
          onThinking: (thinking) => {
            addLog('DEBUG', 'Agent.Thinking', thinking);
            (window.visionAPI as any)?.streamRemoteThinking?.(thinking, actionId);
          },
          onNarrate: (speechText) => {
            localVoice.narrate(speechText);
            setInterimTranscript(`⚡ ${speechText}`);
            addLog('INFO', 'Voice.Narrate', speechText);
            (window.visionAPI as any)?.streamRemoteNarrate?.(speechText, /[\u0600-\u06FF]/.test(speechText), actionId);
          },
        });

        const finishTime = new Date().toTimeString().split(' ')[0];
        setInterimTranscript('');
        const executedSteps: ActionLogStep[] = agentResult.steps.map((s) => ({
          id: s.id,
          timestamp: s.timestamp,
          type: s.type === 'thinking' ? 'intent' : s.type,
          message: s.message,
          status: s.status,
          details: s.result,
        }));

        const isConfirm = agentResult.status === 'CONFIRMATION_REQUIRED';
        const finalOutput = agentResult.finalText;

        setLastResponse(finalOutput);

        // Record conversational turn in Working Memory & Sessions
        const agentTurn: ConversationTurn = {
          id: `turn_${Date.now()}`,
          timestamp: finishTime,
          userPrompt: cmdText,
          agentResponse: finalOutput,
          toolsUsed: agentResult.toolsUsed,
        };
        memoryManager.addTurn(cmdText, finalOutput, agentResult.toolsUsed);
        sessionManager.recordTurn(agentTurn);

        // Extract any captured screenshot or vision inspect preview
        const screenshotStep = executedSteps.find(
          (s) => s.details?.metadata?.dataUrl || s.details?.dataUrl || s.details?.output?.dataUrl
        );
        const screenshotUrl =
          screenshotStep?.details?.metadata?.dataUrl ||
          screenshotStep?.details?.dataUrl ||
          screenshotStep?.details?.output?.dataUrl;
        const screenshotPath =
          screenshotStep?.details?.metadata?.filePath ||
          screenshotStep?.details?.filePath ||
          screenshotStep?.details?.output?.filePath;

        setActions((prev) =>
          prev.map((act) => {
            if (act.id === actionId) {
              const updated = {
                ...act,
                status: isConfirm ? ('CONFIRMATION_REQUIRED' as const) : (agentResult.status === 'COMPLETED' ? ('COMPLETED' as const) : ('FAILED' as const)),
                completedAt: finishTime,
                durationMs: 1200,
                steps: [
                  ...act.steps,
                  ...executedSteps,
                ],
                outputSummary: finalOutput,
                screenshotUrl: screenshotUrl || act.screenshotUrl,
                screenshotPath: screenshotPath || act.screenshotPath,
                pendingConfirmation: isConfirm ? agentResult.pendingConfirmation : undefined,
              };
              sessionManager.recordAction(updated);
              return updated;
            }
            return act;
          })
        );

        if (isConfirm) {
          setSystemStatus('WAITING');
          addLog('WARNING', 'Permission.Manager', `Action requires authorization: ${agentResult.pendingConfirmation?.reason}`);
          (window.visionAPI as any)?.streamRemoteConfirmationRequired?.({
            actionId,
            toolName: agentResult.pendingConfirmation?.toolName,
            reason: agentResult.pendingConfirmation?.reason || 'Authorization required',
            args: agentResult.pendingConfirmation?.args,
            permissionLevel: 3,
            requestedAt: new Date().toISOString(),
          });
        } else {
          setSystemStatus('READY');
          addLog('SUCCESS', 'Agent.Response', `Agent Output:\n${finalOutput}`);
          addLog('SUCCESS', 'Agent.Core', `Agent task completed successfully.`);
          (window.visionAPI as any)?.streamRemoteCompleted?.(actionId, finalOutput, agentResult.toolsUsed);
        }

        await speakAndListen(finalOutput, { allowMicResume: source !== 'remote' && !isConfirm });
      } catch (err: any) {
        setSystemStatus('ERROR');
        setInterimTranscript('');
        const errText = `Communication error with AI Engine: ${err.message}`;
        setLastResponse(errText);
        addLog('ERROR', 'Agent.Core', `Agent Error: ${err.message}${err.stack ? `\nStack trace:\n${err.stack}` : ''}`);
        (window.visionAPI as any)?.streamRemoteFailed?.(actionId, err.message);
        await speakAndListen(errText, { allowMicResume: source !== 'remote' });
      } finally {
        processNextQueuedCommand();
      }
    }
  };

  handleSubmitCommandRef.current = handleSubmitCommand;

  const handleConfirmAction = async (actionId: string) => {
    setSystemStatus('EXECUTING');
    addLog('SUCCESS', 'Permission.Manager', `Action ${actionId} authorized.`);

    const targetAction = actionsRef.current.find((a) => a.id === actionId);
    const pending = targetAction?.pendingConfirmation;

    if (pending) {
      try {
        const finishTime = new Date().toTimeString().split(' ')[0];
        addLog('INFO', 'Execution.Engine', `Executing authorized tool "${pending.toolName}"...`);
        const execRes = await executionEngine.executeTool(
          pending.toolName,
          pending.args,
          { caller: 'user_permission_dialog', confirmed: true }
        );

        const isSuccess = execRes.status === 'COMPLETED' && execRes.result?.success !== false;
        const resultMsg = execRes.result?.message || (isSuccess ? `Successfully executed ${pending.toolName}.` : `Failed to execute ${pending.toolName}: ${execRes.error || 'Unknown error'}`);

        setActions((prev) =>
          prev.map((act) => {
            if (act.id === actionId) {
              return {
                ...act,
                status: isSuccess ? 'COMPLETED' : 'FAILED',
                completedAt: finishTime,
                durationMs: 1200,
                steps: [
                  ...act.steps,
                  { id: `auth-${Date.now()}`, timestamp: finishTime, type: 'permission_check', message: 'Explicit user authorization granted', status: 'success' },
                  { id: `exec-${Date.now()}`, timestamp: finishTime, type: 'execution', message: resultMsg, status: isSuccess ? 'success' : 'error' },
                ],
                outputSummary: resultMsg,
                pendingConfirmation: undefined,
              };
            }
            return act;
          })
        );

        setSystemStatus('READY');
        addLog(isSuccess ? 'SUCCESS' : 'ERROR', 'Execution.Engine', `Action ${actionId}: ${resultMsg}`);
        await speakAndListen(resultMsg, { allowMicResume: activeCommandSourceRef.current !== 'remote' });
        processNextQueuedCommand();
      } catch (err: any) {
        setSystemStatus('ERROR');
        addLog('ERROR', 'Execution.Engine', `Execution error for ${actionId}: ${err.message}`);
        await speakAndListen(`An error occurred during execution: ${err.message}`, { allowMicResume: activeCommandSourceRef.current !== 'remote' });
        processNextQueuedCommand();
      }
    } else {
      // Fallback if no pending tool was attached
      const finishTime = new Date().toTimeString().split(' ')[0];
      setActions((prev) =>
        prev.map((act) =>
          act.id === actionId
            ? { ...act, status: 'COMPLETED', completedAt: finishTime, outputSummary: 'Action confirmed successfully.' }
            : act
        )
      );
      setSystemStatus('READY');
      await speakAndListen('Action authorized and completed successfully.', { allowMicResume: activeCommandSourceRef.current !== 'remote' });
      processNextQueuedCommand();
    }
  };

  const handleCancelAction = async (actionId: string) => {
    setActions((prev) =>
      prev.map((act) => {
        if (act.id === actionId) {
          return {
            ...act,
            status: 'FAILED',
            errorMessage: 'Action authorization denied by user.',
            outputSummary: 'Action was canceled per your request.',
            pendingConfirmation: undefined,
          };
        }
        return act;
      })
    );
    setSystemStatus('READY');
    addLog('WARNING', 'Permission.Manager', `Action ${actionId} was denied.`);
    await speakAndListen('Action was canceled per your request.', { allowMicResume: activeCommandSourceRef.current !== 'remote' });
    processNextQueuedCommand();
  };

  handleConfirmActionRef.current = handleConfirmAction;
  handleCancelActionRef.current = handleCancelAction;

  const activeActionsCount = actions.filter((a) => a.status === 'EXECUTING' || a.status === 'CONFIRMATION_REQUIRED').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-vision-bg text-vision-text system-grid overflow-hidden font-sans relative">
      {/* Ambient Holographic Particle & Starfield Background (Reacts dynamically to VISION state) */}
      <HoloBackground status={systemStatus} audioLevel={audioLevel} />

      {/* Top Bar Header (Frameless Floating Micro-Controls) */}
      <TopBar
        status={systemStatus}
        telemetry={telemetry}
        queuedCount={queuedCount}
        onEmergencyStop={handleEmergencyStop}
        onShutdown={handleShutdown}
        onOpenSettings={() => setActiveTab('settings')}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Main OS Body: Collapsible Slide-Out Sidebar + Boundless Holographic Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          activeActionsCount={activeActionsCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Dynamic Full-Width Workspace Container */}
        <main className="flex-1 w-full h-full bg-vision-bg/90 overflow-hidden relative">
          {/* Iron Man Real-Time Holographic Action Canvas */}
          <JarvisHoloActionCanvas
            cards={holoCards}
            onUpdateCard={handleUpdateHoloCard}
            onRemoveCard={handleRemoveHoloCard}
          />

          {(activeTab === 'home' || activeTab === 'command') && (
            <CommandCenterHUD
              status={systemStatus}
              telemetry={telemetry}
              actions={actions}
              audioLevel={audioLevel}
              interimTranscript={interimTranscript}
              lastTranscript={lastTranscript}
              lastResponse={lastResponse}
              onSubmitCommand={handleSubmitCommand}
              onToggleMic={handleToggleMic}
              onConfirmAction={handleConfirmAction}
              onCancelAction={handleCancelAction}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              status={systemStatus}
              actions={actions}
              audioLevel={audioLevel}
              interimTranscript={interimTranscript}
              lastTranscript={lastTranscript}
              lastResponse={lastResponse}
              onSubmitCommand={handleSubmitCommand}
              onToggleMic={handleToggleMic}
              onNavigateTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'vision' && <VisionHUDView />}

          {activeTab === 'projects' && <ProjectsHUDView />}

          {activeTab === 'tools' && <ToolsHUDView />}

          {activeTab === 'system' && (
            <SystemHUDView
              telemetry={telemetry}
              logs={logs}
              onClearLogs={() => setLogs([])}
            />
          )}

          {activeTab === 'activity' && (
            <ActivityView
              logs={logs}
              actions={actions}
              telemetry={telemetry}
              onClearLogs={() => setLogs([])}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryView onNavigateTab={(tab) => setActiveTab(tab as any)} />
          )}

          {activeTab === 'sessions' && (
            <SessionsHUDView
              onNavigateTab={(tab) => setActiveTab(tab as any)}
              onRestoreSession={(restored) => {
                setActions(restored.actions || []);
              }}
            />
          )}

          {activeTab === 'settings' && <SettingsHUDView />}

          {activeTab === 'actions' && (
            <ActionsView
              actions={actions}
              onConfirmAction={handleConfirmAction}
              onCancelAction={handleCancelAction}
            />
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
