// ============================================================================
// Sessão 15 — FATIA-05 "Chassis-Right" · Sub-fatia 5.1 (docs/24 v1.1)
// Régua: raspagem real do 8080 com a Side Bar à DIREITA
//   (docs/engenharia_reversa/FATIA-05_LAYOUT/05_01_raspagem_layout_vscode.md §1, §2, §4):
//   ordem horizontal  [lista de sessões][centro + AttachArea][Side Bar][Activity Bar]
//   Activity Bar 48 px · item 48×48 · codicon 24 px · indicador ::before border-left 2 px com left 46 px
//   Side Bar: título 35 px (h2 11 px uppercase, peso 400) · sash 4 px · largura padrão min(300, largura/4)
//   · mínimo 170 · máximo largura − 220 · snap-to-close · reabrir devolve a MESMA largura
//   Side Bar fechada: box 0 (display none, D17) mas React montado; indicador 2 px permanece no último ativo (D25)
//
// Suíte SERIAL. Cada Tk passa a partir de um commit da 5.1:
//   T1 ← c1 feat(activity-bar) · T2/T3/T4/T4b(RF-09) ← c2 feat(side-bar) · T5 ← c3 feat(view-registry)
//   T6–T9 ← 5.2 feat(search): Search na Side Bar (RF-04/RF-06)
//   T16–T20 ← 5.4 feat(activity-bar): movível por menu de contexto (RF-10; top/bottom adiados, D2.64)
//   T10–T15 ← 5.3 feat(scm): Source Control na Side Bar, diff no anexo, badge git.count(), maquete "Changes N" removida (RF-05/RF-06)
// Antes do c1 a suíte inteira falha em T1 (prova do "falhando antes").
//
// Persistência: `workbench.layoutState.v1` é limpa no beforeEach de TODOS os testes; só o T4 grava e relê.
// Rodar (fixture 5175 com seed.txt — necessário só para o T5):
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/sessao_15_activity_bar.spec.ts
// ============================================================================
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { BASE_URL } from './helpers';

declare global {
  interface Window { __explorerSearchModule?: { attach: {
    open(i: { uri: string; kind: 'code'; sessionId: string; pinned?: boolean }): Promise<void>;
    closeAll(i: { sessionId: string }): Promise<void>;
  } } }
}

const LAYOUT_KEY = 'workbench.layoutState.v1';
const AB = '[data-testid="activity-bar"]';
const SB = '[data-testid="side-bar"]';
const SASH = '[data-testid="side-bar-sash"]';
const ITEM = '[data-testid="activity-bar-item"]';
const item = (id: string) => `${ITEM}[data-view-id="${id}"]`;

const rect = async (l: Locator) => l.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right }; });
const before = (l: Locator, prop: string) => l.evaluate((e, p) => getComputedStyle(e, '::before').getPropertyValue(p), prop);
const mainRegionWidth = (page: Page) => page.locator('.main-region').evaluate((e) => e.getBoundingClientRect().width);
const expectedDefaultWidth = (mainW: number) => Math.min(300, Math.floor(mainW / 4));

async function open(page: Page) {
  // limpa a chave só na PRIMEIRA carga da aba (sessionStorage sobrevive ao reload — o T4 precisa reler)
  await page.addInitScript((k) => { try { if (!sessionStorage.getItem('s15-cleared')) { localStorage.removeItem(k); sessionStorage.setItem('s15-cleared', '1'); } } catch { /* noop */ } }, LAYOUT_KEY);
  await page.goto(BASE_URL);
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(300);
}

