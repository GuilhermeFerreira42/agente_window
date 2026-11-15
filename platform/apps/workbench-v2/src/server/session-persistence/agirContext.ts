import type { Session } from '../../types'
import { getSessionRecord, listSessionToolGrants } from './database'
import { sessaoExcluida } from './deletions'
import { validateWorkspacePath } from './workspaces'

/** C-1 (SPEC C §3/§4) — união de contexto:
 *  - workspace: raiz real + grants da pasta;
 *  - Chat: `raiz: null` e NENHUM grant (nenhum filesystem é inspecionado);
 *  - `ok: false`: registro ausente/incoerente (nada é deduzido). */
export type ContextoAgirPersistido =
  | { ok: true; raiz: string; permissoes: string[] }
  | { ok: true; raiz: null; permissoes: never[] }

/** Resolve authority only from the persisted session and its catalog kind. */
export function resolverContextoAgir(sessionId: string, chatId: string):
  | ContextoAgirPersistido
  | { ok: false; message: string } {
  if (!sessionId || sessionId.length > 200 || !chatId || chatId.length > 200) {
    return { ok: false, message: 'Contexto da sessão ou conversa inválido.' }
  }
  // P-C §2 — todos os leitores/callbacks conferem o ciclo de vida: um run
  // (início, instrução, aprovação, stream) não nasce em conversa excluída.
  if (sessaoExcluida(sessionId)) {
    return { ok: false, message: 'A conversa foi excluída; nenhuma ação foi iniciada.' }
  }
  const record = getSessionRecord(sessionId)
  if (!record) {
    return { ok: false, message: 'A sessão não está registrada no servidor. Recarregue a sessão e tente novamente.' }
  }
  let session: Session
  try {
    session = JSON.parse(record.sessionJson) as Session
  } catch {
    return { ok: false, message: 'O contexto persistido da sessão está inválido; nenhuma ação foi iniciada.' }
  }
  if (session.id !== sessionId || session.workspacePath !== record.workspacePath || (session.worktreePath ?? null) !== record.worktreePath) {
    return { ok: false, message: 'O contexto persistido da sessão não corresponde ao registro do servidor.' }
  }
  if (!Array.isArray(session.chats) || !session.chats.some((chat) => chat.id === chatId)) {
    return { ok: false, message: 'A conversa não pertence à sessão persistida.' }
  }
  // C-1 — a modalidade vem do CATÁLOGO (coluna explícita), não do snapshot:
  // Chat resolve sem raiz, sem FS e sem grants.
  if (record.contextKind === 'chat') {
    if (session.workspacePath !== null || (session.worktreePath ?? null) !== null) {
      return { ok: false, message: 'O contexto persistido da sessão não corresponde ao registro do servidor.' }
    }
    return { ok: true, raiz: null, permissoes: [] }
  }
  const activePath = session.worktreePath || session.workspacePath
  if (!activePath) {
    return { ok: false, message: 'O contexto persistido da sessão não corresponde ao registro do servidor.' }
  }
  const checked = validateWorkspacePath(activePath)
  if (!checked.valid || !checked.exists || !checked.isDir) {
    return { ok: false, message: 'A pasta de trabalho da sessão não está acessível. Escolha a pasta de novo.' }
  }
  return {
    ok: true,
    raiz: checked.realpath,
    permissoes: listSessionToolGrants(sessionId, checked.realpath),
  }
}
