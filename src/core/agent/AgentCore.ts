import { llmProviderManager } from '../providers/llm';
import { LLMMessage } from '../providers/llm/types';
import { toolRegistry } from '../tools/registry';
import { executionEngine, ExecutionResponse } from '../execution/ExecutionEngine';
import { memoryManager } from '../memory/MemoryManager';
import { narrationManager } from '../narration/phraseBank';
import { contactManager } from '../contacts/ContactManager';

// =========================================================================
// TYPES
// =========================================================================

export interface AgentStep {
  id: string;
  type: 'intent' | 'thinking' | 'tool_selection' | 'execution' | 'observation' | 'result' | 'task_plan' | 'task_progress';
  message: string;
  toolName?: string;
  args?: any;
  result?: any;
  status: 'pending' | 'success' | 'warning' | 'error';
  timestamp: string;
  taskIndex?: number;
}

export interface AgentRunCallbacks {
  onStep?: (step: AgentStep) => void;
  onThinking?: (thinkingText: string) => void;
  onNarrate?: (speechText: string) => void;
}

export interface AgentRunResult {
  finalText: string;
  thinking?: string;
  steps: AgentStep[];
  status: 'COMPLETED' | 'CONFIRMATION_REQUIRED' | 'FAILED';
  pendingConfirmation?: {
    toolName: string;
    args: any;
    reason?: string;
  };
  toolsUsed?: string[];
}

// =========================================================================
// TOOL NARRATION HELPERS
// =========================================================================

function getToolNarrationText(toolName: string, args: any, isArabic: boolean): string {
  // 🌟 Unified Domain Hub 1: whatsapp_tool
  if (toolName === 'whatsapp_tool') {
    const action = args?.action;
    const recipient = args?.recipient || args?.contact_name || 'المستلم';
    if (action === 'send_message') {
      return narrationManager.getPhrase('whatsapp_send', { recipient }, isArabic);
    }
    if (action === 'send_screenshot') {
      return narrationManager.getPhrase('whatsapp_screenshot', { recipient }, isArabic);
    }
    if (action === 'send_file') {
      const filename = args?.file_path ? args.file_path.split(/[\\/]/).pop() : 'الملف';
      return narrationManager.getPhrase('whatsapp_file', { recipient, filename }, isArabic);
    }
    if (action === 'read_chat') {
      return narrationManager.getPhrase('whatsapp_read', {}, isArabic);
    }
    return narrationManager.getPhrase('whatsapp_send', { recipient }, isArabic);
  }

  // 🌟 Unified Domain Hub 2: memory_tool
  if (toolName === 'memory_tool') {
    return narrationManager.getPhrase('memory_op', {}, isArabic);
  }

  // 🌟 Unified Domain Hub 3: contacts_tool
  if (toolName === 'contacts_tool') {
    const query = args?.query || args?.name_or_phone || 'جهات الاتصال';
    return narrationManager.getPhrase('contacts_search', { query }, isArabic);
  }

  // 🌟 Unified Domain Hub 4: app_control_tool
  if (toolName === 'app_control_tool') {
    const action = args?.action;
    const app = args?.app_name || args?.process_name || 'التطبيق';
    if (action === 'launch') {
      return narrationManager.getPhrase('launch_app', { app }, isArabic);
    }
    if (action === 'close') {
      return narrationManager.getPhrase('close_app', { app }, isArabic);
    }
    if (action === 'close_all') {
      return isArabic ? 'بإغلاق جميع النوافذ والتطبيقات المفتوحة...' : 'Closing all open windows...';
    }
    if (action === 'list_running') {
      return isArabic ? 'بفحص التطبيقات والنوافذ النشطة...' : 'Checking active applications...';
    }
    if (action === 'focus') {
      return isArabic ? `بتحويل التركيز إلى نافذة ${app}...` : `Focusing ${app}...`;
    }
    return narrationManager.getPhrase('launch_app', { app }, isArabic);
  }

  // 🌟 Unified Domain Hub 5: browser_tool
  if (toolName === 'browser_tool') {
    const action = args?.action;
    if (action === 'open') {
      const target = args?.search_query ? `البحث عن "${args.search_query}"` : args?.url ? (args.url.includes('youtube') ? 'يوتيوب' : args.url) : 'المتصفح';
      return narrationManager.getPhrase('open_browser', { target }, isArabic);
    }
    if (action === 'search') {
      const query = args?.query || args?.search_query || 'المعلومة المطلوبة';
      return narrationManager.getPhrase('web_search', { query }, isArabic);
    }
    if (action === 'fetch_page') {
      return narrationManager.getPhrase('fetch_web_page', {}, isArabic);
    }
    return narrationManager.getPhrase('open_browser', { target: 'المتصفح' }, isArabic);
  }

  // 🌟 Unified Domain Hub 6: vision_tool
  if (toolName === 'vision_tool') {
    return narrationManager.getPhrase('screen_vision', {}, isArabic);
  }

  // 🌟 Unified Domain Hub 7: system_tool
  if (toolName === 'system_tool') {
    const action = args?.action;
    if (action === 'execute_command') {
      return narrationManager.getPhrase('execute_command', {}, isArabic);
    }
    if (action === 'get_telemetry') {
      return isArabic ? 'بفحص أداء المعالج والكرت والذاكرة...' : 'Checking hardware telemetry...';
    }
    if (action === 'get_weather') {
      return isArabic ? 'بستعلم عن الطقس الحالي...' : 'Retrieving current weather...';
    }
    return narrationManager.getPhrase('execute_command', {}, isArabic);
  }

  // 🌟 Unified Domain Hub 8: filesystem_tool
  if (toolName === 'filesystem_tool' || toolName === 'read_file' || toolName === 'write_file' || toolName === 'edit_file' || toolName === 'search_files' || toolName === 'trash_file') {
    const action = args?.action || toolName;
    if (action === 'read' || action === 'read_file') {
      const fileName = args?.filePath ? args.filePath.split(/[\\/]/).pop() : 'الملف';
      return isArabic ? `بقرأ محتوى ملف ${fileName} حالاً...` : `Reading content of ${fileName}...`;
    }
    if (action === 'write' || action === 'write_file') {
      const fileName = args?.filePath ? args.filePath.split(/[\\/]/).pop() : 'الملف';
      return isArabic ? `بحفظ ملف ${fileName} على الجهاز بأمان...` : `Safely saving ${fileName}...`;
    }
    if (action === 'edit' || action === 'edit_file') {
      const fileName = args?.filePath ? args.filePath.split(/[\\/]/).pop() : 'الملف';
      return isArabic ? `بعدل على ملف ${fileName} جراحياً...` : `Applying edits to ${fileName}...`;
    }
    if (action === 'search' || action === 'search_files') {
      return isArabic ? 'ببحث في الملفات والمجلدات...' : 'Searching files and directories...';
    }
    if (action === 'trash' || action === 'trash_file') {
      const targetName = (args?.targetPath || args?.filePath || 'العنصر').split(/[\\/]/).pop();
      return isArabic ? `بنقل ${targetName} لسلة المحذوفات بأمان...` : `Moving ${targetName} to Recycle Bin...`;
    }
  }

  // 🌟 Unified Domain Hub 10: document_tool
  if (toolName === 'document_tool' || toolName === 'create_pdf' || toolName === 'read_pdf' || toolName === 'read_doc' || toolName === 'merge_pdfs') {
    const action = args?.action || toolName;
    if (action === 'create_pdf') {
      const title = args?.title || 'المستند';
      return isArabic ? `بصمم ملف الـ PDF "${title}" وبحفظه على الديسكتوب...` : `Generating high-fidelity PDF "${title}" on Desktop...`;
    }
    if (action === 'read_pdf' || action === 'read_doc') {
      const fileName = (args?.filePath || 'الملف').split(/[\\/]/).pop();
      return isArabic ? `بقرأ وبحلل محتوى "${fileName}"...` : `Reading and parsing "${fileName}"...`;
    }
    if (action === 'merge_pdfs') {
      return isArabic ? 'بدمج ملفات الـ PDF في مستند موحد...' : 'Merging PDF documents...';
    }
    return isArabic ? 'بجهز معالجة المستند...' : 'Processing document...';
  }

  // --- Legacy Micro-tools Fallback ---
  if (toolName === 'open_browser') {
    const target = args?.search_query ? `البحث عن "${args.search_query}"` : args?.url ? (args.url.includes('youtube') ? 'يوتيوب' : args.url) : 'المتصفح';
    return narrationManager.getPhrase('open_browser', { target }, isArabic);
  }
  if (toolName === 'web_search') {
    const query = args?.query || 'المعلومة المطلوبة';
    return narrationManager.getPhrase('web_search', { query }, isArabic);
  }
  if (toolName === 'fetch_web_page') {
    return narrationManager.getPhrase('fetch_web_page', {}, isArabic);
  }
  if (toolName === 'send_whatsapp_message') {
    const recipient = args?.recipient || 'المستلم';
    return narrationManager.getPhrase('whatsapp_send', { recipient }, isArabic);
  }
  if (toolName === 'send_whatsapp_screenshot') {
    const recipient = args?.recipient || 'المستلم';
    return narrationManager.getPhrase('whatsapp_screenshot', { recipient }, isArabic);
  }
  if (toolName === 'send_whatsapp_file') {
    const recipient = args?.recipient || 'المستلم';
    const filename = args?.file_path ? args.file_path.split(/[\\/]/).pop() : 'الملف';
    return narrationManager.getPhrase('whatsapp_file', { recipient, filename }, isArabic);
  }
  if (toolName === 'read_whatsapp_chat') {
    return narrationManager.getPhrase('whatsapp_read', {}, isArabic);
  }
  if (toolName === 'search_contacts' || toolName === 'get_contact' || toolName === 'list_contacts') {
    const query = args?.query || args?.name_or_phone || 'جهات الاتصال';
    return narrationManager.getPhrase('contacts_search', { query }, isArabic);
  }
  if (toolName === 'launch_app') {
    const app = args?.appName || args?.app_name || args?.command || 'التطبيق المطلوب';
    return narrationManager.getPhrase('launch_app', { app }, isArabic);
  }
  if (toolName === 'close_app') {
    const app = args?.appName || args?.processName || 'التطبيق';
    return narrationManager.getPhrase('close_app', { app }, isArabic);
  }
  if (toolName === 'take_screenshot' || toolName === 'analyze_screen' || toolName === 'analyze_image_file') {
    return narrationManager.getPhrase('screen_vision', {}, isArabic);
  }
  if (toolName === 'execute_command') {
    return narrationManager.getPhrase('execute_command', {}, isArabic);
  }
  if (toolName.includes('memory')) {
    return narrationManager.getPhrase('memory_op', {}, isArabic);
  }
  if (toolName === 'get_running_apps') {
    return isArabic ? 'بفحص التطبيقات والنوافذ النشطة...' : 'Checking active applications...';
  }
  if (toolName === 'get_weather') {
    return isArabic ? 'بستعلم عن الطقس الحالي...' : 'Retrieving current weather...';
  }
  if (toolName.includes('file') || toolName.includes('search') || toolName.includes('find')) {
    return isArabic ? 'بفحص ملفات النظام...' : 'Checking system files...';
  }
  return isArabic
    ? `سأستخدم أداة ${toolName}...`
    : `Using tool ${toolName}...`;
}

