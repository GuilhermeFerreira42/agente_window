import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViteDevServer } from 'vite'
import type { ChatMessage, Session } from '../../types'
import { projetarSessaoPersistida } from '../../domain/projecaoTranscript'
import { loadPersistedSessions, persistSession } from '../../services/sessions/sessionsClient'
import { digestChat, prepararOrigens } from './origensChats'
import { getDatabase, getSessionRecord, resetDatabase, deleteSessionRecord, type SessionRecord } from './database'
import { getDatabasePath, resolveProjectDir } from './paths'
import { deleteTranscript, readTranscript, transcriptPath } from './transcripts'
import { registerWriteIntent } from './writeIntents'
import { sessionPersistencePlugin, transcriptEntries } from './index'
import type * as IoModule from './io'

// File-level fault injection ONLY — the P-B protocol itself always runs for
// real (no flag, env or branch disables publication/reconciliation in tests).
// Faults target the protocol's internal IO seam (./io); the builtin
// node:fs/promises stays untouched because mocking it breaks better-sqlite3.
const fsFault = vi.hoisted(() => ({
  failStageWrite: false,
  failStageRename: false,
  mutateDestAfterStage: false,
}))
vi.mock('./io', async (importOriginal) => {
  const actual = await importOriginal<typeof IoModule>()
  const stagePattern = /\.\d+\.[0-9a-f-]{36}\.tmp$/
  return {
    io: {
      ...actual.io,
      writeFile: async (path: Parameters<typeof actual.io.writeFile>[0], data: Parameters<typeof actual.io.writeFile>[1], options?: Parameters<typeof actual.io.writeFile>[2]) => {
      if (fsFault.failStageWrite && typeof path === 'string' && stagePattern.test(path)) {
        fsFault.failStageWrite = false
        throw Object.assign(new Error('injected stage failure'), { code: 'EIO' })
      }
      const result = await actual.io.writeFile(path, data, options)
      if (fsFault.mutateDestAfterStage && typeof path === 'string' && stagePattern.test(path)) {
        fsFault.mutateDestAfterStage = false
        await actual.io.writeFile(String(path).replace(stagePattern, ''), 'EXTERNAL CHANGE\n', 'utf8')
      }
      return result
    },
      rename: async (source: Parameters<typeof actual.io.rename>[0], destination: Parameters<typeof actual.io.rename>[1]) => {
        if (fsFault.failStageRename && typeof source === 'string' && stagePattern.test(source)) {
          fsFault.failStageRename = false
          throw Object.assign(new Error('injected rename failure'), { code: 'EIO' })
        }
        return actual.io.rename(source, destination)
      },
    },
  }
})

interface HttpServerHandle { baseUrl: string; close: () => Promise<void> }
type Middleware = (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void
let persistenceMiddleware: Middleware | undefined
const plugin = sessionPersistencePlugin({ repoRoot: process.cwd() })
if (typeof plugin.configureServer !== 'function') throw new Error('session persistence plugin has no configureServer hook')
plugin.configureServer({ middlewares: { use: (middleware: Middleware) => { persistenceMiddleware = middleware } } } as unknown as ViteDevServer)

function listen(): Promise<HttpServerHandle> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (!persistenceMiddleware) { response.statusCode = 500; response.end('middleware unavailable'); return }
      persistenceMiddleware(request, response, () => { response.statusCode = 404; response.end('not found') })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') { reject(new Error('port')); return }
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise((done, fail) => server.close(e => e ? fail(e) : done())) })
    })
  })
}

function message(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return { id, role, content, time: '10:00' }
}

function makeSession(id: string, slug: string, marker: string, persistenceRevision = 1): Session {
  return {
    id, persistenceRevision, slug, title: marker, workspace: marker, workspacePath: `/tmp/${slug}`,
    section: 'today', status: 'completed', updated: new Date(0).toISOString(), diffAdded: 0, diffRemoved: 0,
    branch: null, mainChatId: 'chat-main',
    chats: [{ id: 'chat-main', title: 'Main', status: 'completed', messages: [
      message(`${marker}-1`, 'user', `${marker}:one`), message(`${marker}-2`, 'assistant', `${marker}:two`),
    ] }],
  }
}

const revisionCache = new Map<string, number>()
interface ListagemResposta { sessions: Session[]; unavailable: Array<{ sessionId: string; code: string }>; state: 'ok' | 'partial' }

/** Edits a session with a NEW MESSAGE: title-only edits would not change the
 * JSONL bytes and would make oldDigest === newDigest (degenerate fixtures). */
