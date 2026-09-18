import type { SearchResult } from '../types';
export interface SearchHighlightPart {
    text: string;
    highlighted: boolean;
}
/**
 * Search in the same three fields exposed by the mock result model. The
 * workbench's Search Editor delegates matching to a search service; this
 * pure helper keeps the replica's mock matching deterministic and testable.
 */
export declare function filterSearchResults(results: readonly SearchResult[], query: string): SearchResult[];
/**
 * Split a result line into renderable pieces without treating the user's
 * search term as a regular expression. This preserves terms such as [x],
 * $token and a.b exactly as typed while still matching case-insensitively.
 */
export declare function splitSearchHighlight(content: string, query: string): SearchHighlightPart[];
export declare function formatSearchSummary(resultCount: number): string;
//# sourceMappingURL=search.d.ts.map