// ============================================================================
// Casa Provedores — rotas HTTP (servidor de desenvolvimento).
//
// O plugin do Vite (`src/server/session-persistence`) é a "prefeitura": ele
// reconhece os caminhos desta casa e DELEGA para cá (decisão da SPEC §2).
// Endpoints:
//   GET  /api/providers          → estado para a tela (chave mascarada — D83)
//   PUT  /api/providers          → salva (apiKey ausente mantém a guardada — D84)
//   POST /api/providers/test     → testa conexão de verdade (servidor → provedor)
//   POST /api/providers/models   → busca a lista de modelos
//   POST /api/providers/reveal   → o "olhinho" (D83): a chave inteira, no-store
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { SalvarProvedoresInput } from '../contract'
import { descritorPorId } from '../descritores/registro'
import { listarModelos, testarConexao, type AlvoConexao } from './probe'
import { armazenamentoAtual, caminhoDoArquivo, estadoParaTela, lerArquivo, resolverChave, revelarChave, salvarArquivo } from './providersRepo'

const ROTAS_CONHECIDAS = ['/api/providers', '/api/providers/test', '/api/providers/models', '/api/providers/reveal']

export function rotaPertenceAoModulo(pathname: string): boolean {
  return ROTAS_CONHECIDAS.includes(pathname)
}

function sendJson(res: ServerResponse, status: number, corpo: unknown, cabecalhos: Record<string, string> = {}): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  for (const [chave, valor] of Object.entries(cabecalhos)) res.setHeader(chave, valor)
  res.end(JSON.stringify(corpo))
}

function sendErro(res: ServerResponse, status: number, mensagem: string): void {
  sendJson(res, status, { code: status === 404 ? 'nao_encontrado' : 'entrada_invalida', message: mensagem })
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

/** Junta o rascunho da tela com o que está guardado: rascunho > arquivo > ambiente (D84). */
async function alvoEfetivo(corpo: Record<string, unknown>): Promise<AlvoConexao> {
  const id = String(corpo.id ?? '')
  const descritor = descritorPorId(id)
  if (!descritor) throw Object.assign(new Error(`Provedor desconhecido: ${id}`), { status: 404 })
  const arquivo = await lerArquivo()
  const salvo = arquivo.provedores[id]
  const baseUrlDigitada = typeof corpo.baseUrl === 'string' ? corpo.baseUrl.trim().replace(/\/$/, '') : ''
  const chaveDigitada = typeof corpo.apiKey === 'string' ? corpo.apiKey.trim() : ''
  const { chave } = resolverChave(id, arquivo)
  return {
    id,
    baseUrl: baseUrlDigitada || salvo?.baseUrl || descritor.baseUrlPadrao,
    modelo: (typeof corpo.modelo === 'string' ? corpo.modelo.trim() : '') || salvo?.modelo || '',
    apiKey: chaveDigitada || chave,
  }
}

export async function tratarRotasProvedores(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  const metodo = req.method ?? 'GET'

  if (url.pathname === '/api/providers' && metodo === 'GET') {
    const arquivo = await lerArquivo()
    const { provedores, ativo } = estadoParaTela(arquivo)
    sendJson(res, 200, { provedores, ativo, storage: armazenamentoAtual(), caminho: caminhoDoArquivo() })
    return true
  }

  if (url.pathname === '/api/providers' && metodo === 'PUT') {
    try {
      const corpo = await lerCorpo(req)
      const salvo = await salvarArquivo(corpo as unknown as SalvarProvedoresInput)
      const { provedores, ativo } = estadoParaTela(salvo)
      sendJson(res, 200, { provedores, ativo, storage: armazenamentoAtual() })
    } catch (erro) {
      sendErro(res, 400, (erro as Error).message)
    }
    return true
  }

  if (url.pathname === '/api/providers/test' && metodo === 'POST') {
    try {
      const alvo = await alvoEfetivo(await lerCorpo(req))
      sendJson(res, 200, await testarConexao(alvo))
    } catch (erro) {
      const status = (erro as { status?: number }).status ?? 400
      sendErro(res, status, (erro as Error).message)
    }
    return true
  }

  if (url.pathname === '/api/providers/models' && metodo === 'POST') {
    try {
      const alvo = await alvoEfetivo(await lerCorpo(req))
      sendJson(res, 200, await listarModelos(alvo))
    } catch (erro) {
      const status = (erro as { status?: number }).status ?? 400
      sendErro(res, status, (erro as Error).message)
    }
    return true
  }

  if (url.pathname === '/api/providers/reveal' && metodo === 'POST') {
    try {
      const corpo = await lerCorpo(req)
      const chave = await revelarChave(String(corpo.id ?? ''))
      // D83: a chave não pode ficar em cache nenhum.
      sendJson(res, 200, { chave }, { 'Cache-Control': 'no-store' })
    } catch (erro) {
      const status = (erro as { status?: number }).status ?? 404
      sendErro(res, status, (erro as Error).message)
    }
    return true
  }

  return false
}
