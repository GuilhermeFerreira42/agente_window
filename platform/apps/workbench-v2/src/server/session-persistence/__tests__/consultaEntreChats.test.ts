// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { criarConsultaEntreChats, type PortasConsultaEntreChats } from '../consultaEntreChats'
import { chaveProjetoHistorico, digestChat, type OrigemChat } from '../origensChats'
import type { TranscriptEntry } from '../transcripts'
import type { SessionRecord } from '../database'
import type { ContextoEntreChats, PedidoEntreChats } from '../../../domain/consultaEntreChats'
const contexto: ContextoEntreChats = { sessionId: 'atual', chatId: 'main', raiz: '/A' }
const linha = (uuid: string, content: string, type: TranscriptEntry['type'] = 'user'): TranscriptEntry =>
  ({ chatId: 'main', uuid, type, timestamp: 10, message: { id: uuid, role: type, content } })
function fixture() {
  const registros = new Map<string, SessionRecord>(), origens = new Map<string, OrigemChat>(), textos = new Map<string, TranscriptEntry[]>()
  const raizes = new Map<string, string>([['atual', '/A']]); let owner = 'perfil-servidor', legado = false, locks = 0
  function add(id: string, title: string, entries = [linha('m1', 'Decidimos SQLite com WAL.')], raiz = '/A') {
    raizes.set(id, raiz); textos.set(id, entries)
    registros.set(id, { id, slug: id, title, workspacePath: raiz, worktreePath: null, messageCount: entries.length, createdAt: 1, updatedAt: 1,
      sessionJson: JSON.stringify({ id, workspacePath: raiz, worktreePath: null, title, chats: [{ id: 'main', title: 'Main' }] }) })
    origens.set(id, { sessionId: id, chatId: 'main', epoch: `epoch-${id}`, operatorId: owner, projectKey: chaveProjetoHistorico(raiz),
      rootIdentity: raiz, state: 'verified', digest: digestChat(entries, 'main'), title, titleNorm: title.toLowerCase(), sessionTitle: title, chatTitle: 'Main', updatedAt: 17 })
  }
  add('atual', 'Atual', []); add('fonte', 'Investigação de plugins')
  const portas: PortasConsultaEntreChats = {
    serializar: async (_id, acao) => { expect(locks).toBe(0); locks++; try { return await acao() } finally { locks-- } },
    contexto: (id) => raizes.has(id) ? { ok: true, raiz: raizes.get(id)!, permissoes: ['executar', 'escrever'] } : { ok: false, message: 'inexistente' },
    registro: id => registros.get(id), origem: id => origens.get(id), operador: () => owner, legado: () => legado,
    identidadeRaiz: vi.fn(raiz => raiz),
    listar: vi.fn((key, query, excluir, apos = 0, ate = Number.MAX_SAFE_INTEGER) => {
      const todas = [...origens.values()].filter(o => o.projectKey === key && o.state === 'verified' && !(o.sessionId === excluir.sessionId && o.chatId === excluir.chatId) && o.updatedAt >= apos && o.updatedAt <= ate)
      const titulo = todas.filter(o => o.titleNorm.includes(query.toLowerCase()))
      return { rows: titulo.length ? titulo : todas, titulo: titulo.length > 0, partial: false }
    }),
    ler: vi.fn(async (_slug, id, max, medido) => {
      const t = textos.get(id) ?? [], bytes = Buffer.byteLength(JSON.stringify(t))
      if (max !== undefined && bytes > max) throw Object.assign(new Error('Conteúdo secreto não deve aparecer.'), { code: 'TRANSCRIPT_TOO_LARGE' })
      medido?.(bytes); return structuredClone(t)
    }),
  }
  const abort = new AbortController()
  const criar = (budget?: number, textoHumano?: string) => criarConsultaEntreChats(contexto, { serializar: portas.serializar, portas, sinal: abort.signal, orcamentoBytes: budget, textoHumano })
  return { portas, registros, origens, textos, raizes, add, criar, abort, owner: (s: string) => { owner = s }, legado: () => { legado = true } }
}
const buscar = (consulta = 'Investigação de plugins'): PedidoEntreChats => ({ ferramenta: 'buscar_chats', argumentos: { consulta } })
const mensagens = (referencia: string, consulta = 'SQLite'): PedidoEntreChats => ({ ferramenta: 'buscar_mensagens_chat', argumentos: { referencia, consulta } })
afterEach(() => vi.useRealTimers())

