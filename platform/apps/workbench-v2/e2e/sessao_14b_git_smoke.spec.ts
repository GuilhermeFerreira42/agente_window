// ============================================================================
// sessao_14b_git_smoke.spec.ts — 4.7-b SMOKE REAL (sem fixture, sem mock).
//
// Roda contra o servidor padrão (5174) com a RAIZ REAL do repositório (o mesmo
// workspace que o humano vê). Só cliques — nunca o gancho `attach.open`.
// Em cada passo a UI é comparada com `git status --porcelain` lido do disco.
// Se o backend git estiver desconectado, o passo 3 falha na hora (lista vazia
// / `isRepo=false` / erro visível) — nada aqui passa "por acaso".
//
// Efeito colateral controlado: cria e remove `e2e-smoke-<pid>.txt` na raiz.
//   npx playwright test e2e/sessao_14b_git_smoke.spec.ts
// ============================================================================
import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL } from './helpers';

const WS = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'); // raiz do repo (vite.config: ../../.. do workbench-v2)
const NAME = `e2e-smoke-${process.pid}.txt`;
const FILE = join(WS, NAME);
const OUT = process.env.SMOKE_SHOTS_DIR; // opcional: pasta para prints da validação humana
const ATTACH = '.auxiliary-bar .explorer-attach-area';
const git = (...a: string[]) => execFileSync('git', a, { cwd: WS, encoding: 'utf-8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
const porcelainOf = (name: string) => git('status', '--porcelain', '--', name).trim();

async function shot(page: Page, n: string) {
  if (!OUT) return;
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${n}.png`) });
}
const uiRows = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll('.scm-view .monaco-list-row[data-in-group]')]
    .map((r) => `${r.getAttribute('data-in-group')} ${r.getAttribute('data-letter')} ${r.querySelector('.label-name')?.textContent}`));

test.describe('FATIA-04 · 4.7-b — smoke REAL: aba Changes contra o workspace real, só por cliques', () => {
  test.afterEach(() => { if (existsSync(FILE)) unlinkSync(FILE); });

  test('boot → Files (padrão) → header Folders "Open Source Control" → Changes real; arquivo criado no disco aparece sozinho; Stage/Unstage/Discard batem com git status', async ({ page }) => {
    test.setTimeout(120_000);
    expect(git('rev-parse', '--is-inside-work-tree').trim()).toBe('true'); // pré-condição: raiz real é repo

    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible', timeout: 90_000 });
    await page.waitForTimeout(600);
    if (!(await page.locator('.auxiliary-bar').count())) {
      await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '').toLowerCase().includes('auxiliar')); b?.click(); });
      await page.waitForTimeout(300);
    }
    // 1. Transição 4.7-b: com o módulo real de pé, a aba "Changes N" simulada do shell NÃO existe
    //    e a aba Files é a ativa. (Fallback: só sem módulo a maquete voltaria.)
    await expect(page.locator('[id^="aux-tab-"][id$="-changes"]')).toHaveCount(0);
    await expect(page.locator('[id^="aux-tab-"][id$="-files"]').first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-testid="explorer-view"]').first()).toBeVisible();
    await shot(page, '01_boot_files_padrao_sem_mock');

    // 2. Entrada visível: header "Folders" → hover → "Open Source Control" (fidelidade: ações do pane no hover)
    const folders = page.locator('[data-testid="explorer-view"] .pane-header').first();
    await folders.hover();
    const btn = page.locator('[data-testid="explorer-open-changes"]');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('title', 'Open Source Control');
    await shot(page, '02_hover_header_folders_botao_source_control');
    await btn.click();

    // 3. Changes REAL: anexo visível, aba fixa "Changes", provider = nome da raiz real, branch real
    await expect(page.locator(`${ATTACH}[data-visible="true"]`)).toBeVisible();
    await expect(page.locator(`${ATTACH} .scm-view[data-loading="false"]`)).toBeAttached({ timeout: 20_000 });
    await expect(page.locator(`${ATTACH} [data-testid="scm-error"]`)).toHaveCount(0);
    await expect(page.locator(`${ATTACH} [data-testid="scm-provider"] .label-name`)).toHaveText(WS.split('/').pop()!);
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
    if (branch !== 'HEAD') await expect(page.locator(`${ATTACH} [data-testid="scm-provider"] .label-description`)).toHaveText(branch);
    await expect(page.locator(`${ATTACH} .scm-view [data-testid="scm-no-repo"]`)).toHaveCount(0);
    await shot(page, '03_changes_real_aberta');

    // 4. Criar arquivo NO DISCO (equivale ao `echo teste > arquivo` no terminal) → aparece sem refresh
    writeFileSync(FILE, 'teste\n');
    const row = page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="workingTree"]`).filter({ hasText: NAME });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.locator('.monaco-icon-label')).toHaveAttribute('data-letter', 'U');
    expect(porcelainOf(NAME)).toBe(`?? ${NAME}`);
    await shot(page, '04_arquivo_novo_apareceu_sozinho_U');

    // 5. Stage (+) → Staged Changes com A; git diz "A  <nome>"
    await row.hover();
    await expect(row.locator('[data-testid="scm-action-stage"]')).toBeVisible();
    await shot(page, '05_hover_acoes_inline');
    await row.locator('[data-testid="scm-action-stage"]').click();
    const staged = page.locator(`${ATTACH} .scm-view .monaco-list-row[data-in-group="index"]`).filter({ hasText: NAME });
    await expect(staged).toBeVisible({ timeout: 15_000 });
    await expect(staged.locator('.monaco-icon-label')).toHaveAttribute('data-letter', 'A');
    await expect.poll(() => porcelainOf(NAME)).toBe(`A  ${NAME}`);
    expect(await uiRows(page)).toContain(`index A ${NAME}`);
    await shot(page, '06_apos_stage_A');

    // 6. Unstage (−) → volta para Changes com U; git diz "?? <nome>"
    await staged.hover();
    await staged.locator('[data-testid="scm-action-unstage"]').click();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => porcelainOf(NAME)).toBe(`?? ${NAME}`);
    await shot(page, '07_apos_unstage_U');

    // 7. Discard (↺) → diálogo oficial de untracked → Delete File → some da UI E do disco
    await row.hover();
    await row.locator('[data-testid="scm-action-discard"]').click();
    const dlg = page.locator('[data-testid="scm-confirm-dialog"] .monaco-dialog-box');
    await expect(dlg).toBeVisible();
    await expect(dlg.locator('.dialog-message')).toHaveText(`Are you sure you want to DELETE the following untracked file: '${NAME}'?`);
    await expect(dlg.locator('.dialog-buttons .monaco-button')).toHaveText(['Delete File', 'Cancel']);
    await shot(page, '08_dialogo_discard_oficial');
    await dlg.locator('.monaco-button', { hasText: 'Delete File' }).click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });
    await expect.poll(() => existsSync(FILE)).toBe(false);
    expect(porcelainOf(NAME)).toBe('');
    await shot(page, '09_apos_discard_sumiu_ui_e_disco');
  });
});
