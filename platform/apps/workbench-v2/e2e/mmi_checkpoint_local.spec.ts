// Checkpoint PARCIAL: exercita o fallback sem visão existente, NÃO a entrega
// MMI-01/02. O simulador escuta somente loopback e não acessa provedor real.
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'
import { criarProvedorVisaoLocal } from './fixtures/provedorVisaoLocal'

const porta = 5222
const base = `http://127.0.0.1:${porta}`
const texto = 'Pergunta para o simulador local.'
const modelo = 'modelo-local-fixo'
let processo: ChildProcess
let raiz: string
let provedor: Awaited<ReturnType<typeof criarProvedorVisaoLocal>>

test.setTimeout(120_000)
test.beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'mmi-local-e2e-'))
  provedor = await criarProvedorVisaoLocal({ texto, modelo, imagens: [] })
  processo = spawn(process.execPath, [resolve('../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(porta), '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz },
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

test('fallback desconhecido: cancelar preserva os dois rascunhos; aceitar envia só texto e arquivo sobrevive a F5', async ({ page }) => {
  const png = new PNG({ width: 1, height: 1 }); png.data = Buffer.from([255, 0, 0, 255])
  await page.goto(base)
  await page.locator('.agent-sessions-workbench').waitFor()
  const landing = page.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
  await landing.fill(texto)
  await page.getByLabel('Selecionar arquivos para anexar').setInputFiles({ name: 'sintetica.png', mimeType: 'image/png', buffer: PNG.sync.write(png) })
  const chamadasAntesLanding = provedor.requisicoes.length
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  const dialogo = page.getByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados/ })
  await expect(dialogo).toContainText('sintetica.png')
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(landing).toHaveValue(texto)
  await expect(page.getByRole('group', { name: /sintetica\.png/ })).toBeVisible()
  expect(provedor.registros).toHaveLength(0)
  expect(provedor.requisicoes).toHaveLength(chamadasAntesLanding)

  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await dialogo.getByRole('button', { name: 'Continuar com o texto' }).click()
  await expect(page.getByText('Resposta simulada.', { exact: false }).first()).toBeVisible({ timeout: 30_000 })
  expect(provedor.registros).toEqual([{ caminho: '/v1/chat/completions', modelo, texto, imagens: [], valido: true }])
  await expect(page.getByRole('list', { name: 'Anexos enviados' }).getByText('sintetica.png')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('list', { name: 'Anexos enviados' }).getByText('sintetica.png')).toBeVisible({ timeout: 30_000 })
  expect(provedor.registros).toHaveLength(1)

  const jpg = jpeg.encode({ width: 1, height: 1, data: Buffer.from([0, 0, 255, 255]) }, 80).data
  const chat = page.getByRole('textbox', { name: 'Mensagem para o agente' })
  await chat.fill('Outra pergunta preservada.')
  await page.locator('.chat-input-container input[type="file"]').first().setInputFiles({ name: 'azul.jpg', mimeType: 'image/jpeg', buffer: jpg })
  const chamadasAntesChat = provedor.requisicoes.length
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(dialogo).toContainText('azul.jpg')
  await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(chat).toHaveValue('Outra pergunta preservada.')
  await expect(page.getByRole('group', { name: /azul\.jpg/ })).toBeVisible()
  expect(provedor.registros).toHaveLength(1)
  expect(provedor.requisicoes).toHaveLength(chamadasAntesChat)
})
