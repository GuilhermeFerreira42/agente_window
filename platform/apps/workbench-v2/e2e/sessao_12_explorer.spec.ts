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
    await expect(view.locator('.explorer-header-title')).toHaveText('Explorer');
    const tooltips = ['New File...', 'New Folder...', 'Refresh Explorer', 'Collapse Folders in Explorer', 'More Actions...'];
    for (const title of tooltips) {
      await expect(view.locator(`button[title="${title}"]`), `botão do header com tooltip "${title}"`).toHaveCount(1);
    }
    // raiz da FIXTURE (discoverRoot do server), não do repo
    await expect(view.locator('[role="tree"]')).toContainText('e2e-fixture-root');
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
    await expect(view.locator('.explorer-section-header', { hasText: 'OPEN EDITORS' }).first()).toBeVisible();
    await expect(view.locator('.explorer-section-header', { hasText: 'TIMELINE' })).toBeVisible();
    await expect(view.locator('.explorer-section-header', { hasText: 'OUTLINE' })).toBeVisible();
    await expect(view.getByText('Nenhum editor aberto')).toHaveCount(1);
  });

  test('criar arquivo no header: disco atualiza, nó visível e selecionado; duplicado → erro (VAL-EXP-04)', async ({ page }) => {
    await openExplorerTab(page);
    const view = page.locator('[data-testid="explorer-view"]').first();
    // seleção no seed (helper já selecionou/expandiu e2e-fixture-root) → o ghost
    // de criação cai DENTRO do seed; ler o disco depois confirma o path esperado.
    await page.locator('[data-testid="explorer-new-file"]').first().click();
    const input = page.locator('[data-testid="explorer-inline-input"]').first();
    await expect(input).toBeVisible();
    await expect(input, 'input no ghost de CRIAÇÃO (placeholder arquivo.txt), não em rename').toHaveAttribute('placeholder', 'arquivo.txt');
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
    await expect(input2, 'ghost de criação NOVO com valor limpo (reset entre operações)').toHaveAttribute('placeholder', 'arquivo.txt');
    await expect(input2).toHaveValue('');
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
    const openEditors = view.locator('.explorer-section-header', { hasText: 'OPEN EDITORS' }).locator('..');
    await expect(openEditors, 'seed.txt listado em Open Editors').toContainText('seed.txt');
    await expect(view.getByText('Nenhum editor aberto'), 'estado vazio some ao abrir arquivo').toHaveCount(0);
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

  test('BUG-V1: menu "..." do header abre DENTRO da viewport, rotulos integros (clamp)', async ({ page }) => {
    await openExplorerTab(page);
    await page.locator('[data-testid="explorer-overflow"]').first().click();
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
    await expect(view.locator('[role="treeitem"][aria-expanded="true"]')).toHaveCount(4); // raiz do ws + semente (aberta por openExplorerTab) + 2 pastas
    await page.locator('[data-testid="explorer-collapse-all"]').first().click();
    await expect(view.locator('[role="treeitem"][aria-expanded="true"]'), 'collapse-all fecha tudo (inclusive a raiz visível)').toHaveCount(0);

    // arquivo criado FORA do app (direto no disco da fixture)
    await writeFile(`${SEED}/externo-refresh.txt`, 'refresh-me\n');
    await page.locator('[data-testid="explorer-refresh"]').first().click();
    // re-expande a raiz + semente (collapse-all as havia fechado) para VER o nó
    const root = view.locator('[role="treeitem"]').first();
    if ((await root.getAttribute('aria-expanded')) !== 'true') await root.click();
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
});
