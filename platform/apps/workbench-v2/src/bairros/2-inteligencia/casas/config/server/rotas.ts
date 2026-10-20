// ============================================================================
// Casa Config — rota HTTP (FATIA 11).
//   GET /api/config → { teto, autoScroll } (o padrão quando não há arquivo)
//   PUT /api/config → salva o parcial { teto?, autoScroll? } (valida antes)
// Erro de validação = 400 JSON {code,message} em português claro.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ConfigParcial } from '../contract'
import { lerConfig, salvarConfig } from './repo'

const ROTA_CONFIG = '/api/config'

export function rotaPertenceAoModuloConfig(pathname: string): boolean {
  return pathname === ROTA_CONFIG
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

export async function tratarRotasConfig(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  if (url.pathname !== ROTA_CONFIG) return false
  const metodo = req.method ?? 'GET'
  if (metodo === 'GET') {
    try {
      sendJson(res, 200, await lerConfig())
    } catch (erro) {
      sendJson(res, 409, { code: 'configuracao', message: (erro as Error).message })
    }
    return true
  }
  if (metodo === 'PUT') {
    let corpo: Record<string, unknown>
    try {
      corpo = await lerCorpo(req)
    } catch (erro) {
      sendJson(res, 400, { code: 'configuracao', message: (erro as Error).message })
      return true
    }
    try {
      const parcial: ConfigParcial = { teto: corpo.teto, autoScroll: corpo.autoScroll }
      sendJson(res, 200, await salvarConfig(parcial))
    } catch (erro) {
      sendJson(res, 400, { code: 'configuracao', message: (erro as Error).message })
    }
    return true
  }
  return false
}
