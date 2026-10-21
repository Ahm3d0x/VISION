// =========================================================================
// VISION Gateway — Local Area Network (LAN) UDP Discovery Service
// =========================================================================

import dgram from 'dgram';
import os from 'os';
import { VISION_CONFIG } from '../shared/config';
import { gatewayServer } from './GatewayServer';

export class DiscoveryService {
  private socket: dgram.Socket | null = null;
  private beaconTimer: NodeJS.Timeout | null = null;
  private port: number = VISION_CONFIG.GATEWAY.DISCOVERY_PORT;

  /**
   * Start listening for mobile discovery pings and broadcast beacons.
   */
  public start(): void {
    if (this.socket) return;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        console.warn('[DiscoveryService] UDP Socket error:', err.message);
      });

      this.socket.on('message', (msg, rinfo) => {
        const text = msg.toString().trim();
        if (text === 'VISION_DISCOVERY_PING' || text.startsWith('VISION_SEARCH')) {
          this.sendDiscoveryResponse(rinfo.address, rinfo.port);
        }
      });

      this.socket.bind(this.port, () => {
        try {
          this.socket?.setBroadcast(true);
        } catch {}
        console.log(`[DiscoveryService] UDP Discovery broadcaster listening on port ${this.port}.`);
      });

      // Periodically broadcast beacon every 4 seconds so mobile apps discover immediately
      this.beaconTimer = setInterval(() => {
        this.broadcastBeacon();
      }, 4000);
    } catch (err) {
      console.warn('[DiscoveryService] Failed to initialize UDP discovery broadcaster:', err);
    }
  }

  /**
   * Send response to a specific querying mobile client.
   */
  private sendDiscoveryResponse(targetIp: string, targetPort: number): void {
    if (!this.socket) return;

    const payload = JSON.stringify({
      service: 'VISION_PERSONAL_AI_OS',
      hostname: os.hostname(),
      systemName: VISION_CONFIG.GATEWAY.SYSTEM_NAME,
      version: VISION_CONFIG.GATEWAY.VERSION,
      ip: gatewayServer.getLocalIpAddress(),
      port: VISION_CONFIG.GATEWAY.PORT,
      wsUrl: `ws://${gatewayServer.getLocalIpAddress()}:${VISION_CONFIG.GATEWAY.PORT}/ws`,
    });

    const buffer = Buffer.from(payload);
    this.socket.send(buffer, 0, buffer.length, targetPort, targetIp, (err) => {
      if (err) {
        console.warn(`[DiscoveryService] Failed to send unicast response to ${targetIp}:`, err.message);
      }
    });
  }

  /**
   * Broadcast presence to local network broadcast address (255.255.255.255).
   */
  private broadcastBeacon(): void {
    if (!this.socket) return;

    const payload = JSON.stringify({
      type: 'VISION_BEACON',
      hostname: os.hostname(),
      systemName: VISION_CONFIG.GATEWAY.SYSTEM_NAME,
      version: VISION_CONFIG.GATEWAY.VERSION,
      ip: gatewayServer.getLocalIpAddress(),
      port: VISION_CONFIG.GATEWAY.PORT,
    });

    const buffer = Buffer.from(payload);
    this.socket.send(buffer, 0, buffer.length, this.port, '255.255.255.255', () => {
      // Broadcast dispatched
    });
  }

  /**
   * Stop the discovery service.
   */
  public stop(): void {
    if (this.beaconTimer) {
      clearInterval(this.beaconTimer);
      this.beaconTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
  }
}

export const discoveryService = new DiscoveryService();
