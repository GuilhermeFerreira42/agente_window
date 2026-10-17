// ============================================================================
// Casa Conversa — execução da conversa (servidor → provedor).
// Conquista 1: resposta ÚNICA com extração por protocolo e erros honestos.
// A chave só aparece em cabeçalho; o corpo do erro do provedor NUNCA é
// repassado cru para a tela (traduzimos — regra da SPEC §7).
//
// NOTA: os sinais são combinados NA MÃO (não usamos `AbortSignal.any`): o
// ambiente de teste (jsdom) não o implementa e o teste é a régua da casa.
// ============================================================================
import type { AlvoConversa, CategoriaErro, ErroConversa, EventoChat, MensagemChat } from '../contract'
import { montarPedido } from './requisicao'

/** C1: resposta inteira em até 60 s (conforme proposta da SPEC §3.6d). */
export const TIMEOUT_CONVERSA_MS = 60_000

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

function erroTempo(): ErroChat {
  return new ErroChat('tempo', `O serviço não respondeu em ${Math.round(TIMEOUT_CONVERSA_MS / 1000)} segundos. Ele pode estar fora do ar ou muito lento.`)
}

function erroEndereco(): ErroChat {
  return new ErroChat('endereco', 'Não deu para alcançar o serviço. Verifique se ele está ligado (no caso do Ollama, se está rodando na sua máquina).')
}

/** Extrai o texto da resposta no formato de cada protocolo (tolerante a variações). */
export function extrairTexto(protocolo: AlvoConversa['protocolo'], corpo: unknown): string {
  const dados = corpo as Record<string, unknown> | null
  if (!dados) throw new ErroChat('resposta', 'O serviço respondeu sem corpo legível.')

  if (protocolo === 'openai-chat') {
    const escolhas = Array.isArray(dados.choices) ? dados.choices : []
    const primeira = escolhas[0] as { message?: { content?: unknown } } | undefined
    const conteudo = primeira?.message?.content
    return typeof conteudo === 'string' ? conteudo : ''
  }
  if (protocolo === 'anthropic') {
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
  /** O timeout de 60 s foi quem abortou. */
  estourou: () => boolean
  /** Foi o usuário que apertou Parar (silêncio total). */
  silenciado: () => boolean
  limpar: () => void
}

function criarSinalConversa(externo?: AbortSignal): SinalConversa {
  const controlador = new AbortController()
  let tempoEstourado = false
  const timer = setTimeout(() => {
    tempoEstourado = true
    controlador.abort()
  }, TIMEOUT_CONVERSA_MS)
  const aoAbortarExterno = () => controlador.abort()
  if (externo) {
    if (externo.aborted) controlador.abort()
    else externo.addEventListener('abort', aoAbortarExterno, { once: true })
  }
  return {
    signal: controlador.signal,
    estourou: () => tempoEstourado,
    silenciado: () => Boolean(externo?.aborted),
    limpar: () => {
      clearTimeout(timer)
      externo?.removeEventListener('abort', aoAbortarExterno)
    },
  }
}

/**
 * Executa a conversa em resposta única (C1). Emite `chunk` com o texto final.
 * `done` é emitido pela rota. Silêncio total quando o usuário apertou Parar
 * (sinal abortado): sem erro, sem texto inventado.
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
      // Nosso cronômetro OU um timeout nomeado pelo próprio fetch.
      if (sinal.estourou() || (erro as { name?: string })?.name === 'TimeoutError') throw erroTempo()
      throw erroEndereco()
    }

    if (!resposta.ok) throw erroPorStatus(resposta.status)

    let corpo: unknown
    try {
      corpo = await resposta.json()
    } catch {
      if (sinal.silenciado()) return // Parar durante a leitura
      if (sinal.estourou()) throw erroTempo()
      throw new ErroChat('resposta', 'O serviço respondeu, mas não em formato reconhecível.')
    }

    if (sinal.silenciado()) return // Parar após a leitura: não emitir nada

    const texto = extrairTexto(alvo.protocolo, corpo)
    if (!texto.trim()) {
      throw new ErroChat('resposta', 'O serviço respondeu, mas veio sem texto. Nada foi exibido para não inventar resposta.')
    }
    emitir({ type: 'chunk', text: texto })
  } finally {
    sinal.limpar()
  }
}
