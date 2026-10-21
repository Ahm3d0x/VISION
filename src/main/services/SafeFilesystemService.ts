import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function getElectronShell() {
  try {
    const electron = await import('electron');
    return (electron as any).shell || (electron as any).default?.shell || null;
  } catch {
    return null;
  }
}

// =========================================================================
// Protected System Paths Validator
// Prevents accidental modification or deletion of vital Windows OS directories
// =========================================================================

export function isProtectedSystemPath(targetPath: string): { isProtected: boolean; reason?: string } {
  try {
    const resolved = path.resolve(targetPath);
    const normalized = resolved.toLowerCase().replace(/\\/g, '/');

    // 1. Root drives check (e.g. "C:", "C:/", "D:", "D:/")
    if (/^[a-z]:\/?$/i.test(normalized)) {
      return {
        isProtected: true,
        reason: `Access denied: Drive root "${resolved}" cannot be modified or deleted directly.`,
      };
    }

    // 2. Windows System Directories
    const winDir = (process.env.SystemRoot || process.env.windir || 'C:\\Windows').toLowerCase().replace(/\\/g, '/');
    if (normalized === winDir || normalized.startsWith(`${winDir}/`)) {
      return {
        isProtected: true,
        reason: `Access denied: Target "${resolved}" is inside the Windows system directory (${winDir}).`,
      };
    }

    // 3. Program Files directories
    const progFiles = (process.env.ProgramFiles || 'C:\\Program Files').toLowerCase().replace(/\\/g, '/');
    const progFilesX86 = (process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)').toLowerCase().replace(/\\/g, '/');
    const progW64 = (process.env.ProgramW6432 || '').toLowerCase().replace(/\\/g, '/');

    if (normalized === progFiles || normalized.startsWith(`${progFiles}/`)) {
      return {
        isProtected: true,
        reason: `Access denied: Target "${resolved}" is inside Program Files.`,
      };
    }

    if (progFilesX86 && (normalized === progFilesX86 || normalized.startsWith(`${progFilesX86}/`))) {
      return {
        isProtected: true,
        reason: `Access denied: Target "${resolved}" is inside Program Files (x86).`,
      };
    }

    if (progW64 && (normalized === progW64 || normalized.startsWith(`${progW64}/`))) {
      return {
        isProtected: true,
        reason: `Access denied: Target "${resolved}" is inside Program Files.`,
      };
    }

    // 4. Critical OS Folders and root user directory itself
    if (normalized === 'c:/users' || normalized === 'c:/users/') {
      return { isProtected: true, reason: `Access denied: Base folder "${resolved}" is protected.` };
    }

    const forbiddenExactOrPrefixes = [
      'c:/pagefile.sys',
      'c:/swapfile.sys',
      'c:/hiberfil.sys',
      'c:/bootmgr',
      'c:/$recycle.bin',
      'c:/system volume information',
    ];

    for (const forbidden of forbiddenExactOrPrefixes) {
      if (normalized === forbidden || normalized.startsWith(`${forbidden}/`)) {
        return { isProtected: true, reason: `Access denied: "${resolved}" is a protected OS system resource.` };
      }
    }

    return { isProtected: false };
  } catch (err: any) {
    return { isProtected: true, reason: `Failed to validate target path: ${err.message}` };
  }
}

// =========================================================================
// 1. Read File (Smart, Paginated & Truncation-Protected)
// =========================================================================

export interface ReadFileOptions {
  filePath: string;
  startLine?: number;
  endLine?: number;
  maxLines?: number;
}

export async function safeReadFile(options: ReadFileOptions) {
  try {
    const resolvedPath = path.resolve(options.filePath);

    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `File not found: "${resolvedPath}"` };
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return { success: false, error: `Target path is a directory, not a file: "${resolvedPath}"` };
    }

    const rawContent = fs.readFileSync(resolvedPath, 'utf-8');
    const lines = rawContent.split(/\r?\n/);
    const totalLines = lines.length;

    const maxLines = Math.min(Math.max(options.maxLines ?? 500, 1), 2000);
    const startLine = Math.max(options.startLine ?? 1, 1);
    
    let endLine: number;
    if (options.endLine !== undefined && options.endLine >= startLine) {
      endLine = Math.min(options.endLine, totalLines);
    } else {
      endLine = Math.min(startLine + maxLines - 1, totalLines);
    }

    if (endLine - startLine + 1 > maxLines) {
      endLine = startLine + maxLines - 1;
    }

    const selectedLines = lines.slice(startLine - 1, endLine);
    const content = selectedLines.join('\n');
    const truncated = selectedLines.length < totalLines;

    return {
      success: true,
      filePath: resolvedPath,
      fileName: path.basename(resolvedPath),
      totalLines,
      startLine,
      endLine,
      lineCount: selectedLines.length,
      truncated,
      content,
    };
  } catch (err: any) {
    return { success: false, error: `Failed to read file: ${err.message}` };
  }
}

// =========================================================================
// 2. Write File (Safe Creation / Overwrite with Automatic .bak Backup)
// =========================================================================

export interface WriteFileOptions {
  filePath: string;
  content: string;
  overwrite?: boolean;
  createDirs?: boolean;
}

