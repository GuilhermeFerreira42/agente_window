import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
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
import { deleteSessionRecord, getSessionRecord } from './database'
import { deleteTranscript, readTranscript } from './transcripts'
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

async function putSession(server: HttpServerHandle, session: Session): Promise<Response> {
  return fetch(`${server.baseUrl}/api/sessions`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session }),
  })
}

async function loadSessions(server: HttpServerHandle): Promise<Session[]> {
  const response = await fetch(`${server.baseUrl}/api/sessions`)
  expect(response.status).toBe(200)
  return ((await response.json()) as { sessions: Session[] }).sessions
}

describe('session persistence HTTP contract', () => {
  let server: HttpServerHandle
  const touched: Array<{ id: string; slug: string }> = []

  beforeEach(async () => {
    touched.length = 0
    persistenceFault.failNextRename = false
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
  })

  it('never loses an acknowledged snapshot when workspace change races with PUT', async () => {
    const { mkdir } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const workspace = join(process.env.AGENTE_WINDOW_TEST_HOME!, 'workspace-race')
    await mkdir(workspace, { recursive: true })
    const id = `workspace-race-${randomUUID()}`
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
    const id = `workspace-current-${randomUUID()}`
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
    expect(body.session.persistenceRevision).toBe(13)
    expect(body.session.chats[0].messages).toEqual(latest.chats[0].messages)
    expect(body.session.workspacePath).toBe(workspace)
    expect(await readTranscript(slug, id)).toEqual(before)
    expect(persistenceFault.failNextRename).toBe(true)
  })

  it('serializes two rounds of 16 PUTs and restores one whole, ordered snapshot after HTTP server restart', async () => {
    const id = `persistence-race-${randomUUID()}`
    const slug = `persistence-race-${randomUUID()}`
    touched.push({ id, slug })

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
      expect(marker).toBe(`round-${round}-write-15`)
      expect(restored?.persistenceRevision).toBe(round * 16 + 16)
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
    const id = `persistence-revision-${randomUUID()}`
    const slug = `persistence-revision-${randomUUID()}`
    touched.push({ id, slug })
    const newer = makeSession(id, slug, 'newer-snapshot')
    newer.persistenceRevision = 12
    const older = makeSession(id, slug, 'older-snapshot')
    older.persistenceRevision = 11

    expect((await putSession(server, newer)).status).toBe(200)
    const staleResponse = await putSession(server, older)
    expect(staleResponse.status).toBe(409)
    expect(await staleResponse.json()).toMatchObject({ code: 'stale_session_snapshot' })
    const restored = (await loadSessions(server)).find((session) => session.id === id)
    expect(restored?.title).toBe('newer-snapshot')
    expect(restored?.chats[0].messages.map((item) => item.id)).toEqual([
      'newer-snapshot-1', 'newer-snapshot-2', 'newer-snapshot-3',
    ])
  })

  it('does not advance SQLite metadata when transcript publication fails', async () => {
    const id = `persistence-failure-${randomUUID()}`
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
    const firstId = `session-a-${randomUUID()}`
    const secondId = `session-b-${randomUUID()}`
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
    expect(restoredFirst.chats[0].messages).toEqual(first.chats[0].messages)
    expect(restoredSecond.chats[0].messages).toEqual(second.chats[0].messages)
    expect(await readTranscript(slug, firstId)).not.toEqual(await readTranscript(slug, secondId))
  })
})
