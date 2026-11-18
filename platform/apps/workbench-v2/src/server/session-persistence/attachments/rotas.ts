// C-3a — endpoints de anexo (R08): mesmo namespace /api/sessions,
// mesmo bind/Host/Origin (revalidação defensiva via local-boundary),
// dono = (sessão, chat) consultado no SQLite, corpo binário em stream
// (nunca Buffer/JSON/base64). Devolve true quando a rota foi tratada.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream } from 'node:fs'
import { validateLocalRequest } from '../../../../server/local-boundary.mjs'
import { getDatabase, getSessionRecord } from '../database'
import { consultarDelecao, problemaSessaoExcluida } from '../deletions'
import { PersistenceProblem } from '../persistenceErrors'
import { obterArtigo, listarArtigosChat, listarUploads } from './catalogo'
import { validarSchemaAnexos } from './schemaAnexos'
import { projetarArtigoSeguro } from './dtoAnexo'
import {
  cancelarUpload, consultarUpload, admitirUpload, receberConteudo, lerArtigo, reconciliarIdentidade,
} from './estoque'
import { registrarReferencia } from './referencias'
import { confirmRecovery, prepareRecovery } from './recuperacao'
import type { ModoAnexo } from './schemaAnexos'

const PREFIXO = '/api/sessions'

function sendJson(response: ServerResponse, status: number, corpo: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(corpo))
}

function problemaParaResposta(response: ServerResponse, error: unknown): void {
  if (error instanceof PersistenceProblem) {
    sendJson(response, error.status, { code: error.code, message: error.message })
    return
  }
  sendJson(response, 500, { code: 'attachment_error', message: `Falha no serviço de anexos: ${String(error)}` })
}

interface AlvoAnexos { sessionId: string; chatId: string; resto: string }

function interpretarCaminho(pathname: string): AlvoAnexos | null {
  if (!pathname.startsWith(`${PREFIXO}/`)) return null
  const pedacos = pathname.slice(PREFIXO.length + 1).split('/')
  // :sid/chats/:cid/attachments/…
  if (pedacos.length < 4 || pedacos[1] !== 'chats' || pedacos[3] !== 'attachments') return null
  const [sessionId, , chatId] = pedacos
  if (!sessionId || !chatId) return null
  return { sessionId, chatId, resto: pedacos.slice(4).join('/') }
}

function exigirDono(sessionId: string, chatId: string): void {
  validarSchemaAnexos(getDatabase())
  if (consultarDelecao(sessionId)) throw problemaSessaoExcluida()
  const registro = getSessionRecord(sessionId)
  if (!registro) throw new PersistenceProblem(404, 'session_not_found', 'Sessão não encontrada.')
  void chatId
}

async function lerJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const pedaco of request) {
    bytes += (pedaco as Buffer).length
    if (bytes > 64 * 1024) throw new PersistenceProblem(413, 'session_payload_too_large', 'Corpo excede 64 KiB.')
    chunks.push(pedaco as Buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
  } catch {
    throw new PersistenceProblem(400, 'invalid_json', 'Corpo JSON inválido.')
  }
}

function texto(campo: unknown, rotulo: string, obrigatorio = true): string {
  if (typeof campo === 'string' && campo.length > 0) return campo
  if (!obrigatorio) return ''
  throw new PersistenceProblem(400, 'invalid_field', `Campo ${rotulo} inválido.`)
}

function inteiro(campo: unknown, rotulo: string): number | null {
  if (campo == null) return null
  if (typeof campo === 'number' && Number.isSafeInteger(campo) && campo >= 0) return campo
  throw new PersistenceProblem(400, 'invalid_field', `Campo ${rotulo} inválido.`)
}

/**
 * Despacha as rotas de anexo. Chamar no handleRequest ANTES do caminho
 * genérico de sessão (o byId ancorado em `$` não cobre subrotas).
 */
