import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { ptyPlugin } from './vite-plugin-pty'
import { fsPlugin } from './src/modules/explorer-search/server'
import { sessionPersistencePlugin } from './src/server/session-persistence'
import { isLoopbackBind, validateLocalRequest } from './server/local-boundary.mjs'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url))

function localBoundaryPlugin(): Plugin {
  return {
    name: 'agents-window-local-boundary',
    enforce: 'pre' as const,
    configResolved(config) {
      if (config.command === 'serve' && (!isLoopbackBind(config.server.host) || !isLoopbackBind(config.preview.host))) {
        throw new Error('[local-boundary] Servidor e preview do produto aceitam apenas bind loopback; não exponha o Vite à LAN.')
      }
    },
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((request, response, next) => {
        const decision = validateLocalRequest(request)
        if (!decision.ok) {
          response.statusCode = 403
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify({ code: 'local_only', message: 'Acesso local de mesma origem obrigatório.' }))
          return
        }
        next()
      })
      server.httpServer?.prependListener('upgrade', (request, socket) => {
        if (!validateLocalRequest(request, { requireOrigin: true }).ok) socket.destroy()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    localBoundaryPlugin(),
    react(),
    ptyPlugin(),
    sessionPersistencePlugin({ repoRoot }),
    // FATIA-04 (4.3): FileSystemPort no Single Port (Q7). Raiz = repo
    // (relativa ao próprio config — NUNCA hardcoded); FS_TEST_ROOT E2E ganha.
    fsPlugin({ root: repoRoot }),
  ],
  resolve: {
    alias: {
      '@contracts': path.resolve(__dirname, '../../packages/contracts'),
      '@contracts/common.js': path.resolve(__dirname, '../../packages/contracts/common.ts'),
      '@contracts/terminal.js': path.resolve(__dirname, '../../packages/contracts/terminal.ts'),
      '@contracts/persistence.js': path.resolve(__dirname, '../../packages/contracts/persistence.ts'),
      '@contracts/workbench.js': path.resolve(__dirname, '../../packages/contracts/workbench.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  preview: {
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
          xterm: ['@xterm/xterm'],
        },
      },
    },
  },
})
