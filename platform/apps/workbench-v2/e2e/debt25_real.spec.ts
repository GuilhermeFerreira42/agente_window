import { test, expect } from '@playwright/test'
const baseURL = process.env.DEBT25_BASE_URL, workspace = process.env.DEBT25_WORKSPACE
const gateway = process.env.DEBT25_REAL_GATEWAY
test.use({ baseURL })
test.skip(!baseURL || !workspace || !gateway, 'Opt-in: gateway existente, perfil descartável e inferência limitada')

test.describe('DEBT25 — provedor real disponível', () => {
  test('DEBT25 real — identifica backend do alias e mostra limites antes de responder', async ({ page }) => {
  test.setTimeout(100_000)
  const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }, id = `debt25-real-${Date.now()}`
  expect((await page.request.put('/api/providers', { headers, data: { ativo: 'openai-compat', provedores: {
    'openai-compat': { nome: 'Prova real isolada', baseUrl: gateway, modelo: 'meu-pool', modoContexto: 'auto', maxSaida: 1024, apiKey: 'fixture' },
  } } })).ok()).toBe(true)
  const dados = await page.request.post('/api/providers/capabilities', { headers, data: { atualizar: true } })
  expect(dados.ok()).toBe(true)
  const capacidade = await dados.json()
  expect(capacidade.identidade.destinos).toContain('openai/nvidia/nemotron-3.5-lightning-30b-a3b')
  expect(capacidade.limites.total).toBe(1_000_000)
  expect(capacidade.fontes.some((f: { origem: string }) => f.origem === 'catalogo')).toBe(true)
  expect((await page.request.put('/api/sessions', { headers, data: { session: {
    id, slug: id, title: id, workspace: 'DEBT25 real', workspacePath: workspace, section: 'today', status: 'completed',
    updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: Date.now(),
    chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [] }],
  } } })).ok()).toBe(true)
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar sessões', exact: true }).click()
  await page.getByRole('textbox', { name: 'Filtrar sessões', exact: true }).fill(id)
  await page.getByRole('button', { name: `Sessão ${id}`, exact: true }).click()
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill('Teste sintético de conexão. Responda somente OK. Não leia arquivos nem execute ferramentas.')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await expect(page.locator('.chat-message').last().getByText('OK', { exact: true })).toBeVisible({ timeout: 85_000 })
  await expect(page.locator('.context-usage[title*="Entrada:"]')).toHaveAttribute('title', /catalogo.*Janela identificada: 1000000.*Orçamento preventivo/)
  if (process.env.DEBT25_SCREENSHOT) await page.screenshot({ path: process.env.DEBT25_SCREENSHOT })
  })
})
