import fs from 'fs';
import path from 'path';
import { toolRegistry } from '../src/core/tools/registry';
import { registerBuiltinTools } from '../src/core/tools/builtins';
import { documentTool, readPdfTool, readDocTool, createPdfTool, convertToPdfTool, mergePdfsTool } from '../src/core/tools/documentTools';
import { PDFDocument, rgb } from 'pdf-lib';

function assert(condition: boolean, msg: string, detail?: any) {
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    if (detail) console.error('   └─ Detail:', detail);
    process.exit(1);
  }
  console.log(`✅ [PASS] ${msg}`);
  if (detail) console.log('   └─', detail);
}

async function runDocumentToolsTest() {
  console.log('====================================================');
  console.log('📄 VISION DOCUMENT & PDF HUB TEST SUITE');
  console.log('====================================================\n');

  registerBuiltinTools();

  // Test 1: Registry Verification
  console.log('--- Test 1: Tool Registry & Declaration ---');
  assert(toolRegistry.has('document_tool'), 'document_tool is registered in toolRegistry');
  assert(toolRegistry.has('read_pdf'), 'read_pdf micro-tool registered');
  assert(toolRegistry.has('read_doc'), 'read_doc micro-tool registered');
  assert(toolRegistry.has('create_pdf'), 'create_pdf micro-tool registered');
  assert(toolRegistry.has('convert_to_pdf'), 'convert_to_pdf micro-tool registered');
  assert(toolRegistry.has('merge_pdfs'), 'merge_pdfs micro-tool registered');

  const primaryTools = toolRegistry.getPrimaryTools();
  const hasDocHub = primaryTools.some(t => t.name === 'document_tool');
  assert(hasDocHub, 'document_tool is designated as a PRIMARY domain hub');

  // Test 2: Schema Validation
  console.log('\n--- Test 2: Zod Schema Validation ---');
  const validCreate = documentTool.validateInput({
    action: 'create_pdf',
    outputPath: 'C:/test/out.pdf',
    title: 'تقرير مالي',
    content: '# تقرير سنوي\nهذا ملخص للميزانية والأداء.',
    language: 'ar',
    theme: 'corporate_clean',
  });
  assert(validCreate.success, 'Valid create_pdf input passes schema validation');

  const invalidAction = documentTool.validateInput({
    action: 'unsupported_action',
  });
  assert(!invalidAction.success, 'Invalid action correctly rejected by schema');

  // Test 3: Document Reading (read_doc)
  console.log('\n--- Test 3: Document Reading (read_doc) ---');
  const testDir = path.resolve('./test/fixtures');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testMdPath = path.join(testDir, 'sample_doc.md');
  const sampleContent = `# ملخص المشروع التقني

## المخرجات الرئيسية
- محرك استخراج وتحليل النصوص
- دعم متكامل للغة العربية (RTL)
- خطوط طباعة احترافية (Cairo و Amiri)

| الخاصية | الحالة | الأولوية |
| :--- | :---: | ---: |
| توليد الـ PDF | مكتمل | قصوى |
| قراءة Word | مكتمل | عالية |
`;
  fs.writeFileSync(testMdPath, sampleContent, 'utf-8');

  const readDocRes = await documentTool.execute({
    action: 'read_doc',
    filePath: testMdPath,
  });

  assert(readDocRes.success, 'read_doc successfully read markdown file', readDocRes.error || readDocRes);
  assert(readDocRes.output?.format === 'markdown', 'Correctly identified as markdown format');
  assert(readDocRes.output?.markdown.includes('ملخص المشروع التقني'), 'Extracted markdown contains Arabic content');

  // Test 4: PDF Creation via pdf-lib and PDF Reading via read_pdf
  console.log('\n--- Test 4: PDF Merging & PDF Reading ---');
  // Create two sample PDF files using pdf-lib
  const pdf1Path = path.join(testDir, 'sample_part1.pdf');
  const pdf2Path = path.join(testDir, 'sample_part2.pdf');
  const mergedOutPath = path.join(testDir, 'merged_sample.pdf');

  const doc1 = await PDFDocument.create();
  const page1 = doc1.addPage([595, 842]);
  page1.drawText('VISION OS - Part 1 Report', { x: 50, y: 750, size: 20, color: rgb(0.1, 0.3, 0.8) });
  fs.writeFileSync(pdf1Path, await doc1.save());

  const doc2 = await PDFDocument.create();
  const page2 = doc2.addPage([595, 842]);
  page2.drawText('VISION OS - Part 2 Details', { x: 50, y: 750, size: 20, color: rgb(0.2, 0.7, 0.3) });
  fs.writeFileSync(pdf2Path, await doc2.save());

  // Test merge_pdfs
  const mergeRes = await documentTool.execute({
    action: 'merge_pdfs',
    inputFiles: [pdf1Path, pdf2Path],
    outputPath: mergedOutPath,
    title: 'Combined Report',
  });

  assert(mergeRes.success, 'merge_pdfs executed successfully', mergeRes.message);
  assert(fs.existsSync(mergedOutPath), 'Merged PDF file was written to disk');
  assert(mergeRes.output?.totalPages === 2, 'Merged PDF has 2 total pages');

  // Test read_pdf on the merged file
  const readPdfRes = await documentTool.execute({
    action: 'read_pdf',
    filePath: mergedOutPath,
  });

  assert(readPdfRes.success, 'read_pdf executed successfully', readPdfRes.message);
  assert(readPdfRes.output?.totalPages === 2, 'read_pdf correctly extracted 2 total pages');
  assert(readPdfRes.output?.text.includes('VISION OS'), 'read_pdf extracted textual content from PDF');

  // Test 5: Document Service HTML & RTL Layout Generation
  console.log('\n--- Test 5: Document Service HTML & RTL Layout Architecture ---');
  const { documentService } = await import('../src/main/services/DocumentService');
  assert(typeof (documentService as any).generateHtmlDocument === 'function', 'generateHtmlDocument function exists');

  const generatedHtml = (documentService as any).generateHtmlDocument({
    title: 'تقرير الأداء السنوي',
    bodyContent: '<h1>العنوان</h1><p>محتوى عربي</p>',
    isRTL: true,
    theme: 'corporate_clean',
    accentColor: '#2563eb',
    pageSize: 'A4',
    orientation: 'portrait',
    showPageNumbers: true,
  });

  assert(generatedHtml.includes('dir="rtl"'), 'HTML has dir="rtl" for Arabic documents');
  assert(generatedHtml.includes('lang="ar"'), 'HTML has lang="ar"');
  assert(generatedHtml.includes('font-family: var(--font-body)'), 'HTML applies custom typography');
  assert(generatedHtml.includes('Cairo'), 'HTML includes Cairo Arabic font');
  assert(generatedHtml.includes('Amiri'), 'HTML includes Amiri Arabic font');
  assert(generatedHtml.includes('تقرير الأداء السنوي'), 'Document title properly escaped and rendered');

  // Cleanup test artifacts
  try {
    if (fs.existsSync(testMdPath)) fs.unlinkSync(testMdPath);
    if (fs.existsSync(pdf1Path)) fs.unlinkSync(pdf1Path);
    if (fs.existsSync(pdf2Path)) fs.unlinkSync(pdf2Path);
    if (fs.existsSync(mergedOutPath)) fs.unlinkSync(mergedOutPath);
    if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
  } catch {
    // cleanup non-critical
  }

  console.log('\n====================================================');
  console.log('🎉 ALL DOCUMENT TOOL TESTS PASSED FLAWLESSLY!');
  console.log('====================================================');
}

runDocumentToolsTest().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
