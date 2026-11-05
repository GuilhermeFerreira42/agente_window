// ============================================================================
// core/search/searchService.ts — 4.6 c2. ISearchApi REAL (porta de
// `services/search/common/searchService.ts:28/82` + `replaceService.ts:97`):
//   • query(): debounce SEARCH_DEBOUNCE_MS (250, congelado) + "última busca
//     vence" (a anterior recebe search.cancelled, mesmo se já em voo);
//   • transporte: `SearchTransportLike` (HTTP POST /fs/search via
//     BrowserFsPort.searchText) ou FALLBACK local (walk fs.list + readFile +
//     textMatcher) — funciona com qualquer FileSystemPortLike;
//   • replaceAll(): sem debounce; por arquivo readFile → replaceInContent →
//     fs.writeFile({atomic:true}); falha em 1 arquivo NÃO impede os outros e
//     volta em `failures` (04_06 §3.7); emite search.replaceApplied.
// PURO (FT-07): sem DOM/node — timers via globalThis.setTimeout.
// ============================================================================
import type {
  ExplorerSearchEvent, FileSystemPortLike, ISearchApi, SearchHandle, SearchMatch, SearchQuery, SearchReplaceSummary, WorkspaceUri,
} from '../../contract';
import { SEARCH_DEBOUNCE_MS, SEARCH_DEFAULT_EXCLUDES, SEARCH_DEFAULT_MAX_FILES, SEARCH_DEFAULT_MAX_RESULTS } from '../constants';
import { Emitter } from '../emitter';
import { compileSearchQuery, fileMatchesQuery, folderExcludedByQuery } from './queryBuilder';
import { matchesInContent, replaceInContent, replaceMatchesInContent } from './textMatcher';

export interface SearchTransportResult {
  matches: SearchMatch[];
  fileCount: number;
  matchCount: number;
  filesScanned: number;
  truncated: boolean;
}
export interface SearchTransportLike {
  searchText(input: { root: WorkspaceUri; query: SearchQuery; maxResults?: number; maxFiles?: number; signal?: AbortSignal }): Promise<SearchTransportResult>;
}
export function hasSearchTransport(fs: unknown): fs is SearchTransportLike {
  return typeof (fs as { searchText?: unknown })?.searchText === 'function';
}

export interface SearchServiceOptions {
  debounceMs?: number;
  maxResults?: number;
  maxFiles?: number;
  /** Transporte explícito; default: `fs` se tiver `searchText`, senão fallback local. */
  transport?: SearchTransportLike;
}

export interface ReplaceAllSummary extends SearchReplaceSummary {
  /** Arquivos que falharam ao gravar (listados ao final, 04_06 §3.7). */
  failures: Array<{ uri: WorkspaceUri; message: string }>;
}

let seq = 0;

export class SearchService implements ISearchApi {
  private readonly events = new Emitter<ExplorerSearchEvent>();
  private readonly transport: SearchTransportLike;
  private readonly debounceMs: number;
  private readonly maxResults: number;
  private readonly maxFiles: number;
  private pending: { id: string; timer: ReturnType<typeof setTimeout> | null; ac: AbortController } | null = null;
  /** c6 — último resultado concluído (o SearchView do VS Code guarda o modelo
   *  enquanto a view fica escondida; aqui a UI é desmontada ao trocar de aba). */
  lastResult: { root: WorkspaceUri; query: SearchQuery; matches: SearchMatch[]; fileCount: number; truncated: boolean } | null = null;

  constructor(private readonly fs: FileSystemPortLike, opts: SearchServiceOptions = {}) {
    this.debounceMs = opts.debounceMs ?? SEARCH_DEBOUNCE_MS;
    this.maxResults = opts.maxResults ?? SEARCH_DEFAULT_MAX_RESULTS;
    this.maxFiles = opts.maxFiles ?? SEARCH_DEFAULT_MAX_FILES;
    this.transport = opts.transport ?? (hasSearchTransport(fs) ? fs : new LocalSearchTransport(fs));
  }

  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void {
    return this.events.add(cb);
  }

  /** Cancela a busca em voo/agendada (usado por Clear Search Results e dispose). */
  cancelPending(): void {
    if (!this.pending) return;
    const p = this.pending;
    this.pending = null;
    if (p.timer) clearTimeout(p.timer);
    p.ac.abort();
    this.events.fire({ type: 'search.cancelled', id: p.id });
  }

  query(input: { root: WorkspaceUri; query: SearchQuery; onResult?: (r: { matches: SearchMatch[]; fileCount: number; truncated: boolean }) => void }): SearchHandle {
    this.cancelPending(); // última busca vence
    const id = `search-${++seq}`;
    const ac = new AbortController();
    const entry = { id, timer: null as ReturnType<typeof setTimeout> | null, ac };
    this.pending = entry;
    const run = async () => {
      entry.timer = null;
      if (ac.signal.aborted) return;
      this.events.fire({ type: 'search.started', id });
      try {
        const r = await this.transport.searchText({ root: input.root, query: input.query, maxResults: this.maxResults, maxFiles: this.maxFiles, signal: ac.signal });
        if (ac.signal.aborted) return;
        this.events.fire({ type: 'search.progress', id, filesScanned: r.filesScanned, matches: r.matchCount });
        this.lastResult = { root: input.root, query: input.query, matches: r.matches, fileCount: r.fileCount, truncated: r.truncated };
        this.events.fire({ type: 'search.finished', id, matches: r.matches, fileCount: r.fileCount, truncated: r.truncated });
        input.onResult?.({ matches: r.matches, fileCount: r.fileCount, truncated: r.truncated });
      } catch (e) {
        if (ac.signal.aborted) return;
        const code = (e as { code?: string })?.code === 'invalid_query' ? 'invalid_query' : 'search_failed';
        this.events.fire({ type: 'error', code, message: (e as Error)?.message ?? String(e) });
      } finally {
        if (this.pending === entry) this.pending = null;
      }
    };
    if (this.debounceMs > 0) entry.timer = setTimeout(() => void run(), this.debounceMs);
    else void run();
    return {
      id,
      cancel: () => {
        if (this.pending === entry) this.cancelPending();
      },
    };
  }

