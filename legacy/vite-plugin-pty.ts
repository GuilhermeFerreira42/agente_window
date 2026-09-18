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

      // BUG-02 FIX: endpoint dinâmico de portas para aba Portas
      server.middlewares.use((req, res, next) => {
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
