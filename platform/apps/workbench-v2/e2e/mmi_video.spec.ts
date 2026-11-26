import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import sharp from 'sharp'

const porta = 5226, base = `http://127.0.0.1:${porta}`, modelo = 'visao-simulada'
const video = readFileSync(resolve('e2e/fixtures/quadro-vermelho.mp4'))
let raiz: string, app: ChildProcess, provedor: Server, endpoint = '', chamadas = 0, quadros = 0, erro = '', modo: 'direto' | 'posterior' | 'incompativel' = 'direto'
test.setTimeout(120_000)
test.beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'mmi-video-e2e-'))
  provedor = createServer((req, res) => {
    if (req.method === 'GET') { res.writeHead(404); res.end(); return }
    const partes: Buffer[] = []
    req.on('data', (parte: Buffer) => partes.push(parte))
    req.on('end', () => { void (async () => {
      chamadas++
      try {
        const raw = Buffer.concat(partes).toString()
        const corpo = JSON.parse(raw) as { model: string; stream: boolean; messages: Array<{ role: string; content: unknown }> }
        const modeloEsperado = modo === 'incompativel' ? 'modelo-sem-visao' : modelo
        if (req.url !== '/v1/chat/completions' || corpo.model !== modeloEsperado || !corpo.stream || raw.includes(video.toString('base64'))) throw new Error('rota, modelo ou vídeo original')
        const mensagem = corpo.messages.findLast(m => m.role === 'user')
        const sse = (delta: unknown) => {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.end(`data: ${JSON.stringify({ choices: [{ index: 0, delta, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`)
        }
        if (modo !== 'direto' && typeof mensagem?.content === 'string') {
          const resultados = corpo.messages.filter(m => m.role === 'tool')
          if (mensagem.content === 'Aguarde instruções.') { sse({ content: 'Aguardarei instruções.' }); return }
          if (mensagem.content !== 'Qual detalhe aparece no vídeo guardado?') throw new Error('pergunta inesperada')
          const acao = (nome: string, args: Record<string, unknown> = {}) => sse({ tool_calls: [{ index: 0, id: `call-${chamadas}`, type: 'function', function: { name: 'anexos', arguments: JSON.stringify({ acao: nome, ...args }) } }] })
          if (!resultados.length) { acao('listar'); return }
          if (resultados.length === 1) {
            const fontes = JSON.parse(String(resultados[0].content)) as Array<{ artifactId: string; nome: string }>
            const item = fontes.find(f => f.nome === 'guardado.mp4')
            if (!item) throw new Error('vídeo salvo não listado')
            acao('analisar_video', { artifactId: item.artifactId }); return
          }
          const analise = JSON.parse(String(resultados.at(-1)?.content)) as { representacao?: string; texto?: string; disponivel?: boolean; motivo?: string }
          if (modo === 'incompativel') {
            if (analise.disponivel !== false || !analise.motivo?.includes('não foi comprovado')) throw new Error('fallback de destino não comprovado ausente')
            sse({ content: 'A visão deste destino não foi comprovada.' }); return
          }
          if (analise.representacao !== 'análise visual do primeiro quadro' || !analise.texto?.includes('retângulo vermelho')) throw new Error('análise visual não chegou à ferramenta')
          sse({ content: 'No primeiro quadro há um retângulo vermelho.' }); return
        }
        if (modo === 'incompativel') throw new Error('quadro enviado ao destino não comprovado')
        if (!Array.isArray(mensagem?.content)) throw new Error('faltou quadro')
        const conteudo = mensagem.content as Array<{ type: string; text?: string; image_url?: { url: string } }>
        const pergunta = modo === 'direto' ? 'Qual detalhe aparece no primeiro quadro?' : 'Qual detalhe aparece no vídeo guardado?'
        if (conteudo.length !== 2 || conteudo[0].text !== pergunta || conteudo[1].type !== 'image_url') throw new Error('conteúdo inválido')
        const dataUrl = conteudo[1].image_url?.url ?? ''
        if (!dataUrl.startsWith('data:image/png;base64,')) throw new Error('quadro não é PNG')
        const quadro = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64')
        const decoded = await sharp(quadro).removeAlpha().raw().toBuffer({ resolveWithObject: true })
        const { data, info } = decoded
        if (info.width !== 160 || info.height !== 120 || info.channels !== 3) throw new Error('dimensões')
        const pixel = (x: number, y: number) => [...data.subarray((y * info.width + x) * 3, (y * info.width + x) * 3 + 3)]
        if (pixel(80, 60)[0] < 180 || pixel(80, 60)[2] > 50 || pixel(5, 5)[2] < 130) throw new Error('detalhe visual incorreto')
        quadros++
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: 'O primeiro quadro tem um retângulo vermelho.' }, finish_reason: 'stop' }] })}\n\n`)
        res.end('data: [DONE]\n\n')
      } catch (e) { erro = String(e); res.writeHead(400); res.end(erro) }
    })() })
  })
  provedor.listen(0, '127.0.0.1'); await once(provedor, 'listening')
  const addr = provedor.address(); if (!addr || typeof addr === 'string') throw new Error('sem porta')
  endpoint = `http://127.0.0.1:${addr.port}/v1`
  const comando = process.env.MMI_TEST_PRODUCTION === '1'
    ? [resolve('server.mjs')]
    : [resolve('../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(porta), '--strictPort']
  app = spawn(process.execPath, comando, {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, HOST: '127.0.0.1', PORT: String(porta), AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz, AGENTE_WINDOW_TEST_HOME: raiz, AGENTE_WINDOW_VISION_FIXTURE_URL: endpoint, AGENTE_WINDOW_VISION_FIXTURE_MODEL: modelo },
  })
  await expect.poll(async () => { try { return (await fetch(base)).status } catch { return 0 } }, { timeout: 60_000 }).toBe(200)
  const r = await fetch(`${base}/api/providers`, { method: 'PUT', headers: { Origin: base, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Simulador local', baseUrl: endpoint, modelo, modelosHabilitados: [modelo], apiKey: 'fixture-local' } } }) })
  expect(r.ok).toBe(true)
})
test.afterAll(async () => {
  if (app && app.exitCode === null) { const fim = once(app, 'exit'); app.kill('SIGKILL'); await fim }
  if (provedor) { provedor.closeAllConnections(); await new Promise<void>(ok => provedor.close(() => ok())) }
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test('MP4: cancela, confirma quadro e recebe resposta visual sem enviar o vídeo', async ({ page }) => {
  test.skip(!process.env.AGENTE_WINDOW_VIDEO_PYTHON, 'Decodificador local não configurado')
  await page.goto(base)
  await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill('Qual detalhe aparece no primeiro quadro?')
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'quadro.mp4', mimeType: 'video/mp4', buffer: video })
  const enviar = page.getByRole('button', { name: 'Enviar mensagem' })
  const dialogo = page.getByRole('dialog', { name: 'Enviar imagens e primeiro quadro de vídeo ao modelo?' })
  await enviar.click()
  await expect(dialogo).toContainText('primeiro quadro visual')
  await expect(dialogo).toContainText('nenhum áudio ou vídeo completo será enviado')
  await expect(dialogo).toContainText(modelo)
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(chamadas).toBe(0)
  await enviar.click()
  await dialogo.getByRole('button', { name: 'Enviar quadros e texto' }).click()
  await expect(page.getByText('O primeiro quadro tem um retângulo vermelho.')).toBeVisible({ timeout: 45_000 })
  expect(chamadas).toBe(1); expect(erro).toBe('')
  await page.reload()
  await expect(page.getByLabel(/quadro\.mp4.+quadro inicial enviado ao modelo/)).toBeVisible({ timeout: 30_000 })
  const sid = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
  const sessao = await (await page.request.get(`${base}/api/sessions/${sid}`, { headers })).json()
  const anexos = `${base}/api/sessions/${sid}/chats/${sessao.session.mainChatId}/attachments`
  const lista = await (await page.request.get(anexos, { headers })).json()
  const item = lista.attachments.find((a: { name: string }) => a.name === 'quadro.mp4')
  expect(item).toBeTruthy()
  expect((await (await page.request.get(`${anexos}/${item.artifactId}?download=1`, { headers })).body()).equals(video)).toBe(true)
})

test('vídeo guardado: ferramenta usa trabalho após nova tarefa, sem novo upload', async ({ page }) => {
  test.skip(!process.env.AGENTE_WINDOW_VIDEO_PYTHON, 'Decodificador local não configurado')
  modo = 'posterior'; erro = ''
  const inicioQuadros = quadros
  await page.goto(base)
  await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill('Aguarde instruções.')
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'guardado.mp4', mimeType: 'video/mp4', buffer: video })
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByText('Aguardarei instruções.')).toBeVisible({ timeout: 30_000 })
  expect(quadros).toBe(inicioQuadros)
  const sid = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
  const sessao = await (await page.request.get(`${base}/api/sessions/${sid}`, { headers })).json()
  const anexos = `${base}/api/sessions/${sid}/chats/${sessao.session.mainChatId}/attachments`
  const antes = await (await page.request.get(anexos, { headers })).json()
  expect(antes.attachments).toHaveLength(1)
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Qual detalhe aparece no vídeo guardado?')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  const card = page.getByRole('group', { name: 'Ferramenta: Inspecionar anexos desta conversa' }).filter({ hasText: 'Esperando você permitir' })
  await expect(card).toContainText('guardado.mp4', { timeout: 30_000 })
  await card.getByRole('button', { name: 'Permitir esta mexida' }).click()
  await expect(card).toContainText('primeiro quadro visual', { timeout: 30_000 })
  await expect(card).toContainText('Destino de visão comprovado')
  expect(quadros).toBe(inicioQuadros)
  await card.getByRole('button', { name: 'Permitir esta mexida' }).click()
  await expect(page.getByText('No primeiro quadro há um retângulo vermelho.')).toBeVisible({ timeout: 45_000 })
  expect(erro).toBe(''); expect(quadros).toBe(inicioQuadros + 1)
  const depois = await (await page.request.get(anexos, { headers })).json()
  expect(depois.attachments).toHaveLength(1)
  expect(depois.attachments[0].artifactId).toBe(antes.attachments[0].artifactId)
  expect((await (await page.request.get(`${anexos}/${antes.attachments[0].artifactId}?download=1`, { headers })).body()).equals(video)).toBe(true)
})

