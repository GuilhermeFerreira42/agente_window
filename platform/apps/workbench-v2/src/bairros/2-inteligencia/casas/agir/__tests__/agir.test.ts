// ============================================================================
// Provas do LOOP da casa Agir (C1 — executores falsos, nada toca disco):
// texto puro · ferramenta→texto · negação do dono · teto de iteracoes ·
// Parar antes e no meio · o comportamento dos executores falsos.
// ============================================================================
import { describe, expect, it } from 'vitest'
import type { EventoAgir, ExecutorFerramenta, MensagemAgir, OpcoesVizinho, RespostaIteracao, VizinhoProvedor } from '../contract'
import { TETO_PADRAO, rodarAgir } from '../server/agir'
import { criarExecutoresFalsos, ehMexida } from '../server/ferramentas'

/** Vizinho falso que segue um roteiro (uma resposta por chamada, na ordem) —
 * e cumpre o contrato do fio: texto sai AO VIVO pelo `aoTexto`. */
function vizinhoRoteado(roteiro: RespostaIteracao[]) {
  const chamadas: MensagemAgir[][] = []
  return {
    chamadas,
    vizinho: async (mensagens: MensagemAgir[], opcoes?: OpcoesVizinho): Promise<RespostaIteracao> => {
      chamadas.push(mensagens.map((m) => ({ ...m })))
      const iteracao = chamadas.length - 1
      if (iteracao >= roteiro.length) throw new Error('roteiro acabou')
      const resposta = roteiro[iteracao]
      if (resposta.texto !== '') opcoes?.aoTexto?.(resposta.texto)
      return resposta
    },
  }
}

const EXECUTORES = criarExecutoresFalsos()

