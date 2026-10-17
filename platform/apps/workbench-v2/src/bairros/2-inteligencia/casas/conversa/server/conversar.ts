// ============================================================================
// Casa Conversa — execução da conversa (servidor → provedor).
// Conquista 2: LEITURA EM STREAMING — cada pedaço que chega vira `chunk`
// imediatamente (a bolha cresce aos poucos na tela — SPEC §3.2).
// Duas réguas de tempo SEPARADAS (SPEC §7):
//   · primeiro byte — 60 s (provedor local pode demorar a arrancar)
//   · total do pedido — 5 min (nem tudo que começa acaba)
// A chave só aparece em cabeçalho; o corpo do erro do provedor NUNCA é
// repassado cru para a tela (traduzimos — regra da SPEC §7).
//
// NOTA: os sinais são combinados NA MÃO (não usamos `AbortSignal.any`): o
// ambiente de teste (jsdom) não o implementa e o teste é a régua da casa.
// ============================================================================
import type { AlvoConversa, CategoriaErro, ErroConversa, EventoChat, MensagemChat } from '../contract'
import { montarPedido } from './requisicao'
import { criarFramer } from './streaming'

/** Sem NENHUM byte do corpo em 60 s → `tempo` (proposta da SPEC §3.6d). */
export const TIMEOUT_PRIMEIRO_BYTE_MS = 60_000
/** Pedido inteiro não pode passar de 5 minutos (decisão técnica da 09). */
export const TIMEOUT_TOTAL_MS = 300_000

export class ErroChat extends Error implements ErroConversa {
  readonly code: CategoriaErro
  constructor(code: CategoriaErro, message: string) {
    super(message)
    this.name = 'ErroChat'
    this.code = code
  }
}

export function ehErroChat(erro: unknown): erro is ErroChat {
  return erro instanceof ErroChat
}

export type Emitir = (evento: EventoChat) => void

function erroPorStatus(status: number): ErroChat {
  if (status === 401 || status === 403) {
    return new ErroChat('chave', `Chave inválida (erro ${status}). Confira a chave em Provedores e cole de novo.`)
  }
  if (status === 413) {
    return new ErroChat('limite', 'O histórico desta conversa ficou grande demais para o modelo (erro 413). Comece uma conversa nova ou remova mensagens antigas.')
  }
  if (status === 429) {
    return new ErroChat('http', 'O serviço pediu uma pausa por excesso de pedidos (erro 429). Aguarde um instante e tente de novo.')
  }
  if (status === 404) {
    return new ErroChat('http', 'O serviço não encontrou o endereço ou o modelo (erro 404). Confira ambos em Provedores.')
  }
  if (status === 400) {
    return new ErroChat('http', 'O serviço recusou o pedido (erro 400). Confira o nome do modelo e o endereço.')
  }
  return new ErroChat('http', `O serviço respondeu com o erro ${status}. Tente novamente em instantes.`)
}

function erroTempo(motivo: 'primeiro' | 'total'): ErroChat {
  if (motivo === 'total') {
    return new ErroChat('tempo', `O pedido passou de ${Math.round(TIMEOUT_TOTAL_MS / 60000)} minutos sem terminar e foi encerrado. Tente uma pergunta menor.`)
  }
  return new ErroChat('tempo', `O serviço não respondeu em ${Math.round(TIMEOUT_PRIMEIRO_BYTE_MS / 1000)} segundos. Ele pode estar fora do ar ou muito lento.`)
}

function erroEndereco(): ErroChat {
  return new ErroChat('endereco', 'Não deu para alcançar o serviço. Verifique se ele está ligado (no caso do Ollama, se está rodando na sua máquina).')
}

function erroInterrompida(): ErroChat {
  return new ErroChat('resposta', 'A resposta foi interrompida no meio (o serviço caiu ou a conexão falhou). Tente enviar de novo.')
}

/**
 * Extrai o texto de UM pedaço recebido — tolerante aos dois formatos de cada
 * protocolo (evento de streaming OU corpo inteiro, quando o provedor ignora o
 * `stream` e responde de uma vez).
 */
export function extrairTexto(protocolo: AlvoConversa['protocolo'], corpo: unknown): string {
  const dados = corpo as Record<string, unknown> | null
  if (!dados) throw new ErroChat('resposta', 'O serviço respondeu sem corpo legível.')

  if (protocolo === 'openai-chat') {
    const escolhas = Array.isArray(dados.choices) ? dados.choices : []
    const primeira = escolhas[0] as { delta?: { content?: unknown }; message?: { content?: unknown } } | undefined
    const conteudo = primeira?.delta?.content ?? primeira?.message?.content
    return typeof conteudo === 'string' ? conteudo : ''
  }
  if (protocolo === 'anthropic') {
    // Evento de streaming: content_block_delta → delta.text
    const delta = dados.delta as { text?: unknown } | undefined
    if (typeof delta?.text === 'string') return delta.text
    // Corpo inteiro: content[] de blocos
    const blocos = Array.isArray(dados.content) ? dados.content : []
    return blocos
      .map((bloco) => String((bloco as { text?: unknown }).text ?? ''))
      .filter(Boolean)
      .join('')
  }
  if (protocolo === 'gemini') {
    const candidatos = Array.isArray(dados.candidates) ? dados.candidates : []
    return candidatos
      .map((candidato) => {
        const conteudo = (candidato as { content?: { parts?: unknown[] } }).content
        const partes = Array.isArray(conteudo?.parts) ? conteudo.parts : []
        return partes.map((parte) => String((parte as { text?: unknown }).text ?? '')).join('')
      })
      .filter(Boolean)
      .join('')
  }
  // ollama
  const mensagem = dados.message as { content?: unknown } | undefined
  return typeof mensagem?.content === 'string' ? mensagem.content : ''
}

