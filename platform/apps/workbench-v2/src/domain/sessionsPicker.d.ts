import type { Session } from '../types';
/**
 * A single row in the floating sessions picker (Command Center → Show Sessions).
 * Mirrors the original `ISessionPickItem`: an optional `session` (absent = the
 * "New Session" action) plus a display label and a detail line (workspace/branch)
 * that is also matched against when filtering.
 */
export interface SessionPickItem {
    kind: 'item';
    id: string;
    label: string;
    detail: string;
    session?: Session;
}
export interface SessionPickSeparator {
    kind: 'separator';
    id: string;
    label: string;
}
export type SessionPickEntry = SessionPickItem | SessionPickSeparator;
/** The synthetic "New Session" row that always heads the picker. */
export declare const NEW_SESSION_ITEM: SessionPickItem;
/** Does `query` match this session by name or by folder/branch (matchOnDetail)? */
export declare function pickItemMatches(item: SessionPickItem, query: string): boolean;
/**
 * Builds the grouped picker entries for the given sessions and query, mirroring
 * the original ordering: New Session, then "needs input", "unread",
 * "recently opened", and "other sessions". Archived sessions are excluded (they
 * are reached through the list's Archived section, not the switcher). Empty
 * groups and their separators are omitted; the New Session row is always present.
 */
export declare function buildSessionPickerEntries(sessions: readonly Session[], query: string): SessionPickEntry[];
/** The selectable (non-separator) items, in display order. */
export declare function selectablePickItems(entries: readonly SessionPickEntry[]): SessionPickItem[];
//# sourceMappingURL=sessionsPicker.d.ts.map