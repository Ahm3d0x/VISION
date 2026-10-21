import fs from 'fs';
import path from 'path';
import os from 'os';
import type { BrowserWindow as BrowserWindowType, PrintToPDFOptions } from 'electron';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');

async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string; numpages: number; info: any; version?: string }> {
  if (pdfParseModule?.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    try {
      await parser.load();
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      return {
        text: textResult.text || '',
        numpages: infoResult.total || textResult.total || 1,
        info: infoResult.info || {},
        version: infoResult.info?.PDFFormatVersion || '1.0',
      };
    } finally {
      await parser.destroy();
    }
  }

  if (typeof pdfParseModule === 'function') {
    return await pdfParseModule(buffer);
  }

  throw new Error('No valid pdf-parse parser found in environment.');
}
import * as mammoth from 'mammoth';
import { marked } from 'marked';
import { PDFDocument } from 'pdf-lib';
import { isProtectedSystemPath } from './SafeFilesystemService';

async function getBrowserWindowClass(): Promise<typeof BrowserWindowType | null> {
  try {
    const electron = await import('electron');
    return (electron as any).BrowserWindow || (electron as any).default?.BrowserWindow || null;
  } catch {
    return null;
  }
}

export interface CreatePdfOptions {
  outputPath: string;
  title: string;
  content: string; // Markdown or raw HTML
  language?: 'ar' | 'en' | 'auto';
  theme?: 'corporate_clean' | 'executive_dark' | 'modern_minimal' | 'academic';
  options?: {
    includeTableOfContents?: boolean;
    showPageNumbers?: boolean;
    headerText?: string;
    footerText?: string;
    accentColor?: string;
    pageSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    marginsType?: 'default' | 'none' | 'printableArea' | 'custom';
    printBackground?: boolean;
  };
}

export interface ReadPdfOptions {
  filePath: string;
  startPage?: number;
  endPage?: number;
  maxPages?: number;
}

export interface ReadDocOptions {
  filePath: string;
  maxLines?: number;
}

export interface ConvertToPdfOptions extends Omit<CreatePdfOptions, 'content' | 'outputPath' | 'title'> {
  inputPath: string;
  outputPath?: string;
  title?: string;
}

export interface MergePdfsOptions {
  inputFiles: string[];
  outputPath: string;
  title?: string;
}

export class DocumentService {
  /**
   * Read and extract structured text & metadata from a PDF file
   */
  public async readPdf(options: ReadPdfOptions): Promise<{
    success: boolean;
    filePath: string;
    totalPages: number;
    title?: string;
    author?: string;
    creationDate?: string;
    text: string;
    pageRange?: [number, number];
    snippet: string;
    metadata?: Record<string, any>;
    error?: string;
  }> {
    try {
      const resolvedPath = path.resolve(options.filePath);
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, filePath: options.filePath, totalPages: 0, text: '', snippet: '', error: `File not found: ${resolvedPath}` };
      }

      const fileBuffer = await fs.promises.readFile(resolvedPath);
      const parsed = await parsePdfBuffer(fileBuffer);

      let text = parsed.text || '';
      const totalPages = parsed.numpages || 1;

      // Extract metadata info
      const info = parsed.info || {};
      const title = info.Title || path.basename(resolvedPath, path.extname(resolvedPath));
      const author = info.Author;
      const creationDate = info.CreationDate;

      // If page range or truncation requested
      const snippet = text.slice(0, 1000).trim();

