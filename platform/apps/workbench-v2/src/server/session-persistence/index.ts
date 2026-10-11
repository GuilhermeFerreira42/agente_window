import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { ChatMessage, Session } from '../../types'
import { deleteSessionRecord, getSessionRecord, listSessionRecords, upsertSessionRecord } from './database'
import { sanitizePath } from './paths'
import { deleteTranscript, readTranscript, writeTranscript, type TranscriptEntry } from './transcripts'
import { createWorktree, removeWorktree, WorktreeDirtyError } from './worktrees'
import { listRecentWorkspaces, pickWorkspaceDirectory, rememberWorkspace, validateWorkspace, WorktreeRequiresGitError } from './workspaces'

const API_PREFIX = '/api/sessions'
const WORKTREES_ENDPOINT = '/api/worktrees'
const WORKSPACES_VALIDATE_ENDPOINT = '/api/workspaces/validate'
const WORKSPACES_PICK_ENDPOINT = '/api/workspaces/pick'
const WORKSPACES_RECENT_ENDPOINT = '/api/workspaces/recent'

export interface SessionPersistencePluginOptions {
  repoRoot: string
}

interface PersistedSessionPayload {
  session: Session
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(value))
}

function transcriptEntries(session: Session): TranscriptEntry[] {
  let timestamp = Date.now() - session.chats.reduce((total, chat) => total + chat.messages.length, 0)
  return session.chats.flatMap((chat) => chat.messages
    // Respostas ainda em streaming são estado transitório de UI. Persisti-las
    // faria um F5 restaurar para sempre uma bolha vazia em `running: true`.
    .filter((message) => !message.running)
    .map((message) => ({
      type: message.role,
      chatId: chat.id,
      message,
      uuid: message.id,
      timestamp: timestamp += 1,
    })))
}

function restoreMessages(session: Session, entries: TranscriptEntry[]): Session {
  const byChat = new Map<string, ChatMessage[]>()
  for (const entry of entries) {
    const messages = byChat.get(entry.chatId) ?? []
    messages.push(entry.message as ChatMessage)
    byChat.set(entry.chatId, messages)
  }
  return {
    ...session,
    chats: session.chats.map((chat) => ({ ...chat, messages: byChat.get(chat.id) ?? [] })),
  }
}

async function listSessions(): Promise<Session[]> {
  const records = listSessionRecords()
  return Promise.all(records.map(async (record) => {
    const session = JSON.parse(record.sessionJson) as Session
    return restoreMessages(session, await readTranscript(record.slug, record.id))
  }))
}

async function saveSession(session: Session): Promise<void> {
  const slug = session.slug || sanitizePath(session.workspacePath)
  const now = Date.now()
  const entries = transcriptEntries(session)
  const metadata: Session = {
    ...session,
    slug,
    worktreePath: session.worktreePath ?? null,
    chats: session.chats.map((chat) => ({ ...chat, messages: [] })),
  }
  upsertSessionRecord({
    id: session.id,
    slug,
    title: session.title,
    workspacePath: session.workspacePath,
    worktreePath: metadata.worktreePath ?? null,
    messageCount: entries.length,
    createdAt: session.createdSeq ?? now,
    updatedAt: now,
    sessionJson: JSON.stringify(metadata),
  })
  await writeTranscript(slug, session.id, entries)
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, repoRoot: string): Promise<boolean> {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith(API_PREFIX) && !url.pathname.startsWith('/api/workspaces') && url.pathname !== WORKTREES_ENDPOINT) return false

  if (url.pathname === WORKSPACES_VALIDATE_ENDPOINT && request.method === 'POST') {
    const input = await readJson<{ path: string }>(request)
    const workspace = await validateWorkspace(input.path, url.searchParams.get('requireGit') === 'true')
    await rememberWorkspace(workspace.path)
    sendJson(response, 200, { workspace })
    return true
  }

  if (url.pathname === WORKSPACES_PICK_ENDPOINT && request.method === 'POST') {
    const selectedPath = await pickWorkspaceDirectory()
    if (!selectedPath) sendJson(response, 200, { workspace: null })
    else {
      const workspace = await validateWorkspace(selectedPath)
      await rememberWorkspace(workspace.path)
      sendJson(response, 200, { workspace })
    }
    return true
  }

  if (url.pathname === WORKSPACES_RECENT_ENDPOINT && request.method === 'GET') {
    sendJson(response, 200, { paths: await listRecentWorkspaces() })
    return true
  }

  if (url.pathname === WORKTREES_ENDPOINT && request.method === 'POST') {
    const input = await readJson<{ workspacePath?: string; useWorktree?: boolean; slug?: string; sessionId: string }>(request)
    const workspace = await validateWorkspace(input.workspacePath || repoRoot, input.useWorktree === true)
    await rememberWorkspace(workspace.path)
    const prepared = input.useWorktree === true
      ? await createWorktree(workspace.path, input.slug || workspace.slug, input.sessionId)
      : { slug: input.slug || workspace.slug, path: null, branch: null, repoRoot: workspace.path }
    sendJson(response, 201, { worktree: prepared })
    return true
  }

  if (url.pathname === API_PREFIX && request.method === 'GET') {
    sendJson(response, 200, { sessions: await listSessions() })
    return true
  }

  if (url.pathname === API_PREFIX && request.method === 'PUT') {
    const { session } = await readJson<PersistedSessionPayload>(request)
    await saveSession(session)
    sendJson(response, 200, { ok: true })
    return true
  }

  const match = url.pathname.match(/^\/api\/sessions\/([^/]+)$/)
  if (match && request.method === 'DELETE') {
    const id = decodeURIComponent(match[1])
    const record = getSessionRecord(id)
    if (record) {
      if (record.worktreePath) {
        try {
          await removeWorktree(record.workspacePath, record.worktreePath, id, url.searchParams.get('force') === 'true')
        } catch (error) {
          if (error instanceof WorktreeDirtyError) {
            sendJson(response, 409, { code: 'worktree_dirty', message: error.message })
            return true
          }
          throw error
        }
      }
      await deleteTranscript(record.slug, id)
      deleteSessionRecord(id)
    }
    sendJson(response, 200, { ok: true })
    return true
  }

  sendJson(response, 404, { code: 'not_found', message: 'Session endpoint not found' })
  return true
}

export function sessionPersistencePlugin(options: SessionPersistencePluginOptions): Plugin {
  return {
    name: 'session-persistence-single-port',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handleRequest(request, response, options.repoRoot)
          .then((handled) => { if (!handled) next() })
          .catch((error: unknown) => sendJson(response, error instanceof WorktreeRequiresGitError ? 400 : 500, {
            code: error instanceof WorktreeRequiresGitError ? error.code : 'session_persistence_error',
            message: error instanceof Error ? error.message : String(error),
          }))
      })
    },
  }
}

export { allProjectDirs, getProjectsDir, sanitizePath } from './paths'
