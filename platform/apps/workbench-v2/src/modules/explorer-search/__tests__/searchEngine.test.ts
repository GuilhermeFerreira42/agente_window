// searchEngine.test.ts — 4.6 c1: engine em fs REAL (tmpdir): matches 1-based,
// excludes congelados, binário/1 MB pulados, truncation, abort, traversal.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WorkspaceUri } from '../contract';
import { matchesInContent, runSearch, type SearchEngineEvent } from '../server/fs/searchEngine';
import { compileSearchQuery, SearchQueryError } from '../core/search/queryBuilder';
import { FsHostError } from '../server/fs/fsHost';

let fx: string; let root: WorkspaceUri;
const collect = async (gen: AsyncGenerator<SearchEngineEvent>) => { const evs: SearchEngineEvent[] = []; for await (const e of gen) evs.push(e); return evs; };
const done = (evs: SearchEngineEvent[]) => evs.find((e) => e.type === 'done') as Extract<SearchEngineEvent, { type: 'done' }>;
const files = (evs: SearchEngineEvent[]) => evs.filter((e) => e.type === 'file') as Extract<SearchEngineEvent, { type: 'file' }>[];

beforeEach(() => {
  fx = mkdtempSync(join(tmpdir(), 'srch-')); root = `file://${fx}` as WorkspaceUri;
  mkdirSync(join(fx, 'src')); mkdirSync(join(fx, 'node_modules', 'dep'), { recursive: true }); mkdirSync(join(fx, '.git'));
  writeFileSync(join(fx, 'src', 'a.ts'), 'const Needle = 1;\r\nneedle();\n// needles needle\n');
  writeFileSync(join(fx, 'b.md'), '# needle\n');
  writeFileSync(join(fx, 'node_modules', 'dep', 'x.js'), 'needle');
  writeFileSync(join(fx, '.git', 'HEAD'), 'needle');
  writeFileSync(join(fx, 'bin.dat'), Buffer.from([0x6e, 0x65, 0x65, 0x64, 0x6c, 0x65, 0x00, 0x01]));
  writeFileSync(join(fx, 'empty.txt'), '');
});
afterEach(() => rmSync(fx, { recursive: true, force: true }));

describe('searchEngine', () => {
  it('encontra matches 1-based com preview da linha (sem \\r); ignora node_modules/.git/binário/vazio', async () => {
    const evs = await collect(runSearch(fx, root, { pattern: 'needle' }));
    const f = files(evs);
    expect(f.map((e) => e.uri.replace(root, ''))).toEqual(['/b.md', '/src/a.ts']);
    const a = f[1].matches;
    expect(a[0]).toMatchObject({ line: 1, column: 7, preview: 'const Needle = 1;' });
    expect(a.map((m) => [m.line, m.column])).toEqual([[1, 7], [2, 1], [3, 4], [3, 12]]);
    expect(done(evs)).toMatchObject({ fileCount: 2, matchCount: 5, truncated: false, cancelled: false, skippedLarge: 0 });
    expect(done(evs).filesScanned).toBe(2);
  });
  it('whole word / case / regex', async () => {
    expect(done(await collect(runSearch(fx, root, { pattern: 'needle', isWholeWord: true }))).matchCount).toBe(4);
    expect(done(await collect(runSearch(fx, root, { pattern: 'Needle', isCaseSensitive: true }))).matchCount).toBe(1);
    expect(done(await collect(runSearch(fx, root, { pattern: 'need\\w+\\(', isRegExp: true }))).matchCount).toBe(1);
  });
  it('include/exclude do usuário', async () => {
    expect(files(await collect(runSearch(fx, root, { pattern: 'needle', include: '*.md' }))).map((e) => e.uri)).toEqual([`${root}/b.md`]);
    expect(files(await collect(runSearch(fx, root, { pattern: 'needle', exclude: 'src' }))).map((e) => e.uri)).toEqual([`${root}/b.md`]);
  });
  it('truncation por maxResults e por maxFiles', async () => {
    let d = done(await collect(runSearch(fx, root, { pattern: 'needle' }, { maxResults: 2 })));
    expect(d).toMatchObject({ truncated: true, matchCount: 2 });
    d = done(await collect(runSearch(fx, root, { pattern: 'needle' }, { maxFiles: 1 })));
    expect(d).toMatchObject({ truncated: true, fileCount: 1 });
  });
  it('arquivo > maxFileBytes é pulado e contado em skippedLarge', async () => {
    writeFileSync(join(fx, 'big.txt'), 'needle '.repeat(20));
    const d = done(await collect(runSearch(fx, root, { pattern: 'needle' }, { maxFileBytes: 50 })));
    expect(d.skippedLarge).toBe(1);
    expect(d.fileCount).toBe(2);
  });
  it('AbortSignal já abortado → done cancelled:true sem arquivos', async () => {
    const ac = new AbortController(); ac.abort();
    const evs = await collect(runSearch(fx, root, { pattern: 'needle' }, { signal: ac.signal }));
    expect(files(evs)).toHaveLength(0);
    expect(done(evs).cancelled).toBe(true);
  });
  it('root fora da raiz → FsHostError forbidden_path; regex inválida → SearchQueryError', async () => {
    await expect(collect(runSearch(fx, 'file:///etc' as WorkspaceUri, { pattern: 'x' }))).rejects.toBeInstanceOf(FsHostError);
    await expect(collect(runSearch(fx, root, { pattern: '(', isRegExp: true }))).rejects.toBeInstanceOf(SearchQueryError);
  });
  it('matchesInContent: regex que casa vazio não trava e não gera match', () => {
    const c = compileSearchQuery({ pattern: 'z*', isRegExp: true });
    expect(matchesInContent('abc\nzz', c, 100, 'file:///x' as WorkspaceUri)).toEqual([{ uri: 'file:///x', line: 2, column: 1, preview: 'zz' }]);
  });
});
