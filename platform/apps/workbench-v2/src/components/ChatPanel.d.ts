import type { Attachment, ChatCopyKind, ChatVote, ComposerDraft, ComposerHistoryEntry, Session } from '../types';
interface ChatPanelProps {
    session: Session;
    activeChatId: string;
    model: string;
    mode: string;
    auxiliaryVisible: boolean;
    onSelectChat: (chatId: string) => void;
    onChangeModel: (model: string) => void;
    onChangeMode: (mode: string) => void;
    onSend: (text: string, attachments: Attachment[]) => void;
    onStop: () => void;
    onApprove: (chatId?: string) => void;
    onCopy: (chatId: string, messageId: string, kind: ChatCopyKind) => void;
    onCopyAll: (chatId: string) => void;
    onCopyFinalResponse: (chatId: string, messageId: string) => void;
    onRegenerate: (chatId: string, messageId: string) => void;
    onFeedback: (chatId: string, messageId: string, vote: ChatVote) => void;
    onReport: (chatId: string, messageId: string) => void;
    onOpenBrowser: () => void;
    onOpenDiff: () => void;
    onToggleAuxiliary: () => void;
    composerDrafts?: Record<string, ComposerDraft>;
    onChangeComposerDraft?: (key: string, updater: (current: ComposerDraft) => ComposerDraft) => void;
    composerHistory?: Record<string, ComposerHistoryEntry[]>;
    onAppendComposerHistory?: (key: string, entry: ComposerHistoryEntry) => void;
}
export declare function ChatPanel({ session, activeChatId, model, mode, auxiliaryVisible, onSelectChat, onChangeModel, onChangeMode, onSend, onStop, onApprove, onCopy, onCopyAll, onCopyFinalResponse, onRegenerate, onFeedback, onReport, onOpenBrowser, onOpenDiff, onToggleAuxiliary, composerDrafts, onChangeComposerDraft, composerHistory, onAppendComposerHistory, }: ChatPanelProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ChatPanel.d.ts.map