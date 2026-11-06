// ============================================================================
// Casa Agir — protocolo HTTP da rota (extraído de `rotas.ts`, D170-c / RNF15-2).
//
// POR QUE ESTE ARQUIVO EXISTE
// `rotas.ts` tinha 934 linhas e misturava três responsabilidades: (1) o
// protocolo HTTP (ler corpo, responder JSON/erro, escrever eventos SSE),
// (2) a validação do pedido da tela e (3) o loop de execução com cartões de
// aprovação e retomada. A (1) e a (2) não têm estado e não conhecem o loop;
// morar no mesmo arquivo só fazia a leitura cobrar 900 linhas para entender 60.
//
// O QUE NÃO MUDOU (e é o que importa numa extração)
//   • nenhuma regra: as mensagens de erro, os códigos de status e o formato do
//     SSE são byte a byte os que estavam em `rotas.ts`;
//   • nenhum import novo de casa vizinha (LEGO): só `node:http` e os tipos do
//     próprio contrato da casa;
//   • a superfície pública de `rotas.ts` continua a mesma (`rotaPertenceAoModuloAgir`,
//     `tratarRotasAgir`, `ContextoAgir`, `DependenciasAgir`).
// `validarPedido` e `validarSelecaoModelo` eram privadas e sem teste direto;
// passam a ser testáveis por serem exportadas — não inventei abstração nova.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { SelecaoModelo } from '../../conversa'
import type { EventoAgir, MensagemSimples } from '../contract'

export function sendJson(res: ServerResponse, status: number, corpo: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(corpo))
}

export function sendErro(res: ServerResponse, status: number, code: string, message: string): void {
  sendJson(res, status, { code, message })
}

export async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
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

export type PedidoValidado = {
  mensagens: MensagemSimples[]
  fluxo: string
  sessionId: string
  chatId: string
  selecaoModelo: SelecaoModelo
}

export function validarSelecaoModelo(valor: unknown): SelecaoModelo | null {
  if (valor === undefined || valor === null || (typeof valor === 'object' && (valor as { tipo?: unknown }).tipo === 'auto')) return { tipo: 'auto' }
  if (!valor || typeof valor !== 'object') return null
  const selecao = valor as { tipo?: unknown; providerId?: unknown; modelId?: unknown }
  if (selecao.tipo !== 'explicita' || typeof selecao.providerId !== 'string' || !selecao.providerId || typeof selecao.modelId !== 'string' || !selecao.modelId) return null
  return { tipo: 'explicita', providerId: selecao.providerId, modelId: selecao.modelId }
}

/** Valida o pedido da tela (histórico visível + fluxo + território candidato). */
export function validarPedido(corpo: Record<string, unknown>): { ok: true; pedido: PedidoValidado } | { ok: false; message: string } {
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
  const fluxo = corpo.fluxo
  if (typeof fluxo !== 'string' || fluxo.trim() === '') {
    return { ok: false, message: 'Pedido sem fluxo da conversa (a sessão dona do cartão é obrigatória).' }
  }
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  if (!sessionId || !chatId) {
    return { ok: false, message: 'Pedido sem identidade da sessão/conversa; o servidor não iniciou a execução.' }
  }
  const selecaoModelo = validarSelecaoModelo(corpo.modelSelection)
  if (!selecaoModelo) return { ok: false, message: 'Seleção de modelo inválida; escolha Auto ou um par providerId/modelId do catálogo.' }
  // `workspace`, `permissoes` e `mode` do payload são deliberadamente ignorados:
  // o contexto e o modo efetivo vêm da autoridade server-side.
  return { ok: true, pedido: { mensagens: messages as MensagemSimples[], fluxo: fluxo.trim(), sessionId, chatId, selecaoModelo } }
}

export function escreverEvento(res: ServerResponse, evento: EventoAgir): void {
  res.write(`data: ${JSON.stringify(evento)}\n\n`)
}
