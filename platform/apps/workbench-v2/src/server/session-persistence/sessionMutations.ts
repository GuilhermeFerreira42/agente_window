import { assertSessionPublicationReadable, getDatabase } from './database'
export { PersistenceProblem } from './persistenceErrors'

export interface MutationReceipt { sessionId: string; mutationId: string; revision: number; digest: string; creationId: string | null; creationDigest: string | null; creationRevision: number | null }

// P-A stores only the last confirmed operation, never a second transcript.
function db() {
  const connection = getDatabase()
  connection.exec(`CREATE TABLE IF NOT EXISTS session_persistence_receipts (
    session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    mutation_id TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL,
    digest TEXT NOT NULL, creation_id TEXT UNIQUE, creation_digest TEXT, creation_revision INTEGER
  )`)
  return connection
}

export function receipt(sessionId: string): MutationReceipt | undefined {
  return db().prepare(`SELECT session_id AS sessionId, mutation_id AS mutationId,
    revision, digest, creation_id AS creationId, creation_digest AS creationDigest,
    creation_revision AS creationRevision FROM session_persistence_receipts WHERE session_id=?`).get(sessionId) as MutationReceipt | undefined
}

export function confirmMutation(ack: MutationReceipt): void {
  db().prepare(`INSERT INTO session_persistence_receipts(session_id,mutation_id,revision,digest,creation_id,creation_digest,creation_revision)
    VALUES(@sessionId,@mutationId,@revision,@digest,@creationId,@creationDigest,@creationRevision)
    ON CONFLICT(session_id) DO UPDATE SET mutation_id=excluded.mutation_id,
      revision=excluded.revision,digest=excluded.digest`).run(ack)
}

export function mutationOwner(mutationId: string): string | undefined {
  return (db().prepare('SELECT session_id AS id FROM session_persistence_receipts WHERE mutation_id=? OR creation_id=?').get(mutationId, mutationId) as { id: string } | undefined)?.id
}

// Preserve unpublished work from the earlier P-B attempt. P-A must neither
// discard it nor guess which side of a partially published operation is valid.
export function assertNoPendingPublication(sessionId: string): void {
  assertSessionPublicationReadable(sessionId)
}
