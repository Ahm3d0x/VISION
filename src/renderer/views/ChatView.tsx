import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Square, 
  Bot, 
  User, 
  Sparkles, 
  Clock, 
  Radio, 
  Volume2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Terminal,
  Activity
} from 'lucide-react';
import { SystemStatus, ActionRecord, ConversationTurn } from '../../shared/types';
import { memoryManager } from '../../core/memory/MemoryManager';
import { FormattedResponse } from '../components/FormattedResponse';

interface ChatViewProps {
  status: SystemStatus;
  audioLevel?: number;
  interimTranscript?: string;
  lastTranscript?: string;
  lastResponse?: string;
  actions: ActionRecord[];
  onSubmitCommand: (cmd: string) => void;
  onToggleMic: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  status,
  audioLevel = 0,
  interimTranscript,
  lastTranscript,
  lastResponse,
  actions,
  onSubmitCommand,
  onToggleMic,
  onNavigateTab,
}) => {
  const [inputText, setInputText] = useState('');
  const [turns, setTurns] = useState<ConversationTurn[]>(() => memoryManager.getSessionTurns());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = memoryManager.subscribe(() => {
      setTurns(memoryManager.getSessionTurns());
    });
    return unsub;
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, lastTranscript, interimTranscript, lastResponse]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSubmitCommand(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="h-full w-full flex flex-col justify-between p-6 hud-scanline-overlay relative overflow-hidden">
      
      {/* Top HUD Header Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-vision-border/60">
        <div className="flex items-center space-x-2.5">
          <Radio className="w-5 h-5 text-vision-cyan animate-pulse" />
          <div>
            <h2 className="text-sm font-mono font-bold text-vision-text tracking-widest uppercase">
              VOICE & CONVERSATIONAL INTERACTION
            </h2>
            <p className="text-[10px] font-mono text-vision-text-muted">
              Live Neural Audio Stream • Bilateral Speech & Intent Resolution
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('sessions')}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-[11px] font-mono rounded-lg bg-vision-panel border border-vision-border hover:border-vision-cyan/60 text-vision-text-secondary hover:text-vision-cyan transition-colors"
              title="View all past interactive sessions & full transcripts"
            >
              <Clock className="w-3 h-3 text-vision-cyan" />
              <span>Recent Sessions</span>
            </button>
          )}

          <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${
            status === 'LISTENING'
              ? 'bg-vision-cyan/20 text-vision-cyan border-vision-cyan shadow-glow-cyan'
              : status === 'PROCESSING'
              ? 'bg-vision-gold/20 text-vision-gold border-vision-gold'
              : 'bg-vision-panel text-vision-teal border-vision-teal/40'
          }`}>
            {status}
          </span>
        </div>
      </div>

      {/* Main Dual Area: Dialogue History (Left) + Acoustic Telemetry (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 overflow-hidden">
        
        {/* Left: Chat & Action Log History (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between hud-panel hud-corner rounded-2xl p-4 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {turns.length === 0 && !lastTranscript && !actions.length ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-vision-text-muted space-y-2">
                <Bot className="w-10 h-10 text-vision-cyan/40 animate-pulse" />
                <p className="text-xs font-mono">
                  No conversation turns yet. Speak or type a command to initialize Jarvis.
                </p>
              </div>
            ) : null}

            {/* Conversation turns list */}
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-2">
                {/* User Prompt */}
                <div className="flex items-start space-x-2.5 justify-end">
                  <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tr-none bg-vision-cyan/15 border border-vision-cyan/40 text-vision-text shadow-glow-cyan-sm">
                    <div className="text-[10px] font-mono text-vision-cyan uppercase font-bold tracking-wider mb-1 flex items-center justify-end space-x-1.5">
                      <span>USER INTENT</span>
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-xs md:text-sm font-sans leading-relaxed select-text font-medium text-vision-text">
                      {turn.userPrompt}
                    </p>
                  </div>
                </div>

                {/* Agent Response */}
                <div className="flex items-start space-x-2.5">
                  <div className="max-w-[90%] p-4 rounded-2xl rounded-tl-none bg-vision-panel/95 border border-vision-border text-vision-text space-y-2 shadow-sm">
                    <div className="flex items-center justify-between border-b border-vision-border/40 pb-2">
                      <div className="text-[10px] font-mono text-vision-teal uppercase font-bold tracking-wider flex items-center space-x-1.5">
                        <Bot className="w-3.5 h-3.5 text-vision-cyan" />
                        <span className="text-vision-cyan">VISION CORE</span>
                        <span className="text-vision-text-muted">({turn.timestamp})</span>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(turn.agentResponse)}
                        className="text-[10px] font-mono text-vision-text-muted hover:text-vision-cyan flex items-center space-x-1 transition-colors px-2 py-0.5 rounded hover:bg-vision-surface"
                        title="Copy response"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="pt-1 select-text">
                      <FormattedResponse content={turn.agentResponse} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Currently live speaking transcript */}
            {interimTranscript && (
              <div className="flex items-start space-x-2.5 justify-end">
                <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-none bg-vision-cyan/20 border border-vision-cyan text-vision-cyan font-mono text-xs shadow-glow-cyan animate-pulse">
                  <div className="text-[9px] text-vision-cyan uppercase font-bold mb-1">
                    HEARING SPEECH...
                  </div>
                  "{interimTranscript}"
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>

        {/* Right: Live Acoustic Orb & Intent Breakdown (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* 1. Acoustic Sonic Sphere */}
          <div className="hud-panel hud-corner rounded-2xl p-5 flex flex-col items-center justify-center space-y-3 relative overflow-hidden min-h-[220px]">
            <div 
              onClick={onToggleMic}
              className="relative w-28 h-28 rounded-full border-2 border-vision-cyan flex items-center justify-center cursor-pointer shadow-glow-cyan group"
              style={{
                boxShadow: status === 'LISTENING' ? `0 0 ${20 + audioLevel * 0.5}px rgba(0, 217, 255, 0.7)` : undefined,
                transform: status === 'LISTENING' ? `scale(${1 + audioLevel / 200})` : 'scale(1)',
              }}
            >
              <div className="absolute inset-2 rounded-full border border-dashed border-vision-cyan/50 animate-spin-slow"></div>
              <div className="absolute inset-4 rounded-full border border-vision-teal/40 animate-spin-reverse"></div>
              <Mic className={`w-8 h-8 text-vision-cyan ${status === 'LISTENING' ? 'animate-pulse' : ''}`} />
            </div>

            <div className="text-center font-mono">
              <div className="text-xs font-bold text-vision-text uppercase tracking-widest">
                {status === 'LISTENING' ? 'Acoustic Sensor Active' : 'Voice Input Standby'}
              </div>
              <div className="text-[10px] text-vision-text-muted mt-0.5">
                Click microphone or press Space to trigger
              </div>
            </div>

            {/* Live Audio Level Bars */}
            {status === 'LISTENING' && (
              <div className="flex items-center space-x-1 h-5 pt-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-75 ${
                      i < (audioLevel / 5)
                        ? 'bg-vision-cyan shadow-[0_0_6px_#00D9FF]'
                        : 'bg-vision-border'
                    }`}
                    style={{
                      height: `${Math.max(4, Math.min(20, (i + 1) * 1.5 + (audioLevel / 6)))}px`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 2. Live Intent & Reasoning Breakdown */}
          <div className="hud-panel hud-corner rounded-2xl p-4 flex-1 space-y-3 font-mono text-xs">
            <div className="text-[11px] font-bold tracking-widest uppercase text-vision-cyan flex items-center justify-between">
              <span>Understanding Pipeline</span>
              <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan"></span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-vision-surface/80 border border-vision-border/40">
                <span className="text-vision-text-muted">Converting Speech to Text:</span>
                <span className="text-vision-cyan font-bold">{status === 'LISTENING' ? 'Active' : 'Standby'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-vision-surface/80 border border-vision-border/40">
                <span className="text-vision-text-muted">Extracting Intent:</span>
                <span className="text-vision-teal font-bold">{lastTranscript ? 'Resolved' : 'Waiting'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-vision-surface/80 border border-vision-border/40">
                <span className="text-vision-text-muted">Autonomous Tools:</span>
                <span className="text-vision-gold font-bold">17 Available</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Command Input Console */}
      <div className="hud-panel rounded-full p-2 border border-vision-cyan/40 focus-within:border-vision-cyan focus-within:shadow-glow-cyan flex items-center space-x-2">
        <button
          onClick={onToggleMic}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            status === 'LISTENING'
              ? 'bg-vision-cyan text-vision-bg shadow-glow-cyan animate-pulse font-bold'
              : 'bg-vision-surface text-vision-cyan border border-vision-cyan/40 hover:bg-vision-cyan/20'
          }`}
          title="Toggle Mic"
        >
          {status === 'LISTENING' ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak or enter command..."
          className="flex-1 bg-transparent border-none outline-none font-mono text-xs md:text-sm text-vision-text placeholder-vision-text-muted px-2"
        />

        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-full bg-vision-cyan/20 hover:bg-vision-cyan text-vision-cyan hover:text-vision-bg border border-vision-cyan/50 flex items-center justify-center transition-all disabled:opacity-30 shadow-glow-cyan-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
