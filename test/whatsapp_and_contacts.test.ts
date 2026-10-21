import fs from 'fs';
import path from 'path';
import { toolRegistry } from '../src/core/tools/registry';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import { contactManager, parseVcfContent, normalizeArabicText, normalizePhoneNumber, isDummyPhoneNumber } from '../src/core/contacts/ContactManager';
import { buildSystemPrompt, VISION_SYSTEM_PROMPT } from '../src/core/agent/AgentCore';
import { narrationManager } from '../src/core/narration/phraseBank';

async function runWhatsAppAndContactsTest() {
  console.log('====================================================');
  console.log('🧪 VISION WHATSAPP & CONTACTS VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] Test ${total}: ${testName}`);
      if (detail) console.log(`   └─ ${detail}`);
    } else {
      console.error(`❌ [FAIL] Test ${total}: ${testName}`);
      if (detail) console.error(`   └─ ${detail}`);
      process.exitCode = 1;
    }
  }

  // 1. VCF File Parsing & Import Verification
  console.log('--- Test 1: VCF Parsing & Address Book Storage ---');
  const files = fs.readdirSync('.');
  const vcfFileName = files.find(f => f.endsWith('.vcf'));
  assert(vcfFileName !== undefined, 'Found contacts .vcf file in workspace', vcfFileName);

  const rawVcf = fs.readFileSync(vcfFileName!, 'utf8');
  const contacts = parseVcfContent(rawVcf);
  assert(contacts.length >= 250, `Parsed 250+ contacts from VCF (Actual: ${contacts.length})`);

  // Load them into contactManager
  for (const c of contacts) {
    await contactManager.save(c);
  }
  assert(contactManager.count >= 250, `contactManager populated with ${contactManager.count} contacts`);

  // 2. Arabic Phonetic Normalization & Search
  console.log('\n--- Test 2: Arabic Phonetic & Fuzzy Search ---');
  // Search for "خالتي منال" (with ي) vs VCF stored "خالتى منال" (with ى)
  const auntSearch = contactManager.search('خالتي منال', 5);
  assert(
    auntSearch.length > 0 && auntSearch[0].name.includes('منال'),
    'Phonetic search for "خالتي منال" resolves correctly',
    `Found: ${auntSearch[0]?.name} -> ${auntSearch[0]?.primaryPhone}`
  );

  // Search for "عمي سعيد"
  const uncleSearch = contactManager.search('عمي سعيد', 5);
  assert(
    uncleSearch.length > 0 && uncleSearch[0].name.includes('سعيد'),
    'Search for "عمي سعيد" resolves correctly',
    `Found: ${uncleSearch[0]?.name} -> ${uncleSearch[0]?.primaryPhone}`
  );

  // Search by phone digits
  const phoneSearch = contactManager.search('01018515861', 5);
  assert(
    phoneSearch.length > 0 && phoneSearch[0].primaryPhone === '201018515861',
    'Search by Egyptian mobile digits (01018515861) resolves to 201018515861',
    `Matched: ${phoneSearch[0]?.name}`
  );

  // 3. Phone Number Normalization
  console.log('\n--- Test 3: Phone Normalization Logic ---');
  assert(normalizePhoneNumber('+20 10 18515861') === '201018515861', 'Normalizes "+20 10 18515861" -> "201018515861"');
  assert(normalizePhoneNumber('01018515861') === '201018515861', 'Normalizes local "01018515861" -> "201018515861"');
  assert(normalizePhoneNumber('01155000111') === '201155000111', 'Normalizes local "01155000111" -> "201155000111"');

  // 4. Tools Registration in Registry
  console.log('\n--- Test 4: Tool Registry Verification ---');
  registerBuiltinTools();

  const searchTool = toolRegistry.get('search_contacts');
  assert(searchTool !== undefined, 'search_contacts tool is registered');
  assert(searchTool?.permissionLevel === 0, 'search_contacts is Level 0 (Safe)');

  const getTool = toolRegistry.get('get_contact');
  assert(getTool !== undefined, 'get_contact tool is registered');

  const listTool = toolRegistry.get('list_contacts');
  assert(listTool !== undefined, 'list_contacts tool is registered');

  const sendMsgTool = toolRegistry.get('send_whatsapp_message');
  assert(sendMsgTool !== undefined, 'send_whatsapp_message tool is registered');
  assert(sendMsgTool?.permissionLevel === 1, 'send_whatsapp_message is Level 1 (Low-risk automated)');

  const sendScreenTool = toolRegistry.get('send_whatsapp_screenshot');
  assert(sendScreenTool !== undefined, 'send_whatsapp_screenshot tool is registered');

  const sendFileTool = toolRegistry.get('send_whatsapp_file');
  assert(sendFileTool !== undefined, 'send_whatsapp_file tool is registered');
  assert(sendFileTool?.permissionLevel === 1, 'send_whatsapp_file is Level 1 (Low-risk automated)');

  const readChatTool = toolRegistry.get('read_whatsapp_chat');
  assert(readChatTool !== undefined, 'read_whatsapp_chat tool is registered');

  // 5. Narration Bank Verification
  console.log('\n--- Test 5: Speech Narration Bank ---');
  const sendPhrase = narrationManager.getPhrase('whatsapp_send', { recipient: 'خالتي منال' }, true);
  assert(sendPhrase.length > 0, 'WhatsApp send narration produces natural Arabic phrase', sendPhrase);

  const screenPhrase = narrationManager.getPhrase('whatsapp_screenshot', { recipient: 'خالتي منال' }, true);
  assert(screenPhrase.length > 0, 'WhatsApp screenshot narration produces natural Arabic phrase', screenPhrase);

  const filePhrase = narrationManager.getPhrase('whatsapp_file', { recipient: 'خالتي منال', filename: 'report.pdf' }, true);
  assert(filePhrase.length > 0 && filePhrase.includes('report.pdf'), 'WhatsApp file narration produces natural Arabic phrase with filename', filePhrase);

  const readPhrase = narrationManager.getPhrase('whatsapp_read', {}, true);
  assert(readPhrase.length > 0, 'WhatsApp read chat narration produces natural Arabic phrase', readPhrase);

  // 6. Dynamic System Prompt & Rule 14 Verification
  console.log('\n--- Test 6: System Prompt Protocol & Rule 14 ---');
  assert(VISION_SYSTEM_PROMPT.includes('WHATSAPP FULL AUTOMATION'), 'VISION_SYSTEM_PROMPT contains Rule 14');
  assert(VISION_SYSTEM_PROMPT.includes('send_whatsapp_message'), 'VISION_SYSTEM_PROMPT references send_whatsapp_message');
  assert(VISION_SYSTEM_PROMPT.includes('send_whatsapp_screenshot'), 'VISION_SYSTEM_PROMPT references send_whatsapp_screenshot');
  assert(VISION_SYSTEM_PROMPT.includes('send_whatsapp_file'), 'VISION_SYSTEM_PROMPT references send_whatsapp_file');
  assert(VISION_SYSTEM_PROMPT.includes('read_whatsapp_chat'), 'VISION_SYSTEM_PROMPT references read_whatsapp_chat');

  // 7. Self-Contact Resolution ("رقمي", "الرقم بتاعي", "أنا", "me")
  console.log('\n--- Test 7: Self-Contact & Egyptian Arabic Resolution ---');
  assert(contactManager.isSelfQuery('رقمي'), 'isSelfQuery resolves "رقمي"');
  assert(contactManager.isSelfQuery('الرقم بتاعي'), 'isSelfQuery resolves "الرقم بتاعي"');
  assert(contactManager.isSelfQuery('على رقمي'), 'isSelfQuery resolves "على رقمي"');
  assert(contactManager.isSelfQuery('ابعتهالي على الواتساب على رقمي'), 'isSelfQuery resolves compound phrase');
  
  const selfMatch = contactManager.findBestMatch('الرقم بتاعي');
  assert(selfMatch !== null && selfMatch.primaryPhone === '201140409832', 'findBestMatch("الرقم بتاعي") returns Ahmed\'s verified number (201140409832)', selfMatch?.primaryPhone || 'N/A');

  // 8. Anti-Hallucination Dummy Phone Detection
  console.log('\n--- Test 8: Anti-Hallucination Dummy Phone Detection ---');
  assert(isDummyPhoneNumber('01012345678'), 'isDummyPhoneNumber detects "01012345678" as dummy placeholder');
  assert(isDummyPhoneNumber('201012345678'), 'isDummyPhoneNumber detects "201012345678" as dummy placeholder');
  assert(isDummyPhoneNumber('01000000000'), 'isDummyPhoneNumber detects "01000000000" as repeated dummy');
  assert(!isDummyPhoneNumber('01140409832'), 'isDummyPhoneNumber does NOT flag Ahmed\'s real number (01140409832)');

  // 9. Dynamic System Prompt Self Injection
  console.log('\n--- Test 9: Self-Contact Prompt Injection ---');
  const userPromptWithSelf = 'عايزك تأخذ سكرين شوت للشاشة الثانية بتاعتي وتبعثها لي على واتساب على الرقم بتاعي';
  const promptForSelf = buildSystemPrompt(userPromptWithSelf);
  assert(
    promptForSelf.includes('201140409832') && promptForSelf.includes('Ahmed Mohamed Attia'),
    'buildSystemPrompt dynamically injects Ahmed\'s personal verified number for self-requests',
    'Verified Phone Injected: 201140409832'
  );

  // 10. Multi-Lingual & Chinese Token Self-Resolution (Preventing False Matches like orange sa)
  console.log('\n--- Test 10: Multi-Lingual & Chinese Self-Resolution ---');
  assert(contactManager.isSelfQuery('我的WhatsApp号码'), 'isSelfQuery resolves Chinese token "我的WhatsApp号码" to self');
  const chineseMatch = contactManager.findBestMatch('我的WhatsApp号码');
  assert(
    chineseMatch !== null && chineseMatch.primaryPhone === '201140409832',
    'findBestMatch("我的WhatsApp号码") resolves to Ahmed\'s verified number (NOT orange sa)',
    `Resolved: ${chineseMatch?.name} (${chineseMatch?.primaryPhone})`
  );

  // 11. Report Forwarding Prompt & History Integration
  console.log('\n--- Test 11: Report Forwarding Integration ---');
  const reportPrompt = buildSystemPrompt('أبعد كل التقرير بالعربي على الرقم بتاعي على الواتساب');
  assert(
    reportPrompt.includes('201140409832'),
    'buildSystemPrompt for report forwarding injects Ahmed\'s verified phone number',
    'Verified Phone Injected: 201140409832'
  );

  // 12. Send WhatsApp File Tool Execution & Safety
  console.log('\n--- Test 12: Send WhatsApp File Tool Execution & Safety ---');
  let mockSentFileOptions: any = null;
  (global as any).window = {
    visionAPI: {
      sendWhatsAppFile: async (options: any) => {
        mockSentFileOptions = options;
        return {
          success: true,
          phone: options.phone,
          filePath: 'g:\\work\\VISION\\' + options.filePath,
          fileName: path.basename(options.filePath),
          fileSize: 1024,
        };
      },
    },
  };

  // Test self-recipient file send
  const selfFileRes = await sendFileTool!.execute({
    recipient: 'رقمي',
    file_path: 'package.json',
    caption: 'إليك ملف المشروع يا أحمد',
  });
  assert(selfFileRes.success === true, 'send_whatsapp_file executes successfully for self recipient');
  assert(mockSentFileOptions?.phone === '201140409832', 'send_whatsapp_file routes "رقمي" to Ahmed\'s verified phone (201140409832)', mockSentFileOptions?.phone);
  assert(mockSentFileOptions?.filePath === 'package.json', 'send_whatsapp_file passes requested file_path correctly');

  // Test contact-recipient file send
  const contactFileRes = await sendFileTool!.execute({
    recipient: 'خالتي منال',
    file_path: 'test.pdf',
  });
  assert(contactFileRes.success === true, 'send_whatsapp_file executes successfully for named contact ("خالتي منال")');
  assert(mockSentFileOptions?.phone === '201018515861', 'send_whatsapp_file resolves contact phone for "خالتي منال" to 201018515861', mockSentFileOptions?.phone);

  // Test dummy number blocking on send_whatsapp_file
  const dummyFileRes = await sendFileTool!.execute({
    recipient: '01012345678',
    file_path: 'test.pdf',
  });
  assert(dummyFileRes.success === false, 'send_whatsapp_file blocks dummy phone number 01012345678');

  // Test hallucinated username path stripping
  await sendFileTool!.execute({
    recipient: 'رقمي',
    file_path: 'C:/Users/Username/Downloads/POSTER.pdf',
  });
  assert(mockSentFileOptions?.filePath === 'POSTER.pdf', 'send_whatsapp_file strips hallucinated "C:/Users/Username/Downloads/" prefix', mockSentFileOptions?.filePath);

  // Test screenshot caption auto-healing (bracket placeholder removal)
  let mockSentMediaOptions: any = null;
  (global as any).window.visionAPI.takeScreenshot = async () => ({ success: true, filePath: 'test.png' });
  (global as any).window.visionAPI.sendWhatsAppMedia = async (options: any) => {
    mockSentMediaOptions = options;
    return { success: true };
  };
  const sendScreenTool2 = toolRegistry.get('send_whatsapp_screenshot');
  await sendScreenTool2!.execute({
    recipient: 'رقمي',
    caption: 'Screen content report: [Analysis summary from previous step]',
  });
  assert(!mockSentMediaOptions?.caption?.includes('[Analysis summary'), 'send_whatsapp_screenshot auto-heals bracket placeholder caption', mockSentMediaOptions?.caption);

  console.log(`\n====================================================`);
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log(`====================================================`);
}

runWhatsAppAndContactsTest().catch(console.error);
