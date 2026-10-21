// =========================================================================
// VISION Gateway — Session Hub & Client Multiplexer
// =========================================================================

import { WebSocket } from 'ws';
import { RemoteMessage, RemoteMessageType, REMOTE_PROTOCOL_VERSION } from '../shared/remoteProtocol';

export interface ConnectedClient {
  ws: WebSocket;
  deviceId?: string;
  deviceName?: string;
  authenticated: boolean;
  connectedAt: number;
  lastPing: number;
}

export class SessionHub {
  private clients: Set<ConnectedClient> = new Set();

  /**
   * Register a new raw WebSocket connection.
   */
  public addClient(ws: WebSocket): ConnectedClient {
    const client: ConnectedClient = {
      ws,
      authenticated: false,
      connectedAt: Date.now(),
      lastPing: Date.now(),
    };
    this.clients.add(client);
    return client;
  }

  /**
   * Remove a disconnected client.
   */
  public removeClient(client: ConnectedClient): void {
    this.clients.delete(client);
  }

  /**
   * Mark a connected client as authenticated.
   */
  public authenticateClient(client: ConnectedClient, deviceId: string, deviceName: string): void {
    client.authenticated = true;
    client.deviceId = deviceId;
    client.deviceName = deviceName;
  }

  /**
   * Send a typed message to a specific client.
   */
  public send<T>(client: ConnectedClient, type: RemoteMessageType, payload: T): void {
    if (client.ws.readyState !== WebSocket.OPEN) return;

    const message: RemoteMessage<T> = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type,
      payload,
    };

    try {
      client.ws.send(JSON.stringify(message));
    } catch (err) {
      console.warn('[SessionHub] Failed to send message to client:', err);
    }
  }

  /**
   * Broadcast an event to all authenticated connected mobile clients.
   */
  public broadcast<T>(type: RemoteMessageType, payload: T): void {
    const message: RemoteMessage<T> = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      version: REMOTE_PROTOCOL_VERSION,
      timestamp: new Date().toISOString(),
      type,
      payload,
    };

    const serialized = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.authenticated && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(serialized);
        } catch (err) {
          console.warn(`[SessionHub] Broadcast error to ${client.deviceName || 'client'}:`, err);
        }
      }
    }
  }

  /**
   * Count active authenticated clients.
   */
  public getAuthenticatedCount(): number {
    let count = 0;
    for (const client of this.clients) {
      if (client.authenticated) count++;
    }
    return count;
  }

  /**
   * Get list of currently connected devices.
   */
  public getConnectedDevices(): Array<{ deviceId: string; deviceName: string; connectedAt: string }> {
    const res: Array<{ deviceId: string; deviceName: string; connectedAt: string }> = [];
    for (const client of this.clients) {
      if (client.authenticated && client.deviceId) {
        res.push({
          deviceId: client.deviceId,
          deviceName: client.deviceName || 'Remote Device',
          connectedAt: new Date(client.connectedAt).toISOString(),
        });
      }
    }
    return res;
  }
}

export const sessionHub = new SessionHub();
