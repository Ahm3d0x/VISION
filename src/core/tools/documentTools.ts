import { z } from 'zod';
import { createTool } from './createTool';
import { Tool, ToolExecutionResult } from './types';

// Helper to access desktop visionAPI if available in Electron renderer
function getVisionAPI(): any {
  if (typeof window !== 'undefined' && (window as any).visionAPI) {
    return (window as any).visionAPI;
  }
  return undefined;
}

// Fallback to direct service invocation only if running in pure Node.js test environment
async function getDocumentService() {
  if (typeof window !== 'undefined') {
    throw new Error('Direct DocumentService is only available in Node.js environment.');
  }
  const serviceModule = '../../main/services/DocumentService';
  const mod = await import(/* @vite-ignore */ serviceModule);
  return mod.documentService;
}

/**
 * Smart Path Resolver (Browser & Node.js Universal):
 * Pure string manipulation without Node.js 'path' or 'os' modules.
 * Automatically corrects hallucinated usernames (e.g. C:\Users\Ahmed -> real profile C:\Users\ahm3d),
 * resolves ~/ or Desktop or Documents prefixes, and handles bare filenames by defaulting them to Desktop.
 */
export function resolveSmartDocumentPath(rawPath?: string, defaultName = 'Document.pdf'): string {
  const homeDir = (typeof process !== 'undefined' && (process.env?.USERPROFILE || process.env?.HOME)) || 'C:\\Users\\ahm3d';
  const desktopDir = `${homeDir}\\Desktop`;
  const documentsDir = `${homeDir}\\Documents`;
  const downloadsDir = `${homeDir}\\Downloads`;

  if (!rawPath || !rawPath.trim()) {
    return `${desktopDir}\\${defaultName}`;
  }

  let p = rawPath.trim();

  // 1. Correct hallucinated Windows usernames (e.g. C:\Users\Ahmed, C:\Users\User)
  p = p.replace(/^[a-zA-Z]:[\\/]Users[\\/](?:Ahmed|User|Username|Admin|Administrator)($|[\\/].*)/i, (_, rest) => {
    const cleanRest = (rest || '').replace(/^[\\/]+/, '');
    return cleanRest ? `${homeDir}\\${cleanRest}` : homeDir;
  });

  // 2. Handle tilde (~) expansion
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) {
    const rest = p.slice(1).replace(/^[\\/]+/, '');
    p = rest ? `${homeDir}\\${rest}` : homeDir;
  }

  // 3. Handle shorthand folder names ("Desktop", "Documents", "Downloads")
  if (/^desktop([\\/].*)?$/i.test(p)) {
    const sub = p.replace(/^desktop[\\/]?/i, '');
    p = sub ? `${desktopDir}\\${sub.replace(/^[\\/]+/, '')}` : `${desktopDir}\\${defaultName}`;
  } else if (/^documents([\\/].*)?$/i.test(p)) {
    const sub = p.replace(/^documents[\\/]?/i, '');
    p = sub ? `${documentsDir}\\${sub.replace(/^[\\/]+/, '')}` : `${documentsDir}\\${defaultName}`;
  } else if (/^downloads([\\/].*)?$/i.test(p)) {
    const sub = p.replace(/^downloads[\\/]?/i, '');
    p = sub ? `${downloadsDir}\\${sub.replace(/^[\\/]+/, '')}` : `${downloadsDir}\\${defaultName}`;
  }

  // 4. If it's a bare filename without directory separators (e.g. "report.pdf")
  if (!p.includes('/') && !p.includes('\\')) {
    p = `${desktopDir}\\${p}`;
  }

  // Normalize forward slashes to backslashes on Windows-style paths
  if (/^[a-zA-Z]:/.test(p)) {
    p = p.replace(/\//g, '\\');
  }

  return p;
}

