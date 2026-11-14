import { randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../types'
import { persistSession, persistRecoveryCopy, persistSessionNoUnload, resumeSessionPersistence, retrySessionPersistence, loadPersistedSessions, pickSessionWorkspace, removePersistedSession } from './sessionsClient'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const fetchMock = vi.fn<typeof fetch>()
const make = (): Session => ({ id: randomUUID(), title: 'Fixture', workspace: 'synthetic', workspacePath: 'C:/synthetic', section: 'today', status: 'completed', updated: 'now', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [] }] })
function ack(init?: RequestInit, revision = 1) {
  const body = JSON.parse(String(init?.body)); return json({ sessionId: body.session.id, mutationId: body.mutationId ?? body.creationId, revision, session: { ...body.session, persistenceRevision: revision } })
}
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => vi.unstubAllGlobals())

describe('session write queue and HTTP boundary', () => {
  it('hydrates the confirmed base and never substitutes a remote conflict revision', async () => {
    const session = { ...make(), persistenceRevision: 12 }
    fetchMock.mockResolvedValueOnce(json({ sessions: [session] })).mockResolvedValue(json({ code: 'stale_session_snapshot', currentRevision: 50 }, 409))
    await loadPersistedSessions()
    await expect(persistSession({ ...session, title: 'edit' })).rejects.toMatchObject({ status: 409 })
    const sent = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)); expect(sent.expectedRevision).toBe(12)
    await expect(persistSession({ ...session, title: 'later' })).rejects.toMatchObject({ status: 409 })
    persistSessionNoUnload(session); await Promise.resolve(); expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('serializes saves, coalesces the next snapshot, and marks a clean snapshot without another PUT', async () => {
    const session = { ...make(), persistenceRevision: 1 }; resumeSessionPersistence(session)
    let release!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { release = resolve })).mockImplementation(async (_url, init) => ack(init, 3))
    const first = persistSession({ ...session, title: 'one' }); await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const second = persistSession({ ...session, title: 'two' }); const third = persistSession({ ...session, title: 'three' })
    persistSessionNoUnload({ ...session, title: 'three' }); expect(fetchMock).toHaveBeenCalledTimes(1)
    release(ack(fetchMock.mock.calls[0][1], 2)); await Promise.all([first, second, third])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const sent = JSON.parse(String(fetchMock.mock.calls[1][1]?.body)); expect(sent.expectedRevision).toBe(2); expect(sent.session.title).toBe('three')
    await persistSession({ ...session, title: 'three' }); expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('queries an uncertain ACK before retrying and reuses its mutation identity if it was not committed', async () => {
    const session = { ...make(), persistenceRevision: 1 }; resumeSessionPersistence(session)
    fetchMock.mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(json({ session })).mockImplementationOnce(async (_url, init) => ack(init, 2))
    await expect(persistSession({ ...session, title: 'edit' })).rejects.toThrow('network')
    await retrySessionPersistence({ ...session, title: 'edit' })
    expect(fetchMock.mock.calls[1][0]).toBe('/api/sessions/' + session.id)
    const initial = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)), retried = JSON.parse(String(fetchMock.mock.calls[2][1]?.body))
    expect(retried.mutationId).toBe(initial.mutationId); expect(retried.expectedRevision).toBe(1)
  })
  it('recognizes a committed ACK after transport loss without writing again', async () => {
    const session = make(); let creationId: string
    fetchMock.mockImplementationOnce(async (_url, init) => { creationId = JSON.parse(String(init?.body)).creationId; throw new TypeError('ACK lost') })
      .mockImplementationOnce(async () => json({ session: { ...session, persistenceRevision: 1 }, ack: { mutationId: creationId, revision: 1 } }))
    await expect(persistSession(session)).rejects.toThrow('ACK lost')
    await expect(retrySessionPersistence(session)).resolves.toMatchObject({ id: session.id, persistenceRevision: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('rejects an invalid successful response instead of marking data saved', async () => {
    fetchMock.mockResolvedValue(json({ ok: true })); await expect(persistSession(make())).rejects.toThrow('confirmação')
  })
  it('sends an empty JSON object to the native workspace picker route', async () => {
    fetchMock.mockResolvedValueOnce(json({ workspace: null })); await expect(pickSessionWorkspace()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces/pick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  })
  it('preserves normal and forced deletion URL contracts', async () => {
    fetchMock.mockResolvedValue(json({ ok: true })); await removePersistedSession('session / one'); await removePersistedSession('session-2', true)
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual(['/api/sessions/session%20%2F%20one', '/api/sessions/session-2?force=true'])
    expect(fetchMock.mock.calls.every(c => c[1]?.method === 'DELETE' && c[1]?.body === '{}')).toBe(true)
  })
  it('never updates a previously created recovery copy with an older local snapshot after hydration', async () => {
    const copy = make(), creationId = randomUUID(), remote = { ...copy, title: 'edited elsewhere', persistenceRevision: 2 }
    resumeSessionPersistence(remote)
    fetchMock.mockResolvedValue(json({ session: remote, ack: { creationId, mutationId: randomUUID(), revision: 2 } }))
    await expect(persistRecoveryCopy(copy, creationId)).rejects.toMatchObject({ code: 'recovery_copy_changed' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined()
  })
  it('does not turn a stale queued snapshot into creation after deletion in this client', async () => {
    const session = make()
    fetchMock.mockResolvedValue(json({ ok: true }))
    await removePersistedSession(session.id)
    await expect(persistSession(session)).rejects.toMatchObject({ status: 410 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('P-B hydration diagnostics (SPEC §4)', () => {
  it('consumes partial hydration diagnostics without losing the confirmed base', async () => {
    const session = { ...make(), persistenceRevision: 4 }
    fetchMock.mockResolvedValueOnce(json({ sessions: [session], unavailable: [{ sessionId: 'outra-conversa', code: 'transcript_invalid', titulo: 'Conversa com problema' }], state: 'partial' }))
    const resultado = await loadPersistedSessions()
    expect(resultado.state).toBe('partial')
    expect(resultado.unavailable).toEqual([{ sessionId: 'outra-conversa', code: 'transcript_invalid', titulo: 'Conversa com problema' }])
    expect(resultado.sessions.map(item => item.id)).toEqual([session.id])
    // a base confirmada continua governando o esperado do próximo PUT
    fetchMock.mockImplementation((_url, init) => Promise.resolve(ack(init, 5)))
    await expect(persistSession({ ...session, title: 'editada' })).resolves.toMatchObject({ persistenceRevision: 5 })
    const enviado = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    expect(enviado.expectedRevision).toBe(4)
  })

  it('surfaces a total catalog failure as an error — never an empty success', async () => {
    fetchMock.mockResolvedValueOnce(json({ code: 'sessions_unavailable', message: 'Lista indisponível.' }, 503))
    await expect(loadPersistedSessions()).rejects.toMatchObject({ status: 503, code: 'sessions_unavailable' })
  })
})