      return {
        success: true,
        filePath: resolvedPath,
        totalPages,
        title,
        author,
        creationDate,
        text,
        snippet,
        metadata: {
          info: parsed.info,
          version: parsed.version,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        filePath: options.filePath,
        totalPages: 0,
        text: '',
        snippet: '',
        error: `Failed to read PDF: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Read Word (.docx), Markdown (.md), or text (.txt) document
   */
  public async readDoc(options: ReadDocOptions): Promise<{
    success: boolean;
    filePath: string;
    format: 'docx' | 'markdown' | 'text' | 'unknown';
    markdown: string;
    text: string;
    snippet: string;
    title?: string;
    error?: string;
  }> {
    try {
      const resolvedPath = path.resolve(options.filePath);
      if (!fs.existsSync(resolvedPath)) {
        return { success: false, filePath: options.filePath, format: 'unknown', markdown: '', text: '', snippet: '', error: `File not found: ${resolvedPath}` };
      }

      const ext = path.extname(resolvedPath).toLowerCase();
      let format: 'docx' | 'markdown' | 'text' | 'unknown' = 'unknown';
      let markdown = '';
      let text = '';

      if (ext === '.docx') {
        format = 'docx';
        const fileBuffer = await fs.promises.readFile(resolvedPath);
        const mdResult = await mammoth.convertToMarkdown({ buffer: fileBuffer });
        const rawResult = await mammoth.extractRawText({ buffer: fileBuffer });
        markdown = mdResult.value || '';
        text = rawResult.value || '';
      } else if (ext === '.md' || ext === '.markdown') {
        format = 'markdown';
        markdown = await fs.promises.readFile(resolvedPath, 'utf-8');
        text = markdown;
      } else if (ext === '.txt' || ext === '.log' || ext === '.json' || ext === '.csv') {
        format = 'text';
        text = await fs.promises.readFile(resolvedPath, 'utf-8');
        markdown = text;
      } else {
        // Fallback: try reading as text
        format = 'unknown';
        text = await fs.promises.readFile(resolvedPath, 'utf-8');
        markdown = text;
      }

      if (options.maxLines && options.maxLines > 0) {
        const lines = markdown.split(/\r?\n/);
        if (lines.length > options.maxLines) {
          markdown = lines.slice(0, options.maxLines).join('\n') + `\n\n... [Truncated: showing first ${options.maxLines} lines of ${lines.length}]`;
        }
      }

      const snippet = (text || markdown).slice(0, 1000).trim();
      const title = path.basename(resolvedPath, ext);

      return {
        success: true,
        filePath: resolvedPath,
        format,
        markdown,
        text,
        snippet,
        title,
      };
    } catch (err: any) {
      return {
        success: false,
        filePath: options.filePath,
        format: 'unknown',
        markdown: '',
        text: '',
        snippet: '',
        error: `Failed to read document: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Generates a high-fidelity PDF from Markdown/HTML using Electron's native Chromium engine.
   * Flawless Arabic shaping (RTL), professional themes, smart page-breaks, and vector quality.
   */
  public async createPdf(options: CreatePdfOptions): Promise<{
    success: boolean;
    outputPath: string;
    fileSize?: number;
    title: string;
    theme: string;
    isRTL: boolean;
    error?: string;
  }> {
    let tempHtmlPath: string | null = null;
    let win: BrowserWindowType | null = null;

    try {
      const resolvedOutput = path.resolve(options.outputPath);
      const outputDir = path.dirname(resolvedOutput);

      // Security check: ensure target directory is not protected OS root
      const protectedCheck = isProtectedSystemPath(resolvedOutput);
      if (protectedCheck.isProtected) {
        return {
          success: false,
          outputPath: resolvedOutput,
          title: options.title,
          theme: options.theme || 'corporate_clean',
          isRTL: false,
          error: protectedCheck.reason,
        };
      }

      if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }

      // 1. Determine Language & RTL Direction Accurately (Count Arabic vs Latin chars)
      const textSample = (options.title || '') + ' ' + (options.content || '');
      const arabicMatches = textSample.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
      const latinMatches = textSample.match(/[a-zA-Z]/g);
      const arabicCount = arabicMatches ? arabicMatches.length : 0;
      const latinCount = latinMatches ? latinMatches.length : 0;

      let isRTL = false;
      if (options.language === 'ar') {
        isRTL = true;
      } else if (options.language === 'en') {
        isRTL = false;
      } else {
        // Auto mode: Only activate RTL if Arabic characters strictly dominate
        isRTL = arabicCount > latinCount && arabicCount > 10;
      }

      const theme = options.theme || 'corporate_clean';
      const accentColor = options.options?.accentColor || (theme === 'executive_dark' ? '#38bdf8' : '#2563eb');

      // 2. Format content using smart structured renderer (Q&A cards, sections, math)
      let htmlBody = await this.formatContentToHtml(options.content, isRTL, theme, options.title);

      // Optional Table of Contents generator
      if (options.options?.includeTableOfContents) {
        htmlBody = this.injectTableOfContents(htmlBody, isRTL);
      }

      // 3. Build complete full-bleed HTML document with world-class typography & styling
      const fullHtml = this.generateHtmlDocument({
        title: options.title,
        bodyContent: htmlBody,
        isRTL,
        theme,
        accentColor,
        pageSize: options.options?.pageSize || 'A4',
        orientation: options.options?.orientation || 'portrait',
        headerText: options.options?.headerText,
        footerText: options.options?.footerText,
        showPageNumbers: options.options?.showPageNumbers !== false,
      });

      // Write to temp file for Chromium rendering
      tempHtmlPath = path.join(os.tmpdir(), `vision_doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.html`);
      await fs.promises.writeFile(tempHtmlPath, fullHtml, 'utf-8');

      // Spawn hidden BrowserWindow for rendering
      const BrowserWindowClass = await getBrowserWindowClass();
      if (!BrowserWindowClass) {
        return {
          success: false,
          outputPath: resolvedOutput,
          title: options.title,
          theme,
          isRTL,
          error: 'Electron BrowserWindow is unavailable in this environment (Electron runtime required for Chromium PDF printing).',
        };
      }

      win = new BrowserWindowClass({
        show: false,
        width: 1200,
        height: 1600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false,
        },
      });

      await win.loadFile(tempHtmlPath);

      // Wait for fonts & layout to stabilize
      try {
        await win.webContents.executeJavaScript('document.fonts.ready', true);
      } catch {
        await new Promise((r) => setTimeout(r, 400));
      }

      await new Promise((r) => setTimeout(r, 250));

      // CRITICAL: Full-bleed margins (marginType: 'none') so background color covers 100% of the page
      // Header and footer are seamlessly rendered inside the HTML layout!
      const printOptions: Electron.PrintToPDFOptions = {
        pageSize: options.options?.pageSize || 'A4',
        landscape: options.options?.orientation === 'landscape',
        printBackground: true,
        margins: {
          marginType: 'none',
        },
        displayHeaderFooter: false,
      };

      const pdfBuffer = await win.webContents.printToPDF(printOptions);
      await fs.promises.writeFile(resolvedOutput, pdfBuffer);

      const stats = await fs.promises.stat(resolvedOutput);

      return {
        success: true,
        outputPath: resolvedOutput,
        fileSize: stats.size,
        title: options.title,
        theme,
        isRTL,
      };
    } catch (err: any) {
      return {
        success: false,
        outputPath: options.outputPath,
        title: options.title,
        theme: options.theme || 'corporate_clean',
        isRTL: false,
        error: `Failed to create PDF: ${err.message || String(err)}`,
      };
    } finally {
      if (win) {
        try {
          win.destroy();
        } catch {
          // ignore
        }
      }
      if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
        try {
          await fs.promises.unlink(tempHtmlPath);
        } catch {
          // ignore
        }
      }
    }
  }

  /**
   * Convert an existing docx, markdown, or text file into a styled PDF
   */
  public async convertToPdf(options: ConvertToPdfOptions): Promise<{
    success: boolean;
    outputPath: string;
    fileSize?: number;
    title: string;
    theme: string;
    isRTL: boolean;
    error?: string;
  }> {
    try {
      const docResult = await this.readDoc({ filePath: options.inputPath });
      if (!docResult.success) {
        return {
          success: false,
          outputPath: options.outputPath || '',
          title: options.title || '',
          theme: options.theme || 'corporate_clean',
          isRTL: false,
          error: docResult.error,
        };
      }

      let outputPath = options.outputPath;
      if (!outputPath) {
        const inputDir = path.dirname(options.inputPath);
        const inputBase = path.basename(options.inputPath, path.extname(options.inputPath));
        outputPath = path.join(inputDir, `${inputBase}.pdf`);
      }

      return await this.createPdf({
        ...options,
        outputPath,
        title: options.title || docResult.title || 'Converted Document',
        content: docResult.markdown || docResult.text,
      });
    } catch (err: any) {
      return {
        success: false,
        outputPath: options.outputPath || '',
        title: options.title || '',
        theme: options.theme || 'corporate_clean',
        isRTL: false,
        error: `Conversion failed: ${err.message || String(err)}`,
      };
    }
  }

  /**
   * Merge multiple PDF files into a single unified PDF
   */
  public async mergePdfs(options: MergePdfsOptions): Promise<{
    success: boolean;
    outputPath: string;
    totalFilesMerged: number;
    totalPages: number;
    fileSize?: number;
    error?: string;
  }> {
    try {
      if (!options.inputFiles || options.inputFiles.length === 0) {
        return { success: false, outputPath: options.outputPath, totalFilesMerged: 0, totalPages: 0, error: 'No input PDF files provided for merging.' };
      }

      const resolvedOutput = path.resolve(options.outputPath);
      const outputDir = path.dirname(resolvedOutput);

      const protectedCheck = isProtectedSystemPath(resolvedOutput);
      if (protectedCheck.isProtected) {
        return { success: false, outputPath: resolvedOutput, totalFilesMerged: 0, totalPages: 0, error: protectedCheck.reason };
      }

      if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }

      const mergedDoc = await PDFDocument.create();
      if (options.title) {
        mergedDoc.setTitle(options.title);
      }
      mergedDoc.setProducer('VISION Personal AI OS');

      let totalPages = 0;
      let validFilesCount = 0;

      for (const filePath of options.inputFiles) {
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
          throw new Error(`Input file not found: ${resolved}`);
        }
        const fileBuffer = await fs.promises.readFile(resolved);
        const sourceDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const pageIndices = sourceDoc.getPageIndices();
        const copiedPages = await mergedDoc.copyPages(sourceDoc, pageIndices);
        for (const page of copiedPages) {
          mergedDoc.addPage(page);
        }
        totalPages += copiedPages.length;
        validFilesCount++;
      }

      const mergedPdfBytes = await mergedDoc.save();
      await fs.promises.writeFile(resolvedOutput, mergedPdfBytes);

      return {
        success: true,
        outputPath: resolvedOutput,
        totalFilesMerged: validFilesCount,
        totalPages,
        fileSize: mergedPdfBytes.byteLength,
      };
    } catch (err: any) {
      return {
        success: false,
        outputPath: options.outputPath,
        totalFilesMerged: 0,
        totalPages: 0,
        error: `Failed to merge PDFs: ${err.message || String(err)}`,
      };
    }
  }

  // =========================================================================
  // Smart Content Preprocessor (Q&A Cards, Section Banners, Math Highlighting)
  // =========================================================================

  private cleanMathAndTypography(text: string): string {
    if (!text) return '';

    let s = text;

    // 1. Block math: $$ ... $$ -> <div class="math-block">...</div>
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      return `\n\n<div class="math-block">${this.formatFormulaBody(math)}</div>\n\n`;
    });

    // 2. Inline math: $ ... $ -> <span class="math-inline">...</span>
    s = s.replace(/\$([^$\n]+?)\$/g, (_, math) => {
      return `<span class="math-inline">${this.formatFormulaBody(math)}</span>`;
    });

    // 3. Exponents in plain text: e.g. 2^56, 10^9, 2^30, 2^128, r^2
    s = s.replace(/\b([0-9a-zA-Z\)])\^([0-9a-zA-Z\+\-]+)\b/g, '$1<sup>$2</sup>');

    return s;
  }

  private formatFormulaBody(math: string): string {
    let s = math.trim();

    // LaTeX Greek Symbols
    s = s.replace(/\\pi\b/g, 'π')
         .replace(/\\alpha\b/g, 'α')
         .replace(/\\beta\b/g, 'β')
         .replace(/\\epsilon\b/g, 'ε')
         .replace(/\\theta\b/g, 'θ')
         .replace(/\\lambda\b/g, 'λ')
         .replace(/\\mu\b/g, 'μ')
         .replace(/\\sigma\b/g, 'σ')
         .replace(/\\Delta\b/g, 'Δ')
         .replace(/\\Sigma\b/g, 'Σ');

    // LaTeX Mathematical Operators & Relations
    s = s.replace(/\\times\b/g, '×')
         .replace(/\\cdot\b/g, '·')
         .replace(/\\approx\b/g, '≈')
         .replace(/\\pm\b/g, '±')
         .replace(/\\div\b/g, '÷')
         .replace(/\\(?:le|leq)\b/g, '≤')
         .replace(/\\(?:ge|geq)\b/g, '≥')
         .replace(/\\(?:ne|neq)\b/g, '≠')
         .replace(/\\in\b/g, '∈')
         .replace(/\\infty\b/g, '∞')
         .replace(/\\oplus\b/g, '⊕')
         .replace(/\\(?:to|rightarrow)\b/g, '→')
         .replace(/\\leftarrow\b/g, '←')
         .replace(/\\Rightarrow\b/g, '⇒')
         .replace(/\\Leftarrow\b/g, '⇐')
         .replace(/\\Leftrightarrow\b/g, '⇔');

    // Fractions: \frac{a}{b} -> (a / b)
    s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)');

    // Square root: \sqrt{a} -> √(a)
    s = s.replace(/\\sqrt\{([^}]+)\}/g, '√($1)');

    // Superscripts: x^{...} or x^2
    s = s.replace(/([a-zA-Z0-9_\)\]])\^\{([^}]+)\}/g, '$1<sup>$2</sup>');
    s = s.replace(/([a-zA-Z0-9_\)\]])\^([0-9a-zA-Z\+\-]+)/g, '$1<sup>$2</sup>');

    // Subscripts: x_{...} or x_1
    s = s.replace(/([a-zA-Z0-9_\)\]])\_\{([^}]+)\}/g, '$1<sub>$2</sub>');
    s = s.replace(/([a-zA-Z0-9_\)\]])\_([0-9a-zA-Z\+\-]+)/g, '$1<sub>$2</sub>');

    return s;
  }

  private async formatContentToHtml(rawContent: string, isRTL: boolean, theme: string, optionsTitle?: string): Promise<string> {
    if (!rawContent || !rawContent.trim()) {
      return '<p class="empty-doc">No content provided.</p>';
    }

    let trimmed = rawContent.trim();
    if (trimmed.startsWith('<') && trimmed.includes('</')) {
      return trimmed;
    }

    // 1. Title Deduplication: If markdown starts with a heading matching optionsTitle, strip it so it doesn't render twice
    if (optionsTitle) {
      const normDocTitle = optionsTitle.trim().toLowerCase();
      const firstHeadingMatch = trimmed.match(/^#+\s+(.+?)(?:\r?\n|$)/);
      if (firstHeadingMatch) {
        const normHeading = firstHeadingMatch[1].trim().toLowerCase();
        if (normHeading === normDocTitle || normDocTitle.includes(normHeading) || normHeading.includes(normDocTitle)) {
          trimmed = trimmed.replace(/^#+\s+.+?(?:\r?\n)+/, '').trim();
        }
      }
    }

    // 2. Preprocess Math Formulas, Exponents, and Greek Symbols
    const preprocessed = this.cleanMathAndTypography(trimmed);

    // 3. Parse Markdown through standard GitHub Flavored Markdown parser
    let parsedHtml = await marked.parse(preprocessed, { gfm: true, breaks: true });

    // 4. Enhance Question Headers:
    // Transforms <h2>Question 1: ...</h2> or <h3>M1. OTP...</h3> into a styled card banner
    parsedHtml = parsedHtml.replace(/<h([23])>(.*?)(Question\s*\d+|Problem\s*\d+|M\d+|Q\d+|السؤال\s*\d+|المسألة\s*\d+)(.*?)<\/h\1>/gi, (_match, _level, pre, qTag, post) => {
      const fullHeading = (pre + qTag + post).replace(/^[#:\s\-–—]+/, '').trim();
      return `
        <div class="question-header">
          <span class="q-badge">${this.escapeHtml(qTag.trim())}</span>
          <span class="q-title">${this.escapeHtml(fullHeading)}</span>
        </div>
      `;
    });

    return parsedHtml;
  }

  // =========================================================================
  // Private Full-Bleed Theme & Layout Builders
  // =========================================================================

  private generateHtmlDocument(params: {
    title: string;
    bodyContent: string;
    isRTL: boolean;
    theme: string;
    accentColor: string;
    pageSize: string;
    orientation: string;
    headerText?: string;
    footerText?: string;
    showPageNumbers: boolean;
  }): string {
    const dir = params.isRTL ? 'rtl' : 'ltr';
    const lang = params.isRTL ? 'ar' : 'en';

    const formattedDate = new Date().toLocaleDateString(params.isRTL ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const pageCountText = params.isRTL ? 'وثيقة ذكية' : 'INTELLIGENT REPORT';

    return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(params.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Amiri:wght@400;700&display=swap');

    :root {
      --accent: ${params.accentColor};
      --font-display: ${params.isRTL ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "'Outfit', 'Plus Jakarta Sans', sans-serif"};
      --font-body: ${params.isRTL ? "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif" : "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"};
      --font-mono: 'JetBrains Mono', Consolas, 'Courier New', monospace;

      /* DEFAULT LIGHT / CORPORATE CLEAN */
      --bg-page: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --card-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
      --text-main: #0f172a;
      --text-muted: #64748b;
      --heading-color: #0f172a;
      --badge-bg: #eff6ff;
      --badge-text: #1d4ed8;
      --badge-border: #bfdbfe;
      --choice-bg: #f1f5f9;
      --choice-text: #334155;
      --choice-border: #cbd5e1;
      --math-bg: #f1f5f9;
      --math-text: #0f172a;
      --math-border: #e2e8f0;
      --header-bg: #ffffff;
      --header-border: #e2e8f0;
      --footer-border: #e2e8f0;
    }

    /* THEME: Executive Dark (Luminous Obsidian) */
    ${params.theme === 'executive_dark' ? `
      :root {
        --bg-page: #070b14;
        --card-bg: rgba(15, 23, 42, 0.85);
        --card-border: rgba(56, 189, 248, 0.18);
        --card-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.6);
        --text-main: #f1f5f9;
        --text-muted: #94a3b8;
        --heading-color: #ffffff;
        --badge-bg: linear-gradient(135deg, rgba(56, 189, 248, 0.22), rgba(99, 102, 241, 0.22));
        --badge-text: #38bdf8;
        --badge-border: rgba(56, 189, 248, 0.4);
        --choice-bg: rgba(148, 163, 184, 0.12);
        --choice-text: #e2e8f0;
        --choice-border: rgba(148, 163, 184, 0.25);
        --math-bg: #030712;
        --math-text: #38bdf8;
        --math-border: rgba(56, 189, 248, 0.25);
        --header-bg: rgba(15, 23, 42, 0.6);
        --header-border: rgba(56, 189, 248, 0.2);
        --footer-border: rgba(255, 255, 255, 0.08);
      }
    ` : ''}

    /* THEME: Modern Minimal */
    ${params.theme === 'modern_minimal' ? `
      :root {
        --bg-page: #ffffff;
        --card-bg: #ffffff;
        --card-border: #f1f5f9;
        --card-shadow: none;
        --text-main: #1e293b;
        --text-muted: #64748b;
        --heading-color: #000000;
        --badge-bg: #000000;
        --badge-text: #ffffff;
        --badge-border: #000000;
        --choice-bg: #f8fafc;
        --choice-text: #0f172a;
        --choice-border: #e2e8f0;
        --math-bg: #f8fafc;
        --math-text: #0f172a;
        --math-border: #e2e8f0;
        --header-bg: transparent;
        --header-border: #f1f5f9;
        --footer-border: #f1f5f9;
      }
    ` : ''}

    /* THEME: Academic */
    ${params.theme === 'academic' ? `
      :root {
        --font-display: ${params.isRTL ? "'Amiri', serif" : "'Times New Roman', Georgia, serif"};
        --font-body: ${params.isRTL ? "'Amiri', serif" : "'Times New Roman', Georgia, serif"};
        --bg-page: #fdfdfd;
        --card-bg: #ffffff;
        --card-border: #d1d5db;
        --card-shadow: none;
        --text-main: #111827;
        --text-muted: #4b5563;
        --heading-color: #000000;
        --badge-bg: #f3f4f6;
        --badge-text: #111827;
        --badge-border: #9ca3af;
        --choice-bg: #f9fafb;
        --choice-text: #111827;
        --choice-border: #d1d5db;
        --math-bg: #f3f4f6;
        --math-text: #111827;
        --math-border: #d1d5db;
        --header-bg: transparent;
        --header-border: #111827;
        --footer-border: #9ca3af;
      }
    ` : ''}

    /* Full-Bleed Page Setup: ZERO outer white margins! */
    @page {
      size: ${params.pageSize} ${params.orientation};
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background-color: var(--bg-page) !important;
      color: var(--text-main);
      font-family: var(--font-body);
      line-height: 1.65;
      font-size: 10.5pt;
    }

    .doc-page-wrapper {
      padding: 16mm 18mm 18mm 18mm;
      box-sizing: border-box;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: var(--bg-page);
    }

    /* Header Banner */
    .doc-header {
      margin-bottom: 24px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--header-border);
      position: relative;
    }

    .doc-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      background: var(--badge-bg);
      color: var(--badge-text);
      border: 1px solid var(--badge-border);
    }

    .brand-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--accent);
      box-shadow: 0 0 8px var(--accent);
    }

    .brand-sep { opacity: 0.5; }

    .doc-date-pill {
      font-size: 8.5pt;
      color: var(--text-muted);
      font-weight: 500;
    }

    .main-title {
      font-family: var(--font-display);
      font-size: 26pt;
      font-weight: 800;
      color: var(--heading-color);
      margin: 6px 0 10px 0;
      line-height: 1.15;
      letter-spacing: -0.5px;
    }

    .title-accent-bar {
      width: 60px;
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--accent), #818cf8);
    }

    /* Section Headers */
    .section-card {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 28px 0 14px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--card-border);
      page-break-after: avoid;
      break-after: avoid;
    }

    .section-badge {
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--accent);
      background: var(--badge-bg);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--badge-border);
      flex-shrink: 0;
    }

    .section-title {
      font-family: var(--font-display);
      font-size: 14pt;
      font-weight: 700;
      color: var(--heading-color);
      margin: 0;
      letter-spacing: -0.2px;
    }

    /* Question Headers & Badges */
    .question-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 22px 0 10px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--card-border);
      page-break-after: avoid;
      break-after: avoid;
    }

    .q-badge {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--accent);
      background: var(--badge-bg);
      padding: 3px 9px;
      border-radius: 5px;
      border: 1px solid var(--badge-border);
      font-family: var(--font-mono);
      flex-shrink: 0;
    }

    .q-title {
      font-family: var(--font-display);
      font-size: 13pt;
      font-weight: 700;
      color: var(--heading-color);
      margin: 0;
      letter-spacing: -0.2px;
    }

    /* QA Cards Grid */
    .qa-grid {
      display: flex;
      flex-direction: column;
      gap: 9px;
      margin: 12px 0 20px 0;
    }

    .qa-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 11px 16px;
      box-shadow: var(--card-shadow);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .qa-badge-container {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .qa-id-badge {
      background: var(--badge-bg);
      color: var(--badge-text);
      font-weight: 800;
      font-size: 9.5pt;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid var(--badge-border);
      font-family: var(--font-mono);
      letter-spacing: 0.5px;
    }

    .qa-choice-pill {
      background: var(--choice-bg);
      color: var(--choice-text);
      font-weight: 700;
      font-size: 9.5pt;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid var(--choice-border);
      font-family: var(--font-mono);
    }

    .qa-body-text {
      font-size: 10.5pt;
      line-height: 1.6;
      color: var(--text-main);
      flex-grow: 1;
      word-break: break-word;
    }

    /* Math & Code Styling */
    .math-inline {
      font-family: var(--font-mono);
      color: var(--accent);
      font-weight: 600;
      font-size: 1.0em;
      padding: 1px 6px;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.2);
      display: inline-block;
      direction: ltr !important;
      unicode-bidi: embed;
    }

    .math-block {
      background: var(--math-bg);
      border: 1px solid var(--math-border);
      border-radius: 8px;
      padding: 12px 18px;
      margin: 14px 0;
      font-family: var(--font-mono);
      font-size: 11pt;
      color: var(--accent);
      text-align: center;
      direction: ltr !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    code, .math-expr {
      font-family: var(--font-mono);
      background: var(--math-bg);
      color: var(--math-text);
      border: 1px solid var(--math-border);
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 9.5pt;
      direction: ltr !important;
      display: inline-block;
      unicode-bidi: embed;
    }

    sup {
      font-size: 0.75em;
      color: var(--accent);
      font-weight: 700;
      vertical-align: super;
      line-height: 0;
    }

    sub {
      font-size: 0.75em;
      color: var(--accent);
      font-weight: 600;
      vertical-align: sub;
      line-height: 0;
    }

    .num-highlight {
      color: var(--accent);
      font-weight: 700;
    }

    pre {
      background: var(--math-bg);
      border: 1px solid var(--math-border);
      border-radius: 8px;
      padding: 14px 18px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 9.5pt;
      direction: ltr !important;
      text-align: left !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 18px 0;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--card-border);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th, td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--card-border);
      text-align: ${params.isRTL ? 'right' : 'left'};
    }

    th {
      background: var(--badge-bg);
      color: var(--heading-color);
      font-weight: 700;
      font-size: 9.5pt;
      letter-spacing: 0.3px;
    }

    tr:last-child td { border-bottom: none; }

    /* Paragraphs and lists */
    p { margin: 0 0 12px 0; }
    ul, ol { margin: 0 0 16px 0; padding-${params.isRTL ? 'right' : 'left'}: 24px; }
    li { margin-bottom: 6px; line-height: 1.6; }
    ol li::marker { color: var(--accent); font-weight: 700; font-family: var(--font-mono); }
    ul li::marker { color: var(--accent); }

    /* Footer */
    .doc-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid var(--footer-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: var(--text-muted);
    }

    .footer-left {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }

    .footer-dot { opacity: 0.5; }

    .footer-right {
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-size: 7.5pt;
    }
  </style>
