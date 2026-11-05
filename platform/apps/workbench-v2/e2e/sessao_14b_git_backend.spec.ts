// ============================================================================
// sessao_14b_git_backend.spec.ts — FATIA-04 · 4.7-b c1 (adapter /git/*)
// Probes contra o DEV SERVER REAL na fixture 5175 (FS_TEST_ROOT).
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test sessao_14b_git_backend
// Régua: 04_21 §4 — rotas POST /git/{status,stage,unstage,discard,commit,init}
// no MESMO Single Port; execFile('git') sem shell; uris fora da raiz → 403.
// A fixture git é criada AQUI via /fs/* + /git/init (repo real no disco).
// ============================================================================
import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { BASE_URL } from './helpers';

const REPO_DIR = '/tmp/explorer-fs-fixture/e2e-fixture-root/gitrepo';

const FS_PREFIX = 'file:///tmp/explorer-fs-fixture';
const F = (p: string): string => `${FS_PREFIX}/${p.replace(/^\/+/, '')}`;
const REPO = F('e2e-fixture-root/gitrepo');
const R = (p: string): string => `${REPO}/${p}`;

type Entry = { uri: string; path: string; index: string; worktree: string };
type Status = { isRepo: boolean; branch: string | null; entries: Entry[] };

test.describe.configure({ mode: 'serial' });

test.describe('FATIA-04 · 4.7-b c1 — POST /git/* (adapter no Single Port)', () => {
  const post = async (request: import('@playwright/test').APIRequestContext, route: string, data: Record<string, unknown>) =>
    request.post(`${BASE_URL}/git/${route}`, { data: { root: REPO, ...data } });
  const status = async (request: import('@playwright/test').APIRequestContext): Promise<Status> => {
    const r = await post(request, 'status', {});
    expect(r.status()).toBe(200);
    return (await r.json()) as Status;
  };
  const write = async (request: import('@playwright/test').APIRequestContext, p: string, content: string) => {
    const r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: R(p), content } });
    if (r.status() === 409) await request.post(`${BASE_URL}/fs/write`, { data: { uri: R(p), content } });
  };

  test.beforeAll(async ({ request }) => {
    await request.post(`${BASE_URL}/fs/delete`, { data: { uri: REPO, recursive: true } });
    await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: REPO } });
  });

  test('pasta sem repositório → isRepo:false, entries vazias (texto oficial fica na UI)', async ({ request }) => {
    const s = await status(request);
    expect(s.isRepo).toBe(false);
    expect(s.entries).toEqual([]);
  });

  test('/git/init cria o repo; commit base via stage+commit', async ({ request }) => {
    const init = await post(request, 'init', {});
    expect(init.status()).toBe(200);
    // identidade local só para o commit da fixture (o produto não configura identidade)
    execFileSync('git', ['config', 'user.email', 'e2e@local'], { cwd: REPO_DIR });
    execFileSync('git', ['config', 'user.name', 'e2e'], { cwd: REPO_DIR });
    await write(request, 'base.txt', 'base\n');
    await write(request, 'mod.txt', 'v1\n');
    await write(request, 'del.txt', 'bye\n');
    let s = await status(request);
    expect(s.isRepo).toBe(true);
    expect(s.entries.map((e) => e.worktree).sort()).toEqual(['?', '?', '?']);
    const st = await post(request, 'stage', { uris: [R('base.txt'), R('mod.txt'), R('del.txt')] });
    expect(st.status()).toBe(204);
    s = await status(request);
    expect(s.entries.every((e) => e.index === 'A' && e.worktree === '.')).toBe(true);
    const c = await post(request, 'commit', { message: 'base' });
    expect(c.status()).toBe(200);
    const { oid } = (await c.json()) as { oid: string };
    expect(oid).toMatch(/^[0-9a-f]{40}$/);
    s = await status(request);
    expect(s.entries).toEqual([]);
    expect(typeof s.branch).toBe('string');
  });

  test('status porcelain v2 → M (worktree), D (worktree), ? (untracked), A (index) com uris absolutas', async ({ request }) => {
    await write(request, 'mod.txt', 'v2\n');
    await request.post(`${BASE_URL}/fs/delete`, { data: { uri: R('del.txt') } });
    await write(request, 'new.txt', 'novo\n');
    await write(request, 'staged.txt', 'st\n');
    await post(request, 'stage', { uris: [R('staged.txt')] });
    const s = await status(request);
    const by = Object.fromEntries(s.entries.map((e) => [e.path, e]));
    expect(by['mod.txt']).toMatchObject({ index: '.', worktree: 'M', uri: R('mod.txt') });
    expect(by['del.txt']).toMatchObject({ index: '.', worktree: 'D' });
    expect(by['new.txt']).toMatchObject({ index: '?', worktree: '?' });
    expect(by['staged.txt']).toMatchObject({ index: 'A', worktree: '.' });
  });

  test('stage move para o index; unstage devolve ao worktree', async ({ request }) => {
    expect((await post(request, 'stage', { uris: [R('mod.txt')] })).status()).toBe(204);
    let by = Object.fromEntries((await status(request)).entries.map((e) => [e.path, e]));
    expect(by['mod.txt']).toMatchObject({ index: 'M', worktree: '.' });
    expect((await post(request, 'unstage', { uris: [R('mod.txt'), R('staged.txt')] })).status()).toBe(204);
    by = Object.fromEntries((await status(request)).entries.map((e) => [e.path, e]));
    expect(by['mod.txt']).toMatchObject({ index: '.', worktree: 'M' });
    expect(by['staged.txt']).toMatchObject({ index: '?', worktree: '?' });
  });

  test('discard: rastreado restaura o conteúdo; deletado volta; untracked é apagado do disco', async ({ request }) => {
    expect((await post(request, 'discard', { uris: [R('mod.txt'), R('del.txt'), R('new.txt')] })).status()).toBe(204);
    const read = await request.get(`${BASE_URL}/fs/read?uri=${encodeURIComponent(R('mod.txt'))}`);
    expect(((await read.json()) as { content: string }).content).toBe('v1\n');
    expect((await request.post(`${BASE_URL}/fs/stat`, { data: { uri: R('del.txt') } })).status()).toBe(200);
    expect((await request.post(`${BASE_URL}/fs/stat`, { data: { uri: R('new.txt') } })).status()).toBe(404);
    const s = await status(request);
    expect(s.entries.map((e) => e.path)).toEqual(['staged.txt']);
  });

  test('commit com mensagem vazia → 400 invalid_message; sem staged → 409 nothing_to_commit', async ({ request }) => {
    const r1 = await post(request, 'commit', { message: '   ' });
    expect(r1.status()).toBe(400);
    expect(((await r1.json()) as { code: string }).code).toBe('invalid_message');
    const r2 = await post(request, 'commit', { message: 'x' });
    expect(r2.status()).toBe(409);
    expect(((await r2.json()) as { code: string }).code).toBe('nothing_to_commit');
  });

  test('uri fora da raiz → 403 forbidden_path (stage/discard nunca escapam do workspace)', async ({ request }) => {
    const r = await post(request, 'discard', { uris: ['file:///etc/passwd'] });
    expect(r.status()).toBe(403);
    expect(((await r.json()) as { code: string }).code).toBe('forbidden_path');
  });
});
