// ============================================================================
// gitHost.test.ts — 4.7-b c1: parser porcelain v2 (puro) + GitHost com git REAL
// em tmpdir (status/stage/unstage/discard/commit/init + guarda de travessia).
// ============================================================================
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GitHost, parsePorcelainV2 } from '../server/git/gitHost';
import { toWorkspaceUri } from '../server/fs/fsHost';
import type { WorkspaceUri } from '../contract';

const NUL = '\0';

describe('parsePorcelainV2 (puro)', () => {
  it('lê branch, ordinário (1), rename (2, path NUL orig), unmerged (u), untracked (?) e ignorado (!)', () => {
    const raw = [
      '# branch.oid abc', '# branch.head main',
      '1 .M N... 100644 100644 100644 h1 h2 src/a.ts',
      '1 A. N... 000000 100644 100644 0000 h2 novo.txt',
      '1 .D N... 100644 100644 000000 h1 h1 apagado.txt',
      '2 R. N... 100644 100644 100644 h1 h1 R100 depois.txt', 'antes.txt',
      'u UU N... 100644 100644 100644 100644 h1 h2 h3 conflito.txt',
      '? solto.md',
      '! build/x.js',
    ].join(NUL) + NUL;
    const { branch, records } = parsePorcelainV2(raw);
    expect(branch).toBe('main');
    expect(records).toEqual([
      { path: 'src/a.ts', index: '.', worktree: 'M' },
      { path: 'novo.txt', index: 'A', worktree: '.' },
      { path: 'apagado.txt', index: '.', worktree: 'D' },
      { path: 'depois.txt', index: 'R', worktree: '.', originalPath: 'antes.txt' },
      { path: 'conflito.txt', index: 'U', worktree: 'U' },
      { path: 'solto.md', index: '?', worktree: '?' },
      { path: 'build/x.js', index: '!', worktree: '!' },
    ]);
  });
  it('detached HEAD → branch null; caminho com espaço preservado', () => {
    const { branch, records } = parsePorcelainV2(['# branch.head (detached)', '1 MM N... 100644 100644 100644 a b meu arquivo.txt'].join(NUL));
    expect(branch).toBeNull();
    expect(records[0]).toEqual({ path: 'meu arquivo.txt', index: 'M', worktree: 'M' });
  });
});

