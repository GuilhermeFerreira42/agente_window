import type { SessionRecord } from './database'
import { getDatabase, removerCheckpointsDeChatsAusentes } from './database'
import type { OrigemChat } from './origensChats'
import { publicarCatalogoComOrigens } from './origensChats'
import { confirmMutation, PersistenceProblem, type MutationReceipt } from './sessionMutations'

/**
 * P-B — durable write-intent journal (SPEC §3).
 *
 * One prepared publication per session, registered BEFORE the JSONL rename and
 * finalized in the SAME transaction that publishes catalog+origins+revision+
 * ACK. A crash on either side of the rename is therefore either fully present
 * or forward-recoverable by `reconciliarPublicacao` — never half-published.
 *
 * Additive only: a table left by the earlier (non-homologated) P-B attempt is
 * never dropped; missing columns are added and rows that cannot be interpreted
 * keep blocking their session with an explicit diagnosis (SPEC §7).
 *
 * No foreign key on purpose: a creation registers its intent before the catalog
 * row exists, and both appear together in the finalization transaction. DELETE
 * of a session is refused while an intent is pending (read boundary), so no
 * orphan can arise through the product flows.
 */

export interface WriteIntent {
  sessionId: string
  mutationId: string
  baseRevision: number
  nextRevision: number
  targetPath: string
  stagedPath: string
  oldDigest: string | null
  newDigest: string
  record: SessionRecord
  planos: OrigemChat[]
  receipt: MutationReceipt
  checkpointCleanup: string[] | null
  /** Durable proof that THIS operation created the FK placeholder row (never inferred from base 0). */
  placeholder: boolean
  state: string
  registeredAt: number
}

type IntentRow = {
  session_id: string; mutation_id: string | null; base_revision: number | null; next_revision: number | null
  target_path: string | null; staged_path: string | null; old_digest: string | null; new_digest: string | null
  record_json: string | null; origins_json: string | null; request_digest: string | null
  creation_id: string | null; creation_digest: string | null; creation_revision: number | null
  checkpoint_cleanup_json: string | null; state: string | null; registered_at: number | null
  placeholder: number | null
}

const COLUNAS: Array<[string, string]> = [
  ['mutation_id', 'TEXT'], ['base_revision', 'INTEGER'], ['next_revision', 'INTEGER'],
  ['target_path', 'TEXT'], ['staged_path', 'TEXT'], ['old_digest', 'TEXT'], ['new_digest', 'TEXT'],
  ['record_json', 'TEXT'], ['origins_json', 'TEXT'], ['request_digest', 'TEXT'],
  ['creation_id', 'TEXT'], ['creation_digest', 'TEXT'], ['creation_revision', 'INTEGER'],
  ['checkpoint_cleanup_json', 'TEXT'], ['state', 'TEXT'], ['registered_at', 'INTEGER'],
  // H2: distinguishes o placeholder criado por ESTA operação de uma sessão
  // preexistente (legado vazio com revisão zero nunca é apagado por inferência).
  ['placeholder', 'INTEGER'],
]

const schemaPronto = new WeakSet<object>()

