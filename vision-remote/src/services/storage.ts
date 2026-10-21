// =========================================================================
// VISION Remote — Local Storage Service
// =========================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: 'vision_remote_auth_token',
  DEVICE_ID: 'vision_remote_device_id',
  DEVICE_NAME: 'vision_remote_device_name',
  LAST_HOST: 'vision_remote_last_host',
  LAST_PORT: 'vision_remote_last_port',
  SYSTEM_NAME: 'vision_remote_system_name',
};

export const storageService = {
  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    } catch {
      return null;
    }
  },

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    } catch {}
  },

  async getDeviceId(): Promise<string> {
    try {
      let id = await AsyncStorage.getItem(KEYS.DEVICE_ID);
      if (!id) {
        id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await AsyncStorage.setItem(KEYS.DEVICE_ID, id);
      }
      return id;
    } catch {
      return `device_${Date.now()}`;
    }
  },

  async getDeviceName(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(KEYS.DEVICE_NAME)) || "Ahmed's Phone";
    } catch {
      return "Ahmed's Phone";
    }
  },

  async setDeviceName(name: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.DEVICE_NAME, name);
    } catch {}
  },

  async getLastHost(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(KEYS.LAST_HOST)) || '192.168.1.9';
    } catch {
      return '192.168.1.9';
    }
  },

  async setLastHost(host: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_HOST, host);
    } catch {}
  },

  async getLastPort(): Promise<number> {
    try {
      const port = await AsyncStorage.getItem(KEYS.LAST_PORT);
      return port ? parseInt(port, 10) : 8767;
    } catch {
      return 8767;
    }
  },

  async setLastPort(port: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_PORT, port.toString());
    } catch {}
  },

  async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
    } catch {}
  },
};
