// C-3a — endpoints de anexo (R08). Mesmo namespace `/api/sessions`, mesma
// fronteira local (Host/Origin/porta) revalidada DENTRO da rota, dono e
// contexto derivados do CATÁLOGO — nunca do corpo (parecer B01/B02/B07):
//  - chat precisa existir no snapshot persistido da sessão;
//  - escopo/raiz do armazenamento são derivados (`dono.ts`), e declaração
//    divergente é recusada em vez de virar default permissivo;
//  - nenhuma rota aceita caminho livre do cliente (nem em recovery);
//  - download usa o MESMO resolver validado da metadata (hash incluído) e
//    responde com headers seguros, sem path.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream } from 'node:fs'
import { validateLocalRequest } from '../../../../server/local-boundary.mjs'
import { PersistenceProblem } from '../persistenceErrors'
import { consultarDelecao } from '../deletions'
import { withSessionPersistenceQueue } from '../filaSessao'
import { servirMidia } from './midia'
import { obterArtigo, listarArtigosChat, listarUploads } from './catalogo'
import { projetarArtigoSeguro } from './dtoAnexo'
import {
  admitirUpload, cancelarUpload, consultarUpload, lerArtigo, publicarPreparado, receberConteudo,
  reconciliarIdentidade, retomarUpload, type ReciboUpload,
} from './estoque'
import { registrarReferencia } from './referencias'
import { confirmRecovery, prepareRecovery } from './recuperacao'
import { exigirCampos, exigirVivo, escopoDoPedido, raizDoPedido, resolverDonoAnexos } from './dono'
import type { ModoAnexo } from './schemaAnexos'

const PREFIXO = '/api/sessions'

function sendJson(response: ServerResponse, status: number, corpo: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(corpo))
}

function problemaParaResposta(response: ServerResponse, error: unknown): void {
  if (error instanceof PersistenceProblem) {
    // Erro estruturado sem path privado/stack/segredo (contrato §Portas).
    sendJson(response, error.status, { code: error.code, message: error.message })
    return
  }
  sendJson(response, 500, { code: 'attachment_error', message: 'Falha inesperada no serviço de anexos. Nada foi publicado.' })
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

async function lerJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const pedaco of request) {
    bytes += (pedaco as Buffer).length
    if (bytes > 64 * 1024) throw new PersistenceProblem(413, 'session_payload_too_large', 'Corpo excede 64 KiB.')
    chunks.push(pedaco as Buffer)
  }
  let bruto: unknown
  try {
    bruto = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new PersistenceProblem(400, 'invalid_json', 'Corpo JSON inválido.')
  }
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    throw new PersistenceProblem(400, 'invalid_json', 'O corpo precisa ser um objeto JSON.')
  }
  return bruto as Record<string, unknown>
}

function texto(campo: unknown, rotulo: string, obrigatorio = true): string {
  if (typeof campo === 'string' && campo.length > 0 && campo.length <= 4096) return campo
  if (campo === undefined || campo === null) {
    if (!obrigatorio) return ''
  }
  throw new PersistenceProblem(400, 'invalid_field', `Campo ${rotulo} inválido.`)
}

function inteiro(campo: unknown, rotulo: string): number | null {
  if (campo === undefined || campo === null) return null
  if (typeof campo === 'number' && Number.isSafeInteger(campo) && campo >= 0) return campo
  throw new PersistenceProblem(400, 'invalid_field', `Campo ${rotulo} inválido.`)
}

