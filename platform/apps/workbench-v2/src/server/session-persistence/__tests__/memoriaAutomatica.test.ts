import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AlvoConversa } from '../../../bairros/2-inteligencia/casas/conversa'
import type { MensagemAgir } from '../../../bairros/2-inteligencia/casas/agir'
import { aplicarNoLoop, criarMemoriaAutomatica, selecionarMemorias, type FonteMemoria, type PortasMemoria } from '../memoriaAutomatica'
import { proporCheckpoint } from '../checkpoint'

const mock = vi.hoisted(() => ({ resumir: vi.fn(async (_alvo?: AlvoConversa, _historico?: MensagemAgir[], _anterior?: string) => 'Decisão preservada: usar SQLite. Não repetir efeitos.') }))
vi.mock('../compactacao', async (importOriginal) => ({ ...await importOriginal<typeof import('../compactacao')>(), gerarResumo: mock.resumir }))
const escopo = { sessionId: 's', chatId: 'c', raiz: '/synthetic' }
const alvo: AlvoConversa = { protocolo: 'openai-chat', baseUrl: 'http://synthetic', modelo: 'm', apiKey: null,
  providerId: 'p', modelId: 'm', maxSaida: 512, limiteContexto: 9000 }

function fixture() {
  const fonte: FonteMemoria = { escopo: 'hash', checkpoint: undefined, entries: Array.from({ length: 12 }, (_, i) => ({
    type: i % 2 ? 'assistant' : 'user', chatId: 'c', uuid: `m${i}`, timestamp: i,
    message: { id: `m${i}`, role: i % 2 ? 'assistant' : 'user', content: `Decisão ${i}. ` + 'conteudo '.repeat(100) },
  })) }
  const mensagens: MensagemAgir[] = fonte.entries.map((e) => ({ papel: e.type === 'user' ? 'usuario' : 'assistente', origemId: e.uuid,
    conteudo: (e.message as { content: string }).content }))
  mensagens.push({ papel: 'usuario', origemId: 'atual', conteudo: 'Continue o trabalho SQLite.' },
    { papel: 'assistente', conteudo: '', pedidos: [{ id: 'efeito-1', ferramenta: 'criar', argumentos: { caminho: 'feito.txt', conteudo: 'transitorio' } }] },
    { papel: 'ferramenta', pedidoId: 'efeito-1', ferramenta: 'criar', conteudo: 'Arquivo criado.' })
  const publicar = vi.fn(async (_c, _a, cp) => { fonte.checkpoint = cp; return true })
  const portas: PortasMemoria = { ler: async () => structuredClone(fonte), publicar,
    memorias: async () => [], iniciarModelo: vi.fn(), bloqueios: new Set() }
  return { fonte, mensagens, publicar, portas, preparar: criarMemoriaAutomatica(portas) }
}

beforeEach(() => { mock.resumir.mockReset(); mock.resumir.mockResolvedValue('Decisão preservada: usar SQLite. Não repetir efeitos.') })

