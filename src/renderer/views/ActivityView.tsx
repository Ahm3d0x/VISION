import React, { useState, useMemo } from 'react';
import { 
  Activity, 
  Trash2, 
  Copy, 
  Check, 
  Search, 
  Terminal, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Filter, 
  Zap,
  Sparkles,
  Download
} from 'lucide-react';
import { ActivityLog, ActionRecord, SystemTelemetry } from '../../shared/types';
import { FormattedResponse } from '../components/FormattedResponse';

interface ActivityViewProps {
  logs: ActivityLog[];
  actions?: ActionRecord[];
  telemetry: SystemTelemetry;
  onClearLogs: () => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({
  logs,
  actions = [],
  telemetry,
  onClearLogs,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'stream' | 'scenario'>('scenario');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [expandedActionIds, setExpandedActionIds] = useState<Record<string, boolean>>({});

  // Toggle action scenario expansion
  const toggleAction = (id: string) => {
    setExpandedActionIds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  // Filter logs based on category and live text search
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Level Filter
      if (levelFilter === 'USER') {
        if (!log.source.toLowerCase().includes('intent') && !log.source.toLowerCase().includes('request') && !log.source.toLowerCase().includes('command')) {
          return false;
        }
      } else if (levelFilter === 'THINKING') {
        if (!log.source.toLowerCase().includes('thinking')) return false;
      } else if (levelFilter !== 'ALL') {
        if (log.level !== levelFilter) return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesMsg = log.message.toLowerCase().includes(q);
        const matchesSrc = log.source.toLowerCase().includes(q);
        const matchesLvl = log.level.toLowerCase().includes(q);
        if (!matchesMsg && !matchesSrc && !matchesLvl) return false;
      }

      return true;
    });
  }, [logs, levelFilter, searchQuery]);

  // Copy all filtered logs to clipboard
  const handleCopyAll = () => {
    const text = filteredLogs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}]\n${l.message}\n`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Copy single log line
  const handleCopyLog = (log: ActivityLog) => {
    const text = `[${log.timestamp}] [${log.level}] [${log.source}]\n${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedLogId(log.id);
    setTimeout(() => setCopiedLogId(null), 1500);
  };

  // Copy entire action scenario
  const handleCopyScenario = (action: ActionRecord) => {
    const stepsText = action.steps
      .map(
        (s, idx) =>
          `  ${idx + 1}. [${s.timestamp}] (${s.type.toUpperCase()}) [${s.status.toUpperCase()}]: ${s.message}` +
          (s.details ? `\n     Details: ${typeof s.details === 'object' ? JSON.stringify(s.details, null, 2) : s.details}` : '')
      )
      .join('\n');

    const scenarioText = [
      `=======================================================`,
      `ACTION SCENARIO AUDIT: ${action.id}`,
      `Started At: ${action.startedAt} | Completed At: ${action.completedAt || 'N/A'} | Status: ${action.status}`,
      `User Intent / Command: "${action.commandText}"`,
      `Target: ${action.target}`,
      `-------------------------------------------------------`,
      `Execution Steps:`,
      stepsText,
      `-------------------------------------------------------`,
      `Final Output Summary:`,
      action.outputSummary || 'No output summary recorded.',
      `=======================================================`,
    ].join('\n');

    navigator.clipboard.writeText(scenarioText);
    setCopiedActionId(action.id);
    setTimeout(() => setCopiedActionId(null), 1500);
  };

  // Export full audit history as JSON
  const handleExportAudit = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      telemetry,
      actions,
      logs,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision_audit_trail_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return 'text-vision-success bg-vision-success/15 border-vision-success/40';
      case 'WARNING':
        return 'text-vision-gold bg-vision-gold/15 border-vision-gold/40';
      case 'ERROR':
        return 'text-vision-error bg-vision-error/15 border-vision-error/40';
      case 'DEBUG':
        return 'text-vision-teal bg-vision-teal/10 border-vision-teal/30';
      case 'INFO':
      default:
        return 'text-vision-cyan bg-vision-cyan/15 border-vision-cyan/40';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto overflow-hidden space-y-4 select-text">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-vision-border/60 pb-4 gap-3 select-none">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-vision-cyan shadow-[0_0_8px_#00D9FF] animate-pulse"></span>
            <h1 className="text-base font-mono font-bold tracking-widest text-vision-text flex items-center space-x-2">
              <Activity className="w-4 h-4 text-vision-cyan" />
              <span>ACTIVITY &amp; EXECUTION AUDIT CONSOLE</span>
            </h1>
          </div>
          <p className="text-xs font-mono text-vision-text-muted mt-1">
            Comprehensive operational audit: Trace command scenarios, reasoning traces, tool executions, and system telemetry in full detail.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Full Audit Trail */}
          <button
            onClick={handleExportAudit}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-vision-panel hover:bg-vision-surface text-vision-text-secondary hover:text-vision-cyan border border-vision-border transition-all hover:scale-105 active:scale-95"
            title="Export complete execution scenario & logs as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          {/* Copy All Logs */}
          <button
            onClick={handleCopyAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-vision-panel hover:bg-vision-surface text-vision-text-secondary hover:text-vision-cyan border border-vision-border transition-all hover:scale-105 active:scale-95 shadow-glow-cyan-sm"
            title="Copy logs to clipboard"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-vision-success" /> : <Copy className="w-3.5 h-3.5 text-vision-cyan" />}
            <span className={copiedAll ? 'text-vision-success font-bold' : ''}>
              {copiedAll ? 'Copied' : 'Copy All Logs'}
            </span>
          </button>

          {/* Clear Logs */}
          <button
            onClick={onClearLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-mono rounded-xl bg-vision-error/10 hover:bg-vision-error/20 text-vision-error border border-vision-error/30 transition-all hover:scale-105 active:scale-95"
            title="Clear in-memory telemetry logs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* 2. Mode Selector: Scenario Timeline vs. Live Stream Console */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
        <div className="flex items-center space-x-2 p-1 rounded-xl bg-vision-surface border border-vision-border/60">
          <button
            onClick={() => setActiveSubTab('scenario')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeSubTab === 'scenario'
                ? 'bg-vision-cyan/20 text-vision-cyan border border-vision-cyan/60 font-bold shadow-glow-cyan-sm'
                : 'text-vision-text-muted hover:text-vision-text'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Scenario Timeline</span>
            <span className="px-1.5 py-0.2 rounded-full bg-vision-cyan/20 text-[10px] text-vision-cyan">
              {actions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('stream')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeSubTab === 'stream'
                ? 'bg-vision-cyan/20 text-vision-cyan border border-vision-cyan/60 font-bold shadow-glow-cyan-sm'
                : 'text-vision-text-muted hover:text-vision-text'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Stream Console</span>
            <span className="px-1.5 py-0.2 rounded-full bg-vision-cyan/20 text-[10px] text-vision-cyan">
              {logs.length}
            </span>
          </button>
        </div>

        {/* Live Search Bar for quick filter */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-vision-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs & execution scenario..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-vision-surface/80 border border-vision-border/60 focus:border-vision-cyan text-xs font-mono text-vision-text placeholder-vision-text-muted outline-none transition-colors"
          />
        </div>
      </div>

      {/* 3. MODE 1: SCENARIO EXECUTION FLOW (Rich Interactive Inspection) */}
      {activeSubTab === 'scenario' ? (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {actions.length === 0 ? (
            <div className="hud-panel rounded-2xl p-8 text-center space-y-3 font-mono">
              <Sparkles className="w-8 h-8 text-vision-cyan mx-auto opacity-40 animate-pulse" />
              <div className="text-sm text-vision-text font-bold">No execution scenarios recorded yet in this session</div>
              <p className="text-xs text-vision-text-muted max-w-md mx-auto">
                Any voice command or user prompt submitted to VISION will be deconstructed and displayed here with full reasoning steps, tool calls, and synthesized outputs.
              </p>
            </div>
          ) : (
            actions.map((action, actIndex) => {
              const isExpanded = expandedActionIds[action.id] !== false; // expanded by default
              const isSuccess = action.status === 'COMPLETED';
              const isFailed = action.status === 'FAILED';
              const isWait = action.status === 'CONFIRMATION_REQUIRED';

              return (
                <div
                  key={action.id}
                  className="hud-panel hud-corner rounded-2xl border border-vision-border/70 overflow-hidden transition-all shadow-md hover:border-vision-cyan/40"
                >
                  {/* Scenario Card Header */}
                  <div
                    onClick={() => toggleAction(action.id)}
                    className="p-4 bg-vision-panel/90 border-b border-vision-border/60 flex items-center justify-between cursor-pointer select-none hover:bg-vision-surface transition-colors"
                  >
                    <div className="flex items-center space-x-3 truncate pr-2">
                      <button className="text-vision-cyan p-0.5">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-vision-surface border border-vision-border text-vision-text-muted font-bold">
                        #{actions.length - actIndex}
                      </span>

                      <div className="truncate">
                        <span className="text-xs font-mono font-bold text-vision-text truncate">
                          "{action.commandText}"
                        </span>
                        <div className="text-[10px] font-mono text-vision-text-muted flex items-center space-x-2 mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-vision-text-muted" />
                            <span>{action.startedAt}</span>
                          </span>
                          <span>•</span>
                          <span className="text-vision-cyan">{action.target}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                          isSuccess
                            ? 'bg-vision-success/15 border-vision-success/40 text-vision-success shadow-[0_0_8px_rgba(0,230,153,0.2)]'
                            : isFailed
                            ? 'bg-vision-error/15 border-vision-error/40 text-vision-error'
                            : isWait
                            ? 'bg-vision-gold/15 border-vision-gold/40 text-vision-gold'
                            : 'bg-vision-cyan/15 border-vision-cyan/40 text-vision-cyan animate-pulse'
                        }`}
                      >
                        {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                        {isFailed && <AlertCircle className="w-3 h-3" />}
                        {isWait && <AlertTriangle className="w-3 h-3" />}
                        <span>{action.status}</span>
                      </span>

                      {/* Copy Scenario Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyScenario(action);
                        }}
                        className="p-1.5 rounded-lg bg-vision-surface hover:bg-vision-panel text-vision-text-secondary hover:text-vision-cyan border border-vision-border transition-colors"
                        title="Copy Scenario"
                      >
                        {copiedActionId === action.id ? (
                          <Check className="w-3.5 h-3.5 text-vision-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Scenario Details */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 font-mono text-xs select-text bg-[#06080E]/90">
                      {/* 1. Request Intent Header */}
                      <div className="p-3 rounded-xl bg-vision-panel/80 border border-vision-cyan/30 space-y-1">
                        <div className="text-[10px] text-vision-cyan uppercase font-bold tracking-wider flex items-center justify-between">
                          <span>1. USER INTENT / COMMAND</span>
                          <span className="text-vision-text-muted text-[10px]">TIMESTAMP: {action.startedAt}</span>
                        </div>
                        <p className="text-sm font-semibold text-vision-text select-text leading-relaxed">
                          {action.commandText}
                        </p>
                      </div>

                      {/* 2. Step-by-Step Execution Journey */}
                      <div className="space-y-2">
                        <div className="text-[10px] text-vision-text-muted uppercase font-bold tracking-wider">
                          2. EXECUTION SCENARIO &amp; REASONING STEPS:
                        </div>

                        {action.steps.map((step, sIdx) => {
                          const isErr = step.status === 'error';
                          const isWarn = step.status === 'warning';
                          const isSucc = step.status === 'success';

                          return (
                            <div
                              key={step.id || sIdx}
                              className={`p-3 rounded-xl border transition-colors select-text ${
                                isErr
                                  ? 'bg-vision-error/5 border-vision-error/40'
                                  : isWarn
                                  ? 'bg-vision-gold/5 border-vision-gold/40'
                                  : 'bg-vision-panel/60 border-vision-border/60 hover:border-vision-cyan/40'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-vision-text-muted mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan"></span>
                                  <span className="font-bold text-vision-cyan uppercase tracking-wider">
                                    STEP {sIdx + 1}: {step.type.toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-[10px] text-vision-text-muted">{step.timestamp}</span>
                              </div>

                              <p className="text-xs text-vision-text font-medium select-text leading-relaxed whitespace-pre-wrap">
                                {step.message}
                              </p>

                              {/* Detailed Step Payload or Tool Output if available */}
                              {step.details && (
                                <div className="mt-2 p-2.5 rounded-lg bg-[#030508] border border-vision-border/80 overflow-x-auto select-text">
                                  <div className="text-[9px] text-vision-text-muted uppercase mb-1 font-bold">
                                    Raw Payload / Execution Details:
                                  </div>
                                  <pre className="text-[11px] text-vision-teal select-text whitespace-pre-wrap break-all leading-normal">
                                    {typeof step.details === 'object'
                                      ? JSON.stringify(step.details, null, 2)
                                      : String(step.details)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* 3. Final Agent Response / Output Summary */}
                      {action.outputSummary && (
                        <div className="p-3.5 rounded-xl bg-vision-surface border border-vision-success/40 space-y-1 select-text">
                          <div className="text-[10px] text-vision-success uppercase font-bold tracking-wider flex items-center space-x-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-vision-success" />
                            <span>3. FINAL SYNTHESIZED RESPONSE:</span>
                          </div>
                          <div className="pt-1 select-text">
                            <FormattedResponse content={action.outputSummary} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* 4. MODE 2: STREAM CONSOLE LOGS (Terminal Style Log Inspector) */
        <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
          {/* Filter Bar Pills */}
          <div className="flex items-center space-x-2 text-xs font-mono overflow-x-auto pb-1 select-none flex-shrink-0">
            {[
              { id: 'ALL', label: 'ALL LOGS' },
              { id: 'USER', label: 'USER REQUESTS' },
              { id: 'THINKING', label: 'THINKING' },
              { id: 'INFO', label: 'INFO' },
              { id: 'SUCCESS', label: 'SUCCESS' },
              { id: 'WARNING', label: 'WARNING' },
              { id: 'ERROR', label: 'ERROR' },
              { id: 'DEBUG', label: 'DEBUG' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setLevelFilter(lvl.id)}
                className={`px-3 py-1 rounded-xl transition-all whitespace-nowrap ${
                  levelFilter === lvl.id
                    ? 'bg-vision-cyan text-vision-bg font-bold shadow-glow-cyan-sm'
                    : 'bg-vision-panel text-vision-text-secondary hover:text-vision-text border border-vision-border/80'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          {/* Terminal Log Console */}
          <div className="flex-1 hud-panel rounded-2xl p-3 border border-vision-border font-mono text-xs overflow-y-auto space-y-1.5 bg-[#05070B] select-text">
            {filteredLogs.length === 0 ? (
              <div className="text-vision-text-muted text-center py-10 select-none">
                No activity logs match the selected filter.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="group flex items-start space-x-3 py-1.5 px-2 rounded-lg hover:bg-vision-panel/60 transition-colors border border-transparent hover:border-vision-border/50 select-text"
                >
                  <span className="text-vision-text-muted text-[11px] whitespace-nowrap select-text flex-shrink-0">
                    {log.timestamp}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] rounded-md border uppercase font-bold whitespace-nowrap select-text flex-shrink-0 ${getLevelStyle(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>
                  <span className="text-vision-cyan text-[11px] whitespace-nowrap select-text flex-shrink-0 font-bold">
                    [{log.source}]
                  </span>
                  <span className="text-vision-text flex-1 break-words whitespace-pre-wrap select-text leading-relaxed">
                    {log.message}
                  </span>
                  <button
                    onClick={() => handleCopyLog(log)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-vision-surface text-vision-text-muted hover:text-vision-cyan flex-shrink-0"
                    title="Copy log entry"
                  >
                    {copiedLogId === log.id ? (
                      <Check className="w-3.5 h-3.5 text-vision-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
