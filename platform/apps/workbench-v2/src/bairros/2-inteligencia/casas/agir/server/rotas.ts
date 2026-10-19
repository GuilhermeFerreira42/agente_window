// ============================================================================
// Casa Agir — rota HTTP (conquista 3 da FATIA 10).
//   POST /api/agir         → SSE com os eventos do loop (chunk · tool ·
//                            tool_result · approval · done · error)
//   POST /api/agir/aprovar → a resposta do dono ao cartão {fluxo,id,decisao}
// Pré-condições respondem 4xx/409 JSON {code,message} — igual à casa
// Conversa. "Parar" = fechar a conexão → o loop é interrompido EM SILÊNCIO.
// O TERRITÓRIO não vem de confiança: a prefeitura injeta `pastaDeTrabalho`,
// que valida a pasta informada pela tela e devolve a raiz real (o navegador
// nunca define território por conta própria).
// Q1=(a)/Q2=(a) (D93): só CRIAR/ESCREVER passam pelo cartão; "Permitir na
// Sessão" vale enquanto durar o fluxo desta conversa no servidor (e o
// navegador guarda a permissão para reenviar no próximo pedido — C4).
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ObterAlvo } from '../../conversa'
import type { DecisaoAprovacao, EventoAgir, MensagemSimples } from '../contract'
import { rodarAgir } from './agir'
import { criarExecutoresReais } from './discos'
import { ehMexida } from './ferramentas'
import { criarVizinhoReal } from './vizinho'

const ROTAS_AGIR = ['/api/agir', '/api/agir/aprovar']

export function rotaPertenceAoModuloAgir(pathname: string): boolean {
  return ROTAS_AGIR.includes(pathname)
}

export interface DependenciasAgir {
  obterAlvo: ObterAlvo
  /** Valida a pasta de trabalho informada pela tela e devolve a RAIZ real. */
  pastaDeTrabalho: (caminho: string | undefined) => { ok: true; raiz: string } | { ok: false; message: string }
}

/** Permissões "Permitir na Sessão" por fluxo (a conversa pedindo). */
const permissoesPorFluxo = new Map<string, Set<string>>()
/** Cartões aguardando o dono, por fluxo: pedidoId → resolver. */
const pendentesPorFluxo = new Map<string, Map<string, (liberado: boolean) => void>>()

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

type PedidoValidado = {
  mensagens: MensagemSimples[]
  fluxo: string
  workspace?: string
  permissoes: string[]
}

/** Valida o pedido da tela (histórico visível + fluxo + território candidato). */
function validarPedido(corpo: Record<string, unknown>): { ok: true; pedido: PedidoValidado } | { ok: false; message: string } {
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
  const permissoesBrutas = corpo.permissoes
  const permissoes = Array.isArray(permissoesBrutas)
    ? permissoesBrutas.filter((p): p is string => typeof p === 'string' && ehMexida(p as never))
    : []
  const workspace = typeof corpo.workspace === 'string' && corpo.workspace.trim() !== '' ? corpo.workspace : undefined
  return { ok: true, pedido: { mensagens: messages as MensagemSimples[], fluxo: fluxo.trim(), workspace, permissoes } }
}

function escreverEvento(res: ServerResponse, evento: EventoAgir): void {
  res.write(`data: ${JSON.stringify(evento)}\n\n`)
}

