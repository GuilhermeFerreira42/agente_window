import type { Session } from '../types';
interface SessionsPickerProps {
    open: boolean;
    sessions: Session[];
    activeSessionId: string;
    onClose: () => void;
    onSelectSession: (id: string) => void;
    onNewSession: () => void;
}
/**
 * Floating sessions picker (E9 / R-073) — the Command Center "Show Sessions"
 * quick-pick. A centered overlay with a search field that matches on session
 * name and folder/branch, grouped results (needs input / unread / recently
 * opened / other), a leading "New Session" action, and full keyboard control
 * (↑/↓ to move, Enter to open, Esc to close).
 */
export declare function SessionsPicker({ open, sessions, activeSessionId, onClose, onSelectSession, onNewSession }: SessionsPickerProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=SessionsPicker.d.ts.map