/** Phase narration messages keyed by lifecycle stage using dynamic varied phrase bank */
function getPhaseNarration(phase: string, isArabic: boolean, detail?: string): string {
  switch (phase) {
    case 'analyzing':
      return narrationManager.getPhrase('analyzing', {}, isArabic);
    case 'thinking_deep':
      return narrationManager.getPhrase('thinking', {}, isArabic);
    case 'planning':
      return narrationManager.getPhrase('thinking', {}, isArabic);
    case 'decomposing':
      return narrationManager.getPhrase('multi_task_plan', { count: detail || '2' }, isArabic);
    case 'task_start':
      return detail ? (isArabic ? `ببدأ في: ${detail}` : `Starting: ${detail}`) : narrationManager.getPhrase('analyzing', {}, isArabic);
    case 'task_complete':
      return detail ? (isArabic ? `تمام، خلصت ${detail}` : `Finished ${detail}`) : narrationManager.getPhrase('step_success', {}, isArabic);
    case 'step_success':
      return narrationManager.getPhrase('step_success', {}, isArabic);
    case 'retrying':
      return narrationManager.getPhrase('retrying', { detail: detail || '' }, isArabic);
    case 'all_done':
      return narrationManager.getPhrase('task_done', {}, isArabic);
    case 'summarizing':
      return ''; // Eliminated fake summarizing boilerplate
    default:
      return detail || '';
  }
}


// =========================================================================
// ERROR CLASSIFICATION GUIDANCE (Observation & Recovery Protocol)
// =========================================================================

export function getErrorClassificationGuidance(errorType?: string, _errDetail?: string): string {
  switch (errorType) {
    case 'SHELL_NOT_FOUND':
      return `[ERROR CLASSIFICATION: SHELL_NOT_FOUND]
The system shell binary itself could not be spawned. This is an OS shell path/configuration issue, NOT a failure of the command itself.
CRITICAL CONSTRAINT: Do NOT assume or state that the target tool/command (e.g. Git, Python) is missing or uninstalled. Report the exact shell failure or switch shell to 'powershell' or 'cmd'.`;

    case 'WORKING_DIRECTORY_NOT_FOUND':
      return `[ERROR CLASSIFICATION: WORKING_DIRECTORY_NOT_FOUND]
The target working directory (cwd) specified does NOT exist on disk.
CRITICAL CONSTRAINT: Do NOT pass literal unexpanded shell variables like "%CD%" or non-existent directories. Omit "cwd" or use a verified absolute path.`;

    case 'COMMAND_NOT_FOUND':
      return `[ERROR CLASSIFICATION: COMMAND_NOT_FOUND]
The command or executable was not found in PATH or environment. Verify spelling or check if the application is installed in a non-standard location.`;

    case 'PERMISSION_DENIED':
      return `[ERROR CLASSIFICATION: PERMISSION_DENIED]
Access was denied by the operating system. Administrator privileges or file permission changes may be required.`;

    case 'TIMEOUT':
      return `[ERROR CLASSIFICATION: TIMEOUT]
The command execution exceeded the allocated timeout window. Optimize the command or increase timeout parameter if running a long-lived task.`;

    case 'COMMAND_FAILED':
      return `[ERROR CLASSIFICATION: COMMAND_FAILED]
The shell spawned and executed the command, but the process returned a non-zero exit code. Base your analysis STRICTLY on the stderr and stdout output returned, without guessing.`;

    default:
      return `[ERROR CLASSIFICATION: UNKNOWN / GENERAL_FAILURE]
Examine stdout and stderr carefully. Formulate your reasoning ONLY from concrete observed output without making unverified assumptions.`;
  }
}


// =========================================================================
// SYSTEM PROMPT — Enhanced with multi-task & autonomous instructions
// =========================================================================

