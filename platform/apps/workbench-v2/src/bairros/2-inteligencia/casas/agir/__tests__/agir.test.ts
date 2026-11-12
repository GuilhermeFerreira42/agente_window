// ============================================================================
// Provas do LOOP da casa Agir (C1 — executores falsos, nada toca disco):
// texto puro · ferramenta→texto · negação do dono · teto de iteracoes ·
// Parar antes e no meio · o comportamento dos executores falsos.
// ============================================================================
import { describe, expect, it, vi } from 'vitest'
import type { EventoAgir, ExecutorFerramenta, MensagemAgir, OpcoesVizinho, PedidoFerramenta, RespostaIteracao, VizinhoProvedor } from '../contract'
import { TETO_PADRAO, rodarAgir } from '../server/agir'
import { criarExecutoresFalsos, ehMexida } from '../server/ferramentas'
import { enviarAgir } from '../ui/client/api'

it('não oferece continuação por timeout para configuração local inválida', async () => {
  const eventos: EventoAgir[] = []
  const resultado = await rodarAgir({ historico: [{ papel: 'usuario', conteudo: 'oi' }],
    vizinho: async () => { throw Object.assign(new Error('Capacidade insuficiente.'), { code: 'configuracao' }) },
    executores: criarExecutoresFalsos(), emitir: evento => eventos.push(evento) })
  expect(resultado).toMatchObject({ status: 'erro', codigoErro: 'configuracao' })
  expect(resultado.mensagensParaRetomar).toBeUndefined()
  expect(eventos.find(e => e.type === 'error')).toMatchObject({ code: 'configuracao', message: 'Capacidade insuficiente.' })
  expect(eventos.find(e => e.type === 'error')).not.toHaveProperty('retomavel')
})

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

