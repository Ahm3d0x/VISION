import { contextBridge, ipcRenderer } from 'electron';
import { SystemTelemetry } from '../shared/types';

export const visionAPI = {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  quitApp: () => ipcRenderer.invoke('window:quit'),
  hideWindow: () => ipcRenderer.invoke('window:hide'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  getTelemetry: (): Promise<SystemTelemetry> => ipcRenderer.invoke('system:get-telemetry'),
  
  // 3.1 Application Control
  launchApp: (appName: string, args?: string[]): Promise<{ success: boolean; appName: string; message?: string; error?: string }> =>
    ipcRenderer.invoke('app:launch', { appName, args }),
  closeApp: (appName: string): Promise<{ success: boolean; appName: string; message?: string; error?: string }> =>
    ipcRenderer.invoke('app:close', { appName }),
  closeAllApps: (exceptApps?: string[]): Promise<{ success: boolean; closedApps?: string[]; message?: string; error?: string }> =>
    ipcRenderer.invoke('app:close-all', { exceptApps }),
  getRunningApps: (): Promise<Array<{ pid: number; name: string; title: string; memoryMb: number }>> =>
    ipcRenderer.invoke('app:get-running'),
  focusApp: (processName: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('app:focus', { processName }),

  // 3.2 Web & Browser Navigation (new tabs, searches, websites)
  openUrl: (url: string): Promise<{ success: boolean; url?: string; message?: string; error?: string }> =>
    ipcRenderer.invoke('system:open-url', url),
  openBrowser: (options?: { url?: string; searchQuery?: string; newWindow?: boolean }): Promise<{ success: boolean; url?: string; message?: string; error?: string }> =>
    ipcRenderer.invoke('system:open-browser', options),
  webSearch: (query: string, maxResults?: number): Promise<{
    success: boolean;
    query: string;
    results: Array<{ title: string; snippet: string; url: string }>;
    error?: string;
  }> => ipcRenderer.invoke('system:web-search', { query, maxResults }),
  fetchWebPage: (url: string, maxLength?: number): Promise<{
    success: boolean;
    url: string;
    title?: string;
    content?: string;
    characterCount?: number;
    error?: string;
  }> => ipcRenderer.invoke('system:fetch-url', { url, maxLength }),

  // Screenshots & Files
  takeScreenshot: (options?: { screenIndex?: number }): Promise<{ 
    success: boolean; 
    dataUrl?: string; 
    filePath?: string; 
    screenName?: string;
    screenIndex?: number;
    totalScreens?: number;
    width?: number; 
    height?: number; 
    error?: string 
  }> => ipcRenderer.invoke('system:take-screenshot', options),
  openPath: (targetPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('system:open-path', targetPath),
  readImageBase64: (filePath: string): Promise<{
    success: boolean;
    mimeType?: string;
    base64?: string;
    dataUrl?: string;
    error?: string;
  }> => ipcRenderer.invoke('system:read-image-base64', filePath),
  executeCommand: (
    optionsOrCmd: string | { command: string; cwd?: string; shell?: 'powershell' | 'cmd' | 'pwsh' | 'bash' | 'auto'; timeout?: number },
    cwdArg?: string
  ): Promise<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    shellUsed?: string;
    cwdUsed?: string;
    errorType?: string;
    error?: string;
    diagnostics?: string;
  }> => {
    const payload = typeof optionsOrCmd === 'string'
      ? { command: optionsOrCmd, cwd: cwdArg }
      : optionsOrCmd;
    return ipcRenderer.invoke('system:execute-command', payload);
  },
  executeCommandElevated: (
    options: { command: string; cwd?: string; timeout?: number }
  ): Promise<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    shellUsed?: string;
    cwdUsed?: string;
    errorType?: string;
    error?: string;
    diagnostics?: string;
  }> => {
    return ipcRenderer.invoke('system:execute-command-elevated', options);
  },

  // 3.3 Media, Volume, Clipboard & OS Notification
  mediaControl: (options: { action: 'play_pause' | 'next' | 'previous' | 'stop' }): Promise<{
    success: boolean;
    key?: string;
    error?: string;
  }> => ipcRenderer.invoke('system:media-control', options),

  volumeControl: (options: {
    action: 'get' | 'set' | 'mute' | 'unmute' | 'step_up' | 'step_down';
    level?: number;
    step?: number;
  }): Promise<{
    success: boolean;
    volume?: number;
    muted?: boolean;
    error?: string;
  }> => ipcRenderer.invoke('system:volume-control', options),

  clipboard: (options: {
    action: 'read' | 'write' | 'clear';
    text?: string;
  }): Promise<{
    success: boolean;
    text?: string;
    message?: string;
    length?: number;
    error?: string;
  }> => ipcRenderer.invoke('system:clipboard', options),

  showNotification: (options: {
    title: string;
    message: string;
    sound?: boolean;
    urgency?: 'normal' | 'critical';
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> => ipcRenderer.invoke('system:notify', options),

  // 3.4 Safe Filesystem Tools API
  fsReadFile: (options: { filePath: string; startLine?: number; endLine?: number; maxLines?: number }): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    content?: string;
    totalLines?: number;
    startLine?: number;
    endLine?: number;
    lineCount?: number;
    truncated?: boolean;
    error?: string;
  }> => ipcRenderer.invoke('fs:read-file', options),

  fsWriteFile: (options: { filePath: string; content: string; overwrite?: boolean; createDirs?: boolean }): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    bytesWritten?: number;
    backupCreated?: string;
    message?: string;
    error?: string;
  }> => ipcRenderer.invoke('fs:write-file', options),

  fsEditFile: (options: { filePath: string; targetText: string; replacementText: string }): Promise<{
    success: boolean;
    filePath?: string;
    fileName?: string;
    occurrencesReplaced?: number;
    backupCreated?: string;
    message?: string;
    error?: string;
  }> => ipcRenderer.invoke('fs:edit-file', options),

  fsSearchFiles: (options: { directory: string; fileNamePattern?: string; queryText?: string; maxResults?: number; recursive?: boolean }): Promise<{
    success: boolean;
    directory?: string;
    totalFound?: number;
    results?: Array<{
      path: string;
      name: string;
      extension: string;
      sizeBytes: number;
      isDirectory: boolean;
      modifiedAt: string;
      snippet?: string;
    }>;
    message?: string;
    error?: string;
  }> => ipcRenderer.invoke('fs:search-files', options),

  fsTrashFile: (options: { targetPath: string; reason?: string }): Promise<{
    success: boolean;
    targetPath?: string;
    itemName?: string;
    isDirectory?: boolean;
    message?: string;
    error?: string;
  }> => ipcRenderer.invoke('fs:trash-file', options),

  // 3.5 High-Fidelity Document & PDF Hub API
  docReadPdf: (options: { filePath: string; startPage?: number; endPage?: number; maxPages?: number }): Promise<{
    success: boolean;
    filePath: string;
    totalPages: number;
    title?: string;
    author?: string;
    creationDate?: string;
    text: string;
    snippet: string;
    metadata?: Record<string, any>;
    error?: string;
  }> => ipcRenderer.invoke('doc:read-pdf', options),

  docReadDoc: (options: { filePath: string; maxLines?: number }): Promise<{
    success: boolean;
    filePath: string;
    format: 'docx' | 'markdown' | 'text' | 'unknown';
    markdown: string;
    text: string;
    snippet: string;
    title?: string;
    error?: string;
  }> => ipcRenderer.invoke('doc:read-doc', options),

  docCreatePdf: (options: {
    outputPath: string;
    title: string;
    content: string;
    language?: 'ar' | 'en' | 'auto';
    theme?: 'corporate_clean' | 'executive_dark' | 'modern_minimal' | 'academic';
    options?: {
      includeTableOfContents?: boolean;
      showPageNumbers?: boolean;
      headerText?: string;
      footerText?: string;
      accentColor?: string;
      pageSize?: 'A4' | 'Letter';
      orientation?: 'portrait' | 'landscape';
      marginsType?: 'default' | 'none' | 'printableArea' | 'custom';
      printBackground?: boolean;
    };
  }): Promise<{
    success: boolean;
    outputPath: string;
    fileSize?: number;
    title: string;
    theme: string;
    isRTL: boolean;
    error?: string;
  }> => ipcRenderer.invoke('doc:create-pdf', options),

  docConvertToPdf: (options: {
    inputPath: string;
    outputPath?: string;
    title?: string;
    language?: 'ar' | 'en' | 'auto';
    theme?: 'corporate_clean' | 'executive_dark' | 'modern_minimal' | 'academic';
    options?: {
      includeTableOfContents?: boolean;
      showPageNumbers?: boolean;
      headerText?: string;
      footerText?: string;
      accentColor?: string;
      pageSize?: 'A4' | 'Letter';
      orientation?: 'portrait' | 'landscape';
    };
  }): Promise<{
    success: boolean;
    outputPath: string;
    fileSize?: number;
    title: string;
    theme: string;
    isRTL: boolean;
    error?: string;
  }> => ipcRenderer.invoke('doc:convert-to-pdf', options),

  docMergePdfs: (options: { inputFiles: string[]; outputPath: string; title?: string }): Promise<{
    success: boolean;
    outputPath: string;
    totalFilesMerged: number;
    totalPages: number;
    fileSize?: number;
    error?: string;
  }> => ipcRenderer.invoke('doc:merge-pdfs', options),

  transcribeAudio: (audioBuffer: ArrayBuffer, mimeType: string): Promise<string> => 
    ipcRenderer.invoke('stt:transcribe', { buffer: audioBuffer, mimeType }),

  // Persistent Memory Storage
  loadMemory: (): Promise<any[] | null> => ipcRenderer.invoke('memory:load'),
  saveMemory: (items: any[]): Promise<{ success: boolean; count?: number; error?: string }> =>
    ipcRenderer.invoke('memory:save', items),
  clearMemory: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('memory:clear'),

  // 3.4 Contacts Management
  loadContacts: (): Promise<any[] | null> => ipcRenderer.invoke('contacts:load'),
  saveContacts: (contacts: any[]): Promise<{ success: boolean; count?: number; error?: string }> =>
    ipcRenderer.invoke('contacts:save', contacts),
  importVcfFile: (filePath?: string): Promise<{ success: boolean; total: number; contacts: any[]; error?: string }> =>
    ipcRenderer.invoke('contacts:import-vcf', filePath),

  // 3.5 WhatsApp Automation
  openWhatsAppChat: (options: { phone: string; message?: string }): Promise<{ success: boolean; error?: string; url?: string }> =>
    ipcRenderer.invoke('whatsapp:open-chat', options),
  sendWhatsAppMessage: (options: { phone: string; message: string; autoSend?: boolean }): Promise<{ success: boolean; phone?: string; message?: string; error?: string }> =>
    ipcRenderer.invoke('whatsapp:send-message', options),
  sendWhatsAppMedia: (options: { phone: string; mediaPath?: string; caption?: string; autoSend?: boolean }): Promise<{ success: boolean; phone?: string; error?: string }> =>
    ipcRenderer.invoke('whatsapp:send-media', options),
  sendWhatsAppFile: (options: { phone: string; filePath: string; caption?: string; autoSend?: boolean }): Promise<{ success: boolean; phone?: string; filePath?: string; fileName?: string; fileSize?: number; error?: string }> =>
    ipcRenderer.invoke('whatsapp:send-file', options),

  onSystemEvent: (callback: (event: any) => void) => {
    ipcRenderer.on('system:event', (_event, data) => callback(data));
  },

  // 3.6 VISION Remote Gateway API
  getGatewayInfo: (): Promise<{
    ip: string;
    port: number;
    systemName: string;
    connectedClients: number;
    connectedDevices: Array<{ deviceId: string; deviceName: string; connectedAt: string }>;
    activePairingCode: { code: string; expiresInSeconds: number } | null;
  }> => ipcRenderer.invoke('gateway:get-info'),

  generatePairingCode: (): Promise<{ code: string; expiresInSeconds: number }> =>
    ipcRenderer.invoke('gateway:generate-pairing-code'),

  getTrustedDevices: (): Promise<any[]> =>
    ipcRenderer.invoke('gateway:get-devices'),

  revokeTrustedDevice: (deviceId: string): Promise<boolean> =>
    ipcRenderer.invoke('gateway:revoke-device', deviceId),

  // Remote Streaming Emitters (Desktop -> Mobile)
  streamRemotePlan: (taskId: string, tasks: string[]): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-plan', { taskId, tasks }),

  streamRemoteStep: (taskId: string, step: any): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-step', { taskId, step }),

  streamRemoteProgress: (taskId: string, percent: number, currentActivity: string): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-progress', { taskId, percent, currentActivity }),

  streamRemoteNarrate: (speechText: string, isArabic: boolean, taskId?: string): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-narrate', { speechText, isArabic, taskId }),

  streamRemoteThinking: (thinking: string, taskId?: string): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-thinking', { thinking, taskId }),

  streamRemoteConfirmationRequired: (payload: any): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-confirmation-required', payload),

  streamRemoteCompleted: (taskId: string, finalText: string, toolsUsed?: string[]): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-completed', { taskId, finalText, toolsUsed }),

  streamRemoteFailed: (taskId: string, error: string, errorType?: string): Promise<boolean> =>
    ipcRenderer.invoke('remote:stream-failed', { taskId, error, errorType }),

  onRemoteCommand: (callback: (data: { cmdText: string; taskId: string }) => void) => {
    ipcRenderer.removeAllListeners('remote:user-command');
    ipcRenderer.on('remote:user-command', (_event, data) => callback(data));
  },

  onRemoteConfirmationDecision: (callback: (data: { actionId: string; decision: 'ALLOW' | 'DENY' }) => void) => {
    ipcRenderer.removeAllListeners('remote:confirmation-decision');
    ipcRenderer.on('remote:confirmation-decision', (_event, data) => callback(data));
  },
};

contextBridge.exposeInMainWorld('visionAPI', visionAPI);
