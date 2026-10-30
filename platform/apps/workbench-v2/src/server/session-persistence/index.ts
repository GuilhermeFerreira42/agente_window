import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import type { ChatMessage, Session } from '../../types'
import { deleteSessionRecord, getSessionRecord, grantSessionTool, listSessionRecords, revokeSessionToolGrants, upsertSessionRecord, type SessionToolGrant } from './database'
import { resolverContextoAgir } from './agirContext'
import { sanitizePath } from './paths'
import { deleteTranscript, readTranscript, writeTranscript, type TranscriptEntry } from './transcripts'
import { createWorktree, removeWorktree, WorktreeDirtyError } from './worktrees'
import { listRecentWorkspaces, listWorkspaceDirectories, pickWorkspaceDirectory, rememberWorkspace, validateWorkspace, validateWorkspacePath, WorktreeRequiresGitError } from './workspaces'
// FATIA 08 (D69): Provedores é a primeira CASA (bairro 2). A "prefeitura" só
// reconhece os caminhos e delega — nenhuma regra de provedores mora aqui.
import { rotaPertenceAoModulo, tratarRotasProvedores } from '../../bairros/2-inteligencia/casas/provedores/server/rotas'
import { rotaPertenceAoModuloConversa, tratarRotasConversa } from '../../bairros/2-inteligencia/casas/conversa/server/rotas'
import { rotaPertenceAoModuloAgir, tratarRotasAgir } from '../../bairros/2-inteligencia/casas/agir/server/rotas'
import { definirModoAgir, definirPermissaoAgir, lerModoAgir, lerPermissaoAgir } from '../../bairros/2-inteligencia/casas/agir/server/modos'
import { resolveShell } from '../../../../../services/pty-server/src/shellDetector'
import { rotaPertenceAoModuloConfig, tratarRotasConfig } from '../../bairros/2-inteligencia/casas/config/server/rotas'
import { lerConfig } from '../../bairros/2-inteligencia/casas/config/server/repo'
import { obterAlvoDeConversa } from './chatAlvo'
import { iniciarChamadaModelo } from '../../bairros/2-inteligencia/casas/provedores/server/providersRepo'
import { sanarCartoesDeSessao } from '../../services/agir/sanar'

const API_PREFIX = '/api/sessions'
const WORKTREES_ENDPOINT = '/api/worktrees'

// Serialize mutations and reads for one session in this single server process.
// Besides protecting JSONL replacement, this keeps the SQLite catalog and its
// transcript from being observed half-way through one save/delete operation.
const sessionPersistenceQueues = new Map<string, Promise<void>>()

function withSessionPersistenceQueue<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
  const previous = sessionPersistenceQueues.get(sessionId) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  const tail = previous.then(() => gate, () => gate)
  sessionPersistenceQueues.set(sessionId, tail)

  const result = previous.catch(() => undefined).then(operation)
  void tail.then(() => {
    if (sessionPersistenceQueues.get(sessionId) === tail) sessionPersistenceQueues.delete(sessionId)
  })
  return result.finally(release)
}
const WORKSPACES_VALIDATE_ENDPOINT = '/api/workspaces/validate'
const WORKSPACES_PICK_ENDPOINT = '/api/workspaces/pick'
const WORKSPACES_RECENT_ENDPOINT = '/api/workspaces/recent'

export interface SessionPersistencePluginOptions {
  repoRoot: string
}

interface PersistedSessionPayload {
  session: Session
}

function validPersistenceRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
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

function sanarStatusAposF5(session: Session): Session {
  // FATIA 09 (§3.8): mensagens em streaming NÃO são persistidas (decisão da
  // §9.1 — evita bolha vazia eterna), então depois do F5 nunca existe nada
  // rodando. Um status 'working' gravado no meio da corrida (F5 durante o
  // streaming) ficaria ÓRFÃO para sempre: chip "Trabalhando" fantasma e
  // composer travado. Na restauração, ele vira 'completed'.
  return sanarCartoesDeSessao({
    ...session,
    status: session.status === 'working' ? 'completed' : session.status,
    chats: session.chats.map((chat) => (chat.status === 'working' ? { ...chat, status: 'completed' } : chat)),
  })
}

