import { expect, test } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const baseURL = process.env.M2_E2E_BASE_URL
const workspace = process.env.M2_E2E_WORKSPACE
const segundoServidor = process.env.M2_E2E_RESTART_BASE_URL
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige servidor e workspace descartáveis')

test.describe('M2 — privacidade de snapshots', () => {
  test('reconstrói uma chamada de leitura após F5 sem reenviar os bytes originais', async ({ page }) => {
    const id = `m2-exchange-${Date.now()}`
    const arquivo = `${id}.txt`
    const privado = 'FIXTURE_PRIVATE_TOOL_CONTENT'
    await writeFile(join(workspace!, arquivo), privado)
    const pedidos: Array<{ messages: Array<Record<string, unknown>> }> = []
    const provedor = createServer(async (req, res) => {
      if (req.method !== 'POST') { res.writeHead(404).end(); return }
      const buffers: Buffer[] = []
      for await (const chunk of req) buffers.push(chunk)
      pedidos.push(JSON.parse(Buffer.concat(buffers).toString('utf8')))
      const indice = pedidos.length
      const delta = indice === 1
        ? { tool_calls: [{ index: 0, id: 'original-provider-id', function: { name: 'ler', arguments: JSON.stringify({ caminho: arquivo }) } }] }
        : { content: indice === 2 ? 'Primeiro turno concluído.' : 'Segundo turno concluído.' }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\ndata: [DONE]\n\n`)
    })
    await new Promise<void>((resolve) => provedor.listen(0, '127.0.0.1', resolve))
    try {
      const endereco = provedor.address()
      if (!endereco || typeof endereco === 'string') throw new Error('Provedor de teste indisponível')
      const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
      const resposta = await page.request.put('/api/providers', {
        headers,
        data: { ativo: 'openai-compat', provedores: { 'openai-compat': {
          nome: 'Fixture M2', baseUrl: `http://127.0.0.1:${endereco.port}/v1`, modelo: 'm2-fixture', apiKey: 'fixture',
        } } },
      })
      expect(resposta.ok()).toBe(true)
      const session = {
        id, slug: id, title: id, workspace: 'Fixture M2', workspacePath: workspace, section: 'today', status: 'completed',
        updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: 1,
        chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [] }],
      }
      expect((await page.request.put('/api/sessions', { headers, data: { session } })).ok()).toBe(true)
      await page.goto('/')
      const linha = page.locator('.session-row').filter({ hasText: id })
      const enviar = async (texto: string) => {
        await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
        await page.getByRole('button', { name: 'Enviar mensagem' }).click()
      }
      await linha.click()
      await enviar('Leia a fixture')
      await expect(page.getByText('Primeiro turno concluído.')).toBeVisible()
      await expect.poll(async () => (await (await page.request.get('/api/sessions', { headers })).text()).includes('Primeiro turno concluído.')).toBe(true)
      expect(JSON.stringify(pedidos[1])).toContain(privado)
      const jsonl = await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')
      expect(jsonl).not.toContain(privado)
      expect(jsonl).not.toContain('original-provider-id')
      const eventos = jsonl.trim().split(/\r?\n/).map((linha) => JSON.parse(linha)).filter((item) => item.type === 'agir_event')
      expect(eventos.map((item) => item.sequence)).toEqual([1, 2, 3, 4, 5, 6])
      expect(eventos.map((item) => item.message.evento.tipo)).toEqual(['iteracao', 'chamada', 'referencia', 'resultado', 'iteracao', 'encerramento'])
      expect(eventos[2].message.evento.localizador).toMatchObject({ arquivo, digest: expect.stringMatching(/^[a-f0-9]{64}$/) })
      if (segundoServidor) await page.goto(segundoServidor)
      else await page.reload()
      // Um perfil acumulado pode ocultar o workspace pelo limite normal da lista.
      // Buscar a sessão exercita a navegação pública sem depender da ordenação.
      await page.getByRole('button', { name: 'Buscar sessões', exact: true }).click()
      await page.getByRole('textbox', { name: 'Filtrar sessões', exact: true }).fill(id)
      await linha.click()
      const fio = page.waitForResponse((res) => res.url().endsWith('/api/agir') && res.request().method() === 'POST')
      await enviar('O que aconteceu no turno anterior?')
      expect((await fio).headers()['x-agir-history-source']).toBe('hibrido')
      await expect(page.getByText('Segundo turno concluído.')).toBeVisible()
      const retomado = pedidos[2].messages
      const ferramenta = retomado.find((mensagem) => mensagem.role === 'tool')
      expect(ferramenta?.content).toContain('conteúdo originais omitidos')
      expect(retomado).toContainEqual(expect.objectContaining({
        role: 'assistant', tool_calls: [expect.objectContaining({ id: ferramenta?.tool_call_id })],
      }))
      expect(JSON.stringify(retomado)).not.toContain(privado)
      expect(pedidos).toHaveLength(3)
    } finally {
      await new Promise<void>((resolve) => provedor.close(() => resolve()))
    }
  })

  test('restaura os cartões sem expor conteúdo transitório após F5', async ({ page }) => {
    const id = `m2-privacy-${Date.now()}`
    const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
    const session = {
      id, title: id, workspace: 'Fixture M2', workspacePath: workspace, section: 'today', status: 'completed',
      updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: 1,
      chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [
        { id: 'u1', role: 'user', content: 'Mensagem original da fixture', time: '10:00' },
        { id: 'a1', role: 'assistant', content: 'Resposta da fixture', time: '10:00', ferramentas: [
          { id: 'cmd1', ferramenta: 'executar', status: 'ok', alvo: 'FIXTURE_COMMAND', resumo: 'FIXTURE_STDOUT' },
        ] },
      ] }],
    }
    expect((await page.request.put('/api/sessions', { headers, data: { session } })).ok()).toBe(true)
    await page.goto('/')
    const linha = page.locator('.session-row').filter({ hasText: id })
    await linha.click()
    await expect(page.getByText('Resposta da fixture')).toBeVisible()
    await page.reload()
    await linha.click()
    await expect(page.getByText('Mensagem original da fixture')).toBeVisible()
    await expect(page.locator('.chat-tool-card')).toBeVisible()
    await expect(page.locator('.chat-tool-card')).not.toContainText(/FIXTURE_COMMAND|FIXTURE_STDOUT/)
    const resposta = await page.request.get('/api/sessions', { headers })
    expect(resposta.ok()).toBe(true)
    expect(await resposta.text()).not.toMatch(/FIXTURE_COMMAND|FIXTURE_STDOUT/)
  })
})
