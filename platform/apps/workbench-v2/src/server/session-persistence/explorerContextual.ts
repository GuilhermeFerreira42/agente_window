// Explorer por sessão/chat: cada requisição resolve o dono persistido; nenhum
// caminho de raiz ou estado global escolhido no navegador concede autoridade.
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Duplex } from 'node:stream'
import type { Plugin } from 'vite'
import { WebSocketServer } from 'ws'
import { resolverRaizExplorer } from './raizExplorer'
import { PersistenceProblem } from './persistenceErrors'
import { excluirNoExplorerPrivado, moverNoExplorerPrivado } from './movimentoPrivado'
type WorkspaceUri = `file://${string}`
interface ExplorerFsServer {
  tryHandleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean>
  tryHandleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean
  dispose(): void
}
interface ExplorerGitServer { tryHandleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> }
interface FabricaExplorer {
  createExplorerFsServer(options: { root: WorkspaceUri; rejectSymlinks: boolean; createWsServer: () => WebSocketServer }): Promise<ExplorerFsServer>
  createExplorerGitServer(options: { workspaceRoot: string }): ExplorerGitServer
  criarHostPrivado(root: WorkspaceUri): { assertSafeUri(uri: WorkspaceUri): string }
}

const PREFIX = '/api/explorer/'
const MAX_CONTEXTOS = 48
const INATIVO_MS = 5 * 60_000
interface Contexto { raiz: string; tipo: 'chat' | 'projeto'; fs: ExplorerFsServer; git: ExplorerGitServer; usado: number }
interface Pedido { sessionId: string; chatId: string; sufixo: string }

function parse(req: IncomingMessage): Pedido | null {
  const url = new URL(req.url ?? '/', 'http://explorer.local')
  if (!url.pathname.startsWith(PREFIX)) return null
  const match = /^\/api\/explorer\/([^/]+)\/([^/]+)\/(fs|git)\/(.+)$/.exec(url.pathname)
  if (!match) throw new PersistenceProblem(400, 'invalid_context', 'Rota do Explorer inválida.')
  let sessionId: string, chatId: string
  try { sessionId = decodeURIComponent(match[1]); chatId = decodeURIComponent(match[2]) }
  catch { throw new PersistenceProblem(400, 'invalid_context', 'Identidade de conversa inválida.') }
  return { sessionId, chatId, sufixo: `/${match[3]}/${match[4]}${url.search}` }
}