async function listSessions(): Promise<Session[]> {
  const records = listSessionRecords()
  const sessions = await Promise.all(records.map((record) => withSessionPersistenceQueue(record.id, async () => {
    // Re-read inside the queue: the record may have changed or been deleted
    // while this GET waited for an in-flight save.
    const current = getSessionRecord(record.id)
    if (!current) return undefined
    const session = JSON.parse(current.sessionJson) as Session
    return sanarStatusAposF5(restoreMessages(session, await readTranscript(current.slug, current.id)))
  })))
  return sessions.filter((session): session is Session => session !== undefined)
}

async function saveSession(session: Session, clientSnapshot = false): Promise<{ saved: boolean; session: Session }> {
  return withSessionPersistenceQueue(session.id, async () => {
    const existing = getSessionRecord(session.id)
    const existingSession = existing ? JSON.parse(existing.sessionJson) as Session : undefined
    const storedRevision = validPersistenceRevision(existingSession?.persistenceRevision)
      ? existingSession.persistenceRevision
      : 0
    const incomingRevision = validPersistenceRevision(session.persistenceRevision)
      ? session.persistenceRevision
      : undefined

    // Browser snapshots carry an increasing token. A delayed lower/equal token
    // must never replace a newer transcript; unversioned legacy writes are
    // accepted only until that session has entered the versioned protocol.
    if (clientSnapshot && existing) {
      if ((incomingRevision === undefined && storedRevision > 0)
        || (incomingRevision !== undefined && incomingRevision <= storedRevision)) {
        return { saved: false, session: existingSession ?? session }
      }
    }

    const persistenceRevision = clientSnapshot && incomingRevision !== undefined
      ? incomingRevision
      : Math.max(storedRevision, incomingRevision ?? 0) + 1
    if (!Number.isSafeInteger(persistenceRevision)) throw new Error(`Persistence revision exhausted for session ${session.id}`)

    const oldActivePath = existing?.worktreePath || existing?.workspacePath
    const nextActivePath = session.worktreePath || session.workspacePath
    const slug = session.slug || sanitizePath(session.workspacePath)
    const now = Date.now()
    const entries = transcriptEntries(session)
    const committedSession: Session = { ...session, slug, persistenceRevision }
    const metadata: Session = {
      ...committedSession,
      worktreePath: session.worktreePath ?? null,
      chats: session.chats.map((chat) => ({ ...chat, messages: [] })),
    }

    // JSONL is the message source of truth. Commit it atomically before moving
    // the catalog pointer/count, so a failed transcript write leaves SQLite's
    // prior record intact. The queue commits saves in admission order.
    await writeTranscript(slug, session.id, entries)
    if (existing && oldActivePath !== nextActivePath) revokeSessionToolGrants(session.id)
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
    return { saved: true, session: committedSession }
  })
}

/**
 * FATIA 10 — o território do agente: a prefeitura valida a pasta informada
 * pela sessão e entrega a RAIZ real (o navegador nunca define território).
 */
