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
//   T1 ← c1 feat(activity-bar) · T2/T3 ← c2 feat(side-bar) · T4/T5 ← c3 feat(view-registry)
// Antes do c1 a suíte inteira falha em T1 (prova do "falhando antes").
//
// Persistência: `workbench.layoutState.v1` é limpa no beforeEach de TODOS os testes; só o T4 grava e relê.
// Rodar (fixture 5175 com seed.txt — necessário só para o T5):
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/sessao_15_activity_bar.spec.ts
// ============================================================================
import { expect, test, type Locator, type Page } from '@playwright/test';
import { BASE_URL } from './helpers';

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

  test('T5 (c3) — Explorer REAL dentro da Side Bar (seed.txt), seções OUTLINE/TIMELINE colapsadas, aba Files sai da AuxiliaryBar, AttachArea continua nela; expandir → trocar de view / fechar e reabrir → continua expandido (mount idempotente); Terminal intocado', async ({ page }) => {
    const sb = page.locator(SB);
    const view = sb.locator('[data-testid="explorer-view"]');
    await expect(view).toBeVisible();
    await expect(view.locator('[role="treeitem"]', { hasText: 'seed.txt' }).first()).toBeVisible({ timeout: 10000 });
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
});
