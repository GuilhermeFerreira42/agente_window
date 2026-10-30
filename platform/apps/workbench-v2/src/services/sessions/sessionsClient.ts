import type { Session } from '../../types'

const SESSIONS_ENDPOINT = '/api/sessions'
const persistenceRevisions = new Map<string, number>()
const acknowledgedRevisions = new Map<string, number>()
const conflicts = new Map<string, { error: SessionPersistenceError; revision: number }>()

function withNextPersistenceRevision(session: Session): Session {
  const savedRevision = Number.isSafeInteger(session.persistenceRevision) && (session.persistenceRevision ?? -1) >= 0
    ? session.persistenceRevision ?? 0
    : 0
  const localRevision = persistenceRevisions.get(session.id) ?? 0
  const revision = Math.max(savedRevision, localRevision) + 1
  if (!Number.isSafeInteger(revision)) throw new Error(`Persistence revision exhausted for session ${session.id}`)
  persistenceRevisions.set(session.id, revision)
  return { ...session, persistenceRevision: revision }
}

export class SessionPersistenceError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message)
    this.name = 'SessionPersistenceError'
  }
}

async function expectOk(response: Response): Promise<Response> {
  if (response.ok) return response
  let message = `Session persistence request failed (${response.status})`
  let code: string | undefined
  try {
    const body = await response.json() as { message?: string; code?: string }
    if (body.message) message = body.message
    code = body.code
  } catch { /* response without JSON */ }
  throw new SessionPersistenceError(message, response.status, code)
}

export async function loadPersistedSessions(signal?: AbortSignal): Promise<Session[]> {
  const response = await expectOk(await fetch(SESSIONS_ENDPOINT, { signal }))
  const body = await response.json() as { sessions: Session[] }
  return body.sessions
}

/** Resume only after explicitly replacing the local snapshot with server data. */
export function resumeSessionPersistence(session: Session): void {
  conflicts.delete(session.id)
  persistenceRevisions.set(session.id, Math.max(persistenceRevisions.get(session.id) ?? 0, session.persistenceRevision ?? 0))
}

export function holdSessionPersistence(sessionId: string): void {
  conflicts.set(sessionId, {
    error: new SessionPersistenceError('This conversation has unsaved changes. Save a separate copy to recover them.', 409, 'stale_session_snapshot'),
    revision: Number.MAX_SAFE_INTEGER,
  })
}

async function sendSession(session: Session, keepalive = false): Promise<void> {
  const held = conflicts.get(session.id)
  if (held) throw held.error
  const versionedSession = withNextPersistenceRevision(session)
  const rawResponse = await fetch(SESSIONS_ENDPOINT, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: versionedSession }),
    ...(keepalive ? { keepalive: true } : {}),
  })
  if (rawResponse.status === 409) {
    const conflict = await rawResponse.clone().json().catch(() => undefined) as { currentRevision?: number; code?: string; message?: string } | undefined
    if (conflict && Number.isSafeInteger(conflict.currentRevision) && (conflict.currentRevision ?? -1) >= 0) {
      persistenceRevisions.set(session.id, Math.max(persistenceRevisions.get(session.id) ?? 0, conflict.currentRevision ?? 0))
    }
    if (conflict?.code === 'stale_session_snapshot') {
      const current = Number.isSafeInteger(conflict.currentRevision) && (conflict.currentRevision ?? -1) >= 0
        ? conflict.currentRevision! : Number.MAX_SAFE_INTEGER
      const acknowledged = acknowledgedRevisions.get(session.id) ?? -1
      // A rejected older request is obsolete only when a later LOCAL request
      // is already confirmed. A remote revision alone never authorizes retry.
      if (acknowledged > versionedSession.persistenceRevision! && acknowledged >= current) return
      const error = new SessionPersistenceError(conflict.message ?? 'A newer conversation is already saved.', 409, conflict.code)
      conflicts.set(session.id, { error, revision: current })
      throw error
    }
  }
  const response = await expectOk(rawResponse)
  const body = await response.json().catch(() => undefined) as { persistenceRevision?: number } | undefined
  const confirmed = body && Number.isSafeInteger(body.persistenceRevision) && (body.persistenceRevision ?? -1) >= 0
    ? body.persistenceRevision! : versionedSession.persistenceRevision!
  persistenceRevisions.set(session.id, Math.max(persistenceRevisions.get(session.id) ?? 0, confirmed))
  const acknowledged = Math.max(acknowledgedRevisions.get(session.id) ?? 0, confirmed)
  acknowledgedRevisions.set(session.id, acknowledged)
  const conflict = conflicts.get(session.id)
  if (conflict && acknowledged >= conflict.revision) conflicts.delete(session.id)
}

export async function persistSession(session: Session): Promise<void> {
  return sendSession(session)
}

/** Best-effort pagehide delivery. A known conflict must never be relabeled
 * with a higher revision and sent over the server's newer snapshot. */
export function persistSessionNoUnload(session: Session): void {
  void sendSession(session, true).catch(() => undefined)
}

export interface WorkspaceDescriptor { path: string; slug: string; name: string; isGit: boolean }
export interface WorkspaceDirectoryEntry { name: string; path: string; isDir: true }
export interface WorkspaceDirectoryListing { path: string; realpath: string; parent: string; folders: WorkspaceDirectoryEntry[]; error?: string }
export interface CreatedWorktree { slug: string; path: string | null; branch: string | null; repoRoot: string }

export async function validateSessionWorkspace(path: string): Promise<WorkspaceDescriptor> {
  const response = await expectOk(await fetch('/api/workspaces/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }),
  }))
  return ((await response.json()) as { workspace: WorkspaceDescriptor }).workspace
}

export async function pickSessionWorkspace(): Promise<WorkspaceDescriptor | undefined> {
  const response = await expectOk(await fetch('/api/workspaces/pick', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  }))
  return ((await response.json()) as { workspace: WorkspaceDescriptor | null }).workspace ?? undefined
}

export async function listSessionWorkspaceDirectories(path: string): Promise<WorkspaceDirectoryListing> {
  const response = await expectOk(await fetch(`/api/fs/list?path=${encodeURIComponent(path)}`))
  return response.json() as Promise<WorkspaceDirectoryListing>
}

export async function changeSessionWorkspace(sessionId: string, path: string): Promise<{ session: Session; workspace: WorkspaceDescriptor }> {
  const response = await expectOk(await fetch('/api/session/change-workspace', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, path }),
  }))
  return response.json() as Promise<{ session: Session; workspace: WorkspaceDescriptor }>
}

export async function createSessionWorktree(workspacePath: string, slug: string, sessionId: string, useWorktree = false): Promise<CreatedWorktree> {
  const response = await expectOk(await fetch('/api/worktrees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspacePath, slug, sessionId, useWorktree }),
  }))
  return ((await response.json()) as { worktree: CreatedWorktree }).worktree
}

export async function removePersistedSession(sessionId: string, force = false): Promise<void> {
  const query = force ? '?force=true' : ''
  await expectOk(await fetch(`${SESSIONS_ENDPOINT}/${encodeURIComponent(sessionId)}${query}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  }))
  persistenceRevisions.delete(sessionId)
  acknowledgedRevisions.delete(sessionId)
  conflicts.delete(sessionId)
}
