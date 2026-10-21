import { Tool, PermissionLevel, ToolExecutionContext } from '../tools/types';

export interface PermissionEvaluation {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason?: string;
  level: PermissionLevel;
}

export class PermissionManager {
  private confirmationThreshold: PermissionLevel = 2; // Level 2 and above can require confirmation
  private strictMode: boolean = false;

  public setConfirmationThreshold(threshold: PermissionLevel) {
    this.confirmationThreshold = threshold;
  }

  public getConfirmationThreshold(): PermissionLevel {
    return this.confirmationThreshold;
  }

  public setStrictMode(enabled: boolean) {
    this.strictMode = enabled;
  }

  public evaluate(tool: Tool, input: unknown, context?: ToolExecutionContext): PermissionEvaluation {
    const level = tool.permissionLevel;

    // Explicit user confirmation provided
    if (context?.confirmed) {
      return {
        allowed: true,
        requiresConfirmation: false,
        level,
      };
    }

    // Level 0: Read-only operations are always permitted
    if (level === 0) {
      return {
        allowed: true,
        requiresConfirmation: false,
        level: 0,
      };
    }

    // Level 4: Always requires explicit confirmation
    if (level === 4) {
      return {
        allowed: false,
        requiresConfirmation: true,
        reason: `Tool "${tool.name}" is an irreversible/external operation (Level 4) requiring explicit authorization.`,
        level: 4,
      };
    }

    // Dynamic Safety Check: elevate dangerous command execution to Level 3
    if (tool.name === 'execute_command' && input && typeof input === 'object' && 'command' in input) {
      const cmd = String((input as any).command).toLowerCase();
      const isDestructive = /\b(format|del\s+\/[sS]|rmdir\s+\/[sS]|rm\s+-rf|reg\s+delete|drop\s+database|fdisk)\b/i.test(cmd);
      if (isDestructive) {
        return {
          allowed: false,
          requiresConfirmation: true,
          reason: `Command contains high-risk/destructive patterns ("${cmd.slice(0, 40)}") and requires explicit authorization.`,
          level: 3,
        };
      }
    }

    // Dynamic Safety Check: Protected memory deletion requires explicit authorization
    if (tool.name === 'delete_memory') {
      const memId = input && typeof input === 'object' && 'id' in input ? String((input as any).id) : 'unknown';
      return {
        allowed: false,
        requiresConfirmation: true,
        reason: `Deleting persistent memory record ("${memId}") is a protected operation requiring explicit user confirmation.`,
        level: 3,
      };
    }

    // Dynamic Safety Check: Filesystem operations
    if (tool.name === 'trash_file') {
      const target = input && typeof input === 'object' && 'targetPath' in input ? String((input as any).targetPath) : 'unknown';
      return {
        allowed: false,
        requiresConfirmation: true,
        reason: `Trashing item ("${target}") to Recycle Bin is a Level 3 action requiring explicit user confirmation.`,
        level: 3,
      };
    }

    if (tool.name === 'filesystem_tool' && input && typeof input === 'object' && 'action' in input) {
      const action = (input as any).action;
      if (action === 'trash') {
        const target = (input as any).targetPath || (input as any).filePath || 'unknown';
        return {
          allowed: false,
          requiresConfirmation: true,
          reason: `Moving item ("${target}") to Windows Recycle Bin is a Level 3 action requiring explicit user confirmation.`,
          level: 3,
        };
      }
      if (action === 'write' || action === 'edit') {
        if (this.confirmationThreshold <= 2 || this.strictMode) {
          const target = (input as any).filePath || 'unknown';
          return {
            allowed: false,
            requiresConfirmation: true,
            reason: `Modifying filesystem ("${target}") requires confirmation (Level 2).`,
            level: 2,
          };
        }
      }
      if (action === 'read' || action === 'search') {
        return {
          allowed: true,
          requiresConfirmation: false,
          level: 0,
        };
      }
    }

    // Level 3: Destructive/High-risk requires confirmation
    if (level === 3) {
      return {
        allowed: false,
        requiresConfirmation: true,
        reason: `Tool "${tool.name}" is a privileged/high-risk action (Level 3) requiring explicit user confirmation.`,
        level: 3,
      };
    }

    // Level 2: Depends on threshold and strict mode
    if (level >= this.confirmationThreshold || this.strictMode) {
      return {
        allowed: false,
        requiresConfirmation: true,
        reason: `Tool "${tool.name}" exceeds automatic execution threshold (Level ${level}).`,
        level,
      };
    }

    // Level 1: Low risk automatic
    return {
      allowed: true,
      requiresConfirmation: false,
      level: 1,
    };
  }
}

export const permissionManager = new PermissionManager();
