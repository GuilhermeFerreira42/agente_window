import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickSessionWorkspace, removePersistedSession } from './sessionsClient'

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
  it('sends an empty JSON object to the native workspace picker route', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ workspace: null }))

    await expect(pickSessionWorkspace()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/workspaces/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
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
