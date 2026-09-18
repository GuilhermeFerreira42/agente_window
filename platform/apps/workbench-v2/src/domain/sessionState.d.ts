import type { BrowserStatus, BrowserViewState, BrowserViewport, ChatStatus, DiffFile, DiffResolution, EditorTab, Session, SessionStatus } from '../types';
export declare function canTransitionStatus(current: SessionStatus, next: SessionStatus): boolean;
export declare function transitionStatus(current: SessionStatus, next: SessionStatus): SessionStatus;
export declare function transitionChatStatus(current: ChatStatus, next: ChatStatus): ChatStatus;
export declare function canTransitionBrowserStatus(current: BrowserStatus, next: BrowserStatus): boolean;
export declare function transitionBrowserStatus(current: BrowserStatus, next: BrowserStatus): BrowserStatus;
export declare function resolveActiveChatId(session: Session, selection: Readonly<Record<string, string>>): string;
export declare function getChat(session: Session, chatId?: string): import("../types").NestedChat | undefined;
export declare function updateSessionStatus(session: Session, next: SessionStatus): Session;
export declare function updateChatStatus(session: Session, chatId: string, next: ChatStatus): Session;
export declare function updateSessionAndChatStatus(session: Session, chatId: string, next: SessionStatus): Session;
export declare function navigateBrowser(view: BrowserViewState, url: string): BrowserViewState;
export declare function stepBrowserHistory(view: BrowserViewState, direction: -1 | 1): BrowserViewState;
export declare function reloadBrowser(view: BrowserViewState): BrowserViewState;
export declare function setBrowserStatus(view: BrowserViewState, status: BrowserStatus): BrowserViewState;
export declare function setBrowserViewport(view: BrowserViewState, viewport: BrowserViewport): BrowserViewState;
export declare function isBrowserOwnedBySession(view: BrowserViewState, sessionId: string): boolean;
export declare function isEditorTabVisibleForSession(tab: EditorTab, sessionId: string): boolean;
export declare function isEditorTabOwnedBySession(tab: EditorTab, sessionId: string): boolean;
export declare function updateDiffFile(files: readonly DiffFile[], id: string, updater: (file: DiffFile) => DiffFile): DiffFile[];
/** Resolve the explicit decision while accepting the legacy boolean mock field. */
export declare function getDiffResolution(file: Pick<DiffFile, 'accepted' | 'resolution'>): DiffResolution | undefined;
export declare function setDiffAccepted(files: readonly DiffFile[], id: string, accepted: boolean): DiffFile[];
export declare function setAllDiffAccepted(files: readonly DiffFile[], accepted: boolean): DiffFile[];
export declare function toggleDiffViewed(files: readonly DiffFile[], id: string): DiffFile[];
/**
 * Runtime assertions for the state relationships that TypeScript interfaces
 * alone cannot express. They are intentionally side-effect free and can be
 * called from tests, initialization, or a development-only boundary.
 */
export declare function assertSessionInvariants(session: Session): void;
export declare function assertBrowserViewInvariants(view: BrowserViewState): void;
export declare function assertEditorTabInvariants(tab: EditorTab): void;
export declare function assertWorkbenchInvariants(sessions: readonly Session[], browserViews: readonly BrowserViewState[], editorTabs: readonly EditorTab[], activeSessionId: string, activeChatBySession: Readonly<Record<string, string>>): void;
//# sourceMappingURL=sessionState.d.ts.map