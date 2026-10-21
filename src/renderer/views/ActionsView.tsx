import React from 'react';
import { Zap, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ActionRecord } from '../../shared/types';
import { ActionCard } from '../components/ActionCard';

interface ActionsViewProps {
  actions: ActionRecord[];
  onConfirmAction: (id: string) => void;
  onCancelAction: (id: string) => void;
}

export const ActionsView: React.FC<ActionsViewProps> = ({
  actions,
  onConfirmAction,
  onCancelAction,
}) => {
  const completedCount = actions.filter((a) => a.status === 'COMPLETED').length;
  const runningCount = actions.filter((a) => a.status === 'EXECUTING').length;
  const pendingAuthCount = actions.filter((a) => a.status === 'CONFIRMATION_REQUIRED').length;

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto overflow-y-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-vision-border pb-4">
        <div>
          <h1 className="text-sm font-mono font-bold tracking-widest text-vision-cyan flex items-center space-x-2">
            <Zap className="w-4 h-4" />
            <span>ACTION EXECUTION LEDGER</span>
          </h1>
          <p className="text-xs font-mono text-vision-text-muted mt-1">
            Real-time track of system intents, verified execution boundaries, and tool results.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="px-3 py-1 rounded bg-vision-panel border border-vision-border text-vision-success">
            {completedCount} Completed
          </div>
          <div className="px-3 py-1 rounded bg-vision-panel border border-vision-border text-vision-cyan">
            {runningCount} Running
          </div>
          {pendingAuthCount > 0 && (
            <div className="px-3 py-1 rounded bg-vision-gold/20 border border-vision-gold/50 text-vision-gold shadow-glow-gold">
              {pendingAuthCount} Requires Authorization
            </div>
          )}
        </div>
      </div>

      {/* Action List */}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="hud-panel p-8 rounded-lg text-center font-mono text-xs text-vision-text-muted">
            No system actions recorded yet.
          </div>
        ) : (
          actions.map((act) => (
            <ActionCard
              key={act.id}
              action={act}
              onConfirm={onConfirmAction}
              onCancel={onCancelAction}
            />
          ))
        )}
      </div>
    </div>
  );
};
