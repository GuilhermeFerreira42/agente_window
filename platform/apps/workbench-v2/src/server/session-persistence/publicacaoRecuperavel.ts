import { io } from './io'
import { getDatabase } from './database'
import { transcriptPath, digestTranscriptFile, publishStagedTranscript, releaseBlockedPublication } from './transcripts'
import { clearWriteIntent, finalizarPublicacao, pendingPublicationProblem, pendingWriteIntent, type WriteIntent } from './writeIntents'

/**
 * P-B — step 6 of the protocol (SPEC §3): deterministic recovery before any
 * session is served, executed under the existing per-session queue.
 *
 * Outcomes:
 *  - 'finalizado': destination already holds the prepared bytes → catalog +
 *    origins + revision + ACK are published from the journal (crash after the
 *    rename, before the commit — including when the staged file is gone);
 *  - 'publicado' is never returned as a bare value — publish + finalize happen
 *    together and a finalize failure leaves the journal for the next attempt;
 *  - 'limpo': provably complete prior state (destination and catalog untouched)
 *    with the staged copy lost before the rename — the save is treated as
 *    failed, never as a fake success;
 *  - a divergent destination, an unreadable stage or a catalog that no longer
 *    matches the recorded base throws an explicit 503 and KEEPS the journal:
 *    nothing is deleted, overwritten or served as empty.
 */
export type ResultadoReconciliacao = 'finalizado' | 'limpo'

export async function reconciliarPublicacao(sessionId: string, opcoes?: { mutationEsperada?: string }): Promise<ResultadoReconciliacao> {
  const intent = pendingWriteIntent(sessionId)
  if (!intent) return 'limpo'
  if (opcoes?.mutationEsperada && intent.mutationId !== opcoes.mutationEsperada) throw pendingPublicationProblem()

  let destDigest: string | null
  let stageDigest: string | null
  try {
    destDigest = await digestTranscriptFile(intent.targetPath)
    stageDigest = await digestTranscriptFile(intent.stagedPath)
  } catch {
    throw pendingPublicationProblem()
  }
  // H3: identity/catalog/base are proven BEFORE any artifact changes — a
  // divergent catalog never triggers a republish or a cleanup first. The
  // finalization transaction revalidates the same base again (CAS under tx).
  verificarBaseNoCatalogo(intent)

  if (destDigest === intent.newDigest) {
    finalizarComVerificacao(intent)
    await limparArquivosDaIntencao(intent)
    return 'finalizado'
  }

  const basePreservada = destDigest === intent.oldDigest || (destDigest === null && intent.oldDigest === null)
  if (!basePreservada) {
    // Divergent destination (external change or newer unexpected bytes): never
    // overwrite it; keep the journal and demand review (SPEC §3 steps 4/6).
    throw pendingPublicationProblem()
  }

  if (stageDigest !== null && stageDigest === intent.newDigest) {
    // The rename never happened: republish the intact stage, then commit.
    await publishStagedTranscript(intent.stagedPath, intent.targetPath, intent.oldDigest)
    finalizarComVerificacao(intent)
    await limparArquivosDaIntencao(intent)
    return 'finalizado'
  }

  if (stageDigest === null) {
    // Destination and catalog provably still hold the complete prior state and
    // the staged copy vanished before the rename: the save was interrupted
    // without partial effects. Release the session honestly as unsaved.
    clearWriteIntent(sessionId, intent.mutationId)
    return 'limpo'
  }

  // A stage whose bytes no longer match the recorded digest proves nothing.
  throw pendingPublicationProblem()
}

/** H3 — the journal only applies to a catalog that still holds its recorded base. */
function verificarBaseNoCatalogo(intent: WriteIntent): void {
  const row = getDatabase().prepare('SELECT session_json FROM sessions WHERE id=?').get(intent.record.id) as { session_json: string } | undefined
  const currentRevision = row ? (JSON.parse(row.session_json).persistenceRevision ?? 0) : 0
  if (currentRevision !== intent.baseRevision) throw pendingPublicationProblem()
}

function finalizarComVerificacao(intent: WriteIntent): void {
  const connection = getDatabase()
  const row = connection.prepare('SELECT session_json FROM sessions WHERE id=?').get(intent.record.id) as { session_json: string } | undefined
  const currentRevision = row ? (JSON.parse(row.session_json).persistenceRevision ?? 0) : 0
  if (currentRevision !== intent.baseRevision) throw pendingPublicationProblem()
  try {
    finalizarPublicacao({ record: intent.record, planos: intent.planos, receipt: intent.receipt, checkpointCleanup: intent.checkpointCleanup })
  } catch (error) {
    if (error instanceof Error && (error as { status?: unknown }).status === 503) throw error
    // The journal survives a failed commit (single transaction rolled back);
    // the next reader retries or reports the pending publication explicitly.
    throw pendingPublicationProblem()
  }
  releaseBlockedPublication(intent.record.slug, intent.record.id)
}

async function limparArquivosDaIntencao(intent: WriteIntent): Promise<void> {
  await io.unlink(intent.stagedPath).catch(() => undefined)
  await io.unlink(`${intent.stagedPath}.rollback`).catch(() => undefined)
}

/** Destination path of a session record — shared with tests and diagnostics. */
export function caminhoTranscript(slug: string, sessionId: string): string {
  return transcriptPath(slug, sessionId)
}
