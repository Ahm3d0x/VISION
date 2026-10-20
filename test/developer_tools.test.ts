import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { toolRegistry } from '../src/core/tools/registry';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import {
  developerTool,
  gitStatusTool,
  gitDiffTool,
  gitCommitTool,
  gitBranchTool,
  codebaseSummaryTool,
} from '../src/core/tools/developerTools';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    if (detail) console.error('   └─ Detail:', detail);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
  if (detail) console.log('   └─', detail);
}

async function runDeveloperToolsTestSuite() {
  console.log('====================================================');
  console.log('🛠️ VISION PHASE 6: DEVELOPER & GIT TOOLS TEST SUITE');
  console.log('====================================================\n');

  registerBuiltinTools();

  // --- Test 1: Tool Registration in Registry ---
  console.log('--- Test 1: Registry Verification & LLM Declarations ---');
  const allTools = toolRegistry.getAll();
  const primaryTools = toolRegistry.getPrimaryTools();
  const devHub = toolRegistry.get('developer_tool');

  assert(devHub !== undefined, 'developer_tool is registered as a tool');
  assert(toolRegistry.get('git_status') !== undefined, 'git_status micro-tool is registered');
  assert(toolRegistry.get('git_diff') !== undefined, 'git_diff micro-tool is registered');
  assert(toolRegistry.get('git_commit') !== undefined, 'git_commit micro-tool is registered');
  assert(toolRegistry.get('git_branch') !== undefined, 'git_branch micro-tool is registered');
  assert(toolRegistry.get('codebase_summary') !== undefined, 'codebase_summary micro-tool is registered');

  const primaryNames = primaryTools.map((t) => t.name);
  assert(primaryNames.includes('developer_tool'), 'developer_tool is a Primary Domain Hub');

  const llmDecl = devHub?.toLLMDeclaration();
  assert(llmDecl?.function.name === 'developer_tool', 'toLLMDeclaration generates correct function name');
  assert(
    llmDecl?.function.parameters.properties.action !== undefined,
    'LLM declaration includes action enum'
  );

  // --- Test 2: Codebase Summary Tool on VISION Repo ---
  console.log('\n--- Test 2: Codebase Summary & Tech Stack Discovery ---');
  const summaryRes = await codebaseSummaryTool.execute({
    repoPath: '.',
    maxDepth: 2,
  });

  assert(summaryRes.success === true, 'codebaseSummaryTool executed successfully', summaryRes.message);
  assert(summaryRes.output?.projectName === 'vision-os', 'Detected project name is vision-os', summaryRes.output?.projectName);
  assert(summaryRes.output?.detectedStack.includes('TypeScript'), 'Detected TypeScript in tech stack');
  assert(summaryRes.output?.detectedStack.includes('React'), 'Detected React in tech stack');
  assert(summaryRes.output?.detectedStack.includes('Electron'), 'Detected Electron in tech stack');
  assert(summaryRes.output?.detectedStack.includes('Tailwind CSS'), 'Detected Tailwind CSS in tech stack');
  assert(summaryRes.output?.entryPoints.includes('src/main/index.ts'), 'Detected main entry point src/main/index.ts');
  assert(summaryRes.output?.directoryStructure.includes('src/'), 'Directory structure contains src/');
  assert(!summaryRes.output?.directoryStructure.includes('node_modules'), 'Directory structure safely excludes node_modules');

  // --- Test 3: Isolated Git Workflow in Temp Directory ---
  console.log('\n--- Test 3: Isolated Git Workflow (Status, Diff, Commit, Branch) ---');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vision_git_test_'));

  try {
    // 3.1 Initialize git repository
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Vision Bot"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "vision@example.com"', { cwd: tempDir, stdio: 'ignore' });

    // 3.2 Check status of empty clean repo
    const statusClean = await gitStatusTool.execute({ repoPath: tempDir });
    assert(statusClean.success === true, 'gitStatusTool checks initial repo status');
    assert(statusClean.output?.isGitRepo === true, 'Identified as git repository');
    assert(statusClean.output?.isClean === true, 'Initial repo is clean');

    // 3.3 Create a test file
    const testFilePath = path.join(tempDir, 'greeting.txt');
    fs.writeFileSync(testFilePath, 'Hello VISION AI OS!\nInitial line.');

    // 3.4 Check status detects untracked file
    const statusUntracked = await gitStatusTool.execute({ repoPath: tempDir });
    assert(statusUntracked.output?.isClean === false, 'Working tree is dirty after file creation');
    assert(statusUntracked.output?.untracked.includes('greeting.txt'), 'greeting.txt is in untracked list');

    // 3.5 Test gitCommitTool (Initial commit)
    const commitRes = await gitCommitTool.execute({
      repoPath: tempDir,
      message: 'feat: initial commit for vision developer tools',
      files: ['greeting.txt'],
    });
    assert(commitRes.success === true, 'gitCommitTool created initial commit', commitRes.message);
    assert(commitRes.output?.shortHash !== undefined, 'Commit returned valid short hash', commitRes.output?.shortHash);
    assert(commitRes.output?.note.includes('Local commit only'), 'Commit confirms local only safety');

    // 3.6 Modify file and test gitDiffTool
    fs.appendFileSync(testFilePath, '\nNew line added for diff testing.');
    const diffRes = await gitDiffTool.execute({
      repoPath: tempDir,
      filePath: 'greeting.txt',
    });
    assert(diffRes.success === true, 'gitDiffTool retrieved diff');
    assert(diffRes.output?.diff.includes('+New line added for diff testing.'), 'Diff contains added line');
    assert(diffRes.output?.isEmpty === false, 'Diff is not empty');

    // 3.7 Test gitBranchTool (create, list, switch)
    const branchCreateRes = await gitBranchTool.execute({
      repoPath: tempDir,
      action: 'create',
      branchName: 'feature/agent-tools',
    });
    assert(branchCreateRes.success === true, 'gitBranchTool created new branch');

    const branchListRes = await gitBranchTool.execute({
      repoPath: tempDir,
      action: 'list',
    });
    assert(branchListRes.success === true, 'gitBranchTool listed branches');
    assert(
      branchListRes.output?.localBranches.some((b: string) => b.includes('feature/agent-tools')),
      'New branch appears in local branches list'
    );

    const branchSwitchRes = await gitBranchTool.execute({
      repoPath: tempDir,
      action: 'switch',
      branchName: 'feature/agent-tools',
    });
    assert(branchSwitchRes.success === true, 'gitBranchTool switched branch');

    // 3.8 Test developerTool (Unified Facade Hub)
    console.log('\n--- Test 4: Developer Unified Hub (developer_tool) ---');
    const hubStatusRes = await developerTool.execute({
      action: 'status',
      repoPath: tempDir,
    });
    assert(hubStatusRes.success === true, 'developer_tool delegates to status correctly');
    assert(hubStatusRes.output?.currentBranch.includes('feature/agent-tools'), 'developer_tool reports correct current branch');

    const hubDiffRes = await developerTool.execute({
      action: 'diff',
      repoPath: tempDir,
    });
    assert(hubDiffRes.success === true, 'developer_tool delegates to diff correctly');

    const hubCommitRes = await developerTool.execute({
      action: 'commit',
      repoPath: tempDir,
      message: 'test: second commit via unified developer_tool hub',
    });
    assert(hubCommitRes.success === true, 'developer_tool delegates to commit correctly');

    const hubAnalyzeRes = await developerTool.execute({
      action: 'analyze_codebase',
      repoPath: '.',
      maxDepth: 1,
    });
    assert(hubAnalyzeRes.success === true, 'developer_tool delegates to analyze_codebase correctly');

  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {}
  }

  // --- Test 5: Graceful Handling for Non-Git Folder ---
  console.log('\n--- Test 5: Non-Git Repository Safety Handling ---');
  const emptyTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vision_non_git_'));
  try {
    const nonGitStatus = await gitStatusTool.execute({ repoPath: emptyTempDir });
    assert(nonGitStatus.output?.isGitRepo === false, 'gitStatusTool output indicates isGitRepo: false');
    assert(nonGitStatus.output?.message.includes('not a Git repository'), 'gitStatusTool returns clear message for non-git folder');
  } finally {
    try {
      fs.rmSync(emptyTempDir, { recursive: true, force: true });
    } catch (e) {}
  }

  console.log('\n====================================================');
  console.log('🎯 ALL DEVELOPER & GIT TOOLS TESTED & FULLY VERIFIED!');
  console.log('====================================================');
}

runDeveloperToolsTestSuite().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
