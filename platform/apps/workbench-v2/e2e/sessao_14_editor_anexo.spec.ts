// ============================================================================
// e2e/sessao_14_editor_anexo.spec.ts — FATIA-04 · 4.7 Editor Anexo Lateral.
// Régua: vídeo `docs/referencias_visuais/editor/34` (editor à ESQUERDA da
// árvore, dentro da barra auxiliar, sash entre eles), `04_05`, `04_20`.
// Cada commit acrescenta testes escritos FALHANDO antes do código.
// ============================================================================
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

declare global {
  interface Window { __explorerSearchModule?: { attach: {
    setVisible(i: { sessionId: string; visible: boolean }): void; setWidth(i: { sessionId: string; pixels: number }): void;
    open(i: { uri: string; kind: 'code'; sessionId: string; line?: number; pinned?: boolean }): Promise<void>;
    close(i: { uri: string; sessionId: string }): Promise<void>;
    closeAll(i: { sessionId: string }): Promise<void>;
    getTabs(i: { sessionId: string }): Array<{ uri: string; dirty: boolean; preview?: boolean; active?: boolean }>;
    isMaximized?(i: { sessionId: string }): boolean;
  } } }
}

const ATTACH = '.auxiliary-bar .explorer-attach-area';
const STORAGE = 'explorer-search.attach.v1';

async function openFilesTab(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ensureFilesTab(page);
}
/** Mesmo preâmbulo do sessao_12: fecha aba Browser, abre barra auxiliar, clica Files. */
async function ensureFilesTab(page: import('@playwright/test').Page) {
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
  if (!(await page.locator('[data-testid="side-bar"] [data-testid="explorer-view"]').first().isVisible().catch(() => false))) await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click(); // c3: Explorer vive na Side Bar (P2: só seletor)
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  await page.waitForTimeout(300);
}
const sessionId = (page: import('@playwright/test').Page) => page.evaluate(() => document.querySelector('.auxiliary-bar[data-session-id]')!.getAttribute('data-session-id')!);
const setVisible = async (page: import('@playwright/test').Page, visible: boolean) => {
  const sid = await sessionId(page);
  await page.evaluate(([s, v]) => window.__explorerSearchModule!.attach.setVisible({ sessionId: s as string, visible: v as boolean }), [sid, visible]);
};
/** 5.7 (D6): na faixa fina "Detalhes" e editor são EXCLUSIVOS; ao abrir a 1.ª aba ela colapsa sozinha, mas
 *  `attach.setVisible(true)` sem abas (empty state) não dispara isso — o teste desliga a coluna pelo toggle do shell. */
const collapseDetails = async (page: import('@playwright/test').Page) => {
  if (await page.locator('.auxiliary-bar .auxiliary-column').isVisible().catch(() => false)) {
    await page.locator('button[aria-label="Barra auxiliar"]').first().click();
    await expect(page.locator('.auxiliary-bar .auxiliary-column')).toBeHidden();
    await page.waitForTimeout(250); // transição de largura da barra (160 ms)
  }
};
const rect = (loc: import('@playwright/test').Locator) => loc.evaluate((e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; });

