// ============================================================================
// Casa Personalizações — rota HTTP (FATIA 14).
//   GET  /api/personalizacoes                 → VisaoPersonalizacoes
//   POST /api/personalizacoes/skills          → cria uma skill
//   PUT  /api/personalizacoes/estado          → salva o liga/desliga
//
// Erro de validação = 400 JSON {code,message} em português claro, no padrão da
// casa Config.
//
// A raiz de PROJETO nunca vem do browser: é resolvida pela sessão persistida,
// injetada pela prefeitura como dependência — o mesmo padrão de `resolverContexto`
// da casa Agir e a exigência de F1/D113 ("não confiar em workspace claim do
// cliente"). Sem sessão resolvível, o escopo de projeto simplesmente não entra;
// a resposta reporta `raizProjeto: null` em vez de deduzir.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { EstadoParcial, PedidoCriarSkill, VisaoPersonalizacoes } from '../contract'
import { lerEstado, salvarEstado } from './estado'
import { projetarFerramentas } from './ferramentas'
import { criarSkill, descobrirSkills } from './skills'

const ROTA = '/api/personalizacoes'
const ROTA_SKILLS = `${ROTA}/skills`
const ROTA_ESTADO = `${ROTA}/estado`

/** Estruturalmente compatível com `resolverContextoAgir` da prefeitura. */
export type ResolverContextoPersonalizacoes = (
  sessionId: string,
  chatId: string,
) => { ok: true; raiz: string } | { ok: false; message: string }

export interface DependenciasPersonalizacoes {
  resolverContexto?: ResolverContextoPersonalizacoes
}

export function rotaPertenceAoModuloPersonalizacoes(pathname: string): boolean {
  return pathname === ROTA || pathname === ROTA_SKILLS || pathname === ROTA_ESTADO
}

function sendJson(res: ServerResponse, status: number, corpo: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(corpo))
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

function textoDe(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

/** Resolve a raiz de projeto pela sessão persistida — ou null, sem deduzir. */
function resolverRaizProjeto(deps: DependenciasPersonalizacoes, sessionId: string, chatId: string): string | null {
  if (!deps.resolverContexto || !sessionId || !chatId) return null
  const contexto = deps.resolverContexto(sessionId, chatId)
  return contexto.ok ? contexto.raiz : null
}

async function montarVisao(deps: DependenciasPersonalizacoes, sessionId: string, chatId: string): Promise<VisaoPersonalizacoes> {
  const estado = await lerEstado()
  const raizProjeto = resolverRaizProjeto(deps, sessionId, chatId)
  const skills = await descobrirSkills(raizProjeto, estado)
  return { skills, ferramentas: projetarFerramentas(estado), estado, raizProjeto }
}

export async function tratarRotasPersonalizacoes(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  deps: DependenciasPersonalizacoes = {},
): Promise<boolean> {
  if (!rotaPertenceAoModuloPersonalizacoes(url.pathname)) return false
  const metodo = req.method ?? 'GET'

  if (url.pathname === ROTA && metodo === 'GET') {
    try {
      sendJson(res, 200, await montarVisao(deps, url.searchParams.get('sessionId') ?? '', url.searchParams.get('chatId') ?? ''))
    } catch (erro) {
      sendJson(res, 409, { code: 'personalizacoes', message: (erro as Error).message })
    }
    return true
  }

  if (url.pathname === ROTA_SKILLS && metodo === 'POST') {
    let corpo: Record<string, unknown>
    try {
      corpo = await lerCorpo(req)
    } catch (erro) {
      sendJson(res, 400, { code: 'personalizacoes', message: (erro as Error).message })
      return true
    }
    const pedido: PedidoCriarSkill = {
      nome: corpo.nome,
      descricao: corpo.descricao,
      corpo: corpo.corpo,
      origem: corpo.origem,
      sessionId: corpo.sessionId,
      chatId: corpo.chatId,
    }
    const raizProjeto = resolverRaizProjeto(deps, textoDe(pedido.sessionId), textoDe(pedido.chatId))
    const resultado = await criarSkill(pedido, raizProjeto)
    if (!resultado.ok) {
      sendJson(res, 400, { code: 'personalizacoes', message: resultado.motivo })
      return true
    }
    sendJson(res, 201, { skill: resultado.skill })
    return true
  }

  if (url.pathname === ROTA_ESTADO && metodo === 'PUT') {
    let corpo: Record<string, unknown>
    try {
      corpo = await lerCorpo(req)
    } catch (erro) {
      sendJson(res, 400, { code: 'personalizacoes', message: (erro as Error).message })
      return true
    }
    try {
      const parcial: EstadoParcial = {
        skillsDesligadas: corpo.skillsDesligadas,
        ferramentasDesligadas: corpo.ferramentasDesligadas,
      }
      sendJson(res, 200, await salvarEstado(parcial))
    } catch (erro) {
      sendJson(res, 409, { code: 'personalizacoes', message: (erro as Error).message })
    }
    return true
  }

  return false
}
