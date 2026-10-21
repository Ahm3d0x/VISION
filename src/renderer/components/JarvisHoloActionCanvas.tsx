import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  MessageSquare, 
  Globe, 
  Terminal, 
  Cpu, 
  Move, 
  Maximize2, 
  Minimize2, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  Play, 
  Radio, 
  Sparkles, 
  Send, 
  Scan, 
  Shield, 
  CornerRightDown, 
  ExternalLink, 
  RefreshCw, 
  ZoomIn, 
  Search, 
  Check, 
  Layers, 
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers2
} from 'lucide-react';

export interface HoloCardData {
  operationStatus?: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WAITING';
  resultSummary?: string;
  // Vision / Image
  imageUrl?: string;
  imageTitle?: string;
  ocrTexts?: string[];
  targetRegions?: Array<{ label: string; x: number; y: number; w: number; h: number; conf: number }>;
  scanProgress?: number;
  analysisNotes?: string[];

  // WhatsApp / Comms
  contactName?: string;
  contactPhone?: string;
  messageText?: string;
  mediaUrl?: string;
  mediaLabel?: string;
  actionType?: 'send_message' | 'send_file' | 'send_screenshot' | 'read_chat';
  commStatus?: 'CONNECTING' | 'COMPOSE' | 'DISPATCHED' | 'DELIVERED';

  // Web Research
  query?: string;
  results?: Array<{ title: string; snippet: string; url?: string }>;
  searchPhase?: 'ORBITAL_SCAN' | 'EXTRACTING' | 'SYNTHESIZING' | 'COMPLETE';

  // App Control
  appName?: string;
  appStatus?: 'LAUNCHING' | 'ACTIVE' | 'FOCUSED';
  processId?: number;

  // Terminal Exec
  command?: string;
  outputs?: string[];
  exitCode?: number;
}

export interface HoloCard {
  id: string;
  type: 'vision_scan' | 'whatsapp_comm' | 'web_research' | 'app_control' | 'terminal_exec';
  title: string;
  subtitle?: string;
  timestamp: string;
  status: 'active' | 'docked' | 'completed';
  position: { x: number; y: number };
  isExpanded?: boolean;
  data: HoloCardData;
}

interface JarvisHoloActionCanvasProps {
  cards: HoloCard[];
  onUpdateCard: (id: string, updates: Partial<HoloCard>) => void;
  onRemoveCard: (id: string) => void;
}

