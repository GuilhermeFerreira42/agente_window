import React from 'react';
import { type PtyError, type PtyStatus, type ShellProfile } from '../hooks/usePtySession';
export interface PtySessionState {
    status: PtyStatus;
    pid: number | undefined;
    activeProfile: ShellProfile | undefined;
    availableProfiles: ShellProfile[];
    lastError?: PtyError;
    sendInput: (data: string) => void;
    sendResize: (cols: number, rows: number) => void;
    closeSession: () => void;
    clearOutputBuffer: () => void;
    onOutput: (callback: (data: string) => void) => () => void;
}
interface TerminalSessionContextType {
    sessions: Record<string, PtySessionState>;
    getOrCreateSession: (sessionId: string, shellId?: string) => void;
    closeSession: (sessionId: string) => void;
}
export declare function TerminalSessionProvider({ children }: {
    children: React.ReactNode;
}): import("react").JSX.Element;
export declare function useTerminalSessions(): TerminalSessionContextType;
export {};
//# sourceMappingURL=TerminalSessionProvider.d.ts.map