describe('continuidade automática — contratos', () => {
  it('classifica orçamento local impossível como configuração, sem iniciar resumo', async () => {
    const f = fixture()
    await expect(f.preparar(escopo, f.mensagens, { ...alvo, limiteContexto: 1, maxSaida: 1 }, new AbortController().signal, vi.fn()))
      .rejects.toMatchObject({ code: 'configuracao' })
    expect(mock.resumir).not.toHaveBeenCalled()
    expect(f.publicar).not.toHaveBeenCalled()
  })
  it('avança por prefixos completos limitados em conversa maior que uma compactação', async () => {
    const f = fixture()
    f.fonte.entries = Array.from({ length: 40 }, (_, i) => ({ type: i % 2 ? 'assistant' : 'user', chatId: 'c', uuid: `grande${i}`, timestamp: i,
      message: { id: `grande${i}`, role: i % 2 ? 'assistant' : 'user', content: 'dado '.repeat(2000) } }))
    const mensagens = f.fonte.entries.map((e): MensagemAgir => ({ papel: e.type === 'user' ? 'usuario' : 'assistente', origemId: e.uuid, conteudo: (e.message as { content: string }).content }))
    mensagens.push({ papel: 'usuario', conteudo: 'Continue.' })
    const a = { ...alvo, limiteContexto: 1_000_000 }
    await f.preparar(escopo, mensagens, a, new AbortController().signal, vi.fn(), true)
    const primeiro = f.fonte.checkpoint!.quantidade
    expect(primeiro).toBeGreaterThan(0); expect(primeiro).toBeLessThan(36)
    expect(new TextEncoder().encode(JSON.stringify(mock.resumir.mock.calls[0][1])).length).toBeLessThan(160000)
    await f.preparar(escopo, mensagens, a, new AbortController().signal, vi.fn(), true)
    expect(f.fonte.checkpoint!.quantidade).toBeGreaterThan(primeiro)
    expect(f.fonte.entries).toHaveLength(40)
  })
  it('publica prefixo consistente, mantém dois turnos recentes, fonte e efeitos ativos intactos', async () => {
    const f = fixture(), original = structuredClone(f.fonte.entries), eventos = vi.fn()
    const resultado = await f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, eventos)
    expect(f.fonte.entries).toEqual(original)
    expect(f.fonte.checkpoint).toMatchObject({ estrategia: 'automatica', quantidade: 8 })
    expect(resultado.some((m) => m.origemId === 'm0')).toBe(false)
    expect(resultado.filter((m) => ['m8','m9','m10','m11'].includes(m.origemId ?? ''))).toHaveLength(4)
    expect(resultado.slice(-3)).toEqual(f.mensagens.slice(-3))
    expect(eventos.mock.calls.map(([e]) => e.estado)).toEqual(['compactando', 'compactado'])
    await f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, vi.fn())
    expect(mock.resumir).toHaveBeenCalledTimes(1)
    await expect(f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, vi.fn(), true)).rejects.toThrow(/prefixo novo seguro/)
  })

  it('serializa compactações concorrentes e preserva checkpoint anterior quando CAS falha', async () => {
    const f = fixture()
    await Promise.all([f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, vi.fn()),
      f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, vi.fn())])
    expect(mock.resumir).toHaveBeenCalledTimes(1)
    expect(f.publicar).toHaveBeenCalledTimes(1)
    const g = fixture(); g.publicar.mockImplementation(async () => false)
    await expect(g.preparar(escopo, g.mensagens, alvo, new AbortController().signal, vi.fn())).rejects.toThrow(/mudou/)
    expect(g.fonte.checkpoint).toBeUndefined()
    expect(g.portas.bloqueios.size).toBe(0)
  })

  it('cancela antes da publicação e não gera checkpoint com falha do modelo', async () => {
    const f = fixture(), abort = new AbortController()
    mock.resumir.mockImplementationOnce(async () => { abort.abort(); return 'resultado tardio' })
    await expect(f.preparar(escopo, f.mensagens, alvo, abort.signal, vi.fn())).rejects.toThrow()
    expect(f.publicar).not.toHaveBeenCalled()
    mock.resumir.mockRejectedValueOnce(new Error('synthetic failure'))
    await expect(f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, vi.fn())).rejects.toThrow('synthetic failure')
    expect(f.fonte.checkpoint).toBeUndefined()
  })

  it('leva o sinal até a publicação enfileirada e permite nova compactação após cancelar', async () => {
    const f = fixture(), abort = new AbortController()
    let liberar!: () => void, entrou!: () => void
    const entrada = new Promise<void>((resolve) => { entrou = resolve })
    const gate = new Promise<void>((resolve) => { liberar = resolve })
    f.portas.publicar = vi.fn(async (_escopo, _fonte, cp, sinal) => {
      entrou(); await gate
      if (sinal.aborted) return false
      f.fonte.checkpoint = cp; return true
    })
    const rodando = f.preparar(escopo, f.mensagens, alvo, abort.signal, vi.fn())
    await entrada; abort.abort(); liberar()
    await expect(rodando).rejects.toThrow()
    expect(f.fonte.checkpoint).toBeUndefined()
    expect(f.portas.bloqueios.size).toBe(0)
    await f.preparar(escopo, f.mensagens, alvo, new AbortController().signal, vi.fn())
    expect(f.fonte.checkpoint).toBeDefined()
  })

  it('reaplica checkpoint após reinício e não usa fonte ou chat incompatível', () => {
    const f = fixture(), fronteira = proporCheckpoint(f.fonte.entries, 'c', 'hash')!
    f.fonte.checkpoint = { ...fronteira, version: 1, estrategia: 'automatica', escopo: 'hash', resumo: 'Resumo', criadoEm: 1, providerId: 'p', modelId: 'm' }
    expect(aplicarNoLoop(structuredClone(f.fonte), 'c', f.mensagens)[0].derivado).toBe('checkpoint')
    expect(aplicarNoLoop(f.fonte, 'outro', f.mensagens)).toEqual(f.mensagens)
    expect(aplicarNoLoop({ ...f.fonte, escopo: 'outro' }, 'c', f.mensagens)).toEqual(f.mensagens)
  })

  it('seleciona somente revisões vigentes e relevantes, com limite e sem credenciais', () => {
    const base = { revisao: 1, tipo: 'decisao' as const, criadaEm: 1, vigente: true, motivo: '', origem: { sessionId: 's', chatId: 'c' } }
    const registros = [{ ...base, id: 'a', conteudo: 'Usar SQLite no cadastro.' },
      { ...base, id: 'b', conteudo: 'Usar SQLite antigo.', vigente: false },
      { ...base, id: 'c', conteudo: 'Tema escuro.' }, { ...base, id: 'd', conteudo: 'SQLite senha=CANARIO_PRIVADO' }]
    expect(selecionarMemorias(registros, 'Decisão SQLite').map(({ id }) => id)).toEqual(['a'])
    expect(selecionarMemorias(registros, 'Assunto ausente')).toEqual([])
  })
})
