import type { Session } from '../../types'
import { projetarSessaoPersistida } from '../../domain/projecaoTranscript'

export class SessionPersistenceError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = 'SessionPersistenceError' }
}
export async function expectOk(response: Response): Promise<Response> {
  if (response.ok) return response
  const body = await response.json().catch(() => ({})) as { message?: string; code?: string }
  throw new SessionPersistenceError(body.message ?? `Não foi possível salvar a conversa (${response.status}).`, response.status, body.code)
}

export const sessionFingerprint = (session: Session) => JSON.stringify({ ...projetarSessaoPersistida(session), persistenceRevision: undefined })
type Waiter = { resolve: (session: Session) => void; reject: (error: unknown) => void }
type Batch = { session: Session; waiters: Waiter[]; keepalive: boolean }
type Operation = { session: Session; fingerprint: string; mutationId: string; expectedRevision?: number; create: boolean; keepalive: boolean }
type State = { revision?: number; fingerprint?: string; creationId: string; current?: Promise<void>; pending?: Batch; uncertain?: Operation; held?: SessionPersistenceError }
const states = new Map<string, State>()
function state(session: Session): State {
  let value = states.get(session.id)
  if (!value) {
    value = { creationId: /^[0-9a-f-]{36}$/.test(session.id) ? session.id : crypto.randomUUID(), revision: (session.persistenceRevision ?? 0) > 0 ? session.persistenceRevision : undefined }
    states.set(session.id, value)
  }
  return value
}
function accept(session: Session, operation: Operation): Session {
  const value = state(operation.session)
  value.revision = session.persistenceRevision
  value.fingerprint = operation.fingerprint
  value.uncertain = undefined
  return session
}
async function send(operation: Operation): Promise<Session> {
  const response = await expectOk(await fetch('/api/sessions', {
    method: operation.create ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: operation.session, ...(operation.create ? { creationId: operation.mutationId }
      : { expectedRevision: operation.expectedRevision, mutationId: operation.mutationId }) }),
    ...(operation.keepalive ? { keepalive: true } : {}),
  }))
  const ack = await response.json() as { sessionId: string; mutationId: string; revision: number; session: Session }
  if (ack.sessionId !== operation.session.id || ack.mutationId !== operation.mutationId
    || !Number.isSafeInteger(ack.revision) || ack.revision < 1 || ack.session?.id !== ack.sessionId
    || ack.session.persistenceRevision !== ack.revision) throw new Error('A confirmação de gravação é inválida. Preserve esta janela e tente consultar o estado novamente.')
  return accept(ack.session, operation)
}
function classify(value: State, operation: Operation, error: unknown): void {
  if (error instanceof SessionPersistenceError && [400, 404, 409, 410, 413].includes(error.status)) value.held = error
  else value.uncertain = operation
}
async function drain(value: State): Promise<void> {
  while (value.pending) {
    const batch = value.pending; value.pending = undefined
    const operation: Operation = { session: batch.session, fingerprint: sessionFingerprint(batch.session),
      mutationId: value.revision === undefined ? value.creationId : crypto.randomUUID(),
      create: value.revision === undefined, expectedRevision: value.revision, keepalive: batch.keepalive }
    try {
      const saved = operation.fingerprint === value.fingerprint ? { ...batch.session, persistenceRevision: value.revision } : await send(operation)
      batch.waiters.forEach(w => w.resolve(saved))
    } catch (error) {
      classify(value, operation, error)
      batch.waiters.forEach(w => w.reject(error))
      const pending = value.pending as Batch | undefined
      pending?.waiters.forEach(w => w.reject(error)); value.pending = undefined
      return
    }
  }
}
export function persistSession(session: Session, options?: { creationId?: string; keepalive?: boolean }): Promise<Session> {
  const value = state(session)
  if (value.held) return Promise.reject(value.held)
  if (value.uncertain) return Promise.reject(new SessionPersistenceError('O resultado da gravação ainda precisa ser consultado. Tente novamente nesta conversa.', 503, 'session_save_uncertain'))
  if (options?.creationId) value.creationId = options.creationId
  return new Promise((resolve, reject) => {
    const waiters = [...(value.pending?.waiters ?? []), { resolve, reject }]
    value.pending = { session: structuredClone(session), keepalive: options?.keepalive ?? false, waiters }
    if (!value.current) {
      // Schedule after assigning current; even an already-clean batch cannot race admission.
      start(value)
    }
  })
}
export function persistSessionNoUnload(session: Session): void { void persistSession(session, { keepalive: true }).catch(() => undefined) }
function start(value: State): void {
  value.current = Promise.resolve().then(() => drain(value)).finally(() => {
    value.current = undefined
    if (value.pending) start(value)
  })
}
export function isSessionDirty(session: Session): boolean { return state(session).fingerprint !== sessionFingerprint(session) }
export function confirmedRecoveryRevision(id: string): number | undefined { const value = states.get(id); return value?.held ? undefined : value?.revision }
export function resumeSessionPersistence(session: Session): void {
  const value = state(session)
  value.revision = session.persistenceRevision ?? 0; value.fingerprint = sessionFingerprint(session)
  value.held = undefined; value.uncertain = undefined
}
export function holdSessionPersistence(sessionId: string): void {
  const value = states.get(sessionId) ?? { creationId: crypto.randomUUID() }
  value.held = new SessionPersistenceError('Há edições locais a recuperar. Recarregue a versão salva ou salve uma cópia.', 409, 'stale_session_snapshot')
  states.set(sessionId, value)
}
export interface SessaoIndisponivel { sessionId: string; code: string }
/** SPEC §4 — healthy sessions plus per-item diagnostics; total failure stays a 503. */
export interface ResultadoHidratacao { sessions: Session[]; unavailable: SessaoIndisponivel[]; state: 'ok' | 'partial' }
export async function loadPersistedSessions(signal?: AbortSignal): Promise<ResultadoHidratacao> {
  const response = await expectOk(await fetch('/api/sessions', { signal }))
  const body = await response.json() as Partial<ResultadoHidratacao>
  const sessions = Array.isArray(body.sessions) ? body.sessions : []
  const unavailable = (Array.isArray(body.unavailable) ? body.unavailable : [])
    .filter((item): item is SessaoIndisponivel => typeof item?.sessionId === 'string' && typeof item?.code === 'string')
  const state: ResultadoHidratacao['state'] = body.state === 'partial' || unavailable.length > 0 ? 'partial' : 'ok'
  for (const session of sessions) {
    const value = states.get(session.id)
    // A list refresh cannot grant a newer base to unsent local edits. Only a
    // new identity, an explicit reload or a matching ACK can establish it.
    if (!value) resumeSessionPersistence(session)
  }
  return { sessions, unavailable, state }
}
export async function loadPersistedSession(id: string): Promise<{ session: Session; ack?: { mutationId: string; revision: number; creationId?: string; creationRevision?: number } }> {
  const response = await expectOk(await fetch(`/api/sessions/${encodeURIComponent(id)}`))
  return response.json()
}
export async function persistRecoveryCopy(copy: Session, creationId: string): Promise<Session> {
  let remote: Awaited<ReturnType<typeof loadPersistedSession>> | undefined
  try { remote = await loadPersistedSession(copy.id) } catch (error) {
    if (!(error instanceof SessionPersistenceError && error.status === 404)) throw error
  }
  if (remote) {
    if ((remote.ack?.creationId !== creationId && remote.ack?.mutationId !== creationId)
      || sessionFingerprint(remote.session) !== sessionFingerprint(copy)) {
      throw new SessionPersistenceError('A cópia confirmada foi alterada. Suas edições continuam no original local; salve outra cópia.', 409, 'recovery_copy_changed')
    }
    resumeSessionPersistence(remote.session)
    return remote.session
  }
  const value = state(copy)
  if (value.revision !== undefined) throw new SessionPersistenceError('A cópia não está mais disponível. Salve outra cópia para preservar estas edições.', 409, 'recovery_copy_changed')
  if (value.uncertain) return retrySessionPersistence(copy)
  return persistSession(copy, { creationId })
}
export async function retrySessionPersistence(session: Session): Promise<Session> {
  const value = state(session)
  if (value.current) await value.current
  if (value.held) throw value.held
  const operation = value.uncertain
  if (operation) {
    try {
      let remote: Awaited<ReturnType<typeof loadPersistedSession>> | undefined
      try { remote = await loadPersistedSession(session.id) } catch (error) {
        if (!(operation.create && error instanceof SessionPersistenceError && error.status === 404)) throw error
      }
      if (remote?.ack?.mutationId === operation.mutationId) accept({ ...operation.session, persistenceRevision: remote.ack.revision }, operation)
      else if (operation.create && remote?.ack?.creationId === operation.mutationId) accept({ ...operation.session, persistenceRevision: remote.ack.creationRevision }, operation)
      else if ((!remote && operation.create) || (!operation.create && remote?.session.persistenceRevision === operation.expectedRevision)) await send(operation)
      else throw new SessionPersistenceError('A versão salva mudou durante a tentativa. Suas alterações locais estão preservadas.', 409, 'stale_session_snapshot')
    } catch (error) { classify(value, operation, error); throw error }
  }
  return persistSession(session)
}
export function forgetSessionPersistence(id: string): void {
  const value = states.get(id) ?? { creationId: crypto.randomUUID() }
  const error = new SessionPersistenceError('Esta conversa foi excluída neste cliente.', 410, 'session_deleted')
  value.held = error
  value.pending?.waiters.forEach(waiter => waiter.reject(error)); value.pending = undefined
  states.set(id, value)
}
