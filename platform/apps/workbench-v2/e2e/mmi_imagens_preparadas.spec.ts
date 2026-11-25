import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { criarProvedorVisaoLocal } from './fixtures/provedorVisaoLocal'

const porta = 5224, base = `http://127.0.0.1:${porta}`
const texto = 'Descreva a imagem sintética.', modelo = 'modelo-local-fixo'
const digest = (x: Buffer) => createHash('sha256').update(x).digest('hex')
let processo: ChildProcess, raiz: string, webp: Buffer, grande: Buffer
let provedor: Awaited<ReturnType<typeof criarProvedorVisaoLocal>>
test.setTimeout(120_000)
test.beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'mmi-imagens-e2e-'))
  webp = await sharp({ create: { width: 40, height: 20, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).webp({ lossless: true }).toBuffer()
  grande = await sharp({ create: { width: 2048, height: 1200, channels: 4, background: { r: 0, g: 128, b: 40, alpha: 0.6 } } }).png().toBuffer()
  const preparado = async (bytes: Buffer) => sharp(bytes, { failOn: 'warning', limitInputPixels: 12 * 1024 * 1024, sequentialRead: true }).rotate().toColourspace('srgb').resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  // Expectativas foram calculadas independentemente do serviço de produto.
  provedor = await criarProvedorVisaoLocal([
    { texto, modelo, imagens: [{ mime: 'image/png', sha256: digest(await preparado(webp)) }] },
    { texto, modelo, imagens: [{ mime: 'image/png', sha256: digest(await preparado(grande)) }] },
  ])
  processo = spawn(process.execPath, [resolve('../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(porta), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz, AGENTE_WINDOW_TEST_HOME: raiz, AGENTE_WINDOW_VISION_FIXTURE_URL: provedor.baseUrl, AGENTE_WINDOW_VISION_FIXTURE_MODEL: modelo },
  })
  await expect.poll(async () => { try { return (await fetch(base)).status } catch { return 0 } }, { timeout: 60_000 }).toBe(200)
  const resposta = await fetch(`${base}/api/providers`, { method: 'PUT', headers: { Origin: base, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Simulador local', baseUrl: provedor.baseUrl, modelo, modelosHabilitados: [modelo], apiKey: 'fixture-local' } } }) })
  expect(resposta.ok).toBe(true)
})
test.afterAll(async () => {
  if (processo && processo.exitCode === null) { const terminou = new Promise<void>(ok => processo.once('exit', () => ok())); processo.kill('SIGKILL'); await terminou }
  if (provedor) await provedor.fechar()
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})
test('WebP e PNG grande: confirma, envia cópia e recupera o original após F5', async ({ page }) => {
  await page.goto(base)
  const landing = page.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
  await landing.fill(texto)
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'original.webp', mimeType: 'image/webp', buffer: webp })
  const enviar = page.getByRole('button', { name: 'Enviar mensagem' })
  const dialogo = page.getByRole('dialog', { name: 'Enviar imagens ao modelo?' })
  await enviar.click()
  await expect(dialogo).toContainText('original.webp')
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(landing).toHaveValue(texto)
  expect(provedor.requisicoes).toHaveLength(0)
  await enviar.click(); await dialogo.getByRole('button', { name: 'Enviar imagens e texto' }).click()
  await expect(page.getByText('Resposta simulada.').first()).toBeVisible({ timeout: 30_000 })
  expect(provedor.registros[0]).toMatchObject({ valido: true })
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.locator('.chat-input-container input[type="file"]').first().setInputFiles({ name: 'grande.png', mimeType: 'image/png', buffer: grande })
  await enviar.click(); await expect(dialogo).toContainText('grande.png'); await dialogo.getByRole('button', { name: 'Enviar imagens e texto' }).click()
  await expect(page.getByText('Resposta simulada.')).toHaveCount(2, { timeout: 30_000 })
  expect(provedor.registros[1]).toMatchObject({ valido: true })
  await page.reload()
  await expect(page.getByLabel(/grande\.png.+Armazenado e enviado ao modelo/)).toBeVisible({ timeout: 30_000 })
  const fontes = page.getByRole('region', { name: 'Fontes' })
  await expect(fontes.getByText('original.webp')).toBeVisible({ timeout: 30_000 })
  await expect(fontes.getByText('grande.png')).toBeVisible()
  const id = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
  const sessao = await (await page.request.get(`${base}/api/sessions/${id}`, { headers })).json()
  const chat = sessao.session.chats.find((c: { id: string }) => c.id === sessao.session.mainChatId)
  const lista = await (await page.request.get(`${base}/api/sessions/${id}/chats/${chat.id}/attachments`, { headers })).json()
  for (const [nome, original] of [['original.webp', webp], ['grande.png', grande]] as const) {
    const item = lista.attachments.find((a: { name: string }) => a.name === nome)
    expect(item).toBeTruthy()
    const resposta = await page.request.get(`${base}/api/sessions/${id}/chats/${chat.id}/attachments/${item.artifactId}?download=1`, { headers })
    expect(resposta.ok()).toBe(true)
    expect(digest(await resposta.body())).toBe(digest(original))
  }
  await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'segredo-b.txt', mimeType: 'text/plain', buffer: Buffer.from('somente B') })
  await enviar.click()
  await expect(fontes.getByText('segredo-b.txt')).toBeVisible({ timeout: 30_000 })
  await expect(fontes.getByText('original.webp')).toHaveCount(0)
  const idB = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  const sessaoB = await (await page.request.get(`${base}/api/sessions/${idB}`, { headers })).json()
  const chatB = sessaoB.session.mainChatId
  const listaB = await (await page.request.get(`${base}/api/sessions/${idB}/chats/${chatB}/attachments`, { headers })).json()
  const b = listaB.attachments.find((a: { name: string }) => a.name === 'segredo-b.txt')
  expect(b).toBeTruthy()
  const imagemA = lista.attachments.find((a: { name: string }) => a.name === 'original.webp')
  for (const [sessaoDona, chatDono, alheio] of [[id, chat.id, b.artifactId], [idB, chatB, imagemA.artifactId]]) {
    const rota = `${base}/api/sessions/${sessaoDona}/chats/${chatDono}/attachments/${alheio}`
    expect((await page.request.get(rota, { headers })).status()).toBe(404)
    expect((await page.request.get(`${rota}?download=1`, { headers })).status()).toBe(404)
    expect((await page.request.get(`${rota}/media`, { headers })).status()).toBe(404)
    expect((await page.request.head(`${rota}/media`, { headers })).status()).toBe(404)
  }
  const previewA = `${base}/api/sessions/${id}/chats/${chat.id}/attachments/${imagemA.artifactId}/media`
  expect((await page.request.get(previewA, { headers })).status()).toBe(200)
  expect((await page.request.head(previewA, { headers })).status()).toBe(200)
  await page.locator('.session-row').filter({ hasText: texto.slice(0, 20) }).first().click()
  await expect(fontes.getByText('original.webp')).toBeVisible({ timeout: 30_000 })
  await expect(fontes.getByText('segredo-b.txt')).toHaveCount(0)
  await page.reload()
  await expect(fontes.getByText('original.webp')).toBeVisible({ timeout: 30_000 })
  await expect(fontes.getByText('segredo-b.txt')).toHaveCount(0)
})
