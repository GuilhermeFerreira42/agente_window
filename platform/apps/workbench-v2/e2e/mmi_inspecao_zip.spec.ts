import { createServer, type Server } from 'node:http'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { zipDeTeste } from '../src/server/session-persistence/attachments/zipFixture.test-helper'
import { pdfDeTeste } from '../src/server/session-persistence/attachments/pdfFixture.test-helper'

const port = 5225, base = `http://127.0.0.1:${port}`, modelo = 'simulador-zip'
const pergunta = 'Liste o conteúdo deste ZIP e leia o arquivo nota.txt.'
const segredo = 'A resposta sintética é 742.'
let server: Server, app: ChildProcess, raiz: string
let cenario: 'aguardar' | 'zip' | 'cruzado' | 'cancelar' | 'pdf' | 'audio' | 'video' = 'zip'
let idAlheio = '', zipId = '', extraido = '', pedidos: Array<Record<string, unknown>> = [], erroFixture = ''

function tool(acao: string, args: Record<string, unknown> = {}) {
  return { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: `call-${pedidos.length}`, type: 'function', function: { name: 'anexos', arguments: JSON.stringify({ acao, ...args }) } }] } }] }
}
function texto(conteudo: string) { return { choices: [{ index: 0, delta: { content: conteudo } }] } }
async function iniciarApp() {
  app = spawn(process.execPath, [resolve('../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz, AGENTE_WINDOW_TEST_HOME: raiz,
      MMI_FSYNC_FIXTURE: raiz, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${JSON.stringify(pathToFileURL(resolve('e2e/fixtures/pausarFsync.mjs')).href)}` },
  })
  await expect.poll(async () => { try { return (await fetch(base)).status } catch { return 0 } }, { timeout: 60_000 }).toBe(200)
}
async function pararApp() {
  if (app && app.exitCode === null) { const terminou = once(app, 'exit'); app.kill('SIGKILL'); await terminou }
}

test.setTimeout(120_000)
test.beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'mmi-inspecao-e2e-'))
  server = createServer((req, res) => {
    if (req.method === 'GET') { res.writeHead(404); res.end(); return }
    const partes: Buffer[] = []
    req.on('data', (parte: Buffer) => partes.push(parte))
    req.on('end', () => {
      let resposta: unknown
      try {
        const corpo = JSON.parse(Buffer.concat(partes).toString()) as { model: string; stream: boolean; messages: Array<{ role: string; content: string }>; tools: Array<{ function: { name: string } }> }
        pedidos.push(corpo as unknown as Record<string, unknown>)
        if (req.url !== '/v1/chat/completions' || corpo.model !== modelo || !corpo.stream) throw new Error('protocolo ou modelo incorreto')
        const resultados = corpo.messages.filter(m => m.role === 'tool')
        const ultimo = resultados.at(-1)?.content
        if (cenario === 'aguardar') {
          if ((corpo.tools ?? []).length || resultados.length || JSON.stringify(corpo).includes(segredo) || !corpo.messages.some(m => m.role === 'user' && m.content === 'Aguarde instruções.')) throw new Error('espera expôs arquivo ou ferramentas')
          resposta = texto('Aguardarei instruções.')
        } else if (cenario === 'zip') {
          if (!corpo.tools?.some(t => t.function.name === 'anexos')) throw new Error('ferramenta não anunciada')
          if (!resultados.length) {
            if (!corpo.messages.some(m => m.role === 'user' && m.content === pergunta) || JSON.stringify(corpo).includes(segredo)) throw new Error('texto ou privacidade inicial')
            resposta = tool('listar')
          } else if (resultados.length === 1) {
            const fontes = JSON.parse(ultimo!) as Array<{ artifactId: string; nome: string }>
            zipId = fontes.find(f => f.nome === 'seguro.zip')?.artifactId ?? ''
            if (!zipId) throw new Error('ZIP não retornou da conversa')
            resposta = tool('listar_zip', { artifactId: zipId })
          } else if (resultados.length === 2) {
            const itens = JSON.parse(ultimo!) as Array<{ indice: number; nome: string }>
            const item = itens.find(f => f.nome === 'dados/nota.txt')
            if (!item) throw new Error('item do ZIP não listado')
            resposta = tool('extrair_zip', { artifactId: zipId, indice: item.indice })
          } else if (resultados.length === 3) {
            const item = JSON.parse(ultimo!) as { artifactId: string; nome: string }
            extraido = item.artifactId
            if (!extraido || item.nome !== 'nota.txt') throw new Error('item não publicado')
            resposta = tool('ler', { artifactId: extraido })
          } else {
            const documento = JSON.parse(ultimo!) as { texto: string; representacao: string }
            if (documento.texto !== segredo || documento.representacao !== 'texto UTF-8') throw new Error('o provedor não recebeu o texto esperado')
            resposta = texto('Resposta baseada no arquivo: 742.')
          }
        } else if (cenario === 'pdf' || cenario === 'audio' || cenario === 'video') {
          if (!resultados.length) resposta = tool('listar')
          else if (resultados.length === 1) {
            const fontes = JSON.parse(ultimo!) as Array<{ artifactId: string; nome: string }>
            const nome = { pdf: 'amostra.pdf', audio: 'voz.wav', video: 'video.webm' }[cenario]
            const fonte = fontes.find(f => f.nome === nome)
            if (!fonte) throw new Error('fonte de modalidade ausente')
            resposta = tool('ler', { artifactId: fonte.artifactId })
          } else {
            const resultado = JSON.parse(ultimo!) as { texto?: string; representacao?: string; motivo?: string; disponivel?: boolean }
            if (cenario === 'pdf' && (resultado.representacao !== 'texto extraído de PDF' || !resultado.texto?.includes('Valor sintetico 742'))) throw new Error('texto PDF não recebido')
            if (cenario === 'audio' && (resultado.disponivel !== false || !resultado.motivo?.includes('áudio'))) throw new Error('fallback áudio ausente')
            if (cenario === 'video' && (resultado.disponivel !== false || !resultado.motivo?.includes('vídeo'))) throw new Error('fallback vídeo ausente')
            resposta = texto(cenario === 'pdf' ? 'PDF contém Valor sintetico 742.' : `Análise de ${cenario} indisponível.`)
          }
        } else if (cenario === 'cancelar' && !resultados.length) resposta = tool('extrair_zip', { artifactId: zipId, indice: 1 })
        else if (!resultados.length) resposta = tool('ler', { artifactId: idAlheio })
        else {
          if (JSON.stringify(corpo).includes(segredo)) throw new Error('conteúdo alheio vazou')
          if (!ultimo?.includes('NÃO EXECUTADO')) throw new Error('acesso cruzado não recusado')
          resposta = texto('O anexo não está disponível nesta conversa.')
        }
      } catch (erro) { erroFixture = String(erro); res.writeHead(400); res.end(erroFixture); return }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' })
      res.write(`data: ${JSON.stringify(resposta)}\n\n`); res.end('data: [DONE]\n\n')
    })
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const addr = server.address(); if (!addr || typeof addr === 'string') throw new Error('sem porta')
  await iniciarApp()
  const resposta = await fetch(`${base}/api/providers`, { method: 'PUT', headers: { Origin: base, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Simulador local', baseUrl: `http://127.0.0.1:${addr.port}/v1`, modelo, modelosHabilitados: [modelo], apiKey: 'fixture-local' } } }) })
  expect(resposta.ok).toBe(true)
})
test.afterAll(async () => {
  await pararApp()
  if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

async function permitir(page: Page, textoPrevia: string, totalPedidos: number) {
  const card = page.getByRole('group', { name: 'Ferramenta: Inspecionar anexos desta conversa' }).filter({ hasText: 'Esperando você permitir' })
  await expect(card).toContainText(textoPrevia, { timeout: 30_000 })
  expect(pedidos).toHaveLength(totalPedidos)
  await card.getByRole('button', { name: 'Permitir esta mexida' }).click()
}

test('guardar ZIP, aguardar e depois inspecionar sem novo upload; recusa cruzada', async ({ page }) => {
  cenario = 'aguardar'; pedidos = []; erroFixture = ''
  await page.goto(base)
  const zip = zipDeTeste([{ nome: 'dados/nota.txt', bytes: Buffer.from(segredo) }, { nome: 'dados/ignorado.txt', bytes: Buffer.from('ignorado') }])
  let uploads = 0
  page.on('request', req => { if (req.method() === 'PUT' && /attachments\/uploads\/[^/]+\/content$/.test(req.url())) uploads++ })
  await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill('Aguarde instruções.')
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'seguro.zip', mimeType: 'application/zip', buffer: zip })
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByText('Aguardarei instruções.')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('region', { name: 'Fontes' }).getByText('seguro.zip')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Ferramenta: Inspecionar anexos desta conversa' })).toHaveCount(0)
  expect(erroFixture).toBe(''); expect(pedidos).toHaveLength(1); expect(uploads).toBe(1)
  expect(JSON.stringify(pedidos)).not.toContain(segredo)
  expect(JSON.stringify(pedidos)).not.toContain(zip.toString('base64'))
  expect(JSON.stringify(pedidos)).not.toContain('dados/nota.txt')
  cenario = 'zip'; pedidos = []
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(pergunta)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await permitir(page, 'seguro.zip', 1)
  await permitir(page, 'ZIP seguro.zip', 2)
  await permitir(page, 'dados/nota.txt', 3)
  await permitir(page, 'texto UTF-8 do anexo nota.txt', 4)
  await expect(page.getByText('Resposta baseada no arquivo: 742.')).toBeVisible({ timeout: 30_000 })
  expect(pedidos).toHaveLength(5); expect(erroFixture).toBe(''); expect(uploads).toBe(1)
  await expect(page.getByRole('region', { name: 'Fontes' }).getByText('nota.txt')).toBeVisible({ timeout: 20_000 })
  const id = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
  const session = await (await page.request.get(`${base}/api/sessions/${id}`, { headers })).json()
  const chat = session.session.mainChatId
  const download = await page.request.get(`${base}/api/sessions/${id}/chats/${chat}/attachments/${extraido}?download=1`, { headers })
  expect((await download.body()).toString()).toBe(segredo)
  idAlheio = extraido; cenario = 'cancelar'; pedidos = []
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Extraia dados/ignorado.txt.')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  const pendente = page.getByRole('group', { name: 'Ferramenta: Inspecionar anexos desta conversa' }).filter({ hasText: 'Esperando você permitir' })
  await expect(pendente).toContainText('dados/ignorado.txt', { timeout: 30_000 })
  expect(pedidos).toHaveLength(1)
  // O preload só existe no servidor descartável: pausa após gravar o stage,
  // antes do fsync e da decisão de publicar, para a corrida ser reproduzível.
  writeFileSync(join(raiz, 'ativar'), '1')
  await pendente.getByRole('button', { name: 'Permitir esta mexida' }).click()
  await expect.poll(() => existsSync(join(raiz, 'entrou')), { timeout: 20_000 }).toBe(true)
  const pedidoParada = page.waitForRequest(req => req.method() === 'POST' && req.url().endsWith('/api/agir/cancel'))
  const respostaParada = page.waitForResponse(res => res.request().method() === 'POST' && res.url().endsWith('/api/agir/cancel'))
  await page.getByRole('button', { name: 'Parar execução' }).click()
  await pedidoParada
  await page.waitForTimeout(300) // garante que o servidor recebeu a parada antes de soltar fsync
  writeFileSync(join(raiz, 'liberar'), '1')
  expect((await (await respostaParada).json()).status).toBe('cancelled')
  await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeVisible({ timeout: 30_000 })
  expect(pedidos).toHaveLength(1)
  expect(JSON.stringify(pedidos)).not.toContain(segredo)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Fontes' }).getByText('nota.txt')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('region', { name: 'Fontes' }).getByText('ignorado.txt')).toHaveCount(0)
  await pararApp(); await iniciarApp(); await page.reload()
  await expect(page.getByRole('region', { name: 'Fontes' }).getByText('nota.txt')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('region', { name: 'Fontes' }).getByText('ignorado.txt')).toHaveCount(0)
  cenario = 'cruzado'; pedidos = []
  await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill('Tente ler o identificador solicitado.')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByText('O anexo não está disponível nesta conversa.')).toBeVisible({ timeout: 30_000 })
  expect(erroFixture).toBe(''); expect(pedidos).toHaveLength(2)
  const idB = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const sessionB = await (await page.request.get(`${base}/api/sessions/${idB}`, { headers })).json()
  const rotaB = `${base}/api/sessions/${idB}/chats/${sessionB.session.mainChatId}/attachments/${extraido}`
  expect((await page.request.get(`${rotaB}?download=1`, { headers })).status()).toBe(404)
  expect((await page.request.get(`${rotaB}/media`, { headers })).status()).toBe(404)
})

test('dois chats da mesma sessão: Fontes, rotas e ferramenta isolados nos dois sentidos', async ({ page }) => {
  const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
  const sid = randomUUID(), a = randomUUID(), b = randomUUID()
  const session = { id: sid, title: `Dois chats ${sid}`, workspace: 'Chat', workspacePath: null, contexto: { tipo: 'chat' }, section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: a,
    chats: [{ id: a, title: 'Chat Alfa', status: 'completed', messages: [] }, { id: b, title: 'Chat Beta', status: 'completed', messages: [] }] }
  const criado = await page.request.post(`${base}/api/sessions`, { headers, data: { session, contexto: { tipo: 'chat' }, creationId: randomUUID() } })
  expect(criado.ok(), await criado.text()).toBe(true)
  const png = readFileSync(resolve('src/__tests__/fixtures/midia/imagem.png'))
  const enviar = async (chat: string, nome: string) => {
    const root = `${base}/api/sessions/${sid}/chats/${chat}/attachments`
    const admissao = await page.request.post(`${root}/uploads`, { headers, data: { name: nome, bytes: png.length, mime: 'image/png', mode: 'copy', scope: 'chat' } })
    expect(admissao.status()).toBe(201)
    const { uploadId } = await admissao.json()
    const resposta = await page.request.put(`${root}/uploads/${uploadId}/content`, { headers: { ...headers, 'Content-Type': 'application/octet-stream' }, data: png })
    expect(resposta.status()).toBe(200)
    return (await resposta.json()).artifactId as string
  }
  const idA = await enviar(a, 'alfa.png'), idB = await enviar(b, 'beta.png')
  for (const [dono, proprio, alheio] of [[a, idA, idB], [b, idB, idA]]) {
    const root = `${base}/api/sessions/${sid}/chats/${dono}/attachments`
    expect((await page.request.get(`${root}/${proprio}?download=1`, { headers })).status()).toBe(200)
    expect((await page.request.get(`${root}/${proprio}/media`, { headers })).status()).toBe(200)
    for (const sufixo of ['', '?download=1', '/media']) expect((await page.request.get(`${root}/${alheio}${sufixo}`, { headers })).status()).toBe(404)
    expect((await page.request.head(`${root}/${alheio}/media`, { headers })).status()).toBe(404)
  }
  await page.goto(base)
  await page.locator('.session-row').filter({ hasText: `Dois chats ${sid}` }).first().click()
  const fontes = page.getByRole('region', { name: 'Fontes' })
  const testarChat = async (titulo: string, proprio: string, alheio: string, id: string) => {
    await page.getByRole('tab', { name: titulo }).click()
    await expect(fontes.getByText(proprio)).toBeVisible()
    await expect(fontes.getByText(alheio)).toHaveCount(0)
    cenario = 'cruzado'; idAlheio = id; pedidos = []; erroFixture = ''
    await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Tente ler o identificador solicitado.')
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await expect(page.getByText('O anexo não está disponível nesta conversa.')).toBeVisible({ timeout: 30_000 })
    expect(erroFixture).toBe(''); expect(pedidos).toHaveLength(2)
  }
  await testarChat('Chat Alfa', 'alfa.png', 'beta.png', idB)
  await testarChat('Chat Beta', 'beta.png', 'alfa.png', idA)
  await page.reload()
  await page.locator('.session-row').filter({ hasText: `Dois chats ${sid}` }).first().click()
  await page.getByRole('tab', { name: 'Chat Alfa' }).click()
  await expect(fontes.getByText('alfa.png')).toBeVisible()
  await expect(fontes.getByText('beta.png')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Chat Beta' }).click()
  await expect(fontes.getByText('beta.png')).toBeVisible()
  await expect(fontes.getByText('alfa.png')).toHaveCount(0)
})

for (const modalidade of ['pdf', 'audio', 'video'] as const) {
  test(`inspeção de ${modalidade}: confirma representação ou informa indisponibilidade`, async ({ page }) => {
    cenario = modalidade; pedidos = []; erroFixture = ''
    const casos = {
      pdf: { nome: 'amostra.pdf', mime: 'application/pdf', bytes: pdfDeTeste('Valor sintetico 742') },
      audio: { nome: 'voz.wav', mime: 'audio/wav', bytes: readFileSync(resolve('src/__tests__/fixtures/midia/audio.wav')) },
      video: { nome: 'video.webm', mime: 'video/webm', bytes: readFileSync(resolve('src/__tests__/fixtures/midia/video.webm')) },
    }
    const arquivo = casos[modalidade]
    await page.goto(base)
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
    await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill(`Analise o ${modalidade} anexado.`)
    await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: arquivo.nome, mimeType: arquivo.mime, buffer: arquivo.bytes })
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await page.getByRole('dialog', { name: 'Enviar só o texto e manter os arquivos anexados?' }).getByRole('button', { name: 'Continuar com o texto' }).click()
    await permitir(page, arquivo.nome, 1)
    await permitir(page, modalidade === 'pdf' ? 'texto extraído de PDF' : 'motivo de indisponibilidade', 2)
    await expect(page.getByText(modalidade === 'pdf' ? 'PDF contém Valor sintetico 742.' : `Análise de ${modalidade} indisponível.`)).toBeVisible({ timeout: 30_000 })
    if (modalidade !== 'pdf') await expect(page.getByText(modalidade === 'audio' ? /Transcrição de áudio ainda não está disponível/ : /Extração de quadros ou transcrição de vídeo ainda não está disponível/)).toBeVisible()
    expect(erroFixture).toBe(''); expect(pedidos).toHaveLength(3)
  })
}

