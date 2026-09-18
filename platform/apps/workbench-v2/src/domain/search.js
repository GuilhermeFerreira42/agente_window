/**
 * Search in the same three fields exposed by the mock result model. The
 * workbench's Search Editor delegates matching to a search service; this
 * pure helper keeps the replica's mock matching deterministic and testable.
 */
export function filterSearchResults(results, query) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery)
        return [...results];
    return results.filter((result) => {
        const searchableText = `${result.path} ${result.content} ${result.match}`.toLocaleLowerCase();
        return searchableText.includes(normalizedQuery);
    });
}
/**
 * Split a result line into renderable pieces without treating the user's
 * search term as a regular expression. This preserves terms such as [x],
 * $token and a.b exactly as typed while still matching case-insensitively.
 */
export function splitSearchHighlight(content, query) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery)
        return [{ text: content, highlighted: false }];
    const matcher = new RegExp(escapeRegExp(normalizedQuery), 'gi');
    const parts = [];
    let cursor = 0;
    for (const match of content.matchAll(matcher)) {
        const index = match.index ?? cursor;
        if (index > cursor)
            parts.push({ text: content.slice(cursor, index), highlighted: false });
        parts.push({ text: match[0], highlighted: true });
        cursor = index + match[0].length;
    }
    if (cursor < content.length)
        parts.push({ text: content.slice(cursor), highlighted: false });
    return parts.length > 0 ? parts : [{ text: content, highlighted: false }];
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function formatSearchSummary(resultCount) {
    return `${resultCount} ${resultCount === 1 ? 'resultado' : 'resultados'}`;
}
//# sourceMappingURL=search.js.map