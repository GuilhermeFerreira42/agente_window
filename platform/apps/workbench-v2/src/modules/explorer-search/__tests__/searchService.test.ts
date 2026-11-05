// searchService.test.ts — 4.6 c2: debounce 250 + "última vence" (cancelled),
// eventos do contrato, fallback local, replaceAll atômico com falha isolada,
// model (agrupamento + mensagem), textMatcher.replaceInContent.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExplorerSearchEvent, FileSystemPortLike, WorkspaceUri } from '../contract';
import { SearchService, hasSearchTransport } from '../core/search/searchService';
import { formatResultsMessage, groupMatchesByFile } from '../core/search/model';
import { compileSearchQuery } from '../core/search/queryBuilder';
import { replaceInContent, replaceMatchesInContent, replacementFor } from '../core/search/textMatcher';

const ROOT = 'file:///ws' as WorkspaceUri;

/** FS em memória com CONTEÚDO (FakeFsPort do 4.2 não guarda texto). */
class MemFs implements FileSystemPortLike {
  files = new Map<string, string>();
  writes: Array<{ uri: string; content: string; atomic: boolean }> = [];
  failWrite = new Set<string>();
  constructor(seed: Record<string, string>) { for (const [k, v] of Object.entries(seed)) this.files.set(`${ROOT}/${k}`, v); }
  async list({ uri }: { uri: WorkspaceUri }) {
    const prefix = `${uri}/`; const seen = new Map<string, 'file' | 'directory'>();
    for (const k of this.files.keys()) {
      if (!k.startsWith(prefix)) continue;
      const rest = k.slice(prefix.length); const seg = rest.split('/')[0];
      seen.set(seg, rest.includes('/') ? 'directory' : 'file');
    }
    return [...seen].map(([name, kind]) => ({ uri: `${uri}/${name}` as WorkspaceUri, name, kind }));
  }
  async readFile({ uri }: { uri: WorkspaceUri }) { const c = this.files.get(uri); if (c === undefined) throw new Error('ENOENT'); return { content: c, encoding: 'utf-8' as const }; }
  async readFileBinary() { return { dataBase64: '', mime: 'application/octet-stream' }; }
  async writeFile(i: { uri: WorkspaceUri; content: string; atomic: true }) { if (this.failWrite.has(i.uri)) throw new Error('EACCES'); this.files.set(i.uri, i.content); this.writes.push(i); }
  async stat({ uri }: { uri: WorkspaceUri }) { return { uri, size: 1, mtimeMs: 1, readonly: false, kind: 'file' as const }; }
  async createFile() {} async createFolder() {} async copy() {} async move() {} async remove() {}
  async watch() { return { watcherId: 'w' }; } onEvent() { return () => {}; }
}

const seed = () => new MemFs({
  'src/a.ts': 'const Needle = 1;\nneedle();\n',
  'b.md': '# needle\n',
  'node_modules/x.js': 'needle',
  'src/c.txt': 'nada aqui',
});