function comNovaMensagem(session: Session, marker: string): Session {
  return { ...session, title: `${marker} editado`, chats: session.chats.map((chat, index) => index === 0
    ? { ...chat, messages: [...chat.messages, message(`${marker}-nova`, 'user', `${marker}:conteudo-novo`)] }
    : chat) }
}
async function putSession(server: HttpServerHandle, session: Session): Promise<Response> {
  const isUpdate = revisionCache.has(session.id)
  const body = { session, ...(isUpdate ? { expectedRevision: revisionCache.get(session.id)!, mutationId: randomUUID() } : { creationId: randomUUID() }) }
  const response = await fetch(`${server.baseUrl}/api/sessions`, { method: isUpdate ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const text = await response.text()
  if (response.ok) {
    const data = JSON.parse(text)
    if (data.persistenceRevision !== undefined) revisionCache.set(session.id, data.persistenceRevision)
  }
  return new Response(text, { status: response.status, headers: response.headers })
}
async function mutation(server: HttpServerHandle, session: Session, expectedRevision: number, mutationId = randomUUID()): Promise<Response> {
  return fetch(`${server.baseUrl}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session, expectedRevision, mutationId }) })
}
async function listagem(server: HttpServerHandle): Promise<ListagemResposta> {
  const response = await fetch(`${server.baseUrl}/api/sessions`)
  expect(response.status).toBe(200)
  return response.json() as Promise<ListagemResposta>
}

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
/** Raw catalog read — getSessionRecord() blocks on pending intents by design. */
const tituloNoCatalogo = (sessionId: string) =>
  (getDatabase().prepare('SELECT title FROM sessions WHERE id=?').get(sessionId) as { title: string } | undefined)?.title

/**
 * Reconstructs, from the real primitives, the exact on-disk+SQLite state a
 * process kill leaves at each boundary of the P-B protocol (SPEC §3 step 6).
 */
async function montarEstadoDeCrash(raw: Session, fase: 'pre-rename' | 'post-rename', opcoes?: { manterStage?: boolean; corromperStage?: boolean }) {
  const payload = projetarSessaoPersistida(raw)
  const existing = getSessionRecord(payload.id)!
  const anterior = JSON.parse(existing.sessionJson) as Session
  const base = anterior.persistenceRevision ?? 0
  const revision = base + 1
  const anteriores = await readTranscript(existing.slug, payload.id)
  const entries = transcriptEntries(payload, anteriores)
  const eventos = anteriores.filter(entry => entry.type === 'agir_event')
  const bytes = Buffer.from(`${[...entries, ...eventos].map(entry => JSON.stringify(entry)).join('\n')}\n`, 'utf8')
  const destPath = transcriptPath(existing.slug, payload.id)
  const previousBytes = await readFile(destPath)
  const stagedPath = `${destPath}.${process.pid}.${randomUUID()}.tmp`
  const rollbackPath = `${stagedPath}.rollback`
  if (fase === 'pre-rename') {
    await writeFile(stagedPath, opcoes?.corromperStage ? Buffer.from('{"quebrado":', 'utf8') : bytes, { flag: 'wx' })
  } else {
    await writeFile(destPath, bytes)
    await writeFile(rollbackPath, previousBytes, { flag: 'wx' })
    if (opcoes?.manterStage) await writeFile(stagedPath, bytes, { flag: 'wx' })
  }
  const planos = prepararOrigens(payload, anterior, anteriores, null)
  for (const plano of planos) plano.digest = digestChat(entries, plano.chatId)
  const metadata = { ...payload, persistenceRevision: revision, worktreePath: payload.worktreePath ?? null,
    chats: payload.chats.map(chat => ({ ...chat, messages: [] })) }
  const record: SessionRecord = {
    id: payload.id, slug: existing.slug, title: payload.title, workspacePath: payload.workspacePath,
    worktreePath: payload.worktreePath ?? null, messageCount: entries.length,
    createdAt: existing.createdAt, updatedAt: Date.now(), sessionJson: JSON.stringify(metadata),
  }
  const requestDigest = sha(JSON.stringify({ session: { ...payload, persistenceRevision: undefined }, baseRevision: base }))
  const mutationId = randomUUID()
  registerWriteIntent({
    sessionId: payload.id, mutationId, criacao: false, baseRevision: base, nextRevision: revision,
    targetPath: destPath, stagedPath, oldDigest: sha(previousBytes), newDigest: sha(bytes),
    record, planos, checkpointCleanup: null,
    receipt: { sessionId: payload.id, mutationId, revision, digest: requestDigest, creationId: null, creationDigest: null, creationRevision: null },
  })
  return { mutationId, revision, requestDigest, payload, destPath, stagedPath, rollbackPath, bytes, previousBytes }
}

describe('P-B publicação JSONL + catálogo recuperável', () => {
  let server: HttpServerHandle
  const touched: Array<{ id: string; slug: string }> = []

  beforeEach(async () => {
    touched.length = 0; revisionCache.clear()
    fsFault.failStageWrite = false; fsFault.failStageRename = false; fsFault.mutateDestAfterStage = false
    resetDatabase()
    const profile = mkdtempSync(join(tmpdir(), 'pb-publicacao-'))
    vi.stubEnv('AGENTE_WINDOW_DATA_DIR', join(profile, 'data'))
    vi.stubEnv('AGENTE_WINDOW_TEST_HOME', profile)
    vi.stubEnv('AGENTE_WINDOW_PROVIDERS_PATH', join(profile, 'providers.json'))
    vi.stubEnv('AGENTE_WINDOW_SETTINGS_PATH', join(profile, 'settings.json'))
    vi.stubEnv('AGENTE_WINDOW_PERSONALIZACOES_PATH', join(profile, 'personalizacoes.json'))
    server = await listen()
  })

  afterEach(async () => {
    fsFault.failStageWrite = false; fsFault.failStageRename = false; fsFault.mutateDestAfterStage = false
    await server.close()
    try { getDatabase().prepare('DELETE FROM session_write_intents').run() } catch { /* tabela ausente */ }
    for (const { id, slug } of touched) { await deleteTranscript(slug, id); try { deleteSessionRecord(id) } catch { /* indisponível por diagnóstico */ } }
    resetDatabase()
    vi.unstubAllGlobals(); vi.unstubAllEnvs()
  })

  async function novaSessao(marker: string): Promise<{ id: string; slug: string; session: Session }> {
    const id = randomUUID(), slug = `pb-${randomUUID()}`
    touched.push({ id, slug })
    const session = makeSession(id, slug, marker)
    const resposta = await putSession(server, session)
    expect([200, 201]).toContain(resposta.status)
    return { id, slug, session: { ...session, persistenceRevision: 1 } }
  }

  const semTemporarios = async (slug: string) => (await readdir(resolveProjectDir(slug)))
    .filter(name => name.includes('.tmp'))

  // ── Evidência 1 — fronteiras: preparação → intenção → JSONL → ACK SQLite ──

  it('P-B E1: falha na gravação do stage não registra intenção nem altera nada; o retry publica', async () => {
    const { id, slug, session } = await novaSessao('fronteira-stage')
    const bytesAnteriores = await readFile(transcriptPath(slug, id))
    fsFault.failStageWrite = true
    const falhou = await mutation(server, comNovaMensagem(session, 'falha-stage'), 1)
    expect(falhou.status).toBe(500)
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    expect(await readFile(transcriptPath(slug, id))).toEqual(bytesAnteriores)
    expect(getSessionRecord(id)?.title).toBe('fronteira-stage')
    expect(await semTemporarios(slug)).toEqual([])
    expect((await mutation(server, comNovaMensagem(session, 'publicado'), 1)).status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('publicado editado')
  })

  it('P-B E1: falha no registro da intenção (SQL) é transacional — stage removido, estado anterior intacto', async () => {
    const { id, slug, session } = await novaSessao('fronteira-intencao')
    getDatabase().exec(`CREATE TRIGGER fail_pb_intent BEFORE INSERT ON session_write_intents BEGIN SELECT RAISE(ABORT,'fixture'); END`)
    try {
      expect((await mutation(server, comNovaMensagem(session, 'falha-intencao'), 1)).status).toBe(500)
      expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
      expect(await semTemporarios(slug)).toEqual([])
      expect(getSessionRecord(id)?.title).toBe('fronteira-intencao')
      expect((await readTranscript(slug, id)).some(entry => entry.uuid === 'falha-intencao-nova')).toBe(false)
    } finally { getDatabase().exec('DROP TRIGGER fail_pb_intent') }
    expect((await mutation(server, comNovaMensagem(session, 'publicado'), 1)).status).toBe(200)
  })

  it('P-B E1: falha no rename mantém intenção registrada e a reconciliação devolve o estado anterior completo', async () => {
    const { id, slug, session } = await novaSessao('fronteira-rename')
    fsFault.failStageRename = true
    const falhou = await mutation(server, comNovaMensagem(session, 'falha-rename'), 1)
    expect(falhou.status).toBe(500)
    // A intenção foi registrada; o writer removeu o stage e a reconciliação
    // provou destino intacto → a sessão foi liberada sem estado parcial.
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    expect(getSessionRecord(id)?.title).toBe('fronteira-rename')
    expect(await semTemporarios(slug)).toEqual([])
    const listada = await listagem(server)
    expect(listada.state).toBe('ok')
    expect(listada.sessions.find(s => s.id === id)?.chats[0].messages).toHaveLength(2)
    expect((await mutation(server, comNovaMensagem(session, 'publicado'), 1)).status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('publicado editado')
  })

  it('P-B E1: falha no commit SQLite compensa o JSONL e o retry seguro publica tudo junto', async () => {
    const { id, slug, session } = await novaSessao('fronteira-commit')
    const bytesAnteriores = await readFile(transcriptPath(slug, id))
    getDatabase().exec(`CREATE TRIGGER fail_pb_catalog BEFORE UPDATE ON sessions WHEN NEW.id='${id}' BEGIN SELECT RAISE(ABORT,'fixture'); END`)
    try {
      const falhou = await mutation(server, comNovaMensagem(session, 'falha-commit'), 1)
      expect(falhou.status).toBe(500)
      expect(await readFile(transcriptPath(slug, id))).toEqual(bytesAnteriores)
      expect(getSessionRecord(id)?.title).toBe('fronteira-commit')
      expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    } finally { getDatabase().exec('DROP TRIGGER fail_pb_catalog') }
    expect((await mutation(server, comNovaMensagem(session, 'publicado'), 1)).status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('publicado editado')
    const entries = await readTranscript(slug, id)
    expect(entries.some(entry => entry.uuid === 'publicado-nova')).toBe(true)
    const ack = getDatabase().prepare('SELECT revision FROM session_persistence_receipts WHERE session_id=?').get(id) as { revision: number } | undefined
    expect(ack?.revision).toBe(2)
  })

  // ── Evidência 2 — após rename / antes do commit, inclusive staged sumido ──

  it('P-B E2: crash após rename e antes do commit é finalizado na próxima leitura (staged sumido + rollback presente)', async () => {
    const { id, session } = await novaSessao('crash-pos-rename')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'pós-rename'), 'post-rename')
    expect(tituloNoCatalogo(id)).toBe('crash-pos-rename')
    const listada = await listagem(server)
    expect(listada.state).toBe('ok')
    const restaurada = listada.sessions.find(s => s.id === id)!
    expect(restaurada.title).toBe('pós-rename editado')
    expect(restaurada.persistenceRevision).toBe(estado.revision)
    expect(await readFile(estado.destPath, 'utf8')).toBe(estado.bytes.toString('utf8'))
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    const ack = getDatabase().prepare('SELECT mutation_id AS mutationId, revision FROM session_persistence_receipts WHERE session_id=?').get(id)
    expect(ack).toEqual({ mutationId: estado.mutationId, revision: estado.revision })
    // stage e rollback próprios foram limpos após a finalização comprovada
    await expect(readFile(estado.stagedPath)).rejects.toThrow()
    await expect(readFile(estado.rollbackPath)).rejects.toThrow()
    // idempotente: repetir a leitura não altera nada
    const deNovo = await listagem(server)
    expect(deNovo.sessions.find(s => s.id === id)?.persistenceRevision).toBe(estado.revision)
  })

  it('P-B E2: crash antes do rename com stage íntegro é republicado e finalizado', async () => {
    const { id, slug, session } = await novaSessao('crash-pre-rename')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'pré-rename'), 'pre-rename')
    expect(tituloNoCatalogo(id)).toBe('crash-pre-rename')
    const restaurada = (await listagem(server)).sessions.find(s => s.id === id)!
    expect(restaurada.title).toBe('pré-rename editado')
    expect(restaurada.persistenceRevision).toBe(estado.revision)
    expect(await readFile(estado.destPath, 'utf8')).toBe(estado.bytes.toString('utf8'))
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    expect((await readTranscript(slug, id)).filter(entry => entry.type !== 'agir_event')).toHaveLength(3)
  })

  it('P-B E2: stage perdido antes do rename com destino intacto libera a sessão como não salva e permite novo save', async () => {
    const { id, session } = await novaSessao('stage-perdido')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'stage perdido'), 'pre-rename')
    await unlink(estado.stagedPath)
    const listada = await listagem(server)
    expect(listada.state).toBe('ok')
    const servida = listada.sessions.find(s => s.id === id)!
    expect(servida.title).toBe('stage-perdido')
    expect(servida.persistenceRevision).toBe(1)
    expect(await readFile(estado.destPath, 'utf8')).toBe(estado.previousBytes.toString('utf8'))
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    expect((await mutation(server, comNovaMensagem(session, 'republicado'), 1)).status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('republicado editado')
  })

  it('P-B E2: stage corrompido bloqueia com diagnóstico explícito e preserva todos os arquivos', async () => {
    const { id, session } = await novaSessao('stage-corrompido')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'stage corrompido'), 'pre-rename', { corromperStage: true })
    const resposta = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(resposta.status).toBe(503)
    const corpo = await resposta.json() as Record<string, unknown>
    expect(corpo).toMatchObject({ code: 'session_publication_pending' })
    expect(JSON.stringify(corpo)).not.toContain('stage corrompido')
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 1 })
    expect(await readFile(estado.destPath, 'utf8')).toBe(estado.previousBytes.toString('utf8'))
    expect(await readFile(estado.stagedPath, 'utf8')).toBe('{"quebrado":')
    expect(tituloNoCatalogo(id)).toBe('stage-corrompido')
    // nada de novo é aceito por cima enquanto a intenção não puder ser provada
    expect((await mutation(server, { ...session, title: 'bloqueado' }, 1)).status).toBe(503)
  })

  // ── Evidência 3 — destino divergente nunca é sobrescrito ──

  it('P-B E3: destino alterado externamente após a intenção bloqueia sem sobrescrever (crash-path)', async () => {
    const { id, session } = await novaSessao('destino-divergente')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'divergente'), 'post-rename')
    await writeFile(estado.destPath, 'EXTERNAL CHANGE\n', 'utf8')
    const resposta = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toMatchObject({ code: 'session_publication_pending' })
    expect(await readFile(estado.destPath, 'utf8')).toBe('EXTERNAL CHANGE\n')
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 1 })
    expect((await mutation(server, { ...session, title: 'tentativa' }, 1)).status).toBe(503)
    expect(await readFile(estado.destPath, 'utf8')).toBe('EXTERNAL CHANGE\n')
  })

  it('P-B E3: alteração externa durante o save vivo responde 409 e preserva os bytes externos', async () => {
    const { id, slug, session } = await novaSessao('divergencia-viva')
    fsFault.mutateDestAfterStage = true
    const resposta = await mutation(server, comNovaMensagem(session, 'não sobrescreve'), 1)
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({ code: 'transcript_changed' })
    expect(await readFile(transcriptPath(slug, id), 'utf8')).toBe('EXTERNAL CHANGE\n')
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    expect(getSessionRecord(id)?.title).toBe('divergencia-viva')
    // um retry cego também não sobrescreve: a proteção é do protocolo, não do
    // acidente (o destino ilegível responde conflito/erro — nunca 200 parcial).
    const retry = await mutation(server, comNovaMensagem(session, 'retry cego'), 1)
    expect([409, 500]).toContain(retry.status)
    expect(await readFile(transcriptPath(slug, id), 'utf8')).toBe('EXTERNAL CHANGE\n')
  })

  // ── Evidência 5 — repetição segura, sem duplicação nem ACK falso ──

  it('P-B E5: criação interrompida entre JSONL e catálogo é finalizada e o POST repetido devolve o mesmo ACK', async () => {
    const id = randomUUID(), slug = `pb-creation-${id.slice(0, 8)}`
    touched.push({ id, slug })
    const bruta = makeSession(id, slug, 'criação interrompida')
    const payload = projetarSessaoPersistida(bruta)
    const entries = transcriptEntries(payload, [])
    const bytes = Buffer.from(`${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`, 'utf8')
    const destPath = transcriptPath(slug, id)
    mkdirSync(resolveProjectDir(slug), { recursive: true })
    await writeFile(destPath, bytes, { flag: 'wx' })
    const stagedPath = `${destPath}.${process.pid}.${randomUUID()}.tmp` // consumido pelo rename
    const metadata = { ...payload, persistenceRevision: 1, worktreePath: payload.worktreePath ?? null,
      chats: payload.chats.map(chat => ({ ...chat, messages: [] })) }
    const requestDigest = sha(JSON.stringify({ session: { ...payload, persistenceRevision: undefined }, baseRevision: null }))
    const mutationId = randomUUID()
    registerWriteIntent({
      sessionId: id, mutationId, criacao: true, baseRevision: 0, nextRevision: 1,
      targetPath: destPath, stagedPath, oldDigest: null, newDigest: sha(bytes),
      record: { id, slug, title: payload.title, workspacePath: payload.workspacePath, worktreePath: payload.worktreePath ?? null,
        messageCount: entries.length, createdAt: Date.now(), updatedAt: Date.now(), sessionJson: JSON.stringify(metadata) },
      planos: [], checkpointCleanup: null,
      receipt: { sessionId: id, mutationId, revision: 1, digest: requestDigest, creationId: mutationId, creationDigest: requestDigest, creationRevision: 1 },
    })
    // catálogo ainda ausente: a leitura por id finaliza a criação pendente
    const porId = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(porId.status).toBe(200)
    const restaurada = await porId.json() as { session: { id: string; persistenceRevision: number } }
    expect(restaurada.session).toMatchObject({ id, persistenceRevision: 1 })
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
    const ack = getDatabase().prepare('SELECT creation_id AS creationId FROM session_persistence_receipts WHERE session_id=?').get(id)
    expect(ack).toEqual({ creationId: mutationId })
    const digestFinal = sha(await readFile(destPath))
    // POST repetido com a MESMA criação: ACK do mesmo registro, sem regravar nada
    const replay = await fetch(`${server.baseUrl}/api/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: bruta, creationId: mutationId }) })
    expect(replay.status).toBe(201)
    expect(await replay.json()).toMatchObject({ sessionId: id, persistenceRevision: 1 })
    expect(sha(await readFile(destPath))).toBe(digestFinal)
    expect((await readTranscript(slug, id)).filter(entry => entry.type !== 'agir_event')).toHaveLength(2)
  })

  it('P-B E5: replay da mesma mutação após a recuperação devolve o mesmo ACK sem duplicar conteúdo', async () => {
    const { id, slug, session } = await novaSessao('replay')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'recuperado'), 'post-rename')
    // A leitura reconcilia e finaliza a intenção pendente.
    expect((await listagem(server)).state).toBe('ok')
    const digestAposRecuperacao = sha(await readFile(estado.destPath))
    const replay = await fetch(`${server.baseUrl}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: estado.payload, expectedRevision: 1, mutationId: estado.mutationId }) })
    expect(replay.status).toBe(200)
    expect(await replay.json()).toMatchObject({ mutationId: estado.mutationId, revision: estado.revision, sessionId: id })
    expect(sha(await readFile(estado.destPath))).toBe(digestAposRecuperacao)
    // segunda repetição: mesmo resultado, nenhuma cópia nova
    const replay2 = await fetch(`${server.baseUrl}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: estado.payload, expectedRevision: 1, mutationId: estado.mutationId }) })
    expect(replay2.status).toBe(200)
    expect(await replay2.json()).toMatchObject({ mutationId: estado.mutationId, revision: estado.revision })
    expect(sha(await readFile(estado.destPath))).toBe(digestAposRecuperacao)
    expect((await readTranscript(slug, id)).filter(entry => entry.type !== 'agir_event')).toHaveLength(3)
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents').get()).toEqual({ n: 0 })
  })

  // ── Evidência 6 — registros anteriores e intenções antigas compatíveis ──

  it('P-B E6: tabela legada é migrada por ADD COLUMN, marcador preservado e a outra conversa segue ilesa e funcional', async () => {
    // Perfil com a tabela da tentativa anterior ANTES do primeiro toque do produto.
    getDatabase().exec(`CREATE TABLE session_write_intents(session_id TEXT PRIMARY KEY REFERENCES sessions(id), marker TEXT)`)
    const { id: bloqueada, session: sessionA } = await novaSessao('antiga-A')
    getDatabase().prepare(`INSERT INTO session_write_intents(session_id, marker) VALUES(?, 'preserve-fixture')`).run(bloqueada)
    const colunas = new Set((getDatabase().prepare('PRAGMA table_info(session_write_intents)').all() as Array<{ name: string }>).map(c => c.name))
    for (const esperada of ['mutation_id', 'base_revision', 'next_revision', 'target_path', 'staged_path', 'old_digest', 'new_digest', 'record_json', 'origins_json', 'request_digest', 'state', 'registered_at']) {
      expect(colunas.has(esperada)).toBe(true)
    }
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM sqlite_master WHERE name=?').get('session_write_intents')).toEqual({ n: 1 })
    // outra conversa, na mesma tabela legada, publica normalmente
    const { id: saudavel, session: sessionB } = await novaSessao('saudavel-B')
    expect((await mutation(server, { ...sessionB, title: 'B editado' }, 1)).status).toBe(200)
    expect(getSessionRecord(saudavel)?.title).toBe('B editado')
    // a intenção antiga preservada continua bloqueando somente a própria sessão
    expect((await mutation(server, { ...sessionA, title: 'bloqueada' }, 1)).status).toBe(503)
    expect(getDatabase().prepare('SELECT marker FROM session_write_intents WHERE session_id=?').get(bloqueada)).toEqual({ marker: 'preserve-fixture' })
    const listada = await listagem(server)
    expect(listada.state).toBe('partial')
    expect(listada.unavailable).toEqual([{ sessionId: bloqueada, code: 'session_publication_pending', titulo: 'antiga-A' }])
    expect(listada.sessions.find(s => s.id === saudavel)?.title).toBe('B editado')
    expect(listada.sessions.some(s => s.id === bloqueada)).toBe(false)
    // remoção manual do legado (operação humana) devolve a sessão ao normal
    getDatabase().prepare('DELETE FROM session_write_intents WHERE session_id=?').run(bloqueada)
    expect((await mutation(server, { ...sessionA, title: 'liberada' }, 1)).status).toBe(200)
    expect(getSessionRecord(bloqueada)?.title).toBe('liberada')
  })

  // ── Evidência 7 — diagnóstico parcial no servidor e consumo pelo cliente ──

  it('P-B E7: conversa corrompida não remove as saudáveis; ENOENT indevido não vira sucesso vazio', async () => {
    const { id: corrompida, slug: slugA } = await novaSessao('corrompida')
    const { id: saudavel } = await novaSessao('saudavel')
    await writeFile(transcriptPath(slugA, corrompida), 'SYNTAX ERROR\n', 'utf8')
    let listada = await listagem(server)
    expect(listada.state).toBe('partial')
    expect(listada.unavailable).toEqual([{ sessionId: corrompida, code: 'transcript_invalid', titulo: 'corrompida' }])
    expect(listada.sessions.map(s => s.id)).toEqual([saudavel])
    expect(listada.sessions[0].chats[0].messages).toHaveLength(2)
    expect(listada.sessions[0].title).toBe('saudavel')
    // ENOENT com contagem no catálogo: indisponível, nunca lista vazia/sucesso
    await unlink(transcriptPath(slugA, corrompida))
    listada = await listagem(server)
    expect(listada.state).toBe('partial')
    expect(listada.unavailable).toEqual([{ sessionId: corrompida, code: 'transcript_missing', titulo: 'corrompida' }])
    expect(listada.sessions.map(s => s.id)).toEqual([saudavel])
    const porId = await fetch(`${server.baseUrl}/api/sessions/${corrompida}`)
    expect(porId.status).toBe(503)
    expect(await porId.json()).toMatchObject({ code: 'transcript_missing' })
  })

  it('P-B E7: falha total do catálogo responde 503 com diagnóstico, nunca 200 com lista vazia', async () => {
    await novaSessao('vitima')
    resetDatabase()
    // Corrompe o arquivo do banco no disco (perfil sintético desta bateria).
    writeFileSync(getDatabasePath(), 'THIS IS NOT A SQLITE DATABASE — fixture PB\n')
    const resposta = await fetch(`${server.baseUrl}/api/sessions`)
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toMatchObject({ code: 'sessions_unavailable' })
    // restaura um arquivo criável e um banco novo para o cleanup do afterEach
    writeFileSync(getDatabasePath(), '')
    resetDatabase()
  })

  it('P-B E7: o cliente real consome o estado parcial e mantém a base confirmada das saudáveis', async () => {
    const { id: corrompida, slug: slugA } = await novaSessao('parcial-cliente')
    const { id: saudavel } = await novaSessao('saude-cliente')
    await writeFile(transcriptPath(slugA, corrompida), 'SYNTAX ERROR\n', 'utf8')
    const native = globalThis.fetch
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => native(typeof input === 'string' && input.startsWith('/') ? server.baseUrl + input : input, init))
    const resultado = await loadPersistedSessions()
    expect(resultado.state).toBe('partial')
    expect(resultado.unavailable).toEqual([{ sessionId: corrompida, code: 'transcript_invalid', titulo: 'parcial-cliente' }])
    expect(resultado.sessions.map(s => s.id)).toEqual([saudavel])
    // a base confirmada da conversa saudável é reutilizada sem conflito artificial
    await expect(persistSession({ ...resultado.sessions[0], title: 'editada pelo cliente' }))
      .resolves.toMatchObject({ id: saudavel, title: 'editada pelo cliente', persistenceRevision: 2 })
  })


  // ── Revisão P-B (homologação independente) — H1–H3 ──

  it('H1: criação interrompida sem linha de catálogo é descoberta pela listagem (ou vira diagnóstico explícito)', async () => {
    const id = randomUUID(), slug = `pb-h1-${id.slice(0, 8)}`
    touched.push({ id, slug })
    const bruta = makeSession(id, slug, 'h1-criacao')
    const payload = projetarSessaoPersistida(bruta)
    const entries = transcriptEntries(payload, [])
    const bytes = Buffer.from(`${entries.map(entry => JSON.stringify(entry)).join('\n')}\n`, 'utf8')
    const destPath = transcriptPath(slug, id)
    mkdirSync(resolveProjectDir(slug), { recursive: true })
    await writeFile(destPath, bytes, { flag: 'wx' })
    const metadata = { ...payload, persistenceRevision: 1, worktreePath: payload.worktreePath ?? null,
      chats: payload.chats.map(chat => ({ ...chat, messages: [] })) }
    const requestDigest = sha(JSON.stringify({ session: { ...payload, persistenceRevision: undefined }, baseRevision: null }))
    const mutationId = randomUUID()
    registerWriteIntent({
      sessionId: id, mutationId, criacao: true, baseRevision: 0, nextRevision: 1,
      targetPath: destPath, stagedPath: `${destPath}.${process.pid}.${randomUUID()}.tmp`,
      oldDigest: null, newDigest: sha(bytes),
      record: { id, slug, title: payload.title, workspacePath: payload.workspacePath, worktreePath: payload.worktreePath ?? null,
        messageCount: entries.length, createdAt: Date.now(), updatedAt: Date.now(), sessionJson: JSON.stringify(metadata) },
      planos: [], checkpointCleanup: null,
      receipt: { sessionId: id, mutationId, revision: 1, digest: requestDigest, creationId: mutationId, creationDigest: requestDigest, creationRevision: 1 },
    })
    // Nenhuma linha no catálogo — a listagem geral não pode responder lista vazia
    // com estado normal enquanto existir publicação pendente sem registro.
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM sessions WHERE id=?').get(id)).toEqual({ n: 0 })
    const listada = await listagem(server)
    const servida = listada.sessions.find(s => s.id === id)
    const diagnostico = listada.unavailable.find(item => item.sessionId === id)
    expect(servida ?? diagnostico, `listagem escondeu a criação pendente: ${JSON.stringify(listada)}`).toBeDefined()
    if (!servida) {
      // recuperação impossível neste estado → diagnóstico explícito, nunca silêncio
      expect(listada.state).toBe('partial')
      expect(diagnostico?.code).toBe('session_publication_pending')
    } else {
      expect(servida.title).toBe('h1-criacao')
      expect(servida.persistenceRevision).toBe(1)
      expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents WHERE session_id=?').get(id)).toEqual({ n: 0 })
      expect((await readTranscript(slug, id)).filter(entry => entry.type !== 'agir_event')).toHaveLength(2)
    }
  })

  it('H2: a limpeza nunca exclui uma sessão legada vazia preexistente', async () => {
    const id = randomUUID(), slug = `pb-h2-${id.slice(0, 8)}`
    touched.push({ id, slug })
    // Sessão legada real: revisão zero, sem receipt, sem mensagens, sem JSONL.
    const legada = { id, slug, title: 'legada vazia', workspace: 'x', workspacePath: `/tmp/${slug}`,
      section: 'today', status: 'completed', updated: new Date(0).toISOString(), diffAdded: 0, diffRemoved: 0,
      branch: null, mainChatId: 'chat-main', chats: [{ id: 'chat-main', title: 'Main', status: 'completed', messages: [] }] }
    getDatabase().exec(`INSERT INTO sessions (id, slug, title, workspace_path, worktree_path, message_count, created_at, updated_at, session_json)
      VALUES ('${id}', '${slug}', 'legada vazia', '/tmp/${slug}', NULL, 0, 1, 1,
        '${JSON.stringify({ ...legada, persistenceRevision: undefined }).replace(/'/g, "''")}')`)
    const stagedPath = transcriptPath(slug, id) + '.sem-stage.tmp'
    registerWriteIntent({
      sessionId: id, mutationId: randomUUID(), criacao: false, baseRevision: 0, nextRevision: 1,
      targetPath: transcriptPath(slug, id), stagedPath, oldDigest: null, newDigest: 'qualquer',
      record: { id, slug, title: 'legada vazia', workspacePath: `/tmp/${slug}`, worktreePath: null,
        messageCount: 0, createdAt: 1, updatedAt: 1, sessionJson: JSON.stringify(legada) },
      planos: [], checkpointCleanup: null,
      receipt: { sessionId: id, mutationId: 'x', revision: 1, digest: 'x', creationId: null, creationDigest: null, creationRevision: null },
    })
    // Stage desapareceu (estado que dispara a limpeza honesta)…
    const listada = await listagem(server)
    // …mas a sessão legada é PREEXISTENTE: a limpeza só pode remover o journal.
    expect(listada.unavailable.find(item => item.sessionId === id)).toBeUndefined()
    expect(tituloNoCatalogo(id), 'a limpeza excluiu a sessão legada vazia legítima').toBe('legada vazia')
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents WHERE session_id=?').get(id)).toEqual({ n: 0 })
    expect(listada.sessions.find(s => s.id === id)).toBeDefined()
  })

  it('H3: divergência de revisão do catálogo bloqueia ANTES de republicar (bytes e catálogo intactos)', async () => {
    const { id, slug, session } = await novaSessao('h3-base')
    const estado = await montarEstadoDeCrash(comNovaMensagem(session, 'h3-novo'), 'pre-rename') // stage íntegro, destino = base
    const bytesBase = await readFile(estado.destPath)
    // Fixture: catálogo divergente (revisão diferente da base registrada na intenção).
    const sessionJson = JSON.parse((getDatabase().prepare('SELECT session_json AS j FROM sessions WHERE id=?').get(id) as { j: string }).j) as { persistenceRevision?: number }
    getDatabase().prepare('UPDATE sessions SET session_json=? WHERE id=?')
      .run(JSON.stringify({ ...sessionJson, persistenceRevision: 99 }), id)
    const resposta = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toMatchObject({ code: 'session_publication_pending' })
    // A prova é dos artefatos: nada foi republicado, nada foi limpo.
    expect(await readFile(estado.destPath), 'a republicação substituiu o destino antes de validar a revisão').toEqual(bytesBase)
    expect((getDatabase().prepare('SELECT session_json AS j FROM sessions WHERE id=?').get(id) as { j: string }).j)
      .toBe(JSON.stringify({ ...sessionJson, persistenceRevision: 99 }))
    expect(getDatabase().prepare('SELECT COUNT(*) AS n FROM session_write_intents WHERE session_id=?').get(id)).toEqual({ n: 1 })
    expect((await readdir(resolveProjectDir(slug))).some(name => name.endsWith('.tmp'))).toBe(true)
  })
})