export async function safeWriteFile(options: WriteFileOptions) {
  try {
    const resolvedPath = path.resolve(options.filePath);

    // Protected path check
    const protection = isProtectedSystemPath(resolvedPath);
    if (protection.isProtected) {
      return { success: false, error: protection.reason };
    }

    const fileExists = fs.existsSync(resolvedPath);
    if (fileExists) {
      const stat = fs.statSync(resolvedPath);
      if (stat.isDirectory()) {
        return { success: false, error: `Cannot write: Target "${resolvedPath}" is an existing directory.` };
      }

      if (!options.overwrite) {
        return {
          success: false,
          error: `File already exists at "${resolvedPath}". Set overwrite=true if you explicitly intend to replace it.`,
        };
      }
    }

    // Ensure parent directories exist
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      if (options.createDirs !== false) {
        fs.mkdirSync(dir, { recursive: true });
      } else {
        return {
          success: false,
          error: `Parent directory "${dir}" does not exist and createDirs is false.`,
        };
      }
    }

    let backupCreated: string | undefined = undefined;
    if (fileExists) {
      try {
        const backupPath = `${resolvedPath}.bak`;
        fs.copyFileSync(resolvedPath, backupPath);
        backupCreated = backupPath;
      } catch (backupErr: any) {
        console.warn(`[SafeFilesystem] Failed to create .bak backup: ${backupErr.message}`);
      }
    }

    fs.writeFileSync(resolvedPath, options.content, 'utf-8');
    const bytesWritten = Buffer.byteLength(options.content, 'utf-8');

    return {
      success: true,
      filePath: resolvedPath,
      fileName: path.basename(resolvedPath),
      bytesWritten,
      backupCreated,
      message: fileExists
        ? `Successfully updated file "${path.basename(resolvedPath)}"${backupCreated ? ' (backup created)' : ''}.`
        : `Successfully created new file "${path.basename(resolvedPath)}".`,
    };
  } catch (err: any) {
    return { success: false, error: `Failed to write file: ${err.message}` };
  }
}

// =========================================================================
// 3. Edit File (Surgical Target Replacement with Automatic .bak Backup)
// =========================================================================

export interface EditFileOptions {
  filePath: string;
  targetText: string;
  replacementText: string;
}

export async function safeEditFile(options: EditFileOptions) {
  try {
    const resolvedPath = path.resolve(options.filePath);

    // Protected path check
    const protection = isProtectedSystemPath(resolvedPath);
    if (protection.isProtected) {
      return { success: false, error: protection.reason };
    }

    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `File not found: "${resolvedPath}"` };
    }

    const stat = fs.statSync(resolvedPath);
    if (stat.isDirectory()) {
      return { success: false, error: `Target path is a directory, not a file: "${resolvedPath}"` };
    }

    const currentContent = fs.readFileSync(resolvedPath, 'utf-8');
    if (!currentContent.includes(options.targetText)) {
      return {
        success: false,
        error: `Target text was not found in file "${path.basename(resolvedPath)}". Please verify the exact whitespace and characters.`,
      };
    }

    // Count occurrences
    const occurrences = currentContent.split(options.targetText).length - 1;

    // Create backup before modification
    let backupCreated: string | undefined = undefined;
    try {
      const backupPath = `${resolvedPath}.bak`;
      fs.copyFileSync(resolvedPath, backupPath);
      backupCreated = backupPath;
    } catch (bErr: any) {
      console.warn(`[SafeFilesystem] Backup warning: ${bErr.message}`);
    }

    // Apply surgical replacement
    const updatedContent = currentContent.replaceAll(options.targetText, options.replacementText);
    fs.writeFileSync(resolvedPath, updatedContent, 'utf-8');

    return {
      success: true,
      filePath: resolvedPath,
      fileName: path.basename(resolvedPath),
      occurrencesReplaced: occurrences,
      backupCreated,
      message: `Successfully replaced ${occurrences} occurrence(s) in "${path.basename(resolvedPath)}"${backupCreated ? ' (backup saved)' : ''}.`,
    };
  } catch (err: any) {
    return { success: false, error: `Failed to edit file: ${err.message}` };
  }
}

// =========================================================================
// 4. Search Files (By Name Pattern and/or Content Grep)
// =========================================================================

export interface SearchFilesOptions {
  directory: string;
  fileNamePattern?: string;
  queryText?: string;
  maxResults?: number;
  recursive?: boolean;
}

export interface FileSearchResult {
  path: string;
  name: string;
  extension: string;
  sizeBytes: number;
  isDirectory: boolean;
  modifiedAt: string;
  snippet?: string;
}

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i');
}

