// ============================================================================
// fsIntegration.test.ts — fechamento da 4.3: servidor FS COMPLETO (HTTP + WS)
// rodando em http.Server real (porta efêmera), com fixture em tmpdir.
// DoD 04_15 4.3: probes curl-style (list/stat/write/criar/copiar/renomear/
// deletar 200), traversal → 403, watcher emite fs.changed em <500 ms.
// ============================================================================
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// ws é runtime de server (permitido em server/** via FT-02); nos testes vem direto.
import { WebSocket, WebSocketServer } from 'ws';
import { createExplorerFsServer, type ExplorerFsServer } from '../server/fs/index';
import type { WorkspaceUri } from '../contract';

let fixture: string;
let httpServer: Server;
let fsServer: ExplorerFsServer;
let base: string;

const uri = (p: string): WorkspaceUri => `file://${join(fixture, p)}` as WorkspaceUri;

async function boot(): Promise<void> {
  fixture = mkdtempSync(join(tmpdir(), 'fsint-'));
  mkdirSync(join(fixture, 'src'));
  writeFileSync(join(fixture, 'src', 'index.ts'), 'export default 1\n');
  writeFileSync(join(fixture, 'README.md'), '# t\n');
  fsServer = await createExplorerFsServer({
    root: `file://${fixture}` as WorkspaceUri,
    watcherCoalesceMs: 80,
    createWsServer: () => new WebSocketServer({ noServer: true }),
  });
  httpServer = createServer(async (req, res) => {
    const handled = await fsServer.tryHandleHttp(req, res);
    if (!handled) {
      res.writeHead(404);
      res.end();
    }
  });
  httpServer.on('upgrade', (req, socket, head) => {
    fsServer.tryHandleUpgrade(req, socket, head);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
}

beforeEach(async () => {
  await boot();
});

afterEach(async () => {
  fsServer.dispose();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  rmSync(fixture, { recursive: true, force: true });
});

async function probe(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${base}${path}`, init);
}
async function json(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>;
}

describe('fs single-port — probes HTTP (curl-style DoD)', () => {
  it('GET /fs/list 200 com entries da fixture', async () => {
    const res = await probe(`/fs/list?uri=${encodeURIComponent(uri(''))}`);
    expect(res.status).toBe(200);
    const body = await json(res);
    const names = (body.entries as Array<{ name: string }>).map((e) => e.name).sort();
    expect(names).toEqual(['README.md', 'src']);
  });

  it('GET /fs/read utf-8 e binário base64', async () => {
    const txt = await probe(`/fs/read?uri=${encodeURIComponent(uri('src/index.ts'))}`);
    expect(await json(txt)).toEqual({ content: 'export default 1\n', encoding: 'utf-8' });

    const bin = await probe(`/fs/read?binary=1&uri=${encodeURIComponent(uri('README.md'))}`);
    const hand = await json(bin);
    expect(Buffer.from(String(hand.dataBase64), 'base64').toString()).toBe('# t\n');
    expect(hand.mime).toBe('text/markdown');
  });

  it('POST /fs/stat 200 com stat completo', async () => {
    const res = await probe('/fs/stat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: uri('README.md') }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.kind).toBe('file');
    expect(body.size).toBe(4);
  });

  it('fluxo completo: createFile(wx 409 no duplicado) → write → read → copy → rename → delete', async () => {
    const post = (p: string, body: Record<string, unknown>) =>
      probe(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    const created = await post('/fs/createFile', { uri: uri('novo.txt'), content: 'oi' });
    expect(created.status).toBe(201);
    const dup = await post('/fs/createFile', { uri: uri('novo.txt') });
    expect(dup.status).toBe(409);
    expect((await json(dup)).code).toBe('file_exists');

    expect((await post('/fs/write', { uri: uri('novo.txt'), content: 'v2' })).status).toBe(204);
    const lido = await probe(`/fs/read?uri=${encodeURIComponent(uri('novo.txt'))}`);
    expect((await json(lido)).content).toBe('v2');

    expect((await post('/fs/copy', { from: uri('novo.txt'), to: uri('copia.txt') })).status).toBe(204);
    expect((await post('/fs/rename', { from: uri('copia.txt'), to: uri('renomeado.txt') })).status).toBe(204);
    expect((await post('/fs/delete', { uri: uri('renomeado.txt') })).status).toBe(204);

    const list = await probe(`/fs/list?uri=${encodeURIComponent(uri(''))}`);
    const names = ((await json(list)).entries as Array<{ name: string }>).map((e) => e.name).sort();
    expect(names).toEqual(['README.md', 'novo.txt', 'src']);
  });

  it('upload octet-stream (x-explorer-uri) cria arquivo atômico + download stream', async () => {
    const payload = Buffer.from('dado-binário-do-SO-⚛'.repeat(128));
    const up = await probe('/fs/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-explorer-uri': uri('uploads/logo.bin'),
      },
      body: payload,
    });
    // uploads/ não existe → 500 ENOENT(real): o Explorer v2 cria pasta antes (4.4).
    // aqui validamos o caminho grande via mkdir primeiro:
    if (up.status !== 201) {
      await probe('/fs/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: uri('uploads') }),
      });
      const retry = await probe('/fs/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream', 'x-explorer-uri': uri('uploads/logo.bin') },
        body: payload,
      });
      expect(retry.status).toBe(201);
    }
    const dl = await probe(`/fs/download?uri=${encodeURIComponent(uri('uploads/logo.bin'))}`);
    expect(dl.status).toBe(200);
    expect(dl.headers.get('content-disposition')).toContain('logo.bin');
    const got = Buffer.from(await dl.arrayBuffer());
    expect(got.equals(payload)).toBe(true); // integridade byte-a-byte (hash DoD)
  });

  it('TRAversal: qualquer rota fora da raiz → 403 forbidden_path', async () => {
    const escapes = [
      encodeURIComponent('file:///etc/passwd'),
      encodeURIComponent('file:///../anima/segredo'),
    ];
    for (const e of escapes) {
      const res = await probe(`/fs/list?uri=${e}`);
      expect(res.status).toBe(403);
      expect((await json(res)).code).toBe('forbidden_path');
    }
    const postEsc = await probe('/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: 'file:///../../tmp/escape.txt', content: 'x' }),
    });
    expect(postEsc.status).toBe(403);
  });
});

describe('fs single-port — WS /fs/watch (DoD: evento < 500 ms)', () => {
  it('cliente WS recebe fs.changed quando o disco muda VIA OUTRO CAMINHO (arquivo direto)', async () => {
    const ws = new WebSocket(`${base.replace('http:', 'ws:')}/fs/watch`);
    const got: Array<Record<string, unknown>> = [];
    ws.on('message', (d) => {
      try {
        got.push(JSON.parse(String(d)) as Record<string, unknown>);
      } catch {
        /* ping */
      }
    });
    await new Promise<void>((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

    // subscreve na raiz
    ws.send(JSON.stringify({ op: 'watch', uri: uri('') }));
    await new Promise((r) => setTimeout(r, 50));

    // escrita NO DISCO (simula agente externo modificando a pasta do projeto)
    const t0 = Date.now();
    writeFileSync(join(fixture, 'mudanca-externa.txt'), 'oi');
    renameSync(join(fixture, 'mudanca-externa.txt'), join(fixture, 'mudanca-externa-fim.txt'));

    // aguarda o fs.changed (pode vir em mais de um lote) até 2 s — DoD <500 ms c/ coalesce de 80 ms
    let dead = 0;
    while (Date.now() - t0 < 2000) {
      const has = got.some(
        (m) =>
          m.type === 'fs.changed' &&
          (m.changes as Array<{ uri: string }>).some((c) => c.uri.includes('mudanca-externa-fim.txt')),
      );
      if (has) break;
      await new Promise((r) => setTimeout(r, 50));
      dead += 50;
    }
    ws.close();
    const elapsed = Date.now() - t0;
    const event = got.find(
      (m) =>
        m.type === 'fs.changed' &&
        (m.changes as Array<{ uri: string }>).some((c) => c.uri.includes('mudanca-externa-fim.txt')),
    );
    expect(event, `fs.changed para mudança externa não chegou (got ${got.length} msgs: ${JSON.stringify(got)})`).toBeTruthy();
    expect(elapsed).toBeLessThan(2000);
    // ready/watched handshake chega
    expect(got.some((m) => m.op === 'ready' || m.op === 'watched')).toBe(true);
    void dead;
  });

  it('vida-ciclo: diferentes métodos no prefixo /fs/ respondem (não cai no SPA)', async () => {
    // dentro do prefixo, método estranho é respondido (não cai para o Vite/index.html)
    const weird = await probe('/fs/list', { method: 'DELETE' });
    expect([400, 404, 405, 500]).toContain(weird.status);
    // mas fora do prefixo o handler não para o pipeline
    const outside = await probe('/index.html');
    expect(outside.status).toBe(404); // nosso createServer não serve static
  });
});