interface SinalConversa {
  signal: AbortSignal
  /** Algum dos cronômetros disparou. */
  estourou: () => boolean
  /** Qual cronômetro (mensagem honesta certa). */
  motivo: () => 'primeiro' | 'total'
  /** O primeiro byte do corpo chegou — o relógio de 60 s zerou. */
  byteRecebido: () => void
  /** Foi o usuário que apertou Parar (silêncio total). */
  silenciado: () => boolean
  limpar: () => void
}

function criarSinalConversa(externo?: AbortSignal): SinalConversa {
  const controlador = new AbortController()
  let estouro: 'primeiro' | 'total' | null = null
  let byteViu = false

  const timerPrimeiro = setTimeout(() => {
    if (!byteViu && estouro === null) {
      estouro = 'primeiro'
      controlador.abort()
    }
  }, TIMEOUT_PRIMEIRO_BYTE_MS)
  const timerTotal = setTimeout(() => {
    if (estouro === null) {
      estouro = 'total'
      controlador.abort()
    }
  }, TIMEOUT_TOTAL_MS)

  const aoAbortarExterno = () => controlador.abort()
  if (externo) {
    if (externo.aborted) controlador.abort()
    else externo.addEventListener('abort', aoAbortarExterno, { once: true })
  }

  return {
    signal: controlador.signal,
    estourou: () => estouro !== null,
    motivo: () => (estouro === 'total' ? 'total' : 'primeiro'),
    byteRecebido: () => {
      byteViu = true
      clearTimeout(timerPrimeiro) // corpo começou a chegar; o total continua
    },
    silenciado: () => Boolean(externo?.aborted),
    limpar: () => {
      clearTimeout(timerPrimeiro)
      clearTimeout(timerTotal)
      externo?.removeEventListener('abort', aoAbortarExterno)
    },
  }
}

/**
 * Executa a conversa em STREAMING: cada pedaço útil emite `chunk` na hora.
 * Espaço vazio isolado fica retido (nada de bolha piscando em branco); se a
 * resposta terminar sem NENHUM texto útil → erro honesto `resposta` (nunca
 * inventa conteúdo). `done` é emitido pela rota ao fim do retorno.
 */
export async function executarConversa(
  alvo: AlvoConversa,
  messages: MensagemChat[],
  emitir: Emitir,
  sinalExterno?: AbortSignal,
): Promise<void> {
  const sinal = criarSinalConversa(sinalExterno)
  try {
    const pedido = montarPedido(alvo, messages)

    let resposta: Response
    try {
      resposta = await fetch(pedido.url, { ...pedido.init, signal: sinal.signal })
    } catch (erro) {
      if (sinal.silenciado()) return // Parar: nada a declarar
      if (sinal.estourou() || (erro as { name?: string })?.name === 'TimeoutError') throw erroTempo(sinal.motivo())
      throw erroEndereco()
    }

    if (!resposta.ok) {
      // O corpo do erro é descartado — só o status vira mensagem honesta.
      void resposta.body?.cancel().catch(() => undefined)
      throw erroPorStatus(resposta.status)
    }
    if (!resposta.body) throw new ErroChat('resposta', 'O serviço não mandou corpo de resposta.')

    const leitor = resposta.body.getReader()
    const decodificador = new TextDecoder()
    const framer = criarFramer(alvo.protocolo)
    let pendente = '' // só espaço que espera conteúdo de verdade
    let emitiuUtil = false

    const enviar = (texto: string): void => {
      if (texto.length === 0) return
      const combinado = pendente + texto
      if (!combinado.trim().length) {
        pendente = combinado
        return
      }
      pendente = ''
      emitiuUtil = true
      emitir({ type: 'chunk', text: combinado })
    }

    const consumirPayloads = (payloads: string[]): void => {
      for (const payload of payloads) {
        try {
          enviar(extrairTexto(alvo.protocolo, JSON.parse(payload)))
        } catch {
          // Quadro que não é JSON de texto (eventos de ciclo de vida, [DONE],
          // ruído de compat) é ignorado — nunca vira erro nem texto falso.
        }
      }
    }

    try {
      for (;;) {
        const { value, done } = await leitor.read()
        if (done) break
        sinal.byteRecebido()
        consumirPayloads(framer.entrar(decodificador.decode(value, { stream: true })))
      }
      consumirPayloads(framer.entrar(decodificador.decode())) // flush do codificador
      consumirPayloads(framer.fechar())
    } catch (erro) {
      if (sinal.silenciado()) return // Parar no meio do fio: preserva o que chegou, silêncio
      if (sinal.estourou() || (erro as { name?: string })?.name === 'TimeoutError') throw erroTempo(sinal.motivo())
      if (ehErroChat(erro)) throw erro
      throw erroInterrompida()
    }

    if (!emitiuUtil) {
      throw new ErroChat('resposta', 'O serviço respondeu, mas veio sem texto. Nada foi exibido para não inventar resposta.')
    }
  } finally {
    sinal.limpar()
  }
}
