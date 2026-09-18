import { type MutableRefObject, type RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import type { PtySessionState } from '../providers/TerminalSessionProvider';
import type { XtermTheme } from './useTerminalTheme';
interface UseXtermTerminalOptions {
    containerRef: RefObject<HTMLDivElement | null>;
    sessionId: string;
    session: PtySessionState | undefined;
    enabled: boolean;
    active?: boolean;
    theme: XtermTheme;
    loadWebLinks?: boolean;
}
export interface UseXtermTerminalResult {
    instanceRef: MutableRefObject<Terminal | null>;
    focus: () => void;
    clear: () => void;
    fitAndSync: () => void;
    hasSelection: () => boolean;
    getSelection: () => string;
    selectAll: () => void;
}
export declare function useXtermTerminal({ containerRef, sessionId, session, enabled, active, theme, loadWebLinks, }: UseXtermTerminalOptions): UseXtermTerminalResult;
export {};
//# sourceMappingURL=useXtermTerminal.d.ts.map