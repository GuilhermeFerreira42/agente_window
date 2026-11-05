// ============================================================================
// Provas do cano de instrução de PRODUTO (D141 / E-1 opção (b) / DP-06).
//
// São os testes que fecham o gate, listados em `09` §3.29. Os três mais
// importantes:
//   · o contrato é ADITIVO — sem `instrucoes`, nada muda;
//   · a instrução entra pelo mecanismo NATIVO de cada um dos quatro protocolos;
//   · a instrução NUNCA aparece como fala do usuário, em nenhum protocolo.
// ============================================================================
import { describe, expect, it } from 'vitest'
import type {
  ExecutorFerramenta,
  FerramentaId,
  InstrucaoDeProduto,
  OpcoesVizinho,
  ProtocoloAgir,
  VizinhoProvedor,
} from '../contract'
import { rodarAgir } from '../server/agir'
import { aplicarInstrucoes, textoDeInstrucoes, traduzirHistorico } from '../server/dialogo'

const PROTOCOLOS: ProtocoloAgir[] = ['openai-chat', 'anthropic', 'gemini', 'ollama']

const UMA: InstrucaoDeProduto = { origem: 'skill', id: 'usuario:commit', nome: 'commit', corpo: 'Siga o estilo de commit do repositório.' }
const DUAS: InstrucaoDeProduto[] = [UMA, { origem: 'skill', id: 'usuario:revisar', nome: 'revisar', corpo: 'Aponte riscos de segurança.' }]

/** Extrai de um corpo de pedido todo texto que chegou ao modelo, seja qual for o formato. */
function textosDoCorpo(corpo: Record<string, unknown>): string[] {
  const achados: string[] = []
  const visitar = (valor: unknown): void => {
    if (typeof valor === 'string') { achados.push(valor); return }
    if (Array.isArray(valor)) { valor.forEach(visitar); return }
    if (typeof valor === 'object' && valor !== null) Object.values(valor as Record<string, unknown>).forEach(visitar)
  }
  visitar(corpo)
  return achados
}

function mensagensDo(corpo: Record<string, unknown>): { role?: string; content?: unknown }[] {
  const bruto = corpo.messages ?? (corpo.contents as unknown)
  return Array.isArray(bruto) ? (bruto as { role?: string; content?: unknown }[]) : []
}

describe('textoDeInstrucoes — o conteúdo é o mesmo para os quatro protocolos', () => {
  it('sem instrução devolve texto vazio', () => {
    expect(textoDeInstrucoes([])).toBe('')
  })

  it('uma instrução cita o /nome e traz o corpo', () => {
    const texto = textoDeInstrucoes([UMA])
    expect(texto).toContain('## /commit')
    expect(texto).toContain('Siga o estilo de commit do repositório.')
  })

  it('duas instruções dizem quantas são e citam as duas', () => {
    const texto = textoDeInstrucoes(DUAS)
    expect(texto).toContain('2 habilidades')
    expect(texto).toContain('## /commit')
    expect(texto).toContain('## /revisar')
  })

  it('instrução de corpo vazio é descartada, não enviada como bloco oco', () => {
    expect(textoDeInstrucoes([{ ...UMA, corpo: '   ' }])).toBe('')
    const soUma = textoDeInstrucoes([{ ...UMA, corpo: '  ' }, DUAS[1]])
    expect(soUma).toContain('## /revisar')
    expect(soUma).not.toContain('## /commit')
    expect(soUma).toMatch(/invocou a habilidade abaixo/)
  })

  it('deixa explícito que foi o DONO quem invocou — o produto não fala como se fosse ele', () => {
    expect(textoDeInstrucoes([UMA])).toMatch(/O dono invocou/)
  })
})

