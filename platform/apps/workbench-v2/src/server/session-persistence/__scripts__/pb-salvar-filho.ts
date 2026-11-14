/**
 * P-B Evidência 4 — child de teste: publica N atualizações REAIS de uma
 * sessão através do servidor HTTP do produto (protocolo completo, sem hooks).
 * O parent intercepta a janela intenção→commit com SIGSTOP/SIGKILL e
 * reconcilia em um processo novo. Dados 100% sintéticos.
 */
import { randomUUID } from 'node:crypto'
import { appendFileSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { Session } from '../../../types'
import { sessionPersistencePlugin } from '../index'
import type { ViteDevServer } from 'vite'

const sessionId = process.env.PB_SESSION_ID ?? ''
const progresso = process.env.PB_PROGRESSO ?? ''
if (!sessionId || !progresso) { console.error('PB_SESSION_ID/PB_PROGRESSO ausentes'); process.exit(2) }

const RONDAS = Number(process.env.PB_RONDAS ?? 20)
const diag = process.env.PB_DIAG ?? ''
const marcar = (fase: string) => { if (diag) appendFileSync(diag, `${new Date().toISOString()} ${fase}\n`) }

let persistenceMiddleware: ((request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void) | undefined
const plugin = sessionPersistencePlugin({ repoRoot: process.cwd() })
if (typeof plugin.configureServer !== 'function') { console.error('plugin sem configureServer'); process.exit(2) }
plugin.configureServer({ middlewares: { use: (middleware: typeof persistenceMiddleware) => { persistenceMiddleware = middleware } } } as unknown as ViteDevServer)

async function main(): Promise<void> {
  const server = createServer((request, response) => {
    if (!persistenceMiddleware) { response.statusCode = 500; response.end(); return }
    persistenceMiddleware(request, response, () => { response.statusCode = 404; response.end() })
  })
  marcar('antes-listen')
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  marcar('ouvindo')
  const address = server.address()
  if (!address || typeof address === 'string') { console.error('porta inválida'); process.exit(2) }
  const base = `http://127.0.0.1:${address.port}`
  console.log('[filho] ouvindo', base)

  let falhas = 0
  for (let rodada = 0; rodada < RONDAS; rodada += 1) {
    marcar(`r${rodada}-get-in`)
    const atual = await fetch(`${base}/api/sessions/${sessionId}`, { signal: AbortSignal.timeout(6_000) })
    marcar(`r${rodada}-get-${atual.status}`)
    if (rodada === 0) console.log('[filho] get1', atual.status)
    if (atual.status === 503) {
      // Estado pendente real (interceptação de outro processo) — para com diagnóstico.
      writeFileSync(progresso, JSON.stringify({ rodada, paradoEm: 'pendente' }))
      server.close()
      process.exit(3)
    }
    if (!atual.ok) { falhas += 1; if (falhas >= 3) { writeFileSync(progresso, JSON.stringify({ rodada, erro: atual.status })); server.close(); process.exit(4) } continue }
    const corpo = await atual.json() as { session: Session }
    const sessao = corpo.session
    const editada: Session = { ...sessao, title: `filho-${rodada}`,
      chats: sessao.chats.map((chat, index) => index === 0
        ? { ...chat, messages: [...chat.messages, { id: `filho-${rodada}`, role: 'user' as const, content: `filho:${rodada}`, time: '10:00' }] }
        : chat) }
    writeFileSync(progresso, JSON.stringify({ rodada, fase: 'put', revision: sessao.persistenceRevision }))
    marcar(`r${rodada}-put-in`)
    const put = await fetch(`${base}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: editada, expectedRevision: sessao.persistenceRevision, mutationId: randomUUID() }),
      signal: AbortSignal.timeout(6_000) })
    marcar(`r${rodada}-put-${put.status}`)
    console.log(`[filho] r${rodada} put`, put.status)
    if (!put.ok) { falhas += 1; if (falhas >= 3) { writeFileSync(progresso, JSON.stringify({ rodada, erro: put.status, corpo: await put.text().catch(() => '') })); server.close(); process.exit(5) } continue }
    falhas = 0
    writeFileSync(progresso, JSON.stringify({ rodada, revision: (await put.json() as { revision: number }).revision }))
  }
  writeFileSync(progresso, JSON.stringify({ rodada: RONDAS, concluido: true }))
  server.close()
  process.exit(0)
}

main().catch(error => { console.error(error); process.exit(6) })
