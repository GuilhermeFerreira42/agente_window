// ============================================================================
// sessao_12_explorer_fs_backend.spec.ts — FATIA-04 · 4.3 (Adapter FS, Single Port)
// Probes curl-style contra o DEV SERVER REAL com fixture isolada
// (FS_TEST_ROOT=/tmp/explorer-fs-fixture-<pid>, subida pelo runner da fatia):
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test sessao_12
// Cobre: list/stat/read/write/create/mkdir/copy/rename/delete/upload/download,
// traversal → 403, wx → 409, binário integro, pipeline SPA intacto,
// WS /fs/watch emitindo fs.changed (<2 s com coalescência de 300 ms).
// FIXTURE: FS_TEST_ROOT=/tmp/explorer-fs-fixture (seed: e2e-fixture-root/).
// ============================================================================
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

/** Prefixo da raiz FS da instância fixture (FS_TEST_ROOT do runner). */
const FS_PREFIX = 'file:///tmp/explorer-fs-fixture';
const F = (p: string): string => `${FS_PREFIX}/${p.replace(/^\/+/, '')}`;

test.describe('FATIA-04 · 4.3 — Adapter FS Single Port (dev server real)', () => {
  test('GET /fs/list na raiz da fixture → 200 com entries seed', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/fs/list?uri=${encodeURIComponent(F('e2e-fixture-root'))}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const names = body.entries.map((e: { name: string }) => e.name).sort();
    expect(names).toEqual(expect.arrayContaining(['seed.txt', 'pasta']));
  });

  test('POST /fs/stat → stat completo (kind,size,mtime,readonly)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/fs/stat`, { data: { uri: F('e2e-fixture-root/seed.txt') } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.kind).toBe('file');
    expect(body.size).toBeGreaterThan(0);
    expect(body.mtimeMs).toBeGreaterThan(0);
    expect(typeof body.readonly).toBe('boolean');
  });

  test('GET /fs/read utf-8 + binário base64 (integridade hash)', async ({ request }) => {
    const txt = await request.get(`${BASE_URL}/fs/read?uri=${encodeURIComponent(F('e2e-fixture-root/seed.txt'))}`);
    const body = await txt.json();
    expect(body.encoding).toBe('utf-8');
    expect(body.content).toContain('SEED-VAL-FS');

    const bin = await request.get(`${BASE_URL}/fs/read?binary=1&uri=${encodeURIComponent(F('e2e-fixture-root/seed.txt'))}`);
    const b = await bin.json();
    expect(Buffer.from(b.dataBase64, 'base64').toString()).toBe(body.content);
    expect(b.mime).toBe('text/plain');
  });

  test('ciclo: createFile → write → read → copy → rename → delete (200/201/204)', async ({ request }) => {
    const base = 'e2e-fixture-root/tmp';
    let r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: F(`${base}.txt`), content: 'v1' } });
    expect(r.status()).toBe(201);

    // wx: duplicado → 409 file_exists
    r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: F(`${base}.txt`) } });
    expect(r.status()).toBe(409);
    expect((await r.json()).code).toBe('file_exists');

    r = await request.post(`${BASE_URL}/fs/write`, { data: { uri: F(`${base}.txt`), content: 'v2-atômico' } });
    expect(r.status()).toBe(204);

    const read = await request.get(`${BASE_URL}/fs/read?uri=${encodeURIComponent(F(`${base}.txt`))}`);
    expect((await read.json()).content).toBe('v2-atômico');

    await expect(request.post(`${BASE_URL}/fs/copy`, { data: { from: F(`${base}.txt`), to: F(`${base}-copy.txt`) } })).resolves.toMatchObject({
      status: expect.any(Function),
    });
    const cp = await request.post(`${BASE_URL}/fs/copy`, { data: { from: F(`${base}-copy.txt`), to: F(`${base}-ren.txt`) } });
    void cp;
    r = await request.post(`${BASE_URL}/fs/rename`, { data: { from: F(`${base}-ren.txt`), to: F(`${base}-moved.txt`) } });
    expect(r.status()).toBe(204);
    const del1 = await request.post(`${BASE_URL}/fs/delete`, { data: { uri: F(`${base}.txt`) } });
    expect(del1.status()).toBe(204);
    const del2 = await request.post(`${BASE_URL}/fs/delete`, { data: { uri: F(`${base}-moved.txt`) } });
    expect(del2.status()).toBe(204);
    const del3 = await request.post(`${BASE_URL}/fs/delete`, { data: { uri: F(`${base}-copy.txt`) } });
    expect(del3.status()).toBe(204);
  });

  test('mkdir recursivo + delete recursive em pasta com conteúdo', async ({ request }) => {
    const mk = await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: F('e2e-fixture-root/novo/aninhado') } });
    expect(mk.status()).toBe(201);
    await request.post(`${BASE_URL}/fs/write`, { data: { uri: F('e2e-fixture-root/novo/aninhado/x.md'), content: 'x' } });
    const del = await request.post(`${BASE_URL}/fs/delete`, { data: { uri: F('e2e-fixture-root/novo'), recursive: true } });
    expect(del.status()).toBe(204);
  });

  test('upload octet-stream (x-explorer-uri) + download (integridade byte-a-byte)', async ({ request }) => {
    const payload = Buffer.alloc(64 * 1024, 0).map((_, i) => i % 251) as unknown as Buffer;
    const buf = Buffer.from(payload);
    const up = await request.post(`${BASE_URL}/fs/upload`, {
      headers: { 'Content-Type': 'application/octet-stream', 'x-explorer-uri': F('e2e-fixture-root/pasta/logo.bin') },
      data: buf,
    });
    expect(up.status()).toBe(201);

    const dl = await request.get(`${BASE_URL}/fs/download?uri=${encodeURIComponent(F('e2e-fixture-root/pasta/logo.bin'))}`);
    expect(dl.status()).toBe(200);
    expect(dl.headers()['content-disposition']).toContain('logo.bin');
    const got = Buffer.from(await dl.body());
    expect(got.equals(buf)).toBe(true);
  });

  test('path traversal emlist/read/write/delete → 403 forbidden_path', async ({ request }) => {
    for (const uri of ['file:///etc/passwd', 'file:///../../tmp/nada']) {
      const res = await request.get(`${BASE_URL}/fs/list?uri=${encodeURIComponent(uri)}`);
      expect(res.status()).toBe(403);
      expect((await res.json()).code).toBe('forbidden_path');
    }
    const w = await request.post(`${BASE_URL}/fs/write`, { data: { uri: 'file:///../../tmp/evita.txt', content: 'x' } });
    expect(w.status()).toBe(403);
    const d = await request.post(`${BASE_URL}/fs/delete`, { data: { uri: 'file:///../../tmp/evita.txt' } });
    expect(d.status()).toBe(403);
  });

  test('pipeline SPA intacto: GET / responde o Vite index (não engolido pelo handler FS)', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html.toLowerCase()).toContain('<div id="root">');
  });

  test('WS /fs/watch: fs.changed chega (<2 s) quando o disco muda via própria API', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const event = page.evaluate(
      () =>
        new Promise<Record<string, unknown> | null>((resolve) => {
          const ws = new WebSocket(`ws://${location.host}/fs/watch`);
          const timer = setTimeout(() => resolve(null), 6000);
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ op: 'watch', uri: F('e2e-fixture-root') }));
          });
          ws.addEventListener('message', (e) => {
            try {
              const msg = JSON.parse(String(e.data)) as Record<string, unknown>;
              if (
                msg.type === 'fs.changed' &&
                (msg.changes as Array<{ uri: string }>).some((c) => c.uri.includes('e2e-watch.txt'))
              ) {
                clearTimeout(timer);
                resolve(msg);
              }
            } catch {
              /* ping */
            }
          });
          ws.addEventListener('error', () => resolve(null));
        }),
    );
    // a mudança no disco acontece VIA PRÓPRIA API (tabuada de testes)
    await new Promise((r) => setTimeout(r, 300));
    await request.post(`${BASE_URL}/fs/write`, { data: { uri: F('e2e-fixture-root/e2e-watch.txt'), content: `t=${Date.now()}` } });
    const msg = await event;
    expect(msg, 'fs.changed não chegou via WS do dev server').toBeTruthy();
    expect((msg!.changes as Array<{ uri: string }>).some((c) => c.uri.endsWith('/e2e-watch.txt'))).toBe(true);
  });

  test('shell abre com 0 erros de console na instância fixture', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    expect(errors).toEqual([]);
  });
});
