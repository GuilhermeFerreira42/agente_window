import { expect, test, type Page, type APIRequestContext } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { BASE_URL, SEL } from './helpers'

const ROOT_A = '/tmp/explorer-fs-fixture'
const ROOT_B = '/tmp/d98-workspace-b'
const DELETE_FIXTURE = `${ROOT_A}/d98-delete-fixture`
const SESSION_ID = 'reg-d98-workspace-session'
const CHAT_ID = `${SESSION_ID}-main`

const session = {
  id: SESSION_ID,
  title: 'D98 regression fixture',
  workspace: 'explorer-fs-fixture',
  workspacePath: ROOT_A,
  worktreePath: null,
  section: 'today' as const,
  status: 'completed' as const,
  updated: 'agora',
  diffAdded: 0,
  diffRemoved: 0,
  branch: null,
  chats: [{ id: CHAT_ID, title: 'Main', status: 'completed' as const, messages: [] }],
  mainChatId: CHAT_ID,
}

function sameOriginHeaders() {
  return { Origin: BASE_URL, 'Sec-Fetch-Site': 'same-origin' }
}

async function seedSession(request: APIRequestContext) {
  const response = await request.put(`${BASE_URL}/api/sessions`, {
    data: { session },
    headers: sameOriginHeaders(),
  })
  expect(response.status(), 'session fixture uses the real same-origin JSON persistence endpoint').toBe(200)
}

async function cleanSession(request: APIRequestContext) {
  const response = await request.delete(`${BASE_URL}/api/sessions/${SESSION_ID}`, {
    data: {},
    headers: sameOriginHeaders(),
  })
  expect(response.status(), 'cleanup removes only the fixed regression session fixture').toBe(200)
}

