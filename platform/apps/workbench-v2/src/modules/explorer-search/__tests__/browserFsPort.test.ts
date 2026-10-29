// ============================================================================
// browserFsPort.test.ts — adapter client do Single Port: verifica mapeamento
// endpoint↔método, encoding de URI, propagação de code/status em erro, e
// delegação de watch/onEvent ao WatchClient. fetch 100% stub.
// ============================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserFsPort, BrowserFsError } from '../core/fs/browserFsPort';
import { ExplorerItem } from '../core/explorerModel';
import { TreeState } from '../core/treeState';
import type { ExplorerFsWatchClient } from '../core/watchClient';
import type { WorkspaceUri } from '../contract';

const U = (p: string) => `file:///ws/${p}` as WorkspaceUri;

interface FetchRec {
  url: string;
  init?: RequestInit;
}

let fetchRecs: FetchRec[];
let fetchImpl: (url: string, init?: RequestInit) => Promise<Response>;
let watchClientStub: {
  watch: (uri: WorkspaceUri) => string;
  onEvent: (cb: (e: unknown) => void) => () => void;
};
let watchCalls: WorkspaceUri[];
let port: BrowserFsPort;

function okJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  fetchRecs = [];
  watchCalls = [];
  fetchImpl = async () => okJson({});
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    fetchRecs.push({ url, init });
    return fetchImpl(url, init);
  });
  watchClientStub = {
    watch: (uri: WorkspaceUri) => {
      watchCalls.push(uri);
      return 'w-99';
    },
    onEvent: (cb: (e: unknown) => void) => {
      void cb;
      return () => {};
    },
  };
  port = new BrowserFsPort({ watchClient: watchClientStub as unknown as ExplorerFsWatchClient });
});

