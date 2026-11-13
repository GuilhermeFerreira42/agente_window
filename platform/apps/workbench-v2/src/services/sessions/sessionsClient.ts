import { expectOk, forgetSessionPersistence, resumeSessionPersistence } from './sessionWriteQueue'
import type { Session } from '../../types'
export { SessionPersistenceError, persistSession, persistRecoveryCopy, persistSessionNoUnload, resumeSessionPersistence, holdSessionPersistence, loadPersistedSessions, loadPersistedSession, retrySessionPersistence, isSessionDirty, sessionFingerprint, confirmedRecoveryRevision } from './sessionWriteQueue'
const SESSIONS_ENDPOINT = '/api/sessions'

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

export async function removePersistedSession(sessionId: string, force = false): Promise<void> {
  const query = force ? '?force=true' : ''
  await expectOk(await fetch(`${SESSIONS_ENDPOINT}/${encodeURIComponent(sessionId)}${query}`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
  }))
  forgetSessionPersistence(sessionId)
}
