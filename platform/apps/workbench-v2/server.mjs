import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNodePtyAvailable, createPtyWebSocketBridge, PTY_WS_PATH } from '../../../platform/services/pty-server/dist/singlePort.js'
import { WebSocketServer } from 'ws'
import { createExplorerFsServer, FS_WATCH_PATH } from './dist-fs-server/server/fs/index.js'
import { FsHost } from './dist-fs-server/server/fs/fsHost.js'
import { createExplorerGitServer, GIT_HTTP_PREFIX } from './dist-fs-server/server/git/index.js'
import { isLoopbackBind, validateLocalRequest } from './server/local-boundary.mjs'
import { sessionPersistencePlugin, explorerContextualPlugin } from './dist-backend/backend.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.resolve(__dirname, 'dist')
const HOST = process.env.HOST || '127.0.0.1'
const PORT = Number(process.env.PORT) || 4173
if (!isLoopbackBind(HOST)) throw new Error('[server.mjs] Preview local exige HOST loopback; não exponha à LAN.')

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const type = MIME_TYPES[ext] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  fs.createReadStream(filePath).pipe(res)
}

function resolveStaticFile(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0])
  const normalized = pathname === '/' ? '/index.html' : pathname
  const candidatePath = path.resolve(DIST_DIR, `.${normalized}`)

  if (!candidatePath.startsWith(DIST_DIR)) {
    return null
  }

  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return candidatePath
  }

  return null
}

async function start() {
  if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    throw new Error('[server.mjs] dist/index.html não encontrado. Rode npm run build antes do preview.')
  }

  await assertNodePtyAvailable()
  const bridge = createPtyWebSocketBridge()

  // FATIA-04 (4.3): FileSystemPort no preview também (Single Port, Q7).
  // Raiz = repo (relativa a este arquivo) ou FS_TEST_ROOT. Sem PTY tocar.
  const fsRoot = process.env.FS_TEST_ROOT ?? `file://${path.resolve(__dirname, '../../..')}`
  const fsServer = await createExplorerFsServer({
    root: fsRoot,
    createWsServer: () => new WebSocketServer({ noServer: true }),
  })

  const gitServer = createExplorerGitServer({ workspaceRoot: fsRoot })

  // Os mesmos handlers de persistência/Explorer usados no Vite, compilados
  // para Node no build. Uma única instância compartilha a fila e o SQLite.
  const middlewares = []
  const server = http.createServer((req, res) => {
    const localDecision = validateLocalRequest(req)
    if (!localDecision.ok) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ code: 'local_only', message: 'Acesso local de mesma origem obrigatório.' }))
      return
    }
    let indice = 0
    const next = () => {
      const middleware = middlewares[indice++]
      if (middleware) middleware(req, res, next)
      else servir(req, res)
    }
    next()
  })
  const contexto = { middlewares: { use: middleware => middlewares.push(middleware) }, httpServer: server }
  sessionPersistencePlugin({ repoRoot: path.resolve(__dirname, '../../..') }).configureServer(contexto)
  explorerContextualPlugin({ createExplorerFsServer, createExplorerGitServer, criarHostPrivado: root => new FsHost(root, true) }).configureServer(contexto)

  function servir(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`)

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: true, wsPath: PTY_WS_PATH }))
      return
    }

    if (url.pathname === PTY_WS_PATH) {
      res.writeHead(426, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'Upgrade Required' }))
      return
    }

    const workspaceHandler = url.pathname.startsWith(GIT_HTTP_PREFIX) ? gitServer
      : url.pathname.startsWith('/fs/') ? fsServer : null
    if (workspaceHandler) {
      workspaceHandler
        .tryHandleHttp(req, res)
        .then((handled) => {
          if (!handled) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
            res.end(JSON.stringify({ code: 'io', message: `(preview) não tratado: ${url.pathname}` }))
          }
        })
        .catch((err) => {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ code: 'io', message: String(err) }))
        })
      return
    }

    const staticFile = resolveStaticFile(url.pathname)
    if (staticFile) {
      sendFile(res, staticFile)
      return
    }

    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ code: 'not_found', message: 'API não encontrada.' }))
      return
    }
    sendFile(res, path.join(DIST_DIR, 'index.html'))
  }

  // server.close não encerra sockets já promovidos para WebSocket. Conserva
  // apenas os do Explorer contextual para que o encerramento seja concluído;
  // o bridge de PTY continua responsável pelos próprios sockets.
  const socketsExplorer = new Set()
  server.on('upgrade', (req, socket) => {
    if (!req.url?.startsWith('/api/explorer/')) return
    socketsExplorer.add(socket)
    socket.once('close', () => socketsExplorer.delete(socket))
  })
  server.prependListener('upgrade', (req, socket) => {
    if (!validateLocalRequest(req, { requireOrigin: true }).ok) socket.destroy()
  })
  const detachUpgrade = bridge.attachToServer(server)
  server.on('upgrade', (req, socket, head) => {
    fsServer.tryHandleUpgrade(req, socket, head)
  })

  server.listen(PORT, HOST, () => {
    console.log(`[server.mjs] Preview em http://${HOST}:${PORT} com terminal em ws://${HOST}:${PORT}${PTY_WS_PATH} e FS em ${FS_WATCH_PATH} (raiz ${fsRoot})` + `
[server.mjs] raiz FS = ${fsRoot}`)
  })

  const shutdown = () => {
    detachUpgrade()
    fsServer.dispose()
    bridge.dispose()
    for (const socket of socketsExplorer) socket.destroy()
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('[server.mjs] Falha fatal ao iniciar preview integrado:', error)
  process.exit(1)
})
