// =========================================================================
// VISION Gateway — Remote Bridge (Agent, Execution & Permissions Link)
// =========================================================================

import { sessionHub } from './SessionHub';
import {
  UserMessagePayload,
  TaskCreatedPayload,
  TaskPlanPayload,
  TaskStepPayload,
  TaskProgressPayload,
  TaskCompletedPayload,
  TaskFailedPayload,
  ConfirmationRequiredPayload,
  ConfirmationDecisionPayload,
  VisionCameraFramePayload,
  VisionAnalysisResultPayload,
} from '../shared/remoteProtocol';
import { PermissionLevel } from '../shared/types';

export interface ActiveRemoteTask {
  id: string;
  prompt: string;
  startedAt: string;
  status: 'RUNNING' | 'WAITING_CONFIRMATION' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progressPercent: number;
  abortController?: AbortController;
  pendingConfirmation?: {
    actionId: string;
    toolName: string;
    permissionLevel: PermissionLevel;
    reason: string;
    args: any;
  };
}

export class RemoteBridge {
  private activeTask: ActiveRemoteTask | null = null;
  private desktopCommandHandler?: (cmdText: string, taskId: string) => Promise<void>;
  private confirmationDecisionHandler?: (actionId: string, decision: 'ALLOW' | 'DENY') => Promise<void>;
  private visionFrameHandler?: (payload: VisionCameraFramePayload) => Promise<string>;

  /**
   * Register the desktop handler for user commands sent from mobile.
   */
  public registerDesktopCommandHandler(handler: (cmdText: string, taskId: string) => Promise<void>): void {
    this.desktopCommandHandler = handler;
  }

  /**
   * Register the desktop confirmation handler.
   */
  public registerConfirmationHandler(handler: (actionId: string, decision: 'ALLOW' | 'DENY') => Promise<void>): void {
    this.confirmationDecisionHandler = handler;
  }

  /**
   * Register the multimodal vision analysis handler.
   */
  public registerVisionFrameHandler(handler: (payload: VisionCameraFramePayload) => Promise<string>): void {
    this.visionFrameHandler = handler;
  }

  /**
   * Called when a mobile user sends a message / command.
   */
  public async handleUserMessage(payload: UserMessagePayload): Promise<void> {
    const taskId = `task_${Date.now()}`;
    const abortController = new AbortController();

    this.activeTask = {
      id: taskId,
      prompt: payload.text,
      startedAt: new Date().toISOString(),
      status: 'RUNNING',
      progressPercent: 0,
      abortController,
    };

    // 1. Broadcast task_created event to mobile
    sessionHub.broadcast<TaskCreatedPayload>('task_created', {
      taskId,
      prompt: payload.text,
      startedAt: this.activeTask.startedAt,
    });

    console.log(`[RemoteBridge] Mobile Command Received [${taskId}]: "${payload.text}"`);

    // 2. Delegate to Desktop Agent execution handler
    if (this.desktopCommandHandler) {
      try {
        await this.desktopCommandHandler(payload.text, taskId);
      } catch (err: any) {
        this.notifyTaskFailed(taskId, err.message || 'Execution error');
      }
    } else {
      console.warn('[RemoteBridge] No desktopCommandHandler registered yet.');
    }
  }

  /**
   * Emit task plan to mobile.
   */
  public notifyTaskPlan(taskId: string, tasks: string[]): void {
    if (this.activeTask && this.activeTask.id === taskId) {
      this.activeTask.progressPercent = 10;
    }
    sessionHub.broadcast<TaskPlanPayload>('task_plan', {
      taskId,
      tasks,
      totalTasks: tasks.length,
    });
  }

  /**
   * Stream a single agent step to mobile.
   */
  public notifyTaskStep(taskId: string, step: Omit<TaskStepPayload, 'taskId'>): void {
    sessionHub.broadcast<TaskStepPayload>('task_step', {
      taskId,
      ...step,
    });
  }

  /**
   * Update task progress percentage and activity description.
   */
  public notifyTaskProgress(taskId: string, percent: number, currentActivity: string): void {
    if (this.activeTask && this.activeTask.id === taskId) {
      this.activeTask.progressPercent = percent;
    }
    sessionHub.broadcast<TaskProgressPayload>('task_progress', {
      taskId,
      progressPercent: percent,
      currentActivity,
    });
  }

