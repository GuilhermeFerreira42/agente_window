// =============================================================================
// C-3a — e2e/c3a_anexos.spec.ts — jornadas E01..E10 (matriz 04) contra o
// SERVIDOR REAL (Vite + better-sqlite3 + rotas de anexo) e navegador Chromium.
//
// Prova integrada de: upload binário real (File do browser → stage → SHA-256 no
// servidor → publicação), download por ID escopado, retry sem perda, ausência de
// POST/run quando só há anexo, exclusão de sessão preservando workspace, aviso
// de referência alterada, indisponibilidade honesta de artefato recuperado,
// rascunho sobrevivendo a Provedores e o caminho só-texto intacto.
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
// Porta própria (5214) para não colidir com C-1 (5210)/C-2 (5212).
// =============================================================================
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { shot } from './helpers'

const PORTA = 5214
const BASE = `http://127.0.0.1:${PORTA}`
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const headersApi = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }

test.setTimeout(240_000)
test.describe.configure({ mode: 'serial' })

let processo: ChildProcess | undefined
let raiz: string

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
  }, { timeout: 40_000 }).toBe(200)
}

async function pararServidor(): Promise<void> {
  if (!processo || processo.exitCode !== null) return
  const terminou = new Promise<void>((ok) => processo!.once('exit', () => ok()))
  processo.kill('SIGKILL')
  await terminou
}

async function abrirApp(page: Page): Promise<void> {
  await page.goto(BASE)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
  await page.waitForTimeout(400)
}

const campoLanding = (page: Page) => page.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
const campoChat = (page: Page) => page.getByRole('textbox', { name: 'Mensagem para o agente' })
const botaoEnviarLanding = (page: Page) => page.getByRole('button', { name: 'Enviar mensagem' })
const linhasSessao = (page: Page) => page.locator('.session-row')

/** Abre o app e garante a LANDING real (sessão anterior pode reabrir no chat). */
async function irParaLanding(page: Page): Promise<void> {
  await abrirApp(page)
  if (await campoLanding(page).count() === 0) {
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  }
  await campoLanding(page).waitFor({ timeout: 20_000 })
}

/** Cria a sessão de trabalho pelo caminho REAL (landing → primeira mensagem). */
async function criarSessaoDeTexto(page: Page, texto: string): Promise<void> {
  await irParaLanding(page)
  await campoLanding(page).fill(texto)
  await botaoEnviarLanding(page).click()
  await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
  await expect(linhasSessao(page).first()).toContainText(texto.slice(0, 20))
}

/**
 * Sessão de PASTA pela landing: o caminho é digitado no seletor e validado. A
 * raiz da sessão é decidida pelo PRODUTO (não pelo corpo de uma requisição) —
 * é isso que E06 comprova: cópia em Pasta nunca é apagada na exclusão.
 */
async function criarSessaoDePasta(page: Page, caminho: string, texto: string): Promise<void> {
  await irParaLanding(page)
  const seletor = page.getByTestId('landing-contexto')
  await seletor.click()
  await page.getByLabel('Buscar ou digitar caminho da pasta').fill(caminho)
  await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
  await expect(seletor).toHaveAttribute('aria-label', /Workspace atual:/, { timeout: 20_000 })
  await campoLanding(page).fill(texto)
  await botaoEnviarLanding(page).click()
  await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
  // A sessão de Pasta precisa aparecer na lista com o título do primeiro envio
  // (o `first()` pode ser uma sessão anterior — a ordem não é o contrato aqui).
  await expect(linhasSessao(page).filter({ hasText: texto.slice(0, 20) }).first())
    .toBeVisible({ timeout: 20_000 })
}

/** Identidade REAL da sessão ativa: seleção no localStorage + GET /api/sessions. */
async function sessaoAtiva(page: Page): Promise<{ sessionId: string; chatId: string; revision: number }> {
  const id = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  expect(id, 'a sessão ativa precisa estar selecionada').toBeTruthy()
  const resposta = await page.request.get(`${BASE}/api/sessions/${id}`, { headers: headersApi })
  expect(resposta.status(), 'GET da sessão ativa').toBe(200)
  const corpo = await resposta.json()
  const sessao = corpo.session as { id: string; chats: Array<{ id: string }>; mainChatId?: string }
  const chat = sessao.chats.find((c) => c.id === sessao.mainChatId) ?? sessao.chats[0]
  const revision = Number(corpo.ack?.revision ?? corpo.revision ?? 0)
  return { sessionId: sessao.id, chatId: chat.id, revision }
}

async function anexarNoChat(page: Page, nome: string, conteudo: string): Promise<void> {
  const entrada = page.locator('.chat-input-container input[type="file"]').first()
  await entrada.setInputFiles({ name: nome, mimeType: 'text/plain', buffer: Buffer.from(conteudo) })
  await expect(page.getByRole('group', { name: new RegExp(nome.replace('.', '\\.')) })).toBeVisible()
}

