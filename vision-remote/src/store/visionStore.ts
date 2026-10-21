// =========================================================================
// VISION Remote — Central Mobile State Store (Zustand)
// =========================================================================

import { create } from 'zustand';
import {
  SystemTelemetry,
  ActiveTaskState,
  ChatMessage,
  ConfirmationRequest,
  TaskStep,
} from '../types/protocol';
import { storageService } from '../services/storage';
import { api } from '../services/api';
import { wsClient } from '../services/websocket';

export interface VisionStoreState {
  // Connection & Device State
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  host: string;
  port: number;
  systemName: string;
  deviceId: string;
  deviceName: string;
  authToken: string | null;

  // Real-Time Telemetry & Hardware Status
  telemetry: SystemTelemetry | null;
  systemState: string;

  // Active Task Stream
  activeTask: ActiveTaskState | null;

  // Chat & Conversation Stream
  messages: ChatMessage[];

  // Security Confirmations
  pendingConfirmation: ConfirmationRequest | null;

  // Camera & Multimodal Vision
  visionFindings: string | null;
  isAnalyzingVision: boolean;

  // Actions
  init: () => Promise<void>;
  setHost: (host: string, port?: number) => void;
  pair: (pin: string) => Promise<{ success: boolean; error?: string }>;
  connect: () => void;
  disconnect: () => void;
  sendCommand: (text: string) => void;
  cancelActiveTask: () => void;
  respondConfirmation: (actionId: string, decision: 'ALLOW' | 'DENY') => void;
  submitVisionFrame: (base64: string, prompt: string) => void;
  clearMessages: () => void;
}