test('ZIP no projeto usa fontes da conversa e extrai fora da árvore compartilhada', async ({ page }) => {
  cenario = 'zip'; pedidos = []; erroFixture = ''; extraido = ''; zipId = ''
  const workspace = join(raiz, 'projeto-zip'); mkdirSync(workspace)
  writeFileSync(join(workspace, 'projeto.txt'), 'árvore do projeto preservada')
  await page.goto(base)
  await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByTestId('landing-contexto').click()
  const caminho = page.getByLabel('Buscar ou digitar caminho da pasta')
  await caminho.fill(workspace); await caminho.press('Enter')
  await expect(page.getByTestId('landing-contexto')).toHaveAttribute('aria-label', /Workspace atual:/)
  await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill(pergunta)
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'seguro.zip', mimeType: 'application/zip', buffer: zipDeTeste([{ nome: 'dados/nota.txt', bytes: Buffer.from(segredo) }]) })
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await page.getByRole('dialog', { name: 'Enviar só o texto e manter os arquivos anexados?' }).getByRole('button', { name: 'Continuar com o texto' }).click()
  await permitir(page, 'seguro.zip', 1); await permitir(page, 'ZIP seguro.zip', 2)
  await permitir(page, 'dados/nota.txt', 3); await permitir(page, 'texto UTF-8 do anexo nota.txt', 4)
  await expect(page.getByText('Resposta baseada no arquivo: 742.')).toBeVisible({ timeout: 30_000 })
  const sid = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
  const registro = await (await page.request.get(`${base}/api/sessions/${sid}`, { headers })).json()
  const cid = registro.session.mainChatId
  expect(readFileSync(join(raiz, 'data', 'uploads', 'chats', sid!, cid, extraido, 'nota.txt')).toString()).toBe(segredo)
  expect(existsSync(join(workspace, 'nota.txt'))).toBe(false)
  expect(readFileSync(join(workspace, 'projeto.txt')).toString()).toBe('árvore do projeto preservada')
  expect(erroFixture).toBe('')
})
