// =========================================================================
// VISION Remote — Local Network Discovery Service
// =========================================================================

import { api } from './api';
import { storageService } from './storage';
import { DiscoveredSystem } from '../types/protocol';

export class DiscoveryService {
  private isScanning: boolean = false;

  /**
   * Probe the last known host or a specified host.
   */
  public async probeHost(host: string, port: number = 8767): Promise<DiscoveredSystem | null> {
    return await api.discover(host, port);
  }

  /**
   * Quick scan of local subnet for active VISION Gateway.
   */
  public async scanLocalNetwork(
    onFound: (system: DiscoveredSystem) => void,
    onProgress?: (percent: number) => void
  ): Promise<DiscoveredSystem[]> {
    if (this.isScanning) return [];
    this.isScanning = true;

    const foundSystems: DiscoveredSystem[] = [];

    // 1. First probe the last known IP
    const lastHost = await storageService.getLastHost();
    const lastPort = await storageService.getLastPort();
    const quickHit = await this.probeHost(lastHost, lastPort);
    if (quickHit) {
      foundSystems.push(quickHit);
      onFound(quickHit);
      this.isScanning = false;
      return foundSystems;
    }

    // 2. Scan likely subnet IPs based on last host prefix
    const ipParts = lastHost.split('.');
    const subnetPrefix = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}` : '192.168.1';

    // Prioritized list of IP hosts (common desktop IPs)
    const candidateHosts = [
      lastHost,
      `${subnetPrefix}.9`,
      `${subnetPrefix}.20`,
      `${subnetPrefix}.15`,
      `${subnetPrefix}.2`,
      `${subnetPrefix}.3`,
      `${subnetPrefix}.5`,
      `${subnetPrefix}.100`,
      `${subnetPrefix}.10`,
      '127.0.0.1',
    ];

    const uniqueCandidates = Array.from(new Set(candidateHosts));
    let tested = 0;

    const promises = uniqueCandidates.map(async (host) => {
      const result = await this.probeHost(host, 8767);
      tested++;
      if (onProgress) onProgress(Math.round((tested / uniqueCandidates.length) * 100));

      if (result) {
        foundSystems.push(result);
        onFound(result);
      }
    });

    await Promise.all(promises);
    this.isScanning = false;
    return foundSystems;
  }
}

export const discoveryService = new DiscoveryService();