export const JarvisHoloActionCanvas: React.FC<JarvisHoloActionCanvasProps> = ({
  cards,
  onUpdateCard,
  onRemoveCard,
}) => {
  const [isDockOpen, setIsDockOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; cardX: number; cardY: number }>({
    mouseX: 0,
    mouseY: 0,
    cardX: 0,
    cardY: 0,
  });

  // Mouse drag listeners for moving cards freely across the screen (left to right, etc.)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const newX = Math.max(20, Math.min(window.innerWidth - 380, dragStartRef.current.cardX + dx));
      const newY = Math.max(50, Math.min(window.innerHeight - 300, dragStartRef.current.cardY + dy));
      onUpdateCard(draggingId, { position: { x: newX, y: newY } });
    };

    const handleMouseUp = () => {
      setDraggingId(null);
    };

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, onUpdateCard]);

  const handleStartDrag = (card: HoloCard, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingId(card.id);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: card.position.x,
      cardY: card.position.y,
    };
  };

  const activeCards = cards.filter((c) => c.status !== 'docked');
  const dockedCards = cards.filter((c) => c.status === 'docked');

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. ACTIVE HOLOGRAPHIC FLOATING CARDS (CENTER & DRAGGABLE ACROSS SCREEN)   */}
      {/* ========================================================================= */}
      {activeCards.map((card) => {
        const isDragging = draggingId === card.id;

        return (
          <div
            key={card.id}
            style={{
              transform: `translate3d(${card.position.x}px, ${card.position.y}px, 0)`,
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
            }}
            className={`absolute pointer-events-auto rounded-2xl hud-panel-elevated border transition-shadow duration-300 ${
              card.isExpanded 
                ? 'w-[720px] max-w-[90vw]' 
                : 'w-[480px] max-w-[85vw]'
            } ${
              isDragging
                ? 'border-vision-cyan shadow-[0_0_40px_rgba(0,217,255,0.5)] z-40'
                : 'border-vision-cyan/60 hover:border-vision-cyan shadow-[0_0_25px_rgba(0,217,255,0.25)] z-30'
            }`}
          >
            {/* Holographic High-Tech Window Header (Draggable handle) */}
            <div
              onMouseDown={(e) => handleStartDrag(card, e)}
              className="px-4 py-2.5 rounded-t-2xl bg-vision-surface/90 border-b border-vision-cyan/40 flex items-center justify-between cursor-grab active:cursor-grabbing select-none group"
            >
              <div className="flex items-center space-x-2.5">
                {/* Glowing Type Icon */}
                <div className="w-6 h-6 rounded-lg bg-vision-cyan/15 border border-vision-cyan/50 flex items-center justify-center text-vision-cyan shadow-glow-cyan-sm">
                  {card.type === 'vision_scan' && <Eye className="w-3.5 h-3.5 animate-pulse" />}
                  {card.type === 'whatsapp_comm' && <MessageSquare className="w-3.5 h-3.5 animate-pulse" />}
                  {card.type === 'web_research' && <Globe className="w-3.5 h-3.5 animate-spin-slow" />}
                  {card.type === 'app_control' && <Cpu className="w-3.5 h-3.5 animate-pulse" />}
                  {card.type === 'terminal_exec' && <Terminal className="w-3.5 h-3.5 text-vision-success" />}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono font-extrabold tracking-wider text-vision-text group-hover:text-vision-cyan transition-colors">
                      {card.title}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${card.data.operationStatus === 'FAILED' ? 'bg-vision-error' : card.data.operationStatus === 'COMPLETED' ? 'bg-vision-success' : 'bg-vision-cyan animate-ping'}`}></span>
                    {card.data.operationStatus && (
                      <span className={`text-[8px] font-mono tracking-widest ${card.data.operationStatus === 'FAILED' ? 'text-vision-error' : card.data.operationStatus === 'COMPLETED' ? 'text-vision-success' : 'text-vision-cyan'}`}>
                        {card.data.operationStatus}
                      </span>
                    )}
                  </div>
                  {card.subtitle && (
                    <div className="text-[9px] font-mono text-vision-text-muted truncate max-w-[260px]">
                      {card.subtitle}
                    </div>
                  )}
                </div>
              </div>

              {/* Window Controls: Move hint, Zoom/Expand, Dock to Side, Close */}
              <div className="flex items-center space-x-1.5" onMouseDown={(e) => e.stopPropagation()}>
                <span className="text-[9px] font-mono text-vision-text-muted tracking-widest hidden sm:inline-block mr-1">
                  [DRAG TO MOVE]
                </span>

                {/* Expand / Minimize Size */}
                <button
                  onClick={() => onUpdateCard(card.id, { isExpanded: !card.isExpanded })}
                  className="w-6 h-6 rounded flex items-center justify-center text-vision-text-muted hover:text-vision-cyan hover:bg-vision-panel transition-colors"
                  title={card.isExpanded ? 'Restore Size' : 'Expand / Zoom Inspection'}
                >
                  {card.isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                </button>

                {/* Dock to Side */}
                <button
                  onClick={() => onUpdateCard(card.id, { status: 'docked' })}
                  className="px-2 py-0.5 rounded bg-vision-panel/80 hover:bg-vision-cyan/20 border border-vision-cyan/30 text-[9px] font-mono text-vision-cyan hover:text-white transition-all flex items-center space-x-1"
                  title="Dock to side tray"
                >
                  <span>DOCK</span>
                  <CornerRightDown className="w-2.5 h-2.5" />
                </button>

                {/* Dismiss / Close */}
                <button
                  onClick={() => onRemoveCard(card.id)}
                  className="w-6 h-6 rounded flex items-center justify-center text-vision-text-muted hover:text-vision-error hover:bg-vision-error/20 transition-colors"
                  title="Close Hologram"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Holographic Body based on Card Type */}
            <div className="p-4 relative overflow-hidden bg-vision-bg/85 backdrop-blur-2xl rounded-b-2xl">
              
              {/* ======================================================== */}
              {/* TYPE 1: VISION SCAN / IMAGE ANALYSIS                     */}
              {/* ======================================================== */}
              {card.type === 'vision_scan' && (
                <div className="space-y-3 font-mono">
                  {/* Real or Simulated Image Canvas with Scanning Laser Beam */}
                  <div className="relative rounded-xl overflow-hidden border border-vision-cyan/50 bg-black/80 aspect-video flex items-center justify-center group/img shadow-glow-cyan-sm">
                    {/* Laser Scanner Beam traversing vertically */}
                    <div className="hud-scanner-beam"></div>

                    {/* Image Render */}
                    {card.data.imageUrl ? (
                      <img
                        src={card.data.imageUrl}
                        alt="Holographic Screen Inspection"
                        className="w-full h-full object-cover object-top opacity-85"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-vision-surface to-black text-center space-y-2">
                        <Scan className="w-12 h-12 text-vision-cyan/60 animate-pulse" />
                        <div className="text-xs text-vision-cyan font-bold tracking-widest uppercase">
                          OPTICAL SENSORY BUFFER // ACTIVE FRAME
                        </div>
                        <div className="text-[10px] text-vision-text-muted">
                          Analyzing visual geometry & text elements...
                        </div>
                      </div>
                    )}

                    {/* Animated Holographic Reticles & Bounding Boxes (Iron Man Style) */}
                    {(card.data.targetRegions || []).map((reg, idx) => (
                      <div
                        key={idx}
                        style={{
                          left: `${reg.x}%`,
                          top: `${reg.y}%`,
                          width: `${reg.w}%`,
                          height: `${reg.h}%`,
                        }}
                        className="absolute border border-vision-cyan/80 bg-vision-cyan/10 rounded pointer-events-none transition-all duration-300 animate-pulse-subtle flex flex-col justify-between p-1 shadow-[0_0_12px_rgba(0,217,255,0.4)]"
                      >
                        <div className="flex items-center justify-between text-[8px] font-extrabold text-vision-cyan bg-black/80 px-1 py-0.2 rounded w-fit border border-vision-cyan/40">
                          <span>{reg.label}</span>
                          <span className="ml-1 text-vision-gold">{(reg.conf * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-end">
                          <span className="w-1.5 h-1.5 border-b-2 border-r-2 border-vision-cyan"></span>
                        </div>
                      </div>
                    ))}

                    {/* HUD Corner Markers */}
                    <div className="absolute top-2 left-2 text-[8px] font-mono text-vision-cyan/70 bg-black/60 px-1.5 py-0.5 rounded border border-vision-cyan/30">
                      FRAME ID: #OS-{Date.now().toString().slice(-4)} • 60 FPS
                    </div>
                    <div className="absolute bottom-2 right-2 text-[8px] font-mono text-vision-success bg-black/60 px-1.5 py-0.5 rounded border border-vision-success/40">
                      {card.data.ocrTexts ? `OCR DETECTED: ${card.data.ocrTexts.length} STRINGS` : card.data.operationStatus === 'RUNNING' ? 'FRAME CAPTURED // ANALYZING' : 'SCREEN FRAME'}
                    </div>
                  </div>

                  {/* Real-time Analysis Telemetry & Notes */}
                  <div className="p-3 rounded-xl bg-vision-surface/80 border border-vision-border space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-vision-cyan font-bold tracking-wider">
                      <span className="flex items-center space-x-1.5">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>NEURAL ANALYSIS STREAM</span>
                      </span>
                      <span className="text-vision-text-muted">TARGET LOCKED</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-vision-text-secondary">
                      {(card.data.analysisNotes || [card.data.operationStatus === 'RUNNING' ? 'Capturing and analyzing the requested visual target…' : card.data.resultSummary || 'Waiting for analysis output…']).map((note, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5 text-vision-text-secondary">
                          <span className="text-vision-cyan">↳</span>
                          <span>{note}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Bar on Image Completion */}
                    <div className="pt-2 border-t border-vision-border/40 flex items-center justify-between text-[10px]">
                      <span className="text-vision-success font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{card.data.operationStatus === 'RUNNING' ? 'ANALYSIS IN PROGRESS' : card.data.operationStatus === 'FAILED' ? 'ANALYSIS FAILED' : card.data.operationStatus === 'WAITING' ? 'AWAITING APPROVAL' : 'ANALYSIS RESULT'}</span>
                      </span>

                      <button
                        onClick={() => onUpdateCard(card.id, { status: 'docked' })}
                        className="px-3 py-1 rounded-lg bg-vision-cyan/20 hover:bg-vision-cyan text-vision-cyan hover:text-vision-bg font-bold border border-vision-cyan/40 transition-all shadow-glow-cyan-sm"
                      >
                        DOCK TO SIDE (تصغير للجنب)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TYPE 2: WHATSAPP COMMS PROTOCOL                          */}
              {/* ======================================================== */}
              {card.type === 'whatsapp_comm' && (
                <div className="space-y-3 font-mono">
                  {/* Recipient Profile Card */}
                  <div className="p-3 rounded-xl bg-vision-panel border border-vision-cyan/40 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                        <MessageSquare className="w-5 h-5" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-vision-bg"></span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-vision-text flex items-center space-x-1.5">
                        <span>{card.data.contactName || 'Resolving recipient…'}</span>
                          <Shield className="w-3 h-3 text-vision-cyan" />
                        </div>
                        <div className="text-[10px] text-vision-text-muted">
                          {card.data.contactPhone || 'WHATSAPP DESKTOP'}
                        </div>
                      </div>
                    </div>

                    <div className={`px-2.5 py-1 rounded-full border text-[9px] font-bold ${card.data.operationStatus === 'FAILED' ? 'bg-red-500/15 border-red-500/40 text-red-400' : card.data.operationStatus === 'COMPLETED' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-vision-cyan/15 border-vision-cyan/40 text-vision-cyan animate-pulse'}`}>
                      {card.data.operationStatus === 'FAILED' ? 'FAILED' : card.data.operationStatus === 'COMPLETED' ? 'ACTION COMPLETE' : 'CONNECTING'}
                    </div>
                  </div>

                  {/* Live Streaming Message Payload */}
                  <div className="p-3 rounded-xl bg-vision-surface/90 border border-vision-border space-y-2">
                    <div className="text-[10px] text-vision-cyan font-bold tracking-wider flex items-center justify-between">
                      <span>{card.data.mediaUrl ? 'OUTBOUND MEDIA' : card.data.messageText ? 'OUTBOUND MESSAGE' : 'WHATSAPP ACTION'}</span>
                      <span className="text-[9px] text-vision-text-muted">ENCRYPTED PROTOCOL</span>
                    </div>

                    {card.data.mediaUrl && (
                      <div className="relative rounded-lg overflow-hidden border border-vision-cyan/30 bg-black/70 max-h-64">
                        <img src={card.data.mediaUrl} alt="WhatsApp media preview" className="w-full max-h-64 object-contain" />
                        <span className="absolute left-2 bottom-2 px-2 py-1 rounded bg-black/70 text-[9px] text-vision-cyan">{card.data.mediaLabel || 'MEDIA PREVIEW'}</span>
                      </div>
                    )}
                    {card.data.messageText && (
                      <div className="p-3 rounded-xl bg-vision-panel/90 border-l-2 border-emerald-500 text-xs text-vision-text leading-relaxed">
                        “{card.data.messageText}”
                      </div>
                    )}
                    {!card.data.mediaUrl && !card.data.messageText && (
                      <div className="p-3 rounded-xl bg-vision-panel/90 border border-vision-border text-xs text-vision-text-muted">
                        {card.data.operationStatus === 'RUNNING' ? 'Preparing the requested WhatsApp action…' : card.data.resultSummary || 'No message or attachment details were returned.'}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-vision-text-muted">
                      <div className="flex items-center space-x-1 text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" />
                      <span>{card.data.operationStatus === 'RUNNING' ? 'SENDING…' : card.data.operationStatus === 'FAILED' ? 'SEND FAILED' : card.data.operationStatus === 'WAITING' ? 'AWAITING APPROVAL' : 'DISPATCH CONFIRMED // DELIVERED'}</span>
                      </div>

                      <button
                        onClick={() => onUpdateCard(card.id, { status: 'docked' })}
                        className="px-2.5 py-0.5 rounded bg-vision-panel hover:bg-vision-cyan/20 border border-vision-cyan/30 text-vision-cyan text-[9px]"
                      >
                        DOCK TO SIDE
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TYPE 3: WEB RECON & LIVE SEARCH PORTAL                   */}
              {/* ======================================================== */}
              {card.type === 'web_research' && (
                <div className="space-y-3 font-mono">
                  {/* Live Search Bar Simulation */}
                  <div className="p-2.5 rounded-xl bg-vision-panel border border-vision-cyan/50 flex items-center space-x-2">
                    <Search className="w-4 h-4 text-vision-cyan animate-pulse" />
                    <span className="text-xs text-vision-text font-bold truncate">
                      {card.data.query || 'Latest autonomous agent architectures 2026'}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-vision-cyan/20 text-vision-cyan ml-auto border border-vision-cyan/30">
                      {card.data.operationStatus === 'RUNNING' ? 'SEARCHING' : `${card.data.results?.length || 0} RESULTS`}
                    </span>
                  </div>

                  {/* Live Streaming Search Findings */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(card.data.results || []).map((res, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-vision-surface/80 border border-vision-border hover:border-vision-cyan/40 transition-all text-xs space-y-1 group"
                      >
                        <div className="font-bold text-vision-cyan flex items-center justify-between text-[11px]">
                          <span className="truncate group-hover:underline">{res.title}</span>
                          <ArrowUpRight className="w-3 h-3 text-vision-text-muted flex-shrink-0" />
                        </div>
                        <p className="text-[10px] text-vision-text-muted line-clamp-2">
                          {res.snippet}
                        </p>
                      </div>
                    ))}
                    {(!card.data.results || card.data.results.length === 0) && (
                      <div className="p-3 rounded-xl bg-vision-surface/80 border border-vision-border text-[10px] text-vision-text-muted">
                        {card.data.operationStatus === 'RUNNING' ? 'Waiting for live search results…' : card.data.resultSummary || 'No search results returned.'}
                      </div>
                    )}
                  </div>

                  {/* Footer status */}
                  <div className="pt-2 border-t border-vision-border/40 flex items-center justify-between text-[10px]">
                    <span className="text-vision-success font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{card.data.operationStatus === 'RUNNING' ? 'SEARCH IN PROGRESS…' : card.data.operationStatus === 'FAILED' ? 'SEARCH FAILED' : card.data.operationStatus === 'WAITING' ? 'AWAITING APPROVAL' : 'INTELLIGENCE EXTRACTED'}</span>
                    </span>

                    <button
                      onClick={() => onUpdateCard(card.id, { status: 'docked' })}
                      className="px-2.5 py-1 rounded bg-vision-cyan/20 hover:bg-vision-cyan text-vision-cyan hover:text-vision-bg font-bold border border-vision-cyan/40 transition-all"
                    >
                      DOCK TO SIDE
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TYPE 4: APP CONTROL / DESKTOP SWITCHER                   */}
              {/* ======================================================== */}
              {card.type === 'app_control' && (
                <div className="space-y-3 font-mono">
                  <div className="p-3 rounded-xl bg-vision-panel border border-vision-teal/40 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-vision-teal/20 border border-vision-teal/50 flex items-center justify-center text-vision-teal">
                        <Cpu className="w-5 h-5 animate-spin-slow" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-vision-text">
                          {card.data.appName || 'Visual Studio Code'}
                        </div>
                        <div className="text-[10px] text-vision-text-muted">
                          PID: {card.data.processId || 28410} • WINDOW FOCUSED
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-vision-teal/20 text-vision-teal text-[9px] font-bold border border-vision-teal/40">
                      FOREGROUND
                    </span>
                  </div>

                  <div className="text-[10px] text-vision-text-secondary">
                    Context successfully focused. Desktop window ready for automated interaction.
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* TYPE 5: TERMINAL / SHELL MATRIX                          */}
              {/* ======================================================== */}
              {card.type === 'terminal_exec' && (
                <div className="space-y-2 font-mono">
                  <div className="p-2.5 rounded-xl bg-black/90 border border-vision-border text-xs text-vision-success max-h-40 overflow-y-auto space-y-1">
                    <div className="text-vision-cyan flex items-center space-x-1 text-[10px]">
                      <span>PS &gt;</span>
                      <span className="text-white font-bold">{card.data.command || 'Get-Process | Where-Object CPU -gt 10'}</span>
                    </div>
                    {(card.data.outputs || [
                      'Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id ProcessName',
                      '-------  ------    -----      -----     ------     -- -----------',
                      '    452      32    45200      62100      18.42   4120 electron',
                      '    312      24    22100      31200      12.10   8920 ollama',
                    ]).map((line, i) => (
                      <div key={i} className="text-[10px] text-emerald-400 font-mono">
                        {line}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => onUpdateCard(card.id, { status: 'docked' })}
                      className="px-2.5 py-0.5 rounded bg-vision-panel hover:bg-vision-cyan/20 border border-vision-cyan/30 text-vision-cyan text-[9px]"
                    >
                      DOCK TO SIDE
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* 2. HOLOGRAPHIC SIDE DOCK TRAY (COLLAPSIBLE, SLEEK & FROSTED)              */}
      {/* ========================================================================= */}
      {dockedCards.length > 0 && (
        <>
          {/* Minimized Dock Trigger Pill (Default view - non-intrusive) */}
          {!isDockOpen && (
            <div className="absolute right-6 top-14 pointer-events-auto z-40 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => setIsDockOpen(true)}
                className="px-3.5 py-1.5 rounded-full bg-[#080E1A]/90 hover:bg-[#0E1A2E] border border-vision-cyan/40 hover:border-vision-cyan shadow-glow-cyan-sm hover:shadow-glow-cyan text-vision-cyan flex items-center space-x-2 transition-all font-mono text-[10px] backdrop-blur-xl group cursor-pointer"
                title="Click to open Holographic Dock Tray"
              >
                <div className="w-2 h-2 rounded-full bg-vision-cyan shadow-[0_0_8px_#00D9FF] group-hover:animate-ping" />
                <span className="font-extrabold tracking-widest text-vision-text group-hover:text-vision-cyan transition-colors">
                  HOLO DOCK
                </span>
                <span className="px-2 py-0.5 rounded-full bg-vision-cyan/20 border border-vision-cyan/40 text-vision-cyan font-bold text-[9px]">
                  {dockedCards.length}
                </span>
                <ChevronDown className="w-3 h-3 text-vision-cyan transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          )}

          {/* Expanded Frosted Dock Drawer */}
          {isDockOpen && (
            <div className="absolute right-6 top-14 pointer-events-auto z-50 w-88 max-w-[calc(100vw-48px)] flex flex-col rounded-2xl bg-[#080E1A]/95 border border-vision-cyan/50 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(0,217,255,0.25)] backdrop-blur-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-vision-border/60 select-none">
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded-lg bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/30">
                    <Layers2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-bold tracking-wider text-vision-cyan uppercase flex items-center space-x-1.5">
                      <span>HOLO DOCK TRAY</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-vision-cyan/20 text-vision-cyan text-[9px] font-mono">
                        {dockedCards.length}
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-vision-text-muted">
                      Completed & Background Holo Cards
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => dockedCards.forEach((c) => onRemoveCard(c.id))}
                    className="px-2 py-0.5 rounded text-[9px] font-mono text-vision-text-muted hover:text-vision-error hover:bg-vision-error/10 border border-transparent hover:border-vision-error/30 transition-all"
                    title="Clear all docked cards"
                  >
                    CLEAR ALL
                  </button>
                  <button
                    onClick={() => setIsDockOpen(false)}
                    className="p-1 rounded text-vision-text-muted hover:text-vision-cyan hover:bg-vision-cyan/15 transition-colors"
                    title="Collapse Dock Tray"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Cards List */}
              <div className="max-h-[min(480px,calc(100vh-220px))] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {dockedCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-2.5 rounded-xl bg-vision-panel/90 hover:bg-vision-surface border border-vision-border hover:border-vision-cyan/60 transition-all duration-200 group flex items-start justify-between space-x-2 select-none"
                  >
                    <div 
                      className="flex items-start space-x-2.5 truncate flex-1 cursor-pointer"
                      onClick={() => {
                        onUpdateCard(card.id, { status: 'active' });
                        setIsDockOpen(false);
                      }}
                    >
                      {/* Type-Specific Glowing Icon */}
                      <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                        card.type === 'whatsapp_comm' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        card.type === 'vision_scan' ? 'bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/30' :
                        card.type === 'web_research' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                        card.type === 'app_control' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                        'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                      }`}>
                        {card.type === 'whatsapp_comm' && <MessageSquare className="w-3.5 h-3.5" />}
                        {card.type === 'vision_scan' && <Eye className="w-3.5 h-3.5" />}
                        {card.type === 'web_research' && <Globe className="w-3.5 h-3.5" />}
                        {card.type === 'app_control' && <Cpu className="w-3.5 h-3.5" />}
                        {card.type === 'terminal_exec' && <Terminal className="w-3.5 h-3.5" />}
                      </div>

                      <div className="truncate flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] font-mono font-bold text-vision-text group-hover:text-vision-cyan transition-colors truncate">
                            {card.title}
                          </span>
                          {card.data.operationStatus && (
                            <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-semibold ${
                              card.data.operationStatus === 'COMPLETED' ? 'bg-vision-success/15 text-vision-success' :
                              card.data.operationStatus === 'FAILED' ? 'bg-vision-error/15 text-vision-error' :
                              'bg-vision-cyan/15 text-vision-cyan'
                            }`}>
                              {card.data.operationStatus}
                            </span>
                          )}
                        </div>

                        <div 
                          dir="auto" 
                          className="text-[10px] font-mono text-vision-text-muted group-hover:text-vision-text-secondary truncate mt-0.5"
                          title={card.subtitle}
                        >
                          {card.subtitle || 'Click to restore to screen'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 flex-shrink-0 pt-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateCard(card.id, { status: 'active' });
                          setIsDockOpen(false);
                        }}
                        className="p-1 rounded text-vision-cyan hover:bg-vision-cyan/20 transition-colors"
                        title="Restore to screen"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCard(card.id);
                        }}
                        className="p-1 rounded text-vision-text-muted hover:text-vision-error hover:bg-vision-error/10 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Hint */}
              <div className="pt-1.5 border-t border-vision-border/40 text-[9px] font-mono text-vision-text-muted text-center select-none flex items-center justify-center space-x-1">
                <Sparkles className="w-2.5 h-2.5 text-vision-cyan" />
                <span>Click any card to restore hologram to screen</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
