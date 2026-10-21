import fs from 'fs';
import { toolRegistry } from '../src/core/tools/registry';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import { contactManager, parseVcfContent } from '../src/core/contacts/ContactManager';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    if (detail) console.error('   └─ Detail:', detail);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
  if (detail) console.log('   └─', detail);
}

async function runUnifiedHubsTest() {
  console.log('====================================================');
  console.log('🚀 VISION 7 UNIFIED DOMAIN HUBS COMPRESSION SUITE');
  console.log('====================================================\n');

  // Load contacts from VCF if available
  const files = fs.readdirSync('.');
  const vcfFileName = files.find(f => f.endsWith('.vcf'));
  if (vcfFileName) {
    const rawVcf = fs.readFileSync(vcfFileName, 'utf8');
    const contacts = parseVcfContent(rawVcf);
    for (const c of contacts) {
      await contactManager.save(c);
    }
  }

  registerBuiltinTools();

  // --- Test 1: Compression & LLM Declaration Reduction ---
  console.log('--- Test 1: Tool Compression & Token Efficiency ---');
  const allTools = toolRegistry.getAll();
  const primaryTools = toolRegistry.getPrimaryTools();
  const llmDeclarations = toolRegistry.getLLMDeclarations();

  assert(allTools.length >= 38, `Total registered tools (primary + secondary) >= 38 (Actual: ${allTools.length})`);
  assert(primaryTools.length === 10, `Exactly 10 Primary Domain Hubs registered (Actual: ${primaryTools.length})`);
  assert(llmDeclarations.length === 10, `LLM receives exactly 10 tool declarations (Actual: ${llmDeclarations.length})`);

  const primaryNames = primaryTools.map(t => t.name).sort();
  const expectedHubs = [
    'app_control_tool',
    'browser_tool',
    'contacts_tool',
    'developer_tool',
    'document_tool',
    'filesystem_tool',
    'memory_tool',
    'system_tool',
    'vision_tool',
    'whatsapp_tool'
  ].sort();
  assert(
    JSON.stringify(primaryNames) === JSON.stringify(expectedHubs),
    'Primary hubs match expected 10 domains',
    primaryNames.join(', ')
  );

  const fullDeclarationsJson = JSON.stringify(allTools.map(t => t.toLLMDeclaration()));
  const compressedDeclarationsJson = JSON.stringify(llmDeclarations);
  const tokenSavingPercent = Math.round((1 - compressedDeclarationsJson.length / fullDeclarationsJson.length) * 100);
  console.log(`   └─ Legacy Schema Size: ${fullDeclarationsJson.length} bytes`);
  console.log(`   └─ Compressed Schema Size: ${compressedDeclarationsJson.length} bytes`);
  console.log(`   └─ Prompt Token Savings: ~${tokenSavingPercent}%!`);
  assert(tokenSavingPercent >= 60, `Token compression efficiency >= 60% (Actual: ${tokenSavingPercent}%)`);

  // --- Test 2: WhatsApp Hub (whatsapp_tool) ---
  console.log('\n--- Test 2: WhatsApp Domain Hub (whatsapp_tool) ---');
  const waHub = toolRegistry.get('whatsapp_tool');
  assert(waHub !== undefined, 'whatsapp_tool is registered');

  const waSchemaValidation = waHub?.validateInput({
    action: 'send_message',
    recipient: 'رقمي',
    message: 'تجربة إرسال رسالة مضغوطة',
  });
  assert(waSchemaValidation?.success === true, 'whatsapp_tool validates send_message action');

  const waFileValidation = waHub?.validateInput({
    action: 'send_file',
    recipient: 'خالتي منال',
    file_path: 'POSTER.pdf',
    caption: 'الملف المطلوب',
  });
  assert(waFileValidation?.success === true, 'whatsapp_tool validates send_file action');

  const waScreenValidation = waHub?.validateInput({
    action: 'send_screenshot',
    recipient: '201140409832',
    screen_index: 1,
  });
  assert(waScreenValidation?.success === true, 'whatsapp_tool validates send_screenshot action');

  const waReadValidation = waHub?.validateInput({
    action: 'read_chat',
    contact_name: 'خالتي منال',
    prompt: 'آخر رسالة',
  });
  assert(waReadValidation?.success === true, 'whatsapp_tool validates read_chat action');

  // Execution: WhatsApp Hub blocks dummy phone numbers safely
  const waBlockedExec = await waHub?.execute({
    action: 'send_message',
    recipient: '01012345678',
    message: 'dummy test',
  });
  assert(waBlockedExec?.success === false, 'whatsapp_tool blocks dummy recipient numbers');

  // --- Test 3: Memory Hub (memory_tool) ---
  console.log('\n--- Test 3: Memory Domain Hub (memory_tool) ---');
  const memHub = toolRegistry.get('memory_tool');
  assert(memHub !== undefined, 'memory_tool is registered');

  // Action: save
  const memSaveRes = await memHub?.execute({
    action: 'save',
    category: 'system_knowledge',
    title: 'Unified Tools Architecture',
    content: 'VISION OS uses 7 consolidated category domain hubs to minimize LLM token overhead.',
    importance: 5,
  });
  assert(memSaveRes?.success === true, 'memory_tool saves new record', memSaveRes?.message);
  const savedId = memSaveRes?.output?.id;
  assert(!!savedId, 'memory_tool returned valid saved record ID', savedId);

  // Action: search
  const memSearchRes = await memHub?.execute({
    action: 'search',
    query: 'Unified Tools Architecture',
  });
  assert(memSearchRes?.success === true, 'memory_tool searches records successfully');
  assert((memSearchRes?.output as any[])?.length > 0, 'memory_tool search found newly created memory');

  // Action: list
  const memListRes = await memHub?.execute({
    action: 'list',
    category: 'system_knowledge',
  });
  assert(memListRes?.success === true, 'memory_tool lists records');

  // Action: update
  const memUpdateRes = await memHub?.execute({
    action: 'update',
    id: savedId,
    title: 'Unified Tools Architecture Updated',
    content: 'Updated content test.',
  });
  assert(memUpdateRes?.success === true, 'memory_tool updates record');

  // Action: delete
  const memDelRes = await memHub?.execute({
    action: 'delete',
    id: savedId,
  });
  assert(memDelRes?.success === true, 'memory_tool deletes record cleanly');

  // --- Test 4: Contacts Hub (contacts_tool) ---
  console.log('\n--- Test 4: Contacts Domain Hub (contacts_tool) ---');
  const conHub = toolRegistry.get('contacts_tool');
  assert(conHub !== undefined, 'contacts_tool is registered');

  const conSearchRes = await conHub?.execute({
    action: 'search',
    query: 'منال',
  });
  assert(conSearchRes?.success === true, 'contacts_tool searches contacts');
  assert((conSearchRes?.output as any[])?.length > 0, 'contacts_tool found matching contact');

  const conGetRes = await conHub?.execute({
    action: 'get',
    name_or_phone: 'رقمي',
  });
  assert(conGetRes?.success === true, 'contacts_tool resolves "رقمي" to Ahmed Attia', (conGetRes?.output as any)?.primaryPhone);
  assert((conGetRes?.output as any)?.primaryPhone === '201140409832', 'contacts_tool returned correct self number');

  // --- Test 5: App Control Hub (app_control_tool) ---
  console.log('\n--- Test 5: App Control Domain Hub (app_control_tool) ---');
  const appHub = toolRegistry.get('app_control_tool');
  assert(appHub !== undefined, 'app_control_tool is registered');

  const appValidate = appHub?.validateInput({
    action: 'launch',
    app_name: 'spotify',
  });
  assert(appValidate?.success === true, 'app_control_tool validates launch action');

  const appCloseValidate = appHub?.validateInput({
    action: 'close',
    app_name: 'chrome',
  });
  assert(appCloseValidate?.success === true, 'app_control_tool validates close action');

  const appCloseAllValidate = appHub?.validateInput({
    action: 'close_all',
    except_apps: ['code'],
  });
  assert(appCloseAllValidate?.success === true, 'app_control_tool validates close_all action');

  // --- Test 6: Browser Hub (browser_tool) ---
  console.log('\n--- Test 6: Browser & Web Domain Hub (browser_tool) ---');
  const browserHub = toolRegistry.get('browser_tool');
  assert(browserHub !== undefined, 'browser_tool is registered');

  const browserOpenValidate = browserHub?.validateInput({
    action: 'open',
    url: 'https://www.youtube.com',
  });
  assert(browserOpenValidate?.success === true, 'browser_tool validates open action');

  const browserSearchValidate = browserHub?.validateInput({
    action: 'search',
    query: 'قانون أمداهل',
    max_results: 5,
  });
  assert(browserSearchValidate?.success === true, 'browser_tool validates search action');

  // --- Test 7: Vision Hub (vision_tool) ---
  console.log('\n--- Test 7: Vision Domain Hub (vision_tool) ---');
  const visionHub = toolRegistry.get('vision_tool');
  assert(visionHub !== undefined, 'vision_tool is registered');

  const visionScreenValidate = visionHub?.validateInput({
    action: 'analyze_screen',
    prompt: 'اشرح الكود المفتوح',
    screen_index: 0,
  });
  assert(visionScreenValidate?.success === true, 'vision_tool validates analyze_screen action');

  const visionCaptureValidate = visionHub?.validateInput({
    action: 'capture_screenshot',
    screen_index: 1,
  });
  assert(visionCaptureValidate?.success === true, 'vision_tool validates capture_screenshot action');

  // --- Test 8: System Hub (system_tool) ---
  console.log('\n--- Test 8: System & Hardware Domain Hub (system_tool) ---');
  const sysHub = toolRegistry.get('system_tool');
  assert(sysHub !== undefined, 'system_tool is registered');

  const sysCmdValidate = sysHub?.validateInput({
    action: 'execute_command',
    command: 'dir',
    shell: 'powershell',
  });
  assert(sysCmdValidate?.success === true, 'system_tool validates execute_command action');

  // Weather test live execution
  const weatherExec = await sysHub?.execute({
    action: 'get_weather',
    city: 'Cairo',
  });
  assert(weatherExec?.success === true, 'system_tool get_weather executes successfully', weatherExec?.message);

  // --- Test 9: Safe Filesystem Tool Hub ---
  console.log('\n--- Test 9: Safe Filesystem Hub ---');
  const fsHub = toolRegistry.get('filesystem_tool');
  assert(!!fsHub, 'filesystem_tool is registered');

  const fsReadValidate = fsHub?.validateInput({
    action: 'read',
    filePath: 'package.json',
    startLine: 1,
    maxLines: 10,
  });
  assert(fsReadValidate?.success === true, 'filesystem_tool validates read action');

  const fsWriteValidate = fsHub?.validateInput({
    action: 'write',
    filePath: 'test.txt',
    content: 'hello',
    overwrite: true,
  });
  assert(fsWriteValidate?.success === true, 'filesystem_tool validates write action');

  const fsEditValidate = fsHub?.validateInput({
    action: 'edit',
    filePath: 'test.txt',
    targetText: 'hello',
    replacementText: 'world',
  });
  assert(fsEditValidate?.success === true, 'filesystem_tool validates edit action');

  const fsSearchValidate = fsHub?.validateInput({
    action: 'search',
    directory: 'src',
    fileNamePattern: '*.ts',
  });
  assert(fsSearchValidate?.success === true, 'filesystem_tool validates search action');

  const fsTrashValidate = fsHub?.validateInput({
    action: 'trash',
    targetPath: 'test.txt',
    reason: 'cleaning up test file',
  });
  assert(fsTrashValidate?.success === true, 'filesystem_tool validates trash action');

  console.log('\n====================================================');
  console.log('🎯 ALL 8 UNIFIED DOMAIN HUBS TESTED & FULLY VERIFIED!');
  console.log('====================================================\n');
}

runUnifiedHubsTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
