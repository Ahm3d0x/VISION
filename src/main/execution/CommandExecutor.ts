import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// =========================================================================
// ERROR CLASSIFICATION TYPES
// =========================================================================

export type CommandErrorType = 
  | 'SHELL_NOT_FOUND'
  | 'WORKING_DIRECTORY_NOT_FOUND'
  | 'COMMAND_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'TIMEOUT'
  | 'COMMAND_FAILED'
  | 'INVALID_ARGUMENT'
  | 'UNKNOWN_ERROR';

export interface CommandExecutionOptions {
  command: string;
  cwd?: string;
  shell?: 'powershell' | 'cmd' | 'pwsh' | 'bash' | 'auto';
  timeout?: number;
  env?: Record<string, string>;
}

export interface CommandExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  shellUsed: string;
  cwdUsed: string;
  errorType?: CommandErrorType;
  error?: string;
  diagnostics?: string;
}

// =========================================================================
// CommandExecutor CLASS
// =========================================================================

export class CommandExecutor {
  private defaultTimeoutMs: number = 35000;

  /**
   * Resolve and validate the best shell binary for the current system.
   */
  public resolveShell(preferred: 'powershell' | 'cmd' | 'pwsh' | 'bash' | 'auto' = 'auto'): {
    path: string;
    type: 'powershell' | 'cmd' | 'pwsh' | 'bash';
    args: (cmd: string) => string[];
  } {
    const winDir = process.env.WINDIR || process.env.SystemRoot || 'C:\\Windows';
    
    const candidates = {
      pwsh: [
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell\\7\\pwsh.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PowerShell\\7\\pwsh.exe'),
      ],
      powershell: [
        path.join(winDir, 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'),
        path.join(winDir, 'SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe'),
      ],
      cmd: [
        process.env.ComSpec || path.join(winDir, 'System32\\cmd.exe'),
        path.join(winDir, 'SysWOW64\\cmd.exe'),
      ],
      bash: [
        'C:\\Program Files\\Git\\bin\\bash.exe',
        'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
      ]
    };

    // 1. Explicit PowerShell request
    if (preferred === 'powershell') {
      for (const p of candidates.powershell) {
        if (fs.existsSync(p)) {
          return {
            path: p,
            type: 'powershell',
            args: (c: string) => ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', c],
          };
        }
      }
    }

    // 2. Explicit CMD request
    if (preferred === 'cmd') {
      for (const p of candidates.cmd) {
        if (fs.existsSync(p)) {
          return {
            path: p,
            type: 'cmd',
            args: (c: string) => ['/d', '/c', c],
          };
        }
      }
    }

    // 3. Explicit PWSH (PowerShell Core 7)
    if (preferred === 'pwsh') {
      for (const p of candidates.pwsh) {
        if (fs.existsSync(p)) {
          return {
            path: p,
            type: 'pwsh',
            args: (c: string) => ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', c],
          };
        }
      }
    }

    // 4. Auto: Modern Windows defaults to PowerShell for superior scripting & pipes
    for (const p of candidates.powershell) {
      if (fs.existsSync(p)) {
        return {
          path: p,
          type: 'powershell',
          args: (c: string) => ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', c],
        };
      }
    }

    // Fallback to CMD if PowerShell not found
    for (const p of candidates.cmd) {
      if (fs.existsSync(p)) {
        return {
          path: p,
          type: 'cmd',
          args: (c: string) => ['/d', '/c', c],
        };
      }
    }

    // Ultimate fallback (ComSpec or cmd)
    const fallbackPath = process.env.ComSpec || 'cmd.exe';
    return {
      path: fallbackPath,
      type: 'cmd',
      args: (c: string) => ['/d', '/c', c],
    };
  }

  /**
   * Safely resolves, normalizes, and expands working directory.
   * If directory does not exist, safely falls back to project root instead of throwing ENOENT.
   */
  public resolveWorkingDirectory(rawCwd?: string): { resolvedCwd: string; wasFallback: boolean; original: string } {
    const projectRoot = process.cwd();
    if (!rawCwd || typeof rawCwd !== 'string') {
      return { resolvedCwd: projectRoot, wasFallback: false, original: '' };
    }

    let target = rawCwd.trim();

    // Handle common %CD% literal unexpanded variable from Windows CMD prompts
    if (target === '%CD%' || target === '%cd%' || target === '.') {
      return { resolvedCwd: projectRoot, wasFallback: false, original: target };
    }

    // Expand standard Windows environment variables in path (e.g. %USERPROFILE%, %TEMP%, %WINDIR%)
    target = target.replace(/%([^%]+)%/g, (_, varName) => {
      return process.env[varName] || `%${varName}%`;
    });

    // Auto-correct hallucinated C:\Users\Ahmed to actual process.env.USERPROFILE
    if (process.env.USERPROFILE) {
      target = target.replace(/C:[\\/]Users[\\/]Ahmed(?=[\\/]|$|['"]|\s)/gi, process.env.USERPROFILE);
    }

    // Resolve relative path against project root
    let resolved = path.isAbsolute(target) ? path.normalize(target) : path.resolve(projectRoot, target);

    // Verify directory exists
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
        return { resolvedCwd: resolved, wasFallback: false, original: rawCwd };
      }
    } catch {
      // stat failure
    }

    // Fallback safely to project root if directory was not found
    console.warn(`[CommandExecutor] Target CWD "${rawCwd}" does not exist. Falling back to "${projectRoot}".`);
    return { resolvedCwd: projectRoot, wasFallback: true, original: rawCwd };
  }

  /**
   * Classify command failure into structured categories.
   */
  private classifyError(
    err: any,
    exitCode: number,
    stderr: string,
    shellPath: string
  ): { errorType: CommandErrorType; message: string } {
    const errStr = (stderr + ' ' + (err?.message || '')).toLowerCase();

    // 1. Shell binary itself missing (spawn ENOENT on shell path)
    if (err?.code === 'ENOENT' && err?.path === shellPath) {
      return {
        errorType: 'SHELL_NOT_FOUND',
        message: `The configured Windows shell executable (${shellPath}) was not found on this system.`,
      };
    }

    // 2. Timeout
    if (err?.killed || errStr.includes('timed out') || err?.code === 'ETIMEDOUT') {
      return {
        errorType: 'TIMEOUT',
        message: 'The command timed out before completing.',
      };
    }

    // 3. Permission denied (EPERM / EACCES)
    if (err?.code === 'EACCES' || err?.code === 'EPERM' || errStr.includes('access is denied') || errStr.includes('permission denied')) {
      return {
        errorType: 'PERMISSION_DENIED',
        message: 'Access denied: The command requires elevated/administrator permissions or file access is locked.',
      };
    }

    // 4. Command/Tool not found inside the shell
    if (
      exitCode === 127 ||
      exitCode === 9009 ||
      errStr.includes('not recognized as an internal or external command') ||
      errStr.includes('is not recognized as the name of a cmdlet') ||
      errStr.includes('command not found')
    ) {
      return {
        errorType: 'COMMAND_NOT_FOUND',
        message: 'The requested command, executable, or utility was not found in PATH or environment.',
      };
    }

    // 5. Standard command failure
    if (exitCode !== 0) {
      return {
        errorType: 'COMMAND_FAILED',
        message: `Command exited with non-zero status code ${exitCode}.`,
      };
    }

    return {
      errorType: 'UNKNOWN_ERROR',
      message: err?.message || 'An unknown execution error occurred.',
    };
  }

  /**
   * Normalizes command string:
   * 1. Expands Windows %VARIABLES% to prevent PowerShell / CMD interpretation issues.
   * 2. Auto-corrects C:\Users\Ahmed to actual process.env.USERPROFILE.
   * 3. Redirects GUI-blocking VBScript utilities (like slmgr) to headless cscript so they write directly to stdout without hanging on modal GUI popups.
   */
  public normalizeCommand(command: string): string {
    let normalized = command.trim();

    // 1. Expand %VAR% environment variables
    normalized = normalized.replace(/%([^%]+)%/g, (_, varName) => {
      return process.env[varName] || `%${varName}%`;
    });

    // 2. Auto-correct hallucinated C:\Users\Ahmed to actual process.env.USERPROFILE
    if (process.env.USERPROFILE) {
      normalized = normalized.replace(/C:[\\/]Users[\\/]Ahmed(?=[\\/]|$|['"]|\s)/gi, process.env.USERPROFILE);
    }

    // 3. Auto-redirect GUI-blocking VBScript utilities (like slmgr) to headless cscript
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    normalized = normalized.replace(/\bslmgr(\.vbs)?\b/gi, `cscript.exe //nologo "${systemRoot}\\System32\\slmgr.vbs"`);

    return normalized;
  }

  /**
   * Execute command safely with clean process spawning and structured output.
   */
  public async execute(options: CommandExecutionOptions): Promise<CommandExecutionResult> {
    const { command, cwd, shell: preferredShell = 'auto', timeout = this.defaultTimeoutMs, env = {} } = options;

    if (!command || !command.trim()) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Command string is empty.',
        shellUsed: 'none',
        cwdUsed: process.cwd(),
        errorType: 'INVALID_ARGUMENT',
        error: 'Command string is empty.',
      };
    }

    const { resolvedCwd, wasFallback, original: originalCwd } = this.resolveWorkingDirectory(cwd);
    const resolvedShell = this.resolveShell(preferredShell);

    // Verify shell binary actually exists
    if (!fs.existsSync(resolvedShell.path)) {
      return {
        success: false,
        exitCode: 127,
        stdout: '',
        stderr: `Configured shell binary not found: ${resolvedShell.path}`,
        shellUsed: resolvedShell.path,
        cwdUsed: resolvedCwd,
        errorType: 'SHELL_NOT_FOUND',
        error: `Configured shell binary not found: ${resolvedShell.path}`,
        diagnostics: `Shell binary path "${resolvedShell.path}" does not exist on this machine.`,
      };
    }

    const normalizedCommand = this.normalizeCommand(command);

    const args = resolvedShell.args(normalizedCommand);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      // Merge environment with UTF-8 flags
      const mergedEnv = {
        ...process.env,
        ...env,
        PYTHONIOENCODING: 'utf-8',
        LANG: 'en_US.UTF-8',
      };

      let child: any = null;

      try {
        child = spawn(resolvedShell.path, args, {
          cwd: resolvedCwd,
          env: mergedEnv,
          windowsHide: true,
        });
      } catch (err: any) {
        const classified = this.classifyError(err, 1, err.message, resolvedShell.path);
        resolve({
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: err.message,
          shellUsed: resolvedShell.path,
          cwdUsed: resolvedCwd,
          errorType: classified.errorType,
          error: classified.message,
          diagnostics: `Failed to spawn process: ${err.message}`,
        });
        return;
      }

      const timer = setTimeout(() => {
        isTimedOut = true;
        try {
          child.kill('SIGTERM');
        } catch {
          // ignore kill failure
        }
      }, timeout);

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf-8');
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf-8');
      });

      child.on('error', (err: any) => {
        clearTimeout(timer);
        const classified = this.classifyError(err, 1, stderr, resolvedShell.path);
        resolve({
          success: false,
          exitCode: 1,
          stdout: stdout.trim(),
          stderr: stderr.trim() || err.message,
          shellUsed: `${resolvedShell.type} (${resolvedShell.path})`,
          cwdUsed: resolvedCwd,
          errorType: classified.errorType,
          error: classified.message,
          diagnostics: wasFallback ? `Notice: Working directory fell back from non-existent "${originalCwd}" to "${resolvedCwd}".` : undefined,
        });
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);
        const exitCode = code ?? (isTimedOut ? 124 : 0);
        const cleanStdout = stdout.trim();
        const cleanStderr = stderr.trim();
        const isSuccess = exitCode === 0 && !isTimedOut;

        let errorType: CommandErrorType | undefined = undefined;
        let errorMessage: string | undefined = undefined;

        if (!isSuccess) {
          const classified = this.classifyError(
            isTimedOut ? { killed: true } : null,
            exitCode,
            cleanStderr,
            resolvedShell.path
          );
          errorType = classified.errorType;
          errorMessage = cleanStderr || classified.message;
        }

        resolve({
          success: isSuccess,
          exitCode,
          stdout: cleanStdout,
          stderr: cleanStderr,
          shellUsed: `${resolvedShell.type} (${resolvedShell.path})`,
          cwdUsed: resolvedCwd,
          errorType,
          error: isSuccess ? undefined : errorMessage,
          diagnostics: wasFallback
            ? `Notice: Working directory "${originalCwd}" did not exist on disk; automatically fell back to project directory "${resolvedCwd}".`
            : undefined,
        });
      });
    });
  }

  /**
   * Execute a command with elevated (Administrator) privileges using PowerShell Start-Process -Verb RunAs.
   * This triggers a UAC prompt, then runs the command in an elevated PowerShell process.
   * Output is captured via temporary files since elevated processes can't pipe stdout back directly.
   */
  public async executeElevated(options: CommandExecutionOptions): Promise<CommandExecutionResult> {
    const { command, cwd, timeout = 60000 } = options;
    const os = await import('os');

    if (!command || !command.trim()) {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Command string is empty.',
        shellUsed: 'elevated-powershell',
        cwdUsed: process.cwd(),
        errorType: 'INVALID_ARGUMENT',
        error: 'Command string is empty.',
      };
    }

    const { resolvedCwd, wasFallback, original: originalCwd } = this.resolveWorkingDirectory(cwd);

    // Create temp files for capturing output and the runner scripts
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const stdoutFile = path.join(tempDir, `vision_elevated_stdout_${timestamp}.txt`);
    const stderrFile = path.join(tempDir, `vision_elevated_stderr_${timestamp}.txt`);
    const exitCodeFile = path.join(tempDir, `vision_elevated_exit_${timestamp}.txt`);
    const scriptFile = path.join(tempDir, `vision_elevated_script_${timestamp}.ps1`);
    const batchFile = path.join(tempDir, `vision_elevated_cmd_${timestamp}.bat`);

    const normalizedCommand = this.normalizeCommand(command);
    const isPowerShell = options.shell === 'powershell' || /^(Get-|Set-|Start-|Stop-|New-|Remove-|Invoke-|\$|Test-|Clear-|Enable-|Disable-)/i.test(normalizedCommand);

    let scriptContent: string;
    if (isPowerShell) {
      scriptContent = [
        `$ErrorActionPreference = 'Continue'`,
        `Set-Location -Path '${resolvedCwd.replace(/'/g, "''")}'`,
        `try {`,
        `  $output = & {`,
        normalizedCommand,
        `  } 2>&1`,
        `  $output | Out-File -FilePath '${stdoutFile.replace(/'/g, "''")}' -Encoding utf8`,
        `  $code = if ($LASTEXITCODE -ne $null) { $LASTEXITCODE } else { 0 }`,
        `  $code | Out-File -FilePath '${exitCodeFile.replace(/'/g, "''")}' -Encoding utf8`,
        `} catch {`,
        `  $_.Exception.Message | Out-File -FilePath '${stderrFile.replace(/'/g, "''")}' -Encoding utf8`,
        `  1 | Out-File -FilePath '${exitCodeFile.replace(/'/g, "''")}' -Encoding utf8`,
        `}`,
      ].join('\r\n');
      fs.writeFileSync(scriptFile, scriptContent, 'utf-8');
    } else {
      // CMD: write exact command to a temporary .bat file to eliminate quoting and escaping problems
      fs.writeFileSync(batchFile, `@echo off\r\ncd /d "${resolvedCwd}"\r\n${normalizedCommand}\r\n`, 'utf-8');
      scriptContent = [
        `$ErrorActionPreference = 'Continue'`,
        `Set-Location -Path '${resolvedCwd.replace(/'/g, "''")}'`,
        `try {`,
        `  $output = & cmd.exe /c '${batchFile.replace(/'/g, "''")}' 2>&1`,
        `  $output | Out-File -FilePath '${stdoutFile.replace(/'/g, "''")}' -Encoding utf8`,
        `  $code = if ($LASTEXITCODE -ne $null) { $LASTEXITCODE } else { 0 }`,
        `  $code | Out-File -FilePath '${exitCodeFile.replace(/'/g, "''")}' -Encoding utf8`,
        `} catch {`,
        `  $_.Exception.Message | Out-File -FilePath '${stderrFile.replace(/'/g, "''")}' -Encoding utf8`,
        `  1 | Out-File -FilePath '${exitCodeFile.replace(/'/g, "''")}' -Encoding utf8`,
        `}`,
      ].join('\r\n');
      fs.writeFileSync(scriptFile, scriptContent, 'utf-8');
    }

    // Use Start-Process -Verb RunAs to trigger UAC elevation
    const launchCommand = `Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${scriptFile.replace(/'/g, "''")}' -Verb RunAs -Wait -WindowStyle Hidden`;

    const resolvedShell = this.resolveShell('powershell');

    return new Promise((resolve) => {
      let isTimedOut = false;

      const cleanup = () => {
        try { if (fs.existsSync(scriptFile)) fs.unlinkSync(scriptFile); } catch {}
        try { if (fs.existsSync(batchFile)) fs.unlinkSync(batchFile); } catch {}
        try { if (fs.existsSync(stdoutFile)) fs.unlinkSync(stdoutFile); } catch {}
        try { if (fs.existsSync(stderrFile)) fs.unlinkSync(stderrFile); } catch {}
        try { if (fs.existsSync(exitCodeFile)) fs.unlinkSync(exitCodeFile); } catch {}
      };

      let child: any = null;

      try {
        child = spawn(resolvedShell.path, resolvedShell.args(launchCommand), {
          cwd: resolvedCwd,
          env: { ...process.env },
          windowsHide: true,
        });
      } catch (err: any) {
        cleanup();
        return resolve({
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: err.message,
          shellUsed: 'elevated-powershell',
          cwdUsed: resolvedCwd,
          errorType: 'UNKNOWN_ERROR',
          error: `Failed to spawn elevated process: ${err.message}`,
        });
      }

      const timer = setTimeout(() => {
        isTimedOut = true;
        try { child.kill('SIGTERM'); } catch {}
      }, timeout);

      let spawnStderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        spawnStderr += chunk.toString('utf-8');
      });

      child.on('error', (err: any) => {
        clearTimeout(timer);
        cleanup();
        resolve({
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: err.message,
          shellUsed: 'elevated-powershell',
          cwdUsed: resolvedCwd,
          errorType: 'PERMISSION_DENIED',
          error: 'UAC elevation was denied or failed. The user may have cancelled the UAC prompt.',
        });
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timer);

        if (isTimedOut) {
          cleanup();
          return resolve({
            success: false,
            exitCode: 124,
            stdout: '',
            stderr: 'Elevated command timed out.',
            shellUsed: 'elevated-powershell',
            cwdUsed: resolvedCwd,
            errorType: 'TIMEOUT',
            error: 'The elevated command timed out before completing.',
          });
        }

        // Read output from temp files
        let stdout = '';
        let stderr = '';
        let exitCode = code ?? 0;

        try { if (fs.existsSync(stdoutFile)) stdout = fs.readFileSync(stdoutFile, 'utf-8').trim(); } catch {}
        try { if (fs.existsSync(stderrFile)) stderr = fs.readFileSync(stderrFile, 'utf-8').trim(); } catch {}
        try {
          if (fs.existsSync(exitCodeFile)) {
            const raw = fs.readFileSync(exitCodeFile, 'utf-8').trim();
            const parsed = parseInt(raw, 10);
            if (!isNaN(parsed)) exitCode = parsed;
          }
        } catch {}

        // If Start-Process itself failed (e.g. UAC cancelled), check spawnStderr
        if (!stdout && !stderr && spawnStderr) {
          stderr = spawnStderr.trim();
        }

        const isSuccess = exitCode === 0;

        cleanup();

        resolve({
          success: isSuccess,
          exitCode,
          stdout,
          stderr,
          shellUsed: 'elevated-powershell (RunAs Admin)',
          cwdUsed: resolvedCwd,
          errorType: isSuccess ? undefined : 'COMMAND_FAILED',
          error: isSuccess ? undefined : (stderr || `Elevated command failed with exit code ${exitCode}`),
          diagnostics: wasFallback
            ? `Notice: Working directory "${originalCwd}" did not exist; fell back to "${resolvedCwd}".`
            : undefined,
        });
      });
    });
  }
}

export const commandExecutor = new CommandExecutor();