test.describe('FATIA-04 · 4.7 — Editor Anexo Lateral (módulo explorer-search no slot attachSlot da barra auxiliar)', () => {
  test('T1 (c1): anexo nasce montado e escondido (display:none) sem alargar a barra; visível → fica à ESQUERDA da árvore com sash 6 px role=separator e largura padrão dentro do clamp', async ({ page }) => {
    await openFilesTab(page);
    const attach = page.locator(ATTACH);
    await expect(attach).toHaveCount(1);
    await expect(attach).toBeHidden();
    expect(await attach.evaluate((e) => getComputedStyle(e).display)).toBe('none');
    await collapseDetails(page); // 5.7: Detalhes colapsada (0 px) — a barra passa a ser só o anexo
    const barBefore = await rect(page.locator('.auxiliary-bar'));
    await setVisible(page, true);
    await expect(attach).toBeVisible();
    await page.waitForTimeout(250); // 5.7: a barra sai de 0 px (casca vazia) com transição de 160 ms
    const a = await rect(attach);
    const tree = await rect(page.locator('.explorer-folders-view'));
    const bar = await rect(page.locator('.auxiliary-bar'));
    expect(a.right, 'anexo termina antes da árvore (editor à esquerda, print editor/34)').toBeLessThanOrEqual(tree.x);
    expect(bar.w, 'barra alarga exatamente a largura do anexo').toBeGreaterThanOrEqual(barBefore.w + a.w - 2);
    // 5.7 (D6): chat ≥ 420 px e ≥ 50 % da faixa chat+editor
    const bandW = await page.locator('.top-right-section').evaluate((e) => e.getBoundingClientRect().width);
    const chatW = (await rect(page.locator('.chat-pane'))).w;
    expect(chatW).toBeGreaterThanOrEqual(420);
    expect(chatW).toBeGreaterThanOrEqual(bandW * 0.5 - 2);
    expect(a.w).toBeLessThanOrEqual(bandW * 0.5 + 1);
    const sash = attach.locator('.explorer-attach-sash');
    await expect(sash).toHaveAttribute('role', 'separator');
    await expect(sash).toHaveAttribute('aria-orientation', 'vertical');
    const s = await rect(sash);
    expect(s.w).toBe(6);
    expect(s.x, 'sash na borda direita do anexo (entre editor e árvore)').toBe(a.right - 6);
    expect(await sash.evaluate((e) => getComputedStyle(e).cursor)).toBe('ew-resize');
    // clamp 280–1200 px e 25–50 % (5.7: teto 50 % da faixa; era 75 % na 4.7)
    expect(a.w).toBeGreaterThanOrEqual(280);
    expect(a.w).toBeLessThanOrEqual(700);
    // container sem position:fixed (A5.7)
    expect(await attach.evaluate((e) => getComputedStyle(e).position)).not.toBe('fixed');
  });

  test('T2 (c1): sash arrasta (→ aumenta), respeita o clamp, dblclick volta ao padrão e a largura sobrevive ao reload (localStorage explorer-search.attach.v1)', async ({ page }) => {
    await openFilesTab(page);
    await collapseDetails(page); // 5.7
    await setVisible(page, true);
    const attach = page.locator(ATTACH);
    const sash = attach.locator('.explorer-attach-sash');
    const sid0 = await sessionId(page);
    // 5.7: o padrão (46 %) já encosta no teto (50 % / piso do chat 420); parte do mínimo (280 px) para o arrasto ter curso
    await page.evaluate((sidv) => window.__explorerSearchModule!.attach.setWidth({ sessionId: sidv, pixels: 280 }), sid0);
    const w0 = (await rect(attach)).w;
    const s = await rect(sash);
    await page.mouse.move(s.x + 3, 400);
    await page.mouse.down();
    await page.mouse.move(s.x + 3 + 30, 400, { steps: 6 });
    await page.mouse.move(s.x + 3 + 60, 400, { steps: 6 });
    await page.mouse.up();
    const w1 = (await rect(attach)).w;
    expect(w1 - w0).toBeGreaterThanOrEqual(50);
    expect(w1 - w0).toBeLessThanOrEqual(70);
    // persistiu
    const saved = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), STORAGE);
    expect(saved?.width).toBe(w1);
    // clamp: setWidth absurdo → limite
    const sid = await sessionId(page);
    await page.evaluate((sidv) => window.__explorerSearchModule!.attach.setWidth({ sessionId: sidv, pixels: 5000 }), sid);
    const wMax = (await rect(attach)).w;
    const bandW = await page.locator('.top-right-section').evaluate((e) => e.getBoundingClientRect().width);
    expect(wMax).toBeLessThanOrEqual(Math.round(bandW * 0.5) + 1); // 5.7: teto 50 %
    await page.evaluate((sidv) => window.__explorerSearchModule!.attach.setWidth({ sessionId: sidv, pixels: 10 }), sid);
    expect((await rect(attach)).w).toBeGreaterThanOrEqual(280);
    // reload preserva a última largura válida (5.7: 330 px cabe no teto de 50 %; era 500)
    await page.evaluate((sidv) => window.__explorerSearchModule!.attach.setWidth({ sessionId: sidv, pixels: 330 }), sid);
    await page.reload();
    await ensureFilesTab(page);
    await page.waitForSelector(ATTACH, { state: 'attached' });
    await collapseDetails(page);
    await setVisible(page, true);
    expect((await rect(attach)).w).toBe(330);
    // dblclick → padrão (46 % da área útil, dentro do clamp) ≠ 330
    await sash.dblclick();
    const wDef = (await rect(attach)).w;
    expect(wDef).not.toBe(330);
    expect(wDef).toBeGreaterThanOrEqual(280);
    // teclado: foco no sash + ← → ajusta 10 px (5.7: o padrão encosta no teto → parte de 300 px, abaixo do teto)
    await page.evaluate((sidv) => window.__explorerSearchModule!.attach.setWidth({ sessionId: sidv, pixels: 300 }), sid);
    await sash.focus();
    await page.keyboard.press('ArrowRight');
    expect((await rect(attach)).w).toBe(310);
    await page.keyboard.press('ArrowLeft');
    expect((await rect(attach)).w).toBe(300);
  });

  test('T3 (c1): recolher = display:none sem desmontar (mesmo nó DOM, 0 unmounts) e reabrir restaura a largura; hover do sash acende após 300 ms', async ({ page }) => {
    await openFilesTab(page);
    await collapseDetails(page); // 5.7
    await setVisible(page, true);
    const attach = page.locator(ATTACH);
    const mountId = await attach.getAttribute('data-mount-id');
    expect(mountId).toBeTruthy();
    const w = (await rect(attach)).w;
    await setVisible(page, false);
    await expect(attach).toBeHidden();
    await expect(attach).toHaveCount(1);
    expect(await attach.evaluate((e) => getComputedStyle(e).display)).toBe('none');
    expect(await attach.getAttribute('data-mount-id'), 'mesmo nó — não desmontou').toBe(mountId);
    const treeW = (await rect(page.locator('.explorer-folders-view'))).w;
    expect(treeW).toBeGreaterThan(200); // árvore volta a ocupar a barra inteira
    await setVisible(page, true);
    await expect(attach).toBeVisible();
    expect((await rect(attach)).w).toBe(w);
    expect(await attach.getAttribute('data-mount-id')).toBe(mountId);
    // hover 300 ms
    const sash = attach.locator('.explorer-attach-sash');
    await sash.hover();
    await expect(sash).not.toHaveClass(/hover/);
    await page.waitForTimeout(450);
    await expect(sash).toHaveClass(/hover/);
  });

  test('T4 (c2): attach.open de 2 arquivos = 2 abas na sessão (mesma URI foca, não duplica); 1.ª aba abre o anexo; closeAll recolhe (display:none) e getTabs volta a []', async ({ page }) => {
    await openFilesTab(page);
    const attach = page.locator(ATTACH);
    await expect(attach).toBeHidden();
    const sid = await sessionId(page);
    const a = 'file:///tmp/explorer-fs-fixture/e2e-fixture-root/seed.txt';
    const b = 'file:///tmp/explorer-fs-fixture/e2e-fixture-root/pasta';
    await page.evaluate(async ([s, u]) => { await window.__explorerSearchModule!.attach.open({ uri: u, kind: 'code', sessionId: s }); }, [sid, a]);
    await expect(attach, '1.ª aba aberta → anexo aparece sozinho').toBeVisible();
    let tabs = await page.evaluate((s) => window.__explorerSearchModule!.attach.getTabs({ sessionId: s }), sid);
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({ uri: a, preview: true, active: true, dirty: false });
    // duplo clique (pinned) no primeiro + clique simples no segundo = 2 abas
    await page.evaluate(async ([s, u1, u2]) => {
      const m = window.__explorerSearchModule!;
      await m.attach.open({ uri: u1, kind: 'code', sessionId: s, pinned: true });
      await m.attach.open({ uri: u2, kind: 'code', sessionId: s });
      await m.attach.open({ uri: u1, kind: 'code', sessionId: s });
    }, [sid, a, b]);
    tabs = await page.evaluate((s) => window.__explorerSearchModule!.attach.getTabs({ sessionId: s }), sid);
    expect(tabs.map((t) => t.uri)).toEqual([a, b]);
    expect(tabs[0].active).toBe(true);
    // outra sessão não vê estas abas
    expect(await page.evaluate(() => window.__explorerSearchModule!.attach.getTabs({ sessionId: 'outra-sessao' }))).toEqual([]);
    await page.evaluate(async (s) => { await window.__explorerSearchModule!.attach.closeAll({ sessionId: s }); }, sid);
    await expect(attach).toBeHidden();
    await expect(attach).toHaveCount(1);
    expect(await page.evaluate((s) => window.__explorerSearchModule!.attach.getTabs({ sessionId: s }), sid)).toEqual([]);
  });

  const FX = 'file:///tmp/explorer-fs-fixture/e2e-fixture-root';
  const openIn = (page: import('@playwright/test').Page, sid: string, uri: string, pinned = false) =>
    page.evaluate(async ([s, u, p]) => { await window.__explorerSearchModule!.attach.open({ uri: u as string, kind: 'code', sessionId: s as string, pinned: p as boolean }); }, [sid, uri, pinned]);
  const css = (loc: import('@playwright/test').Locator, prop: string) => loc.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

  test('T5 (c3): faixa de abas 35 px fiel — aba 35 px, padding-left 10, label 13 px, ícone 16 px, ✕ 20×20 r6, borda-topo 1 px só na ativa, border-right 1 px; clicar troca a ativa; ✕ fecha; última fecha → anexo recolhe', async ({ page }) => {
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/seed.txt`, true);
    await openIn(page, sid, `${FX}/pasta`, true);
    const attach = page.locator(ATTACH);
    await expect(attach).toBeVisible();
    const strip = attach.locator('.tabs-and-actions-container');
    expect((await rect(strip)).h).toBe(35);
    expect(await css(strip, 'background-color')).toBe(await page.evaluate(() => { const d = document.createElement('div'); d.style.background = 'var(--vscode-editorGroupHeader-tabsBackground)'; document.body.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; }));
    const tabs = attach.locator('.tabs-container > .tab');
    await expect(tabs).toHaveCount(2);
    const t0 = tabs.nth(0); const t1 = tabs.nth(1);
    await expect(t1).toHaveClass(/active/);
    expect((await rect(t1)).h).toBe(35);
    expect(await css(t1, 'padding-left')).toBe('10px');
    expect(await css(t1, 'padding-right')).toBe('0px');
    expect(await css(t1, 'border-right-width')).toBe('1px');
    const label = t1.locator('.label-name');
    expect(await css(label, 'font-size')).toBe('13px');
    expect(await css(label, 'font-style')).toBe('normal'); // pinado
    const icon = t1.locator('.monaco-icon-label.file-icon');
    expect(await icon.evaluate((e) => getComputedStyle(e, '::before').width)).toBe('16px');
    expect(await icon.evaluate((e) => getComputedStyle(e, '::before').paddingRight)).toBe('6px');
    const top1 = t1.locator('.tab-border-top-container'); const top0 = t0.locator('.tab-border-top-container');
    expect((await rect(top1)).h).toBe(1);
    await expect(top0).toHaveCount(0);
    const close = t1.locator('.tab-actions .action-label');
    const cr = await rect(close);
    expect(cr.w).toBe(20); expect(cr.h).toBe(20);
    expect(await css(close, 'border-radius')).toBe('6px');
    expect((await rect(t1.locator('.tab-actions'))).w).toBe(28);
    // clicar na primeira ativa
    await t0.click();
    await expect(t0).toHaveClass(/active/);
    await expect(t1).not.toHaveClass(/active/);
    // ✕ fecha as duas → anexo recolhe (display:none, mesmo nó)
    const mountId = await attach.getAttribute('data-mount-id');
    await t0.locator('.tab-actions .action-label').click();
    await expect(tabs).toHaveCount(1);
    await tabs.first().hover();
    await tabs.first().locator('.tab-actions .action-label').click();
    await expect(attach).toBeHidden();
    expect(await attach.getAttribute('data-mount-id')).toBe(mountId);
  });

  test('T6 (c3): preview — clique simples abre em itálico e é substituído pelo próximo; dblclick na aba pina (itálico some)', async ({ page }) => {
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/seed.txt`);
    const attach = page.locator(ATTACH);
    const tabs = attach.locator('.tabs-container > .tab');
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first()).toHaveClass(/preview/);
    expect(await css(tabs.first().locator('.label-name'), 'font-style')).toBe('italic');
    await openIn(page, sid, `${FX}/pasta`);
    await expect(tabs).toHaveCount(1);
    await expect(tabs.first().locator('.label-name')).toHaveText('pasta');
    await tabs.first().dblclick();
    await expect(tabs.first()).not.toHaveClass(/preview/);
    expect(await css(tabs.first().locator('.label-name'), 'font-style')).toBe('normal');
    await openIn(page, sid, `${FX}/seed.txt`);
    await expect(tabs).toHaveCount(2);
  });

  test('T7 (c3): breadcrumbs 22 px sob as abas — itens 13 px relativos à raiz da fixture, separador codicon, último item com ícone; trocar de aba troca o caminho', async ({ page }) => {
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/seed.txt`, true);
    const attach = page.locator(ATTACH);
    const bc = attach.locator('.monaco-breadcrumbs');
    await expect(bc).toBeVisible();
    expect((await rect(bc)).h).toBe(22);
    const items = bc.locator('.monaco-breadcrumb-item');
    await expect(items).toHaveText(['e2e-fixture-root', 'seed.txt']);
    expect(await css(items.first(), 'font-size')).toBe('13px');
    await expect(bc.locator('.codicon-breadcrumb-separator')).toHaveCount(1);
    await expect(items.last().locator('.monaco-icon-label.file-icon')).toHaveCount(1);
    const strip = await rect(attach.locator('.tabs-and-actions-container'));
    expect((await rect(bc)).x >= 0 && (await rect(bc)).h === 22).toBe(true);
    expect(Math.round((await bc.evaluate((e) => e.getBoundingClientRect().top)))).toBe(strip.h + Math.round(await attach.evaluate((e) => e.getBoundingClientRect().top)));
    await openIn(page, sid, `${FX}/pasta`, true);
    await expect(items).toHaveText(['e2e-fixture-root', 'pasta']);
  });

  // ---- c4: Monaco real no anexo ----
  const MON = `${ATTACH} .editor-container .monaco-editor`;
  const seedFiles = async (request: import('@playwright/test').APIRequestContext) => {
    const F = (p: string) => `file:///tmp/explorer-fs-fixture/${p}`;
    const put = async (p: string, content: string) => {
      const r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: F(p), content } });
      if (r.status() === 409) await request.post(`${BASE_URL}/fs/write`, { data: { uri: F(p), content } });
    };
    await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: F('e2e-fixture-root/srch') } });
    const long = Array.from({ length: 80 }, (_, i) => `linha ${i + 1}`).join('\n') + '\n';
    await put('e2e-fixture-root/srch/long.txt', long);
    await put('e2e-fixture-root/srch/a.ts', 'const Needle = 1;\nneedle();\n// needles are not needle\n');
    await put('e2e-fixture-root/srch/b.md', '# needle doc\n\nsecond needle line\n');
  };
  const monacoState = (page: import('@playwright/test').Page) => page.evaluate(() => {
    const el = document.querySelector('.explorer-attach-area .editor-container .monaco-editor') as HTMLElement & { __attachEditor?: unknown };
    const ed = (window as unknown as { __explorerSearchModule: { __attachMonaco?: () => { getPosition(): { lineNumber: number; column: number }; getScrollTop(): number; getModel(): { getValue(): string; getAlternativeVersionId(): number } | null } } }).__explorerSearchModule.__attachMonaco?.();
    if (!ed || !el) return null;
    const pos = ed.getPosition();
    return { line: pos.lineNumber, column: pos.column, scrollTop: ed.getScrollTop(), value: ed.getModel()?.getValue() ?? '', version: ed.getModel()?.getAlternativeVersionId() ?? -1 };
  });

  test('T8 (c4): Monaco 14/19 no anexo com conteúdo real; editar marca dirty (●) e promove o preview; trocar de aba e voltar preserva cursor, scroll, texto editado e undo', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/srch/long.txt`);
    const attach = page.locator(ATTACH);
    const mon = page.locator(MON);
    await expect(mon).toBeVisible();
    await expect(mon.locator('.view-lines')).toContainText('linha 1');
    // 14/19
    const line = mon.locator('.view-line').first();
    expect(await css(line, 'font-size')).toBe('14px');
    expect(await css(line, 'line-height')).toBe('19px');
    expect(await mon.locator('.minimap').count() === 0 || (await rect(mon.locator('.minimap').first())).w === 0, 'minimap desabilitado').toBe(true);
    // vai para a linha 60, coluna 3 e digita
    await mon.click({ position: { x: 200, y: 40 } });
    await page.keyboard.press('Control+End');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Home');
    await page.keyboard.type('EDIT-');
    const st1 = await monacoState(page);
    expect(st1).not.toBeNull();
    expect(st1!.scrollTop).toBeGreaterThan(0);
    expect(st1!.value).toContain('EDIT-linha 79');
    const tab = attach.locator('.tabs-container > .tab').first();
    await expect(tab, 'editar promove o preview a pinado').not.toHaveClass(/preview/);
    await expect(tab, 'dirty ●').toHaveClass(/dirty/);
    await expect(tab.locator('.tab-actions .action-label')).toHaveClass(/codicon-close-dirty/);
    // abre B, volta para A
    await openIn(page, sid, `${FX}/srch/a.ts`);
    await expect(mon.locator('.view-lines')).toContainText('Needle');
    await attach.locator('.tabs-container > .tab', { hasText: 'long.txt' }).click();
    await expect(mon.locator('.view-lines')).toContainText('EDIT-');
    const st2 = await monacoState(page);
    expect(st2!.line).toBe(st1!.line);
    expect(st2!.column).toBe(st1!.column);
    expect(Math.abs(st2!.scrollTop - st1!.scrollTop)).toBeLessThanOrEqual(1);
    // undo sobrevive à troca de aba
    await mon.click({ position: { x: 200, y: 40 } });
    await page.keyboard.press('Control+Z');
    const st3 = await monacoState(page);
    expect(st3!.value).not.toContain('EDIT-');
    await expect(tab, 'undo total limpa o dirty').not.toHaveClass(/dirty/);
  });

  test('T9 (c4, fecha D2.20): clicar num resultado do Search abre o arquivo NO ANEXO na linha exata, com a linha destacada (findMatchHighlightBackground)', async ({ page, request }) => {
    await seedFiles(request);
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+Shift+F');
    const panel = page.locator('[data-testid="explorer-search-panel"]');
    await expect(panel).toBeVisible();
    await page.keyboard.type('second needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row[aria-level="2"]')).toHaveCount(1);
    await list.locator('.monaco-list-row[aria-level="2"]').first().click();
    const attach = page.locator(ATTACH);
    await expect(attach).toBeVisible();
    await expect(attach.locator('.tabs-container > .tab', { hasText: 'b.md' })).toHaveCount(1);
    const mon = page.locator(MON);
    await expect(mon.locator('.view-lines')).toContainText('second needle line');
    const st = await monacoState(page);
    expect(st!.line, 'cursor na linha 3 (match)').toBe(3);
    expect(st!.column, 'coluna do match (após "second ")').toBe(1);
    const hl = mon.locator('.attach-reveal-highlight');
    await expect(hl).toHaveCount(1);
    // token resolvido DENTRO do editor (o Monaco publica as variáveis --vscode-* do seu tema no .monaco-editor)
    expect(await css(hl.first(), 'background-color')).toBe(await mon.evaluate((m) => { const d = document.createElement('div'); d.style.background = 'var(--vscode-editor-findMatchHighlightBackground)'; m.appendChild(d); const c = getComputedStyle(d).backgroundColor; d.remove(); return c; }));
    // nada abriu no editor CENTRAL do shell
    await expect(page.locator('.editor-tab', { hasText: 'b.md' })).toHaveCount(0);
  });

  test('T10 (c4): recolher o anexo (display:none) e reabrir mantém o MESMO Monaco (0 unmounts): cursor, scroll e texto intactos; clique na árvore abre no anexo (não no editor central)', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/srch/long.txt`, true);
    const mon = page.locator(MON);
    await expect(mon.locator('.view-lines')).toContainText('linha 1');
    await mon.click({ position: { x: 200, y: 40 } });
    await page.keyboard.press('Control+End');
    await page.keyboard.type('fim');
    const before = await monacoState(page);
    const monId = await mon.evaluate((e) => { (e as HTMLElement).dataset.probe = 'same-node'; return 'same-node'; });
    const attach = page.locator(ATTACH);
    await setVisible(page, false);
    await expect(attach).toBeHidden();
    await setVisible(page, true);
    await expect(attach).toBeVisible();
    expect(await mon.getAttribute('data-probe')).toBe(monId);
    const after = await monacoState(page);
    expect(after).toEqual(before);
    // árvore → anexo (redirecionamento explorer.fileOpened → attach.open)
    const view = page.locator('[data-testid="explorer-view"]').first();
    const seedRow = view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
    if ((await seedRow.getAttribute('aria-expanded')) !== 'true') await seedRow.click();
    await view.locator('[role="treeitem"]', { hasText: 'seed.txt' }).first().click();
    await expect(attach.locator('.tabs-container > .tab', { hasText: 'seed.txt' })).toHaveCount(1);
    await expect(mon.locator('.view-lines')).toContainText('SEED-VAL-FS');
    await expect(page.locator('.editor-tab', { hasText: 'seed.txt' }), 'nada no editor central').toHaveCount(0);
  });

  // ---- c5: save atômico, diálogo, conflito externo ----
  const readDisk = async (request: import('@playwright/test').APIRequestContext, uri: string) => (await (await request.get(`${BASE_URL}/fs/read?uri=${encodeURIComponent(uri)}`)).json()) as { content: string };
  const statDisk = async (request: import('@playwright/test').APIRequestContext, uri: string) => (await (await request.post(`${BASE_URL}/fs/stat`, { data: { uri } })).json()) as { mtimeMs: number };
  const typeInMonaco = async (page: import('@playwright/test').Page, text: string) => {
    const mon = page.locator(MON);
    await mon.click({ position: { x: 200, y: 40 } });
    await page.keyboard.press('Control+Home');
    await page.keyboard.type(text);
  };

  test('T11 (c5): editar → Ctrl+S → writeFile atômico (conteúdo + mtime no disco mudam, sem temp sobrando) → ● some SÓ depois da escrita; salvar com falha mantém dirty e mostra erro', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    const uri = `${FX}/srch/a.ts`;
    await openIn(page, sid, uri, true);
    const attach = page.locator(ATTACH);
    const tab = attach.locator('.tabs-container > .tab').first();
    await expect(page.locator(MON).locator('.view-lines')).toContainText('Needle');
    const before = await statDisk(request, uri);
    await page.waitForTimeout(20);
    await typeInMonaco(page, '// SAVED-BY-CTRL-S\n');
    await expect(tab).toHaveClass(/dirty/);
    await page.keyboard.press('Control+S');
    await expect(tab).not.toHaveClass(/dirty/);
    const disk = await readDisk(request, uri);
    expect(disk.content.startsWith('// SAVED-BY-CTRL-S\n')).toBe(true);
    expect(disk.content).toContain('const Needle = 1;');
    const after = await statDisk(request, uri);
    expect(after.mtimeMs).toBeGreaterThan(before.mtimeMs);
    // nenhum arquivo temporário sobrou na pasta (temp + rename)
    const list = (await (await request.get(`${BASE_URL}/fs/list?uri=${encodeURIComponent(`${FX}/srch`)}`)).json()) as { entries: Array<{ name: string }> };
    expect(list.entries.some((e) => e.name.includes('fstmp'))).toBe(false);
    // falha de escrita: rota /fs/write bloqueada → dirty permanece + erro visível
    await page.route('**/fs/write', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'EIO simulado' }) }));
    await typeInMonaco(page, '// WILL-FAIL\n');
    await expect(tab).toHaveClass(/dirty/);
    await page.keyboard.press('Control+S');
    await expect(attach.locator('[data-testid="attach-save-error"]')).toBeVisible();
    await expect(tab, 'falha mantém dirty').toHaveClass(/dirty/);
    expect((await readDisk(request, uri)).content).not.toContain('WILL-FAIL');
    await page.unroute('**/fs/write');
  });

  test('T12 (c5): fechar aba suja → diálogo .monaco-dialog-box (aria-modal, warning, foco em Salvar, Enter=Salvar, Esc=Cancelar); Cancelar mantém aba suja; Não Salvar fecha sem gravar; Salvar grava e fecha', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    const uri = `${FX}/srch/b.md`;
    await openIn(page, sid, uri, true);
    const attach = page.locator(ATTACH);
    const tab = attach.locator('.tabs-container > .tab').first();
    await expect(page.locator(MON).locator('.view-lines')).toContainText('needle doc');
    await typeInMonaco(page, 'DIRTY ');
    await expect(tab).toHaveClass(/dirty/);
    // ✕ (● vira ✕ no hover) → diálogo
    await tab.hover();
    await tab.locator('.tab-actions .action-label').click();
    const dlg = page.locator('[data-testid="attach-save-dialog"] .monaco-dialog-box');
    await expect(dlg).toBeVisible();
    await expect(dlg).toHaveAttribute('aria-modal', 'true');
    await expect(dlg).toHaveAttribute('role', 'dialog');
    await expect(dlg.locator('.dialog-icon')).toHaveClass(/codicon-dialog-warning/);
    await expect(dlg.locator('.dialog-message')).toContainText('b.md');
    const btns = dlg.locator('.dialog-buttons .monaco-button');
    await expect(btns).toHaveText(['Salvar', 'Não Salvar', 'Cancelar']);
    await expect(btns.first()).toBeFocused();
    // focus trap: Tab 4x volta ao Salvar (3 botões + fechar)
    for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
    await expect(btns.first()).toBeFocused();
    // Esc = Cancelar → aba continua aberta e suja
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
    await expect(tab).toHaveClass(/dirty/);
    await expect(attach.locator('.tabs-container > .tab')).toHaveCount(1);
    // botão Cancelar
    await tab.hover(); await tab.locator('.tab-actions .action-label').click();
    await dlg.locator('.monaco-button', { hasText: 'Cancelar' }).click();
    await expect(dlg).toHaveCount(0);
    await expect(tab).toHaveClass(/dirty/);
    // Não Salvar → fecha, disco intacto
    await tab.hover(); await tab.locator('.tab-actions .action-label').click();
    await dlg.locator('.monaco-button', { hasText: 'Não Salvar' }).click();
    await expect(attach).toBeHidden();
    expect((await readDisk(request, uri)).content.startsWith('DIRTY')).toBe(false);
    // Salvar (Enter) → grava e fecha
    await openIn(page, sid, uri, true);
    await expect(page.locator(MON).locator('.view-lines')).toContainText('needle doc');
    await typeInMonaco(page, 'SAVED ');
    await expect(tab).toHaveClass(/dirty/);
    await tab.hover(); await tab.locator('.tab-actions .action-label').click();
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(attach).toBeHidden();
    await expect.poll(async () => (await readDisk(request, uri)).content.startsWith('SAVED ')).toBe(true);
  });

  test('T13 (c5): mudança EXTERNA no disco — arquivo limpo recarrega sozinho (sem dirty); arquivo sujo mostra aviso Recarregar / Manter Alterações', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    const uri = `${FX}/srch/a.ts`;
    await openIn(page, sid, uri, true);
    const attach = page.locator(ATTACH);
    const mon = page.locator(MON);
    const tab = attach.locator('.tabs-container > .tab').first();
    await expect(mon.locator('.view-lines')).toContainText('Needle');
    await page.waitForTimeout(400); // watcher da pasta ativo
    // limpo → recarrega em silêncio
    await request.post(`${BASE_URL}/fs/write`, { data: { uri, content: 'EXTERNAL-1\nconst Needle = 1;\n' } });
    await expect(mon.locator('.view-lines')).toContainText('EXTERNAL-1', { timeout: 10000 });
    await expect(tab).not.toHaveClass(/dirty/);
    await expect(page.locator('[data-testid="attach-conflict-dialog"]')).toHaveCount(0);
    // sujo → aviso
    await typeInMonaco(page, 'LOCAL ');
    await expect(tab).toHaveClass(/dirty/);
    await request.post(`${BASE_URL}/fs/write`, { data: { uri, content: 'EXTERNAL-2\nconst Needle = 1;\n' } });
    const dlg = page.locator('[data-testid="attach-conflict-dialog"] .monaco-dialog-box');
    await expect(dlg).toBeVisible({ timeout: 10000 });
    await expect(dlg.locator('.dialog-message')).toContainText('modificado externamente');
    await expect(dlg.locator('.dialog-buttons .monaco-button')).toHaveText(['Recarregar', 'Manter Alterações']);
    // Manter → conteúdo local fica, dirty fica
    await dlg.locator('.monaco-button', { hasText: 'Manter' }).click();
    await expect(dlg).toHaveCount(0);
    await expect(mon.locator('.view-lines')).toContainText('LOCAL');
    await expect(tab).toHaveClass(/dirty/);
    // nova mudança externa → Recarregar → disco vence, limpo
    await request.post(`${BASE_URL}/fs/write`, { data: { uri, content: 'EXTERNAL-3\nconst Needle = 1;\n' } });
    await expect(dlg).toBeVisible({ timeout: 10000 });
    await dlg.locator('.monaco-button', { hasText: 'Recarregar' }).click();
    await expect(mon.locator('.view-lines')).toContainText('EXTERNAL-3');
    await expect(mon.locator('.view-lines')).not.toContainText('LOCAL');
    await expect(tab).not.toHaveClass(/dirty/);
  });

  // ---- c6: maximizar dentro da sessão + empty state letterpress ----
  const SHELL = ['.titlebar', '.sessions-sidebar', '.chat-pane'] as const;
  const shellRects = async (page: import('@playwright/test').Page) => {
    const out: Record<string, { x: number; right: number; w: number; h: number }> = {};
    for (const sel of SHELL) out[sel] = await rect(page.locator(sel).first());
    return out;
  };

  test('T14 (c6→5.7 v1.2): ⤢ maximiza — anexo toma a faixa chat+editor inteira (chat some, Side Bar FICA, lista de sessões/titlebar iguais); Detalhes colapsada por default; sem position:fixed; ⤢ de novo restaura a largura anterior', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/srch/a.ts`, true);
    const attach = page.locator(ATTACH);
    await expect(attach).toBeVisible();
    await page.evaluate((s) => window.__explorerSearchModule!.attach.setWidth({ sessionId: s, pixels: 330 }), sid); // 5.7: ≤ 50 % e piso do chat 420 (era 420)
    await page.waitForTimeout(300);
    const before = await rect(attach);
    expect(before.w).toBe(330);
    const shellBefore = await shellRects(page);
    const column = page.locator('.auxiliary-bar > .auxiliary-column');
    await expect(column, '5.7 (D6): Detalhes colapsa ao abrir a 1.ª aba — não fica ao lado do editor').toBeHidden();
    const btn = attach.locator('[data-testid="attach-maximize"]');
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(await btn.evaluate((e) => e.className)).toContain('codicon-screen-full');
    await btn.click();
    await expect(attach).toHaveClass(/is-maximized/);
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(await btn.evaluate((e) => e.className)).toContain('codicon-screen-normal');
    await page.waitForTimeout(350); // transição 200 ms
    const band = await page.locator('.auxiliary-bar').evaluate((e) => e.parentElement!.getBoundingClientRect().width);
    const after = await rect(attach);
    expect(after.w).toBeGreaterThan(before.w);
    // 5.7 (D6/RF-07): maximizado = toma a faixa chat+editor inteira (CSS do shell), chat some; Side Bar FICA (docs/24 v1.2, 2026-10-02)
    expect(after.w).toBeGreaterThanOrEqual(band - 12);
    await expect(column, 'Detalhes recolhida enquanto maximizado').toBeHidden();
    await expect(page.locator('.chat-pane')).toBeHidden();
    await expect(page.locator('[data-testid="side-bar"]')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workbench.layoutState.v1') || '{}').editorMaximized)).toBe(true);
    // shell: titlebar e sidebar de sessões idênticos (lista sempre visível)
    const shellAfter = await shellRects(page);
    expect(shellAfter['.titlebar']).toEqual(shellBefore['.titlebar']);
    expect(shellAfter['.sessions-sidebar']).toEqual(shellBefore['.sessions-sidebar']);
    expect(await attach.evaluate((e) => getComputedStyle(e).position)).toBe('relative');
    expect(await attach.evaluate((e) => [e, ...e.querySelectorAll('*')].some((n) => getComputedStyle(n).position === 'fixed'))).toBe(false);
    expect(await attach.evaluate((e) => Math.max(0, ...[e, ...e.querySelectorAll('*')].map((n) => Number(getComputedStyle(n).zIndex) || 0)))).toBeLessThan(1000);
    // anexo continua DENTRO da banda da sessão
    const bandBox = await page.locator('.auxiliary-bar').evaluate((e) => { const b = e.parentElement!.getBoundingClientRect(); return { x: Math.round(b.x), right: Math.round(b.right) }; });
    expect(after.x).toBeGreaterThanOrEqual(bandBox.x);
    expect(after.right).toBeLessThanOrEqual(bandBox.right);
    // restore
    await btn.click();
    await expect(attach).not.toHaveClass(/is-maximized/);
    await page.waitForTimeout(350);
    expect((await rect(attach)).w).toBe(330);
    await expect(column, '5.7: Detalhes continua colapsada após restaurar (volta só pelo toggle)').toBeHidden();
    await expect(page.locator('.chat-pane')).toBeVisible();
    expect(await shellRects(page)).toEqual(shellBefore);
  });

  test('T15 (c6): anexo VISÍVEL sem abas → empty state letterpress (≤ 290 px, ilustração quadrada 256, aria-live=polite) com chips de atalho REAIS; chip Ctrl+Shift+F abre a busca; abrir arquivo remove o empty state; fechar a última aba continua RECOLHENDO (T5 intacto)', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    const attach = page.locator(ATTACH);
    const empty = attach.locator('[data-testid="attach-empty-state"]');
    // escondido → nada visível
    await expect(attach).toBeHidden();
    await collapseDetails(page); // 5.7: exclusiva com Detalhes na faixa fina
    // visível explicitamente (API/⤢) sem abas → letterpress
    await setVisible(page, true);
    await expect(attach).toBeVisible();
    await expect(empty).toBeVisible();
    expect(await empty.getAttribute('aria-live')).toBe('polite');
    const eb = await rect(empty);
    expect(eb.w).toBeLessThanOrEqual(290);
    const lp = await rect(empty.locator('.letterpress'));
    expect(lp.w).toBe(lp.h);
    expect(lp.w).toBeLessThanOrEqual(256);
    expect(lp.w).toBeGreaterThan(100);
    await expect(empty).toContainText('Nenhum arquivo aberto');
    expect(await empty.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(await page.locator('.explorer-attach-area').evaluate((e) => getComputedStyle(e).getPropertyValue('background-color')));
    // chips focáveis e clicáveis; Ctrl+Shift+F real → busca global do shell abre e foca o input
    const chips = empty.locator('.attach-shortcut-chip');
    expect(await chips.count()).toBeGreaterThanOrEqual(3);
    await expect(chips.first()).toHaveAttribute('data-shortcut', 'find-in-files');
    await chips.first().focus();
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-shortcut'))).toBe('find-in-files');
    await chips.first().click();
    await expect(page.locator('[data-testid="explorer-search-panel"] .search-container textarea').first()).toBeFocused({ timeout: 5000 });
    // ⤢ e ✕ existem também no estado vazio
    await expect(attach.locator('[data-testid="attach-maximize"]')).toBeVisible();
    await attach.locator('[data-testid="attach-collapse"]').click();
    await expect(attach).toBeHidden();
    // abre arquivo → sem empty state; fecha a última → recolhe (não fica letterpress)
    await openIn(page, sid, `${FX}/srch/b.md`, true);
    await expect(attach).toBeVisible();
    await expect(empty).toHaveCount(0);
    await page.evaluate((s) => window.__explorerSearchModule!.attach.closeAll({ sessionId: s }), sid);
    await expect(attach).toBeHidden();
  });

  test('T16 (c6): maximizado + reload → volta maximizado (largura customizada também persiste); Esc → restore imediato', async ({ page, request }) => {
    await seedFiles(request);
    await openFilesTab(page);
    const sid = await sessionId(page);
    await openIn(page, sid, `${FX}/srch/a.ts`, true);
    const attach = page.locator(ATTACH);
    await page.evaluate((s) => window.__explorerSearchModule!.attach.setWidth({ sessionId: s, pixels: 330 }), sid); // 5.7: ≤ 50 % e piso do chat 420 (era 400)
    await attach.locator('[data-testid="attach-maximize"]').click();
    await expect(attach).toHaveClass(/is-maximized/);
    const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORAGE);
    expect(stored).toMatchObject({ width: 330, maximized: true });
    await page.reload();
    await ensureFilesTab(page);
    const sid2 = await sessionId(page);
    await openIn(page, sid2, `${FX}/srch/a.ts`, true);
    await expect(attach).toBeVisible();
    await expect(attach).toHaveClass(/is-maximized/);
    expect(await page.evaluate((s) => window.__explorerSearchModule!.attach.isMaximized!({ sessionId: s }), sid2)).toBe(true);
    // Esc dentro do editor → restore imediato para a largura customizada
    await page.locator(MON).click({ position: { x: 200, y: 40 } });
    await page.keyboard.press('Escape');
    await expect(attach).not.toHaveClass(/is-maximized/);
    await page.waitForTimeout(350);
    expect((await rect(attach)).w).toBe(330);
    expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), STORAGE)).toMatchObject({ width: 330, maximized: false });
  });
});
