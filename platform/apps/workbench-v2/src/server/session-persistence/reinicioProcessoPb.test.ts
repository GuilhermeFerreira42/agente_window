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

    const rodaFilho = () => spawn(process.execPath, [cli, scriptSalvar], {
      cwd: process.cwd(),
      env: { ...process.env, PB_SESSION_ID: id, PB_PROGRESSO: progresso, PB_RONDAS: '24', PB_DIAG: diag },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let capturado: { stagedPath: string; oldDigest: string | null; newDigest: string; targetPath: string; nextRevision: number; mutationId: string; tituloEsperado: string; classe: string } | undefined
    let stderrAcumulado = ''

    for (let tentativa = 0; tentativa < 3 && !capturado; tentativa += 1) {
      try { rmSync(progresso, { force: true }) } catch { /* inexistente */ }
      const filho = rodaFilho()
      let stderr = ''
      filho.stderr.on('data', chunk => { stderr += String(chunk); stderrAcumulado += String(chunk) })
      filho.stdout.on('data', chunk => { console.log('[E4 filho]', String(chunk).trim()); stderrAcumulado += String(chunk) })
      const saida = new Promise<number | null>(resolve => filho.on('exit', code => resolve(code)))

      // Polling curto da intenção durável — janela de milissegundos.
      let iteracoes = 0
      for (;;) {
        iteracoes += 1
        if (iteracoes % 500 === 0) marcar(`poll tentativa=${tentativa} iter=${iteracoes} progresso=${existsSync(progresso) ? readFileSync(progresso, 'utf8') : '-'}`)
        const linha = getDatabase().prepare('SELECT staged_path, old_digest, new_digest, target_path, next_revision, mutation_id, record_json FROM session_write_intents WHERE session_id=?').get(id) as
          { staged_path: string; old_digest: string | null; new_digest: string; target_path: string; next_revision: number; mutation_id: string; record_json: string } | undefined
        if (linha) {
          marcar(`intencao-capturada classe-prefetch dest=${(await digestTranscriptFile(linha.target_path))?.slice(0, 8)}`)
          process.kill(filho.pid!, 'SIGSTOP')
          // Estado congelado: classifica a fronteira em que o processo morreu.
          const destino = await digestTranscriptFile(linha.target_path)
          const stage = await digestTranscriptFile(linha.staged_path)
          let classe: string
          if (destino === linha.new_digest) classe = 'pos-rename'
          else if (destino === linha.old_digest && stage === linha.new_digest) classe = 'pre-rename'
          else if (destino === linha.old_digest && stage === null) classe = 'stage-perdido'
          else classe = `inesperado:${destino?.slice(0, 8)}/${stage?.slice(0, 8)}`
          process.kill(filho.pid!, 'SIGKILL')
          await saida
          capturado = {
            stagedPath: linha.staged_path, oldDigest: linha.old_digest, newDigest: linha.new_digest,
            targetPath: linha.target_path, nextRevision: linha.next_revision, mutationId: linha.mutation_id,
            tituloEsperado: (JSON.parse(linha.record_json) as { title: string }).title, classe,
          }
          break
        }
        let progressoAtual: Record<string, unknown> | null = null
        if (existsSync(progresso)) {
          try { progressoAtual = JSON.parse(readFileSync(progresso, 'utf8')) as Record<string, unknown> } catch { progressoAtual = null /* escrita em andamento */ }
        }
        if (progressoAtual && (progressoAtual.concluido || progressoAtual.erro || progressoAtual.paradoEm)) break // janela perdida nesta tentativa
        if (await Promise.race([saida.then(() => 'saiu'), esperar(1).then(() => 'rodando')]) === 'saiu') break
        await esperar(1)
      }
      if (!capturado) {
        filho.kill('SIGKILL')
        await saida
        const prog = existsSync(progresso) ? readFileSync(progresso, 'utf8') : 'sem progresso'
        console.log(`[E4] tentativa ${tentativa} sem captura; progresso=${prog}; stderr=${stderr.slice(0, 300)}`)
      }
    }
    const diagnostico = existsSync(progresso) ? readFileSync(progresso, 'utf8') : 'sem progresso'
    expect(capturado, `nenhuma janela capturada; progresso=${diagnostico}; stderr=${stderrAcumulado.slice(0, 800)}`).toBeDefined()
    const alvo = capturado!

    // Processo NOVO reconcilia (o que publicou está morto).
    marcar(`spawn-reconciliador classe=${alvo.classe}`)
    const reconciliador = spawn(process.execPath, [cli, scriptReconciliar], {
      cwd: process.cwd(),
      env: { ...process.env, PB_SESSION_ID: id, PB_RELATORIO: relatorio, PB_DESTINO: alvo.targetPath, PB_STAGE: alvo.stagedPath, PB_DIAG: diag },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderrRec = ''
    reconciliador.stderr.on('data', chunk => { stderrRec += String(chunk) })
    const codigoRec = await new Promise<number | null>(resolve => reconciliador.on('exit', code => resolve(code)))
    marcar(`reconciliador-saiu codigo=${codigoRec}`)
    expect(codigoRec, `reconciliador saiu com erro: ${stderrRec}`).toBe(0)
    const bruto = readFileSync(relatorio, 'utf8')
    expect(bruto, `relatório vazio do reconciliador; stderr=${stderrRec.slice(0, 400)}`).not.toBe('')
    const report = JSON.parse(bruto) as {
      resultado: string; intentsRestantes: number; titulo: string | null; revision: number | null
      ack: { mutationId: string; revision: number; digest: string } | undefined
      destDigest: string | null
    }

    if (alvo.classe === 'pos-rename' || alvo.classe === 'pre-rename') {
      expect(report.resultado).toBe('finalizado')
      expect(report.intentsRestantes).toBe(0)
      expect(report.revision).toBe(alvo.nextRevision)
      expect(report.titulo).toBe(alvo.tituloEsperado)
      expect(report.ack).toMatchObject({ mutationId: alvo.mutationId, revision: alvo.nextRevision })
      expect(report.destDigest).toBe(alvo.newDigest)
    } else if (alvo.classe === 'stage-perdido') {
      expect(report.resultado).toBe('limpo')
      expect(report.intentsRestantes).toBe(0)
      expect(report.revision).toBe(1)
      expect(report.titulo).toBe('kill')
    } else {
      throw new Error(`classificação inesperada: ${alvo.classe}`)
    }

    // A sessão segue servível e consistente para o cliente (reinício completo).
    const servida = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(servida.status).toBe(200)
    const corpo = await servida.json() as { session: Session }
    expect(corpo.session.persistenceRevision).toBe(report.revision)
    expect(corpo.session.title).toBe(report.titulo)
    // E uma nova gravação funciona normalmente após a recuperação.
    const nova = { ...corpo.session, title: 'apos-recuperacao',
      chats: corpo.session.chats.map((chat, index) => index === 0 ? { ...chat, messages: [...chat.messages, mensagem('pós-kill', 'user', 'pos:kill')] } : chat) }
    const put = await fetch(`${server.baseUrl}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: nova, expectedRevision: corpo.session.persistenceRevision, mutationId: randomUUID() }) })
    expect(put.status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('apos-recuperacao')
  }, 120_000)
})