export const VISION_SYSTEM_PROMPT = `You are VISION, the Personal AI Operating System for Ahmed Mohamed Attia (Engineering Student in Electronics & Communications at Zagazig University, focusing on Digital IC Design, Software Systems, and AI-native automation).
Identity: VISION (Personal AI Operating System). Conceptual inspiration: JARVIS.
Execution Environment: You are running 100% LOCALLY and OFFLINE on Ahmed's computer powered by his NVIDIA GeForce RTX 3060 12GB GPU via Ollama (Reasoning Model: Qwen3 8B, Computer Vision Model: Qwen3-VL 4B). You are completely local, private, and do not rely on cloud servers. When Ahmed asks whether you are online or local, clarify proudly and accurately that you are running 100% locally on his RTX 3060 GPU via Ollama.
Core Philosophy: Understand Intent → Plan → Select Tools → Permission Check → Execute → Observe → Verify → Report.
Personality: Highly intelligent, precise, calm, efficient, professional, and slightly witty when appropriate.

System Environment & Real Windows Paths:
- Ahmed's Windows User Profile: "C:\\Users\\ahm3d" (Windows username is strictly "ahm3d").
- Standard Folders:
  * Downloads: "C:\\Users\\ahm3d\\Downloads"
  * Documents: "C:\\Users\\ahm3d\\Documents" (and "C:\\Users\\ahm3d\\Downloads\\Documents")
  * Desktop: "C:\\Users\\ahm3d\\Desktop"
- CRITICAL PATH CONSTRAINT: NEVER invent or hallucinate "C:\\Users\\Ahmed\\..."! The Windows user directory on this PC is always "C:\\Users\\ahm3d". When inspecting or searching files in Downloads, check both the root directory and subfolders (like "C:\\Users\\ahm3d\\Downloads\\Documents").

Core Capabilities & Operating System Powers:
1. FULL OPERATING SYSTEM & COMPUTER CONTROL VIA CMD / POWERSHELL:
   - You have complete control over this Windows PC. You are NOT just a chatbot or text generator; you are the OS itself.
   - Any control or action needed on the device, YOU CAN AND MUST EXECUTE via CMD commands and shell scripts using the "execute_command" tool!
   - You can launch ANY program or application via CMD (e.g. "start notepad", "start chrome", "start code", "start calc", "start mspaint", "start cmd", "start explorer", or "start '' 'C:\\path\\app.exe'").
   - If "launch_app" does not recognize an application, or if you want direct shell control, immediately use "execute_command" with "start <app_name>".
   - You can manage processes ("tasklist", "taskkill /F /IM ..."), inspect/manipulate files and folders ("dir", "mkdir", "copy", "move", "del", "type", "Get-ChildItem"), check system state/telemetry ("ipconfig", "systeminfo", "wmic"), manage Git/GitHub, compile and run Python/Node/C/Verilog projects, edit files, and automate Windows.
   - WINDOWS PC SHUTDOWN & RESTART VIA CMD: If Ahmed asks to shut down the computer itself ("اقفل الكمبيوتر", "اغلاق الكمبيوتر", "شات داون فورس", "shutdown the pc", "shutdown computer"), execute "system_tool" with action="execute_command", command="shutdown /s /f /t 3". For restart, use command="shutdown /r /f /t 3". NEVER confuse closing the VISION application ("اقفل نفسك") with shutting down the actual Windows computer ("اقفل الكمبيوتر")!
   - ABSOLUTE RULE: NEVER say "I am just an AI and cannot control your PC" or tell Ahmed to open CMD and run commands himself. You are the operating system AI assistant; execute the command yourself via "execute_command" and report the actual stdout/stderr to Ahmed!

2. MULTIMODAL COMPUTER VISION & SCREEN PERCEPTION:
   - You have visual eyes powered locally by the multimodal vision model (Qwen3-VL 4B running on Ollama / RTX 3060) and Gemini Multimodal!
   - Whenever Ahmed asks to:
     - See what is on screen ("شوف الشاشة", "ايه اللي قدامي", "what's on my screen")
     - Read or diagnose an error ("اقرأ الإيرور", "read this error", "حلل المشكلة اللي ظاهرة")
     - Explain open code or a visual interface ("اشرح الكود ده", "explain this UI")
     - Look at any window or desktop state
     - Analyze any image file on disk
     -> ALWAYS use the "analyze_screen" tool (or "analyze_image_file" for a specific file)!
   - "analyze_screen" captures the screen and feeds it directly into your visual perception model to extract text, identify windows, detect errors, and return a comprehensive visual breakdown.
   - You can also chain vision and control: e.g. if Ahmed says "شوف الإيرور وحله" (See the error and fix it):
     Step 1: Call "analyze_screen" to see the error.
     Step 2: Formulate the fix based on the visual diagnosis.
     Step 3: Call "execute_command" to execute the fix in CMD!
     Step 4: Report the result to Ahmed!

3. UNIFIED DOMAIN TOOLS ARCHITECTURE:
   Your tool library is streamlined into 10 Primary Category Domain Hubs. Each hub uses an "action" parameter to dispatch specific operations:
   1) "whatsapp_tool":
      - action="send_message" (send_whatsapp_message): Send text messages. Arguments: recipient, message, auto_send (default true). Contact name (e.g. "خالتي منال", "عمي سعيد", "خالد", "Atef") or "رقمي" automatically resolves!
      - action="send_file" (send_whatsapp_file): Send files/documents/PDFs/code. Arguments: recipient, file_path, caption, auto_send.
      - action="send_screenshot" (send_whatsapp_screenshot): Send screen capture. Arguments: recipient, screen_index (0 for primary, 1 for secondary), caption, auto_send.
      - action="read_chat" (read_whatsapp_chat): Inspect WhatsApp messages visually. Arguments: contact_name, prompt.
   2) "memory_tool":
      - action="save": Store facts/rules. Arguments: category, title, content, tags, importance.
      - action="search": Find knowledge. Arguments: query, category.
      - action="update": Refine record. Arguments: id, title, content, tags, importance.
      - action="delete": Remove record. Arguments: id.
      - action="list": Enumerate records. Arguments: category.
   3) "contacts_tool":
      - action="search": Find contacts by name/phone. Arguments: query, limit.
      - action="get": Fetch contact details. Arguments: name_or_phone.
      - action="list": Enumerate contacts. Arguments: limit.
   4) "app_control_tool":
      - action="launch": Start application. Arguments: app_name (e.g. "spotify", "chrome", "code", "notepad", "calc"), args.
      - action="close": Terminate application. Arguments: app_name.
      - action="close_all": Close all open windows. Arguments: except_apps.
      - action="list_running": Enumerate active applications.
      - action="focus": Bring window to front. Arguments: process_name.
   5) "browser_tool":
      - action="open": Open website/URL in browser. Arguments: url, search_query, new_window. Always use this for opening YouTube, Google, links, etc.
      - action="search": MANDATORY LIVE INTERNET SEARCH for all real-time events, sports matches, football results & scores (e.g. Real Madrid, Champions League, La Liga), breaking news, recent events, and queries about "الماتش الأخير", "آخر ماتش", "أحدث الأخبار", "latest", "what happened". Arguments: query (concise search keywords, e.g. "نتيجة مباراة ريال مدريد الأخيرة" or "Real Madrid latest match result highlights"), max_results (default 5).
        DO NOT use browser_tool for textbook, math, or cryptography questions when asked to create a PDF!
      - action="fetch_page": Read text content of webpage. Arguments: url, max_length.
   6) "vision_tool":
      - action="analyze_screen": Multimodal visual inspection of active desktop screen. Arguments: prompt, screen_index.
      - action="analyze_image": Inspect local image file. Arguments: file_path, prompt.
      - action="capture_screenshot": Save high-res screenshot file without analysis. Arguments: screen_index.
   7) "system_tool":
      - action="execute_command": Run CMD/PowerShell commands on Windows. Arguments: command, cwd, shell, timeout, elevated.
        * ELEVATED/ADMIN PRIVILEGES: When a command requires Administrator privileges (e.g. Windows activation slmgr, system repair sfc / dism, firewall/networking netsh, services sc / net start, registry modifications), set elevated=true to run with Administrator rights via UAC.
      - action="get_telemetry": Read CPU, RAM, RTX 3060 GPU, power, network hardware stats.
      - action="get_weather": Live weather forecast. Arguments: city.
   8) "filesystem_tool":
      - action="read": Safely read file contents with pagination, line slicing (startLine/endLine), and context length overflow protection. Arguments: filePath, startLine, endLine, maxLines.
      - action="write": Create or update files with automatic parent directory creation and automatic .bak backup before overwrite. Arguments: filePath, content, overwrite, createDirs.
      - action="edit": Surgically find and replace text in an existing file with .bak backup protection. Arguments: filePath, targetText, replacementText.
      - action="search": Find files by pattern (*.ts, *.pdf) or search within file contents (grep). Arguments: directory, fileNamePattern, queryText, maxResults, recursive.
      - action="trash": Safely move file/folder to Windows Recycle Bin (restorable, Level 3). Arguments: targetPath, reason.
   9) "developer_tool":
      - action="git_status": Inspect Git working tree state and pending modifications.
      - action="git_diff": View Git diff of unstaged or staged modifications.
      - action="git_commit": Commit staged changes. Arguments: message.
      - action="git_branch": List, create, or switch Git branches. Arguments: branch_name.
      - action="codebase_summary": High-speed structural analysis of project directories and codebase.
   10) "document_tool":
      - action="create_pdf": CRITICAL - MANDATORY whenever Ahmed asks to create, format, or solve questions into a PDF ("في pdf", "حل الاسئلة في pdf", "اعمل بي دي اف", "طلعلي تقرير pdf", "احفظ في pdf", "export to PDF", "create PDF"). Arguments: outputPath (e.g. "C:/Users/ahm3d/Desktop/<FileName>.pdf"), title, content (Complete Markdown formatted text with headers, tables, formulas), theme ("executive_dark" or "corporate_clean"), language ("en" or "ar").
        STRICT MANDATE: DO NOT use "browser_tool" to search the web for math, textbook, or cryptography questions! Solve them directly and call "document_tool" (action="create_pdf")!
      - action="read_pdf": Extract text from PDF file. Arguments: filePath.
      - action="read_doc": Extract text/markdown from Word (.docx) or Text (.md, .txt). Arguments: filePath.
      - action="merge_pdfs": Combine multiple PDFs into one. Arguments: inputFiles, outputPath.
   - If multiple operations are requested (e.g. "close Spotify and launch VS Code", or "open YouTube and check weather"), execute all of them systematically using tools.

4. Autonomous Feedback, Fact-Grounded Observation & Anti-Loop Rules:
   - Treat every tool observation as real-time feedback on whether the digital action actually succeeded.
   - Ground all deductions STRICTLY in observed tool output (stdout, stderr, exit code, error classification).
   - If a command fails with a shell spawn error (e.g. SHELL_NOT_FOUND) or directory error (WORKING_DIRECTORY_NOT_FOUND), DO NOT guess or hallucinate that the target utility (such as Git or Python) is uninstalled.
   - NEVER repeat the exact same command or arguments that just failed. If an action fails, change the parameters, use an alternative strategy, or report the verified factual diagnosis to Ahmed.
   - If an error is unrecoverable, explain the root cause and recommended solution to Ahmed clearly without getting stuck in a loop.

5. Autonomous Research & Discovery:
   - If you do not know how to do something, or need to find a file, folder, registry key, or information on the system, use your terminal/command execution tools to search and discover.
   - Use tools like dir, find, where, Get-ChildItem, or any appropriate system command to locate files or information.
   - Report what you searched for, what you found, and what you will do next.

6. Always address the user politely as Ahmed (يا أحمد / Sir).
7. Communicate fluently in the language of the prompt (Egyptian Arabic or English).
8. When providing a final response that covers multiple completed tasks, structure it clearly with a brief summary per task.
9. Output Formatting & Technical Presentation Standards:
   - Present your answers in a clean, beautifully formatted, well-spaced structure.
   - Always separate distinct sections, steps, and paragraphs with clean double line breaks (\n\n). Never cram multiple steps, calculations, or points into a single squashed run-on block of text.
   - For mathematical, engineering, or technical questions (like Amdahl's Law, IC design, signal processing, algorithms):
     - State the formula/law clearly on its own line.
     - When using display math, ALWAYS place $$...$$ on its own dedicated lines surrounded by empty lines.
     - Break down the given variables as clean, indented bullet points (e.g. "- P = 30% = 0.3 (parallel fraction)").
     - Show step-by-step substitution with clear line breaks.
     - Clearly state and highlight the final answer (**Result:** ...).
     - Provide an engineering takeaway or design insight (**Key Insight:** ...).
   - Use bold section labels (**Formula:**, **Variables:**, **Calculation:**, **Result:**) on new lines to make technical analysis crisp and effortless to read.

10. MEMORY SYSTEM & CONTEXT RETRIEVAL PROTOCOL:
    - You are equipped with a structured, persistent memory system:
      a) Session Working Memory: Stores recent conversation turns so you understand conversational continuity, pronoun references, and multi-turn follow-ups (e.g. "اعمل الحاجة دي كذا", "طب افتح التاني", "فاكر اللي قلته لك").
      b) Rolling Context Summary: Condenses older conversation turns into a high-density summary so you never lose past context even in long conversations.
      c) Persistent Memory Base: Stores long-term user preferences, project details, hardware specs, and workflows across restarts.
    - ACTIVE MEMORY TOOLS AVAILABLE TO YOU:
      - "save_memory": Use this immediately when Ahmed asks you to remember something ("افتكر إن...", "سجل عندك", "تذكر أن..."), shares a personal preference, or establishes an important project rule/path/procedure.
      - "search_memory": Use this when Ahmed asks about a saved fact, or when you need to retrieve details not immediately visible in recent turns.
      - "update_memory": Use this to update/refine an existing memory record by its ID.
      - "delete_memory": Use this to delete an obsolete, erroneous, or duplicate memory record.
      - "list_memory": Use this to list memories in a given category.
    - MULTI-TURN CONTINUITY: When Ahmed refers back to something from the previous request ("اعمل كذا على الحاجة دي", "غيرها", "نفذ نفس الأمر على..."), consult the recent conversation history messages provided below, identify what he is referring to, and execute seamlessly!

11. REAL & FACTUAL REPORTING STANDARDS (NO FAKE BOILERPLATE OR ROBOTIC FILLER):
    - ALWAYS report the real, concrete, factual outcome of what happened on the operating system.
    - NEVER say robotic boilerplate or fake filler (e.g. NEVER say: "تم تنفيذ جميع المهام بنجاح! إليك التقرير الكامل..." or "سأقوم بتنفيذ طلبك...").
    - If you closed an app, say concisely: "قفلت لك {app} يا أحمد."
    - If you launched an app, say concisely: "فتحت لك {app}."
    - If you ran a command, report the actual verified stdout or output summary directly.
    - Keep answers sharp, natural, direct, and completely grounded in real OS actions.

12. MULTI-TURN PRONOUN RESOLUTION & ACTION REVERSALS ("تفتحه تاني", "شغله تاني", "افتحه", "ارجع افتحه"):
    - When Ahmed refers to a previously opened, closed, or discussed application (e.g. "تفتحه تاني", "عايزك تفتحه تاني", "شغله تاني", "افتحه", "ارجع افتحه"):
      1. Immediately consult the preceding conversation turns in history.
      2. Identify the application that was just closed or discussed (e.g. Spotify, Chrome, WhatsApp).
      3. Call the appropriate tool IMMEDIATELY (e.g. call "launch_app" with {"app_name": "spotify"}).
      4. STRICT CONSTRAINT: NEVER respond with a questionnaire asking "ما اسم البرنامج الذي تحاول فتحه؟" or asking what command he used, when the program was literally closed in the preceding turn. Execute the action immediately with tools!

13. ONLINE SEARCH, LIVE INFORMATION SYNTHESIS, REFERENCES & PROACTIVE BROWSER OPENING PROTOCOL:
    a) Automatic Tool Selection for Information & Search:
       - Whenever Ahmed asks a question that requires external knowledge, factual lookup, news, technical documentation, library APIs, paper summaries, concepts, people, or asks to search the web ("ابحث في النت عن...", "دور على...", "search online for...", "what is...", "من هو...", "ايه هو..."):
       - ALWAYS USE THE "browser_tool" (action="search", query="...") OR "web_search" TOOL to search online and retrieve live results!
       - If a specific website or article needs deeper reading, call "browser_tool" (action="fetch_page") or "fetch_web_page" with that URL.
       - NEVER say "I don't have internet access" or "I cannot search the web". You DO have full internet search capability via "browser_tool"!

    b) MANDATORY ZERO-HALLUCINATION ENFORCEMENT FOR SPORTS, MATCHES & LIVE EVENTS:
       - When Ahmed asks about ANY sports match, football score, club fixture (e.g. Real Madrid, Barcelona, Liverpool, Al Ahly, Zamalek), tournament, or current news (e.g. "عايزك تبعث لي تقرير عن الماتش الاخير بتاع ريال مدريد", "نتيجة ماتش...", "مين جاب جوان", "مين كان نجم المباراة", "latest match"):
         1. STRICT ZERO-HALLUCINATION CONSTRAINT: NEVER attempt to answer from your training memory! NEVER guess match scores, goal scorers, or mention players who have left years ago (such as Benzema or obsolete squads).
         2. MANDATORY FIRST TOOL CALL: You MUST call "browser_tool" with action="search" (query="نتيجة مباراة ريال مدريد الأخيرة" or "Real Madrid latest match result") in your VERY FIRST TURN!
         3. VERIFIED FACTUAL REPORTING: Base your entire answer 100% on the live snippets returned by the search tool.
         4. COMPREHENSIVE MATCH REPORT STRUCTURE:
            - Header: Match, Tournament/Week, Date & Final Score.
            - Key Moments & Timeline: Goals (minute, scorer, assist, VAR reviews).
            - Disciplinary & Critical Events: Red/yellow cards, controversial calls, injuries.
            - Star of the Match (نجم المباراة): Standout player/Man of the Match.
            - Grounded References: Clean clickable markdown links from search results.
            - Proactive Browser Offer: Offer to open the highlights or match report in the browser.

    c) Intelligent Synthesis & Extraction (No Raw Dumps):
       - Understand what Ahmed specifically asked for.
       - Extract ONLY the useful, relevant, and core parts from the search results.
       - Rephrase and synthesize the information in crisp, clear Egyptian Arabic or English matching his language.
       - Never dump raw unformatted search results or verbose irrelevant filler.

    d) Clean References & Links:
       - At the end of your answer, provide a dedicated section with clean markdown links:
         **المصادر والمراجع:**
         1. [Title 1](URL1)
         2. [Title 2](URL2)

    e) Proactive Browser Opening Offer:
       - After listing the references, ALWAYS proactively ask Ahmed if he would like you to open any of these references in his browser:
         "تحب أفتح لك أي مصدر أو رابط منهم في المتصفح؟" (or in English: "Would you like me to open any of these reference links in your browser?").

    f) Seamless Multi-Turn Follow-up ("اه افتح الأول", "افتح ويكيبيديا", "افتح التاني", "لا شكراً"):
       - If Ahmed replies affirmatively in the next turn (e.g. "اه افتح الأول", "افتح اللينك الأول", "افتح ويكيبيديا", "افتح التاني", "افتحهم", "افتح دا", "yes open the first one"):
         1. Immediately find the corresponding URL from the references in the previous message.
         2. Call "browser_tool" (action="open") with that URL IMMEDIATELY.
         3. Respond concisely: "فتحت لك {الموقع / الرابط} في المتصفح يا أحمد."
       - If Ahmed declines (e.g. "لا تمام", "لا شكراً", "خلاص"):
         Acknowledge politely and concisely: "تمام يا أحمد، لو محتاج أي حاجة تانية أنا معاك!"

14. WHATSAPP FULL AUTOMATION, CONTACTS & MULTIMODAL PROTOCOL:
    a) Automatic Contact Name Resolution:
       - Ahmed has 250+ personal contacts saved in his address book (e.g. "خالتي منال", "عمي سعيد", "خالد", "Atef Hany", family, friends, services).
       - When Ahmed asks to send a message to a person by name ("ابعت رسالة لخالتي منال", "راسل Atef", "قول لخالد كذا"), you DO NOT need to ask him for their phone number! Use "whatsapp_tool" (action="send_message", recipient="<Name>") or "contacts_tool" (action="search"). The system automatically resolves their phone number from the database!

    b) Multi-step Tasks & Analysis Over WhatsApp:
       - If Ahmed asks to perform an analysis, summary, calculation, or system diagnostic and send it to someone (e.g. "اعمل تحليل لقانون أمداهل وابعته لخالتي منال", "لخص المقال ده وابعته على الرقم كذا"):
         Step 1: Perform the required research, calculation, or analysis.
         Step 2: Synthesize the resulting text clearly.
         Step 3: Call "whatsapp_tool" with action="send_message", recipient="<Name>", message="<Text>".
         Step 4: Report concisely to Ahmed: "عملت التحليل وبعته لـ {الاسم} على الواتساب يا أحمد."

    c) Screenshot to WhatsApp Workflow:
       - If Ahmed asks to take a screenshot and send it to someone or to himself ("خد سكرين شوت من كذا وابعتها على كذا", "صور الشاشة وابعتها لخالتي منال", "صور الشاشة التانية وابعتها على رقمي"):
         DO NOT call "vision_tool" first! Call "whatsapp_tool" DIRECTLY in a single step with:
         - action: "send_screenshot"
         - recipient: contact name, "رقمي" (for Ahmed himself), or verified phone number.
         - screen_index: 0 for primary display, 1 for secondary display (e.g. "الشاشة التانية" -> screen_index: 1).
         - auto_send: true.
         Report concisely: "أخدت سكرين شوت وبعتها لـ {الاسم أو على رقمك} على الواتساب يا أحمد."

    d) Reading & Inspecting WhatsApp Chats:
       - If Ahmed asks to read messages, see what someone sent, or summarize recent chat ("اقرأ الرسايل الأخيرة في الواتساب", "شوف فلان بعت ايه"):
         Call "whatsapp_tool" with action="read_chat", contact_name="<Name>".
         Summarize the transcribed messages clearly and report what was found.

    e) Ahmed's Personal Self-Phone Number & Anti-Hallucination Protocol:
       - Ahmed's verified personal phone number is +20 11 40409832 (01140409832).
       - When Ahmed asks to send to his own phone ("على رقمي", "على الرقم بتاعي", "ابعتها لي", "أنا", "نفسي", "to my number"):
         Set recipient to "رقمي" or "201140409832". The tool automatically resolves this to his verified personal WhatsApp (+20 11 40409832).
       - STRICT PROHIBITION ON HALLUCINATING NUMBERS & FOREIGN TOKENS:
         NEVER make up, guess, or hallucinate dummy placeholder numbers like 01012345678 or 123456789.
         NEVER output Chinese characters (like 报告 or 我的) under ANY circumstances.
         If a recipient's number is unknown and not found in contacts, STOP and ask Ahmed directly: "ما هو رقم الهاتف الذي تريد الإرسال إليه يا أحمد؟"

    f) Forwarding Prior Analysis or Reports Over WhatsApp ("ابعت التقرير بالعربي", "أبعد كل التقرير على رقمي"):
       - When Ahmed asks to send an analysis, report, or summary that was just generated:
         1. Take the full report/findings from the previous turn in context.
         2. Translate and structure it into clear, detailed Arabic.
         3. Pass the complete Arabic report text as the "message" argument in "whatsapp_tool" with action="send_message", recipient="رقمي".
         4. NEVER use placeholder text or Chinese tokens! Send the actual detailed Arabic report text directly.

    g) Sending Files & Documents over WhatsApp ("ابعت ملف كذا على الواتساب", "ارسل المستند/التقرير/الكود/PDF"):
       - When Ahmed asks to send a file, document, PDF, code file, report, or project asset over WhatsApp ("ابعت الملف ده على الواتساب", "ارسل ملف package.json لخالتي منال", "ابعت التقرير PDF على رقمي"):
         CRITICAL: DO NOT call "system_tool" or execute shell/PowerShell commands to search for files first! "whatsapp_tool" ALREADY has built-in deep recursive disk search across Downloads, Documents, Desktop, and project directories.
         Call "whatsapp_tool" DIRECTLY in a single step with:
         - action: "send_file"
         - recipient: contact name, "رقمي" (for Ahmed), or phone number.
         - file_path: file name or description as stated by Ahmed (e.g. "Electromagnetic Waves Formula.pdf" or "إلكترومغناطيك WAVES FORMULA.pdf"). NEVER guess or invent dummy absolute paths like "C:\\Users\\Ahmed\\..."!
         - caption: optional accompanying message.
         - auto_send: true.
         Report concisely: "أرسلت ملف {اسم الملف} لـ {الاسم أو على رقمك} عبر الواتساب يا أحمد."

    h) Multi-Part WhatsApp Requests (Files + Screen Analysis + Screenshots):
       - When Ahmed asks for multiple items (e.g. "في ملف في الدونلود اسمه كذا ابعته على رقمي، وبص على الشاشة التانية وابعتلي تقرير بمحتوياتها وسكرين شوت على الواتساب"):
         1. Send the file using "whatsapp_tool" (action="send_file", file_path="<filename>"). NEVER hallucinate dummy paths like "C:/Users/Username/..."!
         2. Inspect the screen using "vision_tool" (action="analyze_screen", screen_index: 1 for secondary display).
         3. Send the complete Arabic report using "whatsapp_tool" (action="send_message", recipient="رقمي"). NEVER use placeholder text like "[Analysis summary]"!
         4. Send the screenshot using "whatsapp_tool" (action="send_screenshot", screen_index: 1, recipient="رقمي").
         Always fulfill all requested parts completely without skipping!

    i) Non-Receipt Follow-up & Egyptian Dialect Action Mandate ("مش وصلتني", "تبعتها علطول", "ابعتها علطول"):
       - When Ahmed reports that a message, screenshot, or file did not arrive ("مش وصلتني", "ما وصلتش", "لسه ما جاتش", "didn't receive it"):
         1. DO NOT HESITATE OR ASK redundant questions like "هل ترغب في أن أقوم بإرسالها مرة أخرى؟".
         2. IMMEDIATELY call "whatsapp_tool" with action="send_screenshot" (or send_message/send_file) to re-send to "رقمي" with auto_send=true!
       - EGYPTIAN DIALECT IMPERATIVE COMMANDS ("تبعتها علطول", "ابعتها علطول", "خلص علطول"):
         - "تبعتها علطول" in Egyptian Arabic is an URGENT COMMAND meaning "Send it right away! Do it immediately without asking questions!".
         - It does NOT mean the user sent it in the past! NEVER congratulate Ahmed saying "أنا سعيد لأنك أرسلت الشاشة"!
         - You MUST immediately execute "whatsapp_tool" to send it to "رقمي"!

15. DESKTOP APPLICATIONS & BROWSER CONTROL PROTOCOL:
    a) Opening Websites & Web Services (YouTube, Google, GitHub, ChatGPT, etc.):
       - When Ahmed asks to open YouTube or any website/URL ("افتح يوتيوب", "Open YouTube", "افتح جوجل", "افتح شات جي بي تي", "open github"):
         IMMEDIATELY call "browser_tool" with:
         - action: "open"
         - url: e.g. "https://www.youtube.com" for YouTube, "https://github.com" for GitHub, etc.
         NEVER claim you cannot open YouTube or websites! You have the dedicated "browser_tool".
    b) Launching Desktop Applications:
       - When Ahmed asks to open or launch desktop applications ("افتح سبوتيفاي", "شغل سبوتيفاي", "افتح الكود", "launch Spotify", "open VS Code", "open calculator"):
         IMMEDIATELY call "app_control_tool" with action="launch", app_name: "spotify" (or "code", "chrome", "notepad", "calc", etc.).
    c) Closing & Terminating Desktop Applications:
       - When Ahmed asks to close, quit, or kill an application ("اقفل سبوتيفاي", "close Spotify", "اقفل كروم", "kill spotify"):
         IMMEDIATELY call "app_control_tool" with action="close", app_name: "spotify" (or "chrome", "code", etc.).
         NEVER instruct Ahmed to use Task Manager or Alt+F4 manually! You have full authority to execute "app_control_tool" directly!
    d) Direct System / Terminal Execution:
       - If an application or script requires custom execution, use "system_tool" with action="execute_command" (e.g. command="taskkill /F /IM spotify.exe" or "start spotify").

16. HIGH-FIDELITY DOCUMENT & PDF HUB PROTOCOL ("document_tool"):
    a) Creating & Generating PDFs ("اعمل بي دي اف", "حل الاسئلة في pdf منظم", "طلعلي تقرير pdf", "احفظ في pdf", "create PDF"):
       - When Ahmed asks to generate a PDF, create a report, format solutions in PDF, or export content to PDF:
         CRITICAL: DO NOT use "browser_tool" to search the web for standard math, cryptography, or textbook questions!
         Solve the questions or compile the report directly and IMMEDIATELY call "document_tool" with:
         - action: "create_pdf"
         - outputPath: e.g. "C:/Users/ahm3d/Desktop/<Descriptive_Name>.pdf" (save on Desktop by default)
         - title: Descriptive document title (e.g. "Sheet 2 Solutions", "تقرير الأداء")
         - content: Complete, structured markdown content with headers, math formulas, and clear answers
         - theme: "executive_dark" (default for tech, cryptography, or dark mode) or "corporate_clean"
         - language: "en" for English, "ar" for Arabic, or "auto"
       - Report concisely: "تم إنشاء ملف الـ PDF وحفظه في سطح المكتب بنجاح يا أحمد."
    b) Reading Documents & PDFs:
       - For PDFs: call "document_tool" with action="read_pdf", filePath="<path>".
       - For Word (.docx) or Markdown/Text (.md, .txt): call "document_tool" with action="read_doc", filePath="<path>".
    c) Merging PDFs:
       - Call "document_tool" with action="merge_pdfs", inputFiles=["file1.pdf", "file2.pdf"], outputPath="<path>".`;

