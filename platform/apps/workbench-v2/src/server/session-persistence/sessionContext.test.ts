// ============================================================================
// C-1 — modalidade explícita, raiz nula de Chat e imutabilidade de contexto
// (SPEC C §3/§4; critérios C-T01, C-T02 e C-T03). Dados somente sintéticos,
// perfis mkdtemp por teste.
// ============================================================================
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViteDevServer } from 'vite'
import type { ChatMessage, Session } from '../../types'
import type * as WorkspacesModule from './workspaces'
import { deleteSessionRecord, getSessionRecord, resetDatabase } from './database'
import { deleteTranscript } from './transcripts'
import { sessionPersistencePlugin } from './index'

// Espião da fronteira de FS: criação de Chat não pode resolver/validar raiz.
const fsSpies = vi.hoisted(() => ({ validateWorkspacePath: 0 }))
vi.mock('./workspaces', async (importOriginal) => {
  const actual = await importOriginal<typeof WorkspacesModule>()
  return {
    ...actual,
    validateWorkspacePath: (...args: Parameters<typeof actual.validateWorkspacePath>) => {
      fsSpies.validateWorkspacePath += 1
      return actual.validateWorkspacePath(...args)
    },
  }
})

interface HttpServerHandle { baseUrl: string; close: () => Promise<void> }
type Middleware = (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void
let persistenceMiddleware: Middleware | undefined

const plugin = sessionPersistencePlugin({ repoRoot: process.cwd() })
const configureServer = plugin.configureServer
if (typeof configureServer !== 'function') throw new Error('session persistence plugin has no configureServer hook')
configureServer({ middlewares: { use: (middleware: Middleware) => { persistenceMiddleware = middleware } } } as unknown as ViteDevServer)

function listen(): Promise<HttpServerHandle> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (!persistenceMiddleware) { response.statusCode = 500; response.end('middleware unavailable'); return }
      persistenceMiddleware(request, response, () => { response.statusCode = 404; response.end('not found') })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') { reject(new Error('could not determine test server port')); return }
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((done, fail) => server.close((error) => error ? fail(error) : done())) })
    })
  })
}

function message(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return { id, role, content, time: '10:00' }
}

function baseSession(id: string, workspacePath: string | null, marker: string): Session {
  return {
    id, title: marker, workspace: workspacePath ? marker : 'Chat',
    workspacePath, section: 'today', status: 'completed',
    updated: new Date(0).toISOString(), diffAdded: 0, diffRemoved: 0,
    branch: workspacePath ? null : null, mainChatId: 'chat-main',
    chats: [{ id: 'chat-main', title: 'Main', status: 'completed', messages: [message(`${marker}-1`, 'user', `${marker}:one`)] }],
  }
}

const revisionCache = new Map<string, number>()

async function post(server: HttpServerHandle, body: Record<string, unknown>): Promise<Response> {
  const response = await fetch(`${server.baseUrl}/api/sessions`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const text = await response.text()
  if (response.ok) {
    const data = JSON.parse(text) as { persistenceRevision?: number; id?: string }
    if (data.persistenceRevision !== undefined && typeof body.session === 'object' && body.session) {
      revisionCache.set((body.session as Session).id, data.persistenceRevision)
    }
  }
  // Criação devolve 201 (contrato existente); o harness normaliza p/ 200 como o index.test.
  return new Response(text, { status: response.status === 201 ? 200 : response.status, headers: { 'content-type': 'application/json' } })
}

async function put(server: HttpServerHandle, session: Session, extra: Record<string, unknown> = {}): Promise<Response> {
  const isUpdate = revisionCache.has(session.id)
  const body = {
    session,
    ...(isUpdate ? { expectedRevision: revisionCache.get(session.id)!, mutationId: randomUUID() } : { creationId: randomUUID() }),
    ...extra,
  }
  const response = await fetch(`${server.baseUrl}/api/sessions`, {
    method: isUpdate ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const text = await response.text()
  if (response.ok) {
    const data = JSON.parse(text) as { persistenceRevision?: number }
    if (data.persistenceRevision !== undefined) revisionCache.set(session.id, data.persistenceRevision)
  }
  return new Response(text, { status: response.status === 201 ? 200 : response.status, headers: { 'content-type': 'application/json' } })
}

async function loadList(server: HttpServerHandle): Promise<Session[]> {
  const response = await fetch(`${server.baseUrl}/api/sessions`)
  expect(response.status).toBe(200)
  return ((await response.json()) as { sessions: Session[] }).sessions
}

async function loadOne(server: HttpServerHandle, id: string): Promise<Response> {
  return fetch(`${server.baseUrl}/api/sessions/${encodeURIComponent(id)}`)
}

async function changeWorkspace(server: HttpServerHandle, sessionId: string, path: string): Promise<Response> {
  return fetch(`${server.baseUrl}/api/session/change-workspace`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, path }),
  })
}

