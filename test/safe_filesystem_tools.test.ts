import fs from 'fs';
import path from 'path';
import {
  isProtectedSystemPath,
  safeReadFile,
  safeWriteFile,
  safeEditFile,
  safeSearchFiles,
  safeTrashFile,
} from '../src/main/services/SafeFilesystemService';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    if (detail) console.error('   └─ Detail:', detail);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
  if (detail) console.log('   └─', detail);
}

async function runSafeFilesystemTests() {
  console.log('====================================================');
  console.log('🛡️ VISION SAFE FILESYSTEM TOOLS TEST SUITE');
  console.log('====================================================\n');

  const testDir = path.resolve('test_sandbox');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // --- Test 1: Protected System Paths Protection ---
    console.log('--- Test 1: Protected System Paths Guard ---');
    const winCheck = isProtectedSystemPath('C:\\Windows\\System32\\cmd.exe');
    assert(winCheck.isProtected === true, 'Protects C:\\Windows\\System32 from tampering', winCheck.reason);

    const progFilesCheck = isProtectedSystemPath('C:\\Program Files\\Common Files');
    assert(progFilesCheck.isProtected === true, 'Protects C:\\Program Files', progFilesCheck.reason);

    const driveRootCheck = isProtectedSystemPath('C:\\');
    assert(driveRootCheck.isProtected === true, 'Protects C:\\ drive root', driveRootCheck.reason);

    const safePathCheck = isProtectedSystemPath(path.join(testDir, 'allowed_file.txt'));
    assert(safePathCheck.isProtected === false, 'Allows project/workspace file path');

    // --- Test 2: Safe Write File + Auto Directory Creation ---
    console.log('\n--- Test 2: Safe Write File & Auto Directory Creation ---');
    const newFilePath = path.join(testDir, 'subfolder', 'test_doc.txt');
    const initialContent = 'Line 1: Hello World\nLine 2: Safe Filesystem Test\nLine 3: Node TypeScript VISION\nLine 4: End of text';

    const writeRes = await safeWriteFile({
      filePath: newFilePath,
      content: initialContent,
      overwrite: false,
      createDirs: true,
    });
    assert(writeRes.success === true, 'Successfully created file with auto-created directory', writeRes.filePath);
    assert(fs.existsSync(newFilePath), 'File physically exists on disk');

    // --- Test 3: Overwrite Protection without Flag ---
    console.log('\n--- Test 3: Overwrite Protection Flag ---');
    const overwriteBlocked = await safeWriteFile({
      filePath: newFilePath,
      content: 'Overwriting content',
      overwrite: false,
    });
    assert(overwriteBlocked.success === false, 'Blocks overwrite when overwrite=false', overwriteBlocked.error);

    // --- Test 4: Overwrite with .bak Automatic Backup Creation ---
    console.log('\n--- Test 4: Overwrite with Automatic .bak Backup ---');
    const overwriteAllowed = await safeWriteFile({
      filePath: newFilePath,
      content: initialContent + '\nLine 5: Added line',
      overwrite: true,
    });
    assert(overwriteAllowed.success === true, 'Allows overwrite when overwrite=true');
    assert(!!overwriteAllowed.backupCreated, 'Creates automatic .bak backup file', overwriteAllowed.backupCreated);
    assert(fs.existsSync(`${newFilePath}.bak`), 'Backup .bak exists on disk');
    const bakContent = fs.readFileSync(`${newFilePath}.bak`, 'utf-8');
    assert(bakContent === initialContent, 'Backup content matches previous file version');

    // --- Test 5: Surgical Edit File (Find & Replace) with Backup ---
    console.log('\n--- Test 5: Surgical Edit File (Find & Replace) ---');
    const editRes = await safeEditFile({
      filePath: newFilePath,
      targetText: 'Hello World',
      replacementText: 'Greetings Ahmed',
    });
    assert(editRes.success === true, 'Surgically replaced target text', editRes.message);
    assert(editRes.occurrencesReplaced === 1, 'Replaced exactly 1 occurrence');
    const editedFileContent = fs.readFileSync(newFilePath, 'utf-8');
    assert(editedFileContent.includes('Greetings Ahmed'), 'File content contains replaced text');
    assert(!editedFileContent.includes('Hello World'), 'Old target text is completely removed');

    // Missing text handling
    const editFailRes = await safeEditFile({
      filePath: newFilePath,
      targetText: 'NON_EXISTENT_PHRASE_12345',
      replacementText: 'Nothing',
    });
    assert(editFailRes.success === false, 'Safely rejects when target text is missing', editFailRes.error);

    // --- Test 6: Smart Paginated Read File ---
    console.log('\n--- Test 6: Smart Paginated Read File ---');
    const readRes = await safeReadFile({
      filePath: newFilePath,
      startLine: 1,
      endLine: 3,
      maxLines: 10,
    });
    assert(readRes.success === true, 'Successfully reads paginated lines');
    assert(readRes.lineCount === 3, 'Read exactly 3 lines (sliced)');
    assert(readRes.totalLines === 5, 'Detected total 5 lines in file');
    assert(!!readRes.content?.includes('Greetings Ahmed'), 'Line slice content is correct');

    // --- Test 7: Search Files (Pattern & Grep) ---
    console.log('\n--- Test 7: Search Files by Pattern & Grep ---');
    const searchRes = await safeSearchFiles({
      directory: testDir,
      fileNamePattern: '*.txt',
      queryText: 'Greetings Ahmed',
      recursive: true,
    });
    assert(searchRes.success === true, 'Executed search successfully');
    assert((searchRes.results?.length ?? 0) >= 1, `Found matching file via grep (Count: ${searchRes.results?.length})`);
    assert(!!searchRes.results?.[0]?.snippet, 'Included context snippet for matched grep text', searchRes.results?.[0]?.snippet);

    // --- Test 8: Safe Windows Recycle Bin Deletion ---
    console.log('\n--- Test 8: Safe Windows Recycle Bin Deletion ---');
    const fileToTrash = path.join(testDir, 'to_be_trashed.txt');
    fs.writeFileSync(fileToTrash, 'Trash me safely', 'utf-8');
    assert(fs.existsSync(fileToTrash), 'Temporary file created for trash test');

    const trashRes = await safeTrashFile({
      targetPath: fileToTrash,
      reason: 'Automated test verification',
    });
    assert(trashRes.success === true, 'Successfully sent item to Windows Recycle Bin', trashRes.message);
    assert(!fs.existsSync(fileToTrash), 'Item removed from original path on disk');

    console.log('\n====================================================');
    console.log('🎉 ALL SAFE FILESYSTEM TOOL TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } finally {
    // Cleanup sandbox
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

runSafeFilesystemTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