describe('browserFsPort — mapeamento endpoint↔método (04_10 §2.1/04_15 4.3)', () => {
  it('list/stat/read com URI encodeURIComponent', async () => {
    fetchImpl = async () => okJson({ entries: [{ uri: U('a.txt'), name: 'a.txt', kind: 'file' }] });
    const entries = await port.list({ uri: U('dir com espaço') });
    expect(entries).toHaveLength(1);
    expect(fetchRecs[0].url).toBe(`/fs/list?uri=${encodeURIComponent(U('dir com espaço'))}`);
    expect(fetchRecs[0].init?.method ?? 'GET').toBe('GET');

    fetchImpl = async () => okJson({ uri: U('a.txt'), size: 3, mtimeMs: 1, readonly: false, kind: 'file' });
    const st = await port.stat({ uri: U('a.txt') });
    expect(st.size).toBe(3);
    expect(fetchRecs[1].init?.method).toBe('POST');
    expect(JSON.parse(String(fetchRecs[1].init?.body))).toEqual({ uri: U('a.txt') });

    fetchImpl = async () => okJson({ content: 'x', encoding: 'utf-8' });
    const rf = await port.readFile({ uri: U('a.txt') });
    expect(rf.content).toBe('x');
    expect(fetchRecs[2].url).toBe(`/fs/read?uri=${encodeURIComponent(U('a.txt'))}`);
  });

  it('coalesces concurrent stat calls into bounded 64-item transport batches', async () => {
    fetchImpl = async (url, init) => {
      if (!url.endsWith('/fs/statBatch')) return okJson({ uri: U('single'), size: 1, mtimeMs: 1, readonly: false, kind: 'file' });
      const uris = (JSON.parse(String(init?.body)) as { uris: WorkspaceUri[] }).uris;
      return okJson({ results: uris.map((uri) => ({
        ok: true,
        stat: { uri, size: 1, mtimeMs: 1, readonly: false, kind: 'file' },
      })) });
    };
    const stats = await Promise.all(Array.from({ length: 100 }, (_, index) => port.stat({ uri: U(`file-${index}.txt`) })));

    expect(stats).toHaveLength(100);
    const batches = fetchRecs.filter((record) => record.url.endsWith('/fs/statBatch'));
    expect(batches).toHaveLength(2);
    expect(JSON.parse(String(batches[0].init?.body)).uris).toHaveLength(64);
    expect(JSON.parse(String(batches[1].init?.body)).uris).toHaveLength(36);
  });

  it('preserves per-URI errors in a stat batch without failing successful siblings', async () => {
    fetchImpl = async () => okJson({ results: [
      { ok: true, stat: { uri: U('ok.txt'), size: 1, mtimeMs: 1, readonly: false, kind: 'file' } },
      { ok: false, code: 'file_not_found', message: 'gone', status: 404 },
    ] });
    const results = await Promise.allSettled([
      port.stat({ uri: U('ok.txt') }),
      port.stat({ uri: U('gone.txt') }),
    ]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'file_not_found', status: 404 } });
  });

  it('TreeState descarta resultado de statBatch já iniciado após avançar a geração', async () => {
    const rootUri = U('root');
    let listCalls = 0;
    let announceOldBatch!: () => void;
    let releaseOldBatch!: () => void;
    const oldBatchStarted = new Promise<void>((resolve) => { announceOldBatch = resolve; });
    const oldBatchGate = new Promise<void>((resolve) => { releaseOldBatch = resolve; });
    const statResult = (uri: WorkspaceUri) => ({ ok: true, stat: { uri, size: 1, mtimeMs: 1, readonly: false, kind: 'file' as const } });
    fetchImpl = async (url, init) => {
      if (url.startsWith('/fs/list?')) {
        listCalls++;
        const names = listCalls === 1 ? ['old-a.txt', 'old-b.txt'] : ['new-a.txt', 'new-b.txt'];
        return okJson({ entries: names.map((name) => ({ uri: U(`root/${name}`), name, kind: 'file' })) });
      }
      const uris = (JSON.parse(String(init?.body)) as { uris: WorkspaceUri[] }).uris;
      if (uris.some((uri) => uri.endsWith('old-a.txt'))) {
        announceOldBatch();
        await oldBatchGate;
      }
      return okJson({ results: uris.map(statResult) });
    };
    const tree = new TreeState(port, () => 'default');
    const root = new ExplorerItem({ uri: rootUri, kind: 'directory' });
    const obsolete = tree.ensureResolved(root);
    await oldBatchStarted;

    const generation = tree.beginGeneration();
    await tree.ensureResolved(root, generation);
    expect([...root.children.keys()].sort()).toEqual(['new-a.txt', 'new-b.txt']);
    releaseOldBatch();
    expect(await obsolete).toEqual([]);
    expect([...root.children.keys()].sort()).toEqual(['new-a.txt', 'new-b.txt']);
  });

  it('readFileBinary adiciona binary=1 e maxBytes; sem maxBytes omite o parâmetro', async () => {
    fetchImpl = async () => okJson({ dataBase64: 'YWJj', mime: 'text/plain' });
    const b = await port.readFileBinary({ uri: U('f.png'), maxBytes: 12 });
    expect(b.dataBase64).toBe('YWJj');
    expect(fetchRecs[0].url).toBe(`/fs/read?binary=1&maxBytes=12&uri=${encodeURIComponent(U('f.png'))}`);

    await port.readFileBinary({ uri: U('f.png') });
    expect(fetchRecs[1].url).toBe(`/fs/read?binary=1&uri=${encodeURIComponent(U('f.png'))}`);
  });

  it('write/createFile/mkdir/copy/rename/delete/upload-mapping (POST json)', async () => {
    fetchImpl = async (url) => (url.endsWith('/createFile') || url.endsWith('/mkdir') ? okJson({}, 201) : new Response(null, { status: 204 }));
    await port.writeFile({ uri: U('a'), content: 'c', atomic: true });
    expect(fetchRecs[0].url).toBe('/fs/write');
    expect(JSON.parse(String(fetchRecs[0].init?.body))).toEqual({ uri: U('a'), content: 'c' });

    await port.createFile({ uri: U('n'), content: 'x' });
    expect(fetchRecs[1].url).toBe('/fs/createFile');

    await port.createFolder({ uri: U('d') });
    expect(fetchRecs[2].url).toBe('/fs/mkdir');

    await port.copy({ from: U('a'), to: U('b') });
    expect(fetchRecs[3].url).toBe('/fs/copy');
    expect(JSON.parse(String(fetchRecs[3].init?.body))).toEqual({ from: U('a'), to: U('b') });

    await port.move({ from: U('a'), to: U('b') });
    expect(fetchRecs[4].url).toBe('/fs/rename');

    await port.remove({ uri: U('a'), recursive: true });
    expect(fetchRecs[5].url).toBe('/fs/delete');
    expect(JSON.parse(String(fetchRecs[5].init?.body))).toEqual({ uri: U('a'), recursive: true });
  });

  it('erro do servidor: code/status propagam como BrowserFsError', async () => {
    fetchImpl = async () => okJson({ code: 'forbidden_path', message: 'proibido' }, 403);
    await expect(port.list({ uri: U('x') })).rejects.toMatchObject({
      name: 'BrowserFsError',
      code: 'forbidden_path',
      status: 403,
    });

    fetchImpl = async () => new Response('servidor quebrou', { status: 500, statusText: 'Internal' });
    await expect(port.stat({ uri: U('x') })).rejects.toMatchObject({
      code: 'io',
      status: 500,
      message: 'Internal',
    });

    fetchImpl = async () => null as never; // resposta 204 sem corpo (delete)
    await expect(port.remove({ uri: U('a') })).rejects.toThrow(); // swallow — fetch astray

    expect(BrowserFsError.prototype instanceof Error).toBe(true);
  });

  it('watch/onEvent delegam ao watchClient (id imediato)', async () => {
    const { watcherId } = await port.watch({ uri: U('src') });
    expect(watcherId).toBe('w-99');
    expect(watchCalls).toEqual([U('src')]);
    const off = port.onEvent(() => {});
    expect(typeof off).toBe('function');
    off();
  });
});
