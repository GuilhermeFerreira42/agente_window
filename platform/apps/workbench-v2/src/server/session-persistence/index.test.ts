import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViteDevServer } from 'vite'
import type { ChatMessage, Session } from '../../types'
import type * as TranscriptModule from './transcripts'

const persistenceFault = vi.hoisted(() => ({
  failNextRename: false,
  blockNextRead: false,
  readStarted: undefined as (() => void) | undefined,
  releaseRead: undefined as (() => void) | undefined,
}))
vi.mock('./transcripts', async (importOriginal) => {
  const actual = await importOriginal<typeof TranscriptModule>()
  return {
    ...actual,
    readTranscript: async (...args: Parameters<typeof actual.readTranscript>) => {
      if (persistenceFault.blockNextRead) {
        persistenceFault.blockNextRead = false
        persistenceFault.readStarted?.()
        await new Promise<void>((resolve) => { persistenceFault.releaseRead = resolve })
      }
      return actual.readTranscript(...args)
    },
    writeTranscript: async (...args: Parameters<typeof actual.writeTranscript>) => {
      if (persistenceFault.failNextRename) {
        persistenceFault.failNextRename = false
        throw Object.assign(new Error('injected transcript publication failure'), { code: 'EIO' })
      }
      return actual.writeTranscript(...args)
    },
  }
})
import { deleteSessionRecord, getSessionRecord, getDatabase, resetDatabase, upsertSessionRecord } from './database'
import { deleteTranscript, readTranscript, writeTranscript } from './transcripts'
import { loadPersistedSessions, persistSession } from '../../services/sessions/sessionsClient'
import { sessionPersistencePlugin } from './index'

interface HttpServerHandle {
  baseUrl: string
  close: () => Promise<void>
}

type Middleware = (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void
let persistenceMiddleware: Middleware | undefined

const plugin = sessionPersistencePlugin({ repoRoot: process.cwd() })
const configureServer = plugin.configureServer
if (typeof configureServer !== 'function') throw new Error('session persistence plugin has no configureServer hook')
configureServer({ middlewares: { use: (middleware: Middleware) => { persistenceMiddleware = middleware } } } as unknown as ViteDevServer)

function listen(): Promise<HttpServerHandle> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (!persistenceMiddleware) {
        response.statusCode = 500
        response.end('middleware unavailable')
        return
      }
      persistenceMiddleware(request, response, () => {
        response.statusCode = 404
        response.end('not found')
      })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('could not determine test server port'))
        return
      }
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((done, fail) => server.close((error) => error ? fail(error) : done())),
      })
    })
  })
}

function message(id: string, role: ChatMessage['role'], content: string, extra: Partial<ChatMessage> = {}): ChatMessage {
  return { id, role, content, time: '10:00', ...extra }
}

function makeSession(id: string, slug: string, marker: string, persistenceRevision = 1): Session {
  return {
    id,
    persistenceRevision,
    slug,
    title: marker,
    workspace: marker,
    workspacePath: `/tmp/${slug}`,
    section: 'today',
    status: 'completed',
    updated: new Date(0).toISOString(),
    diffAdded: 0,
    diffRemoved: 0,
    branch: null,
    mainChatId: 'chat-main',
    chats: [{
      id: 'chat-main',
      title: 'Main',
      status: 'completed',
      messages: [
        message(`${marker}-1`, 'user', `${marker}:one`),
        message(`${marker}-2`, 'assistant', `${marker}:two`),
        message(`${marker}-3`, 'user', `${marker}:three`),
      ],
    }],
  }
}

const revisionCache = new Map<string, number>()

async function putSession(server: HttpServerHandle, session: Session): Promise<Response> {
  const isUpdate = revisionCache.has(session.id)
  const body = { session, ...(isUpdate ? { expectedRevision: revisionCache.get(session.id)!, mutationId: randomUUID() } : { creationId: randomUUID() }) }
  const response = await fetch(`${server.baseUrl}/api/sessions`, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) {
    console.error(`PUT failed with status ${response.status}:`, text)
  }
  if (response.ok) {
    const data = JSON.parse(text)
    if (data.persistenceRevision !== undefined) {
      revisionCache.set(session.id, data.persistenceRevision)
    }
  }
  return new Response(text, { status: response.status === 201 ? 200 : response.status, statusText: response.statusText, headers: response.headers })
}

