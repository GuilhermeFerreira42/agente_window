import { expect, test, type Page } from '@playwright/test'
import { createServer } from 'node:http'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const baseURL = process.env.MEMORY_E2E_BASE_URL
const workspace = process.env.MEMORY_E2E_WORKSPACE
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige perfil e workspace descartáveis')
const headers = { Origin: baseURL ?? '', 'Sec-Fetch-Site': 'same-origin' }
type Pedido = { messages: Array<{ role: string; content: string }>; max_tokens?: number; stream_options?: unknown }
const resumo = (pedido: Pedido) => pedido.messages.some((m) => m.content?.includes('Produza um resumo de continuidade'))
const resposta = (conteudo: string) => ({ choices: [{ delta: { content: conteudo } }], usage: { prompt_tokens: 700, completion_tokens: 15 } })
const chamada = (id: string, ferramenta: string, args: object) => ({ choices: [{ delta: { tool_calls: [{ index: 0, id,
  function: { name: ferramenta, arguments: JSON.stringify(args) } }] } }] })

async function provedor(page: Page, janela: number, responder: (pedido: Pedido, indice: number) => object | number) {
  const pedidos: Pedido[] = []
  const server = createServer(async (req, res) => {
    const partes: Buffer[] = []; for await (const p of req) partes.push(p)
    const pedido = JSON.parse(Buffer.concat(partes).toString()) as Pedido
    pedidos.push(pedido)
    const dado = responder(pedido, pedidos.length)
    if (typeof dado === 'number') { res.writeHead(dado, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: { message: 'maximum context length exceeded' } })); return }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.end(`data: ${JSON.stringify(dado)}\n\ndata: [DONE]\n\n`)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture')
  expect((await page.request.put('/api/providers', { headers, data: { ativo: 'openai-compat', provedores: {
    'openai-compat': { nome: 'Memória fixture', baseUrl: `http://127.0.0.1:${address.port}/v1`, apiKey: 'fixture',
      modelo: 'memory-fixture', maxSaida: 512, contexto: janela, contextoModelo: 'memory-fixture' },
  } } })).ok()).toBe(true)
  return { pedidos, fechar: async () => { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())) } }
}

async function semear(page: Page, id: string, turnos: number, tamanho: number, path = workspace!) {
  const messages = Array.from({ length: turnos * 2 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? 'assistant' : 'user', time: '10:00',
    content: i === 0 ? 'ETIQUETA_ANTIGA é topázio.' + ' dado'.repeat(tamanho) : `Turno ${i}.` + ' dado'.repeat(tamanho) }))
  expect((await page.request.put('/api/sessions', { headers, data: { session: {
    id, slug: id, title: id, workspace: 'Memória integrada', workspacePath: path, section: 'today', status: 'completed',
    updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: Date.now(),
    chats: [{ id: 'main', title: 'Main', status: 'completed', messages },
      { id: 'other', title: 'Outro', status: 'completed', messages: [{ id: 'outro', role: 'user', content: 'CANARIO_OUTRO_CHAT', time: '10:00' }] }],
  } } })).ok()).toBe(true)
  return messages
}

async function abrir(page: Page, id: string) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Buscar sessões', exact: true }).click()
  await page.getByRole('textbox', { name: 'Filtrar sessões', exact: true }).fill(id)
  await page.getByRole('button', { name: `Sessão ${id}`, exact: true }).click()
}
async function enviar(page: Page, texto: string) {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
}