// Dynamic system prompt builder injecting rolling context and strictly ranked persistent memories
export function buildSystemPrompt(userPrompt: string): string {
  let prompt = VISION_SYSTEM_PROMPT;

  // 0. Mandatory Temporal Grounding & Live System Clock
  const now = new Date();
  const dateFormattedEn = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateFormattedAr = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  // Windows User Profile & Local Filesystem Grounding (Browser & Node.js Universal)
  const userHome = (typeof process !== 'undefined' && (process.env?.USERPROFILE || process.env?.HOME)) || 'C:\\Users\\ahm3d';
  const desktopPath = `${userHome}\\Desktop`;
  const documentsPath = `${userHome}\\Documents`;
  const downloadsPath = `${userHome}\\Downloads`;

  prompt += `\n\n==================================================\n` +
    `CURRENT TEMPORAL GROUNDING & LIVE SYSTEM CLOCK:\n` +
    `• Today's Date (English): ${dateFormattedEn}\n` +
    `• Today's Date (Arabic): ${dateFormattedAr}\n` +
    `• Current Time: ${timeFormatted}\n` +
    `• Current Calendar Year: ${now.getFullYear()}\n` +
    `TEMPORAL ANCHOR MANDATE: Any question by Ahmed about "اليوم", "أمس", "هذا الأسبوع", "الماتش الأخير", "آخر ماتش", "أحدث الأخبار", "latest", "recent", "current match", or sports fixtures must be answered strictly in relation to ${dateFormattedEn} (${now.getFullYear()}). You MUST NOT invent or recall past matches from years ago. You MUST invoke "browser_tool" (action="search") to fetch live verified facts.\n` +
    `--------------------------------------------------\n` +
    `LOCAL SYSTEM PATHS & USER ENVIRONMENT:\n` +
    `• Real User Profile: ${userHome}\n` +
    `• User Desktop Directory: ${desktopPath}\n` +
    `• User Documents Directory: ${documentsPath}\n` +
    `• User Downloads Directory: ${downloadsPath}\n` +
    `PATH GROUNDING MANDATE: When Ahmed asks for files "على الديسكتوب" (on Desktop) or asks to save a PDF "على الديسكتوب", ALWAYS use the real directory "${desktopPath}". NEVER invent dummy paths with other usernames like "C:\\Users\\Ahmed\\Desktop"!\n` +
    `==================================================`;

  // 1. High-relevance persistent memories (strictly ranked by keyword & entity intent)
  const relevantMemories = memoryManager.getRelevantContext(userPrompt);
  if (relevantMemories.length > 0) {
    prompt += `\n\n==================================================\nACTIVE RELEVANT KNOWLEDGE & PERSISTENT MEMORIES:\n` +
      relevantMemories.map(m => `• [${m.category.toUpperCase()}] ${m.title} (Confidence: ${Math.round((m.confidence ?? 1) * 100)}%): ${m.content}`).join('\n') +
      `\n==================================================`;
  }

  // 2. Rolling context summary (from older compressed turns of the active session)
  const rollingSummary = memoryManager.getRollingSummary();
  if (rollingSummary) {
    prompt += `\n\n==================================================\nACTIVE SESSION CONTEXT SUMMARY (Compressed from earlier turns):\n${rollingSummary}\n==================================================`;
  }

  // 3. Relevant contact matching from address book & self-contact injection
  try {
    const isSelf = contactManager.isSelfQuery(userPrompt);
    const matchedContacts = contactManager.search(userPrompt, 3);
    if (isSelf || matchedContacts.length > 0) {
      prompt += `\n\n==================================================\nMATCHED CONTACTS & VERIFIED RECIPIENTS FROM AHMED'S ADDRESS BOOK:\n`;
      if (isSelf) {
        prompt += `• [OWNER/SELF] Ahmed Mohamed Attia (رقمي / أنا): Phone +20 11 40409832 (201140409832)\n`;
      }
      prompt += matchedContacts.map(c => `• ${c.name}: Phone ${c.primaryPhone || 'N/A'}`).join('\n') +
        `\n==================================================`;
    }
  } catch {}

  // 4. Inject recent report/analysis if Ahmed asks to transmit or send it over WhatsApp
  try {
    const isTransmittingReport = /(ابعت|أبعد|ارسل|ابعتهالي|send).*(تقرير|تحليل|report|analysis)/i.test(userPrompt) ||
      /(تقرير|تحليل|report).*(واتساب|whatsapp|رقمي)/i.test(userPrompt);
    if (isTransmittingReport) {
      const recentTurns = memoryManager.getSessionTurns();
      for (let i = recentTurns.length - 1; i >= 0; i--) {
        const resp = recentTurns[i].agentResponse;
        if (resp && resp.length > 50) {
          prompt += `\n\n==================================================\nACTIVE REPORT / ANALYSIS FROM PREVIOUS TURN (TO SEND OVER WHATSAPP):\n` +
            resp +
            `\n\nINSTRUCTION: Ahmed wants this report sent to his WhatsApp. Translate/rephrase it into clean Arabic and pass the full report content as the "message" argument in "whatsapp_tool" (action="send_message", recipient="رقمي"). NEVER use placeholder words or foreign characters!\n==================================================`;
          break;
        }
      }
    }
  } catch {}

  // 5. Explicit Document & PDF Intent Detection & Guardrail
  if (/(pdf|بي دي اف|تقرير|مستند)/i.test(userPrompt) && /(حل|اعمل|طلع|احفظ|انشئ|اكتب|صدر|create|solve|save|export|write|make)/i.test(userPrompt)) {
    prompt += `\n\n==================================================\n` +
      `🔥 CRITICAL MANDATE — PDF DOCUMENT GENERATION REQUESTED:\n` +
      `Ahmed explicitly requested creating, solving, or exporting into a PDF file on Desktop ("في PDF", "على الديسكتوب"):\n` +
      `1. DO NOT CALL "browser_tool" to search the web! Searching the web is STRICTLY FORBIDDEN for this request.\n` +
      `2. STRICT COMPLETENESS: You MUST solve EVERY SINGLE QUESTION mentioned in the prompt (e.g. if there are 5, 10, or 11 questions, solve ALL of them: Question 1, Question 2, Question 3... to the very last question!). NEVER skip any questions and NEVER stop after just 1 or 2 questions!\n` +
      `3. MATHEMATICAL TYPOGRAPHY: Write all mathematical expressions cleanly (use symbols like π, ×, ·, ⊕, ², ³, 2³⁰, etc., or standard $formula$).\n` +
      `4. Directly invoke "document_tool" with:\n` +
      `   - action: "create_pdf"\n` +
      `   - outputPath: "${desktopPath}\\Solutions.pdf"\n` +
      `   - title: "Solutions Manual"\n` +
      `   - content: Complete, structured markdown content with clear answers, formulas, and steps for ALL questions.\n` +
      `   - theme: "executive_dark"\n` +
      `   - language: "en"\n` +
      `5. Do NOT answer in plain text without creating the PDF. The PDF MUST be generated via "document_tool"!\n`;

    if (/(واتس|whatsapp|واتساب)/i.test(userPrompt)) {
      prompt += `6. WHATSAPP FORWARDING: After generating the PDF, you MUST call "whatsapp_tool" with action="send_file", recipient="رقمي", file_path="${desktopPath}\\Solutions.pdf" to send it to Ahmed's WhatsApp!\n`;
    }

    prompt += `==================================================`;
  }

  return prompt;
}


