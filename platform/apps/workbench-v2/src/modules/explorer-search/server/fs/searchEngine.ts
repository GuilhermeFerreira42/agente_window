// ============================================================================
// server/fs/searchEngine.ts — 4.6 c1. Engine de busca textual do módulo
// (porta funcional de `services/search/node/rawSearchService.ts:24`; SEM
// ripgrep — walker próprio, 04_11 §7). Regras (04_06 §3 + constants.ts):
//   • escopo = `root` (guardado por toFsPath → forbidden_path fora da raiz);
//   • excludes CONGELADOS (SEARCH_DEFAULT_EXCLUDES) sempre; + include/exclude
//     do usuário (globs via core/search/queryBuilder);
//   • arquivo > SEARCH_MAX_FILE_BYTES pulado (`skippedLarge`); binário (NUL
//     nos primeiros 8 KB) pulado;
//   • limites maxResults/maxFiles → `truncated: true` e para;
//   • cancelável por AbortSignal ("última busca vence" é do service, c2);
//   • streaming: async generator emite 1 evento por arquivo com matches.
// ============================================================================
import { open as fsOpen, readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import type { SearchMatch, SearchQuery, WorkspaceUri } from '../../contract';
import {
  SEARCH_DEFAULT_EXCLUDES,
  SEARCH_DEFAULT_MAX_FILES,
  SEARCH_DEFAULT_MAX_RESULTS,
  SEARCH_MAX_FILE_BYTES,
} from '../../core/constants';
import {
  compileSearchQuery,
  fileMatchesQuery,
  folderExcludedByQuery,
} from '../../core/search/queryBuilder';
import { matchesInContent } from '../../core/search/textMatcher';
import { toFsPath, toWorkspaceUri } from './fsHost';

export interface SearchEngineOptions {
  maxResults?: number;
  maxFiles?: number;
  maxFileBytes?: number;
  signal?: AbortSignal;
}

export type SearchEngineEvent =
  | { type: 'file'; uri: WorkspaceUri; matches: SearchMatch[] }
  | {
      type: 'done';
      fileCount: number;
      matchCount: number;
      filesScanned: number;
      skippedLarge: number;
      truncated: boolean;
      cancelled: boolean;
    };

const DEFAULT_EXCLUDE_NAMES: ReadonlySet<string> = new Set(SEARCH_DEFAULT_EXCLUDES);
const BINARY_SNIFF_BYTES = 8192;

async function looksBinary(path: string): Promise<boolean> {
  const fh = await fsOpen(path, 'r');
  try {
    const buf = Buffer.alloc(BINARY_SNIFF_BYTES);
    const { bytesRead } = await fh.read(buf, 0, BINARY_SNIFF_BYTES, 0);
    for (let i = 0; i < bytesRead; i++) if (buf[i] === 0) return true;
    return false;
  } finally {
    await fh.close();
  }
}

export { matchesInContent } from '../../core/search/textMatcher';

export async function* runSearch(
  rootPath: string,
  root: WorkspaceUri,
  query: SearchQuery,
  opts: SearchEngineOptions = {},
): AsyncGenerator<SearchEngineEvent, void, undefined> {
  const compiled = compileSearchQuery(query); // lança SearchQueryError
  const maxResults = opts.maxResults ?? SEARCH_DEFAULT_MAX_RESULTS;
  const maxFiles = opts.maxFiles ?? SEARCH_DEFAULT_MAX_FILES;
  const maxFileBytes = opts.maxFileBytes ?? SEARCH_MAX_FILE_BYTES;
  const signal = opts.signal;
  const scopePath = toFsPath(rootPath, root); // traversal → forbidden_path

  let fileCount = 0;
  let matchCount = 0;
  let filesScanned = 0;
  let skippedLarge = 0;
  let truncated = false;

  const toRel = (abs: string): string => relative(scopePath, abs).split(sep).join('/');

  // DFS iterativa em ordem alfabética estável (readdir já vem assim na maioria
  // dos FS; ordenamos para resultado determinístico nos testes).
  const stack: string[] = [scopePath];
  outer: while (stack.length > 0) {
    if (signal?.aborted) break;
    const dir = stack.pop()!;
    let dirents;
    try {
      dirents = await readdir(dir, { withFileTypes: true });
    } catch {
      continue; // pasta sumiu/sem permissão: segue
    }
    dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const subdirs: string[] = [];
    for (const d of dirents) {
      if (signal?.aborted) break outer;
      const abs = join(dir, d.name);
      if (d.isDirectory()) {
        if (DEFAULT_EXCLUDE_NAMES.has(d.name)) continue;
        if (folderExcludedByQuery(compiled, toRel(abs))) continue;
        subdirs.push(abs);
        continue;
      }
      if (!d.isFile()) continue;
      const rel = toRel(abs);
      if (!fileMatchesQuery(compiled, rel)) continue;
      let size: number;
      try {
        size = (await stat(abs)).size;
      } catch {
        continue;
      }
      if (size > maxFileBytes) {
        skippedLarge++;
        continue;
      }
      if (size === 0) continue;
      try {
        if (await looksBinary(abs)) continue;
      } catch {
        continue;
      }
      filesScanned++;
      let content: string;
      try {
        content = await readFile(abs, 'utf-8');
      } catch {
        continue;
      }
      const uri = toWorkspaceUri(rootPath, abs);
      const matches = matchesInContent(content, compiled, maxResults - matchCount, uri);
      if (matches.length === 0) continue;
      fileCount++;
      matchCount += matches.length;
      yield { type: 'file', uri, matches };
      if (matchCount >= maxResults || fileCount >= maxFiles) {
        truncated = true;
        break outer;
      }
    }
    // empilha em ordem reversa para sair alfabético
    for (let i = subdirs.length - 1; i >= 0; i--) stack.push(subdirs[i]);
  }

  yield {
    type: 'done',
    fileCount,
    matchCount,
    filesScanned,
    skippedLarge,
    truncated,
    cancelled: signal?.aborted === true,
  };
}
