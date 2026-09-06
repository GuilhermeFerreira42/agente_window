import * as pty from 'node-pty';
import { resolveShell } from './shellDetector.js';
import type { ShellProfile } from './types.js';

export interface PtySession {
  sessionId: string;
  ptyProcess: pty.IPty;
  profile: ShellProfile;
  availableProfiles: ShellProfile[];
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
  }): Promise<{ pid: number; shell: string; shellPath: string; availableProfiles: ShellProfile[] }> {
    const { sessionId, cols = 80, rows = 24, shellId, cwd } = options;

    // If session already exists, close it first
    if (this.sessions.has(sessionId)) {
      this.closeSession(sessionId);
    }

    const resolved = await resolveShell(shellId);
    if (!resolved) {
      const err = new Error(
        'Nenhum shell encontrado. Windows: pwsh.exe, powershell.exe e cmd.exe não localizados. Linux: /bin/bash e /bin/sh não encontrados.'
      );
      (err as any).code = 'SHELL_NOT_FOUND';
      throw err;
    }

    const { profile, allProfiles } = resolved;
    const workingDir = cwd || process.env.USERPROFILE || process.env.HOME || process.cwd();

    const ptyProcess = pty.spawn(profile.path, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: workingDir,
      env: process.env as Record<string, string>
    });

    const session: PtySession = {
      sessionId,
      ptyProcess,
      profile,
      availableProfiles: allProfiles
    };

    this.resetIdleTimer(session);

    ptyProcess.onData((data: string) => {
      for (const listener of this.dataListeners) {
        try {
          listener(sessionId, data);
        } catch (e) {
          console.error('[ptyManager] Data listener error:', e);
        }
      }
    });

    ptyProcess.onExit((e: { exitCode: number }) => {
      this.clearIdleTimer(session);
      this.sessions.delete(sessionId);
      for (const listener of this.exitListeners) {
        try {
          listener(sessionId, e.exitCode);
        } catch (err) {
          console.error('[ptyManager] Exit listener error:', err);
        }
      }
    });

    this.sessions.set(sessionId, session);

    return {
      pid: ptyProcess.pid,
      shell: profile.id,
      shellPath: profile.path,
      availableProfiles: allProfiles
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
          // If still running after 3s, send SIGKILL
          process.kill(pid, 0); // test if alive
          session.ptyProcess.kill('SIGKILL');
        } catch {
          // Process already ended
        }
      }, 3000);
    } catch {
      // Ignore kill errors
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
      for (const listener of this.exitListeners) {
        listener(session.sessionId, -1);
      }
    }, this.idleTimeoutMs);
  }

  private clearIdleTimer(session: PtySession): void {
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
      session.idleTimer = undefined;
    }
  }
}
