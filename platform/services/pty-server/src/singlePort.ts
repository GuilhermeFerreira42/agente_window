import type http from 'node:http'
import type net from 'node:net'
import { WebSocketServer } from 'ws'
import { PtyManager } from './ptyManager.js'
import { setupWebSocketHandler } from './wsHandler.js'

type UpgradeListener = (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => void

type UpgradeCapableServer = {
  on(event: 'upgrade', listener: UpgradeListener): unknown
  off(event: 'upgrade', listener: UpgradeListener): unknown
}

export const PTY_WS_PATH = '/pty'

const NODE_PTY_ERROR_MESSAGE =
  '[pty-server] ERRO FATAL: node-pty não pôde ser carregado.\n' +
  'O módulo nativo não foi compilado corretamente.\n\n' +
  'Windows: instale Visual Studio Build Tools 2019+ e node-gyp:\n' +
  '  npm install -g windows-build-tools\n\n' +
  'Linux/macOS: instale build-essential (apt) ou Xcode CLI Tools.\n' +
  '  sudo apt-get install build-essential python3\n\n' +
  'Depois reinstale: cd platform/services/pty-server && npm install\n'

export async function assertNodePtyAvailable(): Promise<void> {
  try {
    const pty = await import('node-pty')
    if (typeof pty.spawn !== 'function') {
      throw new Error('node-pty spawn function not found')
    }
  } catch (error) {
    throw new Error(NODE_PTY_ERROR_MESSAGE, {
      cause: error instanceof Error ? error : undefined,
    })
  }
}

function matchesPtyPath(requestUrl: string | undefined, path: string): boolean {
  const pathname = new URL(requestUrl || '/', 'http://127.0.0.1').pathname
  return pathname === path
}

export function createPtyWebSocketBridge(options?: {
  path?: string
  ptyManager?: PtyManager
}) {
  const path = options?.path || PTY_WS_PATH
  const ptyManager = options?.ptyManager || new PtyManager()
  const wss = new WebSocketServer({ noServer: true })

  setupWebSocketHandler(wss, ptyManager)

  const handleUpgrade = (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
    if (!matchesPtyPath(req.url, path)) {
      return false
    }

    wss.handleUpgrade(req, socket, head, (ws, upgradedRequest) => {
      wss.emit('connection', ws, upgradedRequest)
    })

    return true
  }

  const attachToServer = (server: UpgradeCapableServer) => {
    const onUpgrade: UpgradeListener = (req, socket, head) => {
      handleUpgrade(req, socket, head)
    }

    server.on('upgrade', onUpgrade)

    return () => {
      server.off('upgrade', onUpgrade)
    }
  }

  const dispose = () => {
    ptyManager.closeAllSessions()
    wss.close()
  }

  return {
    path,
    ptyManager,
    wss,
    handleUpgrade,
    attachToServer,
    dispose,
  }
}