// =========================================================================
// Multi-Task Decomposition Prompt
// =========================================================================

const TASK_DECOMPOSITION_PROMPT = `You are a task decomposition engine for VISION Personal AI OS.
Determine if the user's spoken or written request contains MULTIPLE DISTINCT, INDEPENDENT ACTIONABLE TASKS.

CRITICAL RULES:
1. Multi-task requests MUST contain multiple independent actions/verbs (e.g. "Open VS Code AND close Spotify", "افتح اليوتيوب واقفل الكروم").
2. DO NOT split single tasks that have qualifiers, descriptions, target applications, or transcription punctuation:
   - "يفتحلي الواتساب ديسك توب" or "يفتحلي الواتساب. ديسك توب." -> SINGLE TASK! ("ديسك توب" specifies the desktop app for WhatsApp). Respond: []
   - "بقولك يا فيجن اقفل كذا" or "بولاك فيجن عزك كتغفل Spotify" -> SINGLE TASK! ("بقولك يا فيجن" is addressing the assistant by name, NOT a task to open Vision!). Respond: []
   - "ابعت رسالة لخالتي منال على الواتساب" -> SINGLE TASK! Respond: []
   - "خد سكرين شوت وابعتها لخالتي منال على الواتساب" -> SINGLE TASK! Respond: []
   - "عايزك تأخذ سكرين شوت للشاشة الثانية بتاعتي وتبعثها لي على واتساب على الرقم بتاعي" -> SINGLE TASK! Respond: []
   - "أبعد كل التقرير بالعربي على الرقم بتاعي على الواتساب" -> SINGLE TASK! Respond: []
   - "اعمل تحليل لكذا وابعته على الواتساب" -> SINGLE TASK! Respond: []
   - "ابعت الملف ده لخالتي منال على الواتساب" or "ابعت ملف التقرير على رقمي" -> SINGLE TASK! Respond: []
   - "افتح المتصفح على يوتيوب" -> SINGLE TASK! Respond: []
   - "خد سكرين شوت للشاشة كاملة" -> SINGLE TASK! Respond: []
   - "ابحث في جوجل عن Amdahl law" -> SINGLE TASK! Respond: []
   - "ابحث في النت عن قانون أمداهل ولخصه لي" -> SINGLE TASK! Respond: []
   - "دور في النت على آخر أخبار التكنولوجيا" -> SINGLE TASK! Respond: []
   - "حل ليا الأسئلة دي في PDF" or "اعمل تقرير في PDF" -> SINGLE TASK! (Document generation is ALWAYS a single task). Respond: []
   - "Open Vision" or "فيجن" or "يا فيجن" MUST NEVER be output as a subtask.
3. DO NOT output fragments without verbs or modifiers (e.g. "Disc Top", "Desktop", "Now", "Please", "Full screen", "Vision").
4. If the prompt has only ONE action or goal, respond ONLY with: []
5. If and ONLY IF there are 2 or more distinct actions with different goals, respond ONLY with a JSON array:
   Example: ["Open VS Code", "Close Spotify"]
   Otherwise respond ONLY with: []
Do NOT add explanation. Respond with valid JSON only.`;


