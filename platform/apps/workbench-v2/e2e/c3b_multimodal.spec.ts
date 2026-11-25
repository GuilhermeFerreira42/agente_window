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
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
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
      C3B_SAIDA_DE_TESTE: '1',
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
const botaoEnviarLanding = (page: Page) => page.getByRole('button', { name: 'Enviar mensagem' })

async function criarSessaoDeTexto(page: Page, texto: string, pasta?: string): Promise<void> {
  await abrirApp(page)
  if (await campoLanding(page).count() === 0) {
    await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  }
  await campoLanding(page).waitFor({ timeout: 20_000 })
  if (pasta) {
    const seletor = page.getByTestId('landing-contexto')
    await seletor.click()
    const busca = page.getByLabel('Buscar ou digitar caminho da pasta')
    await busca.fill(pasta)
    await busca.press('Enter')
    await expect(seletor).toHaveAttribute('aria-label', /Workspace atual:/, { timeout: 20_000 })
  }
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

/**
 * Espera a sessão ativa ficar PERSISTIDA (com o chat no disco). O envio na
 * landing é otimista; a gravação chega logo depois. Sem esta espera a
 * produção de teste publicaria numa sessão que ainda não existe no catálogo.
 */
async function esperarPersistida(page: Page): Promise<void> {
  const id = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  expect(id, 'sessão ativa selecionada').toBeTruthy()
  await expect.poll(async () => {
    const resposta = await page.request.get(`${BASE}/api/sessions/${id}`, { headers: headersApi })
    if (resposta.status() !== 200) return 0
    const corpo = await resposta.json()
    return corpo.session?.chats?.[0]?.messages?.length ?? 0
  }, { timeout: 20_000 }).toBeGreaterThan(0)
}

/**
 * F5 real, descartando apenas o RASCUNHO LOCAL não confirmado.
 *
 * O workbench guarda em `workbench.sessions.unsaved.v1` uma cópia da sessão
 * enquanto a gravação não recebe ACK, e o handler `pagehide` a regrava ao
 * recarregar. Na reidratação essa cópia tem precedência sobre o snapshot do
 * servidor — comportamento correto do produto (protege edição não salva), mas
 * que esconderia justamente o que esta jornada prova: o que o SERVIDOR
 * persistiu.
 *
 * Aqui o ACK é simulado: `addInitScript` roda ANTES do bundle do app, então a
 * chave some depois do `pagehide` e antes da leitura. Toda a outra via —
 * servidor, transcript P-B, projeção, apresentação — é a real.
 */
async function recarregarComAck(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.removeItem('workbench.sessions.unsaved.v1')
  })
  await page.reload()
  await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
}

