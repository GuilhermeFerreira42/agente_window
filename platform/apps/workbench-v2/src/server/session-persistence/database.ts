import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { getDatabasePath } from './paths'
import type { Checkpoint } from './checkpoint'
import type { MemoriaProjeto } from '../../domain/memoriaProjeto'

export interface SessionRecord {
  id: string
  slug: string
  title: string
  workspacePath: string
  worktreePath: string | null
  messageCount: number
  createdAt: number
  updatedAt: number
  sessionJson: string
}

let database: Database.Database | undefined

/** Internal persistence connection; repositories in this module share one owner/transaction. */
export function getDatabase(): Database.Database {
  if (database) return database
  const databasePath = getDatabasePath()
  mkdirSync(dirname(databasePath), { recursive: true })
  database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.pragma('foreign_keys = ON')
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      worktree_path TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      session_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_updated_at_idx ON sessions(updated_at DESC);
    CREATE INDEX IF NOT EXISTS sessions_slug_idx ON sessions(slug);
  `)
  const columns = database.prepare('PRAGMA table_info(sessions)').all() as Array<{ name: string; notnull: number }>
  if (columns.find((column) => column.name === 'worktree_path')?.notnull === 1) {
    database.transaction(() => {
      database!.exec(`
        ALTER TABLE sessions RENAME TO sessions_legacy_064a;
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL,
          workspace_path TEXT NOT NULL, worktree_path TEXT,
          message_count INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          session_json TEXT NOT NULL
        );
        INSERT INTO sessions SELECT * FROM sessions_legacy_064a;
        DROP TABLE sessions_legacy_064a;
        CREATE INDEX sessions_updated_at_idx ON sessions(updated_at DESC);
        CREATE INDEX sessions_slug_idx ON sessions(slug);
      `)
    })()
  }
  database.exec(`
    CREATE TABLE IF NOT EXISTS session_tool_grants (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_path TEXT NOT NULL,
      tool_id TEXT NOT NULL CHECK (tool_id IN ('criar', 'escrever')),
      granted_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, workspace_path, tool_id)
    );
    CREATE TABLE IF NOT EXISTS session_command_grants (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_path TEXT NOT NULL,
      tool_id TEXT NOT NULL CHECK (tool_id = 'executar'),
      granted_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, workspace_path, tool_id)
    );
    CREATE TABLE IF NOT EXISTS session_checkpoints (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL,
      checkpoint_json TEXT NOT NULL,
      PRIMARY KEY (session_id, chat_id)
    );
    CREATE TABLE IF NOT EXISTS project_memories (
      project_key TEXT NOT NULL,
      memory_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      current INTEGER NOT NULL CHECK (current IN (0, 1)),
      record_json TEXT NOT NULL,
      PRIMARY KEY (project_key, memory_id, revision)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS project_memory_current_idx
      ON project_memories (project_key, memory_id) WHERE current = 1;
  `)
  return database
}

export function listarMemoriasProjeto(projeto: string): MemoriaProjeto[] {
  const rows = getDatabase().prepare(`
    SELECT current, record_json AS json FROM project_memories WHERE project_key = ?
    ORDER BY current DESC, rowid DESC
  `).all(projeto) as Array<{ current: number; json: string }>
  return rows.map(({ current, json }) => ({ ...JSON.parse(json) as MemoriaProjeto, vigente: current === 1 }))
}

export function publicarMemoriaProjeto(
  projeto: string, registro: Omit<MemoriaProjeto, 'revisao' | 'vigente'>, esperada: number,
): 'ok' | 'conflito' | 'limite' {
  const db = getDatabase()
  return db.transaction(() => {
    const atual = db.prepare('SELECT revision FROM project_memories WHERE project_key = ? AND memory_id = ? AND current = 1')
      .get(projeto, registro.id) as { revision: number } | undefined
    if ((atual?.revision ?? 0) !== esperada) return 'conflito' as const
    const { quantidade } = db.prepare('SELECT COUNT(*) AS quantidade FROM project_memories WHERE project_key = ?')
      .get(projeto) as { quantidade: number }
    if (quantidade >= 250) return 'limite' as const
    if (atual) db.prepare('UPDATE project_memories SET current = 0 WHERE project_key = ? AND memory_id = ? AND current = 1')
      .run(projeto, registro.id)
    const memoria: MemoriaProjeto = { ...registro, revisao: esperada + 1, vigente: true }
    db.prepare('INSERT INTO project_memories VALUES (?, ?, ?, 1, ?)')
      .run(projeto, memoria.id, memoria.revisao, JSON.stringify(memoria))
    return 'ok' as const
  }).immediate()
}

export function excluirMemoriaProjeto(projeto: string, id: string, revisao: number): boolean {
  const db = getDatabase()
  return db.transaction(() => {
    const existe = db.prepare('SELECT 1 FROM project_memories WHERE project_key = ? AND memory_id = ? AND current = 1 AND revision = ?')
      .get(projeto, id, revisao)
    return !!existe && db.prepare('DELETE FROM project_memories WHERE project_key = ? AND memory_id = ?')
      .run(projeto, id).changes > 0
  }).immediate()
}

export function getCheckpoint(sessionId: string, chatId: string): Checkpoint | null | undefined {
  const row = getDatabase().prepare('SELECT checkpoint_json AS json FROM session_checkpoints WHERE session_id = ? AND chat_id = ?')
    .get(sessionId, chatId) as { json: string } | undefined
  if (!row) return
  try {
    const valor = JSON.parse(row.json) as Checkpoint | null
    return valor && typeof valor === 'object' ? valor : null
  } catch {
    return null
  }
}

export function removerCheckpointsDeChatsAusentes(sessionId: string, chatIds: string[]): void {
  getDatabase().prepare(`
    DELETE FROM session_checkpoints WHERE session_id = ?
    AND NOT EXISTS (SELECT 1 FROM json_each(?) WHERE value = session_checkpoints.chat_id)
  `).run(sessionId, JSON.stringify(chatIds))
}

export function saveCheckpoint(sessionId: string, chatId: string, checkpoint: Checkpoint): void {
  getDatabase().prepare(`
    INSERT INTO session_checkpoints (session_id, chat_id, checkpoint_json) VALUES (?, ?, ?)
    ON CONFLICT (session_id, chat_id) DO UPDATE SET checkpoint_json = excluded.checkpoint_json
  `).run(sessionId, chatId, JSON.stringify(checkpoint))
}

export function listSessionRecords(): SessionRecord[] {
  return getDatabase().prepare(`
    SELECT id, slug, title, workspace_path AS workspacePath,
      worktree_path AS worktreePath, message_count AS messageCount,
      created_at AS createdAt, updated_at AS updatedAt, session_json AS sessionJson
    FROM sessions
    ORDER BY updated_at DESC
  `).all() as SessionRecord[]
}

export function upsertSessionRecord(record: SessionRecord): void {
  getDatabase().prepare(`
    INSERT INTO sessions (
      id, slug, title, workspace_path, worktree_path, message_count,
      created_at, updated_at, session_json
    ) VALUES (
      @id, @slug, @title, @workspacePath, @worktreePath, @messageCount,
      @createdAt, @updatedAt, @sessionJson
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      workspace_path = excluded.workspace_path,
      worktree_path = excluded.worktree_path,
      message_count = excluded.message_count,
      updated_at = excluded.updated_at,
      session_json = excluded.session_json
  `).run(record)
}

export function getSessionRecord(id: string): SessionRecord | undefined {
  return getDatabase().prepare(`
    SELECT id, slug, title, workspace_path AS workspacePath,
      worktree_path AS worktreePath, message_count AS messageCount,
      created_at AS createdAt, updated_at AS updatedAt, session_json AS sessionJson
    FROM sessions WHERE id = ?
  `).get(id) as SessionRecord | undefined
}

export type SessionToolGrant = 'criar' | 'escrever' | 'executar'

export function listSessionToolGrants(sessionId: string, workspacePath: string): SessionToolGrant[] {
  const db = getDatabase()
  const arquivos = db.prepare(
    'SELECT tool_id AS toolId FROM session_tool_grants WHERE session_id = ? AND workspace_path = ?',
  ).all(sessionId, workspacePath) as Array<{ toolId: 'criar' | 'escrever' }>
  const comandos = db.prepare(
    'SELECT tool_id AS toolId FROM session_command_grants WHERE session_id = ? AND workspace_path = ?',
  ).all(sessionId, workspacePath) as Array<{ toolId: 'executar' }>
  return [...arquivos.map((row) => row.toolId), ...comandos.map((row) => row.toolId)]
}

export function grantSessionTool(sessionId: string, workspacePath: string, toolId: SessionToolGrant): void {
  if (toolId === 'executar') {
    getDatabase().prepare(`
      INSERT INTO session_command_grants (session_id, workspace_path, tool_id, granted_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(session_id, workspace_path, tool_id) DO NOTHING
    `).run(sessionId, workspacePath, toolId, Date.now())
    return
  }
  getDatabase().prepare(`
    INSERT INTO session_tool_grants (session_id, workspace_path, tool_id, granted_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, workspace_path, tool_id) DO NOTHING
  `).run(sessionId, workspacePath, toolId, Date.now())
}

/** Workspace change revokes every session grant before the new root is used. */
export function revokeSessionToolGrants(sessionId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM session_tool_grants WHERE session_id = ?').run(sessionId)
  db.prepare('DELETE FROM session_command_grants WHERE session_id = ?').run(sessionId)
}

export function deleteSessionRecord(id: string): SessionRecord | undefined {
  const existing = getSessionRecord(id)
  if (existing) getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(id)
  return existing
}
