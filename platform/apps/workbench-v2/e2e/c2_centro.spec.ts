// =============================================================================
// C-2 — e2e/c2_centro.spec.ts — jornadas integradas do CENTRO (R01..R05, R10,
// R12) com servidor Vite real (rotas de produção, better-sqlite3) + navegador
// Chromium + provedor FIXTURE local (backend controlado — NÃO é provedor real
// de produção; a distinção fica registrada na entrega).
//
// 8 jornadas: (1) centro PT-BR + seletor LLM real, (2) Enter/IME/Shift+Enter e
// 1ª resposta, (3) par exato no /api/agir, (4) Chat ask/manual com motivo,
// (5) Pasta sem raiz recusa preservando o rascunho, (6) projeção lateral da
// sidebar, (7) Personalizações no topo → MESMO modal, (8) novo rascunho volta
// ao Auto (sem default fantasma).
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
// =============================================================================
import { spawn, type ChildProcess } from 'node:child_process'
import { rmSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { shot } from './helpers'

const PORTA = 5212
const BASE = `http://127.0.0.1:${PORTA}`
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test.setTimeout(240_000)
test.describe.configure({ mode: 'serial' })

let processo: ChildProcess | undefined
let raiz: string
let provedor: Server | undefined
let chamadasProvedor = 0
const headersApi = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }

async function iniciarServidor(): Promise<void> {
  processo = spawn(process.execPath, [resolve(app, '../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(PORTA), '--strictPort'], {
    cwd: app,
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'),
      AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'),
      AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'),
      AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'),
      FS_TEST_ROOT: raiz,
    },
  })
  await expect.poll(async () => {
    try { return (await fetch(BASE)).status } catch { return 0 }
  }, { timeout: 30_000 }).toBe(200)
}

async function pararServidor(): Promise<void> {
  if (!processo || processo.exitCode !== null) return
  const terminou = new Promise<void>((resolveExit) => processo!.once('exit', () => resolveExit()))
  processo.kill('SIGKILL')
  await terminou
}

/** Provedor OpenAI-compatível local (fixture sintética): devolve uma linha. */
async function subirProvedor(): Promise<number> {
  provedor = createServer((req, res) => {
    if (req.method !== 'POST') { res.writeHead(404).end(); return }
    const partes: Buffer[] = []
    req.on('data', (pedaco: Buffer) => partes.push(pedaco))
    req.on('end', () => {
      chamadasProvedor += 1
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Resposta C-2 do provedor fixture.' } }] })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    })
  })
  await new Promise<void>((ok) => provedor!.listen(0, '127.0.0.1', ok))
  const endereco = provedor.address()
  if (!endereco || typeof endereco === 'string') throw new Error('provedor fixture indisponível')
  return endereco.port
}

async function configurarProvedor(page: Page, portaProvedor: number): Promise<void> {
  const resposta = await page.request.put(`${BASE}/api/providers`, {
    headers: headersApi,
    data: {
      ativo: 'openai-compat',
      provedores: { 'openai-compat': { nome: 'C2 fixture', baseUrl: `http://127.0.0.1:${portaProvedor}/v1`, modelo: 'c2-fixture', apiKey: 'fixture' } },
    },
  })
  expect(resposta.ok(), 'PUT /api/providers deve aceitar a fixture de teste').toBe(true)
}

/** Abre o app de zero (perfil descartável já garantido pelo spawn). */
async function abrirApp(page: Page): Promise<void> {
  await page.goto(BASE)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
  await page.waitForTimeout(400)
}

const campo = (page: Page) => page.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
const botaoEnviar = (page: Page) => page.getByRole('button', { name: 'Enviar mensagem' })

test.beforeAll(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'c2-e2e-'))
  await iniciarServidor()
  await subirProvedor()
})

