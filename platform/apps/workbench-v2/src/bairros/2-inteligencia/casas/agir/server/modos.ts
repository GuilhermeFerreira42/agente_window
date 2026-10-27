import type { ModoAgir } from '../contract'

// Seleção explícita do seletor da UI, enviada separadamente da mensagem/run.
// O payload da execução nunca escolhe nem amplia o modo efetivo.
const modoPorConversa = new Map<string, ModoAgir>()
const MAX_CONVERSAS = 2_000
const chave = (sessionId: string, chatId: string): string => `${sessionId}\0${chatId}`

export function lerModoAgir(sessionId: string, chatId: string): ModoAgir | null {
  return modoPorConversa.get(chave(sessionId, chatId)) ?? null
}

export function definirModoAgir(sessionId: string, chatId: string, modo: ModoAgir): void {
  const id = chave(sessionId, chatId)
  modoPorConversa.delete(id)
  modoPorConversa.set(id, modo)
  while (modoPorConversa.size > MAX_CONVERSAS) {
    const maisAntiga = modoPorConversa.keys().next()
    if (maisAntiga.done) break
    modoPorConversa.delete(maisAntiga.value)
  }
}