test.describe('memórias automáticas integradas', () => {
  for (const status of [413, 500]) test(`limita recuperação da recusa ${status} e encerra sem loop`, async ({ page }) => {
    const id = `memory-retry-${status}-${Date.now()}`
    let resumos = 0, normais = 0
    const fixture = await provedor(page, 100_000, (p) => {
      if (resumo(p)) { resumos++; return resposta('Resumo seguro da decisão antiga: topázio.') }
      normais++; return status
    })
    try {
      await semear(page, id, 4, 50)
      await abrir(page, id)
      await enviar(page, 'Continue sem usar ferramentas.')
      await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeVisible()
      await expect(page.locator('.chat-message').last()).toContainText(status === 413 ? /rejeitou o tamanho/ : /erro 500/)
      expect(normais).toBe(status === 413 ? 2 : 1)
      expect(resumos).toBe(status === 413 ? 1 : 0)
      expect(fixture.pedidos).toHaveLength(normais + resumos)
    } finally { await fixture.fechar() }
  })

  test('rejeita resumo truncado e permite recuperação manual com status coerente', async ({ page }) => {
    const id = `memory-manual-${Date.now()}`
    let resumos = 0
    const fixture = await provedor(page, 16000, (p) => {
      if (resumo(p)) {
        resumos++
        if (resumos === 1) return { choices: [{ delta: { content: 'Resumo interrompido' }, finish_reason: 'length' }] }
        return resposta('Resumo completo obtido manualmente.')
      }
      return resposta('Resposta normal.')
    })
    try {
      await semear(page, id, 8, 160)
      await abrir(page, id)
      await enviar(page, 'Continue a conversa.')
      await expect(page.getByText('Compactação indisponível', { exact: true })).toBeVisible()
      await expect(page.getByText(/resumo atingiu o limite de saída/)).toBeVisible()
      const cp = await (await page.request.get(`/api/sessions/checkpoint?sessionId=${id}&chatId=main`, { headers })).json()
      expect(cp.compactacao).toBeNull()
      await expect.poll(async () => {
        const sessions = (await (await page.request.get('/api/sessions', { headers })).json()).sessions
        return sessions.find((s: { id: string }) => s.id === id)?.chats[0].messages.at(-1)?.erro === true
      }).toBe(true)
      page.once('dialog', (d) => void d.accept())
      await page.getByRole('button', { name: 'Compactar contexto', exact: true }).click()
      await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
      await expect(page.getByText('Compactação indisponível', { exact: true })).toHaveCount(0)
      expect(resumos).toBe(4) // Uma tentativa truncada; três lotes da compactação manual.
    } finally { await fixture.fechar() }
  })
  test('compacta antes do limite, mantém fonte, exibe uso real e recupera checkpoint após F5', async ({ page }) => {
    test.setTimeout(60_000)
    const id = `memory-auto-${Date.now()}`
    let sumarizacoes = 0, normais = 0
    const fixture = await provedor(page, 16000, (p) => {
      if (resumo(p)) { sumarizacoes++; return resposta('Resumo derivado: decisões anteriores preservadas.') }
      normais++; return resposta(`Continuidade automática ${normais}.`)
    })
    try {
      const mensagens = await semear(page, id, 8, 160)
      await abrir(page, id)
      page.on('dialog', () => { throw new Error('Compactação automática não pode pedir confirmação') })
      await enviar(page, 'Continue a conversa.')
      await expect(page.getByText('Continuidade automática 1.', { exact: true })).toBeVisible()
      await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
      await expect(page.locator('.context-usage[title*="Entrada: 700"]')).toBeVisible()
      expect(sumarizacoes).toBeGreaterThan(0)
      const normal = fixture.pedidos.find((p) => !resumo(p))!
      expect(JSON.stringify(normal.messages)).not.toContain('ETIQUETA_ANTIGA')
      expect(normal.max_tokens).toBe(512)
      expect(normal.stream_options).toEqual({ include_usage: true })
      const fonte = await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')
      expect(fonte).toContain(mensagens[0].content)
      const estado = await (await page.request.get(`/api/sessions/checkpoint?sessionId=${id}&chatId=main`, { headers })).json()
      expect(estado.compactacao.estado).toBe('compactado')
      await page.reload()
      await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
      const antes = sumarizacoes
      await enviar(page, 'Mais uma pergunta curta.')
      await expect(page.getByText('Continuidade automática 2.', { exact: true })).toBeVisible()
      expect(sumarizacoes).toBe(antes)
      for (const n of [3, 4]) {
        await enviar(page, `Nova etapa ${n}: ` + 'dado sintético '.repeat(400))
        await expect(page.getByText(`Continuidade automática ${n}.`, { exact: true })).toBeVisible()
      }
      expect(sumarizacoes).toBeGreaterThan(antes)
      expect(await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')).toContain(mensagens[0].content)
    } finally { await fixture.fechar() }
  })

  test('recupera overflow após escrita sem repetir o efeito ou as aprovações', async ({ page }) => {
    test.setTimeout(60_000)
    const id = `memory-overflow-${Date.now()}`, arquivo = `${id}.txt`
    let normais = 0, sumarizacoes = 0
    const fixture = await provedor(page, 80000, (p) => {
      if (resumo(p)) { sumarizacoes++; return resposta('Resumo seguro anterior ao turno ativo.') }
      normais++
      if (normais === 1) return chamada('efeito-unico', 'criar', { caminho: arquivo, conteudo: 'EFEITO_UNICO' })
      if (normais === 2) return 413
      expect(p.messages.some((m) => m.role === 'tool')).toBe(true)
      expect(JSON.stringify(p.messages)).toContain('efeito-unico')
      if (normais === 3) return chamada('efeito-repetido', 'criar', { conteudo: 'EFEITO_UNICO', caminho: `./${arquivo}` })
      expect(JSON.stringify(p.messages)).toContain('não será repetida')
      if (normais === 4) return chamada('novo-comando', 'executar', { comando: `echo SEGUNDA_VEZ >> ${arquivo}` })
      return resposta('Recuperado sem repetir a escrita.')
    })
    try {
      await semear(page, id, 5, 80)
      await abrir(page, id)
      await page.getByRole('button', { name: 'Permissões manuais', exact: true }).click()
      page.once('dialog', (d) => void d.accept())
      await page.getByRole('menuitemradio', { name: /Permitir tudo/ }).click()
      await expect(page.getByRole('button', { name: 'Permitir tudo ativo' })).toBeVisible()
      await enviar(page, `Crie somente o arquivo ${arquivo} e confira o resultado.`)
      // Mesmo com allow-all, um efeito novo após recuperação exige aprovação fresca.
      await expect(page.getByRole('button', { name: 'Negar esta mexida', exact: true })).toBeVisible()
      expect(await readFile(join(workspace!, arquivo), 'utf8')).toBe('EFEITO_UNICO')
      await page.getByRole('button', { name: 'Negar esta mexida', exact: true }).click()
      await expect(page.getByText('Recuperado sem repetir a escrita.', { exact: true })).toBeVisible()
      expect(await readFile(join(workspace!, arquivo), 'utf8')).toBe('EFEITO_UNICO')
      expect(normais).toBe(5); expect(sumarizacoes).toBe(1)
      const fonte = (await readFile(join(workspace!, 'data', 'projects', id, `${id}.jsonl`), 'utf8')).trim().split(/\r?\n/).map((s) => JSON.parse(s))
      expect(fonte.filter((e) => e.type === 'agir_event' && e.message.evento.tipo === 'resultado' && e.message.evento.ferramenta === 'criar' && e.message.evento.ok)).toHaveLength(1)
      expect(fonte.filter((e) => e.type === 'agir_event' && e.message.evento.tipo === 'resultado' && e.message.evento.ferramenta === 'criar' && !e.message.evento.ok)).toHaveLength(1)
    } finally { await fixture.fechar() }
  })

  test('recupera histórico sem comando, seleciona memória do projeto e bloqueia efeitos em Perguntar', async ({ page }) => {
    test.setTimeout(60_000)
    const id = `memory-retrieve-${Date.now()}`, outro = `${id}-b`, arquivo = `${id}-indevido.txt`
    let normais = 0
    const fixture = await provedor(page, 16000, (p) => {
      if (resumo(p)) return resposta('Resumo sem a etiqueta antiga.')
      normais++
      if (normais === 1) return chamada('h1', 'historico', { acao: 'buscar', consulta: 'ETIQUETA_ANTIGA' })
      if (normais === 2) return chamada('h2', 'historico', { acao: 'ler', messageId: 'm0' })
      if (normais === 3) return chamada('p1', 'historico', { acao: 'projeto', consulta: 'SQLite' })
      if (normais === 4) return chamada('write-malicioso', 'criar', { caminho: arquivo, conteudo: 'não autorizado' })
      return resposta('A origem histórica é m0 e a decisão do projeto usa SQLite.')
    })
    try {
      await semear(page, id, 8, 160)
      const projetoB = join(workspace!, outro); await mkdir(projetoB)
      await semear(page, outro, 0, 0, projetoB)
      for (const [sid, conteudo] of [[id, 'SQLite utiliza WAL neste projeto.'], [outro, 'SQLite CANARIO_PROJETO_B']]) {
        const listar = await (await page.request.post('/api/sessions/project-memory', { headers, data: { sessionId: sid, chatId: 'main', operacao: 'listar' } })).json()
        expect((await page.request.post('/api/sessions/project-memory', { headers, data: { sessionId: sid, chatId: 'main', projetoId: listar.projetoId,
          operacao: 'gravar', confirmado: true, revisao: 0, tipo: 'decisao', conteudo, motivo: '' } })).ok()).toBe(true)
      }
      await abrir(page, id)
      await page.getByRole('button', { name: 'Agente', exact: true }).click()
      await page.getByRole('button', { name: /Perguntar/ }).click()
      await enviar(page, 'Recupere a etiqueta antiga e a decisão SQLite, sem executar escrita.')
      await expect(page.getByText('A origem histórica é m0 e a decisão do projeto usa SQLite.', { exact: true })).toBeVisible()
      const pedidos = fixture.pedidos.filter((p) => !resumo(p))
      expect(JSON.stringify(pedidos[0])).toContain('SQLite utiliza WAL')
      expect(JSON.stringify(pedidos[0])).not.toContain('ETIQUETA_ANTIGA')
      expect(JSON.stringify(pedidos[1])).toContain('ETIQUETA_ANTIGA')
      expect(JSON.stringify(pedidos)).not.toMatch(/CANARIO_OUTRO_CHAT|CANARIO_PROJETO_B/)
      await expect(stat(join(workspace!, arquivo))).rejects.toMatchObject({ code: 'ENOENT' })
      expect(normais).toBe(5)
    } finally { await fixture.fechar() }
  })

  test('mantém duas conversas simultâneas com compactação e medição isoladas', async ({ page }) => {
    test.setTimeout(60_000)
    const a = `memory-paralelo-a-${Date.now()}`, b = a.replace('-a-', '-b-')
    const fixture = await provedor(page, 16000, (p) => {
      if (resumo(p)) return resposta('Resumo da conversa correspondente.')
      const isA = p.messages.some((m) => m.content?.includes('CONSULTA_A'))
      return { ...resposta(isA ? 'Resposta exclusiva A.' : 'Resposta exclusiva B.'), usage: { prompt_tokens: isA ? 1000 : 2000, completion_tokens: 8 } }
    })
    const segunda = await page.context().newPage()
    try {
      await semear(page, a, 8, 160); await semear(page, b, 8, 160)
      await Promise.all([abrir(page, a), abrir(segunda, b)])
      await Promise.all([enviar(page, 'CONSULTA_A'), enviar(segunda, 'CONSULTA_B')])
      await expect(page.getByText('Resposta exclusiva A.', { exact: true })).toBeVisible()
      await expect(segunda.getByText('Resposta exclusiva B.', { exact: true })).toBeVisible()
      await expect(page.locator('.context-usage[title*="Entrada: 1000"]')).toBeVisible()
      await expect(segunda.locator('.context-usage[title*="Entrada: 2000"]')).toBeVisible()
      await expect(page.getByText('Contexto compactado', { exact: true })).toBeVisible()
      await expect(segunda.getByText('Contexto compactado', { exact: true })).toBeVisible()
      const baseA = await readFile(join(workspace!, 'data', 'projects', a, `${a}.jsonl`), 'utf8')
      const baseB = await readFile(join(workspace!, 'data', 'projects', b, `${b}.jsonl`), 'utf8')
      expect(baseA).not.toContain('CONSULTA_B'); expect(baseB).not.toContain('CONSULTA_A')
    } finally { await segunda.close(); await fixture.fechar() }
  })
})
