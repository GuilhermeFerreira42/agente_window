import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { getDatabasePath } from './paths'
import type { Checkpoint } from './checkpoint'
import type { MemoriaProjeto } from '../../domain/memoriaProjeto'
import { PersistenceProblem } from './persistenceErrors'

export interface SessionRecord {
  id: string
  slug: string
  title: string
  /** C-1 — `null` somente para modalidade `chat` (raiz nula real). */
  workspacePath: string | null
  /** C-1 — modalidade explícita; catálogo é a autoridade (não inferir de rótulo/título). */
  contextKind: 'chat' | 'workspace'
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
  // Rebuilds renomeiam `sessions` e depois derrubam a tabela temporária. Com
  // `foreign_keys = ON`, o RENAME reescreve as referências dos filhos
  // (grants/checkpoints/deletions) para o nome temporário e o DROP os deixa
  // apontando para uma tabela fantasma — todo INSERT filho passa a falhar com
  // "no such table". Desligar FKs durante o rebuild mantém os filhos apontando
  // para `sessions`, que sempre volta a existir na mesma transação.
  database.pragma('foreign_keys = OFF')
  try {
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
  // C-1 (SPEC C §3) — modalidade explícita: coluna `context_kind` + `workspace_path`
  // anulável SOMENTE para Chat, com CHECK de coerência. Migração aditiva: IDs e
  // metadata preservados; toda linha legada recebe `workspace` (compatibilidade —
  // rótulo/título nunca reatribuem modalidade).
  const possuiContexto = columns.find((column) => column.name === 'context_kind') !== undefined
  const caminhoAnulavel = columns.find((column) => column.name === 'workspace_path')?.notnull === 0
  if (!possuiContexto || !caminhoAnulavel) {
    database.transaction(() => {
      database!.exec(`
        ALTER TABLE sessions RENAME TO sessions_legacy_c1;
        CREATE TABLE sessions (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL,
          workspace_path TEXT, worktree_path TEXT,
          context_kind TEXT NOT NULL DEFAULT 'workspace' CHECK (context_kind IN ('chat', 'workspace')),
          message_count INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
          session_json TEXT NOT NULL,
          CHECK ((context_kind = 'workspace' AND workspace_path IS NOT NULL)
              OR (context_kind = 'chat' AND workspace_path IS NULL))
        );
        INSERT INTO sessions (id, slug, title, workspace_path, worktree_path, context_kind, message_count, created_at, updated_at, session_json)
          SELECT id, slug, title, workspace_path, worktree_path, 'workspace', message_count, created_at, updated_at, session_json
          FROM sessions_legacy_c1;
        DROP TABLE sessions_legacy_c1;
        CREATE INDEX sessions_updated_at_idx ON sessions(updated_at DESC);
        CREATE INDEX sessions_slug_idx ON sessions(slug);
      `)
    })()
  }
  } finally {
    database.pragma('foreign_keys = ON')
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
  // P-C §6 — tombstone mínimo da exclusão no MESMO SQLite (sem FK: tem de
  // sobreviver ao próprio registro). Criado na PRIMEIRA conexão, inclusive
  // em bases legadas já existentes; nenhum banco/fila paralelo.
  database.exec(`
    CREATE TABLE IF NOT EXISTS session_deletions (
      session_id TEXT PRIMARY KEY,
      deletion_id TEXT NOT NULL UNIQUE,
      revision INTEGER NOT NULL,
      requested_at INTEGER NOT NULL,
      cleanup_state TEXT NOT NULL CHECK (cleanup_state IN ('preparado', 'limpeza_pendente', 'concluido'))
    );
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
      context_kind AS contextKind,
      worktree_path AS worktreePath, message_count AS messageCount,
      created_at AS createdAt, updated_at AS updatedAt, session_json AS sessionJson
    FROM sessions
    ORDER BY updated_at DESC
  `).all() as SessionRecord[]
}

export function upsertSessionRecord(record: SessionRecord): void {
  getDatabase().prepare(`
    INSERT INTO sessions (
      id, slug, title, workspace_path, context_kind, worktree_path, message_count,
      created_at, updated_at, session_json
    ) VALUES (
      @id, @slug, @title, @workspacePath, @contextKind, @worktreePath, @messageCount,
      @createdAt, @updatedAt, @sessionJson
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      title = excluded.title,
      workspace_path = excluded.workspace_path,
      context_kind = excluded.context_kind,
      worktree_path = excluded.worktree_path,
      message_count = excluded.message_count,
      updated_at = excluded.updated_at,
      session_json = excluded.session_json
  `).run(record)
}

/** P-C §6 — identidade durável da exclusão no MESMO SQLite (sem FK: sobrevive
 * ao próprio registro; não é um segundo catálogo). */
export interface TombstoneDelecao {
  sessionId: string
  deletionId: string
  revision: number
  requestedAt: number
  cleanupState: 'preparado' | 'limpeza_pendente' | 'concluido'
}

const SELECT_TOMBSTONE = `
  SELECT session_id AS sessionId, deletion_id AS deletionId, revision,
    requested_at AS requestedAt, cleanup_state AS cleanupState
  FROM session_deletions WHERE session_id = ?`

export function consultarDelecao(sessionId: string): TombstoneDelecao | undefined {
  return getDatabase().prepare(SELECT_TOMBSTONE).get(sessionId) as TombstoneDelecao | undefined
}

/** 410 estável: registro excluído não reabre nem aceita gravação/execução. */
export function problemaSessaoExcluida(): PersistenceProblem {
  return new PersistenceProblem(410, 'session_deleted',
    'Esta conversa foi excluída. Gravações, execuções e reaberturas não são mais aceitas.')
}

export function getSessionRecord(id: string): SessionRecord | undefined {
  assertSessionPublicationReadable(id)
  // P-C §2 — o leitor de contrato único confere o ciclo de vida: nenhum
  // callback/rota que passe por aqui serve conteúdo de conversa excluída.
  if (consultarDelecao(id)) throw problemaSessaoExcluida()
  return getSessionRecordRaw(id)
}

/** P-C — leitura interna do catálogo usada pelo fluxo de exclusão/limpeza:
 * sem fronteiras de publicação nem de vida, porque o próprio tombstone é o
 * estado que esta operação grava. Os consumidores de contrato continuam em
 * `getSessionRecord`. */
export function getSessionRecordRaw(id: string): SessionRecord | undefined {
  return getDatabase().prepare(`
    SELECT id, slug, title, workspace_path AS workspacePath,
      context_kind AS contextKind,
      worktree_path AS worktreePath, message_count AS messageCount,
      created_at AS createdAt, updated_at AS updatedAt, session_json AS sessionJson
    FROM sessions WHERE id = ?
  `).get(id) as SessionRecord | undefined
}

/** Shared read boundary also protects runtime consumers of the existing catalog. */
export function assertSessionPublicationReadable(sessionId: string): void {
  const connection = getDatabase()
  if (connection.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_write_intents'").get()
    && connection.prepare('SELECT 1 FROM session_write_intents WHERE session_id=?').get(sessionId)) {
    throw new PersistenceProblem(503, 'session_publication_pending', 'Esta conversa possui uma publicação pendente. Os arquivos foram preservados; é necessária revisão antes de continuar.')
  }
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
  const existing = getSessionRecordRaw(id)
  if (existing) getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(id)
  return existing
}

/** Close the connection; disposing a synthetic profile is the test owner's job. */
export function resetDatabase(): void {
  database?.close()
  database = undefined
}
