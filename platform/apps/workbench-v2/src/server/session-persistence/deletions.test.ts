import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, renameSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViteDevServer } from 'vite'
import type { ChatMessage, Session } from '../../types'
import type * as TranscriptModule from './transcripts'
import type * as RotasModule from '../../bairros/2-inteligencia/casas/agir/server/rotas'

const cleanupFault = vi.hoisted(() => ({
  failDelete: false,
  blockDelete: false,
  deleteStarted: undefined as (() => void) | undefined,
  releaseDelete: undefined as (() => void) | undefined,
}))
// P-C (PC-R1) — guarda de run vivo no DELETE: o harness não sobe execuções de
// verdade, então `sessaoEmExecucao` é injetada aqui (mock parcial do MESMO
// módulo `server/rotas` — fora do barrel — de onde a produção a importa).
const runFault = vi.hoisted(() => ({ ativo: false }))
// Falhas injetadas SOMENTE em fronteiras controladas da limpeza (módulo próprio,
// nunca builtin) — produção permanece intacta.
vi.mock('./transcripts', async (importOriginal) => {
  const actual = await importOriginal<typeof TranscriptModule>()
  return {
    ...actual,
    deleteTranscript: async (...args: Parameters<typeof actual.deleteTranscript>) => {
      if (cleanupFault.failDelete) {
        throw Object.assign(new Error('injected transcript cleanup failure'), { code: 'EIO' })
      }
      if (cleanupFault.blockDelete) {
        cleanupFault.deleteStarted?.()
        await new Promise<void>((resolve) => { cleanupFault.releaseDelete = resolve })
      }
      return actual.deleteTranscript(...args)
    },
  }
})
// P-C (PC-R1) — parcial: mantém `conversaEmExecucao`/`tratarRotasAgir` reais e
// só injeta a guarda de sessão em execução usada pelo DELETE (código de prova;
// a produção passa a exportá-la deste MESMO módulo `server/rotas`).
vi.mock('../../bairros/2-inteligencia/casas/agir/server/rotas', async (importOriginal) => {
  const actual = await importOriginal<typeof RotasModule>()
  return {
    ...actual,
    sessaoEmExecucao: () => runFault.ativo,
  }
})
import { deleteSessionRecord, getSessionRecord, getSessionRecordRaw, getDatabase, resetDatabase, upsertSessionRecord } from './database'
import { deleteTranscript, readTranscript } from './transcripts'
import { createWorktree } from './worktrees'
import { resolverContextoAgir } from './agirContext'
import { consultarDelecao } from './deletions'
import { lixeiraDoSistema } from './attachments/lixeira'
import { publicarArtefatoGerenciado } from './attachments/gerados'
import { sessionPersistencePlugin } from './index'

interface HttpServerHandle { baseUrl: string; close: () => Promise<void> }
type Middleware = (request: IncomingMessage, response: ServerResponse, next: (error?: Error) => void) => void
let persistenceMiddleware: Middleware | undefined

const plugin = sessionPersistencePlugin({ repoRoot: process.cwd() })
if (typeof plugin.configureServer !== 'function') throw new Error('plugin sem configureServer')
plugin.configureServer({ middlewares: { use: (middleware: Middleware) => { persistenceMiddleware = middleware } } } as unknown as ViteDevServer)

function listen(): Promise<HttpServerHandle> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      if (!persistenceMiddleware) { response.statusCode = 500; response.end('middleware unavailable'); return }
      persistenceMiddleware(request, response, () => { response.statusCode = 404; response.end('not found') })
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') { reject(new Error('sem porta')); return }
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((done, fail) => server.close((e) => e ? fail(e) : done())) })
    })
  })
}

const execFileAsync = promisify(execFile)
const git = (cwd: string, ...args: string[]) => execFileAsync('git', ['-C', cwd, ...args], { windowsHide: true })

function message(id: string, role: ChatMessage['role'], content: string): ChatMessage {
  return { id, role, content, time: '10:00' }
}

