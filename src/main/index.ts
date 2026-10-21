import { app, BrowserWindow, ipcMain, screen, desktopCapturer, shell, Menu, globalShortcut, Tray, nativeImage, clipboard, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, exec, execFile, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { SystemTelemetry } from '../shared/types';
import { VISION_CONFIG } from '../shared/config';
import { commandExecutor } from './execution/CommandExecutor';
import { safeReadFile, safeWriteFile, safeEditFile, safeSearchFiles, safeTrashFile } from './services/SafeFilesystemService';
import { systemMediaService } from './services/SystemMediaService';
import { documentService } from './services/DocumentService';
import { parseVcfContent, normalizePhoneNumber } from '../shared/vcfParser';
import { gatewayServer, pairingManager, sessionHub, remoteBridge, discoveryService } from '../gateway';

import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optimize GPU rendering and suppress dev cache notices
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let sttProcess: ChildProcess | null = null;
let ttsProcess: ChildProcess | null = null;

let isAppQuitting = false;

app.on('before-quit', () => {
  isAppQuitting = true;
});

function startSttService(): void {
  // Check if ASR server is already running on port 8765
  const req = http.get(VISION_CONFIG.ASR.HEALTH_URL, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Main] VISION ASR service is already online on port ${VISION_CONFIG.ASR.PORT}.`);
      return;
    }
    spawnASRProcess();
  });

  req.on('error', () => {
    spawnASRProcess();
  });
}

function spawnASRProcess(): void {
  try {
    const projectRoot = path.resolve(__dirname, '../../');
    const venvPythonE = 'E:\\VISION\\.venv\\Scripts\\python.exe';
    const venvPythonLocal = path.join(projectRoot, '.venv\\Scripts\\python.exe');
    
    let pythonExe = process.env.ASR_PYTHON || 'python';
    if (fs.existsSync(venvPythonE)) {
      pythonExe = venvPythonE;
    } else if (fs.existsSync(venvPythonLocal)) {
      pythonExe = venvPythonLocal;
    }

    const scriptPath = path.join(projectRoot, 'services/asr_server.py');

    console.log(`[Main] Spawning VISION ASR service using: ${pythonExe} -> ${scriptPath}`);
    sttProcess = spawn(pythonExe, [scriptPath], {
      cwd: projectRoot,
      stdio: 'pipe',
      detached: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        HF_HOME: process.env.HF_HOME || 'E:\\VISION\\hf_cache',
        HF_HUB_CACHE: process.env.HF_HUB_CACHE || 'E:\\VISION\\hf_cache\\hub',
      },
    });

    sttProcess.stdout?.on('data', (d) => {
      console.log(`[STT Service] ${d.toString().trim()}`);
    });
    sttProcess.stderr?.on('data', (d) => {
      console.warn(`[STT Service Warn] ${d.toString().trim()}`);
    });

    sttProcess.on('exit', (code, signal) => {
      console.warn(`[Main] ASR Service exited (code: ${code}, signal: ${signal}).`);
      sttProcess = null;
      // Auto-restart if application is still running
      if (!isAppQuitting) {
        setTimeout(() => {
          startSttService();
        }, 2000);
      }
    });
  } catch (err) {
    console.warn('[Main] Could not spawn Python STT service:', err);
  }
}

function startTtsService(): void {
  // Check if TTS server is already running on port 8766
  const req = http.get(VISION_CONFIG.TTS.HEALTH_URL, (res) => {
    if (res.statusCode === 200) {
      console.log(`[Main] VISION TTS service is already online on port ${VISION_CONFIG.TTS.PORT}.`);
      return;
    }
    spawnTTSProcess();
  });

  req.on('error', () => {
    spawnTTSProcess();
  });
}

function spawnTTSProcess(): void {
  try {
    const projectRoot = path.resolve(__dirname, '../../');
    const venvPythonE = 'E:\\VISION\\tts_venv\\Scripts\\python.exe';
    const venvPythonLocal = path.join(projectRoot, 'tts_venv\\Scripts\\python.exe');
    
    let pythonExe = process.env.TTS_PYTHON || 'python';
    if (fs.existsSync(venvPythonE)) {
      pythonExe = venvPythonE;
    } else if (fs.existsSync(venvPythonLocal)) {
      pythonExe = venvPythonLocal;
    }

    const scriptPath = path.join(projectRoot, 'services/tts_server.py');

    console.log(`[Main] Spawning VISION TTS service using: ${pythonExe} -> ${scriptPath}`);
    ttsProcess = spawn(pythonExe, [scriptPath], {
      cwd: projectRoot,
      stdio: 'pipe',
      detached: false,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        HF_HOME: process.env.HF_HOME || 'E:\\VISION\\hf_cache',
        HF_HUB_CACHE: process.env.HF_HUB_CACHE || 'E:\\VISION\\hf_cache\\hub',
      },
    });

    ttsProcess.stdout?.on('data', (d) => {
      console.log(`[TTS Service] ${d.toString().trim()}`);
    });
    ttsProcess.stderr?.on('data', (d) => {
      console.warn(`[TTS Service Warn] ${d.toString().trim()}`);
    });

    ttsProcess.on('exit', (code, signal) => {
      console.warn(`[Main] TTS Service exited (code: ${code}, signal: ${signal}).`);
      ttsProcess = null;
      // Auto-restart if application is still running
      if (!isAppQuitting) {
        setTimeout(() => {
          startTtsService();
        }, 2000);
      }
    });
  } catch (err) {
    console.warn('[Main] Could not spawn Python TTS service:', err);
  }
}

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const winWidth = Math.min(1360, Math.floor(width * 0.9));
  const winHeight = Math.min(880, Math.floor(height * 0.9));

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#070A0F',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false, // Ensures audio VAD, timers, and agent run full-speed in background
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Native Context Menu for text copy, select all, and paste
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const hasSelection = Boolean(params.selectionText && params.selectionText.trim().length > 0);
    const menu = Menu.buildFromTemplate([
      {
        role: 'copy',
        label: 'نسخ (Copy)',
        enabled: hasSelection,
      },
      {
        role: 'selectAll',
        label: 'تحديد الكل (Select All)',
      },
      { type: 'separator' },
      {
        role: 'paste',
        label: 'لصق (Paste)',
        enabled: params.isEditable,
      },
    ]);
    menu.popup();
  });

  // Background Mode: Minimize to tray when closed unless explicitly quitting
  mainWindow.on('close', (event) => {
    if (!isAppQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// System Tray Manager
function createTray(): void {
  const trayIconData =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWklEQVR42mNkQAO/gZgBiY8v/A/E/6FsZDCcDJAFf9EVP0bnI8vjczg29VjM+P//P8NfJPn/n0D8nxzD/0P5WDA2x2EZj83hkAAm/h+bFzD5Ad19yI7B5k50t8DF0fUjM5gqBgIAaB577G1N0rMAAAAASUVORK5CYII=';
  const icon = nativeImage.createFromDataURL(trayIconData);

  tray = new Tray(icon);
  tray.setToolTip('VISION — Personal AI OS (Running in Background)');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'إظهار الواجهة (Show VISION Window)',
      click: () => {
        if (mainWindow?.isMinimized()) mainWindow.restore();
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: 'إخفاء في الخلفية (Hide to Background)',
      click: () => {
        mainWindow?.hide();
      },
    },
    { type: 'separator' },
    {
      label: '🎙️ تشغيل الاستماع فوراً (Ctrl+Alt+Space)',
      click: () => {
        if (mainWindow?.isMinimized()) mainWindow.restore();
        mainWindow?.show();
        mainWindow?.focus();
        mainWindow?.webContents.send('system:event', { type: 'WAKE_AND_LISTEN' });
      },
    },
    {
      label: '🛑 إيقاف فوري وشامل (Ctrl+Alt+S)',
      click: () => {
        mainWindow?.webContents.send('system:event', { type: 'EMERGENCY_STOP' });
      },
    },
    { type: 'separator' },
    {
      label: '⏻ إغلاق وفصل VISION نهائياً (Ctrl+Alt+Q)',
      click: () => {
        isAppQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      if (mainWindow?.isMinimized()) mainWindow.restore();
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
}

// IPC Window Controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window:close', () => {
  mainWindow?.hide();
});

ipcMain.handle('window:hide', () => {
  mainWindow?.hide();
});

ipcMain.handle('window:show', () => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show();
  mainWindow?.focus();
});

ipcMain.handle('window:quit', () => {
  isAppQuitting = true;
  app.quit();
});

// Cached GPU Telemetry (NVIDIA GeForce RTX 3060)
let cachedGpuStats: {
  gpuName: string;
  gpuUsage: number;
  vramUsageMb: number;
  totalVramMb: number;
  gpuTemp: number;
  gpuPowerWatts: number;
  gpuPowerLimitWatts: number;
  timestamp: number;
} | null = null;

async function getGpuTelemetry(): Promise<{
  gpuName?: string;
  gpuUsage?: number;
  vramUsageMb?: number;
  totalVramMb?: number;
  gpuTemp?: number;
  gpuPowerWatts?: number;
  gpuPowerLimitWatts?: number;
}> {
  const now = Date.now();
  if (cachedGpuStats && now - cachedGpuStats.timestamp < 1500) {
    return {
      gpuName: cachedGpuStats.gpuName,
      gpuUsage: cachedGpuStats.gpuUsage,
      vramUsageMb: cachedGpuStats.vramUsageMb,
      totalVramMb: cachedGpuStats.totalVramMb,
      gpuTemp: cachedGpuStats.gpuTemp,
      gpuPowerWatts: cachedGpuStats.gpuPowerWatts,
      gpuPowerLimitWatts: cachedGpuStats.gpuPowerLimitWatts,
    };
  }

  return new Promise((resolve) => {
    execFile(
      'nvidia-smi',
      [
        '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,power.limit',
        '--format=csv,noheader,nounits',
      ],
      { timeout: 1200 },
      (error, stdout) => {
        if (error || !stdout) {
          return resolve(
            cachedGpuStats
              ? {
                  gpuName: cachedGpuStats.gpuName,
                  gpuUsage: cachedGpuStats.gpuUsage,
                  vramUsageMb: cachedGpuStats.vramUsageMb,
                  totalVramMb: cachedGpuStats.totalVramMb,
                  gpuTemp: cachedGpuStats.gpuTemp,
                  gpuPowerWatts: cachedGpuStats.gpuPowerWatts,
                  gpuPowerLimitWatts: cachedGpuStats.gpuPowerLimitWatts,
                }
              : {
                  gpuName: 'NVIDIA GeForce RTX 3060',
                  gpuUsage: 0,
                  vramUsageMb: 0,
                  totalVramMb: 12288,
                  gpuTemp: 0,
                  gpuPowerWatts: 0,
                  gpuPowerLimitWatts: 170,
                }
          );
        }

        try {
          const parts = stdout.trim().split(',').map((p) => p.trim());
          if (parts.length >= 5) {
            const parsed = {
              gpuName: parts[0] || 'NVIDIA GeForce RTX 3060',
              gpuUsage: parseInt(parts[1], 10) || 0,
              vramUsageMb: parseInt(parts[2], 10) || 0,
              totalVramMb: parseInt(parts[3], 10) || 12288,
              gpuTemp: parseInt(parts[4], 10) || 0,
              gpuPowerWatts: Math.round((parseFloat(parts[5]) || 0) * 10) / 10,
              gpuPowerLimitWatts: Math.round(parseFloat(parts[6]) || 170),
              timestamp: now,
            };
            cachedGpuStats = parsed;
            return resolve(parsed);
          }
        } catch {
          // parse fallback
        }

        resolve(cachedGpuStats || {
          gpuName: 'NVIDIA GeForce RTX 3060',
          gpuUsage: 0,
          vramUsageMb: 0,
          totalVramMb: 12288,
          gpuTemp: 0,
          gpuPowerWatts: 0,
          gpuPowerLimitWatts: 170,
        });
      }
    );
  });
}

// 1. Real Hardware CPU Sampling (os.cpus deltas across cores)
function getCpuTimesSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

let lastCpuSnapshot = getCpuTimesSnapshot();
let measuredCpuPercent = 0;

function sampleCpuUsage(): number {
  const nextSnapshot = getCpuTimesSnapshot();
  const idleDelta = nextSnapshot.idle - lastCpuSnapshot.idle;
  const totalDelta = nextSnapshot.total - lastCpuSnapshot.total;
  if (totalDelta > 0) {
    measuredCpuPercent = Math.max(0, Math.min(100, Math.round(100 - (idleDelta / totalDelta) * 100)));
  }
  lastCpuSnapshot = nextSnapshot;
  return measuredCpuPercent;
}

setInterval(sampleCpuUsage, 1000);

// 2. Real Hardware Network Throughput Sampling (Windows netstat -e)
let lastNetBytes: { rx: number; tx: number; time: number } | null = null;
let liveNetworkRates = { uploadMbps: 0, downloadMbps: 0 };

function sampleNetworkThroughput(): void {
  execFile('netstat', ['-e'], { timeout: 800 }, (error, stdout) => {
    if (error || !stdout) return;
    const match = stdout.match(/Bytes\s+(\d+)\s+(\d+)/);
    if (!match) return;
    const rx = parseInt(match[1], 10);
    const tx = parseInt(match[2], 10);
    const now = Date.now();
    if (lastNetBytes) {
      const dt = (now - lastNetBytes.time) / 1000;
      if (dt > 0.4) {
        const rxBps = (rx - lastNetBytes.rx) / dt;
        const txBps = (tx - lastNetBytes.tx) / dt;
        liveNetworkRates = {
          downloadMbps: Math.max(0, Math.round(((rxBps * 8) / 1000000) * 10) / 10),
          uploadMbps: Math.max(0, Math.round(((txBps * 8) / 1000000) * 10) / 10),
        };
      }
    }
    lastNetBytes = { rx, tx, time: now };
  });
}

setInterval(sampleNetworkThroughput, 1500);
sampleNetworkThroughput();

// Unified System & Hardware Telemetry Collector
async function collectSystemTelemetry(): Promise<SystemTelemetry> {
  const totalMem = os.totalmem() / (1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024);
  const usedMem = totalMem - freeMem;

  // Real, physically measured hardware CPU percentage
  const cpuLoad = measuredCpuPercent;
  const gpuStats = await getGpuTelemetry();

  // Estimated system power: GPU live watts + CPU active watts (i7-14700F 25W idle to ~145W) + Motherboard/DRAM/Fans (~35W)
  const cpuEstimatedWatts = Math.round(25 + (cpuLoad / 100) * 120);
  const totalSystemWatts = Math.round((gpuStats.gpuPowerWatts || 23.3) + cpuEstimatedWatts + 35);

  return {
    cpuUsage: cpuLoad,
    memoryUsageMb: Math.round(usedMem),
    totalMemoryMb: Math.round(totalMem),
    activeToolsCount: 17,
    micStatus: 'READY',
    visionStatus: 'READY',
    uptimeSeconds: Math.floor(process.uptime()),
    gpuName: gpuStats.gpuName || 'NVIDIA GeForce RTX 3060',
    gpuUsage: gpuStats.gpuUsage ?? 0,
    vramUsageMb: gpuStats.vramUsageMb ?? 0,
    totalVramMb: gpuStats.totalVramMb ?? 12288,
    gpuTemp: gpuStats.gpuTemp ?? 0,
    gpuPowerWatts: gpuStats.gpuPowerWatts ?? 23.3,
    gpuPowerLimitWatts: gpuStats.gpuPowerLimitWatts ?? 170,
    totalSystemPowerWatts: totalSystemWatts,
    networkUploadMbps: liveNetworkRates.uploadMbps,
    networkDownloadMbps: liveNetworkRates.downloadMbps,
  };
}

// IPC Telemetry
ipcMain.handle('system:get-telemetry', async (): Promise<SystemTelemetry> => {
  return collectSystemTelemetry();
});

// Multi-Monitor Aware Screenshot Tool
ipcMain.handle('system:take-screenshot', async (_event, options?: { screenIndex?: number }) => {
  try {
    const allDisplays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();
    const maxDim = Math.max(primaryDisplay.size.width, 1920);

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxDim, height: Math.round(maxDim * 0.5625) },
    });

    if (sources.length === 0) {
      throw new Error('No screen display sources available');
    }

    let targetIndex = 0;
    if (typeof options?.screenIndex === 'number') {
      targetIndex = options.screenIndex;
    }

    if (targetIndex < 0 || targetIndex >= sources.length) {
      targetIndex = sources.length - 1;
    }

    const selectedSource = sources[targetIndex] || sources[0];
    const image = selectedSource.thumbnail;
    const dataUrl = image.toDataURL();
    const displayInfo = allDisplays[targetIndex] || allDisplays[0];

    const screenshotsDir = path.join(app.getPath('userData'), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    const fileName = `vision_display_${targetIndex + 1}_${Date.now()}.png`;
    const filePath = path.join(screenshotsDir, fileName);
    fs.writeFileSync(filePath, image.toPNG());

    console.log(`[Main] Screenshot captured for Screen ${targetIndex + 1} (${selectedSource.name}) -> ${filePath}`);

    return {
      success: true,
      dataUrl,
      filePath,
      screenName: selectedSource.name || `Display ${targetIndex + 1}`,
      screenIndex: targetIndex + 1,
      totalScreens: sources.length,
      width: displayInfo?.size?.width || 1920,
      height: displayInfo?.size?.height || 1080,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[Main] Screenshot Error:', err);
    return { success: false, error: err.message };
  }
});

// ==========================================
// 3.1 APPLICATION CONTROL ENGINE
// ==========================================

// Browser executable locator
function getBrowserExecutable(): string | null {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

interface ResolvedApp {
  isUrl?: boolean;
  target: string;
  args?: string[];
  displayName: string;
}

function resolveAppToLaunch(appName: string, userArgs?: string[]): ResolvedApp {
  const raw = appName.toLowerCase().trim();

  // 1. Direct Web Services / URLs
  if (raw === 'youtube' || raw.includes('يوتيوب')) {
    return { isUrl: true, target: 'https://www.youtube.com', displayName: 'YouTube' };
  }
  if (raw === 'google' || raw.includes('جوجل')) {
    return { isUrl: true, target: 'https://www.google.com', displayName: 'Google' };
  }
  if (raw === 'facebook' || raw.includes('فيسبوك')) {
    return { isUrl: true, target: 'https://www.facebook.com', displayName: 'Facebook' };
  }
  if (raw === 'chatgpt' || raw.includes('شات جي بي تي')) {
    return { isUrl: true, target: 'https://chatgpt.com', displayName: 'ChatGPT' };
  }
  if (raw.includes('whatsapp') || raw.includes('واتساب')) {
    const isExplicitWeb = raw.includes('web') || raw.includes('ويب') || raw.includes('متصفح') || raw.includes('browser');
    if (isExplicitWeb) {
      return { isUrl: true, target: 'https://web.whatsapp.com', displayName: 'WhatsApp Web' };
    }
    return {
      isUrl: true,
      target: 'whatsapp:',
      fallbackUrl: 'https://web.whatsapp.com',
      displayName: 'WhatsApp Desktop',
    } as any;
  }
  if (raw.includes('telegram') || raw.includes('تيليجرام') || raw.includes('تلجرام')) {
    if (raw.includes('web') || raw.includes('ويب')) {
      return { isUrl: true, target: 'https://web.telegram.org', displayName: 'Telegram Web' };
    }
    return { isUrl: true, target: 'tg:', fallbackUrl: 'https://web.telegram.org', displayName: 'Telegram Desktop' } as any;
  }
  if (raw === 'github' || raw.includes('جيت هب')) {
    return { isUrl: true, target: 'https://github.com', displayName: 'GitHub' };
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return { isUrl: true, target: raw, displayName: raw };
  }

  // 2. Browsers (Edge, Chrome, general browser)
  if (['browser', 'المتصفح', 'متصفح', 'edge', 'msedge'].includes(raw)) {
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const foundEdge = edgePaths.find((p) => fs.existsSync(p));
    if (foundEdge) {
      return { target: foundEdge, args: userArgs || ['https://www.google.com'], displayName: 'Microsoft Edge' };
    }
    return { isUrl: true, target: 'https://www.google.com', displayName: 'Browser' };
  }

  if (['chrome', 'كروم', 'google chrome'].includes(raw)) {
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    ];
    const foundChrome = chromePaths.find((p) => fs.existsSync(p));
    if (foundChrome) {
      return { target: foundChrome, args: userArgs || ['https://www.google.com'], displayName: 'Google Chrome' };
    }
    return { isUrl: true, target: 'https://www.google.com', displayName: 'Google Chrome' };
  }

  // 3. VS Code
  if (['vscode', 'code', 'فيجوال ستوديو كود', 'كود'].includes(raw)) {
    const codeCandidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Programs\\Microsoft VS Code\\Code.exe'),
      'C:\\Program Files\\Microsoft VS Code\\Code.exe',
      'code',
    ];
    const foundCode = codeCandidates.find((p) => p === 'code' || fs.existsSync(p)) || 'code';
    return { target: foundCode, args: userArgs, displayName: 'Visual Studio Code' };
  }

  // 4. Spotify
  if (['spotify', 'سبوتيفاي'].includes(raw)) {
    const spotifyPath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\WindowsApps\\Spotify.exe');
    return { target: fs.existsSync(spotifyPath) ? spotifyPath : 'spotify', args: userArgs, displayName: 'Spotify' };
  }

  // 5. Notepad
  if (['notepad', 'المفكرة', 'النوت باد'].includes(raw)) {
    return { target: 'notepad.exe', args: userArgs, displayName: 'Notepad' };
  }

  // 6. Calculator
  if (['calc', 'calculator', 'الحاسبة', 'الالة الحاسبة'].includes(raw)) {
    return { target: 'calc.exe', args: userArgs, displayName: 'Calculator' };
  }

  // 7. Terminal
  if (['terminal', 'wt', 'التيرمينال'].includes(raw)) {
    return { target: 'wt.exe', args: userArgs, displayName: 'Windows Terminal' };
  }
  if (['powershell', 'باور شيل'].includes(raw)) {
    return { target: 'powershell.exe', args: userArgs, displayName: 'PowerShell' };
  }
  if (['cmd', 'الاوامر'].includes(raw)) {
    return { target: 'cmd.exe', args: userArgs, displayName: 'Command Prompt' };
  }

  // 8. Explorer
  if (['explorer', 'الملفات', 'فايل اكسبلورر'].includes(raw)) {
    return { target: 'explorer.exe', args: userArgs, displayName: 'File Explorer' };
  }

  // 9. Task Manager
  if (['taskmgr', 'task manager', 'مدير المهام'].includes(raw)) {
    return { target: 'taskmgr.exe', args: userArgs, displayName: 'Task Manager' };
  }

  // 10. Paint
  if (['paint', 'mspaint', 'الرسام'].includes(raw)) {
    return { target: 'mspaint.exe', args: userArgs, displayName: 'Paint' };
  }

  return { target: appName, args: userArgs, displayName: appName };
}

// Open External URL in default browser (always creates a new tab and focuses)
ipcMain.handle('system:open-url', async (_event, targetUrl: string) => {
  try {
    let cleanUrl = (targetUrl || '').trim();
    if (!cleanUrl) cleanUrl = 'https://www.google.com';
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    await shell.openExternal(cleanUrl);
    return { success: true, url: cleanUrl, message: `Opened ${cleanUrl} in the default browser.` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Open Browser / Tab / Search Tool Handler
ipcMain.handle('system:open-browser', async (_event, options?: { url?: string; searchQuery?: string; newWindow?: boolean }) => {
  try {
    let targetUrl = options?.url || 'https://www.google.com';
    if (options?.searchQuery) {
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(options.searchQuery)}`;
    }
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    if (options?.newWindow) {
      const browserExe = getBrowserExecutable();
      if (browserExe) {
        spawn(browserExe, ['--new-window', targetUrl], { detached: true, stdio: 'ignore' }).unref();
        return { success: true, url: targetUrl, message: `Opened new browser window at ${targetUrl}` };
      }
    }

    await shell.openExternal(targetUrl);
    return { success: true, url: targetUrl, message: `Opened ${targetUrl} in browser.` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Web Search & Web Scraping Helpers
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(Number(dec));
      } catch {
        return '';
      }
    });
}

