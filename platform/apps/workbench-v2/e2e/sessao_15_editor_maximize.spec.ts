// FATIA-05 5.7 — Editor fino default + toggle maximizar/restaurar (docs/24 §4 5.7, D6 corrigida; decisão A0.7 + A+2/420 de 2026-10-01).
// Regra autorizada: [lista][CHAT ≥420px e ≥50% da faixa chat+editor][editor fino ≤50%][Side Bar][Activity Bar].
//  • Clicar arquivo no Explorer abre no editor fino SEM F5; a coluna "Detalhes" colapsa sozinha (segue acessível pelo toggle).
//  • Botão `attach-maximize`: editor toma o centro (chat some), lista de sessões + terminal visíveis, Side Bar escondida (RF-09);
//    `editorMaximized` persiste em `workbench.layoutState.v1` (F5 mantém); restaurar devolve chat + largura anterior.
//  • Browser ativo no EditorArea não impede o anexo de abrir.
// Roda contra a fixture 5175 (PLAYWRIGHT_BASE_URL); só lê `seed.txt` — não muta a árvore.
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { BASE_URL } from './helpers';

const BAND = '.top-right-section';            // faixa chat + editor (pai da barra auxiliar)
const CENTER = '.main-surface';               // chat (+ EditorArea legado)
const CHAT = '.chat-pane';
const AUX = '.auxiliary-bar';
const DETAILS = `${AUX} .auxiliary-column`;    // coluna "Detalhes"
const ATTACH = `${AUX} .explorer-attach-area`;
const ATTACH_TAB = `${ATTACH} .tabs-container > .tab`;
const MAX_BTN = `${ATTACH} [data-testid="attach-maximize"]`;
const SB = '[data-testid="side-bar"]';
const SESSIONS = '.sessions-sidebar';
const TERMINAL = '.terminal-panel';
const LAYOUT_KEY = 'workbench.layoutState.v1';
const CHAT_MIN = 420;

test.use({ viewport: { width: 1400, height: 900 } });

const width = async (page: Page, sel: string) => page.locator(sel).first().evaluate((el) => el.getBoundingClientRect().width).catch(() => 0);

async function open(page: Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(500);
  if (!(await page.locator(`${SB} [data-testid="explorer-view"]`).first().isVisible().catch(() => false))) await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click();
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  await page.waitForTimeout(300);
}

/** Clique REAL na árvore (não `attach.open`): é o fluxo do vídeo. */
async function clickSeed(page: Page) {
  const tree = page.locator('[data-testid="explorer-view"]').first();
  const seed = tree.locator('.monaco-list-row', { hasText: 'seed.txt' }).first();
  if (!(await seed.isVisible().catch(() => false))) {
    await tree.locator('.monaco-list-row', { hasText: 'e2e-fixture-root' }).first().click(); // pasta começa fechada
    await expect(seed).toBeVisible({ timeout: 10_000 });
  }
  await seed.click();
  await expect(page.locator(ATTACH_TAB)).toHaveCount(1, { timeout: 10_000 });
  await expect(page.locator(ATTACH)).toBeVisible();
}

/** `centerOnly`: com o Browser legado aberto o centro é [chat|browser] (PanelGroup do usuário) — a régua
 *  de 420/50 % vale para o CENTRO (.main-surface); sem Browser vale para o próprio chat. */
async function expectThinDefault(page: Page, centerOnly = false) {
  const band = await width(page, BAND);
  const chat = await width(page, centerOnly ? CENTER : CHAT);
  const attach = await width(page, ATTACH);
  expect(band).toBeGreaterThan(600);
  // chat ≥ 420 e ≥ 50% da faixa; editor fino ≤ 50%
  expect(chat).toBeGreaterThanOrEqual(CHAT_MIN);
  expect(chat).toBeGreaterThanOrEqual(band * 0.5 - 2);
  expect(attach).toBeLessThanOrEqual(band * 0.5 + 2);
  expect(attach).toBeGreaterThanOrEqual(280);
  // "Detalhes" colapsada automaticamente
  await expect(page.locator(DETAILS)).toBeHidden();
}