describe('aplicarInstrucoes — cada protocolo pelo próprio mecanismo nativo', () => {
  it('openai-chat e ollama: mensagem system À FRENTE, histórico preservado na ordem', () => {
    for (const protocolo of ['openai-chat', 'ollama'] as ProtocoloAgir[]) {
      const historico = traduzirHistorico(protocolo, [{ papel: 'usuario', conteudo: 'oi' }])
      const corpo = aplicarInstrucoes(protocolo, { model: 'm', messages: historico }, [UMA])
      const mensagens = mensagensDo(corpo)
      expect(mensagens[0]?.role, protocolo).toBe('system')
      expect(mensagens).toHaveLength(historico.length + 1)
      expect(mensagens.slice(1), protocolo).toEqual(historico)
    }
  })

  it('anthropic: parâmetro system de TOPO, e nenhuma mensagem é acrescentada', () => {
    const historico = traduzirHistorico('anthropic', [{ papel: 'usuario', conteudo: 'oi' }])
    const corpo = aplicarInstrucoes('anthropic', { model: 'm', messages: historico }, [UMA])
    expect(typeof corpo.system).toBe('string')
    expect(corpo.system).toContain('## /commit')
    expect(mensagensDo(corpo)).toEqual(historico)
    expect(mensagensDo(corpo).some((m) => m.role === 'system')).toBe(false)
  })

  it('anthropic: um system que já existia é CONCATENADO, não sobrescrito', () => {
    const corpo = aplicarInstrucoes('anthropic', { system: 'Regra anterior.', messages: [] }, [UMA])
    expect(corpo.system).toBe('Regra anterior.\n\n' + textoDeInstrucoes([UMA]))
  })

  it('gemini: systemInstruction.parts[].text', () => {
    const corpo = aplicarInstrucoes('gemini', { contents: traduzirHistorico('gemini', [{ papel: 'usuario', conteudo: 'oi' }]) }, [UMA])
    const instrucao = corpo.systemInstruction as { parts: { text: string }[] }
    expect(instrucao.parts[0]?.text).toContain('## /commit')
    expect(corpo.contents).toHaveLength(1)
  })

  it('sem instrução devolve o corpo INTACTO — o contrato é aditivo', () => {
    const corpo = { model: 'm', messages: [{ role: 'user', content: 'oi' }] }
    for (const protocolo of PROTOCOLOS) {
      expect(aplicarInstrucoes(protocolo, corpo, []), protocolo).toBe(corpo)
    }
  })

  it('A PROPRIEDADE CENTRAL: a instrução nunca vira fala do usuário', () => {
    const corpoBase = { model: 'm' }
    for (const protocolo of PROTOCOLOS) {
      const historico = traduzirHistorico(protocolo, [{ papel: 'usuario', conteudo: 'faça um commit' }])
      const chave = protocolo === 'gemini' ? 'contents' : 'messages'
      const corpo = aplicarInstrucoes(protocolo, { ...corpoBase, [chave]: historico }, DUAS)
      for (const mensagem of mensagensDo(corpo)) {
        const ehUsuario = mensagem.role === 'user' || mensagem.role === 'usuario'
        if (!ehUsuario) continue
        const textos = textosDoCorpo(mensagem as unknown as Record<string, unknown>)
        expect(textos.some((t) => t.includes('Siga o estilo de commit do repositório.')), protocolo).toBe(false)
        expect(textos.some((t) => t.includes('## /commit')), protocolo).toBe(false)
      }
    }
  })

  it('o histórico traduzido não ganha papel novo: os papéis continuam os três do contrato', () => {
    const traduzido = traduzirHistorico('openai-chat', [
      { papel: 'usuario', conteudo: 'a' },
      { papel: 'assistente', conteudo: 'b' },
    ])
    const papeis = (traduzido as { role: string }[]).map((m) => m.role)
    expect(papeis).toEqual(['user', 'assistant'])
    expect(papeis).not.toContain('system')
  })
})

describe('rodarAgir — o loop apenas REPASSA o que o servidor compôs', () => {
  const naoUsado: ExecutorFerramenta = async () => ({ ok: true, resumo: 'não usado neste teste' })
  const executores: Record<FerramentaId, ExecutorFerramenta> = {
    ler: naoUsado,
    listar: naoUsado,
    buscar: naoUsado,
    criar: naoUsado,
    escrever: naoUsado,
    excluir: naoUsado,
    executar: naoUsado,
  }

  function vizinhoEspiao(vistos: OpcoesVizinho[]): VizinhoProvedor {
    return async (_mensagens, opcoes) => {
      vistos.push(opcoes ?? {})
      return { texto: 'pronto', pedidos: [] }
    }
  }

  it('sem instrucoes nem ferramentasPermitidas, o vizinho recebe undefined nos dois', async () => {
    const vistos: OpcoesVizinho[] = []
    const resultado = await rodarAgir({
      vizinho: vizinhoEspiao(vistos),
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores,
      emitir: () => undefined,
    })
    expect(resultado.status).toBe('respondeu')
    expect(vistos).toHaveLength(1)
    expect(vistos[0]?.instrucoesDeProduto).toBeUndefined()
    expect(vistos[0]?.ferramentasPermitidas).toBeUndefined()
    expect(typeof vistos[0]?.aoTexto).toBe('function')
  })

  it('com instrucoes, elas chegam ao vizinho intactas e o histórico não é alterado', async () => {
    const vistos: OpcoesVizinho[] = []
    const historico = [{ papel: 'usuario' as const, conteudo: 'oi' }]
    const antes = JSON.stringify(historico)
    await rodarAgir({
      vizinho: vizinhoEspiao(vistos),
      historico,
      executores,
      emitir: () => undefined,
      instrucoesDeProduto: DUAS,
      ferramentasPermitidas: ['ler', 'listar'],
    })
    expect(vistos[0]?.instrucoesDeProduto).toEqual(DUAS)
    expect(vistos[0]?.ferramentasPermitidas).toEqual(['ler', 'listar'])
    // A garantia histórica de agir.ts:91 continua valendo com o campo novo.
    expect(JSON.stringify(historico)).toBe(antes)
  })

  it('a instrução NÃO entra no histórico do loop em nenhuma iteração', async () => {
    const historicosVistos: unknown[][] = []
    let chamada = 0
    const vizinho: VizinhoProvedor = async (mensagens) => {
      historicosVistos.push(mensagens.map((m) => ({ ...m })))
      chamada += 1
      // Uma iteração pedindo ferramenta, para provar que a segunda também não polui.
      if (chamada === 1) {
        return { texto: '', pedidos: [{ id: 'p1', ferramenta: 'ler', argumentos: { caminho: 'a.txt' } }] }
      }
      return { texto: 'pronto', pedidos: [] }
    }
    await rodarAgir({
      vizinho,
      historico: [{ papel: 'usuario', conteudo: 'oi' }],
      executores,
      emitir: () => undefined,
      instrucoesDeProduto: [UMA],
    })
    expect(historicosVistos).toHaveLength(2)
    for (const mensagens of historicosVistos) {
      const papeis = (mensagens as { papel: string }[]).map((m) => m.papel)
      expect(papeis.every((p) => ['usuario', 'assistente', 'ferramenta'].includes(p))).toBe(true)
      expect(papeis).not.toContain('system')
    }
    const todosOsTextos = JSON.stringify(historicosVistos)
    expect(todosOsTextos).not.toContain('Siga o estilo de commit do repositório.')
  })
})
