import type { Plugin } from 'vite'
import { assertNodePtyAvailable, createPtyWebSocketBridge } from './singlePort'

export function ptyPlugin(): Plugin {
  let detachUpgrade: (() => void) | undefined
  let disposeBridge: (() => void) | undefined

  return {
    name: 'agents-window-pty-single-port',
    apply: 'serve',
    async configureServer(server) {
      await assertNodePtyAvailable()

      const bridge = createPtyWebSocketBridge()
      if (!server.httpServer) {
        bridge.dispose()
        throw new Error('[vite-plugin-pty] HTTP server indisponível para integrar o terminal')
      }

      detachUpgrade = bridge.attachToServer(server.httpServer)
      disposeBridge = () => {
        detachUpgrade?.()
        bridge.dispose()
      }

      server.httpServer.once('close', () => {
        disposeBridge?.()
        detachUpgrade = undefined
        disposeBridge = undefined
      })

      // Wiring Fatia 06: encaminha cwd ao PTY já aberto sem tocar TerminalPanel/xterm.
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/pty/cwd' && req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          req.on('end', () => {
            try {
              const input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { sessionId?: string; path?: string }
              if (!input.sessionId || !input.path) throw new Error('sessionId and path are required')
              let changed = 0
              for (let index = 0; index < 32; index += 1) {
                const terminalId = `${input.sessionId}:${index}`
                const session = bridge.ptyManager.getSession(terminalId)
                if (!session) continue
                const path = input.path
                const command = session.profile.id === 'powershell' || session.profile.id === 'pwsh'
                  ? `Set-Location -LiteralPath '${path.replace(/'/g, "''")}'\r`
                  : session.profile.id === 'cmd'
                    ? `cd /d "${path.replace(/"/g, '""')}"\r`
                    : `cd -- '${path.replace(/'/g, `'\\''`)}'\r`
                if (bridge.ptyManager.writeInput(terminalId, command)) changed += 1
              }
              res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true, changed }))
            } catch (error) {
              res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: false, message: error instanceof Error ? error.message : String(error) }))
            }
          })
          return
        }
        // BUG-02 FIX: endpoint dinâmico de portas para aba Portas
        if (req.url && req.url.startsWith('/api/ports')) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          const host = req.headers.host?.split(':')[0] || 'localhost'
          const protocol = 'http:'
          const ports = [
            { port: 5173, protocol: 'HTTP', name: 'Vite Frontend (Agente Window)', url: `${protocol}//${host}:5173`, status: 'active' },
            { port: 5174, protocol: 'HTTP', name: 'Vite Preview / HMR', url: `${protocol}//${host}:5174`, status: 'listening' },
            { port: 8080, protocol: 'HTTP', name: 'VS Code Server', url: `${protocol}//${host}:8080`, status: 'active' },
            { port: 3000, protocol: 'HTTP', name: 'Dev Server (3000)', url: `${protocol}//${host}:3000`, status: 'listening' },
          ]
          res.end(JSON.stringify(ports))
          return
        }
        next()
      })
    },
  }
}