</head>
<body>
  <div class="doc-page-wrapper">
    <div class="doc-body-container">
      <header class="doc-header">
        <div class="doc-top-bar">
          <div class="brand-pill">
            <span class="brand-dot"></span>
            <span>VISION OS</span>
            <span class="brand-sep">•</span>
            <span>${pageCountText}</span>
          </div>
          <div class="doc-date-pill">
            <span>${formattedDate}</span>
          </div>
        </div>

        <h1 class="main-title">${this.escapeHtml(params.title)}</h1>
        <div class="title-accent-bar"></div>
      </header>

      <main class="doc-content-area">
        ${params.bodyContent}
      </main>
    </div>

    <footer class="doc-footer">
      <div class="footer-left">
        <span>Generated by VISION OS</span>
        <span class="footer-dot">•</span>
        <span>Personal AI Operating System</span>
      </div>
      <div class="footer-right">
        <span>${this.escapeHtml(params.title)}</span>
      </div>
    </footer>
  </div>
</body>
</html>`;
  }

  private injectTableOfContents(html: string, isRTL: boolean): string {
    const headingRegex = /<h([1-3])([^>]*)>(.*?)<\/h\1>/gi;
    const items: Array<{ level: number; text: string; id: string }> = [];

    let count = 0;
    const modifiedHtml = html.replace(headingRegex, (match, levelStr, attrs, innerText) => {
      count++;
      const level = parseInt(levelStr, 10);
      const cleanText = innerText.replace(/<[^>]+>/g, '').trim();
      const id = `heading-${count}`;
      items.push({ level, text: cleanText, id });
      return `<h${level}${attrs} id="${id}">${innerText}</h${level}>`;
    });

    if (items.length < 2) {
      return html;
    }

    const tocTitle = isRTL ? 'فهرس المحتويات' : 'Table of Contents';
    let tocHtml = `<div class="toc-container"><div class="toc-title">${tocTitle}</div><ul class="toc-list">`;
    for (const item of items) {
      const indent = (item.level - 1) * 16;
      tocHtml += `<li class="toc-item" style="margin-${isRTL ? 'right' : 'left'}: ${indent}px;"><a href="#${item.id}">${this.escapeHtml(item.text)}</a></li>`;
    }
    tocHtml += `</ul></div>`;

    return tocHtml + modifiedHtml;
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

export const documentService = new DocumentService();
