import * as pty from 'node-pty';
import { resolveShell } from './shellDetector.js';
import type { ShellProfile } from './types.js';

const OUTPUT_BUFFER_LIMIT = 1024 * 1024;

export interface PtySession {
  sessionId: string;
  ptyProcess: pty.IPty;
  profile: ShellProfile;
  availableProfiles: ShellProfile[];
  outputBuffer: string;
  idleTimer?: NodeJS.Timeout;
}

export type DataListener = (sessionId: string, data: string) => void;
export type ExitListener = (sessionId: string, code: number) => void;

export class PtyManager {
  private sessions = new Map<string, PtySession>();
  private dataListeners = new Set<DataListener>();
  private exitListeners = new Set<ExitListener>();
  private idleTimeoutMs: number;

  constructor(idleTimeoutMs = Number(process.env.PTY_IDLE_TIMEOUT_MS) || 30 * 60 * 1000) {
    this.idleTimeoutMs = idleTimeoutMs;
  }

  onData(listener: DataListener): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onExit(listener: ExitListener): () => void {
    this.exitListeners.add(listener);
    return () => this.exitListeners.delete(listener);
  }

  async openSession(options: {
    sessionId: string;
    cols?: number;
    rows?: number;
    shellId?: string;
    cwd?: string;
  }): Promise<{ pid: number; shell: string; shellPath: string; availableProfiles: ShellProfile[]; scrollback: string }> {
    const { sessionId, cols = 80, rows = 24, shellId, cwd } = options;

    const existing = this.sessions.get(sessionId);
    if (existing) {
      this.resetIdleTimer(existing);
      try {
        existing.ptyProcess.resize(cols, rows);
      } catch {
        // Ignore resize failures on reconnect.
      }
      return {
        pid: existing.ptyProcess.pid,
        shell: existing.profile.id,
        shellPath: existing.profile.path,
        availableProfiles: existing.availableProfiles,
        scrollback: existing.outputBuffer,
      };
    }

    const resolved = await resolveShell(shellId);
    if (!resolved) {
      const err = new Error(
        'Nenhum shell encontrado. Windows: pwsh.exe, powershell.exe e cmd.exe não localizados. Linux: /bin/bash e /bin/sh não encontrados.'
      );
      (err as Error & { code?: string }).code = 'SHELL_NOT_FOUND';
      throw err;
    }

    const { profile, allProfiles } = resolved;
    const workingDir = cwd || process.env.USERPROFILE || process.env.HOME || process.cwd();

    const ptyProcess = pty.spawn(profile.path, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: workingDir,
      env: process.env as Record<string, string>,
    });

    const session: PtySession = {
      sessionId,
      ptyProcess,
      profile,
      availableProfiles: allProfiles,
      outputBuffer: '',
    };

    this.resetIdleTimer(session);

    ptyProcess.onData((data: string) => {
      session.outputBuffer += data;
      if (session.outputBuffer.length > OUTPUT_BUFFER_LIMIT) {
        session.outputBuffer = session.outputBuffer.slice(-OUTPUT_BUFFER_LIMIT);
      }

      for (const listener of this.dataListeners) {
        try {
          listener(sessionId, data);
        } catch (error) {
          console.error('[ptyManager] Data listener error:', error);
        }
      }
    });

    ptyProcess.onExit((event: { exitCode: number }) => {
      this.clearIdleTimer(session);
      this.sessions.delete(sessionId);
      for (const listener of this.exitListeners) {
        try {
          listener(sessionId, event.exitCode);
        } catch (error) {
          console.error('[ptyManager] Exit listener error:', error);
        }
      }
    });

    this.sessions.set(sessionId, session);

    return {
      pid: ptyProcess.pid,
      shell: profile.id,
      shellPath: profile.path,
      availableProfiles: allProfiles,
      scrollback: session.outputBuffer,
    };
  }

  writeInput(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.resetIdleTimer(session);
    session.ptyProcess.write(data);
    return true;
  }

  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.ptyProcess.resize(cols, rows);
    return true;
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    this.clearIdleTimer(session);
    this.sessions.delete(sessionId);

    try {
      session.ptyProcess.kill('SIGTERM');
      const pid = session.ptyProcess.pid;
      setTimeout(() => {
        try {
          process.kill(pid, 0);
          session.ptyProcess.kill('SIGKILL');
        } catch {
          // Process already ended.
        }
      }, 3000);
    } catch {
      // Ignore kill errors.
    }

    return true;
  }

  closeAllSessions(): void {
    for (const sessionId of Array.from(this.sessions.keys())) {
      this.closeSession(sessionId);
    }
  }

  getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }

  private resetIdleTimer(session: PtySession): void {
    this.clearIdleTimer(session);
    session.idleTimer = setTimeout(() => {
      console.log(`[ptyManager] Session ${session.sessionId} idle timeout (${this.idleTimeoutMs}ms). Terminating.`);
      this.closeSession(session.sessionId);
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer(session: PtySession): void {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
      session.idleTimer = undefined;
    }
  }
}
