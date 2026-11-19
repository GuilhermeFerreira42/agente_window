import Database from 'better-sqlite3'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, expect, it, vi } from 'vitest'
import { deleteSessionRecord, getSessionRecord, grantSessionTool, listSessionRecords, resetDatabase, saveCheckpoint, upsertSessionRecord } from './database'
import { confirmMutation } from './sessionMutations'

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

it.skipIf(!process.env.AGENTE_WINDOW_TEST_HOME)('creates the session_deletions tombstone on the FIRST connection of a legacy profile (additive P-C migration)', () => {
  // A conexão módulo do teste anterior aponta para o perfil antigo; o primeiro
  // toque desta base legada precisa abrir uma conexão NOVA.
  resetDatabase()
  const profile = mkdtempSync(join(process.env.AGENTE_WINDOW_TEST_HOME!, 'pc-migration-'))
  vi.stubEnv('AGENTE_WINDOW_DATA_DIR', profile)
  const path = join(profile, 'agente_window.db')
  const legacy = new Database(path)
  legacy.exec(`CREATE TABLE sessions (
    id TEXT PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL, workspace_path TEXT NOT NULL,
    worktree_path TEXT, message_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, session_json TEXT NOT NULL
  ); INSERT INTO sessions VALUES ('legacy-pc', 'legacy-pc', 'Preserved', '/synthetic', NULL, 0, 1, 1, '{"id":"legacy-pc","chats":[]}');`)
  // A base legada NÃO tem session_deletions antes do primeiro toque.
  expect(legacy.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='session_deletions'").get()).toEqual({ n: 0 })
  legacy.close()
  expect(listSessionRecords()).toHaveLength(1)
  const inspection = new Database(path)
  try {
    expect(inspection.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='session_deletions'").get()).toEqual({ n: 1 })
    inspection.prepare(`INSERT INTO session_deletions (session_id, deletion_id, revision, requested_at, cleanup_state)
      VALUES ('legacy-pc', '00000000-0000-4000-8000-000000000001', 0, 1, 'preparado')`).run()
    expect(inspection.prepare('SELECT cleanup_state FROM session_deletions').get()).toEqual({ cleanup_state: 'preparado' })
  } finally { inspection.close() }
})

// ============================================================================
// C-1 / B1 (revisão Codex) — migração do rebuild `sessions` com a base legada
// PREENCHIDA: os filhos com FK (grants, receipts, checkpoints, origens) não
// podem terminar apontando para `sessions_legacy_c1` derrubada. O RENAME com
// `legacy_alter_table=ON` preserva as referências; a prova é `foreign_key_check`
// vazio, gravações novas com FK ON, cascatas no lugar certo, reinicialização e
// idempotência.
// ============================================================================
it.skipIf(!process.env.AGENTE_WINDOW_TEST_HOME)('C-1/B1 — base legada preenchida migra com integridade referencial preservada', () => {
  resetDatabase()
  const profile = mkdtempSync(join(process.env.AGENTE_WINDOW_TEST_HOME!, 'c1-migration-'))
  vi.stubEnv('AGENTE_WINDOW_DATA_DIR', profile)
  const path = join(profile, 'agente_window.db')

  const legacy = new Database(path)
  legacy.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL, workspace_path TEXT NOT NULL,
      worktree_path TEXT, message_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, session_json TEXT NOT NULL
    );
    INSERT INTO sessions VALUES
      ('c1-keep', 'c1-keep', 'Preservada', '/synthetic', NULL, 2, 1, 2, '{"id":"c1-keep","chats":[]}'),
      ('c1-cascade', 'c1-cascade', 'Para cascatas', '/synthetic', NULL, 0, 1, 3, '{"id":"c1-cascade","chats":[]}'),
      ('c1-tomb', 'c1-tomb', 'Com tombstone', '/synthetic', NULL, 0, 1, 4, '{"id":"c1-tomb","chats":[]}');
    CREATE TABLE session_tool_grants (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_path TEXT NOT NULL, tool_id TEXT NOT NULL CHECK (tool_id IN ('criar','escrever')),
      granted_at INTEGER NOT NULL, PRIMARY KEY (session_id, workspace_path, tool_id));
    INSERT INTO session_tool_grants VALUES ('c1-keep','/synthetic','criar',1);
    CREATE TABLE session_command_grants (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_path TEXT NOT NULL, tool_id TEXT NOT NULL CHECK (tool_id = 'executar'),
      granted_at INTEGER NOT NULL, PRIMARY KEY (session_id, workspace_path, tool_id));
    INSERT INTO session_command_grants VALUES ('c1-keep','/synthetic','executar',1);
    CREATE TABLE session_checkpoints (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL, checkpoint_json TEXT NOT NULL, PRIMARY KEY (session_id, chat_id));
    INSERT INTO session_checkpoints VALUES ('c1-keep','a','{"legado":true}');
    CREATE TABLE session_persistence_receipts (
      session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
      mutation_id TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL, digest TEXT NOT NULL,
      creation_id TEXT UNIQUE, creation_digest TEXT, creation_revision INTEGER);
    INSERT INTO session_persistence_receipts VALUES ('c1-keep','mut-legacy',2,'digest-legacy',NULL,NULL,NULL);
    CREATE TABLE chat_history_origins (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL, epoch TEXT NOT NULL, operator_id TEXT NOT NULL,
      project_key TEXT, root_identity TEXT,
      state TEXT NOT NULL CHECK(state IN ('empty','verified','unverifiable')),
      digest TEXT NOT NULL, title TEXT NOT NULL, title_norm TEXT NOT NULL,
      session_title TEXT NOT NULL, chat_title TEXT NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY(session_id,chat_id));
    INSERT INTO chat_history_origins VALUES ('c1-keep','a','ep','op',NULL,NULL,'verified','d','T','t','S','C',1);
    -- Tombstone P-C: sem FK por contrato, mas os dados têm de sobreviver.
    CREATE TABLE session_deletions (
      session_id TEXT PRIMARY KEY, deletion_id TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL,
      requested_at INTEGER NOT NULL,
      cleanup_state TEXT NOT NULL CHECK (cleanup_state IN ('preparado','limpeza_pendente','concluido')));
    INSERT INTO session_deletions VALUES ('c1-tomb','del-1',0,1,'preparado');
  `)
  legacy.close()

  // 1º toque no módulo → rebuild C-1 (com a correção: legacy_alter_table ON).
  const registros = listSessionRecords()
  expect(registros).toHaveLength(3)
  const preservada = registros.find((registro) => registro.id === 'c1-keep')!
  expect(preservada).toMatchObject({ title: 'Preservada', workspacePath: '/synthetic', contextKind: 'workspace' })

  const inspection = new Database(path)
  try {
    inspection.pragma('foreign_keys = ON')
    // A prova central: nenhuma violação e nenhum filho apontando para a tabela derrubada.
    expect(inspection.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    const sqlFilho = (inspection.prepare("SELECT sql FROM sqlite_master WHERE name='session_tool_grants'").get() as { sql: string }).sql
    expect(sqlFilho).toContain('REFERENCES sessions(')
    expect(sqlFilho).not.toContain('sessions_legacy')
    // Dados dos filhos preservados.
    expect(inspection.prepare('SELECT COUNT(*) AS n FROM session_tool_grants').get()).toEqual({ n: 1 })
    expect(inspection.prepare('SELECT COUNT(*) AS n FROM session_command_grants').get()).toEqual({ n: 1 })
    expect(inspection.prepare('SELECT COUNT(*) AS n FROM chat_history_origins').get()).toEqual({ n: 1 })
    expect(inspection.prepare('SELECT cleanup_state FROM session_deletions').get()).toEqual({ cleanup_state: 'preparado' })
    // Nenhuma tabela temporária sobrando.
    expect(inspection.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'sessions_legacy%'").get()).toEqual({ n: 0 })
  } finally { inspection.close() }

  // Gravações NOVAS com FK ON via módulo (é aqui que o defeito aparecia: no such table).
  saveCheckpoint('c1-keep', 'b', { version: 1, estrategia: 'manual', escopo: 'synthetic', resumo: 'Novo',
    providerId: 'fixture', modelId: 'fixture', criadoEm: 3, quantidade: 1, ultimoId: 'x', digest: 'fixture' })
  grantSessionTool('c1-keep', '/synthetic', 'criar')
  grantSessionTool('c1-keep', '/synthetic', 'executar')
  confirmMutation({ sessionId: 'c1-keep', mutationId: 'mut-novo', revision: 3, digest: 'digest-novo',
    creationId: null, creationDigest: null, creationRevision: null })

  // Cascatas apontando para a tabela CERTA: excluir o registro remove os filhos.
  deleteSessionRecord('c1-cascade')
  const aposCascade = new Database(path)
  try {
    aposCascade.pragma('foreign_keys = ON')
    expect(aposCascade.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    expect(aposCascade.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id=?').get('c1-cascade')).toEqual({ n: 0 })
  } finally { aposCascade.close() }

  // Reinicialização: conexão nova repete migração idempotente e mantém as gravações.
  resetDatabase()
  expect(listSessionRecords().map((registro) => registro.id).sort()).toEqual(['c1-keep', 'c1-tomb'])
  expect(getSessionRecord('c1-keep')).toMatchObject({ title: 'Preservada', contextKind: 'workspace' })
  const reinicio = new Database(path)
  try {
    reinicio.pragma('foreign_keys = ON')
    expect(reinicio.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    expect(reinicio.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'sessions_legacy%'").get()).toEqual({ n: 0 })
    reinicio.prepare("INSERT INTO session_tool_grants VALUES ('c1-keep','/synthetic','escrever',9)").run()
    expect(reinicio.prepare('SELECT COUNT(*) AS n FROM session_tool_grants').get()).toEqual({ n: 2 })
    expect(reinicio.prepare('SELECT revision FROM session_persistence_receipts').get()).toEqual({ revision: 3 })
  } finally { reinicio.close() }
})
