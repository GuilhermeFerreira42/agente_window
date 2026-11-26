// C-3a — schema aditivo do ledger de anexos (T32): CREATE IF NOT EXISTS +
// validação de forma; qualquer desvio = schema NÃO pronto (falha explícita,
// nunca migração pela metade). Sem FK de propósito: as linhas de ownership
// têm de sobreviver até o plano de limpeza (T27) — como session_deletions.
import type Database from 'better-sqlite3'
import { PersistenceProblem } from '../persistenceErrors'


export type EstadoUpload = 'admitido' | 'recebendo' | 'preparado' | 'pronto' | 'falhou' | 'cancelado'
export type ModoAnexo = 'copy' | 'reference'
export type EscopoAnexo = 'chat' | 'workspace'

export interface LinhaUpload {
  sessionId: string
  chatId: string
  uploadId: string
  artifactId: string | null
  name: string
  declaredBytes: number | null
  mime: string
  receivedBytes: number
  digest: string | null
  state: EstadoUpload
  stagePath: string | null
  finalPath: string | null
  mode: ModoAnexo
  scope: EscopoAnexo
  workspaceRoot: string | null
  createdAt: number
  updatedAt: number
  errorCode: string | null
}

export interface LinhaArtigo {
  artifactId: string
  sessionId: string
  chatId: string
  uploadId: string
  name: string
  modalidade: string
  papel: string
  mode: ModoAnexo
  locator: string
  rootKind: 'appdir' | 'workspace'
  workspaceRoot: string | null
  bytes: number
  sha256: string
  state: 'pronto'
  messageId: string | null
  partId: string | null
  createdAt: number
}

const TABELAS = ['attachment_uploads', 'attachment_artifacts', 'attachment_cleanup_plan', 'attachment_recovery_plans', 'attachment_working_files', 'explorer_cleanup', 'explorer_work_moves'] as const

const COLUNAS: Record<(typeof TABELAS)[number], string[]> = {
  attachment_uploads: [
    'session_id', 'chat_id', 'upload_id', 'artifact_id', 'name', 'declared_bytes', 'mime',
    'received_bytes', 'digest', 'state', 'stage_path', 'final_path', 'mode', 'scope',
    'workspace_root', 'created_at', 'updated_at', 'error_code',
  ],
  attachment_artifacts: [
    'artifact_id', 'session_id', 'chat_id', 'upload_id', 'name', 'modalidade', 'papel',
    'mode', 'locator', 'root_kind', 'workspace_root', 'bytes', 'sha256', 'state',
    'message_id', 'part_id', 'created_at',
  ],
  attachment_cleanup_plan: ['session_id', 'chat_id', 'artifact_id', 'alvo', 'locator', 'root_kind', 'workspace_root', 'sha256', 'state', 'created_at', 'destino', 'motivo'],
  attachment_recovery_plans: [
    'recovery_id', 'origem_session_id', 'origem_chat_id', 'destino_session_id', 'destino_chat_id',
    'token_hash', 'itens', 'state', 'mapa', 'criado_em', 'expira_em',
  ],
  attachment_working_files: ['artifact_id', 'session_id', 'chat_id', 'locator', 'state'],
  explorer_cleanup: ['session_id', 'state', 'dev', 'ino', 'destino'],
  explorer_work_moves: ['session_id', 'chat_id', 'origem', 'destino', 'dev', 'ino', 'itens'],
}

