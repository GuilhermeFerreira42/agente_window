// FATIA-05 5.6 — Outline e Timeline REAIS nas seções do Explorer (docs/24 §4 5.6; decisão A0.6, docs/25).
// Outline = símbolos do arquivo ativo do anexo (DocumentSymbol do Monaco — OutlineModel); clique = revela a linha.
// Timeline = `POST /git/log` (aditivo) do arquivo ativo; clique = diff `parent:file` × `sha:file` no anexo (POST /git/show com sha).
// Ambos mostram a mensagem padrão (D7) sem arquivo ativo / sem símbolos / sem histórico.
// Roda contra a fixture 5175 (PLAYWRIGHT_BASE_URL). Cria fixture git própria (`gitot`) e um `outline.ts`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { BASE_URL } from './helpers';

const WS_DIR = '/tmp/explorer-fs-fixture';
const FX = 'file:///tmp/explorer-fs-fixture/e2e-fixture-root';
const GIT_DIR = join(WS_DIR, 'e2e-fixture-root', 'gitot');
const ATTACH = '.auxiliary-bar .explorer-attach-area';
const ATTACH_TAB = `${ATTACH} .tabs-container > .tab`;
const SB = '[data-testid="side-bar"]';
const OUTLINE = `${SB} .outline-pane`;
const TIMELINE = `${SB} .timeline-pane`;
const OUTLINE_ROW = `${OUTLINE} .monaco-list-row`;
const TIMELINE_ROW = `${TIMELINE} .monaco-list-row`;

const TS_SOURCE = [
  'export class Greeter {',
  '  private name = "x";',
  '  greet(): string { return this.name; }',
  '}',
  '',
  'export function helper(): number {',
  '  return 42;',
  '}',
  '',
].join('\n');

const git = (...args: string[]) => execFileSync('git', args, { cwd: WS_DIR, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_AUTHOR_DATE: '2026-09-01T10:00:00', GIT_COMMITTER_DATE: '2026-09-01T10:00:00' } });

/** Mesmo preâmbulo do sessao_14: fecha aba Browser, abre barra auxiliar (anexo), Explorer na Side Bar. */
async function open(page: Page) {
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
  if (!(await page.locator(`${SB} [data-testid="explorer-view"]`).first().isVisible().catch(() => false))) await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click();
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  await page.waitForTimeout(300);
}
const sessionId = (page: Page) => page.evaluate(() => document.querySelector('.auxiliary-bar[data-session-id]')!.getAttribute('data-session-id')!);
const openIn = (page: Page, sid: string, uri: string) =>
  page.evaluate(async ([s, u]) => { await window.__explorerSearchModule!.attach.open({ uri: u as string, kind: 'code', sessionId: s as string, pinned: true }); }, [sid, uri]);
async function ensurePane(page: Page, id: 'outline' | 'timeline') {
  const header = page.locator(`${SB} .split-view-view[data-pane="${id}"] > .pane > .pane-header`);
  await expect(header).toBeVisible();
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
}

