import type { Session } from '../../types'

const SESSIONS_ENDPOINT = '/api/sessions'

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

export async function persistSession(session: Session): Promise<void> {
  await expectOk(await fetch(SESSIONS_ENDPOINT, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session }),
  }))
}

export interface WorkspaceDescriptor { path: string; slug: string; name: string; isGit: boolean }
export interface CreatedWorktree { slug: string; path: string | null; branch: string | null; repoRoot: string }

export async function validateSessionWorkspace(path: string): Promise<WorkspaceDescriptor> {
  const response = await expectOk(await fetch('/api/workspaces/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }),
  }))
  return ((await response.json()) as { workspace: WorkspaceDescriptor }).workspace
}

export async function pickSessionWorkspace(): Promise<WorkspaceDescriptor | undefined> {
  const response = await expectOk(await fetch('/api/workspaces/pick', { method: 'POST' }))
  return ((await response.json()) as { workspace: WorkspaceDescriptor | null }).workspace ?? undefined
}

export async function createSessionWorktree(workspacePath: string, slug: string, sessionId: string, useWorktree = false): Promise<CreatedWorktree> {
  const response = await expectOk(await fetch('/api/worktrees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspacePath, slug, sessionId, useWorktree }),
  }))
  return ((await response.json()) as { worktree: CreatedWorktree }).worktree
}

export async function removePersistedSession(sessionId: string, force = false): Promise<void> {
  const query = force ? '?force=true' : ''
  await expectOk(await fetch(`${SESSIONS_ENDPOINT}/${encodeURIComponent(sessionId)}${query}`, { method: 'DELETE' }))
}