/** Cria as tabelas aditivas na primeira conexão (chamado por getDatabase). */
export function criarTabelasAnexos(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachment_uploads (
      session_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      upload_id TEXT NOT NULL,
      artifact_id TEXT,
      name TEXT NOT NULL,
      declared_bytes INTEGER,
      mime TEXT NOT NULL DEFAULT '',
      received_bytes INTEGER NOT NULL DEFAULT 0,
      digest TEXT,
      state TEXT NOT NULL CHECK (state IN ('admitido','recebendo','preparado','pronto','falhou','cancelado')),
      stage_path TEXT,
      final_path TEXT,
      mode TEXT NOT NULL CHECK (mode IN ('copy','reference')),
      scope TEXT NOT NULL CHECK (scope IN ('chat','workspace')),
      workspace_root TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      error_code TEXT,
      PRIMARY KEY (session_id, chat_id, upload_id)
    );
    CREATE INDEX IF NOT EXISTS attachment_uploads_state_idx ON attachment_uploads (state, updated_at);
    CREATE TABLE IF NOT EXISTS attachment_artifacts (
      artifact_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      upload_id TEXT NOT NULL,
      name TEXT NOT NULL,
      modalidade TEXT NOT NULL DEFAULT 'arquivo',
      papel TEXT NOT NULL DEFAULT 'upload-chat',
      mode TEXT NOT NULL CHECK (mode IN ('copy','reference')),
      locator TEXT NOT NULL,
      root_kind TEXT NOT NULL CHECK (root_kind IN ('appdir','workspace')),
      workspace_root TEXT,
      bytes INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT 'pronto',
      message_id TEXT,
      part_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attachment_artifacts_owner_idx ON attachment_artifacts (session_id, chat_id);
    CREATE TABLE IF NOT EXISTS attachment_cleanup_plan (
      session_id TEXT NOT NULL,
      -- R3 — DONO do plano (chat de origem). Ownership vem do catálogo, nunca
      -- de prefixo de string do locator.
      chat_id TEXT,
      artifact_id TEXT NOT NULL,
      alvo TEXT NOT NULL CHECK (alvo IN ('chat-copy','workspace-copy','referencia')),
      locator TEXT NOT NULL,
      root_kind TEXT NOT NULL,
      workspace_root TEXT,
      sha256 TEXT,
      state TEXT NOT NULL DEFAULT 'pendente' CHECK (state IN ('pendente','concluido','falhou')),
      created_at INTEGER NOT NULL,
      destino TEXT,
      motivo TEXT,
      PRIMARY KEY (session_id, artifact_id)
    );
    CREATE TABLE IF NOT EXISTS explorer_work_moves (
      session_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      origem TEXT NOT NULL,
      destino TEXT NOT NULL,
      dev TEXT NOT NULL,
      ino TEXT NOT NULL,
      itens TEXT NOT NULL,
      PRIMARY KEY (session_id, chat_id)
    );
    CREATE TABLE IF NOT EXISTS explorer_cleanup (
      session_id TEXT PRIMARY KEY,
      state TEXT NOT NULL CHECK (state IN ('preparado', 'movendo', 'concluido')),
      dev TEXT NOT NULL,
      ino TEXT NOT NULL,
      destino TEXT
    );
    CREATE TABLE IF NOT EXISTS attachment_working_files (
      artifact_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      locator TEXT NOT NULL COLLATE NOCASE,
      state TEXT NOT NULL CHECK (state IN ('preparado', 'pronto')),
      UNIQUE (session_id, chat_id, locator)
    );
    CREATE TABLE IF NOT EXISTS attachment_recovery_plans (
      recovery_id TEXT PRIMARY KEY,
      origem_session_id TEXT NOT NULL,
      origem_chat_id TEXT NOT NULL,
      destino_session_id TEXT NOT NULL,
      destino_chat_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      itens TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('preparado','consumido')),
      mapa TEXT,
      criado_em INTEGER NOT NULL,
      expira_em INTEGER NOT NULL
    );
  `)
  // Migração ADITIVA da própria C-3a (T32): bancos criados antes de o plano
  // registrar o destino da Lixeira recebem as colunas sem perder dados.
  for (const coluna of ['destino', 'motivo', 'chat_id']) {
    const presentes = new Set((db.prepare('PRAGMA table_info(attachment_cleanup_plan)').all() as Array<{ name: string }>).map((c) => c.name))
    if (!presentes.has(coluna)) db.exec(`ALTER TABLE attachment_cleanup_plan ADD COLUMN ${coluna} TEXT`)
  }
}

/** Forma esperada do schema de anexos; qualquer desvio = não pronto (T32). */
export function validarSchemaAnexos(db: Database.Database): void {
  for (const tabela of TABELAS) {
    const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all() as Array<{ name: string }>
    if (colunas.length === 0) {
      throw new PersistenceProblem(500, 'attachment_schema_not_ready',
        `Schema de anexos não migrado (tabela ${tabela} ausente). A publicação continua bloqueada até a migração concluir.`)
    }
    const presentes = new Set(colunas.map((coluna) => coluna.name))
    const faltantes = COLUNAS[tabela].filter((coluna) => !presentes.has(coluna))
    if (faltantes.length > 0) {
      throw new PersistenceProblem(500, 'attachment_schema_not_ready',
        `Schema de anexos divergente na tabela ${tabela}: colunas ${faltantes.join(', ')}. Nada foi publicado.`)
    }
  }
}

