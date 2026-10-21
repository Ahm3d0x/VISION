// =========================================================================
// VISION Remote — Protocol v1 Type Definitions
// =========================================================================

export const REMOTE_PROTOCOL_VERSION = '1.0' as const;

export type RemoteMessageType =
  | 'auth_request'
  | 'auth_response'
  | 'auth_error'
  | 'ping'
  | 'pong'
  | 'desktop_status'
  | 'system_state_update'
  | 'user_message'
  | 'user_voice_chunk'
  | 'agent_message'
  | 'agent_narrate'
  | 'agent_thinking'
  | 'task_created'
  | 'task_plan'
  | 'task_step'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'task_cancel'
  | 'confirmation_required'
  | 'confirmation_decision'
  | 'vision_camera_frame'
  | 'vision_analysis_result';

export interface RemoteMessage<T = any> {
  id: string;
  version: typeof REMOTE_PROTOCOL_VERSION;
  timestamp: string;
  type: RemoteMessageType;
  payload: T;
}

export interface SystemTelemetry {
  cpuUsage: number;
  memoryUsageMb: number;
  totalMemoryMb: number;
  activeToolsCount: number;
  micStatus: 'READY' | 'ACTIVE' | 'ERROR' | 'MUTED';
  visionStatus: 'READY' | 'CAPTURING' | 'OFFLINE';
  uptimeSeconds: number;
  gpuName?: string;
  gpuUsage?: number;
  vramUsageMb?: number;
  totalVramMb?: number;
  gpuTemp?: number;
  gpuPowerWatts?: number;
  networkUploadMbps?: number;
  networkDownloadMbps?: number;
}

export interface PairingRequest {
  deviceId: string;
  deviceName: string;
  platform: 'android' | 'ios' | 'web';
  pairingCode: string;
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

export interface UserMessagePayload {
  text: string;
}

export interface ConfirmationDecisionPayload {
  actionId: string;
  decision: 'ALLOW' | 'DENY';
}

export interface VisionCameraFramePayload {
  imageBase64: string;
  prompt?: string;
  mimeType?: 'image/jpeg' | 'image/png';
}

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

export interface TaskStep {
  stepId: string;
  type: 'intent' | 'thinking' | 'tool_selection' | 'execution' | 'observation' | 'result' | 'task_plan' | 'task_progress';
  message: string;
  toolName?: string;
  args?: any;
  result?: any;
  status: 'pending' | 'success' | 'warning' | 'error';
  timestamp: string;
}

export interface ActiveTaskState {
  id: string;
  prompt: string;
  status: 'IDLE' | 'RUNNING' | 'WAITING_CONFIRMATION' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progressPercent: number;
  currentActivity: string;
  steps: TaskStep[];
  startedAt: string;
  finalText?: string;
  toolsUsed?: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vision';
  text: string;
  timestamp: string;
  toolsUsed?: string[];
  isThinking?: boolean;
}

export interface ConfirmationRequest {
  actionId: string;
  toolName: string;
  reason: string;
  args: any;
  permissionLevel: number;
  requestedAt: string;
}

export interface DiscoveredSystem {
  systemName: string;
  hostname: string;
  ip: string;
  port: number;
  wsUrl: string;
  lastSeen: number;
}
