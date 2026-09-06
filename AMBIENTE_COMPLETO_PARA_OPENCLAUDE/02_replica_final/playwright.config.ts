import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  // Sobe e derruba o Vite sozinho: elimina a classe de falso-negativo
  // "ERR_CONNECTION_REFUSED" quando alguém esquece o dev server de pé.
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'node ../../pty-server/dist/index.js',
      url: 'http://127.0.0.1:7681/pty-port',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1400, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
