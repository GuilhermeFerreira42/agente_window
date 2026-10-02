import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // 5.6 — internos ESM (Outline lê o DocumentSymbolProvider via StandaloneServices) → stub vazio.
      { find: /^monaco-editor\/esm\/vs\/.*$/, replacement: fileURLToPath(new URL('./src/__tests__/stubs/monaco-internals.ts', import.meta.url)) },
      // monaco-editor só tem entry ESM de browser; em jsdom usamos um stub
      // (FATIA-04 4.7 — o Monaco real é coberto pelos E2E).
      { find: /^monaco-editor$/, replacement: fileURLToPath(new URL('./src/__tests__/stubs/monaco-editor.ts', import.meta.url)) },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.config.{js,cjs,mjs,ts}',
        'src/__tests__/**',
        'src/main.tsx',
        'src/data.ts',
        'src/types.ts',
        'src/vite-env.d.ts',
        '**/*.d.ts',
      ],
    },
  },
})
