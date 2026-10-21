import React, { useState } from 'react';
import { 
  CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, Terminal, 
  ShieldAlert, Zap, Volume2, Image, ExternalLink, CloudSun, Wind, Droplets, MapPin,
  Copy, Check
} from 'lucide-react';
import { ActionRecord } from '../../shared/types';
import { FormattedResponse } from './FormattedResponse';

interface ActionCardProps {
  action: ActionRecord;
  onConfirm?: (actionId: string) => void;
  onCancel?: (actionId: string) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  onConfirm,
  onCancel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isArabic = /[\u0600-\u06FF]/.test(action.outputSummary || action.commandText);

  const handleCopyAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    const stepsSummary = action.steps?.map((s) => `  - [${s.timestamp}] ${s.message} (${s.status})`).join('\n') || '';
    const fullText = [
      `[ACTION] ${action.intent}`,
      `Command: ${action.commandText}`,
      `Target: ${action.target}`,
      `Status: ${action.status}`,
      action.outputSummary ? `Response: ${action.outputSummary}` : '',
      action.errorMessage ? `Error: ${action.errorMessage}` : '',
      stepsSummary ? `Steps:\n${stepsSummary}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (action.status) {
      case 'COMPLETED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono bg-vision-success/15 text-vision-success border border-vision-success/40">
            <CheckCircle2 className="w-3 h-3" />
            <span>COMPLETED</span>
          </span>
        );
      case 'EXECUTING':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono bg-vision-cyan/15 text-vision-cyan border border-vision-cyan/40 shadow-glow-cyan-sm animate-pulse-subtle">
            <Clock className="w-3 h-3 animate-spin" />
            <span>EXECUTING</span>
          </span>
        );
      case 'CONFIRMATION_REQUIRED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono bg-vision-gold/15 text-vision-gold border border-vision-gold/40 shadow-glow-gold">
            <ShieldAlert className="w-3 h-3" />
            <span>CONFIRMATION REQUIRED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono bg-vision-error/15 text-vision-error border border-vision-error/40">
            <AlertCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-mono bg-vision-panel text-vision-text-muted border border-vision-border">
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="hud-panel hud-corner rounded-2xl p-4 border border-vision-border hover:border-vision-cyan/50 transition-all relative overflow-hidden select-text">
      {/* Left Glowing Accent Line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        action.status === 'COMPLETED' ? 'bg-vision-cyan' :
        action.status === 'EXECUTING' ? 'bg-vision-gold' :
        action.status === 'CONFIRMATION_REQUIRED' ? 'bg-vision-gold' :
        action.status === 'FAILED' ? 'bg-vision-error' : 'bg-vision-border'
      }`} />

      {/* Card Header */}
      <div className="flex items-start justify-between pl-2">
        <div className="space-y-1 flex-1 pr-2">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-vision-cyan uppercase tracking-wider font-bold">
              [ACTION]
            </span>
            <span className="text-xs font-mono font-bold text-vision-text">
              {action.intent}
            </span>
          </div>

          <div className="text-xs text-vision-text-secondary font-mono flex items-center space-x-3">
            <span>Target: <strong className="text-vision-teal font-semibold">{action.target}</strong></span>
            {action.durationMs && (
              <span className="text-vision-text-muted">
                Duration: {(action.durationMs / 1000).toFixed(2)}s
              </span>
            )}
            <span className="text-vision-text-muted">{action.startedAt}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={handleCopyAction}
            className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-vision-panel hover:bg-vision-surface text-vision-text-secondary hover:text-vision-cyan border border-vision-border transition-colors"
            title="Copy action command, output, and trace"
          >
            {copied ? <Check className="w-3 h-3 text-vision-success" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          {getStatusBadge()}
        </div>
      </div>

      {/* Command prompt text */}
      <div className="mt-3 ml-2 p-2.5 rounded-lg bg-vision-surface border border-vision-border/70 flex items-center space-x-2 text-xs font-mono text-vision-silver">
        <Terminal className="w-3.5 h-3.5 text-vision-cyan flex-shrink-0" />
        <span className="truncate">&gt; {action.commandText}</span>
      </div>

      {/* Confirmation Prompt if required */}
      {action.status === 'CONFIRMATION_REQUIRED' && (
        <div className="mt-3 ml-2 p-3 rounded-lg bg-vision-gold/10 border border-vision-gold/40 flex items-center justify-between">
          <div className="text-xs font-mono text-vision-gold">
            <strong>Security Boundary Alert:</strong> This action requires explicit authorization (Level 3).
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onCancel?.(action.id)}
              className="px-3 py-1 text-xs font-mono rounded bg-vision-panel text-vision-text-secondary hover:text-vision-text border border-vision-border"
            >
              Deny
            </button>
            <button
              onClick={() => onConfirm?.(action.id)}
              className="px-3 py-1 text-xs font-mono rounded bg-vision-gold text-vision-bg font-bold shadow-glow-gold hover:opacity-95"
            >
              Authorize &amp; Execute
            </button>
          </div>
        </div>
      )}