async function openApp(page: Page) {
  await page.goto(BASE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector(SEL.workbench, { state: 'visible' })
}

async function openExplorer(page: Page) {
  const view = page.locator('[data-testid="explorer-view"]').first()
  if (!(await view.isVisible().catch(() => false))) {
    await page.locator('[data-testid="activity-bar-item"][data-view-id="explorer"]').click()
  }
  await expect(view).toBeVisible()
  await expect(view.locator('.pane-header h3.title').first()).toBeVisible()
  return view
}

test.describe('REG-01 a REG-06 — regressões pós-D98', () => {
  test.beforeAll(async () => {
    await mkdir(ROOT_A, { recursive: true })
    await mkdir(`${ROOT_B}/only-b`, { recursive: true })
    await writeFile(`${ROOT_B}/b-only.txt`, 'fixture B\n')
    await writeFile(`${ROOT_B}/only-b/nested.txt`, 'nested B\n')
  })

  test.beforeEach(async ({ request }) => {
    await cleanSession(request)
    const response = await request.post(`${BASE_URL}/fs/workspace`, {
      data: { path: ROOT_A },
      headers: sameOriginHeaders(),
    })
    expect(response.status(), 'cada caso começa na raiz A fictícia').toBe(200)
  })

  test.afterEach(async ({ request }) => {
    await cleanSession(request)
    await request.post(`${BASE_URL}/fs/workspace`, { data: { path: ROOT_A }, headers: sameOriginHeaders() }).catch(() => undefined)
  })

  test.afterAll(async () => {
    await rm(DELETE_FIXTURE, { recursive: true, force: true })
    await rm(ROOT_B, { recursive: true, force: true })
  })

  test('REG-01: excluir conversa pelo menu da UI persiste; requisição realmente não autorizada continua 403', async ({ page, request }) => {
    await seedSession(request)
    await openApp(page)
    const row = page.locator(`${SEL.sessionRow}[data-session-id="${SESSION_ID}"]`)
    await expect(row).toBeVisible()

    await row.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await expect(row, 'a conversa legítima deve sair da lista após DELETE same-origin JSON').toHaveCount(0)

    await seedSession(request)
    const unauthorized = await request.delete(`${BASE_URL}/api/sessions/${SESSION_ID}`, {
      data: {},
      headers: { Origin: 'http://attacker.invalid', 'Sec-Fetch-Site': 'cross-site' },
    })
    expect(unauthorized.status(), 'origem alheia continua bloqueada').toBe(403)
    await expect(unauthorized.json()).resolves.toMatchObject({ code: 'local_only' })
  })

  test('REG-02: Explorer remove somente a pasta fictícia selecionada, incluindo conteúdo aninhado', async ({ page }) => {
    await rm(DELETE_FIXTURE, { recursive: true, force: true })
    await mkdir(`${DELETE_FIXTURE}/nested`, { recursive: true })
    await writeFile(`${DELETE_FIXTURE}/nested/marker.txt`, 'fixture only\n')
    await openApp(page)
    const view = await openExplorer(page)
    const row = view.locator('[role="treeitem"]', { hasText: 'd98-delete-fixture' }).first()
    await expect(row).toBeVisible()
    await row.click({ button: 'right' })
    const menu = page.getByTestId('explorer-context-menu')
    await expect(menu.getByRole('menuitem', { name: /Delete Permanently/ })).toBeVisible()
    await menu.getByRole('menuitem', { name: /Delete Permanently/ }).click()
    await expect.poll(() => import('node:fs/promises').then(({ stat }) => stat(DELETE_FIXTURE).then(() => true).catch(() => false))).toBe(false)
    await expect(view.locator('[role="treeitem"]', { hasText: 'd98-delete-fixture' })).toHaveCount(0)
  })

  test('REG-03: clique em Procurar pasta atravessa a fronteira same-origin JSON até a rota nativa', async ({ page, request }) => {
    test.skip(process.platform === 'win32', 'No Windows, validar a janela IFileOpenDialog manualmente; este E2E Linux só verifica a fronteira e o handler do servidor.')
    await seedSession(request)
    await openApp(page)
    await expect(page.locator(SEL.sessionRow).first()).toBeVisible()
    const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/workspaces/pick'))
    await page.getByRole('button', { name: 'Procurar pasta' }).click()
    const response = await responsePromise
    expect(response.status(), 'a fronteira deve aceitar o POST same-origin com JSON antes do limite de plataforma').toBe(500)
    await expect(response.json()).resolves.toMatchObject({
      code: 'session_persistence_error',
      message: 'Native workspace picker is only available on Windows',
    })
  })

  test('REG-04/06: escolher workspace na landing atualiza Explorer imediatamente, sem enviar “Oi”', async ({ page, request }) => {
    await seedSession(request)
    await openApp(page)
    await expect(page.locator(`${SEL.sessionRow}[data-session-id="${SESSION_ID}"]`)).toBeVisible()
    const view = await openExplorer(page)
    await expect(view.locator('.pane-header h3.title').first()).toHaveText('explorer-fs-fixture')

    await page.getByRole('button', { name: /Nova sessão/ }).first().click()
    await expect(page.locator('.session-landing')).toBeVisible()
    const workspaceInput = page.getByRole('combobox', { name: 'Workspace atual' })
    await workspaceInput.fill(ROOT_B)
    await page.getByRole('button', { name: 'Usar esta pasta' }).click()
    await expect(page.getByText(`Workspace selecionado: ${ROOT_B}`)).toBeVisible()

    await expect(view.locator('.pane-header h3.title').first(), 'a raiz nova aparece imediatamente, sem digitar ou enviar “Oi”')
      .toHaveText('d98-workspace-b', { timeout: 10_000 })
    await expect(view.locator('[role="tree"]')).toContainText('b-only.txt')
    await expect(page.locator('.session-landing')).toBeVisible() // prova: nenhum envio de chat ocorreu
  })

  test('REG-05: troca no workspace ativo cria PTY no contexto novo sem derrubar o shell aberto', async ({ page, request }) => {
    await seedSession(request)
    const ptyFrames: Array<Record<string, unknown>> = []
    let ptyConnections = 0
    page.on('websocket', (socket) => {
      if (!socket.url().includes('/pty')) return
      ptyConnections += 1
      socket.on('framesent', (frame) => {
        const raw = typeof frame.payload === 'string' ? frame.payload : frame.payload.toString()
        try {
          const message = JSON.parse(raw) as Record<string, unknown>
          if (message.type === 'open') ptyFrames.push(message)
        } catch { /* non-JSON frame */ }
      })
    })

    await openApp(page)
    await expect(page.locator(`${SEL.sessionRow}[data-session-id="${SESSION_ID}"]`)).toBeVisible()
    const terminalToggle = page.getByRole('button', { name: /Alternar terminal|Toggle Terminal/i }).first()
    await terminalToggle.click()
    const firstTerminal = page.locator('.terminal-container').first()
    await expect(firstTerminal).toHaveAttribute('data-pty-status', 'open', { timeout: 10_000 })
    await expect.poll(() => ptyFrames.some((message) => message.cwd === ROOT_A), { timeout: 10_000 }).toBe(true)
    const connectionsBeforeSwitch = ptyConnections

    const workspaceInput = page.getByRole('combobox', { name: 'Workspace atual' })
    await workspaceInput.fill(ROOT_B)
    await page.getByRole('button', { name: 'Usar esta pasta' }).click()
    await expect(page.getByText(`Workspace alterado para ${ROOT_B}`)).toBeVisible()

    await expect.poll(() => ptyFrames.some((message) => message.cwd === ROOT_B), { timeout: 10_000 })
      .toBe(true) // um terminal novo recebe o workspace selecionado.
    expect(ptyConnections, 'a conexão antiga deve permanecer aberta; não remontar TerminalPanel').toBe(connectionsBeforeSwitch)
    await expect(page.getByTestId('terminal-tabs-sidebar').locator('[draggable="true"]')).toHaveCount(2)
  })

  test('REG-06: contexto pendente sem sessões atualiza Explorer e primeiro PTY antes de qualquer chat', async ({ page }) => {
    const ptyFrames: Array<Record<string, unknown>> = []
    page.on('websocket', (socket) => {
      if (!socket.url().includes('/pty')) return
      socket.on('framesent', (frame) => {
        const raw = typeof frame.payload === 'string' ? frame.payload : frame.payload.toString()
        try {
          const message = JSON.parse(raw) as Record<string, unknown>
          if (message.type === 'open') ptyFrames.push(message)
        } catch { /* non-JSON frame */ }
      })
    })

    await openApp(page)
    await expect(page.locator(SEL.sessionRow)).toHaveCount(0)
    const view = await openExplorer(page)
    await expect(view.locator('.pane-header h3.title').first()).toHaveText('explorer-fs-fixture')
    await page.getByRole('combobox', { name: 'Workspace atual' }).fill(ROOT_B)
    await page.getByRole('button', { name: 'Usar esta pasta' }).click()
    await expect(page.getByText(`Workspace selecionado: ${ROOT_B}`)).toBeVisible()
    await expect(view.locator('.pane-header h3.title').first()).toHaveText('d98-workspace-b', { timeout: 10_000 })
    await expect(view.locator('[role="tree"]')).toContainText('b-only.txt')

    await page.getByRole('button', { name: /Alternar terminal|Toggle Terminal/i }).first().click()
    await expect(page.locator('.terminal-container').first()).toHaveAttribute('data-pty-status', 'open', { timeout: 10_000 })
    await expect.poll(() => ptyFrames.some((message) => message.cwd === ROOT_B), { timeout: 10_000 }).toBe(true)
    await expect(page.locator('.session-landing')).toBeVisible() // sem chat enviado
    await expect(page.locator(SEL.sessionRow)).toHaveCount(0)
  })
})