function makeSession(id: string, slug: string, marker: string, persistenceRevision = 1): Session {
  return {
    id, persistenceRevision, slug, title: marker, workspace: marker, workspacePath: `/tmp/${slug}`,
    section: 'today', status: 'completed', updated: new Date(0).toISOString(),
    diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'chat-main',
    chats: [{ id: 'chat-main', title: 'Main', status: 'completed', messages: [
      message(`${marker}-1`, 'user', `${marker}:one`),
      message(`${marker}-2`, 'assistant', `${marker}:two`),
    ] }],
  } as Session
}

async function putSession(server: HttpServerHandle, session: Session, cache: Map<string, number>): Promise<{ status: number; revision?: number; body: Record<string, unknown> }> {
  const isUpdate = cache.has(session.id)
  const body = { session, ...(isUpdate ? { expectedRevision: cache.get(session.id)!, mutationId: randomUUID() } : { creationId: randomUUID() }) }
  const response = await fetch(`${server.baseUrl}/api/sessions`, {
    method: isUpdate ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  const parsed = await response.json().catch(() => ({})) as Record<string, unknown>
  if (response.ok && typeof parsed.persistenceRevision === 'number') cache.set(session.id, parsed.persistenceRevision)
  const status = response.status === 201 ? 200 : response.status
  return { status, revision: typeof parsed.persistenceRevision === 'number' ? parsed.persistenceRevision : undefined, body: parsed }
}

async function deleteSession(server: HttpServerHandle, id: string, expectedRevision: number, options: { force?: boolean; deletionId?: string; resumeCleanup?: boolean } = {}) {
  const query = options.force ? '?force=true' : ''
  return fetch(`${server.baseUrl}/api/sessions/${encodeURIComponent(id)}${query}`, {
    method: 'DELETE', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deletionId: options.deletionId ?? randomUUID(), expectedRevision, resumeCleanup: options.resumeCleanup }),
  })
}

async function loadIndex(server: HttpServerHandle): Promise<{ sessions: Session[]; unavailable: Array<{ sessionId: string; code: string; titulo?: string }> }> {
  const response = await fetch(`${server.baseUrl}/api/sessions`)
  expect(response.status).toBe(200)
  return await response.json() as { sessions: Session[]; unavailable: Array<{ sessionId: string; code: string; titulo?: string }> }
}

