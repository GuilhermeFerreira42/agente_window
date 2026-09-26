// ============================================================================
// sessao_13_search.spec.ts — FATIA-04 · 4.6 (Search Panel + Replace) — UI
// Régua: code-server 8080 (auditoria_46/) + 04_17 §5 (medidas corrigidas em
// 04_19: widget 26 px fechado / 58 px aberto).
//   PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test sessao_13_search.spec
// c3 (T1–T4): widget — inputbox 26 px, toggles 20×20 aria-checked, toggle
//   replace 16 px abre 2.º input (58 px), details `…` com include/exclude.
// c4 (T5–T8): árvore de resultados 22 px (arquivo: twistie + ícone Seti +
//   nome + label-description + badge; match: indent 8 + before/.findInFileMatch/
//   after), mensagem N results in M files, estado vazio do VS Code, teclado
//   ↓ do input → lista, Esc → input, ←/→ recolhe/expande.
// ============================================================================
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

async function openSearchTab(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(500);
  await page.keyboard.press('Control+Shift+F');
  const panel = page.locator('[data-testid="explorer-search-panel"]');
  await expect(panel).toBeVisible();
  return panel;
}


/** Semente própria da 4.6 UI (idempotente) — arquivos com o termo "needle". */
async function seedSearchFixture(request: import('@playwright/test').APIRequestContext) {
  const F = (p: string) => `file:///tmp/explorer-fs-fixture/${p}`;
  const put = async (p: string, content: string) => {
    const r = await request.post(`${BASE_URL}/fs/createFile`, { data: { uri: F(p), content } });
    if (r.status() === 409) await request.post(`${BASE_URL}/fs/write`, { data: { uri: F(p), content } });
  };
  await request.post(`${BASE_URL}/fs/mkdir`, { data: { uri: F('e2e-fixture-root/srch') } });
  await put('e2e-fixture-root/srch/a.ts', 'const Needle = 1;\nneedle();\n// needles are not needle\n');
  await put('e2e-fixture-root/srch/b.md', '# needle doc\n\nsecond needle line\n');
}

