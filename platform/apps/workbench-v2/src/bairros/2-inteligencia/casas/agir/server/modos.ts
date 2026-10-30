import type { ModoAgir, NivelPermissaoAgir } from '../contract'

// Seleção explícita do seletor da UI, enviada separadamente da mensagem/run.
// O payload da execução nunca escolhe nem amplia o modo efetivo.
const modoPorConversa = new Map<string, ModoAgir>()
const MAX_CONVERSAS = 2_000
const chave = (sessionId: string, chatId: string): string => `${sessionId}\\0${chatId}`

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

interface SelecaoPermissao {
  nivel: NivelPermissaoAgir
  raiz: string
}

// Permitir tudo não é persistido entre reinícios do servidor e é vinculado à
// raiz validada no instante da seleção. Trocar workspace volta a Manual.
const permissaoPorConversa = new Map<string, SelecaoPermissao>()

export function lerPermissaoAgir(sessionId: string, chatId: string, raiz: string): NivelPermissaoAgir {
  const selecao = permissaoPorConversa.get(chave(sessionId, chatId))
  return selecao?.raiz === raiz ? selecao.nivel : 'manual'
}

export function definirPermissaoAgir(sessionId: string, chatId: string, raiz: string, nivel: NivelPermissaoAgir): void {
  const id = chave(sessionId, chatId)
  permissaoPorConversa.delete(id)
  permissaoPorConversa.set(id, { nivel, raiz })
  while (permissaoPorConversa.size > MAX_CONVERSAS) {
    const maisAntiga = permissaoPorConversa.keys().next()
    if (maisAntiga.done) break
    permissaoPorConversa.delete(maisAntiga.value)
  }
}
