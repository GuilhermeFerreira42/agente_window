import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertNodePtyAvailable, createPtyWebSocketBridge, PTY_WS_PATH } from '../../../platform/services/pty-server/dist/singlePort.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DIST_DIR = path.resolve(__dirname, 'dist')
const HOST = process.env.HOST || '0.0.0.0'
const PORT = Number(process.env.PORT) || 4173

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

  const server = http.createServer((req, res) => {
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

    const staticFile = resolveStaticFile(url.pathname)
    if (staticFile) {
      sendFile(res, staticFile)
      return
    }

    sendFile(res, path.join(DIST_DIR, 'index.html'))
  })

  const detachUpgrade = bridge.attachToServer(server)

  server.listen(PORT, HOST, () => {
    console.log(`[server.mjs] Preview em http://${HOST}:${PORT} com terminal em ws://${HOST}:${PORT}${PTY_WS_PATH}`)
  })

  const shutdown = () => {
    detachUpgrade()
    bridge.dispose()
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((error) => {
  console.error('[server.mjs] Falha fatal ao iniciar preview integrado:', error)
  process.exit(1)
})