test.describe('FATIA-04 · 4.6 — Search Panel (módulo explorer-search no slot da aba Search)', () => {
  test('T1 (c3): widget fiel — inputbox 26 px/radius 4, textarea 24 px padding 3 0 3 6, placeholder "Search", foco outline 1 px', async ({ page }) => {
    const panel = await openSearchTab(page);
    const widget = panel.locator('.search-widget');
    await expect(widget).toBeVisible();
    const m = await panel.evaluate((root) => {
      const q = (s: string) => root.querySelector(s) as HTMLElement | null;
      const r = (el: HTMLElement | null) => (el ? { h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) } : null);
      const ib = q('.search-container .monaco-inputbox');
      const ta = q('.search-container textarea');
      const cs = ib ? getComputedStyle(ib) : null;
      const wc = q('.search-widgets-container');
      return {
        widget: r(q('.search-widget')), inputbox: r(ib), radius: cs?.borderRadius, borderWidth: cs?.borderTopWidth,
        textarea: r(ta), taPadding: ta ? getComputedStyle(ta).padding : null, taFont: ta ? getComputedStyle(ta).fontSize : null, placeholder: (ta as HTMLTextAreaElement | null)?.placeholder,
        containerMargin: wc ? getComputedStyle(wc).margin : null, containerPadTop: wc ? getComputedStyle(wc).paddingTop : null,
        searchContainerMl: q('.search-container') ? getComputedStyle(q('.search-container')!).marginLeft : null,
      };
    });
    expect(m.widget?.h).toBe(26);
    expect(m.inputbox?.h).toBe(26);
    expect(m.radius).toBe('4px');
    expect(m.borderWidth).toBe('1px');
    expect(m.textarea?.h).toBe(24);
    expect(m.taPadding).toBe('3px 0px 3px 6px');
    expect(m.taFont).toBe('13px');
    expect(m.placeholder).toBe('Search');
    expect(m.containerMargin).toBe('0px 12px 0px 2px');
    expect(m.containerPadTop).toBe('6px');
    expect(m.searchContainerMl).toBe('18px');
    // foco (Ctrl+Shift+F já foca o input): outline 1 px
    const ta = panel.locator('.search-container textarea');
    await expect(ta).toBeFocused();
    expect(await panel.locator('.search-container .monaco-inputbox').evaluate((el) => getComputedStyle(el).outlineWidth)).toBe('1px');
  });

  test('T2 (c3): 3 toggles 20×20 (case/word/regex) com aria-checked, radius 3, ativo por clique e por Alt+C/W/R', async ({ page }) => {
    const panel = await openSearchTab(page);
    const toggles = panel.locator('.search-container .monaco-custom-toggle');
    await expect(toggles).toHaveCount(3);
    const info = await toggles.evaluateAll((els) => els.map((e) => ({
      cls: [...e.classList].filter((c) => c.startsWith('codicon-')).join(' '), title: e.getAttribute('title'),
      w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), checked: e.getAttribute('aria-checked'), radius: getComputedStyle(e).borderRadius, role: e.getAttribute('role'),
    })));
    expect(info.map((i) => i.cls)).toEqual(['codicon-case-sensitive', 'codicon-whole-word', 'codicon-regex']);
    expect(info.map((i) => i.title)).toEqual(['Match Case (Alt+C)', 'Match Whole Word (Alt+W)', 'Use Regular Expression (Alt+R)']);
    expect(info.every((i) => i.w === 20 && i.h === 20 && i.checked === 'false' && i.radius === '3px' && i.role === 'checkbox')).toBe(true);
    await toggles.nth(0).click();
    await expect(toggles.nth(0)).toHaveAttribute('aria-checked', 'true');
    await expect(toggles.nth(0)).toHaveClass(/checked/);
    await panel.locator('.search-container textarea').focus();
    await page.keyboard.press('Alt+R');
    await expect(toggles.nth(2)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Alt+R');
    await expect(toggles.nth(2)).toHaveAttribute('aria-checked', 'false');
  });

  test('T3 (c3): toggle replace 16 px (chevron ►) à esquerda → widget 58 px, 2.º inputbox 26 px "Replace" + preserve-case + Replace All 22×22; Ctrl+Shift+H também abre', async ({ page }) => {
    const panel = await openSearchTab(page);
    const trb = panel.locator('.toggle-replace-button');
    let m = await trb.evaluate((e) => ({ w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), cls: [...e.classList].filter((c) => c.startsWith('codicon-')).join(' '), left: getComputedStyle(e).left, radius: getComputedStyle(e).borderRadius, expanded: e.getAttribute('aria-expanded') }));
    expect(m).toEqual({ w: 16, h: 26, cls: 'codicon-search-show-replace', left: '0px', radius: '4px', expanded: 'false' });
    await expect(panel.locator('.replace-container')).toHaveCount(0);
    await trb.click();
    await expect(panel.locator('.replace-container')).toBeVisible();
    m = await trb.evaluate((e) => ({ w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), cls: [...e.classList].filter((c) => c.startsWith('codicon-')).join(' '), left: getComputedStyle(e).left, radius: getComputedStyle(e).borderRadius, expanded: e.getAttribute('aria-expanded') }));
    expect(m).toEqual({ w: 16, h: 58, cls: 'codicon-search-hide-replace', left: '0px', radius: '4px', expanded: 'true' });
    const r = await panel.evaluate((root) => {
      const q = (s: string) => root.querySelector(s) as HTMLElement | null;
      const r = (el: HTMLElement | null) => (el ? { h: Math.round(el.getBoundingClientRect().height), w: Math.round(el.getBoundingClientRect().width) } : null);
      return { widget: r(q('.search-widget')), box: r(q('.replace-container .monaco-inputbox')), mt: getComputedStyle(q('.replace-container')!).marginTop, ph: (q('.replace-container textarea') as HTMLTextAreaElement).placeholder,
        toggles: [...root.querySelectorAll('.replace-container .monaco-custom-toggle')].map((t) => t.getAttribute('title')), replaceAll: r(q('.replace-container .replace-actions .action-label')), replaceAllTitle: q('.replace-container .replace-actions .action-label')?.getAttribute('title') };
    });
    expect(r.widget?.h).toBe(58);
    expect(r.box?.h).toBe(26);
    expect(r.mt).toBe('6px');
    expect(r.ph).toBe('Replace');
    expect(r.toggles).toEqual(['Preserve Case (Alt+P)']);
    expect(r.replaceAll).toEqual({ h: 22, w: 22 });
    expect(r.replaceAllTitle).toContain('Replace All');
    // fecha e reabre por atalho
    await trb.click();
    await expect(panel.locator('.replace-container')).toHaveCount(0);
    await panel.locator('.search-container textarea').focus();
    await page.keyboard.press('Control+Shift+H');
    await expect(panel.locator('.replace-container')).toBeVisible();
    await expect(panel.locator('.replace-container textarea')).toBeFocused();
  });

  test('T4 (c3): details "…" 25×16 → "files to include"/"files to exclude" (h4 11 px), placeholder exato, toggle "Use Exclude Settings and Ignore Files" ligado; Ctrl+Shift+J alterna', async ({ page }) => {
    const panel = await openSearchTab(page);
    const more = panel.locator('.query-details .more');
    expect(await more.evaluate((e) => ({ w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height), cls: [...e.classList].filter((c) => c.startsWith('codicon-')).join(' '), title: e.getAttribute('title') }))).toEqual({ w: 25, h: 16, cls: 'codicon-ellipsis', title: 'Toggle Search Details' });
    await expect(panel.locator('.query-details .file-types')).toHaveCount(0);
    await more.click();
    const d = await panel.evaluate((root) => {
      const h4 = [...root.querySelectorAll('.query-details .file-types h4')] as HTMLElement[];
      const inputs = [...root.querySelectorAll('.query-details .file-types .monaco-inputbox')] as HTMLElement[];
      const ins = [...root.querySelectorAll('.query-details .file-types input')] as HTMLInputElement[];
      return { h4: h4.map((h) => ({ t: h.textContent, fs: getComputedStyle(h).fontSize, fw: getComputedStyle(h).fontWeight, pt: getComputedStyle(h).paddingTop })), boxes: inputs.map((i) => Math.round(i.getBoundingClientRect().height)), placeholders: ins.map((i) => i.placeholder),
        toggles: [...root.querySelectorAll('.query-details .file-types .monaco-custom-toggle')].map((t) => ({ title: t.getAttribute('title'), checked: t.getAttribute('aria-checked') })) };
    });
    expect(d.h4).toEqual([{ t: 'files to include', fs: '11px', fw: '400', pt: '4px' }, { t: 'files to exclude', fs: '11px', fw: '400', pt: '4px' }]);
    expect(d.boxes).toEqual([25, 25]);
    expect(d.placeholders).toEqual(['e.g. *.ts, src/**/include', '']);
    expect(d.toggles).toEqual([{ title: 'Use Exclude Settings and Ignore Files', checked: 'true' }]);
    await panel.locator('.search-container textarea').focus();
    await page.keyboard.press('Control+Shift+J');
    await expect(panel.locator('.query-details .file-types')).toHaveCount(0);
  });

  test('T5 (c4): resultados reais agrupados — linha de arquivo 22 px (twistie pl 8, ícone Seti, nome, label-description, badge 18 px radius 11) e mensagem "N results in M files"', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row[aria-level="1"]')).toHaveCount(2);
    await expect(panel.locator('.messages .message')).toHaveText('6 results in 2 files');
    const f = list.locator('.monaco-list-row[aria-level="1"]').first();
    const m = await f.evaluate((row) => {
      const q = (s: string) => row.querySelector(s) as HTMLElement | null; const r = (el: HTMLElement | null) => (el ? Math.round(el.getBoundingClientRect().height) : null);
      const badge = q('.monaco-count-badge'); const cs = badge ? getComputedStyle(badge) : null;
      const tw = q('.monaco-tl-twistie');
      return { h: r(row as HTMLElement), role: row.getAttribute('role'), expanded: row.getAttribute('aria-expanded'), twistieCls: tw?.className, twistiePl: tw ? getComputedStyle(tw).paddingLeft : null,
        iconCls: q('.monaco-icon-label')?.className, name: q('.label-name')?.textContent, desc: q('.label-description')?.textContent,
        badge: badge?.textContent, badgeH: r(badge), badgeRadius: cs?.borderRadius, badgePad: cs?.padding, badgeMr: cs?.marginRight, badgeFs: cs?.fontSize };
    });
    expect(m.h).toBe(22);
    expect(m.role).toBe('treeitem');
    expect(m.expanded).toBe('true');
    expect(m.twistieCls).toContain('codicon-tree-item-expanded');
    expect(m.twistieCls).toContain('collapsible');
    expect(m.twistiePl).toBe('8px');
    expect(m.iconCls).toContain('ts-ext-file-icon');
    expect(m.name).toBe('a.ts');
    expect(m.desc).toBe('e2e-fixture-root/srch');
    expect(m.badge).toBe('4');
    expect([m.badgeH, m.badgeRadius, m.badgePad, m.badgeMr, m.badgeFs]).toEqual([18, '11px', '3px 5px', '12px', '11px']);
  });

  test('T6 (c4): linhas de match 22 px aria-level 2 — indent 8 px, twistie pl 16, before/.findInFileMatch/after com o trecho da linha', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const rows = panel.locator('.results .monaco-list-row[aria-level="2"]');
    await expect(rows).toHaveCount(6);
    const m = await rows.first().evaluate((row) => {
      const q = (s: string) => row.querySelector(s) as HTMLElement | null;
      const ind = q('.monaco-tl-indent'); const tw = q('.monaco-tl-twistie'); const hl = q('.findInFileMatch'); const a = q('a.plain.match');
      const spans = a ? [...a.children].map((c) => ({ cls: c.className, t: c.textContent })) : [];
      return { h: Math.round(row.getBoundingClientRect().height), indW: ind ? Math.round(ind.getBoundingClientRect().width) : null, twPl: tw ? getComputedStyle(tw).paddingLeft : null,
        hl: hl?.textContent, hlBg: hl ? getComputedStyle(hl).backgroundColor : null, spans, beforeOpacity: a ? getComputedStyle(a.children[0]).opacity : null };
    });
    expect(m.h).toBe(22);
    expect(m.indW).toBe(8);
    expect(m.twPl).toBe('16px');
    expect(m.hl).toBe('Needle');
    expect(m.hlBg).not.toBe('rgba(0, 0, 0, 0)');
    expect(m.spans.map((s) => s.cls)).toEqual(['', 'findInFileMatch', 'replaceMatch', '']);
    expect(m.spans[0].t).toBe('const ');
    expect(m.spans[3].t).toBe(' = 1;');
    expect(m.beforeOpacity).toBe('0.7');
  });

  test('T7 (c4): estado vazio com a frase do VS Code; Backspace até vazio limpa resultados e mensagem', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('zzqqxx_nao_existe_987');
    await expect(panel.locator('.messages .message')).toHaveText('No results found. Review your settings for configured exclusions and check your gitignore files');
    await expect(panel.locator('.results .monaco-list-row')).toHaveCount(0);
    await panel.locator('.search-container textarea').fill('');
    await expect(panel.locator('.messages .message')).toHaveCount(0);
  });

  test('T8 (c4): teclado — ↓ do input foca a 1.ª linha; ↓/↑ navegam; ← recolhe arquivo (matches somem), → expande; Esc volta ao input; clique no twistie recolhe', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    await page.keyboard.press('ArrowDown');
    await expect(list).toBeFocused();
    const focusedText = async () => list.locator('.monaco-list-row.focused').evaluate((r) => ({ level: r.getAttribute('aria-level'), t: r.textContent?.trim().slice(0, 30) }));
    expect((await focusedText()).level).toBe('1');
    await page.keyboard.press('ArrowDown');
    expect((await focusedText()).level).toBe('2');
    await page.keyboard.press('ArrowUp');
    expect((await focusedText()).level).toBe('1');
    await page.keyboard.press('ArrowLeft');
    await expect(list.locator('.monaco-list-row')).toHaveCount(4); // a.ts recolhido: 1 + b.md(1+2)
    await expect(list.locator('.monaco-list-row.focused')).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('ArrowRight');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    await page.keyboard.press('Escape');
    await expect(panel.locator('.search-container textarea')).toBeFocused();
    await list.locator('.monaco-list-row[aria-level="1"]').nth(1).locator('.monaco-tl-twistie').click();
    await expect(list.locator('.monaco-list-row')).toHaveCount(6);
  });

  // ---------------------------------------------------------------------------
  // c5 — search-replace. Régua 8080 (auditoria_46/c5_regua_*.png, 26/09):
  // hover na linha → .actionBarContainer > .monaco-toolbar > .monaco-action-bar
  // com a.action-label 20×20 padding 2 radius 6 font 16: match = "Replace
  // (Ctrl+Shift+1)" + "Dismiss (Del)"; arquivo = "Replace All (Ctrl+Shift+1)"
  // + "Dismiss (Del)". Com replace aberto: .findInFileMatch.replace (line-through)
  // + .replaceMatch com o texto novo. Replace All do widget → .monaco-dialog-box
  // "Replace N occurrences across M files with 'X'?" [Cancel] [Replace] 26 px.
  // ---------------------------------------------------------------------------
  const readFixture = async (request: import('@playwright/test').APIRequestContext, p: string) => {
    const r = await request.get(`${BASE_URL}/fs/read?uri=${encodeURIComponent(`file:///tmp/explorer-fs-fixture/${p}`)}`);
    return (await r.json()).content as string;
  };

  test('T9 (c5): replace aberto → preview riscado + .replaceMatch; hover mostra Replace/Dismiss 20×20 (match) e Replace All/Dismiss (arquivo) com títulos do VS Code', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    // sem replace: nenhum .replaceMatch visível, sem line-through
    const firstMatch = list.locator('.monaco-list-row[aria-level="2"]').first();
    await expect(firstMatch.locator('.replaceMatch')).toBeHidden();
    // abre replace e digita
    await panel.locator('.toggle-replace-button').click();
    await panel.locator('.replace-container textarea').fill('XX');
    await expect(firstMatch.locator('.findInFileMatch')).toHaveClass(/replace/);
    await expect(firstMatch.locator('.replaceMatch')).toHaveText('XX');
    const deco = await firstMatch.locator('.findInFileMatch').evaluate((e) => getComputedStyle(e).textDecorationLine);
    expect(deco).toBe('line-through');
    // hover no match → 2 ações
    await firstMatch.hover();
    const acts = firstMatch.locator('.monaco-action-bar .action-label');
    await expect(acts).toHaveCount(2);
    await expect(acts.nth(0)).toHaveClass(/codicon-search-replace/);
    await expect(acts.nth(0)).toHaveAttribute('aria-label', 'Replace (Ctrl+Shift+1)');
    await expect(acts.nth(1)).toHaveClass(/codicon-search-remove/);
    await expect(acts.nth(1)).toHaveAttribute('aria-label', 'Dismiss (Del)');
    const m = await acts.nth(0).evaluate((e) => { const c = getComputedStyle(e); const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), pad: c.padding, radius: c.borderRadius, fs: c.fontSize }; });
    expect(m).toEqual({ w: 20, h: 20, pad: '2px', radius: '6px', fs: '16px' });
    // hover no arquivo → Replace All + Dismiss
    const fileRow = list.locator('.monaco-list-row[aria-level="1"]').first();
    await fileRow.hover();
    const facts = fileRow.locator('.monaco-action-bar .action-label');
    await expect(facts).toHaveCount(2);
    await expect(facts.nth(0)).toHaveAttribute('aria-label', 'Replace All (Ctrl+Shift+1)');
    await expect(facts.nth(1)).toHaveAttribute('aria-label', 'Dismiss (Del)');
    // sem hover as ações não aparecem (visibility hidden como no VS Code)
    await panel.locator('.search-container textarea').hover();
    await expect(firstMatch.locator('.monaco-action-bar')).toBeHidden();
  });

  test('T10 (c5): Replace num match grava no disco só aquela ocorrência e some da árvore; Replace All do arquivo troca as restantes do arquivo', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    await panel.locator('.toggle-replace-button').click();
    await panel.locator('.replace-container textarea').fill('XX');
    // 2.º match de a.ts = "needle();" (linha 2)
    const row = list.locator('.monaco-list-row[aria-level="2"]').nth(1);
    await expect(row).toHaveAttribute('data-line', '2'); // texto da linha vira "needle" riscado + "XX" + "();"
    await expect(row.locator('a.plain.match > span').last()).toHaveText('();');
    await row.hover();
    await row.locator('.monaco-action-bar .codicon-search-replace').click();
    await expect(list.locator('.monaco-list-row')).toHaveCount(7);
    await expect(panel.locator('.messages .message')).toHaveText('5 results in 2 files');
    expect(await readFixture(request, 'e2e-fixture-root/srch/a.ts')).toBe('const Needle = 1;\nXX();\n// needles are not needle\n');
    // Replace All no arquivo a.ts (linha de arquivo)
    const fileRow = list.locator('.monaco-list-row[aria-level="1"]').first();
    await fileRow.hover();
    await fileRow.locator('.monaco-action-bar .codicon-search-replace').click();
    await expect(list.locator('.monaco-list-row')).toHaveCount(3); // só b.md (1 + 2)
    await expect(panel.locator('.messages .message')).toHaveText('2 results in 1 file');
    expect(await readFixture(request, 'e2e-fixture-root/srch/a.ts')).toBe('const XX = 1;\nXX();\n// XXs are not XX\n');
    expect(await readFixture(request, 'e2e-fixture-root/srch/b.md')).toBe('# needle doc\n\nsecond needle line\n');
  });

  test('T11 (c5): Dismiss (Del no teclado e botão) remove da árvore sem tocar no disco; Del num arquivo remove o grupo inteiro', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    await page.keyboard.press('ArrowDown'); // foca a.ts
    await page.keyboard.press('ArrowDown'); // 1.º match
    await page.keyboard.press('Delete');
    await expect(list.locator('.monaco-list-row')).toHaveCount(7);
    await expect(panel.locator('.messages .message')).toHaveText('5 results in 2 files');
    // botão Dismiss no arquivo b.md
    const bRow = list.locator('.monaco-list-row[aria-level="1"]').nth(1);
    await bRow.hover();
    await bRow.locator('.monaco-action-bar .codicon-search-remove').click();
    await expect(list.locator('.monaco-list-row')).toHaveCount(4);
    await expect(panel.locator('.messages .message')).toHaveText('3 results in 1 file');
    expect(await readFixture(request, 'e2e-fixture-root/srch/a.ts')).toBe('const Needle = 1;\nneedle();\n// needles are not needle\n');
    expect(await readFixture(request, 'e2e-fixture-root/srch/b.md')).toBe('# needle doc\n\nsecond needle line\n');
  });

  test('T12 (c5): Replace All do widget pede confirmação (.monaco-dialog-box, frase e botões do VS Code, 26 px); Cancel não muda nada; Replace grava tudo e mostra "Replaced N occurrences across M files with \'XX\'."', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    await panel.locator('.toggle-replace-button').click();
    await panel.locator('.replace-container textarea').fill('XX');
    await panel.locator('.replace-actions .codicon-search-replace-all').click();
    const dlg = page.locator('.monaco-dialog-box');
    await expect(dlg).toBeVisible();
    await expect(dlg).toHaveAttribute('role', 'dialog');
    await expect(dlg.locator('.dialog-message-detail')).toHaveText("Replace 6 occurrences across 2 files with 'XX'?");
    const btns = dlg.locator('.monaco-button');
    await expect(btns).toHaveCount(2);
    await expect(btns.nth(0)).toHaveText('Cancel');
    await expect(btns.nth(0)).toHaveClass(/secondary/);
    await expect(btns.nth(1)).toHaveText('Replace');
    expect(Math.round((await btns.nth(1).boundingBox())!.height)).toBe(26);
    expect(await dlg.evaluate((d) => getComputedStyle(d).borderRadius)).toBe('12px');
    await btns.nth(0).click();
    await expect(dlg).toBeHidden();
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    expect(await readFixture(request, 'e2e-fixture-root/srch/a.ts')).toContain('needle');
    // Ctrl+Alt+Enter no input de replace também abre; Enter no diálogo confirma
    await panel.locator('.replace-container textarea').focus();
    await page.keyboard.press('Control+Alt+Enter');
    await expect(dlg).toBeVisible();
    await dlg.locator('.monaco-button').nth(1).click();
    await expect(dlg).toBeHidden();
    await expect(panel.locator('.messages .message')).toHaveText("Replaced 6 occurrences across 2 files with 'XX'.");
    await expect(list.locator('.monaco-list-row')).toHaveCount(0);
    expect(await readFixture(request, 'e2e-fixture-root/srch/a.ts')).toBe('const XX = 1;\nXX();\n// XXs are not XX\n');
    expect(await readFixture(request, 'e2e-fixture-root/srch/b.md')).toBe('# XX doc\n\nsecond XX line\n');
  });

  // ---------------------------------------------------------------------------
  // c6 — search-open: clique/Enter no match → `explorer.fileOpened` (o shell
  // abre a aba do editor, mesmo caminho do Explorer); linha/coluna: reveal no
  // editor é débito da 4.7 (a linha fica em data-line/data-column da row).
  // Persistência (searchView.ts saveState/viewState): termo, replace, toggles,
  // include/exclude e replace/details abertos em localStorage
  // `explorer-search.search.v1`; ao recarregar NÃO refaz a busca sozinho.
  // ---------------------------------------------------------------------------
  test('T13 (c6): clique num match abre o arquivo no editor (aba a.ts) e o seleciona no Explorer; Enter no match focado também abre', async ({ page, request }) => {
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    const list = panel.locator('.results .monaco-list');
    await expect(list.locator('.monaco-list-row')).toHaveCount(8);
    await expect(page.locator('.editor-tab', { hasText: 'a.ts' })).toHaveCount(0);
    await list.locator('.monaco-list-row[aria-level="2"]').first().click();
    await expect(page.locator('.editor-tab', { hasText: 'a.ts' }).first()).toBeVisible();
    // Enter num match de b.md (foco via teclado) — a aba do editor ficou ativa; volta à aba Search
    await page.locator('.editor-tab', { hasText: 'Search' }).first().click();
    await expect(panel).toBeVisible();
    await panel.locator('.search-container textarea').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End'); // último match (b.md)
    await page.keyboard.press('Enter');
    await expect(page.locator('.editor-tab', { hasText: 'b.md' }).first()).toBeVisible();
  });

  test('T14 (c6): termo, replace, toggles, include e painéis abertos sobrevivem ao reload (localStorage explorer-search.search.v1) sem refazer a busca; limpar o termo apaga a chave', async ({ page, request }) => {
    test.slow(); // reload + 2 buscas: sob carga da bateria completa passa de 30 s
    await seedSearchFixture(request);
    const panel = await openSearchTab(page);
    await page.keyboard.type('needle');
    await page.keyboard.press('Alt+c');
    await panel.locator('.toggle-replace-button').click();
    await panel.locator('.replace-container textarea').fill('XX');
    await panel.locator('.query-details .more').click();
    await panel.locator('.includes input').fill('*.ts');
    await expect(panel.locator('.results .monaco-list-row')).toHaveCount(4); // Alt+C + *.ts: a.ts com 3 matches minúsculos + linha do arquivo
    const raw = await page.evaluate(() => localStorage.getItem('explorer-search.search.v1'));
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ pattern: 'needle', replacement: 'XX', isCaseSensitive: true, include: '*.ts', replaceOpen: true, detailsOpen: true });
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.waitForTimeout(600);
    await page.keyboard.press('Control+Shift+F');
    const p2 = page.locator('[data-testid="explorer-search-panel"]');
    await expect(p2.locator('.search-container textarea')).toHaveValue('needle');
    await expect(p2.locator('.replace-container textarea')).toHaveValue('XX');
    await expect(p2.locator('.codicon-case-sensitive')).toHaveAttribute('aria-checked', 'true');
    await expect(p2.locator('.includes input')).toHaveValue('*.ts');
    // sem busca automática ao restaurar (searchOnType só reage a digitação)
    await page.waitForTimeout(800);
    await expect(p2.locator('.results .monaco-list-row')).toHaveCount(0);
    await expect(p2.locator('.messages .message')).toHaveCount(0);
    // Enter dispara a busca com o estado restaurado
    await p2.locator('.search-container textarea').focus();
    await page.keyboard.press('Enter');
    await expect(p2.locator('.results .monaco-list-row')).toHaveCount(4);
    // limpar termo → chave some
    await p2.locator('.search-container textarea').fill('');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('explorer-search.search.v1'))).toBeNull();
  });
});
