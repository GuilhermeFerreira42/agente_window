import type { Plugin } from 'vite'
import { assertNodePtyAvailable, createPtyWebSocketBridge } from '../../pty-server/src/singlePort.js'

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
    },
  }
}
