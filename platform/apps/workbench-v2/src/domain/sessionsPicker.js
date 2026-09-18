/** The synthetic "New Session" row that always heads the picker. */
export const NEW_SESSION_ITEM = {
    kind: 'item',
    id: 'newSession',
    label: 'New Session',
    detail: '',
};
function toItem(session) {
    const detailParts = [session.workspace, session.branch].filter(Boolean);
    return { kind: 'item', id: session.id, label: session.title, detail: detailParts.join(' · '), session };
}
/** Does `query` match this session by name or by folder/branch (matchOnDetail)? */
export function pickItemMatches(item, query) {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized)
        return true;
    return `${item.label} ${item.detail}`.toLocaleLowerCase().includes(normalized);
}
/**
 * Builds the grouped picker entries for the given sessions and query, mirroring
 * the original ordering: New Session, then "needs input", "unread",
 * "recently opened", and "other sessions". Archived sessions are excluded (they
 * are reached through the list's Archived section, not the switcher). Empty
 * groups and their separators are omitted; the New Session row is always present.
 */
export function buildSessionPickerEntries(sessions, query) {
    const entries = [NEW_SESSION_ITEM];
    const active = sessions.filter((session) => !session.archived && session.section !== 'archived');
    const needsInput = active.filter((session) => session.status === 'needs-input');
    const unread = active.filter((session) => session.status !== 'needs-input' && session.unread);
    const rest = active.filter((session) => session.status !== 'needs-input' && !session.unread);
    // "recently opened" = today/yesterday; everything older is "other sessions".
    const recent = rest.filter((session) => session.section === 'today' || session.section === 'yesterday');
    const other = rest.filter((session) => session.section !== 'today' && session.section !== 'yesterday');
    const appendGroup = (label, group) => {
        const items = group.map(toItem).filter((item) => pickItemMatches(item, query));
        if (items.length === 0)
            return;
        entries.push({ kind: 'separator', id: `sep:${label}`, label });
        entries.push(...items);
    };
    appendGroup('needs input', needsInput);
    appendGroup('unread', unread);
    appendGroup('recently opened', recent);
    appendGroup('other sessions', other);
    return entries;
}
/** The selectable (non-separator) items, in display order. */
export function selectablePickItems(entries) {
    return entries.filter((entry) => entry.kind === 'item');
}
//# sourceMappingURL=sessionsPicker.js.map