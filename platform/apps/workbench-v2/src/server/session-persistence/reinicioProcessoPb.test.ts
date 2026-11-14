import { randomUUID } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViteDevServer } from 'vite'
import type { ChatMessage, Session } from '../../types'
import { getDatabase, getSessionRecord, resetDatabase, deleteSessionRecord } from './database'
import { digestTranscriptFile, deleteTranscript } from './transcripts'
import { sessionPersistencePlugin } from './index'

/**
 * Evidência 4 (SPEC §8 P-T06 / §3 passo 6): um processo REAL é morto com
 * SIGKILL no meio da publicação (entre a intenção durável e o commit SQLite)
 * e a recuperação acontece em um processo NOVO. Nenhum hook do produto é
 * injetado — apenas sinalização OS sobre um child que fala o protocolo real.
 */
const requireLocal = createRequire(import.meta.url)
function resolverViteNode(): string {
  const candidatos = [
    (() => { try { return join(dirname(requireLocal.resolve('vite-node/package.json')), 'dist', 'cli.mjs') } catch { return '' } })(),
    join(process.cwd(), '../../node_modules/vite-node/dist/cli.mjs'),
    join(process.cwd(), 'node_modules/vite-node/dist/cli.mjs'),
  ]
  for (const caminho of candidatos) if (caminho && existsSync(caminho)) return caminho
  throw new Error('vite-node cli não encontrado')
}

interface HttpServerHandle { baseUrl: string; close: () => Promise<void> }
type Middleware = (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void
let persistenceMiddleware: Middleware | undefined
const plugin = sessionPersistencePlugin({ repoRoot: process.cwd() })
if (typeof plugin.configureServer !== 'function') throw new Error('plugin sem configureServer')
plugin.configureServer({ middlewares: { use: (middleware: Middleware) => { persistenceMiddleware = middleware } } } as unknown as ViteDevServer)

function listen(): Promise<HttpServerHandle> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (!persistenceMiddleware) { response.statusCode = 500; response.end(); return }
      persistenceMiddleware(request, response, () => { response.statusCode = 404; response.end() })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') { reject(new Error('porta')); return }
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise((done, fail) => server.close(e => e ? fail(e) : done())) })
    })
  })
}

