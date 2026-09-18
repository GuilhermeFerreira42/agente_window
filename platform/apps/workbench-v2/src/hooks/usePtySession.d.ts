export interface ShellProfile {
    id: string;
    label: string;
    path: string;
}
export type PtyStatus = 'connecting' | 'open' | 'error' | 'closed';
export interface PtyError {
    code: string;
    message: string;
}
interface UsePtySessionOptions {
    sessionId: string;
    cols?: number;
    rows?: number;
    shellId?: string;
    enabled?: boolean;
}
type OutputListener = (data: string) => void;
declare global {
    interface Window {
        __AGENTS_WINDOW_PTY_URL__?: string;
    }
}
export declare function usePtySession({ sessionId, cols, rows, shellId, enabled, }: UsePtySessionOptions): {
    status: PtyStatus;
    pid: number | undefined;
    activeProfile: ShellProfile | undefined;
    availableProfiles: ShellProfile[];
    lastError: PtyError | undefined;
    sendInput: (data: string) => void;
    sendResize: (newCols: number, newRows: number) => void;
    closeSession: () => void;
    clearOutputBuffer: () => void;
    onOutput: (callback: OutputListener) => () => void;
};
export {};
//# sourceMappingURL=usePtySession.d.ts.map