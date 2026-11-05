// Validação REAL (ETAPA 4 do protocolo): preview 5174 com workspace real
// /home/user/agente_window — clique em arquivos REAIS e comprovação de conteúdo.
import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:5174';
const b = await chromium.launch();

async function freshPage(viewport) {
  const p = await b.newPage({ viewport });
  await p.goto(BASE);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await p.waitForTimeout(600);
  return p;
}

async function openFilesTab(p) {
  const closeBtn = p.locator('.editor-tab.is-active [aria-label*="close" i], .editor-tab.is-active [aria-label*="Fechar" i]').first();
  if (await closeBtn.count()) await closeBtn.click().catch(() => undefined);
  if (!(await p.locator('.auxiliary-bar').count())) {
    await p.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') || '').toLowerCase().includes('auxiliar'));
      btn?.click();
    });
    await p.waitForTimeout(300);
  }
  await p.locator('[id^="aux-tab-"][id$="-files"]').first().click();
  const view = p.locator('[data-testid="explorer-view"]').first();
  await view.waitFor({ state: 'visible' });
  return view;
}

async function clickRow(view, text, opts = {}) {
  const row = view.locator('[role="treeitem"]', { hasText: text }).first();
  await row.click();
  if (opts.expectExpanded) await row.waitFor({ state: 'attached' });
  return row;
}

// ---- 1) README.md real na raiz do projeto real ----
{
  const p = await freshPage({ width: 1400, height: 900 });
  const view = await openFilesTab(p);
  // root row = agente_window expandida por padrão; clicar README.md
  await clickRow(view, 'README.md');
  const shell = p.locator('.monaco-editor-shell').filter({ hasText: 'Arquivo real do disco' }).first();
  await shell.waitFor({ state: 'visible' });
  const monacoText = await shell.locator('.view-lines').textContent();
  const fs = await import('node:fs/promises');
  const real = await fs.readFile('/home/user/agente_window/README.md', 'utf-8');
  const token = real.split(/\s+/).filter((w) => w.length > 6)[0] ?? 'README';
  console.log('REAL README mock?', /agentWindow/.test(monacoText ?? '') ? 'FAIL-MOCK' : 'sem mock ✓');
  console.log('REAL README token real presente?', (monacoText ?? '').includes(token) ? `sim ✓ ("${token}")` : `NAO — monaco: ${JSON.stringify((monacoText ?? '').slice(0, 80))}`);
  await p.screenshot({ path: '/home/user/4-4-real-readme.png' });
  await p.close();
}

// ---- 2) docs/12-DOCUMENTACAO-VIVA.md (path profundo, conteúdo único) ----
{
  const p = await freshPage({ width: 1400, height: 900 });
  const view = await openFilesTab(p);
  await clickRow(view, 'docs');
  await clickRow(view, '12-DOCUMENTACAO-VIVA.md');
  const shell = p.locator('.monaco-editor-shell').filter({ hasText: 'Arquivo real do disco' }).first();
  await shell.waitFor({ state: 'visible' });
  const monacoText = (await shell.locator('.view-lines').textContent()) ?? '';
  const hit = monacoText.includes('DOCUMENTAÇÃO VIVA');
  console.log('REAL docs/12 marca única presente?', hit ? 'sim ✓' : 'NÃO — REVISAR');
  console.log('REAL docs/12 mock?', /agentWindow/.test(monacoText) ? 'FAIL-MOCK' : 'sem mock ✓');
  await p.screenshot({ path: '/home/user/4-4-real-docs12.png' });
  await p.close();
}

// ---- 3) reveal com editor oculto persistido (cenário da reclamação) ----
{
  const p = await freshPage({ width: 950, height: 760 });
  await p.evaluate(() => {
    const key = 'workbench.sessions.layout.v1';
    const raw = localStorage.getItem(key) ?? '{}';
    const state = JSON.parse(raw);
    state.shell = { ...(state.shell ?? {}), editorHidden: true };
    localStorage.setItem(key, JSON.stringify(state));
  });
  await p.reload();
  await p.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
  await p.waitForTimeout(600);
  const hiddenBefore = await p.locator('[data-testid="editor-hidden-content"]').count();
  console.log('editor começa oculto (pré-condição)?', hiddenBefore > 0 ? 'sim ✓' : 'já visível (ok, segue)');
  const view = await openFilesTab(p);
  await clickRow(view, 'README.md');
  const shell = p.locator('.monaco-editor-shell').filter({ hasText: 'Arquivo real do disco' }).first();
  await shell.waitFor({ state: 'visible' });
  const hiddenAfter = await p.locator('[data-testid="editor-hidden-content"]').count();
  console.log('reveal pós-clique (sem "Editor oculto")?', hiddenAfter === 0 ? 'sim ✓' : 'FAIL — ainda oculto');
  await p.screenshot({ path: '/home/user/4-4-real-reveal.png' });
  await p.close();
}

await b.close();
console.log('VALIDAÇÃO REAL CONCLUÍDA');
