import { z } from 'zod';
import { createTool } from './createTool';
import { toolRegistry } from './registry';
import { ToolExecutionResult } from './types';
import { getLiveLocationAndWeather } from '../../renderer/services/weatherService';
import { visionService } from '../vision/VisionService';
import { memoryManager } from '../memory/MemoryManager';
import { contactManager } from '../contacts/ContactManager';
import { normalizePhoneNumber, isDummyPhoneNumber } from '../../shared/vcfParser';
import {
  developerTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  gitBranchTool,
  codebaseSummaryTool,
} from './developerTools';
import {
  documentTool,
  readPdfTool,
  readDocTool,
  createPdfTool,
  convertToPdfTool,
  mergePdfsTool,
  resolveSmartDocumentPath,
} from './documentTools';

function getVisionAPI(): any {
  if (typeof window !== 'undefined' && (window as any).visionAPI) {
    return (window as any).visionAPI;
  }
  return undefined;
}

export function registerBuiltinTools() {
  // 1. Launch Native Windows Application
  const launchAppTool = createTool({
    name: 'launch_app',
    description: 'Launch or open a desktop application on Windows (e.g. VS Code, Chrome, Spotify, Notepad, Calculator, Terminal, Explorer).',
    category: 'app',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      app_name: z.string().min(1, 'Application name is required'),
      args: z.array(z.string()).optional(),
    }),
    paramDescriptions: {
      app_name: {
        type: 'string',
        description: 'Name or executable command of the application (e.g. "code", "chrome", "notepad", "calc", "spotify", "explorer", "powershell").',
      },
      args: {
        type: 'array',
        description: 'Optional command-line arguments or path to open with the application.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.launchApp) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const res = await api.launchApp(input.app_name, input.args);
      return {
        success: res.success,
        output: res,
        message: res.message || (res.success ? `Successfully launched ${input.app_name}` : `Failed to launch ${input.app_name}`),
        error: res.error,
      };
    },
  });

  // 2. Close Application
  const closeAppTool = createTool({
    name: 'close_app',
    description: 'Close, kill or terminate a specific running desktop application on Windows.',
    category: 'app',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      app_name: z.string().min(1, 'Application name is required'),
    }),
    paramDescriptions: {
      app_name: {
        type: 'string',
        description: 'The name of the application or process to close (e.g. "spotify", "chrome", "code", "notepad", "calc").',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.closeApp) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const res = await api.closeApp(input.app_name);
      return {
        success: res.success,
        output: res,
        message: res.message || (res.success ? `Closed ${input.app_name}` : `Failed to close ${input.app_name}`),
        error: res.error,
      };
    },
  });

  // 3. Close All Applications
  const closeAllAppsTool = createTool({
    name: 'close_all_apps',
    description: 'Close all open windowed applications except specified protected applications.',
    category: 'app',
    permissionLevel: 2,
    riskLevel: 'MEDIUM',
    schema: z.object({
      except_apps: z.array(z.string()).optional(),
    }),
    paramDescriptions: {
      except_apps: {
        type: 'array',
        description: 'Names of applications to keep open and protect from termination.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.closeAllApps) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const res = await api.closeAllApps(input.except_apps);
      return {
        success: res.success,
        output: res,
        message: res.message,
        error: res.error,
      };
    },
  });

  // 4. Get Running Applications
  const getRunningAppsTool = createTool({
    name: 'get_running_apps',
    description: 'List and enumerate all currently open/active windowed applications on the computer.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({}),
    async execute() {
      const api = getVisionAPI();
      if (!api?.getRunningApps) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const apps = await api.getRunningApps();
      return {
        success: true,
        output: apps,
        message: `Found ${apps.length} active windowed applications.`,
        metadata: { count: apps.length },
      };
    },
  });

  // 5. Focus Application
  const focusAppTool = createTool({
    name: 'focus_app',
    description: 'Bring an open application window to foreground focus.',
    category: 'app',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      process_name: z.string().min(1, 'Process name is required'),
    }),
    paramDescriptions: {
      process_name: {
        type: 'string',
        description: 'The process name of the application window to activate.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.focusApp) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const res = await api.focusApp(input.process_name);
      return {
        success: res.success,
        message: res.success ? `Focused application ${input.process_name}` : `Failed to focus ${input.process_name}`,
      };
    },
  });

  // 6. Multi-Monitor Screenshot Capture
  const screenshotTool = createTool({
    name: 'take_screenshot',
    description: 'Capture a high-resolution screenshot of the desktop screen (Display 1 or Display 2).',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      screen_index: z.number().int().min(0).max(5).optional(),
    }),
    paramDescriptions: {
      screen_index: {
        type: 'integer',
        description: 'Monitor index (0 for primary display, 1 for secondary). Defaults to 0.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.takeScreenshot) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const res = await api.takeScreenshot({ screenIndex: input.screen_index });
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Screenshot saved: ${res.screenName || `Display ${res.screenIndex}`} (${res.width}x${res.height})`
          : `Failed to capture screenshot`,
        error: res.error,
        metadata: { filePath: res.filePath, dataUrl: res.dataUrl },
      };
    },
  });

  // 7. System Telemetry
  const telemetryTool = createTool({
    name: 'get_system_telemetry',
    description: 'Get live hardware telemetry: CPU load, memory utilization, and uptime.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({}),
    async execute() {
      const api = getVisionAPI();
      if (!api?.getTelemetry) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const data = await api.getTelemetry();
      return {
        success: true,
        output: data,
        message: `CPU: ${data.cpuUsage}%, RAM: ${data.memoryUsageMb}MB / ${data.totalMemoryMb}MB`,
      };
    },
  });

  // 8. Weather
  const weatherTool = createTool({
    name: 'get_weather',
    description: 'Get live weather and temperature forecast for a city or current location.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      city: z.string().optional(),
    }),
    paramDescriptions: {
      city: {
        type: 'string',
        description: 'City name (e.g. "Zagazig", "Cairo", "Alexandria", "London"). Defaults to auto-detection.',
      },
    },
    async execute(input) {
      try {
        const data = await getLiveLocationAndWeather(input.city);
        return {
          success: true,
          output: data,
          message: `Temperature in ${data.city} is ${data.temperature}°C, ${data.conditionTextEn}.`,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || 'Failed to fetch weather',
        };
      }
    },
  });

  // 9. Execute Terminal / Shell Command (PowerShell, CMD, Multi-Shell, + Elevated Admin)
  const executeCommandTool = createTool({
    name: 'execute_command',
    description: 'Execute ANY system terminal, CMD, or PowerShell command on Windows to control the operating system. You can open any application (via "start <app>" or "start \'\' \'<path>\'"), inspect/kill processes (tasklist, taskkill /F /IM ...), manipulate files (dir, copy, move, del, type), check network/system state, run scripts, manage Git/GitHub, and control Windows directly. Runs natively in PowerShell by default or CMD. Set elevated=true for commands requiring Administrator privileges (e.g. slmgr, netsh, sfc, dism, bcdedit, system services, registry edits).',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      command: z.string().min(1, 'Command is required'),
      cwd: z.string().optional(),
      shell: z.enum(['powershell', 'cmd', 'pwsh', 'bash', 'auto']).optional(),
      timeout: z.number().int().min(1000).max(120000).optional(),
      elevated: z.boolean().optional(),
    }),
    paramDescriptions: {
      command: {
        type: 'string',
        description: 'The shell command to execute (e.g. "git status", "dir", "ipconfig", "tasklist", "start chrome", "node -v", "slmgr /ato").',
      },
      cwd: {
        type: 'string',
        description: 'Optional working directory in which to execute the command. If not specified or if path does not exist, safely defaults to project root.',
      },
      shell: {
        type: 'string',
        description: 'Optional shell to use: "powershell" (default for Windows scripting and pipes), "cmd" (standard Windows CMD), or "auto". Ignored when elevated=true (always uses PowerShell).',
      },
      timeout: {
        type: 'integer',
        description: 'Optional timeout in milliseconds (defaults to 35000ms, elevated defaults to 60000ms).',
      },
      elevated: {
        type: 'boolean',
        description: 'Set to true to run the command with Administrator (elevated) privileges via UAC. Required for system commands like slmgr, netsh, sfc, dism, bcdedit, service management, and registry edits. Will trigger a Windows UAC prompt.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();

      // Route to elevated execution if requested
      if (input.elevated) {
        if (!api?.executeCommandElevated) {
          return { success: false, error: 'Desktop visionAPI.executeCommandElevated is not available in current environment.' };
        }
        const res = await api.executeCommandElevated({
          command: input.command,
          cwd: input.cwd,
          timeout: input.timeout || 60000,
        });

        const formattedMessage = res.success
          ? `[ELEVATED] Command executed successfully (Exit Code 0 via ${res.shellUsed || 'elevated-powershell'} in ${res.cwdUsed || 'root'}):\n${res.stdout || '(no output)'}`
          : `[ELEVATED] Command failed (Exit Code ${res.exitCode} [${res.errorType || 'ERROR'}] via ${res.shellUsed || 'elevated-powershell'} in ${res.cwdUsed || 'root'}):\n${res.stderr || res.error || 'Execution failed'}${res.diagnostics ? `\n[Diagnostics]: ${res.diagnostics}` : ''}`;

        return {
          success: res.success,
          output: {
            exitCode: res.exitCode,
            stdout: res.stdout,
            stderr: res.stderr,
            errorType: res.errorType,
            shellUsed: res.shellUsed,
            cwdUsed: res.cwdUsed,
            diagnostics: res.diagnostics,
            elevated: true,
          },
          message: formattedMessage,
          error: res.success ? undefined : (res.stderr || res.error || `Elevated command failed with error ${res.errorType || res.exitCode}`),
          errorType: res.errorType,
          diagnostics: res.diagnostics,
          metadata: {
            exitCode: res.exitCode,
            errorType: res.errorType,
            shellUsed: res.shellUsed,
            cwdUsed: res.cwdUsed,
            elevated: true,
          },
        };
      }

      // Standard (non-elevated) execution
      if (!api?.executeCommand) {
        return { success: false, error: 'Desktop visionAPI.executeCommand is not available in current environment.' };
      }
      const res = await api.executeCommand({
        command: input.command,
        cwd: input.cwd,
        shell: input.shell,
        timeout: input.timeout,
      });

      const formattedMessage = res.success
        ? `Command executed successfully (Exit Code 0 via ${res.shellUsed || 'shell'} in ${res.cwdUsed || 'root'}):\n${res.stdout || '(no output)'}`
        : `Command failed (Exit Code ${res.exitCode} [${res.errorType || 'ERROR'}] via ${res.shellUsed || 'shell'} in ${res.cwdUsed || 'root'}):\n${res.stderr || res.error || 'Execution failed'}${res.diagnostics ? `\n[Diagnostics]: ${res.diagnostics}` : ''}`;

      return {
        success: res.success,
        output: {
          exitCode: res.exitCode,
          stdout: res.stdout,
          stderr: res.stderr,
          errorType: res.errorType,
          shellUsed: res.shellUsed,
          cwdUsed: res.cwdUsed,
          diagnostics: res.diagnostics,
          elevated: false,
        },
        message: formattedMessage,
        error: res.success ? undefined : (res.stderr || res.error || `Command failed with error ${res.errorType || res.exitCode}`),
        errorType: res.errorType,
        diagnostics: res.diagnostics,
        metadata: {
          exitCode: res.exitCode,
          errorType: res.errorType,
          shellUsed: res.shellUsed,
          cwdUsed: res.cwdUsed,
        },
      };
    },
  });

  // 9.1 Media Playback Control (Spotify, YouTube, VLC, System Media)
  const mediaControlTool = createTool({
    name: 'media_control',
    description: 'Control media playback on Windows (Spotify, YouTube, VLC, browser, media players): play/pause, next track, previous track, or stop.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['play_pause', 'next', 'previous', 'stop'])
        .describe('الإجراء المطلوب للوسائط (play_pause, next, previous, stop)'),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Media action: "play_pause" (toggle play/pause), "next" (next track), "previous" (previous track), or "stop".',
        enum: ['play_pause', 'next', 'previous', 'stop'],
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.mediaControl) {
        return { success: false, error: 'Desktop visionAPI.mediaControl is not available in current environment.' };
      }
      const res = await api.mediaControl({ action: input.action });
      return {
        success: res.success,
        output: res,
        message: res.success ? `Media action "${input.action}" executed successfully.` : `Media action failed: ${res.error}`,
        error: res.error,
      };
    },
  });

  // 9.2 Precise Master Volume Control & Queries
  const volumeControlTool = createTool({
    name: 'volume_control',
    description: 'Precise Windows master volume control: get current volume percentage and mute status, set exact volume (0-100%), toggle mute/unmute, or step up/down by percentage.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['get', 'set', 'mute', 'unmute', 'step_up', 'step_down'])
        .describe('نوع الإجراء: get (قراءة الصوت), set (ضبط نسبة محددة), mute (كتم), unmute (إلغاء الكتم), step_up (رفع الصوت), step_down (خفض الصوت)'),
      level: z.number().min(0).max(100).optional()
        .describe('نسبة الصوت المئوية من 0 إلى 100 (مطلوبة عند اختيار action="set")'),
      step: z.number().min(1).max(50).default(5).optional()
        .describe('قيمة الزيادة أو النقصان عند اختيار step_up أو step_down (افتراضياً 5%)'),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Action type: "get", "set", "mute", "unmute", "step_up", or "step_down".',
        enum: ['get', 'set', 'mute', 'unmute', 'step_up', 'step_down'],
      },
      level: {
        type: 'number',
        description: 'Target master volume percentage between 0 and 100 (required for action="set").',
      },
      step: {
        type: 'number',
        description: 'Step amount in percentage for step_up or step_down (default: 5%).',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.volumeControl) {
        return { success: false, error: 'Desktop visionAPI.volumeControl is not available in current environment.' };
      }
      const res = await api.volumeControl({
        action: input.action,
        level: input.level,
        step: input.step,
      });
      return {
        success: res.success,
        output: res,
        message: res.success
          ? (input.action === 'get'
              ? `Current master volume: ${res.volume}%, Muted: ${res.muted}`
              : `Volume updated: ${res.volume !== undefined ? res.volume + '%' : ''} (Muted: ${res.muted})`)
          : `Volume control failed: ${res.error}`,
        error: res.error,
      };
    },
  });

  // 9.3 System Clipboard Management
  const clipboardTool = createTool({
    name: 'clipboard',
    description: 'Read from or write to the Windows desktop system clipboard. Allows inspecting copied text, code, or links, copying generated answers to the user\'s clipboard, or clearing the clipboard.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['read', 'write', 'clear'])
        .describe('نوع العملية: read (قراءة الحافظة), write (نسخ نص إلى الحافظة), clear (مسح الحافظة)'),
      text: z.string().optional()
        .describe('النص المراد نسخه في الحافظة (مطلوب عند اختيار action="write")'),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Clipboard action: "read" (get current text), "write" (copy text to clipboard), or "clear" (wipe clipboard).',
        enum: ['read', 'write', 'clear'],
      },
      text: {
        type: 'string',
        description: 'The text content to copy to clipboard (required for action="write").',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.clipboard) {
        return { success: false, error: 'Desktop visionAPI.clipboard is not available in current environment.' };
      }
      const res = await api.clipboard({
        action: input.action,
        text: input.text,
      });
      return {
        success: res.success,
        output: res,
        message: res.success
          ? (input.action === 'read' ? `Clipboard text (${res.length} chars):\n${res.text}` : res.message || 'Clipboard updated.')
          : `Clipboard operation failed: ${res.error}`,
        error: res.error,
      };
    },
  });

  // 9.4 Windows Native Toast Notification
  const systemNotificationTool = createTool({
    name: 'system_notification',
    description: 'Display an official native Windows Action Center Toast Notification with sound and clickable focus to alert the user when long tasks complete.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      title: z.string().describe('عنوان الإشعار (مثلاً: "تذكير مهم" أو "اكتملت المهمة")'),
      message: z.string().describe('نص الإشعار التوضيحي'),
      sound: z.boolean().default(true).optional().describe('هل يتم تشغيل صوت الإشعار الافتراضي؟'),
      urgency: z.enum(['normal', 'critical']).default('normal').optional()
        .describe('درجة الأهمية لإشعار النظام (normal أو critical)'),
    }),
    paramDescriptions: {
      title: {
        type: 'string',
        description: 'Title of the desktop notification.',
      },
      message: {
        type: 'string',
        description: 'Body message text of the notification.',
      },
      sound: {
        type: 'boolean',
        description: 'Whether to play the system notification chime (default: true).',
      },
      urgency: {
        type: 'string',
        description: 'Urgency level: "normal" or "critical".',
        enum: ['normal', 'critical'],
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.showNotification) {
        return { success: false, error: 'Desktop visionAPI.showNotification is not available in current environment.' };
      }
      const res = await api.showNotification({
        title: input.title,
        message: input.message,
        sound: input.sound,
        urgency: input.urgency,
      });
      return {
        success: res.success,
        output: res,
        message: res.success ? `Notification "${input.title}" shown successfully.` : `Failed to show notification: ${res.error}`,
        error: res.error,
      };
    },
  });

  // 10. Open Browser / Web Page / YouTube / Google Search
  const openBrowserTool = createTool({
    name: 'open_browser',
    description: 'Open the web browser to navigate to a URL, open YouTube, perform a Google search, or open a clean new browser tab. Always creates a new tab and focuses the browser even if already open.',
    category: 'browser',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      url: z.string().optional(),
      search_query: z.string().optional(),
      new_window: z.boolean().optional(),
    }),
    paramDescriptions: {
      url: {
        type: 'string',
        description: 'The URL or website address to open (e.g. "https://www.youtube.com", "https://chatgpt.com", "https://github.com"). Defaults to Google homepage if empty.',
      },
      search_query: {
        type: 'string',
        description: 'Optional query to search on Google. If provided, opens Google search results in a new tab.',
      },
      new_window: {
        type: 'boolean',
        description: 'Whether to force opening in a new separate browser window instead of a new tab.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.openBrowser) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }
      const res = await api.openBrowser({
        url: input.url,
        searchQuery: input.search_query,
        newWindow: input.new_window,
      });
      return {
        success: res.success,
        output: res,
        message: res.message || (res.success ? `Opened browser at ${res.url || input.url || 'homepage'}` : 'Failed to open browser'),
        error: res.error,
      };
    },
  });

  // 10.1 Web Search (DuckDuckGo Live Search)
  const webSearchTool = createTool({
    name: 'web_search',
    description: 'Search the live web / Internet using DuckDuckGo to retrieve real-time facts, documentation, news, sports scores & match reports (e.g. Real Madrid, La Liga, Champions League), academic references, or answers. Returns clean titles, snippets, and verified source URLs.',
    category: 'browser',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      query: z.string().min(1, 'Search query is required'),
      max_results: z.number().int().min(1).max(10).optional(),
    }),
    paramDescriptions: {
      query: {
        type: 'string',
        description: 'The query, topic, question, or keywords to search for on the web (e.g. "نتيجة مباراة ريال مدريد الأخيرة", "Real Madrid latest match result", "Amdahl law formula", "قانون أمداهل").',
      },
      max_results: {
        type: 'integer',
        description: 'Number of search results to return (default: 5, max: 10).',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.webSearch) {
        return { success: false, error: 'Desktop visionAPI.webSearch is not available in current environment.' };
      }
      const res = await api.webSearch(input.query, input.max_results || 5);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'Failed to perform web search',
          message: `Search failed: ${res.error || 'Unknown error'}`,
        };
      }

      const results = res.results || [];
      if (results.length === 0) {
        return {
          success: true,
          output: { query: input.query, results: [] },
          message: `No web results found for "${input.query}".`,
        };
      }

      const formatted = results
        .map((r: any, i: number) => `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   Snippet: ${r.snippet}`)
        .join('\n\n');

      return {
        success: true,
        output: { query: input.query, results },
        message: `Found ${results.length} web search results for "${input.query}":\n\n${formatted}`,
        metadata: { count: results.length, query: input.query },
      };
    },
  });

  // 10.2 Fetch & Clean Web Page Content
  const fetchWebPageTool = createTool({
    name: 'fetch_web_page',
    description: 'Fetch and extract the clean textual content of a specific web page or URL. Use this to read the full details of an article, paper, documentation, or reference website.',
    category: 'browser',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      url: z.string().min(1, 'Target URL is required'),
      max_length: z.number().int().min(500).max(10000).optional(),
    }),
    paramDescriptions: {
      url: {
        type: 'string',
        description: 'The target website URL to read (e.g. "https://en.wikipedia.org/wiki/Amdahl%27s_law").',
      },
      max_length: {
        type: 'integer',
        description: 'Maximum characters of text to return (default: 4000).',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.fetchWebPage) {
        return { success: false, error: 'Desktop visionAPI.fetchWebPage is not available in current environment.' };
      }
      const res = await api.fetchWebPage(input.url, input.max_length || 4000);
      if (!res.success) {
        return {
          success: false,
          error: res.error || `Failed to fetch webpage at ${input.url}`,
          message: `Error fetching URL: ${res.error || 'Unknown error'}`,
        };
      }

      return {
        success: true,
        output: {
          url: res.url,
          title: res.title,
          characterCount: res.characterCount,
          content: res.content,
        },
        message: `Successfully fetched web page: "${res.title || res.url}" (${res.characterCount} chars):\n\n${res.content}`,
        metadata: { url: res.url, title: res.title },
      };
    },
  });

  // 11. Computer Vision: Visual Screen Inspection & Analysis
  const analyzeScreenTool = createTool({
    name: 'analyze_screen',
    description: 'Capture a high-resolution screenshot of the computer screen (Display 1 or Display 2) and visually inspect/analyze it with the multimodal computer vision model (Qwen3-VL / Gemini Vision). Use this whenever the user asks "what is on my screen", "read the error", "see this code", "look at what is open", or asks for visual inspection of the desktop.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      prompt: z.string().optional(),
      screen_index: z.number().int().min(0).max(5).optional(),
    }),
    paramDescriptions: {
      prompt: {
        type: 'string',
        description: 'Specific question or instruction for analyzing the screen (e.g. "What error is showing?", "Describe the open code", "What applications are visible?").',
      },
      screen_index: {
        type: 'integer',
        description: 'Monitor index to capture (0 for primary display, 1 for secondary display). Defaults to 0.',
      },
    },
    async execute(input) {
      const res = await visionService.analyzeScreen({
        screenIndex: input.screen_index,
        prompt: input.prompt,
      });
      return {
        success: res.success,
        output: res.analysis,
        message: res.analysis,
        error: res.error,
        metadata: {
          filePath: res.filePath,
          dataUrl: res.dataUrl,
          width: res.width,
          height: res.height,
          screenName: res.screenName,
          modelUsed: res.modelUsed,
        },
      };
    },
  });

  // 12. Computer Vision: Local Image File Analysis
  const analyzeImageFileTool = createTool({
    name: 'analyze_image_file',
    description: 'Visually inspect and analyze a local image file (PNG, JPG, JPEG, WEBP, BMP) using the multimodal computer vision model. Extract text, inspect diagrams, code, UI screenshots, or describe visual contents.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      file_path: z.string().min(1, 'File path is required'),
      prompt: z.string().optional(),
    }),
    paramDescriptions: {
      file_path: {
        type: 'string',
        description: 'Absolute or relative filesystem path to the image file to inspect.',
      },
      prompt: {
        type: 'string',
        description: 'Specific question or instruction for analyzing the image.',
      },
    },
    async execute(input) {
      const res = await visionService.analyzeImageFile(input.file_path, input.prompt);
      return {
        success: res.success,
        output: res.analysis,
        message: res.analysis,
        error: res.error,
        metadata: {
          filePath: res.filePath,
          dataUrl: res.dataUrl,
          modelUsed: res.modelUsed,
        },
      };
    },
  });

  // 13. Save Memory (Record fact, preference, workflow, rule, project note)
  const saveMemoryTool = createTool({
    name: 'save_memory',
    description: 'Save or record a new fact, rule, user preference, workflow procedure, or project detail into VISION\'s persistent memory so it is remembered across all future conversations. Use this whenever the user asks to remember something, states a preference, or shares important project facts.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      category: z.enum(['user_preference', 'project', 'workflow', 'system_knowledge', 'session_archive', 'conversation_summary']),
      title: z.string().min(1, 'Title is required'),
      content: z.string().min(1, 'Content is required'),
      tags: z.array(z.string()).optional(),
      importance: z.number().int().min(1).max(5).optional(),
    }),
    paramDescriptions: {
      category: {
        type: 'string',
        description: 'Memory category: "user_preference" (user habits/preferences), "project" (codebase/app info), "workflow" (repeated procedures/commands), "system_knowledge" (OS/hardware specs), or "conversation_summary".',
      },
      title: {
        type: 'string',
        description: 'Short descriptive title for this memory item.',
      },
      content: {
        type: 'string',
        description: 'Detailed fact, rule, instruction, or knowledge text to store.',
      },
      tags: {
        type: 'array',
        description: 'Optional list of keyword tags for fast indexing (e.g. ["preferences", "vscode", "ahmed"]).',
      },
      importance: {
        type: 'integer',
        description: 'Importance rating from 1 (minor note) to 5 (critical foundational identity/rule). Defaults to 3.',
      },
    },
    async execute(input) {
      const saved = await memoryManager.save({
        category: input.category,
        title: input.title,
        content: input.content,
        tags: input.tags,
        importance: input.importance,
        source: 'agent_learned',
      });
      return {
        success: true,
        output: saved,
        message: `Successfully saved to memory [${saved.category}]: "${saved.title}" (ID: ${saved.id})`,
      };
    },
  });

  // 14. Search Memory
  const searchMemoryTool = createTool({
    name: 'search_memory',
    description: 'Search VISION\'s persistent memory and knowledge base for relevant facts, notes, user preferences, project details, or conversation history summaries matching a keyword query.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      query: z.string().min(1, 'Search query is required'),
      category: z.enum(['user_preference', 'project', 'workflow', 'system_knowledge', 'session_archive', 'conversation_summary']).optional(),
    }),
    paramDescriptions: {
      query: {
        type: 'string',
        description: 'Keywords or search phrase to look for in titles, contents, and tags.',
      },
      category: {
        type: 'string',
        description: 'Optional filter by memory category.',
      },
    },
    async execute(input) {
      const results = memoryManager.search(input.query, input.category);
      return {
        success: true,
        output: results,
        message: results.length > 0
          ? `Found ${results.length} memory item(s) matching "${input.query}":\n` +
            results.map((r, i) => `${i + 1}. [${r.category}] ${r.title} (ID: ${r.id}): ${r.content.slice(0, 120)}...`).join('\n')
          : `No memory items matched query "${input.query}".`,
      };
    },
  });

  // 15. Update Memory
  const updateMemoryTool = createTool({
    name: 'update_memory',
    description: 'Update or refine an existing memory item with corrected details, new facts, or revised rules by its memory ID.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      id: z.string().min(1, 'Memory ID is required'),
      title: z.string().optional(),
      content: z.string().optional(),
      category: z.enum(['user_preference', 'project', 'workflow', 'system_knowledge', 'session_archive', 'conversation_summary']).optional(),
      tags: z.array(z.string()).optional(),
      importance: z.number().int().min(1).max(5).optional(),
    }),
    paramDescriptions: {
      id: {
        type: 'string',
        description: 'Unique ID of the existing memory item to update.',
      },
      title: {
        type: 'string',
        description: 'New title (optional).',
      },
      content: {
        type: 'string',
        description: 'Updated content/facts (optional).',
      },
      category: {
        type: 'string',
        description: 'Updated category (optional).',
      },
      tags: {
        type: 'array',
        description: 'Updated tags list (optional).',
      },
      importance: {
        type: 'integer',
        description: 'Updated importance rating 1-5 (optional).',
      },
    },
    async execute(input) {
      const existing = memoryManager.get(input.id);
      if (!existing) {
        return { success: false, error: `Memory item with ID "${input.id}" not found.` };
      }
      const updated = await memoryManager.save({
        id: input.id,
        category: input.category || existing.category,
        title: input.title || existing.title,
        content: input.content || existing.content,
        tags: input.tags || existing.tags,
        importance: input.importance ?? existing.importance,
        source: 'agent_learned',
      });
      return {
        success: true,
        output: updated,
        message: `Updated memory item "${updated.title}" (ID: ${updated.id}) successfully.`,
      };
    },
  });

  // 16. Delete Memory
  const deleteMemoryTool = createTool({
    name: 'delete_memory',
    description: 'Delete an obsolete, incorrect, or duplicate memory item from persistent storage by its ID. Requires explicit authorization.',
    category: 'system',
    permissionLevel: 3,
    riskLevel: 'HIGH',
    schema: z.object({
      id: z.string().min(1, 'Memory ID is required'),
    }),
    paramDescriptions: {
      id: {
        type: 'string',
        description: 'The unique ID of the memory item to delete.',
      },
    },
    async execute(input) {
      const existing = memoryManager.get(input.id);
      const title = existing?.title || input.id;
      const ok = await memoryManager.delete(input.id);
      return {
        success: ok,
        output: { id: input.id, deleted: ok },
        message: ok ? `Deleted memory item "${title}" from storage.` : `Memory item with ID "${input.id}" was not found.`,
      };
    },
  });

  // 17. List Memories
  const listMemoryTool = createTool({
    name: 'list_memory',
    description: 'List all memory items stored in VISION\'s persistent memory, optionally filtered by category.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      category: z.enum(['user_preference', 'project', 'workflow', 'system_knowledge', 'session_archive', 'conversation_summary']).optional(),
    }),
    paramDescriptions: {
      category: {
        type: 'string',
        description: 'Optional category to filter by.',
      },
    },
    async execute(input) {
      const items = memoryManager.getAll(input.category);
      return {
        success: true,
        output: items,
        message: `Found ${items.length} memory item(s)${input.category ? ` in category "${input.category}"` : ''}:\n` +
          items.map((m, i) => `${i + 1}. [${m.category}] ${m.title} (ID: ${m.id})`).join('\n'),
      };
    },
  });

  // 18. Search Contacts Address Book
  const searchContactsTool = createTool({
    name: 'search_contacts',
    description: 'Search Ahmed\'s phone contacts address book by name, nickname (e.g. "خالتي منال", "عمي سعيد", "خالد", "Atef"), or phone number digits. Returns contact IDs, full names, and normalized phone numbers.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      query: z.string().optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    paramDescriptions: {
      query: {
        type: 'string',
        description: 'Name, nickname, keyword, or phone number to look up in contacts.',
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of contact matches to return (default: 10).',
      },
    },
    async execute(input) {
      await contactManager.init();
      const results = contactManager.search(input.query || '', input.limit || 10);
      if (results.length === 0) {
        return {
          success: true,
          output: [],
          message: `No contacts found matching "${input.query || ''}". Total contacts in database: ${contactManager.count}.`,
        };
      }

      const formatted = results
        .map((c, i) => `${i + 1}. **${c.name}**\n   Phone: ${c.primaryPhone || 'No phone'}\n   ID: ${c.id}`)
        .join('\n');

      return {
        success: true,
        output: results,
        message: `Found ${results.length} contact(s):\n\n${formatted}`,
        metadata: { count: results.length, total: contactManager.count },
      };
    },
  });

  // 19. Get Contact Details
  const getContactTool = createTool({
    name: 'get_contact',
    description: 'Look up specific contact details from Ahmed\'s address book by contact name or phone number.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      name_or_phone: z.string().min(1, 'Name or phone is required'),
    }),
    paramDescriptions: {
      name_or_phone: {
        type: 'string',
        description: 'Exact or partial name, nickname, or phone number of the contact.',
      },
    },
    async execute(input) {
      await contactManager.init();
      const match = contactManager.findBestMatch(input.name_or_phone);
      if (!match) {
        return {
          success: false,
          error: `Contact "${input.name_or_phone}" not found in address book.`,
          message: `Could not find contact "${input.name_or_phone}". Use search_contacts to find available names.`,
        };
      }

      return {
        success: true,
        output: match,
        message: `Contact Found: **${match.name}**\nPrimary Phone: ${match.primaryPhone || 'N/A'}\nAll Phones: ${match.phones.map(p => p.raw).join(', ')}\nID: ${match.id}`,
      };
    },
  });

  // 20. List Contacts
  const listContactsTool = createTool({
    name: 'list_contacts',
    description: 'List saved contacts from Ahmed\'s address book with total count and contact overview.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      limit: z.number().int().min(1).max(100).optional(),
    }),
    paramDescriptions: {
      limit: {
        type: 'integer',
        description: 'Maximum contacts to display (default: 20).',
      },
    },
    async execute(input) {
      await contactManager.init();
      const all = contactManager.getAll();
      const slice = all.slice(0, input.limit || 20);
      return {
        success: true,
        output: { total: all.length, contacts: slice },
        message: `Address Book contains ${all.length} contacts. Showing first ${slice.length}:\n` +
          slice.map((c, i) => `${i + 1}. ${c.name} (${c.primaryPhone || 'no phone'})`).join('\n'),
      };
    },
  });

  // 21. Send WhatsApp Message
  const sendWhatsAppMessageTool = createTool({
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp message to a recipient by contact name (e.g. "خالتي منال", "عمي سعيد", "Atef Hany") or phone number. Resolves contact name automatically from address book, opens chat, and sends the message.',
    category: 'browser',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      recipient: z.string().min(1, 'Recipient name or phone number is required'),
      message: z.string().min(1, 'Message text is required'),
      auto_send: z.boolean().optional(),
    }),
    paramDescriptions: {
      recipient: {
        type: 'string',
        description: 'Name of the contact in Ahmed\'s address book (e.g. "خالتي منال", "خالد") or direct phone number (e.g. "01018515861", "+2010...").',
      },
      message: {
        type: 'string',
        description: 'The text message to send on WhatsApp.',
      },
      auto_send: {
        type: 'boolean',
        description: 'Whether to automatically send the message (hits Enter). Defaults to true.',
      },
    },
    async execute(input) {
      await contactManager.init();
      let targetPhone = '';
      let targetName = input.recipient;

      // 1. Check if recipient references Ahmed himself (e.g. "رقمي", "الرقم بتاعي", "أنا", "me")
      if (contactManager.isSelfQuery(input.recipient)) {
        const self = contactManager.getSelfContact();
        targetPhone = self.primaryPhone || '201140409832';
        targetName = 'Ahmed Mohamed Attia (رقمي)';
      }
      // 2. Reject hallucinated placeholder dummy numbers
      else if (isDummyPhoneNumber(input.recipient)) {
        return {
          success: false,
          error: `Blocked hallucinated placeholder phone number "${input.recipient}".`,
          message: `تم إلغاء الإرسال: الرقم "${input.recipient}" هو رقم وهمي تخيلي غير حقيقي. يرجى تزويدي بالرقم الفعلي أو اسم جهة الاتصال.`,
        };
      } else {
        const digits = input.recipient.replace(/[^\d]/g, '');
        if (digits.length >= 8) {
          targetPhone = normalizePhoneNumber(input.recipient);
        } else {
          // Look up in contacts
          const match = contactManager.findBestMatch(input.recipient);
          if (match && match.primaryPhone) {
            targetPhone = match.primaryPhone;
            targetName = match.name;
          } else {
            return {
              success: false,
              error: `Could not find phone number for contact "${input.recipient}".`,
              message: `Contact "${input.recipient}" was not found or has no phone number in address book.`,
            };
          }
        }
      }

      if (isDummyPhoneNumber(targetPhone)) {
        return {
          success: false,
          error: `Blocked hallucinated dummy phone number "${targetPhone}".`,
          message: `تم إلغاء الإرسال: الرقم "${targetPhone}" هو رقم تجريبي وهمي غير حقيقي.`,
        };
      }

      // Auto-heal message if it contains Chinese tokens or placeholder text (like "ال报告显示内容" or "تقرير")
      let finalMessage = input.message;
      if (/[\u4e00-\u9fa5]/.test(finalMessage) || /^(ال)?(تقرير|تحليل)(\s+بالعربي)?$/i.test(finalMessage.trim())) {
        const recentTurns = memoryManager.getSessionTurns();
        for (let i = recentTurns.length - 1; i >= 0; i--) {
          const resp = recentTurns[i].agentResponse;
          if (resp && resp.length > 40) {
            finalMessage = resp;
            break;
          }
        }
      }

      const api = getVisionAPI();
      if (!api?.sendWhatsAppMessage) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }

      const res = await api.sendWhatsAppMessage({
        phone: targetPhone,
        message: finalMessage,
        autoSend: input.auto_send !== false,
      });

      if (!res.success) {
        return { success: false, error: res.error, message: `Failed to send WhatsApp message: ${res.error}` };
      }

      return {
        success: true,
        output: { recipient: targetName, phone: targetPhone, message: finalMessage },
        message: `Successfully drafted and sent WhatsApp message to ${targetName} (${targetPhone}): "${finalMessage.slice(0, 100)}..."`,
      };
    },
  });

  // 22. Send WhatsApp Screenshot / Image
  const sendWhatsAppScreenshotTool = createTool({
    name: 'send_whatsapp_screenshot',
    description: 'Capture a high-resolution screenshot of the screen (0 for primary, 1 for secondary display) and send it directly via WhatsApp in ONE clean step. DO NOT call analyze_screen first.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      recipient: z.string().min(1, 'Recipient name or phone number is required'),
      screen_index: z.number().int().min(0).max(5).optional(),
      caption: z.string().optional(),
      auto_send: z.boolean().optional(),
    }),
    paramDescriptions: {
      recipient: {
        type: 'string',
        description: 'Name of the contact, "رقمي" for self, or direct phone number to send the screenshot to.',
      },
      screen_index: {
        type: 'integer',
        description: 'Screen display index to capture (0 for primary, 1 for secondary). Defaults to 0.',
      },
      caption: {
        type: 'string',
        description: 'Optional caption or accompanying text to send with the screenshot.',
      },
      auto_send: {
        type: 'boolean',
        description: 'Whether to automatically send the image. Defaults to true.',
      },
    },
    async execute(input) {
      await contactManager.init();
      let targetPhone = '';
      let targetName = input.recipient;

      // 1. Check if recipient references Ahmed himself (e.g. "رقمي", "الرقم بتاعي", "أنا", "me")
      if (contactManager.isSelfQuery(input.recipient)) {
        const self = contactManager.getSelfContact();
        targetPhone = self.primaryPhone || '201140409832';
        targetName = 'Ahmed Mohamed Attia (رقمي)';
      }
      // 2. Reject hallucinated placeholder dummy numbers
      else if (isDummyPhoneNumber(input.recipient)) {
        return {
          success: false,
          error: `Blocked hallucinated placeholder phone number "${input.recipient}".`,
          message: `تم إلغاء الإرسال: الرقم "${input.recipient}" هو رقم وهمي تخيلي غير حقيقي. يرجى تزويدي بالرقم الفعلي أو اسم جهة الاتصال.`,
        };
      } else {
        const digits = input.recipient.replace(/[^\d]/g, '');
        if (digits.length >= 8) {
          targetPhone = normalizePhoneNumber(input.recipient);
        } else {
          const match = contactManager.findBestMatch(input.recipient);
          if (match && match.primaryPhone) {
            targetPhone = match.primaryPhone;
            targetName = match.name;
          } else {
            return {
              success: false,
              error: `Could not find phone number for contact "${input.recipient}".`,
              message: `Contact "${input.recipient}" was not found or has no phone number.`,
            };
          }
        }
      }

      if (isDummyPhoneNumber(targetPhone)) {
        return {
          success: false,
          error: `Blocked hallucinated dummy phone number "${targetPhone}".`,
          message: `تم إلغاء الإرسال: الرقم "${targetPhone}" هو رقم تجريبي وهمي غير حقيقي.`,
        };
      }

      const api = getVisionAPI();
      if (!api?.takeScreenshot || !api?.sendWhatsAppMedia) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }

      // Step 1: Take screenshot
      const screenRes = await api.takeScreenshot({ screenIndex: input.screen_index || 0 });
      if (!screenRes.success || !screenRes.filePath) {
        return { success: false, error: screenRes.error || 'Failed to capture screenshot.' };
      }

      // Auto-heal placeholder captions (e.g. "[Analysis summary from previous step]")
      let finalCaption = input.caption;
      if (finalCaption && /\[(?:Analysis|summary|report|previous step|content)[^\]]*\]/i.test(finalCaption)) {
        let healed = false;
        const recentTurns = memoryManager.getSessionTurns();
        for (let i = recentTurns.length - 1; i >= 0; i--) {
          const resp = recentTurns[i].agentResponse;
          if (resp && resp.length > 30) {
            finalCaption = resp.slice(0, 300);
            healed = true;
            break;
          }
        }
        if (!healed) {
          finalCaption = finalCaption.replace(/:\s*\[[^\]]+\]/g, '').replace(/\[[^\]]+\]/g, '').trim() || undefined;
        }
      }

      // Step 2: Send via WhatsApp media
      const mediaRes = await api.sendWhatsAppMedia({
        phone: targetPhone,
        mediaPath: screenRes.filePath,
        caption: finalCaption,
        autoSend: input.auto_send !== false,
      });

      if (!mediaRes.success) {
        return { success: false, error: mediaRes.error };
      }

      return {
        success: true,
        output: { recipient: targetName, phone: targetPhone, screenshotPath: screenRes.filePath },
        message: `Captured screenshot of screen ${input.screen_index || 0} and sent to ${targetName} (${targetPhone}) on WhatsApp successfully.`,
      };
    },
  });

  // 23. Read WhatsApp Chat via Computer Vision
  const readWhatsAppChatTool = createTool({
    name: 'read_whatsapp_chat',
    description: 'Open a contact\'s WhatsApp chat and use computer vision to visually inspect and read the recent messages, conversation history, and status on screen.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      contact_name: z.string().optional(),
      prompt: z.string().optional(),
    }),
    paramDescriptions: {
      contact_name: {
        type: 'string',
        description: 'Optional contact name to open first in WhatsApp before reading.',
      },
      prompt: {
        type: 'string',
        description: 'Specific question or detail to look for in the chat (e.g. "What did they last say?", "Read the unread messages").',
      },
    },
    async execute(input) {
      await contactManager.init();
      const api = getVisionAPI();
      if (input.contact_name && api?.openWhatsAppChat) {
        const match = contactManager.findBestMatch(input.contact_name);
        const phone = match?.primaryPhone || normalizePhoneNumber(input.contact_name);
        if (phone) {
          await api.openWhatsAppChat({ phone });
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      const visionPrompt = input.prompt
        ? `Focus on the WhatsApp conversation window on screen: ${input.prompt}. Transcribe the recent messages, senders, and timestamps.`
        : `Read the WhatsApp conversation visible on screen. Extract the last 5 messages, stating who sent each message, what it says, and the timestamp.`;

      const analysis = await visionService.analyzeScreen({ prompt: visionPrompt });
      if (!analysis.success) {
        return { success: false, error: analysis.error || 'Failed to visually inspect WhatsApp chat.' };
      }

      return {
        success: true,
        output: { analysis: analysis.analysis },
        message: `WhatsApp Chat Analysis:\n\n${analysis.analysis}`,
      };
    },
  });

  // 24. Send WhatsApp File / Document
  const sendWhatsAppFileTool = createTool({
    name: 'send_whatsapp_file',
    description: 'Send any file, document, PDF, code file, report, or image directly via WhatsApp to a contact (e.g. "خالتي منال", "Atef") or self ("رقمي"). Automatically copies the file to the Windows clipboard file object, opens the chat, and sends it.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      recipient: z.string().min(1, 'Recipient name or phone number is required'),
      file_path: z.string().min(1, 'File path or filename is required'),
      caption: z.string().optional(),
      auto_send: z.boolean().optional(),
    }),
    paramDescriptions: {
      recipient: {
        type: 'string',
        description: 'Name of the contact in address book, "رقمي" for self, or direct phone number.',
      },
      file_path: {
        type: 'string',
        description: 'Absolute or relative path or filename of the file/document to send.',
      },
      caption: {
        type: 'string',
        description: 'Optional caption or message text to accompany the file.',
      },
      auto_send: {
        type: 'boolean',
        description: 'Whether to automatically send the file. Defaults to true.',
      },
    },
    async execute(input) {
      await contactManager.init();
      let targetPhone = '';
      let targetName = input.recipient;

      // 1. Check if recipient references Ahmed himself (e.g. "رقمي", "الرقم بتاعي", "أنا", "me")
      if (contactManager.isSelfQuery(input.recipient)) {
        const self = contactManager.getSelfContact();
        targetPhone = self.primaryPhone || '201140409832';
        targetName = 'Ahmed Mohamed Attia (رقمي)';
      }
      // 2. Reject hallucinated placeholder dummy numbers
      else if (isDummyPhoneNumber(input.recipient)) {
        return {
          success: false,
          error: `Blocked hallucinated placeholder phone number "${input.recipient}".`,
          message: `تم إلغاء الإرسال: الرقم "${input.recipient}" هو رقم وهمي تخيلي غير حقيقي. يرجى تزويدي بالرقم الفعلي أو اسم جهة الاتصال.`,
        };
      } else {
        const digits = input.recipient.replace(/[^\d]/g, '');
        if (digits.length >= 8) {
          targetPhone = normalizePhoneNumber(input.recipient);
        } else {
          const match = contactManager.findBestMatch(input.recipient);
          if (match && match.primaryPhone) {
            targetPhone = match.primaryPhone;
            targetName = match.name;
          } else {
            return {
              success: false,
              error: `Could not find phone number for contact "${input.recipient}".`,
              message: `Contact "${input.recipient}" was not found or has no phone number in address book.`,
            };
          }
        }
      }

      if (isDummyPhoneNumber(targetPhone)) {
        return {
          success: false,
          error: `Blocked hallucinated dummy phone number "${targetPhone}".`,
          message: `تم إلغاء الإرسال: الرقم "${targetPhone}" هو رقم تجريبي وهمي غير حقيقي.`,
        };
      }

      const cleanFilePath = input.file_path.trim();

      let finalCaption = input.caption;
      if (finalCaption && /\[(?:Analysis|summary|report|previous step|content)[^\]]*\]/i.test(finalCaption)) {
        finalCaption = undefined;
      }

      const api = getVisionAPI();
      if (!api?.sendWhatsAppFile) {
        return { success: false, error: 'Desktop visionAPI not available in current environment.' };
      }

      const res = await api.sendWhatsAppFile({
        phone: targetPhone,
        filePath: cleanFilePath,
        caption: finalCaption,
        autoSend: input.auto_send !== false,
      });

      if (!res.success) {
        return { success: false, error: res.error, message: `Failed to send file via WhatsApp: ${res.error}` };
      }

      const sizeStr = res.fileSize ? ` (${(res.fileSize / 1024).toFixed(1)} KB)` : '';
      return {
        success: true,
        output: {
          recipient: targetName,
          phone: targetPhone,
          filePath: res.filePath,
          fileName: res.fileName,
          fileSize: res.fileSize,
        },
        message: `Successfully sent file "${res.fileName || input.file_path}"${sizeStr} to ${targetName} (${targetPhone}) on WhatsApp.`,
      };
    },
  });

  // =========================================================================
  // SAFE FILESYSTEM MICRO-TOOLS
  // =========================================================================

  // 1. Read File Tool (Smart, Paginated & Context Protected)
  const readFileTool = createTool({
    name: 'read_file',
    description: 'Safely read file contents with pagination, line slicing (startLine/endLine), and context overflow protection.',
    category: 'filesystem',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      filePath: z.string().describe('المسار المطلق أو النسبي للملف'),
      startLine: z.number().int().positive().optional().describe('رقم سطر البداية (اختياري للقراءة الجزئية)'),
      endLine: z.number().int().positive().optional().describe('رقم سطر النهاية'),
      maxLines: z.number().int().positive().default(500).describe('أقصى عدد أسطر لمنع امتلاء سياق الموديل'),
    }),
    paramDescriptions: {
      filePath: {
        type: 'string',
        description: 'Absolute or relative path to the file to read.',
      },
      startLine: {
        type: 'integer',
        description: 'Optional starting line number (1-indexed) for paginated reading.',
      },
      endLine: {
        type: 'integer',
        description: 'Optional ending line number.',
      },
      maxLines: {
        type: 'integer',
        description: 'Maximum lines to read (default 500) to protect LLM context length.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.fsReadFile) {
        return { success: false, error: 'Safe filesystem API not available in current environment.' };
      }
      const res = await api.fsReadFile(input);
      if (!res.success) {
        return { success: false, error: res.error, message: `Failed to read file: ${res.error}` };
      }
      return {
        success: true,
        output: res,
        message: `Read ${res.lineCount} lines (${res.startLine}-${res.endLine} of ${res.totalLines} total lines) from "${res.fileName}"${res.truncated ? ' [truncated]' : ''}.`,
      };
    },
  });

  // 2. Write File Tool (Backup-Protected Creation & Overwrite)
  const writeFileTool = createTool({
    name: 'write_file',
    description: 'Create or overwrite a file. Supports automatic parent directory creation and automatically creates a .bak backup before overwriting existing files.',
    category: 'filesystem',
    permissionLevel: 2,
    riskLevel: 'MEDIUM',
    schema: z.object({
      filePath: z.string().describe('مسار حفظ الملف'),
      content: z.string().describe('محتوى الملف'),
      overwrite: z.boolean().default(false).describe('هل يُسمح باستبدال الملف لو كان موجوداً مسبقاً؟'),
      createDirs: z.boolean().default(true).describe('إنشاء المجلدات الأبوية تلقائياً إذا لم تكن موجودة'),
    }),
    paramDescriptions: {
      filePath: {
        type: 'string',
        description: 'File path to write.',
      },
      content: {
        type: 'string',
        description: 'Content to write into the file.',
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to allow overwriting if file already exists (creates a .bak backup). Defaults to false.',
      },
      createDirs: {
        type: 'boolean',
        description: 'Automatically create parent directories if they do not exist. Defaults to true.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.fsWriteFile) {
        return { success: false, error: 'Safe filesystem API not available in current environment.' };
      }
      const res = await api.fsWriteFile(input);
      if (!res.success) {
        return { success: false, error: res.error, message: res.error };
      }
      return {
        success: true,
        output: res,
        message: res.message || `Successfully wrote file "${res.fileName}" (${res.bytesWritten} bytes).`,
      };
    },
  });

  // 3. Edit File Tool (Surgical Find & Replace)
  const editFileTool = createTool({
    name: 'edit_file',
    description: 'Surgically edit an existing file by replacing exact target text with replacement text. Automatically creates a .bak backup.',
    category: 'filesystem',
    permissionLevel: 2,
    riskLevel: 'MEDIUM',
    schema: z.object({
      filePath: z.string().describe('مسار الملف المطلوب تعديله'),
      targetText: z.string().describe('النص القديم المراد استبداله بدقة'),
      replacementText: z.string().describe('النص الجديد البديل'),
    }),
    paramDescriptions: {
      filePath: {
        type: 'string',
        description: 'Path of the file to modify.',
      },
      targetText: {
        type: 'string',
        description: 'Exact text block within the file to replace.',
      },
      replacementText: {
        type: 'string',
        description: 'New replacement text to substitute.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.fsEditFile) {
        return { success: false, error: 'Safe filesystem API not available in current environment.' };
      }
      const res = await api.fsEditFile(input);
      if (!res.success) {
        return { success: false, error: res.error, message: res.error };
      }
      return {
        success: true,
        output: res,
        message: res.message || `Successfully edited "${res.fileName}" (${res.occurrencesReplaced} occurrence(s) replaced).`,
      };
    },
  });

  // 4. Search Files Tool (Name Pattern & Content Grep)
  const searchFilesTool = createTool({
    name: 'search_files',
    description: 'Search files and folders by filename pattern (e.g. *.ts, report_*.pdf) or by searching text inside file contents.',
    category: 'filesystem',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      directory: z.string().describe('المجلد المطلوب البحث داخله'),
      fileNamePattern: z.string().optional().describe('نمط اسم الملف مثل: *.ts أو report_*.pdf'),
      queryText: z.string().optional().describe('نص للبحث عنه داخل محتوى الملفات (Grep)'),
      maxResults: z.number().int().positive().default(20).describe('أقصى عدد نتائج'),
      recursive: z.boolean().default(true).describe('البحث في المجلدات الفرعية بشكل متكرر'),
    }),
    paramDescriptions: {
      directory: {
        type: 'string',
        description: 'Base directory to search inside.',
      },
      fileNamePattern: {
        type: 'string',
        description: 'Optional filename pattern or wildcard (e.g. "*.ts", "report_*.pdf", "*config*").',
      },
      queryText: {
        type: 'string',
        description: 'Optional text string to search for inside file contents (case-insensitive grep).',
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum results to return (default 20, max 100).',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to recursively search subdirectories (default true).',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.fsSearchFiles) {
        return { success: false, error: 'Safe filesystem API not available in current environment.' };
      }
      const res = await api.fsSearchFiles(input);
      if (!res.success) {
        return { success: false, error: res.error, message: res.error };
      }
      return {
        success: true,
        output: res,
        message: res.message || `Found ${res.totalFound} matching item(s).`,
      };
    },
  });

  // 5. Trash File Tool (Safe Windows Recycle Bin Deletion)
  const trashFileTool = createTool({
    name: 'trash_file',
    description: 'Safely delete a file or folder by moving it to the Windows Recycle Bin (restorable, NOT permanent destruction).',
    category: 'filesystem',
    permissionLevel: 3,
    riskLevel: 'HIGH',
    schema: z.object({
      targetPath: z.string().describe('مسار الملف أو المجلد المراد حذفه'),
      reason: z.string().optional().describe('سبب الحذف لعرضه للمستخدم في نافذة التأكيد'),
    }),
    paramDescriptions: {
      targetPath: {
        type: 'string',
        description: 'Full or relative path of the file or directory to send to Windows Recycle Bin.',
      },
      reason: {
        type: 'string',
        description: 'Optional human-readable explanation of why this file is being deleted.',
      },
    },
    async execute(input) {
      const api = getVisionAPI();
      if (!api?.fsTrashFile) {
        return { success: false, error: 'Safe filesystem API not available in current environment.' };
      }
      const res = await api.fsTrashFile(input);
      if (!res.success) {
        return { success: false, error: res.error, message: res.error };
      }
      return {
        success: true,
        output: res,
        message: res.message || `Item "${res.itemName}" successfully moved to Windows Recycle Bin.`,
      };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 1: WhatsApp Automation Hub (whatsapp_tool)
  // =========================================================================
  const whatsappTool = createTool({
    name: 'whatsapp_tool',
    description: 'Unified WhatsApp automation hub for Ahmed. Send messages, send files/documents/PDFs, capture and send screenshots, or read WhatsApp chats via computer vision.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['send_message', 'send_file', 'send_screenshot', 'read_chat']),
      recipient: z.string().optional(),
      message: z.string().optional(),
      file_path: z.string().optional(),
      screen_index: z.number().int().min(0).max(5).optional(),
      caption: z.string().optional(),
      contact_name: z.string().optional(),
      prompt: z.string().optional(),
      auto_send: z.boolean().optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'WhatsApp operation: "send_message" (text), "send_file" (documents/PDFs/code), "send_screenshot" (screen capture), or "read_chat" (visual inspection).',
        enum: ['send_message', 'send_file', 'send_screenshot', 'read_chat'],
      },
      recipient: {
        type: 'string',
        description: 'Contact name in Ahmed\'s address book (e.g. "خالتي منال", "عمي سعيد", "خالد", "Atef"), "رقمي" for self, or direct phone number.',
      },
      message: {
        type: 'string',
        description: 'Text message to send (for action="send_message").',
      },
      file_path: {
        type: 'string',
        description: 'File path or filename to send (for action="send_file").',
      },
      screen_index: {
        type: 'integer',
        description: 'Screen display index to capture (0 for primary, 1 for secondary). Defaults to 0.',
      },
      caption: {
        type: 'string',
        description: 'Optional caption to accompany file or screenshot.',
      },
      contact_name: {
        type: 'string',
        description: 'Optional contact name to open before reading chat.',
      },
      prompt: {
        type: 'string',
        description: 'Specific detail to look for when inspecting chat (for action="read_chat").',
      },
      auto_send: {
        type: 'boolean',
        description: 'Whether to automatically send. Defaults to true.',
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      if (input.action === 'send_message') {
        if (!input.recipient || !input.message) {
          return { success: false, error: 'Recipient and message are required for send_message.' };
        }
        return await sendWhatsAppMessageTool.execute({
          recipient: input.recipient,
          message: input.message,
          auto_send: input.auto_send,
        });
      }
      if (input.action === 'send_file') {
        if (!input.recipient || !input.file_path) {
          return { success: false, error: 'Recipient and file_path are required for send_file.' };
        }
        return await sendWhatsAppFileTool.execute({
          recipient: input.recipient,
          file_path: input.file_path,
          caption: input.caption,
          auto_send: input.auto_send,
        });
      }
      if (input.action === 'send_screenshot') {
        if (!input.recipient) {
          return { success: false, error: 'Recipient is required for send_screenshot.' };
        }
        return await sendWhatsAppScreenshotTool.execute({
          recipient: input.recipient,
          screen_index: input.screen_index,
          caption: input.caption,
          auto_send: input.auto_send,
        });
      }
      if (input.action === 'read_chat') {
        return await readWhatsAppChatTool.execute({
          contact_name: input.contact_name,
          prompt: input.prompt,
        });
      }
      return { success: false, error: `Unknown WhatsApp action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 2: Memory Hub (memory_tool)
  // =========================================================================
  const memoryTool = createTool({
    name: 'memory_tool',
    description: 'Unified long-term persistent memory hub in SQLite. Save new facts/rules, search existing knowledge, update records, delete obsolete entries, or list memory items.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['save', 'search', 'update', 'delete', 'list']),
      category: z.enum(['user_preference', 'project', 'workflow', 'system_knowledge', 'session_archive', 'conversation_summary']).optional(),
      title: z.string().optional(),
      content: z.string().optional(),
      query: z.string().optional(),
      id: z.string().optional(),
      tags: z.array(z.string()).optional(),
      importance: z.number().int().min(1).max(5).optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Memory operation: "save" (record new fact), "search" (find knowledge), "update" (refine existing), "delete" (remove entry), or "list" (enumerate memories).',
        enum: ['save', 'search', 'update', 'delete', 'list'],
      },
      category: {
        type: 'string',
        description: 'Category: "user_preference", "project", "workflow", "system_knowledge", "session_archive", or "conversation_summary".',
        enum: ['user_preference', 'project', 'workflow', 'system_knowledge', 'session_archive', 'conversation_summary'],
      },
      title: {
        type: 'string',
        description: 'Title for the memory item (used for save and update).',
      },
      content: {
        type: 'string',
        description: 'Detailed knowledge text or procedure to store.',
      },
      query: {
        type: 'string',
        description: 'Search keywords or phrase (for action="search").',
      },
      id: {
        type: 'string',
        description: 'Unique memory item ID (for update and delete).',
      },
      tags: {
        type: 'array',
        description: 'List of keyword tags for fast indexing.',
      },
      importance: {
        type: 'integer',
        description: 'Importance rating from 1 to 5 (default 3).',
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      if (input.action === 'save') {
        if (!input.title || !input.content) {
          return { success: false, error: 'Title and content are required for save action.' };
        }
        return await saveMemoryTool.execute({
          category: input.category || 'system_knowledge',
          title: input.title,
          content: input.content,
          tags: input.tags,
          importance: input.importance,
        });
      }
      if (input.action === 'search') {
        if (!input.query) {
          return { success: false, error: 'Query is required for search action.' };
        }
        return await searchMemoryTool.execute({
          query: input.query,
          category: input.category,
        });
      }
      if (input.action === 'update') {
        if (!input.id) {
          return { success: false, error: 'Memory ID is required for update action.' };
        }
        return await updateMemoryTool.execute({
          id: input.id,
          title: input.title,
          content: input.content,
          category: input.category,
          tags: input.tags,
          importance: input.importance,
        });
      }
      if (input.action === 'delete') {
        if (!input.id) {
          return { success: false, error: 'Memory ID is required for delete action.' };
        }
        return await deleteMemoryTool.execute({ id: input.id });
      }
      if (input.action === 'list') {
        return await listMemoryTool.execute({ category: input.category });
      }
      return { success: false, error: `Unknown memory action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 3: Contacts Hub (contacts_tool)
  // =========================================================================
  const contactsTool = createTool({
    name: 'contacts_tool',
    description: 'Unified address book & contacts hub. Search Ahmed\'s contacts by name or phone digits, fetch full contact details, or list saved contacts.',
    category: 'system',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['search', 'get', 'list']),
      query: z.string().optional(),
      name_or_phone: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Contact action: "search" (fuzzy/phonetic search), "get" (lookup specific contact), or "list" (enumerate contacts).',
        enum: ['search', 'get', 'list'],
      },
      query: {
        type: 'string',
        description: 'Search term (name, nickname, or phone number).',
      },
      name_or_phone: {
        type: 'string',
        description: 'Name or phone number to look up (e.g. "خالتي منال", "رقمي", "Atef").',
      },
      limit: {
        type: 'integer',
        description: 'Maximum results to return.',
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      if (input.action === 'search') {
        return await searchContactsTool.execute({
          query: input.query,
          limit: input.limit,
        });
      }
      if (input.action === 'get') {
        const lookup = input.name_or_phone || input.query;
        if (!lookup) {
          return { success: false, error: 'Name or phone is required for get action.' };
        }
        return await getContactTool.execute({ name_or_phone: lookup });
      }
      if (input.action === 'list') {
        return await listContactsTool.execute({ limit: input.limit });
      }
      return { success: false, error: `Unknown contacts action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 4: Desktop Application Hub (app_control_tool)
  // =========================================================================
  const appControlTool = createTool({
    name: 'app_control_tool',
    description: 'Unified desktop application & window management hub on Windows. Launch programs, close processes, close all open windows, list running applications, or bring a window to focus.',
    category: 'app',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['launch', 'close', 'close_all', 'list_running', 'focus']),
      app_name: z.string().optional(),
      args: z.array(z.string()).optional(),
      except_apps: z.array(z.string()).optional(),
      process_name: z.string().optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'App operation: "launch" (start program), "close" (terminate program), "close_all" (close all windows), "list_running" (enumerate open apps), or "focus" (bring window to front).',
        enum: ['launch', 'close', 'close_all', 'list_running', 'focus'],
      },
      app_name: {
        type: 'string',
        description: 'Name or command of application to launch or close (e.g. "spotify", "chrome", "code", "notepad", "calc").',
      },
      args: {
        type: 'array',
        description: 'Optional command-line arguments for launching.',
      },
      except_apps: {
        type: 'array',
        description: 'Names of protected applications to keep open when closing all apps.',
      },
      process_name: {
        type: 'string',
        description: 'Process name to focus.',
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      if (input.action === 'launch') {
        if (!input.app_name) {
          return { success: false, error: 'app_name is required for launch action.' };
        }
        return await launchAppTool.execute({ app_name: input.app_name, args: input.args });
      }
      if (input.action === 'close') {
        if (!input.app_name) {
          return { success: false, error: 'app_name is required for close action.' };
        }
        return await closeAppTool.execute({ app_name: input.app_name });
      }
      if (input.action === 'close_all') {
        return await closeAllAppsTool.execute({ except_apps: input.except_apps });
      }
      if (input.action === 'list_running') {
        return await getRunningAppsTool.execute({});
      }
      if (input.action === 'focus') {
        const proc = input.process_name || input.app_name;
        if (!proc) {
          return { success: false, error: 'process_name is required for focus action.' };
        }
        return await focusAppTool.execute({ process_name: proc });
      }
      return { success: false, error: `Unknown app action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 5: Browser & Live Web Hub (browser_tool)
  // =========================================================================
  const browserTool = createTool({
    name: 'browser_tool',
    description: 'Unified web browser & internet research hub. MANDATORY for all live web searches, real-time news, sports results & match summaries (e.g. Real Madrid, Champions League, La Liga, scores), current events, fact lookups, or fetching clean webpage content.',
    category: 'browser',
    permissionLevel: 0,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['open', 'search', 'fetch_page']).default('search'),
      url: z.string().optional(),
      search_query: z.string().optional(),
      query: z.string().optional(),
      max_results: z.number().int().min(1).max(10).optional(),
      max_length: z.number().int().min(500).max(10000).optional(),
      new_window: z.boolean().optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Web operation: "search" (MANDATORY for live web search, sports scores, match reports, news, real-time facts), "open" (open URL/YouTube/browser in new tab), or "fetch_page" (read webpage content).',
        enum: ['open', 'search', 'fetch_page'],
      },
      url: {
        type: 'string',
        description: 'URL to open or read (e.g. "https://www.youtube.com", "https://en.wikipedia.org/...").',
      },
      search_query: {
        type: 'string',
        description: 'Query to search on Google when opening browser, or query for search action.',
      },
      query: {
        type: 'string',
        description: 'Search keywords for live web search via DuckDuckGo (e.g. "نتيجة مباراة ريال مدريد الأخيرة", "Real Madrid latest match result highlights", "قانون أمداهل").',
      },
      max_results: {
        type: 'integer',
        description: 'Maximum search results to return (default: 5).',
      },
      max_length: {
        type: 'integer',
        description: 'Maximum characters of webpage content to extract (default: 4000).',
      },
      new_window: {
        type: 'boolean',
        description: 'Whether to open in a separate window instead of tab.',
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      const action = input.action || (input.url ? 'open' : 'search');
      if (action === 'open') {
        return await openBrowserTool.execute({
          url: input.url,
          search_query: input.search_query,
          new_window: input.new_window,
        });
      }
      if (action === 'search') {
        const q = input.query || input.search_query;
        if (!q) {
          return { success: false, error: 'query is required for search action.' };
        }
        return await webSearchTool.execute({
          query: q,
          max_results: input.max_results,
        });
      }
      if (action === 'fetch_page') {
        if (!input.url) {
          return { success: false, error: 'url is required for fetch_page action.' };
        }
        return await fetchWebPageTool.execute({
          url: input.url,
          max_length: input.max_length,
        });
      }
      return { success: false, error: `Unknown browser action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 6: Computer Vision Hub (vision_tool)
  // =========================================================================
  const visionTool = createTool({
    name: 'vision_tool',
    description: 'Unified multimodal computer vision & screen perception hub (Qwen3-VL / Gemini Vision). Visually analyze desktop screen, inspect local image files, or take high-resolution screenshots.',
    category: 'automation',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum(['analyze_screen', 'analyze_image', 'capture_screenshot']),
      prompt: z.string().optional(),
      screen_index: z.number().int().min(0).max(5).optional(),
      file_path: z.string().optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Vision operation: "analyze_screen" (inspect active desktop display), "analyze_image" (inspect local image file), or "capture_screenshot" (take and save screenshot file without analysis).',
        enum: ['analyze_screen', 'analyze_image', 'capture_screenshot'],
      },
      prompt: {
        type: 'string',
        description: 'Specific instruction or question for visual inspection (e.g. "Read error message", "Describe open code").',
      },
      screen_index: {
        type: 'integer',
        description: 'Screen display index to capture (0 for primary, 1 for secondary). Defaults to 0.',
      },
      file_path: {
        type: 'string',
        description: 'Path to local image file to inspect (for action="analyze_image").',
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      if (input.action === 'analyze_screen') {
        return await analyzeScreenTool.execute({
          prompt: input.prompt,
          screen_index: input.screen_index,
        });
      }
      if (input.action === 'analyze_image') {
        if (!input.file_path) {
          return { success: false, error: 'file_path is required for analyze_image action.' };
        }
        return await analyzeImageFileTool.execute({
          file_path: input.file_path,
          prompt: input.prompt,
        });
      }
      if (input.action === 'capture_screenshot') {
        return await screenshotTool.execute({ screen_index: input.screen_index });
      }
      return { success: false, error: `Unknown vision action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 7: System & Terminal Hub (system_tool)
  // =========================================================================
  const systemTool = createTool({
    name: 'system_tool',
    description: 'Unified Windows operating system, terminal, hardware, media, volume, clipboard & notifications control hub. Execute CMD/PowerShell commands (including elevated/admin commands via UAC), query live hardware telemetry, check weather forecasts, control media playback (play/pause, next, previous, stop), adjust master volume precisely (get/set/mute/step), interact with clipboard (read/write/clear), and trigger native desktop toast notifications.',
    category: 'system',
    permissionLevel: 1,
    riskLevel: 'LOW',
    schema: z.object({
      action: z.enum([
        'execute_command',
        'get_telemetry',
        'get_weather',
        'media_control',
        'volume_control',
        'clipboard',
        'notify',
      ]),
      // execute_command
      command: z.string().optional(),
      cwd: z.string().optional(),
      shell: z.enum(['powershell', 'cmd', 'auto']).optional(),
      timeout: z.number().int().optional(),
      elevated: z.boolean().optional(),
      // get_weather
      city: z.string().optional(),
      // media_control
      media_action: z.enum(['play_pause', 'next', 'previous', 'stop']).optional(),
      // volume_control
      volume_action: z.enum(['get', 'set', 'mute', 'unmute', 'step_up', 'step_down']).optional(),
      volume_level: z.number().min(0).max(100).optional(),
      volume_step: z.number().min(1).max(50).optional(),
      // clipboard
      clipboard_action: z.enum(['read', 'write', 'clear']).optional(),
      clipboard_text: z.string().optional(),
      // notify
      notification_title: z.string().optional(),
      notification_message: z.string().optional(),
      notification_sound: z.boolean().optional(),
      notification_urgency: z.enum(['normal', 'critical']).optional(),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'System operation: "execute_command" (shell command), "get_telemetry" (hardware stats), "get_weather" (forecast), "media_control" (music/video control), "volume_control" (master volume), "clipboard" (read/write/clear clipboard), or "notify" (toast notification).',
        enum: ['execute_command', 'get_telemetry', 'get_weather', 'media_control', 'volume_control', 'clipboard', 'notify'],
      },
      command: {
        type: 'string',
        description: 'The shell command to execute in CMD/PowerShell (for action="execute_command").',
      },
      cwd: {
        type: 'string',
        description: 'Optional working directory.',
      },
      shell: {
        type: 'string',
        description: 'Shell to use: "powershell" (default) or "cmd". Ignored when elevated=true.',
        enum: ['powershell', 'cmd', 'auto'],
      },
      timeout: {
        type: 'integer',
        description: 'Execution timeout in milliseconds (default: 35000, elevated default: 60000).',
      },
      elevated: {
        type: 'boolean',
        description: 'Set to true to run with Administrator (elevated) privileges via UAC prompt. Required for slmgr, netsh, sfc, dism, bcdedit, service management, and registry edits.',
      },
      city: {
        type: 'string',
        description: 'City name for weather forecast (optional, defaults to current location).',
      },
      media_action: {
        type: 'string',
        description: 'Media action for action="media_control": "play_pause", "next", "previous", or "stop".',
        enum: ['play_pause', 'next', 'previous', 'stop'],
      },
      volume_action: {
        type: 'string',
        description: 'Volume action for action="volume_control": "get", "set", "mute", "unmute", "step_up", or "step_down".',
        enum: ['get', 'set', 'mute', 'unmute', 'step_up', 'step_down'],
      },
      volume_level: {
        type: 'number',
        description: 'Target volume percentage between 0 and 100 (for action="volume_control" and volume_action="set").',
      },
      volume_step: {
        type: 'number',
        description: 'Step amount in percentage for step_up or step_down (default: 5).',
      },
      clipboard_action: {
        type: 'string',
        description: 'Clipboard action for action="clipboard": "read", "write", or "clear".',
        enum: ['read', 'write', 'clear'],
      },
      clipboard_text: {
        type: 'string',
        description: 'Text to copy into clipboard (for action="clipboard" and clipboard_action="write").',
      },
      notification_title: {
        type: 'string',
        description: 'Title for desktop toast notification (for action="notify").',
      },
      notification_message: {
        type: 'string',
        description: 'Body message text for desktop toast notification (for action="notify").',
      },
      notification_sound: {
        type: 'boolean',
        description: 'Whether to play sound chime for notification (default: true).',
      },
      notification_urgency: {
        type: 'string',
        description: 'Notification urgency: "normal" or "critical".',
        enum: ['normal', 'critical'],
      },
    },
    async execute(input): Promise<ToolExecutionResult<any>> {
      if (input.action === 'execute_command') {
        if (!input.command) {
          return { success: false, error: 'command is required for execute_command action.' };
        }
        return await executeCommandTool.execute({
          command: input.command,
          cwd: input.cwd,
          shell: input.shell,
          timeout: input.timeout,
          elevated: input.elevated,
        });
      }
      if (input.action === 'get_telemetry') {
        return await telemetryTool.execute({});
      }
      if (input.action === 'get_weather') {
        return await weatherTool.execute({ city: input.city });
      }
      if (input.action === 'media_control') {
        return await mediaControlTool.execute({
          action: input.media_action || 'play_pause',
        });
      }
      if (input.action === 'volume_control') {
        return await volumeControlTool.execute({
          action: input.volume_action || 'get',
          level: input.volume_level,
          step: input.volume_step,
        });
      }
      if (input.action === 'clipboard') {
        return await clipboardTool.execute({
          action: input.clipboard_action || 'read',
          text: input.clipboard_text,
        });
      }
      if (input.action === 'notify') {
        return await systemNotificationTool.execute({
          title: input.notification_title || 'VISION Assistant',
          message: input.notification_message || 'Action completed.',
          sound: input.notification_sound,
          urgency: input.notification_urgency,
        });
      }
      return { success: false, error: `Unknown system action: ${(input as any).action}` };
    },
  });

  // =========================================================================
  // 🌟 UNIFIED DOMAIN HUB 8: Safe Filesystem Hub (filesystem_tool)
  // =========================================================================
  const filesystemTool = createTool({
    name: 'filesystem_tool',
    description: 'Unified safe filesystem operations hub. Perform safe file reading (paginated with startLine/endLine), writing (backup-protected), surgical find-and-replace editing, recursive file and content searching, and restorable deletion via the Windows Recycle Bin.',
    category: 'filesystem',
    permissionLevel: 1,
    riskLevel: 'MEDIUM',
    schema: z.object({
      action: z.enum(['read', 'write', 'edit', 'search', 'trash']).describe('Filesystem operation to perform: "read" (read file), "write" (create/update file), "edit" (surgical text replace), "search" (find files/content), or "trash" (safe Recycle Bin delete)'),
      filePath: z.string().optional().describe('Path to file (for read, write, edit)'),
      startLine: z.number().int().positive().optional().describe('Starting line number for reading (1-indexed)'),
      endLine: z.number().int().positive().optional().describe('Ending line number for reading'),
      maxLines: z.number().int().positive().optional().describe('Maximum lines to read (default 500)'),
      content: z.string().optional().describe('Content to write (for write)'),
      overwrite: z.boolean().optional().describe('Allow overwriting existing file (creates .bak backup)'),
      createDirs: z.boolean().optional().describe('Auto-create parent directories (default true)'),
      targetText: z.string().optional().describe('Existing text block to replace (for edit)'),
      replacementText: z.string().optional().describe('New replacement text (for edit)'),
      directory: z.string().optional().describe('Directory path to search in (for search)'),
      fileNamePattern: z.string().optional().describe('File name pattern/wildcard like *.ts or *.pdf (for search)'),
      queryText: z.string().optional().describe('Text to search inside files (for search)'),
      maxResults: z.number().int().positive().optional().describe('Max search results to return (for search)'),
      recursive: z.boolean().optional().describe('Whether to search subdirectories recursively (for search)'),
      targetPath: z.string().optional().describe('Path of file/folder to send to Recycle Bin (for trash)'),
      reason: z.string().optional().describe('Reason for deletion to show user (for trash)'),
    }),
    paramDescriptions: {
      action: {
        type: 'string',
        description: 'Operation: "read" (read file), "write" (create/overwrite file), "edit" (find & replace), "search" (find files or content), or "trash" (move to Windows Recycle Bin).',
        enum: ['read', 'write', 'edit', 'search', 'trash'],
      },
      filePath: {
        type: 'string',
        description: 'Path of target file for read, write, or edit operations.',
      },
      startLine: {
        type: 'integer',
        description: 'Starting line number (1-indexed) for paginated file reading.',
      },
      endLine: {
        type: 'integer',
        description: 'Ending line number for file reading.',
      },
      maxLines: {
        type: 'integer',
        description: 'Maximum lines to read (default 500) to protect LLM context length.',
      },
      content: {
        type: 'string',
        description: 'Content to write into the file (for action="write").',
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to allow overwriting existing files with automatic .bak backup (for action="write").',
      },
      createDirs: {
        type: 'boolean',
        description: 'Auto-create parent directories if missing (for action="write").',
      },
      targetText: {
        type: 'string',
        description: 'Existing text block to find and replace (for action="edit").',
      },
      replacementText: {
        type: 'string',
        description: 'New replacement text to substitute (for action="edit").',
      },
      directory: {
        type: 'string',
        description: 'Base directory path to search inside (for action="search").',
      },
      fileNamePattern: {
        type: 'string',
        description: 'Filename pattern or wildcard e.g. *.ts or report_*.pdf (for action="search").',
      },
      queryText: {
        type: 'string',
        description: 'Text string to search for inside file contents (for action="search").',
      },
      maxResults: {
        type: 'integer',
        description: 'Max search results to return (for action="search").',
      },
      recursive: {
        type: 'boolean',
        description: 'Whether to search subdirectories recursively (for action="search").',
      },
      targetPath: {
        type: 'string',
        description: 'Path of file or folder to send to Recycle Bin (for action="trash").',
      },
      reason: {
        type: 'string',
        description: 'Reason for deletion (for action="trash").',
      },
    },
    async execute(input, context): Promise<ToolExecutionResult<any>> {
      if (input.action === 'read') {
        if (!input.filePath) {
          return { success: false, error: 'filePath is required for read action.' };
        }
        const resolvedPath = resolveSmartDocumentPath(input.filePath);
        return await readFileTool.execute({
          filePath: resolvedPath,
          startLine: input.startLine,
          endLine: input.endLine,
          maxLines: input.maxLines ?? 500,
        }, context);
      }
      if (input.action === 'write') {
        if (!input.filePath) {
          return { success: false, error: 'filePath is required for write action.' };
        }
        if (input.content === undefined) {
          return { success: false, error: 'content is required for write action.' };
        }
        const resolvedPath = resolveSmartDocumentPath(input.filePath);
        return await writeFileTool.execute({
          filePath: resolvedPath,
          content: input.content,
          overwrite: input.overwrite ?? false,
          createDirs: input.createDirs ?? true,
        }, context);
      }
      if (input.action === 'edit') {
        if (!input.filePath) {
          return { success: false, error: 'filePath is required for edit action.' };
        }
        if (!input.targetText) {
          return { success: false, error: 'targetText is required for edit action.' };
        }
        if (input.replacementText === undefined) {
          return { success: false, error: 'replacementText is required for edit action.' };
        }
        const resolvedPath = resolveSmartDocumentPath(input.filePath);
        return await editFileTool.execute({
          filePath: resolvedPath,
          targetText: input.targetText,
          replacementText: input.replacementText,
        }, context);
      }
      if (input.action === 'search') {
        const rawDir = input.directory || '.';
        const dir = resolveSmartDocumentPath(rawDir);
        return await searchFilesTool.execute({
          directory: dir,
          fileNamePattern: input.fileNamePattern,
          queryText: input.queryText,
          maxResults: input.maxResults ?? 20,
          recursive: input.recursive ?? true,
        }, context);
      }
      if (input.action === 'trash') {
        const target = input.targetPath || input.filePath;
        if (!target) {
          return { success: false, error: 'targetPath is required for trash action.' };
        }
        const resolvedTarget = resolveSmartDocumentPath(target);
        return await trashFileTool.execute({
          targetPath: resolvedTarget,
          reason: input.reason,
        }, context);
      }
      return { success: false, error: `Unknown filesystem action: ${(input as any).action}` };
    },
  });

  // 1. Primary Unified Domain Hubs (Exposed to LLM Function Declarations)
  toolRegistry.register(whatsappTool, true);
  toolRegistry.register(memoryTool, true);
  toolRegistry.register(contactsTool, true);
  toolRegistry.register(appControlTool, true);
  toolRegistry.register(browserTool, true);
  toolRegistry.register(visionTool, true);
  toolRegistry.register(systemTool, true);
  toolRegistry.register(filesystemTool, true);
  toolRegistry.register(developerTool, true);
  toolRegistry.register(documentTool, true);

  // 2. Legacy Micro-Tools registered as secondary (isPrimary = false) for test suites, UI & backwards compatibility
  toolRegistry.register(readPdfTool, false);
  toolRegistry.register(readDocTool, false);
  toolRegistry.register(createPdfTool, false);
  toolRegistry.register(convertToPdfTool, false);
  toolRegistry.register(mergePdfsTool, false);
  toolRegistry.register(launchAppTool, false);
  toolRegistry.register(closeAppTool, false);
  toolRegistry.register(closeAllAppsTool, false);
  toolRegistry.register(getRunningAppsTool, false);
  toolRegistry.register(focusAppTool, false);
  toolRegistry.register(screenshotTool, false);
  toolRegistry.register(telemetryTool, false);
  toolRegistry.register(weatherTool, false);
  toolRegistry.register(executeCommandTool, false);
  toolRegistry.register(openBrowserTool, false);
  toolRegistry.register(webSearchTool, false);
  toolRegistry.register(fetchWebPageTool, false);
  toolRegistry.register(analyzeScreenTool, false);
  toolRegistry.register(analyzeImageFileTool, false);
  toolRegistry.register(saveMemoryTool, false);
  toolRegistry.register(searchMemoryTool, false);
  toolRegistry.register(updateMemoryTool, false);
  toolRegistry.register(deleteMemoryTool, false);
  toolRegistry.register(listMemoryTool, false);
  toolRegistry.register(searchContactsTool, false);
  toolRegistry.register(getContactTool, false);
  toolRegistry.register(listContactsTool, false);
  toolRegistry.register(sendWhatsAppMessageTool, false);
  toolRegistry.register(sendWhatsAppScreenshotTool, false);
  toolRegistry.register(sendWhatsAppFileTool, false);
  toolRegistry.register(readWhatsAppChatTool, false);
  toolRegistry.register(readFileTool, false);
  toolRegistry.register(writeFileTool, false);
  toolRegistry.register(editFileTool, false);
  toolRegistry.register(searchFilesTool, false);
  toolRegistry.register(trashFileTool, false);
  toolRegistry.register(gitStatusTool, false);
  toolRegistry.register(gitDiffTool, false);
  toolRegistry.register(gitCommitTool, false);
  toolRegistry.register(gitBranchTool, false);
  toolRegistry.register(codebaseSummaryTool, false);
  toolRegistry.register(mediaControlTool, false);
  toolRegistry.register(volumeControlTool, false);
  toolRegistry.register(clipboardTool, false);
  toolRegistry.register(systemNotificationTool, false);
}