async function dragSash(page: Page, toX: number) {
  const s = await rect(page.locator(SASH));
  // coordenadas inteiras: o Chromium arredonda ponteiro fracionário e isso vira ±1 px no delta
  const startX = Math.round(s.x + s.w / 2);
  await page.mouse.move(startX, s.y + 200);
  await page.mouse.down();
  await page.mouse.move(Math.round(toX), s.y + 200, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(100);
}

test.describe.configure({ mode: 'serial' });

test.describe('FATIA-05 · 5.1 — Activity Bar + Side Bar à DIREITA (Chassis-Right)', () => {
  test.beforeEach(async ({ page }) => { await open(page); });

  test('T1 (c1) — Activity Bar 48 px na ponta DIREITA, 3 tabs (explorer/search/scm), codicon 24 px, aria-selected, indicador 2 px na face externa; lista de sessões continua à esquerda', async ({ page }) => {
    const ab = page.locator(AB);
    await expect(ab).toBeVisible();
    const r = await rect(ab);
    const vw = await page.evaluate(() => window.innerWidth);
    expect(Math.round(r.w), 'RF-01: 48 px').toBe(48);
    expect(r.x, 'RF-01: encostada na borda direita').toBeGreaterThan(vw - 60);
    // o shell mantém um floatingPanelGap (4 px) ao redor do grid — a tirinha encosta na borda do grid
    // ("não medido — validar na homologação": no vídeo a tirinha pode ser flush ao viewport)
    expect(Math.round(r.right)).toBeGreaterThanOrEqual(vw - 8);
    // ordem [lista de sessões] ... [Side Bar?][Activity Bar]
    const sessions = await rect(page.locator('.sessions-sidebar'));
    expect(sessions.x).toBeLessThan(r.x);
    expect(Math.round(await rect(page.locator('.main-region')).then((m) => m.right))).toBe(Math.round(r.right));
    // 3 tabs na ordem do VS Code
    const items = page.locator(ITEM);
    await expect(items).toHaveCount(3);
    expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-view-id')))).toEqual(['explorer', 'search', 'scm']);
    await expect(ab.locator('[role="tablist"]')).toHaveCount(1);
    for (const id of ['explorer', 'search', 'scm']) {
      const li = page.locator(item(id));
      await expect(li).toHaveAttribute('role', 'tab');
      const box = await rect(li);
      expect([Math.round(box.w), Math.round(box.h)]).toEqual([48, 48]);
      const label = li.locator('.action-label');
      expect(await label.evaluate((e) => getComputedStyle(e).fontSize)).toBe('24px');
      await expect(label).toHaveClass(/codicon/);
    }
    // tooltips em inglês (D3), com o atalho como no VS Code
    await expect(page.locator(item('explorer')).locator('.action-label')).toHaveAttribute('aria-label', 'Explorer (Ctrl+Shift+E)');
    await expect(page.locator(item('search')).locator('.action-label')).toHaveAttribute('aria-label', 'Search (Ctrl+Shift+F)');
    await expect(page.locator(item('scm')).locator('.action-label')).toHaveAttribute('aria-label', 'Source Control (Ctrl+Shift+G)');
    // Explorer ativo: aria-selected + indicador de 2 px na face externa (left 46 px no modo direito)
    await expect(page.locator(item('explorer'))).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(item('search'))).toHaveAttribute('aria-selected', 'false');
    const activeInd = page.locator(item('explorer')).locator('.active-item-indicator');
    expect(await before(activeInd, 'border-left-width')).toBe('2px');
    expect(await before(activeInd, 'left')).toBe('46px');
    expect(await before(page.locator(item('search')).locator('.active-item-indicator'), 'border-left-width')).toBe('0px');
    // zero badge (RF-11) e nada fixed
    await expect(ab.locator('.badge-content')).toHaveCount(0);
    expect(await ab.evaluate((e) => [e, ...e.querySelectorAll('*')].some((n) => getComputedStyle(n).position === 'fixed'))).toBe(false);
  });

  test('T2 (c2) — Side Bar à esquerda da Activity Bar: largura padrão min(300, largura/4), título 35 px "EXPLORER" (11 px uppercase), clicar em Search troca título e aria-selected mantendo a largura', async ({ page }) => {
    const sb = page.locator(SB);
    await expect(sb).toBeVisible();
    const s = await rect(sb);
    const a = await rect(page.locator(AB));
    expect(Math.round(s.right), 'Side Bar encosta na Activity Bar').toBe(Math.round(a.x));
    expect(Math.round(s.h)).toBe(Math.round(a.h));
    const mainW = await mainRegionWidth(page);
    expect(Math.round(s.w), 'RF-02: padrão min(300, largura/4)').toBe(expectedDefaultWidth(mainW));
    const title = sb.locator('.composite-title');
    expect(Math.round((await rect(title)).h)).toBe(35);
    const h2 = title.locator('h2');
    await expect(h2).toHaveText('Explorer');
    expect(await h2.evaluate((e) => [getComputedStyle(e).fontSize, getComputedStyle(e).textTransform, getComputedStyle(e).fontWeight])).toEqual(['11px', 'uppercase', '400']);
    // trocar de view: título muda, aria-selected muda, largura NÃO muda, Explorer continua montado (display none)
    await page.locator(item('search')).click();
    await expect(h2).toHaveText('Search');
    await expect(page.locator(item('search'))).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator(item('explorer'))).toHaveAttribute('aria-selected', 'false');
    expect(Math.round((await rect(sb)).w)).toBe(expectedDefaultWidth(mainW));
    const explorerPane = sb.locator('[data-view-pane="explorer"]');
    await expect(explorerPane).toHaveCount(1);
    expect(await explorerPane.evaluate((e) => getComputedStyle(e).display)).toBe('none');
    expect(await sb.locator('[data-view-pane="search"]').evaluate((e) => getComputedStyle(e).display)).not.toBe('none');
    await page.locator(item('scm')).click();
    await expect(h2).toHaveText('Source Control');
  });

  test('T3 (c2) — toggle: clique no ativo fecha (box 0, React montado, indicador permanece), clique de novo reabre com a MESMA largura; Ctrl+B; sash 4 px arrasta com min 170, máx largura − 220, dblclick reset, snap-to-close', async ({ page }) => {
    const sb = page.locator(SB);
    const explorer = page.locator(item('explorer'));
    const mainW = await mainRegionWidth(page);
    // sash: 4 px, separator vertical, colado na borda ESQUERDA da Side Bar
    const sash = page.locator(SASH);
    await expect(sash).toHaveAttribute('role', 'separator');
    await expect(sash).toHaveAttribute('aria-orientation', 'vertical');
    const s0 = await rect(sash);
    expect(Math.round(s0.w), 'D22: 4 px').toBe(4);
    const sb0 = await rect(sb);
    expect(Math.abs(s0.x + s0.w / 2 - sb0.x)).toBeLessThanOrEqual(2);
    // arrastar para a esquerda alarga (Side Bar à direita)
    await dragSash(page, sb0.x - 60);
    const widened = Math.round((await rect(sb)).w);
    expect(Math.abs(widened - (Math.round(sb0.w) + 60))).toBeLessThanOrEqual(1);
    // máximo = largura − Activity Bar (48) − editor mínimo (220)  (05_01 §2: 1012 em 1280)
    await dragSash(page, 0);
    expect(Math.round((await rect(sb)).w)).toBe(Math.floor(mainW) - 48 - 220);
    // dblclick no sash → volta ao padrão
    const sMax = await rect(sash);
    await page.mouse.dblclick(sMax.x + sMax.w / 2, sMax.y + 200);
    await page.waitForTimeout(100);
    expect(Math.round((await rect(sb)).w)).toBe(expectedDefaultWidth(mainW));
    // arrastar para a direita até abaixo de 170 → mínimo 170 antes do snap...
    const sbD = await rect(sb);
    await dragSash(page, sbD.x + (sbD.w - 180));
    const narrow = Math.round((await rect(sb)).w); // ≈180 (±1 de arredondamento do ponteiro)
    expect(Math.abs(narrow - 180)).toBeLessThanOrEqual(1);
    await dragSash(page, (await rect(sb)).x + 40);
    // ...snap-to-close: box 0 mas continua montada
    await expect(sb).toBeHidden();
    await expect(sb).toHaveCount(1);
    await expect(explorer).toHaveAttribute('aria-selected', 'false');
    await expect(explorer).toHaveAttribute('aria-expanded', 'false');
    expect(await before(explorer.locator('.active-item-indicator'), 'border-left-width'), 'D25: indicador permanece').toBe('2px');
    // clicar no ícone reabre com a MESMA largura de antes do snap (180)
    await explorer.click();
    await expect(sb).toBeVisible();
    expect(Math.round((await rect(sb)).w), 'D24: mesma largura').toBe(narrow);
    await expect(explorer).toHaveAttribute('aria-expanded', 'true');
    // clique no ativo fecha; clique de novo abre
    await explorer.click();
    await expect(sb).toBeHidden();
    const ab = await rect(page.locator(AB));
    expect(Math.round(ab.w)).toBe(48);
    await explorer.click();
    await expect(sb).toBeVisible();
    expect(Math.round((await rect(sb)).w)).toBe(narrow);
    // Ctrl+B
    await page.keyboard.press('Control+b');
    await expect(sb).toBeHidden();
    await page.keyboard.press('Control+b');
    await expect(sb).toBeVisible();
    expect(Math.round((await rect(sb)).w)).toBe(narrow);
    // abrir é instantâneo (RF-11: sem animação de 200 ms) e nada é position: fixed
    expect(await sb.evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
    expect(await sb.evaluate((e) => [e, ...e.querySelectorAll('*')].some((n) => getComputedStyle(n).position === 'fixed'))).toBe(false);
  });

  test('T4 (c3) — persistência em workbench.layoutState.v1: largura, visibilidade e view ativa sobrevivem ao reload; activityBarPosition gravado como "right"', async ({ page }) => {
    const sb = page.locator(SB);
    const sb0 = await rect(sb);
    await dragSash(page, sb0.x - 40);
    const w = Math.round((await rect(sb)).w);
    await page.locator(item('search')).click();
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), LAYOUT_KEY);
    expect(stored).toMatchObject({ sideBarWidth: w, sideBarVisible: true, activeView: 'search', activityBarPosition: 'right' });
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await expect(sb).toBeVisible();
    expect(Math.round((await rect(sb)).w)).toBe(w);
    await expect(page.locator(item('search'))).toHaveAttribute('aria-selected', 'true');
    await expect(sb.locator('.composite-title h2')).toHaveText('Search');
    // fechada + reload → continua fechada, e ao reabrir devolve a largura persistida
    await page.locator(item('search')).click();
    await expect(sb).toBeHidden();
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await expect(sb).toBeHidden();
    await page.locator(item('explorer')).click();
    await expect(sb).toBeVisible();
    expect(Math.round((await rect(sb)).w)).toBe(w);
  });

  test('T4b (c2 → 5.7 v1.2) — anexo maximizado MANTÉM a Side Bar 274 (lista de sessões continua; o chat SOME — editor toma o centro); restaurar traz o chat de volta; se a Side Bar já estava fechada, continua fechada', async ({ page, request }) => {
    const FX = 'file:///tmp/explorer-fs-fixture/e2e-fixture-root';
    await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: `${FX}/srch` } });
    await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: `${FX}/srch/a.ts`, content: 'export const a = 1;\n' } });
    if (!(await page.locator('.auxiliary-bar').count())) {
      await page.getByRole('button', { name: 'Alternar barra auxiliar' }).first().click();
      await page.waitForTimeout(300);
    }
    const sid = await page.evaluate(() => document.querySelector('.auxiliary-bar[data-session-id]')!.getAttribute('data-session-id')!);
    await page.evaluate(([s, u]) => window.__explorerSearchModule!.attach.open({ sessionId: s, uri: u, kind: 'code', pinned: true }), [sid, `${FX}/srch/a.ts`] as const);
    const attach = page.locator('.auxiliary-bar .explorer-attach-area');
    await expect(attach).toBeVisible();
    const sb = page.locator(SB);
    await expect(sb).toBeVisible();
    const btn = attach.locator('[data-testid="attach-maximize"]');
    await btn.click();
    await expect(attach).toHaveClass(/is-maximized/);
    await expect(sb, 'docs/24 v1.2 (2026-10-02, RF-09 revogado p/ 5.7): Side Bar fica visível ao maximizar').toBeVisible();
    expect(Math.abs((await sb.boundingBox())!.width - 274)).toBeLessThanOrEqual(2);
    await expect(page.locator('.sessions-sidebar').first()).toBeVisible();
    await expect(page.locator('.chat-pane').first(), '5.7 (D6/RF-07): maximizado = editor no centro, chat some').toBeHidden();
    await expect(page.locator(AB), 'Activity Bar permanece').toBeVisible();
    await btn.click();
    await expect(attach).not.toHaveClass(/is-maximized/);
    await expect(sb, 'restaurar devolve a Side Bar').toBeVisible();
    await expect(page.locator('.chat-pane').first(), 'restaurar devolve o chat').toBeVisible();
    // Side Bar já fechada antes de maximizar → maximizar/restaurar não mexem nela (continua fechada)
    await page.locator(item('explorer')).click();
    await expect(sb).toBeHidden();
    await btn.click();
    await expect(attach).toHaveClass(/is-maximized/);
    await btn.click();
    await expect(attach).not.toHaveClass(/is-maximized/);
    await expect(sb).toBeHidden();
    await page.evaluate((s) => window.__explorerSearchModule!.attach.closeAll({ sessionId: s }), sid);
  });

  test('T5 (c3) — Explorer REAL dentro da Side Bar (seed.txt), seções OUTLINE/TIMELINE colapsadas, aba Files sai da AuxiliaryBar, AttachArea continua nela; expandir → trocar de view / fechar e reabrir → continua expandido (mount idempotente); Terminal intocado', async ({ page }) => {
    const sb = page.locator(SB);
    const view = sb.locator('[data-testid="explorer-view"]');
    await expect(view).toBeVisible();
    await expect(view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first()).toBeVisible({ timeout: 10000 });
    // seções do Explorer (D7): Outline/Timeline colapsadas, dentro da Side Bar
    for (const name of ['Outline Section', 'Timeline Section']) {
      const header = view.locator(`.pane-header[aria-label="${name}"]`);
      await expect(header).toBeVisible();
      await expect(header).toHaveAttribute('aria-expanded', 'false');
    }
    // árvore fora da AuxiliaryBar; aba Files não existe mais; AttachArea segue na AuxiliaryBar (D6)
    await expect(page.locator('.auxiliary-bar [data-testid="explorer-view"]')).toHaveCount(0);
    await expect(page.locator('[id^="aux-tab-"][id$="-files"]')).toHaveCount(0);
    await expect(page.locator('.auxiliary-bar .explorer-attach-area')).toHaveCount(1);
    // ordem [centro][AttachArea][Side Bar][Activity Bar]
    const auxRight = await page.locator('.auxiliary-bar').evaluate((e) => e.getBoundingClientRect().right);
    expect(auxRight).toBeLessThanOrEqual((await rect(sb)).x + 1);
    // expandir pasta-semente → trocar de view e voltar → continua expandida; fechar/reabrir a Side Bar → idem
    const seedRow = view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
    if ((await seedRow.getAttribute('aria-expanded')) !== 'true') await seedRow.click();
    await expect(seedRow).toHaveAttribute('aria-expanded', 'true');
    await expect(view.locator('[role="treeitem"]', { hasText: 'seed.txt' }).first()).toBeVisible();
    const pasta = view.locator('[role="treeitem"]', { hasText: 'pasta' }).first();
    await pasta.click();
    await expect(pasta).toHaveAttribute('aria-expanded', 'true');
    await expect(view.locator('[role="treeitem"]', { hasText: 'alpha.txt' }).first()).toBeVisible();
    await page.locator(item('search')).click();
    await page.locator(item('explorer')).click();
    await expect(view.locator('[role="treeitem"]', { hasText: 'alpha.txt' }).first()).toBeVisible();
    await page.locator(item('explorer')).click(); // fecha
    await expect(sb).toBeHidden();
    await page.locator(item('explorer')).click(); // reabre
    await expect(view.locator('[role="treeitem"]', { hasText: 'alpha.txt' }).first()).toBeVisible();
    expect(await page.locator('[data-testid="explorer-view"]').count(), 'um único Explorer montado').toBe(1);
    // Terminal intocado: abre embaixo do centro, à ESQUERDA da Side Bar, e a Side Bar mantém altura total
    await page.getByRole('button', { name: 'Alternar terminal' }).first().click();
    const term = page.locator('.terminal-panel');
    await expect(term).toBeVisible();
    const t = await rect(term);
    const s = await rect(sb);
    expect(t.right).toBeLessThanOrEqual(s.x + 1);
    expect(Math.round(s.h)).toBe(Math.round((await rect(page.locator(AB))).h));
  });
  // ---- 5.2: Search migra para a Side Bar (docs/24 §4 5.2, RF-04, RF-06) ----
  const SEARCH_PANEL = '[data-testid="explorer-search-panel"]';
  const FX2 = 'file:///tmp/explorer-fs-fixture/e2e-fixture-root';
  const seedSearch = async (request: import('@playwright/test').APIRequestContext) => {
    const put = async (uri: string, content: string) => {
      const r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri, content } });
      if (r.status() === 409) await request.post(`${BASE_URL}/fs/write`, { data: { uri, content } });
    };
    await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: `${FX2}/srch` } });
    await put(`${FX2}/srch/a.ts`, 'const Needle = 1;\nneedle();\n// needles are not needle\n');
    await put(`${FX2}/srch/b.md`, '# needle doc\n\nsecond needle line\n');
  };

  test('T6 (5.2) — Ctrl+Shift+F ativa a view Search NA SIDE BAR (tab aria-selected, título "Search", painel real dentro do pane search, input focado); nenhuma aba "Search" no editor central', async ({ page }) => {
    await page.keyboard.press('Control+Shift+F');
    const sb = page.locator(SB);
    await expect(sb).toBeVisible();
    await expect(page.locator(item('search'))).toHaveAttribute('aria-selected', 'true');
    await expect(sb.locator('[data-testid="side-bar-title"] h2')).toHaveText('Search');
    const panel = sb.locator(`[data-view-pane="search"] ${SEARCH_PANEL}`);
    await expect(panel).toBeVisible();
    await expect(panel.locator('.search-container textarea').first()).toBeFocused();
    await expect(page.locator('.editor-tabs .editor-tab', { hasText: 'Search' })).toHaveCount(0);
    // Side Bar fechada + Ctrl+Shift+F → reabre já em Search
    await page.locator(item('search')).click();
    await expect(sb).toBeHidden();
    await page.keyboard.press('Control+Shift+F');
    await expect(sb).toBeVisible();
    await expect(panel).toBeVisible();
  });

  test('T7 (5.2) — digitar termo existente na fixture retorna resultados na Side Bar (mesmo motor da 4.6: contagem em texto na view, sem badge no ícone)', async ({ page, request }) => {
    await seedSearch(request);
    await page.keyboard.press('Control+Shift+F');
    const panel = page.locator(SB).locator(SEARCH_PANEL);
    await expect(panel).toBeVisible();
    await page.keyboard.type('needle');
    const rows = panel.locator('.results .monaco-list .monaco-list-row');
    await expect(rows).toHaveCount(8, { timeout: 10000 });
    await expect(panel.locator('.messages .message')).toContainText(/results? in 2 files/);
    await expect(page.locator(item('search')).locator('.badge, [data-testid="activity-bar-badge"]')).toHaveCount(0);
  });

  test('T8 (5.2, RF-06) — com resultados visíveis, abrir arquivo (clique no resultado E dblclick na árvore) → o Search CONTINUA VISÍVEL na Side Bar; arquivo abre no anexo, não no editor central', async ({ page, request }) => {
    await seedSearch(request);
    await page.keyboard.press('Control+Shift+F');
    const panel = page.locator(SB).locator(SEARCH_PANEL);
    // 5.7 (setup, igual ao T6/T7): esperar painel + foco antes de digitar — sem isso o texto cai no chat (flake visto na bateria)
    await expect(panel).toBeVisible();
    await expect(panel.locator('.search-container textarea').first()).toBeFocused();
    await page.keyboard.type('needle');
    const rows = panel.locator('.results .monaco-list .monaco-list-row');
    await expect(rows).toHaveCount(8, { timeout: 10000 });
    // 1) clique num resultado (linha de match) → attach.open
    await rows.filter({ hasText: 'needle();' }).first().click();
    const attach = page.locator('.auxiliary-bar .explorer-attach-area');
    await expect(attach).toBeVisible();
    await expect(attach.locator('.tabs-container > .tab', { hasText: 'a.ts' }).first()).toBeVisible();
    await expect(panel, 'RF-06: Search continua visível após abrir arquivo').toBeVisible();
    await expect(rows).toHaveCount(8);
    await expect(page.locator('.editor-tabs .editor-tab', { hasText: 'a.ts' })).toHaveCount(0);
    // 2) abrir outro arquivo pela árvore do Explorer (troca de view) e voltar → Search intacto
    await page.locator(item('explorer')).click();
    const tree = page.locator(SB).locator('[data-testid="explorer-view"]');
    const root = tree.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
    if ((await root.getAttribute('aria-expanded')) !== 'true') await root.click();
    await tree.locator('[role="treeitem"]', { hasText: 'seed.txt' }).first().dblclick();
    await expect(attach.locator('.tabs-container > .tab', { hasText: 'seed.txt' }).first()).toBeVisible();
    await page.locator(item('search')).click();
    await expect(panel).toBeVisible();
    await expect(rows).toHaveCount(8);
  });

  test('T9 (5.2) — trocar para Explorer e voltar para Search: termo e resultados continuam (view não desmontada — 1 painel, mesmo nó DOM); fechar/reabrir a Side Bar idem', async ({ page, request }) => {
    await seedSearch(request);
    await page.keyboard.press('Control+Shift+F');
    const panel = page.locator(SB).locator(SEARCH_PANEL);
    await expect(panel).toBeVisible(); // 5.7 (setup, igual ao T7): espera painel + foco antes de digitar
    await expect(panel.locator('.search-container textarea').first()).toBeFocused();
    await page.keyboard.type('needle');
    const rows = panel.locator('.results .monaco-list .monaco-list-row');
    await expect(rows).toHaveCount(8, { timeout: 10000 });
    const tag = await panel.evaluate((el) => { (el as HTMLElement).dataset.s15 = 'same-node'; return true; });
    expect(tag).toBe(true);
    await page.locator(item('explorer')).click();
    await expect(panel).toBeHidden();
    await page.locator(item('search')).click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('.search-container textarea').first()).toHaveValue('needle');
    await expect(rows).toHaveCount(8);
    expect(await panel.getAttribute('data-s15')).toBe('same-node');
    await page.keyboard.press('Control+b');
    await expect(page.locator(SB)).toBeHidden();
    await page.keyboard.press('Control+b');
    await expect(rows).toHaveCount(8);
    expect(await page.locator(SEARCH_PANEL).count(), 'um único painel de busca montado').toBe(1);
  });

  // ---- 5.3: Source Control migra para a Side Bar + maquete "Changes N" removida (docs/24 §4 5.3, RF-05, RF-06) ----
  // Cobertura que SUBSTITUI os 4 testes pulados na 5.3 (decisão A do usuário, 2026-09-30):
  //   14b T1 ("Changes é a primeira aba fixa")  → T10 (Side Bar mostra o Git real)
  //   14c T1 ("Diff vem depois de Changes")     → T11 (diff abre no anexo)
  //   14c T5 ("badge na aba Changes")           → T13 (badge na Activity Bar)
  //   14c T3 ("Close All mantém Changes")       → conceito morre com a aba; nada substitui de propósito.
  test.describe('5.3 — SCM na Side Bar', () => {
    const WS_DIR = '/tmp/explorer-fs-fixture';
    const GIT_DIR = join(WS_DIR, 'e2e-fixture-root', 'gitsb');
    const git = (...args: string[]) => execFileSync('git', args, { cwd: WS_DIR, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
    const SCM_VIEW = `${SB} [data-testid="side-bar-view-scm"]`;
    const SCM_ROW = `${SCM_VIEW} .scm-view .monaco-list-row`;
    const ATTACH = '.auxiliary-bar .explorer-attach-area';
    const ATTACH_TAB = `${ATTACH} .tabs-container > .tab`;
    const BADGE = `${item('scm')} .badge .badge-content`;

    test.beforeAll(() => {
      if (existsSync(join(WS_DIR, '.git'))) rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
      rmSync(GIT_DIR, { recursive: true, force: true });
      mkdirSync(GIT_DIR, { recursive: true });
      git('init', '-q'); git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'e2e');
      writeFileSync(join(GIT_DIR, 'mod.txt'), 'v1\n'); writeFileSync(join(GIT_DIR, 'del.txt'), 'bye\n');
      git('add', '-A'); git('commit', '-q', '-m', 'base');
      writeFileSync(join(GIT_DIR, 'mod.txt'), 'v2\n'); unlinkSync(join(GIT_DIR, 'del.txt'));           // M, D
      writeFileSync(join(GIT_DIR, 'new.txt'), 'novo\n');                                                   // U
      writeFileSync(join(GIT_DIR, 'staged.txt'), 'st\n'); git('add', 'e2e-fixture-root/gitsb/staged.txt'); // A (index)
    });
    test.afterAll(() => {
      rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
      rmSync(GIT_DIR, { recursive: true, force: true });
    });

    const openScm = async (page: Page) => {
      await page.locator(item('scm')).click();
      await expect(page.locator(item('scm'))).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`${SCM_VIEW} .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 15_000 });
    };
    const rowByName = (page: Page, name: string) => page.locator(SCM_ROW).filter({ has: page.locator(`.label-name:text-is("${name}")`) }).first();

    test('T10 (5.3) — clicar no ícone Source Control abre a view SCM NA SIDE BAR com a lista real (M/A/D/U da fixture); título "Source Control"; nenhuma aba "Changes" no anexo', async ({ page }) => {
      await openScm(page);
      await expect(page.locator(`${SB} [data-testid="side-bar-title"] h2`)).toHaveText(/source control/i);
      await expect(page.locator(SCM_VIEW)).toBeVisible();
      await expect(page.locator(`${SCM_VIEW} .scm-view`)).toBeVisible();
      for (const n of ['mod.txt', 'del.txt', 'new.txt', 'staged.txt']) await expect(rowByName(page, n)).toBeVisible();
      await expect(rowByName(page, 'staged.txt')).toHaveAttribute('data-in-group', 'index');
      await expect(rowByName(page, 'mod.txt')).toHaveAttribute('data-in-group', 'workingTree');
      // a aba fixa "Changes" do anexo não existe mais (5.3): nem aba, nem botão no header do anexo
      expect(await page.locator(`${ATTACH_TAB}[data-kind="changes"]`).count()).toBe(0);
      expect(await page.locator('[data-testid="attach-open-changes"]').count()).toBe(0);
    });

    test('T11 (5.3) — clicar num arquivo modificado (M) na lista da Side Bar abre o diff read-only NO ANEXO (aba fixa "Diff", Monaco DiffEditor)', async ({ page }) => {
      await openScm(page);
      await rowByName(page, 'mod.txt').click();
      const diffTab = page.locator(`${ATTACH_TAB}[data-kind="diff"]`);
      await expect(diffTab).toHaveCount(1);
      await expect(diffTab).toHaveClass(/active/);
      await expect(diffTab.locator('.label-name')).toHaveText('mod.txt (Working Tree)');
      await expect(page.locator(`${ATTACH}[data-visible="true"]`)).toBeAttached();
      await expect(page.locator(`${ATTACH} .monaco-diff-editor`)).toBeVisible({ timeout: 20_000 });
      await expect(page.locator(`${ATTACH} .monaco-diff-editor .editor.modified .view-lines`).first()).toContainText('v2');
      // read-only
      await page.locator(`${ATTACH} .monaco-diff-editor .editor.modified .view-lines`).click();
      await page.keyboard.type('XYZ');
      await expect(page.locator(`${ATTACH} .monaco-diff-editor`)).not.toContainText('XYZ');
      // (substitui 14c T1) DiffEditor: 14/19 px, sem minimap, side-by-side (inline se < 900 px — regra do VS Code), aba não-preview com ✕
      await expect(diffTab).not.toHaveClass(/preview/);
      await expect(diffTab.locator('.tab-actions .codicon-close')).toBeAttached();
      const pane = page.locator(`${ATTACH} [data-testid="attach-diff-pane"]`);
      const m = await pane.locator('.monaco-diff-editor .editor.modified .view-line').first().evaluate((el) => { const cs = getComputedStyle(el.querySelector('span') ?? el); return { font: cs.fontSize, lh: el.getBoundingClientRect().height }; });
      expect(m.font).toBe('14px'); expect(Math.round(m.lh)).toBe(19);
      await expect(pane.locator('.monaco-diff-editor .minimap:visible')).toHaveCount(0);
      const widths = await pane.locator('.monaco-diff-editor').evaluate((de) => ({ total: de.getBoundingClientRect().width, original: de.querySelector('.editor.original')!.getBoundingClientRect().width, modified: de.querySelector('.editor.modified')!.getBoundingClientRect().width }));
      if (widths.total < 900) { expect(widths.original).toBeLessThan(60); expect(widths.modified).toBeGreaterThan(widths.total * 0.7); }
      else { expect(widths.original).toBeGreaterThan(widths.total * 0.3); expect(widths.modified).toBeGreaterThan(widths.total * 0.3); }
      await expect.poll(() => pane.locator('.monaco-diff-editor .editor.modified .line-insert, .monaco-diff-editor .editor.modified .char-insert').count(), { timeout: 15_000 }).toBeGreaterThan(0);
      // (substitui 14c T6) o diff abre na sessão REAL do anexo, nunca em "default"
      const kinds = await page.evaluate(() => {
        const mod = (window as unknown as { __explorerSearchModule: { attach: { getTabs(i: { sessionId: string }): Array<{ kind: string }> } } }).__explorerSearchModule;
        const sid = document.querySelector('.auxiliary-bar[data-session-id]')!.getAttribute('data-session-id')!;
        return { real: mod.attach.getTabs({ sessionId: sid }).map((t) => t.kind), def: mod.attach.getTabs({ sessionId: 'default' }).length };
      });
      expect(kinds.real).toEqual(['diff']); expect(kinds.def).toBe(0);
    });

    test('T12 (5.3, RF-06) — com o diff aberto no anexo, a Side Bar CONTINUA com a SCM visível (coexistência); clicar em outro arquivo troca o diff na MESMA aba e a lista segue visível', async ({ page }) => {
      await openScm(page);
      await rowByName(page, 'mod.txt').click();
      await expect(page.locator(`${ATTACH} .monaco-diff-editor`)).toBeVisible({ timeout: 20_000 });
      await expect(page.locator(SB)).toBeVisible();
      await expect(page.locator(item('scm'))).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`${SCM_VIEW} .scm-view`)).toBeVisible();
      await expect(rowByName(page, 'new.txt')).toBeVisible();
      await rowByName(page, 'new.txt').click();
      await expect(page.locator(`${ATTACH_TAB}[data-kind="diff"]`)).toHaveCount(1);
      await expect(page.locator(`${ATTACH_TAB}[data-kind="diff"] .label-name`)).toHaveText(/new\.txt/);
      await expect(page.locator(`${SCM_VIEW} .scm-view`)).toBeVisible();
      expect(await page.locator(`${SCM_VIEW} .scm-view`).count(), 'um único painel SCM montado').toBe(1);
    });

    test('T13 (5.3) — badge numérico no ícone Source Control da Activity Bar = git.count() (index + working tree = 4); some após stage+commit de tudo (repo limpo)', async ({ page }) => {
      await openScm(page);
      const badge = page.locator(BADGE);
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText('4');
      await expect(badge).toHaveAttribute('data-count', '4');
      // fecha a Side Bar: o badge continua (é da Activity Bar, não da view)
      await page.locator(item('scm')).click();
      await expect(page.locator(SB)).toBeHidden();
      await expect(badge).toHaveText('4');
      // repo limpo → badge some
      git('add', '-A'); git('commit', '-q', '-m', 'clean');
      await page.locator(item('scm')).click();
      await page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-provider"]`).hover();
      await page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-refresh"]`).click();
      await expect(page.locator(BADGE)).toHaveCount(0, { timeout: 15_000 });
      // (substitui 14c T5) lista vazia → estado vazio oficial; aria-label do ícone sem contagem
      await expect(page.locator(`${SCM_VIEW} [data-testid="scm-empty"]`)).toHaveText('No source control changes detected');
      await expect(page.locator(item('scm'))).toHaveAttribute('aria-label', 'Source Control');
      // volta ao estado sujo para os próximos (idempotente: afterAll limpa)
      writeFileSync(join(GIT_DIR, 'mod.txt'), 'v3\n');
      await page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-provider"]`).hover();
      await page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-refresh"]`).click();
      await expect(page.locator(BADGE)).toHaveText('1', { timeout: 15_000 });
      await expect(page.locator(item('scm'))).toHaveAttribute('aria-label', 'Source Control (1)');
    });

    test('T14 (5.3) — a maquete "Changes N" não existe mais no DOM (aba aux "Changes", "Revisar", "Abrir multi-diff", "Sem alterações pendentes", .change-tree-row, widget Checks)', async ({ page }) => {
      await openScm(page);
      expect(await page.locator('[id^="aux-tab-"][id$="-changes"]').count()).toBe(0);
      expect(await page.locator('.auxiliary-bar .change-tree-row').count()).toBe(0);
      expect(await page.locator('.auxiliary-bar .ci-widget').count()).toBe(0);
      expect(await page.getByText('Abrir multi-diff', { exact: true }).count()).toBe(0);
      expect(await page.getByText('Sem alterações pendentes nesta sessão.', { exact: true }).count()).toBe(0);
      expect(await page.locator('.auxiliary-bar').getByText('Revisar', { exact: true }).count()).toBe(0);
      expect(await page.locator('.auxiliary-bar .aux-tab').count()).toBe(0);
    });

    test('T15 (5.3) — (substitui 14b T5) pasta sem repositório → frase oficial + "Initialize Repository" (git init real) dentro da Side Bar; depois "Changes" reaparece; "Open Source Control" do header do Explorer ativa a view scm', async ({ page }) => {
      await openScm(page);
      rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
      await page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-provider"]`).hover();
      await page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-refresh"]`).click();
      const empty = page.locator(`${SCM_VIEW} .scm-view [data-testid="scm-no-repo"]`);
      await expect(empty).toContainText("The folder currently open doesn't have a Git repository.");
      await expect(page.locator(BADGE)).toHaveCount(0);
      await empty.getByRole('button', { name: 'Initialize Repository' }).click();
      await expect(empty).toHaveCount(0, { timeout: 10_000 });
      expect(existsSync(join(WS_DIR, '.git'))).toBe(true);
      await expect(page.locator(`${SCM_ROW} .resource-group > .name`).first()).toHaveText('Changes');
      // header do Explorer → "Open Source Control" → view scm (Side Bar), nada abre no anexo
      await page.locator(item('explorer')).click();
      await expect(page.locator(item('explorer'))).toHaveAttribute('aria-selected', 'true');
      await page.locator('[data-testid="explorer-view"] .pane-header').first().hover();
      await page.locator('[data-testid="explorer-open-changes"]').click();
      await expect(page.locator(item('scm'))).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`${SCM_VIEW} .scm-view`)).toBeVisible();
      expect(await page.locator(`${ATTACH_TAB}[data-kind="changes"]`).count()).toBe(0);
    });
  });

  // ---- 5.4: Activity Bar movível por menu de contexto (docs/24 §4 5.4, RF-10; A0.1 = desvio consciente) ----
  // Numeração: o prompt chamou de T15–T19; T15 já existe (5.3) → aqui T16–T20, mesma ordem.
  test.describe('5.4 — Activity Bar movível', () => {
    const MENU = '[data-testid="explorer-context-menu"]';
    const menuItem = (id: string) => `${MENU} [data-menu-item-id="activityBar.move.${id}"]`;
    const openMenu = async (page: Page) => {
      await page.locator(item('explorer')).click({ button: 'right' });
      await expect(page.locator(MENU)).toBeVisible();
    };
    // fixture git mínima só para o T19 (badge do SCM > 0), mesma receita do bloco 5.3
    const WS_DIR = '/tmp/explorer-fs-fixture';
    const GIT_DIR = join(WS_DIR, 'e2e-fixture-root', 'gitab');
    const git = (...args: string[]) => execFileSync('git', args, { cwd: WS_DIR, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
    test.beforeAll(() => {
      if (existsSync(join(WS_DIR, '.git'))) rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
      rmSync(GIT_DIR, { recursive: true, force: true });
      mkdirSync(GIT_DIR, { recursive: true });
      git('init', '-q'); git('config', 'user.email', 'e2e@local'); git('config', 'user.name', 'e2e');
      writeFileSync(join(GIT_DIR, 'mod.txt'), 'v1\n'); git('add', '-A'); git('commit', '-q', '-m', 'base');
      writeFileSync(join(GIT_DIR, 'mod.txt'), 'v2\n'); writeFileSync(join(GIT_DIR, 'new.txt'), 'novo\n');
    });
    test.afterAll(() => {
      rmSync(join(WS_DIR, '.git'), { recursive: true, force: true });
      rmSync(GIT_DIR, { recursive: true, force: true });
    });

    test('T16 (5.4) — botão direito na Activity Bar abre menu com 4 opções (Left/Right/Top/Bottom); a posição atual (right) tem check', async ({ page }) => {
      await openMenu(page);
      const labels = await page.locator(`${MENU} .explorer-context-menu-label`).allTextContents();
      expect(labels).toEqual(['Move Activity Bar Left', 'Move Activity Bar Right', 'Move Activity Bar Top', 'Move Activity Bar Bottom']);
      await expect(page.locator(menuItem('right'))).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator(menuItem('right')).locator('.explorer-context-menu-check')).toHaveCount(1);
      await expect(page.locator(menuItem('left'))).toHaveAttribute('aria-checked', 'false');
      // botão direito na tirinha (fora dos ícones) também abre
      await page.keyboard.press('Escape');
      await expect(page.locator(MENU)).toHaveCount(0);
      const ab = await rect(page.locator(AB));
      await page.mouse.click(Math.round(ab.x + 24), Math.round(ab.y + ab.h - 30), { button: 'right' });
      await expect(page.locator(MENU)).toBeVisible();
    });

    test('T17 (5.4) — "Move Activity Bar Left" põe a tirinha à ESQUERDA da Side Bar (à direita da lista de sessões); sash/borda da Side Bar viram para o lado do editor; "Right" volta', async ({ page }) => {
      await openMenu(page);
      await page.locator(menuItem('left')).click();
      await expect(page.locator(MENU)).toHaveCount(0);
      const ab = await rect(page.locator(AB));
      const sb = await rect(page.locator(SB));
      const sessions = await rect(page.locator('.sessions-sidebar'));
      const main = await rect(page.locator('.main-region'));
      expect(Math.round(ab.x), 'tirinha encostada no início da .main-region').toBe(Math.round(main.x));
      expect(ab.x).toBeGreaterThan(sessions.x);
      expect(Math.round(sb.x), 'Side Bar logo depois da tirinha').toBe(Math.round(ab.right));
      expect(Math.round(ab.w)).toBe(48);
      await expect(page.locator(AB)).toHaveClass(/\bleft\b/);
      await expect(page.locator(SB)).toHaveClass(/\bleft\b/);
      // sash na face direita da Side Bar; indicador 2 px na face externa (left 0)
      const sash = await rect(page.locator(SASH));
      expect(Math.abs(sash.x + sash.w / 2 - sb.right)).toBeLessThanOrEqual(3);
      const indX = await page.locator(`${item('explorer')} .active-item-indicator`).evaluate((e) => parseFloat(getComputedStyle(e, '::before').left));
      expect(indX).toBe(0);
      // menu agora marca Left
      await openMenu(page);
      await expect(page.locator(menuItem('left'))).toHaveAttribute('aria-checked', 'true');
      await page.locator(menuItem('right')).click();
      const ab2 = await rect(page.locator(AB));
      expect(Math.round(ab2.right)).toBe(Math.round(main.right));
      await expect(page.locator(AB)).toHaveClass(/\bright\b/);
    });

    test('T18 (5.4) — após mover para Left, F5 mantém a posição (workbench.layoutState.v1.activityBarPosition = "left")', async ({ page }) => {
      await openMenu(page);
      await page.locator(menuItem('left')).click();
      await expect(page.locator(AB)).toHaveClass(/\bleft\b/);
      const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);
      expect(stored.activityBarPosition).toBe('left');
      await page.reload();
      await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
      await expect(page.locator(AB)).toHaveClass(/\bleft\b/);
      const ab = await rect(page.locator(AB)); const main = await rect(page.locator('.main-region'));
      expect(Math.round(ab.x)).toBe(Math.round(main.x));
      // limpeza: volta para right (o beforeEach só limpa na 1ª carga da aba)
      await openMenu(page);
      await page.locator(menuItem('right')).click();
      await expect(page.locator(AB)).toHaveClass(/\bright\b/);
    });

    test('T19 (5.4) — com posição Left tudo continua: clicar num ícone troca a view; clicar no ativo fecha/reabre; Ctrl+B; badge do SCM segue visível', async ({ page }) => {
      await openMenu(page);
      await page.locator(menuItem('left')).click();
      await page.locator(item('search')).click();
      await expect(page.locator(item('search'))).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`${SB} [data-testid="side-bar-title"] h2`)).toHaveText(/search/i);
      await page.locator(item('scm')).click();
      await expect(page.locator(`${SB} [data-testid="side-bar-view-scm"] .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 15_000 });
      await expect(page.locator(`${item('scm')} .badge .badge-content`)).toBeVisible();
      await expect(page.locator(`${item('scm')} .badge .badge-content`)).toHaveText(/^[1-9]\d*$/);
      await page.locator(item('scm')).click();
      await expect(page.locator(SB)).toBeHidden();
      await expect(page.locator(`${item('scm')} .badge .badge-content`)).toBeVisible();
      await page.keyboard.press('Control+b');
      await expect(page.locator(SB)).toBeVisible();
      await expect(page.locator(item('scm'))).toHaveAttribute('aria-selected', 'true');
      await openMenu(page);
      await page.locator(menuItem('right')).click();
    });

    test('T20 (5.4) — Top/Bottom adiados (D2.64): aparecem DESABILITADAS (opacity 0.4, aria-disabled) e não fazem nada', async ({ page }) => {
      await openMenu(page);
      for (const id of ['top', 'bottom']) {
        const it = page.locator(menuItem(id));
        await expect(it).toHaveAttribute('aria-disabled', 'true');
        expect(await it.evaluate((e) => getComputedStyle(e).opacity)).toBe('0.4');
        await it.click({ force: true });
        await expect(page.locator(MENU)).toBeVisible(); // menu não fecha — botão disabled não dispara
      }
      await page.keyboard.press('Escape');
      await expect(page.locator(AB)).toHaveClass(/\bright\b/);
      const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);
      expect(stored.activityBarPosition ?? 'right').toBe('right');
    });
  });
});
