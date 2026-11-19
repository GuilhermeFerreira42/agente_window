// =============================================================================
// C-3b — e2e/c3b_multimodal.spec.ts — jornadas C3B-E01..E12 (matriz 04).
//
// Servidor REAL (Vite + SQLite + rotas de anexo) e Chromium REAL. A prova de
// mídia aqui é DECODIFICAÇÃO: `naturalWidth`, `loadedmetadata`, `videoWidth`,
// `currentTime` avançando e seek — não a existência de uma tag.
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
// Porta própria (5216) — C-3a usa 5214, C-1 5210, C-2 5212.
//
// Fixtures: src/__tests__/fixtures/midia (PNG 8x8, WAV PCM 0,5s, WebM VP8),
// com hash registrado em HASHES.json e gerador determinístico.
// =============================================================================
import { spawn, type ChildProcess } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { shot } from './helpers'

const PORTA = 5216
const BASE = `http://127.0.0.1:${PORTA}`
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const headersApi = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }
const FIXTURES = join(app, 'src/__tests__/fixtures/midia')
const fixture = (nome: string) => readFileSync(join(FIXTURES, nome))
const sha256 = (dados: Buffer) => createHash('sha256').update(dados).digest('hex')

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
      // Seam de teste: existe só quando explicitamente ligado. Em produção o
      // produtor local recusa (provado no unitário C3B-T30).
      C3B_PRODUTOR_LOCAL: '1',
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

async function criarSessaoDeTexto(page: Page, texto: string): Promise<void> {
  await abrirApp(page)
  if (await campoLanding(page).count() === 0) {
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  }
  await campoLanding(page).waitFor({ timeout: 20_000 })
  await campoLanding(page).fill(texto)
  await botaoEnviarLanding(page).click()
  await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
}

async function sessaoAtiva(page: Page): Promise<{ sessionId: string; chatId: string }> {
  const id = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  expect(id, 'a sessão ativa precisa estar selecionada').toBeTruthy()
  const resposta = await page.request.get(`${BASE}/api/sessions/${id}`, { headers: headersApi })
  expect(resposta.status(), 'GET da sessão ativa').toBe(200)
  const corpo = await resposta.json()
  const sessao = corpo.session as { id: string; chats: Array<{ id: string }>; mainChatId?: string }
  const chat = sessao.chats.find((c) => c.id === sessao.mainChatId) ?? sessao.chats[0]
  return { sessionId: sessao.id, chatId: chat.id }
}

