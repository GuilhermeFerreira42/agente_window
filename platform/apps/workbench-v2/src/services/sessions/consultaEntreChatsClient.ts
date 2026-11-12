import type { FonteEntreChats } from '../../domain/consultaEntreChats'

export async function validarFonteEntreChats(sessionId: string, chatId: string, referencia: string): Promise<FonteEntreChats> {
  const response = await fetch('/api/sessions/other-chat-source', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, chatId, referencia }) })
  if (!response.ok) throw new Error('A fonte mudou, expirou ou não está acessível. Consulte o chat novamente.')
  const data = await response.json() as { fonte: FonteEntreChats }
  return data.fonte
}