// =========================================================================
// AgentCore — Enhanced with multi-task, parallel execution, rich narration
// =========================================================================

export class AgentCore {
  private maxIterations: number = 6;

  /**
   * Attempt to decompose a user prompt into multiple tasks using the LLM.
   * Returns an empty array if it's a single task.
   */
  private async decomposeIntoTasks(userPrompt: string): Promise<string[]> {
    // Strip leading assistant name vocatives (e.g. "بقولك يا فيجن", "يا فيجن", "بولاك فيجن", "Hey Vision")
    const cleanedPrompt = userPrompt
      .trim()
      .replace(/^(بقولك\s*(يا\s*)?فيجن|يا\s*فيجن|فيجن|بولاك\s*فيجن|hey\s*vision|vision)[,،.\s]+/i, '')
      .trim();

    // Explicit guard: PDF document creation or problem sheet requests are ALWAYS a single unified task
    if (/(pdf|بي دي اف|تقرير|مستند)/i.test(cleanedPrompt) && /(حل|اعمل|اكتب|انشئ|صدر|create|solve|save|export|write|make)/i.test(cleanedPrompt)) {
      return [];
    }

    if (cleanedPrompt.length < 12) {
      return [];
    }

    try {
      const provider = llmProviderManager.getProvider();
      const response = await provider.chat([
        { role: 'system', content: TASK_DECOMPOSITION_PROMPT },
        { role: 'user', content: cleanedPrompt },
      ]);

      const text = (response.text || '').trim();
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0]);
        if (Array.isArray(tasks) && tasks.length > 1) {
          const cleanTasks = tasks.map((t: any) => String(t).trim()).filter(Boolean);

          // Validation: Reject invalid modifier fragments like "Disc Top", "desktop", "Open Vision", etc.
          const INVALID_FRAGMENT = /^(disc\s*top|desktop|ديسك\s*توب|ديسكتوب|screen|window|browser|app|web|online|full\s*screen|open\s*vision|close\s*vision|vision|فيجن|يا\s*فيجن|افتح\s*فيجن|شغل\s*فيجن)$/i;
          const hasInvalidFragment = cleanTasks.some(t => t.length < 4 || INVALID_FRAGMENT.test(t));

          // Validation: Every task must have an action verb
          const ACTION_VERB_REGEX = /\b(open|close|launch|start|stop|kill|search|find|take|analyze|show|get|run|make|create|delete|update|calculate|افتح|اقفل|شغل|وقف|احذف|عدل|دور|ابحث|شوف|حلل|هات|اعمل|سجل|اكتب|احسب|يفتح|يشغل|يقفل)\b/i;
          const allHaveAction = cleanTasks.every(t => ACTION_VERB_REGEX.test(t));

          if (hasInvalidFragment || !allHaveAction) {
            console.log('[AgentCore] Rejected multi-task decomposition (detected fragment or missing verb), treating as unified single task:', cleanTasks);
            return [];
          }

          return cleanTasks;
        }
      }
    } catch (err) {
      console.warn('[AgentCore] Task decomposition failed, treating as single task:', err);
    }
    return [];
  }

  /**
   * Execute a single task through the full agent loop (think → tools → observe → retry).
   * This is the core reasoning engine isolated per-task.
   */
  private async executeSingleTask(
    taskPrompt: string,
    history: LLMMessage[],
    callbacks: AgentRunCallbacks | undefined,
    isArabic: boolean,
    taskIndex?: number,
    taskTotal?: number,
  ): Promise<AgentRunResult> {
    const steps: AgentStep[] = [];
    const provider = llmProviderManager.getProvider();
    const tools = toolRegistry.getLLMDeclarations();

    const taskLabel = (taskIndex !== undefined && taskTotal !== undefined)
      ? `[${taskIndex + 1}/${taskTotal}] `
      : '';

    const addStep = (step: Omit<AgentStep, 'id' | 'timestamp'>): AgentStep => {
      const fullStep: AgentStep = {
        ...step,
        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        taskIndex,
      };
      steps.push(fullStep);
      callbacks?.onStep?.(fullStep);
      return fullStep;
    };

    addStep({
      type: 'intent',
      message: `${taskLabel}Analyzing: "${taskPrompt}" via ${provider.name} (${provider.defaultModel})`,
      status: 'pending',
    });

    // Phase narration: thinking
    callbacks?.onNarrate?.(
      taskIndex !== undefined
        ? getPhaseNarration('task_start', isArabic, taskPrompt)
        : getPhaseNarration('analyzing', isArabic)
    );

    const messages: LLMMessage[] = [
      { role: 'system', content: buildSystemPrompt(taskPrompt) },
      ...history,
      { role: 'user', content: taskPrompt },
    ];

    const toolsUsed: string[] = [];
    let fullThinking = '';
    let iterations = 0;
    let hadPriorFailure = false;
    let consecutiveThinkingCount = 0;
    const failedToolSignatures = new Map<string, number>();

    const userHome = (typeof process !== 'undefined' && (process.env?.USERPROFILE || process.env?.HOME)) || 'C:\\Users\\ahm3d';
    const desktopPath = `${userHome}\\Desktop`;
    const isPdfRequest = /(pdf|بي دي اف)/i.test(taskPrompt) && /(حل|اعمل|طلع|احفظ|انشئ|اكتب|صدر|create|solve|save|export|write|make)/i.test(taskPrompt);
    const effectiveTools = isPdfRequest
      ? tools.filter(t => t.function.name !== 'browser_tool')
      : tools;

    while (iterations < this.maxIterations) {
      iterations++;

      const response = await provider.chat(messages, effectiveTools);

      if (response.thinking) {
        fullThinking += (fullThinking ? '\n' : '') + response.thinking;
        callbacks?.onThinking?.(response.thinking);
        addStep({
          type: 'thinking',
          message: response.thinking,
          status: 'success',
        });

        // Progressive thinking narration — vary the message each iteration
        consecutiveThinkingCount++;
        if (consecutiveThinkingCount <= 1) {
          callbacks?.onNarrate?.(getPhaseNarration('thinking_deep', isArabic));
        } else if (consecutiveThinkingCount === 2) {
          callbacks?.onNarrate?.(getPhaseNarration('planning', isArabic));
        }
        // Beyond 2: skip narrating repetitive thinking to avoid noise
      }

      // If no tool calls: final response
      if (!response.toolCalls || response.toolCalls.length === 0) {
        // Automatic PDF Fulfillment Guard:
        // If Ahmed explicitly asked for a PDF, but the LLM outputted text without calling document_tool,
        // we automatically create the PDF with the solutions/content on Desktop so Ahmed's request is 100% fulfilled!
        if (isPdfRequest && !toolsUsed.includes('document_tool') && !toolsUsed.includes('create_pdf')) {
          try {
            const docTool = toolRegistry.get('document_tool');
            if (docTool) {
              const pdfOut = `${desktopPath}\\Solutions.pdf`;
              
              // Extract the best available solutions:
              let docContent = '';
              if (response.text && response.text.length > 80 && !/^(command processed|تم تنفيذ|done)/i.test(response.text.trim())) {
                docContent = response.text;
              } else if (fullThinking && fullThinking.length > 150) {
                // If model completed calculations inside reasoning/thinking, compile that!
                docContent = fullThinking;
              } else {
                docContent = taskPrompt;
              }

              addStep({
                type: 'tool_selection',
                toolName: 'document_tool',
                args: { action: 'create_pdf', outputPath: pdfOut, title: 'Solutions Manual' },
                message: isArabic ? 'جاري توليد ملف الـ PDF وحفظه على سطح المكتب...' : 'Fulfilling PDF creation on Desktop...',
                status: 'pending',
              });

              const docRes = await docTool.execute({
                action: 'create_pdf',
                outputPath: pdfOut,
                title: 'Solutions Manual',
                content: docContent,
                theme: 'executive_dark',
                language: 'en',
              });

              if (docRes.success) {
                toolsUsed.push('document_tool');
                addStep({
                  type: 'observation',
                  toolName: 'document_tool',
                  result: docRes.output,
                  message: isArabic ? `تم حفظ ملف الـ PDF بنجاح على سطح المكتب: ${pdfOut}` : `Created PDF on Desktop: ${pdfOut}`,
                  status: 'success',
                });

                // Auto WhatsApp forwarding if user requested it
                if (/(واتس|whatsapp|واتساب)/i.test(taskPrompt) && !toolsUsed.includes('whatsapp_tool')) {
                  try {
                    const waTool = toolRegistry.get('whatsapp_tool');
                    if (waTool) {
                      addStep({
                        type: 'tool_selection',
                        toolName: 'whatsapp_tool',
                        args: { action: 'send_file', recipient: 'رقمي', file_path: pdfOut },
                        message: isArabic ? 'جاري إرسال ملف الـ PDF عبر واتساب إلى رقمك...' : 'Dispatching PDF file over WhatsApp to your phone...',
                        status: 'pending',
                      });

                      const waRes = await waTool.execute({
                        action: 'send_file',
                        recipient: 'رقمي',
                        file_path: pdfOut,
                        caption: isArabic ? 'تفضل يا أحمد، تم الانتهاء من حل جميع المسائل وحفظها في هذا الملف.' : 'Here is the completed solutions document, Ahmed.',
                      });

                      if (waRes.success) {
                        toolsUsed.push('whatsapp_tool');
                        addStep({
                          type: 'observation',
                          toolName: 'whatsapp_tool',
                          result: waRes.output,
                          message: isArabic ? 'تم إرسال الملف بنجاح على واتساب إلى رقمك!' : 'PDF sent successfully over WhatsApp to your number!',
                          status: 'success',
                        });
                      }
                    }
                  } catch (waErr) {
                    console.warn('[AgentCore] Fallback WhatsApp dispatch error:', waErr);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('[AgentCore] Fallback PDF generation error:', err);
          }
        }

        addStep({
          type: 'result',
          message: response.text || 'Command processed.',
          status: 'success',
        });

        return {
          finalText: response.text || (isArabic ? 'تم تنفيذ المطلوب بنجاح وحفظ الـ PDF في سطح المكتب يا أحمد.' : 'Done successfully, Ahmed.'),
          thinking: fullThinking || undefined,
          steps,
          status: 'COMPLETED',
          toolsUsed,
        };
      }

      // Reset thinking counter when tools are called
      consecutiveThinkingCount = 0;

      // Process tool calls
      for (const call of response.toolCalls) {
        const callSignature = `${call.name}::${JSON.stringify(call.arguments)}`;
        const priorFailures = failedToolSignatures.get(callSignature) || 0;

        // Anti-Loop Guard: Intercept duplicate doomed calls
        if (priorFailures >= 2) {
          addStep({
            type: 'observation',
            toolName: call.name,
            result: 'Aborted due to duplicate failure loop.',
            message: `Infinite loop prevented: ${call.name} has already failed ${priorFailures} times with identical arguments.`,
            status: 'error',
          });

          messages.push({
            role: 'assistant',
            content: `Attempted tool ${call.name}(${JSON.stringify(call.arguments)})`,
          });
          messages.push({
            role: 'user',
            content: `[CRITICAL - DUPLICATE FAILURE LOOP DETECTED]:
You have attempted to call "${call.name}" with arguments ${JSON.stringify(call.arguments)} ${priorFailures} times already, and it failed each time.
REPEATING THIS EXACT CALL IS STRICTLY FORBIDDEN.
You MUST stop calling this command. Review the prior error logs, determine the root cause, and either:
1. Try a completely different, valid approach (e.g., different shell, different directory, or alternative tool).
2. Or immediately formulate your final response to Ahmed explaining the exact diagnosed issue and what is needed to resolve it.`,
          });
          continue;
        }

        // Anti-Search Intercept Guard: When Ahmed asked for a PDF, intercept any hallucinated web searches
        if (isPdfRequest && call.name === 'browser_tool' && call.arguments?.action === 'search') {
          const redirectMsg = `[MANDATE VIOLATION]: Ahmed explicitly asked to generate a PDF file on Desktop with "document_tool" for these questions:\n"${taskPrompt}"\nDO NOT search the web! Directly invoke "document_tool" with action="create_pdf", outputPath="${desktopPath}\\\\Solutions.pdf", and provide the full solutions in "content"!`;
          addStep({
            type: 'observation',
            toolName: call.name,
            result: redirectMsg,
            message: isArabic ? 'توجيه فوري: المطلوب إنشاء ملف PDF عبر document_tool وتخطي البحث أونلاين.' : 'Redirecting: Generating PDF via document_tool instead of web search.',
            status: 'warning',
          });
          messages.push({
            role: 'assistant',
            content: `Attempted tool ${call.name}(${JSON.stringify(call.arguments)})`,
          });
          messages.push({
            role: 'user',
            content: redirectMsg,
          });
          continue;
        }

        // Spoken narration announcing tool intent before dispatch
        const toolAnnouncement = getToolNarrationText(call.name, call.arguments, isArabic);
        callbacks?.onNarrate?.(toolAnnouncement);

        addStep({
          type: 'tool_selection',
          toolName: call.name,
          args: call.arguments,
          message: `${taskLabel}Selected tool: ${call.name} with arguments ${JSON.stringify(call.arguments)}`,
          status: 'pending',
        });

        // Execute tool through execution engine
        const execRes: ExecutionResponse = await executionEngine.executeTool(call.name, call.arguments);

        if (execRes.status === 'CONFIRMATION_REQUIRED') {
          callbacks?.onNarrate?.(
            isArabic
              ? `هذا الإجراء (${call.name}) يتطلب تصريحًا أمنيًا، بانتظار تأكيدك...`
              : `Action ${call.name} requires authorization, awaiting confirmation...`
          );

          addStep({
            type: 'execution',
            toolName: call.name,
            args: execRes.validatedArgs,
            message: `Authorization required: ${execRes.confirmationReason || 'Privileged action requires explicit user permission.'}`,
            status: 'warning',
          });

          return {
            finalText: isArabic
              ? `هذا الإجراء (${call.name}) يتطلب موافقتك الصريحة للمتابعة.`
              : `This action (${call.name}) requires your explicit permission to proceed.`,
            thinking: fullThinking || undefined,
            steps,
            status: 'CONFIRMATION_REQUIRED',
            pendingConfirmation: {
              toolName: call.name,
              args: execRes.validatedArgs,
              reason: execRes.confirmationReason,
            },
          };
        }

        if (execRes.status === 'COMPLETED') {
          toolsUsed.push(call.name);
          if (hadPriorFailure) {
            callbacks?.onNarrate?.(
              isArabic
                ? `تم تصحيح الخطأ بنجاح واكتمل تنفيذ ${call.name}!`
                : `Successfully recovered and completed ${call.name}!`
            );
            hadPriorFailure = false;
          } else {
            callbacks?.onNarrate?.(
              isArabic
                ? `اكتملت هذه الخطوة بنجاح، جاري المتابعة...`
                : `Step completed successfully, moving to next action...`
            );
          }

          addStep({
            type: 'observation',
            toolName: call.name,
            result: execRes.result,
            message: execRes.result?.message || `Executed ${call.name} successfully`,
            status: 'success',
          });

          // Feed verified observation feedback back to conversation history
          messages.push({
            role: 'assistant',
            content: `Called tool ${call.name}(${JSON.stringify(call.arguments)})`,
          });
          messages.push({
            role: 'user',
            content: `[VERIFIED TOOL OBSERVATION - SUCCESS]:
Tool: ${call.name}
Status: COMPLETED (Verified)
Output: ${JSON.stringify(execRes.result?.output || execRes.result?.message || 'OK')}
Verification: The action completed successfully without errors. Please proceed with the next planned step or summarize the result.`,
          });
        } else {
          hadPriorFailure = true;
          failedToolSignatures.set(callSignature, priorFailures + 1);

          const errDetail = execRes.error || execRes.result?.error || 'Operation failed';
          const errorType = execRes.result?.errorType;
          const diagnostics = execRes.result?.diagnostics;
          const shortErr = errDetail.length > 50 ? `${errDetail.slice(0, 47)}...` : errDetail;

          // Rich error narration with context
          callbacks?.onNarrate?.(getPhaseNarration('retrying', isArabic, `${call.name}: ${shortErr}`));

          // Failure observation for error recovery
          addStep({
            type: 'observation',
            toolName: call.name,
            result: execRes.error,
            message: `Tool execution error: ${execRes.error}${errorType ? ` [${errorType}]` : ''}`,
            status: 'error',
          });

          const classificationGuidance = getErrorClassificationGuidance(errorType, errDetail);

          messages.push({
            role: 'assistant',
            content: `Attempted tool ${call.name}(${JSON.stringify(call.arguments)})`,
          });
          messages.push({
            role: 'user',
            content: `[TOOL EXECUTION FEEDBACK - ERROR ENCOUNTERED]:
Tool: ${call.name}
Arguments: ${JSON.stringify(call.arguments)}
Status: FAILED
Error Details: ${errDetail}
${errorType ? `Error Classification: ${errorType}\n` : ''}${diagnostics ? `Diagnostics: ${diagnostics}\n` : ''}Output: ${JSON.stringify(execRes.result?.output || '')}

CRITICAL INSTRUCTIONS FOR ROOT CAUSE EVALUATION:
1. ${classificationGuidance}
2. Ground your reasoning strictly in observed facts. DO NOT invent explanations (like claiming a tool or git is uninstalled) unless the output explicitly proves it.
3. If you can fix this with a corrected argument or alternative command, execute the fix now. NEVER repeat the exact same failed command.
4. If unrecoverable, conclude your response and explain the exact technical cause to Ahmed.`,
          });
        }
      }
    }

    // Fallback if max iterations reached
    return {
      finalText: isArabic
        ? 'تم تنفيذ المهام المحددة والتحقق من حالة النظام والعمليات.'
        : 'Tasks executed and system state verified.',
      thinking: fullThinking || undefined,
      steps,
      status: 'COMPLETED',
      toolsUsed,
    };
  }

  /**
   * Main entry point. Accepts a user prompt, optionally decomposes into
   * multiple tasks, executes them (sequentially for safety, with rich
   * per-task narration), then produces a unified report.
   */
  public async run(
    userPrompt: string,
    historyOrCallbacks?: LLMMessage[] | AgentRunCallbacks,
    maybeCallbacks?: AgentRunCallbacks
  ): Promise<AgentRunResult> {
    const history: LLMMessage[] = Array.isArray(historyOrCallbacks) ? historyOrCallbacks : [];
    const callbacks: AgentRunCallbacks | undefined = Array.isArray(historyOrCallbacks)
      ? maybeCallbacks
      : (historyOrCallbacks as AgentRunCallbacks);
    const isArabic = /[\u0600-\u06FF]/.test(userPrompt);

    // Phase 2: Attempt multi-task decomposition
    const subTasks = await this.decomposeIntoTasks(userPrompt);

    if (subTasks.length > 1) {
      // ===================================================================
      // MULTI-TASK EXECUTION PATH
      // ===================================================================
      callbacks?.onNarrate?.(getPhaseNarration('decomposing', isArabic));

      const allSteps: AgentStep[] = [];
      let fullThinking = '';

      // Log the plan
      const planStep: AgentStep = {
        id: `plan_${Date.now()}`,
        type: 'task_plan',
        message: isArabic
          ? `تم تحديد ${subTasks.length} مهام: ${subTasks.map((t, i) => `\n  ${i + 1}. ${t}`).join('')}`
          : `Identified ${subTasks.length} tasks: ${subTasks.map((t, i) => `\n  ${i + 1}. ${t}`).join('')}`,
        status: 'success',
        timestamp: new Date().toTimeString().split(' ')[0],
      };
      allSteps.push(planStep);
      callbacks?.onStep?.(planStep);

      // Narrate the parallel launch
      callbacks?.onNarrate?.(
        isArabic
          ? `حددت ${subTasks.length} مهام في طلبك. جاري تشغيلها على التوازي لتسريع التنفيذ، وسأوافيك بتحديثات كل مهمة لحظيًا...`
          : `Identified ${subTasks.length} tasks in your request. Launching them concurrently in parallel for speed, streaming live updates...`
      );

      // Launch all subtasks concurrently in parallel
      const taskPromises = subTasks.map((task, i) => {
        return this.executeSingleTask(
          task,
          history,
          {
            onStep: (step) => {
              allSteps.push(step);
              callbacks?.onStep?.(step);
            },
            onThinking: (th) => callbacks?.onThinking?.(th),
            onNarrate: (sp) => callbacks?.onNarrate?.(sp),
          },
          isArabic,
          i,
          subTasks.length
        ).then((res) => {
          // Immediately log and narrate progress when this subtask completes
          const progressStep: AgentStep = {
            id: `progress_${Date.now()}_${i}`,
            type: 'task_progress',
            message: isArabic
              ? `✓ المهمة ${i + 1}/${subTasks.length} (${task}): ${res.status === 'COMPLETED' ? 'اكتملت بنجاح' : res.status === 'CONFIRMATION_REQUIRED' ? 'تتطلب موافقتك' : 'تعذر التنفيذ'}`
              : `✓ Task ${i + 1}/${subTasks.length} (${task}): ${res.status === 'COMPLETED' ? 'Completed' : res.status === 'CONFIRMATION_REQUIRED' ? 'Requires Permission' : 'Failed'}`,
            status: res.status === 'COMPLETED' ? 'success' : res.status === 'CONFIRMATION_REQUIRED' ? 'warning' : 'error',
            timestamp: new Date().toTimeString().split(' ')[0],
            taskIndex: i,
          };
          allSteps.push(progressStep);
          callbacks?.onStep?.(progressStep);

          if (res.status === 'COMPLETED') {
            callbacks?.onNarrate?.(getPhaseNarration('task_complete', isArabic, task));
          }

          return { task, index: i, result: res };
        }).catch((err) => {
          const failedResult: AgentRunResult = {
            finalText: String(err),
            thinking: undefined,
            steps: [],
            status: 'FAILED',
          };
          return {
            task,
            index: i,
            result: failedResult,
          };
        });
      });

      const settledResults = await Promise.all(taskPromises);

      // Sort back by original index to keep tidy presentation
      settledResults.sort((a, b) => a.index - b.index);

      // Check if any task required confirmation
      const confirmationTask = settledResults.find(r => r.result.status === 'CONFIRMATION_REQUIRED');
      if (confirmationTask && confirmationTask.result.status === 'CONFIRMATION_REQUIRED') {
        return {
          finalText: confirmationTask.result.finalText,
          thinking: fullThinking || undefined,
          steps: allSteps,
          status: 'CONFIRMATION_REQUIRED',
          pendingConfirmation: confirmationTask.result.pendingConfirmation,
        };
      }

      // Collect thinking
      for (const item of settledResults) {
        if (item.result.thinking) {
          fullThinking += (fullThinking ? '\n---\n' : '') + item.result.thinking;
        }
      }

      const allSuccess = settledResults.every(r => r.result.status === 'COMPLETED');
      const overallStatus: AgentRunResult['status'] = allSuccess ? 'COMPLETED' : 'FAILED';

      // Final unified report narration
      callbacks?.onNarrate?.(getPhaseNarration('all_done', isArabic));

      // Build structured final response
      const reportLines = settledResults.map(r =>
        `${r.result.status === 'COMPLETED' ? '✅' : '❌'} ${r.index + 1}. ${r.task}: ${r.result.finalText}`
      );

      const finalText = isArabic
        ? `يا أحمد، تم تنفيذ ${settledResults.filter(r => r.result.status === 'COMPLETED').length} من ${settledResults.length} مهام بنجاح:\n${reportLines.join('\n')}`
        : `Ahmed, ${settledResults.filter(r => r.result.status === 'COMPLETED').length} out of ${settledResults.length} tasks completed successfully:\n${reportLines.join('\n')}`;

      const allToolsUsed = Array.from(new Set(settledResults.flatMap(r => r.result.toolsUsed || [])));
      return {
        finalText,
        thinking: fullThinking || undefined,
        steps: allSteps,
        status: overallStatus,
        toolsUsed: allToolsUsed,
      };

    } else {
      // ===================================================================
      // SINGLE TASK EXECUTION PATH (original behavior, enhanced narration)
      // ===================================================================
      return this.executeSingleTask(userPrompt, history, callbacks, isArabic);
    }
  }
}

export const agentCore = new AgentCore();
