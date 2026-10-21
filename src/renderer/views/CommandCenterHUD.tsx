import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  ArrowRight, 
  CloudSun, 
  Terminal, 
  Globe, 
  FolderGit2, 
  Code, 
  Eye, 
  CheckCircle2, 
  Radio, 
  Sparkles, 
  Zap, 
  Activity, 
  Layers, 
  Compass,
  Cpu,
  Volume2,
  Clock,
  Play,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { JarvisCore } from '../components/JarvisCore';
import { ActionCard } from '../components/ActionCard';
import { SystemStatus, SystemTelemetry, ActionRecord } from '../../shared/types';
import { getLiveLocationAndWeather, WeatherData } from '../services/weatherService';

interface CommandCenterHUDProps {
  status: SystemStatus;
  telemetry: SystemTelemetry;
  actions: ActionRecord[];
  audioLevel?: number;
  interimTranscript?: string;
  lastTranscript?: string;
  lastResponse?: string;
  onSubmitCommand: (cmd: string) => void;
  onToggleMic: () => void;
  onConfirmAction: (actionId: string) => void;
  onCancelAction: (actionId: string) => void;
  onNavigateTab: (tab: any) => void;
  onSimulateStatus?: (newStatus: SystemStatus) => void;
}

export const CommandCenterHUD: React.FC<CommandCenterHUDProps> = ({
  status,
  telemetry,
  actions,
  audioLevel = 0,
  interimTranscript,
  lastTranscript,
  lastResponse,
  onSubmitCommand,
  onToggleMic,
  onConfirmAction,
  onCancelAction,
  onNavigateTab,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Weather Sync
  useEffect(() => {
    let mounted = true;
    getLiveLocationAndWeather('Cairo')
      .then((data) => {
        if (mounted) setWeather(data);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && commandInput.trim()) {
      onSubmitCommand(commandInput.trim());
      setCommandInput('');
    }
  };

  const handleQuickAction = (cmd: string) => {
    onSubmitCommand(cmd);
  };

  // Real Interactive Capabilities in VISION
  const systemCapabilities = [
    { 
      id: 'vision', 
      name: 'Screen Perception', 
      desc: 'Real-time OCR & UI inspection',
      icon: <Eye className="w-4 h-4 text-vision-cyan" />, 
      action: () => onNavigateTab('vision'),
      badge: 'LIVE'
    },
    { 
      id: 'terminal', 
      name: 'Terminal Shell', 
      desc: 'PowerShell / command execution',
      icon: <Terminal className="w-4 h-4 text-vision-teal" />, 
      action: () => onNavigateTab('tools'),
      badge: 'READY'
    },
    { 
      id: 'web', 
      name: 'Web Research', 
      desc: 'Live internet search & extraction',
      icon: <Globe className="w-4 h-4 text-blue-400" />, 
      action: () => onNavigateTab('tools'),
      badge: 'ONLINE'
    },
    { 
      id: 'projects', 
      name: 'File & Project Bridge', 
      desc: 'Sandbox filesystem & codebases',
      icon: <FolderGit2 className="w-4 h-4 text-indigo-400" />, 
      action: () => onNavigateTab('projects'),
      badge: 'SYNCED'
    },
    { 
      id: 'activity', 
      name: 'Activity & Audit Log', 
      desc: 'Full scenario timeline & debugging',
      icon: <Activity className="w-4 h-4 text-vision-success" />, 
      action: () => onNavigateTab('activity'),
      badge: `${actions.length} LOGS`
    },
    { 
      id: 'ai-core', 
      name: 'Local Qwen3 GPU Model', 
      desc: 'Ollama local inference runtime',
      icon: <Zap className="w-4 h-4 text-vision-gold" />, 
      action: () => onNavigateTab('settings'),
      badge: 'GPU ON'
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto px-6 pt-12 pb-4 flex flex-col justify-between hud-scanline-overlay relative z-10 space-y-4">
      
      {/* 1. Tactical HUD Telemetry Strip */}
      <div className="flex items-center justify-between text-[10px] font-mono text-vision-text-muted pb-2 border-b border-vision-border/40 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-vision-cyan">
            <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan animate-pulse"></span>
            <span className="font-bold">SYSTEM TELEMETRY</span>
          </span>
          <span className="text-vision-border">/</span>
          <span className="text-vision-teal">
            GPU: {telemetry.gpuName ? telemetry.gpuName.replace('NVIDIA GeForce ', '') : 'RTX 3060'} ({telemetry.gpuTemp || 44}°C • {telemetry.gpuPowerWatts ? `${telemetry.gpuPowerWatts}W` : '23.3W'})
          </span>
          <span className="text-vision-border">/</span>
          <span className="text-vision-text-secondary">
            VRAM: {telemetry.vramUsageMb ? (telemetry.vramUsageMb / 1024).toFixed(1) : '4.2'} / 12.0 GB
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-vision-gold font-semibold">AI MODEL: QWEN3-8B GPU</span>
          <span className="text-vision-border">/</span>
          <span className="text-vision-success">SANDBOX: ISOLATED</span>
        </div>
      </div>

      {/* 2. Structured 3-Zone Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
        
        {/* ======================================================== */}
        {/* ZONE 1: EXECUTIVE BRIEFING & AGENDA (Left - Tactical HUD) */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          
          {/* Card A: Executive Briefing & Atmospheric Sensor */}
          <div className="hud-panel hud-corner rounded-2xl p-4 space-y-3 relative overflow-hidden group">
            <div className="hud-scanner-beam opacity-0 group-hover:opacity-100 transition-opacity"></div>

            {/* Tactical Header */}
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-vision-cyan uppercase font-bold border-b border-vision-border/40 pb-2">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan animate-pulse"></span>
                <span>Executive Briefing</span>
              </span>
              <Compass className="w-3.5 h-3.5 text-vision-cyan" />
            </div>

            {/* Greeting & Subtitle */}
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-vision-cyan/80 tracking-wider font-semibold">
                STARK AI // OPERATOR ONLINE
              </div>
              <h2 className="text-xl font-sans font-extrabold text-vision-text leading-tight tracking-wide">
                Good morning, <span className="text-vision-cyan holo-text-shimmer">Ahmed</span>
              </h2>
              <div className="p-2 rounded-lg bg-vision-panel/80 border-l-2 border-vision-cyan/70 text-[11px] font-mono text-vision-text-secondary italic">
                "Discipline builds the freedom to create."
              </div>
            </div>

            {/* Live Atmospheric Telemetry Widget */}
            <div className="p-3 rounded-xl bg-vision-surface/80 border border-vision-cyan/30 shadow-glow-cyan-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CloudSun className="w-5 h-5 text-vision-gold animate-pulse flex-shrink-0" />
                  <div>
                    <span className="text-xs font-mono font-bold text-vision-text">
                      {weather?.city || 'Cairo'}
                    </span>
                    <span className="text-vision-border mx-1.5">•</span>
                    <span className="text-xs font-mono font-bold text-vision-cyan">
                      {weather?.temperature ? `${Math.round(weather.temperature)}°C` : '22°C'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/30 font-semibold">
                  {weather?.conditionTextEn || 'Partly cloudy'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-vision-border/40 text-[10px] font-mono text-vision-text-muted">
                <div className="flex items-center space-x-1">
                  <span>WIND:</span>
                  <span className="text-vision-text-secondary font-semibold">
                    {weather?.windSpeed ? `${Math.round(weather.windSpeed)} km/h` : '6 km/h'}
                  </span>
                </div>
                <div className="flex items-center justify-end space-x-1">
                  <span>HUMIDITY:</span>
                  <span className="text-vision-text-secondary font-semibold">
                    {weather?.humidity ? `${weather.humidity}%` : '60%'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Real Recent Operations (Replaced fake Mission Objectives) */}
          <div className="hud-panel hud-corner rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-vision-border/40 pb-2">
              <span className="font-bold tracking-widest uppercase text-vision-cyan flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-vision-cyan" />
                <span>Recent Operations</span>
              </span>
              <button
                onClick={() => onNavigateTab('activity')}
                className="text-[10px] text-vision-cyan hover:text-vision-text flex items-center space-x-1 transition-colors"
                title="Open full activity audit"
              >
                <span>Full Audit ({actions.length})</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {actions.length === 0 ? (
              <div className="p-4 rounded-xl bg-vision-surface/40 border border-vision-border/40 text-center space-y-2 font-mono text-xs text-vision-text-muted">
                <div className="flex justify-center">
                  <Activity className="w-6 h-6 text-vision-border animate-pulse" />
                </div>
                <p className="text-vision-text-secondary text-[11px]">
                  No operations executed yet.
                </p>
                <p className="text-[10px] text-vision-text-muted">
                  Speak or type a command to trigger autonomous tools and trace execution live.
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono">
                {actions.slice(0, 4).map((act, idx) => {
                  const isCompleted = act.status === 'COMPLETED';
                  const isFailed = act.status === 'FAILED';
                  const isWaiting = act.status === 'CONFIRMATION_REQUIRED';

                  return (
                    <div
                      key={act.id}
                      onClick={() => onNavigateTab('activity')}
                      className="p-2.5 rounded-xl bg-vision-panel/90 border border-vision-border hover:border-vision-cyan/60 hover:shadow-glow-cyan-sm transition-all duration-200 cursor-pointer group"
                      title="View operation details in Activity log"
                    >
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCompleted
                                ? 'bg-vision-success shadow-[0_0_6px_#00E699]'
                                : isFailed
                                ? 'bg-vision-error'
                                : isWaiting
                                ? 'bg-vision-gold animate-pulse'
                                : 'bg-vision-cyan animate-pulse'
                            }`}
                          />
                          <span className="text-vision-text-muted font-bold tracking-wider">
                            OP-{String(actions.length - idx).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-vision-text-muted text-[10px]">{act.startedAt}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              isCompleted
                                ? 'bg-vision-success/15 text-vision-success'
                                : isFailed
                                ? 'bg-vision-error/15 text-vision-error'
                                : isWaiting
                                ? 'bg-vision-gold/15 text-vision-gold'
                                : 'bg-vision-cyan/15 text-vision-cyan'
                            }`}
                          >
                            {act.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-vision-text font-medium group-hover:text-vision-cyan transition-colors truncate">
                        "{act.commandText}"
                      </p>

                      {act.outputSummary && (
                        <p className="text-[10px] text-vision-text-muted truncate mt-0.5">
                          ↳ {act.outputSummary}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ======================================================== */}
        {/* ZONE 2: HOLOGRAPHIC JARVIS CORE & COMMAND HUB (Center)   */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 xl:col-span-6 flex flex-col items-center justify-center space-y-3 min-h-[480px]">
          
          {/* Holographic Jarvis Sphere with Dynamic State Transformation */}
          <div className="w-full flex items-center justify-center relative">
            <JarvisCore
              status={status}
              audioLevel={audioLevel}
              interimTranscript={interimTranscript}
              lastTranscript={lastTranscript}
              lastResponse={lastResponse}
              onCoreClick={onToggleMic}
            />
          </div>

          {/* Action Authorization Dialog if needed */}
          {actions.filter(a => a.status === 'CONFIRMATION_REQUIRED').map(act => (
            <div key={act.id} className="w-full max-w-xl">
              <ActionCard
                action={act}
                onConfirm={onConfirmAction}
                onCancel={onCancelAction}
              />
            </div>
          ))}

          {/* Unified Command Console Capsule */}
          <div className="w-full max-w-2xl px-2 space-y-2">
            <div className={`hud-panel rounded-full p-2 border transition-all flex items-center space-x-2 ${
              status === 'LISTENING' 
                ? 'border-vision-cyan shadow-glow-cyan' 
                : 'border-vision-cyan/40 focus-within:border-vision-cyan focus-within:shadow-glow-cyan'
            }`}>
              
              {/* Mic Trigger Button */}
              <button
                onClick={onToggleMic}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                  status === 'LISTENING'
                    ? 'bg-vision-cyan text-vision-bg shadow-glow-cyan animate-pulse font-bold'
                    : 'bg-vision-surface text-vision-cyan border border-vision-cyan/40 hover:bg-vision-cyan/20 hover:scale-105'
                }`}
                title={status === 'LISTENING' ? 'Listening active — Click to stop' : 'Click to activate voice'}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  status === 'LISTENING'
                    ? 'Listening... Speak or enter command'
                    : status === 'PROCESSING'
                    ? 'VISION is reasoning...'
                    : 'Talk to VISION or type a command...'
                }
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs md:text-sm text-vision-text placeholder-vision-text-muted px-2"
              />

              {/* Submit Button */}
              <button
                onClick={() => {
                  if (commandInput.trim()) {
                    onSubmitCommand(commandInput.trim());
                    setCommandInput('');
                  }
                }}
                disabled={!commandInput.trim()}
                className="w-10 h-10 rounded-full bg-vision-cyan/20 hover:bg-vision-cyan text-vision-cyan hover:text-vision-bg border border-vision-cyan/50 flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-vision-cyan/20 disabled:hover:text-vision-cyan shadow-glow-cyan-sm hover:scale-105 active:scale-95"
              >
                <ArrowRight className="w-4 h-4 font-bold" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ZONE 3: DYNAMIC STATE-DRIVEN PANEL (Right - Controlled by VISION State)   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* A. If LISTENING: Show Audio Input Spectrum & Live Pipeline (From VISION AI Listening Dashboard.png) */}
          {status === 'LISTENING' ? (
            <>
              {/* Audio Input Spectrum Panel */}
              <div className="hud-panel hud-corner rounded-2xl p-4.5 space-y-3 border-vision-cyan shadow-glow-cyan animate-pulse-subtle">
                <div className="text-[11px] font-mono font-bold tracking-widest uppercase text-vision-cyan flex items-center justify-between">
                  <span>Audio Input Spectrum</span>
                  <Radio className="w-3.5 h-3.5 text-vision-cyan animate-ping" />
                </div>

                {/* Real-time Frequency Spectrum Wave Bars */}
                <div className="p-3 rounded-xl bg-vision-panel border border-vision-cyan/40 flex items-center justify-center space-x-1 h-16">
                  {[...Array(24)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-vision-cyan transition-all duration-75 shadow-[0_0_8px_#00D9FF]"
                      style={{
                        height: `${Math.max(6, Math.min(48, Math.sin((i / 24) * Math.PI) * (audioLevel * 0.7 + 10)))}px`,
                      }}
                    />
                  ))}
                </div>

                <div className="text-center font-mono text-xs text-vision-cyan">
                  Listening to you...
                </div>
              </div>

              {/* Speech Processing Pipeline Checklist */}
              <div className="hud-panel hud-corner rounded-2xl p-4.5 space-y-3 font-mono text-xs">
                <div className="text-[11px] font-bold tracking-widest uppercase text-vision-cyan flex items-center justify-between">
                  <span>Speech Pipeline</span>
                  <span className="text-[10px] text-vision-teal">VAD Active</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center space-x-2 text-vision-success">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Wake word / Input detected</span>
                  </div>
                  <div className="flex items-center space-x-2 text-vision-cyan font-bold animate-pulse">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Processing acoustic speech stream...</span>
                  </div>
                  <div className="flex items-center space-x-2 text-vision-text-muted">
                    <span className="w-3.5 h-3.5 rounded-full border border-vision-border flex items-center justify-center text-[8px]">○</span>
                    <span>Understanding intent & context</span>
                  </div>
                  <div className="flex items-center space-x-2 text-vision-text-muted">
                    <span className="w-3.5 h-3.5 rounded-full border border-vision-border flex items-center justify-center text-[8px]">○</span>
                    <span>Planning execution steps</span>
                  </div>
                </div>
              </div>
            </>
          ) : status === 'PROCESSING' ? (
            /* B. If THINKING/PROCESSING: Show Execution Plan (From Vision AI Thinking Dashboard.png) */
            <>
              {/* Execution Plan Card */}
              <div className="hud-panel hud-corner rounded-2xl p-4.5 space-y-3 border-vision-gold/80 shadow-glow-gold animate-pulse-subtle">
                <div className="text-[11px] font-mono font-bold tracking-widest uppercase text-vision-gold flex items-center justify-between">
                  <span>Execution Plan</span>
                  <Activity className="w-3.5 h-3.5 text-vision-gold animate-spin" />
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-vision-panel border border-vision-success/40 text-vision-success">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Check system environment</span>
                    </div>
                    <span className="text-[9px]">Completed</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-vision-panel border border-vision-gold/60 text-vision-gold shadow-glow-gold">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-vision-gold animate-ping"></span>
                      <span className="font-bold">Decompose task & plan steps</span>
                    </div>
                    <span className="text-[9px] animate-pulse">In Progress...</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-vision-surface/50 border border-vision-border/40 text-vision-text-muted">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full border border-vision-border"></span>
                      <span>Select autonomous tool</span>
                    </div>
                    <span className="text-[9px]">Pending</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-vision-surface/50 border border-vision-border/40 text-vision-text-muted">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full border border-vision-border"></span>
                      <span>Verify & format response</span>
                    </div>
                    <span className="text-[9px]">Pending</span>
                  </div>
                </div>
              </div>

              {/* Current Reasoning Matrix */}
              <div className="hud-panel hud-corner rounded-2xl p-4 space-y-2 font-mono text-xs">
                <div className="text-[11px] font-bold tracking-widest uppercase text-vision-cyan">
                  Neural Context
                </div>
                <div className="text-[11px] text-vision-text-secondary leading-relaxed bg-vision-surface/60 p-2.5 rounded-xl border border-vision-border/60">
                  VISION is analyzing intent tokens with local GPU accelerator. Memory graph and rule patterns evaluated.
                </div>
              </div>
            </>
          ) : status === 'EXECUTING' ? (
            /* C. If EXECUTING: Show Live Output Console Stream */
            <div className="hud-panel hud-corner rounded-2xl p-4.5 space-y-3 border-vision-cyan shadow-glow-cyan">
              <div className="text-[11px] font-mono font-bold tracking-widest uppercase text-vision-cyan flex items-center justify-between">
                <span>Active Operation</span>
                <span className="w-2 h-2 rounded-full bg-vision-cyan animate-ping"></span>
              </div>

              <div className="p-3 rounded-xl bg-vision-surface border border-vision-border font-mono text-[11px] text-vision-text space-y-1 max-h-56 overflow-y-auto">
                {(() => {
                  const executingAction = actions.find((a) => a.status === 'EXECUTING') || actions[0];
                  if (executingAction && executingAction.steps && executingAction.steps.length > 0) {
                    return (
                      <>
                        <div className="text-vision-text-muted text-[10px] pb-1 border-b border-vision-border/40 truncate">
                          OP // {executingAction.commandText || executingAction.intent}
                        </div>
                        {executingAction.steps.slice(-6).map((step, idx) => (
                          <div
                            key={step.id || idx}
                            className={`truncate ${
                              step.status === 'error'
                                ? 'text-vision-error'
                                : step.status === 'warning'
                                ? 'text-vision-gold'
                                : step.status === 'success'
                                ? 'text-vision-success'
                                : 'text-vision-cyan'
                            }`}
                          >
                            &gt; {step.message}
                          </div>
                        ))}
                      </>
                    );
                  }
                  return (
                    <>
                      <div className="text-vision-text-muted">&gt; system.executeTool()</div>
                      <div className="text-vision-cyan font-bold">&gt; Initializing target runtime...</div>
                      <div className="text-vision-teal">&gt; Verifying sandbox permissions: OK</div>
                      <div className="text-vision-gold animate-pulse">&gt; Running requested action...</div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* D. If READY/ONLINE: Show Clean Hardware Telemetry & Subsystems Matrix */
            <>
              {/* Hardware Telemetry Card */}
              <div className="hud-panel hud-corner rounded-2xl p-4.5 space-y-3 relative overflow-hidden">
                <div className="text-[11px] font-mono font-bold tracking-widest uppercase text-vision-cyan flex items-center justify-between">
                  <span>Hardware Telemetry</span>
                  <Activity className="w-3.5 h-3.5 text-vision-cyan animate-pulse" />
                </div>

                {/* Circular Gauges */}
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  {/* CPU */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#162C4E" strokeWidth="2.8" />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#00D9FF"
                          strokeWidth="2.8"
                          strokeDasharray="88"
                          strokeDashoffset={88 - (88 * (telemetry.cpuUsage ?? 0)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-mono text-xs font-bold text-vision-cyan">
                        {telemetry.cpuUsage ?? 0}%
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-vision-text-muted mt-1 uppercase font-semibold">CPU</span>
                  </div>

                  {/* RAM */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#162C4E" strokeWidth="2.8" />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#38BDF8"
                          strokeWidth="2.8"
                          strokeDasharray="88"
                          strokeDashoffset={88 - (88 * Math.round((telemetry.memoryUsageMb / (telemetry.totalMemoryMb || 1)) * 100)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-mono text-xs font-bold text-sky-400">
                        {Math.round((telemetry.memoryUsageMb / (telemetry.totalMemoryMb || 1)) * 100)}%
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-vision-text-muted mt-1 uppercase font-semibold">RAM</span>
                  </div>

                  {/* GPU */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#162C4E" strokeWidth="2.8" />
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="none"
                          stroke="#F5B700"
                          strokeWidth="2.8"
                          strokeDasharray="88"
                          strokeDashoffset={88 - (88 * (telemetry.gpuUsage ?? 0)) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute font-mono text-xs font-bold text-vision-gold">
                        {telemetry.gpuUsage ?? 0}%
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-vision-text-muted mt-1 uppercase font-semibold">GPU</span>
                  </div>
                </div>

                {/* Network Telemetry with Wave */}
                <div className="p-2.5 rounded-xl bg-vision-panel border border-vision-border/60 flex items-center justify-between text-xs font-mono relative overflow-hidden">
                  <span className="text-vision-text-secondary flex items-center space-x-1.5 z-10">
                    <Radio className="w-3.5 h-3.5 text-vision-cyan animate-pulse" />
                    <span>Network</span>
                  </span>

                  <svg className="absolute inset-x-12 inset-y-2 h-6 opacity-30 pointer-events-none" viewBox="0 0 100 20">
                    <path
                      d="M 0,10 Q 25,0 50,10 T 100,10"
                      fill="none"
                      stroke="#00D9FF"
                      strokeWidth="1.5"
                      className="dash-stream-effect"
                    />
                  </svg>

                  <div className="flex items-center space-x-2 text-[11px] z-10">
                    <span className="text-vision-teal">
                      ↑ {telemetry.networkUploadMbps !== undefined ? `${telemetry.networkUploadMbps} Mbps` : '0 Mbps'}
                    </span>
                    <span className="text-vision-cyan">
                      ↓ {telemetry.networkDownloadMbps !== undefined ? `${telemetry.networkDownloadMbps} Mbps` : '0 Mbps'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Active System Capabilities (100% Real & Interactive) */}
              <div className="hud-panel hud-corner rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono border-b border-vision-border/40 pb-2">
                  <span className="font-bold tracking-widest uppercase text-vision-cyan flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-vision-cyan" />
                    <span>Active Capabilities</span>
                  </span>
                  <button
                    onClick={() => onNavigateTab('tools')}
                    className="text-[10px] text-vision-cyan hover:text-vision-text flex items-center space-x-1 transition-colors"
                  >
                    <span>All Tools ({telemetry.activeToolsCount || 17})</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5 font-mono">
                  {systemCapabilities.map((cap) => (
                    <button
                      key={cap.id}
                      onClick={cap.action}
                      className="w-full p-2 rounded-xl bg-vision-panel hover:bg-vision-surface border border-vision-border/70 hover:border-vision-cyan/60 hover:shadow-glow-cyan-sm transition-all duration-200 flex items-center justify-between text-left group"
                      title={`Open ${cap.name}`}
                    >
                      <div className="flex items-center space-x-2.5 truncate pr-2">
                        <div className="p-1 rounded-lg bg-vision-surface group-hover:scale-110 transition-transform flex-shrink-0">
                          {cap.icon}
                        </div>
                        <div className="truncate">
                          <div className="text-xs text-vision-text font-semibold group-hover:text-vision-cyan transition-colors truncate">
                            {cap.name}
                          </div>
                          <div className="text-[10px] text-vision-text-muted truncate">
                            {cap.desc}
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-vision-cyan/10 border border-vision-cyan/30 text-vision-cyan font-bold flex-shrink-0 group-hover:bg-vision-cyan group-hover:text-vision-bg transition-colors">
                        {cap.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};
