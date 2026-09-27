// ============================================================================
// sessao_14b_git_changes.spec.ts — FATIA-04 · 4.7-b (aba "Changes" no Editor Anexo)
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test sessao_14b_git_changes
// Régua: 04_21 §1 (CSS compilado da Source Control View servido pelo 8080):
// linha 22 px · letra à direita (:after 90 %/600/.75, margem auto 16 0 5) ·
// tokens --vscode-gitDecoration-* · grupos "Staged Changes"/"Changes" · badge.
// Fixture: a RAIZ do workspace 5175 (/tmp/explorer-fs-fixture) vira repo git real
// (decisão do usuário: root git = raiz do workspace) — criada aqui, removida no fim.
// ============================================================================
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

declare global {
  interface Window { __explorerSearchModule?: { attach: {
    setVisible(i: { sessionId: string; visible: boolean }): void;
    open(i: { uri: string; kind: 'code' | 'changes'; sessionId: string; pinned?: boolean }): Promise<void>;
    close(i: { uri: string; sessionId: string }): Promise<void>;
    closeAll(i: { sessionId: string }): Promise<void>;
    getTabs(i: { sessionId: string }): Array<{ uri: string; kind: string; dirty: boolean; preview?: boolean; active?: boolean }>;
  } } }
}

const WS_DIR = '/tmp/explorer-fs-fixture';
const WS = 'file:///tmp/explorer-fs-fixture';
const DIR = join(WS_DIR, 'e2e-fixture-root', 'gitui');
const U = (p: string) => `${WS}/e2e-fixture-root/gitui/${p}`;
const CHANGES_URI = 'file:///.explorer-search/changes';
const ATTACH = '.auxiliary-bar .explorer-attach-area';
const TAB = `${ATTACH} .tabs-container > .tab`;
const ROW = `${ATTACH} .scm-view .monaco-list-row`;

const git = (...args: string[]) => execFileSync('git', args, { cwd: WS_DIR, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });

test.describe.configure({ mode: 'serial' });