describe('GitHost — git real em tmpdir', () => {
  let ws: string; let repoDir: string; let host: GitHost; let repo: WorkspaceUri;
  const git = (...args: string[]) => execFileSync('git', args, { cwd: repoDir, encoding: 'utf-8' });
  const U = (p: string) => toWorkspaceUri(ws, join(repoDir, p));

  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), 'githost-'));
    repoDir = join(ws, 'repo');
    execFileSync('mkdir', [repoDir]);
    host = new GitHost({ workspaceRoot: ws });
    repo = toWorkspaceUri(ws, repoDir);
  });
  afterEach(() => rmSync(ws, { recursive: true, force: true }));

  const seed = () => {
    git('init', '-q'); git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
    writeFileSync(join(repoDir, 'mod.txt'), 'v1\n'); writeFileSync(join(repoDir, 'del.txt'), 'x\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');
  };

  it('pasta sem repo → isRepo:false; init cria; status vazio após commit base', async () => {
    expect((await host.status(repo)).isRepo).toBe(false);
    await host.init(repo);
    expect((await host.status(repo)).isRepo).toBe(true);
    git('config', 'user.email', 't@t'); git('config', 'user.name', 't');
    writeFileSync(join(repoDir, 'a.txt'), 'a');
    await host.stage(repo, [U('a.txt')]);
    const { oid } = await host.commit(repo, 'base');
    expect(oid).toMatch(/^[0-9a-f]{40}$/);
    expect((await host.status(repo)).entries).toEqual([]);
  });

  it('subpasta de um repo pai NÃO conta como repo (toplevel ≠ pasta)', async () => {
    git('init', '-q');
    const sub = join(repoDir, 'sub'); execFileSync('mkdir', [sub]);
    expect((await host.status(toWorkspaceUri(ws, sub))).isRepo).toBe(false);
  });

  it('status: M/D/?/A com uris absolutas + branch', async () => {
    seed();
    writeFileSync(join(repoDir, 'mod.txt'), 'v2\n'); unlinkSync(join(repoDir, 'del.txt'));
    writeFileSync(join(repoDir, 'new.txt'), 'n'); writeFileSync(join(repoDir, 'st.txt'), 's'); git('add', 'st.txt');
    const st = await host.status(repo);
    expect(typeof st.branch).toBe('string');
    expect(st.entries).toEqual([
      { uri: U('del.txt'), path: 'del.txt', index: '.', worktree: 'D' },
      { uri: U('mod.txt'), path: 'mod.txt', index: '.', worktree: 'M' },
      { uri: U('new.txt'), path: 'new.txt', index: '?', worktree: '?' },
      { uri: U('st.txt'), path: 'st.txt', index: 'A', worktree: '.' },
    ]);
  });

  it('stage → index; unstage → worktree (com HEAD) e untracked (sem HEAD usa rm --cached)', async () => {
    seed();
    writeFileSync(join(repoDir, 'mod.txt'), 'v2\n');
    await host.stage(repo, [U('mod.txt')]);
    expect((await host.status(repo)).entries[0]).toMatchObject({ index: 'M', worktree: '.' });
    await host.unstage(repo, [U('mod.txt')]);
    expect((await host.status(repo)).entries[0]).toMatchObject({ index: '.', worktree: 'M' });
    // repo sem HEAD
    const r2 = join(ws, 'fresh'); execFileSync('mkdir', [r2]);
    execFileSync('git', ['init', '-q'], { cwd: r2 }); writeFileSync(join(r2, 'f.txt'), 'f');
    const R2 = toWorkspaceUri(ws, r2);
    await host.stage(R2, [toWorkspaceUri(ws, join(r2, 'f.txt'))]);
    expect((await host.status(R2)).entries[0]).toMatchObject({ index: 'A' });
    await host.unstage(R2, [toWorkspaceUri(ws, join(r2, 'f.txt'))]);
    expect((await host.status(R2)).entries[0]).toMatchObject({ index: '?' });
  });

  it('discard: rastreado restaura, deletado volta, untracked apagado; staged+modificado volta ao index', async () => {
    seed();
    writeFileSync(join(repoDir, 'mod.txt'), 'v2\n'); unlinkSync(join(repoDir, 'del.txt')); writeFileSync(join(repoDir, 'new.txt'), 'n');
    await host.discard(repo, [U('mod.txt'), U('del.txt'), U('new.txt')]);
    expect(readFileSync(join(repoDir, 'mod.txt'), 'utf-8')).toBe('v1\n');
    expect(existsSync(join(repoDir, 'del.txt'))).toBe(true);
    expect(existsSync(join(repoDir, 'new.txt'))).toBe(false);
    expect((await host.status(repo)).entries).toEqual([]);
  });

  it('commit: mensagem vazia → invalid_message; sem staged → nothing_to_commit', async () => {
    seed();
    await expect(host.commit(repo, '  ')).rejects.toMatchObject({ code: 'invalid_message' });
    writeFileSync(join(repoDir, 'mod.txt'), 'v2\n');
    await expect(host.commit(repo, 'x')).rejects.toMatchObject({ code: 'nothing_to_commit' });
  });

  it('guarda de travessia: uri fora do workspace → forbidden_path; repo fora → forbidden_path', async () => {
    seed();
    await expect(host.stage(repo, ['file:///etc/passwd' as WorkspaceUri])).rejects.toBeInstanceOf(Error);
    await expect(host.stage(repo, ['file:///etc/passwd' as WorkspaceUri])).rejects.toMatchObject({ code: 'forbidden_path' });
    await expect(host.status('file:///etc' as WorkspaceUri)).rejects.toMatchObject({ code: 'forbidden_path' });
  });
});
