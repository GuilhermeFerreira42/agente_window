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
/** 4.5 c5: Open Editors vem OCULTA por padrão (VS Code) — liga pelo menu do pane-header (ViewTitleContext). */
async function showOpenEditors(page: import('@playwright/test').Page) {
  const view = page.locator('[data-testid="explorer-view"]').first();
  await view.locator('.pane-header[aria-label="Outline Section"]').click({ button: 'right' });
  const menu = page.getByTestId('explorer-context-menu');
  await menu.locator('[data-menu-item-id="explorer.views.toggle.openEditors"]').click();
  await expect(view.locator('.pane-header[aria-label="Open Editors Section"]')).toBeVisible();
}

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
    await expect(view.locator('.pane-header[aria-label="Open Editors Section"]'), 'c5: Open Editors oculta por padrão').toHaveCount(0);
    await showOpenEditors(page);
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
    await showOpenEditors(page);
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

    const item = menu.getByRole('menuitem', { name: 'Copy Relative Path' });
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
    // B3: boot sem abas → abre um Browser para existir a barra de abas com o "+".
    await page.getByRole('button', { name: 'Abrir navegador no editor' }).click();
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
    const labels = await menu.locator('[role="menuitem"] .explorer-context-menu-label').allTextContents();
    // ordem de grupos: navigation ‖ 5_cutcopypaste ‖ 5b_importexport ‖ 7_modification
    const idx = (l: string) => labels.indexOf(l);
    for (const l of ['Open', 'Cut', 'Copy', 'Download...', 'Copy Path', 'Copy Relative Path', 'Rename...', 'Delete Permanently']) {
      expect(labels, `item ${l} presente`).toContain(l);
    }
    // c4 (upstream ExplorerFolderContext / 04_17 §3.8): ARQUIVO não tem New File/Folder
    expect(labels[0], 'menu de arquivo começa em Open').toBe('Open');
    expect(labels).not.toContain('New File...');
    expect(labels).not.toContain('New Folder...');
    expect(labels).not.toContain('Paste');
    expect(labels).not.toContain('Upload...');
    expect(idx('Open')).toBeLessThan(idx('Cut'));
    expect(idx('Cut')).toBeLessThan(idx('Copy'));
    expect(idx('Copy')).toBeLessThan(idx('Download...'));
    expect(idx('Download...')).toBeLessThan(idx('Rename...'));
    expect(idx('Rename...')).toBeLessThan(idx('Delete Permanently'));
    // G2: Refresh/Collapse são ações do header, não do nó (04_03 §1)
    expect(labels).not.toContain('Refresh Explorer');
    expect(labels).not.toContain('Collapse Folders in Explorer');
    // executa via registry: Rename... abre o input inline com o nome atual
    await menu.getByText('Rename...', { exact: true }).click();
    await expect(menu).toHaveCount(0);
    const input = page.locator('[data-testid="explorer-inline-input"]').first();
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('alpha.txt');
    await input.press('Escape');
  });

  test('T6 (G2): Copy Path / Copy Relative Path copiam para o clipboard (fileActions.contribution.ts:603/610)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click();
    const row = view.locator('[role="treeitem"]', { hasText: 'alpha.txt' });
    await row.click({ button: 'right' });
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await menu.getByText('Copy Relative Path', { exact: true }).click();
    await expect(menu).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('e2e-fixture-root/pasta/alpha.txt');
    await row.click({ button: 'right' });
    await menu.getByText('Copy Path', { exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${SEED}/pasta/alpha.txt`);
  });

  test('T9 (seções auxiliares): clique no header expande/recolhe com corpo VISÍVEL (>0px); "X" do Open Editors aparece no hover e fecha', async ({ page }) => {
    await openExplorerTab(page);
    await showOpenEditors(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const pane = (id: string) => view.locator(`.split-view-view[data-pane="${id}"]`);
    const bodyH = async (id: string) => (await pane(id).locator('.pane-body').boundingBox())?.height ?? 0;
    // Open Editors / Outline / Timeline começam recolhidos (só header 22px)
    for (const id of ['openEditors', 'outline', 'timeline']) {
      await expect(pane(id).locator('.pane-header')).toHaveAttribute('aria-expanded', 'false');
      expect((await pane(id).boundingBox())!.height).toBeCloseTo(22, 0);
    }
    // expandir Outline → header aria-expanded=true e corpo com altura real (mensagem visível)
    await pane('outline').locator('.pane-header').click();
    await expect(pane('outline').locator('.pane-header')).toHaveAttribute('aria-expanded', 'true');
    expect(await bodyH('outline')).toBeGreaterThan(10);
    await expect(pane('outline').getByText('No symbols found in document')).toBeVisible();
    // recolher de novo
    await pane('outline').locator('.pane-header').click();
    await expect(pane('outline').locator('.pane-header')).toHaveAttribute('aria-expanded', 'false');
    expect((await pane('outline').boundingBox())!.height).toBeCloseTo(22, 0);
    // Open Editors: abrir arquivo → item aparece; hover mostra "Close Editor"; clique remove
    await writeFile(`${SEED}/t9-open.txt`, 't9\n');
    await page.locator('[data-testid="explorer-refresh"]').click();
    const seedRow = view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
    await expect(seedRow).toBeVisible();
    if ((await seedRow.getAttribute('aria-expanded')) !== 'true') await seedRow.click();
    await view.locator('[role="treeitem"]', { hasText: 't9-open.txt' }).click();
    await pane('openEditors').locator('.pane-header').click();
    const row = pane('openEditors').locator('.monaco-list-row', { hasText: 't9-open.txt' });
    await expect(row).toBeVisible();
    const close = row.locator('[aria-label="Close Editor"]');
    await page.mouse.move(5, 5); // ao expandir, a linha passa a ficar sob o cursor — afasta antes de medir
    await expect(close).toBeHidden();
    await row.hover();
    await expect(close).toBeVisible();
    await close.click();
    await expect(row).toHaveCount(0);
    // header da pasta raiz também recolhe e volta
    await pane('folders').locator('.pane-header').click();
    await expect(pane('folders').locator('.pane-header')).toHaveAttribute('aria-expanded', 'false');
    await expect(view.locator('[role="treeitem"]')).toHaveCount(0);
    await pane('folders').locator('.pane-header').click();
    await expect(view.locator('[role="treeitem"]', { hasText: 't9-open.txt' })).toBeVisible();
  });

  test('T7 (G3): pasta .git existente no disco NÃO aparece na árvore (files.exclude padrão); .gitignore aparece', async ({ page }) => {
    await mkdir(`${SEED}/.git/refs`, { recursive: true });
    await writeFile(`${SEED}/.git/HEAD`, 'ref: refs/heads/main\n');
    await writeFile(`${SEED}/.gitignore`, 'node_modules\n');
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await expect(view.locator('[role="treeitem"]', { hasText: '.gitignore' })).toHaveCount(1);
    await expect(view.locator('[role="treeitem"]', { hasText: /^\.git$/ })).toHaveCount(0);
    await page.locator('[data-testid="explorer-refresh"]').click();
    const seedRow = view.locator('[role="treeitem"]', { hasText: 'e2e-fixture-root' }).first();
    if ((await seedRow.getAttribute('aria-expanded')) !== 'true') await seedRow.click();
    await expect(view.locator('[role="treeitem"]', { hasText: '.gitignore' })).toHaveCount(1);
    await expect(view.locator('[role="treeitem"]', { hasText: /^\.git$/ })).toHaveCount(0);
    await rm(`${SEED}/.git`, { recursive: true, force: true });
    await rm(`${SEED}/.gitignore`, { force: true });
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
    const labels = await menu.locator('[role="menuitem"] .explorer-context-menu-label').allTextContents();
    expect(labels).toContain('New File...');
    expect(labels).toContain('Copy Path'); // G2: raiz tem Copy Path; Refresh/Collapse só no header
    expect(labels).not.toContain('Cut');
    expect(labels).not.toContain('Rename...');
    expect(labels).not.toContain('Delete Permanently');
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

  test('T8 (G1): Download... com 2+ itens selecionados gera UM ÚNICO .zip íntegro (CRC32 STORED válido)', async ({ page }) => {
    await writeFile(`${SEED}/t8-um.txt`, 'um\n');
    await writeFile(`${SEED}/t8-dois.txt`, 'dois\n');
    await disablePicker(page);
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.locator('[data-testid="explorer-context-menu"]');
    await view.locator('[role="treeitem"]', { hasText: 't8-um.txt' }).click();
    await view.locator('[role="treeitem"]', { hasText: 't8-dois.txt' }).click({ modifiers: ['Control'] });
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click({ modifiers: ['Control'] });
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));
    const downloadPromise = page.waitForEvent('download');
    await view.locator('[role="treeitem"]', { hasText: 'pasta' }).first().click({ button: 'right' });
    await menu.getByText('Download...', { exact: true }).click();
    const download = await downloadPromise;
    await page.waitForTimeout(1500);
    expect(downloads, 'exatamente 1 download').toEqual(['e2e-fixture-root.zip']);
    const buf = await readFile((await download.path())!);
    expect(buf.subarray(0, 4).toString('latin1')).toBe('PK\x03\x04');
    const eocd = buf.lastIndexOf(Buffer.from('PK\x05\x06', 'latin1'));
    expect(buf.readUInt16LE(eocd + 10), 'entradas: t8-um.txt, t8-dois.txt, pasta/alpha.txt, pasta/beta.txt, pasta/sub/deep.txt').toBe(5);
    // CRC32 do 1º local header confere com o conteúdo STORED
    const nameLen = buf.readUInt16LE(26); const extraLen = buf.readUInt16LE(28); const size = buf.readUInt32LE(18);
    const name = buf.subarray(30, 30 + nameLen).toString('utf8');
    const data = buf.subarray(30 + nameLen + extraLen, 30 + nameLen + extraLen + size);
    const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    let crc = 0xffffffff; for (const b of data) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8); crc = (crc ^ 0xffffffff) >>> 0;
    expect(crc, `crc32 de ${name}`).toBe(buf.readUInt32LE(14));
    const text = buf.toString('latin1');
    for (const n of ['t8-um.txt', 't8-dois.txt', 'pasta/alpha.txt', 'pasta/sub/deep.txt']) expect(text).toContain(n);
  });

  test('T10 (G4): ícone Seti por extensão — .ts/.md azul, .bat azul, .gitignore cinza-ignore, .json amarelo, .png roxo; .txt default', async ({ page }) => {
    for (const f of ['t10.ts', 't10.md', 't10.bat', 't10.json', 't10.png', 't10.txt', 't10.gitignore']) await writeFile(`${SEED}/${f}`, 'x');
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const color = async (name: string) => view.locator('[role="treeitem"]', { hasText: name }).first().locator('.monaco-icon-label').evaluate((e) => getComputedStyle(e, '::before').color);
    const seti = { blue: 'rgb(81, 154, 186)', yellow: 'rgb(203, 203, 65)', purple: 'rgb(160, 116, 196)', ignore: 'rgb(65, 83, 91)', white: 'rgb(212, 215, 214)' };
    expect(await color('t10.ts'), 'typescript → blue').toBe(seti.blue);
    expect(await color('t10.md'), 'markdown → blue').toBe(seti.blue);
    expect(await color('t10.bat'), 'bat → blue').toBe(seti.blue);
    expect(await color('t10.json'), 'json → yellow').toBe(seti.yellow);
    expect(await color('t10.png'), 'image → purple').toBe(seti.purple);
    expect(await color('t10.gitignore'), 'ignore → grey').toBe(seti.ignore);
    expect(await color('t10.txt'), 'plaintext → default').toBe(seti.white);
    for (const f of ['t10.ts', 't10.md', 't10.bat', 't10.json', 't10.png', 't10.txt', 't10.gitignore']) await rm(`${SEED}/${f}`, { force: true });
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

  test('T11 (4.5 c1): host do menu fiel ao VS Code — separadores por grupo, item 24 px, label 0 26px, min-width 200, radius 8, disabled opacity .4 (04_17 §3.8)', async ({ page }) => {
    await mkdir(`${SEED}/t11-pasta`, { recursive: true });
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    await view.locator('[role="treeitem"]', { hasText: 't11-pasta' }).first().click({ button: 'right' });
    const menu = page.getByTestId('explorer-context-menu');
    await expect(menu).toBeVisible();
    const items = menu.locator('[role="menuitem"]');
    const groups = ['navigation', '5_cutcopypaste', '5b_importexport', '6_copypath', '7_modification'];
    await expect(menu.locator('[role="separator"]'), 'separador entre cada par de grupos consecutivos').toHaveCount(groups.length - 1);
    const m = await menu.evaluate((el) => {
      const cs = getComputedStyle(el);
      const inner = el.querySelector('[role="menu"]') as HTMLElement;
      const it = el.querySelector('[role="menuitem"]') as HTMLElement;
      const dis = el.querySelector('[role="menuitem"][disabled]') as HTMLElement | null;
      return { minWidth: cs.minWidth, width: el.offsetWidth, radius: getComputedStyle(inner).borderRadius, itemH: it.offsetHeight, itemPad: getComputedStyle(it).padding, font: getComputedStyle(it).fontSize, disOpacity: dis ? getComputedStyle(dis).opacity : null, disId: dis?.getAttribute('data-menu-item-id') };
    });
    expect(m.minWidth).toBe('200px');
    expect(m.width).toBeGreaterThanOrEqual(200);
    expect(m.radius).toBe('8px');
    expect(m.itemH).toBe(24);
    expect(m.itemPad).toBe('0px 26px');
    expect(m.font).toBe('13px');
    expect(m.disId, 'Paste desabilitado sem clipboard').toBe('explorer.paste');
    expect(m.disOpacity).toBe('0.4');
    // ordem dos grupos preservada (order global grupo*100+order)
    const ids = await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-menu-item-id')));
    expect(ids).toEqual(['explorer.newFile', 'explorer.newFolder', 'explorer.cut', 'explorer.copy', 'explorer.paste', 'explorer.download', 'explorer.upload', 'explorer.copyPath', 'explorer.copyRelativePath', 'explorer.rename', 'explorer.delete']);
    await page.keyboard.press('Escape').catch(() => {});
  });

  test('T12 (4.5 c2): teclado — Shift+F10 abre no item focado, ↓↓ Enter executa (Cut → Paste habilita), Esc fecha e devolve o foco à árvore; scroll fecha (04_03 §6)', async ({ page }) => {
    await mkdir(`${SEED}/t12-pasta`, { recursive: true });
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const row = view.locator('[role="treeitem"]', { hasText: 't12-pasta' }).first();
    await row.click(); // seleciona + foca o container da lista (monaco-list)
    const menu = page.getByTestId('explorer-context-menu');
    await expect(menu).toHaveCount(0);
    await page.keyboard.press('Shift+F10');
    await expect(menu, 'Shift+F10 abre o menu').toBeVisible();
    // âncora: abaixo da linha focada (listWidget upstream ancora no elemento focado)
    const rowBox = (await row.boundingBox())!;
    const menuBox = (await menu.boundingBox())!;
    expect(menuBox.y).toBeGreaterThanOrEqual(rowBox.y);
    // foco inicial no 1º item habilitado
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-menu-item-id'))).toBe('explorer.newFile');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-menu-item-id'))).toBe('explorer.cut');
    // End/Home/ArrowUp pulam desabilitados (Paste) e circulam
    await page.keyboard.press('End');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-menu-item-id'))).toBe('explorer.delete');
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-menu-item-id'))).toBe('explorer.newFile');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-menu-item-id'))).toBe('explorer.copyRelativePath');
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // executa Cut
    await expect(menu, 'Enter fecha o menu após executar').toHaveCount(0);
    // efeito real do comando: clipboard interno = cut → Paste habilitado ao reabrir
    await page.keyboard.press('Shift+F10');
    await expect(menu).toBeVisible();
    await expect(menu.locator('[data-menu-item-id="explorer.paste"]')).toBeEnabled();
    // Esc fecha e o foco volta ao container da árvore (monaco-list com tabIndex 0)
    await page.keyboard.press('Escape');
    await expect(menu, 'Esc fecha').toHaveCount(0);
    const focusedIsTree = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && !!a.closest('[data-testid="explorer-view"]') && a.getAttribute('role') === 'tree';
    });
    expect(focusedIsTree, 'foco retornou à árvore').toBe(true);
    // scroll (capturado em window) fecha o menu
    await page.keyboard.press('Shift+F10');
    await expect(menu).toBeVisible();
    await page.evaluate(() => { window.dispatchEvent(new Event('scroll')); });
    await expect(menu, 'scroll fecha').toHaveCount(0);
  });

  test('T13 (4.5 c5): menu do pane-header = Hide + toggles ✓ (ViewTitleContext, régua 8080); Folders não some; Timeline some/volta e persiste no reload', async ({ page }) => {
    test.setTimeout(60_000);
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    const menu = page.getByTestId('explorer-context-menu');
    const header = (label: string) => view.locator(`.pane-header[aria-label="${label}"]`);
    // padrão VS Code: Open Editors oculta; Folders/Outline/Timeline visíveis
    await expect(header('Open Editors Section')).toHaveCount(0);
    await expect(header('Outline Section')).toBeVisible();
    await expect(header('Timeline Section')).toBeVisible();
    // botão direito em Outline
    await header('Outline Section').click({ button: 'right' });
    await expect(menu).toBeVisible();
    const rows = await menu.locator('[role="menuitem"], [role="menuitemcheckbox"]').evaluateAll((els) => els.map((e) => ({
      id: e.getAttribute('data-menu-item-id'), label: e.querySelector('.explorer-context-menu-label')?.textContent,
      role: e.getAttribute('role'), checked: e.getAttribute('aria-checked'), disabled: e.hasAttribute('disabled'),
      hasCheckGlyph: !!e.querySelector('.explorer-context-menu-check'),
    })));
    expect(rows.map((r) => r.label)).toEqual(["Hide 'Outline'", 'Open Editors', 'Folders', 'Outline', 'Timeline']);
    expect(rows[0]).toMatchObject({ role: 'menuitem', disabled: false });
    expect(rows[1]).toMatchObject({ role: 'menuitemcheckbox', checked: 'false', disabled: false, hasCheckGlyph: false });
    expect(rows[2]).toMatchObject({ role: 'menuitemcheckbox', checked: 'true', disabled: true, hasCheckGlyph: true });
    expect(rows[3]).toMatchObject({ role: 'menuitemcheckbox', checked: 'true', disabled: false, hasCheckGlyph: true });
    expect(rows[4]).toMatchObject({ role: 'menuitemcheckbox', checked: 'true', disabled: false, hasCheckGlyph: true });
    await expect(menu.locator('[role="separator"]'), '1 separador entre Hide e toggles').toHaveCount(1);
    // desmarcar Timeline → pane some
    await menu.locator('[data-menu-item-id="explorer.views.toggle.timeline"]').click();
    await expect(header('Timeline Section')).toHaveCount(0);
    // persiste no reload
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    if (!(await page.locator('.auxiliary-bar').count())) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '').toLowerCase().includes('auxiliar'));
        b?.click();
      });
    }
    await page.locator('[id^="aux-tab-"][id$="-files"]').first().click();
    await expect(view).toBeVisible();
    await expect(header('Timeline Section'), 'oculto após reload').toHaveCount(0);
    await expect(header('Outline Section')).toBeVisible();
    // header da raiz: Hide 'Folders' desabilitado; religa Timeline por lá
    await view.locator('.pane-header[aria-label^="Explorer Section"]').click({ button: 'right' });
    await expect(menu.locator('[data-menu-item-id="explorer.views.hide.folders"]')).toBeDisabled();
    await menu.locator('[data-menu-item-id="explorer.views.toggle.timeline"]').click();
    await expect(header('Timeline Section')).toBeVisible();
    // Hide 'Outline' pelo próprio header
    await header('Outline Section').click({ button: 'right' });
    await menu.locator('[data-menu-item-id="explorer.views.hide.outline"]').click();
    await expect(header('Outline Section')).toHaveCount(0);
    // 4.4 intacto: colapso da seção Timeline continua funcionando
    await header('Timeline Section').click();
    await expect(header('Timeline Section')).toHaveAttribute('aria-expanded', 'true');
  });
});
