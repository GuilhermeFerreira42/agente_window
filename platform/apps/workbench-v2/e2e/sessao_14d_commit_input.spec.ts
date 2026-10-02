// ============================================================================
// sessao_14d_commit_input.spec.ts — FATIA-04 · 4.7 c4 "Input de Commit" (04_21 §7 DoD).
//   Caixa "Message (Ctrl+Enter to commit on "branch")" + botão ✓ Commit no topo da aba
//   Changes; Ctrl+Enter comita; sem staged → diálogo oficial "There are no staged
//   changes to commit." [Yes][Cancel] (Yes = stage all + commit); mensagem vazia →
//   foco + validação "Please provide a commit message"; erro do git → diálogo de erro.
// Fixture 5175 (repo git REAL criado pelo spec). Rodar:
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/sessao_14d_commit_input.spec.ts
// ============================================================================
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE_URL } from './helpers';

declare global { interface Window { __explorerSearchModule?: { attach: { open(i: Record<string, unknown>): Promise<void>; getTabs(i: { sessionId: string }): Array<{ uri: string; kind: string }> } } } }

const WS_DIR = '/tmp/explorer-fs-fixture';
const DIR = join(WS_DIR, 'e2e-fixture-root', 'gitcommit');
const ATTACH = '.auxiliary-bar .explorer-attach-area';
// 5.3: a Source Control View mora na Side Bar (view `scm`) — só o endereço mudou.
const SCM = '[data-testid="side-bar"] [data-testid="side-bar-view-scm"] .scm-view';
const git = (...args: string[]) => execFileSync('git', args, { cwd: WS_DIR, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).trim();

test.describe.configure({ mode: 'serial' });

async function boot(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(500);
  if (!(await page.locator('[data-testid="side-bar"] [data-testid="explorer-view"]').first().isVisible().catch(() => false))) await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click(); // c3: Explorer vive na Side Bar (P2: só seletor)
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  const sid = await page.evaluate(() => document.querySelector('.auxiliary-bar[data-session-id]')!.getAttribute('data-session-id')!);
  // 5.3: a Source Control View vive na view `scm` da Side Bar (clique no ícone; já ativa → não fecha).
  if ((await page.locator('[data-testid="activity-bar-item"][data-view-id="scm"]').getAttribute('aria-selected')) !== 'true') await page.locator('[data-testid="activity-bar-item"][data-view-id="scm"]').click();
  await expect(page.locator(`${SCM}[data-loading="false"]`)).toBeAttached({ timeout: 10_000 });
  return sid;
}
const input = (page: Page) => page.locator(`${SCM} [data-testid="scm-commit-input"]`);
const button = (page: Page) => page.locator(`${SCM} [data-testid="scm-commit-button"]`);
const rows = (page: Page) => page.locator(`${SCM} .monaco-list-row[data-in-group]`);
const refresh = async (page: Page) => { await page.locator(`${SCM} [data-testid="scm-provider"]`).hover(); await page.locator(`${SCM} [data-testid="scm-refresh"]`).click(); };

test.describe('FATIA-04 · 4.7 c4 — Input de Commit na aba Changes', () => {
  test.beforeAll(() => {
    if (existsSync(join(WS_DIR, '.git'))) rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
    git('init', '-q', '-b', 'main'); git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'e2e');
    writeFileSync(join(DIR, 'a.txt'), 'a1\n'); writeFileSync(join(DIR, 'b.txt'), 'b1\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');
    writeFileSync(join(DIR, 'a.txt'), 'a2\n');                                                 // M (working tree)
    writeFileSync(join(DIR, 'b.txt'), 'b2\n'); git('add', 'e2e-fixture-root/gitcommit/b.txt'); // M (staged)
  });
  test.afterAll(() => { rmSync(join(WS_DIR, '.git'), { recursive: true, force: true }); rmSync(DIR, { recursive: true, force: true }); });

  test('T1 (c4): caixa de mensagem no topo da aba Changes com placeholder oficial + botão ✓ Commit (primário) — medidas da régua', async ({ page }) => {
    await boot(page);
    const inp = input(page);
    await expect(inp).toBeVisible();
    await expect(inp).toHaveAttribute('placeholder', 'Message (Ctrl+Enter to commit on "main")');
    // input acima da lista (provider row vem depois)
    const box = await inp.boundingBox(); const prov = await page.locator(`${SCM} [data-testid="scm-provider"]`).boundingBox();
    expect(box!.y).toBeLessThan(prov!.y);
    const m = await inp.evaluate((el) => { const cs = getComputedStyle(el); return { pl: cs.paddingLeft, radius: cs.borderTopLeftRadius, h: el.getBoundingClientRect().height }; });
    expect(m.pl).toBe('11px'); expect(m.radius).toBe('4px'); expect(Math.round(m.h)).toBeGreaterThanOrEqual(26);
    const btn = button(page);
    await expect(btn).toBeVisible();
    await expect(btn).toHaveClass(/monaco-button/);
    await expect(btn).toContainText('Commit');
    await expect(btn.locator('.codicon-check')).toBeAttached();
    const b = await btn.evaluate((el) => { const cs = getComputedStyle(el); return { pad: cs.padding, radius: cs.borderTopLeftRadius, lh: cs.lineHeight, fs: cs.fontSize }; });
    expect(b.pad).toBe('4px 8px'); expect(b.radius).toBe('4px'); expect(b.lh).toBe('16px'); expect(b.fs).toBe('12px');
  });

  test('T2 (c4): mensagem vazia → foco volta ao input + validação "Please provide a commit message"; nada é comitado', async ({ page }) => {
    await boot(page);
    const before = git('rev-parse', 'HEAD');
    await button(page).click();
    const validation = page.locator(`${SCM} [data-testid="scm-commit-validation"]`);
    await expect(validation).toHaveText('Please provide a commit message');
    await expect(input(page)).toBeFocused();
    expect(git('rev-parse', 'HEAD')).toBe(before);
    // digitar limpa a validação
    await input(page).type('x');
    await expect(validation).toHaveCount(0);
  });

  test('T3 (c4): com staged → Ctrl+Enter comita SÓ o index com a mensagem; input limpa; lista atualiza (b.txt some, a.txt fica)', async ({ page }) => {
    await boot(page);
    await expect(rows(page)).toHaveCount(2);
    await input(page).click();
    await page.keyboard.type('feat: b via ctrl+enter');
    await page.keyboard.press('Control+Enter');
    await expect(rows(page)).toHaveCount(1, { timeout: 15_000 });
    await expect(rows(page).first().locator('.label-name')).toHaveText('a.txt');
    await expect(input(page)).toHaveValue('');
    expect(git('log', '-1', '--pretty=%s')).toBe('feat: b via ctrl+enter');
    expect(git('show', '--stat', '--pretty=', 'HEAD')).toContain('b.txt');
    expect(git('show', '--stat', '--pretty=', 'HEAD')).not.toContain('a.txt');
    await expect(page.locator(`[data-testid="scm-commit-dialog"]`)).toHaveCount(0);
  });

  test('T4 (c4): sem staged → diálogo oficial "There are no staged changes to commit." [Yes][Cancel]; Cancel não faz nada; Yes = stage all + commit', async ({ page }) => {
    await boot(page);
    await expect(rows(page)).toHaveCount(1); // só a.txt (working tree)
    const before = git('rev-parse', 'HEAD');
    await input(page).fill('feat: a via stage-all');
    await button(page).click();
    const dlg = page.locator(`[data-testid="scm-commit-dialog"]`);
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('There are no staged changes to commit.');
    await expect(dlg).toContainText('Would you like to stage all your changes and commit them directly?');
    await expect(dlg.getByRole('button', { name: 'Yes' })).toBeVisible();
    await dlg.getByRole('button', { name: 'Cancel' }).click();
    await expect(dlg).toHaveCount(0);
    expect(git('rev-parse', 'HEAD')).toBe(before);
    await expect(input(page)).toHaveValue('feat: a via stage-all'); // mensagem preservada
    await button(page).click();
    await dlg.getByRole('button', { name: 'Yes' }).click();
    await expect(rows(page)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator(`${SCM} [data-testid="scm-empty"]`)).toBeVisible();
    expect(git('log', '-1', '--pretty=%s')).toBe('feat: a via stage-all');
    expect(git('status', '--porcelain')).toBe('');
    await expect(input(page)).toHaveValue('');
  });

  test('T5 (c4): erro do git no commit → diálogo de erro com a mensagem do servidor; input mantém a mensagem', async ({ page }) => {
    await boot(page);
    writeFileSync(join(DIR, 'c.txt'), 'c\n'); git('add', 'e2e-fixture-root/gitcommit/c.txt');
    await refresh(page);
    await expect(rows(page)).toHaveCount(1);
    // trava o índice → `git commit` falha (index.lock)
    writeFileSync(join(WS_DIR, '.git', 'index.lock'), '');
    try {
      await input(page).fill('vai falhar');
      await page.keyboard.press('Control+Enter');
      const err = page.locator(`[data-testid="scm-commit-error"]`);
      await expect(err).toBeVisible({ timeout: 10_000 });
      await expect(err).toContainText(/index\.lock|Unable to create|Another git process/i);
      await err.getByRole('button', { name: 'Close' }).click();
      await expect(err).toHaveCount(0);
      await expect(input(page)).toHaveValue('vai falhar');
    } finally { rmSync(join(WS_DIR, '.git', 'index.lock'), { force: true }); }
  });
});
