import { afterAll, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { getDatabasePath } from './paths'
import type { Checkpoint } from './checkpoint'
import {
  deleteSessionRecord,
  getCheckpoint,
  grantSessionTool,
  listSessionToolGrants,
  revokeSessionToolGrants,
  removerCheckpointsDeChatsAusentes,
  saveCheckpoint,
  upsertSessionRecord,
} from './database'

const isolatedHome = process.env.AGENTE_WINDOW_TEST_HOME
const run = isolatedHome ? describe : describe.skip
const sessionId = 'f1-grants-test-session'
const workspace = '/tmp/f1-grants-workspace'

run('server-side session tool grants (runs only with AGENTE_WINDOW_TEST_HOME set)', () => {
  afterAll(() => {
    deleteSessionRecord(sessionId)
  })

  it('stores grants by persisted session and canonical workspace, and revokes on scope change', () => {
    upsertSessionRecord({
      id: sessionId,
      slug: 'f1-test',
      title: 'F1 test',
      workspacePath: workspace,
      worktreePath: null,
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: sessionId, workspacePath: workspace, worktreePath: null, chats: [] }),
    })
    expect(listSessionToolGrants(sessionId, workspace)).toEqual([])
    grantSessionTool(sessionId, workspace, 'criar')
    grantSessionTool(sessionId, workspace, 'escrever')
    grantSessionTool(sessionId, workspace, 'executar')
    expect(listSessionToolGrants(sessionId, workspace).sort()).toEqual(['criar', 'escrever', 'executar'])
    expect(listSessionToolGrants(sessionId, '/tmp/other-workspace')).toEqual([])
    revokeSessionToolGrants(sessionId)
    expect(listSessionToolGrants(sessionId, workspace)).toEqual([])
  })

  it('deletes grants with the owning session record', () => {
    upsertSessionRecord({
      id: sessionId,
      slug: 'f1-test',
      title: 'F1 test',
      workspacePath: workspace,
      worktreePath: null,
      messageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: sessionId, workspacePath: workspace, worktreePath: null, chats: [] }),
    })
    grantSessionTool(sessionId, workspace, 'criar')
    deleteSessionRecord(sessionId)
    expect(listSessionToolGrants(sessionId, workspace)).toEqual([])
  })

  it('keeps the old checkpoint on storage failure, detects corruption and deletes derived state with its owner', () => {
    upsertSessionRecord({
      id: sessionId, slug: 'f1-test', title: 'Checkpoint fixture', workspacePath: workspace, worktreePath: null,
      messageCount: 0, createdAt: 1, updatedAt: 1, sessionJson: JSON.stringify({ id: sessionId, chats: [] }),
    })
    const checkpoint: Checkpoint = { version: 1, estrategia: 'manual', escopo: 'fixture', resumo: 'Anterior',
      providerId: 'fixture', modelId: 'm', criadoEm: 1, quantidade: 2, ultimoId: 'm2', digest: 'digest' }
    saveCheckpoint(sessionId, 'a', checkpoint)
    saveCheckpoint(sessionId, 'b', checkpoint)
    const db = new Database(getDatabasePath(), { fileMustExist: true })
    try {
      db.exec(`CREATE TRIGGER fixture_checkpoint_failure BEFORE UPDATE ON session_checkpoints
        WHEN NEW.session_id = 'f1-grants-test-session' BEGIN SELECT RAISE(ABORT, 'synthetic'); END;`)
      expect(() => saveCheckpoint(sessionId, 'a', { ...checkpoint, resumo: 'Novo' })).toThrow()
      expect(getCheckpoint(sessionId, 'a')).toEqual(checkpoint)
      db.exec('DROP TRIGGER fixture_checkpoint_failure')
      db.prepare('UPDATE session_checkpoints SET checkpoint_json = ? WHERE session_id = ? AND chat_id = ?').run('{', sessionId, 'a')
      expect(getCheckpoint(sessionId, 'a')).toBeNull()
      removerCheckpointsDeChatsAusentes(sessionId, ['b'])
      expect(getCheckpoint(sessionId, 'a')).toBeUndefined()
      expect(getCheckpoint(sessionId, 'b')).toEqual(checkpoint)
      deleteSessionRecord(sessionId)
      expect(getCheckpoint(sessionId, 'b')).toBeUndefined()
    } finally {
      db.exec('DROP TRIGGER IF EXISTS fixture_checkpoint_failure')
      db.close()
    }
  })
})
