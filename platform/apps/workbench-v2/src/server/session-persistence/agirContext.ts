import type { Session } from '../../types'
import { getSessionRecord, listSessionToolGrants } from './database'
import { validateWorkspacePath } from './workspaces'

export interface ContextoAgirPersistido {
  ok: true
  raiz: string
  permissoes: string[]
}

/** Resolve authority only from the persisted session and its canonical workspace. */
export function resolverContextoAgir(sessionId: string, chatId: string):
  | ContextoAgirPersistido
  | { ok: false; message: string } {
  if (!sessionId || sessionId.length > 200 || !chatId || chatId.length > 200) {
    return { ok: false, message: 'Contexto da sessão ou conversa inválido.' }
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
  const activePath = session.worktreePath || session.workspacePath
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
