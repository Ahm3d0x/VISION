import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Bell, ChevronDown, Settings, Menu, ShieldCheck } from 'lucide-react';
import { SystemStatus, SystemTelemetry } from '../../shared/types';

interface TopBarProps {
  status: SystemStatus;
  telemetry: SystemTelemetry;
  queuedCount?: number;
  onEmergencyStop?: () => void;
  onShutdown?: () => void;
  onOpenSettings?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  status, 
  telemetry, 
  queuedCount, 
  onEmergencyStop, 
  onShutdown, 
  onOpenSettings,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentDate(dateStr);
      setCurrentTime(timeStr);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleMinimize = () => window.visionAPI?.minimizeWindow();
  const handleMaximize = () => window.visionAPI?.maximizeWindow();
  const handleClose = () => onShutdown ? onShutdown() : window.visionAPI?.closeWindow();

  const getStatusBadge = () => {
    switch (status) {
      case 'LISTENING':
        return {
          label: 'LISTENING',
          glow: 'border-vision-cyan text-vision-cyan bg-vision-cyan/15 shadow-glow-cyan',
          dot: 'bg-vision-cyan animate-ping',
        };
      case 'PROCESSING':
        return {
          label: 'THINKING',
          glow: 'border-vision-gold text-vision-gold bg-vision-gold/15 shadow-glow-gold',
          dot: 'bg-vision-gold animate-spin',
        };
      case 'EXECUTING':
        return {
          label: 'EXECUTING',
          glow: 'border-vision-success text-vision-success bg-vision-success/15 shadow-glow-cyan',
          dot: 'bg-vision-success animate-pulse',
        };
      case 'ERROR':
        return {
          label: 'ATTENTION',
          glow: 'border-vision-error text-vision-error bg-vision-error/15 shadow-glow-error',
          dot: 'bg-vision-error',
        };
      case 'ONLINE':
      case 'READY':
      default:
        return {
          label: 'JARVIS ONLINE',
          glow: 'border-vision-cyan/40 text-vision-cyan bg-vision-cyan/10 shadow-glow-cyan-sm',
          dot: 'bg-vision-cyan shadow-[0_0_8px_#00D9FF]',
        };
    }
  };

  const statusStyle = getStatusBadge();

  return (
    <header 
      className="h-11 bg-transparent flex items-center justify-between px-4 select-none z-40 relative pointer-events-none"
    >
      {/* Invisible Global Window Drag Strip */}
      <div 
        className="absolute inset-0 pointer-events-auto"
        style={{ WebkitAppRegion: 'drag' } as any}
      />

      {/* 1. Left: Stark Arc Reactor Orb & HUD Matrix Trigger */}
      <div 
        className="flex items-center pointer-events-auto relative z-10" 
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={onToggleSidebar}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-200 group cursor-pointer ${
            isSidebarOpen
              ? 'bg-vision-cyan/20 border-vision-cyan shadow-glow-cyan text-white'
              : 'bg-vision-surface/85 hover:bg-vision-panel border-vision-cyan/40 hover:border-vision-cyan shadow-glow-cyan-sm text-vision-text'
          }`}
          title="Toggle HUD Navigation Matrix (Alt+M)"
        >
          {/* Animated Arc Reactor Dot */}
          <div className="relative w-4 h-4 rounded-full border border-vision-cyan/60 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-vision-cyan shadow-[0_0_8px_#00D9FF] group-hover:scale-125 transition-transform" />
          </div>

          <span className="font-mono font-extrabold tracking-[0.2em] text-xs text-vision-cyan group-hover:text-white transition-colors">
            VISION
          </span>

          <span className="text-[10px] font-mono font-bold tracking-wider text-vision-text-muted group-hover:text-vision-cyan transition-colors">
            {isSidebarOpen ? '▲ MATRIX' : '▼ MATRIX'}
          </span>

          <span className="text-[9px] font-mono text-vision-text-muted bg-vision-panel/90 px-1.5 py-0.5 rounded border border-vision-border/60 group-hover:border-vision-cyan/40 transition-colors">
            Alt+M
          </span>
        </button>
      </div>

      {/* 2. Center: Floating Glowing Arc Pill Status */}
      <div 
        className="flex items-center space-x-2 pointer-events-auto relative z-10" 
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className={`px-3 py-0.5 rounded-full border backdrop-blur-md text-[10px] font-mono font-bold tracking-widest flex items-center space-x-2 transition-all ${statusStyle.glow}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
          <span>{statusStyle.label}</span>
        </div>

        {queuedCount !== undefined && queuedCount > 0 && (
          <div className="px-2.5 py-0.5 rounded-full border border-vision-gold/60 text-vision-gold bg-vision-gold/15 backdrop-blur-md text-[10px] font-mono font-bold animate-pulse flex items-center space-x-1 shadow-glow-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-vision-gold"></span>
            <span>QUEUE: {queuedCount}</span>
          </div>
        )}
      </div>

      {/* 3. Right: Floating Micro Controls (Emergency Stop, Settings, Window Controls) */}
      <div 
        className="flex items-center space-x-2 pointer-events-auto relative z-10" 
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        {/* Compact Clock */}
        <div className="hidden md:flex items-center space-x-1 px-2 py-0.5 rounded-full bg-vision-panel/60 backdrop-blur-md border border-vision-border/40 text-[10px] font-mono text-vision-text-muted">
          <span className="text-vision-text font-bold">{currentTime}</span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={onEmergencyStop}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-vision-error/15 hover:bg-vision-error/25 backdrop-blur-md text-vision-error border border-vision-error/40 font-mono text-[10px] font-bold transition-all shadow-glow-error hover:scale-105 active:scale-95"
          title="Emergency Stop (Esc)"
        >
          <span className="w-1.5 h-1.5 rounded-sm bg-vision-error"></span>
          <span>STOP (Esc)</span>
        </button>

        {/* Settings Button */}
        <button 
          onClick={onOpenSettings}
          className="w-7 h-7 rounded-full bg-vision-panel/70 hover:bg-vision-panel/90 backdrop-blur-md border border-vision-border/50 flex items-center justify-center text-vision-text-secondary hover:text-vision-cyan hover:border-vision-cyan/40 transition-all hover:scale-105"
          title="System Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Window Controls */}
        <div className="flex items-center space-x-1 bg-vision-panel/70 backdrop-blur-md border border-vision-border/50 rounded-full px-1.5 py-0.5">
          <button
            onClick={handleMinimize}
            className="w-6 h-6 flex items-center justify-center text-vision-text-secondary hover:text-vision-text hover:bg-vision-panel rounded-full transition-colors"
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-6 h-6 flex items-center justify-center text-vision-text-secondary hover:text-vision-text hover:bg-vision-panel rounded-full transition-colors"
            title="Maximize"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center text-vision-text-secondary hover:text-white hover:bg-vision-error rounded-full transition-colors"
            title="Exit VISION"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
};

