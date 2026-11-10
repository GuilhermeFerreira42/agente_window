import { createServer } from 'node:http'
import { expect, test, type Page } from '@playwright/test'

const base = process.env.M1_E2E_BASE_URL
const workspace = process.env.M1_E2E_WORKSPACE
const ollama = process.env.M1_E2E_OLLAMA
test.use({ baseURL: base })
test.skip(!base || !workspace, 'Executar somente contra servidor e workspace descartáveis da M1')

const headers = { Origin: base ?? '', 'Sec-Fetch-Site': 'same-origin' }
async function configurar(page: Page, ativo: string, provedor: object) {
  expect((await page.request.put('/api/providers', { headers, data: { ativo, provedores: { [ativo]: provedor } } })).ok()).toBe(true)
}

async function semear(page: Page, id: string) {
  const chat = id + '-chat'
  expect((await page.request.put('/api/sessions', { headers, data: { session: {
    id, title: id, workspace: 'M1 fixture', workspacePath: workspace, worktreePath: null,
    section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0,
    branch: null, mainChatId: chat, persistenceRevision: Date.now(),
    chats: [{ id: chat, title: 'Main', status: 'completed', messages: [] }],
  } } })).ok()).toBe(true)
}

async function enviar(page: Page, texto: string) {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
}

test.describe('M1 — medição e orçamento', () => {
  test('M1 mede a resposta no navegador, isola sessões e volta a medir após recarregar', async ({ page }) => {
    const chamadas: Record<string, unknown>[] = []
    const servidor = createServer(async (req, res) => {
      const partes: Buffer[] = []
      for await (const parte of req) partes.push(parte)
      chamadas.push(JSON.parse(Buffer.concat(partes).toString('utf8')))
      if (chamadas.length === 3) {
        res.writeHead(413).end()
        return
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write('data: {"choices":[{"delta":{"content":"Resposta M1 da fixture."}}]}\n\n')
      if (chamadas.length === 1) res.write('data: {"choices":[],"usage":{"prompt_tokens":900,"completion_tokens":14}}\n\n')
      res.end('data: [DONE]\n\n')
    })
    await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve))
    try {
      const endereco = servidor.address()
      if (typeof endereco !== 'object' || !endereco) throw new Error('Fixture HTTP indisponível')
      await configurar(page, 'openai-compat', { nome: 'M1 fixture', baseUrl: `http://127.0.0.1:${endereco.port}/v1`, modelo: 'm1-fixture', apiKey: 'fixture', contexto: 1000, contextoModelo: 'm1-fixture' })
      const primeira = `M1 primeira ${Date.now()}`
      const segunda = `M1 segunda ${Date.now()}`
      await semear(page, primeira)
      await semear(page, segunda)
      await page.goto('/')
      const abrir = (titulo: string) => page.locator('.session-row').filter({ hasText: titulo }).click()
      const indicador = page.locator('.context-usage')
      await abrir(primeira)
      await expect(indicador).toHaveText('Contexto não medido')
      await enviar(page, 'Uma pergunta curta')
      await expect(indicador).toHaveText('90% contexto')
      await expect(indicador).toHaveAttribute('title', /m1-fixture.*Entrada: 900.*Saída: 14/)
      await expect(page.locator('.chat-message').last()).toContainText('Resposta M1 da fixture.')
      await abrir(segunda)
      await expect(indicador).toHaveText('Contexto não medido')
      await abrir(primeira)
      await expect(indicador).toHaveText('90% contexto')
      await page.reload()
      await abrir(primeira)
      await expect(indicador).toHaveText('Contexto não medido')
      await expect(page.locator('.chat-message').last()).toContainText('Resposta M1 da fixture.')
      await enviar(page, 'Um conteúdo longo. '.repeat(500))
      await expect(indicador).toHaveText('Contexto indisponível')
      expect(chamadas[1].messages).toEqual(expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: 'Uma pergunta curta' }),
        expect.objectContaining({ role: 'assistant', content: 'Resposta M1 da fixture.' }),
      ]))
      expect(chamadas[1].tools).toEqual(expect.any(Array))
      await enviar(page, 'Caso 413')
      await expect(page.getByText(/rejeitou o tamanho do contexto enviado/i)).toBeVisible()
      await expect(indicador).toHaveText('Contexto não medido')
      expect(chamadas).toHaveLength(3)
    } finally {
      await new Promise<void>((resolve) => servidor.close(() => resolve()))
    }
  })

  test('M1 recebe contagens reais de um Ollama local', async ({ page }) => {
    test.skip(!ollama, 'Ollama local opcional')
    test.setTimeout(120_000)
    await configurar(page, 'ollama', { baseUrl: ollama, modelo: 'hermes3:3b' })
    const titulo = `M1 Ollama ${Date.now()}`
    await semear(page, titulo)
    await page.goto('/')
    await page.locator('.session-row').filter({ hasText: titulo }).click()
    await enviar(page, 'Responda apenas com a palavra OK.')
    await expect(page.locator('.context-usage')).toHaveAttribute('title', /hermes3:3b.*Entrada: [1-9]\d* tokens.*Saída: [1-9]\d* tokens.*Janela desconhecida/, { timeout: 90_000 })
  })
})
