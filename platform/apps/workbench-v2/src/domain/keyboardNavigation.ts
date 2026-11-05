// E2/R-076 — Navegação por teclado da lista de sessões (roving focus).
//
// Funções puras que calculam o próximo índice focado a partir de uma tecla,
// espelhando o comportamento de lista do workbench: ArrowUp/ArrowDown movem
// um item; Home/End vão para as extremidades; PageUp/PageDown saltam uma
// "página" (tamanho configurável). O foco é "roving" — não faz wrap para não
// surpreender leitores de tela (paridade com WorkbenchList).

export type NavigationKey =
  | 'ArrowDown'
  | 'ArrowUp'
  | 'Home'
  | 'End'
  | 'PageDown'
  | 'PageUp'

export interface RovingNavigationOptions {
  /** Quantidade total de itens navegáveis. */
  count: number
  /** Índice atualmente focado (-1 se nenhum). */
  current: number
  /** Itens por "página" para PageUp/PageDown (default 8). */
  pageSize?: number
}

/**
 * Retorna o próximo índice para a tecla dada, ou o índice atual se não há
 * movimento possível. Nunca retorna fora de [0, count-1]; retorna -1 apenas
 * quando a lista está vazia.
 */
export function nextRovingIndex(key: NavigationKey, options: RovingNavigationOptions): number {
  const { count, current } = options
  const pageSize = options.pageSize ?? 8
  if (count <= 0) return -1
  const clamp = (value: number) => Math.max(0, Math.min(count - 1, value))
  // Quando nada está focado, a primeira navegação "para baixo/fim" começa no
  // topo e "para cima/início" começa no fim.
  const start = current < 0 ? (key === 'ArrowUp' || key === 'End' || key === 'PageUp' ? count : -1) : current
  switch (key) {
    case 'ArrowDown':
      return clamp(start + 1)
    case 'ArrowUp':
      return clamp(start - 1)
    case 'PageDown':
      return clamp(start + pageSize)
    case 'PageUp':
      return clamp(start - pageSize)
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return clamp(current)
  }
}

/** As teclas que este helper trata (para decidir preventDefault). */
export function isNavigationKey(key: string): key is NavigationKey {
  return (
    key === 'ArrowDown' ||
    key === 'ArrowUp' ||
    key === 'Home' ||
    key === 'End' ||
    key === 'PageDown' ||
    key === 'PageUp'
  )
}

