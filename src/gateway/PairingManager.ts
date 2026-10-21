// =========================================================================
// VISION Gateway — Pairing & Trusted Devices Manager
// =========================================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TrustedDevice, PairingRequest, PairingResponse } from '../shared/remoteProtocol';
import { VISION_CONFIG } from '../shared/config';

interface ActivePairingCode {
  code: string;
  expiresAt: number; // Unix timestamp ms
}

export class PairingManager {
  private activeCode: ActivePairingCode | null = null;
  private trustedDevices: Map<string, TrustedDevice> = new Map();
  private storageFilePath: string;

  constructor(customStoragePath?: string) {
    if (customStoragePath) {
      this.storageFilePath = customStoragePath;
    } else {
      // Store in AppData / user profile directory
      const homeDir = process.env.APPDATA || process.env.USERPROFILE || process.cwd();
      const storageDir = path.join(homeDir, '.vision');
      if (!fs.existsSync(storageDir)) {
        try {
          fs.mkdirSync(storageDir, { recursive: true });
        } catch {}
      }
      this.storageFilePath = path.join(storageDir, 'trusted_devices.json');
    }
    this.loadTrustedDevices();
  }

  /**
   * Load existing trusted devices from disk.
   */
  private loadTrustedDevices(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf8');
        const list: TrustedDevice[] = JSON.parse(raw);
        for (const dev of list) {
          this.trustedDevices.set(dev.id, dev);
        }
        console.log(`[PairingManager] Loaded ${this.trustedDevices.size} trusted devices.`);
      }
    } catch (err) {
      console.warn('[PairingManager] Error loading trusted devices from file:', err);
    }
  }

  /**
   * Save trusted devices to disk.
   */
  private saveTrustedDevices(): void {
    try {
      const list = Array.from(this.trustedDevices.values());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('[PairingManager] Failed to persist trusted devices:', err);
    }
  }

  /**
   * Generate a fresh 6-digit pairing code that expires after 5 minutes.
   */
  public generatePairingCode(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    const code = num.toString();
    this.activeCode = {
      code,
      expiresAt: Date.now() + VISION_CONFIG.GATEWAY.PAIRING_CODE_EXPIRY_MS,
    };
    console.log(`[PairingManager] New Pairing Code Generated: ${code} (Valid for 5 mins)`);
    return code;
  }

  /**
   * Get the current active pairing code if still valid.
   */
  public getActivePairingCode(): { code: string; expiresInSeconds: number } | null {
    if (!this.activeCode) return null;
    const remainingMs = this.activeCode.expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.activeCode = null;
      return null;
    }
    return {
      code: this.activeCode.code,
      expiresInSeconds: Math.round(remainingMs / 1000),
    };
  }

  /**
   * Validate a mobile device pairing request.
   */
  public pairDevice(req: PairingRequest): PairingResponse {
    if (!this.activeCode) {
      return { success: false, error: 'No active pairing code on PC. Generate one in VISION settings.' };
    }

    if (Date.now() > this.activeCode.expiresAt) {
      this.activeCode = null;
      return { success: false, error: 'Pairing code has expired. Please generate a new code.' };
    }

    if (req.pairingCode.trim() !== this.activeCode.code) {
      return { success: false, error: 'Incorrect pairing code. Check the code shown on VISION Desktop.' };
    }

    // Invalidate the code once successfully used
    this.activeCode = null;

    // Issue unique bearer token
    const token = `vrt_${crypto.randomBytes(24).toString('hex')}`;
    const device: TrustedDevice = {
      id: req.deviceId,
      name: req.deviceName || 'Remote Device',
      platform: req.platform || 'android',
      pairedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      authToken: token,
    };

    this.trustedDevices.set(device.id, device);
    this.saveTrustedDevices();

    console.log(`[PairingManager] Successfully paired device: "${device.name}" (${device.id})`);
    return {
      success: true,
      authToken: token,
      systemName: VISION_CONFIG.GATEWAY.SYSTEM_NAME,
      protocolVersion: VISION_CONFIG.GATEWAY.VERSION,
    };
  }

  /**
   * Verify whether a given device and auth token are trusted.
   */
  public verifyDevice(deviceId: string, authToken: string): boolean {
    const device = this.trustedDevices.get(deviceId);
    if (!device) return false;
    if (device.authToken !== authToken) return false;

    // Update last seen
    device.lastSeenAt = new Date().toISOString();
    return true;
  }

  /**
   * Revoke/remove a trusted device.
   */
  public revokeDevice(deviceId: string): boolean {
    const removed = this.trustedDevices.delete(deviceId);
    if (removed) {
      this.saveTrustedDevices();
    }
    return removed;
  }

  /**
   * List all trusted devices.
   */
  public listDevices(): TrustedDevice[] {
    return Array.from(this.trustedDevices.values());
  }
}

export const pairingManager = new PairingManager();
