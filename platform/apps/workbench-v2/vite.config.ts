import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ptyPlugin } from './vite-plugin-pty'
import { fsPlugin } from './src/modules/explorer-search/server'
import path from 'path'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [
    react(),
    ptyPlugin(),
    // FATIA-04 (4.3): FileSystemPort no Single Port (Q7). Raiz = repo
    // (relativa ao próprio config — NUNCA hardcoded); FS_TEST_ROOT E2E ganha.
    fsPlugin({ root: fileURLToPath(new URL('../../..', import.meta.url)) }),
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
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
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
