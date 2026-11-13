import { afterEach, expect, it, vi } from 'vitest'
import { testSessions } from '../../__tests__/fixtures/sessions'
import { mergeHydratedSessions, restoreUnsavedSessions, storeSessionRecovery } from './sessionRecovery'
import { persistSession, resumeSessionPersistence } from './sessionsClient'

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })

it('retains drafts and newly edited local sessions when delayed hydration finishes', () => {
  const draft = { ...testSessions[0], id: crypto.randomUUID(), isDraft: true }
  const edit = { ...testSessions[0], id: crypto.randomUUID(), title: 'edit while loading' }
  const remote = { ...edit, title: 'older remote' }
  const other = { ...testSessions[0], id: crypto.randomUUID() }
  expect(mergeHydratedSessions([draft, edit], [remote, other])).toEqual([draft, edit, other])
})

it('does not grant a new remote base to a divergent backup after reload', async () => {
  const local = { ...testSessions[0], id: crypto.randomUUID(), persistenceRevision: 1 }
  const remote = { ...local, title: 'remote changed', persistenceRevision: 2 }
  resumeSessionPersistence(local)
  storeSessionRecovery({ session: local, message: 'fixture', kind: 'unavailable' })
  restoreUnsavedSessions([remote])
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  await expect(persistSession(local)).rejects.toMatchObject({ status: 409 })
  expect(fetcher).not.toHaveBeenCalled()
})