test.afterAll(async () => {
  await pararServidor()
  if (provedor) await new Promise<void>((ok) => provedor!.close(() => ok()))
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test.describe('C-2 — centro (servidor real + navegador + backend controlado)', () => {
  test('J1 — centro PT-BR com seletor LLM real na posição do Copilot (sem This Computer)', async ({ page }) => {
    await abrirApp(page)
    await configurarProvedor(page, await portaDoProvedor())
    await page.getByText('O que vamos construir?').waitFor({ state: 'visible' })
    expect(await page.getByText('This Computer').count()).toBe(0)
    expect(await page.getByText('Copilot', { exact: true }).count()).toBe(0)
    expect(await page.getByText('Interativo').count()).toBe(1)
    expect(await page.getByTestId('landing-dica').count()).toBe(1)

    // Seletor REAL: abre, lista o modelo do catálogo fixture e escolhe.
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menu', { name: 'Modelos disponíveis' }).waitFor()
    expect(await page.getByRole('menuitemradio', { name: /Auto/ }).count()).toBe(1)
    expect(await page.getByRole('menuitemradio', { name: /c2-fixture/ }).count()).toBe(1)
    await page.keyboard.press('Escape')


    // Dois viewports exigidos: referência 1872x1080 e adaptado 800x600 —
    // sem overflow horizontal, sem corte dos controles.
    for (const [largura, altura, nome] of [[1872, 1080, 'c2_j1_1872x1080'], [800, 600, 'c2_j1_800x600']] as const) {
      await page.setViewportSize({ width: largura, height: altura })
      const semOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      expect(semOverflow, `${largura}x${altura} sem overflow horizontal`).toBe(true)
      await expect(botaoEnviar(page)).toBeVisible()
      await expect(page.getByText('O que vamos construir?')).toBeVisible()
      await shot(page, nome)
    }
    await page.setViewportSize({ width: 1400, height: 900 })
    await shot(page, 'c2_j1_centro_ptbr')

    // Rascunho sobrevive à abertura de Provedores (mesmo rascunho ao voltar).
    await campo(page).fill('rascunho que precisa sobreviver')
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menuitemradio', { name: /Auto/ }).click()
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menuitem', { name: 'Abrir Provedores' }).click()
    await expect(campo(page)).toHaveValue('rascunho que precisa sobreviver')
    await campo(page).fill('')

  })

  test('J2 — Shift+Enter quebra linha, Enter envia: UMA chamada e a resposta chega', async ({ page }) => {
    await abrirApp(page)
    const antes = chamadasProvedor
    await campo(page).click()
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.type('linha um')
    expect(await campo(page).inputValue()).toContain('\n')
    expect(chamadasProvedor, 'Shift+Enter não pode enviar').toBe(antes)
    // IME/composição nunca envia.
    await page.keyboard.press('Enter') // envio real
    await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    expect(chamadasProvedor - antes, '1º envio = 1 chamada ao provedor').toBe(1)
    await shot(page, 'c2_j2_primeira_resposta')
  })

  test('J3 — par exato do rascunho no primeiro /api/agir (sem fallback Auto)', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-modelo-topo').waitFor()
    // Escolha explícita no seletor da landing (rascunho novo em nova sessão).
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menuitemradio', { name: /c2-fixture/ }).click()
    expect(await page.getByTestId('landing-modelo-topo').textContent()).toContain('c2-fixture')

    const marcador = page.waitForRequest((req) => req.url().endsWith('/api/agir') && req.method() === 'POST')
    await campo(page).fill('mensagem com modelo exato C-2')
    await botaoEnviar(page).click()
    const requisicao = await marcador
    const corpo = requisicao.postDataJSON() as { modelSelection?: { tipo?: string; providerId?: string; modelId?: string } }
    expect(corpo.modelSelection).toEqual({ tipo: 'explicita', providerId: 'openai-compat', modelId: 'c2-fixture' })
    await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    await shot(page, 'c2_j3_par_exato')
  })

  test('J4 — Chat nasce ask/manual com motivo acessível e chip "Chat sem pasta"', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('contexto-chat').waitFor()
    expect(await page.getByTestId('landing-chat-chip').textContent()).toContain('Chat sem pasta')
    const modo = page.getByRole('button', { name: /Modo: Perguntar/ })
    expect(await modo.isDisabled()).toBe(true)
    expect((await modo.getAttribute('aria-label')) ?? '').toContain('Chat começa em Perguntar')
    const permissao = page.getByRole('button', { name: /Permissão: Permissões manuais/ })
    expect(await permissao.isDisabled()).toBe(true)
    await shot(page, 'c2_j4_chat_ask_manual')
  })

  test('J5 — Pasta sem raiz escolhida recusa VISÍVEL e preserva o rascunho', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('contexto-workspace').click()
    await campo(page).fill('texto que deve sobreviver à recusa')
    const antes = chamadasProvedor
    const sessoesAntes = await page.locator('.session-row').count()
    await botaoEnviar(page).click()
    await page.getByText('Escolha uma pasta real do disco para começar uma conversa workspace.').waitFor()
    expect(await campo(page).inputValue()).toBe('texto que deve sobreviver à recusa')
    expect(chamadasProvedor, 'recusa não pode tocar o provedor').toBe(antes)
    expect(await page.locator('.session-row').count(), 'a recusa não cria sessão').toBe(sessoesAntes)
    await shot(page, 'c2_j5_recusa_rascunho')
  })

  test('J6 — sidebar projeta Chats × pastas (R10/R12) com as sessões criadas', async ({ page }) => {
    await abrirApp(page)
    // As duas sessões criadas em J2/J3 estão no banco descartável.
    const chats = page.getByTestId('sidebar-secao-chats')
    await chats.waitFor()
    expect(await chats.count()).toBe(1)
    expect(await chats.textContent()).toContain('linha um')
    expect(await chats.textContent()).toContain('mensagem com modelo exato C-2')
    expect(await page.getByTestId('sidebar-grupo-pasta').count()).toBe(0)
    await shot(page, 'c2_j6_sidebar_chats')
  })

  test('J7 — Personalizações no topo abre o MESMO modal; atalhos da base ausentes', async ({ page }) => {
    await abrirApp(page)
    expect(await page.locator('.personalizations-shortcuts').count()).toBe(0)
    await page.getByTestId('sidebar-personalizacoes').click()
    await page.getByRole('dialog', { name: 'Personalizações do Agent Window' }).waitFor()
    expect(await page.getByRole('dialog', { name: 'Personalizações do Agent Window' }).isVisible()).toBe(true)
    await shot(page, 'c2_j7_personalizacoes_topo')
  })

  test('J8 — novo rascunho volta ao Auto (a escolha anterior não vira default fantasma)', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-modelo-topo').waitFor()
    expect(await page.getByTestId('landing-modelo-topo').textContent()).toContain('Auto')
    expect(await campo(page).inputValue()).toBe('')
    await shot(page, 'c2_j8_auto_default')
  })
})

/** Porta do provedor fixture já subido no beforeAll (via handle interno). */
async function portaDoProvedor(): Promise<number> {
  const endereco = provedor?.address()
  if (!endereco || typeof endereco === 'string') throw new Error('provedor fixture indisponível')
  return endereco.port
}
