import type { Attachment, ComposerDraft, ComposerHistoryEntry, NestedChat, Session } from '../types';
interface ChatInputProps {
    session: Session;
    activeChat: NestedChat;
    model: string;
    mode: string;
    onChangeModel: (model: string) => void;
    onChangeMode: (mode: string) => void;
    onSend: (text: string, attachments: Attachment[]) => void;
    onStop: () => void;
    onApprove: (chatId?: string) => void;
    composerDrafts?: Record<string, ComposerDraft>;
    onChangeComposerDraft?: (key: string, updater: (current: ComposerDraft) => ComposerDraft) => void;
    composerHistory?: Record<string, ComposerHistoryEntry[]>;
    onAppendComposerHistory?: (key: string, entry: ComposerHistoryEntry) => void;
}
export declare function ChatInput({ session, activeChat, model, mode, onChangeModel, onChangeMode, onSend, onStop, onApprove, composerDrafts, onChangeComposerDraft, composerHistory, onAppendComposerHistory, }: ChatInputProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ChatInput.d.ts.map