export function explorerContextualPlugin({ createExplorerFsServer, createExplorerGitServer, criarHostPrivado }: FabricaExplorer): Plugin {
  const contextos = new Map<string, Contexto>()
  // Inicializações concorrentes do mesmo dono compartilham a mesma promessa.
  const criando = new Map<string, Promise<Contexto>>()
  const chave = (p: Pedido) => JSON.stringify([p.sessionId, p.chatId])
  function descartar(key: string) { const atual = contextos.get(key); if (atual) { contextos.delete(key); atual.fs.dispose() } }
  async function obter(pedido: Pedido): Promise<Contexto> {
    const resolvido = await resolverRaizExplorer(pedido.sessionId, pedido.chatId)
    const key = chave(pedido), antigo = contextos.get(key)
    if (antigo && antigo.raiz === resolvido.raiz && antigo.tipo === resolvido.tipo) { antigo.usado = Date.now(); return antigo }
    if (antigo) descartar(key)
    const existente = criando.get(key)
    if (existente) return existente
    if (contextos.size + criando.size >= MAX_CONTEXTOS) throw new PersistenceProblem(503, 'explorer_capacity', 'Muitos Explorers abertos. Feche outro e tente novamente.')
    const criacao = (async () => {
      const fs = await createExplorerFsServer({ root: resolvido.raiz as WorkspaceUri, rejectSymlinks: resolvido.tipo === 'chat', createWsServer: () => new WebSocketServer({ noServer: true }) })
      // Uma mudança de contexto/exclusão enquanto o watcher subia não deve
      // devolver uma instância antiga após a mudança.
      try {
        const novamente = await resolverRaizExplorer(pedido.sessionId, pedido.chatId)
        if (novamente.tipo !== resolvido.tipo || novamente.raiz !== resolvido.raiz) throw new PersistenceProblem(409, 'session_context_mismatch', 'A raiz mudou; tente novamente.')
        const contexto = { ...resolvido, fs, git: createExplorerGitServer({ workspaceRoot: resolvido.raiz }), usado: Date.now() }
        contextos.set(key, contexto)
        return contexto
      } catch (erro) { fs.dispose(); throw erro }
    })()
    criando.set(key, criacao)
    try { return await criacao } finally { criando.delete(key) }
  }
  return {
    name: 'explorer-contextual', apply: 'serve',
    configureServer(server) {
      const timer = setInterval(() => { const limite = Date.now() - INATIVO_MS; for (const [key, item] of contextos) if (item.usado < limite) descartar(key) }, INATIVO_MS)
      timer.unref()
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(PREFIX)) { next(); return }
        void (async () => {
          const pedido = parse(req)
          if (!pedido) return false
          const contexto = await obter(pedido)
          if (pedido.sufixo.startsWith('/git/') && contexto.tipo === 'chat') throw new PersistenceProblem(403, 'git_unavailable', 'Git não está disponível na raiz privada do chat.')
          const operacao = pedido.sufixo.split('?')[0]
          if (contexto.tipo === 'chat' && req.method === 'POST' && (operacao === '/fs/rename' || operacao === '/fs/delete')) {
            const partes: Buffer[] = []; let tamanho = 0
            for await (const parte of req) {
              const bytes = Buffer.isBuffer(parte) ? parte : Buffer.from(parte)
              tamanho += bytes.length
              if (tamanho > 64 * 1024) throw new PersistenceProblem(413, 'payload_too_large', 'Pedido grande demais.')
              partes.push(bytes)
            }
            let corpo: unknown
            try { corpo = JSON.parse(Buffer.concat(partes).toString('utf8')) } catch { throw new PersistenceProblem(400, 'invalid_json', 'Pedido inválido.') }
            const dados = corpo as { from?: unknown; to?: unknown; uri?: unknown; recursive?: unknown } | null
            const host = criarHostPrivado(contexto.raiz as WorkspaceUri)
            if (operacao === '/fs/rename') {
              if (!dados || typeof dados.from !== 'string' || typeof dados.to !== 'string' || !dados.from.startsWith('file://') || !dados.to.startsWith('file://')) throw new PersistenceProblem(400, 'invalid_path', 'Caminho inválido.')
              await moverNoExplorerPrivado(pedido.sessionId, pedido.chatId, host, dados.from as WorkspaceUri, dados.to as WorkspaceUri)
            } else {
              if (!dados || typeof dados.uri !== 'string' || !dados.uri.startsWith('file://')) throw new PersistenceProblem(400, 'invalid_path', 'Caminho inválido.')
              await excluirNoExplorerPrivado(pedido.sessionId, pedido.chatId, host, dados.uri as WorkspaceUri, dados.recursive === true)
            }
            res.statusCode = 204; res.end(); return true
          }
          req.url = pedido.sufixo
          const tratado = await (pedido.sufixo.startsWith('/git/') ? contexto.git : contexto.fs).tryHandleHttp(req, res)
          if (!tratado) throw new PersistenceProblem(404, 'not_found', 'Rota do Explorer não encontrada.')
          return true
        })().then(tratado => { if (!tratado) next() }).catch((erro: unknown) => {
          if (res.headersSent) { res.destroy(); return }
          const codigo = erro instanceof PersistenceProblem ? erro.code : typeof (erro as { code?: unknown })?.code === 'string' ? (erro as { code: string }).code : 'explorer_error'
          res.statusCode = erro instanceof PersistenceProblem ? erro.status : codigo === 'forbidden_path' ? 403 : codigo === 'file_exists' ? 409 : 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ code: codigo, message: erro instanceof PersistenceProblem ? erro.message : 'Não foi possível acessar o Explorer.' }))
        })
      })
      server.httpServer?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        if (!req.url?.startsWith(PREFIX)) return
        void (async () => {
          const pedido = parse(req)
          if (!pedido || pedido.sufixo.split('?')[0] !== '/fs/watch') throw new Error('Upgrade inválido.')
          const contexto = await obter(pedido)
          if (socket.destroyed) return
          req.url = pedido.sufixo
          if (!contexto.fs.tryHandleUpgrade(req, socket, head)) socket.destroy()
        })().catch(() => socket.destroy())
      })
      server.httpServer?.once('close', () => { clearInterval(timer); for (const key of contextos.keys()) descartar(key) })
    },
  }
}