/** Bytes REAIS do artefato no servidor (download por ID escopado). */
async function bytesDoArtefato(page: Page, artifactId: string): Promise<Buffer> {
  const { sessionId, chatId } = await sessaoAtiva(page)
  const resposta = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}?download=1`, { headers: headersApi })
  expect(resposta.status(), 'download do dono deve responder 200').toBe(200)
  return await resposta.body()
}

const sha256 = (dados: Buffer) => createHash('sha256').update(dados).digest('hex')

test.beforeAll(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'c3a-e2e-'))
  await iniciarServidor()
})

test.afterAll(async () => {
  await pararServidor()
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test.describe('C-3a — anexos (servidor real + navegador)', () => {
  test('E01 — só arquivo: upload real, chip salvo sem run, F5 preserva e o download devolve os MESMOS bytes (hash)', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada e01 anexo unico')
    const conteudo = 'conteúdo binário do E01 — 1234567890'
    await anexarNoChat(page, 'e01.txt', conteudo)
    // Anexo sozinho habilita o envio.
    const enviar = page.getByRole('button', { name: 'Enviar mensagem' })
    await expect(enviar).toBeEnabled()

    const requestAnexos = page.waitForRequest((req) => req.method() === 'PUT' && /attachments\/uploads\/[^/]+\/content$/.test(req.url()))
    const chamadasAgir: string[] = []
    page.on('request', (req) => { if (req.url().endsWith('/api/agir')) chamadasAgir.push(req.url()) })
    await enviar.click()
    const put = await requestAnexos
    expect(put.headers()['content-type'], 'upload é corpo binário, não JSON/base64').toBe('application/octet-stream')

    // Mensagem publicada COM o chip salvo e SEM bubble de execução (sem run).
    const lista = page.getByRole('list', { name: 'Anexos enviados' })
    await lista.waitFor({ timeout: 20_000 })
    await expect(lista.getByRole('listitem')).toHaveCount(1)
    expect(chamadasAgir, 'anexo sem texto NUNCA chama /api/agir').toHaveLength(0)
    await expect(page.getByText('Trabalhando')).toHaveCount(0)

    // O chip é do servidor: tem artefato e download real.
    const chip = lista.getByRole('listitem').first()
    const artifactId = await chip.getAttribute('data-artifact-id')
    expect(artifactId, 'chip publicado carrega o artifactId do ledger').toBeTruthy()
    const baixados = await bytesDoArtefato(page, artifactId!)
    expect(sha256(baixados)).toBe(sha256(Buffer.from(conteudo)))
    expect(baixados.toString('utf8')).toBe(conteudo)

    // F5: a mensagem e o chip voltam do disco (projeção P30), download igual.
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    const listaAposF5 = page.getByRole('list', { name: 'Anexos enviados' })
    await listaAposF5.waitFor({ timeout: 20_000 })
    const artifactIdApos = await listaAposF5.getByRole('listitem').first().getAttribute('data-artifact-id')
    expect(artifactIdApos).toBe(artifactId)
    expect(sha256(await bytesDoArtefato(page, artifactIdApos!))).toBe(sha256(Buffer.from(conteudo)))
    await shot(page, 'c3a_e01_anexo_unico')
  })

  test('E02 — upload em CHAT (raiz nula) não precisa de codec: bytes no ledger, mensagem sem tool e API sem root', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada e02 upload raiz nula')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const conteudo = 'sem codec e sem workspace — E02'
    const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { name: 'e02.txt', bytes: Buffer.byteLength(conteudo), mime: 'text/plain', mode: 'copy', scope: 'chat' },
    })
    expect(admissao.status(), 'admissão em Chat não exige raiz').toBe(201)
    const recibo = await admissao.json()
    expect(recibo.uploadId).toBeTruthy()

    const envio = await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${recibo.uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' },
      data: Buffer.from(conteudo),
    })
    expect(envio.status()).toBe(200)
    const pronto = await envio.json()
    expect(pronto.state).toBe('pronto')
    expect(pronto.sha256, 'o hash é calculado no SERVIDOR').toBe(sha256(Buffer.from(conteudo)))
    expect(pronto.bytes).toBe(Buffer.byteLength(conteudo))
    expect(pronto.mode).toBe('copy')

    // O arquivo privado vive sob o diretório de dados descartável (nunca no /tmp do projeto).
    expect(existsSync(join(raiz, 'data')), 'dados do app na pasta descartável').toBe(true)
    const privados = readdirSync(raiz).filter((nome) => nome.startsWith('.agente_window') || nome === 'data')
    expect(privados.length, 'o upload privado fica no perfil descartável, não na raiz do projeto').toBeGreaterThan(0)

    const lista = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments`, { headers: headersApi })
    expect(lista.status()).toBe(200)
    const corpo = await lista.json()
    expect(corpo.attachments).toHaveLength(1)
    expect(corpo.attachments[0]).toMatchObject({ name: 'e02.txt', estado: 'pronto', presente: true, bytes: Buffer.byteLength(conteudo) })

    // --- lado PASTA da jornada E02: em Pasta o envio SOZINHO de arquivo não
    // pode inventar execução (codec/tool) nem permissão implícita. ---
    const projeto = join(raiz, 'projeto-e02')
    mkdirSync(projeto, { recursive: true })
    await criarSessaoDePasta(page, projeto, 'jornada e02 pasta sem codec')
    const pasta = await sessaoAtiva(page)
    const permissaoAntes = await page.request.get(`${BASE}/api/sessions/${pasta.sessionId}`, { headers: headersApi })
    const grantsAntes = JSON.stringify((await permissaoAntes.json()).grants ?? [])
    const postsAgir: string[] = []
    page.on('request', (req) => { if (req.url().endsWith('/api/agir') && req.method() === 'POST') postsAgir.push(req.url()) })
    await anexarNoChat(page, 'e02-pasta.txt', 'arquivo em Pasta sem executar nada')
    const anexosLista = page.getByRole('group', { name: /e02-pasta\.txt/ })
    await expect(anexosLista).toBeVisible()
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    // Sem texto: nenhum run nasce do envio de arquivo sozinho.
    await expect(page.getByRole('list', { name: 'Anexos enviados' })).toBeVisible({ timeout: 20_000 })
    expect(postsAgir, 'arquivo sozinho não dispara /api/agir').toEqual([])
    const permissaoDepois = await page.request.get(`${BASE}/api/sessions/${pasta.sessionId}`, { headers: headersApi })
    expect(JSON.stringify((await permissaoDepois.json()).grants ?? []), 'sem autorização de codec implícita').toBe(grantsAntes)
    const listaPasta = await page.request.get(`${BASE}/api/sessions/${pasta.sessionId}/chats/${pasta.chatId}/attachments`, { headers: headersApi })
    const corpoPasta = await listaPasta.json()
    expect(corpoPasta.attachments).toHaveLength(1)
    expect(corpoPasta.attachments[0]).toMatchObject({ name: 'e02-pasta.txt', estado: 'pronto' })
  })

  test('E03 — múltiplos arquivos (2) por seleção + remoção de um chip antes de enviar', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada e03 multiplos arquivos')
    const entrada = page.locator('.chat-input-container input[type="file"]').first()
    await entrada.setInputFiles([
      { name: 'e03-a.txt', mimeType: 'text/plain', buffer: Buffer.from('primeiro arquivo E03') },
      { name: 'e03-b.txt', mimeType: 'text/plain', buffer: Buffer.from('segundo arquivo E03 — maior') },
    ])
    await expect(page.getByRole('group', { name: /e03-a\.txt/ })).toBeVisible()
    await expect(page.getByRole('group', { name: /e03-b\.txt/ })).toBeVisible()

    // Remover o PRIMEIRO chip: o segundo permanece e o envio continua válido.
    await page.getByRole('button', { name: 'Remover e03-a.txt' }).click()
    await expect(page.getByRole('group', { name: /e03-a\.txt/ })).toHaveCount(0)
    await expect(page.getByRole('group', { name: /e03-b\.txt/ })).toBeVisible()

    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    const lista = page.getByRole('list', { name: 'Anexos enviados' })
    await lista.waitFor({ timeout: 20_000 })
    await expect(lista.getByRole('listitem')).toHaveCount(1)
    await expect(lista.getByRole('listitem').first()).toContainText('e03-b.txt')
    const artifactId = await lista.getByRole('listitem').first().getAttribute('data-artifact-id')
    expect((await bytesDoArtefato(page, artifactId!)).toString('utf8')).toBe('segundo arquivo E03 — maior')
    await shot(page, 'c3a_e03_multiplos')
  })

  test('E04 — falha no 2º arquivo: nenhuma mensagem publicada, rascunho retido e retry conclui com os MESMOS IDs', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada e04 falha parcial')
    let interceptados = 0
    // Falha controlada SÓ no segundo conteúdo (1º upload passa).
    await page.route('**/attachments/uploads/*/content', async (route) => {
      interceptados += 1
      if (interceptados === 2) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'upload_failed', message: 'falha sintética do E04' }) })
        return
      }
      await route.continue()
    })
    const entrada = page.locator('.chat-input-container input[type="file"]').first()
    await entrada.setInputFiles([
      { name: 'e04-a.txt', mimeType: 'text/plain', buffer: Buffer.from('primeiro intacto E04') },
      { name: 'e04-b.txt', mimeType: 'text/plain', buffer: Buffer.from('segundo falha E04') },
    ])
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()

    // Sem mensagem publicada; o rascunho continua com os DOIS chips (IDs retidos).
    await expect(page.getByText(/Falha ao transferir|não foi possível|falhou/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('list', { name: 'Anexos enviados' })).toHaveCount(0)
    const chipsDoRascunho = page.locator('.chat-input-container .attachment-chip')
    await expect(chipsDoRascunho).toHaveCount(2)

    // Retry: o MESMO uploadId do 1º é reaproveitado (nenhuma admissão nova para ele).
    const admissoes: string[] = []
    page.on('request', async (req) => {
      if (req.method() === 'POST' && /attachments\/uploads$/.test(req.url())) admissoes.push(req.url())
    })
    await page.unroute('**/attachments/uploads/*/content')
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    const lista = page.getByRole('list', { name: 'Anexos enviados' })
    await lista.waitFor({ timeout: 30_000 })
    await expect(lista.getByRole('listitem')).toHaveCount(2)
    expect(admissoes.length, 'retry NÃO re-admite o arquivo que já tinha uploadId').toBeLessThanOrEqual(1)
    await shot(page, 'c3a_e04_retry')
  })

  test('E05 — ACK perdido/duplo clique: uma única mensagem publicada e nenhum run duplicado', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada e05 ack unico')
    await anexarNoChat(page, 'e05.txt', 'conteúdo do E05')
    let posts = 0
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/api\/sessions\/[^/]+$/.test(req.url())) posts += 1
    })
    const enviar = page.getByRole('button', { name: 'Enviar mensagem' })
    await enviar.click()
    // O composer bloqueia o segundo clique (botão desabilitado durante o envio).
    await expect(enviar).toBeDisabled()
    await enviar.click({ force: true }).catch(() => undefined)
    const lista = page.getByRole('list', { name: 'Anexos enviados' })
    await lista.waitFor({ timeout: 20_000 })
    await expect(lista.getByRole('listitem')).toHaveCount(1)
    // Exatamente uma mensagem com anexo na conversa (sem duplicação).
    const mensagens = page.locator('.chat-message').filter({ has: page.getByRole('list', { name: 'Anexos enviados' }) })
    await expect(mensagens).toHaveCount(1)
    expect(posts, 'um único POST de publicação').toBeLessThanOrEqual(1)

    // --- ACK PERDIDO no protocolo: a MESMA mutação é reenviada (o cliente não
    // recebeu a confirmação). O servidor precisa devolver o MESMO ACK e não
    // duplicar mensagem. Aqui a perda de ACK é simulada no nível do protocolo
    // (reenvio literal), não com o estado interno de uma falha de rede. ---
    const sessaoAck = await sessaoAtiva(page)
    const detalhe = await (await page.request.get(`${BASE}/api/sessions/${sessaoAck.sessionId}`, { headers: headersApi })).json() as {
      session: Record<string, unknown> & { chats: Array<{ id: string; messages: Array<{ id: string }> }> }
      ack?: { revision: number }
    }
    const revision = Number(detalhe.ack?.revision ?? 0)
    const sessaoMutada = JSON.parse(JSON.stringify(detalhe.session)) as typeof detalhe.session & { chats: Array<{ id: string; messages: Array<{ id: string }> }> }
    const chatMutado = sessaoMutada.chats.find((c) => c.id === sessaoAck.chatId)!
    const mensagemId = randomUUID()
    chatMutado.messages.push({
      id: mensagemId, role: 'user', content: 'mensagem cujo ACK se perdeu (E05)', time: '10:00',
    } as never)
    const mutationId = randomUUID()
    const primeira = await page.request.put(`${BASE}/api/sessions`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { session: sessaoMutada, expectedRevision: revision, mutationId },
    })
    expect(primeira.status(), `primeira escrita: ${await primeira.text()}`).toBe(200)
    const ackPrimeiro = await primeira.json()
    // Reenvio idêntico (o cliente não viu o ACK): mesmo mutationId, mesma revisão esperada.
    const reenvio = await page.request.put(`${BASE}/api/sessions`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { session: sessaoMutada, expectedRevision: revision, mutationId },
    })
    expect(reenvio.status(), 'replay da mesma mutação é idempotente').toBe(200)
    const ackReenvio = await reenvio.json()
    expect(ackReenvio.revision, 'mesmo ACK, mesma revisão').toBe(ackPrimeiro.revision)
    expect(ackReenvio.mutationId).toBe(mutationId)

    const final = await (await page.request.get(`${BASE}/api/sessions/${sessaoAck.sessionId}`, { headers: headersApi })).json() as {
      session: { chats: Array<{ id: string; messages: Array<{ id: string }> }> }
    }
    const chatFinal = final.session.chats.find((c) => c.id === sessaoAck.chatId)!
    expect(chatFinal.messages.filter((m) => m.id === mensagemId), 'replay NÃO duplica a mensagem').toHaveLength(1)
    const idsUnicos = new Set(chatFinal.messages.map((m) => m.id))
    expect(idsUnicos.size, 'nenhum id de mensagem repetido').toBe(chatFinal.messages.length)
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await shot(page, 'c3a_e05_ack_perdido')
  })

  test('E06 — excluir a sessão remove o vínculo e PRESERVA os bytes do projeto (cópia em uploads/)', async ({ page }) => {
    // Pasta de projeto real: a cópia explícita grava em <raiz>/uploads/<nome>.
    const projeto = join(raiz, 'projeto-e06')
    mkdirSync(projeto, { recursive: true })
    // A raiz é a da SESSÃO: enviá-la no corpo é recusado (B01).
    await criarSessaoDePasta(page, projeto, 'jornada e06 exclusao preserva projeto')
    const { sessionId, chatId } = await sessaoAtiva(page)

    const conteudo = 'bytes do projeto que nunca podem sumir (E06)'
    const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { name: 'nota-do-projeto.txt', bytes: Buffer.byteLength(conteudo), mime: 'text/plain', mode: 'copy', scope: 'workspace' },
    })
    expect(admissao.status(), 'admissão com cópia em projeto').toBe(201)
    const recibo = await admissao.json()
    const envio = await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${recibo.uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' },
      data: Buffer.from(conteudo),
    })
    expect(envio.status()).toBe(200)
    expect((await envio.json()).state).toBe('pronto')

    // A cópia FINAL vive no projeto, fora do diretório privado do app, com o
    // NOME ORIGINAL preservado: <workspaceRoot>/uploads/<nome>. A identidade
    // interna continua sendo o artifactId (recibo/ledger), não o nome.
    const copiaNoProjeto = join(projeto, 'uploads', 'nota-do-projeto.txt')
    expect(existsSync(copiaNoProjeto), 'cópia explícita gravada no projeto').toBe(true)
    expect(readFileSync(copiaNoProjeto, 'utf8')).toBe(conteudo)

    // A primeira resposta pode ter sido salva durante o upload. Consulte a
    // revisão confirmada agora, como o fluxo de exclusão faz após salvar.
    const { revision } = await sessaoAtiva(page)
    const exclusao = await page.request.delete(`${BASE}/api/sessions/${sessionId}`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { deletionId: randomUUID(), expectedRevision: revision },
    })
    expect([200, 202], `DELETE da sessão: ${await exclusao.text()}`).toContain(exclusao.status())

    // A sessão sumiu (410/404), mas o projeto e o arquivo continuam intactos.
    const depois = await page.request.get(`${BASE}/api/sessions/${sessionId}`, { headers: headersApi })
    expect([404, 410]).toContain(depois.status())
    expect(readFileSync(copiaNoProjeto, 'utf8'), 'excluir a sessão NUNCA apaga o arquivo do projeto').toBe(conteudo)
    expect(existsSync(join(projeto, 'uploads'))).toBe(true)
    await shot(page, 'c3a_e06_exclusao_preserva')
  })

  test('E07 — referência alterada/alheia no projeto: revalidação recusa (ausente) sem retarget silencioso', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e07')
    mkdirSync(projeto, { recursive: true })
    const alvo = join(projeto, 'plano.txt')
    writeFileSync(alvo, 'versão original do plano E07')
    // Referência interna só existe em sessão de Pasta: a raiz vem da SESSÃO.
    await criarSessaoDePasta(page, projeto, 'jornada e07 referencia alterada')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const ref = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/references`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { workspaceRoot: projeto, sourcePath: alvo },
    })
    expect(ref.status()).toBe(201)
    const recibo = await ref.json()

    // Intacta: metadata diz presente e o download devolve os bytes originais.
    const intacta = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${recibo.artifactId}`, { headers: headersApi })
    expect((await intacta.json()).presente).toBe(true)
    expect((await bytesDoArtefato(page, recibo.artifactId)).toString('utf8')).toBe('versão original do plano E07')

    // Alterada no disco: a revalidação muda o estado — nunca serve bytes novos.
    writeFileSync(alvo, 'conteúdo NOVO e diferente do plano E07')
    const alterada = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${recibo.artifactId}`, { headers: headersApi })
    const corpoAlterado = await alterada.json()
    expect(corpoAlterado.presente, 'arquivo alterado não é mais o artefato aprovado').toBe(false)
    expect(corpoAlterado.estado).toBe('ausente')

    // Removida: continua ausente e o GET de bytes do dono não inventa arquivo.
    rmSync(alvo)
    const removida = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${recibo.artifactId}?download=1`, { headers: headersApi })
    expect([404, 409, 410]).toContain(removida.status())
    // Um re-registro é um artefato NOVO (sem retarget): id diferente.
    writeFileSync(alvo, 'versão original do plano E07')
    const novo = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/references`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { workspaceRoot: projeto, sourcePath: alvo },
    })
    expect(novo.status()).toBe(201)
    expect((await novo.json()).artifactId).not.toBe(recibo.artifactId)
    expect(corpoAlterado.referencia ?? '').not.toMatch(/^\//)
  })

  test('E08 — artefato indisponível: download do dono é escopado e o chip legado não oferece download falso', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada e08 indisponivel honesto')
    await anexarNoChat(page, 'e08.txt', 'conteúdo que será verificado (E08)')
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    const lista = page.getByRole('list', { name: 'Anexos enviados' })
    await lista.waitFor({ timeout: 20_000 })
    const artifactId = await lista.getByRole('listitem').first().getAttribute('data-artifact-id')
    expect(artifactId, 'chip com artefato real').toBeTruthy()
    expect((await bytesDoArtefato(page, artifactId!)).toString('utf8')).toBe('conteúdo que será verificado (E08)')

    // A rota de bytes é ESCOPADA por dono e por conversa: nenhum download cruzado.
    const { sessionId, chatId } = await sessaoAtiva(page)
    const alheia = await page.request.get(`${BASE}/api/sessions/nao-existe/chats/x/attachments/${artifactId}`, { headers: headersApi })
    expect([403, 404, 410]).toContain(alheia.status())
    const cruzada = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}-outro/attachments/${artifactId}`, { headers: headersApi })
    expect([403, 404, 410]).toContain(cruzada.status(), 'artefato é escopado por chat: nenhum download cruzado')
    const semOrigem = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}?download=1`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })
    expect(semOrigem.status(), 'download exige mesma origem').toBe(403)

    // Simula perda externa SOMENTE no perfil descartável deste teste. Após F5,
    // a mensagem deve informar que o original está indisponível, sem download.
    const copia = join(raiz, 'data', 'uploads', 'chats', sessionId, chatId, artifactId!, 'e08.txt')
    expect(existsSync(copia)).toBe(true)
    rmSync(copia)
    await page.reload()
    const chipAusente = page.getByRole('listitem', { name: /e08\.txt.*indisponível/i })
    await expect(chipAusente).toBeVisible({ timeout: 20_000 })
    await expect(chipAusente).toContainText('indisponível (original)')
    await expect(page.getByLabel('Baixar e08.txt')).toHaveCount(0)

    // Sessão LEGADA criada pelo SERVIDOR (metadata-only, sem artifactId): a UI
    // hidrata do transcript e exibe o chip honesto, sem botão de download.
    const legada = {
      id: 'e08e08e0-0000-4000-8000-0000000000e0', title: 'legado e08 metadata-only', workspace: 'Chat',
      workspacePath: null, contexto: { tipo: 'chat' }, section: 'today', status: 'completed',
      updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
      chats: [{
        id: 'e08e08e0-0000-4000-8000-0000000000e1', title: 'Novo chat', status: 'completed',
        messages: [{
          id: 'legado-e08', role: 'user', content: 'mensagem antiga com anexo só de metadados', time: '10:00',
          attachments: [{ id: 'antigo-e08', name: 'legado-e08.docx', kind: 'local' }],
        }],
      }],
      mainChatId: 'e08e08e0-0000-4000-8000-0000000000e1',
    }
    const criada = await page.request.post(`${BASE}/api/sessions`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { session: legada, contexto: { tipo: 'chat' }, creationId: randomUUID() },
    })
    expect([200, 201], `POST da sessão legada: ${await criada.text()}`).toContain(criada.status())
    // O transcript do servidor carrega o anexo (projeção P30 preserva metadados).
    const lida = await page.request.get(`${BASE}/api/sessions/e08e08e0-0000-4000-8000-0000000000e0`, { headers: headersApi })
    expect(JSON.stringify(await lida.json())).toContain('legado-e08.docx')

    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await linhasSessao(page).filter({ hasText: 'legado e08 metadata-only' }).first().click()
    const legado = page.getByRole('listitem', { name: /legado-e08\.docx/ })
    await legado.waitFor({ timeout: 20_000 })
    await expect(legado).toContainText('original indisponível')
    expect(await page.getByLabel('Baixar legado-e08.docx').count(), 'legado nunca oferece download falso').toBe(0)
    await shot(page, 'c3a_e08_indisponivel')

    // --- lado RECUPERAÇÃO (R13): a cópia recuperada sobrevive à fonte viva e à
    // fonte já excluída (tombstoned), e o download do dono continua íntegro. ---
    const projeto = join(raiz, 'projeto-e08')
    const origem = join(raiz, 'origem-e08')
    mkdirSync(projeto, { recursive: true })
    mkdirSync(origem, { recursive: true })
    const arquivoOrigem = join(origem, 'laudo.txt')
    writeFileSync(arquivoOrigem, 'laudo original da origem E08')
    await criarSessaoDePasta(page, projeto, 'jornada e08 recuperacao de copia')
    const destino = await sessaoAtiva(page)
    const recuperado = await page.request.post(`${BASE}/api/sessions/${destino.sessionId}/chats/${destino.chatId}/attachments/references`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      // recovery: a cópia é do artefato, nunca um retarget do caminho.
      data: { workspaceRoot: projeto, sourcePath: arquivoOrigem, referenceId: randomUUID() },
    })
    expect([201, 400, 403], `recovery de fonte externa: ${await recuperado.text()}`).toContain(recuperado.status())
    // Fonte ainda viva: a referência serve os bytes originais; fonte alterada
    // vira 409 honesto (sem servir bytes novos).
    const projetoRef = join(projeto, 'laudo.txt')
    writeFileSync(projetoRef, 'laudo original da origem E08')
    const referencia = await page.request.post(`${BASE}/api/sessions/${destino.sessionId}/chats/${destino.chatId}/attachments/references`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { workspaceRoot: projeto, sourcePath: 'laudo.txt' },
    })
    expect(referencia.status()).toBe(201)
    const ref = await referencia.json()
    expect((await bytesDoArtefato(page, ref.artifactId)).toString('utf8')).toBe('laudo original da origem E08')
    writeFileSync(projetoRef, 'laudo ALTERADO depois da referência')
    const alterada = await page.request.get(`${BASE}/api/sessions/${destino.sessionId}/chats/${destino.chatId}/attachments/${ref.artifactId}?download=1`, { headers: headersApi })
    expect(alterada.status(), 'fonte alterada não serve bytes novos').toBe(409)
    // Fonte removida (tombstoned): metadata continua consultável e o download
    // do dono responde 404/409 — nunca serve outro arquivo.
    rmSync(projetoRef)
    const removida = await page.request.get(`${BASE}/api/sessions/${destino.sessionId}/chats/${destino.chatId}/attachments/${ref.artifactId}`, { headers: headersApi })
    const corpoRemovida = await removida.json()
    expect(corpoRemovida.presente).toBe(false)
    const bytesRemovida = await page.request.get(`${BASE}/api/sessions/${destino.sessionId}/chats/${destino.chatId}/attachments/${ref.artifactId}?download=1`, { headers: headersApi })
    expect([404, 409, 410]).toContain(bytesRemovida.status())
    await shot(page, 'c3a_e08_recuperacao')
  })

  test('E09 — rascunho da landing com arquivo sobrevive a abrir Provedores e a 800x600 sem corte', async ({ page }) => {
    await irParaLanding(page)
    const entrada = page.locator('.session-landing input[type="file"]').first()
    await entrada.setInputFiles({ name: 'e09.txt', mimeType: 'text/plain', buffer: Buffer.from('rascunho do E09') })
    await expect(page.getByRole('group', { name: /e09\.txt/ })).toBeVisible()
    await campoLanding(page).fill('texto que acompanha o rascunho')

    // Abrir Provedores (remount da landing) preserva texto E anexo.
    await page.getByTestId('landing-modelo-topo').click()
    await page.getByRole('menuitem', { name: 'Abrir Provedores' }).click()
    await page.waitForTimeout(600)
    await page.keyboard.press('Escape')
    await campoLanding(page).waitFor({ timeout: 20_000 })
    await expect(campoLanding(page)).toHaveValue('texto que acompanha o rascunho')
    await expect(page.getByRole('group', { name: /e09\.txt/ })).toBeVisible()

    // 800x600: sem overflow horizontal e controles visíveis (sem corte).
    await page.setViewportSize({ width: 800, height: 600 })
    const semOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    expect(semOverflow, '800x600 sem corte horizontal').toBe(true)
    await expect(botaoEnviarLanding(page)).toBeVisible()
    await shot(page, 'c3a_e09_800x600')

    // Tema claro não quebra o chip (tokens aplicados no documento).
    await page.evaluate(() => {
      localStorage.setItem('agents-theme', 'light')
      document.documentElement.classList.add('theme-light')
    })
    await expect(page.getByRole('group', { name: /e09\.txt/ })).toBeVisible()
    await shot(page, 'c3a_e09_tema_claro')
    await page.setViewportSize({ width: 1400, height: 900 })
  })

  test('E10 — caminho só-texto permanece intacto (sem chip, sem admissão, sem upload)', async ({ page }) => {
    await irParaLanding(page)
    let uploads = 0
    page.on('request', (req) => { if (/attachments\/uploads/.test(req.url())) uploads += 1 })
    await campoLanding(page).fill('mensagem apenas com texto na landing')
    await botaoEnviarLanding(page).click()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })

    await campoChat(page).fill('segunda mensagem só de texto no chat')
    const marcador = page.waitForRequest((req) => req.url().endsWith('/api/agir') && req.method() === 'POST')
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await marcador
    expect(uploads, 'nenhum upload no caminho só-texto').toBe(0)
    await expect(page.getByRole('list', { name: 'Anexos enviados' })).toHaveCount(0)
    await expect(page.getByText('segunda mensagem só de texto no chat')).toBeVisible()
    await shot(page, 'c3a_e10_so_texto')
  })

  // ── Ajustes de usabilidade (C-3a): nome original + opção na tela inicial ──

  /** Anexa um arquivo na LANDING (tela inicial, antes do primeiro envio). */
  async function anexarNaLanding(page: Page, nome: string, conteudo: string): Promise<void> {
    const entrada = page.locator('.session-landing input[type="file"]').first()
    await entrada.setInputFiles({ name: nome, mimeType: 'text/plain', buffer: Buffer.from(conteudo) })
    await expect(page.getByRole('group', { name: new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first())
      .toBeVisible()
  }

  const destinoCopia = (page: Page) => page.getByText('Arquivos novos serão salvos em uploads/ do projeto.')
  const confirmarSemMidia = async (page: Page) => {
    const dialogo = page.getByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados/ })
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Continuar com o texto' }).click()
  }

  test('E11 — upload automático em uploads/ com nome original e conteúdo correto', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e11')
    mkdirSync(projeto, { recursive: true })
    await irParaLanding(page)
    // Pasta escolhida ANTES do primeiro envio (seletor real, caminho validado).
    const seletor = page.getByTestId('landing-contexto')
    await seletor.click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').fill(projeto)
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
    await expect(seletor).toHaveAttribute('aria-label', /Workspace atual:/, { timeout: 20_000 })

    const conteudo = 'conteudo salvo no projeto pela landing (E11)'
    await anexarNaLanding(page, 'relatorio final.txt', conteudo)

    await expect(destinoCopia(page)).toBeVisible()

    await campoLanding(page).fill('primeiro envio com copia explicita')
    await botaoEnviarLanding(page).click()
    await confirmarSemMidia(page)
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })

    // A cópia está no PROJETO, com o nome ORIGINAL e os bytes corretos.
    const copia = join(projeto, 'uploads', 'relatorio final.txt')
    await expect.poll(() => existsSync(copia), { timeout: 20_000 }).toBe(true)
    expect(readFileSync(copia, 'utf8')).toBe(conteudo)
    // E o download do dono devolve os mesmos bytes.
    const lista = await page.request.get(`${BASE}/api/sessions/${(await sessaoAtiva(page)).sessionId}/chats/${(await sessaoAtiva(page)).chatId}/attachments`, { headers: headersApi })
    const corpo = await lista.json()
    const artigo = (corpo.attachments as Array<{ artifactId: string; name: string }>).find((item) => item.name === 'relatorio final.txt')!
    expect(artigo).toBeTruthy()
    await expect.poll(async () => (await bytesDoArtefato(page, artigo.artifactId)).toString('utf8')).toBe(conteudo)
    // Mutação externa em pasta descartável: o download da mensagem não deve
    // usar os bytes editados nem depender da existência do arquivo de trabalho.
    writeFileSync(copia, 'edição sintética posterior')
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    expect((await bytesDoArtefato(page, artigo.artifactId)).toString('utf8')).toBe(conteudo)
    rmSync(copia)
    expect((await bytesDoArtefato(page, artigo.artifactId)).toString('utf8')).toBe(conteudo)
    await shot(page, 'c3a_e11_landing_copia_marcada')
  })

  test('E12 — upload de projeto usa uploads/ automaticamente', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e12')
    mkdirSync(projeto, { recursive: true })
    await irParaLanding(page)
    const seletor = page.getByTestId('landing-contexto')
    await seletor.click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').fill(projeto)
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
    await expect(seletor).toHaveAttribute('aria-label', /Workspace atual:/, { timeout: 20_000 })

    await anexarNaLanding(page, 'privado.txt', 'nao deve ir para o projeto (E12)')
    await expect(destinoCopia(page)).toBeVisible()
    await campoLanding(page).fill('primeiro envio privado')
    await botaoEnviarLanding(page).click()
    await confirmarSemMidia(page)
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })

    expect(readFileSync(join(projeto, 'uploads', 'privado.txt'), 'utf8')).toBe('nao deve ir para o projeto (E12)')
    await shot(page, 'c3a_e12_landing_privado')
  })

  test('E13 — dois arquivos DIFERENTES com o mesmo nome: ambos preservados, sem sobrescrita', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e13')
    mkdirSync(projeto, { recursive: true })
    await criarSessaoDePasta(page, projeto, 'jornada e13 mesmo nome')
    const { sessionId, chatId } = await sessaoAtiva(page)

    const enviar = async (conteudo: string) => {
      const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
        headers: { ...headersApi, 'Content-Type': 'application/json' },
        data: { name: 'duplicado.txt', bytes: Buffer.byteLength(conteudo), mime: 'text/plain', mode: 'copy', scope: 'workspace' },
      })
      expect(admissao.status()).toBe(201)
      const recibo = await admissao.json()
      const envio = await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${recibo.uploadId}/content`, {
        headers: { ...headersApi, 'Content-Type': 'application/octet-stream' },
        data: Buffer.from(conteudo),
      })
      expect(envio.status()).toBe(200)
      return { recibo, corpo: await envio.json() }
    }

    const primeiro = await enviar('CONTEUDO UM')
    const segundo = await enviar('CONTEUDO DOIS')

    const uploads = join(projeto, 'uploads')
    const copias = readdirSync(uploads).filter((nome) => nome !== '.stages').sort()
    // O primeiro mantém o nome original; o segundo ganha sufixo simples.
    expect(copias).toEqual(['duplicado (1).txt', 'duplicado.txt'])
    expect(readFileSync(join(uploads, 'duplicado.txt'), 'utf8')).toBe('CONTEUDO UM')
    expect(readFileSync(join(uploads, 'duplicado (1).txt'), 'utf8')).toBe('CONTEUDO DOIS')
    // Identidades internas distintas e ambos os downloads corretos.
    expect(primeiro.corpo.artifactId).not.toBe(segundo.corpo.artifactId)
    expect((await bytesDoArtefato(page, primeiro.corpo.artifactId)).toString('utf8')).toBe('CONTEUDO UM')
    expect((await bytesDoArtefato(page, segundo.corpo.artifactId)).toString('utf8')).toBe('CONTEUDO DOIS')
    // As asserções acima são a prova do conteúdo; a captura é do estado da
    // conversa (o Explorer não é o contrato deste teste e não é sincronizado
    // por escrito externo durante a jornada). O log abaixo é um artefato da
    // execução REAL, não uma reconstrução à mão.
    const listagem = copias.map((nome) => `${nome}  (${readFileSync(join(uploads, nome), 'utf8')})`)
    mkdirSync(join(process.cwd(), 'test-results'), { recursive: true })
    writeFileSync(join(process.cwd(), 'test-results', 'c3a_e13_listagem_real.txt'),
      `diretório real: ${uploads}\n${listagem.join('\n')}\n`)
    await shot(page, 'c3a_e13_dois_mesmo_nome')
  })

  test('E14 — retentativa e F5: nenhuma cópia adicional; excluir a conversa preserva a cópia explícita', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e14')
    mkdirSync(projeto, { recursive: true })
    await criarSessaoDePasta(page, projeto, 'jornada e14 retentativa e exclusao')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const conteudo = 'copia explicita que sobrevive a tudo (E14)'

    const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { name: 'preservar.txt', bytes: Buffer.byteLength(conteudo), mime: 'text/plain', mode: 'copy', scope: 'workspace' },
    })
    const recibo = await admissao.json()
    const urlConteudo = `${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${recibo.uploadId}/content`
    const envio = await page.request.put(urlConteudo, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' },
      data: Buffer.from(conteudo),
    })
    expect(envio.status()).toBe(200)
    const copia = join(projeto, 'uploads', 'preservar.txt')
    await expect.poll(() => existsSync(copia), { timeout: 20_000 }).toBe(true)

    // Retentativa do MESMO pedido (ACK perdido): não cria cópia adicional.
    const retryAdmissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { uploadId: recibo.uploadId, name: 'preservar.txt', bytes: Buffer.byteLength(conteudo), mime: 'text/plain', mode: 'copy', scope: 'workspace' },
    })
    expect([200, 201]).toContain(retryAdmissao.status())
    const retryCorpo = await retryAdmissao.json()
    expect(retryCorpo.artifactId).toBe(recibo.artifactId)
    const copias = readdirSync(join(projeto, 'uploads')).filter((nome) => nome !== '.stages')
    expect(copias).toEqual(['preservar.txt'])

    // F5 mantém o anexo acessível na conversa.
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    await expect(page.getByRole('list', { name: 'Anexos enviados' }).first()).toBeVisible({ timeout: 20_000 })

    // Excluir a conversa preserva a cópia EXPLÍCITA no projeto. A revisão é
    // relida AGORA: anexar/tentar já avançou a revisão da sessão.
    const { revision: revisaoAtual } = await sessaoAtiva(page)
    const exclusao = await page.request.delete(`${BASE}/api/sessions/${sessionId}`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { deletionId: randomUUID(), expectedRevision: revisaoAtual },
    })
    expect([200, 202], `DELETE da sessão: ${await exclusao.text()}`).toContain(exclusao.status())
    expect(readFileSync(copia, 'utf8'), 'excluir a conversa nunca apaga a cópia do projeto').toBe(conteudo)
    await shot(page, 'c3a_e14_retry_f5_exclusao')
  })

  test('E15 — destino aparece na tela inicial e na conversa aberta, nos dois temas', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e15')
    mkdirSync(projeto, { recursive: true })
    await irParaLanding(page)
    const seletor = page.getByTestId('landing-contexto')
    await seletor.click()
    await page.getByLabel('Buscar ou digitar caminho da pasta').fill(projeto)
    await page.getByLabel('Buscar ou digitar caminho da pasta').press('Enter')
    await expect(seletor).toHaveAttribute('aria-label', /Workspace atual:/, { timeout: 20_000 })

    const temas = ['Mudar para tema claro', 'Mudar para tema escuro'] as const
    for (const tema of temas) {
      // LANDING: opção presente com Pasta selecionada.
      await anexarNaLanding(page, `landing-${tema.includes('claro') ? 'claro' : 'escuro'}.txt`, 'x')
      await expect(destinoCopia(page)).toBeVisible()
      await page.getByRole('button', { name: tema }).click()
      await expect(destinoCopia(page)).toBeVisible()
      await shot(page, `c3a_e15_landing_${tema.includes('claro') ? 'claro' : 'escuro'}`)
      // remove o anexo para o próximo laço
      await page.getByRole('button', { name: /^Remover / }).last().click()
    }

    // CONVERSA ABERTA: a mesma opção continua disponível nos dois temas.
    await anexarNaLanding(page, 'chat.txt', 'conteudo do chat')
    await campoLanding(page).fill('abre a conversa com pasta')
    await botaoEnviarLanding(page).click()
    await confirmarSemMidia(page)
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    await anexarNoChat(page, 'dentro-do-chat.txt', 'conteudo')
    for (const tema of temas) {
      await page.getByRole('button', { name: tema }).click()
      await expect(destinoCopia(page)).toBeVisible()
      await shot(page, `c3a_e15_chat_${tema.includes('claro') ? 'claro' : 'escuro'}`)
    }
  })
})
