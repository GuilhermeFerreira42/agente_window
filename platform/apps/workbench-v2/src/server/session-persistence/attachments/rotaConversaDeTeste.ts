// ============================================================================
// C-3b — ROTA DE CONVERSA DE TESTE (E05/E06).
//
// O navegador manda APENAS: "quero uma resposta nesta sessão/chat, com esta
// identidade de tentativa". Ele não manda path, URL, run alegado, geração,
// nome de arquivo nem bytes — o servidor escolhe tudo pela fixture composta
// em `vite.config.ts`.
//
// Sem a variável de teste ligada, a rota não existe (404) — ela é registrada
// pela composição, não pelo router de produção.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ChatMessage } from '../../../types'
import { PersistenceProblem } from '../persistenceErrors'
import type { SaidaDeTeste } from './saidaDeTeste'

function sendJson(response: ServerResponse, status: number, valor: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(valor))
}

async function lerJson(requisicao: IncomingMessage): Promise<unknown> {
  const partes: Buffer[] = []
  let total = 0
  for await (const pedaco of requisicao) {
    const buffer = Buffer.isBuffer(pedaco) ? pedaco : Buffer.from(pedaco)
    total += buffer.length
    if (total > 64 * 1024) throw new PersistenceProblem(413, 'request_too_large', 'Pedido grande demais.')
    partes.push(buffer)
  }
  return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}')
}

/**
 * Trata `POST /api/sessions/:sid/chats/:cid/conversa-de-teste`.
 *
 * `publicar` é injetado pelo `index.ts`: ele já detém a fila por dono, a
 * restauração do transcript e o caminho de gravação P-A/P-B. Assim a resposta
 * de teste atravessa EXATAMENTE o mesmo protocolo de qualquer mensagem —
 * nada de um segundo store ou de uma escrita paralela.
 */
export async function tratarConversaDeTeste(
  requisicao: IncomingMessage,
  resposta: ServerResponse,
  url: URL,
  saida: SaidaDeTeste | undefined,
  publicar: (sessionId: string, chatId: string, mensagem: ChatMessage) => Promise<{ duplicou: boolean }>,
): Promise<boolean> {
  const casamento = url.pathname.match(/^\/api\/sessions\/([^/]+)\/chats\/([^/]+)\/conversa-de-teste$/)
  if (!casamento) return false
  if (!saida) { sendJson(resposta, 404, { code: 'test_seam_unavailable', message: 'Rota de teste indisponível.' }); return true }
  if (requisicao.method !== 'POST') { sendJson(resposta, 405, { code: 'method_not_allowed', message: 'Use POST.' }); return true }

  const sessionId = decodeURIComponent(casamento[1])
  const chatId = decodeURIComponent(casamento[2])
  const corpo = await lerJson(requisicao) as { runId?: unknown; generation?: unknown }
  // A identidade da TENTATIVA vem do cliente, mas é opaca: só serve para o
  // replay não duplicar. Nada aqui vira caminho de arquivo.
  const runId = typeof corpo.runId === 'string' && corpo.runId.length <= 80 ? corpo.runId : `run-${Date.now()}`
  const generation = typeof corpo.generation === 'number' && Number.isSafeInteger(corpo.generation) && corpo.generation >= 0
    ? corpo.generation : 0

  // Produzir ANTES de abrir a fila: o artefato já está no ledger quando a
  // mensagem é publicada (R09 — nunca mensagem apontando para nada).
  const mensagem = await saida.produzirResposta({ sessionId, chatId, runId, generation })

  const publicado = await publicar(sessionId, chatId, mensagem)
  sendJson(resposta, 200, { ok: true, messageId: mensagem.id, duplicou: publicado.duplicou, multimodal: mensagem.multimodal })
  return true
}
