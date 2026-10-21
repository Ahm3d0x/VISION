// =========================================================================
// VISION Remote — WebSocket Real-Time Client
// =========================================================================

import {
  RemoteMessage,
  RemoteMessageType,
  REMOTE_PROTOCOL_VERSION,
  AuthRequestPayload,
  UserMessagePayload,
  ConfirmationDecisionPayload,
  VisionCameraFramePayload,
} from '../types/protocol';

export type MessageHandler = (type: RemoteMessageType, payload: any) => void;

export class VisionWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private deviceId: string = '';
  private authToken: string = '';
  private isExplicitlyClosed: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private pingInterval: any = null;
  private listeners: Set<MessageHandler> = new Set();
  private statusListeners: Set<(status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void> = new Set();

  public subscribe(handler: MessageHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  public onStatusChange(callback: (status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus(status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting'): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  /**
   * Connect to VISION Gateway WebSocket server.
   */
  public connect(host: string, port: number, deviceId: string, authToken: string): void {
    this.url = `ws://${host}:${port}/ws`;
    this.deviceId = deviceId;
    this.authToken = authToken;
    this.isExplicitlyClosed = false;

    this.notifyStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log(`[WS] Connected to VISION Gateway on ${this.url}`);
        this.reconnectAttempts = 0;
        this.startKeepalive();

        // 1. Send initial authentication handshake
        this.send<AuthRequestPayload>('auth_request', {
          deviceId: this.deviceId,
          authToken: this.authToken,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: RemoteMessage = JSON.parse(event.data);
          this.handleIncomingMessage(msg);
        } catch (err) {
          console.warn('[WS] Parse error on incoming message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[WS] WebSocket error:', err);
      };

      this.ws.onclose = () => {
        this.stopKeepalive();
        if (!this.isExplicitlyClosed) {
          this.notifyStatus('disconnected');
          this.scheduleReconnect(host, port);
        } else {
          this.notifyStatus('disconnected');
        }
      };
    } catch (err) {
      console.warn('[WS] Connect attempt failed:', err);
      this.scheduleReconnect(host, port);
    }
  }

  /**
   * Schedule automatic reconnection with exponential backoff.
   */
  private scheduleReconnect(host: string, port: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnect attempts reached.');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    console.log(`[WS] Reconnecting in ${Math.round(delay / 1000)}s (Attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect(host, port, this.deviceId, this.authToken);
      }
    }, delay);
  }

  /**
   * Send a typed message to VISION Gateway.
   */
  public send<T>(type: RemoteMessageType, payload: T): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`[WS] Cannot send "${type}", WebSocket not open.`);
      return;
    }

    const message: RemoteMessage<T> = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type,
      payload,
    };

    try {
      this.ws.send(JSON.stringify(message));
    } catch (err) {
      console.warn('[WS] Send error:', err);
    }
  }

  /**
   * Handle incoming message from Desktop.
   */
  private handleIncomingMessage(msg: RemoteMessage): void {
    if (msg.type === 'auth_response') {
      if (msg.payload?.authenticated) {
        this.notifyStatus('connected');
      }
    }

    // Broadcast to all internal listeners / store
    for (const listener of this.listeners) {
      listener(msg.type, msg.payload);
    }
  }

  /**
   * Periodic keepalive ping.
   */
  private startKeepalive(): void {
    this.stopKeepalive();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 10000);
  }

  private stopKeepalive(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send text user command to Desktop Agent.
   */
  public sendUserCommand(text: string): void {
    this.send<UserMessagePayload>('user_message', { text });
  }

  /**
   * Send confirmation decision (ALLOW / DENY).
   */
  public sendConfirmationDecision(actionId: string, decision: 'ALLOW' | 'DENY'): void {
    this.send<ConfirmationDecisionPayload>('confirmation_decision', { actionId, decision });
  }

  /**
   * Emergency Task Cancel (STOP button).
   */
  public sendTaskCancel(taskId?: string): void {
    this.send('task_cancel', { taskId });
  }

  /**
   * Upload camera frame for multimodal visual analysis.
   */
  public sendVisionFrame(imageBase64: string, prompt: string, mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'): void {
    this.send<VisionCameraFramePayload>('vision_camera_frame', {
      imageBase64,
      prompt,
      mimeType,
    });
  }

  /**
   * Disconnect cleanly.
   */
  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopKeepalive();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.notifyStatus('disconnected');
  }
}

export const wsClient = new VisionWebSocketClient();
