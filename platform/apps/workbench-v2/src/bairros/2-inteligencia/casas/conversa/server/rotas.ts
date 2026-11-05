// ============================================================================
// Casa Conversa — rota HTTP (servidor de desenvolvimento).
// A prefeitura (`src/server/session-persistence`) reconhece o caminho e
// DELEGA para cá — mesmo padrão da casa Provedores (SPEC §4).
// Endpoints:
//   POST /api/chat → SSE (text/event-stream):
//     data: {"type":"chunk","text":"..."}   — pedaços da resposta
//     data: {"type":"done"}                 — fim do pedido
//     data: {"type":"error","code":...,"message":...}
//   Pré-condições (sem provedor / corpo inválido) respondem 4xx JSON com o
//   mesmo par {code, message} — a tela trata as duas formas por igual.
// O "Parar" da tela fecha ESTA conexão → o sinal aborta o provedor (SPEC §3.4).
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EventoChat, IniciarChamadaModelo, ObterAlvo, PedidoChat, SelecaoModelo } from '../contract'
import { ErroChat, ehErroChat, executarConversa } from './conversar'

const ROTAS_CONHECIDAS = ['/api/chat']

export function rotaPertenceAoModuloConversa(pathname: string): boolean {
  return ROTAS_CONHECIDAS.includes(pathname)
}

function sendJson(res: ServerResponse, status: number, corpo: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(corpo))
}

function sendErro(res: ServerResponse, status: number, code: string, message: string): void {
  sendJson(res, status, { code, message })
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = []
  for await (const pedaco of req) partes.push(pedaco as Buffer)
  const texto = Buffer.concat(partes).toString('utf8')
  if (!texto) return {}
  try {
    const valor = JSON.parse(texto)
    return typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : {}
  } catch {
    throw new Error('Corpo da requisição não é JSON válido.')
  }
}

/** Valida o pedido da tela (histórico da conversa atual — G5). */
function validarPedido(corpo: Record<string, unknown>): { ok: true; pedido: PedidoChat } | { ok: false; message: string } {
  const messages = corpo.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, message: 'Histórico vazio: envie ao menos uma mensagem.' }
  }
  for (const item of messages) {
    const mensagem = item as { role?: unknown; content?: unknown }
    if ((mensagem.role !== 'user' && mensagem.role !== 'assistant') || typeof mensagem.content !== 'string') {
      return { ok: false, message: 'Histórico em formato inválido.' }
    }
  }
  return { ok: true, pedido: { messages: messages as PedidoChat['messages'] } }
}

function lerSelecaoModelo(valor: unknown): SelecaoModelo | null {
  if (valor === undefined || valor === null || (typeof valor === 'object' && (valor as { tipo?: unknown }).tipo === 'auto')) return { tipo: 'auto' }
  if (!valor || typeof valor !== 'object') return null
  const selecao = valor as { tipo?: unknown; providerId?: unknown; modelId?: unknown }
  if (selecao.tipo !== 'explicita' || typeof selecao.providerId !== 'string' || !selecao.providerId || typeof selecao.modelId !== 'string' || !selecao.modelId) return null
  return { tipo: 'explicita', providerId: selecao.providerId, modelId: selecao.modelId }
}

function escreverEvento(res: ServerResponse, evento: EventoChat): void {
  res.write(`data: ${JSON.stringify(evento)}\n\n`)
}

export async function tratarRotasConversa(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  obterAlvo: ObterAlvo,
  iniciarModelo?: IniciarChamadaModelo,
): Promise<boolean> {
  const metodo = req.method ?? 'GET'
  if (url.pathname !== '/api/chat' || metodo !== 'POST') return false

  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }

  const validacao = validarPedido(corpo)
  if (!validacao.ok) {
    sendErro(res, 400, 'configuracao', validacao.message)
    return true
  }

  const selecao = lerSelecaoModelo(corpo.modelSelection)
  if (!selecao) {
    sendErro(res, 400, 'configuracao', 'Seleção de modelo inválida; escolha Auto ou um par providerId/modelId do catálogo.')
    return true
  }
  const { alvo, erro } = await obterAlvo(selecao)
  if (!alvo) {
    sendErro(
      res,
      409,
      erro?.code ?? 'sem_provedor',
      erro?.message ?? 'Nenhum provedor configurado. Abra Provedores e escolha quem vai responder.',
    )
    return true
  }

  // ---- Pré-condições ok: abre o fio SSE ----
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const abort = new AbortController()
  const aoFechar = () => abort.abort()
  req.on('close', aoFechar)

  try {
    await executarConversa(alvo, validacao.pedido.messages, (evento) => escreverEvento(res, evento), abort.signal, iniciarModelo)
    if (!abort.signal.aborted) escreverEvento(res, { type: 'done', model: alvo.providerId && alvo.modelId ? `${alvo.providerId} / ${alvo.modelId}` : alvo.modelo })
  } catch (erro) {
    if (!abort.signal.aborted) {
      if (ehErroChat(erro)) {
        escreverEvento(res, { type: 'error', code: erro.code, message: erro.message })
      } else {
        // Erro inesperado: mensagem honesta, SEM repassar detalhe cru.
        escreverEvento(res, { type: 'error', code: 'resposta', message: 'Erro inesperado do servidor ao conversar com o provedor.' })
      }
    }
  } finally {
    req.off?.('close', aoFechar)
    res.end()
  }
  return true
}

// Guarda de tipo: a rota só promete o que entrega (ErroChat é a única fonte
// de {code, message} lançada por executarConversa).
export type { ErroChat }
