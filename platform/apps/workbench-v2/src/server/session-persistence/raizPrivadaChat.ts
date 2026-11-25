import { createHash } from 'node:crypto'
import path from 'node:path'
import { getAppDir } from './paths'

const chave = (valor: string) => createHash('sha256').update(valor, 'utf8').digest('hex')
/** Caminho determinístico interno, sem aceitar segmentos de caminho do cliente. */
export function raizPrivadaDaConversa(sessionId: string, chatId: string): string {
  return path.join(getAppDir(), 'workspaces', 'chats', chave(sessionId), chave(chatId))
}
