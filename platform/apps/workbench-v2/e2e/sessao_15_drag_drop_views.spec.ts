// FATIA-05 5.5 — Drag & drop de views entre a Side Bar e o Panel de views (docs/24 §4 5.5).
// Régua: HTML5 DnD nativo NÃO dispara em Chromium headless via page.mouse (docs/26 §4.2) →
// dragstart/dragover/drop disparados por dispatchEvent com DataTransfer sintético (mesmo padrão da 4.4).
//
// Layout (decisão O14, docs/25): o "Panel" de views é um `.part.panel` NOVO acima do terminal, dentro de
// `.right-section`; o terminal (`.terminal-panel`) é intocável e NUNCA é arrastável nem recebe views.
//
// Roda contra a fixture 5175 (PLAYWRIGHT_BASE_URL). Persistência: `workbench.layoutState.v1`.
import { expect, test, type Page } from '@playwright/test';
import { BASE_URL } from './helpers';

const LAYOUT_KEY = 'workbench.layoutState.v1';
const AB = '[data-testid="activity-bar"]';
const SB = '[data-testid="side-bar"]';
const SB_TITLE = '[data-testid="side-bar-title"]';
const ITEM = '[data-testid="activity-bar-item"]';
const item = (id: string) => `${ITEM}[data-view-id="${id}"]`;
const PANEL = '[data-testid="views-panel"]';
const PANEL_TAB = '[data-testid="views-panel-tab"]';
const panelTab = (id: string) => `${PANEL_TAB}[data-view-id="${id}"]`;
const TERMINAL = '.terminal-panel';
const VIEW_MIME = 'application/vnd.agents-window.view-id';

async function open(page: Page) {
  await page.addInitScript((k) => { try { if (!sessionStorage.getItem('s15dnd-cleared')) { localStorage.removeItem(k); sessionStorage.setItem('s15dnd-cleared', '1'); } } catch { /* noop */ } }, LAYOUT_KEY);
  await page.goto(BASE_URL);
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(300);
}

/** DnD sintético: dragstart no `src`, dragenter/dragover/drop no `dst`, dragend no `src`. Devolve o que o drop viu. */
async function dnd(page: Page, src: string, dst: string, opts: { holdOver?: boolean } = {}) {
  return page.evaluate(([s, d, hold]) => {
    const from = document.querySelector<HTMLElement>(s as string);
    const to = document.querySelector<HTMLElement>(d as string);
    if (!from || !to) throw new Error(`dnd: alvo ausente ${!from ? s : d}`);
    const dt = new DataTransfer();
    const fire = (el: HTMLElement, type: string) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    fire(from, 'dragstart');
    fire(to, 'dragenter');
    const overDefaultPrevented = !fire(to, 'dragover');
    if (hold) return { types: Array.from(dt.types), overDefaultPrevented, dropped: false };
    fire(to, 'drop');
    fire(from, 'dragend');
    return { types: Array.from(dt.types), overDefaultPrevented, dropped: true };
  }, [src, dst, !!opts.holdOver] as const);
}

const abOrder = (page: Page) => page.locator(ITEM).evaluateAll((els) => els.map((e) => e.getAttribute('data-view-id')));
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);

