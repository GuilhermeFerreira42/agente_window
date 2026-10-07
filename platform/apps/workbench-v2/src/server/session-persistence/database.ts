import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { getDatabasePath } from './paths'

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

function getDatabase(): Database.Database {
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
  return database
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

export function deleteSessionRecord(id: string): SessionRecord | undefined {
  const existing = getSessionRecord(id)
  if (existing) getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(id)
  return existing
}
