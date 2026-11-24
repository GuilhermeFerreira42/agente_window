// ============================================================================
// domain/limpezaDeSessao.ts — registros POR SESSÃO: perder a sessão é perder a
// chave, em todos os mapas de uma vez.
//
// Contexto: a exclusão de conversa limpava 10 mapas do App com 10 blocos de
// `setState` copiados à mão (dois deles `Object.fromEntries(...filter...)`).
// Extrair aqui não muda comportamento: mesma regra (chave === sessionId, ou
// chave com prefixo `sessionId:`), mesma criação de objeto novo (React precisa
// da identidade nova), nenhum mapa novo. O App só conecta.
//
// Puro: sem React, sem IO, sem relógio.
// ============================================================================

/** True quando a chave pertence à sessão (igual ou prefixada por `id:`). */
export function chaveDaSessao(chave: string, sessionId: string): boolean {
  return chave === sessionId || chave.startsWith(`${sessionId}:`)
}

/** Remove a sessão de um mapa SEM tocar nos demais (identidade nova). */
export function semSessao<T>(mapa: Record<string, T>, sessionId: string): Record<string, T> {
  let mudou = false
  const proximo: Record<string, T> = {}
  for (const [chave, valor] of Object.entries(mapa)) {
    if (chaveDaSessao(chave, sessionId)) { mudou = true; continue }
    proximo[chave] = valor
  }
  return mudou ? proximo : mapa
}
