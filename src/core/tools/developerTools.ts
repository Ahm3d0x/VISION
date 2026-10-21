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

/**
 * Universal shell command runner:
 * - Uses Electron IPC bridge (`visionAPI.executeCommand`) when running inside Electron renderer.
 * - Gracefully falls back to Node.js `child_process.exec` when running in tests, CLI, or server environment.
 */
export async function runShellCommand(options: {
  command: string;
  cwd?: string;
  shell?: 'powershell' | 'cmd' | 'pwsh' | 'bash' | 'auto';
  timeout?: number;
}): Promise<{
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
}> {
  const api = getVisionAPI();
  if (api?.executeCommand) {
    try {
      const res = await api.executeCommand({
        command: options.command,
        cwd: options.cwd,
        shell: options.shell || 'powershell',
        timeout: options.timeout || 35000,
      });
      return {
        success: res.success,
        exitCode: res.exitCode ?? (res.success ? 0 : 1),
        stdout: res.stdout || '',
        stderr: res.stderr || '',
        error: res.error,
      };
    } catch (err: any) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message || 'executeCommand IPC call failed',
        error: err.message,
      };
    }
  }

  // Node.js fallback (for tests, CLI, or headless execution)
  try {
    const cp = await import('child_process');
    return new Promise((resolve) => {
      cp.exec(
        options.command,
        {
          cwd: options.cwd || process.cwd(),
          shell: options.shell === 'cmd' ? 'cmd.exe' : 'powershell.exe',
          timeout: options.timeout || 35000,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          resolve({
            success: !error,
            exitCode: error ? (error.code ?? 1) : 0,
            stdout: stdout ? stdout.toString() : '',
            stderr: stderr ? stderr.toString() : (error ? error.message : ''),
            error: error ? error.message : undefined,
          });
        }
      );
    });
  } catch (err: any) {
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: err.message || 'Execution environment not supported',
      error: 'Shell execution environment not available',
    };
  }
}

// =========================================================================
// 1. gitStatusTool (Inspect Repository Status)
// =========================================================================
export const gitStatusTool = createTool({
  name: 'git_status',
  description:
    'Inspect Git repository status: current branch, tracking branch, commits ahead/behind, staged changes, unstaged modified files, and untracked files.',
  category: 'code',
  permissionLevel: 0,
  riskLevel: 'LOW',
  schema: z.object({
    repoPath: z.string().optional().describe('مسار مجلد المشروع (اختياري - افتراضياً مجلد العمل الحالي)'),
  }),
  paramDescriptions: {
    repoPath: {
      type: 'string',
      description: 'Path to the git repository folder (optional, defaults to current working directory).',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const cwd = input.repoPath;
    const res = await runShellCommand({
      command: 'git status --porcelain=v1 -b',
      cwd,
      shell: 'powershell',
    });

    const isNotRepo =
      !res.success &&
      (res.stderr.toLowerCase().includes('not a git repository') ||
        res.stdout.toLowerCase().includes('not a git repository'));

    if (isNotRepo) {
      return {
        success: true,
        output: {
          isGitRepo: false,
          repoPath: cwd || 'current working directory',
          message: 'The specified directory is not a Git repository. Git is not initialized here yet. Run "git init" to initialize Git.',
        },
        message: 'The directory is not a Git repository (git is not initialized yet).',
      };
    }

    if (!res.success) {
      return {
        success: false,
        error: res.stderr || res.error || 'Failed to inspect git status',
      };
    }

    const lines = res.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
    let currentBranch = 'unknown';
    let trackingBranch: string | undefined;
    let ahead = 0;
    let behind = 0;
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && line.startsWith('##')) {
        // Parse branch line, e.g. "## main...origin/main [ahead 1, behind 2]" or "## main" or "## HEAD (no branch)"
        const branchContent = line.substring(2).trim();
        if (branchContent.includes('(no branch)') || branchContent.startsWith('HEAD')) {
          currentBranch = 'HEAD (detached)';
        } else {
          const match = branchContent.match(/^([^\s.]+)(?:\.\.\.([^\s]+))?(?:\s+\[(.*)\])?/);
          if (match) {
            currentBranch = match[1];
            trackingBranch = match[2];
            const meta = match[3] || '';
            const aheadMatch = meta.match(/ahead\s+(\d+)/);
            if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
            const behindMatch = meta.match(/behind\s+(\d+)/);
            if (behindMatch) behind = parseInt(behindMatch[1], 10);
          } else {
            currentBranch = branchContent;
          }
        }
        continue;
      }

      if (line.length >= 3) {
        const x = line[0];
        const y = line[1];
        const filePath = line.substring(3).trim();

        if (x === '?' && y === '?') {
          untracked.push(filePath);
        } else {
          if (x !== ' ' && x !== '?') {
            staged.push(filePath);
          }
          if (y === 'M' || y === 'D') {
            modified.push(filePath);
          }
        }
      }
    }

    const isClean = staged.length === 0 && modified.length === 0 && untracked.length === 0;
    const summary = `Branch: "${currentBranch}" | Clean: ${isClean} | Staged: ${staged.length} | Modified: ${modified.length} | Untracked: ${untracked.length}${ahead > 0 ? ` | Ahead: ${ahead}` : ''}${behind > 0 ? ` | Behind: ${behind}` : ''}`;

    return {
      success: true,
      output: {
        isGitRepo: true,
        currentBranch,
        trackingBranch,
        isClean,
        staged,
        modified,
        untracked,
        ahead,
        behind,
        summary,
      },
      message: `[Git Status] ${summary}`,
    };
  },
});

