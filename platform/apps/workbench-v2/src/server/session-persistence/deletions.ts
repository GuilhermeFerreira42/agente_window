import type { SessionRecord, TombstoneDelecao } from './database'
import { consultarDelecao, deleteSessionRecord, getSessionRecordRaw, getDatabase, problemaSessaoExcluida } from './database'
import { PersistenceProblem } from './persistenceErrors'
import { deleteTranscript } from './transcripts'
import { executarPlanoAnexos, registrarPlanoAnexos, removerStagesDaSessao, type OpcoesLimpeza } from './attachments/limpeza'
import { removeWorktree, WorktreeDirtyError } from './worktrees'

// O tombstone mora no dono do catálogo (mesmo SQLite, primeira conexão);
// este módulo é a orquestração da limpeza. Reexporta para os consumidores.
export { consultarDelecao, problemaSessaoExcluida }
export type { TombstoneDelecao }
export type EstadoLimpeza = TombstoneDelecao['cleanupState']

export function sessaoExcluida(sessionId: string): boolean {
  return consultarDelecao(sessionId) !== undefined
}

function revisaoDoRegistro(record: SessionRecord): number {
  try {
    const parsed = JSON.parse(record.sessionJson) as { persistenceRevision?: number }
    return typeof parsed.persistenceRevision === 'number' && Number.isSafeInteger(parsed.persistenceRevision)
      ? parsed.persistenceRevision : 0
  } catch {
    return 0
  }
}

/** Registra (ou consulta) a identidade da tentativa. A revisão esperada tem de
 * bater com o registro atual; a identidade da PRIMEIRA tentativa vence — um
 * reenvio nunca remove um alvo diferente (mesma sessão + mesma revisão). */
export function iniciarOuConsultarDelecao(input: { sessionId: string; deletionId: string; expectedRevision: number }): TombstoneDelecao {
  const divergente = () => new PersistenceProblem(409, 'deletion_revision_mismatch',
    'A revisão desta conversa mudou durante a exclusão. Recarregue e tente novamente.')
  const existente = consultarDelecao(input.sessionId)
  if (existente) {
    if (existente.revision !== input.expectedRevision) throw divergente()
    return existente
  }
  const record = getSessionRecordRaw(input.sessionId)
  if (record && revisaoDoRegistro(record) !== input.expectedRevision) throw divergente()
  getDatabase().prepare(`
    INSERT INTO session_deletions (session_id, deletion_id, revision, requested_at, cleanup_state)
    VALUES (?, ?, ?, ?, 'preparado')
    ON CONFLICT(session_id) DO NOTHING
  `).run(input.sessionId, input.deletionId, input.expectedRevision, Date.now())
  const tombstone = consultarDelecao(input.sessionId)
  if (!tombstone) throw new PersistenceProblem(503, 'session_cleanup_failed',
    'Não foi possível registrar a exclusão. Tente novamente.')
  if (tombstone.revision !== input.expectedRevision) throw divergente()
  // C-3a (T27) — plano de anexos registrado ANTES de qualquer operação
  // destrutiva; sobrevive a reinício e é retomável em `executarLimpezaDelecao`.
  registrarPlanoAnexos(input.sessionId)
  return tombstone
}

/** Limpeza pendente gravada ANTES das operações destrutivas (fronteira de
 * reinício): a partir daqui qualquer interrupção retoma daqui. */
export function marcarLimpezaPendente(sessionId: string): void {
  getDatabase().prepare(`
    UPDATE session_deletions SET cleanup_state = 'limpeza_pendente'
    WHERE session_id = ? AND cleanup_state = 'preparado'
  `).run(sessionId)
}

/** Conclusão honesta: só chamada depois que o escopo prometido terminou. */
export function concluirLimpeza(sessionId: string): void {
  getDatabase().prepare(`
    UPDATE session_deletions SET cleanup_state = 'concluido'
    WHERE session_id = ? AND cleanup_state != 'concluido'
  `).run(sessionId)
}

