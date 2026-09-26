// ============================================================================
// sessao_13_search_backend.spec.ts — FATIA-04 · 4.6 c1 (search-engine)
// Probes contra o DEV SERVER REAL com fixture isolada (5175, FS_TEST_ROOT).
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test sessao_13_search_backend
// Cobre POST /fs/search (04_19 §3 c1): matches {uri,line,column,preview},
// case/word/regex, include/exclude glob, excludes congelados (node_modules),
// regex inválida → 400 invalid_query, truncation, NDJSON streaming, 400 sem pattern.
// ============================================================================
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

const FS_PREFIX = 'file:///tmp/explorer-fs-fixture';
const F = (p: string): string => `${FS_PREFIX}/${p.replace(/^\/+/, '')}`;
const ROOT = F('e2e-fixture-root');

type Match = { uri: string; line: number; column: number; preview: string };
type Result = { matches: Match[]; fileCount: number; matchCount: number; truncated: boolean; filesScanned: number };

async function search(request: import('@playwright/test').APIRequestContext, query: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return request.post(`${BASE_URL}/fs/search`, { data: { root: ROOT, query, ...extra } });
}

test.describe('FATIA-04 · 4.6 c1 — POST /fs/search (engine no Single Port)', () => {
  test.beforeAll(async ({ request }) => {
    // semente própria da 4.6 (idempotente: 409 se já existe)
    const put = async (p: string, content: string) => {
      const r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: F(p), content } });
      if (r.status() === 409) await request.post(`${BASE_URL}/fs/write`, { data: { uri: F(p), content } });
    };
    await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: F('e2e-fixture-root/srch') } });
    await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: F('e2e-fixture-root/srch/node_modules') } });
    await put('e2e-fixture-root/srch/a.ts', 'const Needle = 1;\nneedle();\n// needles are not needle\n');
    await put('e2e-fixture-root/srch/b.md', '# needle doc\n\nsecond needle line\n');
    await put('e2e-fixture-root/srch/node_modules/x.js', 'needle in node_modules\n');
  });

  test('busca básica: matches agrupáveis com uri/line/column(1-based)/preview; node_modules ignorado', async ({ request }) => {
    const res = await search(request, { pattern: 'needle' });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as Result;
    expect(body.truncated).toBe(false);
    const uris = [...new Set(body.matches.map((m) => m.uri))].sort();
    expect(uris).toEqual([F('e2e-fixture-root/srch/a.ts'), F('e2e-fixture-root/srch/b.md')]);
    expect(body.fileCount).toBe(2);
    // a.ts: "Needle" l1c7, "needle()" l2c1, "needles"+"needle" l3 → 4 ; b.md → 2
    expect(body.matchCount).toBe(6);
    const first = body.matches.find((m) => m.uri.endsWith('/a.ts'))!;
    expect(first).toMatchObject({ line: 1, column: 7 });
    expect(first.preview).toContain('Needle');
    expect(body.matches.some((m) => m.uri.includes('node_modules'))).toBe(false);
    expect(body.filesScanned).toBeGreaterThanOrEqual(2);
  });

  test('toggles: isCaseSensitive / isWholeWord / isRegExp', async ({ request }) => {
    let body = (await (await search(request, { pattern: 'Needle', isCaseSensitive: true })).json()) as Result;
    expect(body.matchCount).toBe(1);
    body = (await (await search(request, { pattern: 'needle', isWholeWord: true })).json()) as Result;
    // a.ts: Needle(l1) needle(l2) needle(l3 último) = 3 ; b.md 2 → 5 (exclui "needles")
    expect(body.matchCount).toBe(5);
    body = (await (await search(request, { pattern: 'need\\w+\\(', isRegExp: true })).json()) as Result;
    expect(body.matchCount).toBe(1);
    expect(body.matches[0]).toMatchObject({ line: 2, column: 1 });
  });

  test('include/exclude glob (sintaxe do VS Code: "*.md, src/**")', async ({ request }) => {
    let body = (await (await search(request, { pattern: 'needle', include: '*.md' })).json()) as Result;
    expect(body.fileCount).toBe(1);
    expect(body.matches[0].uri).toBe(F('e2e-fixture-root/srch/b.md'));
    body = (await (await search(request, { pattern: 'needle', exclude: '**/*.md' })).json()) as Result;
    expect(body.matches.every((m) => !m.uri.endsWith('.md'))).toBe(true);
    body = (await (await search(request, { pattern: 'needle', include: 'srch/**' })).json()) as Result;
    expect(body.fileCount).toBe(2);
  });

  test('truncation: maxResults=1 → truncated:true e só 1 match', async ({ request }) => {
    const body = (await (await search(request, { pattern: 'needle' }, { maxResults: 1 })).json()) as Result;
    expect(body.truncated).toBe(true);
    expect(body.matches.length).toBe(1);
  });

  test('erros: regex inválida → 400 invalid_query; sem pattern → 400; root fora da raiz → 403', async ({ request }) => {
    let r = await search(request, { pattern: '(', isRegExp: true });
    expect(r.status()).toBe(400);
    expect((await r.json()).code).toBe('invalid_query');
    r = await search(request, { pattern: '' });
    expect(r.status()).toBe(400);
    r = await request.post(`${BASE_URL}/fs/search`, { data: { root: 'file:///etc', query: { pattern: 'root' } } });
    expect(r.status()).toBe(403);
  });

  test('streaming NDJSON (Accept: application/x-ndjson): 1 linha por arquivo + linha final {done}', async ({ request }) => {
    const r = await request.post(`${BASE_URL}/fs/search`, { data: { root: ROOT, query: { pattern: 'needle' } }, headers: { accept: 'application/x-ndjson' } });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toContain('application/x-ndjson');
    const lines = (await r.text()).trim().split('\n').map((l) => JSON.parse(l));
    const files = lines.filter((l) => l.type === 'file');
    const done = lines.find((l) => l.type === 'done');
    expect(files.length).toBe(2);
    expect(done).toMatchObject({ fileCount: 2, matchCount: 6, truncated: false });
  });
});
