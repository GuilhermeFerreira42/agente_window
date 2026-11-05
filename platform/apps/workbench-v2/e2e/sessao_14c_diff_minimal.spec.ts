// ============================================================================
// sessao_14c_diff_minimal.spec.ts — FATIA-04 · 4.7-c "Diff mínimo" (04_21 §7).
//   c1: DiffPane (Monaco DiffEditor read-only side-by-side) + aba fixa "Diff" + "No changes detected"
//   c2: clique na lista Changes abre o diff certo (index⇄worktree / HEAD⇄index) + badge/tooltip + empty state
// Fixture 5175 (repo git REAL criado pelo próprio spec). Rodar:
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/sessao_14c_diff_minimal.spec.ts
// ============================================================================
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BASE_URL } from './helpers';

declare global { interface Window { __explorerSearchModule?: { attach: { open(i: Record<string, unknown>): Promise<void>; closeAll(i: { sessionId: string }): Promise<void>; close(i: { uri: string; sessionId: string }): Promise<void>; getTabs(i: { sessionId: string }): Array<{ uri: string; kind: string; preview?: boolean; active?: boolean }>; setWidth(i: { sessionId: string; pixels: number }): void } } } }

const WS_DIR = '/tmp/explorer-fs-fixture';
const DIR = join(WS_DIR, 'e2e-fixture-root', 'gitdiff');
const ATTACH = '.auxiliary-bar .explorer-attach-area';
const TAB = `${ATTACH} .tabs-container > .tab`;
// 5.3: a Source Control View mora na Side Bar (view `scm`), não mais na aba "Changes" do anexo — só o endereço mudou.
const SCM = '[data-testid="side-bar"] [data-testid="side-bar-view-scm"]';
const DIFF_URI = 'file:///.explorer-search/diff';
const git = (...args: string[]) => execFileSync('git', args, { cwd: WS_DIR, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });

async function boot(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(500);
  if (!(await page.locator('.auxiliary-bar').count())) {
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '').toLowerCase().includes('auxiliar')); b?.click(); });
    await page.waitForTimeout(300);
  }
  if (!(await page.locator('[data-testid="side-bar"] [data-testid="explorer-view"]').first().isVisible().catch(() => false))) await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click(); // c3: Explorer vive na Side Bar (P2: só seletor)
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  const sid = await page.evaluate(() => document.querySelector('.auxiliary-bar[data-session-id]')!.getAttribute('data-session-id')!);
  return sid;
}
const openChanges = async (page: Page, _sid: string) => {
  // 5.3: a Source Control View vive na view `scm` da Side Bar (clique no ícone; já ativa → não fecha).
  if ((await page.locator('[data-testid="activity-bar-item"][data-view-id="scm"]').getAttribute('aria-selected')) !== 'true') await page.locator('[data-testid="activity-bar-item"][data-view-id="scm"]').click();
  await expect(page.locator(`${SCM} .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 10_000 });
};
const openDiff = (page: Page, sid: string, diff: { resource: string; title: string; original: string; modified: string }) =>
  page.evaluate(([s, u, d]) => window.__explorerSearchModule!.attach.open({ uri: u, kind: 'diff', sessionId: s, diff: d }), [sid, DIFF_URI, diff] as const);
const diffPane = (page: Page) => page.locator(`${ATTACH} [data-testid="attach-diff-pane"]`);

test.describe('FATIA-04 · 4.7-c — Diff mínimo (read-only, side-by-side) no Editor Anexo', () => {
  test.beforeAll(() => {
    if (existsSync(join(WS_DIR, '.git'))) rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(DIR, { recursive: true, force: true });
    mkdirSync(DIR, { recursive: true });
    git('init', '-q'); git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'e2e');
    writeFileSync(join(DIR, 'mod.ts'), 'const a = 1;\nconst b = 2;\n');
    writeFileSync(join(DIR, 'del.txt'), 'tchau\n');
    writeFileSync(join(DIR, 'same.txt'), 'igual\n');
    git('add', '-A'); git('commit', '-q', '-m', 'base');
    writeFileSync(join(DIR, 'mod.ts'), 'const a = 1;\nconst b = 3;\nconst c = 4;\n'); // M (worktree)
    unlinkSync(join(DIR, 'del.txt'));                                                  // D
    writeFileSync(join(DIR, 'new.txt'), 'novo\n');                                      // U
    writeFileSync(join(DIR, 'staged.txt'), 'st\n'); git('add', 'e2e-fixture-root/gitdiff/staged.txt'); // A (index)
  });
  test.afterAll(() => {
    rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
    rmSync(DIR, { recursive: true, force: true });
  });

  // ------------------------------------------------------------------ c1
  // FATIA-05 5.3 (decisão A do usuário, 2026-09-30 — D2.60): a aba fixa "Changes" do anexo foi REMOVIDA (a Source Control View vive na Side Bar). Este teste afirmava a LÓGICA da aba (não o motor) — conceito morreu; cobertura substituta: spec 15 T10–T15.
  test.skip('T1 (c1): aba fixa "Diff" após Changes (não-preview, com ✕) + Monaco DiffEditor side-by-side read-only 14/19 sem minimap', async ({ page }) => {
    const sid = await boot(page);
    await openChanges(page, sid);
    await openDiff(page, sid, { resource: 'file:///tmp/x/mod.ts', title: 'mod.ts (Working Tree)', original: 'const a = 1;\nconst b = 2;\n', modified: 'const a = 1;\nconst b = 3;\nconst c = 4;\n' });
    const tabs = page.locator(TAB);
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveAttribute('data-kind', 'changes');
    await expect(tabs.nth(1)).toHaveAttribute('data-kind', 'diff');
    await expect(tabs.nth(1)).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/preview/);
    await expect(tabs.nth(1).locator('.label-name')).toHaveText('mod.ts (Working Tree)');
    await expect(tabs.nth(1).locator('.tab-actions .codicon-close')).toBeAttached();
    // Monaco DiffEditor (renderSideBySide: true). Fidelidade VS Code: com largura < 900 px
    // (`diffEditor.useInlineViewWhenSpaceIsLimited`, padrão true) o Monaco usa a vista INLINE —
    // o editor "original" encolhe à calha e as remoções viram view-zones no "modified".
    const pane = diffPane(page);
    await expect(pane.locator('.monaco-diff-editor')).toBeVisible({ timeout: 20_000 });
    await expect(pane.locator('.monaco-diff-editor .editor.original .monaco-editor')).toBeAttached();
    await expect(pane.locator('.monaco-diff-editor .editor.modified .monaco-editor')).toBeVisible();
    const widths = await pane.locator('.monaco-diff-editor').evaluate((de) => ({ total: de.getBoundingClientRect().width, original: de.querySelector('.editor.original')!.getBoundingClientRect().width, modified: de.querySelector('.editor.modified')!.getBoundingClientRect().width }));
    if (widths.total < 900) { expect(widths.original).toBeLessThan(60); expect(widths.modified).toBeGreaterThan(widths.total * 0.7); }
    else { expect(widths.original).toBeGreaterThan(widths.total * 0.3); expect(widths.modified).toBeGreaterThan(widths.total * 0.3); }
    await expect(pane.locator('.monaco-diff-editor .editor.modified .view-lines').first()).toContainText('const c = 4;');
    await expect(pane.locator('.monaco-diff-editor')).toContainText('const b = 2;'); // linha removida (view-zone inline ou lado original)
    const m = await pane.locator('.monaco-diff-editor .editor.modified .view-line').first().evaluate((el) => { const cs = getComputedStyle(el.querySelector('span') ?? el); return { font: cs.fontSize, lh: el.getBoundingClientRect().height }; });
    expect(m.font).toBe('14px'); expect(Math.round(m.lh)).toBe(19);
    await expect(pane.locator('.monaco-diff-editor .minimap:visible')).toHaveCount(0);
    // read-only: digitar não altera o texto
    await pane.locator('.monaco-diff-editor .editor.modified .view-lines').click();
    await page.keyboard.type('XYZ');
    await expect(pane.locator('.monaco-diff-editor')).not.toContainText('XYZ');
    // linhas alteradas marcadas (decorações do diff)
    await expect.poll(() => pane.locator('.monaco-diff-editor .editor.modified .line-insert, .monaco-diff-editor .editor.modified .char-insert').count(), { timeout: 15_000 }).toBeGreaterThan(0);
  });

  test('T2 (c1): conteúdos idênticos → estado vazio centralizado "No changes detected" com codicon-check; reabrir com outro payload troca o conteúdo na MESMA aba (1 por sessão)', async ({ page }) => {
    const sid = await boot(page);
    await openChanges(page, sid);
    await openDiff(page, sid, { resource: 'file:///tmp/x/same.txt', title: 'same.txt (Working Tree)', original: 'igual\n', modified: 'igual\n' });
    const empty = diffPane(page).locator('[data-testid="attach-diff-empty"]');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveText(/No changes detected/);
    await expect(empty.locator('.codicon-check')).toBeAttached();
    await expect(diffPane(page).locator('.monaco-diff-editor:visible')).toHaveCount(0);
    await openDiff(page, sid, { resource: 'file:///tmp/x/mod.ts', title: 'mod.ts (Working Tree)', original: 'a\n', modified: 'b\n' });
    await expect(page.locator(`${TAB}[data-kind="diff"]`)).toHaveCount(1);
    await expect(page.locator(`${TAB}[data-kind="diff"] .label-name`)).toHaveText('mod.ts (Working Tree)');
    await expect(empty).toBeHidden();
    await expect(diffPane(page).locator('.monaco-diff-editor .editor.modified .monaco-editor')).toBeVisible({ timeout: 20_000 });
  });

  // FATIA-05 5.3 (decisão A do usuário, 2026-09-30 — D2.60): a aba fixa "Changes" do anexo foi REMOVIDA (a Source Control View vive na Side Bar). Este teste afirmava a LÓGICA da aba (não o motor) — conceito morreu; cobertura substituta: spec 15 T10–T15.
  test.skip('T3 (c1): Close All fecha os arquivos mas mantém Changes e Diff; ✕ na aba Diff fecha só ela', async ({ page }) => {
    const sid = await boot(page);
    await openChanges(page, sid);
    await openDiff(page, sid, { resource: 'file:///tmp/x/mod.ts', title: 'mod.ts (Working Tree)', original: 'a\n', modified: 'b\n' });
    await page.evaluate(([s]) => window.__explorerSearchModule!.attach.open({ uri: 'file:///tmp/explorer-fs-fixture/e2e-fixture-root/gitdiff/mod.ts', kind: 'code', sessionId: s, pinned: true }), [sid]);
    await expect(page.locator(TAB)).toHaveCount(3);
    await page.evaluate(([s]) => window.__explorerSearchModule!.attach.closeAll({ sessionId: s }), [sid]);
    await expect(page.locator(TAB)).toHaveCount(2);
    await expect(page.locator(`${TAB}[data-kind="changes"]`)).toHaveCount(1);
    await expect(page.locator(`${TAB}[data-kind="diff"]`)).toHaveCount(1);
    const diffTab = page.locator(`${TAB}[data-kind="diff"]`);
    await diffTab.hover();
    await diffTab.locator('.tab-actions .codicon-close').click();
    await expect(page.locator(TAB)).toHaveCount(1);
    await expect(page.locator(`${TAB}[data-kind="changes"]`)).toHaveClass(/active/);
  });

  // ======================= c2 =======================
  const row = (page: Page, group: 'index' | 'workingTree', name: string) => page.locator(`${SCM} .scm-view .monaco-list-row[data-in-group="${group}"]`).filter({ has: page.locator('.label-name', { hasText: new RegExp(`^${name}$`) }) });
  // vista inline (< 900 px): o editor "modified" carrega também as view-zones das remoções → usa-se o container
  const diffText = (page: Page) => diffPane(page).locator('.monaco-diff-editor');
  const modifiedText = (page: Page) => diffPane(page).locator('.monaco-diff-editor .editor.modified .view-lines').first();

  test('T4 (c2): clique na lista Changes abre o diff certo — M (index⇄worktree "Working Tree"), D (modificado vazio), U (original vazio), A staged ("Index", original vazio)', async ({ page }) => {
    const sid = await boot(page);
    await openChanges(page, sid);
    await row(page, 'workingTree', 'mod.ts').click();
    const diffTab = page.locator(`${TAB}[data-kind="diff"]`);
    await expect(diffTab).toHaveCount(1);
    await expect(diffTab.locator('.label-name')).toHaveText('mod.ts (Working Tree)');
    await expect(diffTab).toHaveClass(/active/);
    await expect(modifiedText(page)).toContainText('const c = 4;', { timeout: 20_000 });
    await expect(diffText(page)).toContainText('const b = 2;'); // lado original (index) — linha removida
    // D: deletado abre com lado modificado vazio (original = index)
    // 5.3: a lista fica sempre visível na Side Bar — não há aba para voltar
    await row(page, 'workingTree', 'del.txt').click();
    await expect(diffTab.locator('.label-name')).toHaveText('del.txt (Working Tree)');
    await expect(diffText(page)).toContainText('tchau', { timeout: 20_000 });
    await expect.poll(() => diffText(page).locator('.line-delete').count(), { timeout: 15_000 }).toBeGreaterThan(0); // remoção marcada
    // U: untracked → original vazio, modified = disco
    await row(page, 'workingTree', 'new.txt').click();
    await expect(diffTab.locator('.label-name')).toHaveText('new.txt (Working Tree)');
    await expect(diffText(page)).toContainText('novo', { timeout: 20_000 });
    await expect.poll(() => diffText(page).locator('.line-insert').count(), { timeout: 15_000 }).toBeGreaterThan(0); // inserção marcada
    // A (staged) → "(Index)": HEAD vazio ⇄ index
    await row(page, 'index', 'staged.txt').click();
    await expect(diffTab.locator('.label-name')).toHaveText('staged.txt (Index)');
    await expect(diffText(page)).toContainText('st', { timeout: 20_000 });
    await expect(page.locator(`${TAB}[data-kind="diff"]`)).toHaveCount(1); // sempre a MESMA aba
  });

  // FATIA-05 5.3 (decisão A do usuário, 2026-09-30 — D2.60): a aba fixa "Changes" do anexo foi REMOVIDA (a Source Control View vive na Side Bar). Este teste afirmava a LÓGICA da aba (não o motor) — conceito morreu; cobertura substituta: spec 15 T10–T15.
  test.skip('T5 (c2): badge na aba Changes = total de alterações (index + working tree); some quando o repo fica limpo; lista vazia mostra "No source control changes detected"', async ({ page }) => {
    const sid = await boot(page);
    await openChanges(page, sid);
    const changesTab = page.locator(`${TAB}[data-kind="changes"]`);
    const badge = changesTab.locator('[data-testid="changes-tab-badge"]');
    await expect(badge).toHaveText('4'); // mod.ts M · del.txt D · new.txt U · staged.txt A
    await expect(changesTab).toHaveAttribute('title', '4 files changed');
    // limpa o repo por fora (git) → badge some, empty state aparece
    git('add', '-A'); git('commit', '-q', '-m', 'limpa');
    await page.locator(`${SCM} [data-testid="scm-provider"]`).hover();
    await page.locator(`${SCM} [data-testid="scm-refresh"]`).click();
    await expect(badge).toHaveCount(0, { timeout: 15_000 });
    await expect(changesTab).toHaveAttribute('title', '0 files changed');
    await expect(page.locator(`${SCM} [data-testid="scm-empty"]`)).toHaveText('No source control changes detected');
    // 1 alteração → singular
    writeFileSync(join(DIR, 'mod.ts'), 'const a = 1;\n');
    await page.locator(`${SCM} [data-testid="scm-provider"]`).hover();
    await page.locator(`${SCM} [data-testid="scm-refresh"]`).click();
    await expect(badge).toHaveText('1', { timeout: 15_000 });
    await expect(changesTab).toHaveAttribute('title', '1 file changed');
    await expect(page.locator(`${SCM} [data-testid="scm-empty"]`)).toHaveCount(0);
  });

  // FATIA-05 5.3 (decisão A do usuário, 2026-09-30 — D2.60): a aba fixa "Changes" do anexo foi REMOVIDA (a Source Control View vive na Side Bar). Este teste afirmava a LÓGICA da aba (não o motor) — conceito morreu; cobertura substituta: spec 15 T10–T15.
  test.skip('T6 (c2): "Open Source Control" usa a sessão REAL do anexo (nunca "default") — inclusive quando clicado ANTES de o anexo montar (fica pendente e abre na montagem); e após reload (F5)', async ({ page }) => {
    const sid = await boot(page);
    const openViaHeader = async () => {
      await page.locator('[data-testid="explorer-view"] .pane-header').first().hover();
      await page.locator('[data-testid="explorer-open-changes"]').click();
    };
    const tabsOf = (s: string) => page.evaluate((x) => window.__explorerSearchModule!.attach.getTabs({ sessionId: x }).map((t) => t.kind), s);
    // 1) anexo montado: abre na sessão real
    await openViaHeader();
    await expect(page.locator(`${ATTACH}[data-visible="true"] .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 10_000 });
    expect(await tabsOf(sid)).toEqual(['changes']);
    expect(await tabsOf('default')).toEqual([]);
    // 2) anexo DESMONTADO (como antes de o shell montar / troca de host): clique fica pendente, nada em "default"
    await page.evaluate(([s]) => window.__explorerSearchModule!.attach.close({ uri: 'file:///.explorer-search/changes', sessionId: s }), [sid]);
    await page.evaluate(() => {
      const area = document.querySelector('.auxiliary-bar .explorer-attach-area')!;
      (window as unknown as { __attachHost: Element }).__attachHost = area.parentElement!.parentElement!;
      (window.__explorerSearchModule as unknown as { unmountAttach(): void }).unmountAttach();
    });
    await page.waitForTimeout(100);
    await expect(page.locator(`${ATTACH}`)).toHaveCount(0);
    await openViaHeader();
    await page.waitForTimeout(300);
    expect(await tabsOf('default')).toEqual([]);
    expect(await tabsOf(sid)).toEqual([]);
    // 3) remonta com a sessão real → a abertura pendente acontece nela
    await page.evaluate(([s]) => (window.__explorerSearchModule as unknown as { mountAttach(r: Element, o: { sessionId: string }): void }).mountAttach((window as unknown as { __attachHost: Element }).__attachHost, { sessionId: s }), [sid]);
    await expect(page.locator(`${ATTACH} .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 10_000 });
    expect(await tabsOf(sid)).toEqual(['changes']);
    expect(await tabsOf('default')).toEqual([]);
    // 4) F5 → sem aba fantasma
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    if (!(await page.locator('[data-testid="side-bar"] [data-testid="explorer-view"]').first().isVisible().catch(() => false))) await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click(); // c3: Explorer vive na Side Bar (P2: só seletor)
    await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
    await openViaHeader();
    await expect(page.locator(`${ATTACH}[data-visible="true"] .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 10_000 });
    expect(await tabsOf('default')).toEqual([]);
    expect((await tabsOf(sid)).filter((k) => k === 'changes')).toHaveLength(1);
  });
});