describe('MC1 serviço de leitura delimitada', () => {
  it('MC01/02: título ou conteúdo → referência de chat → mensagem → vizinhança com fonte', async () => {
    const f = fixture(), consultar = f.criar()
    const chats = await consultar(buscar())
    expect(chats).toMatchObject({ status: 'ok', results: [{ title: 'Investigação de plugins', matchedIn: 'title' }] })
    const hits = await consultar(mensagens(chats.results[0].referencia as string))
    expect(hits.sources[0]).toMatchObject({ sessionId: 'fonte', chatId: 'main', messageId: 'm1' })
    const leitura = await consultar({ ferramenta: 'ler_trecho_chat', argumentos: { referencia: hits.sources[0].referencia } })
    expect(leitura.results[0].trecho).toBe('Decidimos SQLite com WAL.')
    expect((await f.criar()(buscar('WAL'))).results[0]).toMatchObject({ matchedIn: 'content', title: 'Investigação de plugins' })
  })
  it('MC03/14: título duplicado é ambíguo e não autoriza ler um escolhido pelo modelo', async () => {
    const f = fixture(); f.add('segunda', 'Investigação de plugins'); f.origens.get('segunda')!.updatedAt = 18
    const consultar = f.criar(), r = await consultar(buscar())
    expect(r.status).toBe('ambiguous'); expect(r.results).toHaveLength(2)
    expect((await consultar(mensagens(r.results[0].referencia as string))).reason).toBe('resolve_ambiguity_first')
    expect(f.portas.ler).not.toHaveBeenCalled()
    const exatoData = await consultar({ ferramenta: 'buscar_chats', argumentos: { consulta: 'Investigação', apos: 18, ate: 18 } })
    expect(exatoData.reason).toBe('resolve_ambiguity_with_new_human_request')
    expect(f.portas.ler).not.toHaveBeenCalled()
  })
  it('MC04/07: revalida raiz atual mesmo se catálogo devolver referência de outro projeto', async () => {
    const f = fixture(); f.add('externa', 'Canário externo', [linha('x', 'SEGREDO_OUTRO_PROJETO')], '/B')
    vi.mocked(f.portas.listar).mockReturnValue({ rows: [f.origens.get('externa')!], titulo: false, partial: false })
    const r = await f.criar()(buscar('Canário'))
    expect(JSON.stringify(r)).not.toContain('SEGREDO_OUTRO_PROJETO')
    expect(r.results).toEqual([]); expect(r.partial).toBe(true)
    expect(f.portas.ler).not.toHaveBeenCalled()
  })
  it('MC05/17: IDs/caminhos/argumentos e referências de outra execução não são autoridade', async () => {
    const f = fixture(), a = f.criar(), b = f.criar(), r = await a(buscar())
    for (const referencia of ['../../arquivo', 'fonte', r.results[0].referencia as string]) expect((await b(mensagens(referencia))).status).toBe('forbidden')
    expect((await a({ ferramenta: 'buscar_chats', argumentos: { consulta: 'plugins', caminho: '/B' } } as PedidoEntreChats)).status).toBe('forbidden')
    expect(f.portas.ler).not.toHaveBeenCalled()
  })
  it('MC06/18: excluir/recriar mesmos IDs após busca não reativa referência antiga', async () => {
    const f = fixture(), consultar = f.criar(), r = await consultar(buscar())
    f.registros.delete('fonte'); f.origens.delete('fonte')
    expect((await consultar(mensagens(r.results[0].referencia as string))).status).toBe('source_deleted')
    f.add('fonte', 'Investigação de plugins'); f.origens.get('fonte')!.epoch = 'outra-incarnacao'
    expect((await consultar(mensagens(r.results[0].referencia as string))).status).toBe('source_deleted')
  })
  it('MC07/11: troca de raiz e mutação após leitura descartam os resultados', async () => {
    const f = fixture(), consultar = f.criar(), r = await consultar(buscar())
    vi.mocked(f.portas.ler).mockImplementationOnce(async () => { f.raizes.set('fonte', '/B'); return f.textos.get('fonte')! })
    const resposta = await consultar(mensagens(r.results[0].referencia as string))
    expect(resposta.results).toEqual([]); expect(resposta.status).toBe('forbidden')
    f.raizes.set('atual', '/B')
    expect((await consultar(buscar())).status).toBe('forbidden')
  })
  it('MC08: filtra segredos, execução parcial e eventos; não retorna objetos de ferramenta', async () => {
    const f = fixture(); f.add('fonte', 'Investigação de plugins', [linha('a', 'SQLite seguro'), linha('b', 'SQLite senha=SEGREDO'),
      linha('c', 'SQLite evento', 'agir_event'), { ...linha('d', 'SQLite parcial'), message: { content: 'SQLite parcial', running: true } }])
    const consultar = f.criar(), r = await consultar(buscar()), hits = await consultar(mensagens(r.results[0].referencia as string))
    expect(hits.sources.map(s => s.messageId)).toEqual(['a'])
    expect(JSON.stringify(hits)).not.toMatch(/SEGREDO|SQLite parcial|SQLite evento/)
    expect(hits.partial).toBe(true)
  })
  it('MC10: fonte grande/corrompida falha isoladamente e não vaza erro bruto', async () => {
    const f = fixture(), consultar = f.criar(), r = await consultar(buscar())
    vi.mocked(f.portas.ler).mockRejectedValueOnce(Object.assign(new Error('senha=SEGREDO'), { code: 'TRANSCRIPT_TOO_LARGE' }))
    const resultado = await consultar(mensagens(r.results[0].referencia as string))
    expect(resultado.status).toBe('too_large'); expect(JSON.stringify(resultado)).not.toContain('SEGREDO')
  })
  it('MC11: abort, perfil operador e deadline são revalidados depois do await', async () => {
    const f = fixture(), consultar = f.criar(), r = await consultar(buscar())
    vi.mocked(f.portas.ler).mockImplementationOnce(async () => { f.abort.abort(); return f.textos.get('fonte')! })
    expect((await consultar(mensagens(r.results[0].referencia as string))).results).toEqual([])
    const g = fixture(), outro = g.criar(), s = await outro(buscar()); g.owner('outro-perfil')
    expect((await outro(mensagens(s.results[0].referencia as string))).status).toBe('forbidden')
  })
  it('MC12: chat atual nunca simula uma recuperação de outra conversa', async () => {
    const f = fixture(); f.origens.delete('fonte'); f.add('atual', 'Investigação de plugins')
    expect((await f.criar()(buscar())).status).toBe('not_found')
  })
  it('MC13/16: orçamento retorna parcial e a nona consulta não volta a buscar', async () => {
    const f = fixture(), consultar = f.criar(100)
    expect((await consultar(buscar())).partial).toBe(true)
    const normal = f.criar()
    for (let i = 0; i < 8; i++) await normal(buscar('inexistente'))
    const antes = vi.mocked(f.portas.listar).mock.calls.length
    expect((await normal(buscar('inexistente'))).reason).toBe('query_budget')
    expect(vi.mocked(f.portas.listar).mock.calls.length).toBe(antes)
  })
  it('MC07: legado sem prova fica indisponível, sem inventar ausência global', async () => {
    const f = fixture(); f.origens.delete('fonte'); f.legado()
    expect((await f.criar()(buscar())).status).toBe('scope_unverifiable')
  })
  it('MC03: nova seleção humana autoriza somente a conversa escolhida e preserva a pergunta', async () => {
    const f = fixture(); f.add('segunda', 'Investigação de plugins')
    const pergunta = '/chats Investigação de plugins: decidimos SQLite?', a = f.criar(undefined, pergunta)
    const r = await a(buscar()), id = r.escolhas![1].referencia
    expect((await a(mensagens(id))).status).toBe('forbidden')
    const selecionado = f.criar(undefined, `/chats selecionar ${id}`)
    const alvo = await selecionado(buscar('o modelo tentou escolher outro título'))
    expect(alvo.results).toHaveLength(1); expect(alvo.perguntaHumana).toBe(pergunta)
    const hits = await selecionado(mensagens(alvo.results[0].referencia as string))
    expect(hits.sources[0].sessionId).toBe('segunda')
    expect((await f.criar()(mensagens(id))).status).toBe('forbidden')
  })
  it('MC04/05: escolha de outro solicitante, raiz, operador ou expirada não revela pergunta', async () => {
    const f = fixture(); f.add('segunda', 'Investigação de plugins')
    const r = await f.criar(undefined, '/chats PERGUNTA_PRIVADA')(buscar()), id = r.escolhas![0].referencia
    const testar = async (ctx = contexto, argumentos: PedidoEntreChats = buscar()) => {
      const consulta = criarConsultaEntreChats(ctx, { serializar: f.portas.serializar, portas: f.portas, textoHumano: `/chats selecionar ${id}` })
      const resposta = await consulta(argumentos)
      expect(resposta.results).toEqual([]); expect(resposta.perguntaHumana).toBeUndefined()
      expect(JSON.stringify(resposta)).not.toContain('PERGUNTA_PRIVADA')
    }
    f.raizes.set('outro', '/A'); await testar({ ...contexto, sessionId: 'outro' })
    f.raizes.set('atual', '/B'); await testar({ ...contexto, raiz: '/B' }); f.raizes.set('atual', '/A')
    f.owner('outra-pessoa'); await testar(); f.owner('perfil-servidor')
    await testar(contexto, { ferramenta: 'buscar_chats', argumentos: { consulta: 'plugins', caminho: '/A' } } as PedidoEntreChats)
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 11 * 60_000); await testar()
  })
  it('MC18: escolha antiga não autoriza reincarnação; snapshot não muda junto com catálogo', async () => {
    const f = fixture(); f.add('segunda', 'Investigação de plugins')
    const r = await f.criar(undefined, '/chats pergunta')(buscar()), id = r.escolhas![0].referencia
    f.origens.get('fonte')!.epoch = 'recriada'
    const resultado = await f.criar(undefined, `/chats selecionar ${id}`)(buscar())
    expect(resultado.status).toBe('source_deleted'); expect(resultado.results).toEqual([])
  })
  it('MC07/11: troca da identidade física e JSONL não confirmado recusam leitura', async () => {
    const f = fixture(), consulta = f.criar(), r = await consulta(buscar())
    vi.mocked(f.portas.identidadeRaiz).mockReturnValue('diretorio-recriado')
    expect((await consulta(mensagens(r.results[0].referencia as string))).status).toBe('scope_unverifiable')
    const g = fixture(), a = g.criar(), s = await a(buscar()); g.textos.get('fonte')!.push(linha('nova', 'SQLite conteúdo não confirmado'))
    expect((await a(mensagens(s.results[0].referencia as string))).reason).toBe('uncommitted_transcript')
  })
  it('MC11: deadline e corrupção descartam conteúdo após await', async () => {
    const f = fixture(), a = f.criar(), r = await a(buscar())
    vi.useFakeTimers(); vi.mocked(f.portas.ler).mockImplementationOnce(async () => { vi.setSystemTime(Date.now() + 1000); return f.textos.get('fonte')! })
    const resultado = await a(mensagens(r.results[0].referencia as string))
    expect(resultado.reason).toBe('time_budget'); expect(resultado.results).toEqual([])
  })
  it('MC18: recriação do solicitante invalida escolha mesmo com IDs e raiz iguais', async () => {
    const f = fixture(); f.add('atual', 'Atual', []); f.add('segunda', 'Investigação de plugins')
    const r = await f.criar(undefined, '/chats pergunta anterior')(buscar())
    f.origens.get('atual')!.epoch = 'solicitante-recriado'
    const resultado = await f.criar(undefined, `/chats selecionar ${r.escolhas![0].referencia}`)(buscar())
    expect(resultado.results).toEqual([]); expect(resultado.perguntaHumana).toBeUndefined()
  })
  it('MC11: escolha válida não devolve pergunta se escopo mudar durante await', async () => {
    const f = fixture(); f.add('segunda', 'Investigação de plugins')
    const r = await f.criar(undefined, '/chats PERGUNTA_ORIGINAL')(buscar()), selecionar = f.criar(undefined, `/chats selecionar ${r.escolhas![0].referencia}`)
    const s = await selecionar(buscar())
    vi.mocked(f.portas.ler).mockImplementationOnce(async () => { f.owner('outro'); return f.textos.get('fonte')! })
    const resultado = await selecionar(mensagens(s.results[0].referencia as string))
    expect(resultado.status).toBe('forbidden'); expect(resultado.perguntaHumana).toBeUndefined()
    expect(JSON.stringify(resultado)).not.toContain('PERGUNTA_ORIGINAL')
  })
  it('MC02: whitespace extenso não desloca trecho para fora do termo encontrado', async () => {
    const f = fixture(); f.add('fonte', 'Investigação de plugins', [linha('m1', '\n'.repeat(1000) + 'Decisão SQLite')])
    const a = f.criar(), r = await a(buscar()), resultado = await a(mensagens(r.results[0].referencia as string))
    expect(resultado.results[0].trecho).toContain('SQLite')
  })
  it('MC07/18: solicitante sem incarnação comprovada não pode emitir escolhas', async () => {
    const f = fixture(); f.origens.delete('atual'); f.add('segunda', 'Investigação de plugins')
    const r = await f.criar(undefined, '/chats pergunta')(buscar())
    expect(r.reason).toBe('requester_origin_unverifiable'); expect(r.escolhas).toBeUndefined()
    expect(f.portas.listar).not.toHaveBeenCalled(); expect(f.portas.ler).not.toHaveBeenCalled()
  })
  it('MC11: consultas simultâneas serializam uma fonte e descartam publicação concorrente', async () => {
    const f = fixture(), filas = new Map<string, Promise<unknown>>()
    f.portas.serializar = async (id, fn) => {
      const anterior = filas.get(id) ?? Promise.resolve(), atual = anterior.catch(() => {}).then(fn)
      filas.set(id, atual); try { return await atual } finally { if (filas.get(id) === atual) filas.delete(id) }
    }
    let lendo = 0, max = 0
    vi.mocked(f.portas.ler).mockImplementation(async () => {
      lendo++; max = Math.max(max, lendo)
      await new Promise<void>(ok => setTimeout(ok, 5)); lendo--
      return structuredClone(f.textos.get('fonte')!)
    })
    const a = f.criar(), b = f.criar(), [ra, rb] = await Promise.all([a(buscar()), b(buscar())])
    const [ma, mb] = await Promise.all([a(mensagens(ra.results[0].referencia as string)), b(mensagens(rb.results[0].referencia as string))])
    expect(max).toBe(1); expect(ma.sources).toHaveLength(1); expect(mb.sources).toHaveLength(1); expect(filas.size).toBe(0)
    vi.mocked(f.portas.ler).mockImplementationOnce(async () => {
      f.origens.get('fonte')!.digest = 'nova-publicacao'; return structuredClone(f.textos.get('fonte')!)
    })
    const resposta = await a(mensagens(ra.results[0].referencia as string))
    expect(resposta.results).toEqual([]); expect(resposta.status).toBe('scope_unverifiable'); expect(filas.size).toBe(0)
  })
  it('MC03/10: candidato não examinado impede escolher sozinho o único hit', async () => {
    const f = fixture(); f.add('segunda', 'Outro assunto')
    vi.mocked(f.portas.ler).mockRejectedValueOnce(Object.assign(new Error('fonte grande'), { code: 'TRANSCRIPT_TOO_LARGE' }))
    const a = f.criar(), r = await a(buscar('SQLite'))
    expect(r.status).toBe('ambiguous'); expect(r.partial).toBe(true); expect(r.results).toHaveLength(1)
    expect((await a(mensagens(r.results[0].referencia as string))).reason).toBe('resolve_ambiguity_first')
  })
})
