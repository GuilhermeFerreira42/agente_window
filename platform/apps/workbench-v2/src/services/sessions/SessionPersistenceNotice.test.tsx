import { useEffect, useState } from 'react'
import { assertWorkbenchInvariants } from '../../domain/sessionState'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '../../types'
import { SessionPersistenceNotice } from './SessionPersistenceNotice'
import { useSessionPersistence } from './useSessionPersistence'
import { readSessionRecoveries, restoreUnsavedSessions, storeSessionRecovery, createRecoveryCopy, mergeRecoveredSessions } from './sessionRecovery'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
let local: Session
let remote: Session
let saved: Map<string, Session>
let failCopy: boolean
let copyGate: (() => Promise<void>) | undefined
const requests = vi.fn<typeof fetch>()

function Harness({ initial = [local] }: { initial?: Session[] }) {
  const [sessions, setSessions] = useState(initial)
  const [active, setActive] = useState(initial[0].id)
  const [chatMap, setChatMap] = useState(Object.fromEntries(initial.map(s => [s.id, s.mainChatId])))
  const persistence = useSessionPersistence(sessions, true, (copy, source, canonical) => {
    setSessions(current => mergeRecoveredSessions(current, copy, source, canonical))
    setActive(copy.id)
    setChatMap(current => ({ ...current, [copy.id]: copy.mainChatId }))
  })
  useEffect(() => assertWorkbenchInvariants(sessions, [], [], active, chatMap), [sessions, active, chatMap])
  return <>
    <SessionPersistenceNotice {...persistence} onRecover={persistence.recover} onRetry={persistence.retry} onReload={persistence.reload} />
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
    if (!init?.method) {
      if (String(_input).startsWith('/api/sessions/')) {
        const session = saved.get(decodeURIComponent(String(_input).split('/').at(-1)!))
        return session ? json({ session }) : json({ code: 'session_not_found' }, 404)
      }
      return json({ sessions: [...saved.values()] })
    }
    const { session, creationId, mutationId, expectedRevision } = JSON.parse(String(init.body))
    if (session.id !== local.id) {
      await copyGate?.()
      if (failCopy) return json({ message: 'injected failure' }, 500)
    }
    const existing = saved.get(session.id)
    if (existing && (init.method === 'POST' || expectedRevision !== existing.persistenceRevision)) {
      return json({ code: 'stale_session_snapshot', currentRevision: existing.persistenceRevision }, 409)
    }
    const revision = (existing?.persistenceRevision ?? 0) + 1
    const committed = { ...session, persistenceRevision: revision }
    saved.set(session.id, committed)
    return json({ sessionId: session.id, mutationId: mutationId ?? creationId, revision, session: committed })
  })
  vi.stubGlobal('fetch', requests)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('visible persistence conflicts and safe recovery', () => {
  it('preserves authoritative operational review when recovering unsaved local content', () => {
    remote.chats[0].revisaoOperacional = true
    expect(storeSessionRecovery({ session: local, message: 'Local unsaved content' })).toBe(true)
    const restored = restoreUnsavedSessions([remote])[0]
    expect(restored.chats[0].messages[0].content).toBe('UNSAVED_AFTER_409')
    expect(restored.chats[0].revisaoOperacional).toBe(true)
    expect(createRecoveryCopy(restored).chats[0].revisaoOperacional).not.toBe(true)
    remote.chats[0].revisaoOperacional = undefined
    expect(restoreUnsavedSessions([remote])[0].chats[0].revisaoOperacional).not.toBe(true)
  })
  it('keeps transient command content out of the browser recovery storage', () => {
    Object.assign(local, { unknown: 'FIXTURE_SESSION_FIELD', approval: 'FIXTURE_APPROVAL' })
    Object.assign(local.chats[0], { unknown: 'FIXTURE_CHAT_FIELD', approval: 'FIXTURE_CHAT_APPROVAL' })
    local.chats[0].messages.push({
      id: 'running-response', role: 'assistant', content: '', time: '10:00', running: true,
      ferramentas: [{ id: 'FIXTURE_PROVIDER_ID', ferramenta: 'executar', alvo: 'FIXTURE_COMMAND', status: 'executando', progresso: 'FIXTURE_STDOUT' }],
    })
    expect(storeSessionRecovery({ session: local, message: 'FIXTURE_ERROR_DETAILS' })).toBe(true)
    expect(JSON.stringify(Object.values(localStorage))).not.toContain('FIXTURE_')
    const restored = restoreUnsavedSessions([])[0].chats[0].messages[1]
    expect(restored).toMatchObject({ running: false, cancelled: true, ferramentas: [{ id: 'persistida-0', alvo: 'Comando' }] })
    expect(local.chats[0].messages[1].ferramentas?.[0].progresso).toBe('FIXTURE_STDOUT')
  })

  it('marks UNSAVED_AFTER_409, keeps edits and blocks debounce/pagehide from overwriting the server', async () => {
    render(<Harness />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Conversa não salva')
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
    expect(screen.getByRole('alert')).toHaveTextContent('Conversa não salva')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 200)) })
    expect(requests).not.toHaveBeenCalled()
  })

  it('saves local content as a separate conversation and keeps remote messages and IDs intact', async () => {
    render(<Harness />)
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar uma cópia separada' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    const copy = [...saved.values()].find((session) => session.id !== local.id)!
    expect(copy.chats).toEqual(local.chats)
    expect(copy.title).toContain('(cópia recuperada)')
    expect(saved.get(local.id)?.chats).toEqual(remote.chats)
    expect(screen.getByTestId('local-state')).toHaveTextContent('SERVER_NEWER_SNAPSHOT')
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
    expect(screen.getByTestId('local-state')).toHaveTextContent('(cópia recuperada)')
    expect(readSessionRecoveries()).toEqual([])
  })

  it('retains the local snapshot and warning when recovery fails', async () => {
    failCopy = true
    render(<Harness />)
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar uma cópia separada' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível confirmar'))
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
    expect(saved.get(local.id)).toEqual(remote)
    expect(readSessionRecoveries()).toHaveLength(1)
  })

  it('does not discard edits made while the recovery copy is being saved', async () => {
    let release!: () => void
    copyGate = () => new Promise<void>((resolve) => { release = resolve })
    render(<Harness />)
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar uma cópia separada' }))
    await waitFor(() => expect(release).toBeTypeOf('function'))
    await userEvent.click(screen.getByText('Edit local'))
    await act(async () => release())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar uma cópia separada' })).toBeEnabled())
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByTestId('local-state')).toHaveTextContent('EDIT_DURING_RECOVERY')
    expect(readSessionRecoveries()[0].session.chats[0].messages.at(-1)?.id).toBe('edited-while-recovering')
    expect(saved.get(local.id)).toEqual(remote)
  })

  it('warns explicitly when browser storage cannot preserve the local backup', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota exceeded') })
    render(<Harness />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Backup do navegador indisponível')
    expect(screen.getByTestId('local-state')).toHaveTextContent('UNSAVED_AFTER_409')
  })

  it('retries a transient failure in the same conversation after consulting its base', async () => {
    saved.set(local.id, local)
    requests.mockImplementationOnce(async () => json({}, 500))
    render(<Harness />)
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(saved.size).toBe(1)
    expect(saved.get(local.id)?.persistenceRevision).toBe(2)
  })

  it('keeps one copy identity after the server accepts it but its ACK is lost', async () => {
    const receipts = new Map<string, { mutationId: string; revision: number }>()
    const original = requests.getMockImplementation()!
    let lose = true
    requests.mockImplementation(async (input, init) => {
      if (!init?.method && String(input).startsWith('/api/sessions/')) {
        const id = decodeURIComponent(String(input).split('/').at(-1)!)
        return saved.has(id) ? json({ session: saved.get(id), ack: receipts.get(id) }) : json({}, 404)
      }
      const response = await original(input, init)
      if (init?.method === 'POST' && response.ok) {
        const body = JSON.parse(String(init.body))
        receipts.set(body.session.id, { mutationId: body.creationId, revision: 1 })
        if (lose) { lose = false; throw new TypeError('lost ACK fixture') }
      }
      return response
    })
    render(<Harness />)
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar uma cópia separada' }))
    await waitFor(() => expect(saved.size).toBe(2))
    await userEvent.click(screen.getByRole('button', { name: 'Salvar uma cópia separada' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(saved.size).toBe(2)
    expect(requests.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1)
    expect(screen.getByTestId('local-state')).toHaveTextContent('SERVER_NEWER_SNAPSHOT')
  })

  it('shows the confirmed copy even when origin lookup and local cleanup are unavailable', async () => {
    const original = requests.getMockImplementation()!
    requests.mockImplementation(async (input, init) => {
      if (!init?.method && String(input).endsWith('/' + local.id)) return json({}, 503)
      return original(input, init)
    })
    render(<Harness />)
    await screen.findByRole('alert')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('fixture storage failure') })
    await userEvent.click(screen.getByRole('button', { name: 'Salvar uma cópia separada' }))
    await waitFor(() => expect(screen.getByTestId('local-state')).toHaveTextContent('(cópia recuperada)'))
    expect(saved.size).toBe(2)
    expect(screen.getByRole('alert')).toHaveTextContent('Cópia salva')
  })

  it('reloads only after confirmation and resumes from the server base', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Harness />)
    await userEvent.click(await screen.findByRole('button', { name: 'Recarregar versão salva' }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('local-state')).toHaveTextContent('SERVER_NEWER_SNAPSHOT')
    expect(screen.getByTestId('local-state')).not.toHaveTextContent('UNSAVED_AFTER_409')
  })
})
