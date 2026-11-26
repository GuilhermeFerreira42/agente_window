import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
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
  const anexos = `${base}/api/sessions/${sid}/chats/${a}/attachments`
  const original = Buffer.from('original imutável')
  const admissao = await request.post(`${anexos}/uploads`, { headers, data: { name: 'anexo.txt', bytes: original.length, mime: 'text/plain', mode: 'copy', scope: 'chat' } })
  expect(admissao.status()).toBe(201)
  const { uploadId } = await admissao.json()
  const transferencia = await request.put(`${anexos}/uploads/${uploadId}/content`, { headers: { ...headers, 'Content-Type': 'application/octet-stream' }, data: original })
  expect(transferencia.status()).toBe(200)
  const { artifactId } = await transferencia.json()
  const fs = `${base}/api/explorer/${sid}/${a}/fs`
  expect((await request.post(`${fs}/write`, { headers, data: { uri: `${raizA}/anexo.txt`, content: 'versão editada' } })).status()).toBe(204)
  expect((await request.post(`${fs}/rename`, { headers, data: { from: `${raizA}/anexo.txt`, to: `${raizA}/alterado.txt` } })).status()).toBe(204)
  expect((await (await request.get(`${anexos}/${artifactId}?download=1`, { headers })).body()).equals(original)).toBe(true)
  expect((await request.post(`${fs}/delete`, { headers, data: { uri: `${raizA}/alterado.txt` } })).status()).toBe(204)
  expect((await request.post(`${fs}/createFile`, { headers, data: { uri: `${raizA}/alterado.txt`, content: 'arquivo substituto' } })).status()).toBe(201)
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
  expect((await (await request.get(`${fs}/read?uri=${encodeURIComponent(`${raizA}/alterado.txt`)}`, { headers })).json()).content).toBe('arquivo substituto')
  expect((await (await request.get(`${anexos}/${artifactId}?download=1`, { headers })).body()).equals(original)).toBe(true)
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

test('produção: sessões de projeto compartilham movimento e preservam o original', async ({ request }) => {
  const projeto = join(data, 'projeto')
  mkdirSync(projeto)
  const criarSessao = async () => {
    const sid = randomUUID(), chat = randomUUID()
    const session = { id: sid, title: 'Projeto compartilhado', workspace: 'Projeto', workspacePath: projeto, contexto: { tipo: 'workspace' }, section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: chat,
      chats: [{ id: chat, title: 'Principal', status: 'completed', messages: [] }] }
    const res = await request.post(`${base}/api/sessions`, { headers, data: { session, contexto: { tipo: 'workspace', path: projeto }, creationId: randomUUID() } })
    expect(res.status(), await res.text()).toBe(201)
    return { sid, chat }
  }
  const a = await criarSessao(), b = await criarSessao()
  const anexos = `${base}/api/sessions/${a.sid}/chats/${a.chat}/attachments`
  const fs = `${base}/api/explorer/${b.sid}/${b.chat}/fs`
  const raiz = (await (await request.get(`${fs}/root`, { headers })).json()).root
  const original = Buffer.from('original do projeto')
  const admissao = await request.post(`${anexos}/uploads`, { headers, data: { name: 'projeto.txt', bytes: original.length, mime: 'text/plain', mode: 'copy', scope: 'workspace', workspaceRoot: projeto } })
  expect(admissao.status(), await admissao.text()).toBe(201)
  const { uploadId } = await admissao.json()
  const transferencia = await request.put(`${anexos}/uploads/${uploadId}/content`, { headers: { ...headers, 'Content-Type': 'application/octet-stream' }, data: original })
  expect(transferencia.status(), await transferencia.text()).toBe(200)
  const { artifactId } = await transferencia.json()
  expect((await request.post(`${fs}/write`, { headers, data: { uri: `${raiz}/uploads/projeto.txt`, content: 'edição compartilhada' } })).status()).toBe(204)
  expect((await request.post(`${fs}/rename`, { headers, data: { from: `${raiz}/uploads/projeto.txt`, to: `${raiz}/movido.txt` } })).status()).toBe(204)
  await parar(); await iniciar()
  expect((await (await request.get(`${fs}/read?uri=${encodeURIComponent(`${raiz}/movido.txt`)}`, { headers })).json()).content).toBe('edição compartilhada')
  expect((await (await request.get(`${anexos}/${artifactId}?download=1`, { headers })).body()).equals(original)).toBe(true)
  expect((await request.post(`${fs}/delete`, { headers, data: { uri: `${raiz}/movido.txt` } })).status()).toBe(204)
  expect((await request.post(`${fs}/createFile`, { headers, data: { uri: `${raiz}/movido.txt`, content: 'substituto' } })).status()).toBe(201)
  await parar(); await iniciar()
  expect((await (await request.get(`${fs}/read?uri=${encodeURIComponent(`${raiz}/movido.txt`)}`, { headers })).json()).content).toBe('substituto')
  expect((await (await request.get(`${anexos}/${artifactId}?download=1`, { headers })).body()).equals(original)).toBe(true)
})