/** Rollback exclusivo de uma primeira tentativa recusada (worktree sujo antes
 * de qualquer destruição). Nada além do estado `preparado` é desfeito. */
export function descartarTombstoneSePreparado(sessionId: string): boolean {
  const result = getDatabase().prepare(`
    DELETE FROM session_deletions WHERE session_id = ? AND cleanup_state = 'preparado'
  `).run(sessionId)
  return result.changes > 0
}

/** Retomada de limpeza interrompida (reinício em qualquer fronteira). */
export function deletionsPendentes(): TombstoneDelecao[] {
  return getDatabase().prepare(`
    SELECT session_id AS sessionId, deletion_id AS deletionId, revision,
      requested_at AS requestedAt, cleanup_state AS cleanupState
    FROM session_deletions WHERE cleanup_state != 'concluido' ORDER BY requested_at
  `).all() as TombstoneDelecao[]
}

/** Executa a limpeza da sessão tombstonada de forma idempotente:
 * worktree (única etapa com recusa 409 e rollback de primeira tentativa) →
 * estado durável `limpeza_pendente` → transcrição → registro (cascata dos
 * mecanismos atuais remove grants/checkpoints/receipts/origins) → `concluido`. */
export async function executarLimpezaDelecao(sessionId: string, force: boolean, limpeza: OpcoesLimpeza = {}): Promise<TombstoneDelecao> {
  const tombstone = consultarDelecao(sessionId)
  if (!tombstone) throw new PersistenceProblem(409, 'deletion_state_missing',
    'Esta conversa não tem exclusão registrada. Recarregue e tente novamente.')
  if (tombstone.cleanupState === 'concluido') return tombstone
  const record = getSessionRecordRaw(sessionId)
  if (record?.worktreePath && record.workspacePath) {
    try {
      await removeWorktree(record.workspacePath, record.worktreePath, sessionId, force)
    } catch (error) {
      if (error instanceof WorktreeDirtyError) {
        if (consultarDelecao(sessionId)?.cleanupState === 'preparado') {
          // Nada destrutivo aconteceu ainda: devolve a proteção atual intacta
          // (o cliente oferece a confirmação específica de force, como antes).
          descartarTombstoneSePreparado(sessionId)
        }
        throw error
      }
      // Recusa de proteção (ex.: caminho fora do diretório gerenciado) vira
      // código estável PT-BR; o diretório alheio nunca é removido.
      throw new PersistenceProblem(503, 'session_cleanup_failed',
        'Não foi possível remover o worktree desta conversa. A exclusão continua registrada e será retomada.')
    }
  }
  marcarLimpezaPendente(sessionId)
  try {
    // C-3a (T27–T29/R12) — arquivos por plano ANTES de qualquer cascade: o
    // plano foi capturado no tombstone e a Lixeira decide cada privado.
    // Falha de item NÃO apaga evidência: a limpeza fica pendente (B06).
    const anexosCompletos = await executarPlanoAnexos(sessionId, limpeza)
    if (!anexosCompletos) {
      throw new PersistenceProblem(503, 'session_cleanup_pending',
        'Nem todos os arquivos privados desta conversa puderam ir para a Lixeira. A exclusão continua pendente e o que falhou foi preservado; tente novamente.')
    }
    await removerStagesDaSessao(sessionId)
    if (record) await deleteTranscript(record.slug, sessionId)
    deleteSessionRecord(sessionId)
    concluirLimpeza(sessionId)
  } catch (error) {
    // Falha de limpeza NUNCA vira sucesso: estado fica `limpeza_pendente`,
    // código estável PT-BR, e a retomada continua disponível.
    if (error instanceof PersistenceProblem) throw error
    throw new PersistenceProblem(503, 'session_cleanup_failed',
      'Não foi possível concluir a limpeza desta conversa. A exclusão continua registrada e será retomada.')
  }
  return consultarDelecao(sessionId)!
}
