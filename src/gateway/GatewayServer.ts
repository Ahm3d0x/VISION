// =========================================================================
// VISION Gateway — HTTP REST Server & WebSocket Event Gateway
// =========================================================================

import http from 'http';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import { VISION_CONFIG } from '../shared/config';
import { pairingManager } from './PairingManager';
import { sessionHub } from './SessionHub';
import { remoteBridge } from './RemoteBridge';
import {
  RemoteMessage,
  AuthRequestPayload,
  AuthResponsePayload,
  DesktopStatusPayload,
  UserMessagePayload,
  ConfirmationDecisionPayload,
  VisionCameraFramePayload,
} from '../shared/remoteProtocol';
import { SystemTelemetry } from '../shared/types';

export class GatewayServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private port: number = VISION_CONFIG.GATEWAY.PORT;
  private host: string = VISION_CONFIG.GATEWAY.HOST;
  private telemetryProvider?: () => Promise<SystemTelemetry>;

  /**
   * Set callback to retrieve live hardware telemetry.
   */
  public setTelemetryProvider(provider: () => Promise<SystemTelemetry>): void {
    this.telemetryProvider = provider;
  }

  /**
   * Determine primary local LAN IPv4 address.
   */
  public getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netList = interfaces[name];
      if (!netList) continue;
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  /**
   * Start the Gateway HTTP and WebSocket server.
   */
  public async start(): Promise<void> {
    if (this.server) {
      console.log(`[GatewayServer] Already running on port ${this.port}.`);
      return;
    }

    this.server = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    this.wss = new WebSocketServer({ server: this.server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.handleWebSocketConnection(ws, req);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, this.host, () => {
        const localIp = this.getLocalIpAddress();
        console.log(`=======================================================`);
        console.log(`[GatewayServer] VISION Gateway is ONLINE & LISTENING!`);
        console.log(`[GatewayServer] Local URL:     http://127.0.0.1:${this.port}`);
        console.log(`[GatewayServer] LAN Access:    http://${localIp}:${this.port}`);
        console.log(`[GatewayServer] WebSocket:     ws://${localIp}:${this.port}/ws`);
        console.log(`=======================================================`);
        resolve();
      });

      this.server!.on('error', (err) => {
        console.error('[GatewayServer] Server error:', err);
        reject(err);
      });
    });
  }

  /**
   * Stop the Gateway server.
   */
  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          console.log('[GatewayServer] VISION Gateway stopped.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming REST API requests.
   */
  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS headers for local LAN & mobile access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // Helper to send JSON responses
    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };

    // Helper to read JSON request body
    const readBody = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (err) {
            reject(err);
          }
        });
        req.on('error', reject);
      });
    };

    // 1. GET /api/discovery — LAN discovery endpoint
    if (pathname === '/api/discovery' && req.method === 'GET') {
      const localIp = this.getLocalIpAddress();
      sendJson(200, {
        systemName: VISION_CONFIG.GATEWAY.SYSTEM_NAME,
        hostname: os.hostname(),
        version: VISION_CONFIG.GATEWAY.VERSION,
        ip: localIp,
        port: this.port,
        wsUrl: `ws://${localIp}:${this.port}/ws`,
        status: 'ONLINE',
      });
      return;
    }

    // 2. POST /api/pair — Exchange 6-digit code for bearer token
    if (pathname === '/api/pair' && req.method === 'POST') {
      readBody().then((body) => {
        const result = pairingManager.pairDevice(body);
        if (result.success) {
          sendJson(200, result);
        } else {
          sendJson(401, result);
        }
      }).catch(() => {
        sendJson(400, { success: false, error: 'Malformed JSON payload.' });
      });
      return;
    }

    // 3. POST /api/pairing-code/generate — Trigger new 6-digit PIN from desktop UI
    if (pathname === '/api/pairing-code/generate' && req.method === 'POST') {
      const code = pairingManager.generatePairingCode();
      sendJson(200, { success: true, code, expiresInSeconds: 300 });
      return;
    }

    // 4. GET /api/pairing-code/active — Check active code for desktop UI display
    if (pathname === '/api/pairing-code/active' && req.method === 'GET') {
      const active = pairingManager.getActivePairingCode();
      sendJson(200, { success: true, activeCode: active });
      return;
    }

    // Check authorization for protected endpoints
    const authHeader = req.headers['authorization'];
    const deviceIdHeader = req.headers['x-device-id'] as string;
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    const isAuthorized = deviceIdHeader && token && pairingManager.verifyDevice(deviceIdHeader, token);

    // 5. GET /api/status — Hardware telemetry and system state
    if (pathname === '/api/status' && req.method === 'GET') {
      if (!isAuthorized) {
        sendJson(401, { error: 'Unauthorized. Please pair device first.' });
        return;
      }

      const fetchStatus = async () => {
        const telemetry = this.telemetryProvider ? await this.telemetryProvider() : {
          cpuUsage: 0,
          memoryUsageMb: 0,
          totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
          activeToolsCount: 0,
          micStatus: 'READY' as const,
          visionStatus: 'READY' as const,
          uptimeSeconds: Math.round(process.uptime()),
        };

        const activeTask = remoteBridge.getActiveTask();
        const payload: DesktopStatusPayload = {
          hostname: os.hostname(),
          systemStatus: activeTask?.status === 'RUNNING' ? 'EXECUTING' : 'READY',
          activeTask: activeTask ? {
            id: activeTask.id,
            prompt: activeTask.prompt,
            status: activeTask.status === 'RUNNING' ? 'RUNNING' : activeTask.status === 'WAITING_CONFIRMATION' ? 'WAITING_CONFIRMATION' : 'COMPLETED',
            progressPercent: activeTask.progressPercent,
          } : undefined,
          telemetry,
        };

        sendJson(200, payload);
      };

      fetchStatus().catch((err) => {
        sendJson(500, { error: err.message });
      });
      return;
    }

    // 6. POST /api/tasks/cancel — Stop active running task
    if (pathname === '/api/tasks/cancel' && req.method === 'POST') {
      if (!isAuthorized) {
        sendJson(401, { error: 'Unauthorized.' });
        return;
      }
      const stopped = remoteBridge.cancelActiveTask();
      sendJson(200, { success: stopped });
      return;
    }

    // 7. GET /api/devices — List trusted devices
    if (pathname === '/api/devices' && req.method === 'GET') {
      sendJson(200, { devices: pairingManager.listDevices() });
      return;
    }

    // Default 404
    sendJson(404, { error: 'Endpoint not found on VISION Gateway.' });
  }

  /**
   * Handle incoming WebSocket client connection.
   */
  private handleWebSocketConnection(ws: WebSocket, req: http.IncomingMessage): void {
    const client = sessionHub.addClient(ws);
    console.log(`[GatewayServer] New WebSocket connection initiated from ${req.socket.remoteAddress}.`);

    // Keepalive ping timer
    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, VISION_CONFIG.GATEWAY.PING_INTERVAL_MS);

    ws.on('close', () => {
      clearInterval(pingTimer);
      sessionHub.removeClient(client);
      console.log(`[GatewayServer] WebSocket client disconnected (${client.deviceName || 'unauthenticated'}).`);
    });

    ws.on('message', async (raw) => {
      try {
        const msg: RemoteMessage = JSON.parse(raw.toString());
        await this.handleWebSocketMessage(client, msg);
      } catch (err) {
        console.warn('[GatewayServer] Invalid WebSocket message format received:', err);
      }
    });
  }

  /**
   * Process incoming WebSocket message by type.
   */
  private async handleWebSocketMessage(client: any, msg: RemoteMessage): Promise<void> {
    const { type, payload } = msg;

    // 1. Initial Handshake / Auth
    if (type === 'auth_request') {
      const auth = payload as AuthRequestPayload;
      const isValid = pairingManager.verifyDevice(auth.deviceId, auth.authToken);

      if (isValid) {
        const devList = pairingManager.listDevices();
        const dev = devList.find(d => d.id === auth.deviceId);
        sessionHub.authenticateClient(client, auth.deviceId, dev?.name || 'Remote Device');

        const activeTask = remoteBridge.getActiveTask();
        const res: AuthResponsePayload = {
          authenticated: true,
          systemName: VISION_CONFIG.GATEWAY.SYSTEM_NAME,
          systemStatus: activeTask?.status === 'RUNNING' ? 'EXECUTING' : 'READY',
          activeTaskId: activeTask?.id,
        };
        sessionHub.send(client, 'auth_response', res);
        console.log(`[GatewayServer] Client authenticated: "${dev?.name}" (${auth.deviceId})`);
      } else {
        sessionHub.send(client, 'auth_error', {
          error: 'Authentication failed. Invalid device ID or token. Please re-pair.',
        });
        client.ws.close();
      }
      return;
    }

    // All subsequent operations require authentication
    if (!client.authenticated) {
      sessionHub.send(client, 'auth_error', { error: 'Please authenticate first.' });
      return;
    }

    // 2. Keepalive Ping/Pong
    if (type === 'ping') {
      sessionHub.send(client, 'pong', { time: Date.now() });
      return;
    }

    // 3. User Command Message from Mobile
    if (type === 'user_message') {
      const userMsg = payload as UserMessagePayload;
      await remoteBridge.handleUserMessage(userMsg);
      return;
    }

    // 4. Task Cancel / STOP
    if (type === 'task_cancel') {
      remoteBridge.cancelActiveTask();
      return;
    }

    // 5. User Confirmation Decision (ALLOW / DENY)
    if (type === 'confirmation_decision') {
      const decision = payload as ConfirmationDecisionPayload;
      await remoteBridge.handleConfirmationDecision(decision);
      return;
    }

    // 6. Camera Frame Multimodal Inspection
    if (type === 'vision_camera_frame') {
      const frame = payload as VisionCameraFramePayload;
      const result = await remoteBridge.handleVisionFrame(frame);
      sessionHub.send(client, 'vision_analysis_result', result);
      return;
    }
  }
}

export const gatewayServer = new GatewayServer();