// =========================================================================
// 2. gitDiffTool (Inspect Changes / Diffs)
// =========================================================================
export const gitDiffTool = createTool({
  name: 'git_diff',
  description:
    'Inspect Git diff changes for the working tree or staged changes (--cached), optionally filtered by a specific file, with safe output line truncation.',
  category: 'code',
  permissionLevel: 0,
  riskLevel: 'LOW',
  schema: z.object({
    repoPath: z.string().optional().describe('مسار مجلد المشروع (اختياري)'),
    filePath: z.string().optional().describe('فحص ملف محدد فقط (اختياري - إن تُرِك فارغاً يعرض كل التغييرات)'),
    staged: z.boolean().optional().describe('هل يتم فحص التغييرات الجاهزة للـ commit (--cached) أم التغييرات الحالية في مجلد العمل؟'),
    maxLines: z.number().int().min(10).max(2000).optional().describe('أقصى عدد أسطر للـ diff لمنع تجاوز سياق المحادثة (افتراضياً 300)'),
  }),
  paramDescriptions: {
    repoPath: {
      type: 'string',
      description: 'Repository folder path (optional).',
    },
    filePath: {
      type: 'string',
      description: 'Optional file path to inspect diff for a specific file.',
    },
    staged: {
      type: 'boolean',
      description: 'If true, inspects staged changes (--cached) prepared for commit.',
    },
    maxLines: {
      type: 'number',
      description: 'Maximum lines of diff output to return before truncating (default 300).',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const cwd = input.repoPath;
    const maxLines = input.maxLines || 300;
    let cmd = input.staged ? 'git diff --cached' : 'git diff';

    if (input.filePath) {
      const sanitizedFile = input.filePath.trim().replace(/["';`$]/g, '');
      cmd += ` -- "${sanitizedFile}"`;
    }

    const res = await runShellCommand({
      command: cmd,
      cwd,
      shell: 'powershell',
    });

    if (!res.success) {
      if (
        res.stderr.toLowerCase().includes('not a git repository') ||
        res.stdout.toLowerCase().includes('not a git repository')
      ) {
        return {
          success: true,
          output: {
            diff: '',
            isGitRepo: false,
            isEmpty: true,
            message: 'The specified directory is not a Git repository. Git is not initialized here yet.',
          },
          message: 'The specified directory is not a Git repository.',
        };
      }
      return { success: false, error: res.stderr || res.error || 'Failed to execute git diff' };
    }

    const rawDiff = res.stdout;
    const allLines = rawDiff.split(/\r?\n/);
    const isEmpty = rawDiff.trim().length === 0;

    let diffText = rawDiff;
    let isTruncated = false;

    if (allLines.length > maxLines) {
      isTruncated = true;
      diffText =
        allLines.slice(0, maxLines).join('\n') +
        `\n\n... [Diff truncated: showing ${maxLines} of ${allLines.length} lines. Specify filePath or increase maxLines to see more]`;
    }

    return {
      success: true,
      output: {
        diff: diffText,
        staged: !!input.staged,
        filePath: input.filePath || 'all files',
        totalLines: allLines.length,
        isTruncated,
        isEmpty,
      },
      message: isEmpty
        ? `[Git Diff] No ${input.staged ? 'staged' : 'unstaged'} changes found.`
        : `[Git Diff] Retrieved diff (${allLines.length} lines${isTruncated ? `, truncated to ${maxLines}` : ''}).`,
    };
  },
});

// =========================================================================
// 3. gitCommitTool (Stage & Create Local Commit)
// =========================================================================
export const gitCommitTool = createTool({
  name: 'git_commit',
  description:
    'Safely stage files and create a local Git commit with a descriptive message (e.g. Conventional Commits). Optionally create and switch to a new branch first. Does NOT push to remote repositories.',
  category: 'code',
  permissionLevel: 2,
  riskLevel: 'MEDIUM',
  schema: z.object({
    repoPath: z.string().optional().describe('مسار مجلد المشروع (اختياري)'),
    message: z.string().min(1).describe('رسالة الـ Commit (مثل: feat: add media control tool)'),
    files: z.array(z.string()).optional().describe('قائمة الملفات المراد عمل stage لها (افتراضياً كل التعديلات ".")'),
    createNewBranch: z.string().optional().describe('اسم فرع جديد إذا كنت ترغب في عمل الـ commit على branch منفصل'),
  }),
  paramDescriptions: {
    repoPath: {
      type: 'string',
      description: 'Repository folder path (optional).',
    },
    message: {
      type: 'string',
      description: 'Commit message describing the changes (e.g. feat: add git developer tools).',
    },
    files: {
      type: 'array',
      description: 'List of files to stage (defaults to ["."] for all changed files).',
    },
    createNewBranch: {
      type: 'string',
      description: 'Optional new branch name to create and checkout before committing.',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const cwd = input.repoPath;

    // 1. Optionally create and switch to a new branch
    if (input.createNewBranch) {
      const cleanBranch = input.createNewBranch.trim().replace(/[^a-zA-Z0-9_\-./]/g, '');
      if (!cleanBranch) {
        return { success: false, error: 'Invalid branch name specified in createNewBranch.' };
      }
      const branchRes = await runShellCommand({
        command: `git checkout -b "${cleanBranch}"`,
        cwd,
        shell: 'powershell',
      });
      if (!branchRes.success) {
        return {
          success: false,
          error: `Failed to create/checkout branch "${cleanBranch}": ${branchRes.stderr || branchRes.error}`,
        };
      }
    }

    // 2. Stage target files (default to '.')
    const targetFiles = input.files && input.files.length > 0 ? input.files : ['.'];
    const safeFiles = targetFiles.map((f) => `"${f.replace(/["';`$]/g, '')}"`).join(' ');
    const addRes = await runShellCommand({
      command: `git add ${safeFiles}`,
      cwd,
      shell: 'powershell',
    });
    if (!addRes.success) {
      return {
        success: false,
        error: `Failed to stage files with "git add": ${addRes.stderr || addRes.error}`,
      };
    }

    // 3. Check if anything is staged to commit
    const diffCachedRes = await runShellCommand({
      command: 'git diff --cached --name-only',
      cwd,
      shell: 'powershell',
    });
    const stagedFiles = diffCachedRes.stdout.split(/\r?\n/).filter((f) => f.trim().length > 0);
    if (stagedFiles.length === 0) {
      return {
        success: false,
        error: 'No staged changes found to commit. Working tree is clean or selected files have no modifications.',
      };
    }

    // 4. Create Commit using temporary message file to guarantee 100% shell independence and no quote escaping issues
    let commitRes;
    let tempMsgFile: string | undefined;
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      tempMsgFile = path.join(
        os.tmpdir(),
        `vision_commit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.txt`
      );
      fs.writeFileSync(tempMsgFile, input.message, 'utf8');
      commitRes = await runShellCommand({
        command: `git commit -F "${tempMsgFile}"`,
        cwd,
        shell: 'powershell',
      });
    } catch {
      const escaped = input.message.replace(/"/g, '\\"');
      commitRes = await runShellCommand({
        command: `git commit -m "${escaped}"`,
        cwd,
        shell: 'powershell',
      });
    } finally {
      if (tempMsgFile) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(tempMsgFile)) fs.unlinkSync(tempMsgFile);
        } catch {}
      }
    }

    if (!commitRes.success) {
      return {
        success: false,
        error: `Git commit failed: ${commitRes.stderr || commitRes.error || commitRes.stdout}`,
      };
    }

    // 5. Retrieve commit metadata
    const logRes = await runShellCommand({
      command: 'git log -1 --format="%H|%h|%s|%an|%cr"',
      cwd,
      shell: 'powershell',
    });
    const branchRes = await runShellCommand({
      command: 'git rev-parse --abbrev-ref HEAD',
      cwd,
      shell: 'powershell',
    });

    const [fullHash, shortHash, subject, author, relativeDate] = logRes.stdout.trim().split('|');
    const currentBranch = branchRes.stdout.trim() || 'unknown';

    return {
      success: true,
      output: {
        commitHash: fullHash || 'created',
        shortHash: shortHash || 'created',
        branch: currentBranch,
        message: input.message,
        author: author || 'local user',
        relativeDate: relativeDate || 'just now',
        stagedFilesCount: stagedFiles.length,
        stagedFiles,
        note: 'Local commit only. No remote push (git push) was executed.',
      },
      message: `[Git Commit] Successfully created commit ${shortHash || ''} on branch "${currentBranch}": "${input.message}" (${stagedFiles.length} files). Local only.`,
    };
  },
});