function mensagem(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return { id, role, content, time: '10:00' }
}
function sessaoSintetica(id: string, slug: string, marker: string): Session {
  return {
    id, persistenceRevision: 1, slug, title: marker, workspace: marker, workspacePath: `/tmp/${slug}`,
    section: 'today', status: 'completed', updated: new Date(0).toISOString(), diffAdded: 0, diffRemoved: 0,
    branch: null, mainChatId: 'chat-main',
    chats: [{ id: 'chat-main', title: 'Main', status: 'completed', messages: [
      mensagem(`${marker}-1`, 'user', `${marker}:um`), mensagem(`${marker}-2`, 'assistant', `${marker}:dois`),
    ] }],
  }
}

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('P-B reinício de processo com SIGKILL real', () => {
  let server: HttpServerHandle
  const touched: Array<{ id: string; slug: string }> = []
  const arquivosTemp: string[] = []
  const filhos = new Set<number>()

  beforeEach(async () => {
    touched.length = 0
    resetDatabase()
    const profile = mkdtempSync(join(tmpdir(), 'pb-reinicio-'))
    mkdirSync(join(profile, 'data'), { recursive: true })
    vi.stubEnv('AGENTE_WINDOW_DATA_DIR', join(profile, 'data'))
    vi.stubEnv('AGENTE_WINDOW_TEST_HOME', profile)
    vi.stubEnv('AGENTE_WINDOW_PROVIDERS_PATH', join(profile, 'providers.json'))
    vi.stubEnv('AGENTE_WINDOW_SETTINGS_PATH', join(profile, 'settings.json'))
    vi.stubEnv('AGENTE_WINDOW_PERSONALIZACOES_PATH', join(profile, 'personalizacoes.json'))
    server = await listen()
  })

  afterEach(async () => {
    for (const pid of filhos) {
      try { process.kill(pid, 'SIGKILL') } catch { /* já morto */ }
    }
    filhos.clear()
    await server.close()
    try { getDatabase().prepare('DELETE FROM session_write_intents').run() } catch { /* ausente */ }
    for (const { id, slug } of touched) { await deleteTranscript(slug, id); try { deleteSessionRecord(id) } catch { /* indisponível */ } }
    resetDatabase()
    for (const arquivo of arquivosTemp) { try { rmSync(arquivo, { force: true }) } catch { /* já removido */ } }
    arquivosTemp.length = 0
    vi.unstubAllGlobals(); vi.unstubAllEnvs()
  })

  it('P-B E4: SIGKILL entre intenção e commit + reconciliação em processo novo = estado consistente', async () => {
    const id = randomUUID(), slug = `pb-kill-${id.slice(0, 8)}`
    touched.push({ id, slug })
    const base = sessaoSintetica(id, slug, 'kill')
    const criada = await fetch(`${server.baseUrl}/api/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: base, creationId: randomUUID() }) })
    expect([200, 201]).toContain(criada.status)
    const progresso = join(tmpdir(), `pb-progresso-${id}.json`)
    const relatorio = join(tmpdir(), `pb-relatorio-${id}.json`)
    const diag = join(tmpdir(), `pb-diag-${id}.txt`)
    arquivosTemp.push(progresso, relatorio, diag)
    const marcar = (texto: string) => appendFileSync(diag, `${new Date().toISOString()} ${texto}\n`)
    marcar('teste-iniciado')

    const cli = resolverViteNode()
    const scriptSalvar = join(process.cwd(), 'src/server/session-persistence/__scripts__/pb-salvar-filho.ts')
    const scriptReconciliar = join(process.cwd(), 'src/server/session-persistence/__scripts__/pb-reconciliar-filho.ts')
    const aguardar = async (predicado: () => boolean, timeoutMs: number) => {
      const limite = Date.now() + timeoutMs
      while (!predicado()) {
        if (Date.now() > limite) return false
        await esperar(10)
      }
      return true
    }

    // H4: duas fronteiras EXPLÍCEITAS (pré/pós-rename) congeladas por
    // sincronização — o filho assina um arquivo de fronteira e trava no gate de
    // rename. Sem SIGSTOP, sem janela de milissegundos e sem tentativas até
    // passar: cada ciclo falha de forma honesta se a fronteira não acontecer.
    type Relatorio = { resultado: string; intentsRestantes: number; titulo: string | null; revision: number | null; ack: { mutationId: string; revision: number } | undefined; destDigest: string | null }
    let relatorioFinal: Relatorio | undefined
    for (const fronteira of ['pre-rename', 'pos-rename'] as const) {
      const progresso = join(tmpdir(), `pb-progresso-${id}-${fronteira}.json`)
      const boundary = join(tmpdir(), `pb-fronteira-${id}-${fronteira}.json`)
      const relatorio = join(tmpdir(), `pb-relatorio-${id}-${fronteira}.json`)
      const diag = join(tmpdir(), `pb-diag-${id}-${fronteira}.txt`)
      arquivosTemp.push(progresso, boundary, relatorio, diag)
      const filho = spawn(process.execPath, [cli, scriptSalvar], {
        cwd: process.cwd(),
        env: { ...process.env, PB_SESSION_ID: id, PB_PROGRESSO: progresso, PB_RONDAS: '24', PB_DIAG: diag,
          PB_FRONTEIRA: fronteira, PB_BOUNDARY: boundary, PB_MARCADOR: fronteira },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      filhos.add(filho.pid!)
      let stderr = ''
      filho.stderr.on('data', chunk => { stderr += String(chunk) })
      filho.stdout.on('data', chunk => { console.log('[E4 filho]', String(chunk).trim()) })
      const saidaFilho = new Promise<{ code: number | null; signal: string | null }>(resolve =>
        filho.on('exit', (code, signal) => resolve({ code, signal })))
      let matou = false
      try {
        // 1) sincronização EXPLÍCITA da fronteira — sem polling de janela e sem retry.
        const assinada = await aguardar(() => existsSync(boundary), 60_000)
        const diagProgresso = existsSync(progresso) ? readFileSync(progresso, 'utf8') : 'sem progresso'
        expect(assinada, `fronteira ${fronteira} não assinada em 60s; progresso=${diagProgresso}; stderr=${stderr.slice(0, 600)}`).toBe(true)

        const linha = () => getDatabase().prepare(`SELECT staged_path, old_digest, new_digest, target_path, next_revision, mutation_id, record_json FROM session_write_intents WHERE session_id=?`).get(id) as
          { staged_path: string; old_digest: string | null; new_digest: string; target_path: string; next_revision: number; mutation_id: string; record_json: string } | undefined
        const conferirFronteira = async (momento: string) => {
          const atual = linha()
          expect(atual, `intenção ausente em ${momento} (${fronteira})`).toBeDefined()
          const destino = await digestTranscriptFile(atual!.target_path)
          const stage = await digestTranscriptFile(atual!.staged_path)
          if (fronteira === 'pre-rename') {
            expect(stage, `stage íntegro antes do rename (${momento})`).toBe(atual!.new_digest)
            expect(destino, `destino na base antes do rename (${momento})`).toBe(atual!.old_digest)
          } else {
            expect(destino, `destino na nova após o rename (${momento})`).toBe(atual!.new_digest)
            expect(stage, `stage ausente após o rename (${momento})`).toBeNull()
          }
          return atual!
        }
        // 2) o estado durável corresponde à fronteira declarada, ANTES do kill.
        const antes = await conferirFronteira('pré-kill')

        // 3) encerramento garantido: SIGKILL (compatível Windows) do processo próprio.
        process.kill(filho.pid!, 'SIGKILL')
        matou = true
        const morte = await saidaFilho
        expect(morte.signal, `filho ${fronteira} não morreu com SIGKILL: ${JSON.stringify(morte)}`).toBe('SIGKILL')
        filhos.delete(filho.pid!)

        // 4) o estado congelado sobrevive à morte (reconferência pós-kill).
        const depois = await conferirFronteira('pós-kill')
        expect(depois).toEqual(antes)

        // 5) processo NOVO reconcilia o journal (protocolo real, sem retries).
        const reconciliador = spawn(process.execPath, [cli, scriptReconciliar], {
          cwd: process.cwd(),
          env: { ...process.env, PB_SESSION_ID: id, PB_RELATORIO: relatorio, PB_DESTINO: antes.target_path, PB_STAGE: antes.staged_path, PB_DIAG: diag },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        filhos.add(reconciliador.pid!)
        let stderrRec = ''
        reconciliador.stderr.on('data', chunk => { stderrRec += String(chunk) })
        const codigoRec = await new Promise<number | null>(resolve => reconciliador.on('exit', code => resolve(code)))
        filhos.delete(reconciliador.pid!)
        expect(codigoRec, `reconciliador saiu com erro: ${stderrRec}`).toBe(0)
        const bruto = readFileSync(relatorio, 'utf8')
        expect(bruto, `relatório vazio do reconciliador; stderr=${stderrRec.slice(0, 400)}`).not.toBe('')
        const report = JSON.parse(bruto) as Relatorio
        expect(report.resultado, bruto).toBe('finalizado')
        expect(report.intentsRestantes).toBe(0)
        expect(report.revision).toBe(antes.next_revision)
        expect(report.titulo).toBe(`filho-${fronteira}`)
        expect(report.ack).toMatchObject({ mutationId: antes.mutation_id, revision: antes.next_revision })
        expect(report.destDigest).toBe(antes.new_digest)
        relatorioFinal = report

        // 6) o serviço serve a conversa recuperada após o reinício do processo.
        const servida = await fetch(`${server.baseUrl}/api/sessions/${id}`)
        expect(servida.status).toBe(200)
        const corpoCiclo = await servida.json() as { session: Session }
        expect(corpoCiclo.session.persistenceRevision).toBe(antes.next_revision)
        expect(corpoCiclo.session.title).toBe(`filho-${fronteira}`)
      } finally {
        filhos.delete(filho.pid!)
        if (!matou && filho.exitCode === null && filho.signalCode === null) {
          try { process.kill(filho.pid!, 'SIGKILL') } catch { /* já saiu */ }
          await saidaFilho
        }
      }
    }
    expect(relatorioFinal).toBeDefined()

    // A sessão segue servível e consistente para o cliente (reinício completo).
    const servida = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(servida.status).toBe(200)
    const corpo = await servida.json() as { session: Session }
    expect(corpo.session.persistenceRevision).toBe(relatorioFinal!.revision)
    expect(corpo.session.title).toBe(relatorioFinal!.titulo)
    // E uma nova gravação funciona normalmente após a recuperação.
    const nova = { ...corpo.session, title: 'apos-recuperacao',
      chats: corpo.session.chats.map((chat, index) => index === 0 ? { ...chat, messages: [...chat.messages, mensagem('pós-kill', 'user', 'pos:kill')] } : chat) }
    const put = await fetch(`${server.baseUrl}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: nova, expectedRevision: corpo.session.persistenceRevision, mutationId: randomUUID() }) })
    expect(put.status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('apos-recuperacao')
  }, 120_000)
})
