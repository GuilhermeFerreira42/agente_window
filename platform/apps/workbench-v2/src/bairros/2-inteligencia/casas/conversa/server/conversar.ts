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
import type { AlvoConversa, CategoriaErro, ConfigChamadaModelo, ErroConversa, EventoChat, IniciarChamadaModelo, MensagemChat } from '../contract'
import { montarPedido } from './requisicao'
import { criarFramer } from './streaming'
import { criarLeitorDeUso, metadadosDaChamada, completarMedicao, removerOpcaoRecusada, estimarEntrada } from '../../../../../domain/usoContexto'

export function estimarPedidoConversa(alvo: AlvoConversa, messages: MensagemChat[]) {
  const pedido = montarPedido(alvo, messages)
  return { estimativa: estimarEntrada(JSON.parse(String(pedido.init.body))), reserva: pedido.reservaSaida }
}

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

async function lerRecusa(resposta: Response): Promise<string> {
  if (!resposta.body) return ''
  const leitor = resposta.body.getReader(), decoder = new TextDecoder()
  let texto = '', bytes = 0
  try {
    while (bytes < 16_384) {
      const { done, value } = await leitor.read()
      if (done) break
      const parte = value.subarray(0, 16_384 - bytes)
      texto += decoder.decode(parte, { stream: true }); bytes += parte.length
    }
    return texto + decoder.decode()
  } finally { await leitor.cancel().catch(() => undefined) }
}

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
  iniciarModelo?: IniciarChamadaModelo,
  exigirConclusao = false,
): Promise<void> {
  const sinal = criarSinalConversa(sinalExterno)
  const uso = criarLeitorDeUso(alvo.protocolo)
  let chamada: ReturnType<typeof metadadosDaChamada>
  let payloadMedido: unknown
  try {
    const iniciarFetch = (config?: ConfigChamadaModelo): Promise<Response> => {
      if (alvo.capacidade && config && (JSON.stringify(alvo.capacidade.limites) !== JSON.stringify(config.capacidade?.limites) ||
        alvo.baseUrl !== config.baseUrl || alvo.apiKey !== config.apiKey || alvo.maxSaida !== config.maxSaida)) {
        throw new ErroChat('selection_unavailable', 'Os limites mudaram durante a preparação do resumo. Nenhum checkpoint foi publicado.')
      }
      const alvoAtual: AlvoConversa = config ? {
        ...alvo,
        providerId: config.providerId,
        modelId: config.modelId,
        protocolo: config.protocolo,
        baseUrl: config.baseUrl,
        modelo: config.modelId,
        apiKey: config.apiKey,
        temperatura: config.temperatura,
        maxSaida: config.maxSaida,
        limiteContexto: config.limiteContexto,
        capacidade: config.capacidade,
      } : alvo
      const pedido = montarPedido(alvoAtual, messages)
      chamada = metadadosDaChamada(alvoAtual, pedido.reservaSaida)
      const corpo = JSON.parse(String(pedido.init.body)) as Record<string, unknown>
      payloadMedido = corpo
      if (chamada) emitir({ type: 'context_usage', medicao: { ...completarMedicao(chamada, corpo, {}, 'enviado'), iteracao: 1 } })
      return (async () => {
        for (let tentativa = 0; ; tentativa++) {
          const resposta = await fetch(pedido.url, { ...pedido.init, body: JSON.stringify(corpo), signal: sinal.signal })
          if (tentativa >= 2 || (resposta.status !== 400 && resposta.status !== 422)) return resposta
          const detalhe = await lerRecusa(resposta)
          if (!removerOpcaoRecusada(corpo, resposta.status, detalhe)) return new Response(detalhe, { status: resposta.status })
        }
      })()
    }

    let resposta: Response
    try {
      if (iniciarModelo) {
        if (!alvo.providerId || !alvo.modelId) throw Object.assign(new Error('O alvo desta execução não tem identidade exata de provedor/modelo.'), { code: 'selection_unavailable' })
        resposta = await iniciarModelo(alvo.providerId, alvo.modelId, (config) => iniciarFetch(config))
      } else {
        resposta = await iniciarFetch()
      }
    } catch (erro) {
      if (sinal.silenciado()) return // Parar: nada a declarar
      const code = (erro as { code?: string })?.code
      if (code === 'model_disabled' || code === 'selection_unavailable' || code === 'credential_unavailable') {
        throw new ErroChat(code === 'credential_unavailable' ? 'chave' : code, (erro as Error).message)
      }
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
    let truncado = false
    let terminoAnormal = false
    let conclusaoConfirmada = false

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
        if (payload.trim() === '[DONE]') { conclusaoConfirmada = true; continue }
        try {
          const quadro: unknown = JSON.parse(payload)
          if (quadro && typeof quadro === 'object') {
            const q = quadro as { choices?: Array<{ finish_reason?: string }>; delta?: { stop_reason?: string }; stop_reason?: string;
              candidates?: Array<{ finishReason?: string }>; done_reason?: string; done?: boolean; type?: string }
            const motivos = [...(q.choices ?? []).map((c) => c.finish_reason), q.delta?.stop_reason, q.stop_reason,
              ...(q.candidates ?? []).map((c) => c.finishReason), q.done_reason].filter(Boolean)
            terminoAnormal ||= motivos.some((m) => !['stop', 'end_turn', 'STOP'].includes(m!)) || q.type === 'error'
            truncado ||= !!q.choices?.some((c) => c.finish_reason === 'length') || q.delta?.stop_reason === 'max_tokens' ||
              !!q.candidates?.some((c) => c.finishReason === 'MAX_TOKENS') || q.done_reason === 'length'
            conclusaoConfirmada ||= !!q.choices?.some((c) => c.finish_reason === 'stop') || q.delta?.stop_reason === 'end_turn' ||
              !!q.candidates?.some((c) => c.finishReason === 'STOP') || q.type === 'message_stop' || q.done === true
          }
          uso.ler(quadro)
          enviar(extrairTexto(alvo.protocolo, quadro))
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

    if (exigirConclusao && (truncado || terminoAnormal || !conclusaoConfirmada)) throw new ErroChat('resposta', truncado
      ? 'O resumo atingiu o limite de saída e ficou incompleto. O checkpoint anterior foi preservado.'
      : terminoAnormal ? 'O resumo teve um encerramento anormal e pode estar incompleto. O checkpoint anterior foi preservado.'
      : 'O resumo terminou sem confirmação de conclusão e pode estar incompleto. O checkpoint anterior foi preservado.')
    if (!emitiuUtil) {
      throw new ErroChat('resposta', 'O serviço respondeu, mas veio sem texto. Nada foi exibido para não inventar resposta.')
    }
    if (chamada && !sinal.silenciado()) emitir({ type: 'context_usage', medicao: { ...completarMedicao(chamada, payloadMedido, uso.resultado(), 'respondido'), iteracao: 1 } })
  } finally {
    sinal.limpar()
  }
}