async function handleRequest(request: IncomingMessage, response: ServerResponse, repoRoot: string): Promise<boolean> {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith(API_PREFIX) && !url.pathname.startsWith('/api/session/') && !url.pathname.startsWith('/api/workspaces') && url.pathname !== WORKTREES_ENDPOINT && !rotaPertenceAoModulo(url.pathname) && !rotaPertenceAoModuloConversa(url.pathname) && !rotaPertenceAoModuloAgir(url.pathname) && !rotaPertenceAoModuloConfig(url.pathname) && !url.pathname.startsWith('/api/fs/')) return false

  if (url.pathname === '/api/fs/list' && request.method === 'GET') {
    sendJson(response, 200, listWorkspaceDirectories(url.searchParams.get('path') ?? ''))
    return true
  }

  if (url.pathname === '/api/fs/validate' && request.method === 'GET') {
    sendJson(response, 200, validateWorkspacePath(url.searchParams.get('path') ?? ''))
    return true
  }

  if (url.pathname === '/api/session/change-workspace' && request.method === 'POST') {
    const input = await readJson<{ sessionId: string; path: string }>(request)
    if (!input.sessionId) throw new Error('sessionId is required')
    const workspace = await validateWorkspace(input.path)
    const session = await withSessionPersistenceQueue(input.sessionId, async () => {
      // Read/patch the CURRENT catalog under one gate. A workspace operation
      // never republishes messages from a snapshot obtained before this gate.
      const record = getSessionRecord(input.sessionId)
      if (!record) return undefined
      const current = JSON.parse(record.sessionJson) as Session
      const revision = (validPersistenceRevision(current.persistenceRevision) ? current.persistenceRevision : 0) + 1
      if (!Number.isSafeInteger(revision)) throw new Error(`Persistence revision exhausted for session ${input.sessionId}`)
      const entries = await readTranscript(record.slug, record.id)
      const metadata: Session = {
        ...current, workspace: workspace.name, workspacePath: workspace.path,
        worktreePath: null, branch: null, persistenceRevision: revision,
      }
      revokeSessionToolGrants(record.id)
      upsertSessionRecord({
        ...record, workspacePath: workspace.path, worktreePath: null,
        updatedAt: Date.now(), sessionJson: JSON.stringify(metadata),
      })
      return sanarStatusAposF5(restoreMessages(metadata, entries))
    })
    if (!session) { sendJson(response, 404, { code: 'session_not_found', message: 'Session not found' }); return true }
    await rememberWorkspace(workspace.path)
    sendJson(response, 200, { session, workspace })
    return true
  }

  if (rotaPertenceAoModulo(url.pathname)) {
    if (await tratarRotasProvedores(request, response, url)) return true
  }

  if (rotaPertenceAoModuloConversa(url.pathname)) {
    if (await tratarRotasConversa(request, response, url, obterAlvoDeConversa, iniciarChamadaModelo)) return true
  }
  if (rotaPertenceAoModuloAgir(url.pathname)) {
    if (await tratarRotasAgir(request, response, url, {
      obterAlvo: obterAlvoDeConversa,
      iniciarModelo: iniciarChamadaModelo,
      resolverContexto: resolverContextoAgir,
      resolverShell: resolveShell,
      concederPermissaoSessao: (sessionId, raiz, ferramenta) => grantSessionTool(sessionId, raiz, ferramenta as SessionToolGrant),
      lerModo: lerModoAgir,
      definirModo: definirModoAgir,
      lerPermissao: lerPermissaoAgir,
      definirPermissao: definirPermissaoAgir,
      lerTeto: async () => (await lerConfig()).teto, // FATIA 11: teto fresco da casa Config a cada pedido
    })) return true
  }

  if (rotaPertenceAoModuloConfig(url.pathname)) {
    if (await tratarRotasConfig(request, response, url)) return true
  }

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
    if (session.persistenceRevision !== undefined && !validPersistenceRevision(session.persistenceRevision)) {
      sendJson(response, 400, { code: 'invalid_session_revision', message: 'persistenceRevision must be a non-negative safe integer' })
      return true
    }
    const result = await saveSession(session, true)
    if (!result.saved) {
      sendJson(response, 409, {
        code: 'stale_session_snapshot',
        message: 'A newer session snapshot is already persisted',
        currentRevision: result.session.persistenceRevision ?? 0,
      })
      return true
    }
    sendJson(response, 200, { ok: true, persistenceRevision: result.session.persistenceRevision })
    return true
  }

  const match = url.pathname.match(/^\/api\/sessions\/([^/]+)$/)
  if (match && request.method === 'DELETE') {
    const id = decodeURIComponent(match[1])
    const result = await withSessionPersistenceQueue(id, async () => {
      const record = getSessionRecord(id)
      if (!record) return { dirtyWorktree: undefined }
      if (record.worktreePath) {
        try {
          await removeWorktree(record.workspacePath, record.worktreePath, id, url.searchParams.get('force') === 'true')
        } catch (error) {
          if (error instanceof WorktreeDirtyError) return { dirtyWorktree: error.message }
          throw error
        }
      }
      await deleteTranscript(record.slug, id)
      deleteSessionRecord(id)
      return { dirtyWorktree: undefined }
    })
    if (result.dirtyWorktree) {
      sendJson(response, 409, { code: 'worktree_dirty', message: result.dirtyWorktree })
      return true
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
