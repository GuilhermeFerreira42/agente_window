import { expect, test } from '@playwright/test'

const baseURL = process.env.MEMORY_REAL_BASE_URL
const workspace = process.env.MEMORY_REAL_WORKSPACE
const gateway = process.env.MEMORY_REAL_GATEWAY
test.use({ baseURL })
test.skip(!baseURL || !workspace || !gateway, 'Opt-in: Google via LiteLLM existente em perfil descartável')

test.describe('memória — prova real Google via LiteLLM', () => {
  test('compacta automaticamente e mostra contagem reportada no compositor', async ({ page }) => {
    test.setTimeout(150_000)
    const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
    const id = `real-google-memory-${Date.now()}`
    // Este spec exige gateway local sem chave mestre e nunca lê ou copia chaves Google.
    expect((await page.request.put('/api/providers', { headers, data: { ativo: 'openai-compat', provedores: {
      'openai-compat': { nome: 'Google real via LiteLLM', baseUrl: gateway, modelo: 'meu-pool', apiKey: 'fixture', maxSaida: 1024 },
    } } })).ok()).toBe(true)
    expect((await page.request.put('/api/config', { headers, data: { teto: 2 } })).ok()).toBe(true)
    const messages = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? 'assistant' : 'user', time: '10:00',
      content: (i === 0 ? 'Decisão importante: a cor escolhida para o projeto sintético é TOPÁZIO. Preserve esta decisão no resumo. ' : 'Contexto auxiliar sem novas decisões. ') +
        'Detalhe sintético neutro. '.repeat(75) }))
    expect((await page.request.put('/api/sessions', { headers, data: { session: {
      id, slug: id, title: id, workspace: 'Prova real descartável', workspacePath: workspace, section: 'today', status: 'completed',
      updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: Date.now(),
      chats: [{ id: 'main', title: 'Main', status: 'completed', messages }],
    } } })).ok()).toBe(true)
    await page.goto('/')
    await page.getByRole('button', { name: `Sessão ${id}`, exact: true }).click()
    const eventos: Array<{ type: string; medicao?: { entrada?: number; origemEntrada?: string } }> = []
    page.on('response', async (r) => {
      if (r.url().endsWith('/api/agir') && r.request().method() === 'POST') {
        const source = await r.text().catch(() => '')
        for (const line of source.split(/\r?\n/)) if (line.startsWith('data: ')) {
          try { eventos.push(JSON.parse(line.slice(6))) } catch { /* SSE sem payload */ }
        }
      }
    })
    await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Qual foi a cor escolhida no início? Responda apenas a cor, sem ler arquivos nem executar comandos.')
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await expect(page.locator('.chat-message').last()).toContainText(/topázio/i, { timeout: 120_000 })
    await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
    await expect(page.locator('.context-usage[title*="Entrada:"]')).toBeVisible()
    await expect.poll(() => eventos.some((e) => e.type === 'context_usage' && e.medicao?.origemEntrada === 'provedor' && (e.medicao.entrada ?? 0) > 0)).toBe(true)
    await expect(page.locator('.context-usage[title*="Entrada:"]')).toHaveAttribute('title', /Janela desconhecida.*Reserva de saída: 1024/)
    await page.screenshot({ path: process.env.MEMORY_REAL_SCREENSHOT ?? 'test-results/google-real-memoria.png' })
    await page.reload()
    await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
    await expect(page.getByText('Contexto não medido', { exact: true })).toBeVisible()
  })
})
