// gitService.test.ts — 4.7-b c1: grupos da SCM View (puro) + debounce/última vence + ops.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildGroups, GitService, type GitEntry, type GitPortLike, type GitStatus } from '../core/git/gitService';
import type { WorkspaceUri } from '../contract';

const u = (p: string) => `file:///ws/${p}` as WorkspaceUri;
const e = (path: string, index: GitEntry['index'], worktree: GitEntry['worktree']): GitEntry => ({ uri: u(path), path, index, worktree });

describe('buildGroups — modelo da Source Control View', () => {
  it('sem staged → só o grupo "Changes"; untracked vira U com token untracked (verde do tema)', () => {
    const g = buildGroups([e('a.ts', '.', 'M'), e('n.md', '?', '?')]);
    expect(g.map((x) => x.label)).toEqual(['Changes']);
    expect(g[0].items.map((i) => [i.name, i.letter, i.colorToken])).toEqual([
      ['a.ts', 'M', '--vscode-gitDecoration-modifiedResourceForeground'],
      ['n.md', 'U', '--vscode-gitDecoration-untrackedResourceForeground'],
    ]);
  });
  it('com index → "Staged Changes" ANTES de "Changes"; MM aparece nos dois; D riscado e deleted', () => {
    const g = buildGroups([e('src/b.ts', 'M', 'M'), e('c.txt', 'A', '.'), e('d.txt', '.', 'D'), e('e.txt', 'D', '.')]);
    expect(g.map((x) => x.label)).toEqual(['Staged Changes', 'Changes']);
    expect(g[0].items.map((i) => `${i.folder}|${i.name}|${i.letter}|${i.tooltip}`)).toEqual([
      'src|b.ts|M|Index Modified', '|c.txt|A|Index Added', '|e.txt|D|Index Deleted',
    ]);
    expect(g[0].items[0].colorToken).toBe('--vscode-gitDecoration-stageModifiedResourceForeground');
    expect(g[1].items.map((i) => i.name)).toEqual(['b.ts', 'd.txt']);
    expect(g[1].items[1]).toMatchObject({ strikethrough: true, deleted: true, colorToken: '--vscode-gitDecoration-deletedResourceForeground' });
  });
  it('ignorado (!) não aparece; conflito (u) vai para Changes com "!" e token conflicting', () => {
    const g = buildGroups([e('x', '!', '!'), e('k', 'U', 'U')]);
    expect(g[0].items.map((i) => [i.name, i.letter, i.tooltip])).toEqual([['k', '!', 'Conflict']]);
  });
});

class FakePort implements GitPortLike {
  calls: string[] = [];
  entries: GitEntry[] = [];
  isRepo = true;
  delay = 0;
  async status(): Promise<GitStatus> {
    this.calls.push('status');
    if (this.delay) await new Promise((r) => setTimeout(r, this.delay));
    return { isRepo: this.isRepo, branch: this.isRepo ? 'main' : null, entries: [...this.entries] };
  }
  async init() { this.calls.push('init'); this.isRepo = true; }
  blobs: Record<string, string> = {};
  async show(_r: WorkspaceUri, uri: WorkspaceUri, ref: 'HEAD' | 'index' | 'worktree') { this.calls.push(`show:${ref}`); return this.blobs[`${ref}:${uri}`] ?? ''; }
  async stage(_r: WorkspaceUri, uris: WorkspaceUri[]) { this.calls.push(`stage:${uris.length}`); this.entries = this.entries.map((x) => uris.includes(x.uri) ? { ...x, index: x.index === '?' ? 'A' : 'M', worktree: '.' } : x); }
  async unstage(_r: WorkspaceUri, uris: WorkspaceUri[]) { this.calls.push(`unstage:${uris.length}`); this.entries = this.entries.map((x) => uris.includes(x.uri) ? { ...x, index: '.', worktree: 'M' } : x); }
  async discard(_r: WorkspaceUri, uris: WorkspaceUri[]) { this.calls.push('discard'); this.entries = this.entries.filter((x) => !uris.includes(x.uri)); }
  async commit(_r: WorkspaceUri, message: string) { this.calls.push(`commit:${message}`); if (!message.trim()) throw Object.assign(new Error('Please provide a commit message'), { code: 'invalid_message' }); this.entries = this.entries.filter((x) => x.index === '.' || x.index === '?'); return { oid: 'deadbeef' }; }
}

