import { memoryManager } from '../src/core/memory/MemoryManager';
import { buildSystemPrompt } from '../src/core/agent/AgentCore';

async function runBehavioralTests() {
  console.log('====================================================');
  console.log('🧪 VISION BEHAVIORAL MEMORY VERIFICATION SUITE');
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

  // -------------------------------------------------------------------------
  // TEST 1 — Save & Cross-Session Recall
  // -------------------------------------------------------------------------
  console.log('--- Running Test 1: Save & Cross-Session Recall ---');
  // Session 1: User says "افتكر إن مشروع VISION موجود في G:\\work\\VISION"
  await memoryManager.save({
    category: 'project',
    title: 'VISION Project Path',
    content: 'G:\\work\\VISION',
    tags: ['vision', 'project', 'path'],
    source: 'user',
    confidence: 1.0,
    importance: 5,
  });

  // End Session 1 and start fresh Session 2
  memoryManager.clearSession();
  assert(memoryManager.getSessionTurns().length === 0, 'Session cleared successfully for fresh session');

  // Session 2 query: "فين مشروع VISION؟"
  const recalled = memoryManager.getRelevantContext('فين مشروع VISION؟');
  const visionProject = recalled.find(m => m.title.includes('VISION') || m.content.includes('VISION'));

  assert(
    visionProject !== undefined && visionProject.content.includes('G:\\work\\VISION'),
    'Recall across sessions without conversational history',
    `Retrieved: ${visionProject?.title} -> ${visionProject?.content}`
  );

  // -------------------------------------------------------------------------
  // TEST 2 — Contextual & Multi-turn Continuity
  // -------------------------------------------------------------------------
  console.log('\n--- Running Test 2: Multi-turn Session Working Memory ---');
  memoryManager.clearSession();

  // Turn 1
  memoryManager.addTurn('افتح VS Code', 'تم فتح VS Code بنجاح.', ['launch_app']);
  // Turn 2
  memoryManager.addTurn('افتح المشروع', 'جاري فتح مشروع VISION في VS Code.', ['execute_command']);

  const history = memoryManager.getConversationHistory();
  assert(history.length === 4, 'Working memory contains full 2 turns (4 messages)');
  assert(
    history[0].content === 'افتح VS Code' && history[2].content === 'افتح المشروع',
    'Preserves chronological sequence and turn continuity',
    `Turns preserved: "${history[0].content}" -> "${history[2].content}"`
  );

  // -------------------------------------------------------------------------
  // TEST 3 — Correction & Contradiction Resolution (Anti-Contradiction)
  // -------------------------------------------------------------------------
  console.log('\n--- Running Test 3: Contradiction Resolution & Memory Update ---');
  // Current memory: VISION Project Path -> G:\work\VISION
  const beforeCount = memoryManager.getAll('project').filter(m => m.title.toLowerCase().includes('vision')).length;

  // User correction: "المشروع اتنقل لـ D:\VISION"
  const updatedItem = await memoryManager.save({
    category: 'project',
    title: 'VISION Project Path',
    content: 'D:\\VISION',
    tags: ['vision', 'project', 'path'],
    source: 'user',
    confidence: 1.0,
  });

  const visionMemoriesAfter = memoryManager.getAll('project').filter(m => m.title.toLowerCase().includes('vision project'));

  assert(
    visionMemoriesAfter.length === 1,
    'Contradiction prevented: Single unified record maintained (no duplicates)',
    `Records count: ${visionMemoriesAfter.length}`
  );

  assert(
    visionMemoriesAfter[0].content === 'D:\\VISION',
    'Fact successfully updated to new location (D:\\VISION)',
    `Updated content: "${visionMemoriesAfter[0].content}" (Confidence: ${visionMemoriesAfter[0].confidence})`
  );

  // -------------------------------------------------------------------------
  // TEST 4 — Irrelevant Memory Filtering (Zero Bloat Guarantee)
  // -------------------------------------------------------------------------
  console.log('\n--- Running Test 4: Irrelevant Memory Filtering (Zero Bloat) ---');
  // Inject 100 unrelated memories
  for (let i = 1; i <= 100; i++) {
    await memoryManager.save({
      id: `mem-noise-${i}`,
      category: i % 2 === 0 ? 'user_preference' : 'system_knowledge',
      title: `Random Fact ${i}: Food or Sports Note`,
      content: `Arbitrary trivia note number ${i} about cooking pasta and tennis score #${i}.`,
      tags: ['trivia', 'noise', 'food', `test-${i}`],
      importance: 3,
      confidence: 0.8,
      source: 'agent_inferred',
    });
  }

  const allCount = memoryManager.getAll().length;
  console.log(`   [Info] Total memories currently stored in base: ${allCount}`);

  // Query specifically targeting VISION: "شغل VISION"
  const relevantForVision = memoryManager.getRelevantContext('شغل VISION');

  assert(
    relevantForVision.length > 0 && relevantForVision.length <= 3,
    'Top-K relevance cap respected (only matching items returned)',
    `Returned ${relevantForVision.length} item(s) out of ${allCount} total in database`
  );

  const containsNoise = relevantForVision.some(m => m.title.includes('Random Fact') || m.content.includes('pasta'));
  assert(
    !containsNoise,
    'Zero Bloat: 100% of irrelevant memories filtered out of prompt context',
    `Injected items: ${relevantForVision.map(m => m.title).join(', ')}`
  );

  // Verify prompt generated from buildSystemPrompt does NOT contain noise
  const prompt = buildSystemPrompt('شغل VISION');
  assert(
    !prompt.includes('pasta') && !prompt.includes('tennis'),
    'System Prompt clean: No noise or irrelevant memories present in prompt tokens'
  );

  // -------------------------------------------------------------------------
  // TEST 5 — Session Isolation (Distinguishing Live Session from Long-Term Memory)
  // -------------------------------------------------------------------------
  console.log('\n--- Running Test 5: Session Isolation & Referential Disambiguation ---');
  // Start a fresh, uninitialized session
  memoryManager.clearSession();

  const emptyHistory = memoryManager.getConversationHistory();
  assert(emptyHistory.length === 0, 'Fresh session has zero active turns');

  // When prompt is vague without prior session context:
  // "اعمل حاجة بالمشروع اللي كنا بنتكلم عنه"
  const vaguePrompt = 'اعمل حاجة بالمشروع اللي كنا بنتكلم عنه';
  const vagueMemories = memoryManager.getRelevantContext(vaguePrompt);

  // Because no specific project name was mentioned ("مشروع" alone without specific entity tokens),
  // and there is no active session history:
  console.log(`   [Info] Vague prompt matched ${vagueMemories.length} item(s)`);
  // Verify that the prompt construction reflects an empty session context
  const vagueSystemPrompt = buildSystemPrompt(vaguePrompt);
  assert(
    !vagueSystemPrompt.includes('ACTIVE SESSION CONTEXT SUMMARY'),
    'No phantom session summary hallucinated when session is fresh'
  );

  // Clean up noise items
  for (let i = 1; i <= 100; i++) {
    await memoryManager.delete(`mem-noise-${i}`);
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULTS: ${passed}/${total} BEHAVIORAL TESTS PASSED!`);
  console.log('====================================================');
}

runBehavioralTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