/** CREATE on fresh profiles; additive ALTER on any pre-existing attempt table. Never DROP. */
function ensureWriteIntentSchema(): void {
  const connection = getDatabase()
  if (schemaPronto.has(connection)) return
  connection.exec(`
    CREATE TABLE IF NOT EXISTS session_write_intents (
      session_id TEXT PRIMARY KEY,
      mutation_id TEXT NOT NULL,
      base_revision INTEGER NOT NULL,
      next_revision INTEGER NOT NULL,
      target_path TEXT NOT NULL,
      staged_path TEXT NOT NULL,
      old_digest TEXT,
      new_digest TEXT NOT NULL,
      record_json TEXT NOT NULL,
      origins_json TEXT NOT NULL,
      request_digest TEXT NOT NULL,
      creation_id TEXT,
      creation_digest TEXT,
      creation_revision INTEGER,
      checkpoint_cleanup_json TEXT,
      state TEXT NOT NULL,
      registered_at INTEGER NOT NULL
    );
  `)
  try {
    connection.exec('CREATE UNIQUE INDEX IF NOT EXISTS session_write_intents_mutation_uq ON session_write_intents(mutation_id)')
  } catch {
    // A legacy attempt table may already contain conflicting values. The primary
    // key still allows a single publication per session; never fail startup here.
  }
  const existing = new Set((connection.prepare('PRAGMA table_info(session_write_intents)').all() as Array<{ name: string }>).map(column => column.name))
  for (const [name, type] of COLUNAS) {
    if (!existing.has(name)) connection.exec(`ALTER TABLE session_write_intents ADD COLUMN ${name} ${type}`)
  }
  schemaPronto.add(connection)
}

function hasWriteIntentTable(): boolean {
  return !!getDatabase().prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_write_intents'").get()
}

const fkCache = new WeakMap<object, boolean>()
/** True only for a journal table left by the earlier attempt (its DDL is never rewritten). */
function journalHasForeignKey(connection: ReturnType<typeof getDatabase>): boolean {
  const cached = fkCache.get(connection)
  if (cached !== undefined) return cached
  const rows = connection.prepare('PRAGMA foreign_key_list(session_write_intents)').all() as unknown[]
  const has = rows.length > 0
  fkCache.set(connection, has)
  return has
}

function pendingIntentRow(sessionId: string): IntentRow | undefined {
  if (!hasWriteIntentTable()) return undefined
  return getDatabase().prepare(`SELECT session_id, mutation_id, base_revision, next_revision, target_path, staged_path,
    old_digest, new_digest, record_json, origins_json, request_digest, creation_id, creation_digest,
    creation_revision, checkpoint_cleanup_json, state, registered_at, placeholder
    FROM session_write_intents WHERE session_id=?`).get(sessionId) as IntentRow | undefined
}

export function pendingWriteIntent(sessionId: string): WriteIntent | undefined {
  ensureWriteIntentSchema()
  const row = pendingIntentRow(sessionId)
  if (!row) return undefined
  if (!interpretable(row)) throw pendingPublicationProblem()
  return {
    sessionId: row.session_id, mutationId: row.mutation_id!, baseRevision: row.base_revision!,
    nextRevision: row.next_revision!, targetPath: row.target_path!, stagedPath: row.staged_path!,
    oldDigest: row.old_digest, newDigest: row.new_digest!,
    record: JSON.parse(row.record_json!) as SessionRecord, planos: JSON.parse(row.origins_json!) as OrigemChat[],
    receipt: {
      sessionId: row.session_id, mutationId: row.mutation_id!, revision: row.next_revision!,
      digest: row.request_digest!, creationId: row.creation_id, creationDigest: row.creation_digest,
      creationRevision: row.creation_revision,
    },
    checkpointCleanup: row.checkpoint_cleanup_json ? JSON.parse(row.checkpoint_cleanup_json) as string[] : null,
    placeholder: row.placeholder === 1,
    state: row.state!, registeredAt: row.registered_at!,
  }
}

/** A row from an earlier attempt that lacks the P-B plan is preserved and keeps blocking. */
function interpretable(row: IntentRow): boolean {
  return row.state === 'preparado' && typeof row.mutation_id === 'string' && typeof row.base_revision === 'number'
    && typeof row.next_revision === 'number' && typeof row.target_path === 'string' && typeof row.staged_path === 'string'
    && typeof row.new_digest === 'string' && typeof row.record_json === 'string'
    && typeof row.origins_json === 'string' && typeof row.request_digest === 'string'
    && typeof row.registered_at === 'number'
}

