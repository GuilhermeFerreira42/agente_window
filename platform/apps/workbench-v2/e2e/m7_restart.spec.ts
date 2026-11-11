import { expect, test } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

test.skip(process.env.M7_CRASH_FIXTURE !== '1', 'Teste de processo descartável, receita em docs/09')
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = 'http://127.0.0.1:5210'

test.describe('M7 — interrupção real de servidor', () => {
  test('preserva a escrita confirmada sem repetir efeitos depois do reinício', async ({ page }) => {
    test.setTimeout(90_000)
    const raiz = await mkdtemp(join(tmpdir(), 'm7-crash-'))
    let processo: ChildProcess | undefined
    const mensagens: unknown[] = []
    const bloqueados = new Set<import('node:http').ServerResponse>()
    const provedor = createServer(async (req, res) => {
      if (req.method !== 'POST') { res.writeHead(404).end(); return }
      const partes: Buffer[] = []
      for await (const chunk of req) partes.push(chunk)
      mensagens.push(JSON.parse(Buffer.concat(partes).toString('utf8')))
      if (mensagens.length === 2) {
        bloqueados.add(res)
        res.on('close', () => bloqueados.delete(res))
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(`data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'criar-unico',
        function: { name: 'criar', arguments: '{"caminho":"sentinela.txt","conteudo":"PUBLICADO_UMA_VEZ"}' } }] } }] })}\n\n`)
    })
    await new Promise<void>((resolve) => provedor.listen(0, '127.0.0.1', resolve))
    async function iniciar() {
      processo = spawn(process.execPath, [resolve(app, '../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5210', '--strictPort'], {
        cwd: app, windowsHide: true, stdio: 'ignore',
        env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), FS_TEST_ROOT: raiz,
          AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'),
          AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'),
          AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json') },
      })
      await expect.poll(async () => {
        try { return (await page.request.get(base)).status() } catch { return 0 }
      }, { timeout: 20_000 }).toBe(200)
    }
    async function parar() {
      if (!processo || processo.exitCode !== null) return
      const terminou = new Promise<void>((resolve) => processo!.once('exit', () => resolve()))
      processo.kill('SIGKILL')
      await terminou
    }
    try {
      await iniciar()
      const endereco = provedor.address()
      if (!endereco || typeof endereco === 'string') throw new Error('Provedor indisponível')
      const headers = { Origin: base, 'Sec-Fetch-Site': 'same-origin' }
      expect((await page.request.put(base + '/api/providers', { headers, data: {
        ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Fixture restart', modelo: 'fixture',
          baseUrl: `http://127.0.0.1:${endereco.port}/v1`, apiKey: 'fixture' } },
      } })).ok()).toBe(true)
      const id = 'm7-crash-session'
      expect((await page.request.put(base + '/api/sessions', { headers, data: { session: {
        id, slug: id, title: id, workspace: 'Fixture', workspacePath: raiz, section: 'today', status: 'completed',
        updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: 1,
        chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [] }],
      } } })).ok()).toBe(true)
      await page.goto(base)
      await page.locator('.session-row').filter({ hasText: id }).click()
      await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Crie a sentinela sintética')
      await page.getByRole('button', { name: 'Enviar mensagem' }).click()
      await expect.poll(() => mensagens.length).toBe(2)
      expect(await readFile(join(raiz, 'sentinela.txt'), 'utf8')).toBe('PUBLICADO_UMA_VEZ')
      await parar()
      await page.goto('about:blank')
      for (const res of bloqueados) res.destroy()
      await iniciar()
      const restauradas = (await (await page.request.get(base + '/api/sessions', { headers })).json()).sessions
      expect(restauradas.find((s: { id: string }) => s.id === id)?.chats[0].revisaoOperacional).toBe(true)
      await page.goto(base)
      await page.locator('.session-row').filter({ hasText: id }).click()
      await page.getByRole('button', { name: 'Execução interrompida: revisar tarefa' }).click()
      const revisao = page.getByRole('region', { name: 'Revisão da tarefa interrompida' })
      await expect(revisao.getByText('criar · concluida')).toBeVisible()
      expect(mensagens).toHaveLength(2)
      expect(await readFile(join(raiz, 'sentinela.txt'), 'utf8')).toBe('PUBLICADO_UMA_VEZ')
      expect((await page.request.post(base + '/api/agir/aprovar', { headers,
        data: { fluxo: 'antigo', id: 'criar-unico', sessionId: id, runId: 'expirado', generation: 1, decisao: 'permitir' } })).status()).toBe(409)
      expect(mensagens).toHaveLength(2)
    } finally {
      await parar()
      for (const res of bloqueados) res.destroy()
      await new Promise<void>((resolve) => provedor.close(() => resolve()))
    }
  })
})
