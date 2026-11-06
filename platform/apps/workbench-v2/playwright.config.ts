import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  // FATIA 15 Onda 3 (D167): os specs rodam contra o MESMO servidor do app e, até
  // aqui, gravavam no banco REAL do usuário. Medido: `diff_sem_travar.spec.ts`
  // transformou 2 sessões em 3, a nova apontando para `/tmp/diff-travar-ws` —
  // pasta que o próprio spec apaga. O app do usuário acordava com árvore vazia e
  // `400 invalid_workspace`. Aqui o padrão passa a ser uma pasta descartável, que
  // o script de execução cria e apaga; um servidor que já esteja no ar continua
  // valendo (o env tem de ser o mesmo dos dois lados).
  // ⚠️ Para valer de verdade, o SERVIDOR também precisa subir com a variável: ver
  // `platform/scripts/e2e-isolado.sh`, que é o caminho recomendado para rodar E2E.
  ...(process.env.AGENTE_WINDOW_DATA_DIR
    ? { metadata: { pastaDeDados: process.env.AGENTE_WINDOW_DATA_DIR } }
    : {}),
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    viewport: { width: 1400, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  },
})
