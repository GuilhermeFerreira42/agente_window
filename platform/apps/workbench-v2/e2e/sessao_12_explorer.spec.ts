// ============================================================================
// sessao_12_explorer.spec.ts — FATIA-04 · 4.4 (UI Explorer real, parte 1)
// Roda contra o DEV SERVER FIXTURE (5175) com FS_TEST_ROOT=/tmp/explorer-fs-fixture:
//   1) subir: FS_TEST_ROOT=file:///tmp/explorer-fs-fixture npm run dev -- --port 5175 --strictPort
//   2) rodar: PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test sessao_12_explorer
// Cobre (04_15 §4.4 DoD, parte 1): boot do módulo na aba Files, header 5 botões
// (VAL/04_01 tooltips), árvore RAIZ real, lazy 1× por pasta + cache (VAL-EXP-01),
// linha 22 px, seções (Open Editors vazio = VAL-EXP-06, TIMELINE/OUTLINE),
// criar arquivo/pasta + duplicado (VAL-EXP-04), renomear F2 (VAL-EXP-02),
// open-file emite fileOpened + Open Editors reage, collapse-all, refresh
// re-lê o disco, menu de contexto do shell (Open).
// ============================================================================
import { expect, test } from '@playwright/test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { BASE_URL } from './helpers';

const FS_ROOT = '/tmp/explorer-fs-fixture';
const SEED = `${FS_ROOT}/e2e-fixture-root`;

/** PNG 1x1 vermelho — binario REAL do disco (aceite Image Preview do BUG-P1). */
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Semeia a fixture no disco (o server dev lê o FS real — sem API intermediária). */
async function seedFixture() {
  await rm(FS_ROOT, { recursive: true, force: true });
  await mkdir(`${SEED}/pasta/sub`, { recursive: true });
  await mkdir(`${SEED}/outra`, { recursive: true });
  await writeFile(`${SEED}/seed.txt`, 'SEED-VAL-FS-12 explorer 4.4\n');
  await writeFile(`${SEED}/pasta/alpha.txt`, 'alpha\n');
  await writeFile(`${SEED}/pasta/beta.txt`, 'beta\n');
  await writeFile(`${SEED}/pasta/sub/deep.txt`, 'deep\n');
  await writeFile(`${SEED}/renomeavel.txt`, 'renomear-eu\n');
  await writeFile(`${SEED}/outra/omega.txt`, 'omega\n');
  await writeFile(`${SEED}/imagem-pixel.png`, PNG_1PX);
}

/** Abre o app, entra na sessão e aciona a aba Files (onde a 4.4 monta a árvore). */
async function openExplorerTab(page: import('@playwright/test').Page) {
  await page.goto(BASE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await page.waitForTimeout(500);
  // fecha a aba Browser do editor se aberta (suprime o painel de detalhes)
  const closeBtn = page.locator('.editor-tab.is-active [aria-label*="close" i], .editor-tab.is-active [aria-label*="Fechar" i]').first();
  if (await closeBtn.count()) await closeBtn.click().catch(() => undefined);
  // abre a barra auxiliar se fechada
  if (!(await page.locator('.auxiliary-bar').count())) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '').toLowerCase().includes('auxiliar'));
      b?.click();
    });
    await page.waitForTimeout(300);
  }
  await page.locator('[id^="aux-tab-"][id$="-files"]').first().click();
  await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
  // expande a pasta-semente para expor os itens dos testes (e seleção fica nela:
  // criar arquivo/pasta cai DENTRO da semente, não na raiz do workspace)
  const view = page.locator('[data-testid="explorer-view"]').first();
  const seedRow = view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
  if (await seedRow.count()) {
    if ((await seedRow.getAttribute('aria-expanded')) !== 'true') await seedRow.click();
    await expect(seedRow).toHaveAttribute('aria-expanded', 'true');
  }
}