async function searchWebDuckDuckGo(query: string, maxResults: number = 5): Promise<Array<{ title: string; snippet: string; url: string }>> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ar,en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search returned status ${response.status}`);
  }

  const html = await response.text();
  const results: Array<{ title: string; snippet: string; url: string }> = [];
  const blockRegex = /<div class="[^"]*web-result[^"]*"[\s\S]*?<h2 class="result__title">[\s\S]*?<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = blockRegex.exec(html)) !== null && results.length < maxResults) {
    const rawHref = match[1];
    const rawTitle = match[2];
    const rawSnippet = match[3];

    const title = decodeHtmlEntities(rawTitle.replace(/<[^>]+>/g, '')).trim();
    const snippet = decodeHtmlEntities(rawSnippet.replace(/<[^>]+>/g, '')).trim();

    let actualUrl = rawHref;
    if (rawHref.includes('uddg=')) {
      const uddgPart = rawHref.split('uddg=')[1].split('&')[0];
      try {
        actualUrl = decodeURIComponent(uddgPart);
      } catch {
        actualUrl = rawHref;
      }
    } else if (actualUrl.startsWith('//')) {
      actualUrl = `https:${actualUrl}`;
    }

    if (title && actualUrl && !actualUrl.includes('duckduckgo.com/y.js')) {
      results.push({ title, snippet, url: actualUrl });
    }
  }

  return results;
}

async function fetchCleanWebPage(targetUrl: string, maxLength: number = 4000): Promise<{ title: string; content: string }> {
  let cleanUrl = targetUrl.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  const response = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: HTTP ${response.status}`);
  }

  const html = await response.text();

  let title = '';
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '')).trim();
  }

  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  text = decodeHtmlEntities(text);

  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '... [Content truncated]';
  }

  return { title, content: text };
}