async function openFilesTab(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(500);
  const closeBtn = page.locator('.editor-tab.is-active [aria-label*="close" i], .editor-tab.is-active [aria-label*="Fechar" i]').first();
  if (await closeBtn.count()) await closeBtn.click().catch(() => undefined);
  if (!(await page.locator('.auxiliary-bar').count())) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '').toLowerCase().includes('auxiliar'));
      b?.click();
    });
    await page.waitForTimeout(300);
  }
  await page.locator('[id^="aux-tab-"][id$="-files"]').first().click();
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  await page.waitForTimeout(300);
}
const sessionId = (page: import('@playwright/test').Page) => page.evaluate(() => (document.querySelector('[id^="aux-tab-"][id$="-files"]')!.id).replace(/^aux-tab-/, '').replace(/-files$/, ''));
async function openChanges(page: import('@playwright/test').Page) {
  const sid = await sessionId(page);
  await page.evaluate(([s, u]) => window.__explorerSearchModule!.attach.open({ uri: u, kind: 'changes', sessionId: s }), [sid, CHANGES_URI]);
  await expect(page.locator(`${ATTACH} .scm-view`)).toBeVisible();
  await expect(page.locator(`${ATTACH} .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 10_000 });
  return sid;
}
/** ações inline só aparecem no hover da linha (fidelidade SCM View) */
async function clickRefresh(page: import('@playwright/test').Page) {
  await page.locator(`${ATTACH} .scm-view [data-testid="scm-provider"]`).hover();
  await page.locator(`${ATTACH} .scm-view [data-testid="scm-refresh"]`).click();
}
const rowByName = (page: import('@playwright/test').Page, name: string) => page.locator(`${ROW} .resource`).filter({ has: page.locator(`.label-name:text-is("${name}")`) }).first();
/** cor computada de `var(token, var(fallback))` no mesmo documento (sem hex no teste).
 *  O tema do shell ainda não define todos os tokens gitDecoration (D2.37): o produto
 *  cai no token semântico da mesma família — o teste mede com a MESMA regra. */
const FALLBACK: Record<string, string> = {
  '--vscode-gitDecoration-untrackedResourceForeground': '--vscode-gitDecoration-addedResourceForeground',
  '--vscode-gitDecoration-stageModifiedResourceForeground': '--vscode-gitDecoration-modifiedResourceForeground',
  '--vscode-gitDecoration-stageDeletedResourceForeground': '--vscode-gitDecoration-deletedResourceForeground',
};
const tokenColor = (page: import('@playwright/test').Page, token: string) => page.evaluate(([t, fb]) => {
  const el = document.createElement('span'); el.style.color = fb ? `var(${t}, var(${fb}))` : `var(${t})`; document.body.appendChild(el);
  const c = getComputedStyle(el).color; el.remove(); return c;
}, [token, FALLBACK[token] ?? ''] as const);

test.describe('FATIA-04 · 4.7-b — aba "Changes" (Source Control View dentro do Editor Anexo)', () => {
  test.beforeAll(() => {
    if (existsSync(join(WS_DIR, '.git'))) rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(join(DIR, 'sub'), { recursive: true });
    git('init', '-q'); git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'e2e');
    writeFileSync(join(DIR, 'mod.txt'), 'v1\n'); writeFileSync(join(DIR, 'del.txt'), 'bye\n'); writeFileSync(join(DIR, 'sub', 'deep.ts'), 'export const a = 1;\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');
    writeFileSync(join(DIR, 'mod.txt'), 'v2\n'); unlinkSync(join(DIR, 'del.txt'));
    writeFileSync(join(DIR, 'new.txt'), 'novo\n'); writeFileSync(join(DIR, 'staged.txt'), 'st\n'); writeFileSync(join(DIR, 'sub', 'deep.ts'), 'export const a = 2;\n');
    git('add', 'e2e-fixture-root/gitui/staged.txt');
  });
  test.afterAll(() => {
    rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(DIR, { recursive: true, force: true });
  });

  test('T1: aba "Changes" fixa — 35 px, primeira posição, ícone source-control, sem ✕, não-preview; fica primeira mesmo abrindo arquivos; Close All não a fecha', async ({ page }) => {
    await openFilesTab(page);
    const sid = await openChanges(page);
    const tab = page.locator(TAB).first();
    await expect(tab).toHaveAttribute('data-kind', 'changes');
    expect(Math.round((await tab.boundingBox())!.height)).toBe(35);
    await expect(tab.locator('.codicon-source-control')).toHaveCount(1);
    await expect(tab.locator('.label-name')).toHaveText('Changes');
    await expect(tab.locator('.tab-actions .action-label')).toHaveCount(0);
    await expect(tab.locator('.monaco-icon-label.italic')).toHaveCount(0);
    await page.evaluate(([s, u]) => window.__explorerSearchModule!.attach.open({ uri: u, kind: 'code', sessionId: s, pinned: true }), [sid, U('mod.txt')]);
    await expect(page.locator(TAB)).toHaveCount(2);
    await expect(page.locator(TAB).first()).toHaveAttribute('data-kind', 'changes');
    await expect(page.locator(TAB).nth(1)).toHaveClass(/active/);
    await page.evaluate((s) => window.__explorerSearchModule!.attach.closeAll({ sessionId: s }), sid);
    await expect(page.locator(TAB)).toHaveCount(1);
    await expect(page.locator(TAB).first()).toHaveAttribute('data-kind', 'changes');
    await expect(page.locator(ATTACH)).toBeVisible();
  });

  test('T2: linhas 22 px (`.scm-view .monaco-list-row`), ícone Seti 16 px por extensão, nome + pasta (description), badge no grupo', async ({ page }) => {
    await openFilesTab(page);
    await openChanges(page);
    const rows = page.locator(ROW);
    expect(await rows.count()).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < await rows.count(); i++) expect(Math.round((await rows.nth(i).boundingBox())!.height)).toBe(22);
    const deep = rowByName(page, 'deep.ts');
    await expect(deep.locator('.monaco-icon-label.ts-ext-file-icon')).toHaveCount(1);
    const icon = await deep.locator('.monaco-icon-label').evaluate((el) => { const cs = getComputedStyle(el, '::before'); return { w: cs.width, h: cs.height, pr: cs.paddingRight }; });
    expect(icon).toMatchObject({ w: '16px', h: '22px', pr: '6px' });
    await expect(deep.locator('.label-description')).toHaveText('e2e-fixture-root/gitui/sub');
    const group = page.locator(`${ROW} .resource-group`).filter({ hasText: 'Changes' }).last();
    await expect(group.locator('.monaco-count-badge')).toHaveText(/^\d+$/);
  });

  test('T3: letra de status à direita (M/D/U/A) via ::after 90 %/600/.75 e cor do token gitDecoration correspondente (U = untracked, não cinza)', async ({ page }) => {
    await openFilesTab(page);
    await openChanges(page);
    const check = async (name: string, letter: string, token: string, strike = false) => {
      const label = rowByName(page, name).locator('.monaco-icon-label');
      const got = await label.evaluate((el) => {
        const a = getComputedStyle(el, '::after');
        const n = el.querySelector('.label-name')!;
        return { content: a.content, weight: a.fontWeight, opacity: a.opacity, color: getComputedStyle(el).color, deco: getComputedStyle(n).textDecorationLine, right: a.marginRight, left: a.marginLeft };
      });
      expect(got.content).toBe(`"${letter}"`);
      expect(got.weight).toBe('600'); expect(got.opacity).toBe('0.75'); expect(got.left).toBe('5px');
      expect(got.color).toBe(await tokenColor(page, token));
      if (strike) expect(got.deco).toContain('line-through');
    };
    await check('mod.txt', 'M', '--vscode-gitDecoration-modifiedResourceForeground');
    await check('del.txt', 'D', '--vscode-gitDecoration-deletedResourceForeground', true);
    await check('new.txt', 'U', '--vscode-gitDecoration-untrackedResourceForeground');
    await check('staged.txt', 'A', '--vscode-gitDecoration-addedResourceForeground');
    // letra encostada à direita da linha (margem 16 px como no VS Code)
    const r = await rowByName(page, 'mod.txt').evaluate((el) => { const row = el.closest('.monaco-list-row')!.getBoundingClientRect(); const lab = el.querySelector('.monaco-icon-label')!.getBoundingClientRect(); return Math.round(row.right - lab.right); });
    expect(r).toBeGreaterThanOrEqual(0); expect(r).toBeLessThanOrEqual(16);
  });

  test('T4: grupos dinâmicos — "Staged Changes" antes de "Changes" enquanto houver index; some após unstage externo + Refresh; volta após stage', async ({ page, request }) => {
    await openFilesTab(page);
    await openChanges(page);
    const groups = page.locator(`${ROW} .resource-group > .name`);
    await expect(groups).toHaveText(['Staged Changes', 'Changes']);
    await request.post(`${BASE_URL}/git/unstage`, { data: { root: WS, uris: [U('staged.txt')] } });
    await clickRefresh(page);
    await expect(groups).toHaveText(['Changes']);
    await expect(rowByName(page, 'staged.txt').locator('.monaco-icon-label')).toHaveAttribute('data-letter', 'U');
    await request.post(`${BASE_URL}/git/stage`, { data: { root: WS, uris: [U('staged.txt')] } });
    await clickRefresh(page);
    await expect(groups).toHaveText(['Staged Changes', 'Changes']);
  });

  test('T5: clique em M abre o arquivo no anexo (preview) mantendo Changes primeira; clique em D não abre; sem repo → frase oficial + "Initialize Repository" (git init real)', async ({ page }) => {
    await openFilesTab(page);
    const sid = await openChanges(page);
    await rowByName(page, 'mod.txt').click();
    await expect(page.locator(TAB)).toHaveCount(2);
    await expect(page.locator(TAB).first()).toHaveAttribute('data-kind', 'changes');
    const tabs = await page.evaluate((s) => window.__explorerSearchModule!.attach.getTabs({ sessionId: s }), sid);
    expect(tabs[1]).toMatchObject({ uri: U('mod.txt'), preview: true, active: true });
    await expect(page.locator(`${ATTACH} .attach-monaco-host`)).toBeVisible();
    await page.locator(TAB).first().click();
    await rowByName(page, 'del.txt').click();
    await expect(page.locator(TAB)).toHaveCount(2);
    expect((await page.evaluate((s) => window.__explorerSearchModule!.attach.getTabs({ sessionId: s }), sid))[0].active).toBe(true);
    // pasta sem repositório
    rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    await clickRefresh(page);
    const empty = page.locator(`${ATTACH} .scm-view [data-testid="scm-no-repo"]`);
    await expect(empty).toContainText("The folder currently open doesn't have a Git repository.");
    await empty.getByRole('button', { name: 'Initialize Repository' }).click();
    await expect(empty).toHaveCount(0, { timeout: 10_000 });
    expect(existsSync(join(WS_DIR, '.git'))).toBe(true);
    await expect(page.locator(`${ROW} .resource-group > .name`)).toHaveText(['Changes']);
  });

  // ------------------------------------------------------------------ c3
  const ACT = (name: string, id: string) => rowByName(page0!, name).locator(`[data-testid="scm-action-${id}"]`);
  let page0: import('@playwright/test').Page | null = null;
  const reseed = () => {
    // volta ao estado inicial da fixture (mod=M, del=D, new=U, staged=A, deep=M).
    // T5 re-inicializa o repo sem commit → recria o commit "base" quando ele não existe.
    let hasBase = true; try { git('rev-parse', '-q', '--verify', 'HEAD'); } catch { hasBase = false; }
    if (!hasBase) {
      git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'e2e');
      writeFileSync(join(DIR, 'mod.txt'), 'v1\n'); writeFileSync(join(DIR, 'del.txt'), 'bye\n'); writeFileSync(join(DIR, 'sub', 'deep.ts'), 'export const a = 1;\n');
      if (existsSync(join(DIR, 'new.txt'))) unlinkSync(join(DIR, 'new.txt')); if (existsSync(join(DIR, 'staged.txt'))) unlinkSync(join(DIR, 'staged.txt'));
      git('add', '-A'); git('commit', '-q', '-m', 'base');
    }
    writeFileSync(join(DIR, 'mod.txt'), 'v2\n'); if (existsSync(join(DIR, 'del.txt'))) unlinkSync(join(DIR, 'del.txt'));
    writeFileSync(join(DIR, 'new.txt'), 'novo\n'); writeFileSync(join(DIR, 'staged.txt'), 'st\n'); writeFileSync(join(DIR, 'sub', 'deep.ts'), 'export const a = 2;\n');
    git('reset', '-q'); git('add', 'e2e-fixture-root/gitui/staged.txt');
  };
  const dlg = () => page0!.locator('[data-testid="scm-confirm-dialog"] .monaco-dialog-box');

  test('T6 (c3): hover em M mostra Discard + Stage (22×22, nessa ordem, sem reflow da linha); Stage → vai para Staged Changes', async ({ page }) => {
    page0 = page; reseed();
    await openFilesTab(page); await openChanges(page);
    const row = rowByName(page, 'mod.txt');
    const before = await row.evaluate((e) => e.closest('.monaco-list-row')!.getBoundingClientRect().height);
    await expect(row.locator('.actions')).toBeHidden();
    await row.hover();
    const acts = row.locator('.actions .action-label');
    await expect(acts).toHaveCount(2);
    await expect(acts.nth(0)).toHaveClass(/codicon-discard/); await expect(acts.nth(0)).toHaveAttribute('title', 'Discard Changes');
    await expect(acts.nth(1)).toHaveClass(/codicon-add/); await expect(acts.nth(1)).toHaveAttribute('title', 'Stage Changes');
    const b = await acts.nth(1).boundingBox(); expect(Math.round(b!.width)).toBe(22); expect(Math.round(b!.height)).toBe(22);
    expect(await row.evaluate((e) => e.closest('.monaco-list-row')!.getBoundingClientRect().height)).toBe(before);
    // letra continua visível durante o hover (VS Code mantém a decoração)
    expect(await row.locator('.monaco-icon-label').evaluate((el) => getComputedStyle(el, '::after').content)).toBe('"M"');
    await ACT('mod.txt', 'stage').click();
    await expect(page.locator(`${ROW}[data-group="index"] ~ .monaco-list-row .resource`).filter({ hasText: 'mod.txt' }).first()).toBeAttached();
    const staged = page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="index"]`);
    await expect(staged.filter({ hasText: 'mod.txt' })).toHaveCount(1);
    await expect(staged.filter({ hasText: 'mod.txt' }).locator('.monaco-icon-label')).toHaveAttribute('data-letter', 'M');
  });

  test('T7 (c3): hover em Staged mostra só Unstage (codicon-remove); Unstage → volta para Changes', async ({ page }) => {
    page0 = page; reseed();
    await openFilesTab(page); await openChanges(page);
    const staged = page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="index"]`).filter({ hasText: 'staged.txt' });
    await expect(staged).toHaveCount(1);
    await staged.hover();
    const acts = staged.locator('.actions .action-label');
    await expect(acts).toHaveCount(1);
    await expect(acts.first()).toHaveClass(/codicon-remove/); await expect(acts.first()).toHaveAttribute('title', 'Unstage Changes');
    await acts.first().click();
    await expect(page.locator(`${ROW} .resource-group > .name`)).toHaveText(['Changes']);
    await expect(rowByName(page, 'staged.txt').locator('.monaco-icon-label')).toHaveAttribute('data-letter', 'U');
  });

  test('T8 (c3): Discard rastreado → diálogo oficial (aria-modal, Esc cancela) → confirmar restaura o disco E recarrega o Monaco do arquivo aberto', async ({ page }) => {
    page0 = page; reseed();
    await openFilesTab(page); const sid = await openChanges(page);
    await page.evaluate(([s, u]) => window.__explorerSearchModule!.attach.open({ uri: u, kind: 'code', sessionId: s, pinned: true }), [sid, U('mod.txt')]);
    await expect(page.locator(`${ATTACH} .attach-monaco-host .view-lines`)).toContainText('v2');
    await page.locator(TAB).first().click();
    await rowByName(page, 'mod.txt').hover();
    await ACT('mod.txt', 'discard').click();
    await expect(dlg()).toBeVisible();
    await expect(dlg()).toHaveAttribute('aria-modal', 'true');
    await expect(dlg().locator('.dialog-message')).toHaveText("Are you sure you want to discard changes in 'mod.txt'?");
    await expect(dlg().locator('.dialog-buttons .monaco-button')).toHaveText(['Discard File', 'Cancel']);
    await page.keyboard.press('Escape');
    await expect(dlg()).toHaveCount(0);
    expect(readFileSync(join(DIR, 'mod.txt'), 'utf-8')).toBe('v2\n');
    await rowByName(page, 'mod.txt').hover();
    await ACT('mod.txt', 'discard').click();
    await dlg().locator('.monaco-button', { hasText: 'Discard File' }).click();
    await expect(dlg()).toHaveCount(0);
    await expect(rowByName(page, 'mod.txt')).toHaveCount(0);
    expect(readFileSync(join(DIR, 'mod.txt'), 'utf-8')).toBe('v1\n');
    // Monaco recarregou via watcher (arquivo limpo → reload silencioso)
    await page.locator(TAB).nth(1).click();
    await expect(page.locator(`${ATTACH} .attach-monaco-host .view-lines`)).toContainText('v1', { timeout: 10_000 });
    await expect(page.locator(TAB).nth(1)).not.toHaveClass(/dirty/);
  });

  test('T9 (c3): Discard untracked → diálogo "DELETE … untracked file" [Delete File] → arquivo some do disco e da lista', async ({ page }) => {
    page0 = page; reseed();
    await openFilesTab(page); await openChanges(page);
    await rowByName(page, 'new.txt').hover();
    await ACT('new.txt', 'discard').click();
    await expect(dlg().locator('.dialog-message')).toHaveText("Are you sure you want to DELETE the following untracked file: 'new.txt'?");
    await expect(dlg().locator('.dialog-buttons .monaco-button')).toHaveText(['Delete File', 'Cancel']);
    await dlg().locator('.monaco-button', { hasText: 'Delete File' }).click();
    await expect(rowByName(page, 'new.txt')).toHaveCount(0);
    expect(existsSync(join(DIR, 'new.txt'))).toBe(false);
  });

  test('T10 (c3): ações de grupo — Stage All (Changes) e Unstage All (Staged) em lote; Discard All pede confirmação plural', async ({ page }) => {
    page0 = page; reseed();
    await openFilesTab(page); await openChanges(page);
    const groupRow = (id: string) => page.locator(`${ROW}[data-group="${id}"]`);
    await groupRow('workingTree').hover();
    await groupRow('workingTree').locator('[data-testid="scm-group-stage-all"]').click();
    await expect(page.locator(`${ROW} .resource-group`).filter({ hasText: 'Changes' }).last().locator('.monaco-count-badge')).toHaveText('0');
    await expect(page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="index"]`)).toHaveCount(5);
    await groupRow('index').hover();
    await groupRow('index').locator('[data-testid="scm-group-unstage-all"]').click();
    await expect(page.locator(`${ROW} .resource-group > .name`)).toHaveText(['Changes']);
    await expect(page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="workingTree"]`)).toHaveCount(5);
    await groupRow('workingTree').hover();
    await groupRow('workingTree').locator('[data-testid="scm-group-discard-all"]').click();
    await expect(dlg().locator('.dialog-message')).toContainText('discard ALL changes in');
    await expect(dlg().locator('.dialog-buttons .monaco-button').first()).toHaveText(/^Discard All \d+ Files$/);
    await page.keyboard.press('Escape');
    await expect(dlg()).toHaveCount(0);
  });

  test('T11 (c3): teclado — linha focada: Tab vai para a 1.ª ação, Enter executa (Stage); Delete na linha = Discard (abre diálogo)', async ({ page }) => {
    page0 = page; reseed();
    await openFilesTab(page); await openChanges(page);
    const row = rowByName(page, 'deep.ts').locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " monaco-list-row ")]');
    await row.focus();
    await expect(row).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/codicon-discard/);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/codicon-add/);
    await page.keyboard.press('Enter');
    await expect(page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="index"]`).filter({ hasText: 'deep.ts' })).toHaveCount(1);
    const row2 = rowByName(page, 'mod.txt').locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " monaco-list-row ")]');
    await row2.focus();
    await page.keyboard.press('Delete');
    await expect(dlg().locator('.dialog-message')).toContainText("discard changes in 'mod.txt'");
    await page.keyboard.press('Escape');
  });
});