// =========================================================================
// 1. read_pdf Micro-Tool
// =========================================================================
export const readPdfTool = createTool({
  name: 'read_pdf',
  description: 'Read and extract text, page count, and metadata from a PDF file. Supports Arabic and English PDFs.',
  category: 'filesystem',
  permissionLevel: 0,
  riskLevel: 'LOW',
  schema: z.object({
    filePath: z.string().min(1, 'PDF file path is required'),
    startPage: z.number().int().min(1).optional(),
    endPage: z.number().int().min(1).optional(),
    maxPages: z.number().int().min(1).optional(),
  }),
  paramDescriptions: {
    filePath: {
      type: 'string',
      description: 'Absolute or relative path to the PDF file to read.',
    },
    startPage: {
      type: 'integer',
      description: 'Starting page number (optional, 1-indexed).',
    },
    endPage: {
      type: 'integer',
      description: 'Ending page number (optional).',
    },
    maxPages: {
      type: 'integer',
      description: 'Maximum number of pages to read (optional).',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const api = getVisionAPI();
    if (api?.docReadPdf) {
      const res = await api.docReadPdf(input);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Read PDF "${input.filePath}" (${res.totalPages} pages)`
          : `Failed to read PDF: ${res.error}`,
        error: res.error,
      };
    }

    try {
      const service = await getDocumentService();
      const res = await service.readPdf(input);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Read PDF "${input.filePath}" (${res.totalPages} pages)`
          : `Failed to read PDF: ${res.error}`,
        error: res.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// =========================================================================
// 2. read_doc Micro-Tool
// =========================================================================
export const readDocTool = createTool({
  name: 'read_doc',
  description: 'Read and extract content from Microsoft Word (.docx), Markdown (.md), or plain text (.txt) files. Preserves headings and tables as Markdown.',
  category: 'filesystem',
  permissionLevel: 0,
  riskLevel: 'LOW',
  schema: z.object({
    filePath: z.string().min(1, 'Document file path is required'),
    maxLines: z.number().int().min(1).optional(),
  }),
  paramDescriptions: {
    filePath: {
      type: 'string',
      description: 'Absolute or relative path to the document file (.docx, .md, .txt).',
    },
    maxLines: {
      type: 'integer',
      description: 'Optional line limit to avoid overwhelming context.',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const api = getVisionAPI();
    if (api?.docReadDoc) {
      const res = await api.docReadDoc(input);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Read document "${input.filePath}" (${res.format})`
          : `Failed to read document: ${res.error}`,
        error: res.error,
      };
    }

    try {
      const service = await getDocumentService();
      const res = await service.readDoc(input);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Read document "${input.filePath}" (${res.format})`
          : `Failed to read document: ${res.error}`,
        error: res.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// =========================================================================
// 3. create_pdf Micro-Tool
// =========================================================================
export const createPdfTool = createTool({
  name: 'create_pdf',
  description: 'Generate a high-fidelity PDF from Markdown or HTML using Chromium with native Arabic RTL text-shaping, executive themes, and page headers/footers.',
  category: 'filesystem',
  permissionLevel: 1,
  riskLevel: 'LOW',
  schema: z.object({
    outputPath: z.string().min(1, 'Output PDF file path is required'),
    title: z.string().min(1, 'Document title is required'),
    content: z.string().min(1, 'Document content (Markdown or HTML) is required'),
    language: z.enum(['ar', 'en', 'auto']).default('auto'),
    theme: z.enum(['corporate_clean', 'executive_dark', 'modern_minimal', 'academic']).default('corporate_clean'),
    accentColor: z.string().optional(),
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    includeTableOfContents: z.boolean().default(false),
    showPageNumbers: z.boolean().default(true),
    headerText: z.string().optional(),
    footerText: z.string().optional(),
  }),
  paramDescriptions: {
    outputPath: {
      type: 'string',
      description: 'Destination path where the PDF will be saved (e.g. "C:/Users/.../Desktop/report.pdf").',
    },
    title: {
      type: 'string',
      description: 'Document title printed in the banner and header.',
    },
    content: {
      type: 'string',
      description: 'Document content formatted in Markdown or HTML.',
    },
    language: {
      type: 'string',
      description: 'Language and direction: "ar" (RTL Arabic), "en" (LTR English), or "auto" (detects Arabic characters automatically).',
      enum: ['ar', 'en', 'auto'],
    },
    theme: {
      type: 'string',
      description: 'Visual theme: "corporate_clean" (business white/navy), "executive_dark" (sleek dark mode), "modern_minimal" (airy typography), "academic" (formal serif).',
      enum: ['corporate_clean', 'executive_dark', 'modern_minimal', 'academic'],
    },
    accentColor: {
      type: 'string',
      description: 'Primary accent color for headings and lines (e.g. "#2563eb", "#059669", "#7c3aed").',
    },
    pageSize: {
      type: 'string',
      description: 'Paper format: "A4" or "Letter".',
      enum: ['A4', 'Letter'],
    },
    orientation: {
      type: 'string',
      description: 'Page orientation: "portrait" or "landscape".',
      enum: ['portrait', 'landscape'],
    },
    includeTableOfContents: {
      type: 'boolean',
      description: 'Whether to automatically generate a table of contents from headings.',
    },
    showPageNumbers: {
      type: 'boolean',
      description: 'Whether to print page numbers in the footer (e.g. "صفحة 1 من 3").',
    },
    headerText: {
      type: 'string',
      description: 'Optional custom header text displayed at the top of each page.',
    },
    footerText: {
      type: 'string',
      description: 'Optional custom footer text displayed at the bottom of each page.',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const outputPath = resolveSmartDocumentPath(input.outputPath, `${input.title || 'Document'}.pdf`);
    const payload = {
      outputPath,
      title: input.title,
      content: input.content,
      language: input.language,
      theme: input.theme,
      options: {
        accentColor: input.accentColor,
        pageSize: input.pageSize,
        orientation: input.orientation,
        includeTableOfContents: input.includeTableOfContents,
        showPageNumbers: input.showPageNumbers,
        headerText: input.headerText,
        footerText: input.footerText,
      },
    };

    const api = getVisionAPI();
    if (api?.docCreatePdf) {
      const res = await api.docCreatePdf(payload);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Created high-fidelity PDF "${res.outputPath}" (${(res.fileSize / 1024).toFixed(1)} KB, theme: ${res.theme}, RTL: ${res.isRTL})`
          : `Failed to create PDF: ${res.error}`,
        error: res.error,
      };
    }

    try {
      const service = await getDocumentService();
      const res = await service.createPdf(payload);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Created high-fidelity PDF "${res.outputPath}" (${((res.fileSize || 0) / 1024).toFixed(1)} KB, theme: ${res.theme}, RTL: ${res.isRTL})`
          : `Failed to create PDF: ${res.error}`,
        error: res.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// =========================================================================
// 4. convert_to_pdf Micro-Tool
// =========================================================================
export const convertToPdfTool = createTool({
  name: 'convert_to_pdf',
  description: 'Convert an existing Word (.docx), Markdown (.md), or text file into a styled PDF.',
  category: 'filesystem',
  permissionLevel: 1,
  riskLevel: 'LOW',
  schema: z.object({
    inputPath: z.string().min(1, 'Input file path is required'),
    outputPath: z.string().optional(),
    title: z.string().optional(),
    theme: z.enum(['corporate_clean', 'executive_dark', 'modern_minimal', 'academic']).default('corporate_clean'),
    language: z.enum(['ar', 'en', 'auto']).default('auto'),
    accentColor: z.string().optional(),
    pageSize: z.enum(['A4', 'Letter']).default('A4'),
  }),
  paramDescriptions: {
    inputPath: {
      type: 'string',
      description: 'Path of source document (.docx, .md, .txt).',
    },
    outputPath: {
      type: 'string',
      description: 'Optional destination PDF path. If omitted, saves next to input file.',
    },
    title: {
      type: 'string',
      description: 'Document title.',
    },
    theme: {
      type: 'string',
      description: 'Theme style.',
      enum: ['corporate_clean', 'executive_dark', 'modern_minimal', 'academic'],
    },
    language: {
      type: 'string',
      description: 'Language / RTL mode.',
      enum: ['ar', 'en', 'auto'],
    },
    accentColor: {
      type: 'string',
      description: 'Theme accent color.',
    },
    pageSize: {
      type: 'string',
      description: 'A4 or Letter.',
      enum: ['A4', 'Letter'],
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const payload = {
      inputPath: input.inputPath,
      outputPath: input.outputPath,
      title: input.title,
      language: input.language,
      theme: input.theme,
      options: {
        accentColor: input.accentColor,
        pageSize: input.pageSize,
      },
    };

    const api = getVisionAPI();
    if (api?.docConvertToPdf) {
      const res = await api.docConvertToPdf(payload);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Converted "${input.inputPath}" to PDF "${res.outputPath}"`
          : `Conversion failed: ${res.error}`,
        error: res.error,
      };
    }

    try {
      const service = await getDocumentService();
      const res = await service.convertToPdf(payload);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Converted "${input.inputPath}" to PDF "${res.outputPath}"`
          : `Conversion failed: ${res.error}`,
        error: res.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// =========================================================================
// 5. merge_pdfs Micro-Tool
// =========================================================================
export const mergePdfsTool = createTool({
  name: 'merge_pdfs',
  description: 'Merge multiple PDF files in sequential order into a single unified PDF file.',
  category: 'filesystem',
  permissionLevel: 1,
  riskLevel: 'LOW',
  schema: z.object({
    inputFiles: z.array(z.string()).min(2, 'At least two PDF files are required for merging'),
    outputPath: z.string().min(1, 'Output merged PDF path is required'),
    title: z.string().optional(),
  }),
  paramDescriptions: {
    inputFiles: {
      type: 'array',
      description: 'List of PDF file paths in the desired merge order.',
    },
    outputPath: {
      type: 'string',
      description: 'Path where the merged PDF will be written.',
    },
    title: {
      type: 'string',
      description: 'Optional document title metadata.',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const api = getVisionAPI();
    if (api?.docMergePdfs) {
      const res = await api.docMergePdfs(input);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Successfully merged ${res.totalFilesMerged} PDFs into "${res.outputPath}" (${res.totalPages} total pages)`
          : `Failed to merge PDFs: ${res.error}`,
        error: res.error,
      };
    }

    try {
      const service = await getDocumentService();
      const res = await service.mergePdfs(input);
      return {
        success: res.success,
        output: res,
        message: res.success
          ? `Successfully merged ${res.totalFilesMerged} PDFs into "${res.outputPath}" (${res.totalPages} total pages)`
          : `Failed to merge PDFs: ${res.error}`,
        error: res.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
});

// =========================================================================
// 6. Unified Primary Domain Hub: document_tool
// =========================================================================
export const documentTool: Tool = createTool({
  name: 'document_tool',
  description:
    'Comprehensive document & PDF workstation for VISION. Read PDFs & Word files (.docx), generate high-fidelity PDFs with native Arabic RTL support and executive themes, convert documents, and merge multiple PDFs.',
  category: 'filesystem',
  permissionLevel: 1,
  riskLevel: 'LOW',
  schema: z.object({
    action: z.enum(['read_pdf', 'read_doc', 'create_pdf', 'convert_to_pdf', 'merge_pdfs']).describe('Action to execute'),
    filePath: z.string().optional().describe('Path to input file for read_pdf or read_doc'),
    inputPath: z.string().optional().describe('Source file path for convert_to_pdf'),
    outputPath: z.string().optional().describe('Target output file path for create_pdf, convert_to_pdf, or merge_pdfs'),
    inputFiles: z.array(z.string()).optional().describe('List of PDF file paths for merge_pdfs'),
    title: z.string().optional().describe('Title of the document'),
    content: z.string().optional().describe('Markdown or HTML content for create_pdf'),
    language: z.enum(['ar', 'en', 'auto']).optional().describe('Document language: "ar" (RTL Arabic), "en", or "auto"'),
    theme: z.enum(['corporate_clean', 'executive_dark', 'modern_minimal', 'academic']).optional().describe('Styling theme for PDF generation'),
    accentColor: z.string().optional().describe('Theme accent color (e.g. "#2563eb", "#059669")'),
    pageSize: z.enum(['A4', 'Letter']).optional().describe('Paper format: "A4" or "Letter"'),
    orientation: z.enum(['portrait', 'landscape']).optional().describe('Page orientation'),
    includeTableOfContents: z.boolean().optional().describe('Auto-generate table of contents from headings'),
    showPageNumbers: z.boolean().optional().describe('Show page numbers in footer'),
    headerText: z.string().optional().describe('Custom header text'),
    footerText: z.string().optional().describe('Custom footer text'),
    maxLines: z.number().int().optional().describe('Maximum lines to read for read_doc'),
  }),
  paramDescriptions: {
    action: {
      type: 'string',
      description: 'Action to execute: "read_pdf", "read_doc", "create_pdf", "convert_to_pdf", or "merge_pdfs".',
      enum: ['read_pdf', 'read_doc', 'create_pdf', 'convert_to_pdf', 'merge_pdfs'],
    },
    filePath: {
      type: 'string',
      description: 'Path to target file (for "read_pdf" or "read_doc").',
    },
    inputPath: {
      type: 'string',
      description: 'Path of source document to convert (for "convert_to_pdf").',
    },
    outputPath: {
      type: 'string',
      description: 'Output destination path for the generated or merged PDF.',
    },
    inputFiles: {
      type: 'array',
      description: 'Array of PDF file paths to combine (for "merge_pdfs").',
    },
    title: {
      type: 'string',
      description: 'Document title printed in header and banner.',
    },
    content: {
      type: 'string',
      description: 'Document content formatted in Markdown or HTML (for "create_pdf").',
    },
    language: {
      type: 'string',
      description: 'Language mode: "ar" (RTL Arabic), "en" (LTR English), or "auto" (detects Arabic characters).',
      enum: ['ar', 'en', 'auto'],
    },
    theme: {
      type: 'string',
      description: 'Theme style: "corporate_clean" (default business), "executive_dark" (dark mode), "modern_minimal", or "academic".',
      enum: ['corporate_clean', 'executive_dark', 'modern_minimal', 'academic'],
    },
    accentColor: {
      type: 'string',
      description: 'Primary accent color for headings and highlights.',
    },
    pageSize: {
      type: 'string',
      description: 'Page size: "A4" or "Letter".',
      enum: ['A4', 'Letter'],
    },
    orientation: {
      type: 'string',
      description: 'Orientation: "portrait" or "landscape".',
      enum: ['portrait', 'landscape'],
    },
    includeTableOfContents: {
      type: 'boolean',
      description: 'Include interactive table of contents.',
    },
    showPageNumbers: {
      type: 'boolean',
      description: 'Include page numbering in footer.',
    },
    headerText: {
      type: 'string',
      description: 'Custom header string.',
    },
    footerText: {
      type: 'string',
      description: 'Custom footer string.',
    },
    maxLines: {
      type: 'integer',
      description: 'Maximum lines for read_doc.',
    },
  },
  async execute(input, context): Promise<ToolExecutionResult<any>> {
    switch (input.action) {
      case 'read_pdf': {
        if (!input.filePath) {
          return { success: false, error: 'filePath is required for read_pdf action.' };
        }
        return await readPdfTool.execute({ filePath: input.filePath }, context);
      }

      case 'read_doc': {
        if (!input.filePath) {
          return { success: false, error: 'filePath is required for read_doc action.' };
        }
        return await readDocTool.execute({ filePath: input.filePath, maxLines: input.maxLines }, context);
      }

      case 'create_pdf': {
        const resolvedOut = resolveSmartDocumentPath(input.outputPath, `${input.title || 'Document'}.pdf`);
        if (!input.title) {
          return { success: false, error: 'title is required for create_pdf action.' };
        }
        if (!input.content) {
          return { success: false, error: 'content is required for create_pdf action.' };
        }
        return await createPdfTool.execute(
          {
            outputPath: resolvedOut,
            title: input.title,
            content: input.content,
            language: input.language ?? 'auto',
            theme: input.theme ?? 'corporate_clean',
            accentColor: input.accentColor,
            pageSize: input.pageSize ?? 'A4',
            orientation: input.orientation ?? 'portrait',
            includeTableOfContents: input.includeTableOfContents ?? false,
            showPageNumbers: input.showPageNumbers ?? true,
            headerText: input.headerText,
            footerText: input.footerText,
          },
          context
        );
      }

      case 'convert_to_pdf': {
        const sourcePath = input.inputPath || input.filePath;
        if (!sourcePath) {
          return { success: false, error: 'inputPath or filePath is required for convert_to_pdf action.' };
        }
        return await convertToPdfTool.execute(
          {
            inputPath: sourcePath,
            outputPath: input.outputPath,
            title: input.title,
            theme: input.theme ?? 'corporate_clean',
            language: input.language ?? 'auto',
            accentColor: input.accentColor,
            pageSize: input.pageSize ?? 'A4',
          },
          context
        );
      }

      case 'merge_pdfs': {
        if (!input.inputFiles || input.inputFiles.length < 2) {
          return { success: false, error: 'At least 2 inputFiles are required for merge_pdfs action.' };
        }
        if (!input.outputPath) {
          return { success: false, error: 'outputPath is required for merge_pdfs action.' };
        }
        return await mergePdfsTool.execute(
          {
            inputFiles: input.inputFiles,
            outputPath: input.outputPath,
            title: input.title,
          },
          context
        );
      }

      default:
        return { success: false, error: `Unknown document action: ${(input as any).action}` };
    }
  },
});
