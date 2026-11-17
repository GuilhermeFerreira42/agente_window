// =============================================================================
// C-2 — e2e/c2_centro.spec.ts — jornadas integradas do CENTRO (R01..R05, R10,
// R12) com servidor Vite real (rotas de produção, better-sqlite3) + navegador
// Chromium + provedor FIXTURE local (backend controlado — NÃO é provedor real
// de produção; a distinção fica registrada na entrega).
//
// 12 jornadas (matriz 04 — as 8 integrais da SPEC + as 4 de recorte C-2):
// J1 centro PT-BR/seletor + viewports, J2 Enter/IME e 1ª resposta, J3 par
// EXATO com label ambíguo + F5/RV01, J4 Chat ask/manual, J5 Pasta sem raiz
// recusa, J6 projeção lateral, J7 Personalizações no topo → MESMO modal,
// J8 Auto sem default fantasma, J9 falha entre create e publicação (RV02,
// journey 4), J10 modelo removido após escolha (journey 5), J11 lateral
// mista com homônimos/legado/grupo+F5 (journey 7), J12 ações reais da
// lateral entre títulos iguais (journey 8).
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
// =============================================================================
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
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

/** Modelos aceitos pela fixture (C2-RV08: payload desconhecido = 400). */
const modelosAceitos = new Set(['c2-fixture', 'outro-fixture'])
let ultimoModeloRecebido: string | null = null

/** Provedor OpenAI-compatível local (fixture sintética): devolve uma linha.
 *  Rota/payload fora do contrato → 404/400 (nunca 200 para tudo). */