describe('SearchService.query — debounce + última vence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('só dispara após 250 ms; emite started → progress → finished e chama onResult', async () => {
    const svc = new SearchService(seed()); const evs: string[] = []; svc.onEvent((e) => evs.push(e.type));
    const onResult = vi.fn();
    svc.query({ root: ROOT, query: { pattern: 'needle' }, onResult });
    await vi.advanceTimersByTimeAsync(249);
    expect(evs).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(evs).toEqual(['search.started', 'search.progress', 'search.finished']);
    expect(onResult).toHaveBeenCalledTimes(1);
    const r = onResult.mock.calls[0][0];
    expect(r.fileCount).toBe(2); expect(r.matches).toHaveLength(3); expect(r.truncated).toBe(false);
    expect(r.matches.some((m: { uri: string }) => m.uri.includes('node_modules'))).toBe(false);
  });

  it('segunda query dentro do debounce cancela a primeira (search.cancelled) — só a última roda', async () => {
    const svc = new SearchService(seed()); const evs: ExplorerSearchEvent[] = []; svc.onEvent((e) => evs.push(e));
    const h1 = svc.query({ root: ROOT, query: { pattern: 'need' } });
    await vi.advanceTimersByTimeAsync(100);
    const h2 = svc.query({ root: ROOT, query: { pattern: 'needle' } });
    await vi.advanceTimersByTimeAsync(300);
    const types = evs.map((e) => `${e.type}:${'id' in e ? e.id : ''}`);
    expect(types).toContain(`search.cancelled:${h1.id}`);
    expect(types.filter((t) => t.startsWith('search.started'))).toEqual([`search.started:${h2.id}`]);
  });

  it('cancel() do handle antes de rodar → cancelled e nenhum started; onResult não chamado', async () => {
    const svc = new SearchService(seed()); const evs: string[] = []; svc.onEvent((e) => evs.push(e.type)); const onResult = vi.fn();
    const h = svc.query({ root: ROOT, query: { pattern: 'needle' }, onResult }); h.cancel();
    await vi.advanceTimersByTimeAsync(500);
    expect(evs).toEqual(['search.cancelled']); expect(onResult).not.toHaveBeenCalled();
  });

  it('regex inválida → evento error code invalid_query (sem exceção síncrona)', async () => {
    const svc = new SearchService(seed()); const evs: ExplorerSearchEvent[] = []; svc.onEvent((e) => evs.push(e));
    svc.query({ root: ROOT, query: { pattern: '(', isRegExp: true } });
    await vi.advanceTimersByTimeAsync(300);
    expect(evs.find((e) => e.type === 'error')).toMatchObject({ code: 'invalid_query' });
  });

  it('usa o transporte do fs quando ele tem searchText (BrowserFsPort) — duck typing', async () => {
    const fs = seed() as MemFs & { searchText?: unknown };
    const searchText = vi.fn(async () => ({ matches: [], fileCount: 0, matchCount: 0, filesScanned: 9, truncated: false }));
    fs.searchText = searchText;
    expect(hasSearchTransport(fs)).toBe(true);
    const svc = new SearchService(fs);
    svc.query({ root: ROOT, query: { pattern: 'x', include: '*.md' } });
    await vi.advanceTimersByTimeAsync(300);
    expect(searchText).toHaveBeenCalledWith(expect.objectContaining({ root: ROOT, query: expect.objectContaining({ include: '*.md' }), maxResults: 2000, maxFiles: 500, signal: expect.any(AbortSignal) }));
  });
});

describe('SearchService.replaceAll — atômico, falha isolada, evento', () => {
  it('substitui 3 ocorrências em 2 arquivos via writeFile(atomic) e emite replaceApplied', async () => {
    const fs = seed(); const svc = new SearchService(fs, { debounceMs: 0 }); const evs: ExplorerSearchEvent[] = []; svc.onEvent((e) => evs.push(e));
    const r = await svc.replaceAll({ root: ROOT, query: { pattern: 'needle' }, replacement: 'agulha' });
    expect(r).toMatchObject({ files: 2, replacements: 3, failures: [] });
    expect(fs.files.get(`${ROOT}/src/a.ts`)).toBe('const agulha = 1;\nagulha();\n');
    expect(fs.files.get(`${ROOT}/b.md`)).toBe('# agulha\n');
    expect(fs.files.get(`${ROOT}/node_modules/x.js`)).toBe('needle');
    expect(fs.writes.every((w) => w.atomic)).toBe(true);
    expect(evs.find((e) => e.type === 'search.replaceApplied')).toMatchObject({ files: 2, replacements: 3 });
  });
  it('falha em 1 arquivo não impede os outros e volta em failures', async () => {
    const fs = seed(); fs.failWrite.add(`${ROOT}/b.md`); const svc = new SearchService(fs, { debounceMs: 0 });
    const r = await svc.replaceAll({ root: ROOT, query: { pattern: 'needle' }, replacement: 'x' });
    expect(r.files).toBe(1); expect(r.replacements).toBe(2);
    expect(r.failures).toEqual([{ uri: `${ROOT}/b.md`, message: 'EACCES' }]);
    expect(fs.files.get(`${ROOT}/b.md`)).toBe('# needle\n');
  });
  it('respeita case/word/regex com grupos $1 só em modo regex', async () => {
    const fs = seed(); const svc = new SearchService(fs, { debounceMs: 0 });
    await svc.replaceAll({ root: ROOT, query: { pattern: 'need(le)', isRegExp: true, isCaseSensitive: true }, replacement: 'X$1' });
    expect(fs.files.get(`${ROOT}/src/a.ts`)).toBe('const Needle = 1;\nXle();\n');
  });
});

