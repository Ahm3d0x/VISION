// =========================================================================
// VISION Remote Protocol v1 — Official Specification & Type Contracts
// =========================================================================

import { SystemTelemetry, PermissionLevel } from './types';

export const REMOTE_PROTOCOL_VERSION = '1.0' as const;

/**
 * All allowed message type identifiers across the WebSocket connection.
 */
export type RemoteMessageType =
  // Authentication & Handshake
  | 'auth_request'
  | 'auth_response'
  | 'auth_error'
  // Connection Keepalive
  | 'ping'
  | 'pong'
  // Live Telemetry & Status Updates
  | 'desktop_status'
  | 'system_state_update'
  // Commands & Interaction
  | 'user_message'
  | 'user_voice_chunk'
  | 'agent_message'
  | 'agent_narrate'
  | 'agent_thinking'
  // Task Lifecycle & Progress Streaming
  | 'task_created'
  | 'task_plan'
  | 'task_step'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'task_cancel'
  // Security & Permission Confirmations
  | 'confirmation_required'
  | 'confirmation_decision'
  // Mobile Camera Multimodal Vision
  | 'vision_camera_frame'
  | 'vision_analysis_result';

/**
 * Standard WebSocket Message Envelope
 */
export interface RemoteMessage<T = any> {
  id: string;
  version: typeof REMOTE_PROTOCOL_VERSION;
  timestamp: string;
  type: RemoteMessageType;
  payload: T;
}

// -------------------------------------------------------------------------
// Authentication & Pairing Contracts
// -------------------------------------------------------------------------

export interface TrustedDevice {
  id: string; // Unique device identifier (e.g. UUID generated on mobile)
  name: string; // e.g. "Ahmed's Galaxy S24 Ultra"
  platform: 'android' | 'ios' | 'web';
  pairedAt: string;
  lastSeenAt: string;
  authToken: string;
}

export interface PairingRequest {
  deviceId: string;
  deviceName: string;
  platform: 'android' | 'ios' | 'web';
  pairingCode: string; // 6-digit PIN
}

export interface PairingResponse {
  success: boolean;
  authToken?: string;
  systemName?: string;
  protocolVersion?: string;
  error?: string;
}

export interface AuthRequestPayload {
  deviceId: string;
  authToken: string;
}

export interface AuthResponsePayload {
  authenticated: boolean;
  systemName: string;
  systemStatus: string;
  activeTaskId?: string;
  telemetry?: SystemTelemetry;
}

// -------------------------------------------------------------------------
// Telemetry & Hardware Status Contracts
// -------------------------------------------------------------------------

export interface DesktopStatusPayload {
  hostname: string;
  systemStatus: string;
  activeTask?: {
    id: string;
    prompt: string;
    status: 'RUNNING' | 'WAITING_CONFIRMATION' | 'COMPLETED' | 'FAILED';
    progressPercent?: number;
  };
  telemetry: SystemTelemetry;
}

// -------------------------------------------------------------------------
// User Interaction & Agent Stream Contracts
// -------------------------------------------------------------------------

export interface UserMessagePayload {
  text: string;
  voiceInput?: boolean;
}

export interface AgentNarratePayload {
  speechText: string;
  isArabic: boolean;
  taskId?: string;
}

export interface AgentThinkingPayload {
  thinking: string;
  taskId?: string;
}

export interface TaskCreatedPayload {
  taskId: string;
  prompt: string;
  startedAt: string;
}

export interface TaskPlanPayload {
  taskId: string;
  tasks: string[];
  totalTasks: number;
}

export interface TaskStepPayload {
  taskId: string;
  stepId: string;
  type: 'intent' | 'thinking' | 'tool_selection' | 'execution' | 'observation' | 'result' | 'task_plan' | 'task_progress';
  message: string;
  toolName?: string;
  args?: any;
  result?: any;
  status: 'pending' | 'success' | 'warning' | 'error';
  timestamp: string;
  taskIndex?: number;
}

export interface TaskProgressPayload {
  taskId: string;
  progressPercent: number;
  currentActivity: string;
  completedTasks?: number;
  totalTasks?: number;
}

export interface TaskCompletedPayload {
  taskId: string;
  finalText: string;
  toolsUsed: string[];
  durationMs?: number;
}

export interface TaskFailedPayload {
  taskId: string;
  error: string;
  errorType?: string;
  diagnostics?: string;
}

export interface TaskCancelPayload {
  taskId: string;
  reason?: string;
}

// -------------------------------------------------------------------------
// Security Confirmation Contracts
// -------------------------------------------------------------------------

export interface ConfirmationRequiredPayload {
  actionId: string;
  toolName: string;
  permissionLevel: PermissionLevel;
  reason: string;
  args: any;
  requestedAt: string;
}

export interface ConfirmationDecisionPayload {
  actionId: string;
  decision: 'ALLOW' | 'DENY';
}

// -------------------------------------------------------------------------
// Mobile Camera & Vision Contracts
// -------------------------------------------------------------------------

export interface VisionCameraFramePayload {
  imageBase64: string; // JPEG/PNG base64 data
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  prompt: string; // e.g. "What is wrong with this circuit?" or "Read this error"
}

export interface VisionAnalysisResultPayload {
  success: boolean;
  findings: string;
  error?: string;
}