  /**
   * Spoken narration from AgentCore forwarded to mobile.
   */
  public notifyNarration(speechText: string, isArabic: boolean, taskId?: string): void {
    sessionHub.broadcast('agent_narrate', {
      speechText,
      isArabic,
      taskId: taskId || this.activeTask?.id,
    });
  }

  /**
   * Thinking stream from AgentCore forwarded to mobile.
   */
  public notifyThinking(thinking: string, taskId?: string): void {
    sessionHub.broadcast('agent_thinking', {
      thinking,
      taskId: taskId || this.activeTask?.id,
    });
  }

  /**
   * Emit confirmation required when high-risk tool is selected.
   */
  public notifyConfirmationRequired(payload: ConfirmationRequiredPayload): void {
    if (this.activeTask) {
      this.activeTask.status = 'WAITING_CONFIRMATION';
      this.activeTask.pendingConfirmation = {
        actionId: payload.actionId,
        toolName: payload.toolName,
        permissionLevel: payload.permissionLevel,
        reason: payload.reason,
        args: payload.args,
      };
    }
    sessionHub.broadcast<ConfirmationRequiredPayload>('confirmation_required', payload);
  }

  /**
   * Handle user decision from Mobile (ALLOW or DENY).
   */
  public async handleConfirmationDecision(payload: ConfirmationDecisionPayload): Promise<void> {
    console.log(`[RemoteBridge] Mobile Confirmation Decision: Action ${payload.actionId} -> ${payload.decision}`);

    if (this.activeTask && this.activeTask.pendingConfirmation?.actionId === payload.actionId) {
      this.activeTask.status = 'RUNNING';
      this.activeTask.pendingConfirmation = undefined;
    }

    if (this.confirmationDecisionHandler) {
      await this.confirmationDecisionHandler(payload.actionId, payload.decision);
    }
  }

  /**
   * Notify task completion.
   */
  public notifyTaskCompleted(taskId: string, finalText: string, toolsUsed: string[] = []): void {
    if (this.activeTask && this.activeTask.id === taskId) {
      this.activeTask.status = 'COMPLETED';
      this.activeTask.progressPercent = 100;
    }
    sessionHub.broadcast<TaskCompletedPayload>('task_completed', {
      taskId,
      finalText,
      toolsUsed,
    });
  }

  /**
   * Notify task failure.
   */
  public notifyTaskFailed(taskId: string, error: string, errorType?: string): void {
    if (this.activeTask && this.activeTask.id === taskId) {
      this.activeTask.status = 'FAILED';
    }
    sessionHub.broadcast<TaskFailedPayload>('task_failed', {
      taskId,
      error,
      errorType,
    });
  }

  /**
   * Emergency Task Cancel / STOP button from Mobile.
   */
  public cancelActiveTask(taskId?: string): boolean {
    if (!this.activeTask) return false;
    if (taskId && this.activeTask.id !== taskId) return false;

    console.log(`[RemoteBridge] EMERGENCY STOP triggered for Task: ${this.activeTask.id}`);
    this.activeTask.status = 'CANCELLED';
    this.activeTask.abortController?.abort();

    sessionHub.broadcast('task_failed', {
      taskId: this.activeTask.id,
      error: 'Task was aborted by user from VISION Remote (STOP).',
      errorType: 'USER_ABORTED',
    });

    return true;
  }

  /**
   * Handle camera vision frame upload from Mobile.
   */
  public async handleVisionFrame(payload: VisionCameraFramePayload): Promise<VisionAnalysisResultPayload> {
    console.log(`[RemoteBridge] Received Camera Vision Frame from Mobile with prompt: "${payload.prompt}"`);
    if (this.visionFrameHandler) {
      try {
        const findings = await this.visionFrameHandler(payload);
        return { success: true, findings };
      } catch (err: any) {
        return { success: false, findings: '', error: err.message };
      }
    }
    return {
      success: false,
      findings: '',
      error: 'Vision frame analysis handler not yet initialized on Desktop.',
    };
  }

  /**
   * Get currently active task.
   */
  public getActiveTask(): ActiveRemoteTask | null {
    return this.activeTask;
  }
}

export const remoteBridge = new RemoteBridge();
