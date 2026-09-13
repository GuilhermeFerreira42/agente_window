import http from 'node:http'
import { assertNodePtyAvailable, createPtyWebSocketBridge, PTY_WS_PATH } from './singlePort.js'

const START_PORT = Number(process.env.PTY_PORT) || 7681
const MAX_PORT = START_PORT + 18
const HOST = process.env.PTY_HOST || '127.0.0.1'

function createServerWithPort(port: number, requestListener: http.RequestListener): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestListener)

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server.close()
        if (port < MAX_PORT) {
          resolve(createServerWithPort(port + 1, requestListener))
        } else {
          reject(
            new Error(
              `[pty-server] Nenhuma porta disponível no intervalo ${START_PORT}-${MAX_PORT}. Encerre outros processos ou configure PTY_PORT.`
            )
          )
        }
      } else {
        reject(err)
      }
    })

    server.listen(port, HOST, () => {
      resolve({ server, port })
    })
  })
}

async function start() {
  try {
    await assertNodePtyAvailable()

    const requestListener: http.RequestListener = (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`)
      if (url.pathname === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, wsPath: PTY_WS_PATH }))
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not Found' }))
    }

    const bridge = createPtyWebSocketBridge()
    const { server, port } = await createServerWithPort(START_PORT, requestListener)
    const detachUpgrade = bridge.attachToServer(server)

    console.log(`[pty-server] Escutando em http://${HOST}:${port} e ws://${HOST}:${port}${PTY_WS_PATH}`)

    const shutdown = () => {
      console.log('\n[pty-server] Encerrando servidor PTY...')
      detachUpgrade()
      bridge.dispose()
      server.close(() => {
        process.exit(0)
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (err) {
    console.error('[pty-server] Falha fatal na inicialização:', err)
    process.exit(1)
  }
}

start()
