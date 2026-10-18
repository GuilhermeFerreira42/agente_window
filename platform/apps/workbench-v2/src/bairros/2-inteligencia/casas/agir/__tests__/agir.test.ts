// ============================================================================
// Provas do LOOP da casa Agir (C1 — executores falsos, nada toca disco):
// texto puro · ferramenta→texto · negação do dono · teto de voltas ·
// Parar antes e no meio · o comportamento dos executores falsos.
// ============================================================================
import { describe, expect, it } from 'vitest'
import type { EventoAgir, ExecutorFerramenta, MensagemAgir, OpcoesVizinho, RespostaVolta } from '../contract'
import { MAX_VOLTAS, rodarAgir } from '../server/agir'
import { criarExecutoresFalsos, ehMexida } from '../server/ferramentas'

/** Vizinho falso que segue um roteiro (uma resposta por chamada, na ordem) —
 * e cumpre o contrato do fio: texto sai AO VIVO pelo `aoTexto`. */
function vizinhoRoteado(roteiro: RespostaVolta[]) {
  const chamadas: MensagemAgir[][] = []
  return {
    chamadas,
    vizinho: async (mensagens: MensagemAgir[], opcoes?: OpcoesVizinho): Promise<RespostaVolta> => {
      chamadas.push(mensagens.map((m) => ({ ...m })))
      const volta = chamadas.length - 1
      if (volta >= roteiro.length) throw new Error('roteiro acabou')
      const resposta = roteiro[volta]
      if (resposta.texto !== '') opcoes?.aoTexto?.(resposta.texto)
      return resposta
    },
  }
}

const EXECUTORES = criarExecutoresFalsos()