test.describe('FATIA-04 · 4.4 — Explorer real na barra auxiliar (dev server fixture)', () => {
  test.beforeAll(seedFixture);

  test('boot: módulo monta com raiz da fixture, header + 5 botões (tooltips 04_01)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await openExplorerTab(page);

    const view = page.locator('[data-testid="explorer-view"]').first();
    // DOM VS Code: a raiz é o pane-header (22px, nome com caixa preservada), não uma linha da árvore.
    const header = view.locator('.pane-header').first();
    await expect(header.locator('h3.title')).toHaveText('explorer-fs-fixture');
    await expect.poll(async () => header.evaluate((el) => el.getBoundingClientRect().height)).toBe(22);
    // 4 ações do header da pasta (aparecem no hover — igual VS Code)
    await header.hover();
    const tooltips = ['New File...', 'New Folder...', 'Refresh Explorer', 'Collapse Folders in Explorer'];
    for (const title of tooltips) {
      await expect(header.locator(`.actions [role="button"][title="${title}"]`), `ação do header com tooltip "${title}"`).toBeVisible();
    }
    // raiz da FIXTURE (discoverRoot do server), não do repo — filhos em aria-level=1
    await expect(view.locator('[role="tree"]')).toContainText('e2e-fixture-root');
    await expect(view.locator('[role="treeitem"][aria-level="1"]', { hasText: 'e2e-fixture-root' })).toHaveCount(1);
    expect(errors, 'zero page errors no boot do módulo').toHaveLength(0);
  });

  test('lazy: expandir pasta chama /fs/list 1× e colapsar/re-expandir NÃO relê (VAL-EXP-01)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const listCalls: string[] = [];
    page.on('request', (r) => {
      const u = r.url();
      if (u.includes('/fs/list') && decodeURIComponent(u).includes('%2Fpasta') === false && u.includes('pasta')) listCalls.push(u);
    });
    const pasta = view.locator('[role="treeitem"]', { hasText: 'pasta' }).first();
    await pasta.click(); // expande
    await expect(pasta).toHaveAttribute('aria-expanded', 'true');
    await expect(view.locator('[role="treeitem"]', { hasText: 'alpha.txt' })).toHaveCount(1);
    expect(listCalls.length, 'expandir "pasta" dispara 1 list').toBe(1);
    await pasta.click(); // colapsa
    await expect(pasta).toHaveAttribute('aria-expanded', 'false');
    await pasta.click(); // re-expande — cache: sem novo list
    await expect(view.locator('[role="treeitem"]', { hasText: 'alpha.txt' })).toHaveCount(1);
    expect(listCalls.length, 're-expansão usa cache (zero list novo)').toBe(1);
  });

  test('linha da árvore = 22 px (04_01/04_15; VAL vs vídeo)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click();
    const anyRow = view.locator('[role="treeitem"]', { hasText: 'alpha.txt' });
    const box = await anyRow.boundingBox();
    expect(box?.height, 'altura da linha do treeitem').toBe(22);
  });

  test('seções: OPEN EDITORS vazio (VAL-EXP-06), TIMELINE e OUTLINE presentes', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    // DOM VS Code: panes empilhados no split-view, colapsados por padrão (header 22px)
    for (const name of ['Open Editors Section', 'Outline Section', 'Timeline Section']) {
      const h = view.locator(`.pane-header[aria-label="${name}"]`);
      await expect(h).toBeVisible();
      await expect(h).toHaveAttribute('aria-expanded', 'false');
      await expect.poll(async () => h.evaluate((el) => el.getBoundingClientRect().height)).toBe(22);
    }
    // Open Editors vazio → lista sem itens
    await view.locator('.pane-header[aria-label="Open Editors Section"]').click();
    await expect(view.locator('[role="list"][aria-label="Open Editors"] [role="listitem"]')).toHaveCount(0);
  });

  test('criar arquivo no header: disco atualiza, nó visível e selecionado; duplicado → erro (VAL-EXP-04)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    // seleção no seed (helper já selecionou/expandiu e2e-fixture-root) → o ghost
    // de criação cai DENTRO do seed; ler o disco depois confirma o path esperado.
    await page.locator('[data-testid="explorer-new-file"]').first().click();
    const input = page.locator('[data-testid="explorer-inline-input"]').first();
    await expect(input).toBeVisible();
    // VS Code: input de criação começa VAZIO (sem placeholder) — renderInputBox
    await expect(input, 'ghost de criação começa VAZIO').toHaveValue('');
    await input.fill('e2e-criado.txt');
    await input.press('Enter');
    // nó aparece SELECIONADO (VAL-EXP-04: seleção acompanha o novo nó)
    await expect(
      view.locator('[role="treeitem"][aria-selected="true"]', { hasText: 'e2e-criado.txt' }),
      'arquivo criado visível E selecionado na árvore',
    ).toHaveCount(1);
    // e existe de verdade no DISCO da fixture
    const content = await readFile(`${SEED}/e2e-criado.txt`, 'utf-8');
    expect(content).toBe('');

    // duplicado → erro visível para o usuário
    await page.locator('[data-testid="explorer-new-file"]').first().click();
    const input2 = page.locator('[data-testid="explorer-inline-input"]').first();
    await expect(input2, 'ghost de criação NOVO com valor limpo (reset entre operações)').toHaveValue('');
    await input2.fill('e2e-criado.txt');
    await input2.press('Enter');
    await expect(view.locator('[role="alert"]').first(), 'erro de duplicado visível').toBeVisible();
  });

  test('renomear com F2: Enter confirma; disco reflete; Escape cancela (VAL-EXP-02)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const oldRow = view.locator('[role="treeitem"]', { hasText: 'renomeavel.txt' });
    await oldRow.click();
    // Escape cancela: nome original intacto
    await view.locator('[role="tree"]').press('F2');
    const input = page.locator('[data-testid="explorer-inline-input"]');
    await input.fill('nao-renomear.txt');
    await input.press('Escape');
    await expect(view.locator('[role="treeitem"]', { hasText: 'renomeavel.txt' })).toHaveCount(1);

    // Enter confirma
    await view.locator('[role="tree"]').press('F2');
    await page.locator('[data-testid="explorer-inline-input"]').fill('ja-renomeei.txt');
    await page.locator('[data-testid="explorer-inline-input"]').press('Enter');
    await expect(view.locator('[role="treeitem"]', { hasText: 'ja-renomeei.txt' })).toHaveCount(1);
    await expect(view.locator('[role="tree"]')).not.toContainText('renomeavel.txt');
    await expect(readFile(`${SEED}/ja-renomeei.txt`, 'utf-8')).resolves.toBe('renomear-eu\n');
  });

  test('clique em arquivo emite fileOpened e Open Editors reage (A2.4 parcial da 4.4)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'seed.txt' }).first().click();
    await view.locator('.pane-header[aria-label="Open Editors Section"]').click();
    const openEditors = view.locator('[role="list"][aria-label="Open Editors"]');
    await expect(openEditors, 'seed.txt listado em Open Editors').toContainText('seed.txt');
    await expect(openEditors.locator('[role="listitem"]')).toHaveCount(1);
  });

  test('BUG-P1: clique em arquivo abre aba do editor COM CONTEUDO REAL (faixa REAL + Monaco)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click();
    await view.locator('[role="treeitem"]', { hasText: 'alpha.txt' }).first().click();

    // aba do editor aberta com o nome do arquivo
    const tab = page.locator('.editor-tab', { hasText: 'alpha.txt' }).first();
    await expect(tab, 'aba alpha.txt aberta no editor').toBeVisible();
    // reveal padrao R-083: o anexo do editor NAO fica oculto
    await expect(page.locator('[data-testid="editor-hidden-content"]'), 'editor revelado (sem estado "Editor oculto")').toHaveCount(0);
    // faixa declara ARQUIVO REAL DO DISCO (mock so como fallback declarado) + badge REAL
    const shell = page.locator('.monaco-editor-shell').filter({ hasText: 'Arquivo real do disco' }).first();
    await expect(shell, 'faixa "Arquivo real do disco" na aba aberta').toBeVisible();
    await expect(shell.getByText('REAL', { exact: true }), 'badge REAL visivel').toBeVisible();
    // conteudo real do disco ("alpha") renderizado no Monaco
    await expect(shell.locator('.view-lines'), 'conteudo real de alpha.txt no Monaco').toContainText('alpha');

    await page.screenshot({ path: '/home/user/4-4-fix-bug-p1-conteudo-real.png' });
  });

  test('BUG-P1 (binarios): clique em PNG abre Image Preview com bytes reais (data:image/png)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'imagem-pixel.png' }).first().click();

    const pane = page.locator('[data-testid="image-preview-pane"]');
    await expect(pane, 'painel Image Preview abre para binario').toBeVisible();
    await expect(pane).toContainText('Image Preview');
    await expect(pane).toContainText('imagem-pixel.png');
    await expect(pane.getByText('REAL', { exact: true }), 'badge REAL no preview').toBeVisible();
    const img = pane.locator('img');
    await expect(img, 'img inline com data URI do servidor').toHaveAttribute('src', /^data:image\/png;base64,/);
    const srcAttr = await img.getAttribute('src');
    expect(srcAttr, 'payload base64 = bytes do fixture no disco').toContain(PNG_1PX.toString('base64'));
    await expect(page.locator('[data-testid="editor-hidden-content"]'), 'editor revelado (R-083)').toHaveCount(0);

    await page.screenshot({ path: '/home/user/4-4-fix-bug-p1-image-preview.png' });
  });

  test('BUG-V1: menu de contexto abre DENTRO da viewport, rotulos integros (clamp)', async ({ page }) => {
    await openExplorerTab(page);
    // VS Code: o "..." pertence ao título do viewlet (shell). O módulo abre menus só via contexto.
    await page.locator('[data-testid="explorer-view"] [role="treeitem"]', { hasText: 'e2e-fixture-root' }).first().click({ button: 'right' });
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await expect(menu, 'menu do botao "..." abre').toBeVisible();
    await page.waitForTimeout(150); // useEffect do clamp mede e reposiciona no mount

    const vw = page.viewportSize()!;
    const box = (await menu.boundingBox())!;
    expect(box, 'bounding box do menu').not.toBeNull();
    expect(box.x, 'menu nao sai pela esquerda').toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, 'menu nao sai pela direita (truncava no painel estreito)').toBeLessThanOrEqual(vw.width);
    expect(box.y + box.height, 'menu nao sai pela base').toBeLessThanOrEqual(vw.height);

    const item = menu.getByRole('menuitem', { name: 'Collapse Folders in Explorer' });
    await expect(item, 'item com rotulo completo presente').toBeVisible();
    const ib = (await item.boundingBox())!;
    expect(ib.x, 'item dentro do menu').toBeGreaterThanOrEqual(box.x - 1);
    expect(ib.x + ib.width, 'rotulo cabe inteiro na viewport').toBeLessThanOrEqual(vw.width);

    await page.screenshot({ path: '/home/user/4-4-fix-bug-v1-menu-clamp.png' });
    // o item continua FUNCIONAL apos o clamp (executa e fecha)
    await item.click();
    await expect(menu, 'menu fecha apos executar o item').toHaveCount(0);
  });

  test('validacao manual: falha de leitura NUNCA mostra mock — abre ERROR EDITOR explicito', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    // No visivel em cache + arquivo apagado no disco SEM refresh (watch do
    // tmpfs e passivo — prova: teste "refresh traz arquivo externo" exige
    // refresh manual). Clicar dispara /fs/read -> 404 -> error editor.
    const target = `${SEED}/seed.txt`;
    await rm(target);
    await page.waitForTimeout(200);
    const row = view.locator('[role="treeitem"]', { hasText: 'seed.txt' });
    await expect(row, 'no de seed.txt ainda visivel no cache da arvore').toHaveCount(1);
    await row.first().click();

    const errPane = page.locator('[data-testid="file-read-error"]');
    await expect(errPane, 'aba de seed.txt abre como ERROR EDITOR (padrao VS Code, nunca mock)').toBeVisible();
    await expect(errPane).toContainText('Não foi possível ler o arquivo');
    await expect(errPane).toContainText('seed.txt');
    // e NADA de Monaco com conteudo sintetico nem estado "indisponivel"
    await expect(page.locator('[data-testid="file-content-unavailable"]'), 'sem estado "indisponivel" (nao e este fluxo)').toHaveCount(0);
    await expect(page.locator('[data-testid="editor-hidden-content"]'), 'editor revelado mesmo na falha (R-083)').toHaveCount(0);
    await expect(page.getByText('agentWindow', { exact: false }), 'zero texto sintetico da era-mock').toHaveCount(0);
  });

  test('validacao manual: aba file SEM dados mostra aviso honesto — zero mock silencioso', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.waitForTimeout(400);
    // Abre aba "Files" sem dados (onNewFile do menu + — supercie demo do shell).
    await page.locator('[aria-label="Adicionar aba do editor"]').first().click();
    await page.getByRole('menuitem', { name: 'Files', exact: true }).first().click();

    const warn = page.locator('[data-testid="file-content-unavailable"]');
    await expect(warn, 'aba sem dados mostra AVISO honesto (nao codigo inventado)').toBeVisible();
    await expect(warn).toContainText('Este arquivo não foi lido do disco');
    // NUNCA o texto sintetico agentWindow da era-mock
    await expect(page.locator('.monaco-editor'), 'sem Monaco sintetico por tras').toHaveCount(0);
    await expect(page.getByText('agentWindow', { exact: false }), 'zero texto sintetico da era-mock na tela').toHaveCount(0);
  });

  test('validacao manual: editor OCULTO persistido — clique faz reveal R-083 com conteudo real (janela estreita)', async ({ page }) => {
    // cenário exato da reclamação: janela de desktop ESTREITA (950px, sem touch)
    // + editorHidden=true persistido de sessão anterior — o clique precisa
    // acordar o anexo do editor sozinho (mesmo padrão do openDiff).
    await page.setViewportSize({ width: 950, height: 760 });
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const key = 'workbench.sessions.layout.v1';
      const raw = localStorage.getItem(key) ?? '{}';
      const state = JSON.parse(raw);
      state.shell = { ...(state.shell ?? {}), editorHidden: true };
      localStorage.setItem(key, JSON.stringify(state));
    });
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.waitForTimeout(500);
    // pré-condição: o editor está REALMENTE oculto (superfície estável de jail)
    const hiddenPane = page.locator('[data-testid="editor-hidden-content"]');
    if (await hiddenPane.count()) await expect(hiddenPane, 'editor começa oculto (pior caso)').toBeVisible();

    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click();
    await view.locator('[role="treeitem"]', { hasText: 'alpha.txt' }).first().click();

    const shell = page.locator('.monaco-editor-shell').filter({ hasText: 'Arquivo real do disco' }).first();
    await expect(shell, 'clique REVELA o editor com conteudo real mesmo oculto/estreito').toBeVisible();
    await expect(shell.locator('.view-lines')).toContainText('alpha');
    await expect(page.locator('[data-testid="editor-hidden-content"]'), 'pos-clique: nada de "Editor oculto"').toHaveCount(0);
  });

  test('collapse-all zera expansões; refresh relê o disco e mostra arquivo externo', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click();
    await view.locator('[role="treeitem"]', { hasText: 'outra' }).first().click();
    await expect(view.locator('[role="treeitem"][aria-expanded="true"]')).toHaveCount(3); // semente (aberta por openExplorerTab) + 2 pastas — a raiz é o pane-header, não linha
    await page.locator('[data-testid="explorer-collapse-all"]').first().click();
    await expect(view.locator('[role="treeitem"][aria-expanded="true"]'), 'collapse-all fecha tudo (inclusive a raiz visível)').toHaveCount(0);

    // arquivo criado FORA do app (direto no disco da fixture)
    await writeFile(`${SEED}/externo-refresh.txt`, 'refresh-me\n');
    await page.locator('[data-testid="explorer-refresh"]').first().click();
    // re-expande a semente (collapse-all a havia fechado; a raiz = pane-header segue expandida) para VER o nó
    const seedRow = view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
    if ((await seedRow.getAttribute('aria-expanded')) !== 'true') await seedRow.click();
    await expect(view.locator('[role="treeitem"]', { hasText: 'externo-refresh.txt' }), 'refresh trouxe o arquivo externo').toHaveCount(1);
  });

  test('menu de contexto do shell: botão direito no arquivo abre menu com Open e executa', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click(); // expande p/ ver alpha
    const row = view.locator('[role="treeitem"]', { hasText: 'alpha.txt' });
    await row.click({ button: 'right' });
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await expect(menu, 'host do menu de contexto do shell aparece').toBeVisible();
    const openItem = menu.getByText('Open', { exact: true });
    await expect(openItem).toBeVisible();
    await openItem.click();
    await expect(menu, 'menu fecha ao executar').toHaveCount(0);
  });

  // ==========================================================================
  // FECHAMENTO 4.4 — GAP 1..4 (04_03 §1/§2/§7, 04_13 VAL-EXP-04/07/08)
  // ==========================================================================

  test('GAP 1 (menu): tabela declarativa em ARQUIVO — grupos/ordem 04_03 §1, sem Paste/Upload; Rename executa (VAL-EXP-08)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click();
    await view.locator('[role="treeitem"]', { hasText: 'alpha.txt' }).click({ button: 'right' });
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await expect(menu).toBeVisible();
    const labels = await menu.locator('[role="menuitem"]').allTextContents();
    // ordem de grupos: navigation ‖ 5_cutcopypaste ‖ 5b_importexport ‖ 7_modification
    const idx = (l: string) => labels.indexOf(l);
    for (const l of ['New File...', 'New Folder...', 'Open', 'Cut', 'Copy', 'Download...', 'Rename...', 'Delete']) {
      expect(labels, `item ${l} presente`).toContain(l);
    }
    expect(labels).not.toContain('Paste');
    expect(labels).not.toContain('Upload...');
    expect(idx('New File...')).toBeLessThan(idx('New Folder...'));
    expect(idx('Open')).toBeLessThan(idx('Cut'));
    expect(idx('Cut')).toBeLessThan(idx('Copy'));
    expect(idx('Copy')).toBeLessThan(idx('Download...'));
    expect(idx('Download...')).toBeLessThan(idx('Rename...'));
    expect(idx('Rename...')).toBeLessThan(idx('Delete'));
    // executa via registry: Rename... abre o input inline com o nome atual
    await menu.getByText('Rename...', { exact: true }).click();
    await expect(menu).toHaveCount(0);
    const input = page.locator('[data-testid="explorer-inline-input"]').first();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('alpha.txt');
    await input.press('Escape');
  });

  test('GAP 1 (menu): PASTA tem Paste DESABILITADO sem clipboard e habilitado após Copy; Paste cola de verdade no disco', async ({ page }) => {
    // arquivo próprio (testes anteriores apagam/renomeiam os da semente)
    await writeFile(`${SEED}/copiavel.txt`, 'COPIA-ME\n');
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    const pastaRow = view.locator('[role="treeitem"]', { hasText: 'pasta' }).first();
    await pastaRow.click({ button: 'right' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: 'Paste' })).toBeDisabled();
    await expect(menu.getByRole('menuitem', { name: 'Upload...' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5); // fecha o menu
    await expect(menu).toHaveCount(0);
    // Copy copiavel.txt via menu
    await view.locator('[role="treeitem"]', { hasText: 'copiavel.txt' }).click({ button: 'right' });
    await menu.getByText('Copy', { exact: true }).click();
    await expect(menu).toHaveCount(0);
    // Paste em "outra" — agora habilitado; disco reflete
    await view.locator('[role="treeitem"]', { hasText: 'outra' }).first().click({ button: 'right' });
    const paste = menu.getByRole('menuitem', { name: 'Paste' });
    await expect(paste).toBeEnabled();
    await paste.click();
    await expect.poll(async () => readFile(`${SEED}/outra/copiavel.txt`, 'utf-8').catch(() => null)).toBe('COPIA-ME\n');
  });

  test('GAP 1 (menu): RAIZ nunca oferece Cut/Rename/Delete (04_03 §2); área vazia → menu da raiz', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    const tree = view.locator('[role="tree"]');
    // área vazia: a árvore é dimensionada ao conteúdo, então o evento é
    // despachado no container (target = tree, não uma linha) — como um clique
    // direito no espaço em branco abaixo das linhas.
    await tree.dispatchEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 300 });
    await expect(menu).toBeVisible();
    const labels = await menu.locator('[role="menuitem"]').allTextContents();
    expect(labels).toContain('New File...');
    expect(labels).toContain('Refresh Explorer');
    expect(labels).not.toContain('Cut');
    expect(labels).not.toContain('Rename...');
    expect(labels).not.toContain('Delete');
    expect(labels).not.toContain('Download...');
  });

  test('GAP 2 (upload DnD do SO): drop recursivo cria pastas-mãe + arquivos no disco; conflito abre ConflictDialog (Replace)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const target = view.locator('[role="treeitem"]', { hasText: 'outra' }).first();
    await target.click(); // expande o alvo — o refresh pós-upload não expande pastas colapsadas
    await expect(target).toHaveAttribute('aria-expanded', 'true');
    // HTML5 DnD não é reproduzível via page.mouse: sintetizamos um DataTransfer
    // com webkitGetAsEntry (pasta) — mesmo caminho de código do drop real.
    const dispatchDrop = async (files: Array<{ path: string; content: string }>) => {
      await target.evaluate((el, files) => {
        type Entry = { isFile: boolean; isDirectory: boolean; name: string; fullPath: string;
          file?: (ok: (f: File) => void, err: (e: unknown) => void) => void;
          createReader?: () => { readEntries: (ok: (e: Entry[]) => void, err: (e: unknown) => void) => void } };
        const mkFile = (name: string, fullPath: string, content: string): Entry => ({
          isFile: true, isDirectory: false, name, fullPath,
          file: (ok) => ok(new File([content], name, { type: 'text/plain' })),
        });
        const mkDir = (name: string, fullPath: string, children: Entry[]): Entry => {
          let drained = false;
          return {
            isFile: false, isDirectory: true, name, fullPath,
            createReader: () => ({ readEntries: (ok) => { if (drained) ok([]); else { drained = true; ok(children); } } }),
          };
        };
        // monta árvore: raiz "up" com filhos (suporta um nível de subpasta)
        const rootChildren: Entry[] = [];
        const dirs = new Map<string, Entry[]>();
        for (const f of files) {
          const parts = f.path.split('/');
          if (parts.length === 1) rootChildren.push(mkFile(parts[0], `/up/${parts[0]}`, f.content));
          else {
            const d = parts[0];
            if (!dirs.has(d)) dirs.set(d, []);
            dirs.get(d)!.push(mkFile(parts[1], `/up/${d}/${parts[1]}`, f.content));
          }
        }
        for (const [d, kids] of dirs) rootChildren.push(mkDir(d, `/up/${d}`, kids));
        const rootEntry = mkDir('up', '/up', rootChildren);
        const items = [{ kind: 'file', type: '', webkitGetAsEntry: () => rootEntry, getAsFile: () => null }];
        const dt = { items, types: ['Files'], files: [], dropEffect: 'none', effectAllowed: 'all', getData: () => '', setData: () => undefined };
        const mk = (type: string) => {
          const ev = new Event(type, { bubbles: true, cancelable: true }) as Event & { dataTransfer?: unknown; clientX?: number; clientY?: number };
          Object.defineProperty(ev, 'dataTransfer', { value: dt });
          return ev;
        };
        el.dispatchEvent(mk('dragenter'));
        el.dispatchEvent(mk('dragover'));
        el.dispatchEvent(mk('drop'));
      }, files);
    };
    await dispatchDrop([
      { path: 'a.txt', content: 'UP-A' },
      { path: 'sub/b.txt', content: 'UP-B' },
    ]);
    await expect.poll(async () => readFile(`${SEED}/outra/up/a.txt`, 'utf-8').catch(() => null), { timeout: 10_000 }).toBe('UP-A');
    await expect.poll(async () => readFile(`${SEED}/outra/up/sub/b.txt`, 'utf-8').catch(() => null), { timeout: 10_000 }).toBe('UP-B');
    // árvore reflete o upload (refresh do alvo)
    await expect(view.locator('[role="treeitem"]', { hasText: 'up' }).first()).toBeVisible();
    // 2º drop com o mesmo nome → ConflictDialog (A4.3); Replace sobrescreve
    await dispatchDrop([{ path: 'a.txt', content: 'UP-A2' }]);
    const dialog = page.locator('[data-testid="explorer-conflict-dialog"]');
    await expect(dialog, 'ConflictDialog aparece no conflito').toBeVisible();
    await page.locator('[data-testid="conflict-replace"]').click();
    await expect.poll(async () => readFile(`${SEED}/outra/up/a.txt`, 'utf-8').catch(() => null), { timeout: 10_000 }).toBe('UP-A2');
  });

  // Headless Chromium expõe showSaveFilePicker mas nunca resolve sem usuário;
  // os E2E cobrem explicitamente o fallback blob+anchor (A4.7) — único caminho
  // observável por page.waitForEvent('download'). O caminho do picker é
  // coberto por transfer.test.ts (save injetado).
  const disablePicker = (page: import('@playwright/test').Page) =>
    page.addInitScript(() => { Object.defineProperty(globalThis, 'showSaveFilePicker', { value: undefined, configurable: true }); });

  test('GAP 3 (download): Download... em ARQUIVO dispara evento download com bytes 1:1 (VAL-EXP-07)', async ({ page }) => {
    await writeFile(`${SEED}/baixavel.txt`, 'BAIXA-ME bytes 1:1 \u00e7\u00e3o\n');
    await disablePicker(page);
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await view.locator('[role="treeitem"]', { hasText: 'baixavel.txt' }).click({ button: 'right' });
    const downloadPromise = page.waitForEvent('download');
    await menu.getByText('Download...', { exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('baixavel.txt');
    const path = await download.path();
    expect(await readFile(path!)).toEqual(await readFile(`${SEED}/baixavel.txt`));
  });

  test('GAP 3 (download): Download... em PASTA gera ZIP STORED válido com caminhos relativos (A4.6)', async ({ page }) => {
    await disablePicker(page);
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click({ button: 'right' });
    const downloadPromise = page.waitForEvent('download');
    await menu.getByText('Download...', { exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('pasta.zip');
    const buf = await readFile((await download.path())!);
    // assinatura local header PK\x03\x04 e EOCD PK\x05\x06
    expect(buf.subarray(0, 4).toString('latin1')).toBe('PK\x03\x04');
    const eocd = buf.lastIndexOf(Buffer.from('PK\x05\x06', 'latin1'));
    expect(eocd).toBeGreaterThan(0);
    const total = buf.readUInt16LE(eocd + 10);
    expect(total).toBeGreaterThanOrEqual(3); // alpha.txt, beta.txt, sub/deep.txt
    const text = buf.toString('latin1');
    expect(text).toContain('alpha.txt');
    expect(text).toContain('sub/deep.txt');
    expect(text).toContain('deep\n'); // STORED: conteúdo legível sem compressão
  });

  test('GAP 4 (VAL-EXP-04): nó criado via MENU (New Folder...) fica selecionado — aria-selected E classe .selected', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await view.locator('[role="treeitem"]', { hasText: 'outra' }).first().click({ button: 'right' });
    await menu.getByText('New Folder...', { exact: true }).click();
    const input = page.locator('[data-testid="explorer-inline-input"]').first();
    await expect(input).toBeVisible();
    await input.fill('nova-pasta-menu');
    await input.press('Enter');
    const row = view.locator('[role="treeitem"]', { hasText: 'nova-pasta-menu' }).first();
    await expect(row).toHaveAttribute('aria-selected', 'true');
    await expect(row).toHaveClass(/\bselected\b/); // classe do monaco-list (VS Code)
    await expect(view.locator('[role="treeitem"][aria-selected="true"]')).toHaveCount(1);
    await expect.poll(async () => (await import('node:fs/promises')).stat(`${SEED}/outra/nova-pasta-menu`).then((s) => s.isDirectory()).catch(() => false)).toBe(true);
  });
});
