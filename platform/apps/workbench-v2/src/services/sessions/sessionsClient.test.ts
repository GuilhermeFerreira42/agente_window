import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../types'
import { persistSession, persistSessionNoUnload, pickSessionWorkspace, removePersistedSession } from './sessionsClient'

const jsonResponse = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => vi.unstubAllGlobals())

describe('sessions client — mutations that cross the local JSON boundary', () => {
  it('holds a conflicting session instead of retrying above the remote revision, including pagehide', async () => {
    const id = `conflict-${randomUUID()}`
    const session = { id, persistenceRevision: 1 } as Session
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ code: 'stale_session_snapshot', currentRevision: 50 }), { status: 409 }))
    await expect(persistSession(session)).rejects.toMatchObject({ status: 409, code: 'stale_session_snapshot' })
    await expect(persistSession(session)).rejects.toMatchObject({ status: 409 })
    persistSessionNoUnload(session)
    await Promise.resolve()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not let a delayed obsolete response block an already acknowledged newer local save', async () => {
    const session = { id: `delayed-${randomUUID()}` } as Session
    let rejectOld!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { rejectOld = resolve }))
      .mockResolvedValueOnce(jsonResponse({ persistenceRevision: 2 }))
      .mockResolvedValueOnce(jsonResponse({ persistenceRevision: 3 }))
    const older = persistSession(session)
    await persistSession(session)
    rejectOld(new Response(JSON.stringify({ code: 'stale_session_snapshot', currentRevision: 2 }), { status: 409 }))
    await expect(older).resolves.toBeUndefined()
    await expect(persistSession(session)).resolves.toBeUndefined()
  })
  it('sends an empty JSON object to the native workspace picker route', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ workspace: null }))

    await expect(pickSessionWorkspace()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
  })

  it('increments persistence revisions for normal and keepalive saves of the same session', async () => {
    fetchMock.mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { session: Session }
      return jsonResponse({ ok: true, persistenceRevision: body.session.persistenceRevision })
    })
    const session: Session = {
      id: `revision-client-${randomUUID()}`,
      title: 'Revision client test',
      workspace: 'synthetic',
      workspacePath: '/tmp/synthetic',
      section: 'today',
      status: 'completed',
      updated: 'now',
      diffAdded: 0,
      diffRemoved: 0,
      branch: null,
      chats: [],
      mainChatId: 'main',
    }

    await persistSession(session)
    persistSessionNoUnload(session)
    persistSessionNoUnload(session)

    const revisions = fetchMock.mock.calls.map(([, init]) => {
      const body = JSON.parse(String(init?.body)) as { session: Session }
      return body.session.persistenceRevision
    })
    expect(revisions).toEqual([1, 2, 3])
    expect(fetchMock.mock.calls.slice(1).every(([, init]) => init?.keepalive === true)).toBe(true)
  })

  it('sends JSON for normal and forced conversation deletion without changing the URL contract', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }))

    await removePersistedSession('session / one')
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/sessions/session%20%2F%20one', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })

    await removePersistedSession('session-2', true)
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/sessions/session-2?force=true', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
  })
})