export async function tratarRotasAnexos(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
  const alvo = interpretarCaminho(url.pathname)
  if (!alvo) return false

  // Defesa em profundidade: a borda do Vite já filtra; a rota repete a
  // validação de Host/Origin para não depender da ordem dos middlewares.
  const limite = validateLocalRequest(request)
  if (!limite.ok) {
    sendJson(response, 403, { code: 'local_only', message: 'Acesso local de mesma origem obrigatório.' })
    return true
  }

  const { sessionId, chatId, resto } = alvo
  const metodo = (request.method ?? 'GET').toUpperCase()
  try {
    exigirDono(sessionId, chatId)
    await reconciliarIdentidade(sessionId, chatId)

    // GET /attachments — lista segura (F5/offline): artefatos publicados +
    // transferências ainda em voo (estado honesto dos chips).
    if (metodo === 'GET' && resto === '') {
      const artigos = listarArtigosChat(sessionId, chatId)
      const projetados = await Promise.all(artigos.map(projetarArtigoSeguro))
      const emVoo = listarUploads(sessionId, chatId).map((linha) => ({
        uploadId: linha.uploadId, artifactId: linha.artifactId, state: linha.state,
        name: linha.name, mode: linha.mode, errorCode: linha.errorCode,
      }))
      sendJson(response, 200, { attachments: projetados, uploads: emVoo })
      return true
    }

    // POST /attachments/uploads — admissão.
    if (metodo === 'POST' && resto === 'uploads') {
      const corpo = await lerJson(request)
      const recibo = await admitirUpload({
        sessionId, chatId,
        name: texto(corpo.name, 'name'),
        declaredBytes: inteiro(corpo.bytes, 'bytes'),
        mime: texto(corpo.mime, 'mime', false),
        mode: (texto(corpo.mode, 'mode') === 'reference' ? 'reference' : 'copy') as ModoAnexo,
        scope: texto(corpo.scope, 'scope') === 'workspace' ? 'workspace' : 'chat',
        workspaceRoot: typeof corpo.workspaceRoot === 'string' && corpo.workspaceRoot ? corpo.workspaceRoot : null,
        uploadId: typeof corpo.uploadId === 'string' && /^[0-9a-f-]{36}$/i.test(corpo.uploadId) ? corpo.uploadId : undefined,
      })
      sendJson(response, 201, recibo)
      return true
    }

    // PUT /attachments/uploads/:uploadId/content — corpo binário em stream.
    const casarConteudo = /^uploads\/([^/]+)\/content$/.exec(resto)
    if (metodo === 'PUT' && casarConteudo) {
      const uploadId = casarConteudo[1]
      const recibo = await receberConteudo(sessionId, chatId, uploadId, request)
      sendJson(response, 200, recibo)
      return true
    }

    // GET/DELETE /attachments/uploads/:uploadId — estado e cancelamento.
    const casarUpload = /^uploads\/([^/]+)$/.exec(resto)
    if (casarUpload) {
      const uploadId = casarUpload[1]
      if (metodo === 'GET') { sendJson(response, 200, consultarUpload(sessionId, chatId, uploadId)); return true }
      if (metodo === 'DELETE') { await cancelarUpload(sessionId, chatId, uploadId); sendJson(response, 200, { ok: true }); return true }
    }

    // POST /attachments/references — referência de projeto (sem cópia).
    if (metodo === 'POST' && resto === 'references') {
      const corpo = await lerJson(request)
      const recibo = await registrarReferencia({
        sessionId, chatId,
        workspaceRoot: texto(corpo.workspaceRoot, 'workspaceRoot'),
        sourcePath: texto(corpo.sourcePath ?? corpo.path, 'sourcePath'),
      })
      sendJson(response, 201, recibo)
      return true
    }

    // POST /attachments/recovery/prepare|confirm — R11/T30/T31.
    if (metodo === 'POST' && (resto === 'recovery/prepare' || resto === 'recovery/confirm')) {
      const corpo = await lerJson(request)
      const uploadId = texto(corpo.uploadId, 'uploadId')
      const recibo = resto.endsWith('prepare')
        ? await prepareRecovery(sessionId, chatId, uploadId, typeof corpo.source === 'string' ? corpo.source : undefined)
        : await confirmRecovery(sessionId, chatId, uploadId)
      sendJson(response, 200, recibo)
      return true
    }

    // GET /attachments/:artifactId[?download=1] — metadata ou bytes do dono.
    const casarArtefato = /^([^/]+)$/.exec(resto)
    if (metodo === 'GET' && casarArtefato && !resto.startsWith('uploads')) {
      const artifactId = casarArtefato[1]
      const artigo = obterArtigo(artifactId)
      if (!artigo || artigo.sessionId !== sessionId || artigo.chatId !== chatId) {
        throw new PersistenceProblem(404, 'attachment_not_found', 'Artefato não encontrado nesta conversa.')
      }
      if (url.searchParams.get('download') === '1') {
        const alvoArquivo = await lerArtigo(artifactId)
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/octet-stream')
        response.setHeader('Content-Length', String(alvoArquivo.bytes))
        response.setHeader('Content-Disposition', `attachment; filename="${alvoArquivo.name.replace(/["\\]/g, '_')}"`)
        createReadStream(alvoArquivo.caminho).pipe(response)
        return true
      }
      sendJson(response, 200, await projetarArtigoSeguro(artigo))
      return true
    }

    sendJson(response, 404, { code: 'route_not_found', message: 'Rota de anexo desconhecida.' })
    return true
  } catch (error) {
    problemaParaResposta(response, error)
    return true
  }
}
