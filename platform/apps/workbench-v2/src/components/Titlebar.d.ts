import type { Session } from '../types';
interface TitlebarProps {
    activeSession: Session;
    unreadCount: number;
    sidebarVisible: boolean;
    auxiliaryVisible: boolean;
    terminalVisible: boolean;
    approved: boolean;
    theme: 'dark' | 'light';
    onToggleTheme: () => void;
    onToggleSidebar: () => void;
    onToggleAuxiliary: () => void;
    onToggleTerminal: () => void;
    onOpenSearch: () => void;
    onOpenBrowser: () => void;
    onOpenDiff: () => void;
    onNewSession: () => void;
    onShowSessions: () => void;
    onAccountAction: (action: string) => void;
}
export declare function Titlebar({ activeSession, unreadCount, sidebarVisible, auxiliaryVisible, terminalVisible, approved, theme, onToggleTheme, onToggleSidebar, onToggleAuxiliary, onToggleTerminal, onOpenSearch, onOpenBrowser, onOpenDiff, onNewSession, onShowSessions, onAccountAction, }: TitlebarProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Titlebar.d.ts.map