import readline from 'readline';
import { agentCore } from '../src/core/agent/AgentCore';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import { llmProviderManager } from '../src/core/providers/llm';
import { systemMediaService } from '../src/main/services/SystemMediaService';
import { safeReadFile, safeWriteFile, safeEditFile, safeSearchFiles, safeTrashFile } from '../src/main/services/SafeFilesystemService';
import { executionEngine } from '../src/core/execution/ExecutionEngine';

// Ensure desktop visionAPI bridge is active for CLI testing
(global as any).window = {
  visionAPI: {
    fsReadFile: async (opts: any) => safeReadFile(opts),
    fsWriteFile: async (opts: any) => safeWriteFile(opts),
    fsEditFile: async (opts: any) => safeEditFile(opts),
    fsSearchFiles: async (opts: any) => safeSearchFiles(opts),
    fsTrashFile: async (opts: any) => safeTrashFile(opts),
    mediaControl: async (opts: any) => systemMediaService.mediaControl(opts.action),
    volumeControl: async (opts: any) => systemMediaService.volumeControl(opts),
    clipboard: async (opts: any) => {
      // In CLI node environment, use simple memory clipboard or PowerShell clipboard
      const { execSync } = await import('child_process');
      if (opts.action === 'read') {
        const text = execSync('powershell -NoProfile -Command "Get-Clipboard"').toString().trim();
        return { success: true, text, length: text.length };
      }
      if (opts.action === 'write') {
        const escaped = (opts.text || '').replace(/"/g, '`"');
        execSync(`powershell -NoProfile -Command "Set-Clipboard -Value \\"${escaped}\\""`);
        return { success: true, message: 'Text copied to clipboard.' };
      }
      if (opts.action === 'clear') {
        execSync('powershell -NoProfile -Command "Set-Clipboard -Value \\"\\""');
        return { success: true, message: 'Clipboard cleared.' };
      }
      return { success: false, error: 'Unknown clipboard action' };
    },
    showNotification: async (opts: any) => {
      console.log(`\n🔔 [WINDOWS NOTIFICATION]: ${opts.title} - ${opts.message}`);
      return { success: true, message: `Notification "${opts.title}" sent.` };
    },
    executeCommand: async (opts: any) => {
      const { execSync } = await import('child_process');
      try {
        const out = execSync(opts.command, {
          encoding: 'utf-8',
          timeout: opts.timeout || 35000,
          cwd: opts.cwd || process.cwd(),
          maxBuffer: 10 * 1024 * 1024,
          shell: opts.shell === 'cmd' ? 'cmd.exe' : 'powershell.exe',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        return { success: true, stdout: out, stderr: '', exitCode: 0 };
      } catch (err: any) {
        return {
          success: false,
          stdout: err.stdout ? err.stdout.toString() : '',
          stderr: err.stderr ? err.stderr.toString() : (err.message || ''),
          exitCode: err.status ?? 1,
        };
      }
    },
  },
};

registerBuiltinTools();

// Set active provider to Gemini (or Ollama if available)
llmProviderManager.setActiveProvider('gemini');

async function testPrompt(userPrompt: string) {
  console.log(`\n============================================================`);
  console.log(`👤 USER: "${userPrompt}"`);
  console.log(`============================================================\n`);

  console.log(`⏳ جاري المعالجة واستدعاء الموديل...\n`);

  try {
    const result = await agentCore.run(userPrompt, {
      onThinking: (t) => {
        if (t) console.log(`🧠 [تفكير الموديل]:\n${t}\n`);
      },
      onStep: (step) => {
        if (step.type === 'tool_selection') {
          console.log(`🛠️ [اختيار الأداة]: ${step.toolName}`);
          console.log(`   └─ المدخلات:`, JSON.stringify(step.args, null, 2));
        } else if (step.type === 'execution') {
          console.log(`⚡ [تنفيذ الأداة]: ${step.message}`);
        } else if (step.type === 'observation') {
          console.log(`👁️ [الملاحظة والنتيجة]: ${step.message}`);
        }
      },
      onNarrate: (speech) => {
        if (speech) console.log(`🗣️ [النطق المباشر]: "${speech}"`);
      },
    });

    console.log(`\n------------------------------------------------------------`);
    console.log(`🤖 رد VISION النهائي:`);
    console.log(result.finalText);
    console.log(`------------------------------------------------------------`);
    console.log(`الحالة: ${result.status} | الأدوات المستخدمة: ${result.toolsUsed?.join(', ') || 'لا يوجد'}\n`);

    if (result.status === 'CONFIRMATION_REQUIRED' && result.pendingConfirmation) {
      console.log(`\n🛡️ [تنبيه أمني - يتطلب موافقتك الصريحة]:`);
      console.log(`   └─ الأداة: ${result.pendingConfirmation.toolName}`);
      console.log(`   └─ السبب: ${result.pendingConfirmation.reason}`);
      console.log(`   └─ المدخلات:`, JSON.stringify(result.pendingConfirmation.args, null, 2));

      if (process.argv.includes('--auto-confirm') || process.env.AUTO_CONFIRM === 'true') {
        console.log(`\n✅ تم التأكيد التلقائي (--auto-confirm). جاري استكمال التنفيذ فوراً...`);
        const resumeRes = await executionEngine.executeTool(
          result.pendingConfirmation.toolName,
          result.pendingConfirmation.args,
          { confirmed: true, caller: 'test_agent' }
        );
        console.log(`⚡ [نتيجة التنفيذ بعد الموافقة]:`, resumeRes.result?.message || resumeRes.status);
        if (resumeRes.result?.output) {
          console.log(`📄 [المخرجات]:`, JSON.stringify(resumeRes.result.output, null, 2));
        }
      }
    }
  } catch (err: any) {
    console.error(`❌ خطأ أثناء تشغيل الموديل:`, err.message || err);
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const promptArgs = rawArgs.filter(a => a !== '--auto-confirm');
  if (promptArgs.length > 0) {
    // Single command execution
    await testPrompt(promptArgs.join(' '));
    process.exit(0);
  }

  // Interactive Loop
  console.log(`
╔════════════════════════════════════════════════════════════╗
║             VISION AI OS — INTERACTIVE TEST CLI            ║
╚════════════════════════════════════════════════════════════╝
جرب أوامر المطور و Git:
  - لخص لي المشروع ده بيعمل إيه والتقنيات المستخدمة فيه
  - افحص لي حالة الـ Git في المشروع
  - اعرض لي الفروقات والتغييرات الحالية (diff)
  - اعمل branch جديد باسم feature/developer-tools
  - اعمل commit للتعديلات برسالة "feat: add developer tools"

أو أوامر النظام والوسائط والملفات:
  - وطي الصوت شوية / الصوت حالياً كام في المية؟
  - ايه اللي مكتوب في الحافظة (clipboard)؟
  - دور على الملفات اللي بتنتهي بـ .test.ts
  - احفظ في الذاكرة معلومة: "أحمد يفضل استخدام pnpm"
  - exit أو خروج للإنهاء
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question('💬 أنت: ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === 'exit' || trimmed === 'خروج') {
        console.log('مع السلامة!');
        rl.close();
        process.exit(0);
      }
      await testPrompt(trimmed);
      promptUser();
    });
  };

  promptUser();
}

main();
