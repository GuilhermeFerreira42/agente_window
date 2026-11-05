// ============================================================================
// fsWatcher.test.ts — watcher real em tmpdir: criar/rename/remover no disco
// gera `fs.changed` em <500 ms (04_15 4.3 DoD), com coalescência 300 ms e
// filtro de ruído (node_modules/.git/etc.) na emissão.
// ============================================================================
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FsHost } from '../server/fs/fsHost';
import { ExplorerFsWatcher, type FsChangedBatch } from '../server/fs/watcher';
import type { WorkspaceUri } from '../contract';

let fixture: string;
let watcher: ExplorerFsWatcher;

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'fswatch-'));
  watcher = new ExplorerFsWatcher(new FsHost(`file://${fixture}` as WorkspaceUri), { coalesceMs: 80 });
});

afterEach(() => {
  watcher.dispose();
  rmSync(fixture, { recursive: true, force: true });
});

function collect(): { events: FsChangedBatch[]; next: () => Promise<FsChangedBatch> } {
  const events: FsChangedBatch[] = [];
  const waiters: Array<(e: FsChangedBatch) => void> = [];
  watcher.subscribe((e) => {
    events.push(e);
    for (const resolve of waiters.splice(0)) resolve(e);
  });
  return {
    events,
    next: () =>
      new Promise<FsChangedBatch>((resolve, reject) => {
        waiters.push(resolve);
        setTimeout(() => reject(new Error('fs.changed não chegou em 2s')), 2000);
      }),
  };
}

describe('explorerFsWatcher — recursivo sobre a raiz (Node ≥20, Linux)', () => {
  it('instala modo recursivo', () => {
    const mode = watcher.start();
    // em Linux Node 20.20: recursive suportado (fallback cobre hosts exóticos)
    expect(['recursive', 'lazy-per-dir']).toContain(mode);
  });

  it('criar arquivo novo → fs.changed{added} < 500 ms', async () => {
    watcher.start();
    const seen = collect();
    const started = Date.now();
    writeFileSync(join(fixture, 'novo.txt'), 'x');
    const batch = await seen.next();
    expect(Date.now() - started).toBeLessThan(500 + 80);
    const change = batch.changes.find((c) => c.uri.endsWith('/novo.txt'));
    expect(change?.kind).toBe('added');
  });

  it('rename gera removed+added; remover gera removed', async () => {
    writeFileSync(join(fixture, 'velho.txt'), '1');
    watcher.start();
    const seen = collect();
    // aguarda o lote inicial (pode ter ruido das fixture writes anteriores)
    await new Promise((r) => setTimeout(r, 200));

        renameSync(join(fixture, 'velho.txt'), join(fixture, 'novo.txt'));
    await new Promise((r) => setTimeout(r, 300));
    rmSync(join(fixture, 'novo.txt'));
    await new Promise((r) => setTimeout(r, 300));

    const changes = seen.events.flatMap((e) => e.changes);
    const uris = changes.map((c) => `${c.kind}:${c.uri.split('/').pop()}`);
    expect(uris).toContain('removed:velho.txt');
    expect(uris.some((u) => u.endsWith('novo.txt') && (u.startsWith('added') || u.startsWith('chang')))).toBe(true);
    expect(uris).toContain('removed:novo.txt');
  });

  it('coalescência: rajada de 10 escritas em 10 ms → lote único agrupado', async () => {
    watcher.start();
    const seen = collect();
    await new Promise((r) => setTimeout(r, 150));
    const before = seen.events.length;
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(fixture, 'bursta.txt'), `v${i}`);
    }
    await new Promise((r) => setTimeout(r, 350));
    const after = seen.events.length;
    // 10 change events distintos chegaram como POUCOS lotes (1–2), nunca 10
    expect(after - before).toBeLessThanOrEqual(2);
    const names = seen.events.flatMap((e) => e.changes.map((c) => c.uri));
    expect(names.some((u) => u.endsWith('/bursta.txt'))).toBe(true);
  });

  it('filtro de ruído: escrita em node_modules/.git NÃO emite fs.changed', async () => {
    mkdirSync(join(fixture, 'node_modules', 'pkg'), { recursive: true });
    mkdirSync(join(fixture, '.git', 'objects'), { recursive: true });
    watcher.start();
    const seen = collect();
    await new Promise((r) => setTimeout(r, 150));
    const before = seen.events.length;
    writeFileSync(join(fixture, 'node_modules', 'pkg', 'index.js'), 'x');
    writeFileSync(join(fixture, '.git', 'HEAD'), 'x');
    await new Promise((r) => setTimeout(r, 350));
    const noises = seen.events.slice(before).flatMap((e) => e.changes.map((c) => c.uri));
    expect(noises.some((u) => u.includes('node_modules') || u.includes('.git'))).toBe(false);
  });
});
