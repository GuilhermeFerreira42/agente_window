import * as pty from 'node-pty';
import type { ShellProfile } from './types.js';
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
export declare class PtyManager {
    private sessions;
    private dataListeners;
    private exitListeners;
    private idleTimeoutMs;
    constructor(idleTimeoutMs?: number);
    onData(listener: DataListener): () => void;
    onExit(listener: ExitListener): () => void;
    openSession(options: {
        sessionId: string;
        cols?: number;
        rows?: number;
        shellId?: string;
        cwd?: string;
    }): Promise<{
        pid: number;
        shell: string;
        shellPath: string;
        availableProfiles: ShellProfile[];
        scrollback: string;
    }>;
    writeInput(sessionId: string, data: string): boolean;
    resize(sessionId: string, cols: number, rows: number): boolean;
    closeSession(sessionId: string): boolean;
    closeAllSessions(): void;
    getSession(sessionId: string): PtySession | undefined;
    private resetIdleTimer;
    private clearIdleTimer;
}
//# sourceMappingURL=ptyManager.d.ts.map