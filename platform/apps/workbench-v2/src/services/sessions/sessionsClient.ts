import { expectOk, forgetSessionPersistence, resumeSessionPersistence } from './sessionWriteQueue'
import type { Session } from '../../types'
export { SessionPersistenceError, persistSession, persistRecoveryCopy, persistSessionNoUnload, resumeSessionPersistence, holdSessionPersistence, loadPersistedSessions, loadPersistedSession, retrySessionPersistence, isSessionDirty, sessionFingerprint, confirmedRecoveryRevision } from './sessionWriteQueue'
export type { ResultadoHidratacao, SessaoIndisponivel } from './sessionWriteQueue'
const SESSIONS_ENDPOINT = '/api/sessions'

export interface WorkspaceDescriptor { path: string; slug: string; name: string; isGit: boolean }
export interface WorkspaceDirectoryEntry { name: string; path: string; isDir: true }
export interface WorkspaceDirectoryListing { path: string; realpath: string; parent: string; folders: WorkspaceDirectoryEntry[]; error?: string }
export interface CreatedWorktree { slug: string; path: string | null; branch: string | null; repoRoot: string }

export async function listRecentSessionWorkspaces(): Promise<string[]> {
  const response = await expectOk(await fetch('/api/workspaces/recent'))
  const body: unknown = await response.json()
  const paths = body && typeof body === 'object' && 'paths' in body ? body.paths : null
  if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
    throw new Error('Histórico de pastas inválido.')
  }
  return paths.filter((path: string) => path.trim()).slice(0, 10)
}

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
  const result = await response.json() as { session: Session; workspace: WorkspaceDescriptor }
  resumeSessionPersistence(result.session)
  return result
}

export async function createSessionWorktree(workspacePath: string, slug: string, sessionId: string, useWorktree = false): Promise<CreatedWorktree> {
  const response = await expectOk(await fetch('/api/worktrees', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspacePath, slug, sessionId, useWorktree }),
  }))
  return ((await response.json()) as { worktree: CreatedWorktree }).worktree
}

/** P-C §6 — exclusão idempotente com identidade da tentativa e revisão
 * esperada. `force` conserva a confirmação específica de worktree sujo. */
export async function removePersistedSession(sessionId: string, options: { force?: boolean; expectedRevision: number }): Promise<'concluido' | 'limpeza_pendente'> {
  const query = options.force ? '?force=true' : ''
  const response = await expectOk(await fetch(`${SESSIONS_ENDPOINT}/${encodeURIComponent(sessionId)}${query}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deletionId: crypto.randomUUID(), expectedRevision: options.expectedRevision }),
  }))
  const body = await response.json() as { estado?: unknown }
  forgetSessionPersistence(sessionId)
  return body.estado === 'limpeza_pendente' ? 'limpeza_pendente' : 'concluido'
}