export const useVisionStore = create<VisionStoreState>((set, get) => ({
  connectionStatus: 'disconnected',
  host: '192.168.1.9',
  port: 8767,
  systemName: 'VISION-PC',
  deviceId: '',
  deviceName: "Ahmed's Phone",
  authToken: null,

  telemetry: null,
  systemState: 'ONLINE',

  activeTask: null,
  messages: [],
  pendingConfirmation: null,
  visionFindings: null,
  isAnalyzingVision: false,

  init: async () => {
    const token = await storageService.getAuthToken();
    const deviceId = await storageService.getDeviceId();
    const deviceName = await storageService.getDeviceName();
    const host = await storageService.getLastHost();
    const port = await storageService.getLastPort();

    api.setHost(host, port);

    set({
      authToken: token,
      deviceId,
      deviceName,
      host,
      port,
    });

    // Wire WebSocket status changes to store
    wsClient.onStatusChange((status) => {
      set({ connectionStatus: status });
    });

    // Wire incoming WebSocket event stream to store
    wsClient.subscribe((type, payload) => {
      const state = get();

      switch (type) {
        case 'auth_response': {
          set({
            systemName: payload.systemName || 'VISION-PC',
            systemState: payload.systemStatus || 'READY',
            connectionStatus: 'connected',
          });
          break;
        }

        case 'desktop_status': {
          set({
            systemState: payload.systemStatus,
            telemetry: payload.telemetry,
          });
          break;
        }

        case 'task_created': {
          const newTask: ActiveTaskState = {
            id: payload.taskId,
            prompt: payload.prompt,
            status: 'RUNNING',
            progressPercent: 5,
            currentActivity: 'Initializing task...',
            steps: [],
            startedAt: payload.startedAt,
          };
          set({ activeTask: newTask });
          break;
        }

        case 'task_step': {
          const current = state.activeTask;
          if (current && current.id === payload.taskId) {
            const step: TaskStep = {
              stepId: payload.stepId,
              type: payload.type,
              message: payload.message,
              toolName: payload.toolName,
              args: payload.args,
              result: payload.result,
              status: payload.status,
              timestamp: payload.timestamp,
            };
            set({
              activeTask: {
                ...current,
                steps: [...current.steps, step],
                currentActivity: step.message,
              },
            });
          }
          break;
        }

        case 'task_progress': {
          const current = state.activeTask;
          if (current && current.id === payload.taskId) {
            set({
              activeTask: {
                ...current,
                progressPercent: payload.progressPercent,
                currentActivity: payload.currentActivity,
              },
            });
          }
          break;
        }

        case 'agent_narrate': {
          // Add or update spoken narration message
          const msg: ChatMessage = {
            id: `msg_nar_${Date.now()}`,
            sender: 'vision',
            text: `🎙️ ${payload.speechText}`,
            timestamp: new Date().toLocaleTimeString(),
          };
          set({ messages: [...state.messages, msg] });
          break;
        }

        case 'agent_thinking': {
          // Thinking updates
          break;
        }

        case 'task_completed': {
          const current = state.activeTask;
          if (current && current.id === payload.taskId) {
            set({
              activeTask: {
                ...current,
                status: 'COMPLETED',
                progressPercent: 100,
                finalText: payload.finalText,
                toolsUsed: payload.toolsUsed,
              },
            });
          }

          // Add final message to chat
          const reply: ChatMessage = {
            id: `msg_res_${Date.now()}`,
            sender: 'vision',
            text: payload.finalText,
            timestamp: new Date().toLocaleTimeString(),
            toolsUsed: payload.toolsUsed,
          };
          set({ messages: [...state.messages, reply] });
          break;
        }

        case 'task_failed': {
          const current = state.activeTask;
          if (current && current.id === payload.taskId) {
            set({
              activeTask: {
                ...current,
                status: payload.errorType === 'USER_ABORTED' ? 'CANCELLED' : 'FAILED',
                currentActivity: payload.error,
              },
            });
          }
          break;
        }

        case 'confirmation_required': {
          set({
            pendingConfirmation: {
              actionId: payload.actionId,
              toolName: payload.toolName,
              reason: payload.reason,
              args: payload.args,
              permissionLevel: payload.permissionLevel,
              requestedAt: payload.requestedAt,
            },
          });
          break;
        }

        case 'vision_analysis_result': {
          set({
            visionFindings: payload.findings || payload.error || 'No visual anomalies identified.',
            isAnalyzingVision: false,
          });
          break;
        }
      }
    });

    // Auto-connect if token exists
    if (token) {
      get().connect();
    }
  },

  setHost: (host: string, port: number = 8767) => {
    api.setHost(host, port);
    storageService.setLastHost(host);
    storageService.setLastPort(port);
    set({ host, port });
  },

  pair: async (pin: string) => {
    const { deviceId, deviceName, host, port } = get();
    api.setHost(host, port);

    const res = await api.pair({
      deviceId,
      deviceName,
      platform: 'android',
      pairingCode: pin.trim(),
    });

    if (res.success && res.authToken) {
      await storageService.setAuthToken(res.authToken);
      await storageService.setLastHost(host);
      await storageService.setLastPort(port);

      set({
        authToken: res.authToken,
        systemName: res.systemName || 'VISION-PC',
      });

      // Connect WebSocket immediately
      get().connect();
      return { success: true };
    }

    return { success: false, error: res.error || 'Failed to pair device.' };
  },

  connect: () => {
    const { host, port, deviceId, authToken } = get();
    if (!authToken || !deviceId) {
      console.warn('[Store] Cannot connect without authToken & deviceId');
      return;
    }
    wsClient.connect(host, port, deviceId, authToken);
  },

  disconnect: () => {
    wsClient.disconnect();
    set({ connectionStatus: 'disconnected' });
  },

  sendCommand: (text: string) => {
    if (!text.trim()) return;

    // Add user message to local chat
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    set((s) => ({ messages: [...s.messages, userMsg] }));

    // Send through WebSocket to Desktop Agent
    wsClient.sendUserCommand(text.trim());
  },

  cancelActiveTask: () => {
    const current = get().activeTask;
    wsClient.sendTaskCancel(current?.id);
    if (current) {
      set({
        activeTask: {
          ...current,
          status: 'CANCELLED',
          currentActivity: 'Aborted by user (STOP).',
        },
      });
    }
  },

  respondConfirmation: (actionId: string, decision: 'ALLOW' | 'DENY') => {
    wsClient.sendConfirmationDecision(actionId, decision);
    set({ pendingConfirmation: null });
  },

  submitVisionFrame: (base64: string, prompt: string) => {
    set({ isAnalyzingVision: true, visionFindings: null });
    wsClient.sendVisionFrame(base64, prompt);
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
