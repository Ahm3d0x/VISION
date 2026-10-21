import React from 'react';
import { JarvisCore } from '../components/JarvisCore';
import { CommandInput } from '../components/CommandInput';
import { ActionCard } from '../components/ActionCard';
import { SystemStatus, ActionRecord } from '../../shared/types';

interface CommandViewProps {
  status: SystemStatus;
  actions: ActionRecord[];
  audioLevel?: number;
  interimTranscript?: string;
  lastTranscript?: string;
  lastResponse?: string;
  onSubmitCommand: (cmd: string) => void;
  onToggleMic: () => void;
  onConfirmAction: (actionId: string) => void;
  onCancelAction: (actionId: string) => void;
}

export const CommandView: React.FC<CommandViewProps> = ({
  status,
  actions,
  audioLevel = 0,
  interimTranscript,
  lastTranscript,
  lastResponse,
  onSubmitCommand,
  onToggleMic,
  onConfirmAction,
  onCancelAction,
}) => {
  return (
    <div className="h-full flex flex-col justify-between p-5 max-w-5xl mx-auto overflow-y-auto">
      {/* Top Core Area */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[250px]">
        <JarvisCore 
          status={status} 
          audioLevel={audioLevel}
          interimTranscript={interimTranscript}
          lastTranscript={lastTranscript}
          lastResponse={lastResponse}
          onCoreClick={onToggleMic} 
        />
      </div>

      {/* Action Execution Stream */}
      <div className="w-full flex-1 max-h-[320px] overflow-y-auto pr-1 my-2 space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-vision-text-muted/60">
            <span>● VISION Core is online and ready. Speak or enter a command below.</span>
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

      {/* Bottom Command Prompt Console */}
      <div className="w-full pt-1">
        <CommandInput
          status={status}
          onSubmitCommand={onSubmitCommand}
          onToggleMic={onToggleMic}
        />
      </div>
    </div>
  );
};
