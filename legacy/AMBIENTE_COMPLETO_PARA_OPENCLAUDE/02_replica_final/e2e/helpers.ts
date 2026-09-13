// Helpers para testes E2E — Agents Window réplica
//
// REGRA DA CASA (anti-trapaça): todo teste deste diretório precisa de pelo
// menos um `expect`. Screenshot e console.log NÃO são prova: um teste sem
// assert passa mesmo com a tela em branco. O contrato é verificado
// automaticamente por `src/__tests__/e2eAssertionContract.test.ts`.
import { expect, type Locator, type Page } from '@playwright/test'

/** Porta única de toda a suíte. Nenhuma spec deve hardcodar host/porta. */
export const BASE_URL = 'http://localhost:5173'

export const LAYOUT_KEY = 'workbench.sessions.layout.v1'
export const SESSION_LAYOUTS_KEY = 'workbench.sessions.layouts.v1'

export const SEL = {
  workbench: '.agent-sessions-workbench',
  titlebar: '.titlebar',
  sidebar: '.sessions-sidebar',
  sidebarHandle: '.sidebar-resize-handle',
  surfaceGroup: '.desktop-surface-group',
  chatPane: '.chat-pane',
  editorPane: '.editor-pane',
  editorTabs: '.editor-tabs',
  editorBody: '.editor-body',
  auxiliaryBar: '.auxiliary-bar',
  terminalPanel: '.terminal-panel',
  sessionRow: '.session-row',
  activeRow: '.session-row.is-selected',
  sessionSection: '.session-section-block',
  sectionHeader: '.session-section-header',
  workspaceHeader: '.workspace-section-header',
  nestedChat: '.nested-chat-row',
  contextMenu: '[role="menu"]',
  filterInput: '.sessions-filter input',
} as const

export const BTN = {
  novaSessao: 'Nova sessão',
  toggleSidebar: 'Alternar lista de sessões',
  toggleAux: 'Alternar barra auxiliar',
  toggleTerminal: 'Alternar terminal',
  abrirNavegador: 'Abrir navegador no editor',
  abrirBusca: 'Abrir busca no editor',
  abrirAlteracoes: 'Abrir alterações no editor',
} as const

/** Abre o app do zero, com localStorage limpo e estado determinístico. */
export async function resetApp(page: Page) {
  await page.goto(BASE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector(SEL.workbench, { state: 'visible' })
  // 'attached' e não 'visible': no phone single-pane a lista de sessões é um
  // drawer fechado — as linhas existem no DOM mas não estão na tela.
  await page.waitForSelector(SEL.sessionRow, { state: 'attached' })
  // Deixa o autorun de layout assentar antes de medir qualquer coisa.
  await page.waitForTimeout(400)
}

/** Abre o app preservando o localStorage já existente (para testes de F5). */
export async function openApp(page: Page) {
  await page.goto(BASE_URL)
  await page.waitForSelector(SEL.workbench, { state: 'visible' })
  await page.waitForTimeout(400)
}

export async function shot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: false })
}

/** Largura renderizada (px) de um seletor. Falha se o elemento não existir. */
export async function widthOf(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, `elemento ${selector} deveria estar renderizado`).not.toBeNull()
  return Math.round(box!.width)
}

export async function isRendered(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0
}

export async function readLayoutState(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), LAYOUT_KEY)
}

export async function readSessionLayouts(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SESSION_LAYOUTS_KEY)
}

/** id da sessão ativa (linha com is-active na sidebar). */
export async function activeSessionId(page: Page): Promise<string | null> {
  return page.locator(SEL.activeRow).first().getAttribute('data-session-id')
}

export function sessionRowByTitle(page: Page, title: string): Locator {
  return page.locator(SEL.sessionRow).filter({ hasText: title }).first()
}

/** Clica numa linha de sessão e espera a troca efetiva de sessão ativa. */
export async function selectSession(page: Page, row: Locator) {
  const id = await row.getAttribute('data-session-id')
  await row.click()
  await expect(page.locator(`${SEL.sessionRow}[data-session-id="${id}"]`)).toHaveClass(/is-selected/)
  await page.waitForTimeout(250)
  return id
}

/** Arrasta o sash da sidebar em `delta` px no eixo X. */
export async function dragSidebar(page: Page, delta: number) {
  const handle = page.locator(SEL.sidebarHandle).first()
  const box = await handle.boundingBox()
  expect(box, 'sash da sidebar deveria existir').not.toBeNull()
  const y = box!.y + box!.height / 2
  await page.mouse.move(box!.x + box!.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + delta, y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(350)
}

/** Erros de console capturados durante o teste (para provar "sem crash"). */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}