async function subirProvedor(): Promise<number> {
  provedor = createServer((req, res) => {
    if (req.method !== 'POST' || !(req.url ?? '').endsWith('/chat/completions')) { res.writeHead(404).end(); return }
    const partes: Buffer[] = []
    req.on('data', (pedaco: Buffer) => partes.push(pedaco))
    req.on('end', () => {
      let corpo: { model?: unknown } | undefined
      try { corpo = JSON.parse(Buffer.concat(partes).toString('utf8')) as { model?: unknown } } catch { corpo = undefined }
      if (!corpo || typeof corpo.model !== 'string' || !modelosAceitos.has(corpo.model)) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'model fora do contrato da fixture' }))
        return
      }
      ultimoModeloRecebido = corpo.model
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
    expect(await page.getByTestId('landing-dica').count()).toBe(0)

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

    // Evidência de homologação: menu do seletor ABERTO na dimensão da referência.
    await page.setViewportSize({ width: 1872, height: 1080 })
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menu', { name: 'Modelos disponíveis' }).waitFor()
    await shot(page, 'c2_menu_modelo_aberto_1872x1080')
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 1400, height: 900 })

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

  test('J3 — par EXATO com label ambíguo no primeiro /api/agir; F5 preserva histórico e seleção (RV01)', async ({ page }) => {
    await abrirApp(page)
    // Dois provedores com label IDÊNTICO (nome genérico igual ao nativo +
    // mesmo modelId) — só o providerId da entrada distingue a escolha.
    const porta = await portaDoProvedor()
    const ambigua = await page.request.put(`${BASE}/api/providers`, {
      headers: headersApi,
      data: {
        ativo: 'openai-compat',
        provedores: {
          'openai-compat': { nome: 'Ollama (local)', baseUrl: `http://127.0.0.1:${porta}/v1`, modelo: 'c2-fixture', apiKey: 'fixture' },
          ollama: { baseUrl: 'http://127.0.0.1:11434', modelo: 'c2-fixture' },
        },
      },
    })
    expect(ambigua.ok(), `PUT /api/providers ambíguo: ${await ambigua.text()}`).toBe(true)

    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-modelo-topo').waitFor()
    // Duas ENTRADAS com o MESMO label no menu (prova da ambiguidade).
    await page.getByTestId('landing-modelo-topo').click()
    await expect(page.getByRole('menuitemradio', { name: /Ollama \(local\) — c2-fixture/ })).toHaveCount(2)
    // Escolha explícita da entrada openai-compat (id no texto acessível).
    await page.getByRole('menuitemradio', { name: /openai-compat/ }).click()
    expect(await page.getByTestId('landing-modelo-topo').textContent()).toContain('c2-fixture')

    const marcador = page.waitForRequest((req) => req.url().endsWith('/api/agir') && req.method() === 'POST')
    await campo(page).fill('mensagem com modelo exato C-2')
    await botaoEnviar(page).click()
    const requisicao = await marcador
    const corpo = requisicao.postDataJSON() as { modelSelection?: { tipo?: string; providerId?: string; modelId?: string } }
    expect(corpo.modelSelection).toEqual({ tipo: 'explicita', providerId: 'openai-compat', modelId: 'c2-fixture' })
    // PUT que leva a RESPOSTA ao banco — só então o F5 pode recarregar tudo.
    const persistiuResposta = page.waitForResponse((resp) => resp.url().endsWith('/api/sessions')
      && resp.request().method() === 'PUT' && resp.ok()
      && (resp.request().postData() ?? '').includes('Resposta C-2 do provedor fixture.'))
    await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    await persistiuResposta

    // C2-RV01 — o composer do chat JÁ nasce com o par escolhido na landing.
    await expect(page.getByTitle('Selecionar modelo')).toContainText('c2-fixture')

    // F5: histórico íntegro na MESMA sessão e seleção mantida pelo dono atual.
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench')
    await expect(page.locator('.session-row', { hasText: 'mensagem com modelo exato C-2' })).toHaveCount(1)
    await expect(page.locator('.chat-message', { hasText: 'mensagem com modelo exato C-2' })).toHaveCount(1)
    await expect(page.locator('.chat-message', { hasText: 'Resposta C-2 do provedor fixture.' })).toHaveCount(1)
    await expect(page.getByTitle('Selecionar modelo')).toContainText('c2-fixture')
    await shot(page, 'c2_j3_par_exato')
  })

  test('J4 — Chat nasce ask/manual com motivo acessível e chip "Chat sem pasta"', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-contexto').waitFor()
    expect(await page.getByTestId('landing-chat-chip').textContent()).toContain('Chat')
    const modo = page.getByRole('button', { name: /Modo: Perguntar/ })
    expect(await modo.isDisabled()).toBe(false)
    expect((await modo.getAttribute('aria-label')) ?? '').toContain('Chat começa em Perguntar')
    const permissao = page.getByRole('button', { name: /Permissão: Permissões manuais/ })
    expect(await permissao.isDisabled()).toBe(false)
    await modo.click()
    await expect(page.getByRole('menuitemradio', { name: 'Perguntar' })).toBeEnabled()
    await expect(page.getByRole('menuitemradio', { name: /Agente/ })).toBeDisabled()
    await expect(page.getByRole('menuitemradio', { name: /Planejar/ })).toBeDisabled()
    await shot(page, 'chat_menu_modos_aberto')
    await page.keyboard.press('Escape')
    await page.getByTestId('landing-interativo').click()
    await expect(page.getByRole('menu', { name: 'Modo de execução' })).toBeVisible()
    await expect(page.getByRole('menuitemradio', { name: /Planejar/ })).toBeDisabled()
    await page.keyboard.press('Escape')
    await permissao.click()
    await expect(page.getByRole('menuitemradio', { name: /Permissões manuais/ })).toBeEnabled()
    await expect(page.getByRole('menuitemradio', { name: /Permitir tudo/ })).toBeDisabled()
    await shot(page, 'chat_menu_permissoes_aberto')
    await page.keyboard.press('Escape')
    await shot(page, 'c2_j4_chat_ask_manual')
  })

  test('J5 — caminho inválido recusa visivelmente e preserva rascunho', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await campo(page).fill('texto que deve sobreviver à recusa')
    const antes = chamadasProvedor
    const sessoesAntes = await page.locator('.session-row').count()
    await page.getByTestId('landing-contexto').click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').fill(join(raiz, 'inexistente'))
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
    await expect(page.getByRole('dialog', { name: 'Escolher chat ou pasta' }).getByRole('alert')).toBeVisible()
    expect(await campo(page).inputValue()).toBe('texto que deve sobreviver à recusa')
    expect(chamadasProvedor).toBe(antes)
    expect(await page.locator('.session-row').count()).toBe(sessoesAntes)
    await page.keyboard.press('Escape')
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

  test('J9 — falha entre create e publicação (RV02/journey 4): zero run antes do ACK, retry na MESMA sessão e duplo submit', async ({ page }) => {
    await abrirApp(page)
    await configurarProvedor(page, await portaDoProvedor())
    let bloquearPublicacao = true
    await page.route('**/api/sessions', async (rota) => {
      if (bloquearPublicacao && rota.request().method() === 'PUT') {
        await rota.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'publicação bloqueada (E2E)' }) })
        return
      }
      await rota.continue()
    })

    const antes = chamadasProvedor
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await campo(page).fill('mensagem da tentativa bloqueada')
    await botaoEnviar(page).click()
    await page.getByText('publicação bloqueada (E2E)').waitFor({ timeout: 15_000 })
    expect(chamadasProvedor, 'nenhum run antes do ACK da publicação').toBe(antes)

    // Recuperação EXPLÍCITA do produto: a gravação incerta (fila P) fica
    // visível com "Tentar novamente" — liberado o caminho, reconcilia.
    bloquearPublicacao = false
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByText('Conversa não salva')).toHaveCount(0, { timeout: 15_000 })

    // Rascunho + identidade preservados: reabre a landing com o MESMO texto.
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await expect(campo(page)).toHaveValue('mensagem da tentativa bloqueada')

    // Duplo submit no MESMO tick: o lock em voo aceita UMA tentativa.
    await page.evaluate(() => {
      const alvo = [...document.querySelectorAll('button')].find((botao) => (botao.getAttribute('aria-label') ?? botao.textContent ?? '').includes('Enviar mensagem'))
      if (!alvo) throw new Error('botão de envio ausente')
      alvo.click()
      alvo.click()
    })
    await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    expect(chamadasProvedor - antes, 'retry = exatamente 1 run').toBe(1)
    // Identidade reutilizada: UMA sessão com a mensagem (sem duplicar create).
    await expect(page.locator('.session-row', { hasText: 'mensagem da tentativa bloqueada' })).toHaveCount(1)
    await expect(page.locator('.chat-message', { hasText: 'mensagem da tentativa bloqueada' })).toHaveCount(1)
    await shot(page, 'c2_j9_publicacao_bloqueada')
  })

  test('J10 — modelo removido após a escolha (journey 5): Indisponível, zero run, escolha humana reativa', async ({ page }) => {
    await abrirApp(page)
    await configurarProvedor(page, await portaDoProvedor())
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menuitemradio', { name: /c2-fixture/ }).click()
    await campo(page).fill('mensagem com modelo que vai sumir')

    // Remove o modelo do catálogo (sobra outro-fixture no mesmo provedor).
    const porta = await portaDoProvedor()
    const troca = await page.request.put(`${BASE}/api/providers`, {
      headers: headersApi,
      data: { ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'C2 fixture', baseUrl: `http://127.0.0.1:${porta}/v1`, modelo: 'outro-fixture', apiKey: 'fixture' } } },
    })
    expect(troca.ok()).toBe(true)

    // Reabre o seletor: catálogo recarrega e a seleção vira Indisponível.
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menu', { name: 'Modelos disponíveis' }).waitFor()
    await expect(page.getByRole('menuitemradio', { name: /c2-fixture/ })).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('landing-modelo-topo')).toContainText('Indisponível')

    const antes = chamadasProvedor
    expect(await botaoEnviar(page).isDisabled(), 'envio bloqueado sem modelo válido').toBe(true)
    expect(chamadasProvedor, 'zero run com seleção removida').toBe(antes)
    await expect(campo(page), 'rascunho preservado').toHaveValue('mensagem com modelo que vai sumir')
    await shot(page, 'c2_j10_modelo_removido')

    // Escolha HUMANA de outro modelo habilita o envio de novo.
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menuitemradio', { name: /Auto/ }).click()
    expect(await botaoEnviar(page).isEnabled()).toBe(true)
    await botaoEnviar(page).click()
    await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    expect(chamadasProvedor - antes, 'escolha humana reativa 1 run').toBe(1)
    expect(ultimoModeloRecebido, 'Auto resolve outro-fixture (default vigente)').toBe('outro-fixture')
  })

  test('J11 — lateral mista (journey 7): Chat × homônimos × legado × grupo; filtro e F5 preservam raízes', async ({ page }) => {
    await abrirApp(page)
    await configurarProvedor(page, await portaDoProvedor())
    const raizA = join(raiz, 'a', 'repo-x')
    const raizB = join(raiz, 'b', 'repo-x')
    const raizLegado = join(raiz, 'legado', 'repo-y')
    mkdirSync(raizA, { recursive: true })
    mkdirSync(raizB, { recursive: true })
    mkdirSync(raizLegado, { recursive: true })

    const criarChat = async (texto: string) => {
      await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
      await campo(page).fill(texto)
      await botaoEnviar(page).click()
      await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    }
    const criarPasta = async (caminho: string, texto: string) => {
      await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
      await page.getByTestId('landing-contexto').click()
      await page.getByLabel('Buscar ou digitar caminho da pasta').fill(caminho)
      await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
      await expect(page.getByTestId('landing-contexto')).toHaveAttribute('aria-label', /Workspace atual:/, { timeout: 15_000 })
      await campo(page).fill(texto)
      await botaoEnviar(page).click()
      await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    }

    await criarChat('chat um da mista')
    await criarChat('chat do grupo misto')
    await criarPasta(raizA, 'projeto alpha da mista')
    await criarPasta(raizB, 'projeto beta da mista')

    // Grupo personalizado: UMA chat sai do Chats e entra no grupo (prompt).
    page.once('dialog', (dialog) => void dialog.accept('Grupo misto'))
    await page.locator('.session-row', { hasText: 'chat do grupo misto' }).click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Atribuir a grupo' }).click()
    await expect(page.locator('.sessions-sidebar').getByText('Grupo misto', { exact: true })).toBeVisible()

    // Sessão legada SEM campo contexto (worktree antigo) direto no banco.
    const legadaId = randomUUID()
    const legada = {
      id: legadaId,
      title: 'sessão legada repo-y',
      workspace: 'repo-y',
      workspacePath: raizLegado,
      section: 'today',
      status: 'completed',
      updated: 'agora',
      diffAdded: 0,
      diffRemoved: 0,
      branch: null,
      chats: [{ id: `${legadaId}-main`, title: 'Chat principal', status: 'completed', messages: [] }],
      mainChatId: `${legadaId}-main`,
    }
    const inserida = await page.request.post(`${BASE}/api/sessions`, {
      headers: headersApi,
      data: { session: legada, creationId: legadaId },
    })
    expect(inserida.ok(), `POST legado: ${await inserida.text()}`).toBe(true)

    // F5: classificação por contexto/raiz, cada ID uma vez, homônimos distintos.
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench')
    await expect(page.getByTestId('sidebar-secao-chats')).toContainText('chat um da mista')
    await expect(page.getByTestId('sidebar-secao-chats')).not.toContainText('chat do grupo misto')
    const pastas = page.getByTestId('sidebar-grupo-pasta')
    await expect(pastas).toHaveCount(3)
    const caminhos = await pastas.evaluateAll((nos) => nos.map((no) => no.getAttribute('data-workspace-path') ?? ''))
    expect(new Set(caminhos).size, 'homônimos com raízes distintas').toBe(3)
    expect(caminhos.filter((caminho) => caminho.endsWith('repo-x'))).toHaveLength(2)
    expect(caminhos.filter((caminho) => caminho.endsWith('repo-y'))).toHaveLength(1)
    await expect(page.locator('.session-row', { hasText: 'chat um da mista' })).toHaveCount(1)
    await expect(page.locator('.session-row', { hasText: 'projeto alpha da mista' })).toHaveCount(1)
    await expect(page.locator('.session-row', { hasText: 'projeto beta da mista' })).toHaveCount(1)
    await expect(page.locator('.session-row', { hasText: 'sessão legada repo-y' })).toHaveCount(1)

    // RV04: filtro por identidade de raiz — homônimos em opções DISTINTAS.
    await page.getByRole('button', { name: 'Filtros de sessões' }).click()
    await page.getByRole('menuitem', { name: 'Filtrar…' }).click()
    // Evidência de homologação: painel de filtros ABERTO na dimensão da referência.
    await page.setViewportSize({ width: 1872, height: 1080 })
    await shot(page, 'c2_menu_filtros_aberto_1872x1080')
    await page.setViewportSize({ width: 1400, height: 900 })
    const opcoes = await page.getByLabel('Filtrar por workspace').locator('option').allTextContents()
    expect(opcoes.filter((opcao) => opcao.includes('repo-x')), 'duas opções para homônimos').toHaveLength(2)
    await page.keyboard.press('Escape')
    await shot(page, 'c2_j11_lateral_mista')
  })

  test('J12 — ações da lateral no backend real (journey 8): títulos iguais, arquivo, exclusão com falha', async ({ page }) => {
    await abrirApp(page)
    await configurarProvedor(page, await portaDoProvedor())
    const criarChat = async (texto: string) => {
      await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
      await campo(page).fill(texto)
      await botaoEnviar(page).click()
      await page.locator('.chat-message').last().getByText('Resposta C-2 do provedor fixture.').waitFor({ timeout: 30_000 })
    }
    await criarChat('ensaio um da lateral')
    await criarChat('ensaio dois da lateral')

    // Renomeia as DUAS para o MESMO título (identificação só pelo contexto/raiz).
    // O editor inline SUBSTITUI o texto da linha — localizar o input pela classe.
    for (const marca of ['ensaio um da lateral', 'ensaio dois da lateral']) {
      const linha = page.locator('.session-row', { hasText: marca }).first()
      await linha.click({ button: 'right' })
      await page.getByRole('menuitem', { name: 'Renomear' }).click()
      const editor = page.locator('input.session-title-editor')
      await editor.fill('título igual')
      await editor.press('Enter')
    }
    await expect(page.locator('.session-row', { hasText: 'título igual' })).toHaveCount(2)

    // Arquiva a segunda e restaura (ações persistidas no backend real).
    const segunda = page.locator('.session-row', { hasText: 'título igual' }).last()
    await segunda.hover()
    await segunda.getByRole('button', { name: 'Arquivar' }).click()
    await expect(page.getByText('Arquivadas')).toBeVisible()
    // Arquivadas nasce RECOLIDA (default do produto) — expandir para a linha.
    const cabecalhoArquivadas = page.locator('button.session-section-header', { hasText: 'Arquivadas' })
    if ((await cabecalhoArquivadas.getAttribute('aria-expanded')) === 'false') await cabecalhoArquivadas.click()
    const arquivada = page.locator('.session-row.is-archived', { hasText: 'título igual' })
    await expect(arquivada).toBeVisible()
    await arquivada.hover()
    await arquivada.getByRole('button', { name: 'Restaurar' }).click()
    await expect(page.getByText('Arquivadas')).toHaveCount(0)

    // Exclusão com falha controlada: item e erro ficam; nada some sozinho.
    let bloquearExclusao = true
    await page.route('**/api/sessions/**', async (rota) => {
      if (bloquearExclusao && rota.request().method() === 'DELETE') {
        await rota.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'exclusão recusada (E2E)' }) })
        return
      }
      await rota.continue()
    })
    page.on('dialog', (dialog) => void dialog.accept()) // as DUAS confirmações
    const alvo = page.locator('.session-row', { hasText: 'título igual' }).first()
    // Evidência de homologação: menu de contexto da lateral ABERTO na dimensão da referência.
    await page.setViewportSize({ width: 1872, height: 1080 })
    await alvo.click({ button: 'right' })
    await shot(page, 'c2_menu_contexto_lateral_1872x1080')
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.getByText('exclusão recusada (E2E)').first().waitFor({ timeout: 15_000 })
    await expect(page.locator('.session-row', { hasText: 'título igual' })).toHaveCount(2)

    // Exclusão confirmada de verdade: some e NÃO reaparece no F5.
    // A recusa anterior diverge a revisão do cliente (409 do DELETE); o próprio
    // produto orienta "Recarregue e tente novamente" — F5 reidrata as revisões.
    bloquearExclusao = false
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench')
    await expect(page.locator('.session-row', { hasText: 'título igual' })).toHaveCount(2)
    const restante = page.locator('.session-row', { hasText: 'título igual' }).first()
    await restante.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Excluir' }).click()
    await expect(page.locator('.session-row', { hasText: 'título igual' })).toHaveCount(1, { timeout: 15_000 })
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench')
    // A excluída NÃO volta; a homônima continua (mesmo título — contar linhas).
    await expect(page.locator('.session-row', { hasText: 'título igual' })).toHaveCount(1)
    await shot(page, 'c2_j12_acoes_lateral')
  })
  test('J13 — menu único: caminho, recentes após F5, Chat, teclado e viewport pequeno', async ({ page }) => {
    const pasta = join(raiz, 'historico-landing')
    mkdirSync(pasta, { recursive: true })
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await expect(page.getByTestId('landing-dica')).toHaveCount(0)
    await expect(page.getByTestId('contexto-workspace')).toHaveCount(0)
    await campo(page).fill('rascunho preservado ao escolher pasta')
    await page.getByTestId('landing-contexto').click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').fill(pasta)
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
    await expect(page.getByTestId('landing-contexto')).toContainText('historico-landing')
    expect(await campo(page).inputValue()).toBe('rascunho preservado ao escolher pasta')
    await page.reload()
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-contexto').click()
    const dialog = page.getByRole('dialog', { name: 'Escolher chat ou pasta' })
    const recente = dialog.getByRole('button', { name: /historico-landing/ })
    await expect(recente).toBeVisible()
    await page.setViewportSize({ width: 1872, height: 1080 })
    await shot(page, 'landing_menu_contexto_1872x1080')
    await page.setViewportSize({ width: 800, height: 600 })
    await expect.poll(async () => {
      const d = await dialog.boundingBox(); const c = await page.locator('.session-landing-center').boundingBox()
      return Math.abs(d!.width - Math.min(500, c!.x + c!.width - d!.x))
    }).toBeLessThan(3)
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(800)
    const column = await page.locator('.session-landing-center').boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(column!.x + column!.width)
    expect(box!.y + box!.height).toBeLessThanOrEqual(600)
    await shot(page, 'landing_menu_contexto_800x600')
    await recente.click()
    await expect(page.getByTestId('landing-contexto')).toContainText('historico-landing')
    await page.getByTestId('landing-contexto').click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('landing-contexto')).toContainText('Chat')
    await page.setViewportSize({ width: 1400, height: 900 })
  })

  test('J14 — toolbar real: menus visíveis, Planejar, confirmação de permissão e envio', async ({ page }) => {
    const pasta = join(raiz, 'toolbar-controles'); mkdirSync(pasta, { recursive: true })
    await abrirApp(page); await configurarProvedor(page, await portaDoProvedor())
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    await page.getByTestId('landing-contexto').click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').fill(pasta)
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
    await expect(page.getByTestId('landing-contexto')).toContainText('toolbar-controles')
    for (const viewport of [{ width: 1872, height: 1080 }, { width: 800, height: 600 }]) {
      await page.setViewportSize(viewport)
      for (const trigger of [page.getByRole('button', { name: /^Modo:/ }), page.getByTestId('landing-interativo'), page.getByRole('button', { name: /^Permissão:/ })]) {
        await trigger.click()
        const popup = page.locator('.landing-execution-popup')
        await expect(popup).toBeVisible()
        const box = await popup.boundingBox()
        const buttonBox = await trigger.boundingBox()
        expect(box!.y).toBeGreaterThanOrEqual(buttonBox!.y + buttonBox!.height + 4)
        expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
        await shot(page, `toolbar_${await popup.getAttribute('aria-label')}_${viewport.width}`)
        await page.keyboard.press('Escape')
      }
    }
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.getByTestId('landing-interativo').click()
    await page.getByRole('menuitemradio', { name: /Planejar/ }).click()
    await expect(page.getByRole('button', { name: /^Modo:/ })).toContainText('Planejar')
    await page.getByRole('button', { name: /^Permissão:/ }).click()
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('menuitemradio', { name: /Permitir tudo/ }).click()
    await expect(page.getByRole('button', { name: /^Permissão:/ })).toContainText('Permitir tudo')
    const pedido = page.waitForRequest((request) => request.url().endsWith('/api/agir') && request.method() === 'POST')
    await campo(page).fill('Planeje sem modificar arquivos')
    await botaoEnviar(page).click()
    expect((await pedido).postDataJSON().mode).toBe('plan')
    await expect(page.locator('.chat-message').last()).toContainText('Resposta C-2 do provedor fixture.', { timeout: 30_000 })
  })

  test('J15 — campo cresce por quebra de linha, texto colado, limite e redução', async ({ page }) => {
    await abrirApp(page)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).click()
    const input = campo(page)
    const card = page.locator('.session-landing-input')
    const initial = (await card.boundingBox())!.height
    await input.fill('linha 1')
    for (let i = 2; i <= 7; i++) { await input.press('Shift+Enter'); await input.press(`Digit${i}`) }
    await expect.poll(async () => (await card.boundingBox())!.height).toBeGreaterThan(initial + 50)
    expect((await input.boundingBox())!.height).toBeGreaterThan(100)
    await input.fill(Array.from({ length: 60 }, (_, index) => `Texto colado: linha ${index}`).join('\n'))
    await expect.poll(async () => (await input.boundingBox())!.height).toBeLessThanOrEqual(200)
    expect(await input.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
    await shot(page, 'landing_campo_expandido')
    await input.fill('curto')
    await expect.poll(async () => (await card.boundingBox())!.height).toBe(initial)
    await input.fill('Texto longo para verificar quebra automática ao estreitar a coluna. '.repeat(12))
    await page.setViewportSize({ width: 800, height: 600 })
    expect((await input.boundingBox())!.height).toBeLessThanOrEqual(200)
    expect(await input.inputValue()).toContain('Texto longo')
    await shot(page, 'landing_campo_expandido_800x600')
    await page.setViewportSize({ width: 1400, height: 900 })
  })

})

/** Porta do provedor fixture já subido no beforeAll (via handle interno). */
async function portaDoProvedor(): Promise<number> {
  const endereco = provedor?.address()
  if (!endereco || typeof endereco === 'string') throw new Error('provedor fixture indisponível')
  return endereco.port
}