describe('P-C — exclusão idempotente, limpeza retomável e proteção contra recriação', () => {
  let server: HttpServerHandle
  const touched: Array<{ id: string; slug: string }> = []
  const revisions = new Map<string, number>()

  beforeEach(async () => {
    touched.length = 0
    revisions.clear()
    cleanupFault.failDelete = false
    cleanupFault.blockDelete = false
    cleanupFault.deleteStarted = undefined
    cleanupFault.releaseDelete = undefined
    runFault.ativo = false
    resetDatabase()
    const profile = mkdtempSync(join(tmpdir(), 'agent-pc-'))
    vi.stubEnv('AGENTE_WINDOW_DATA_DIR', join(profile, 'data'))
    vi.stubEnv('AGENTE_WINDOW_TEST_HOME', profile)
    vi.stubEnv('AGENTE_WINDOW_PROVIDERS_PATH', join(profile, 'providers.json'))
    vi.stubEnv('AGENTE_WINDOW_SETTINGS_PATH', join(profile, 'settings.json'))
    vi.stubEnv('AGENTE_WINDOW_PERSONALIZACOES_PATH', join(profile, 'personalizacoes.json'))
    server = await listen()
  })

  afterEach(async () => {
    cleanupFault.releaseDelete?.()
    cleanupFault.blockDelete = false
    cleanupFault.failDelete = false
    await server.close()
    for (const { id, slug } of touched) {
      try { await deleteTranscript(slug, id) } catch { /* limpeza best-effort do perfil sintético */ }
      try { deleteSessionRecord(id) } catch { /* idem */ }
    }
    resetDatabase()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  async function criar(server: HttpServerHandle, marker: string): Promise<{ id: string; revision: number }> {
    const id = randomUUID()
    const session = makeSession(id, id, marker)
    touched.push({ id, slug: id })
    const result = await putSession(server, session, revisions)
    expect(result.status).toBe(200)
    return { id, revision: result.revision! }
  }

  it('T1 — DELETE com identidade é idempotente: reenvio consulta o estado e não remove de novo', async () => {
    const { id, revision } = await criar(server, 't1')
    const primeira = await deleteSession(server, id, revision)
    expect(primeira.status).toBe(200)
    const corpo1 = await primeira.json() as { ok: boolean; estado: string; deletionId: string }
    expect(corpo1).toMatchObject({ ok: true, estado: 'concluido' })
    expect(getSessionRecordRaw(id)).toBeUndefined()
    expect(await readTranscript(id, id).catch(() => [])).toEqual([])
    const linha = getDatabase().prepare('SELECT * FROM session_deletions WHERE session_id=?').get(id) as { deletion_id: string; cleanup_state: string; requested_at: number }
    expect(linha.cleanup_state).toBe('concluido')
    // Reenvio do MESMO pedido: consulta sem repetição (requested_at imutável).
    const segunda = await deleteSession(server, id, revision, { deletionId: corpo1.deletionId })
    expect(segunda.status).toBe(200)
    expect(await segunda.json()).toMatchObject({ ok: true, estado: 'concluido', deletionId: corpo1.deletionId })
    const linhaDepois = getDatabase().prepare('SELECT * FROM session_deletions WHERE session_id=?').get(id) as typeof linha
    expect(linhaDepois).toEqual(linha)
    const indice = await loadIndex(server)
    expect(indice.sessions.some((s) => s.id === id)).toBe(false)
    expect(indice.unavailable.some((u) => u.sessionId === id)).toBe(false)
  })

  it('T2 — revisão divergente: 409 estável, sem tombstone e sem tocar no registro', async () => {
    const { id, revision } = await criar(server, 't2')
    const stale = await deleteSession(server, id, revision - 1)
    expect(stale.status).toBe(409)
    expect(await stale.json()).toMatchObject({ code: 'deletion_revision_mismatch' })
    expect(getDatabase().prepare('SELECT COUNT(*) c FROM session_deletions WHERE session_id=?').get(id)).toEqual({ c: 0 })
    expect(getSessionRecord(id)).toBeDefined()
    expect((await fetch(`${server.baseUrl}/api/sessions/${id}`)).status).toBe(200)
  })

  it('T3 — reenvio com OUTRA identidade e mesma revisão não troca o alvo registrado', async () => {
    const { id, revision } = await criar(server, 't3')
    const identidadeA = randomUUID()
    const primeira = await deleteSession(server, id, revision, { deletionId: identidadeA })
    expect(primeira.status).toBe(200)
    const segunda = await deleteSession(server, id, revision, { deletionId: randomUUID() })
    expect(segunda.status).toBe(200)
    expect(await segunda.json()).toMatchObject({ estado: 'concluido', deletionId: identidadeA })
    expect(consultarDelecao(id)?.deletionId).toBe(identidadeA)
  })

  it('T4 — PUT e POST tardios recebem 410; inexistente continua 404; run/agir recusa o ciclo de vida', async () => {
    const { id, revision } = await criar(server, 't4')
    expect((await deleteSession(server, id, revision)).status).toBe(200)
    const mutacao = { session: makeSession(id, id, 't4-tardio'), expectedRevision: revision, mutationId: randomUUID() }
    const put = await fetch(`${server.baseUrl}/api/sessions`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(mutacao) })
    expect(put.status).toBe(410)
    expect(await put.json()).toMatchObject({ code: 'session_deleted' })
    const post = await fetch(`${server.baseUrl}/api/sessions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: makeSession(id, id, 't4-recriar'), creationId: randomUUID() }) })
    expect(post.status).toBe(410)
    expect(await post.json()).toMatchObject({ code: 'session_deleted' })
    const get = await fetch(`${server.baseUrl}/api/sessions/${id}`)
    expect(get.status).toBe(410)
    const desconhecida = await fetch(`${server.baseUrl}/api/sessions/${randomUUID()}`)
    expect(desconhecida.status).toBe(404)
    // Callbacks/leitores de run conferem o ciclo de vida (todos os fluxos Agir
    // passam por resolverContextoAgir — início, instrução, aprovação, stream).
    const contexto = resolverContextoAgir(id, 'chat-main')
    expect(contexto.ok).toBe(false)
    expect(contexto.ok === false && contexto.message).toContain('excluída')
    const instrucao = await fetch(`${server.baseUrl}/api/agir/instruction`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: id, chatId: 'chat-main', fluxo: 'user', text: 'tarde demais' }),
    })
    expect(instrucao.status).toBe(409)
    expect((await instrucao.json()).message).toContain('excluída')
  })

  it('T5 — DELETE entre saves: revisão movida durante a exclusão vira conflito honesto e não recria', async () => {
    const { id, revision } = await criar(server, 't5')
    const editada = makeSession(id, id, 't5')
    editada.title = 't5-editada'
    const salvar = await putSession(server, editada, revisions)
    expect(salvar.status).toBe(200)
    const comRevisaoAntiga = await deleteSession(server, id, revision)
    expect(comRevisaoAntiga.status).toBe(409)
    expect(await comRevisaoAntiga.json()).toMatchObject({ code: 'deletion_revision_mismatch' })
    expect(getSessionRecord(id)?.title).toBe('t5-editada')
    const comRevisaoNova = await deleteSession(server, id, salvar.revision!)
    expect(comRevisaoNova.status).toBe(200)
    expect((await comRevisaoNova.json()).estado).toBe('concluido')
    const depois = await putSession(server, editada, revisions)
    expect(depois.status).toBe(410)
    expect(depois.body).toMatchObject({ code: 'session_deleted' })
  })

  it('T6 — conflito com intenção P-B: DELETE recusa sob intenção pendente e preserva os dois protocolos', async () => {
    // Fixtures de intenção mínima antecedem o primeiro toque (migração aditiva).
    getDatabase().exec(`CREATE TABLE session_write_intents(session_id TEXT PRIMARY KEY REFERENCES sessions(id), marker TEXT)`)
    const { id, revision } = await criar(server, 't6')
    getDatabase().prepare(`INSERT INTO session_write_intents(session_id, marker) VALUES(?, 'pending')`).run(id)
    const recusa = await deleteSession(server, id, revision)
    expect(recusa.status).toBe(409)
    expect(await recusa.json()).toMatchObject({ code: 'session_publication_pending' })
    // A fronteira P-B bloqueia o leitor de contrato; o registro bruto prova
    // que nada foi removido.
    expect(getDatabase().prepare('SELECT title FROM sessions WHERE id=?').get(id)).toEqual({ title: 't6' })
    expect(consultarDelecao(id)).toBeUndefined()
    expect(getDatabase().prepare('SELECT marker FROM session_write_intents WHERE session_id=?').get(id)).toEqual({ marker: 'pending' })
    getDatabase().prepare('DELETE FROM session_write_intents WHERE session_id=?').run(id)
    const liberado = await deleteSession(server, id, revision)
    expect(liberado.status).toBe(200)
    expect((await liberado.json()).estado).toBe('concluido')
  })

  it('T7 — reinício na fronteira `preparado`: a listagem retoma e conclui sem avisar sucesso antes', async () => {
    const { id, revision } = await criar(server, 't7')
    // Simula queda ANTES da fase destrutiva: tombstone gravado, nada removido.
    getDatabase().prepare(`INSERT INTO session_deletions (session_id, deletion_id, revision, requested_at, cleanup_state)
      VALUES (?, ?, ?, ?, 'preparado')`).run(id, randomUUID(), revision, Date.now())
    const indice = await loadIndex(server)
    expect(indice.sessions.some((s) => s.id === id)).toBe(false)
    expect(indice.unavailable.some((u) => u.sessionId === id)).toBe(false)
    expect(getSessionRecordRaw(id)).toBeUndefined()
    expect(await readTranscript(id, id).catch(() => [])).toEqual([])
    expect(consultarDelecao(id)?.cleanupState).toBe('concluido')
  })

  it('T8 — reinício na fronteira `limpeza_pendente` com registro e transcript: retomada completa', async () => {
    const { id, revision } = await criar(server, 't8')
    getDatabase().prepare(`INSERT INTO session_deletions (session_id, deletion_id, revision, requested_at, cleanup_state)
      VALUES (?, ?, ?, ?, 'limpeza_pendente')`).run(id, randomUUID(), revision, Date.now())
    const indice = await loadIndex(server)
    expect(indice.sessions.some((s) => s.id === id)).toBe(false)
    expect(indice.unavailable).toEqual([])
    expect(getSessionRecordRaw(id)).toBeUndefined()
    expect(consultarDelecao(id)?.cleanupState).toBe('concluido')
  })

  it('T9 — reinício entre remoção do registro e conclusão: só a conclusão falta e acontece', async () => {
    const { id, revision } = await criar(server, 't9')
    await deleteTranscript(id, id)
    deleteSessionRecord(id)
    getDatabase().prepare(`INSERT INTO session_deletions (session_id, deletion_id, revision, requested_at, cleanup_state)
      VALUES (?, ?, ?, ?, 'limpeza_pendente')`).run(id, randomUUID(), revision, Date.now())
    const indice = await loadIndex(server)
    expect(indice.sessions.some((s) => s.id === id)).toBe(false)
    expect(indice.unavailable).toEqual([])
    expect(consultarDelecao(id)?.cleanupState).toBe('concluido')
  })

  it('T10 — falha de limpeza NÃO vira sucesso: código estável, visível e retomável; a outra sessão segue intacta', async () => {
    const alvo = await criar(server, 't10-alvo')
    const vizinha = await criar(server, 't10-vizinha')
    cleanupFault.failDelete = true
    const falha = await deleteSession(server, alvo.id, alvo.revision)
    expect(falha.status).toBe(503)
    expect(await falha.json()).toMatchObject({ code: 'session_cleanup_failed' })
    expect(consultarDelecao(alvo.id)?.cleanupState).toBe('limpeza_pendente')
    // Metadados conservados para a retomada… mas o leitor de contrato recusa (410).
    expect(getSessionRecordRaw(alvo.id)).toBeDefined()
    expect(() => getSessionRecord(alvo.id)).toThrow(/excluída/)
    const indice = await loadIndex(server)
    expect(indice.sessions.some((s) => s.id === alvo.id)).toBe(false)
    expect(indice.unavailable).toEqual([{ sessionId: alvo.id, code: 'session_cleanup_failed' }])
    // P-T07 — a OUTRA sessão grava e aparece durante a limpeza pendente.
    const edicao = makeSession(vizinha.id, vizinha.id, 't10-vizinha')
    edicao.title = 't10-vizinha-editada'
    expect((await putSession(server, edicao, revisions)).status).toBe(200)
    const indiceDepois = await loadIndex(server)
    expect(indiceDepois.sessions.find((s) => s.id === vizinha.id)?.title).toBe('t10-vizinha-editada')
    expect(indiceDepois.unavailable.some((u) => u.sessionId === alvo.id)).toBe(true)
    // Retomada com a falha resolvida: mesmo alvo, nova tentativa conclui.
    cleanupFault.failDelete = false
    const retomada = await deleteSession(server, alvo.id, alvo.revision)
    expect(retomada.status).toBe(200)
    expect((await retomada.json()).estado).toBe('concluido')
    expect(getSessionRecordRaw(alvo.id)).toBeUndefined()
    expect((await loadIndex(server)).unavailable).toEqual([])
  })

  it('leaves private attachments untouched on repeated list refreshes and resumes only on explicit deletion', async () => {
    const alvo = await criar(server, 'conversa com anexo')
    const vizinha = await criar(server, 'conversa vizinha')
    await publicarArtefatoGerenciado({
      sessionId: alvo.id, chatId: 'chat-main', runId: 'run', generation: 1,
      messageId: 'msg', partId: 'part', tentativa: '1', name: 'arquivo.txt',
    }, Buffer.from('conteudo privado'))
    const destino = join(mkdtempSync(join(tmpdir(), 'agent-pc-trash-')), 'arquivo.txt')
    const mover = vi.spyOn(lixeiraDoSistema, 'mover')
      .mockResolvedValueOnce({ ok: false, motivo: 'Lixeira indisponível' })
      .mockImplementation(async (origem) => { renameSync(origem, destino); return { ok: true, destino } })

    expect((await deleteSession(server, alvo.id, alvo.revision)).status).toBe(503)
    expect(mover).toHaveBeenCalledTimes(1)
    const origem = mover.mock.calls[0][0]
    for (let i = 0; i < 2; i++) {
      const indice = await loadIndex(server)
      expect(indice.sessions.map(session => session.id)).toEqual([vizinha.id])
      expect(indice.unavailable).toEqual([{
        sessionId: alvo.id, code: 'session_cleanup_pending', deletionRevision: alvo.revision, titulo: 'conversa com anexo',
      }])
    }
    expect(mover).toHaveBeenCalledTimes(1)
    expect(readFileSync(origem, 'utf8')).toBe('conteudo privado')
    expect((await deleteSession(server, vizinha.id, vizinha.revision, { resumeCleanup: true })).status).toBe(409)
    expect(consultarDelecao(vizinha.id)).toBeUndefined()
    const retomada = await deleteSession(server, alvo.id, alvo.revision, { resumeCleanup: true })
    expect(retomada.status).toBe(200)
    expect(await retomada.json()).toMatchObject({ estado: 'concluido' })
    expect(mover).toHaveBeenCalledTimes(2)
    expect(readFileSync(destino, 'utf8')).toBe('conteudo privado')
    expect((await loadIndex(server)).unavailable).toEqual([])
  })

  it('T11 — concorrência: exclusão em voo não derruba a sessão vizinha (fila por sessão)', async () => {
    const alvo = await criar(server, 't11-alvo')
    const vizinha = await criar(server, 't11-vizinha')
    let started: () => void
    const startedPromise = new Promise<void>((resolve) => { started = resolve })
    cleanupFault.blockDelete = true
    cleanupFault.deleteStarted = () => started()
    const emVoo = deleteSession(server, alvo.id, alvo.revision)
    await startedPromise
    const edicao = makeSession(vizinha.id, vizinha.id, 't11-vizinha')
    edicao.title = 'salvo-durante-exclusao'
    expect((await putSession(server, edicao, revisions)).status).toBe(200)
    cleanupFault.blockDelete = false
    cleanupFault.releaseDelete!()
    expect((await emVoo).status).toBe(200)
    const indice = await loadIndex(server)
    expect(indice.sessions.find((s) => s.id === vizinha.id)?.title).toBe('salvo-durante-exclusao')
    expect(indice.sessions.some((s) => s.id === alvo.id)).toBe(false)
  })

  it('T12 — DELETE sem identidade de tentativa é recusado (400 estável) sem efeito', async () => {
    const { id, revision } = await criar(server, 't12')
    const semCorpo = await fetch(`${server.baseUrl}/api/sessions/${id}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: '{}' })
    expect(semCorpo.status).toBe(400)
    expect(await semCorpo.json()).toMatchObject({ code: 'invalid_deletion_request' })
    expect(getSessionRecord(id)).toBeDefined()
    expect(getDatabase().prepare('SELECT COUNT(*) c FROM session_deletions WHERE session_id=?').get(id)).toEqual({ c: 0 })
    expect(revision).toBeGreaterThan(0)
  })

  it('T13 — worktree sujo: 409 + rollback do tombstone; force remove só o worktree; pasta comum preservada', async () => {
    const profile = process.env.AGENTE_WINDOW_TEST_HOME!
    const repo = join(profile, 'repo-comum')
    mkdirSync(repo, { recursive: true })
    await git(repo, 'init')
    await git(repo, 'config', 'user.email', 'sintetico@local')
    await git(repo, 'config', 'user.name', 'Sintético')
    writeFileSync(join(repo, 'base.txt'), 'raiz\n')
    await git(repo, 'add', '.')
    await git(repo, 'commit', '-m', 'base')
    const id = randomUUID()
    const session = makeSession(id, id, 't13')
    session.workspacePath = repo
    touched.push({ id, slug: id })
    const criada = await putSession(server, session, revisions)
    expect(criada.status).toBe(200)
    const worktree = await createWorktree(repo, id, id)
    const registro = getSessionRecord(id)!
    upsertSessionRecord({ ...registro, worktreePath: worktree.path, sessionJson: JSON.stringify({ ...JSON.parse(registro.sessionJson), worktreePath: worktree.path }) })
    writeFileSync(join(worktree.path, 'sujo.txt'), 'alteração local não commitada\n')
    const recusa = await deleteSession(server, id, criada.revision!)
    expect(recusa.status).toBe(409)
    expect(await recusa.json()).toMatchObject({ code: 'worktree_dirty' })
    // Nada destrutivo aconteceu: tombstone desfeito, registro e worktree intactos.
    expect(consultarDelecao(id)).toBeUndefined()
    expect(getSessionRecord(id)).toBeDefined()
    expect(existsSync(join(worktree.path, 'sujo.txt'))).toBe(true)
    // force explícito (o cliente pede confirmação específica) conclui a exclusão…
    const forcada = await deleteSession(server, id, criada.revision!, { force: true })
    expect(forcada.status).toBe(200)
    expect((await forcada.json()).estado).toBe('concluido')
    expect(existsSync(worktree.path)).toBe(false)
    // …sem nunca tocar na pasta comum (repositório de origem).
    expect(existsSync(join(repo, 'base.txt'))).toBe(true)
    expect(existsSync(repo)).toBe(true)
  })

  it('T14 — pasta comum (workspace sem worktree) nunca é removida pela exclusão', async () => {
    const profile = process.env.AGENTE_WINDOW_TEST_HOME!
    const pastaComum = join(profile, 'pasta-comum')
    mkdirSync(pastaComum, { recursive: true })
    writeFileSync(join(pastaComum, 'arquivo-do-usuario.txt'), 'conteúdo sintético\n')
    const id = randomUUID()
    const session = makeSession(id, id, 't14')
    session.workspacePath = pastaComum
    touched.push({ id, slug: id })
    const criada = await putSession(server, session, revisions)
    expect(criada.status).toBe(200)
    const excluida = await deleteSession(server, id, criada.revision!)
    expect(excluida.status).toBe(200)
    expect(existsSync(join(pastaComum, 'arquivo-do-usuario.txt'))).toBe(true)
  })

  it('T15 — worktree fora do diretório gerenciado: recusa estável e o diretório alheio permanece', async () => {
    const profile = process.env.AGENTE_WINDOW_TEST_HOME!
    const alheio = join(profile, 'worktree-alheio')
    mkdirSync(alheio, { recursive: true })
    writeFileSync(join(alheio, 'x.txt'), 'intocável\n')
    const { id, revision } = await criar(server, 't15')
    const registro = getSessionRecord(id)!
    upsertSessionRecord({ ...registro, worktreePath: alheio, sessionJson: JSON.stringify({ ...JSON.parse(registro.sessionJson), worktreePath: alheio }) })
    const recusa = await deleteSession(server, id, revision)
    expect(recusa.status).toBe(503)
    expect(await recusa.json()).toMatchObject({ code: 'session_cleanup_failed' })
    expect(existsSync(join(alheio, 'x.txt'))).toBe(true)
    // Estado honesto e retomável: pendente visível, nunca sucesso.
    const indice = await loadIndex(server)
    expect(indice.sessions.some((s) => s.id === id)).toBe(false)
    expect(indice.unavailable).toEqual([{ sessionId: id, code: 'session_cleanup_failed' }])
    expect(consultarDelecao(id)?.cleanupState).not.toBe('concluido')
  })

  it('T16 — duas exclusões paralelas do mesmo alvo resolvem numa única identidade vencedora', async () => {
    const { id, revision } = await criar(server, 't16')
    const [a, b] = await Promise.all([
      deleteSession(server, id, revision),
      deleteSession(server, id, revision),
    ])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    const linhas = getDatabase().prepare('SELECT COUNT(*) c FROM session_deletions WHERE session_id=?').get(id) as { c: number }
    expect(linhas.c).toBe(1)
    expect(consultarDelecao(id)?.cleanupState).toBe('concluido')
    expect(getSessionRecordRaw(id)).toBeUndefined()
  })

  it('T18 — leitores de contrato conferem o ciclo de vida; identidade desconhecida também bloqueia recriação', async () => {
    const { id, revision } = await criar(server, 't18')
    cleanupFault.failDelete = true
    expect((await deleteSession(server, id, revision)).status).toBe(503)
    expect(() => getSessionRecord(id)).toThrow(/excluída/)
    expect(getSessionRecordRaw(id)).toBeDefined()
    cleanupFault.failDelete = false
    expect((await deleteSession(server, id, revision)).status).toBe(200)
    // Mesmo concluído, o leitor de contrato continua distinguindo "excluída"
    // de "inexistente": gravação/leitura nunca recebem404 complacente.
    expect(() => getSessionRecord(id)).toThrow(/excluída/)
    // DELETE de identidade nunca vista registra o bloqueio: um POST/PUT tardio
    // com essa identidade não recria nada.
    const desconhecida = randomUUID()
    expect((await deleteSession(server, desconhecida, 0)).status).toBe(200)
    expect(consultarDelecao(desconhecida)?.cleanupState).toBe('concluido')
    const put = await fetch(`${server.baseUrl}/api/sessions`, {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session: makeSession(desconhecida, desconhecida, 't18-tardio'), expectedRevision: 0, mutationId: randomUUID() }),
    })
    expect(put.status).toBe(410)
    expect(await put.json()).toMatchObject({ code: 'session_deleted' })
  })

  it('T17 — a identidade do registro não some sem conclusão: `concluido` exige o escopo inteiro', async () => {
    const { id, revision } = await criar(server, 't17')
    cleanupFault.failDelete = true
    expect((await deleteSession(server, id, revision)).status).toBe(503)
    // Transcript e registro continuam (metadados conservados durante a limpeza)…
    expect(getSessionRecordRaw(id)).toBeDefined()
    // …mas nenhum leitor de contrato serve conteúdo desta conversa (410).
    expect(() => getSessionRecord(id)).toThrow(/excluída/)
    const entries = await readTranscript(id, id)
    expect(entries.length).toBeGreaterThan(0)
    expect(consultarDelecao(id)?.cleanupState).toBe('limpeza_pendente')
    cleanupFault.failDelete = false
    expect((await deleteSession(server, id, revision)).status).toBe(200)
    expect(consultarDelecao(id)?.cleanupState).toBe('concluido')
    expect(getSessionRecordRaw(id)).toBeUndefined()
  })

  it('T19 — DELETE com execução viva na sessão é recusado (409 session_run_active) sem tombstone', async () => {
    const { id, revision } = await criar(server, 't19')
    runFault.ativo = true
    const recusa = await deleteSession(server, id, revision)
    expect(recusa.status).toBe(409)
    expect(await recusa.json()).toMatchObject({ code: 'session_run_active' })
    // Nada destrutivo sob o run vivo: sem tombstone, registro e leitura intactos.
    expect(getDatabase().prepare('SELECT COUNT(*) c FROM session_deletions WHERE session_id=?').get(id)).toEqual({ c: 0 })
    expect(consultarDelecao(id)).toBeUndefined()
    expect(getSessionRecord(id)).toBeDefined()
    expect((await fetch(`${server.baseUrl}/api/sessions/${id}`)).status).toBe(200)
    // Run encerrado → o MESMO pedido conclui: o único bloqueio era a execução.
    runFault.ativo = false
    const liberado = await deleteSession(server, id, revision)
    expect(liberado.status).toBe(200)
    expect((await liberado.json()).estado).toBe('concluido')
    expect(getSessionRecordRaw(id)).toBeUndefined()
  })
})
