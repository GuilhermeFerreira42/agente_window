import { createHash } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { criarProvedorVisaoLocal } from './fixtures/provedorVisaoLocal'

const porta = 5223
const base = `http://127.0.0.1:${porta}`
const texto = 'Pergunta para o simulador local.'
const modelo = 'modelo-local-fixo'
let processo: ChildProcess
let raiz: string
const png = new PNG({ width: 1, height: 1 }); png.data = Buffer.from([255, 0, 0, 255])
const pngBytes = PNG.sync.write(png)
const jpgBytes = Buffer.from(jpeg.encode({ width: 1, height: 1, data: Buffer.from([0, 0, 255, 255]) }, 80).data)
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
let provedor: Awaited<ReturnType<typeof criarProvedorVisaoLocal>>
const esperadoJpeg = { texto, modelo, imagens: [{ mime: 'image/jpeg' as const, sha256: digest(jpgBytes) }] }

async function aguardarPublicacao(page: Page, arquivo: string): Promise<void> {
  const id = await page.evaluate(() => localStorage.getItem('workbench.sessions.active.v1'))
  await expect.poll(async () => {
    const session = await page.evaluate(async (sessionId) => {
      const resposta = await fetch('/api/sessions/' + encodeURIComponent(sessionId ?? ''))
      return resposta.ok ? (await resposta.json()).session : undefined
    }, id)
    if (!session) return false
    return session.chats.some((chat: { messages: Array<{ running?: boolean; content: string; attachments?: Array<{ name: string; envioModelo?: string }> }> }) =>
      chat.messages.some(msg => msg.attachments?.some(anexo => anexo.name === arquivo && anexo.envioModelo === 'enviado')) &&
      chat.messages.at(-1)?.content === 'Resposta simulada.' && !chat.messages.at(-1)?.running)
  }).toBe(true)
}

