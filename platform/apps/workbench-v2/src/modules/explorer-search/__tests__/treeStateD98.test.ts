import { describe, expect, it } from 'vitest';
import type { WorkspaceUri } from '../contract';
import { ExplorerItem } from '../core/explorerModel';
import { TreeState } from '../core/treeState';
import { asWorkspaceUri } from '../core/uri';
import { FakeFsPort } from './fakeFs';

const ROOT = asWorkspaceUri('/workspace') as WorkspaceUri;
const CHILDREN = 100;

class MeteredFs extends FakeFsPort {
  activeStats = 0;
  peakStats = 0;
  completedStats = 0;

  override async stat(input: { uri: WorkspaceUri }) {
    this.activeStats++;
    this.peakStats = Math.max(this.peakStats, this.activeStats);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 2));
      const stat = await super.stat(input);
      this.completedStats++;
      return stat;
    } finally {
      this.activeStats--;
    }
  }
}

function seededFs(): MeteredFs {
  const fs = new MeteredFs(ROOT);
  fs.seed(Array.from({ length: CHILDREN }, (_, index) => ({
    path: `/workspace/item-${String(index).padStart(3, '0')}.txt`,
    kind: 'file' as const,
  })));
  return fs;
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('timed out waiting for fixture condition');
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

describe('D98-Explorer shared stat queue', () => {
  it('bounds complete stat operations across one directory to 64 and retains every child', async () => {
    const fs = seededFs();
    const tree = new TreeState(fs, () => 'default');
    const root = new ExplorerItem({ uri: ROOT, kind: 'directory' });

    await tree.ensureResolved(root);

    expect(fs.peakStats).toBe(64);
    expect(fs.completedStats).toBe(CHILDREN);
    expect(root.children.size).toBe(CHILDREN);
    expect(root.isDirectoryResolved).toBe(true);
  });

  it('deduplicates concurrent requests for the same directory and preserves metadata', async () => {
    const fs = new MeteredFs(ROOT);
    fs.seed([
      { path: '/workspace/read-only.txt', kind: 'file', mtimeMs: 1234, readonly: true },
      { path: '/workspace/writable.txt', kind: 'file', mtimeMs: 5678, readonly: false },
    ]);
    const tree = new TreeState(fs, () => 'default');
    const root = new ExplorerItem({ uri: ROOT, kind: 'directory' });

    await Promise.all([tree.ensureResolved(root), tree.ensureResolved(root), tree.ensureResolved(root)]);

    expect(fs.calls.list).toBe(1);
    expect(fs.calls.stat).toBe(2);
    expect(root.getChild('read-only.txt')?.mtimeMs).toBe(1234);
    expect(root.getChild('read-only.txt')?.isReadonly).toBe(true);
    expect(root.getChild('writable.txt')?.mtimeMs).toBe(5678);
    expect(root.getChild('writable.txt')?.isReadonly).toBe(false);
  });

  it('shares the same 64 slots across concurrently resolved directories', async () => {
    const fs = new MeteredFs(ROOT);
    fs.seed([
      { path: '/workspace/alpha', kind: 'directory' },
      { path: '/workspace/beta', kind: 'directory' },
      ...Array.from({ length: 50 }, (_, index) => ({ path: `/workspace/alpha/a-${index}`, kind: 'file' as const })),
      ...Array.from({ length: 50 }, (_, index) => ({ path: `/workspace/beta/b-${index}`, kind: 'file' as const })),
    ]);
    const tree = new TreeState(fs, () => 'default');
    const root = new ExplorerItem({ uri: ROOT, kind: 'directory' });
    await tree.ensureResolved(root);
    const alpha = root.getChild('alpha')!;
    const beta = root.getChild('beta')!;

    await Promise.all([tree.ensureResolved(alpha), tree.ensureResolved(beta)]);

    expect(fs.peakStats).toBe(64);
    expect(alpha.children.size).toBe(50);
    expect(beta.children.size).toBe(50);
  });

  it('releases slots after stat errors and settles every child without hiding metadata failure', async () => {
    class OneFailureFs extends MeteredFs {
      override async stat(input: { uri: WorkspaceUri }) {
        if (input.uri.endsWith('item-017.txt')) {
          this.activeStats++;
          this.peakStats = Math.max(this.peakStats, this.activeStats);
          try {
            await new Promise<void>((resolve) => setTimeout(resolve, 2));
            throw new Error('fixture stat failure');
          } finally {
            this.activeStats--;
          }
        }
        return super.stat(input);
      }
    }
    const fs = new OneFailureFs(ROOT);
    fs.seed(Array.from({ length: CHILDREN }, (_, index) => ({
      path: `/workspace/item-${String(index).padStart(3, '0')}.txt`,
      kind: 'file' as const,
    })));
    const tree = new TreeState(fs, () => 'default');
    const root = new ExplorerItem({ uri: ROOT, kind: 'directory' });

    await tree.ensureResolved(root);

    expect(fs.peakStats).toBe(64);
    expect(root.children.size).toBe(CHILDREN);
    expect(root.isDirectoryResolved).toBe(true);
    expect(root.getChild('item-017.txt')?.mtimeMs).toBeUndefined();
    expect(fs.completedStats).toBe(CHILDREN - 1);
  });

  it('drops queued old-generation work and never applies in-flight old results', async () => {
    class GenerationFs extends FakeFsPort {
      active = 0;
      started = 0;
      private releaseInitial!: () => void;
      private releaseCurrent!: () => void;
      readonly initialGate = new Promise<void>((resolve) => { this.releaseInitial = resolve; });
      readonly currentGate = new Promise<void>((resolve) => { this.releaseCurrent = resolve; });
      releaseFirstGeneration(): void { this.releaseInitial(); }
      releaseCurrentGeneration(): void { this.releaseCurrent(); }
      override async stat(input: { uri: WorkspaceUri }) {
        const attempt = ++this.started;
        this.active++;
        try {
          if (attempt <= 64) await this.initialGate;
          else await this.currentGate;
          return await super.stat(input);
        } finally {
          this.active--;
        }
      }
    }
    const fs = new GenerationFs(ROOT);
    fs.seed(Array.from({ length: CHILDREN }, (_, index) => ({
      path: `/workspace/item-${String(index).padStart(3, '0')}.txt`,
      kind: 'file' as const,
    })));
    const tree = new TreeState(fs, () => 'default');
    const root = new ExplorerItem({ uri: ROOT, kind: 'directory' });
    const obsolete = tree.ensureResolved(root);
    await waitFor(() => fs.started === 64);

    const generation = tree.beginGeneration();
    const current = tree.ensureResolved(root, generation);
    fs.releaseFirstGeneration();
    await waitFor(() => fs.started > 16);
    const obsoleteResult = await obsolete;

    expect(obsoleteResult).toEqual([]);
    expect(root.children.size).toBe(0);
    expect(root.isDirectoryResolved).toBe(false);
    expect(fs.started).toBeLessThanOrEqual(128);

    fs.releaseCurrentGeneration();
    await current;
    expect(root.children.size).toBe(CHILDREN);
    expect(root.isDirectoryResolved).toBe(true);
  });
});
