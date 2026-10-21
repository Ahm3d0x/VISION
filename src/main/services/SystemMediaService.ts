import { execFile, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

export interface VolumeResult {
  success: boolean;
  volume?: number;
  muted?: boolean;
  error?: string;
}

export interface MediaResult {
  success: boolean;
  key?: string;
  error?: string;
}

export class SystemMediaService {
  private scriptPath: string;

  constructor() {
    // Resolve helper script path in dev and packaged modes
    const candidatePaths = [
      path.join(__dirname, 'services', 'systemMediaHelper.ps1'),
      path.join(__dirname, 'systemMediaHelper.ps1'),
      path.join(process.cwd(), 'src', 'main', 'services', 'systemMediaHelper.ps1'),
      path.join(process.resourcesPath || '', 'systemMediaHelper.ps1'),
    ];

    this.scriptPath = candidatePaths.find(p => fs.existsSync(p)) || candidatePaths[0];
  }

  private getScriptPath(): string {
    if (fs.existsSync(this.scriptPath)) {
      return this.scriptPath;
    }
    const candidatePaths = [
      path.join(__dirname, 'services', 'systemMediaHelper.ps1'),
      path.join(__dirname, 'systemMediaHelper.ps1'),
      path.join(process.cwd(), 'src', 'main', 'services', 'systemMediaHelper.ps1'),
      path.join(process.resourcesPath || '', 'systemMediaHelper.ps1'),
    ];
    const found = candidatePaths.find(p => fs.existsSync(p));
    if (found) {
      this.scriptPath = found;
      return found;
    }
    return this.scriptPath;
  }

  /**
   * Control media playback (play_pause, next, previous, stop)
   */
  async mediaControl(action: 'play_pause' | 'next' | 'previous' | 'stop'): Promise<MediaResult> {
    try {
      const script = this.getScriptPath();
      if (fs.existsSync(script)) {
        const { stdout } = await execFileAsync('powershell.exe', [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          script,
          '-Action',
          'media',
          '-Key',
          action,
        ]);
        const parsed = JSON.parse(stdout.trim());
        return parsed;
      }

      // Fallback: direct keybd_event
      const vkMap: Record<string, number> = {
        play_pause: 0xB3,
        next: 0xB0,
        previous: 0xB1,
        stop: 0xB2,
      };
      const vk = vkMap[action] || 0xB3;
      const cmd = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);' -Name NativeKeys -Namespace Win32Media; [Win32Media.NativeKeys]::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero); [Win32Media.NativeKeys]::keybd_event(${vk}, 0, 2, [UIntPtr]::Zero);`;
      const b64 = Buffer.from(cmd, 'utf16le').toString('base64');
      await execAsync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`);
      return { success: true, key: action };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Precise volume control & queries
   */
  async volumeControl(options: {
    action: 'get' | 'set' | 'mute' | 'unmute' | 'step_up' | 'step_down';
    level?: number;
    step?: number;
  }): Promise<VolumeResult> {
    try {
      const script = this.getScriptPath();
      const args = [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        script,
        '-Action',
        options.action,
      ];

      if (options.action === 'set' && typeof options.level === 'number') {
        args.push('-Level', options.level.toString());
      }
      if ((options.action === 'step_up' || options.action === 'step_down') && typeof options.step === 'number') {
        args.push('-Step', options.step.toString());
      }

      const { stdout } = await execFileAsync('powershell.exe', args);
      const parsed = JSON.parse(stdout.trim());
      return parsed;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const systemMediaService = new SystemMediaService();