  async replaceAll(input: { root: WorkspaceUri; query: SearchQuery; replacement: string }): Promise<ReplaceAllSummary> {
    const compiled = compileSearchQuery(input.query);
    const found = await this.transport.searchText({ root: input.root, query: input.query, maxResults: this.maxResults, maxFiles: this.maxFiles });
    const uris = [...new Set(found.matches.map((m) => m.uri))];
    let files = 0;
    let replacements = 0;
    const failures: ReplaceAllSummary['failures'] = [];
    for (const uri of uris) {
      try {
        const { content } = await this.fs.readFile({ uri });
        const r = replaceInContent(content, compiled, input.replacement, input.query.isRegExp === true);
        if (r.count === 0) continue;
        await this.fs.writeFile({ uri, content: r.content, atomic: true });
        files++;
        replacements += r.count;
      } catch (e) {
        failures.push({ uri, message: (e as Error)?.message ?? String(e) });
      }
    }
    this.events.fire({ type: 'search.replaceApplied', files, replacements });
    return { files, replacements, failures };
  }

  /** Troca pontual (c5): só as ocorrências passadas — 1 match (Replace) ou os
   *  matches de 1 arquivo (Replace All do arquivo). Fora do contrato congelado
   *  (uso interno da UI); mesma escrita atômica e mesma política de falhas. */
  async replaceMatches(input: { query: SearchQuery; replacement: string; matches: ReadonlyArray<SearchMatch>; preserveCase?: boolean }): Promise<ReplaceAllSummary & { missed: number }> {
    const compiled = compileSearchQuery(input.query);
    const byUri = new Map<WorkspaceUri, SearchMatch[]>();
    for (const m of input.matches) {
      if (!byUri.has(m.uri)) byUri.set(m.uri, []);
      byUri.get(m.uri)!.push(m);
    }
    let files = 0;
    let replacements = 0;
    let missed = 0;
    const failures: ReplaceAllSummary['failures'] = [];
    for (const [uri, targets] of byUri) {
      try {
        const { content } = await this.fs.readFile({ uri });
        const r = replaceMatchesInContent(content, compiled, input.replacement, input.query.isRegExp === true, targets, input.preserveCase === true);
        missed += r.missed;
        if (r.count === 0) continue;
        await this.fs.writeFile({ uri, content: r.content, atomic: true });
        files++;
        replacements += r.count;
      } catch (e) {
        failures.push({ uri, message: (e as Error)?.message ?? String(e) });
      }
    }
    this.events.fire({ type: 'search.replaceApplied', files, replacements });
    return { files, replacements, failures, missed };
  }

  dispose(): void {
    this.cancelPending();
  }
}

// ---------------------------------------------------------------------------
// Fallback local: walker sobre a FileSystemPortLike (list + readFile).
// Mesmas regras do engine do servidor (excludes congelados, limites, abort).
// ---------------------------------------------------------------------------
export class LocalSearchTransport implements SearchTransportLike {
  constructor(private readonly fs: FileSystemPortLike) {}

  async searchText(input: { root: WorkspaceUri; query: SearchQuery; maxResults?: number; maxFiles?: number; signal?: AbortSignal }): Promise<SearchTransportResult> {
    const compiled = compileSearchQuery(input.query);
    const maxResults = input.maxResults ?? SEARCH_DEFAULT_MAX_RESULTS;
    const maxFiles = input.maxFiles ?? SEARCH_DEFAULT_MAX_FILES;
    const excludeNames = new Set<string>(SEARCH_DEFAULT_EXCLUDES);
    const rootPrefix = input.root.endsWith('/') ? input.root : `${input.root}/`;
    const rel = (uri: WorkspaceUri) => (uri.startsWith(rootPrefix) ? uri.slice(rootPrefix.length) : uri);
    const matches: SearchMatch[] = [];
    let fileCount = 0;
    let filesScanned = 0;
    let truncated = false;
    const stack: WorkspaceUri[] = [input.root];
    outer: while (stack.length > 0) {
      if (input.signal?.aborted) break;
      const dir = stack.pop()!;
      let entries;
      try {
        entries = await this.fs.list({ uri: dir });
      } catch {
        continue;
      }
      entries = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      const subdirs: WorkspaceUri[] = [];
      for (const e of entries) {
        if (input.signal?.aborted) break outer;
        if (e.kind === 'directory') {
          if (excludeNames.has(e.name) || folderExcludedByQuery(compiled, rel(e.uri))) continue;
          subdirs.push(e.uri);
          continue;
        }
        if (!fileMatchesQuery(compiled, rel(e.uri))) continue;
        let content: string;
        try {
          content = (await this.fs.readFile({ uri: e.uri })).content;
        } catch {
          continue;
        }
        filesScanned++;
        const found = matchesInContent(content, compiled, maxResults - matches.length, e.uri);
        if (found.length === 0) continue;
        fileCount++;
        matches.push(...found);
        if (matches.length >= maxResults || fileCount >= maxFiles) {
          truncated = true;
          break outer;
        }
      }
      for (let i = subdirs.length - 1; i >= 0; i--) stack.push(subdirs[i]);
    }
    return { matches, fileCount, matchCount: matches.length, filesScanned, truncated };
  }
}