export async function safeSearchFiles(options: SearchFilesOptions) {
  try {
    const resolvedDir = path.resolve(options.directory);

    if (!fs.existsSync(resolvedDir)) {
      return { success: false, error: `Directory not found: "${resolvedDir}"` };
    }

    const stat = fs.statSync(resolvedDir);
    if (!stat.isDirectory()) {
      return { success: false, error: `Target path is not a directory: "${resolvedDir}"` };
    }

    const maxResults = Math.min(Math.max(options.maxResults ?? 20, 1), 100);
    const recursive = options.recursive !== false;
    const nameRegex = options.fileNamePattern ? patternToRegex(options.fileNamePattern) : null;
    const queryLower = options.queryText ? options.queryText.toLowerCase() : null;

    const results: FileSearchResult[] = [];
    const ignoredDirs = new Set([
      'node_modules',
      '.git',
      '.next',
      '.cache',
      'dist',
      'dist-electron',
      '$recycle.bin',
      'system volume information',
      'appdata',
    ]);

    function walk(dir: string, depth = 0) {
      if (results.length >= maxResults || depth > 10) return;

      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        // Skip inaccessible folders (permission denied)
        return;
      }

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const entryNameLower = entry.name.toLowerCase();
        if (entry.isDirectory()) {
          if (ignoredDirs.has(entryNameLower) || entryNameLower.startsWith('.')) {
            continue;
          }
          if (recursive) {
            walk(path.join(dir, entry.name), depth + 1);
          }
          continue;
        }

        // File check
        const fullPath = path.join(dir, entry.name);

        // Pattern filter
        if (nameRegex && !nameRegex.test(entry.name)) {
          continue;
        }

        // Content Grep filter
        let snippet: string | undefined = undefined;
        if (queryLower) {
          try {
            const fStat = fs.statSync(fullPath);
            // Skip large files (> 5MB) for grep content to preserve speed and RAM
            if (fStat.size > 5 * 1024 * 1024) {
              continue;
            }
            const content = fs.readFileSync(fullPath, 'utf-8');
            const idx = content.toLowerCase().indexOf(queryLower);
            if (idx === -1) {
              continue;
            }
            const start = Math.max(0, idx - 60);
            const end = Math.min(content.length, idx + queryLower.length + 60);
            snippet = (start > 0 ? '...' : '') + content.slice(start, end).replace(/\s+/g, ' ').trim() + (end < content.length ? '...' : '');
          } catch {
            continue;
          }
        }

        try {
          const fStat = fs.statSync(fullPath);
          results.push({
            path: fullPath,
            name: entry.name,
            extension: path.extname(entry.name).toLowerCase(),
            sizeBytes: fStat.size,
            isDirectory: false,
            modifiedAt: fStat.mtime.toISOString(),
            snippet,
          });
        } catch {
          // ignore individual stat failures
        }
      }
    }

    walk(resolvedDir, 0);

    return {
      success: true,
      directory: resolvedDir,
      totalFound: results.length,
      results,
      message: `Found ${results.length} item(s) matching criteria.`,
    };
  } catch (err: any) {
    return { success: false, error: `Search failed: ${err.message}` };
  }
}

// =========================================================================
// 5. Trash File (Safe Windows Recycle Bin Deletion)
// =========================================================================

export interface TrashFileOptions {
  targetPath: string;
  reason?: string;
}

export async function safeTrashFile(options: TrashFileOptions) {
  try {
    const resolvedPath = path.resolve(options.targetPath);

    // Protected path check
    const protection = isProtectedSystemPath(resolvedPath);
    if (protection.isProtected) {
      return { success: false, error: protection.reason };
    }

    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: `Target path does not exist: "${resolvedPath}"` };
    }

    const isDir = fs.statSync(resolvedPath).isDirectory();
    const itemName = path.basename(resolvedPath);

    // Primary Attempt: Electron's built-in shell.trashItem
    const electronShell = await getElectronShell();
    if (electronShell?.trashItem) {
      try {
        await electronShell.trashItem(resolvedPath);
        return {
          success: true,
          targetPath: resolvedPath,
          itemName,
          isDirectory: isDir,
          message: `Successfully moved "${itemName}" to the Windows Recycle Bin (can be safely restored if needed).`,
        };
      } catch (shellErr: any) {
        console.warn(`[SafeFilesystem] shell.trashItem failed, attempting PowerShell fallback: ${shellErr.message}`);
      }
    }

    // Secondary Fallback: PowerShell Microsoft.VisualBasic Recycle Bin API
    const escapedPath = resolvedPath.replace(/'/g, "''");
    const method = isDir ? 'DeleteDirectory' : 'DeleteFile';
    const psScript = `
      Add-Type -AssemblyName Microsoft.VisualBasic;
      [Microsoft.VisualBasic.FileIO.FileSystem]::${method}('${escapedPath}', 'OnlyErrorDialogs', 'SendToRecycleBin');
    `.replace(/\r?\n/g, ' ');

    await execAsync(`powershell.exe -NoProfile -NonInteractive -Command "${psScript}"`);

    // Verify it was moved
    if (fs.existsSync(resolvedPath)) {
      return {
        success: false,
        error: `Could not move "${itemName}" to Recycle Bin. Item still exists.`,
      };
    }

    return {
      success: true,
      targetPath: resolvedPath,
      itemName,
      isDirectory: isDir,
      message: `Successfully moved "${itemName}" to the Windows Recycle Bin via PowerShell (restorable).`,
    };
  } catch (err: any) {
    return { success: false, error: `Failed to move item to Recycle Bin: ${err.message}` };
  }
}
