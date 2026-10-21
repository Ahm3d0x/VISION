import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  RotateCcw, 
  Check, 
  Layers, 
  MessageSquare, 
  Zap, 
  FileText, 
  Calendar, 
  Share2, 
  Edit3, 
  Sparkles, 
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Terminal,
  Activity,
  ArrowRight
} from 'lucide-react';
import { RecentSessionRecord, ConversationTurn, ActionRecord } from '../../shared/types';
import { sessionManager } from '../../core/memory/SessionManager';

interface SessionsHUDViewProps {
  onNavigateTab?: (tab: string) => void;
  onRestoreSession?: (session: RecentSessionRecord) => void;
}

export const SessionsHUDView: React.FC<SessionsHUDViewProps> = ({
  onNavigateTab,
  onRestoreSession,
}) => {
  const [sessions, setSessions] = useState<RecentSessionRecord[]>(() => sessionManager.getAllSessions());
  const [activeSession, setActiveSession] = useState<RecentSessionRecord>(() => sessionManager.getActiveSession());
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => sessionManager.getActiveSession().id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [inspectTab, setInspectTab] = useState<'turns' | 'actions' | 'json'>('turns');
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  
  // Feedback banners
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const all = sessionManager.getAllSessions();
      setSessions(all);
      const currentActive = sessionManager.getActiveSession();
      setActiveSession(currentActive);
    };

    update();
    const unsubscribe = sessionManager.subscribe(update);
    return () => unsubscribe();
  }, []);

  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || activeSession;
  }, [sessions, selectedSessionId, activeSession]);

  const filteredSessions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((s) => {
      const matchFilter = 
        statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && s.status === 'active') || 
        (statusFilter === 'ARCHIVED' && s.status === 'archived');

      if (!matchFilter) return false;
      if (!q) return true;

      const titleMatch = s.title.toLowerCase().includes(q);
      const turnsMatch = s.turns.some((t) => 
        t.userPrompt.toLowerCase().includes(q) || 
        t.agentResponse.toLowerCase().includes(q)
      );
      const actionsMatch = s.actions.some((a) => 
        a.commandText.toLowerCase().includes(q) || 
        (a.outputSummary && a.outputSummary.toLowerCase().includes(q))
      );

      return titleMatch || turnsMatch || actionsMatch;
    });
  }, [sessions, searchQuery, statusFilter]);

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 2500);
  };

  const handleCreateNewSession = () => {
    const created = sessionManager.createNewSession();
    setSelectedSessionId(created.id);
    triggerNotice('New Session Started & Working Memory Cleared');
  };

  const handleRestoreSession = (id: string) => {
    const restored = sessionManager.restoreSession(id);
    if (restored) {
      setSelectedSessionId(restored.id);
      if (onRestoreSession) {
        onRestoreSession(restored);
      }
      triggerNotice(`Session Restored: "${restored.title}"`);
    }
  };

  const handleDeleteSession = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('Are you sure you want to delete this session record from history?')) {
      sessionManager.deleteSession(id);
      triggerNotice('Session Removed from History');
    }
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      sessionManager.updateTitle(selectedSession.id, editedTitle.trim());
      setIsEditingTitle(false);
      triggerNotice('Session Title Updated');
    }
  };

  const handleExportMarkdown = () => {
    const md = sessionManager.exportSessionMarkdown(selectedSession.id);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision_session_${selectedSession.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Transcript Exported as Markdown');
  };

  const handleExportJSON = () => {
    const jsonStr = sessionManager.exportSessionJSON(selectedSession.id);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision_session_${selectedSession.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerNotice('Session Exported as JSON');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="h-full w-full p-6 flex flex-col justify-between hud-scanline-overlay overflow-y-auto space-y-4 font-mono text-xs relative">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-vision-border/60 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-vision-cyan/15 border border-vision-cyan/30 text-vision-cyan">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-vision-text tracking-widest uppercase">
              RECENT SESSIONS &amp; INTERACTIVE ARCHIVES
            </h2>
          </div>
          <p className="text-[10px] text-vision-text-muted mt-1">
            Complete chronological record of all dialogues, executed commands, agent tools, and multi-step tasks.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {actionNotice && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-vision-success/15 border border-vision-success text-vision-success text-xs font-bold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{actionNotice}</span>
            </div>
          )}

          <button
            onClick={handleCreateNewSession}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-vision-cyan to-vision-teal text-vision-bg font-bold shadow-glow-cyan hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Session</span>
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Split: Session List (Left) + Detailed Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        
        {/* Left Column: Recent Sessions Browser (5 Cols) */}
        <div className="lg:col-span-5 hud-panel hud-corner rounded-2xl p-4 flex flex-col space-y-3 overflow-hidden">
          {/* Search & Filter Strip */}
          <div className="space-y-2 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-vision-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions by prompt or title..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-vision-border text-vision-text outline-none focus:border-vision-cyan text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                {(['ALL', 'ACTIVE', 'ARCHIVED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      statusFilter === st
                        ? 'bg-vision-cyan/20 border-vision-cyan text-vision-cyan shadow-glow-cyan-sm'
                        : 'bg-black/30 border-vision-border text-vision-text-muted hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-vision-text-muted">
                {filteredSessions.length} Recorded
              </span>
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-vision-text-muted space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-30 text-vision-cyan" />
                <div>No recorded sessions found.</div>
                <div className="text-[10px]">Start interacting with VISION to generate session archives.</div>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = selectedSession.id === s.id;
                const isActive = activeSession.id === s.id;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all space-y-1.5 relative ${
                      isSelected
                        ? 'bg-vision-cyan/15 border-vision-cyan shadow-glow-cyan-sm'
                        : 'bg-black/30 border-vision-border/80 hover:border-vision-border hover:bg-black/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-vision-text truncate max-w-[75%]">
                        {s.title}
                      </div>

                      {isActive ? (
                        <span className="px-1.5 py-0.5 rounded bg-vision-cyan/20 border border-vision-cyan text-vision-cyan text-[9px] font-bold animate-pulse">
                          ACTIVE NOW
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-black/50 border border-vision-border text-vision-text-muted text-[9px]">
                          ARCHIVED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-vision-text-muted">
                      <span>{new Date(s.lastActiveAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{new Date(s.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{formatDuration(s.durationSeconds || 0)}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-vision-border/40 text-[10px]">
                      <div className="flex items-center space-x-2 text-vision-text-secondary">
                        <span className="flex items-center space-x-1">
                          <MessageSquare className="w-2.5 h-2.5 text-vision-cyan" />
                          <span>{s.turns.length} Turns</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5 text-vision-gold" />
                          <span>{s.actions.length} Actions</span>
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="p-1 text-vision-text-muted hover:text-rose-400 transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Session Inspector (7 Cols) */}
        <div className="lg:col-span-7 hud-panel hud-corner rounded-2xl p-4 flex flex-col space-y-3 overflow-hidden">
          {/* Selected Session Header */}
          <div className="p-3.5 rounded-xl bg-vision-panel/80 border border-vision-border space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-black/50 border border-vision-cyan text-xs text-vision-text outline-none flex-1"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="px-2.5 py-1 rounded-lg bg-vision-cyan text-vision-bg font-bold text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="px-2 py-1 text-xs text-vision-text-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm text-vision-text truncate">
                      {selectedSession.title}
                    </h3>
                    <button
                      onClick={() => {
                        setEditedTitle(selectedSession.title);
                        setIsEditingTitle(true);
                      }}
                      className="text-vision-text-muted hover:text-vision-cyan"
                      title="Rename Session"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {selectedSession.id !== activeSession.id ? (
                  <button
                    onClick={() => handleRestoreSession(selectedSession.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-vision-cyan/20 border border-vision-cyan text-vision-cyan hover:bg-vision-cyan/30 font-bold transition-all"
                    title="Switch to and restore this session as the current active conversation"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resume Session</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-vision-success/15 border border-vision-success text-vision-success text-[10px] font-bold">
                    CURRENT ACTIVE
                  </span>
                )}

                <button
                  onClick={handleExportMarkdown}
                  className="p-1.5 rounded-lg bg-black/40 border border-vision-border text-vision-text-muted hover:text-white"
                  title="Export Markdown Transcript"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleExportJSON}
                  className="p-1.5 rounded-lg bg-black/40 border border-vision-border text-vision-text-muted hover:text-white"
                  title="Export Raw JSON"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Metadata Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-vision-border/40 text-[10px] text-vision-text-muted">
              <div>
                <span className="block text-vision-text-muted">Started:</span>
                <span className="text-vision-text font-bold">
                  {new Date(selectedSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div>
                <span className="block text-vision-text-muted">Elapsed Duration:</span>
                <span className="text-vision-teal font-bold">{formatDuration(selectedSession.durationSeconds)}</span>
              </div>
              <div>
                <span className="block text-vision-text-muted">Dialogue Turns:</span>
                <span className="text-vision-cyan font-bold">{selectedSession.turns.length} Dialogues</span>
              </div>
              <div>
                <span className="block text-vision-text-muted">Action Runs:</span>
                <span className="text-vision-gold font-bold">{selectedSession.actions.length} Executed</span>
              </div>
            </div>
          </div>

          {/* Inspector Tabs */}
          <div className="flex items-center space-x-1 border-b border-vision-border/60 pb-1.5 shrink-0 text-xs">
            <button
              onClick={() => setInspectTab('turns')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                inspectTab === 'turns'
                  ? 'bg-vision-cyan/20 border border-vision-cyan text-vision-cyan font-bold'
                  : 'text-vision-text-muted hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Conversation Turns ({selectedSession.turns.length})</span>
            </button>

            <button
              onClick={() => setInspectTab('actions')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                inspectTab === 'actions'
                  ? 'bg-vision-cyan/20 border border-vision-cyan text-vision-cyan font-bold'
                  : 'text-vision-text-muted hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Actions &amp; Tools ({selectedSession.actions.length})</span>
            </button>

            <button
              onClick={() => setInspectTab('json')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center space-x-1.5 ${
                inspectTab === 'json'
                  ? 'bg-vision-cyan/20 border border-vision-cyan text-vision-cyan font-bold'
                  : 'text-vision-text-muted hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          {/* Inspector Content Body */}
          <div className="flex-1 overflow-y-auto pr-1">
            {/* 1. Turns Feed */}
            {inspectTab === 'turns' && (
              <div className="space-y-3">
                {selectedSession.turns.length === 0 ? (
                  <div className="text-center py-16 text-vision-text-muted space-y-1">
                    <MessageSquare className="w-6 h-6 mx-auto opacity-30 text-vision-cyan" />
                    <div>No dialogue turns in this session yet.</div>
                  </div>
                ) : (
                  selectedSession.turns.map((turn, idx) => (
                    <div key={turn.id || idx} className="p-3.5 rounded-xl bg-vision-panel border border-vision-border space-y-2.5">
                      {/* User Prompt */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2">
                          <span className="w-5 h-5 rounded bg-vision-cyan/20 border border-vision-cyan/60 text-vision-cyan flex items-center justify-center text-[10px] font-bold shrink-0">
                            U
                          </span>
                          <div>
                            <div className="text-[10px] text-vision-cyan font-bold">USER</div>
                            <div className="text-vision-text text-xs mt-0.5 whitespace-pre-wrap">{turn.userPrompt}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-vision-text-muted shrink-0">[{turn.timestamp}]</span>
                      </div>

                      {/* Agent Response */}
                      <div className="flex items-start space-x-2 pt-2 border-t border-vision-border/40">
                        <span className="w-5 h-5 rounded bg-vision-gold/20 border border-vision-gold/60 text-vision-gold flex items-center justify-center text-[10px] font-bold shrink-0">
                          V
                        </span>
                        <div className="flex-1">
                          <div className="text-[10px] text-vision-gold font-bold">VISION ASSISTANT</div>
                          <div className="text-vision-text-secondary text-xs mt-0.5 leading-relaxed whitespace-pre-wrap">
                            {turn.agentResponse}
                          </div>
                        </div>
                      </div>

                      {/* Tool Tags */}
                      {turn.toolsUsed && turn.toolsUsed.length > 0 && (
                        <div className="flex items-center space-x-1.5 pt-1.5 border-t border-vision-border/30">
                          <span className="text-[9px] text-vision-text-muted">Tools Used:</span>
                          {turn.toolsUsed.map((tool, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-black/50 border border-vision-border text-sky-400 text-[9px]">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. Actions Feed */}
            {inspectTab === 'actions' && (
              <div className="space-y-3">
                {selectedSession.actions.length === 0 ? (
                  <div className="text-center py-16 text-vision-text-muted space-y-1">
                    <Zap className="w-6 h-6 mx-auto opacity-30 text-vision-gold" />
                    <div>No executed actions recorded in this session.</div>
                  </div>
                ) : (
                  selectedSession.actions.map((act, idx) => (
                    <div key={act.id || idx} className="p-3.5 rounded-xl bg-vision-panel border border-vision-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-vision-text text-xs flex items-center space-x-2">
                          <Terminal className="w-3.5 h-3.5 text-vision-teal" />
                          <span>{act.commandText}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          act.status === 'COMPLETED' ? 'bg-vision-success/15 text-vision-success border border-vision-success/30' :
                          act.status === 'FAILED' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          'bg-vision-gold/15 text-vision-gold border border-vision-gold/30'
                        }`}>
                          {act.status}
                        </span>
                      </div>

                      {act.outputSummary && (
                        <div className="p-2 rounded bg-black/40 border border-vision-border text-[11px] text-vision-text-secondary">
                          {act.outputSummary}
                        </div>
                      )}

                      {act.steps && act.steps.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[10px] text-vision-text-muted uppercase">Execution Steps ({act.steps.length})</div>
                          {act.steps.map((st, i) => (
                            <div key={i} className="text-[10px] text-vision-text-muted flex items-center space-x-1.5 pl-2 border-l border-vision-border">
                              <span>[{st.timestamp}]</span>
                              <span className="text-vision-text">{st.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Raw JSON View */}
            {inspectTab === 'json' && (
              <pre className="p-3 rounded-xl bg-black/60 border border-vision-border text-[11px] text-vision-cyan overflow-x-auto leading-relaxed">
                {JSON.stringify(selectedSession, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