test.describe('5.7 — editor fino default + maximizar/restaurar', () => {
  test('T30 — clicar arquivo no Explorer abre no editor fino sem F5; Detalhes colapsa; chat ≥420px e ≥50%', async ({ page }) => {
    await open(page);
    await clickSeed(page);
    await expectThinDefault(page);
    // 5.8-c1: a coluna "Detalhes" e o toggle "Barra auxiliar" foram removidos (RF-P-05, T39)
    await expect(page.locator(DETAILS)).toHaveCount(0);
    await expect(page.locator(ATTACH_TAB)).toHaveCount(1);
  });

  test('T31 — maximizar: editor toma o centro, chat some, lista + terminal visíveis, Side Bar escondida; F5 mantém; restaurar devolve', async ({ page }) => {
    await open(page);
    // terminal ligado para provar que continua visível no maximizado
    await page.locator('button[aria-label="Alternar terminal"]').first().click();
    await expect(page.locator(TERMINAL)).toBeVisible();
    await clickSeed(page);
    const thinBefore = await width(page, ATTACH);
    const band = await width(page, BAND);

    await page.locator(MAX_BTN).click();
    await page.waitForTimeout(400);
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'true');
    await expect(page.locator(CHAT)).toBeHidden();
    await expect(page.locator(SESSIONS)).toBeVisible();
    await expect(page.locator(TERMINAL)).toBeVisible();
    await expect(page.locator(SB), 'docs/24 v1.2 (2026-10-02): Side Bar fica 274 no maximizado').toBeVisible();
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    expect(await width(page, ATTACH)).toBeGreaterThanOrEqual(band - 12);
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);
    expect(saved.editorMaximized).toBe(true);

    // F5 mantém maximizado (o módulo NÃO persiste as abas abertas — fato do 4.7; reabrimos o arquivo
    // pelo Explorer e o estado maximizado tem de voltar sozinho: `editorMaximized` no shell + store do módulo)
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.waitForTimeout(500);
    await expect(page.locator(SB)).toBeVisible(); // v1.2: Side Bar nunca recolhe no maximizado
    await clickSeed(page);
    await page.waitForTimeout(400);
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'true');
    await expect(page.locator(CHAT)).toBeHidden();
    // (a Side Bar está visível aqui porque o teste a abriu pelo Activity Bar para chegar ao Explorer — gesto do usuário)
    expect(await width(page, ATTACH)).toBeGreaterThanOrEqual(band - 12);

    // restaurar
    await page.locator(MAX_BTN).click();
    await page.waitForTimeout(400);
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'false');
    await expect(page.locator(CHAT)).toBeVisible();
    await expect(page.locator(SB)).toBeVisible();
    expect(Math.abs((await width(page, ATTACH)) - thinBefore)).toBeLessThanOrEqual(2);
    await expectThinDefault(page);
    const saved2 = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);
    expect(saved2.editorMaximized).toBe(false);
  });

  // ---- 5.7 fix (homologação reprovada 2026-10-01: BUG 5.7-01..04) ----
  const FILES = ['renomeavel.txt', 'terceiro.txt'] as const; // + seed.txt = 3 abas
  const THIRD = '/tmp/explorer-fs-fixture/e2e-fixture-root/terceiro.txt';
  test.beforeAll(() => { writeFileSync(THIRD, 'terceiro arquivo da 5.7\n'); });
  test.afterAll(() => { if (existsSync(THIRD)) unlinkSync(THIRD); });
  async function clickFile(page: Page, name: string) {
    const tree = page.locator('[data-testid="explorer-view"]').first();
    const row = tree.locator('.monaco-list-row', { hasText: name }).first();
    if (!(await row.isVisible().catch(() => false))) {
      await tree.locator('.monaco-list-row', { hasText: 'e2e-fixture-root' }).first().click();
      await expect(row).toBeVisible({ timeout: 10_000 });
    }
    await row.click();
    await page.waitForTimeout(300);
  }
  const tabNames = (page: Page) => page.locator(ATTACH_TAB).evaluateAll((els) => els.map((e) => (e.querySelector('.label-name')?.textContent ?? e.textContent ?? '').trim()));
  const activeTab = (page: Page) => page.locator(`${ATTACH_TAB}.active, ${ATTACH_TAB}[aria-selected="true"]`).first().evaluate((e) => (e.querySelector('.label-name')?.textContent ?? e.textContent ?? '').trim());

  test('T33 (5.7-01/02) — 3 cliques no Explorer = 3 abas (não substitui); X na do meio mostra a da direita; fechar todas → chat intacto, Side Bar 274, sem tela preta', async ({ page }) => {
    await open(page);
    await clickSeed(page);
    for (const f of FILES) await clickFile(page, f);
    await expect(page.locator(ATTACH_TAB)).toHaveCount(3);
    expect(await tabNames(page)).toEqual(expect.arrayContaining(['seed.txt', 'renomeavel.txt', 'terceiro.txt']));
    await expectThinDefault(page);
    // X na aba do meio → a da direita vira ativa
    const middle = page.locator(ATTACH_TAB).nth(1);
    const middleName = (await tabNames(page))[1];
    const rightName = (await tabNames(page))[2];
    await middle.hover();
    await middle.locator('.codicon-close, .tab-close, [aria-label*="Close" i], [aria-label*="Fechar" i]').first().click();
    await expect(page.locator(ATTACH_TAB)).toHaveCount(2);
    expect(await tabNames(page)).not.toContain(middleName);
    expect(await activeTab(page)).toBe(rightName);
    // fecha as duas restantes → anexo recolhe (display:none, não desmonta), chat ocupa a faixa, Side Bar intacta
    for (let i = 0; i < 2; i++) {
      const t = page.locator(ATTACH_TAB).first();
      await t.hover();
      await t.locator('.codicon-close, .tab-close, [aria-label*="Close" i], [aria-label*="Fechar" i]').first().click();
    }
    await expect(page.locator(ATTACH_TAB)).toHaveCount(0);
    await expect(page.locator(ATTACH)).toHaveCount(1);
    await expect(page.locator(ATTACH)).toBeHidden();
    await expect(page.locator(CHAT)).toBeVisible();
    expect(await width(page, CHAT)).toBeGreaterThanOrEqual(CHAT_MIN);
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    await expect(page.locator(DETAILS)).toBeHidden();
    // reabrir pelo Explorer continua funcionando
    await clickSeed(page);
    await expectThinDefault(page);
  });

  test('T34 (5.7 F5) — F5 mantém as 3 abas e a ativa', async ({ page }) => {
    await open(page);
    await clickSeed(page);
    for (const f of FILES) await clickFile(page, f);
    await expect(page.locator(ATTACH_TAB)).toHaveCount(3);
    const before = await tabNames(page);
    const active = await activeTab(page);
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await expect(page.locator(ATTACH_TAB)).toHaveCount(3, { timeout: 15_000 });
    expect(await tabNames(page)).toEqual(before);
    expect(await activeTab(page)).toBe(active);
    await expectThinDefault(page);
  });

  test('T35 (5.7-02/04) — X na última aba com o editor MAXIMIZADO restaura: chat volta, Side Bar 274, editorMaximized=false; reabrir vem fino', async ({ page }) => {
    await open(page);
    await clickSeed(page);
    await page.locator(MAX_BTN).click();
    await page.waitForTimeout(400);
    await expect(page.locator(CHAT)).toBeHidden();
    const t = page.locator(ATTACH_TAB).first();
    await t.hover();
    await t.locator('.codicon-close, .tab-close, [aria-label*="Close" i], [aria-label*="Fechar" i]').first().click();
    await page.waitForTimeout(500);
    await expect(page.locator(ATTACH_TAB)).toHaveCount(0);
    await expect(page.locator(CHAT)).toBeVisible();
    await expect(page.locator(SB)).toBeVisible();
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);
    expect(saved.editorMaximized).toBe(false);
    await clickSeed(page);
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'false');
    await expectThinDefault(page);
  });

  test('T36 (5.7-03 → 5.8-c1) — boot limpo: nenhuma coluna "Detalhes" no DOM e nenhum Browser automático no centro', async ({ page }) => {
    await open(page);
    await expect(page.locator(DETAILS)).toHaveCount(0);
    await expect(page.locator(`${CENTER} .editor-tab`)).toHaveCount(0);
    expect(await width(page, CHAT)).toBeGreaterThanOrEqual(CHAT_MIN);
  });

  test('T32 — Browser ativo no EditorArea não bloqueia o anexo: arquivo abre no editor fino sem F5', async ({ page }) => {
    await open(page);
    await page.locator('button[aria-label="Abrir navegador no editor"]').first().click();
    await expect(page.locator(`${CENTER} .editor-tab.is-active`)).toBeVisible();
    await clickSeed(page);
    await expectThinDefault(page, true);
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'false');
  });

  test('T37 (5.7-04 / v1.2) — F5 com o editor MAXIMIZADO: Side Bar 274 segue visível; Restaurar direto mantém 274 ±2', async ({ page }) => {
    await open(page);
    await clickSeed(page);
    await page.locator(MAX_BTN).click();
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'true');
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await expect(page.locator(ATTACH_TAB)).toHaveCount(1, { timeout: 10_000 }); // F5 manteve a aba
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'true');
    await expect(page.locator(SB)).toBeVisible(); // v1.2
    await page.locator(MAX_BTN).click();
    await page.waitForTimeout(400);
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'false');
    await expect(page.locator(CHAT)).toBeVisible();
    await expect(page.locator(SB)).toBeVisible();
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    await expectThinDefault(page);
  });

  test('T38 (5.7-02) — X do HEADER do editor (recolher) com 3 abas e MAXIMIZADO: chat volta, Side Bar 274, sem tela preta; reabrir vem fino', async ({ page }) => {
    await open(page);
    await clickFile(page, 'seed.txt'); await clickFile(page, 'renomeavel.txt'); await clickFile(page, 'terceiro.txt');
    await expect(page.locator(ATTACH_TAB)).toHaveCount(3);
    await page.locator(MAX_BTN).click();
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'true');
    await page.locator(`${ATTACH} [data-testid="attach-collapse"]`).click();
    await page.waitForTimeout(400);
    await expect(page.locator(ATTACH)).toBeHidden();
    await expect(page.locator(CHAT)).toBeVisible();
    expect(await width(page, CHAT)).toBeGreaterThanOrEqual(CHAT_MIN);
    await expect(page.locator(SB)).toBeVisible();
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), LAYOUT_KEY);
    expect(saved.editorMaximized).toBe(false);
    await clickFile(page, 'seed.txt');
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'false');
    await expectThinDefault(page);
  });

  test('T39 (5.8-c1, RF-P-05) — coluna "Detalhes" e botões "Barra auxiliar" NÃO existem no DOM (boot, 3 abas, maximizado); boot chat 768 / Side Bar 274', async ({ page }) => {
    await open(page);
    const details = page.locator('.auxiliary-column');
    const auxButtons = page.locator('[aria-label="Barra auxiliar"], [aria-label="Alternar barra auxiliar"]');
    await expect(details).toHaveCount(0);
    await expect(auxButtons).toHaveCount(0);
    expect(await width(page, CHAT)).toBeGreaterThanOrEqual(760);
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    for (const f of ['seed.txt', ...FILES]) await clickFile(page, f);
    await expect(page.locator(ATTACH_TAB)).toHaveCount(3);
    await expect(details).toHaveCount(0);
    await expectThinDefault(page);
    await page.locator(MAX_BTN).click();
    await expect(page.locator(ATTACH)).toHaveAttribute('data-maximized', 'true');
    await expect(details).toHaveCount(0);
    expect(Math.abs((await width(page, SB)) - 274)).toBeLessThanOrEqual(2);
    await page.locator(MAX_BTN).click();
  });
});