      {/* Observation Summary (VISION Spoken/System Output) */}
      {action.outputSummary && (
        <div className="mt-2.5 ml-2 p-3 rounded-lg bg-vision-elevated/90 border border-vision-border text-xs">
          <div className="flex items-center space-x-1.5 text-vision-cyan text-[11px] font-mono font-bold mb-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span>VISION Response &amp; Result:</span>
          </div>
          <div className="mt-1">
            <FormattedResponse content={action.outputSummary} />
          </div>

          {/* Screenshot Preview Card */}
          {action.screenshotUrl && (
            <div className="mt-3 p-2 rounded bg-vision-surface border border-vision-border/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-vision-cyan flex items-center space-x-1">
                  <Image className="w-3.5 h-3.5 mr-1" /> Full Display Capture (1920x1080)
                </span>
                {action.screenshotPath && (
                  <button
                    onClick={() => (window as any).visionAPI?.openPath(action.screenshotPath)}
                    className="text-[10px] font-mono text-vision-text-secondary hover:text-vision-cyan flex items-center space-x-1 bg-vision-panel px-2 py-0.5 rounded border border-vision-border"
                  >
                    <span>Open File</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-1" />
                  </button>
                )}
              </div>
              <div className="overflow-hidden rounded border border-vision-border/60 max-h-48 cursor-pointer group">
                <img
                  src={action.screenshotUrl}
                  alt="Captured Screen"
                  className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  onClick={() => action.screenshotPath && (window as any).visionAPI?.openPath(action.screenshotPath)}
                />
              </div>
            </div>
          )}
          {action.weatherData && (
            <div className="mt-3 p-3 rounded bg-vision-surface border border-vision-border/80">
              <div className="flex items-center justify-between border-b border-vision-border/60 pb-2 mb-2.5">
                <div className="flex items-center space-x-1.5 text-vision-cyan text-xs font-mono font-bold">
                  <MapPin className="w-3.5 h-3.5 text-vision-cyan" />
                  <span>{action.weatherData.city}, {action.weatherData.country}</span>
                </div>
                <span className="text-[10px] font-mono text-vision-text-muted">
                  Updated: {action.weatherData.timestamp}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-vision-panel border border-vision-border flex items-center space-x-2">
                  <CloudSun className="w-5 h-5 text-vision-gold flex-shrink-0" />
                  <div>
                    <span className="text-sm font-mono font-bold text-vision-text block">{action.weatherData.temperature}°C</span>
                    <span className="text-[10px] text-vision-text-secondary">Feels {action.weatherData.apparentTemperature}°C</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-vision-panel border border-vision-border flex items-center space-x-2">
                  <Droplets className="w-4 h-4 text-vision-cyan flex-shrink-0" />
                  <div>
                    <span className="text-xs font-mono font-bold text-vision-text block">{action.weatherData.humidity}%</span>
                    <span className="text-[10px] text-vision-text-secondary">Humidity</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-vision-panel border border-vision-border flex items-center space-x-2">
                  <Wind className="w-4 h-4 text-vision-teal flex-shrink-0" />
                  <div>
                    <span className="text-xs font-mono font-bold text-vision-text block">{action.weatherData.windSpeed} km/h</span>
                    <span className="text-[10px] text-vision-text-secondary">Wind Speed</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {action.errorMessage && (
        <div className="mt-2.5 ml-2 text-xs font-mono text-vision-error bg-vision-error/10 p-2.5 rounded-lg border border-vision-error/40">
          <span className="font-bold block mb-1">Failure Reason:</span>
          {action.errorMessage}
        </div>
      )}

      {/* Steps Trace Toggle */}
      {action.steps && action.steps.length > 0 && (
        <div className="mt-2.5 ml-2 pt-2 border-t border-vision-border/60">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center space-x-1.5 text-[11px] font-mono text-vision-text-muted hover:text-vision-cyan transition-colors"
          >
            <span>{expanded ? 'Hide execution trace' : `View execution trace (${action.steps.length} steps)`}</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1 pl-2 border-l border-vision-border font-mono text-[11px]">
              {action.steps.map((step) => (
                <div key={step.id} className="flex items-center justify-between text-vision-text-secondary py-0.5">
                  <div className="flex items-center space-x-2">
                    <span className={step.status === 'success' ? 'text-vision-success' : step.status === 'warning' ? 'text-vision-gold' : 'text-vision-cyan'}>
                      {step.status === 'success' ? '✓' : '→'}
                    </span>
                    <span>{step.message}</span>
                  </div>
                  <span className="text-[10px] text-vision-text-muted">{step.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
