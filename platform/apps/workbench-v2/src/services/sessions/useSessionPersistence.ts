import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '../../types'
import { isSessionDirty, loadPersistedSession, persistSession, persistRecoveryCopy, persistSessionNoUnload, resumeSessionPersistence, retrySessionPersistence, sessionFingerprint, SessionPersistenceError } from './sessionsClient'
import { createRecoveryCopy, readSessionRecoveries, removeSessionRecovery, storeSessionRecovery } from './sessionRecovery'

type Kind = 'unavailable' | 'conflict' | 'local'
interface PersistenceIssue { message: string; backupAvailable: boolean; kind?: Kind }
export interface SessionPersistenceIssue extends PersistenceIssue { session: Session }
type Recovered = (copy: Session, source: Session, savedSource: Session | undefined) => void
type Task = { copy: Session; creationId: string; source: string; saved?: Session; diverged?: boolean }

export function useSessionPersistence(sessions: Session[], hydrated: boolean, onRecovered: Recovered) {
  const latest = useRef(sessions); latest.current = sessions
  const callback = useRef(onRecovered); callback.current = onRecovered
  const [issues, setIssues] = useState<Record<string, PersistenceIssue>>(() => Object.fromEntries(readSessionRecoveries()
    .map(({ session, message, kind }) => [session.id, { message, kind: kind ?? 'conflict', backupAvailable: true }])))
  const issuesRef = useRef(issues)
  const tasks = useRef(new Map<string, Task>())
  const [recovering, setRecovering] = useState<string>()
  const busy = useRef(false)
  const updateIssue = useCallback((id: string, issue?: PersistenceIssue) => {
    const previous = issuesRef.current[id]
    if ((!issue && !previous) || (issue && previous && issue.kind === previous.kind
      && issue.message === previous.message && issue.backupAvailable === previous.backupAvailable)) return
    const next = { ...issuesRef.current }; if (issue) next[id] = issue; else delete next[id]
    issuesRef.current = next; setIssues(next)
  }, [])
  const failure = useCallback((session: Session, error: unknown) => {
    const kind: Kind = error instanceof SessionPersistenceError && [404, 409, 410].includes(error.status) ? 'conflict' : 'unavailable'
    const message = kind === 'conflict' ? 'A versão salva mudou ou não está mais disponível. Suas alterações locais foram preservadas.' : 'Não foi possível confirmar a gravação. Mantenha esta janela aberta e tente novamente.'
    const backupAvailable = storeSessionRecovery({ session, message, kind })
    updateIssue(session.id, { message, kind, backupAvailable })
  }, [updateIssue])
  const clean = useCallback((source: Session) => {
    const current = latest.current.find(s => s.id === source.id)
    if (!current || sessionFingerprint(current) !== sessionFingerprint(source)) return
    try { removeSessionRecovery(source.id); updateIssue(source.id) } catch {
      updateIssue(source.id, { kind: 'local', message: 'Conversa salva no servidor; não foi possível limpar o backup local.', backupAvailable: true })
    }
  }, [updateIssue])

  useEffect(() => {
    if (!hydrated) return
    for (const session of sessions) {
      if (session.isDraft || (!isSessionDirty(session) && !issuesRef.current[session.id])) continue
      let issue = issuesRef.current[session.id]
      if (issue?.kind === 'local' && isSessionDirty(session)) {
        issue = { ...issue, kind: 'unavailable', message: 'Existem novas edições ainda não confirmadas. Tente salvar novamente.' }
        updateIssue(session.id, issue)
      }
      storeSessionRecovery({ session, message: issue?.message ?? 'Gravação em andamento.', kind: issue?.kind ?? 'unavailable' })
    }
    const timer = window.setTimeout(() => {
      for (const session of sessions.filter(s => !s.isDraft && !issuesRef.current[s.id] && isSessionDirty(s))) {
        void persistSession(session).then(() => clean(session)).catch(error => {
          const current = latest.current.find(s => s.id === session.id); if (current) failure(current, error)
        })
      }
    }, 150)
    const unload = () => {
      for (const session of latest.current.filter(s => !s.isDraft && isSessionDirty(s))) {
        storeSessionRecovery({ session, message: 'Gravação não confirmada.', kind: issuesRef.current[session.id]?.kind ?? 'unavailable' })
        if (!issuesRef.current[session.id]) persistSessionNoUnload(session)
      }
    }
    window.addEventListener('pagehide', unload)
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', unload) }
  }, [sessions, hydrated, clean, failure, updateIssue])

  const retry = useCallback(async (id: string) => {
    if (busy.current) return
    const source = latest.current.find(s => s.id === id); if (!source) return
    busy.current = true; setRecovering(id)
    try {
      const task = tasks.current.get(id)
      if (task?.saved && issuesRef.current[id]?.kind !== 'local') {
        const remote = (await loadPersistedSession(id)).session
        if (sessionFingerprint(source) !== task.source) throw new SessionPersistenceError('Existem edições posteriores à cópia. Salve outra cópia ou recarregue a versão salva.', 409, 'stale_session_snapshot')
        resumeSessionPersistence(remote); callback.current(task.saved, source, remote)
      } else if (issuesRef.current[id]?.kind !== 'local' || isSessionDirty(source)) await retrySessionPersistence(source)
      clean(source)
    } catch (error) { failure(latest.current.find(s => s.id === id) ?? source, error) }
    finally { busy.current = false; setRecovering(undefined) }
  }, [clean, failure])

  const reload = useCallback(async (id: string) => {
    if (busy.current) return
    const source = latest.current.find(s => s.id === id); if (!source) return
    if (!window.confirm('Recarregar a versão salva substituirá as edições locais desta conversa. Salve uma cópia antes se quiser mantê-las. Continuar?')) return
    busy.current = true; setRecovering(id)
    try {
      const remote = await loadPersistedSession(id)
      if (sessionFingerprint(latest.current.find(s => s.id === id) ?? source) !== sessionFingerprint(source)) throw new Error('A conversa mudou durante o carregamento. Tente novamente.')
      resumeSessionPersistence(remote.session)
      callback.current(remote.session, source, remote.session)
      try { removeSessionRecovery(id); updateIssue(id) } catch { updateIssue(id, { kind: 'local', message: 'Versão salva carregada; não foi possível limpar o backup local.', backupAvailable: true }) }
    } catch (error) { failure(source, error) }
    finally { busy.current = false; setRecovering(undefined) }
  }, [failure, updateIssue])

  const recover = useCallback(async (id: string) => {
    if (busy.current) return
    const source = latest.current.find(s => s.id === id)
    if (!source || source.chats.some(c => c.messages.some(m => m.running))) return
    busy.current = true; setRecovering(id)
    let task = tasks.current.get(id)
    if (task?.diverged || (task?.saved && sessionFingerprint(source) !== task.source)) task = undefined
    if (!task) {
      const stored = tasks.current.has(id) ? undefined : readSessionRecoveries().find(r => r.session.id === id)?.recovery
      task = { copy: stored?.copy ?? createRecoveryCopy(source), creationId: stored?.creationId ?? crypto.randomUUID(), source: stored?.source ?? sessionFingerprint(source) }
      tasks.current.set(id, task)
    }
    try {
      storeSessionRecovery({ session: source, message: 'Cópia em recuperação.', kind: issuesRef.current[id]?.kind, recovery: task })
      if (!task.saved) task.saved = await persistRecoveryCopy(task.copy, task.creationId)
      // The copy ACK becomes visible before either origin lookup or local cleanup.
      callback.current(task.saved, source, undefined)
      let remote: Session | undefined
      try { remote = (await loadPersistedSession(id)).session } catch { /* Keep the confirmed copy visible. */ }
      const current = latest.current.find(s => s.id === id)
      if (current && sessionFingerprint(current) === task.source && remote) {
        resumeSessionPersistence(remote); callback.current(task.saved, source, remote)
        try { removeSessionRecovery(id); updateIssue(id); tasks.current.delete(id) } catch {
          updateIssue(id, { kind: 'local', message: 'Cópia salva; não foi possível limpar o backup local.', backupAvailable: true })
        }
      } else {
        const kind = remote ? 'conflict' : 'unavailable'
        updateIssue(id, { kind, message: 'Cópia salva. O original local continua aqui com edições adicionais ou sem confirmação da versão salva.', backupAvailable: storeSessionRecovery({ session: current ?? source, message: 'Cópia salva; original local preservado.', kind, recovery: task }) })
      }
    } catch (error) {
      if (error instanceof SessionPersistenceError && error.code === 'recovery_copy_changed') task.diverged = true
      failure(latest.current.find(s => s.id === id) ?? source, error)
    }
    finally { busy.current = false; setRecovering(undefined) }
  }, [failure, updateIssue])
  return { issues: sessions.filter(s => issues[s.id]).map((session): SessionPersistenceIssue => ({ session, ...issues[session.id] })), recovering, recover, retry, reload }
}