// =========================================================================
// 4. gitBranchTool (Branch Management)
// =========================================================================
export const gitBranchTool = createTool({
  name: 'git_branch',
  description:
    'Manage Git branches: list branches (local and remote), create a new branch, switch to an existing branch, or safely delete a branch.',
  category: 'code',
  permissionLevel: 1,
  riskLevel: 'LOW',
  schema: z.object({
    repoPath: z.string().optional().describe('مسار مجلد المشروع (اختياري)'),
    action: z.enum(['list', 'create', 'switch', 'delete']).describe('إجراء الفروع: "list" لعرض الفروع، "create" لإنشاء فرع، "switch" للتنقل لفرع، "delete" لحذف فرع آمن'),
    branchName: z.string().optional().describe('اسم الفرع (مطلوب عند create, switch, delete)'),
  }),
  paramDescriptions: {
    repoPath: {
      type: 'string',
      description: 'Repository folder path (optional).',
    },
    action: {
      type: 'string',
      description: 'Branch operation: "list", "create", "switch", or "delete".',
      enum: ['list', 'create', 'switch', 'delete'],
    },
    branchName: {
      type: 'string',
      description: 'Branch name (required for create, switch, or delete).',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const cwd = input.repoPath;
    const cleanBranch = input.branchName ? input.branchName.trim().replace(/[^a-zA-Z0-9_\-./]/g, '') : undefined;

    if (input.action !== 'list' && !cleanBranch) {
      return { success: false, error: `branchName is required for action "${input.action}".` };
    }

    if (input.action === 'list') {
      const res = await runShellCommand({
        command: 'git branch -a --sort=-committerdate',
        cwd,
        shell: 'powershell',
      });
      if (!res.success) {
        if (
          res.stderr.toLowerCase().includes('not a git repository') ||
          res.stdout.toLowerCase().includes('not a git repository')
        ) {
          return {
            success: true,
            output: {
              isGitRepo: false,
              currentBranch: 'none',
              localBranches: [],
              remoteBranches: [],
              message: 'The specified directory is not a Git repository. Git is not initialized here yet.',
            },
            message: 'The directory is not a Git repository.',
          };
        }
        return { success: false, error: res.stderr || res.error || 'Failed to list branches' };
      }

      const lines = res.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
      let currentBranch = 'unknown';
      const localBranches: string[] = [];
      const remoteBranches: string[] = [];

      for (const line of lines) {
        const isCurrent = line.startsWith('*');
        const name = line.replace(/^\*?\s+/, '').trim();
        if (isCurrent) currentBranch = name;

        if (name.startsWith('remotes/')) {
          remoteBranches.push(name);
        } else {
          localBranches.push(name);
        }
      }

      return {
        success: true,
        output: {
          currentBranch,
          localBranches,
          remoteBranches,
          totalCount: localBranches.length + remoteBranches.length,
        },
        message: `[Git Branch] Current branch: "${currentBranch}". Local branches: ${localBranches.join(', ')}`,
      };
    }

    if (input.action === 'create') {
      const res = await runShellCommand({
        command: `git branch "${cleanBranch}"`,
        cwd,
        shell: 'powershell',
      });
      if (!res.success) {
        return { success: false, error: res.stderr || res.error || `Failed to create branch "${cleanBranch}"` };
      }
      return {
        success: true,
        output: { branchCreated: cleanBranch },
        message: `[Git Branch] Created new branch "${cleanBranch}" successfully.`,
      };
    }

    if (input.action === 'switch') {
      const res = await runShellCommand({
        command: `git checkout "${cleanBranch}"`,
        cwd,
        shell: 'powershell',
      });
      if (!res.success) {
        return { success: false, error: res.stderr || res.error || `Failed to switch to branch "${cleanBranch}"` };
      }
      return {
        success: true,
        output: { switchedTo: cleanBranch },
        message: `[Git Branch] Switched to branch "${cleanBranch}" successfully.`,
      };
    }

    if (input.action === 'delete') {
      const res = await runShellCommand({
        command: `git branch -d "${cleanBranch}"`,
        cwd,
        shell: 'powershell',
      });
      if (!res.success) {
        return {
          success: false,
          error: res.stderr || res.error || `Failed to delete branch "${cleanBranch}". (It may contain unmerged commits)`,
        };
      }
      return {
        success: true,
        output: { deletedBranch: cleanBranch },
        message: `[Git Branch] Safely deleted branch "${cleanBranch}".`,
      };
    }

    return { success: false, error: `Unsupported branch action: ${(input as any).action}` };
  },
});

// =========================================================================
// 5. codebaseSummaryTool (Automatic Project & Architecture Discovery)
// =========================================================================
export const codebaseSummaryTool = createTool({
  name: 'codebase_summary',
  description:
    'Automatically scan and analyze any software project: detect tech stack, package manifests, key entry points, scripts, and build a clean directory tree ignoring build artifacts.',
  category: 'code',
  permissionLevel: 0,
  riskLevel: 'LOW',
  schema: z.object({
    repoPath: z.string().optional().describe('مسار مجلد المشروع (اختياري - افتراضياً مجلد العمل الحالي)'),
    maxDepth: z.number().int().min(1).max(5).optional().describe('أقصى عمق لشجرة المجلدات (افتراضياً 3)'),
  }),
  paramDescriptions: {
    repoPath: {
      type: 'string',
      description: 'Path to project folder to analyze (optional, defaults to current directory).',
    },
    maxDepth: {
      type: 'number',
      description: 'Maximum depth for directory tree exploration (default 3).',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    const cwd = input.repoPath || '.';
    const maxDepth = input.maxDepth || 3;

    // Fast Node.js inline scanner that runs cross-platform via runShellCommand or directly if in Node
    const analyzerScript = `
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[1] || '.';
const maxDepth = parseInt(process.argv[2] || '3', 10);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'dist-electron', '.venv', 'venv', 'env',
  'coverage', '.next', '.nuxt', '.output', 'target', 'bin', 'obj', 'out',
  '.cache', '.turbo', 'vendor', '__pycache__', '.expo', '.idea', '.vscode'
]);

function buildTree(dir, currentDepth = 1) {
  if (currentDepth > maxDepth) return '';
  let lines = [];
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    // Sort directories first, then files alphabetically
    items.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const visibleItems = items.filter(it => !IGNORED_DIRS.has(it.name) && !it.name.startsWith('.git'));
    for (let i = 0; i < visibleItems.length; i++) {
      const item = visibleItems[i];
      const isLast = i === visibleItems.length - 1;
      const prefix = '  '.repeat(currentDepth - 1) + (isLast ? '└── ' : '├── ');
      if (item.isDirectory()) {
        lines.push(prefix + item.name + '/');
        const sub = buildTree(path.join(dir, item.name), currentDepth + 1);
        if (sub) lines.push(sub);
      } else {
        lines.push(prefix + item.name);
      }
    }
  } catch (err) {}
  return lines.join('\\n');
}

const result = {
  projectName: path.basename(path.resolve(targetDir)),
  detectedStack: [],
  entryPoints: [],
  scripts: {},
  readmeSnippet: null,
  directoryStructure: ''
};

// 1. package.json analysis
const pkgPath = path.join(targetDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name) result.projectName = pkg.name;
    if (pkg.scripts) result.scripts = pkg.scripts;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['react']) result.detectedStack.push('React');
    if (deps['react-native'] || deps['expo']) result.detectedStack.push('React Native / Expo');
    if (deps['electron']) result.detectedStack.push('Electron');
    if (deps['typescript']) result.detectedStack.push('TypeScript');
    if (deps['tailwindcss']) result.detectedStack.push('Tailwind CSS');
    if (deps['vite']) result.detectedStack.push('Vite');
    if (deps['next']) result.detectedStack.push('Next.js');
    if (deps['vue']) result.detectedStack.push('Vue');
    if (deps['svelte']) result.detectedStack.push('Svelte');
    if (deps['express']) result.detectedStack.push('Express');
    if (deps['@nestjs/core']) result.detectedStack.push('NestJS');
    if (deps['fastify']) result.detectedStack.push('Fastify');
    if (deps['better-sqlite3'] || deps['sqlite3'] || deps['drizzle-orm']) result.detectedStack.push('SQLite / Drizzle ORM');
    if (deps['prisma'] || deps['@prisma/client']) result.detectedStack.push('Prisma');
    if (deps['pg'] || deps['postgres']) result.detectedStack.push('PostgreSQL');
    if (deps['zod']) result.detectedStack.push('Zod');
    if (deps['jest'] || deps['vitest']) result.detectedStack.push(deps['vitest'] ? 'Vitest' : 'Jest');
  } catch (e) {}
}

// 2. Python manifests
if (fs.existsSync(path.join(targetDir, 'requirements.txt')) || fs.existsSync(path.join(targetDir, 'pyproject.toml'))) {
  result.detectedStack.push('Python');
}

// 3. Rust, Go, Java, Docker
if (fs.existsSync(path.join(targetDir, 'Cargo.toml'))) result.detectedStack.push('Rust');
if (fs.existsSync(path.join(targetDir, 'go.mod'))) result.detectedStack.push('Go');
if (fs.existsSync(path.join(targetDir, 'pom.xml')) || fs.existsSync(path.join(targetDir, 'build.gradle'))) result.detectedStack.push('Java');
if (fs.existsSync(path.join(targetDir, 'Dockerfile')) || fs.existsSync(path.join(targetDir, 'docker-compose.yml'))) result.detectedStack.push('Docker');

// 4. Common Entry Points Detection
const candidateEntries = [
  'src/main/index.ts',
  'src/renderer/index.tsx',
  'src/index.ts',
  'src/main.ts',
  'src/App.tsx',
  'app/page.tsx',
  'pages/index.tsx',
  'main.py',
  'app.py',
  'src/main.rs',
  'cmd/main.go',
  'index.html',
  'package.json'
];
for (const ce of candidateEntries) {
  if (fs.existsSync(path.join(targetDir, ce))) result.entryPoints.push(ce);
}

// 5. README.md snippet
const readmeCandidates = ['README.md', 'readme.md', 'README'];
for (const r of readmeCandidates) {
  const rPath = path.join(targetDir, r);
  if (fs.existsSync(rPath)) {
    try {
      result.readmeSnippet = fs.readFileSync(rPath, 'utf8').substring(0, 400).trim();
      break;
    } catch (e) {}
  }
}

// 6. Directory tree
result.directoryStructure = buildTree(targetDir, 1);

console.log(JSON.stringify(result));
`;

    // Encode script in Base64 for safe execution via node -e
    const b64Script = Buffer.from(analyzerScript, 'utf8').toString('base64');
    const safeTarget = cwd.replace(/["';`$]/g, '');
    const cmd = `node -e "eval(Buffer.from('${b64Script}', 'base64').toString('utf8'))" "${safeTarget}" "${maxDepth}"`;

    const res = await runShellCommand({
      command: cmd,
      cwd,
      shell: 'powershell',
    });

    if (!res.success) {
      return {
        success: false,
        error: `Codebase analysis failed: ${res.stderr || res.error}`,
      };
    }

    try {
      const data = JSON.parse(res.stdout.trim());
      const summaryText = `Project: ${data.projectName} | Stack: ${data.detectedStack.join(', ') || 'General'} | Entry Points: ${data.entryPoints.join(', ') || 'N/A'}`;
      return {
        success: true,
        output: {
          projectName: data.projectName,
          detectedStack: data.detectedStack,
          entryPoints: data.entryPoints,
          scripts: data.scripts,
          directoryStructure: data.directoryStructure,
          readmeSnippet: data.readmeSnippet,
          summary: summaryText,
        },
        message: `[Codebase Summary] ${summaryText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to parse codebase analysis output: ${err.message}`,
        diagnostics: res.stdout,
      };
    }
  },
});

// =========================================================================
// 6. developerTool (Unified Developer & Git Facade Hub)
// =========================================================================
export const developerTool = createTool({
  name: 'developer_tool',
  description:
    'Unified developer, Git, and codebase intelligence hub. Inspect Git status, review diffs, commit changes safely, manage branches, or automatically analyze codebase architectures and tech stacks.',
  category: 'code',
  permissionLevel: 1,
  riskLevel: 'LOW',
  schema: z.object({
    action: z
      .enum(['status', 'diff', 'commit', 'branch', 'analyze_codebase'])
      .describe(
        'Developer operation: "status" (check git repo state), "diff" (view file differences), "commit" (stage and commit changes locally), "branch" (list/create/switch/delete git branches), or "analyze_codebase" (explore repo architecture and tech stack).'
      ),
    repoPath: z.string().optional().describe('مسار مجلد المشروع (اختياري - افتراضياً مجلد العمل الحالي)'),
    // diff params
    filePath: z.string().optional().describe('فحص ملف محدد فقط (اختياري للـ diff)'),
    staged: z.boolean().optional().describe('فحص التغييرات الجاهزة للـ commit (--cached) في الـ diff'),
    maxLines: z.number().int().min(10).max(2000).optional().describe('أقصى عدد أسطر للـ diff (افتراضياً 300)'),
    // commit params
    message: z.string().optional().describe('رسالة الـ Commit (مطلوبة عند action="commit")'),
    files: z.array(z.string()).optional().describe('قائمة الملفات لعمل stage لها (افتراضياً ["."])'),
    createNewBranch: z.string().optional().describe('اسم فرع جديد إذا كنت ترغب في عمل الـ commit على branch منفصل'),
    // branch params
    branchAction: z.enum(['list', 'create', 'switch', 'delete']).optional().describe('نوع إجراء الفروع عند action="branch"'),
    branchName: z.string().optional().describe('اسم الفرع عند إنشاء أو تنقل أو حذف الفرع'),
    // analyze_codebase params
    maxDepth: z.number().int().min(1).max(5).optional().describe('أقصى عمق لشجرة المجلدات عند تحليل المشروع (افتراضياً 3)'),
  }),
  paramDescriptions: {
    action: {
      type: 'string',
      description:
        'Developer operation: "status" (inspect git state), "diff" (view modifications), "commit" (save local commit), "branch" (manage branches), or "analyze_codebase" (tech stack & tree).',
      enum: ['status', 'diff', 'commit', 'branch', 'analyze_codebase'],
    },
    repoPath: {
      type: 'string',
      description: 'Optional path to the repository/project folder.',
    },
    filePath: {
      type: 'string',
      description: 'Optional file path for diff action.',
    },
    staged: {
      type: 'boolean',
      description: 'Check staged changes (--cached) when running diff.',
    },
    maxLines: {
      type: 'integer',
      description: 'Max lines for diff output.',
    },
    message: {
      type: 'string',
      description: 'Commit message (required for action="commit").',
    },
    files: {
      type: 'array',
      description: 'List of files to stage for commit (defaults to ["."]).',
    },
    createNewBranch: {
      type: 'string',
      description: 'Optional new branch name to create before committing.',
    },
    branchAction: {
      type: 'string',
      description: 'Action for branch management: "list", "create", "switch", or "delete".',
      enum: ['list', 'create', 'switch', 'delete'],
    },
    branchName: {
      type: 'string',
      description: 'Branch name for create, switch, or delete branch actions.',
    },
    maxDepth: {
      type: 'integer',
      description: 'Max folder depth for codebase analysis (default 3).',
    },
  },
  async execute(input): Promise<ToolExecutionResult<any>> {
    switch (input.action) {
      case 'status':
        return await gitStatusTool.execute({
          repoPath: input.repoPath,
        });

      case 'diff':
        return await gitDiffTool.execute({
          repoPath: input.repoPath,
          filePath: input.filePath,
          staged: input.staged,
          maxLines: input.maxLines,
        });

      case 'commit':
        if (!input.message) {
          return { success: false, error: 'message is required for commit action.' };
        }
        return await gitCommitTool.execute({
          repoPath: input.repoPath,
          message: input.message,
          files: input.files,
          createNewBranch: input.createNewBranch,
        });

      case 'branch':
        return await gitBranchTool.execute({
          repoPath: input.repoPath,
          action: input.branchAction || 'list',
          branchName: input.branchName,
        });

      case 'analyze_codebase':
        return await codebaseSummaryTool.execute({
          repoPath: input.repoPath,
          maxDepth: input.maxDepth,
        });

      default:
        return { success: false, error: `Unknown developer action: ${(input as any).action}` };
    }
  },
});
