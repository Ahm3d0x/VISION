export type SystemStatus = 
  | 'ONLINE' 
  | 'READY' 
  | 'LISTENING' 
  | 'PROCESSING' 
  | 'EXECUTING' 
  | 'OBSERVING' 
  | 'WAITING' 
  | 'ERROR' 
  | 'OFFLINE';

export type PermissionLevel = 
  | 0 // Read-only / safe
  | 1 // Low risk (automatic)
  | 2 // Moderate (confirmation configurable)
  | 3 // High risk (explicit confirmation)
  | 4 // External / Irreversible (explicit confirmation)

export interface SystemTelemetry {
  cpuUsage: number;
  memoryUsageMb: number;
  totalMemoryMb: number;
  activeToolsCount: number;
  micStatus: 'READY' | 'ACTIVE' | 'ERROR' | 'MUTED';
  visionStatus: 'READY' | 'CAPTURING' | 'OFFLINE';
  uptimeSeconds: number;
  // GPU Telemetry (NVIDIA GeForce RTX 3060 / CUDA device)
  gpuName?: string;
  gpuUsage?: number;
  vramUsageMb?: number;
  totalVramMb?: number;
  gpuTemp?: number;
  gpuPowerWatts?: number;
  gpuPowerLimitWatts?: number;
  totalSystemPowerWatts?: number;
  // Live Network Telemetry (Real-time I/O)
  networkUploadMbps?: number;
  networkDownloadMbps?: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: 'system' | 'filesystem' | 'browser' | 'code' | 'automation';
  permissionLevel: PermissionLevel;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  parametersSchema: Record<string, any>;
  enabled: boolean;
}

export interface ActionLogStep {
  id: string;
  timestamp: string;
  type: 'intent' | 'tool_selection' | 'permission_check' | 'execution' | 'observation' | 'result' | 'task_plan' | 'task_progress';
  message: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  details?: any;
}

export interface ActionRecord {
  id: string;
  commandText: string;
  intent: string;
  target: string;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'CONFIRMATION_REQUIRED';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  steps: ActionLogStep[];
  outputSummary?: string;
  errorMessage?: string;
  screenshotUrl?: string;
  screenshotPath?: string;
  weatherData?: any;
  pendingConfirmation?: {
    toolName: string;
    args: any;
    reason?: string;
  };
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'DEBUG';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

export type MemoryCategory = 
  | 'user_preference' 
  | 'project' 
  | 'workflow' 
  | 'system_knowledge'
  | 'session_archive'
  | 'conversation_summary';

export type MemorySource = 
  | 'user' 
  | 'agent_inferred' 
  | 'system'
  | 'system_boot' 
  | 'user_defined' 
  | 'agent_learned';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  content: string;
  tags: string[];
  confidence?: number; // 0.0 to 1.0
  source?: MemorySource;
  createdAt?: string;
  updatedAt: string;
  lastAccessed?: string;
  accessCount?: number;
  importance?: number; // 1 (lowest) to 5 (critical)
}

export interface ConversationTurn {
  id: string;
  timestamp: string;
  userPrompt: string;
  agentResponse: string;
  toolsUsed?: string[];
  summary?: string;
}

export interface RecentSessionRecord {
  id: string;
  title: string;
  startedAt: string;
  lastActiveAt: string;
  durationSeconds: number;
  turns: ConversationTurn[];
  actions: ActionRecord[];
  summary?: string;
  status: 'active' | 'archived' | 'completed';
  tags?: string[];
  metrics: {
    turnsCount: number;
    actionsCount: number;
    toolsCount: number;
  };
}

export type WorkspaceTab = 
  | 'home'
  | 'chat'
  | 'sessions'
  | 'tools'
  | 'vision'
  | 'projects'
  | 'memory'
  | 'system'
  | 'settings'
  | 'command' 
  | 'actions' 
  | 'activity';

// =========================================================================
// CONTACTS & ADDRESS BOOK
// =========================================================================
export interface ContactPhone {
  raw: string;
  normalized: string; // E.164-compatible without + (e.g. 201018515861)
  type?: string;
}

export interface ContactItem {
  id: string;
  name: string;
  normalizedName: string; // Stripped diacritics, normalized Arabic (أ/إ/آ -> ا, ة -> ه)
  phones: ContactPhone[];
  primaryPhone: string | null;
  email?: string;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