test.describe('FATIA-05 · 5.5 — Drag & drop de views (Side Bar ↔ Panel de views)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    await expect(page.locator(AB)).toBeVisible();
  });

  test('T20 (5.5) — arrastar o header da view SCM (Side Bar) para o Panel: SCM some da Side Bar/Activity Bar e aparece como aba no Panel de views, acima do terminal', async ({ page }) => {
    await page.locator(item('scm')).click();
    await expect(page.locator(SB_TITLE)).toHaveAttribute('draggable', 'true');
    await expect(page.locator(`${SB_TITLE} h2`)).toHaveText('Source Control');
    // Panel de views não existe no DOM visível enquanto não há view nele — mas a zona de drop existe
    await expect(page.locator(PANEL)).toBeAttached();
    const r = await dnd(page, SB_TITLE, PANEL);
    expect(r.types).toContain(VIEW_MIME);
    expect(r.overDefaultPrevented, 'dragover deve ser aceito (preventDefault) pela zona de drop').toBe(true);
    await expect(page.locator(PANEL)).toBeVisible();
    await expect(page.locator(panelTab('scm'))).toBeVisible();
    await expect(page.locator(`${PANEL} [data-testid="side-bar-view-scm"]`)).toBeVisible();
    await expect(page.locator(`${SB} [data-testid="side-bar-view-scm"]`)).toHaveCount(0);
    await expect(page.locator(item('scm'))).toHaveCount(0);
    expect(await abOrder(page)).toEqual(['explorer', 'search']);
    // a Side Bar caiu para a primeira view restante
    await expect(page.locator(`${SB_TITLE} h2`)).toHaveText('Explorer');
    // o Panel de views fica DENTRO de .right-section e ACIMA do terminal (terminal intocado)
    const inRight = await page.locator(PANEL).evaluate((e) => !!e.closest('.right-section') && !e.closest('.terminal-panel'));
    expect(inRight).toBe(true);
    await expect(page.locator(`${TERMINAL} ${PANEL_TAB}`)).toHaveCount(0);
  });

  test('T21 (5.5) — arrastar a aba SCM do Panel de volta para a Side Bar restaura (view volta ao final da Activity Bar; Panel esvazia e some)', async ({ page }) => {
    await page.locator(item('scm')).click();
    await dnd(page, SB_TITLE, PANEL);
    await expect(page.locator(panelTab('scm'))).toBeVisible();
    await expect(page.locator(panelTab('scm'))).toHaveAttribute('draggable', 'true');
    await dnd(page, panelTab('scm'), SB);
    await expect(page.locator(item('scm'))).toBeVisible();
    expect(await abOrder(page)).toEqual(['explorer', 'search', 'scm']);
    await expect(page.locator(`${SB} [data-testid="side-bar-view-scm"]`)).toBeAttached();
    await expect(page.locator(PANEL_TAB)).toHaveCount(0);
    await expect(page.locator(PANEL)).toBeHidden();
    // a view voltou a funcionar no lugar de origem: clicar no ícone mostra a lista real
    await page.locator(item('scm')).click();
    await expect(page.locator(`${SB} [data-testid="side-bar-view-scm"] .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 15_000 });
  });

  test('T22 (5.5) — reordenar dentro da Side Bar: arrastar a segunda view (Search) para antes da primeira (Explorer) muda a ordem visual da Activity Bar', async ({ page }) => {
    expect(await abOrder(page)).toEqual(['explorer', 'search', 'scm']);
    await page.locator(item('search')).click();
    await expect(page.locator(`${SB_TITLE} h2`)).toHaveText('Search');
    // feedback visual durante o dragover (docs/27 §G "durante")
    const held = await dnd(page, SB_TITLE, item('explorer'), { holdOver: true });
    expect(held.overDefaultPrevented).toBe(true);
    await expect(page.locator(item('explorer'))).toHaveClass(/drop-before/);
    await dnd(page, SB_TITLE, item('explorer'));
    expect(await abOrder(page)).toEqual(['search', 'explorer', 'scm']);
    await expect(page.locator(item('explorer'))).not.toHaveClass(/drop-before/);
    // geometria: Search fica acima de Explorer
    const ys = await page.locator(ITEM).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().y));
    expect(ys[0]).toBeLessThan(ys[1]);
    // a view ativa continua Search e o Explorer continua funcionando ao clicar
    await expect(page.locator(item('search'))).toHaveAttribute('aria-selected', 'true');
    await page.locator(item('explorer')).click();
    await expect(page.locator(`${SB_TITLE} h2`)).toHaveText('Explorer');
  });

  test('T23 (5.5) — ordem e container persistem após F5 (workbench.layoutState.v1.viewLayout)', async ({ page }) => {
    await page.locator(item('search')).click();
    await dnd(page, SB_TITLE, item('explorer'));            // [search, explorer, scm]
    await page.locator(item('scm')).click();
    await dnd(page, SB_TITLE, PANEL);                        // sideBar [search, explorer] · panel [scm]
    expect(await abOrder(page)).toEqual(['search', 'explorer']);
    const s = await stored(page);
    expect(s.viewLayout).toEqual({ sideBar: ['search', 'explorer'], panel: ['scm'] });
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await expect(page.locator(AB)).toBeVisible();
    expect(await abOrder(page)).toEqual(['search', 'explorer']);
    await expect(page.locator(panelTab('scm'))).toBeVisible();
    await expect(page.locator(`${PANEL} [data-testid="side-bar-view-scm"]`)).toBeVisible();
    // limpeza (beforeEach só limpa na 1ª carga da aba)
    await dnd(page, panelTab('scm'), SB);
    await expect(page.locator(item('scm'))).toBeVisible();
  });

  test('T24 (5.5) — o terminal NÃO é arrastável e NÃO aceita views: soltar a SCM "dentro" dele não muda nada; o drop só vale na área de views do Panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Alternar terminal' }).click();
    await expect(page.locator(TERMINAL)).toBeVisible({ timeout: 10_000 });
    // nada do terminal é draggable (intocável)
    const draggables = await page.locator(`${TERMINAL} [draggable="true"]`).count();
    expect(draggables).toBe(0);
    expect(await page.locator(TERMINAL).getAttribute('draggable')).not.toBe('true');
    await page.locator(item('scm')).click();
    const r = await dnd(page, SB_TITLE, TERMINAL);
    expect(r.overDefaultPrevented, 'terminal não aceita o dragover').toBe(false);
    await expect(page.locator(item('scm'))).toBeVisible();
    expect(await abOrder(page)).toEqual(['explorer', 'search', 'scm']);
    await expect(page.locator(`${SB} [data-testid="side-bar-view-scm"]`)).toBeAttached();
    await expect(page.locator(`${TERMINAL} ${PANEL_TAB}`)).toHaveCount(0);
    await expect(page.locator(PANEL_TAB)).toHaveCount(0);
    // o Panel de views coexiste com o terminal aberto: drop válido só ali
    await dnd(page, SB_TITLE, PANEL);
    await expect(page.locator(panelTab('scm'))).toBeVisible();
    await expect(page.locator(TERMINAL)).toBeVisible();
    const p = await page.locator(PANEL).boundingBox(); const t = await page.locator(TERMINAL).boundingBox();
    expect(p && t && p.y + p.height <= t.y + 1, 'Panel de views acima do terminal').toBe(true);
    await dnd(page, panelTab('scm'), SB); // limpeza
  });

  test('T25 (5.5 fix) — os ÍCONES da Activity Bar são arrastáveis (como no VS Code): ícone SCM sobre o ícone Explorer reordena; ícone Search para o Panel move a view; payload também em text/plain', async ({ page }) => {
    for (const id of ['explorer', 'search', 'scm']) await expect(page.locator(item(id))).toHaveAttribute('draggable', 'true');
    const r1 = await dnd(page, item('scm'), item('explorer'));
    expect(r1.types).toEqual(expect.arrayContaining([VIEW_MIME, 'text/plain']));
    expect(r1.overDefaultPrevented).toBe(true);
    expect(await abOrder(page)).toEqual(['scm', 'explorer', 'search']);
    const r2 = await dnd(page, item('search'), PANEL);
    expect(r2.overDefaultPrevented).toBe(true);
    await expect(page.locator(panelTab('search'))).toBeVisible();
    expect(await abOrder(page)).toEqual(['scm', 'explorer']);
    // limpeza
    await dnd(page, panelTab('search'), SB);
    await dnd(page, item('explorer'), item('scm'));
    expect(await abOrder(page)).toEqual(['explorer', 'scm', 'search']);
    await dnd(page, item('search'), item('scm'));
    expect(await abOrder(page)).toEqual(['explorer', 'search', 'scm']);
  });
});
