import type { Session, SessionSection } from '../types';
/**
 * Advanced Sessions List model (E6), mirroring SESSIONS_LIST.md. Pure functions
 * over the session collection: placement precedence, grouping, sorting, and
 * composite filtering. The React component renders whatever these return.
 */
export type SortMode = 'manual' | 'created' | 'updated';
export interface SessionFilters {
    /** Free-text query, matched against title, workspace, branch and chat titles. */
    query: string;
    /** Only these statuses (empty = all). */
    statuses: readonly Session['status'][];
    /** Only these providers (empty = all). */
    providers: readonly string[];
    /** 'all' | 'unread' | 'read'. */
    readState: 'all' | 'unread' | 'read';
    /** Whether archived sessions are included. */
    includeArchived: boolean;
}
export declare const EMPTY_FILTERS: SessionFilters;
/** A resolved section of the list: a fixed kind, or a user custom group. */
export type PrimarySection = {
    kind: 'pinned';
} | {
    kind: 'custom';
    id: string;
} | {
    kind: 'quickChats';
} | {
    kind: 'date';
    section: SessionSection;
} | {
    kind: 'archived';
};
export interface SessionGroup {
    id: string;
    label: string;
    section: PrimarySection;
    sessions: Session[];
}
/** The provider identity of a session, defaulting to 'local'. */
export declare function sessionProvider(session: Session): string;
/**
 * Placement precedence (SESSIONS_LIST.md): Archived > Pinned > Custom group >
 * Quick chat > Workspace/date group. Returns the single section a session
 * belongs to. Archived always wins; archiving conceptually drops custom-group
 * membership, so an archived session never lands in a custom group here.
 */
export declare function placeSession(session: Session): PrimarySection;
/** Composite filter (SESSIONS_LIST.md §Sorting and filtering). */
export declare function sessionMatchesFilters(session: Session, filters: SessionFilters): boolean;
/**
 * Builds the ordered, grouped, filtered Sessions List.
 *
 * - Excludes automation runs from the primary list.
 * - Keeps the active session visible even when a filter would exclude it.
 * - Applies placement precedence, then orders groups: Pinned, Custom groups,
 *   Quick Chats, date sections, Archived last.
 * - Sorts sessions within each group by the selected sort mode.
 * - `activeCustomGroups` names the known custom groups (id → label) so empty
 *   ones can still be omitted while labels stay stable.
 */
export declare function buildSessionsList(sessions: readonly Session[], filters: SessionFilters, sortMode: SortMode, activeSessionId: string | undefined, customGroupLabels?: Readonly<Record<string, string>>, orderCustomIds?: (presentIds: string[], labelOf: (id: string) => string) => string[]): SessionGroup[];
/**
 * Workspace capping (SESSIONS_LIST.md §Workspace grouping): while not searching,
 * only the first `cap` workspaces are shown; the active session's workspace is
 * always promoted. A search bypasses capping entirely.
 */
export declare function applyWorkspaceCapping(workspaces: readonly string[], cap: number, searching: boolean, activeWorkspace: string | undefined): {
    visible: string[];
    hiddenCount: number;
};
//# sourceMappingURL=sessionsList.d.ts.map