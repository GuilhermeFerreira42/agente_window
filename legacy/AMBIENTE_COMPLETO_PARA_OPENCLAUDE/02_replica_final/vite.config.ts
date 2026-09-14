import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ptyPlugin } from './vite-plugin-pty'
import path from 'path'

export default defineConfig({
  plugins: [react(), ptyPlugin()],
  resolve: {
    alias: {
      '@contracts': path.resolve(__dirname, '../../../platform/packages/contracts'),
      '@contracts/common.js': path.resolve(__dirname, '../../../platform/packages/contracts/common.ts'),
      '@contracts/terminal.js': path.resolve(__dirname, '../../../platform/packages/contracts/terminal.ts'),
      '@contracts/persistence.js': path.resolve(__dirname, '../../../platform/packages/contracts/persistence.ts'),
      '@contracts/workbench.js': path.resolve(__dirname, '../../../platform/packages/contracts/workbench.ts'),
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
