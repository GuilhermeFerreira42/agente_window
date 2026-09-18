import fs from 'node:fs';
import * as pty from 'node-pty';
import { resolveShell } from './shellDetector.js';
const OUTPUT_BUFFER_LIMIT = 1024 * 1024;
export class PtyManager {
    sessions = new Map();
    dataListeners = new Set();
    exitListeners = new Set();
    idleTimeoutMs;
    constructor(idleTimeoutMs = Number(process.env.PTY_IDLE_TIMEOUT_MS) || 30 * 60 * 1000) {
        this.idleTimeoutMs = idleTimeoutMs;
    }
    onData(listener) {
        this.dataListeners.add(listener);
        return () => this.dataListeners.delete(listener);
    }
    onExit(listener) {
        this.exitListeners.add(listener);
        return () => this.exitListeners.delete(listener);
    }
    async openSession(options) {
        const { sessionId, cols = 80, rows = 24, shellId, cwd } = options;
        const existing = this.sessions.get(sessionId);
        if (existing) {
            this.resetIdleTimer(existing);
            try {
                existing.ptyProcess.resize(cols, rows);
            }
            catch {
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
            const err = new Error('Nenhum shell encontrado. Windows: pwsh.exe, powershell.exe e cmd.exe não localizados. Linux: /bin/bash e /bin/sh não encontrados.');
            err.code = 'SHELL_NOT_FOUND';
            throw err;
        }
        const { profile, allProfiles } = resolved;
        let workingDir = cwd || process.env.USERPROFILE || process.env.HOME || process.cwd();
        if (workingDir && workingDir.startsWith('file://')) {
            workingDir = workingDir.replace(/^file:\/\//, '');
            if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(workingDir)) {
                workingDir = workingDir.slice(1);
            }
        }
        try {
            if (!workingDir || !fs.existsSync(workingDir)) {
                workingDir = process.env.USERPROFILE || process.env.HOME || process.cwd();
            }
        }
        catch {
            workingDir = process.env.USERPROFILE || process.env.HOME || process.cwd();
        }
        const ptyProcess = pty.spawn(profile.path, [], {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: workingDir,
            env: process.env,
        });
        const session = {
            sessionId,
            ptyProcess,
            profile,
            availableProfiles: allProfiles,
            outputBuffer: '',
        };
        this.resetIdleTimer(session);
        ptyProcess.onData((data) => {
            session.outputBuffer += data;
            if (session.outputBuffer.length > OUTPUT_BUFFER_LIMIT) {
                session.outputBuffer = session.outputBuffer.slice(-OUTPUT_BUFFER_LIMIT);
            }
            for (const listener of this.dataListeners) {
                try {
                    listener(sessionId, data);
                }
                catch (error) {
                    console.error('[ptyManager] Data listener error:', error);
                }
            }
        });
        ptyProcess.onExit((event) => {
            this.clearIdleTimer(session);
            this.sessions.delete(sessionId);
            for (const listener of this.exitListeners) {
                try {
                    listener(sessionId, event.exitCode);
                }
                catch (error) {
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
    writeInput(sessionId, data) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        this.resetIdleTimer(session);
        session.ptyProcess.write(data);
        return true;
    }
    resize(sessionId, cols, rows) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        session.ptyProcess.resize(cols, rows);
        return true;
    }
    closeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        this.clearIdleTimer(session);
        this.sessions.delete(sessionId);
        try {
            if (process.platform === 'win32') {
                session.ptyProcess.kill();
            }
            else {
                session.ptyProcess.kill('SIGTERM');
                const pid = session.ptyProcess.pid;
                const killTimer = setTimeout(() => {
                    try {
                        process.kill(pid, 0);
                        session.ptyProcess.kill('SIGKILL');
                    }
                    catch {
                        // Process already ended.
                    }
                }, 3000);
                if (typeof killTimer.unref === 'function') {
                    killTimer.unref();
                }
            }
        }
        catch {
            // Ignore kill errors.
        }
        return true;
    }
    closeAllSessions() {
        for (const sessionId of Array.from(this.sessions.keys())) {
            this.closeSession(sessionId);
        }
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    resetIdleTimer(session) {
        this.clearIdleTimer(session);
        session.idleTimer = setTimeout(() => {
            console.log(`[ptyManager] Session ${session.sessionId} idle timeout (${this.idleTimeoutMs}ms). Terminating.`);
            this.closeSession(session.sessionId);
        }, this.idleTimeoutMs);
        if (typeof session.idleTimer.unref === 'function') {
            session.idleTimer.unref();
        }
    }
    clearIdleTimer(session) {
        if (session.idleTimer) {
            clearTimeout(session.idleTimer);
            session.idleTimer = undefined;
        }
    }
}
//# sourceMappingURL=ptyManager.js.map