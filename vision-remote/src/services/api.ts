// =========================================================================
// VISION Remote — Gateway REST API Client
// =========================================================================

import { PairingRequest, PairingResponse, DiscoveredSystem, DesktopStatusPayload } from '../types/protocol';

export class GatewayApiClient {
  private baseUrl: string;

  constructor(host: string = '192.168.1.9', port: number = 8767) {
    this.baseUrl = `http://${host}:${port}`;
  }

  public setHost(host: string, port: number = 8767): void {
    this.baseUrl = `http://${host}:${port}`;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Ping /api/discovery to check if VISION host is reachable.
   */
  public async discover(host?: string, port: number = 8767): Promise<DiscoveredSystem | null> {
    const targetUrl = host ? `http://${host}:${port}` : this.baseUrl;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${targetUrl}/api/discovery`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          systemName: data.systemName || 'VISION-PC',
          hostname: data.hostname || 'EnG',
          ip: data.ip || host || '127.0.0.1',
          port: data.port || port,
          wsUrl: data.wsUrl || `ws://${host || '127.0.0.1'}:${port}/ws`,
          lastSeen: Date.now(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Pair mobile with VISION Desktop using 6-digit PIN.
   */
  public async pair(req: PairingRequest): Promise<PairingResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: `Could not reach VISION on ${this.baseUrl}. Check Wi-Fi connection.`,
      };
    }
  }

  /**
   * Fetch current hardware telemetry and active task state.
   */
  public async getStatus(deviceId: string, authToken: string): Promise<DesktopStatusPayload | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/status`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'X-Device-Id': deviceId,
        },
      });

      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Emergency Task Cancel / STOP.
   */
  public async cancelTask(deviceId: string, authToken: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'X-Device-Id': deviceId,
        },
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  }
}

export const api = new GatewayApiClient();
