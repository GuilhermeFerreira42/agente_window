import { test, expect, type Page } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const baseURL = process.env.DEBT25_BASE_URL, workspace = process.env.DEBT25_WORKSPACE
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige servidor, perfil e workspace descartáveis')
const headers = { Origin: baseURL ?? '', 'Sec-Fetch-Site': 'same-origin' }
type Pedido = { messages: Array<{ role: string; content: string }>; max_tokens?: number }

async function fixture(page: Page, janela: number, saida = 4096) {
  const pedidos: Pedido[] = []; let limite = janela
  const server = createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data: [{ model_name: 'alias', litellm_params: { model: 'openai/backend-real' },
        model_info: { context_window: limite, ...(saida > 0 ? { max_output_tokens: saida } : {}) } },
      { model_name: 'small', litellm_params: { model: 'openai/backend-small' }, model_info: { context_window: 32768, max_output_tokens: 4096 } }] })); return
    }
    const partes: Buffer[] = []; for await (const chunk of req) partes.push(chunk)
    const p = JSON.parse(Buffer.concat(partes).toString()) as Pedido; pedidos.push(p)
    const resumo = p.messages.some((m) => m.content?.includes('Produza um resumo de continuidade'))
    res.writeHead(200, { 'Content-Type': 'text/event-stream' }).end('data: ' + JSON.stringify({ model: 'backend-real',
      choices: [{ delta: { content: resumo ? 'Decisão preservada: topázio.' : 'Resposta DEBT25 concluída.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1700, completion_tokens: 12 } }) + '\n\ndata: [DONE]\n\n')
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const a = server.address(); if (!a || typeof a === 'string') throw new Error('fixture')
  const config = { nome: 'DEBT25 fixture', baseUrl: `http://127.0.0.1:${a.port}/v1`, modelo: 'alias', modoContexto: 'auto', maxSaida: 4096, apiKey: 'fixture' }
  const salvar = async (campos: object = {}) => expect((await page.request.put('/api/providers', {
    headers, data: { ativo: 'openai-compat', provedores: { 'openai-compat': { ...config, ...campos } } },
  })).ok()).toBe(true)
  await salvar()
  return { pedidos, salvar, limite: (n: number) => { limite = n }, fechar: async () => {
    server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve()))
  } }
}
async function semear(page: Page, id: string, longo = true, quantidade = 12, repeticoes = 700) {
  const messages = longo ? Array.from({ length: quantidade }, (_, i) => ({ id: `m${i}`, role: i % 2 ? 'assistant' : 'user', time: '10:00',
    content: `ORIGINAL_DEBT25_${i} ` + 'dado '.repeat(repeticoes) })) : []
  expect((await page.request.put('/api/sessions', { headers, data: { session: { id, slug: id, title: id, workspace: 'DEBT25',
    workspacePath: workspace, section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
    mainChatId: 'main', persistenceRevision: Date.now(), chats: [{ id: 'main', title: 'Main', status: 'completed', messages }] } } })).ok()).toBe(true)
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar sessões', exact: true }).click()
  await page.getByRole('textbox', { name: 'Filtrar sessões', exact: true }).fill(id)
  await page.getByRole('button', { name: `Sessão ${id}`, exact: true }).click()
}
async function enviar(page: Page, texto = 'Continue o trabalho.') {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  const resposta = page.waitForResponse((r) => r.url().endsWith('/api/agir') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
  await (await resposta).finished()
  await expect(page.locator('.chat-message').last()).toContainText('Resposta DEBT25 concluída.')
}

test.describe('DEBT25 — descoberta até memória e compositor', () => {
  for (const [janela, legado] of [[128000, false], [0, false], [0, true]] as const) test(`formulário e resposta funcionam nos dois modos com metadados ${janela ? 'conhecidos' : 'ausentes'}${legado ? ' e perfil legado' : ''}`, async ({ page }) => {
    const f = await fixture(page, janela, 0), id = `modos-${janela}-${Date.now()}`
    test.setTimeout(60_000)
    try {
      await f.salvar({ contexto: 1500, contextoModelo: legado ? undefined : 'alias', maxSaida: 204800, modoContexto: legado ? undefined : 'auto' })
      await semear(page, id, false)
      await page.getByRole('button', { name: 'Conta', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Provedores', exact: true }).click()
      const campo = page.getByLabel('Janela de contexto em tokens')
      await expect(campo).toHaveAttribute('readonly', '')
      if (janela) {
        await expect(campo).toHaveValue('128000')
        await expect(page.getByText(/Capacidade identificada.*Origem: gateway/)).toBeVisible()
      } else {
        await expect(campo).toHaveValue('')
        await expect(page.getByText(/Não conseguimos identificar a janela/)).toBeVisible()
      }
      await expect(page.getByLabel('Limite de saída em tokens')).toHaveValue('4096')
      await page.getByRole('button', { name: 'Fechar Provedores', exact: true }).click()
      await enviar(page, 'Resposta no modo automático.')
      expect(f.pedidos.at(-1)?.max_tokens).toBe(4096)
      await page.getByRole('button', { name: 'Conta', exact: true }).click()
      await page.getByRole('menuitem', { name: 'Provedores', exact: true }).click()
      await page.getByLabel('Modo da janela de contexto').selectOption('manual')
      await campo.fill('128000')
      await page.getByLabel('Limite de saída em tokens').fill('204800')
      await expect(page.getByText(/A chamada usará no máximo 4096/)).toBeVisible()
      await page.getByRole('button', { name: 'Salvar provedores', exact: true }).click()
      await expect(page.getByText('Configuração salva', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Fechar Provedores', exact: true }).click()
      await enviar(page, 'Resposta no modo manual.')
      expect(f.pedidos.at(-1)?.max_tokens).toBe(4096)
      await expect(page.locator('.context-usage')).toContainText('%')
      await expect(page.getByText(/A resposta não terminou a tempo/)).toHaveCount(0)
      const respostaSalvos = await page.request.get('/api/providers', { headers })
      expect(respostaSalvos.ok()).toBe(true)
      const salvos = await respostaSalvos.json()
      expect(salvos.provedores.find((p: { id: string }) => p.id === 'openai-compat')).toMatchObject({ modoContexto: 'manual', contexto: 128000, maxSaida: 204800 })
    } finally { await f.fechar() }
  })
  test('compacta conversa longa de 1M por trecho limitado sem perder a fonte', async ({ page }) => {
    test.setTimeout(60_000)
    const f = await fixture(page, 1_000_000), id = `debt25-grande-${Date.now()}`
    try {
      await semear(page, id, true, 40, 4000); await enviar(page)
      const resumos = f.pedidos.filter((p) => p.messages.some((m) => m.content?.includes('Produza um resumo de continuidade')))
      expect(resumos.length).toBeGreaterThan(0); expect(resumos.length).toBeLessThanOrEqual(8)
      expect(JSON.stringify(f.pedidos.at(-1))).not.toContain('ORIGINAL_DEBT25_0')
      expect(JSON.stringify(f.pedidos.at(-1))).toContain('ORIGINAL_DEBT25_38')
      expect(await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')).toContain('ORIGINAL_DEBT25_0')
    } finally { await f.fechar() }
  })
  for (const janela of [32768, 131072, 1_000_000]) test(`Auto descobre ${janela} e compacta somente quando necessário`, async ({ page }) => {
    const f = await fixture(page, janela), id = `debt25-${janela}-${Date.now()}`
    try {
      await semear(page, id); await enviar(page)
      const titulo = page.locator('.context-usage[title*="Entrada:"]')
      await expect(titulo).toHaveAttribute('title', new RegExp(`Janela identificada: ${janela}`))
      await expect(titulo).toHaveAttribute('title', /gateway.*Orçamento preventivo/)
      await expect(titulo).toHaveAttribute('title', /Modelo informado na resposta: backend-real/)
      const resumos = f.pedidos.filter((p) => p.messages.some((m) => m.content?.includes('Produza um resumo de continuidade')))
      expect(resumos.length > 0).toBe(janela === 32768)
      const fonte = await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')
      expect(fonte).toContain('ORIGINAL_DEBT25_0')
      if (janela === 32768) {
        expect(JSON.stringify(f.pedidos.at(-1))).not.toContain('ORIGINAL_DEBT25_0')
        await page.reload(); await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
      } else expect(JSON.stringify(f.pedidos.at(-1))).toContain('ORIGINAL_DEBT25_0')
    } finally { await f.fechar() }
  })
  test('atualiza capacidade do alias antes da execução seguinte e preserva escolha manual', async ({ page }) => {
    const f = await fixture(page, 1_000_000), id = `debt25-atualizar-${Date.now()}`
    try {
      await semear(page, id, false); await enviar(page)
      f.limite(32768)
      const cap = await page.request.post('/api/providers/capabilities', { headers, data: { atualizar: true } })
      expect((await cap.json()).limites.total).toBe(32768)
      await enviar(page, 'Outra pergunta.')
      await expect(page.locator('.context-usage[title*="Entrada:"]')).toHaveAttribute('title', /Janela identificada: 32768/)
      await f.salvar({ modoContexto: 'manual', contexto: 16000, contextoModelo: 'alias' })
      await enviar(page, 'Pergunta com teto manual.')
      await expect(page.locator('.context-usage[title*="Entrada:"]')).toHaveAttribute('title', /manual.*Janela configurada: 16000/)
      const invalido = await page.request.put('/api/providers', { headers, data: { ativo: 'openai-compat', provedores: {
        'openai-compat': { nome: 'fixture', baseUrl: 'http://127.0.0.1:1/v1', modelo: 'alias', maxSaida: 999999999999999 },
      } } })
      expect(invalido.status()).toBe(400)
    } finally { await f.fechar() }
  })
  test('troca o modelo usado por Auto sem herdar a janela do modelo anterior', async ({ page }) => {
    const f = await fixture(page, 1_000_000), id = `debt25-troca-${Date.now()}`
    try {
      await semear(page, id); await enviar(page)
      expect(f.pedidos).toHaveLength(1)
      await f.salvar({ modelo: 'small', modelosHabilitados: ['alias', 'small'], modoContexto: 'auto', contexto: 1_000_000, contextoModelo: 'alias' })
      await enviar(page, 'Continue com o modelo menor.')
      await expect(page.locator('.context-usage[title*="Entrada:"]')).toHaveAttribute('title', /openai-compat \/ small.*Janela identificada: 32768/)
      expect(f.pedidos.some((p) => p.messages.some((m) => m.content?.includes('Produza um resumo de continuidade')))).toBe(true)
      expect(await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')).toContain('ORIGINAL_DEBT25_0')
    } finally { await f.fechar() }
  })
})