describe('O loop do agente (rodarAgir)', () => {
  it('resposta em texto puro: 1 volta, chunk + done, sem tocar ferramenta', async () => {
    const { vizinho, chamadas } = vizinhoRoteado([{ texto: 'Olá, dono!', pedidos: [], modelo: 'modelo-teste' }])
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
    })
    expect(fim).toEqual({ status: 'respondeu', textoFinal: 'Olá, dono!', voltas: 1 })
    expect(eventos.map((e) => e.type)).toEqual(['chunk', 'done'])
    expect(eventos[1]).toEqual({ type: 'done', model: 'modelo-teste' })
    expect(chamadas).toHaveLength(1)
  })

  it('ferramenta então texto: executa, devolve o resultado ao modelo e responde', async () => {
    const { vizinho, chamadas } = vizinhoRoteado([
      { texto: '', pedidos: [{ id: 'p1', ferramenta: 'escrever', argumentos: { caminho: 'ola.txt', conteudo: 'oi' } }] },
      { texto: 'Pronto, criei (em simulado).', pedidos: [], modelo: 'm' },
    ])
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'crie o ola.txt' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
    })
    expect(eventos.map((e) => e.type)).toEqual(['tool', 'tool_result', 'chunk', 'done'])
    expect(eventos[1]).toMatchObject({ type: 'tool_result', id: 'p1', ferramenta: 'escrever', ok: true })
    // Na 2.ª volta o modelo vê o eco do que pediu + o resultado da ferramenta:
    const segunda = chamadas[1]
    expect(segunda[segunda.length - 2]).toMatchObject({ papel: 'assistente', pedidos: [{ id: 'p1' }] })
    expect(segunda[segunda.length - 1]).toMatchObject({
      papel: 'ferramenta',
      pedidoId: 'p1',
      ferramenta: 'escrever',
    })
    expect(fim.status).toBe('respondeu')
    expect(fim.textoFinal).toContain('Pronto')
  })

  it('dono NEGA a mexida: o executor não roda e o modelo recebe o "não"', async () => {
    const { vizinho, chamadas } = vizinhoRoteado([
      { texto: '', pedidos: [{ id: 'p1', ferramenta: 'escrever', argumentos: { caminho: 'x.txt', conteudo: 'v' } }] },
      { texto: 'Entendi, não vou escrever.', pedidos: [], modelo: 'm' },
    ])
    const eventos: EventoAgir[] = []
    let executou = 0
    const escreverEspiado: ExecutorFerramenta = async () => {
      executou += 1
      return { ok: true, resumo: 'nunca deveria acontecer' }
    }
    const fim = await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'escreve' }],
      executores: { ...EXECUTORES, escrever: escreverEspiado },
      emitir: (e) => eventos.push(e),
      pedirAprovacao: async (pedidoDaVez) => {
        eventos.push({ type: 'approval', pedido: pedidoDaVez }) // quem pergunta anuncia
        return false
      },
    })
    expect(eventos.map((e) => e.type)).toEqual(['tool', 'approval', 'tool_result', 'chunk', 'done'])
    expect(executou).toBe(0)
    expect(eventos[2]).toMatchObject({ type: 'tool_result', ok: false })
    const segunda = chamadas[1]
    expect(segunda[segunda.length - 1].conteudo).toContain('NÃO EXECUTADO')
    expect(fim.status).toBe('respondeu')
  })

  it('teto de voltas: a IA que só pede ferramenta é parada com erro honesto', async () => {
    let n = 0
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho: async () => {
        n += 1
        return { texto: '', pedidos: [{ id: `p${n}`, ferramenta: 'buscar', argumentos: { padrao: 'x' } }] }
      },
      historico: [{ papel: 'usuario', conteudo: 'procura' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
    })
    expect(MAX_VOLTAS).toBe(10)
    expect(fim.status).toBe('voltas_excedidas')
    expect(fim.voltas).toBe(MAX_VOLTAS)
    const erro = eventos.find((e) => e.type === 'error')
    expect(erro).toMatchObject({ type: 'error', code: 'voltas' })
  })

  it('Parar ANTES de começar: silêncio total (sem evento nenhum) — lição da 09', async () => {
    const { vizinho } = vizinhoRoteado([{ texto: 'não deve chegar aqui', pedidos: [] }])
    const eventos: EventoAgir[] = []
    const controle = new AbortController()
    controle.abort()
    const fim = await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
      sinal: controle.signal,
    })
    expect(fim).toEqual({ status: 'interrompido', textoFinal: '', voltas: 0 })
    expect(eventos).toEqual([])
  })

  it('Parar NO MEIO: a ferramenta seguinte não executa (checa antes de cada execução)', async () => {
    const controle = new AbortController()
    const eventos: EventoAgir[] = []
    let execucoes = 0
    let chamadas = 0
    const fim = await rodarAgir({
      vizinho: async () => {
        chamadas += 1
        // 1.ª volta: pede ler (executa normal); 2.ª: aborta e pede de novo.
        if (chamadas === 1) {
          return { texto: '', pedidos: [{ id: 'p1', ferramenta: 'ler', argumentos: { caminho: 'a.txt' } }] }
        }
        controle.abort()
        return { texto: '', pedidos: [{ id: 'p2', ferramenta: 'ler', argumentos: { caminho: 'b.txt' } }] }
      },
      historico: [{ papel: 'usuario', conteudo: 'leia' }],
      executores: {
        ...EXECUTORES,
        ler: async (pedido) => {
          execucoes += 1
          return { ok: true, resumo: `leu ${String(pedido.argumentos.caminho)}` }
        },
      },
      emitir: (e) => eventos.push(e),
      sinal: controle.signal,
    })
    expect(execucoes).toBe(1)
    expect(eventos.map((e) => e.type)).toEqual(['tool', 'tool_result'])
    expect(fim.status).toBe('interrompido')
  })
})

describe('Executores falsos da C1 (prova do esqueleto, sem disco)', () => {
  it('recusa honesta quando falta argumento obrigatório', async () => {
    const r = await EXECUTORES.ler({ id: 'x', ferramenta: 'ler', argumentos: {} })
    expect(r.ok).toBe(false)
    expect(r.resumo).toContain('faltou caminho')
  })

  it('criar/escrever dizem em voz alta que NADA foi gravado no disco', async () => {
    const criar = await EXECUTORES.criar({ id: 'x', ferramenta: 'criar', argumentos: { caminho: 'n.txt', conteudo: 'abc' } })
    const escrever = await EXECUTORES.escrever({ id: 'y', ferramenta: 'escrever', argumentos: { caminho: 'n.txt', conteudo: 'abc' } })
    for (const r of [criar, escrever]) {
      expect(r.ok).toBe(true)
      expect(r.resumo).toContain('SIMULADO C1')
      expect(r.resumo).toContain('NADA foi escrito no disco')
    }
  })

  it('Q1=(a): ler/listar/buscar são de graça; criar/escrever são mexida', () => {
    expect(ehMexida('ler')).toBe(false)
    expect(ehMexida('listar')).toBe(false)
    expect(ehMexida('buscar')).toBe(false)
    expect(ehMexida('criar')).toBe(true)
    expect(ehMexida('escrever')).toBe(true)
  })
})
