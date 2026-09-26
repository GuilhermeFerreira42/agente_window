// ============================================================================
// core/search/model.ts — 4.6 c2. Porta mínima de `contrib/search/browser/
// searchTreeModel/*` (searchResult → fileMatch → match): agrupamento por
// arquivo com contagens + mensagem "N results in M files" (searchView.ts).
// PURO (FT-07).
// ============================================================================
import type { SearchMatch, WorkspaceUri } from '../../contract';

export interface FileMatchGroup {
  uri: WorkspaceUri;
  name: string;
  /** Caminho da pasta relativo à raiz (label-description do VS Code); '' na raiz. */
  folder: string;
  matches: SearchMatch[];
}

export function groupMatchesByFile(matches: readonly SearchMatch[], root: WorkspaceUri): FileMatchGroup[] {
  const byUri = new Map<WorkspaceUri, FileMatchGroup>();
  const rootPrefix = root.endsWith('/') ? root : `${root}/`;
  for (const m of matches) {
    let g = byUri.get(m.uri);
    if (!g) {
      const rel = m.uri.startsWith(rootPrefix) ? m.uri.slice(rootPrefix.length) : m.uri;
      const slash = rel.lastIndexOf('/');
      g = { uri: m.uri, name: slash >= 0 ? rel.slice(slash + 1) : rel, folder: slash >= 0 ? rel.slice(0, slash) : '', matches: [] };
      byUri.set(m.uri, g);
    }
    g.matches.push(m);
  }
  return [...byUri.values()];
}

/** searchView.ts (`showSearchResultsMessage`): "1 result in 1 file" /
 *  "N results in M files"; `truncated` → prefixo do upstream ("Results are
 *  limited"). Texto em inglês como a régua 8080 (labels do VS Code). */
export function formatResultsMessage(matchCount: number, fileCount: number, truncated = false): string {
  const r = matchCount === 1 ? '1 result' : `${matchCount} results`;
  const f = fileCount === 1 ? '1 file' : `${fileCount} files`;
  const base = `${r} in ${f}`;
  return truncated ? `${base} - Results are limited` : base;
}

export const NO_RESULTS_MESSAGE = 'No results found. Review your settings for configured exclusions and check your gitignore files';
