import React, { useEffect } from 'react';
import { 
  Home, 
  MessageSquare, 
  Clock,
  Wrench, 
  Eye, 
  FolderGit2, 
  Database, 
  Cpu, 
  Settings, 
  ShieldCheck, 
  Activity,
  X,
  Sparkles
} from 'lucide-react';
import { WorkspaceTab } from '../../shared/types';

interface SidebarProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  activeActionsCount: number;
  isOpen: boolean;
  onClose: () => void;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeActionsCount,
  isOpen,
  onClose,
  onToggle,
}) => {
  // Map legacy tabs to primary HUD tabs
  const getNormalizedTab = (tab: WorkspaceTab): string => {
    if (tab === 'command') return 'home';
    if (tab === 'actions') return 'home';
    return tab;
  };

  const currentActive = getNormalizedTab(activeTab);

  // Keyboard shortcut listener: ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems: { id: WorkspaceTab; label: string; icon: React.ReactNode; badge?: string | number; desc: string }[] = [
    {
      id: 'home',
      label: 'Home HUD',
      desc: 'Command Center & Iron Man Core',
      icon: <Home className="w-4 h-4" />,
      badge: activeActionsCount > 0 ? activeActionsCount : undefined,
    },
    {
      id: 'chat',
      label: 'Chat Matrix',
      desc: 'Interactive Conversational Stream',
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      id: 'sessions',
      label: 'Sessions',
      desc: 'Time History & Checkpoints',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      id: 'activity',
      label: 'Activity Audit',
      desc: 'Live Scenario Traces & Logs',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'tools',
      label: 'Tools Matrix',
      desc: 'Autonomous Digital Capabilities',
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: 'vision',
      label: 'Vision Perception',
      desc: 'Screen OCR & Visual Reasoning',
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'projects',
      label: 'Projects Bridge',
      desc: 'Codebases & Workspace Files',
      icon: <FolderGit2 className="w-4 h-4" />,
    },
    {
      id: 'memory',
      label: 'Memory Vault',
      desc: 'Local SQLite Context Graph',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'system',
      label: 'System Matrix',
      desc: 'Hardware Telemetry & Kernel',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'OS Settings',
      desc: 'Local LLM Models & Audio Stack',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Slide-out Drawer Overlay & Backdrop (When open) */}
      {isOpen && (
        <>
          {/* Backdrop Blur Layer */}
          <div 
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity animate-in fade-in duration-200"
          />

          {/* Holographic Slide-Out Panel */}
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-vision-surface/95 backdrop-blur-3xl border-r border-vision-cyan/50 shadow-[0_0_60px_rgba(0,217,255,0.25)] flex flex-col justify-between select-none z-50 animate-in slide-in-from-left duration-200 hud-scanline-overlay">
            <div>
              {/* Header with Arc Reactor & Close button */}
              <div className="px-5 py-4 border-b border-vision-border/60 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="relative w-6 h-6 rounded-full border border-vision-cyan flex items-center justify-center shadow-glow-cyan-sm">
                    <div className="w-2 h-2 rounded-full bg-vision-cyan shadow-[0_0_8px_#00D9FF]"></div>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-extrabold text-vision-text tracking-[0.2em]">
                      VISION // OS
                    </div>
                    <div className="text-[9px] font-mono text-vision-cyan font-bold tracking-widest uppercase">
                      HUD NAVIGATION MATRIX
                    </div>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg bg-vision-panel hover:bg-vision-error/20 text-vision-text-muted hover:text-vision-error border border-vision-border hover:border-vision-error/40 flex items-center justify-center transition-colors"
                  title="Close Matrix (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Tab Links */}
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
                {navItems.map((item) => {
                  const isActive = currentActive === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        onClose(); // Automatically close drawer upon selecting a tab!
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-vision-panel text-vision-cyan border border-vision-cyan/70 shadow-glow-cyan-sm font-bold'
                          : 'text-vision-text-secondary hover:text-vision-text hover:bg-vision-panel/50 border border-transparent'
                      }`}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-vision-cyan shadow-[0_0_10px_#00D9FF]"></div>
                      )}

                      <div className="flex items-center space-x-3 pl-1">
                        <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-vision-cyan drop-shadow-[0_0_6px_rgba(0,217,255,0.7)]' : 'text-vision-text-muted'}`}>
                          {item.icon}
                        </span>
                        <div>
                          <div className="text-xs font-mono font-semibold tracking-wide">
                            {item.label}
                          </div>
                          <div className="text-[9px] font-mono text-vision-text-muted group-hover:text-vision-cyan/80 transition-colors">
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      {item.badge !== undefined && (
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-vision-cyan/20 text-vision-cyan border border-vision-cyan/40 shadow-glow-cyan-sm font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Footer System Status Card */}
            <div className="p-3 border-t border-vision-border/50 bg-vision-bg/60">
              <div className="hud-panel rounded-xl p-3 text-[11px] font-mono space-y-1.5 border border-vision-border/60">
                <div className="flex items-center justify-between text-vision-text-muted">
                  <span className="flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-vision-cyan" />
                    <span>SECURITY</span>
                  </span>
                  <span className="text-vision-cyan font-semibold">LEVEL 1</span>
                </div>
                <div className="flex items-center justify-between text-vision-text-muted">
                  <span className="flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-vision-teal" />
                    <span>CORE STATE</span>
                  </span>
                  <span className="text-vision-teal font-semibold">JARVIS ONLINE</span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
};

