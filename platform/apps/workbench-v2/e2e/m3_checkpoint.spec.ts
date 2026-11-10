import { expect, test } from '@playwright/test'
import { createServer } from 'node:http'

const baseURL = process.env.M3_E2E_BASE_URL
const workspace = process.env.M3_E2E_WORKSPACE
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige servidor e workspace descartáveis')

test.describe('M3 — compactação manual', () => {
  test('mantém os originais e substitui somente o prefixo no próximo pedido', async ({ page }) => {
    const pedidos: Array<{ messages: Array<{ role: string; content: string }> }> = []
    let compactacoes = 0
    let liberarPrimeira!: () => void
    const esperaPrimeira = new Promise<void>((resolve) => { liberarPrimeira = resolve })
    const provedor = createServer(async (req, res) => {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk)
      pedidos.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      const compactando = pedidos.at(-1)?.messages[0]?.content.includes('Produza um resumo de continuidade')
      if (compactando) compactacoes += 1
      if (compactando && compactacoes === 1) await esperaPrimeira
      const content = compactando
        ? compactacoes === 1 ? 'Resumo derivado do primeiro turno.' : compactacoes === 2 ? '' : 'Resumo atualizado de dois turnos.'
        : 'Continuei a partir do resumo.'
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`)
    })
    await new Promise<void>((resolve) => provedor.listen(0, '127.0.0.1', resolve))
    try {
      const endereco = provedor.address()
      if (!endereco || typeof endereco === 'string') throw new Error('Provedor de teste indisponível')
      const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
      expect((await page.request.put('/api/providers', {
        headers,
        data: { ativo: 'openai-compat', provedores: { 'openai-compat': {
          nome: 'Fixture M3', baseUrl: `http://127.0.0.1:${endereco.port}/v1`, modelo: 'm3-fixture', apiKey: 'fixture',
        } } },
      })).ok()).toBe(true)
      const id = `m3-checkpoint-${Date.now()}`
      const original = 'ORIGINAL PRIMEIRO TURNO ' + 'fonte '.repeat(500)
      const mensagens = [original, 'Resposta antiga', 'Segunda pergunta', 'Segunda resposta', 'Terceira pergunta', 'Terceira resposta']
        .map((content, index) => ({ id: `m${index}`, role: index % 2 ? 'assistant' : 'user', content, time: '10:00' }))
      const session = {
        id, title: id, workspace: 'Fixture M3', workspacePath: workspace, section: 'today', status: 'completed',
        updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: 1,
        chats: [{ id: 'main', title: 'Main', status: 'completed', messages: mensagens }],
      }
      expect((await page.request.put('/api/sessions', { headers, data: { session } })).ok()).toBe(true)
      await page.goto('/')
      const linha = page.locator('.session-row').filter({ hasText: id })
      await linha.click()
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Compactar contexto' }).click()
      await expect.poll(() => pedidos.length).toBe(1)
      const concorrente = await page.request.post('/api/sessions/checkpoint', { headers, data: { sessionId: id, chatId: 'main' } })
      expect(concorrente.status()).toBe(409)
      expect(await concorrente.json()).toMatchObject({ code: 'checkpoint_busy' })
      liberarPrimeira()
      await expect(page.getByText('Contexto compactado.')).toBeVisible()
      expect(JSON.stringify(pedidos[0])).toContain(original)
      await page.reload()
      await linha.click()
      await expect(page.getByText(/ORIGINAL PRIMEIRO TURNO/)).toBeVisible()
      await page.getByRole('button', { name: 'Buscar no histórico' }).click()
      const busca = page.getByRole('searchbox', { name: 'Termo no histórico' })
      await expect(busca).toBeFocused()
      await busca.fill('ORIGINAL PRIMEIRO TURNO')
      await busca.press('Enter')
      await page.getByRole('button', { name: /mensagem 1.*ORIGINAL PRIMEIRO TURNO/ }).click()
      await expect(page.locator('[data-message-id="m0"]')).toBeFocused()
      await expect(page.getByRole('region', { name: 'Busca no histórico do chat' })).toBeHidden()
      const fio = page.waitForResponse((res) => res.url().endsWith('/api/agir') && res.request().method() === 'POST')
      await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Continue agora')
      await page.getByRole('button', { name: 'Enviar mensagem' }).click()
      expect((await fio).headers()['x-agir-checkpoint']).toBe('aplicado')
      await expect(page.getByText('Continuei a partir do resumo.')).toBeVisible()
      const enviado = pedidos[1].messages
      expect(enviado[0].content).toContain('Resumo derivado do primeiro turno.')
      expect(enviado.map(({ content }) => content).slice(1)).toEqual([
        'Segunda pergunta', 'Segunda resposta', 'Terceira pergunta', 'Terceira resposta', 'Continue agora',
      ])
      expect(JSON.stringify(enviado).length).toBeLessThan(original.length)
      await expect.poll(async () => {
        const resposta = await page.request.get('/api/sessions', { headers })
        const { sessions } = await resposta.json() as { sessions: Array<{ id: string; chats: Array<{ messages: Array<{ content: string }> }> }> }
        return sessions.find((item) => item.id === id)?.chats[0].messages.at(-1)?.content
      }).toBe('Continuei a partir do resumo.')
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Compactar contexto' }).click()
      await expect(page.getByText(/A compactação falhou/)).toBeVisible()
      expect(JSON.stringify(pedidos[2])).toContain('Resumo derivado do primeiro turno.')
      expect(JSON.stringify(pedidos[2])).not.toContain(original)
      page.once('dialog', (dialog) => void dialog.accept())
      await page.getByRole('button', { name: 'Compactar contexto' }).click()
      await expect(page.getByText('Contexto compactado.')).toBeVisible()
      expect(JSON.stringify(pedidos[3])).toContain('Resumo derivado do primeiro turno.')
      expect(JSON.stringify(pedidos[3])).toContain('Segunda pergunta')
      expect(JSON.stringify(pedidos[3])).not.toContain(original)
      expect(pedidos).toHaveLength(4)
      const resposta = await page.request.get('/api/sessions', { headers })
      const { sessions } = await resposta.json() as { sessions: Array<typeof session> }
      const alterada = sessions.find((item) => item.id === id)!
      alterada.persistenceRevision += 1
      alterada.chats[0].messages[0].content = 'Primeiro turno corrigido na fixture'
      expect((await page.request.put('/api/sessions', { headers, data: { session: alterada } })).ok()).toBe(true)
      await page.reload()
      await linha.click()
      const fioOriginal = page.waitForResponse((res) => res.url().endsWith('/api/agir') && res.request().method() === 'POST')
      await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Confira a versão corrigida')
      await page.getByRole('button', { name: 'Enviar mensagem' }).click()
      expect((await fioOriginal).headers()['x-agir-checkpoint']).toBe('invalido')
      await expect(page.getByText(/O checkpoint não corresponde/)).toBeVisible()
      await expect.poll(() => pedidos.length).toBe(5)
      expect(JSON.stringify(pedidos[4])).toContain('Primeiro turno corrigido na fixture')
      expect(JSON.stringify(pedidos[4])).not.toContain('Resumo atualizado de dois turnos.')
    } finally {
      liberarPrimeira()
      await new Promise<void>((resolve) => provedor.close(() => resolve()))
    }
  })
})