// IPC Handlers for Web Search and Scraping
ipcMain.handle('system:web-search', async (_event, options: { query: string; maxResults?: number }) => {
  try {
    const results = await searchWebDuckDuckGo(options?.query || '', options?.maxResults || 5);
    return {
      success: true,
      query: options?.query || '',
      results,
    };
  } catch (err: any) {
    return {
      success: false,
      query: options?.query || '',
      results: [],
      error: err.message,
    };
  }
});

ipcMain.handle('system:fetch-url', async (_event, options: { url: string; maxLength?: number }) => {
  try {
    const { title, content } = await fetchCleanWebPage(options?.url || '', options?.maxLength || 4000);
    return {
      success: true,
      url: options?.url || '',
      title,
      content,
      characterCount: content.length,
    };
  } catch (err: any) {
    return {
      success: false,
      url: options?.url || '',
      error: err.message,
    };
  }
});

// Launch Application with Verified Execution
ipcMain.handle('app:launch', async (_event, { appName, args }: { appName: string; args?: string[] }) => {
  return new Promise((resolve) => {
    try {
      const resolved = resolveAppToLaunch(appName, args);

      // If it's a URL or desktop protocol (like whatsapp:, https://, etc.)
      if (resolved.isUrl) {
        shell.openExternal(resolved.target)
          .then(() => {
            const isWeb = resolved.target.startsWith('http://') || resolved.target.startsWith('https://');
            resolve({
              success: true,
              appName: resolved.displayName,
              command: resolved.target,
              message: isWeb
                ? `Successfully opened ${resolved.displayName} (${resolved.target}) in the browser.`
                : `Successfully launched ${resolved.displayName} desktop application.`,
            });
          })
          .catch((err) => {
            // Protocol launch failed — try web fallback if available
            if ((resolved as any).fallbackUrl) {
              shell.openExternal((resolved as any).fallbackUrl)
                .then(() => {
                  resolve({
                    success: true,
                    appName: `${resolved.displayName} (Web)`,
                    command: (resolved as any).fallbackUrl,
                    message: `Desktop application not found, opened ${resolved.displayName} in the browser instead.`,
                  });
                })
                .catch((fallbackErr) => {
                  resolve({
                    success: false,
                    appName: resolved.displayName,
                    error: `Failed to open ${resolved.displayName}: ${fallbackErr.message}`,
                  });
                });
              return;
            }

            resolve({
              success: false,
              appName: resolved.displayName,
              error: `Failed to open ${resolved.displayName}: ${err.message}`,
            });
          });
        return;
      }

      const command = resolved.target;
      const finalArgs = resolved.args || [];

      console.log(`[Main] Launching Application: "${command}" ${finalArgs.join(' ')}`);

      let child: ChildProcess;
      try {
        child = spawn(command, finalArgs, {
          detached: true,
          shell: true,
          stdio: 'ignore',
        });
      } catch (spawnSyncErr: any) {
        resolve({
          success: false,
          appName: resolved.displayName,
          error: `Could not launch ${resolved.displayName}: ${spawnSyncErr.message}`,
        });
        return;
      }

      let hasResolved = false;

      child.on('error', (spawnErr) => {
        if (!hasResolved) {
          hasResolved = true;
          console.warn(`[Main] Spawn error launching '${command}':`, spawnErr.message);
          resolve({
            success: false,
            appName: resolved.displayName,
            error: `Failed to launch ${resolved.displayName}: ${spawnErr.message}`,
          });
        }
      });

      // Verify spawn after 250ms
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          child.unref();
          resolve({
            success: true,
            appName: resolved.displayName,
            command,
            message: `Successfully launched ${resolved.displayName}`,
          });
        }
      }, 250);

    } catch (err: any) {
      console.error('[Main] App Launch Error:', err);
      resolve({
        success: false,
        appName,
        error: err.message || 'Failed to launch application',
      });
    }
  });
});

