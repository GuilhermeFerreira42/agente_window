import type { Session } from '../../types'

const SESSIONS_ENDPOINT = '/api/sessions'

async function expectOk(response: Response): Promise<Response> {
  if (response.ok) return response
  let message = `Session persistence request failed (${response.status})`
  try {
    const body = await response.json() as { message?: string }
    if (body.message) message = body.message
  } catch { /* response without JSON */ }
  throw new Error(message)
}

export async function loadPersistedSessions(signal?: AbortSignal): Promise<Session[]> {
  const response = await expectOk(await fetch(SESSIONS_ENDPOINT, { signal }))
  const body = await response.json() as { sessions: Session[] }
  return body.sessions
}

export async function persistSession(session: Session): Promise<void> {
  await expectOk(await fetch(SESSIONS_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session }),
  }))
}

export interface CreatedWorktree {
  slug: string
  path: string
  branch: string
}

export async function createSessionWorktree(slug: string, sessionId: string): Promise<CreatedWorktree> {
  const response = await expectOk(await fetch('/api/worktrees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, sessionId }),
  }))
  const body = await response.json() as { worktree: CreatedWorktree }
  return body.worktree
}

export async function removePersistedSession(sessionId: string): Promise<void> {
  await expectOk(await fetch(`${SESSIONS_ENDPOINT}/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }))
}
