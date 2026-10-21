import { toolRegistry } from '../src/core/tools/registry';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import { systemMediaService } from '../src/main/services/SystemMediaService';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    if (detail) console.error('   └─ Detail:', detail);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
  if (detail) console.log('   └─', detail);
}

async function runOsMediaClipboardSuite() {
  console.log('====================================================');
  console.log('🚀 VISION OS, MEDIA, VOLUME & CLIPBOARD TEST SUITE');
  console.log('====================================================\n');

  // Set up mock desktop visionAPI on global window
  let clipboardMemory = 'initial clipboard content';
  let lastNotification: any = null;

  (global as any).window = {
    visionAPI: {
      mediaControl: async (opts: any) => {
        return await systemMediaService.mediaControl(opts.action);
      },
      volumeControl: async (opts: any) => {
        return await systemMediaService.volumeControl(opts);
      },
      clipboard: async (opts: any) => {
        if (opts.action === 'read') {
          return { success: true, text: clipboardMemory, length: clipboardMemory.length };
        }
        if (opts.action === 'write') {
          clipboardMemory = opts.text || '';
          return { success: true, message: 'Text copied to clipboard.', length: clipboardMemory.length };
        }
        if (opts.action === 'clear') {
          clipboardMemory = '';
          return { success: true, message: 'Clipboard cleared.' };
        }
        return { success: false, error: 'Unknown action' };
      },
      showNotification: async (opts: any) => {
        lastNotification = opts;
        return { success: true, message: `Notification "${opts.title}" displayed.` };
      },
      executeCommand: async () => ({ success: true, stdout: 'ok', stderr: '', exitCode: 0 }),
      getTelemetry: async () => ({ cpuUsage: 12, memoryUsageMb: 8000, totalMemoryMb: 32000, uptime: 100 }),
    },
  };

  registerBuiltinTools();

  // --- Test 1: Tool Registry Presence ---
  console.log('--- Test 1: Registry Verification ---');
  const mediaTool = toolRegistry.get('media_control');
  const volumeTool = toolRegistry.get('volume_control');
  const clipTool = toolRegistry.get('clipboard');
  const notifTool = toolRegistry.get('system_notification');
  const sysHub = toolRegistry.get('system_tool');

  assert(mediaTool !== undefined, 'media_control is registered');
  assert(volumeTool !== undefined, 'volume_control is registered');
  assert(clipTool !== undefined, 'clipboard is registered');
  assert(notifTool !== undefined, 'system_notification is registered');
  assert(sysHub !== undefined, 'system_tool hub is registered');

  // --- Test 2: media_control ---
  console.log('\n--- Test 2: media_control Tool ---');
  const mediaVal = mediaTool!.validateInput({ action: 'play_pause' });
  assert(mediaVal.success, 'Validates play_pause action');
  const mediaNextVal = mediaTool!.validateInput({ action: 'next' });
  assert(mediaNextVal.success, 'Validates next action');
  const mediaBadVal = mediaTool!.validateInput({ action: 'invalid_action' as any });
  assert(!mediaBadVal.success, 'Rejects invalid action');

  // --- Test 3: volume_control ---
  console.log('\n--- Test 3: volume_control Tool ---');
  const volGetVal = volumeTool!.validateInput({ action: 'get' });
  assert(volGetVal.success, 'Validates get action');
  const volSetVal = volumeTool!.validateInput({ action: 'set', level: 45 });
  assert(volSetVal.success, 'Validates set action with level');
  const volStepVal = volumeTool!.validateInput({ action: 'step_up', step: 10 });
  assert(volStepVal.success, 'Validates step_up action with step');

  // Live execution test against systemMediaService
  const volGetRes = await volumeTool!.execute({ action: 'get' });
  assert(volGetRes.success, 'Successfully queried master volume', volGetRes.message);
  assert(typeof volGetRes.output?.volume === 'number', 'Volume output is a valid number', volGetRes.output?.volume);

  // --- Test 4: clipboard Tool ---
  console.log('\n--- Test 4: clipboard Tool ---');
  const clipWriteRes = await clipTool!.execute({ action: 'write', text: 'VISION Autonomous OS' });
  assert(clipWriteRes.success, 'Clipboard write succeeds', clipWriteRes.message);

  const clipReadRes = await clipTool!.execute({ action: 'read' });
  assert(clipReadRes.success, 'Clipboard read succeeds');
  assert(clipReadRes.output?.text === 'VISION Autonomous OS', 'Clipboard read returns exact copied text');

  const clipClearRes = await clipTool!.execute({ action: 'clear' });
  assert(clipClearRes.success, 'Clipboard clear succeeds');

  const clipReadEmpty = await clipTool!.execute({ action: 'read' });
  assert(clipReadEmpty.output?.text === '', 'Clipboard is empty after clear');

  // --- Test 5: system_notification Tool ---
  console.log('\n--- Test 5: system_notification Tool ---');
  const notifVal = notifTool!.validateInput({
    title: 'تنبيه نظام',
    message: 'تم فحص الموارد بنجاح',
    sound: true,
    urgency: 'normal',
  });
  assert(notifVal.success, 'Validates notification payload');

  const notifExec = await notifTool!.execute({
    title: 'تنبيه نظام',
    message: 'تم فحص الموارد بنجاح',
  });
  assert(notifExec.success, 'system_notification executes successfully', notifExec.message);
  assert(lastNotification?.title === 'تنبيه نظام', 'Notification title passed through bridge');

  // --- Test 6: Unified Domain Hub (system_tool) Execution ---
  console.log('\n--- Test 6: Unified Domain Hub (system_tool) Integration ---');

  // Hub: media_control
  const hubMedia = await sysHub!.execute({
    action: 'media_control',
    media_action: 'play_pause',
  });
  assert(hubMedia.success, 'system_tool dispatches media_control', hubMedia.message);

  // Hub: volume_control
  const hubVolume = await sysHub!.execute({
    action: 'volume_control',
    volume_action: 'get',
  });
  assert(hubVolume.success, 'system_tool dispatches volume_control (get)', hubVolume.message);

  // Hub: clipboard
  const hubClipWrite = await sysHub!.execute({
    action: 'clipboard',
    clipboard_action: 'write',
    clipboard_text: 'VISION Domain Hub Pipeline',
  });
  assert(hubClipWrite.success, 'system_tool dispatches clipboard (write)');

  const hubClipRead = await sysHub!.execute({
    action: 'clipboard',
    clipboard_action: 'read',
  });
  assert(hubClipRead.success, 'system_tool dispatches clipboard (read)');
  assert(hubClipRead.output?.text === 'VISION Domain Hub Pipeline', 'system_tool read matched written clipboard text');

  // Hub: notify
  const hubNotify = await sysHub!.execute({
    action: 'notify',
    notification_title: 'مهمة اكتملت',
    notification_message: 'تم الانتهاء بنجاح من تحليل البيانات.',
  });
  assert(hubNotify.success, 'system_tool dispatches notify', hubNotify.message);
  assert(lastNotification?.title === 'مهمة اكتملت', 'Notification received expected title');

  console.log('\n====================================================');
  console.log('🎯 ALL OS, MEDIA & CLIPBOARD TOOLS FULLY TESTED & VERIFIED!');
  console.log('====================================================\n');
}

runOsMediaClipboardSuite().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