test('destino sem prova de visão recebe apenas motivo de indisponibilidade', async ({ page }) => {
  modo = 'incompativel'; erro = ''
  const inicioQuadros = quadros
  const novoModelo = 'modelo-sem-visao'
  const config = await page.request.put(`${base}/api/providers`, { headers: { Origin: base, 'Sec-Fetch-Site': 'same-origin' }, data: { ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Simulador local', baseUrl: endpoint, modelo: novoModelo, modelosHabilitados: [novoModelo], apiKey: 'fixture-local' } } } })
  expect(config.ok()).toBe(true)
  await page.goto(base)
  await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByRole('textbox', { name: 'Mensagem para a nova sessão' }).fill('Aguarde instruções.')
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'guardado.mp4', mimeType: 'video/mp4', buffer: video })
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.getByText('Aguardarei instruções.')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Qual detalhe aparece no vídeo guardado?')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  const card = page.getByRole('group', { name: 'Ferramenta: Inspecionar anexos desta conversa' }).filter({ hasText: 'Esperando você permitir' })
  await expect(card).toContainText('guardado.mp4', { timeout: 30_000 })
  await card.getByRole('button', { name: 'Permitir esta mexida' }).click()
  await expect(card).toContainText('destino de visão não foi comprovado', { timeout: 30_000 })
  await card.getByRole('button', { name: 'Permitir esta mexida' }).click()
  await expect(page.getByText('A visão deste destino não foi comprovada.')).toBeVisible({ timeout: 30_000 })
  expect(erro).toBe(''); expect(quadros).toBe(inicioQuadros)
})