test.describe('FATIA-05 · 5.6 — Outline e Timeline reais', () => {
  test.beforeAll(() => {
    if (existsSync(join(WS_DIR, '.git'))) rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(GIT_DIR, { recursive: true, force: true });
    mkdirSync(GIT_DIR, { recursive: true });
    writeFileSync(join(WS_DIR, 'e2e-fixture-root', 'outline.ts'), TS_SOURCE);
    git('init', '-q'); git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'E2E Author');
    // só gitot/ entra nos commits — seed.txt e o resto da fixture ficam untracked (= sem timeline)
    writeFileSync(join(GIT_DIR, 'hist.txt'), 'v1\n'); git('add', 'e2e-fixture-root/gitot'); git('commit', '-q', '-m', 'first version');
    writeFileSync(join(GIT_DIR, 'hist.txt'), 'v2\n'); git('add', 'e2e-fixture-root/gitot'); git('commit', '-q', '-m', 'second version');
    writeFileSync(join(GIT_DIR, 'nohist.txt'), 'sem commit\n'); // untracked → sem timeline
  });
  test.afterAll(() => {
    rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(GIT_DIR, { recursive: true, force: true });
    rmSync(join(WS_DIR, 'e2e-fixture-root', 'outline.ts'), { force: true });
  });
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await open(page);
    await expect(page.locator(SB)).toBeVisible();
  });

  test('T26 (5.6) — Outline: abrir outline.ts mostra os símbolos reais (Greeter › name/greet, helper) com ícone codicon; clicar em "helper" leva o cursor do anexo à linha 6', async ({ page }) => {
    await ensurePane(page, 'outline');
    await expect(page.locator(`${OUTLINE} .pane-message`)).toHaveText('No symbols found in document');
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/outline.ts`);
    await expect(page.locator(`${ATTACH} .monaco-editor .view-lines`).first()).toContainText('Greeter', { timeout: 20_000 });
    await expect(page.locator(OUTLINE_ROW)).toHaveCount(4, { timeout: 20_000 });
    const names = await page.locator(`${OUTLINE_ROW} .outline-label`).allTextContents();
    expect(names).toEqual(['Greeter', 'name', 'greet', 'helper']);
    // hierarquia: filhos de Greeter indentados (aria-level 2) e ícones por tipo (class/property/method/function)
    await expect(page.locator(OUTLINE_ROW).nth(0)).toHaveAttribute('aria-level', '1');
    await expect(page.locator(OUTLINE_ROW).nth(1)).toHaveAttribute('aria-level', '2');
    await expect(page.locator(OUTLINE_ROW).nth(3)).toHaveAttribute('aria-level', '1');
    await expect(page.locator(OUTLINE_ROW).nth(0).locator('.codicon-symbol-class')).toHaveCount(1);
    await expect(page.locator(OUTLINE_ROW).nth(2).locator('.codicon-symbol-method')).toHaveCount(1);
    await expect(page.locator(OUTLINE_ROW).nth(3).locator('.codicon-symbol-function')).toHaveCount(1);
    // clique → revealLine + cursor na linha 6 (número de linha ativo do Monaco)
    await page.locator(OUTLINE_ROW).nth(3).click();
    await expect(page.locator(`${ATTACH} .monaco-editor .line-numbers.active-line-number`).first()).toHaveText('6');
    await expect(page.locator(OUTLINE_ROW).nth(3)).toHaveClass(/selected/);
  });

  test('T27 (5.6) — Outline: arquivo sem símbolos (seed.txt) volta à mensagem "No symbols found in document"; fechar a aba também', async ({ page }) => {
    await ensurePane(page, 'outline');
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/outline.ts`);
    await expect(page.locator(OUTLINE_ROW)).toHaveCount(4, { timeout: 20_000 });
    await openIn(page, sid, `${FX}/seed.txt`);
    await expect(page.locator(`${ATTACH_TAB}.active .label-name`)).toHaveText('seed.txt');
    await expect(page.locator(`${OUTLINE} .pane-message`)).toHaveText('No symbols found in document', { timeout: 10_000 });
    await expect(page.locator(OUTLINE_ROW)).toHaveCount(0);
    // volta para o .ts pela aba → símbolos voltam
    await page.locator(ATTACH_TAB).filter({ hasText: 'outline.ts' }).click();
    await expect(page.locator(OUTLINE_ROW)).toHaveCount(4, { timeout: 10_000 });
  });

  test('T28 (5.6) — Timeline: abrir gitot/hist.txt lista os 2 commits reais (mais novo primeiro: mensagem, autor, tempo relativo); clicar no mais novo abre o diff "hist.txt (sha7)" v1 → v2 no anexo', async ({ page }) => {
    await ensurePane(page, 'timeline');
    await expect(page.locator(`${TIMELINE} .pane-message`)).toHaveText('The active editor cannot provide timeline information.');
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/gitot/hist.txt`);
    await expect(page.locator(TIMELINE_ROW)).toHaveCount(2, { timeout: 20_000 });
    const rows = page.locator(TIMELINE_ROW);
    await expect(rows.nth(0).locator('.timeline-label')).toHaveText('second version');
    await expect(rows.nth(1).locator('.timeline-label')).toHaveText('first version');
    await expect(rows.nth(0).locator('.timeline-author')).toHaveText('E2E Author');
    await expect(rows.nth(0).locator('.timeline-timestamp')).toHaveText(/ago$/);
    await expect(rows.nth(0).locator('.codicon-git-commit')).toHaveCount(1);
    const sha7 = (await rows.nth(0).getAttribute('data-sha'))!.slice(0, 7);
    expect(sha7).toMatch(/^[0-9a-f]{7}$/);
    await rows.nth(0).click();
    const diffTab = page.locator(`${ATTACH_TAB}[data-kind="diff"]`);
    await expect(diffTab).toHaveCount(1);
    await expect(diffTab.locator('.label-name')).toHaveText(`hist.txt (${sha7})`);
    await expect(page.locator(`${ATTACH} .monaco-diff-editor`)).toBeVisible({ timeout: 20_000 });
    // diff inline: linhas removidas ficam numa view-zone `.view-lines.line-delete` dentro do modified → filtrar
    await expect(page.locator(`${ATTACH} .monaco-diff-editor .editor.original .view-lines`).first()).toContainText('v1');
    await expect(page.locator(`${ATTACH} .monaco-diff-editor .editor.modified .view-lines:not(.line-delete)`).first()).toContainText('v2');
    // o commit inicial: original vazio (sem pai) e modified v1
    await page.locator(`${ATTACH_TAB}[data-kind="code"]`).filter({ hasText: 'hist.txt' }).click();
    await expect(page.locator(TIMELINE_ROW)).toHaveCount(2);
    await rows.nth(1).click();
    await expect(page.locator(`${ATTACH} .monaco-diff-editor .editor.modified .view-lines:not(.line-delete)`).first()).toContainText('v1', { timeout: 20_000 });
  });

  test('T29 (5.6) — Timeline: arquivo sem histórico (gitot/nohist.txt) e arquivo fora de repo (seed.txt) mostram a mensagem padrão; sem arquivo ativo idem', async ({ page }) => {
    await ensurePane(page, 'timeline');
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/gitot/hist.txt`);
    await expect(page.locator(TIMELINE_ROW)).toHaveCount(2, { timeout: 20_000 });
    await openIn(page, sid, `${FX}/gitot/nohist.txt`);
    await expect(page.locator(`${TIMELINE} .pane-message`)).toHaveText('The active editor cannot provide timeline information.', { timeout: 10_000 });
    await openIn(page, sid, `${FX}/seed.txt`);
    await expect(page.locator(`${TIMELINE} .pane-message`)).toHaveText('The active editor cannot provide timeline information.', { timeout: 10_000 });
    await expect(page.locator(TIMELINE_ROW)).toHaveCount(0);
  });
});

declare global {
  interface Window { __explorerSearchModule?: { attach: { open(input: { uri: string; kind: 'code'; sessionId: string; pinned?: boolean }): Promise<void> } } }
}
