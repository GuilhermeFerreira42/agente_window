import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import WebSocket from 'ws'

// Smoke contra o build servido pelo server.mjs, não contra o servidor Vite.
const port = 5229, base = `http://127.0.0.1:${port}`
const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
let app: ChildProcess, data: string
async function iniciar() {
  app = spawn(process.execPath, [resolve('server.mjs')], {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', AGENTE_WINDOW_DATA_DIR: data, AGENTE_WINDOW_TEST_HOME: data, FS_TEST_ROOT: data },
  })
  await expect.poll(async () => { try { return (await fetch(`${base}/health`)).status } catch { return 0 } }, { timeout: 60_000 }).toBe(200)
}
async function parar() { if (app && app.exitCode === null) { const terminou = once(app, 'exit'); app.kill('SIGTERM'); await terminou } }
test.setTimeout(120_000)
test.beforeAll(async () => { data = mkdtempSync(join(tmpdir(), 'mmi-prod-')); await iniciar() })
test.afterAll(async () => { await parar(); rmSync(data, { recursive: true, force: true }) })

test('produção: sessão persistida e Explorer por chat sobrevivem reinício', async ({ request, page }) => {
  const sid = randomUUID(), a = randomUUID(), b = randomUUID()
  const session = { id: sid, title: 'Explorer de produção', workspace: 'Chat', workspacePath: null, contexto: { tipo: 'chat' }, section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: a,
    chats: [{ id: a, title: 'A', status: 'completed', messages: [] }, { id: b, title: 'B', status: 'completed', messages: [] }] }
  const criado = await request.post(`${base}/api/sessions`, { headers, data: { session, contexto: { tipo: 'chat' }, creationId: randomUUID() } })
  expect(criado.status(), await criado.text()).toBe(201)
  const root = async (chat: string) => {
    const resposta = await request.get(`${base}/api/explorer/${sid}/${chat}/fs/root`, { headers })
    expect(resposta.status(), await resposta.text()).toBe(200)
    return (await resposta.json()).root as string
  }
  const raizA = await root(a), raizB = await root(b)
  expect(raizA).not.toBe(raizB)
  const arquivo = `${raizA}/producao.txt`
  const socket = new WebSocket(`ws://127.0.0.1:${port}/api/explorer/${sid}/${a}/fs/watch`, { origin: base })
  try {
    const pronto = once(socket, 'message')
    await once(socket, 'open')
    expect(JSON.parse(String((await pronto)[0])).op).toBe('ready')
    const confirmado = once(socket, 'message')
    socket.send(JSON.stringify({ op: 'watch', uri: raizA }))
    expect(JSON.parse(String((await confirmado)[0]))).toMatchObject({ op: 'watched', uri: raizA })
    const alteracao = once(socket, 'message')
    expect((await request.post(`${base}/api/explorer/${sid}/${a}/fs/createFile`, { headers, data: { uri: arquivo, content: 'privado' } })).status()).toBe(201)
    expect(JSON.parse(String((await alteracao)[0])).type).toBe('fs.changed')
  } finally { socket.terminate() }
  expect((await request.get(`${base}/api/explorer/${sid}/${b}/fs/read?uri=${encodeURIComponent(arquivo)}`, { headers })).status()).toBe(403)
  expect((await request.get(`${base}/api/explorer/${sid}/${a}/fs/root`, { headers: { Origin: 'http://exemplo.invalid' } })).status()).toBe(403)
  const aberto = new WebSocket(`ws://127.0.0.1:${port}/api/explorer/${sid}/${a}/fs/watch`, { origin: base })
  await once(aberto, 'open')
  const fechado = once(aberto, 'close')
  await parar(); await fechado; await iniciar()
  expect(await root(a)).toBe(raizA)
  const lido = await request.get(`${base}/api/explorer/${sid}/${a}/fs/read?uri=${encodeURIComponent(arquivo)}`, { headers })
  expect((await lido.json()).content).toBe('privado')
  await page.goto(base)
  await page.locator('.session-row').filter({ hasText: 'Explorer de produção' }).first().click()
  await page.getByRole('tab', { name: 'A', exact: true }).click()
  const arvore = page.getByRole('tree', { name: 'Files Explorer' })
  await expect(arvore.getByRole('treeitem').filter({ hasText: 'producao.txt' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('tab', { name: 'B', exact: true }).click()
  await expect(arvore.getByRole('treeitem').filter({ hasText: 'producao.txt' })).toHaveCount(0)
  await page.reload()
  await page.locator('.session-row').filter({ hasText: 'Explorer de produção' }).first().click()
  await page.getByRole('tab', { name: 'A', exact: true }).click()
  await expect(arvore.getByRole('treeitem').filter({ hasText: 'producao.txt' })).toBeVisible({ timeout: 30_000 })
})
