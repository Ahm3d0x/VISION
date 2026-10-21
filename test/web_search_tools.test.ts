import { toolRegistry } from '../src/core/tools/registry';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import { buildSystemPrompt, VISION_SYSTEM_PROMPT } from '../src/core/agent/AgentCore';
import { narrationManager } from '../src/core/narration/phraseBank';

async function runWebSearchToolsTest() {
  console.log('====================================================');
  console.log('🧪 VISION WEB SEARCH & SYNTHESIS VERIFICATION SUITE');
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

  // 1. Tool Registration in Tool Registry
  console.log('--- Test 1: Registry Verification ---');
  registerBuiltinTools();

  const webSearchTool = toolRegistry.get('web_search');
  assert(webSearchTool !== undefined, 'web_search tool is registered in toolRegistry');
  assert(webSearchTool?.permissionLevel === 0, 'web_search tool has Level 0 (Read-only / Safe) permission');
  assert(webSearchTool?.riskLevel === 'LOW', 'web_search tool has LOW risk level');

  const fetchPageTool = toolRegistry.get('fetch_web_page');
  assert(fetchPageTool !== undefined, 'fetch_web_page tool is registered in toolRegistry');
  assert(fetchPageTool?.permissionLevel === 0, 'fetch_web_page tool has Level 0 (Read-only / Safe) permission');
  assert(fetchPageTool?.riskLevel === 'LOW', 'fetch_web_page tool has LOW risk level');

  // 2. Schema Validation
  console.log('\n--- Test 2: Schema Validation ---');
  const validWebSearch = webSearchTool?.schema.safeParse({ query: 'قانون أمداهل', max_results: 5 });
  assert(validWebSearch?.success === true, 'web_search accepts valid query and max_results');

  const invalidWebSearch = webSearchTool?.schema.safeParse({ query: '' });
  assert(invalidWebSearch?.success === false, 'web_search rejects empty query');

  const validFetchPage = fetchPageTool?.schema.safeParse({ url: 'https://en.wikipedia.org/wiki/Amdahl', max_length: 2000 });
  assert(validFetchPage?.success === true, 'fetch_web_page accepts valid url and max_length');

  // 3. Narration Phrases
  console.log('\n--- Test 3: Speech Narration Bank ---');
  const arSearchPhrase = narrationManager.getPhrase('web_search', { query: 'قانون أمداهل' }, true);
  assert(
    arSearchPhrase.length > 0 && arSearchPhrase.includes('قانون أمداهل'),
    'Arabic web_search narration interpolates query parameter',
    arSearchPhrase
  );

  const enSearchPhrase = narrationManager.getPhrase('web_search', { query: 'Amdahl Law' }, false);
  assert(
    enSearchPhrase.length > 0 && enSearchPhrase.includes('Amdahl Law'),
    'English web_search narration interpolates query parameter',
    enSearchPhrase
  );

  const arFetchPhrase = narrationManager.getPhrase('fetch_web_page', {}, true);
  assert(arFetchPhrase.length > 0, 'Arabic fetch_web_page narration provides varied phrases', arFetchPhrase);

  // 4. System Prompt Protocol Verification
  console.log('\n--- Test 4: System Prompt Protocol & Rule 13 ---');
  assert(
    VISION_SYSTEM_PROMPT.includes('ONLINE SEARCH, LIVE INFORMATION SYNTHESIS'),
    'VISION_SYSTEM_PROMPT contains Rule 13 for online search & synthesis'
  );
  assert(
    VISION_SYSTEM_PROMPT.includes('تحب أفتح لك أي مصدر أو رابط منهم في المتصفح؟'),
    'Rule 13 enforces proactive browser link offer'
  );
  assert(
    VISION_SYSTEM_PROMPT.includes('المصادر والمراجع:'),
    'Rule 13 enforces structured markdown reference links'
  );
  assert(
    VISION_SYSTEM_PROMPT.includes('web_search'),
    'Rule 3 & 13 enforce web_search tool selection'
  );

  console.log(`\n====================================================`);
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log(`====================================================`);
}

runWebSearchToolsTest().catch(console.error);
