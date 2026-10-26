import { afterAll, describe, expect, it } from 'vitest'
import {
  deleteSessionRecord,
  grantSessionTool,
  listSessionToolGrants,
  revokeSessionToolGrants,
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
    expect(listSessionToolGrants(sessionId, workspace).sort()).toEqual(['criar', 'escrever'])
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
})