/** `attachment; filename="…"; filename*=UTF-8''…` — nunca eco de path. */
function cabecalhoDisposicao(nome: string): string {
  const ascii = nome.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const utf8 = encodeURIComponent(nome)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`
}

function reciboPublico(recibo: ReciboUpload): ReciboUpload {
  // O recibo não expõe locator/stage — só identidade, estado e hash.
  return recibo
}

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
    // Dono + contexto do CATÁLOGO (chat existente, sessão viva, raiz real).
    // Leitura (F5) tolera pasta offline com estado honesto; escrita nunca —
    // o 409 de pasta inacessível continua valendo para admissão/conteúdo.
    const somenteLeitura = metodo === 'GET'
    // U2 — ESCRITA resolve o dono DENTRO da fila do próprio dono.
    //
    // Resolver fora da fila criava a corrida do trace anterior: uma publicação
    // viva da mesma sessão ainda estava em voo, o journal tinha intenção, e o
    // PUT recebia 503 `session_publication_pending` SEM esperar — apesar de a
    // operação ser conhecida e legítima. Serializando só a RESOLUÇÃO (a seção
    // crítica é curta; o stream não fica na fila), a escrita espera a operação
    // viva terminar e então prossegue. Pendência ABANDONADA (intenção sem
    // operação em voo) continua recebendo 503 — a guarda não foi afrouxada.
    const dono = somenteLeitura
      ? resolverDonoAnexos(sessionId, chatId, { permitirRaizOffline: true, leitura: true })
      : await withSessionPersistenceQueue(sessionId, async () =>
        resolverDonoAnexos(sessionId, chatId, { permitirRaizOffline: false }))

    // GET /attachments — lista segura (F5/offline): artefatos publicados +
    // transferências ainda em voo (estado honesto dos chips).
    if (metodo === 'GET' && resto === '') {
      await reconciliarIdentidade(sessionId, chatId)
      const artigos = listarArtigosChat(sessionId, chatId)
      const projetados = await Promise.all(artigos.map(projetarArtigoSeguro))
      const emVoo = listarUploads(sessionId, chatId).map((linha) => ({
        uploadId: linha.uploadId, artifactId: linha.artifactId, state: linha.state,
        name: linha.name, mode: linha.mode, errorCode: linha.errorCode,
      }))
      sendJson(response, 200, { attachments: projetados, uploads: emVoo })
      return true
    }

    // POST /attachments/uploads — admissão (dono/escopo derivados).
    if (metodo === 'POST' && resto === 'uploads') {
      const corpo = await lerJson(request)
      exigirCampos(corpo, ['uploadId', 'name', 'bytes', 'declaredBytes', 'mime', 'mode', 'scope', 'workspaceRoot'])
      const escopo = escopoDoPedido(dono, corpo.scope)
      const raiz = raizDoPedido(dono, corpo.workspaceRoot)
      if (raiz === null && escopo === 'workspace') {
        throw new PersistenceProblem(403, 'storage_out_of_scope', 'Esta conversa não tem pasta de projeto para receber cópia.')
      }
      const modo = texto(corpo.mode, 'mode') === 'reference' ? 'reference' as ModoAnexo : 'copy' as ModoAnexo
      const recibo = await admitirUpload({
        sessionId, chatId,
        name: texto(corpo.name, 'name'),
        declaredBytes: inteiro(corpo.bytes ?? corpo.declaredBytes, 'bytes'),
        mime: texto(corpo.mime, 'mime', false),
        mode: modo,
        scope: escopo,
        workspaceRoot: raiz,
        uploadId: typeof corpo.uploadId === 'string' && /^[0-9a-f-]{36}$/i.test(corpo.uploadId) ? corpo.uploadId : undefined,
      })
      sendJson(response, recibo.state === 'pronto' ? 200 : 201, reciboPublico(recibo))
      return true
    }

    // PUT /attachments/uploads/:uploadId/content — corpo binário em stream.
    const casarConteudo = /^uploads\/([^/]+)\/content$/.exec(resto)
    if (casarConteudo) {
      const uploadId = casarConteudo[1]
      if (metodo === 'PUT') {
        const recibo = await receberConteudo(sessionId, chatId, uploadId, request)
        sendJson(response, 200, reciboPublico(recibo))
        return true
      }
      if (metodo === 'POST') {
        // Variante de finalização (reconciliação/recovery) — mesmo dono.
        exigirVivo(sessionId)
        const recibo = await publicarPreparado(sessionId, chatId, uploadId)
        sendJson(response, 200, reciboPublico(recibo))
        return true
      }
    }

    // GET/DELETE /attachments/uploads/:uploadId — estado e cancelamento.
    const casarUpload = /^uploads\/([^/]+)$/.exec(resto)
    if (casarUpload) {
      const uploadId = casarUpload[1]
      if (metodo === 'GET') { sendJson(response, 200, consultarUpload(sessionId, chatId, uploadId)); return true }
      if (metodo === 'DELETE') { sendJson(response, 200, await cancelarUpload(sessionId, chatId, uploadId)); return true }
      if (metodo === 'PUT') {
        // Retomada idempotente da MESMA tentativa, sem path de origem.
        sendJson(response, 200, await retomarUpload(sessionId, chatId, uploadId))
        return true
      }
    }

    // POST /attachments/references — referência de projeto (sem cópia).
    if (metodo === 'POST' && resto === 'references') {
      const corpo = await lerJson(request)
      exigirCampos(corpo, ['sourcePath', 'path', 'workspaceRoot', 'referenceId'])
      const raiz = raizDoPedido(dono, corpo.workspaceRoot)
      if (!raiz) {
        throw new PersistenceProblem(403, 'workspace_not_allowed',
          'Referência de projeto exige uma conversa com pasta. Em Chat, o arquivo precisa ser copiado para a área privada.')
      }
      const recibo = await registrarReferencia({
        sessionId, chatId,
        workspaceRoot: raiz,
        sourcePath: texto(corpo.sourcePath ?? corpo.path, 'sourcePath'),
      })
      sendJson(response, 201, { ...recibo, uploadId: recibo.uploadId })
      return true
    }

    // POST /attachments/recovery/prepare|confirm — R13 (plano opaco curto).
    if (metodo === 'POST' && (resto === 'recovery/prepare' || resto === 'recovery/confirm')) {
      const corpo = await lerJson(request)
      exigirVivo(sessionId)
      if (resto.endsWith('prepare')) {
        exigirCampos(corpo, ['origemSessionId'])
        const plano = await prepareRecovery({
          destinoSessionId: sessionId, destinoChatId: chatId,
          origemSessionId: texto(corpo.origemSessionId, 'origemSessionId'),
        })
        sendJson(response, 200, {
          recoveryId: plano.recoveryId, token: plano.token, expiraEm: plano.expiraEm,
          itens: plano.itens.map((item) => ({ oldId: item.oldId, name: item.name, bytes: item.bytes, disponivel: item.disponivel })),
        })
        return true
      }
      exigirCampos(corpo, ['recoveryId', 'token'])
      const recibo = await confirmRecovery({
        destinoSessionId: sessionId, destinoChatId: chatId,
        recoveryId: texto(corpo.recoveryId, 'recoveryId'),
        token: texto(corpo.token, 'token'),
      })
      sendJson(response, 200, recibo)
      return true
    }

    // GET|HEAD /attachments/:artifactId/media — mídia passiva com Range (C-3b).
    //
    // Fica ANTES do casamento genérico de artefato para `media` não virar
    // artifactId. Ownership/tombstone continuam vindo do `dono` resolvido
    // acima; `servirMidia` reusa `lerArtigo` (hash + contenção), então não há
    // segundo caminho de autoridade sobre os bytes.
    const casarMidia = /^([^/]+)\/media$/.exec(resto)
    if (casarMidia && (metodo === 'GET' || metodo === 'HEAD')) {
      const artifactId = casarMidia[1]
      const artigo = obterArtigo(artifactId)
      if (!artigo || artigo.sessionId !== sessionId || artigo.chatId !== chatId) {
        throw new PersistenceProblem(404, 'attachment_not_found', 'Artefato não encontrado nesta conversa.')
      }
      await servirMidia(response, artifactId, request.headers.range, { somenteCabecalhos: metodo === 'HEAD' })
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
        // B07 — mesmo resolver validado (contenção + tamanho + hash).
        const alvoArquivo = await lerArtigo(artifactId)
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/octet-stream')
        response.setHeader('Content-Length', String(alvoArquivo.bytes))
        response.setHeader('Content-Disposition', cabecalhoDisposicao(alvoArquivo.name))
        response.setHeader('X-Content-Type-Options', 'nosniff')
        response.setHeader('Cache-Control', 'private, no-store')
        const fluxo = createReadStream(alvoArquivo.caminho)
        // Falha do stream depois do 200 não vira corpo truncado silencioso.
        fluxo.on('error', () => { try { response.destroy() } catch { /* socket já fechou */ } })
        fluxo.pipe(response)
        return true
      }
      sendJson(response, 200, await projetarArtigoSeguro(artigo))
      return true
    }

    if (metodo !== 'GET' && consultarDelecao(sessionId)) {
      throw new PersistenceProblem(410, 'session_deleted', 'Esta conversa foi excluída.')
    }
    sendJson(response, 404, { code: 'route_not_found', message: 'Rota de anexo desconhecida.' })
    return true
  } catch (error) {
    problemaParaResposta(response, error)
    return true
  }
}
