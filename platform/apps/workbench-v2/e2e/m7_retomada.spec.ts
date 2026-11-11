import { expect, test } from '@playwright/test'
import { createHash, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const baseURL = process.env.M7_E2E_BASE_URL
const workspace = process.env.M7_E2E_WORKSPACE
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige servidor e workspace descartáveis')

test.describe('M7 — revisão operacional', () => {
  test('reabre recibos, bloqueia efeito incerto e só inicia planejamento após confirmação', async ({ page }) => {
    test.setTimeout(60_000)
    const nonce = Date.now()
    const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
    const permitido = `m7-conhecida-${nonce}`
    const incerto = `m7-incerta-${nonce}`
    const runId = randomUUID()
    const arquivo = `m7-sentinel-${nonce}.txt`
    await writeFile(join(workspace!, arquivo), 'PRESERVAR')
    const pedidos: Array<{ tools: unknown[] }> = []
    const provedor = createServer(async (req, res) => {
      const partes: Buffer[] = []
      for await (const chunk of req) partes.push(chunk)
      pedidos.push(JSON.parse(Buffer.concat(partes).toString('utf8')))
      const delta = pedidos.length === 1 ? { tool_calls: [{ index: 0, id: 'nao-repetir', function: {
        name: 'escrever', arguments: JSON.stringify({ caminho: arquivo, conteudo: 'NAO_PUBLICAR' }),
      } }] } : { content: 'Planejamento novo: conferir os recibos antes de nova ação.' }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\ndata: [DONE]\n\n`)
    })
    await new Promise<void>((resolve) => provedor.listen(0, '127.0.0.1', resolve))
    try {
      const endereco = provedor.address()
      if (!endereco || typeof endereco === 'string') throw new Error('Provedor de teste indisponível')
      expect((await page.request.put('/api/providers', { headers, data: {
        ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Fixture M7', modelo: 'm7-fixture',
          baseUrl: `http://127.0.0.1:${endereco.port}/v1`, apiKey: 'fixture' } },
      } })).ok()).toBe(true)
      for (const [id, completou] of [[permitido, true], [incerto, false]] as const) {
        const session = { id, slug: id, title: id, workspace: 'Fixture M7', workspacePath: workspace,
          section: 'today', status: 'working', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
          mainChatId: 'main', persistenceRevision: 1, chats: [{ id: 'main', title: 'Main', status: 'working',
            messages: [{ id: 'u1', role: 'user', content: 'Confira a tarefa sintética', time: '10:00' }] }] }
        expect((await page.request.put('/api/sessions', { headers, data: { session } })).ok()).toBe(true)
        const path = join(workspace!, 'data', 'projects', id, `${id}.jsonl`)
        const anterior = await readFile(path, 'utf8')
        const eventos = [{ tipo: 'chamada', chamadaId: 'a'.repeat(64), ferramenta: 'escrever' },
          ...(completou ? [{ tipo: 'resultado', chamadaId: 'a'.repeat(64), ferramenta: 'escrever', ok: true, efeitoIniciado: true }] : [])]
        const escopo = createHash('sha256').update(workspace!).digest('hex')
        await writeFile(path, anterior + eventos.map((evento, indice) => JSON.stringify({
          type: 'agir_event', chatId: 'main', uuid: `${runId}:${indice + 1}`, timestamp: 1, sequence: indice + 1,
          message: { version: 1, runId, pedidoId: 'u1', turnoId: 'resposta', escopo, git: null, evento },
        })).join('\n') + '\n')
      }
      await page.goto('/')
      await page.locator('.session-row').filter({ hasText: incerto }).click()
      const painelIncerto = page.locator(`.chat-pane[data-session-id="${incerto}"]`)
      await painelIncerto.getByRole('button', { name: 'Execução interrompida: revisar tarefa' }).click()
      const revisaoIncerta = painelIncerto.getByRole('region', { name: 'Revisão da tarefa interrompida' })
      await expect(revisaoIncerta.getByText('escrever · incerta')).toBeVisible()
      await expect(revisaoIncerta.getByRole('button', { name: 'Retomar planejamento' })).toBeDisabled()
      expect(pedidos).toHaveLength(0)
      await page.locator('.session-row').filter({ hasText: permitido }).click()
      const painel = page.locator(`.chat-pane[data-session-id="${permitido}"]`)
      await painel.getByRole('button', { name: 'Execução interrompida: revisar tarefa' }).click()
      const revisao = painel.getByRole('region', { name: 'Revisão da tarefa interrompida' })
      await expect(revisao.getByText('escrever · concluida')).toBeVisible()
      await expect(revisao.getByText(/Aprovações anteriores expiraram/)).toBeVisible()
      expect(pedidos).toHaveLength(0)
      page.once('dialog', (dialog) => void dialog.accept())
      await revisao.getByRole('button', { name: 'Retomar planejamento' }).click()
      await expect(page.getByText('Planejamento novo: conferir os recibos antes de nova ação.')).toBeVisible()
      expect(pedidos[0].tools).toEqual([])
      expect(await readFile(join(workspace!, arquivo), 'utf8')).toBe('PRESERVAR')
      expect(pedidos).toHaveLength(2)
    } finally {
      await new Promise<void>((resolve) => provedor.close(() => resolve()))
    }
  })
})