/** POST /api/agir/aprovar — o dono respondeu o cartão. */
async function tratarAprovar(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const fluxo = typeof corpo.fluxo === 'string' ? corpo.fluxo.trim() : ''
  const id = typeof corpo.id === 'string' ? corpo.id.trim() : ''
  const decisao = corpo.decisao
  const ferramenta = corpo.ferramenta
  const decisaoValida = decisao === 'permitir' || decisao === 'negar' || decisao === 'sessao'
  if (fluxo === '' || id === '' || !decisaoValida) {
    sendErro(res, 400, 'configuracao', 'Resposta de aprovação inválida (fluxo, id e decisao são obrigatórios).')
    return true
  }
  if (decisao === 'sessao' && !(typeof ferramenta === 'string' && ehMexida(ferramenta as never))) {
    sendErro(res, 400, 'configuracao', '"Permitir na Sessão" só vale para ferramentas que mexem em arquivos (criar/escrever).')
    return true
  }
  const resolver = pendentesPorFluxo.get(fluxo)?.get(id)
  if (!resolver) {
    sendErro(res, 409, 'fluxo', 'Esta execução já não espera mais resposta (a página recarregou ou ela terminou). Envie a mensagem de novo.')
    return true
  }
  pendentesPorFluxo.get(fluxo)?.delete(id)
  if (decisao === 'sessao' && typeof ferramenta === 'string') {
    permissoesPorFluxo.get(fluxo)?.add(ferramenta)
  }
  resolver(decisao !== 'negar')
  sendJson(res, 200, { ok: true })
  return true
}

/** POST /api/agir — abre o fio do loop do agente. */
async function tratarAgir(
  req: IncomingMessage,
  res: ServerResponse,
  deps: DependenciasAgir,
): Promise<boolean> {
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

  const { alvo, erro } = await deps.obterAlvo()
  if (!alvo) {
    sendErro(res, 409, erro?.code ?? 'sem_provedor', erro?.message ?? 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.')
    return true
  }

  const pasta = deps.pastaDeTrabalho(validacao.pedido.workspace)
  if (!pasta.ok) {
    sendErro(res, 409, 'configuracao', pasta.message)
    return true
  }

  // ---- Pré-condições ok: abre o fio SSE ----
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const abort = new AbortController()
  const aoFechar = (): void => abort.abort()
  req.on('close', aoFechar)

  const { fluxo } = validacao.pedido
  permissoesPorFluxo.set(fluxo, new Set(validacao.pedido.permissoes))
  pendentesPorFluxo.set(fluxo, new Map())

  try {
    await rodarAgir({
      vizinho: criarVizinhoReal(alvo),
      historico: validacao.pedido.mensagens.map((mensagem) => ({ papel: mensagem.role === 'user' ? ('usuario' as const) : ('assistente' as const), conteudo: mensagem.content })),
      executores: criarExecutoresReais(pasta.raiz),
      emitir: (evento) => {
        if (abort.signal.aborted || res.writableEnded) return
        // O rodapé da tela mostra o modelo EFETIVO (o configurado no provedor
        // ativo — mesma régua da casa Conversa, §3.9), mesmo que o fio do
        // provedor não carimbe o modelo em cada pedaço.
        escreverEvento(res, evento.type === 'done' ? { type: 'done', model: alvo.modelo } : evento)
      },
      pedirAprovacao: async (pedido) => {
        const concedidas = permissoesPorFluxo.get(fluxo)
        if (concedidas?.has(pedido.ferramenta)) return true // Q2a: já liberada na sessão
        if (abort.signal.aborted) return false
        escreverEvento(res, { type: 'approval', pedido }) // o cartão (1 vez)
        return await new Promise<boolean>((resolve) => {
          pendentesPorFluxo.get(fluxo)?.set(pedido.id, resolve)
        })
      },
      sinal: abort.signal,
    })
  } catch {
    if (!abort.signal.aborted) {
      escreverEvento(res, { type: 'error', code: 'resposta', message: 'Erro inesperado do servidor ao agir.' })
    }
  } finally {
    pendentesPorFluxo.delete(fluxo)
    permissoesPorFluxo.delete(fluxo)
    req.off?.('close', aoFechar)
    res.end()
  }
  return true
}

export async function tratarRotasAgir(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  deps: DependenciasAgir,
): Promise<boolean> {
  const metodo = req.method ?? 'GET'
  if (metodo !== 'POST') return false
  if (url.pathname === '/api/agir/aprovar') return tratarAprovar(req, res)
  if (url.pathname === '/api/agir') return tratarAgir(req, res, deps)
  return false
}