// Process Aliases for Accurate Closing
const APP_PROCESS_ALIASES: Record<string, string[]> = {
  'browser': ['msedge.exe', 'chrome.exe', 'brave.exe', 'firefox.exe'],
  'المتصفح': ['msedge.exe', 'chrome.exe', 'brave.exe', 'firefox.exe'],
  'edge': ['msedge.exe'],
  'msedge': ['msedge.exe'],
  'chrome': ['chrome.exe'],
  'كروم': ['chrome.exe'],
  'vscode': ['Code.exe'],
  'code': ['Code.exe'],
  'كود': ['Code.exe'],
  'فيجوال': ['Code.exe'],
  'spotify': ['Spotify.exe'],
  'سبوتيفاي': ['Spotify.exe'],
  'notepad': ['notepad.exe'],
  'المفكرة': ['notepad.exe'],
  'calc': ['CalculatorApp.exe', 'calc.exe'],
  'calculator': ['CalculatorApp.exe', 'calc.exe'],
  'الحاسبة': ['CalculatorApp.exe', 'calc.exe'],
  'terminal': ['WindowsTerminal.exe', 'wt.exe'],
  'التيرمينال': ['WindowsTerminal.exe', 'wt.exe'],
  'powershell': ['powershell.exe'],
  'cmd': ['cmd.exe'],
  'explorer': ['explorer.exe'],
  'whatsapp': ['WhatsApp.exe', 'WhatsAppDesktop.exe', 'WhatsApp.Root.exe'],
  'الواتساب': ['WhatsApp.exe', 'WhatsAppDesktop.exe', 'WhatsApp.Root.exe'],
  'واتساب': ['WhatsApp.exe', 'WhatsAppDesktop.exe', 'WhatsApp.Root.exe'],
  'discord': ['Discord.exe'],
  'ديسكورد': ['Discord.exe'],
  'telegram': ['Telegram.exe'],
  'تيليجرام': ['Telegram.exe'],
  'تلجرام': ['Telegram.exe'],
};

// Close Application with Verified Multi-Alias Termination
ipcMain.handle('app:close', async (_event, { appName }: { appName: string }) => {
  return new Promise((resolve) => {
    const raw = appName.toLowerCase().trim();
    const targets = APP_PROCESS_ALIASES[raw] || [
      raw.endsWith('.exe') ? raw : `${raw}.exe`
    ];

    let closedAny = false;
    let completedChecks = 0;

    targets.forEach((procName) => {
      exec(`taskkill /IM "${procName}" /F`, (err, stdout, stderr) => {
        completedChecks++;
        if (!err && !stderr.includes('ERROR: The process')) {
          closedAny = true;
        }

        if (completedChecks === targets.length) {
          if (closedAny) {
            resolve({
              success: true,
              appName,
              message: `Successfully closed ${appName} (${targets.join(', ')})`,
            });
          } else {
            // Also try Stop-Process via PowerShell fallback
            const psNames = targets.map((t) => `'${t.replace('.exe', '')}'`).join(',');
            exec(`powershell -NoProfile -Command "Stop-Process -Name ${psNames} -Force -ErrorAction SilentlyContinue"`, () => {
              resolve({
                success: true,
                appName,
                message: `Termination signal completed for ${appName}.`,
              });
            });
          }
        }
      });
    });
  });
});

// Close all user applications except specified exceptions
ipcMain.handle('app:close-all', async (_event, { exceptApps }: { exceptApps?: string[] }) => {
  return new Promise((resolve) => {
    const protectedList = [
      'electron', 'antigravity', 'explorer', 'systemsettings', 'taskmgr', 
      'applicationframehost', 'textinputhost', 'powertoys', 'vision',
      ...(exceptApps || []).map((a) => a.toLowerCase().trim())
    ];

    const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -Property Id, ProcessName | ConvertTo-Json -Compress`;
    
    exec(`powershell -Command "${psScript}"`, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        resolve({ success: true, closedApps: [], message: 'No active user applications found to close.' });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const appsToKill = list.filter((p: any) => {
          const pName = (p.ProcessName || '').toLowerCase();
          return !protectedList.some((prot) => pName.includes(prot) || prot.includes(pName));
        });

        const killedNames: string[] = [];
        let count = 0;

        for (const target of appsToKill) {
          try {
            exec(`taskkill /PID ${target.Id} /F`, () => {});
            killedNames.push(target.ProcessName);
            count++;
          } catch (e) {}
        }

        resolve({
          success: true,
          closedApps: killedNames,
          message: count > 0 ? `Closed ${count} application(s): ${killedNames.join(', ')}` : 'All other applications are already closed.',
        });
      } catch (e: any) {
        resolve({ success: false, error: e.message, closedApps: [] });
      }
    });
  });
});

// Get Running Windowed Applications
ipcMain.handle('app:get-running', async () => {
  return new Promise((resolve) => {
    const psScript = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object -Property Id, ProcessName, MainWindowTitle, WorkingSet64 | ConvertTo-Json -Compress`;
    exec(`powershell -Command "${psScript}"`, (err, stdout) => {
      if (err || !stdout || !stdout.trim()) {
        resolve([]);
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const formatted = list.map((p: any) => ({
          pid: p.Id,
          name: p.ProcessName,
          title: p.MainWindowTitle,
          memoryMb: Math.round((p.WorkingSet64 || 0) / (1024 * 1024)),
        }));
        resolve(formatted);
      } catch (e) {
        resolve([]);
      }
    });
  });
});

// Focus / Activate Window
ipcMain.handle('app:focus', async (_event, { processName }: { processName: string }) => {
  return new Promise((resolve) => {
    const cleanName = processName.replace('.exe', '').trim();
    const psScript = `
      $proc = Get-Process -Name '${cleanName}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
      if ($proc) {
        $wshell = New-Object -ComObject Wscript.Shell
        $wshell.AppActivate($proc.Id)
      }
    `;
    exec(`powershell -Command "${psScript}"`, (err) => {
      resolve({ success: !err });
    });
  });
});