describe('O loop do agente (rodarAgir)', () => {
  it('resposta em texto puro: 1 iteração, chunk + done, sem tocar ferramenta', async () => {
    const { vizinho, chamadas } = vizinhoRoteado([{ texto: 'Olá, dono!', pedidos: [], modelo: 'modelo-teste' }])
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
    })
    expect(fim).toEqual({ status: 'respondeu', textoFinal: 'Olá, dono!', iteracoes: 1 })
    expect(eventos.map((e) => e.type)).toEqual(['iteracao', 'chunk', 'done'])
    expect(eventos[0]).toEqual({ type: 'iteracao', iteracao: 1, teto: TETO_PADRAO })
    expect(eventos[2]).toEqual({ type: 'done', model: 'modelo-teste' })
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
    expect(eventos.map((e) => e.type)).toEqual(['iteracao', 'tool', 'tool_result', 'iteracao', 'chunk', 'done'])
    expect(eventos[2]).toMatchObject({ type: 'tool_result', id: 'p1', ferramenta: 'escrever', ok: true })
    // Na 2.ª iteração o modelo vê o eco do que pediu + o resultado da ferramenta:
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
    expect(eventos.map((e) => e.type)).toEqual(['iteracao', 'tool', 'approval', 'tool_result', 'iteracao', 'chunk', 'done'])
    expect(executou).toBe(0)
    expect(eventos[3]).toMatchObject({ type: 'tool_result', ok: false })
    const segunda = chamadas[1]
    expect(segunda[segunda.length - 1].conteudo).toContain('NÃO EXECUTADO')
    expect(fim.status).toBe('respondeu')
  })

  it('teto de iteracoes: a IA que só pede ferramenta PAUSA com evento `teto` (não erro)', async () => {
    let n = 0
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho: async () => {
        n += 1
        // Argumentos DIFERENTES a cada iteração: o guardião anti-loop (C4) bloqueia
        // repetição idêntica — este teste é do TETO de iteracoes, não do guardião.
        return { texto: '', pedidos: [{ id: `p${n}`, ferramenta: 'buscar', argumentos: { padrao: `padrao-${n}` } }] }
      },
      historico: [{ papel: 'usuario', conteudo: 'procura' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
    })
    expect(TETO_PADRAO).toBe(25)
    expect(fim.status).toBe('iteracoes_excedidas')
    expect(fim.iteracoes).toBe(TETO_PADRAO)
    expect(n).toBe(TETO_PADRAO)
    expect(eventos.at(-1)).toEqual({ type: 'teto', iteracoes: TETO_PADRAO, teto: TETO_PADRAO })
    expect(eventos.some((e) => e.type === 'error')).toBe(false)
    // A retomada leva o diálogo acumulado (eco + resultados):
    expect(fim.mensagensParaRetomar?.length).toBeGreaterThan(1)
    expect(fim.mensagensParaRetomar?.at(-1)).toMatchObject({ papel: 'ferramenta' })
  })

  it('teto configurável: vale o que a rota mandar (a casa Config é dona do número)', async () => {
    let n = 0
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho: async () => {
        n += 1
        return { texto: '', pedidos: [{ id: `q${n}`, ferramenta: 'buscar', argumentos: { padrao: `x-${n}` } }] }
      },
      historico: [{ papel: 'usuario', conteudo: 'procura' }],
      executores: EXECUTORES,
      teto: 2,
      emitir: (e) => eventos.push(e),
    })
    expect(n).toBe(2)
    expect(fim).toMatchObject({ status: 'iteracoes_excedidas', iteracoes: 2 })
    expect(eventos.at(-1)).toEqual({ type: 'teto', iteracoes: 2, teto: 2 })
  })

  it('retomada: o mesmo fluxo continua de onde parou (orçamento cheio)', async () => {
    const sempreFerramenta = (prefixo: string): VizinhoProvedor => {
      let n = 0
      return async () => {
        n += 1
        return { texto: '', pedidos: [{ id: `${prefixo}${n}`, ferramenta: 'buscar', argumentos: { padrao: `${prefixo}-${n}` } }] }
      }
    }
    const eventos1: EventoAgir[] = []
    const pausa = await rodarAgir({
      vizinho: sempreFerramenta('a'),
      historico: [{ papel: 'usuario', conteudo: 'procura' }],
      executores: EXECUTORES,
      teto: 1,
      emitir: (e) => eventos1.push(e),
    })
    expect(pausa.status).toBe('iteracoes_excedidas')
    expect(eventos1.at(-1)).toEqual({ type: 'teto', iteracoes: 1, teto: 1 })
    // O "continuar" reabre o loop com o diálogo guardado (+1 orçamento cheio):
    const eventos2: EventoAgir[] = []
    const chamadas2: MensagemAgir[][] = []
    const fim = await rodarAgir({
      vizinho: async (mensagens) => {
        chamadas2.push(mensagens)
        return { texto: 'Achei após continuar.', pedidos: [], modelo: 'm' }
      },
      historico: pausa.mensagensParaRetomar ?? [],
      executores: EXECUTORES,
      teto: 25,
      emitir: (e) => eventos2.push(e),
    })
    expect(fim).toMatchObject({ status: 'respondeu', textoFinal: 'Achei após continuar.' })
    // A retomada viu o eco da ferramenta + o resultado (o MESMO fluxo):
    expect(chamadas2[0].filter((m) => m.papel === 'ferramenta')).toHaveLength(1)
    // (O falso não chama `aoTexto` — `chunk` só existe no vizinho real; aqui o `done` basta.)
    expect(eventos2.map((e) => e.type)).toEqual(['iteracao', 'done'])
  })

  it('guardião anti-loop: 3 chamadas idênticas seguidas = bloqueio honesto (C4)', async () => {
    const eventos: EventoAgir[] = []
    let execucoes = 0
    const buscarEspiada: ExecutorFerramenta = async () => {
      execucoes += 1
      return { ok: true, resumo: 'leu' }
    }
    const fim = await rodarAgir({
      vizinho: async () => ({ texto: '', pedidos: [{ id: 'x', ferramenta: 'buscar', argumentos: { padrao: 'sempre-igual' } }] }),
      historico: [{ papel: 'usuario', conteudo: 'procura' }],
      executores: { ...EXECUTORES, buscar: buscarEspiada },
      emitir: (e) => eventos.push(e),
    })
    expect(execucoes).toBe(2) // a 3.ª NÃO executa
    expect(fim.status).toBe('loop_bloqueado')
    const ultimoResultado = eventos.filter((e) => e.type === 'tool_result').at(-1) as { ok: boolean; resumo: string }
    expect(ultimoResultado.ok).toBe(false)
    expect(ultimoResultado.resumo).toContain('Bloqueado: 3 chamadas idênticas')
    expect(eventos.at(-1)).toMatchObject({ type: 'error', code: 'loop' })
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
    expect(fim).toEqual({ status: 'interrompido', textoFinal: '', iteracoes: 0 })
    expect(eventos).toEqual([])
  })

  it('erro TRANSITÓRIO do provedor: evento `error` retomável + diálogo guardado (pós-11)', async () => {
    let chamadas = 0
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho: async () => {
        chamadas += 1
        if (chamadas === 1) {
          return { texto: '', pedidos: [{ id: 'p1', ferramenta: 'buscar', argumentos: { padrao: 'x' } }] }
        }
        throw Object.assign(new Error('lento'), { code: 'tempo' })
      },
      historico: [{ papel: 'usuario', conteudo: 'procura' }],
      executores: EXECUTORES,
      teto: 3,
      emitir: (e) => eventos.push(e),
    })
    expect(fim.status).toBe('erro')
    expect(fim.codigoErro).toBe('tempo')
    expect(fim.mensagensParaRetomar?.length).toBeGreaterThan(1)
    expect(eventos.at(-1)).toMatchObject({ type: 'error', code: 'tempo', retomavel: true, iteracoes: 2, teto: 3 })
  })

  it('erro DEFINITIVO (chave): sem retomada, sem `retomavel` (pós-11)', async () => {
    const eventos: EventoAgir[] = []
    const fim = await rodarAgir({
      vizinho: async () => {
        throw Object.assign(new Error('negada'), { code: 'chave' })
      },
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores: EXECUTORES,
      emitir: (e) => eventos.push(e),
    })
    expect(fim.status).toBe('erro')
    expect(fim.codigoErro).toBe('chave')
    expect(fim.mensagensParaRetomar).toBeUndefined()
    expect(eventos.at(-1)).not.toHaveProperty('retomavel')
  })

  it('Parar NO MEIO: a ferramenta seguinte não executa (checa antes de cada execução)', async () => {
    const controle = new AbortController()
    const eventos: EventoAgir[] = []
    let execucoes = 0
    let chamadas = 0
    const fim = await rodarAgir({
      vizinho: async () => {
        chamadas += 1
        // 1.ª iteração: pede ler (executa normal); 2.ª: aborta e pede de novo.
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
    expect(eventos.map((e) => e.type)).toEqual(['iteracao', 'tool', 'tool_result', 'iteracao'])
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