describe('GitService', () => {
  let port: FakePort; let svc: GitService;
  beforeEach(() => { vi.useFakeTimers(); port = new FakePort(); svc = new GitService(port); });
  afterEach(() => { svc.dispose(); vi.useRealTimers(); });

  it('setRoot faz status imediato e emite git.statusChanged com count', async () => {
    port.entries = [e('a', '.', 'M'), e('b', '?', '?')];
    const ev = vi.fn(); svc.onEvent(ev);
    await svc.setRoot(u(''));
    expect(svc.getState()).toMatchObject({ isRepo: true, branch: 'main', loading: false });
    expect(ev).toHaveBeenCalledWith({ type: 'git.statusChanged', isRepo: true, branch: 'main', count: 2 });
  });

  it('refresh() debounce 300 ms: 5 chamadas → 1 status; fs.changed também agenda', async () => {
    await svc.setRoot(u('')); port.calls = [];
    for (let i = 0; i < 4; i++) svc.refresh();
    svc.handleFsChanged();
    await vi.advanceTimersByTimeAsync(299); expect(port.calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1); await vi.advanceTimersByTimeAsync(0);
    expect(port.calls).toEqual(['status']);
  });

  it('última vence: status antigo lento não sobrescreve o mais novo', async () => {
    vi.useRealTimers();
    await svc.setRoot(u(''));
    port.delay = 30; port.entries = [e('old', '.', 'M')];
    const p1 = svc.refreshNow();
    port.delay = 0; port.entries = [e('new', '.', 'M')];
    const p2 = svc.refreshNow();
    await Promise.all([p1, p2]);
    expect(svc.getState().groups[0].items.map((i) => i.name)).toEqual(['new']);
  });

  it('stage/unstage/discard/commit delegam e re-statam; hasStaged reflete o index', async () => {
    port.entries = [e('a', '.', 'M'), e('n', '?', '?')];
    await svc.setRoot(u(''));
    expect(svc.hasStaged()).toBe(false);
    await svc.stage([u('a')]);
    expect(svc.hasStaged()).toBe(true);
    expect(svc.getState().groups.map((g) => g.label)).toEqual(['Staged Changes', 'Changes']);
    await svc.stageAll();
    expect(svc.getState().groups.map((g) => g.items.length)).toEqual([2, 0]);
    await svc.unstageAll();
    expect(svc.hasStaged()).toBe(false);
    await svc.stage([u('a')]);
    const r = await svc.commit('msg');
    expect(r.oid).toBe('deadbeef');
    expect(svc.getState().groups[0].items.map((i) => i.name)).toEqual(['n']);
    await svc.discard([u('n')]);
    expect(svc.hasWorkingTreeChanges()).toBe(false);
    expect(port.calls.filter((c) => c === 'status').length).toBeGreaterThanOrEqual(6);
  });

  it('erro de operação → state.error com a mensagem e a promise rejeita; próximo sucesso limpa', async () => {
    await svc.setRoot(u(''));
    await expect(svc.commit('  ')).rejects.toMatchObject({ code: 'invalid_message' });
    expect(svc.getState().error).toBe('Please provide a commit message');
    await svc.stage([]);
    expect(svc.getState().error).toBeNull();
  });

  it('pasta sem repo → isRepo:false; init() vira repo', async () => {
    port.isRepo = false;
    await svc.setRoot(u(''));
    expect(svc.getState().isRepo).toBe(false);
    await svc.init();
    expect(svc.getState().isRepo).toBe(true);
  });

  it('dispose cancela timer pendente', async () => {
    await svc.setRoot(u('')); port.calls = [];
    svc.refresh(); svc.dispose();
    await vi.advanceTimersByTimeAsync(500);
    expect(port.calls).toEqual([]);
  });

  // ---- 4.7-c c2 ----
  it('count() = index + working tree; getDiff resolve os lados fiéis ao git.openChange', async () => {
    port.entries = [e('a.ts', '.', 'M'), e('b.ts', 'A', '.'), e('c.txt', '.', 'D'), e('n.txt', '?', '?')];
    await svc.setRoot(u(''));
    expect(svc.count()).toBe(4);
    port.blobs = { [`HEAD:${u('a.ts')}`]: 'h', [`index:${u('a.ts')}`]: 'i', [`worktree:${u('a.ts')}`]: 'w', [`index:${u('b.ts')}`]: 'ib' };
    expect(await svc.getDiff(u('a.ts'), 'workingTree')).toEqual({ original: 'i', modified: 'w', title: 'a.ts (Working Tree)' });
    expect(await svc.getDiff(u('a.ts'), 'index')).toEqual({ original: 'h', modified: 'i', title: 'a.ts (Index)' });
    expect(await svc.getDiff(u('b.ts'), 'index')).toEqual({ original: '', modified: 'ib', title: 'b.ts (Index)' }); // A: original vazio
    expect(await svc.getDiff(u('c.txt'), 'workingTree')).toMatchObject({ modified: '' });                      // D: modificado vazio
    expect(await svc.getDiff(u('n.txt'), 'workingTree')).toMatchObject({ original: '' });                      // U: original vazio
  });
  it('getDiff sem raiz rejeita (nunca lança síncrono)', async () => {
    await expect(svc.getDiff(u('a.ts'), 'workingTree')).rejects.toThrow(/raiz/);
  });
});
