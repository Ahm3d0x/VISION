import React, { useState } from 'react';
import { Mic, ArrowRight, CornerDownLeft, Sparkles, Disc } from 'lucide-react';
import { SystemStatus } from '../../shared/types';

interface CommandInputProps {
  status: SystemStatus;
  onSubmitCommand: (command: string) => void;
  onToggleMic: () => void;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  status,
  onSubmitCommand,
  onToggleMic,
}) => {
  const [inputVal, setInputVal] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      onSubmitCommand(inputVal.trim());
      setInputVal('');
    }
  };

  const handleQuickAction = (cmd: string) => {
    onSubmitCommand(cmd);
  };

  const getPlaceholder = () => {
    switch (status) {
      case 'LISTENING':
        return 'Listening... Speak your command in English or Arabic';
      case 'PROCESSING':
        return 'Resolving intent and selecting tools...';
      case 'EXECUTING':
        return 'Executing system operation...';
      default:
        return 'Command JARVIS or speak in English / Egyptian Arabic...';
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Quick Action Suggestion Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs font-mono select-none">
        <span className="text-[10px] uppercase text-vision-text-muted font-bold tracking-wider">Quick:</span>
        <button
          onClick={() => handleQuickAction('Open VS Code')}
          className="px-2.5 py-1 rounded bg-vision-surface hover:bg-vision-panel text-vision-text-secondary hover:text-vision-cyan border border-vision-border hover:border-vision-cyan/50 transition-colors whitespace-nowrap"
        >
          Launch VS Code
        </button>
        <button
          onClick={() => handleQuickAction('Analyze Workspace Architecture')}
          className="px-2.5 py-1 rounded bg-vision-surface hover:bg-vision-panel text-vision-text-secondary hover:text-vision-cyan border border-vision-border hover:border-vision-cyan/50 transition-colors whitespace-nowrap"
        >
          Analyze Architecture
        </button>
        <button
          onClick={() => handleQuickAction('Run System Diagnostics')}
          className="px-2.5 py-1 rounded bg-vision-surface hover:bg-vision-panel text-vision-text-secondary hover:text-vision-gold border border-vision-border hover:border-vision-gold/50 transition-colors whitespace-nowrap"
        >
          Run Diagnostics
        </button>
        <button
          onClick={() => handleQuickAction('Check Git Status')}
          className="px-2.5 py-1 rounded bg-vision-surface hover:bg-vision-panel text-vision-text-secondary hover:text-vision-teal border border-vision-border hover:border-vision-teal/50 transition-colors whitespace-nowrap"
        >
          Git Status
        </button>
      </div>

      {/* Main Command Input Box */}
      <div className="hud-panel rounded-xl p-2 border border-vision-border focus-within:border-vision-cyan focus-within:shadow-glow-cyan-sm transition-all flex items-center space-x-2">
        {/* Voice Trigger Button */}
        <button
          onClick={onToggleMic}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            status === 'LISTENING'
              ? 'bg-vision-cyan text-vision-bg shadow-glow-cyan font-bold animate-pulse'
              : 'bg-vision-surface text-vision-cyan border border-vision-border hover:border-vision-cyan/60 hover:bg-vision-surface/80'
          }`}
          title={status === 'LISTENING' ? 'Listening active — click to stop' : 'Click to activate voice input'}
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          disabled={status === 'PROCESSING' || status === 'EXECUTING'}
          className="flex-1 bg-transparent border-none outline-none font-mono text-xs md:text-sm text-vision-text placeholder-vision-text-muted px-2 disabled:opacity-60"
        />

        {/* Submit Button */}
        <button
          onClick={() => {
            if (inputVal.trim()) {
              onSubmitCommand(inputVal.trim());
              setInputVal('');
            }
          }}
          disabled={!inputVal.trim() || status === 'PROCESSING' || status === 'EXECUTING'}
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-vision-panel text-vision-text-secondary hover:text-vision-cyan hover:border-vision-cyan/50 border border-vision-border disabled:opacity-30 disabled:hover:text-vision-text-secondary transition-all"
          title="Execute Command"
        >
          <CornerDownLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
