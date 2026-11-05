import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../types'
import { SessionPersistenceNotice } from './SessionPersistenceNotice'
import { useSessionPersistence } from './useSessionPersistence'
import { readSessionRecoveries, restoreUnsavedSessions } from './sessionRecovery'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
let local: Session
let remote: Session
let saved: Map<string, Session>
let failCopy: boolean
let copyGate: (() => Promise<void>) | undefined
const requests = vi.fn<typeof fetch>()

function Harness({ initial = [local] }: { initial?: Session[] }) {
  const [sessions, setSessions] = useState(initial)
  const persistence = useSessionPersistence(sessions, true, (copy, source, canonical) => {
    setSessions((current) => [copy, ...current.flatMap((session) => session.id !== source.id
      || JSON.stringify(session) !== JSON.stringify(source) ? [session] : canonical ? [canonical] : [])])
  })
  return <>
    <SessionPersistenceNotice {...persistence} onRecover={persistence.recover} />
    <div data-testid="local-state">{JSON.stringify(sessions)}</div>
    <button onClick={() => setSessions((current) => current.map((session) => session.id === local.id ? {
      ...session, chats: session.chats.map((chat) => ({ ...chat, messages: [...chat.messages,
        { id: 'edited-while-recovering', role: 'user' as const, content: 'EDIT_DURING_RECOVERY', time: '10:00' }] })),
    } : session))}>Edit local</button>
  </>
}

beforeEach(() => {
  localStorage.clear()
  local = {
    id: crypto.randomUUID(), slug: 'synthetic', title: 'Conflict test', workspace: 'synthetic', workspacePath: 'C:/synthetic',
    section: 'today', status: 'completed', updated: 'now', diffAdded: 0, diffRemoved: 0, branch: null,
    persistenceRevision: 1, mainChatId: 'main', chats: [{ id: 'main', title: 'Main', status: 'completed',
      messages: [{ id: 'local-message', role: 'user', content: 'UNSAVED_AFTER_409', time: '10:00' }] }],
  }
  remote = { ...local, persistenceRevision: 50, chats: [{ ...local.chats[0],
    messages: [{ id: 'remote-message', role: 'assistant', content: 'SERVER_NEWER_SNAPSHOT', time: '10:00' }] }] }
  saved = new Map([[remote.id, remote]])
  failCopy = false
  copyGate = undefined
  requests.mockReset()
  requests.mockImplementation(async (_input, init) => {
    if (init?.method !== 'PUT') return json({ sessions: [...saved.values()] })
    const { session } = JSON.parse(String(init.body)) as { session: Session }
    if (session.id !== local.id) {
      await copyGate?.()
      if (failCopy) return json({ message: 'injected failure' }, 500)
    }
    const existing = saved.get(session.id)
    if (existing && (session.persistenceRevision ?? 0) <= (existing.persistenceRevision ?? 0)) {
      return json({ code: 'stale_session_snapshot', currentRevision: existing.persistenceRevision }, 409)
    }
    saved.set(session.id, session)
    return json({ persistenceRevision: session.persistenceRevision })
  })
  vi.stubGlobal('fetch', requests)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('visible persistence conflicts and safe recovery', () => {
  it('marks UNSAVED_AFTER_409, keeps edits and blocks debounce/pagehide from overwriting the server', async () => {
    render(<Harness />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsaved conversation')
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
    await userEvent.click(screen.getByText('Edit local'))
    fireEvent(window, new Event('pagehide'))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)) })
    expect(requests).toHaveBeenCalledTimes(1)
    expect(saved.get(local.id)).toEqual(remote)
    expect(readSessionRecoveries()[0].session.chats[0].messages.at(-1)?.content).toBe('EDIT_DURING_RECOVERY')
  })

  it('restores the rejected content and warning after reload, without uploading it', async () => {
    const view = render(<Harness />)
    await screen.findByRole('alert')
    view.unmount()
    const restored = restoreUnsavedSessions([remote])
    expect(restored[0].chats[0].messages[0].content).toBe('UNSAVED_AFTER_409')
    requests.mockClear()
    render(<Harness initial={restored} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Unsaved conversation')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)) })
    expect(requests).not.toHaveBeenCalled()
  })

  it('saves local content as a separate conversation and keeps remote messages and IDs intact', async () => {
    render(<Harness />)
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Save a separate copy' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    const copy = [...saved.values()].find((session) => session.id !== local.id)!
    expect(copy.chats).toEqual(local.chats)
    expect(copy.title).toContain('(recovered copy)')
    expect(saved.get(local.id)?.chats).toEqual(remote.chats)
    expect(screen.getByTestId('local-state')).toHaveTextContent('SERVER_NEWER_SNAPSHOT')
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
    expect(readSessionRecoveries()).toEqual([])
  })

  it('retains the local snapshot and warning when recovery fails', async () => {
    failCopy = true
    render(<Harness />)
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Save a separate copy' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Recovery could not finish'))
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
    expect(saved.get(local.id)).toEqual(remote)
    expect(readSessionRecoveries()).toHaveLength(1)
  })

  it('does not discard edits made while the recovery copy is being saved', async () => {
    let release!: () => void
    copyGate = () => new Promise<void>((resolve) => { release = resolve })
    render(<Harness />)
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Save a separate copy' }))
    await waitFor(() => expect(release).toBeTypeOf('function'))
    await userEvent.click(screen.getByText('Edit local'))
    await act(async () => release())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save a separate copy' })).toBeEnabled())
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('local-state')).toHaveTextContent('EDIT_DURING_RECOVERY')
    expect(readSessionRecoveries()[0].session.chats[0].messages.at(-1)?.id).toBe('edited-while-recovering')
    expect(saved.get(local.id)).toEqual(remote)
  })

  it('warns explicitly when browser storage cannot preserve the local backup', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded') })
    render(<Harness />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Browser backup is unavailable')
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
  })
})