describe('Missão 2 — terminalização e recuperação sem repetir DELETE', () => {
  it.each([400,401,403,404,422])('HTTP %s terminal não oferece continuação automática do mesmo payload', async status => {
    const eventos: EventoAgir[]=[]
    const fim=await rodarAgir({historico:[{papel:'usuario',conteudo:'tarefa'}],executores:EXECUTORES,emitir:e=>eventos.push(e),vizinho:async()=>{throw Object.assign(new Error('recusado'),{code:status===401||status===403?'chave':'http',httpStatus:status})}})
    expect(fim.status).toBe('erro')
    expect(fim.mensagensParaRetomar).toBeUndefined()
    expect(eventos.at(-1)).not.toHaveProperty('retomavel')
  })
  it('rede cai depois de DELETE concluído: retomada inclui resultado e não repete a tool', async () => {
    const excluir=vi.fn(async()=>({ok:true,resumo:'movido para a lixeira'}))
    let chamada=0
    const fim=await rodarAgir({historico:[{papel:'usuario',conteudo:'exclua'}],executores:{...EXECUTORES,excluir},emitir:()=>undefined,pedirAprovacao:async()=>true,vizinho:async()=>{
      if (++chamada===1) return {texto:'',pedidos:[{id:'delete-unico',ferramenta:'excluir',argumentos:{caminho:'arquivo'}}]}
      throw Object.assign(new Error('DNS'),{code:'endereco'})
    }})
    expect(excluir).toHaveBeenCalledOnce()
    expect(fim.mensagensParaRetomar?.at(-1)).toMatchObject({papel:'ferramenta',pedidoId:'delete-unico',conteudo:'movido para a lixeira'})
    await rodarAgir({historico:fim.mensagensParaRetomar!,executores:{...EXECUTORES,excluir},emitir:()=>undefined,vizinho:async()=>({texto:'resultado preservado',pedidos:[]})})
    expect(excluir).toHaveBeenCalledOnce()
  })
  it('exceção de executor mutável informa efeito incerto, encerra e não chama modelo novamente', async () => {
    const vizinho=vi.fn(async()=>({texto:'',pedidos:[{id:'incerto',ferramenta:'excluir' as const,argumentos:{caminho:'arquivo'}}]}))
    const eventos:EventoAgir[]=[]
    const fim=await rodarAgir({historico:[],executores:{...EXECUTORES,excluir:async()=>{throw new Error('falhou após iniciar')}},emitir:e=>eventos.push(e),vizinho,pedirAprovacao:async()=>true})
    expect(fim).toMatchObject({status:'erro',codigoErro:'resposta'})
    expect(vizinho).toHaveBeenCalledOnce()
    expect(eventos).toContainEqual(expect.objectContaining({type:'tool_result',ok:false,efeitoIniciado:true}))
    expect(eventos.at(-1)).toMatchObject({type:'error',code:'resposta'})
  })
})

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

  it('revalida sessão/workspace antes do provider e bloqueia contexto inválido', async () => {
    const vizinho = vi.fn(async () => ({ texto: 'não deve chamar', pedidos: [] }))
    const executar = vi.fn(async () => ({ ok: true, resumo: 'não deve executar' }))
    const eventos: EventoAgir[] = []
    const resultado = await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores: { ...EXECUTORES, criar: executar },
      emitir: (evento) => eventos.push(evento),
      validarContexto: () => false,
    })
    expect(vizinho).not.toHaveBeenCalled()
    expect(executar).not.toHaveBeenCalled()
    expect(resultado).toMatchObject({ status: 'erro', codigoErro: 'fluxo' })
    expect(eventos.at(-1)).toMatchObject({ type: 'error', code: 'fluxo' })
  })

  it('revalida novamente após aprovação, imediatamente antes de executar a ferramenta', async () => {
    let checks = 0
    const executar = vi.fn(async () => ({ ok: true, resumo: 'executada' }))
    const eventos: EventoAgir[] = []
    const resultado = await rodarAgir({
      vizinho: async () => ({ texto: '', pedidos: [{ id: 'ctx-1', ferramenta: 'criar', argumentos: { caminho: 'x.txt', conteudo: 'x' } }] }),
      historico: [{ papel: 'usuario', conteudo: 'crie x.txt' }],
      executores: { ...EXECUTORES, criar: executar },
      emitir: (evento) => eventos.push(evento),
      pedirAprovacao: async () => true,
      validarContexto: () => ++checks === 1,
    })
    expect(checks).toBe(2)
    expect(executar).not.toHaveBeenCalled()
    expect(resultado).toMatchObject({ status: 'erro', codigoErro: 'fluxo' })
    expect(eventos.at(-1)).toMatchObject({ type: 'error', code: 'fluxo' })
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

  it('Parar durante executor já iniciado preserva o resultado concluído sem nova iteração', async () => {
    const controle = new AbortController()
    const eventos: EventoAgir[] = []
    let iniciou!: () => void
    let concluir!: (resultado: { ok: boolean; resumo: string }) => void
    const iniciado = new Promise<void>((resolve) => { iniciou = resolve })
    const efeito = new Promise<{ ok: boolean; resumo: string }>((resolve) => { concluir = resolve })
    const fio = rodarAgir({
      vizinho: async () => ({ texto: '', pedidos: [{ id: 'tool-in-flight', ferramenta: 'criar', argumentos: { caminho: 'feito.txt', conteudo: 'x' } }] }),
      historico: [{ papel: 'usuario', conteudo: 'crie feito.txt' }],
      executores: { ...EXECUTORES, criar: async () => { iniciou(); return efeito } },
      emitir: (evento) => eventos.push(evento),
      pedirAprovacao: async () => true,
      sinal: controle.signal,
    })
    await iniciado
    controle.abort()
    concluir({ ok: true, resumo: 'arquivo criado' })
    expect((await fio).status).toBe('interrompido')
    expect(eventos.at(-1)).toMatchObject({ type: 'tool_result', id: 'tool-in-flight', ok: true, resumo: 'arquivo criado' })
    expect(eventos.some((evento) => evento.type === 'done')).toBe(false)
  })

  it('Parar durante approval invalida resposta tardia antes do executor', async () => {
    const controle = new AbortController()
    const eventos: EventoAgir[] = []
    const executar = vi.fn(async () => ({ ok: true, resumo: 'não deveria executar' }))
    let entrouAprovacao!: () => void
    let responder!: (permitir: boolean) => void
    const aguardando = new Promise<void>((resolve) => { entrouAprovacao = resolve })
    const decisao = new Promise<boolean>((resolve) => { responder = resolve })
    const fio = rodarAgir({
      vizinho: async () => ({ texto: '', pedidos: [{ id: 'late-1', ferramenta: 'criar', argumentos: { caminho: 'late.txt', conteudo: 'x' } }] }),
      historico: [{ papel: 'usuario', conteudo: 'crie late.txt' }],
      executores: { ...EXECUTORES, criar: executar },
      emitir: (evento) => eventos.push(evento),
      pedirAprovacao: async () => { entrouAprovacao(); return decisao },
      sinal: controle.signal,
    })
    await aguardando
    controle.abort()
    responder(true)
    const resultado = await fio
    expect(resultado.status).toBe('interrompido')
    expect(executar).not.toHaveBeenCalled()
    expect(eventos.some((evento) => evento.type === 'tool_result')).toBe(false)
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


describe('DELETE — reconfirmação do alvo alterado', () => {
  it('exige novo aceite com ID distinto antes de executar o alvo atualizado', async () => {
    const pedido = { id: 'delete-original', ferramenta: 'excluir' as const, argumentos: { caminho: 'temporario.txt' } }
    const { vizinho } = vizinhoRoteado([
      { texto: '', pedidos: [pedido] },
      { texto: 'Concluído.', pedidos: [] },
    ])
    const excluir = vi.fn()
      .mockResolvedValueOnce({ ok: false, requerNovaAprovacao: true, resumo: 'O alvo mudou; confirme novamente.' })
      .mockResolvedValueOnce({ ok: true, resumo: 'Movido para a lixeira.' })
    const aprovar = vi.fn(async (pedidoAprovacao: PedidoFerramenta) => pedidoAprovacao.ferramenta === 'excluir')
    const eventos: EventoAgir[] = []

    const fim = await rodarAgir({
      vizinho, historico: [], executores: { ...EXECUTORES, excluir },
      emitir: (evento) => eventos.push(evento), pedirAprovacao: aprovar,
    })

    expect(fim.status).toBe('respondeu')
    expect(aprovar).toHaveBeenCalledTimes(2)
    expect(excluir).toHaveBeenCalledTimes(2)
    const novoPedido = aprovar.mock.calls[1][0]
    expect(novoPedido.id).not.toBe(pedido.id)
    expect(excluir.mock.calls[1][0]).toEqual(novoPedido)
    expect(eventos.find((evento) => evento.type === 'tool_result' && evento.ok)).toMatchObject({ id: novoPedido.id })
  })
})

describe('DELETE — resultado parcial no diálogo do modelo', () => {
  it('não rotula movimentação parcial como NÃO EXECUTADO', async () => {
    const { vizinho, chamadas } = vizinhoRoteado([
      { texto: '', pedidos: [{ id: 'delete-parcial', ferramenta: 'excluir', argumentos: { caminho: 'temporario.txt' } }] },
      { texto: 'Confira o destino informado.', pedidos: [] },
    ])
    const eventos: EventoAgir[] = []
    await rodarAgir({ vizinho, historico: [], emitir: (e) => eventos.push(e), pedirAprovacao: async () => true,
      executores: { ...EXECUTORES, excluir: async () => ({ ok: false, efeitoIniciado: true, resumo: 'Conteúdo preservado em destino temporário informado.' }) },
    })
    expect(eventos.find((e) => e.type === 'tool_result')).toMatchObject({ ok: false, efeitoIniciado: true })
    const resultado = chamadas[1][chamadas[1].length - 1].conteudo
    expect(resultado).toContain('EFEITO PARCIAL:')
    expect(resultado).not.toContain('NÃO EXECUTADO:')
  })
})


describe('DELETE — efeito parcial atravessa o cliente SSE', () => {
  it('repassa efeitoIniciado ao callback usado pelo Explorer mesmo com ok=false', async () => {
    const resultado = vi.fn()
    let concluir!: () => void
    let falhar!: (erro: Error) => void
    const fim = new Promise<void>((resolve, reject) => { concluir = resolve; falhar = reject })
    const evento = { type: 'tool_result', id: 'parcial', ferramenta: 'excluir', ok: false, resumo: 'Item em destino preservado.', efeitoIniciado: true }
    const sse = 'data: ' + JSON.stringify(evento) + '\n\ndata: ' + JSON.stringify({ type: 'done' }) + '\n\n'
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sse, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'X-Agir-Run-Id': 'isolado', 'X-Agir-Generation': '1' } })))
    try {
      enviarAgir({ mensagens: [], fluxo: 'delete-parcial', sessionId: 'teste', chatId: 'teste', mode: 'agent' }, {
        onChunk: () => undefined, onTool: () => undefined, onApproval: () => undefined, onTeto: () => undefined,
        onToolResult: resultado, onDone: concluir, onError: (_code, message) => falhar(new Error(message)),
      })
      await fim
      expect(resultado).toHaveBeenCalledWith('parcial', 'excluir', false, 'Item em destino preservado.', true)
    } finally { vi.unstubAllGlobals() }
  })
})