async function loadSessions(server: HttpServerHandle): Promise<Session[]> {
  const response = await fetch(`${server.baseUrl}/api/sessions`)
  expect(response.status).toBe(200)
  return ((await response.json()) as { sessions: Session[] }).sessions
}

describe('session persistence HTTP contract', () => {
  let server: HttpServerHandle
  const touched: Array<{ id: string; slug: string }> = []

  it('encaminha a API de Personalizações para a casa, sem cair no fallback de HTML', async () => {
    const response = await fetch(`${server.baseUrl}/api/personalizacoes`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    const body = await response.json() as { skills: unknown[]; ferramentas: unknown[] }
    expect(Array.isArray(body.skills)).toBe(true)
    expect(Array.isArray(body.ferramentas)).toBe(true)
    for (const [route, method] of [['skills', 'POST'], ['estado', 'PUT']]) {
      const invalid = await fetch(`${server.baseUrl}/api/personalizacoes/${route}`, {
        method, headers: { 'content-type': 'application/json' }, body: '{invalido',
      })
      expect(invalid.status).toBe(400)
      expect(invalid.headers.get('content-type')).toContain('application/json')
    }
  })

  beforeEach(async () => {
    touched.length = 0
    revisionCache.clear()
    persistenceFault.failNextRename = false
    resetDatabase()
    const profile = mkdtempSync(join(tmpdir(), 'agent-pa-'))
    vi.stubEnv('AGENTE_WINDOW_DATA_DIR', join(profile, 'data'))
    vi.stubEnv('AGENTE_WINDOW_TEST_HOME', profile)
    vi.stubEnv('AGENTE_WINDOW_PROVIDERS_PATH', join(profile, 'providers.json'))
    vi.stubEnv('AGENTE_WINDOW_SETTINGS_PATH', join(profile, 'settings.json'))
    vi.stubEnv('AGENTE_WINDOW_PERSONALIZACOES_PATH', join(profile, 'personalizacoes.json'))
    server = await listen()
  })

  afterEach(async () => {
    persistenceFault.releaseRead?.()
    persistenceFault.blockNextRead = false
    persistenceFault.failNextRename = false
    await server.close()
    for (const { id, slug } of touched) {
      await deleteTranscript(slug, id)
      deleteSessionRecord(id)
    }
    resetDatabase()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('MC1: resalvar snapshot não muda datas das mensagens já publicadas', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'stable-date')
    touched.push({ id, slug: id })
    expect((await putSession(server, session)).ok).toBe(true)
    const antes = await readTranscript(id, id)
    await new Promise<void>(ok => setTimeout(ok, 5))
    session.title = 'Título atualizado'; session.persistenceRevision = 2
    expect((await putSession(server, session)).ok).toBe(true)
    expect(await readTranscript(id, id)).toEqual(antes)
  })

  it('persists tool states and references without storing transient content', async () => {
    const id = randomUUID()
    const session = makeSession(id, id, 'privacy')
    Object.assign(session, { rawArgs: 'PRIVATE_SESSION_EXTENSION', approval: 'PRIVATE_APPROVAL' })
    Object.assign(session.chats[0], { rawOutput: 'PRIVATE_CHAT_EXTENSION', approval: 'PRIVATE_CHAT_APPROVAL' })
    touched.push({ id, slug: id })
    const messages = session.chats[0].messages
    const local = { id: 'attachment-1', name: 'example.txt', kind: 'local' as const, bytes: 'PRIVATE_ATTACHMENT' }
    messages[0].attachments = [local]
    messages[1].ferramentas = [
      { id: 'cmd', ferramenta: 'executar', alvo: 'PRIVATE_COMMAND', status: 'ok', progresso: 'PRIVATE_STDOUT', resumo: 'PRIVATE_RESULT' },
      { id: 'write', ferramenta: 'escrever', alvo: 'example.txt', status: 'negado', previa: 'PRIVATE_WRITE' },
      { id: 'search', ferramenta: 'buscar', alvo: 'PRIVATE_SEARCH_QUERY', status: 'ok' },
    ]
    expect((await putSession(server, session)).ok).toBe(true)
    const entries = await readTranscript(id, id)
    expect(JSON.stringify(entries)).not.toContain('PRIVATE_')
    expect(getSessionRecord(id)?.sessionJson).not.toContain('PRIVATE_')
    const restored = (await loadSessions(server)).find((entry) => entry.id === id)!
    expect(restored.chats[0].messages[0].attachments).toEqual([{ id: 'attachment-1', name: 'example.txt', kind: 'local' }])
    expect(restored.chats[0].messages[1].ferramentas).toMatchObject([
      { id: 'persistida-0', ferramenta: 'executar', status: 'ok' },
      { id: 'persistida-1', ferramenta: 'escrever', alvo: 'example.txt', status: 'negado' },
      { id: 'persistida-2', ferramenta: 'buscar', alvo: 'Consulta', status: 'ok' },
    ])
  })

  it('rejects an oversized snapshot with 413 and keeps its previous source', async () => {
    const id = randomUUID()
    const session = makeSession(id, id, 'previous')
    touched.push({ id, slug: id })
    expect((await putSession(server, session)).ok).toBe(true)
    const previous = await readTranscript(id, id)
    session.persistenceRevision = 2
    session.chats[0].messages[0].content = 'x'.repeat(16 * 1024 * 1024)
    const response = await putSession(server, session)
    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'session_payload_too_large' })
    expect(await readTranscript(id, id)).toEqual(previous)
    expect(JSON.parse(getSessionRecord(id)!.sessionJson).persistenceRevision).toBe(1)
  })

  it('does not echo fragments of an invalid JSON payload', async () => {
    const response = await fetch(`${server.baseUrl}/api/sessions`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"PRIVATE_INVALID_JSON":',
    })
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('PRIVATE_')
  })

  it('searches only the requested persisted chat and reflects message deletion', async () => {
    const id = randomUUID()
    const session = makeSession(id, id, 'Busca (á)')
    session.chats.push({ ...session.chats[0], id: 'other', messages: [message('outro-id', 'user', 'Busca (á) de outro chat')] })
    touched.push({ id, slug: id })
    expect((await putSession(server, session)).ok).toBe(true)
    const buscar = (chatId: string, sessionId: string = id) => fetch(`${server.baseUrl}/api/sessions/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, chatId, query: 'BUSCA (Á)' }),
    })
    const resultado = await buscar('chat-main')
    expect(resultado.ok).toBe(true)
    const corpo = await resultado.json() as { hits: Array<{ messageId: string }> }
    expect(corpo.hits).toHaveLength(3)
    expect(corpo.hits.map(({ messageId }) => messageId)).not.toContain('outro-id')
    expect((await buscar('chat-main', 'outra-sessao')).status).toBe(404)
    expect((await buscar('chat-inexistente')).status).toBe(404)
    session.persistenceRevision = (session.persistenceRevision ?? 1) + 1
    session.chats[0].messages = []
    expect((await putSession(server, session)).ok).toBe(true)
    expect(await (await buscar('chat-main')).json()).toEqual({ hits: [], parcial: false })
  })

  it('never loses an acknowledged snapshot when workspace change races with PUT', async () => {
    const { mkdir } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const workspace = join(process.env.AGENTE_WINDOW_TEST_HOME!, 'workspace-race')
    await mkdir(workspace, { recursive: true })
    const id = randomUUID()
    const slug = id
    touched.push({ id, slug })
    expect((await putSession(server, makeSession(id, slug, 'old-content', 1))).status).toBe(200)
    const entered = new Promise<void>((resolve) => { persistenceFault.readStarted = resolve })
    persistenceFault.blockNextRead = true
    const changing = fetch(`${server.baseUrl}/api/session/change-workspace`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id, path: workspace }),
    })
    await entered
    const newer = makeSession(id, slug, 'new-content', 2)
    newer.chats[0].messages[1].ferramentas = [{ id: 'tool', ferramenta: 'criar', alvo: 'test.ts', status: 'ok', resumo: 'preserved' }]
    const saving = putSession(server, newer)
    await new Promise((resolve) => setTimeout(resolve, 150))
    persistenceFault.releaseRead!()
    const saved = await saving
    expect([200, 409]).toContain(saved.status)
    expect((await changing).status).toBe(200)
    const restored = (await loadSessions(server)).find((session) => session.id === id)!
    // A newer PUT may be rejected explicitly if the workspace change commits
    // first. A PUT acknowledged with 200 must NEVER subsequently disappear.
    expect(restored.chats[0].messages).toEqual(saved.status === 200 ? newer.chats[0].messages : makeSession(id, slug, 'old-content', 1).chats[0].messages)
    expect(restored.title).toBe(saved.status === 200 ? 'new-content' : 'old-content')
  })

  it('changes only current workspace metadata without republishing the transcript', async () => {
    const { mkdir } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const workspace = join(process.env.AGENTE_WINDOW_TEST_HOME!, 'workspace-metadata')
    await mkdir(workspace, { recursive: true })
    const id = randomUUID()
    const slug = id
    touched.push({ id, slug })
    const latest = makeSession(id, slug, 'latest-accepted', 12)
    expect((await putSession(server, latest)).status).toBe(200)
    const before = await readTranscript(slug, id)
    persistenceFault.failNextRename = true
    const changed = await fetch(`${server.baseUrl}/api/session/change-workspace`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id, path: workspace }),
    })
    expect(changed.status).toBe(200)
    const body = await changed.json() as { session: Session }
    expect(body.session.persistenceRevision).toBe(2)
    expect(body.session.chats[0].messages).toEqual(latest.chats[0].messages)
    expect(body.session.workspacePath).toBe(workspace)
    expect(await readTranscript(slug, id)).toEqual(before)
    expect(persistenceFault.failNextRename).toBe(true)
  })

  it('serializes two rounds of 16 PUTs and restores one whole, ordered snapshot after HTTP server restart', async () => {
    const id = randomUUID()
    const slug = `persistence-race-${randomUUID()}`
    touched.push({ id, slug })

    expect((await putSession(server, makeSession(id, slug, 'initial'))).status).toBe(200)

    for (let round = 0; round < 2; round += 1) {
      const sessions = Array.from({ length: 16 }, (_, index) => makeSession(
        id, slug, `round-${round}-write-${index}`, round * 16 + index + 1,
      ))
      const responses = await Promise.all(sessions.map((session) => putSession(server, session)))
      expect(responses.every((response) => response.status === 200 || response.status === 409)).toBe(true)
      for (const response of responses.filter((candidate) => candidate.status === 409)) {
        expect(await response.json()).toMatchObject({ code: 'stale_session_snapshot' })
      }

      const restored = (await loadSessions(server)).find((session) => session.id === id)
      expect(restored).toBeDefined()
      const marker = restored!.title
      expect(responses.filter(r => r.status === 200)).toHaveLength(1)
      expect(marker).toMatch(new RegExp(`^round-${round}-write-\\d+$`))
      expect(restored?.persistenceRevision).toBe(round + 2)
      const messages = restored!.chats[0].messages
      expect(messages.map((item) => item.id)).toEqual([`${marker}-1`, `${marker}-2`, `${marker}-3`])
      expect(messages.map((item) => item.content)).toEqual([`${marker}:one`, `${marker}:two`, `${marker}:three`])
      expect(getSessionRecord(id)?.messageCount).toBe(3)
      const entries = await readTranscript(slug, id)
      expect(entries.map((entry) => entry.uuid)).toEqual([`${marker}-1`, `${marker}-2`, `${marker}-3`])
    }

    await server.close()
    server = await listen()
    const reopened = (await loadSessions(server)).find((session) => session.id === id)
    expect(reopened?.chats[0].messages.map((item) => item.id)).toEqual([
      `${reopened?.title}-1`, `${reopened?.title}-2`, `${reopened?.title}-3`,
    ])
  })

  it('rejects an older snapshot that arrives after a newer one', async () => {
    const id = randomUUID()
    const slug = `persistence-revision-${randomUUID()}`
    touched.push({ id, slug })
    const newer = makeSession(id, slug, 'newer-snapshot')
    newer.persistenceRevision = 12
    const older = makeSession(id, slug, 'older-snapshot')
    older.persistenceRevision = 11

    expect((await putSession(server, newer)).status).toBe(200)
    const staleResponse = await fetch(`${server.baseUrl}/api/sessions`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: older, expectedRevision: 0, mutationId: randomUUID() }),
    })
    expect(staleResponse.status).toBe(409)
    expect(await staleResponse.json()).toMatchObject({ code: 'stale_session_snapshot' })
    const restored = (await loadSessions(server)).find((session) => session.id === id)
    expect(restored?.title).toBe('newer-snapshot')
    expect(restored?.chats[0].messages.map((item) => item.id)).toEqual([
      'newer-snapshot-1', 'newer-snapshot-2', 'newer-snapshot-3',
    ])
  })

  it('does not advance SQLite metadata when transcript publication fails', async () => {
    const id = randomUUID()
    const slug = `persistence-failure-${randomUUID()}`
    touched.push({ id, slug })
    const previous = makeSession(id, slug, 'previous-complete-state', 1)
    expect((await putSession(server, previous)).status).toBe(200)

    persistenceFault.failNextRename = true
    const failed = await putSession(server, makeSession(id, slug, 'injected-failure-state', 2))
    expect(failed.status).toBe(500)
    expect(getSessionRecord(id)?.title).toBe('previous-complete-state')
    expect(getSessionRecord(id)?.messageCount).toBe(3)
    const restored = (await loadSessions(server)).find((session) => session.id === id)
    expect(restored?.title).toBe('previous-complete-state')
    expect(restored?.chats[0].messages.map((item) => item.id)).toEqual([
      'previous-complete-state-1', 'previous-complete-state-2', 'previous-complete-state-3',
    ])
  })

  it('preserves tool cards, results, errors, IDs, and isolates separate session files', async () => {
    const slug = `persistence-isolation-${randomUUID()}`
    const firstId = randomUUID()
    const secondId = randomUUID()
    touched.push({ id: firstId, slug }, { id: secondId, slug })

    const first = makeSession(firstId, slug, 'project-a')
    first.chats[0].messages[1] = message('assistant-with-tools', 'assistant', 'Tool summary', {
      ferramentas: [
        { id: 'tool-call-1', ferramenta: 'criar', alvo: 'src/new.ts', previa: 'export {}', status: 'ok', resumo: 'created' },
        { id: 'tool-call-2', ferramenta: 'escrever', alvo: 'src/missing.ts', status: 'erro', resumo: 'not found' },
      ],
      continuar: [{ id: 'continue-card-1', status: 'parado', iteracoes: 4, teto: 10, titulo: 'Interrupted run' }],
    })
    const second = makeSession(secondId, slug, 'project-b')
    expect((await putSession(server, first)).status).toBe(200)
    expect((await putSession(server, second)).status).toBe(200)

    const restored = await loadSessions(server)
    const restoredFirst = restored.find((session) => session.id === firstId)!
    const restoredSecond = restored.find((session) => session.id === secondId)!
    expect(restoredFirst.chats[0].messages.map(({ id, content }) => ({ id, content })))
      .toEqual(first.chats[0].messages.map(({ id, content }) => ({ id, content })))
    expect(restoredFirst.chats[0].messages[1]).toMatchObject({
      ferramentas: [{ id: 'persistida-0', status: 'ok' }, { id: 'persistida-1', status: 'erro' }],
      continuar: [{ id: 'continue-card-1', status: 'parado' }],
    })
    expect(restoredSecond.chats[0].messages).toEqual(second.chats[0].messages)
    expect(await readTranscript(slug, firstId)).not.toEqual(await readTranscript(slug, secondId))
  })

  const mutation = (session: Session, expectedRevision?: number, mutationId = randomUUID(), method = 'PUT') => fetch(`${server.baseUrl}/api/sessions`, {
    method, headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session, ...(method === 'POST' ? { creationId: mutationId } : { expectedRevision, mutationId }) }),
  })

  it('P-A: creation is distinct and idempotent; PUT never creates and invalid CAS returns 400', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'created', 9000), creationId = randomUUID()
    touched.push({ id, slug: id })
    expect((await mutation(session, 0)).status).toBe(404)
    const created = await mutation(session, undefined, creationId, 'POST')
    expect(created.status).toBe(201); expect(await created.json()).toMatchObject({ sessionId: id, mutationId: creationId, revision: 1 })
    persistenceFault.failNextRename = true
    expect((await mutation(session, undefined, creationId, 'POST')).status).toBe(201)
    expect(persistenceFault.failNextRename).toBe(true); persistenceFault.failNextRename = false
    expect((await mutation({ ...session, title: 'different' }, undefined, creationId, 'POST')).status).toBe(409)
    expect((await mutation(session)).status).toBe(400)
  })

  it('P-A: mutation ACK survives connection restart and rejects changed payload/base', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'old'), operation = randomUUID()
    touched.push({ id, slug: id }); await putSession(server, session)
    const next = { ...session, title: 'new', persistenceRevision: 9000 }
    const saved = await mutation(next, 1, operation)
    expect(saved.status).toBe(200); expect(await saved.json()).toMatchObject({ revision: 2, mutationId: operation })
    const entries = await readTranscript(id, id); resetDatabase()
    persistenceFault.failNextRename = true
    const replay = await mutation(next, 1, operation)
    expect(replay.status).toBe(200); expect(await replay.json()).toMatchObject({ revision: 2, mutationId: operation })
    expect(persistenceFault.failNextRename).toBe(true); persistenceFault.failNextRename = false
    expect(await readTranscript(id, id)).toEqual(entries)
    expect((await mutation({ ...next, title: 'changed' }, 1, operation)).status).toBe(409)
    expect((await mutation(next, 2, operation)).status).toBe(409)
    expect((await mutation({ ...next, persistenceRevision: 99999 }, 0)).status).toBe(409)
    const lookup = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(await lookup.json()).toMatchObject({ session: { id, persistenceRevision: 2 }, ack: { mutationId: operation, revision: 2 } })
  })

  it('P-A: save preserves confirmed server events and ignores browser location changes', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'old')
    touched.push({ id, slug: id }); await putSession(server, session)
    const previous = await readTranscript(id, id)
    const event = { type: 'agir_event' as const, chatId: 'chat-main', uuid: 'synthetic-server-event', timestamp: 1, sequence: 1, message: { version: 1, evento: { tipo: 'synthetic' } } }
    await writeTranscript(id, id, [...previous, event])
    expect((await mutation({ ...session, title: 'edit', slug: 'other-slug', workspacePath: '/untrusted', persistenceRevision: 2 }, 1)).status).toBe(200)
    expect(await readTranscript(id, id)).toContainEqual(event)
    expect(getSessionRecord(id)).toMatchObject({ slug: id, workspacePath: session.workspacePath })
  })

  it('P-A: live SQL publication failure restores prior JSONL/catalog and retry is safe', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'old'), operation = randomUUID()
    touched.push({ id, slug: id }); await putSession(server, session)
    const previous = await readTranscript(id, id)
    getDatabase().exec(`CREATE TRIGGER fail_pa_catalog BEFORE UPDATE ON sessions WHEN NEW.id='${id}' BEGIN SELECT RAISE(ABORT,'fixture failure'); END`)
    try {
      expect((await mutation(makeSession(id, id, 'new'), 1, operation)).status).toBe(500)
      expect(getSessionRecord(id)?.title).toBe('old')
      expect(await readTranscript(id, id)).toEqual(previous)
      expect((await loadSessions(server)).find(s => s.id === id)?.chats[0].messages).toEqual(session.chats[0].messages)
    } finally { getDatabase().exec('DROP TRIGGER fail_pa_catalog') }
    expect((await mutation(makeSession(id, id, 'new'), 1, operation)).status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('new')
  })

  it('P-A: earlier P-B intent with FK is preserved and blocks reads/writes without destructive migration', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'old')
    touched.push({ id, slug: id })
    // The FK'd minimal journal of the earlier (non-homologated) attempt must
    // pre-date this product's first touch of the profile: migration is additive.
    getDatabase().exec(`CREATE TABLE session_write_intents(session_id TEXT PRIMARY KEY REFERENCES sessions(id), marker TEXT)`)
    expect((await putSession(server, session)).status).toBe(200)
    getDatabase().prepare(`INSERT INTO session_write_intents(session_id, marker) VALUES(?, 'preserve-fixture')`).run(id)
    resetDatabase()
    try {
      expect((await mutation({ ...session, title: 'blocked' }, 1)).status).toBe(503)
      expect((await fetch(`${server.baseUrl}/api/sessions/${id}`)).status).toBe(503)
      expect(getDatabase().prepare('SELECT marker FROM session_write_intents WHERE session_id=?').get(id)).toEqual({ marker: 'preserve-fixture' })
      expect(() => getSessionRecord(id)).toThrow('publicação pendente')
      expect(getDatabase().prepare('SELECT title FROM sessions WHERE id=?').get(id)).toEqual({ title: 'old' })
    } finally { getDatabase().prepare('DELETE FROM session_write_intents WHERE session_id=?').run(id) }
  })

  it('P-A: hydrate and edit through the real client uses the confirmed base without artificial conflict', async () => {
    const id = randomUUID(), session = makeSession(id, id, 'old')
    touched.push({ id, slug: id }); await putSession(server, session)
    const native = globalThis.fetch
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => native(typeof input === 'string' && input.startsWith('/') ? server.baseUrl + input : input, init))
    const hydrated = (await loadPersistedSessions()).sessions.find(s => s.id === id)!
    await expect(persistSession({ ...hydrated, title: 'after reload' })).resolves.toMatchObject({ id, title: 'after reload', persistenceRevision: 2 })
    expect(getSessionRecord(id)?.title).toBe('after reload')
  })

  it('P-A: adapts an existing unversioned legacy identity without creating a sanitized alias', async () => {
    const id = 'legacy:ação/01', slug = randomUUID(), session = makeSession(id, slug, 'legacy', 0)
    touched.push({ id, slug })
    await writeTranscript(slug, id, session.chats[0].messages.map(m => ({ type: m.role, chatId: 'chat-main', message: m, uuid: m.id, timestamp: 1 })))
    upsertSessionRecord({ id, slug, title: session.title, workspacePath: session.workspacePath, worktreePath: null,
      messageCount: 3, createdAt: 1, updatedAt: 1, sessionJson: JSON.stringify({ ...session, persistenceRevision: undefined, chats: session.chats.map(c => ({ ...c, messages: [] })) }) })
    const response = await mutation({ ...session, title: 'legacy edited', persistenceRevision: 9999 }, 0)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ sessionId: id, revision: 1 })
    expect((await fetch(`${server.baseUrl}/api/sessions/${encodeURIComponent(id)}`)).status).toBe(200)
    expect(getSessionRecord(id)?.title).toBe('legacy edited')
    expect(getSessionRecord(id.replace(/[^a-zA-Z0-9_-]/g, '-'))).toBeUndefined()
  })
})
