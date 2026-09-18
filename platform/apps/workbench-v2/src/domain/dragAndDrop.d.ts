import type { EditorTab, Session } from '../types';
/**
 * Drag & drop mime identifiers, mirroring the original Agents window
 * (`sessions/browser/dnd.ts`: `SessionsDataTransfers`). Kept string-stable so
 * `dragover` gating can read `dataTransfer.types` before the drop.
 */
export declare const DragTypes: {
    /** A session row dragged within the sessions list. */
    readonly SESSION: "application/vnd.code.session";
    /** An editor tab dragged within the single editor group. */
    readonly EDITOR_TAB: "application/vnd.code.session.tab";
    /** A workspace file dragged onto the chat composer as an attachment. */
    readonly FILE: "application/vnd.code.session.file";
};
/**
 * Reorders an item within an array by moving `fromId` so that it lands at the
 * position currently held by `toId`. Returns a new array; the original is left
 * untouched. Unknown ids or a no-op move return the same reference so callers
 * can skip a state update.
 */
export declare function reorderById<T extends {
    id: string;
}>(items: readonly T[], fromId: string, toId: string): T[] | readonly T[];
/**
 * A session may only be reordered relative to another session that lives in the
 * same visible section — the original forbids crossing into archived/fixed
 * groups purely by drag position (`SESSIONS_LIST.md` §Drag and drop:
 * "sessions may reorder within valid sections"; "Archived and fixed sections
 * are not reorder targets").
 */
export declare function canReorderSessions(from: Session | undefined, to: Session | undefined): boolean;
/** The pinned band is a single reorder group; otherwise the section is the group. */
export declare function sessionGroupKey(session: Session): string;
/**
 * Reorders `sessions` so `fromId` takes `toId`'s slot, but only when the two
 * belong to the same reorder group. Otherwise the original array is returned.
 */
export declare function reorderSessions(sessions: readonly Session[], fromId: string, toId: string): Session[] | readonly Session[];
/**
 * Reorders editor tabs within the single editor group. Both ids must belong to
 * the same session, since tabs are session-scoped in this replica.
 */
export declare function reorderEditorTabs(tabs: readonly EditorTab[], fromId: string, toId: string): EditorTab[] | readonly EditorTab[];
//# sourceMappingURL=dragAndDrop.d.ts.map