/** Same PT-BR diagnosis previously thrown by the P-A read boundary. */
export function pendingPublicationProblem(): PersistenceProblem {
  return new PersistenceProblem(503, 'session_publication_pending',
    'Esta conversa possui uma publicação pendente. Os arquivos foram preservados; é necessária revisão antes de continuar.')
}

export function hasPendingWriteIntent(sessionId: string): boolean {
  if (!hasWriteIntentTable()) return false
  return !!getDatabase().prepare('SELECT 1 FROM session_write_intents WHERE session_id=?').get(sessionId)
}

/**
 * Step 3 of the protocol — a short transaction (no file IO inside) that
 * re-checks the expected base and records the durable intent.
 *
 * `criacao` distinguishes a brand-new identity from a legacy unversioned
 * update (base 0 with an existing catalog row). When the journal table comes
 * from the earlier attempt and enforces a foreign key, a creation additionally
 * inserts its catalog row HERE, inside the same transaction, so the intent
 * satisfies the FK; the placeholder is overwritten by finalization or removed
 * together with the intent when the staged copy was lost — a client that never
 * received an ACK therefore never sees a created session.
 */
export function registerWriteIntent(intent: Omit<WriteIntent, 'state' | 'registeredAt' | 'placeholder'> & { criacao: boolean }): void {
  ensureWriteIntentSchema()
  const connection = getDatabase()
  connection.transaction(() => {
    const currentRow = connection.prepare('SELECT session_json FROM sessions WHERE id=?').get(intent.record.id) as { session_json: string } | undefined
    const currentRevision = currentRow ? (JSON.parse(currentRow.session_json).persistenceRevision ?? 0) : 0
    if (intent.criacao) {
      if (currentRow) throw new PersistenceProblem(409, 'session_exists', 'Já existe uma conversa com esta identidade.')
    } else if (currentRevision !== intent.baseRevision) {
      throw new PersistenceProblem(409, 'stale_session_snapshot', 'Uma versão diferente desta conversa está salva. Suas alterações locais foram preservadas.')
    }
    const criouPlaceholder = Boolean(intent.criacao && journalHasForeignKey(connection))
    if (criouPlaceholder) {
      const placeholder = JSON.parse(intent.record.sessionJson) as { persistenceRevision?: number } & Record<string, unknown>
      placeholder.persistenceRevision = 0
      connection.prepare(`INSERT INTO sessions (id, slug, title, workspace_path, worktree_path,
        message_count, created_at, updated_at, session_json) VALUES (?,?,?,?,?,0,?,?,?)`)
        .run(intent.record.id, intent.record.slug, intent.record.title, intent.record.workspacePath,
          intent.record.worktreePath, intent.record.createdAt, intent.record.updatedAt, JSON.stringify(placeholder))
    }
    connection.prepare(`INSERT INTO session_write_intents (
      session_id, mutation_id, base_revision, next_revision, target_path, staged_path, old_digest, new_digest,
      record_json, origins_json, request_digest, creation_id, creation_digest, creation_revision,
      checkpoint_cleanup_json, state, registered_at, placeholder
    ) VALUES (@sessionId, @mutationId, @baseRevision, @nextRevision, @targetPath, @stagedPath, @oldDigest, @newDigest,
      @recordJson, @originsJson, @requestDigest, @creationId, @creationDigest, @creationRevision,
      @checkpointCleanup, 'preparado', @registeredAt, @placeholder)`).run({
      sessionId: intent.record.id, mutationId: intent.mutationId, baseRevision: intent.baseRevision,
      nextRevision: intent.nextRevision, targetPath: intent.targetPath, stagedPath: intent.stagedPath,
      oldDigest: intent.oldDigest, newDigest: intent.newDigest,
      recordJson: JSON.stringify(intent.record), originsJson: JSON.stringify(intent.planos),
      requestDigest: intent.receipt.digest, creationId: intent.receipt.creationId,
      creationDigest: intent.receipt.creationDigest, creationRevision: intent.receipt.creationRevision,
      checkpointCleanup: intent.checkpointCleanup ? JSON.stringify(intent.checkpointCleanup) : null,
      registeredAt: Date.now(),
      placeholder: criouPlaceholder ? 1 : 0,
    })
  })()
}

