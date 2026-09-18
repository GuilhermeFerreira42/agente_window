import type { Session } from '../types';
interface SessionSidebarProps {
    sessions: Session[];
    visible: boolean;
    activeSessionId: string;
    activeChatId: string;
    onSelectSession: (id: string) => void;
    onSelectChat: (sessionId: string, chatId: string) => void;
    onNewSession: () => void;
    onTogglePinned: (id: string) => void;
    onToggleArchived: (id: string) => void;
    onDelete: (id: string) => void;
    onRename: (id: string, title: string) => void;
    onApprove: (sessionId: string, chatId?: string) => void;
    onOpenDiff: (sessionId: string) => void;
    onReorderSessions: (fromId: string, toId: string) => void;
    /** (R-012) Atribui uma sessão a um grupo customizado. */
    onAssignGroup: (sessionId: string, groupId: string) => void;
    /** (R-012) Remove uma sessão do grupo customizado. */
    onRemoveGroup: (sessionId: string) => void;
    /** (E14) Abre a sessão como peer ao lado da ativa no Sessions Part grid. */
    onOpenBeside?: (sessionId: string) => void;
}
export declare function SessionSidebar({ sessions, visible, activeSessionId, activeChatId, onSelectSession, onSelectChat, onNewSession, onTogglePinned, onToggleArchived, onDelete, onRename, onApprove, onOpenDiff, onReorderSessions, onAssignGroup, onRemoveGroup, onOpenBeside, }: SessionSidebarProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SessionSidebar.d.ts.map