// Open File or Path in OS Default Viewer / Explorer
ipcMain.handle('system:open-path', async (_event, targetPath: string) => {
  try {
    await shell.openPath(targetPath);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Read local image file as Base64 for Vision analysis
ipcMain.handle('system:read-image-base64', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `Image file does not exist: ${filePath}` };
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.gif': 'image/gif',
    };
    const mimeType = mimeMap[ext] || 'image/png';
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return {
      success: true,
      mimeType,
      base64,
      dataUrl: `data:${mimeType};base64,${base64}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Execute Terminal / Shell Command via dedicated CommandExecutor (PowerShell / CMD / Multi-Shell)
ipcMain.handle('system:execute-command', async (_event, options: { command: string; cwd?: string; shell?: any; timeout?: number }) => {
  return commandExecutor.execute(options);
});

// Execute Terminal / Shell Command with ELEVATED (Administrator) privileges via UAC
ipcMain.handle('system:execute-command-elevated', async (_event, options: { command: string; cwd?: string; timeout?: number }) => {
  return commandExecutor.executeElevated(options);
});

// Media Control (play_pause, next, previous, stop)
ipcMain.handle('system:media-control', async (_event, options: { action: 'play_pause' | 'next' | 'previous' | 'stop' }) => {
  return systemMediaService.mediaControl(options.action);
});

// Precise Volume Control (get, set, mute, unmute, step_up, step_down)
ipcMain.handle('system:volume-control', async (_event, options: {
  action: 'get' | 'set' | 'mute' | 'unmute' | 'step_up' | 'step_down';
  level?: number;
  step?: number;
}) => {
  return systemMediaService.volumeControl(options);
});

// Clipboard (read, write, clear)
ipcMain.handle('system:clipboard', async (_event, options: { action: 'read' | 'write' | 'clear'; text?: string }) => {
  try {
    if (options.action === 'read') {
      const text = clipboard.readText();
      return { success: true, text, length: text.length };
    }
    if (options.action === 'write') {
      clipboard.writeText(options.text || '');
      return { success: true, message: 'Text successfully copied to clipboard.', length: (options.text || '').length };
    }
    if (options.action === 'clear') {
      clipboard.clear();
      return { success: true, message: 'Clipboard successfully cleared.' };
    }
    return { success: false, error: `Unknown clipboard action: ${options.action}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// System Toast Notification (Windows Action Center)
ipcMain.handle('system:notify', async (_event, options: {
  title: string;
  message: string;
  sound?: boolean;
  urgency?: 'normal' | 'critical';
}) => {
  try {
    if (!Notification.isSupported()) {
      return { success: false, error: 'Desktop notifications are not supported on this platform.' };
    }
    const notification = new Notification({
      title: options.title || 'VISION Assistant',
      body: options.message,
      silent: options.sound === false,
      urgency: options.urgency || 'normal',
    });
    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notification.show();
    return { success: true, message: `Notification "${options.title}" sent.` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// =========================================================================
// Safe Filesystem IPC Handlers (Protected Paths, Backups, Recycle Bin)
// =========================================================================
ipcMain.handle('fs:read-file', async (_event, options: any) => {
  return safeReadFile(options);
});

ipcMain.handle('fs:write-file', async (_event, options: any) => {
  return safeWriteFile(options);
});

ipcMain.handle('fs:edit-file', async (_event, options: any) => {
  return safeEditFile(options);
});

ipcMain.handle('fs:search-files', async (_event, options: any) => {
  return safeSearchFiles(options);
});

ipcMain.handle('fs:trash-file', async (_event, options: any) => {
  return safeTrashFile(options);
});

// =========================================================================
// High-Fidelity Document & PDF Hub IPC Handlers (RTL Arabic, Chromium Print, Docx, Merge)
// =========================================================================
ipcMain.handle('doc:read-pdf', async (_event, options: any) => {
  return documentService.readPdf(options);
});

ipcMain.handle('doc:read-doc', async (_event, options: any) => {
  return documentService.readDoc(options);
});

ipcMain.handle('doc:create-pdf', async (_event, options: any) => {
  return documentService.createPdf(options);
});

ipcMain.handle('doc:convert-to-pdf', async (_event, options: any) => {
  return documentService.convertToPdf(options);
});

ipcMain.handle('doc:merge-pdfs', async (_event, options: any) => {
  return documentService.mergePdfs(options);
});

// =========================================================================
// Persistent Memory Storage (File-backed in Electron userData)
// =========================================================================
const getMemoryFilePath = () => path.join(app.getPath('userData'), 'vision_memory.json');

ipcMain.handle('memory:load', async () => {
  try {
    const filePath = getMemoryFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Main] Failed to read vision_memory.json:', err);
  }
  return null;
});

ipcMain.handle('memory:save', async (_event, items: any[]) => {
  try {
    const filePath = getMemoryFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
    return { success: true, count: items.length };
  } catch (err: any) {
    console.error('[Main] Failed to save vision_memory.json:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('memory:clear', async () => {
  try {
    const filePath = getMemoryFilePath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// =========================================================================
// Contacts Storage & VCF Import (File-backed in Electron userData)
// =========================================================================
const getContactsFilePath = () => path.join(app.getPath('userData'), 'vision_contacts.json');

function findDefaultVcfFilePath(): string | null {
  const candidates = [
    process.cwd(),
    path.join(__dirname, '../../'),
    path.join(__dirname, '../..'),
    'g:\\work\\VISION',
  ];

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        const vcf = files.find((f) => f.toLowerCase().endsWith('.vcf'));
        if (vcf) {
          return path.join(dir, vcf);
        }
      }
    } catch {}
  }
  return null;
}

function loadOrImportAllContacts(): any[] {
  const filePath = getContactsFilePath();
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('[Main] Failed to parse vision_contacts.json:', e);
    }
  }

  // Auto-import from project VCF if available
  const defaultVcf = findDefaultVcfFilePath();
  if (defaultVcf && fs.existsSync(defaultVcf)) {
    try {
      console.log('[Main] Auto-importing contacts from default VCF:', defaultVcf);
      const raw = fs.readFileSync(defaultVcf, 'utf-8');
      const contacts = parseVcfContent(raw);
      if (contacts.length > 0) {
        fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2), 'utf-8');
        return contacts;
      }
    } catch (e) {
      console.warn('[Main] Failed to auto-import default VCF:', e);
    }
  }

  return [];
}

ipcMain.handle('contacts:load', async () => {
  return loadOrImportAllContacts();
});

ipcMain.handle('contacts:save', async (_event, items: any[]) => {
  try {
    const filePath = getContactsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
    return { success: true, count: items.length };
  } catch (err: any) {
    console.error('[Main] Failed to save vision_contacts.json:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('contacts:import-vcf', async (_event, targetPath?: string) => {
  try {
    const vcfPath = targetPath || findDefaultVcfFilePath();
    if (!vcfPath || !fs.existsSync(vcfPath)) {
      return { success: false, total: 0, contacts: [], error: 'VCF file not found.' };
    }

    const raw = fs.readFileSync(vcfPath, 'utf-8');
    const contacts = parseVcfContent(raw);
    const filePath = getContactsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2), 'utf-8');

    return {
      success: true,
      total: contacts.length,
      contacts,
    };
  } catch (err: any) {
    return { success: false, total: 0, contacts: [], error: err.message };
  }
});

// =========================================================================
// WhatsApp Automation, Resilience Queue & Protocol Handlers
// =========================================================================

// WhatsApp Sequential Action Queue & Timestamp Tracker
let waActionQueue: Promise<any> = Promise.resolve();
let lastWhatsAppActionTime = 0;

function queueWhatsAppAction<T>(action: () => Promise<T>): Promise<T> {
  const current = waActionQueue.then(action, action);
  waActionQueue = current.then(
    () => new Promise((resolve) => setTimeout(resolve, 2000)),
    () => new Promise((resolve) => setTimeout(resolve, 2000))
  );
  return current;
}

// Dynamic timing: if WhatsApp was used in last 40s, warm-start takes 3.5s; otherwise cold launch takes 7.0s
function getWhatsAppWaitMs(): number {
  const now = Date.now();
  const isWarm = (now - lastWhatsAppActionTime) < 40000;
  return isWarm ? 3500 : 7000;
}

ipcMain.handle('whatsapp:open-chat', async (_event, options: { phone: string; message?: string }) => {
  try {
    const cleanPhone = normalizePhoneNumber(options.phone || '');
    if (!cleanPhone) {
      return { success: false, error: 'Invalid or missing phone number' };
    }

    const encodedMsg = options.message ? `&text=${encodeURIComponent(options.message)}` : '';
    const desktopUrl = `whatsapp://send?phone=${cleanPhone}${encodedMsg}`;
    
    try {
      await shell.openExternal(desktopUrl);
      lastWhatsAppActionTime = Date.now();
      return { success: true, url: desktopUrl, phone: cleanPhone };
    } catch {
      // Fallback to WhatsApp Web
      const webUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}${encodedMsg}`;
      await shell.openExternal(webUrl);
      lastWhatsAppActionTime = Date.now();
      return { success: true, url: webUrl, phone: cleanPhone };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Helper to execute PowerShell scripts reliably via stdin without command line length limits or cmd.exe escaping issues
function runPowerShellScript(scriptText: string): Promise<string> {
  return new Promise((resolve) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-']);
    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', (d) => { stdout += d.toString(); });
    ps.stderr.on('data', (d) => { stderr += d.toString(); });

    ps.on('close', (code) => {
      if (code !== 0 && stderr) {
        console.warn('[WhatsApp PowerShell] Warning:', stderr);
      }
      resolve(stdout);
    });

    ps.stdin.write(scriptText);
    ps.stdin.end();
  });
}

const WA_WIN32_CLASS = `
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Diagnostics;

public class WaFocusHelper {
    public delegate bool EnumDelegate(IntPtr hWnd, int lParam);

    [DllImport("user32.dll", EntryPoint = "EnumDesktopWindows", ExactSpelling = false, CharSet = CharSet.Auto, SetLastError = true)]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumDelegate lpEnumCallbackFunction, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll")]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    public static extern void SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT {
        [FieldOffset(0)]
        public uint type;
        [FieldOffset(8)]
        public KEYBDINPUT ki;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    [DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint uCode, uint uMapType);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    private const uint INPUT_KEYBOARD = 1;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    private const uint MOUSEEVENTF_LEFTUP = 0x0004;
    private const ushort VK_CONTROL = 0x11;
    private const ushort VK_V = 0x56;
    private const ushort VK_RETURN = 0x0D;
    private const ushort VK_TAB = 0x09;

    public static void ClickAt(int x, int y) {
        SetCursorPos(x, y);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
    }

    public static void SendEnter() {
        ushort scanCode = (ushort)MapVirtualKey(VK_RETURN, 0); // 0x1C

        INPUT[] down = new INPUT[1];
        down[0].type = INPUT_KEYBOARD;
        down[0].ki.wVk = VK_RETURN;
        down[0].ki.wScan = scanCode;
        down[0].ki.dwFlags = 0;
        SendInput(1, down, Marshal.SizeOf(typeof(INPUT)));

        keybd_event((byte)VK_RETURN, (byte)scanCode, 0, UIntPtr.Zero);

        System.Threading.Thread.Sleep(80);

        INPUT[] up = new INPUT[1];
        up[0].type = INPUT_KEYBOARD;
        up[0].ki.wVk = VK_RETURN;
        up[0].ki.wScan = scanCode;
        up[0].ki.dwFlags = KEYEVENTF_KEYUP;
        SendInput(1, up, Marshal.SizeOf(typeof(INPUT)));

        keybd_event((byte)VK_RETURN, (byte)scanCode, 2, UIntPtr.Zero);
    }

    public static void SendTab() {
        ushort scanCode = (ushort)MapVirtualKey(VK_TAB, 0);
        keybd_event((byte)VK_TAB, (byte)scanCode, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(60);
        keybd_event((byte)VK_TAB, (byte)scanCode, 2, UIntPtr.Zero);
    }

    public static void SendCtrlV() {
        ushort scanCtrl = (ushort)MapVirtualKey(VK_CONTROL, 0);
        ushort scanV = (ushort)MapVirtualKey(VK_V, 0);

        keybd_event((byte)VK_CONTROL, (byte)scanCtrl, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)VK_V, (byte)scanV, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(80);
        keybd_event((byte)VK_V, (byte)scanV, 2, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)VK_CONTROL, (byte)scanCtrl, 2, UIntPtr.Zero);
    }

    public static void SendCtrlEnter() {
        ushort scanCtrl = (ushort)MapVirtualKey(VK_CONTROL, 0);
        ushort scanEnter = (ushort)MapVirtualKey(VK_RETURN, 0);

        keybd_event((byte)VK_CONTROL, (byte)scanCtrl, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)VK_RETURN, (byte)scanEnter, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(80);
        keybd_event((byte)VK_RETURN, (byte)scanEnter, 2, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)VK_CONTROL, (byte)scanCtrl, 2, UIntPtr.Zero);
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    public static void PressEnter() {
        byte scan = (byte)MapVirtualKey(VK_RETURN, 0);
        keybd_event((byte)VK_RETURN, scan, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(80);
        keybd_event((byte)VK_RETURN, scan, 2, UIntPtr.Zero);
    }

    public static void PressCtrlEnter() {
        byte scanCtrl = (byte)MapVirtualKey(VK_CONTROL, 0);
        byte scanEnter = (byte)MapVirtualKey(VK_RETURN, 0);

        keybd_event((byte)VK_CONTROL, scanCtrl, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)VK_RETURN, scanEnter, 0, UIntPtr.Zero);
        System.Threading.Thread.Sleep(80);
        keybd_event((byte)VK_RETURN, scanEnter, 2, UIntPtr.Zero);
        System.Threading.Thread.Sleep(50);
        keybd_event((byte)VK_CONTROL, scanCtrl, 2, UIntPtr.Zero);
    }

    public static bool FocusAndSend() {
        IntPtr bestHwnd = IntPtr.Zero;
        RECT bestRect = new RECT();
        int bestScore = -1;

        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk != IntPtr.Zero) {
            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                var sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title.IndexOf("WhatsApp", StringComparison.OrdinalIgnoreCase) >= 0) {
                    var sbC = new StringBuilder(256);
                    GetClassName(hWnd, sbC, 256);
                    string cls = sbC.ToString();

                    RECT r;
                    GetWindowRect(hWnd, out r);
                    int w = r.Right - r.Left;
                    int h = r.Bottom - r.Top;
                    if (w > 300 && h > 300) {
                        int score = 10;
                        if (cls.IndexOf("Chrome", StringComparison.OrdinalIgnoreCase) >= 0) score += 50;
                        if (title.IndexOf("(", StringComparison.OrdinalIgnoreCase) >= 0) score += 30;
                        if (score > bestScore) {
                            bestScore = score;
                            bestHwnd = hWnd;
                            bestRect = r;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);
            CloseDesktop(hDesk);
        }

        if (bestHwnd != IntPtr.Zero) {
            IntPtr fg = GetForegroundWindow();
            uint fgThread = 0;
            if (fg != IntPtr.Zero) {
                GetWindowThreadProcessId(fg, out fgThread);
            }
            uint curThread = GetCurrentThreadId();
            if (fgThread != 0 && fgThread != curThread) {
                AttachThreadInput(curThread, fgThread, true);
            }
            ShowWindow(bestHwnd, 9);
            SetForegroundWindow(bestHwnd);
            if (fgThread != 0 && fgThread != curThread) {
                AttachThreadInput(curThread, fgThread, false);
            }

            System.Threading.Thread.Sleep(150);

            // Click the input box to ensure focus is there
            int boxX = bestRect.Right - 160;
            int boxY = bestRect.Bottom - 40;
            ClickAt(boxX, boxY);
            System.Threading.Thread.Sleep(100);

            // Press Enter ONCE to send — no further clicks after this!
            // (After Enter, the input is empty and the mic button appears where send was)
            PressEnter();
            return true;
        }

        // Fallback
        PressEnter();
        return false;
    }

    public static bool FocusAndPasteAndSend(int waitMs = 3500) {
        IntPtr bestHwnd = IntPtr.Zero;
        RECT bestRect = new RECT();
        int bestScore = -1;

        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk != IntPtr.Zero) {
            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                var sb = new StringBuilder(256);
                GetWindowText(hWnd, sb, 256);
                string title = sb.ToString();
                if (title.IndexOf("WhatsApp", StringComparison.OrdinalIgnoreCase) >= 0) {
                    var sbC = new StringBuilder(256);
                    GetClassName(hWnd, sbC, 256);
                    string cls = sbC.ToString();

                    RECT r;
                    GetWindowRect(hWnd, out r);
                    int w = r.Right - r.Left;
                    int h = r.Bottom - r.Top;
                    if (w > 300 && h > 300) {
                        int score = 10;
                        if (cls.IndexOf("Chrome", StringComparison.OrdinalIgnoreCase) >= 0) score += 50;
                        if (title.IndexOf("(", StringComparison.OrdinalIgnoreCase) >= 0) score += 30;
                        if (score > bestScore) {
                            bestScore = score;
                            bestHwnd = hWnd;
                            bestRect = r;
                        }
                    }
                }
                return true;
            }, IntPtr.Zero);
            CloseDesktop(hDesk);
        }

        if (bestHwnd != IntPtr.Zero) {
            IntPtr fg = GetForegroundWindow();
            uint fgThread = 0;
            if (fg != IntPtr.Zero) {
                GetWindowThreadProcessId(fg, out fgThread);
            }
            uint curThread = GetCurrentThreadId();
            if (fgThread != 0 && fgThread != curThread) {
                AttachThreadInput(curThread, fgThread, true);
            }
            ShowWindow(bestHwnd, 9);
            SetForegroundWindow(bestHwnd);
            if (fgThread != 0 && fgThread != curThread) {
                AttachThreadInput(curThread, fgThread, false);
            }

            System.Threading.Thread.Sleep(150);

            int boxX = bestRect.Right - 160;
            int boxY = bestRect.Bottom - 40;
            ClickAt(boxX, boxY);
            System.Threading.Thread.Sleep(150);

            SendCtrlV();
            // Wait for WhatsApp to process the attachment preview
            System.Threading.Thread.Sleep(Math.Max(waitMs, 2500));

            // Press Enter ONCE to send — no further clicks after this!
            PressEnter();
            return true;
        }

        SendCtrlV();
        System.Threading.Thread.Sleep(Math.Max(waitMs, 2500));
        PressEnter();
        return false;
    }
}
'@
`;

ipcMain.handle('whatsapp:send-message', async (_event, options: { phone: string; message: string; autoSend?: boolean }) => {
  return queueWhatsAppAction(async () => {
    try {
      const cleanPhone = normalizePhoneNumber(options.phone || '');
      if (!cleanPhone) {
        return { success: false, error: 'Invalid or missing phone number' };
      }

      const encodedMsg = encodeURIComponent(options.message || '');
      const desktopUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMsg}`;

      // 1. Initial launch / navigation (Only call once to avoid duplicate text in chat box)
      await shell.openExternal(desktopUrl);

      // If autoSend is enabled (default), focus WhatsApp, focus message box, and hit Enter
      if (options.autoSend !== false) {
        const waitMs = Math.max(getWhatsAppWaitMs(), 2500);
        await new Promise((r) => setTimeout(r, waitMs));

        await runPowerShellScript(`
${WA_WIN32_CLASS}
Start-Process "whatsapp://"
Start-Sleep -Milliseconds 400
[WaFocusHelper]::FocusAndSend()
        `);
      }

      lastWhatsAppActionTime = Date.now();

      return {
        success: true,
        phone: cleanPhone,
        message: options.message,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
});

ipcMain.handle('whatsapp:send-media', async (_event, options: { phone: string; mediaPath?: string; caption?: string; autoSend?: boolean }) => {
  return queueWhatsAppAction(async () => {
    try {
      const cleanPhone = normalizePhoneNumber(options.phone || '');
      if (!cleanPhone) {
        return { success: false, error: 'Invalid or missing phone number' };
      }

      // 1. Copy image to Windows clipboard as BOTH native image AND FileDropList (Native File Object for WhatsApp Desktop)
      if (options.mediaPath && fs.existsSync(options.mediaPath)) {
        try {
          const img = nativeImage.createFromPath(options.mediaPath);
          clipboard.writeImage(img);
        } catch {}

        const escapedPath = options.mediaPath.replace(/'/g, "''");
        await runPowerShellScript(`Set-Clipboard -Path '${escapedPath}'`);
      }

      // 2. Open WhatsApp chat with recipient
      const desktopUrl = `whatsapp://send?phone=${cleanPhone}`;
      await shell.openExternal(desktopUrl);

      // 3. Paste image into chat and send
      if (options.autoSend !== false) {
        const waitMs = Math.max(getWhatsAppWaitMs(), 2600);
        await new Promise((r) => setTimeout(r, waitMs));

        await runPowerShellScript(`
${WA_WIN32_CLASS}
Start-Process "whatsapp://"
Start-Sleep -Milliseconds 400
[WaFocusHelper]::FocusAndPasteAndSend()
        `);
      }

      lastWhatsAppActionTime = Date.now();

      return {
        success: true,
        phone: cleanPhone,
        mediaPath: options.mediaPath,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
});

// Smart file resolver: identifies candidate directories, reads real files on disk,
// and compares user utterance against actual filenames using token similarity & transliteration
function resolveSmartFilePath(rawPath: string): string | null {
  if (!rawPath || !rawPath.trim()) return null;
  const input = rawPath.trim();

  // 1. Direct hit (absolute or relative)
  if (fs.existsSync(input) && fs.statSync(input).isFile()) {
    return path.resolve(input);
  }

  // 2. Candidate root search directories
  const candidateRoots = [
    app.getPath('downloads'),
    'g:\\work\\VISION',
    app.getPath('desktop'),
    app.getPath('documents'),
  ].filter(d => Boolean(d) && fs.existsSync(d));

  // 3. Extract folder hints from path or query (e.g. "Downloads", "Documents", "Screenshots")
  const inputLower = input.toLowerCase();
  const folderHints: string[] = [];
  if (inputLower.includes('download') || inputLower.includes('داونلود')) folderHints.push('downloads');
  if (inputLower.includes('document') || inputLower.includes('مستند') || inputLower.includes('دوكيومنت')) folderHints.push('documents');
  if (inputLower.includes('desktop') || inputLower.includes('سطح المكتب')) folderHints.push('desktop');
  if (inputLower.includes('screenshot') || inputLower.includes('سكرين')) folderHints.push('screenshots');

  // Build prioritized directories to inspect (targeted subfolders first)
  const prioritizedDirs: string[] = [];
  const downloadsDir = app.getPath('downloads');
  if (downloadsDir && fs.existsSync(downloadsDir)) {
    const docsInDownloads = path.join(downloadsDir, 'Documents');
    if (fs.existsSync(docsInDownloads)) prioritizedDirs.push(docsInDownloads);
  }

  // If user mentioned specific folders, check matching subdirectories
  for (const root of candidateRoots) {
    if (!prioritizedDirs.includes(root)) prioritizedDirs.push(root);
    try {
      const subs = fs.readdirSync(root, { withFileTypes: true });
      for (const s of subs) {
        if (s.isDirectory()) {
          const subPath = path.join(root, s.name);
          const sLower = s.name.toLowerCase();
          if (folderHints.some(h => sLower.includes(h)) && !prioritizedDirs.includes(subPath)) {
            prioritizedDirs.unshift(subPath); // Put hint-matched folder at top!
          }
        }
      }
    } catch {}
  }

  // 4. Clean and normalize the spoken / target filename
  let cleanName = input
    .replace(/^[a-zA-Z]:[\\/](?:Users|home)[\\/][^\\/]+[\\/](?:Downloads|Desktop|Documents)[\\/]/i, '')
    .replace(/^[a-zA-Z]:[\\/](?:Users|home)[\\/][^\\/]+[\\/]/i, '')
    .replace(/^\/?(?:Users|home)\/[^/]+\/(?:Downloads|Desktop|Documents)\//i, '')
    .replace(/^\/?(?:Users|home)\/[^/]+\//i, '')
    .replace(/^[\\/]+/, '');

  const baseName = path.basename(cleanName);

  // Normalize tokens and expand transliterations
  const rawTokens = baseName.toLowerCase().split(/[^a-z0-9\u0600-\u06FF]+/).filter(t => t.length >= 3 && !['pdf', 'doc', 'docx', 'file'].includes(t));
  const arabicTermsMap: Record<string, string[]> = {
    'الكترومغناطيك': ['electromagnetic', 'electro'],
    'إلكترومغناطيك': ['electromagnetic', 'electro'],
    'الكترومغناطيسية': ['electromagnetic'],
    'إلكترومغناطيسية': ['electromagnetic'],
    'كهرومغناطيسي': ['electromagnetic'],
    'كهرومغناطيسية': ['electromagnetic'],
    'موجات': ['wave', 'waves'],
    'فورمولا': ['formula'],
    'معادلات': ['formula', 'equations'],
    'تقرير': ['report'],
    'بوستر': ['poster'],
  };

  const expandedTokens = new Set<string>();
  for (const t of rawTokens) {
    expandedTokens.add(t);
    const cleanT = t.replace(/^[ووفف]/, '');
    if (arabicTermsMap[t]) arabicTermsMap[t].forEach(m => expandedTokens.add(m));
    if (arabicTermsMap[cleanT]) arabicTermsMap[cleanT].forEach(m => expandedTokens.add(m));
  }
  const tokenList = Array.from(expandedTokens);
  const normBaseTarget = baseName.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');

  // 5. READ REAL FILES FROM THE DIRECTORIES AND COMPARE THEIR NAMES (User suggestion)
  interface FileCandidate {
    full: string;
    name: string;
    score: number;
    mtime: number;
  }
  const allCandidates: FileCandidate[] = [];

  function inspectDir(dir: string, maxDepth = 2, curDepth = 0) {
    if (curDepth > maxDepth) return;
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          inspectDir(full, maxDepth, curDepth + 1);
        } else if (item.isFile()) {
          try {
            const st = fs.statSync(full);
            const lowerName = item.name.toLowerCase();
            const normName = lowerName.replace(/[^a-z0-9\u0600-\u06FF]/g, '');
            let score = 0;

            // Exact match
            if (normName === normBaseTarget) {
              score += 100;
            }

            // Token overlap with real file name
            for (const tok of tokenList) {
              if (lowerName.includes(tok)) {
                score += tok.length >= 5 ? 30 : 15;
              }
            }

            // Extension preference if user mentioned extension
            if (baseName.toLowerCase().endsWith('.pdf') && lowerName.endsWith('.pdf')) {
              score += 10;
            }

            if (score > 0) {
              allCandidates.push({ full, name: item.name, score, mtime: st.mtimeMs });
            }
          } catch {}
        }
      }
    } catch {}
  }

  for (const dir of prioritizedDirs) {
    inspectDir(dir, 1);
  }

  // Sort candidates by score (highest match first), then most recent
  allCandidates.sort((a, b) => b.score - a.score || b.mtime - a.mtime);

  if (allCandidates.length > 0 && allCandidates[0].score >= 25) {
    return allCandidates[0].full;
  }

  return null;
}



ipcMain.handle('whatsapp:send-file', async (_event, options: { phone: string; filePath: string; caption?: string; autoSend?: boolean }) => {
  return queueWhatsAppAction(async () => {
    try {
      const cleanPhone = normalizePhoneNumber(options.phone || '');
      if (!cleanPhone) {
        return { success: false, error: 'Invalid or missing phone number' };
      }

      const resolved = resolveSmartFilePath(options.filePath);
      if (!resolved) {
        return { success: false, error: `File not found: ${options.filePath}` };
      }

      const resolvedPath = resolved;
      const fileName = path.basename(resolvedPath);
      const stats = fs.statSync(resolvedPath);

      // 1. Open WhatsApp chat with recipient
      const desktopUrl = `whatsapp://send?phone=${cleanPhone}`;
      await shell.openExternal(desktopUrl);

      // 2. Set clipboard and paste file into WhatsApp chat and send (Ctrl+V then Enter)
      if (options.autoSend !== false) {
        const waitMs = Math.max(getWhatsAppWaitMs(), 2600);
        await new Promise((r) => setTimeout(r, waitMs));

        // Scale wait time based on file size: base 3500ms + 400ms per MB (max 12000ms)
        const sizeMb = stats.size / (1024 * 1024);
        const pasteWaitMs = Math.min(Math.max(Math.round(3500 + sizeMb * 400), 3500), 12000);
        const escapedPath = resolvedPath.replace(/'/g, "''");

        await runPowerShellScript(`
${WA_WIN32_CLASS}
Set-Clipboard -Path '${escapedPath}'
Start-Sleep -Milliseconds 250
Start-Process "whatsapp://"
Start-Sleep -Milliseconds 400
[WaFocusHelper]::FocusAndPasteAndSend(${pasteWaitMs})
        `);
      }

      lastWhatsAppActionTime = Date.now();

      return {
        success: true,
        phone: cleanPhone,
        filePath: resolvedPath,
        fileName,
        fileSize: stats.size,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
});

// =========================================================================
// VISION Remote Gateway Lifecycle & IPC Bridge
// =========================================================================

function startGatewayService(): void {
  gatewayServer.setTelemetryProvider(collectSystemTelemetry);

  // Connect remote commands from mobile to Desktop UI
  remoteBridge.registerDesktopCommandHandler(async (cmdText, taskId) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('remote:user-command', { cmdText, taskId });
    }
  });

  // Connect remote confirmation decisions from mobile to Desktop UI
  remoteBridge.registerConfirmationHandler(async (actionId, decision) => {
    if (mainWindow) {
      mainWindow.webContents.send('remote:confirmation-decision', { actionId, decision });
    }
  });

  gatewayServer.start().then(() => {
    discoveryService.start();
  }).catch((err) => {
    console.warn('[Main] VISION Gateway startup error:', err);
  });
}

// Gateway Info & Management IPC
ipcMain.handle('gateway:get-info', () => {
  return {
    ip: gatewayServer.getLocalIpAddress(),
    port: VISION_CONFIG.GATEWAY.PORT,
    systemName: VISION_CONFIG.GATEWAY.SYSTEM_NAME,
    connectedClients: sessionHub.getAuthenticatedCount(),
    connectedDevices: sessionHub.getConnectedDevices(),
    activePairingCode: pairingManager.getActivePairingCode(),
  };
});

ipcMain.handle('gateway:generate-pairing-code', () => {
  const code = pairingManager.generatePairingCode();
  return { code, expiresInSeconds: 300 };
});

ipcMain.handle('gateway:get-devices', () => {
  return pairingManager.listDevices();
});

ipcMain.handle('gateway:revoke-device', (_event, deviceId: string) => {
  return pairingManager.revokeDevice(deviceId);
});

// Remote Streaming Emitters (Desktop Renderer -> Gateway -> Mobile)
ipcMain.handle('remote:stream-plan', (_event, { taskId, tasks }: { taskId: string; tasks: string[] }) => {
  remoteBridge.notifyTaskPlan(taskId, tasks);
  return true;
});

ipcMain.handle('remote:stream-step', (_event, { taskId, step }: { taskId: string; step: any }) => {
  remoteBridge.notifyTaskStep(taskId, step);
  return true;
});

ipcMain.handle('remote:stream-progress', (_event, { taskId, percent, currentActivity }: { taskId: string; percent: number; currentActivity: string }) => {
  remoteBridge.notifyTaskProgress(taskId, percent, currentActivity);
  return true;
});

ipcMain.handle('remote:stream-narrate', (_event, { speechText, isArabic, taskId }: { speechText: string; isArabic: boolean; taskId?: string }) => {
  remoteBridge.notifyNarration(speechText, isArabic, taskId);
  return true;
});

ipcMain.handle('remote:stream-thinking', (_event, { thinking, taskId }: { thinking: string; taskId?: string }) => {
  remoteBridge.notifyThinking(thinking, taskId);
  return true;
});

ipcMain.handle('remote:stream-confirmation-required', (_event, payload: any) => {
  remoteBridge.notifyConfirmationRequired(payload);
  return true;
});

ipcMain.handle('remote:stream-completed', (_event, { taskId, finalText, toolsUsed }: { taskId: string; finalText: string; toolsUsed?: string[] }) => {
  remoteBridge.notifyTaskCompleted(taskId, finalText, toolsUsed || []);
  return true;
});

ipcMain.handle('remote:stream-failed', (_event, { taskId, error, errorType }: { taskId: string; error: string; errorType?: string }) => {
  remoteBridge.notifyTaskFailed(taskId, error, errorType);
  return true;
});

// App Lifecycle
app.whenReady().then(() => {
  startSttService();
  startTtsService();
  startGatewayService();
  createWindow();
  createTray();

  // Global Keyboard Shortcuts (System-wide: work anywhere in Windows)
  try {
    // 1. Wake & Listen Hotkey: Ctrl+Alt+Space (starts listening immediately from anywhere)
    globalShortcut.register('CommandOrControl+Alt+Space', () => {
      console.log('[Main] Global Hotkey Triggered: WAKE_AND_LISTEN');
      if (mainWindow?.isMinimized()) mainWindow.restore();
      if (!mainWindow?.isVisible()) mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.send('system:event', { type: 'WAKE_AND_LISTEN' });
    });

    // 2. Toggle Window Visibility Hotkey: Ctrl+Alt+V
    globalShortcut.register('CommandOrControl+Alt+V', () => {
      console.log('[Main] Global Hotkey Triggered: TOGGLE_WINDOW');
      if (mainWindow?.isVisible() && mainWindow?.isFocused()) {
        mainWindow.hide();
      } else {
        if (mainWindow?.isMinimized()) mainWindow.restore();
        mainWindow?.show();
        mainWindow?.focus();
      }
    });

    // 3. Toggle Mic in background: Ctrl+Alt+M
    globalShortcut.register('CommandOrControl+Alt+M', () => {
      console.log('[Main] Global Hotkey Triggered: TOGGLE_MIC');
      mainWindow?.webContents.send('system:event', { type: 'TOGGLE_MIC' });
    });

    // 4. Emergency Stop / Mute: Ctrl+Alt+S
    globalShortcut.register('CommandOrControl+Alt+S', () => {
      console.log('[Main] Global Hotkey Triggered: EMERGENCY_STOP');
      mainWindow?.webContents.send('system:event', { type: 'EMERGENCY_STOP' });
    });

    // 5. Shutdown / Exit: Ctrl+Alt+Q
    globalShortcut.register('CommandOrControl+Alt+Q', () => {
      console.log('[Main] Global Hotkey Triggered: SHUTDOWN');
      mainWindow?.webContents.send('system:event', { type: 'SHUTDOWN' });
    });
  } catch (err) {
    console.warn('[Main] Global shortcut registration error:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  discoveryService.stop();
  gatewayServer.stop();
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

app.on('window-all-closed', () => {
  // In background mode, keep running in tray on Windows unless user explicitly quits
  if (isAppQuitting) {
    if (sttProcess) {
      try {
        sttProcess.kill();
      } catch (e) {}
    }
    if (ttsProcess) {
      try {
        ttsProcess.kill();
      } catch (e) {}
    }
    app.quit();
  }
});
