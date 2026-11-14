// Seam de IO do protocolo de publicação (SPEC §3): em produção são as
// funções nativas de node:fs/promises, sem camada extra. Os testes podem
// mockar ESTE módulo para injetar falhas nas fronteiras — nunca o builtin,
// cuja substituição quebra o carregamento do better-sqlite3 no vitest.
export { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