/**
 * Step 5 of the protocol — catalog + origins + revision + ACK + intent
 * finalization in ONE transaction (save path) or replayed from the journal
 * after a crash (reconciliation path). Idempotent: a missing intent means this
 * publication already finished.
 */
export function finalizarPublicacao(dados: {
  record: SessionRecord
  planos: OrigemChat[]
  receipt: MutationReceipt
  checkpointCleanup: string[] | null
}): void {
  const connection = getDatabase()
  connection.transaction(() => {
    publicarCatalogoComOrigens(dados.record, dados.planos)
    if (dados.checkpointCleanup) removerCheckpointsDeChatsAusentes(dados.record.id, dados.checkpointCleanup)
    confirmMutation(dados.receipt)
    connection.prepare('DELETE FROM session_write_intents WHERE session_id=?').run(dados.record.id)
  })()
}

/**
 * Clears an intent only when the caller PROVES the prior state is complete
 * (destination and catalog untouched); used when a staged copy was lost before
 * the rename or an external change forced a refusal — never to fake success.
 * An unacknowledged FK placeholder from a legacy journal (base 0) is removed
 * with it, so a creation that never reached an ACK leaves no phantom session.
 */
export function clearWriteIntent(sessionId: string, mutationId?: string): boolean {
  if (!hasWriteIntentTable()) return false
  const connection = getDatabase()
  return connection.transaction(() => {
    const row = (mutationId
      ? connection.prepare('SELECT placeholder FROM session_write_intents WHERE session_id=? AND mutation_id=?').get(sessionId, mutationId)
      : connection.prepare('SELECT placeholder FROM session_write_intents WHERE session_id=?').get(sessionId)) as { placeholder: number | null } | undefined
    if (!row) return false
    const removed = mutationId
      ? connection.prepare('DELETE FROM session_write_intents WHERE session_id=? AND mutation_id=?').run(sessionId, mutationId).changes
      : connection.prepare('DELETE FROM session_write_intents WHERE session_id=?').run(sessionId).changes
    // H2: apaga SOMENTE um placeholder comprovado por ESTA operação (coluna
    // placeholder=1) e ainda não confirmado. Revisão zero sem receipt não é
    // prova — sessão legada vazia preexistente é intocada.
    if (removed > 0 && row.placeholder === 1) {
      const receiptsTable = connection.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='session_persistence_receipts'").get()
      const acknowledged = receiptsTable
        ? connection.prepare('SELECT 1 FROM session_persistence_receipts WHERE session_id=?').get(sessionId)
        : undefined
      if (!acknowledged) {
        connection.prepare('DELETE FROM sessions WHERE id=? AND message_count=0').run(sessionId)
      }
    }
    return removed > 0
  })()
}

/** H1 — journal rows whose session has no catalog record yet (interrupted creations). */
export function pendingOrphanIntentIds(): string[] {
  if (!hasWriteIntentTable()) return []
  const rows = getDatabase().prepare(
    'SELECT session_id FROM session_write_intents WHERE session_id NOT IN (SELECT id FROM sessions)',
  ).all() as Array<{ session_id: string }>
  return rows.map(row => row.session_id)
}

/** Best-effort display identity for a pending journal (lenient; never throws). */
export function tituloDaIntencao(sessionId: string): string | undefined {
  try {
    if (!hasWriteIntentTable()) return undefined
    const row = getDatabase().prepare('SELECT record_json FROM session_write_intents WHERE session_id=?').get(sessionId) as { record_json: string | null } | undefined
    if (!row?.record_json) return undefined
    return (JSON.parse(row.record_json) as { title?: unknown }).title as string | undefined
  } catch {
    return undefined
  }
}
