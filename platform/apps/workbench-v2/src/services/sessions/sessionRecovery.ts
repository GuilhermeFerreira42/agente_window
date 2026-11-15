import type { Session } from '../../types'
import { projetarSessaoPersistida } from '../../domain/projecaoTranscript'
import { holdSessionPersistence, resumeSessionPersistence, sessionFingerprint, confirmedRecoveryRevision } from './sessionsClient'

const RECOVERY_KEY = 'workbench.sessions.unsaved.v1'

export interface SessionRecovery {
  session: Session
  message: string
  /** P-C (PC-R2) — `excluida`: identidade confirmada como morta no servidor
   * (410). A cópia é PRESERVADA para oferecer uma cópia nova, mas nunca mais
   * reanexa o original na restauração. */
  kind?: 'unavailable' | 'conflict' | 'local' | 'excluida'
  recovery?: { copy: Session; creationId: string; source?: string }
}

function projetarRecovery({ session, kind, recovery }: SessionRecovery): SessionRecovery {
  return { message: 'A conversa possui alterações locais não salvas.', kind, session: projetarSessaoPersistida(session),
    ...(recovery ? { recovery: { copy: projetarSessaoPersistida(recovery.copy), creationId: recovery.creationId, source: recovery.source } } : {}) }
}

export function readSessionRecoveries(): SessionRecovery[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECOVERY_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SessionRecovery => typeof item?.session?.id === 'string'
      && Array.isArray(item.session.chats) && typeof item.message === 'string').map(projetarRecovery)
  } catch { return [] }
}

/** Returns false on quota/privacy failure; the UI must keep the live snapshot. */
export function storeSessionRecovery(recovery: SessionRecovery): boolean {
  try {
    const previous = readSessionRecoveries()
    const existing = previous.find(item => item.session.id === recovery.session.id)
    const records = previous.filter((item) => item.session.id !== recovery.session.id)
    const base = confirmedRecoveryRevision(recovery.session.id)
    const session = base === undefined ? recovery.session : { ...recovery.session, persistenceRevision: base }
    localStorage.setItem(RECOVERY_KEY, JSON.stringify([...records, projetarRecovery({ ...recovery, session, recovery: recovery.recovery ?? existing?.recovery })]))
    return true
  } catch { return false }
}

export function removeSessionRecovery(id: string): void {
  const records = readSessionRecoveries().filter((item) => item.session.id !== id)
  // Do not silently claim the recovery is gone if storage is unavailable.
  localStorage.setItem(RECOVERY_KEY, JSON.stringify(records))
}

/** Ciclo de vida honesto de uma cópia local: nada volta `working`/`running`
 * — um run interrompido por F5 ou por exclusão já não existe. */
export function sanitizarRecuperacao(session: Session): Session {
  return {
    ...session,
    status: session.status === 'working' ? 'completed' as const : session.status,
    chats: session.chats.map((chat) => ({
      ...chat, status: chat.status === 'working' ? 'completed' as const : chat.status,
      messages: chat.messages.map((item) => item.running ? { ...item, running: false, cancelled: true } : item),
    })),
  }
}

export function restoreUnsavedSessions(saved: Session[]): Session[] {
  const recoveries = readSessionRecoveries().map(({ session, message, kind }) => ({ message, kind, session: sanitizarRecuperacao(session) }))
  for (const { session, kind } of recoveries) {
    // P-C (PC-R2) — identidade excluída não reanexa, nem sequer entra na fila
    // de hold: a identidade está morta no servidor e só volta como cópia nova.
    if (kind === 'excluida') continue
    const remote = saved.find(s => s.id === session.id)
    if ((kind === 'unavailable' || kind === 'local') && remote && (remote.persistenceRevision === session.persistenceRevision || sessionFingerprint(remote) === sessionFingerprint(session))) resumeSessionPersistence(remote)
    else if (!(kind === 'unavailable' && !remote && !session.persistenceRevision)) holdSessionPersistence(session.id)
  }
  const local = new Map(recoveries.filter(({ kind }) => kind !== 'excluida').map(({ session }) => [session.id, session]))
  return [...saved.map((session) => {
    const recovery = local.get(session.id)
    if (!recovery) return session
    // Recibos/revisão são autoridade do servidor; a cópia local preserva os edits,
    // sem esconder uma tarefa interrompida nem restaurar aprovações históricas.
    return { ...recovery, chats: recovery.chats.map((chat) => ({ ...chat,
      revisaoOperacional: session.chats.find((remote) => remote.id === chat.id)?.revisaoOperacional,
    })) }
  }),
    // P-C (PC-R2) — o append nunca reanexa uma identidade marcada como excluída.
    ...recoveries.filter(({ session, kind }) => kind !== 'excluida' && !saved.some((item) => item.id === session.id)).map(({ session }) => session)]
}

export function createRecoveryCopy(session: Session): Session {
  const now = Date.now()
  return {
    ...session, id: crypto.randomUUID(),
    chats: session.chats.map(({ revisaoOperacional: _historica, ...chat }) => chat),
    title: `${session.title} (cópia recuperada)`, persistenceRevision: 0,
    // A recovery never acquires ownership of the original managed worktree.
    worktreePath: null, branch: null, isDraft: false, status: 'completed',
    createdSeq: now, updatedSeq: now,
  }
}

/** A copy ACK never removes an origin or an unrelated session. */
export function mergeRecoveredSessions(current: Session[], copy: Session, source: Session, savedSource?: Session): Session[] {
  return [copy, ...current.filter(s => s.id !== copy.id).map(s => s.id === source.id
    && JSON.stringify(s) === JSON.stringify(source) && savedSource ? savedSource : s)]
}

export function mergeHydratedSessions(current: Session[], saved: Session[]): Session[] {
  return [...current, ...saved.filter(s => !current.some(local => local.id === s.id))]
}

/** P-C §5 — na restauração, o status server-side da identidade decide: 410
 * (excluída) MARCA a cópia local como `excluida` — preserva o registro para
 * oferecer uma cópia nova e impede a reanexação do original; 404 continua
 * sendo rascunho nunca confirmado e legítimo. */
export async function descartarRecuperacoesExcluidas(servidor: readonly { id: string }[]): Promise<void> {
  const conhecidas = new Set(servidor.map((s) => s.id))
  for (const item of readSessionRecoveries()) {
    const { session } = item
    if (conhecidas.has(session.id)) continue
    // P-C (PC-R2) — já marcada: consulta nenhuma e escrita nenhuma.
    if (item.kind === 'excluida') continue
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(session.id)}`)
      // P-C (PC-R2) — 410 NÃO destrói a cópia: o registro permanece marcado
      // (`excluida`) e é a única porta de entrada para salvar uma cópia nova.
      if (response.status === 410) {
        storeSessionRecovery({ ...item, kind: 'excluida',
          message: 'Esta conversa foi excluída no servidor. Suas alterações locais só voltam como uma cópia nova — nada é reanexado à identidade excluída.' })
      }
    } catch {
      /* Sem rede não se apaga nada: higiene local nunca destrói conteúdo. */
    }
  }
}