test.setTimeout(120_000)
test.beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'mmi-local-e2e-'))
  provedor = await criarProvedorVisaoLocal([{ texto, modelo, imagens: [{ mime: 'image/png', sha256: digest(pngBytes) }] }, esperadoJpeg, esperadoJpeg, esperadoJpeg])
  processo = spawn(process.execPath, [resolve('../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(porta), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz, AGENTE_WINDOW_TEST_HOME: raiz, AGENTE_WINDOW_VISION_FIXTURE_URL: provedor.baseUrl, AGENTE_WINDOW_VISION_FIXTURE_MODEL: modelo },
  })
  await expect.poll(async () => { try { return (await fetch(base)).status } catch { return 0 } }, { timeout: 60_000 }).toBe(200)
  const resposta = await fetch(`${base}/api/providers`, {
    method: 'PUT', headers: { Origin: base, 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Simulador local', baseUrl: provedor.baseUrl, modelo, modelosHabilitados: [modelo], apiKey: 'fixture-local' } } }),
  })
  expect(resposta.ok).toBe(true)
})
test.afterAll(async () => {
  if (processo && processo.exitCode === null) {
    const terminou = new Promise<void>(ok => processo.once('exit', () => ok()))
    processo.kill('SIGKILL'); await terminou
  }
  if (provedor) await provedor.fechar()
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test('MMI-01/02 — PNG no primeiro envio e JPEG na conversa são confirmados, transmitidos e persistidos', async ({ page }) => {
  await page.goto(base)
  const landing = page.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
  await landing.fill(texto)
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles([
    { name: 'primeira.png', mimeType: 'image/png', buffer: pngBytes },
    { name: 'fora-do-escopo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('Documento sintético armazenado') },
  ])
  const enviar = page.getByRole('button', { name: 'Enviar mensagem' })
  const dialogo = page.getByRole('dialog', { name: 'Enviar imagens ao modelo?' })
  await enviar.click()
  await expect(dialogo).toContainText('primeira.png')
  await expect(dialogo).toContainText('ficarão apenas armazenados: fora-do-escopo.pdf')
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(landing).toHaveValue(texto)
  expect(provedor.requisicoes).toHaveLength(0)
  await enviar.click()
  await dialogo.getByRole('button', { name: 'Enviar imagens e texto' }).click()
  await expect(page.getByText('Resposta simulada.').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByLabel(/primeira\.png.+Armazenado e enviado ao modelo/)).toBeVisible()
  expect(provedor.registros).toHaveLength(1)
  expect(provedor.registros[0]).toMatchObject({ valido: true, modelo, imagens: [{ mime: 'image/png', sha256: digest(pngBytes) }] })
  await aguardarPublicacao(page, 'primeira.png')
  await page.reload()
  await expect(page.getByLabel(/primeira\.png.+Armazenado e enviado ao modelo/)).toBeVisible({ timeout: 30_000 })
  expect(provedor.registros).toHaveLength(1)

  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.locator('.chat-input-container input[type="file"]').first().setInputFiles({ name: 'segunda.jpg', mimeType: 'image/jpeg', buffer: jpgBytes })
  await enviar.click()
  await expect(dialogo).toContainText('segunda.jpg')
  await dialogo.getByRole('button', { name: 'Enviar imagens e texto' }).click()
  await expect(page.getByText('Resposta simulada.')).toHaveCount(2, { timeout: 30_000 })
  await expect(page.getByLabel(/segunda\.jpg.+Armazenado e enviado ao modelo/)).toBeVisible()
  expect(provedor.registros).toHaveLength(2)
  expect(provedor.registros[1]).toMatchObject({ valido: true, modelo, imagens: [{ mime: 'image/jpeg', sha256: digest(jpgBytes) }] })
  await aguardarPublicacao(page, 'segunda.jpg')
  await page.getByRole('button', { name: 'Regenerar' }).click()
  await expect(dialogo).toContainText('segunda.jpg')
  await dialogo.getByRole('button', { name: 'Enviar imagens e texto' }).click()
  await expect.poll(() => provedor.registros.length).toBe(3)
  expect(provedor.registros[2]).toMatchObject({ valido: true, ...esperadoJpeg })
  await expect(page.getByText('Resposta simulada.')).toHaveCount(2)
  await expect(page.getByLabel(/segunda\.jpg.+Armazenado e enviado ao modelo/)).toHaveCount(1)

  const workspace = join(raiz, 'projeto')
  mkdirSync(workspace)
  await page.locator('.sessions-sidebar').getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByTestId('landing-contexto').click()
  const caminho = page.getByLabel('Buscar ou digitar caminho da pasta')
  await caminho.fill(workspace)
  await caminho.press('Enter')
  await expect(page.getByTestId('landing-contexto')).toHaveAttribute('aria-label', /Workspace atual:/)
  await page.getByRole('button', { name: 'Modo: Agente' }).click()
  await page.getByRole('menuitemradio', { name: 'Perguntar' }).click()
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({
    name: 'abrir-workspace.txt', mimeType: 'text/plain', buffer: Buffer.from('Somente armazenamento'),
  })
  await enviar.click()
  const chatWorkspace = page.getByRole('textbox', { name: 'Mensagem para o agente' })
  await chatWorkspace.fill(texto)
  await page.locator('.chat-input-container input[type="file"]').first().setInputFiles({ name: 'projeto.jpg', mimeType: 'image/jpeg', buffer: jpgBytes })
  await enviar.click()
  await expect(dialogo).toContainText('projeto.jpg')
  await dialogo.getByRole('button', { name: 'Enviar imagens e texto' }).click()
  await expect(page.getByLabel(/projeto\.jpg.+Armazenado e enviado ao modelo/)).toBeVisible({ timeout: 30_000 })
  await aguardarPublicacao(page, 'projeto.jpg')
  expect(provedor.registros[3]).toMatchObject({ valido: true, ...esperadoJpeg })
})
