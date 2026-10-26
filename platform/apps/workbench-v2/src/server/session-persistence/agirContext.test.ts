import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { grantSessionTool, deleteSessionRecord, upsertSessionRecord } from './database'
import { resolverContextoAgir } from './agirContext'

const suite = process.env.AGENTE_WINDOW_TEST_HOME ? describe : describe.skip
const sessionId = 'f1-context-test-session'
let workspace: string

suite('Agir server context (isolated HOME)', () => {
  beforeAll(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'f1-session-context-'))
    const now = Date.now()
    upsertSessionRecord({
      id: sessionId,
      slug: 'f1-context',
      title: 'F1 context',
      workspacePath: workspace,
      worktreePath: null,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      sessionJson: JSON.stringify({ id: sessionId, workspacePath: workspace, worktreePath: null, chats: [{ id: 'chat-a' }] }),
    })
    grantSessionTool(sessionId, resolve(workspace), 'criar')
  })

  afterAll(async () => {
    deleteSessionRecord(sessionId)
    if (workspace) await rm(workspace, { recursive: true, force: true })
  })

  it('resolves the canonical root and server-side grant from the persisted session', () => {
    expect(resolverContextoAgir(sessionId, 'chat-a')).toEqual({
      ok: true,
      raiz: resolve(workspace),
      permissoes: ['criar'],
    })
  })

  it('rejects a conversation that is not owned by the persisted session', () => {
    expect(resolverContextoAgir(sessionId, 'chat-other')).toMatchObject({ ok: false })
  })

  it('rejects an unknown session instead of trusting a browser workspace claim', () => {
    expect(resolverContextoAgir('not-registered', 'chat-a')).toMatchObject({ ok: false })
  })

  it('rejects malformed persisted context', () => {
    const now = Date.now()
    upsertSessionRecord({
      id: sessionId,
      slug: 'f1-context',
      title: 'F1 context',
      workspacePath: workspace,
      worktreePath: null,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      sessionJson: JSON.stringify({ id: 'different-id', workspacePath: workspace, worktreePath: null }),
    })
    expect(resolverContextoAgir(sessionId, 'chat-a')).toMatchObject({ ok: false })
    upsertSessionRecord({
      id: sessionId,
      slug: 'f1-context',
      title: 'F1 context',
      workspacePath: workspace,
      worktreePath: null,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
      sessionJson: JSON.stringify({ id: sessionId, workspacePath: workspace, worktreePath: null, chats: [] }),
    })
  })
})