describe('C-1 — contexto de sessão no servidor', () => {
  let server: HttpServerHandle
  const touched: Array<{ id: string; slug: string }> = []

  beforeEach(async () => {
    touched.length = 0
    revisionCache.clear()
    fsSpies.validateWorkspacePath = 0
    resetDatabase()
    const profile = mkdtempSync(join(tmpdir(), 'agent-c1-'))
    vi.stubEnv('AGENTE_WINDOW_DATA_DIR', join(profile, 'data'))
    vi.stubEnv('AGENTE_WINDOW_TEST_HOME', profile)
    vi.stubEnv('AGENTE_WINDOW_PROVIDERS_PATH', join(profile, 'providers.json'))
    vi.stubEnv('AGENTE_WINDOW_SETTINGS_PATH', join(profile, 'settings.json'))
    vi.stubEnv('AGENTE_WINDOW_PERSONALIZACOES_PATH', join(profile, 'personalizacoes.json'))
    server = await listen()
  })

  afterEach(async () => {
    await server.close()
    for (const { id, slug } of touched) { await deleteTranscript(slug, id); deleteSessionRecord(id) }
    resetDatabase()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('C-T01 — criação Chat: registro sem raiz, sem validação de pasta no servidor, mensagem e retomada funcionam', async () => {
    const id = randomUUID()
    const session = baseSession(id, null, 'c1-chat')
    touched.push({ id, slug: '' })
    const resposta = await post(server, { session, creationId: randomUUID(), contexto: { tipo: 'chat' } })
    expect(resposta.status).toBe(200)
    const record = getSessionRecord(id)!
    expect(record).toBeDefined()
    // Raiz nula REAL no catálogo — nem '' nem fallback.
    expect(record.workspacePath).toBeNull()
    expect(record.contextKind).toBe('chat')
    // Nenhuma fronteira de FS foi consultada na criação Chat.
    expect(fsSpies.validateWorkspacePath).toBe(0)
    // JSON de sessão e coluna coincidem.
    const json = JSON.parse(record.sessionJson) as Session
    expect(json.workspacePath).toBeNull()
    expect(json.contexto).toEqual({ tipo: 'chat' })
    // Mensagem nova e retomada preservam a modalidade.
    session.chats[0].messages.push(message('c1-chat-2', 'assistant', 'resposta sintética'))
    expect((await put(server, session)).status).toBe(200)
    expect(getSessionRecord(id)!.workspacePath).toBeNull()
    const retomada = await loadOne(server, id)
    expect(retomada.status).toBe(200)
    const corpo = (await retomada.json()) as { session: Session }
    expect(corpo.session.workspacePath).toBeNull()
    expect(corpo.session.contexto).toEqual({ tipo: 'chat' })
    expect(corpo.session.chats[0].messages).toHaveLength(2)
    const lista = (await loadList(server)).find((entry) => entry.id === id)!
    expect(lista.workspacePath).toBeNull()
    expect(lista.contexto).toEqual({ tipo: 'chat' })
  })

  it('C-T01 — criação Chat valida a identidade UUID como qualquer criação nova', async () => {
    const session = baseSession('legacy-chat-id', null, 'c1-chat-legado')
    const resposta = await post(server, { session, creationId: randomUUID(), contexto: { tipo: 'chat' } })
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({ code: 'invalid_session_identity' })
  })

  it('C-T02 — POST Chat com pasta/worktree forjados é recusado e nada é registrado', async () => {
    const id = randomUUID()
    const comPasta = baseSession(id, '/tmp/forged-c1', 'c1-forge-path')
    const resposta = await post(server, { session: comPasta, creationId: randomUUID(), contexto: { tipo: 'chat' } })
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toMatchObject({ code: 'invalid_session_context' })
    expect(getSessionRecord(id)).toBeUndefined()

    const id2 = randomUUID()
    const comWorktree = baseSession(id2, null, 'c1-forge-worktree')
    comWorktree.worktreePath = '/tmp/forged-worktree'
    const resposta2 = await post(server, { session: comWorktree, creationId: randomUUID(), contexto: { tipo: 'chat' } })
    expect(resposta2.status).toBe(400)
    expect(await resposta2.json()).toMatchObject({ code: 'invalid_session_context' })
    expect(getSessionRecord(id2)).toBeUndefined()
  })

  it('C-T02 — PUT forjado não converte modalidade (409 session_context_immutable) e preserva o registro', async () => {
    const id = randomUUID()
    const chat = baseSession(id, null, 'c1-imutavel')
    touched.push({ id, slug: '' })
    expect((await post(server, { session: chat, creationId: randomUUID(), contexto: { tipo: 'chat' } })).status).toBe(200)
    chat.chats[0].messages.push(message('c1-imutavel-2', 'user', 'novo conteúdo'))
    chat.persistenceRevision = 2
    // Tentativa de converter Chat → workspace no PUT.
    const resposta = await put(server, { ...chat, workspacePath: '/tmp/converted' }, { contexto: { tipo: 'workspace', path: '/tmp/converted' } })
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({ code: 'session_context_immutable' })
    const record = getSessionRecord(id)!
    expect(record.contextKind).toBe('chat')
    expect(record.workspacePath).toBeNull()
    // A tentativa também não gravou a mensagem (nada de efeito parcial):
    // as mensagens vivem no transcript — conferência pela leitura de contrato.
    const após409 = (await (await loadOne(server, id)).json()) as { session: Session }
    expect(após409.session.chats[0].messages).toHaveLength(1)
    // PUT legado (sem contexto) também não converte: conteúdo salvo, modalidade preservada.
    const semContexto = await put(server, { ...chat, workspacePath: '/tmp/converted' })
    expect(semContexto.status).toBe(200)
    const depois = getSessionRecord(id)!
    expect(depois.contextKind).toBe('chat')
    expect(depois.workspacePath).toBeNull()
    const apósLegado = (await (await loadOne(server, id)).json()) as { session: Session }
    expect(apósLegado.session.chats[0].messages).toHaveLength(2)
  })

  it('C-T02 — PUT em sessão workspace tentando virar Chat também é recusado', async () => {
    const id = randomUUID()
    const pasta = mkdtempSync(join(tmpdir(), 'c1-ws-'))
    const workspace = baseSession(id, pasta, 'c1-ws')
    touched.push({ id, slug: id })
    expect((await post(server, { session: workspace, creationId: randomUUID(), contexto: { tipo: 'workspace', path: pasta } })).status).toBe(200)
    expect(getSessionRecord(id)!.contextKind).toBe('workspace')
    workspace.persistenceRevision = 2
    const resposta = await put(server, { ...workspace, workspacePath: null }, { contexto: { tipo: 'chat' } })
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({ code: 'session_context_immutable' })
    expect(getSessionRecord(id)!.contextKind).toBe('workspace')
  })

  it('C-T02 — change-workspace em sessão criada: 409 session_context_immutable; mesma raiz é no-op', async () => {
    const id = randomUUID()
    const pasta = mkdtempSync(join(tmpdir(), 'c1-change-'))
    const workspace = baseSession(id, pasta, 'c1-change')
    touched.push({ id, slug: id })
    expect((await post(server, { session: workspace, creationId: randomUUID(), contexto: { tipo: 'workspace', path: pasta } })).status).toBe(200)

    const outra = mkdtempSync(join(tmpdir(), 'c1-change-b-'))
    const diferentes = await changeWorkspace(server, id, outra)
    expect(diferentes.status).toBe(409)
    expect(await diferentes.json()).toMatchObject({ code: 'session_context_immutable' })
    expect(getSessionRecord(id)!.workspacePath).toBe(pasta)

    // Repetir a MESMA raiz devolve o estado atual como no-op, jamais relink.
    const mesma = await changeWorkspace(server, id, pasta)
    expect(mesma.status).toBe(200)
    const corpo = (await mesma.json()) as { session: Session }
    expect(corpo.session.id).toBe(id)
    expect(getSessionRecord(id)!.workspacePath).toBe(pasta)

    // Sessão Chat: qualquer change-workspace é recusado.
    const chatId = randomUUID()
    const chat = baseSession(chatId, null, 'c1-change-chat')
    touched.push({ id: chatId, slug: '' })
    expect((await post(server, { session: chat, creationId: randomUUID(), contexto: { tipo: 'chat' } })).status).toBe(200)
    const emChat = await changeWorkspace(server, chatId, pasta)
    expect(emChat.status).toBe(409)
    expect(await emChat.json()).toMatchObject({ code: 'session_context_immutable' })
    expect(getSessionRecord(chatId)!.workspacePath).toBeNull()
  })

  it('C-T03 — criação legada (sem contexto) permanece workspace; rótulo workspace-local não vira Chat', async () => {
    const id = randomUUID()
    const session = baseSession(id, '~/workspace-local', 'c1-legacy')
    session.workspace = 'workspace-local'
    touched.push({ id, slug: id })
    // Payload legado, sem campo contexto: compatibilidade preservada.
    expect((await post(server, { session, creationId: randomUUID() })).status).toBe(200)
    const record = getSessionRecord(id)!
    expect(record.contextKind).toBe('workspace')
    expect(record.workspacePath).toBe('~/workspace-local')
    const lista = (await loadList(server)).find((entry) => entry.id === id)!
    // O catálogo é a autoridade: a modalidade é materializada na leitura.
    expect(lista.contexto).toEqual({ tipo: 'workspace' })
    expect(lista.workspacePath).toBe('~/workspace-local')
  })

  it('C-T03 — retomada de sessão legada preserva pasta/worktree/origens; sem reatribuição automática', async () => {
    const id = randomUUID()
    const pasta = mkdtempSync(join(tmpdir(), 'c1-legacy-dir-'))
    const session = baseSession(id, pasta, 'c1-legacy-wt')
    session.worktreePath = `${pasta}/.worktrees/c1`
    session.branch = 'arena/c1'
    touched.push({ id, slug: id })
    expect((await post(server, { session, creationId: randomUUID() })).status).toBe(200)
    const record = getSessionRecord(id)!
    expect(record.contextKind).toBe('workspace')
    expect(record.worktreePath).toBe(session.worktreePath)
    const retomada = (await (await loadOne(server, id)).json()) as { session: Session }
    expect(retomada.session.workspacePath).toBe(pasta)
    expect(retomada.session.worktreePath).toBe(session.worktreePath)
    expect(retomada.session.branch).toBe('arena/c1')
    expect(retomada.session.contexto).toEqual({ tipo: 'workspace' })
  })

  it('C-T02 — criação workspace com contexto explícito resolve a pasta no servidor (realpath registrado)', async () => {
    const id = randomUUID()
    const pasta = mkdtempSync(join(tmpdir(), 'c1-real-'))
    const session = baseSession(id, `${pasta}/./`, 'c1-realpath')
    touched.push({ id, slug: id })
    const resposta = await post(server, { session, creationId: randomUUID(), contexto: { tipo: 'workspace', path: `${pasta}/./` } })
    expect(resposta.status).toBe(200)
    const record = getSessionRecord(id)!
    expect(record.workspacePath).toBe(pasta)
    expect((JSON.parse(record.sessionJson) as Session).workspacePath).toBe(pasta)
    expect(record.contextKind).toBe('workspace')
    expect(fsSpies.validateWorkspacePath).toBeGreaterThan(0)
  })

  // C-1 — negativos nos endpoints adjacentes que pressupõem raiz de projeto.
  it('C-T02/negativo — other-chat-source (MC1) em Chat → 403; a fonte nunca é aberta', async () => {
    const id = randomUUID()
    const chat = baseSession(id, null, 'c1-mc1')
    touched.push({ id, slug: '' })
    expect((await post(server, { session: chat, creationId: randomUUID(), contexto: { tipo: 'chat' } })).status).toBe(200)
    const resposta = await fetch(`${server.baseUrl}/api/sessions/other-chat-source`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id, chatId: 'chat-main', referencia: 'referencia-sintetica' }),
    })
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toMatchObject({ message: expect.stringContaining('Fonte histórica indisponível') })
  })

  it('C-T02/negativo — project-memory (M5) em Chat → 409; memórias de projeto exigem workspace', async () => {
    const id = randomUUID()
    const chat = baseSession(id, null, 'c1-m5')
    touched.push({ id, slug: '' })
    expect((await post(server, { session: chat, creationId: randomUUID(), contexto: { tipo: 'chat' } })).status).toBe(200)
    const resposta = await fetch(`${server.baseUrl}/api/sessions/project-memory`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id, chatId: 'chat-main', operacao: 'listar' }),
    })
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toMatchObject({ message: expect.stringContaining('memórias de projeto exigem uma conversa workspace') })
  })
})