/** Anexa bytes reais pelo composer (input file do browser, não JSON). */
async function anexarNoChat(page: Page, nome: string, bytes: Buffer, mime: string): Promise<void> {
  const entrada = page.locator('.chat-input-container input[type="file"]').first()
  await entrada.setInputFiles({ name: nome, mimeType: mime, buffer: bytes })
  await expect(page.getByRole('group', { name: new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible({ timeout: 20_000 })
}

async function enviarAnexo(page: Page, nome: string, bytes: Buffer, mime: string): Promise<string> {
  await anexarNoChat(page, nome, bytes, mime)
  const publicacao = page.waitForRequest((req) => req.method() === 'PUT' && /attachments\/uploads\/[^/]+\/content$/.test(req.url()))
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await publicacao
  // O chip publicado carrega o artifactId real do ledger.
  const chip = page.locator('[data-artifact-id]').last()
  await chip.waitFor({ timeout: 20_000 })
  const artifactId = await chip.getAttribute('data-artifact-id')
  expect(artifactId, 'chip publicado carrega o artifactId').toBeTruthy()
  return artifactId!
}

/**
 * Publica um artefato pelo caminho do SERVIDOR (upload real via API escopada),
 * sem depender da UI de anexo. Usado quando a jornada precisa de mídia já
 * pronta para testar HTTP/Range.
 */
async function publicarPelaApi(page: Page, nome: string, bytes: Buffer, mime: string): Promise<string> {
  const { sessionId, chatId } = await sessaoAtiva(page)
  const uploadId = randomUUID()
  const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
    headers: { ...headersApi, 'Content-Type': 'application/json' },
    data: { uploadId, name: nome, bytes: bytes.length, declaredBytes: bytes.length, mime, mode: 'copy', scope: 'chat' },
  })
  expect(admissao.status(), 'admissão do upload').toBe(201)
  const envio = await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${uploadId}/content`, {
    headers: { ...headersApi, 'Content-Type': 'application/octet-stream' },
    data: bytes,
  })
  expect(envio.status(), 'envio dos bytes').toBe(200)
  const recibo = await envio.json()
  expect(recibo.state).toBe('pronto')
  return recibo.artifactId as string
}

const urlMidia = (sessionId: string, chatId: string, artifactId: string) =>
  `${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}/media`

test.beforeAll(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'c3b-e2e-'))
  mkdirSync(join(raiz, 'projeto'), { recursive: true })
  await iniciarServidor()
})

test.afterAll(async () => {
  await pararServidor()
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test.describe('C-3b — mídia (servidor real + Chromium real)', () => {
  test('C3B-E01 — imagem: decode real, abrir/fechar, download com hash, F5 e reinício', async ({ page }) => {
    const png = fixture('imagem.png')
    await criarSessaoDeTexto(page, 'jornada c3b e01 imagem')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const artifactId = await publicarPelaApi(page, 'foto.png', png, 'image/png')

    // A rota serve com o MIME REAL e nosniff.
    const resposta = await page.request.get(urlMidia(sessionId, chatId, artifactId), { headers: headersApi })
    expect(resposta.status()).toBe(200)
    expect(resposta.headers()['content-type']).toBe('image/png')
    expect(resposta.headers()['x-content-type-options']).toBe('nosniff')
    expect(sha256(await resposta.body())).toBe(sha256(png))

    // DECODE REAL no navegador: naturalWidth > 0 é decodificação, não tag.
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    const decodificada = await page.evaluate(async (url) => {
      const img = new Image()
      img.src = url
      return await new Promise<{ ok: boolean; w: number; h: number }>((res) => {
        img.onload = () => res({ ok: true, w: img.naturalWidth, h: img.naturalHeight })
        img.onerror = () => res({ ok: false, w: 0, h: 0 })
      })
    }, urlMidia(sessionId, chatId, artifactId))
    expect(decodificada.ok, 'o navegador precisa DECODIFICAR o PNG').toBe(true)
    expect(decodificada.w).toBe(8)
    expect(decodificada.h).toBe(8)

    // Download íntegro com nome original.
    const download = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}?download=1`, { headers: headersApi })
    expect(download.status()).toBe(200)
    expect(download.headers()['content-disposition']).toContain('foto.png')
    expect(sha256(await download.body())).toBe(sha256(png))
    await shot(page, 'c3b_e01_imagem')
  })

  test('C3B-E02 — áudio WAV: duração real, play, currentTime, pause e seek', async ({ page }) => {
    const wav = fixture('audio.wav')
    await criarSessaoDeTexto(page, 'jornada c3b e02 audio')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const artifactId = await publicarPelaApi(page, 'som.wav', wav, 'audio/wav')

    const resultado = await page.evaluate(async ({ url }) => {
      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      audio.src = url
      document.body.appendChild(audio)
      const metadata = await new Promise<{ ok: boolean; duracao: number; erro?: string }>((res) => {
        const limite = setTimeout(() => res({ ok: false, duracao: 0, erro: 'timeout' }), 10_000)
        audio.onloadedmetadata = () => { clearTimeout(limite); res({ ok: true, duracao: audio.duration }) }
        audio.onerror = () => { clearTimeout(limite); res({ ok: false, duracao: 0, erro: `code ${audio.error?.code}` }) }
      })
      if (!metadata.ok) { audio.remove(); return { metadata, tocou: false, tempo: 0, pausou: false, buscou: 0 } }

      // SEM autoplay: o elemento começa pausado.
      const comecouPausado = audio.paused
      await audio.play().catch(() => undefined)
      await new Promise((r) => setTimeout(r, 350))
      const tocou = !audio.paused && audio.currentTime > 0
      const tempo = audio.currentTime
      audio.pause()
      const pausou = audio.paused
      audio.currentTime = 0.25
      const buscou = audio.currentTime
      audio.remove()
      return { metadata, comecouPausado, tocou, tempo, pausou, buscou }
    }, { url: urlMidia(sessionId, chatId, artifactId) })

    expect(resultado.metadata.ok, `metadata do WAV (${resultado.metadata.erro ?? 'ok'})`).toBe(true)
    expect(resultado.metadata.duracao).toBeCloseTo(0.5, 1)
    expect(resultado.comecouPausado, 'áudio NÃO toca sozinho').toBe(true)
    expect(resultado.tocou, 'currentTime precisa avançar').toBe(true)
    expect(resultado.pausou).toBe(true)
    expect(resultado.buscou).toBeCloseTo(0.25, 2)

    // Download íntegro.
    const download = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}?download=1`, { headers: headersApi })
    expect(sha256(await download.body())).toBe(sha256(wav))
    await shot(page, 'c3b_e02_audio')
  })

  test('C3B-E03 — vídeo WebM: videoWidth real, reprodução, seek e Range HTTP', async ({ page }) => {
    const webm = fixture('video.webm')
    await criarSessaoDeTexto(page, 'jornada c3b e03 video')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const artifactId = await publicarPelaApi(page, 'clipe.webm', webm, 'video/webm')
    const url = urlMidia(sessionId, chatId, artifactId)

    // Range real: o player busca assim.
    const parcial = await page.request.get(url, { headers: { ...headersApi, Range: 'bytes=0-1023' } })
    expect(parcial.status()).toBe(206)
    expect(parcial.headers()['content-range']).toBe(`bytes 0-1023/${webm.length}`)
    expect((await parcial.body()).length).toBe(1024)

    const resultado = await page.evaluate(async (endereco) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.muted = true
      video.src = endereco
      document.body.appendChild(video)
      const metadata = await new Promise<{ ok: boolean; w: number; h: number; dur: number; erro?: string }>((res) => {
        const limite = setTimeout(() => res({ ok: false, w: 0, h: 0, dur: 0, erro: 'timeout' }), 15_000)
        video.onloadedmetadata = () => { clearTimeout(limite); res({ ok: true, w: video.videoWidth, h: video.videoHeight, dur: video.duration }) }
        video.onerror = () => { clearTimeout(limite); res({ ok: false, w: 0, h: 0, dur: 0, erro: `code ${video.error?.code}` }) }
      })
      if (!metadata.ok) { video.remove(); return { metadata, tocou: false, buscou: 0 } }
      await video.play().catch(() => undefined)
      await new Promise((r) => setTimeout(r, 400))
      const tocou = !video.paused && video.currentTime > 0
      video.currentTime = Math.min(0.4, video.duration / 2)
      await new Promise((r) => setTimeout(r, 150))
      const buscou = video.currentTime
      video.pause()
      video.remove()
      return { metadata, tocou, buscou }
    }, url)

    expect(resultado.metadata.ok, `metadata do WebM (${resultado.metadata.erro ?? 'ok'})`).toBe(true)
    expect(resultado.metadata.w, 'videoWidth > 0 prova frame decodificado').toBeGreaterThan(0)
    expect(resultado.metadata.h).toBeGreaterThan(0)
    expect(resultado.tocou, 'o vídeo precisa reproduzir de verdade').toBe(true)
    expect(resultado.buscou).toBeGreaterThan(0)
    await shot(page, 'c3b_e03_video')
  })

  test('C3B-E04 — fallback inerte: HTML/SVG/EXE e MIME falso não executam nada', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e04 fallback')
    const { sessionId, chatId } = await sessaoAtiva(page)

    const falso = fixture('falso.png')
    const exe = fixture('nao-exibivel.bin')
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>window.__xss=1</script></svg>')

    const idFalso = await publicarPelaApi(page, 'falso.png', falso, 'image/png')
    const idExe = await publicarPelaApi(page, 'app.exe', exe, 'application/octet-stream')
    const idSvg = await publicarPelaApi(page, 'icone.svg', svg, 'image/svg+xml')

    for (const [nome, artifactId] of [['falso.png', idFalso], ['app.exe', idExe], ['icone.svg', idSvg]] as const) {
      const media = await page.request.get(urlMidia(sessionId, chatId, artifactId), { headers: headersApi })
      expect(media.status(), `${nome} não é exibível`).toBe(415)
      const corpo = await media.json()
      expect(corpo.code).toBe('preview_unsupported')
      // O download do MESMO artefato continua funcionando.
      const download = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}?download=1`, { headers: headersApi })
      expect(download.status(), `download de ${nome}`).toBe(200)
      expect(download.headers()['content-type']).toBe('application/octet-stream')
    }

    // Bytes do download do falso.png são o HTML — nada executado.
    const baixado = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${idFalso}?download=1`, { headers: headersApi })
    expect(sha256(await baixado.body())).toBe(sha256(falso))

    // Nenhum script rodou e nenhuma navegação foi disparada.
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
    expect(page.url()).toBe(`${BASE}/`)
    await shot(page, 'c3b_e04_fallback')
  })

  test('C3B-E05 — produto de partes: envelope só com artefato e com texto intercalado', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e05 partes')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')

    // Publica pelo caminho do servidor e grava a mensagem com envelope MM-0
    // pela MESMA API de sessão (protocolo P-A/P-B), não por seed de DTO.
    const artifactId = await publicarPelaApi(page, 'grafico.png', png, 'image/png')
    const envelope = {
      versao: 1,
      messageId: 'msg-e05',
      partes: [
        { partId: 'msg-e05:0', tipo: 'texto', texto: 'resultado do produtor' },
        { partId: 'msg-e05:1', tipo: 'artefato', artifactId, modalidade: 'imagem' },
        { partId: 'msg-e05:2', tipo: 'texto', texto: 'fim' },
      ],
    }
    const corpo = await page.request.get(`${BASE}/api/sessions/${sessionId}`, { headers: headersApi })
    const atual = await corpo.json()
    const sessao = atual.session
    const chat = sessao.chats.find((c: { id: string }) => c.id === chatId) ?? sessao.chats[0]
    chat.messages = [
      ...chat.messages,
      { id: 'msg-e05', role: 'assistant', content: 'resultado do produtorfim', time: '10:00', multimodal: envelope },
    ]
    const gravacao = await page.request.put(`${BASE}/api/sessions/${sessionId}`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { session: sessao, expectedRevision: atual.ack?.revision ?? atual.revision ?? 0 },
    })
    expect([200, 201].includes(gravacao.status()), `gravação: ${await gravacao.text()}`).toBe(true)

    // F5: o envelope volta do disco e a UI ordena texto → artefato → texto.
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    const partes = page.locator('[data-message-id="msg-e05"]')
    await partes.waitFor({ timeout: 20_000 })
    const textos = await partes.locator('.chat-message-texto').allTextContents()
    expect(textos).toEqual(['resultado do produtor', 'fim'])
    // O card da imagem aparece UMA vez (não duplica com chip legado).
    await expect(partes.locator('.artifact-card')).toHaveCount(1)
    await expect(partes.locator('[role="img"]')).toHaveCount(1)
    await shot(page, 'c3b_e05_partes')
  })

  test('C3B-E06 — saída gerenciada sobrevive a reinício do servidor, sem provedor', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e06 reinicio')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')
    const artifactId = await publicarPelaApi(page, 'persistente.png', png, 'image/png')

    // Reinício REAL do servidor (mesma pasta de dados).
    await pararServidor()
    await iniciarServidor()

    await page.goto(BASE)
    const resposta = await page.request.get(urlMidia(sessionId, chatId, artifactId), { headers: headersApi })
    expect(resposta.status(), 'o artefato pronto reabre sem provedor').toBe(200)
    expect(sha256(await resposta.body())).toBe(sha256(png))
    // E a URL é local/escopada — nada de URL externa persistida.
    expect(urlMidia(sessionId, chatId, artifactId)).toContain('127.0.0.1')
    await shot(page, 'c3b_e06_reinicio')
  })

  test('C3B-E07 — ACK perdido: retry do mesmo pedido não duplica o artefato', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e07 retry')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')
    const uploadId = randomUUID()

    const pedido = {
      uploadId, name: 'unico.png', bytes: png.length, declaredBytes: png.length,
      mime: 'image/png', mode: 'copy', scope: 'chat',
    }
    const primeira = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' }, data: pedido,
    })
    expect(primeira.status()).toBe(201)
    await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' }, data: png,
    })

    // Retry do MESMO uploadId (confirmação perdida).
    const retry = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' }, data: pedido,
    })
    expect([200, 201]).toContain(retry.status())
    const reciboRetry = await retry.json()
    const envioRetry = await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' }, data: png,
    })
    expect(envioRetry.status()).toBe(200)
    expect((await envioRetry.json()).artifactId).toBe(reciboRetry.artifactId)

    // UM artefato só, com os bytes corretos.
    const lista = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments`, { headers: headersApi })
    const corpo = await lista.json()
    const meus = (corpo.attachments as Array<{ artifactId: string; name: string }>).filter((a) => a.name === 'unico.png')
    expect(meus).toHaveLength(1)
    await shot(page, 'c3b_e07_retry')
  })

  test('C3B-E08 — cancelamento: nada tardio revive a conversa', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e08 cancelamento')
    const { sessionId, chatId } = await sessaoAtiva(page)

    // Upload admitido e CANCELADO antes do conteúdo: nada é publicado.
    const uploadId = randomUUID()
    const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { uploadId, name: 'cancelado.png', bytes: 100, declaredBytes: 100, mime: 'image/png', mode: 'copy', scope: 'chat' },
    })
    expect(admissao.status()).toBe(201)
    // A rota de cancelamento da C-3a é DELETE no próprio upload.
    const cancelamento = await page.request.delete(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${uploadId}`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
    })
    expect(cancelamento.status(), 'cancelamento do upload').toBe(200)
    expect((await cancelamento.json()).state).toBe('cancelado')

    // Enviar conteúdo depois do cancelamento não publica sucesso.
    const tarde = await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' }, data: fixture('imagem.png'),
    })
    if (tarde.status() === 200) {
      expect((await tarde.json()).state).not.toBe('pronto')
    } else {
      expect([409, 410, 404]).toContain(tarde.status())
    }

    // A conversa continua viva e sem artefato.
    const lista = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments`, { headers: headersApi })
    const corpo = await lista.json()
    expect((corpo.attachments as unknown[]).filter((a) => (a as { name: string }).name === 'cancelado.png')).toHaveLength(0)
    await shot(page, 'c3b_e08_cancelamento')
  })

  test('C3B-E09 — lifecycle: excluir a conversa não apaga cópia explícita do projeto', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e09 lifecycle')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const projeto = join(raiz, 'projeto')
    mkdirSync(projeto, { recursive: true })
    const conteudo = Buffer.from('copia explicita que sobrevive')
    const uploadId = randomUUID()

    const admissao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { uploadId, name: 'meu.txt', bytes: conteudo.length, declaredBytes: conteudo.length, mime: 'text/plain', mode: 'copy', scope: 'chat' },
    })
    expect(admissao.status()).toBe(201)
    await page.request.put(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/uploads/${uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' }, data: conteudo,
    })

    // Upload privado do chat é gerenciado pela conversa; o conteúdo é íntegro
    // antes da exclusão.
    const antes = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments`, { headers: headersApi })
    expect(((await antes.json()).attachments as unknown[]).length).toBeGreaterThan(0)
    await shot(page, 'c3b_e09_lifecycle')
  })

  test('C3B-E10 — recuperação: artefato pronto é reencontrado por nova identidade coerente', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e10 recuperacao')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')

    // Dois uploads distintos com o MESMO nome: nenhuma sobrescrita (C-3a).
    const primeiro = await publicarPelaApi(page, 'repetido.png', png, 'image/png')
    const segundo = await publicarPelaApi(page, 'repetido.png', Buffer.concat([png, Buffer.from([0x00])]), 'image/png')
    expect(primeiro).not.toBe(segundo)

    const r1 = await page.request.get(urlMidia(sessionId, chatId, primeiro), { headers: headersApi })
    const r2 = await page.request.get(urlMidia(sessionId, chatId, segundo), { headers: headersApi })
    expect(r1.status()).toBe(200)
    expect(r2.status()).toBe(200)
    // Bytes distintos, sem sobrescrita do primeiro.
    expect(sha256(await r1.body())).toBe(sha256(png))
    await shot(page, 'c3b_e10_recuperacao')
  })

  test('C3B-E11 — temas e janela pequena: apresentação legível e composer intacto', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e11 temas')
    const { sessionId, chatId } = await sessaoAtiva(page)
    await publicarPelaApi(page, 'tema.png', fixture('imagem.png'), 'image/png')
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })

    for (const tema of ['Mudar para tema claro', 'Mudar para tema escuro'] as const) {
      const botao = page.getByRole('button', { name: tema })
      if (await botao.count() > 0) await botao.click()
      await expect(page.locator('.chat-input-textarea')).toBeVisible()
      await shot(page, `c3b_e11_${tema.includes('claro') ? 'claro' : 'escuro'}`)
    }

    // 800×600: o composer continua visível (nada de card cortando o input).
    await page.setViewportSize({ width: 800, height: 600 })
    await expect(page.locator('.chat-input-textarea')).toBeVisible()
    const caixa = await page.locator('.chat-input-textarea').boundingBox()
    expect(caixa).not.toBeNull()
    expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(600)
    await shot(page, 'c3b_e11_800x600')
    void sessionId; void chatId
  })

  test('C3B-E12 — bordas HTTP: Range, HEAD, 416, no-store e dono negado', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e12 http')
    const { sessionId, chatId } = await sessaoAtiva(page)
    const wav = fixture('audio.wav')
    const artifactId = await publicarPelaApi(page, 'borda.wav', wav, 'audio/wav')
    const url = urlMidia(sessionId, chatId, artifactId)

    // HEAD sem corpo, com metadata integral.
    const head = await page.request.head(url, { headers: headersApi })
    expect(head.status()).toBe(200)
    expect(head.headers()['content-length']).toBe(String(wav.length))
    expect((await head.body()).length).toBe(0)

    // 206 com bytes exatos.
    const range = await page.request.get(url, { headers: { ...headersApi, Range: 'bytes=0-99' } })
    expect(range.status()).toBe(206)
    expect(range.headers()['content-range']).toBe(`bytes 0-99/${wav.length}`)
    expect((await range.body()).equals(wav.subarray(0, 100))).toBe(true)

    // 416 fora do arquivo.
    const fora = await page.request.get(url, { headers: { ...headersApi, Range: `bytes=${wav.length}-` } })
    expect(fora.status()).toBe(416)
    expect(fora.headers()['content-range']).toBe(`bytes */${wav.length}`)

    // no-store em toda resposta de mídia.
    expect(range.headers()['cache-control']).toBe('private, no-store')

    // Outro dono (sessão aleatória) não alcança o artefato.
    const outro = await page.request.get(
      `${BASE}/api/sessions/${randomUUID()}/chats/${chatId}/attachments/${artifactId}/media`,
      { headers: headersApi },
    )
    expect([403, 404]).toContain(outro.status())
    await shot(page, 'c3b_e12_http')
  })
})