describe('textMatcher.replaceInContent + model', () => {
  it('literal: $ na replacement é texto cru; preserva \\r\\n', () => {
    const c = compileSearchQuery({ pattern: 'a' });
    expect(replaceInContent('a\r\nA\n', c, '$&$1', false)).toEqual({ content: '$&$1\r\n$&$1\n', count: 2 });
  });
  it('groupMatchesByFile: nome + pasta relativa + ordem de chegada', () => {
    const g = groupMatchesByFile([
      { uri: `${ROOT}/src/a.ts` as WorkspaceUri, line: 1, column: 1, preview: '' },
      { uri: `${ROOT}/b.md` as WorkspaceUri, line: 1, column: 1, preview: '' },
      { uri: `${ROOT}/src/a.ts` as WorkspaceUri, line: 2, column: 1, preview: '' },
    ], ROOT);
    expect(g.map((x) => [x.name, x.folder, x.matches.length])).toEqual([['a.ts', 'src', 2], ['b.md', '', 1]]);
  });
  it('formatResultsMessage: plural do VS Code + truncated', () => {
    expect(formatResultsMessage(1, 1)).toBe('1 result in 1 file');
    expect(formatResultsMessage(14, 7)).toBe('14 results in 7 files');
    expect(formatResultsMessage(2000, 3, true)).toBe('2000 results in 3 files - Results are limited');
  });
});

describe('c5 — replaceMatchesInContent / replacementFor / SearchService.replaceMatches', () => {
  const q = (pattern: string, extra: Record<string, boolean> = {}) => compileSearchQuery({ pattern, ...extra });

  it('troca SÓ as ocorrências listadas (line/column 1-based), da direita para a esquerda na mesma linha', () => {
    const r = replaceMatchesInContent('a needle needle needle\nneedle\n', q('needle'), 'X', false, [{ line: 1, column: 3 }, { line: 1, column: 17 }]);
    expect(r).toEqual({ content: 'a X needle X\nneedle\n', count: 2, missed: 0 });
  });

  it('ocorrência que não casa mais na coluna (arquivo mudou) é ignorada e contada em missed; CRLF preservado', () => {
    const r = replaceMatchesInContent('foo needle\r\nbar\r\n', q('needle'), 'X', false, [{ line: 1, column: 5 }, { line: 1, column: 1 }, { line: 9, column: 1 }]);
    expect(r).toEqual({ content: 'foo X\r\nbar\r\n', count: 1, missed: 2 });
  });

  it('regex: $1 expande; literal: $ é texto cru; preserveCase copia caixa da ocorrência', () => {
    expect(replacementFor('needle42', q('needle(\\d+)', { isRegExp: true }), 'n$1', true)).toBe('n42');
    expect(replacementFor('needle', q('needle'), '$1', false)).toBe('$1');
    expect(replacementFor('NEEDLE', q('needle'), 'pin', false, true)).toBe('PIN');
    expect(replacementFor('Needle', q('needle'), 'pin', false, true)).toBe('Pin');
    expect(replacementFor('needle', q('needle'), 'PIN', false, true)).toBe('pin');
  });

  it('SearchService.replaceMatches grava só os arquivos afetados (atômico), emite replaceApplied e devolve resumo', async () => {
    const fs = seed(); const svc = new SearchService(fs); const evs: ExplorerSearchEvent[] = []; svc.onEvent((e) => evs.push(e));
    const r = await svc.replaceMatches({ query: { pattern: 'needle' }, replacement: 'pin', matches: [{ uri: `${ROOT}/src/a.ts` as WorkspaceUri, line: 2, column: 1, preview: 'needle();' }] });
    expect(r).toEqual({ files: 1, replacements: 1, failures: [], missed: 0 });
    expect(fs.files.get(`${ROOT}/src/a.ts`)).toBe('const Needle = 1;\npin();\n');
    expect(fs.files.get(`${ROOT}/b.md`)).toBe('# needle\n');
    expect(fs.writes).toHaveLength(1); expect(fs.writes[0].atomic).toBe(true);
    expect(evs.at(-1)).toEqual({ type: 'search.replaceApplied', files: 1, replacements: 1 });
  });
});