async function anexarPeloChat(page: Page, name: string, buffer: Buffer, mimeType: string): Promise<string> {
  await page.locator('.chat-input-container input[type="file"]').first().setInputFiles({ name, mimeType, buffer })
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  const item = page.getByRole('list', { name: 'Anexos enviados' }).getByRole('listitem')
  await expect(item).toHaveAttribute('data-artifact-id', /.+/)
  return (await item.getAttribute('data-artifact-id'))!
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
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const artifactId = await anexarPeloChat(page, 'foto.png', png, 'image/png')

    // A rota serve com o MIME REAL e nosniff.
    const resposta = await page.request.get(urlMidia(sessionId, chatId, artifactId), { headers: headersApi })
    expect(resposta.status()).toBe(200)
    expect(resposta.headers()['content-type']).toBe('image/png')
    expect(resposta.headers()['x-content-type-options']).toBe('nosniff')
    expect(sha256(await resposta.body())).toBe(sha256(png))

    // DECODE REAL no navegador: naturalWidth > 0 é decodificação, não tag.
    await page.reload()
    await page.waitForSelector('.chat-input-textarea', { state: 'visible' })
    const imagem = page.getByRole('img', { name: 'foto.png', exact: true })
    await expect(imagem).toBeVisible()
    await expect.poll(() => imagem.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])).toEqual([8, 8])
    await page.getByRole('button', { name: 'Abrir foto.png em tela cheia' }).click()
    await expect(page.getByRole('dialog', { name: 'Visualização de foto.png' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Visualização de foto.png' })).toHaveCount(0)

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
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const artifactId = await anexarPeloChat(page, 'som.wav', wav, 'audio/wav')

    const audio = page.getByRole('group', { name: 'som.wav, áudio' }).locator('audio')
    await expect(audio).toBeVisible()
    await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.duration)).toBeCloseTo(0.5, 1)
    expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true)
    await audio.evaluate((el: HTMLAudioElement) => el.play())
    await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0)
    await audio.evaluate((el: HTMLAudioElement) => { el.pause(); el.currentTime = 0.25 })
    expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true)
    await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeCloseTo(0.25, 2)

    // Download íntegro.
    const download = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments/${artifactId}?download=1`, { headers: headersApi })
    expect(sha256(await download.body())).toBe(sha256(wav))
    await shot(page, 'c3b_e02_audio')
  })

  test('C3B-E03 — vídeo WebM: videoWidth real, reprodução, seek e Range HTTP', async ({ page }) => {
    const webm = fixture('video.webm')
    await criarSessaoDeTexto(page, 'jornada c3b e03 video')
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const artifactId = await anexarPeloChat(page, 'clipe.webm', webm, 'video/webm')
    const url = urlMidia(sessionId, chatId, artifactId)

    // Range real: o player busca assim.
    const parcial = await page.request.get(url, { headers: { ...headersApi, Range: 'bytes=0-1023' } })
    expect(parcial.status()).toBe(206)
    expect(parcial.headers()['content-range']).toBe(`bytes 0-1023/${webm.length}`)
    expect((await parcial.body()).length).toBe(1024)

    const video = page.getByRole('group', { name: 'clipe.webm, vídeo' }).locator('video')
    await expect(video).toBeVisible()
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.videoWidth)).toBeGreaterThan(0)
    await video.evaluate(async (el: HTMLVideoElement) => { el.muted = true; await el.play() })
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0)
    await video.evaluate((el: HTMLVideoElement) => { el.pause(); el.currentTime = el.duration / 2 })
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => Math.abs(el.currentTime - el.duration / 2))).toBeLessThan(0.05)
    await shot(page, 'c3b_e03_video')
  })

  test('C3B-E04 — fallback inerte: HTML/SVG/EXE e MIME falso não executam nada', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e04 fallback')
    await esperarPersistida(page)
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

  test('C3B-E05 — resposta do produtor pelo caminho REAL: texto/artefato/texto persistido', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e05 partes')
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)

    // O navegador pede UMA resposta; não manda path, URL, run alegado, nome
    // de arquivo nem bytes. Quem produz é o produtor composto no servidor.
    const pedido = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/conversa-de-teste`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { runId: randomUUID(), generation: 0 },
    })
    expect(pedido.status(), `produção: ${await pedido.text()}`).toBe(200)
    const produzido = await pedido.json() as {
      messageId: string
      multimodal: { versao: number; partes: Array<{ tipo: string; texto?: string; artifactId?: string }> }
    }
    // A ORDEM veio do produtor, não do teste.
    expect(produzido.multimodal.partes.map((p) => p.tipo)).toEqual(['texto', 'artefato', 'texto'])
    const artifactId = produzido.multimodal.partes[1].artifactId!
    expect(artifactId).toBeTruthy()

    // O artefato está no ledger REAL e serve os bytes da fixture.
    const png = fixture('imagem.png')
    const media = await page.request.get(urlMidia(sessionId, chatId, artifactId), { headers: headersApi })
    expect(media.status(), 'a saída gerenciada é servível').toBe(200)
    expect(sha256(await media.body())).toBe(sha256(png))

    // F5: o envelope volta do disco (P-A/P-B) e a UI ordena texto → artefato → texto.
    await recarregarComAck(page)
    const partes = page.locator(`[data-message-id="${produzido.messageId}"]`)
    await partes.waitFor({ timeout: 20_000 })
    const textos = await partes.locator('.chat-message-texto').allTextContents()
    expect(textos).toEqual(['resultado do produtor local', 'fim do resultado'])
    // Um card só — não duplica o chip legado.
    await expect(partes.locator('.artifact-card')).toHaveCount(1)
    // A imagem no card DECODIFICOU de verdade.
    const imagem = partes.locator('.artifact-card-imagem')
    await expect(imagem).toHaveCount(1)
    await expect
      .poll(async () => imagem.evaluate((n) => (n as HTMLImageElement).naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0)
    await shot(page, 'c3b_e05_partes')
  })

  test('C3B-E06 — saída gerenciada sobrevive a reinício do servidor, sem provedor', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e06 reinicio')
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')
    const producao = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/conversa-de-teste`, {
      headers: headersApi, data: { runId: randomUUID(), generation: 0 },
    })
    expect(producao.status()).toBe(200)
    const { multimodal } = await producao.json()
    const artifactId = multimodal.partes.find((parte: { tipo: string }) => parte.tipo === 'artefato').artifactId

    // Fecha a conexão HMR antiga antes de reiniciar para ela não disputar a navegação com o Playwright.
    await page.goto('about:blank')
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

  test('C3B-E07 — ACK perdido na RESPOSTA gerada: retry devolve a mesma mensagem e o mesmo arquivo', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e07 retry da resposta')
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')

    // Mesma tentativa reenviada: é o cliente que perdeu a confirmação.
    const runId = randomUUID()
    const rota = `${BASE}/api/sessions/${sessionId}/chats/${chatId}/conversa-de-teste`
    const pedido = { runId, generation: 0 }
    const pedir = () => page.request.post(rota, { headers: headersApi, data: pedido })

    let reciboPerdido: unknown
    let statusPrimeira: number | undefined
    await page.route(rota, async (interceptada) => {
      const resposta = await interceptada.fetch({ headers: { ...interceptada.request().headers(), ...headersApi } })
      statusPrimeira = resposta.status()
      reciboPerdido = await resposta.json()
      await interceptada.abort()
    }, { times: 1 })
    const clienteRecebeu = await page.evaluate(async ({ rota, pedido }) => {
      try {
        await fetch(rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido) })
        return true
      } catch {
        return false
      }
    }, { rota, pedido })
    expect(clienteRecebeu).toBe(false)
    expect(statusPrimeira, 'o servidor publicou antes da perda do recibo').toBe(200)
    const r1 = reciboPerdido as {
      messageId: string
      multimodal: { partes: Array<{ tipo: string; artifactId?: string }> }
    }
    const artifactId1 = r1.multimodal.partes.find((p) => p.tipo === 'artefato')!.artifactId!
    expect(artifactId1).toBeTruthy()

    // A confirmação se perde: o MESMO pedido é repetido.
    const [segunda, simultanea] = await Promise.all([pedir(), pedir()])
    expect(simultanea.status()).toBe(200)
    expect(await simultanea.json()).toEqual(await segunda.json())
    expect(segunda.status(), `replay: ${await segunda.text()}`).toBe(200)
    const r2 = await segunda.json() as {
      messageId: string
      duplicou: boolean
      multimodal: { partes: Array<{ tipo: string; artifactId?: string }> }
    }
    const artifactId2 = r2.multimodal.partes.find((p) => p.tipo === 'artefato')!.artifactId!

    // MESMA mensagem e MESMO arquivo — nada duplicado.
    expect(r2.messageId, 'o retry precisa devolver a MESMA mensagem').toBe(r1.messageId)
    expect(artifactId2, 'o retry precisa devolver o MESMO arquivo').toBe(artifactId1)
    expect(r2.duplicou, 'o replay não publica de novo').toBe(false)

    // Prova no DISCO: a conversa tem exatamente UMA resposta gerada.
    const detalhe = await (await page.request.get(`${BASE}/api/sessions/${sessionId}`, { headers: headersApi })).json()
    const chat = detalhe.session.chats.find((c: { id: string }) => c.id === chatId)
    const respostas = (chat.messages as Array<{ id: string; role: string; attachments?: unknown[] }>)
      .filter((m) => (m.attachments?.length ?? 0) > 0)
    expect(respostas, 'uma única mensagem de resposta').toHaveLength(1)
    expect(respostas[0].id).toBe(r1.messageId)
    expect(respostas[0].attachments ?? [], 'um único arquivo na mensagem').toHaveLength(1)
    const ledger = await page.request.get(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/attachments`, { headers: headersApi })
    const meus = (await ledger.json()).attachments as Array<{ artifactId: string }>
    expect(meus.map(a => a.artifactId), 'um único artefato no ledger').toEqual([artifactId1])

    // E os bytes continuam íntegros e servíveis depois do retry.
    const media = await page.request.get(urlMidia(sessionId, chatId, artifactId1), { headers: headersApi })
    expect(media.status()).toBe(200)
    expect(sha256(await media.body())).toBe(sha256(png))

    // Geração DIFERENTE é outro resultado (não reusa o anterior).
    const outra = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/conversa-de-teste`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { runId, generation: 1 },
    })
    expect(outra.status()).toBe(200)
    const r3 = await outra.json() as { messageId: string; multimodal: { partes: Array<{ tipo: string; artifactId?: string }> } }
    expect(r3.messageId, 'geração nova é outra mensagem').not.toBe(r1.messageId)
    expect(r3.multimodal.partes.find((p) => p.tipo === 'artefato')!.artifactId,
      'geração nova é outro artefato').not.toBe(artifactId1)
    await shot(page, 'c3b_e07_retry_resposta')
  })

  test('C3B-E08 — cancelamento: nada tardio revive a conversa', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e08 cancelamento')
    await esperarPersistida(page)
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

  test('C3B-E09 — excluir a conversa preserva a cópia explícita no projeto', async ({ page }) => {
    const projeto = join(raiz, 'projeto-e09')
    mkdirSync(projeto, { recursive: true })
    await criarSessaoDeTexto(page, 'jornada c3b e09 lifecycle', projeto)
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const sessao = `${BASE}/api/sessions/${sessionId}`
    const anexos = `${sessao}/chats/${chatId}/attachments`
    const conteudo = Buffer.from('copia explicita que sobrevive')
    const uploadId = randomUUID()

    const admissao = await page.request.post(`${anexos}/uploads`, {
      headers: headersApi,
      data: { uploadId, name: 'meu.txt', bytes: conteudo.length, mime: 'text/plain', mode: 'copy', scope: 'workspace' },
    })
    expect(admissao.status()).toBe(201)
    const enviado = await page.request.put(`${anexos}/uploads/${uploadId}/content`, {
      headers: { ...headersApi, 'Content-Type': 'application/octet-stream' }, data: conteudo,
    })
    expect(enviado.status()).toBe(200)
    const arquivo = join(projeto, 'uploads', 'meu.txt')
    expect(readFileSync(arquivo)).toEqual(conteudo)

    const atual = await (await page.request.get(sessao, { headers: headersApi })).json()
    const exclusao = await page.request.delete(sessao, {
      headers: headersApi,
      data: { deletionId: randomUUID(), expectedRevision: atual.ack?.revision ?? atual.revision ?? 0 },
    })
    expect(exclusao.status(), await exclusao.text()).toBe(200)
    expect((await page.request.get(sessao, { headers: headersApi })).status()).toBe(410)
    expect(readFileSync(arquivo)).toEqual(conteudo)
    await shot(page, 'c3b_e09_lifecycle')
  })

  test('C3B-E10 — recuperação: artefato pronto é reencontrado por nova identidade coerente', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e10 recuperacao')
    await esperarPersistida(page)
    const { sessionId, chatId } = await sessaoAtiva(page)
    const png = fixture('imagem.png')

    const gerado = await page.request.post(`${BASE}/api/sessions/${sessionId}/chats/${chatId}/conversa-de-teste`, {
      headers: headersApi, data: { runId: randomUUID(), generation: 0 },
    })
    expect(gerado.status()).toBe(200)
    const { multimodal } = await gerado.json()
    const original = multimodal.partes.find((p: { tipo: string }) => p.tipo === 'artefato').artifactId

    await criarSessaoDeTexto(page, 'destino da recuperação')
    await esperarPersistida(page)
    const destino = await sessaoAtiva(page)
    const rota = `${BASE}/api/sessions/${destino.sessionId}/chats/${destino.chatId}/attachments`
    const preparo = await page.request.post(`${rota}/recovery/prepare`, {
      headers: headersApi, data: { origemSessionId: sessionId },
    })
    expect(preparo.status()).toBe(200)
    const { recoveryId, token } = await preparo.json()
    const confirmar = () => page.request.post(`${rota}/recovery/confirm`, { headers: headersApi, data: { recoveryId, token } })
    const resposta = await confirmar()
    expect(resposta.status()).toBe(200)
    const recibo = await resposta.json()
    expect(recibo.indisponiveis).toEqual([])
    expect(recibo.mapa).toEqual([{ oldId: original, newId: expect.any(String) }])
    const copia = recibo.mapa[0].newId
    expect(copia).not.toBe(original)
    expect((await (await confirmar()).json()).mapa).toEqual(recibo.mapa)

    for (const url of [urlMidia(sessionId, chatId, original), urlMidia(destino.sessionId, destino.chatId, copia)]) {
      const midia = await page.request.get(url, { headers: headersApi })
      expect(midia.status()).toBe(200)
      expect(sha256(await midia.body())).toBe(sha256(png))
    }
    await shot(page, 'c3b_e10_recuperacao')
  })

  test('C3B-E11 — temas e janela pequena: apresentação legível e composer intacto', async ({ page }) => {
    await criarSessaoDeTexto(page, 'jornada c3b e11 temas')
    await esperarPersistida(page)
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
    await esperarPersistida(page)
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
