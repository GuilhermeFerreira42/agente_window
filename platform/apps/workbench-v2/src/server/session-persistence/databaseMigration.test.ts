import Database from 'better-sqlite3'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, expect, it, vi } from 'vitest'
import { deleteSessionRecord, getSessionRecord, listSessionRecords, saveCheckpoint, upsertSessionRecord } from './database'

afterAll(() => vi.unstubAllEnvs())

it.skipIf(!process.env.AGENTE_WINDOW_TEST_HOME)('upgrades a pre-memory catalog without losing its session and cascades new derived records', () => {
  const profile = mkdtempSync(join(process.env.AGENTE_WINDOW_TEST_HOME!, 'm8-migration-'))
  vi.stubEnv('AGENTE_WINDOW_DATA_DIR', profile)
  const path = join(profile, 'agente_window.db')
  const legacy = new Database(path)
  legacy.exec(`CREATE TABLE sessions (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL, workspace_path TEXT NOT NULL,
    worktree_path TEXT NOT NULL, message_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, session_json TEXT NOT NULL
  ); INSERT INTO sessions VALUES ('legacy', 'legacy', 'Preserved', '/synthetic', '/synthetic/tree', 2, 1, 2, '{"id":"legacy","chats":[]}');`)
  legacy.close()
  expect(listSessionRecords()).toHaveLength(1)
  const record = getSessionRecord('legacy')!
  expect(record).toMatchObject({ title: 'Preserved', messageCount: 2, worktreePath: '/synthetic/tree' })
  upsertSessionRecord({ ...record, worktreePath: null })
  expect(getSessionRecord('legacy')?.worktreePath).toBeNull()
  saveCheckpoint('legacy', 'a', { version: 1, estrategia: 'manual', escopo: 'synthetic', resumo: 'Derived',
    providerId: 'fixture', modelId: 'fixture', criadoEm: 3, quantidade: 2, ultimoId: 'm2', digest: 'fixture' })
  const inspection = new Database(path)
  try {
    expect(inspection.prepare('SELECT COUNT(*) AS n FROM session_checkpoints').get()).toEqual({ n: 1 })
    expect(inspection.prepare('SELECT COUNT(*) AS n FROM project_memories').get()).toEqual({ n: 0 })
    deleteSessionRecord('legacy')
    expect(inspection.prepare('SELECT COUNT(*) AS n FROM session_checkpoints').get()).toEqual({ n: 0 })
  } finally { inspection.close() }
})
