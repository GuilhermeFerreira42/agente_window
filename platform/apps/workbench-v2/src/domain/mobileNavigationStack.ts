// R-077 — MobileNavigationStack (MOBILE.md §Navigation).
//
// A pilha de navegação mobile, possuída pelo workbench, rastreia camadas
// transitórias aninhadas (drawers, custom views, pickers, editores full-screen).
// A back-navigation da plataforma dispensa a camada do TOPO antes de deixar a
// superfície da sessão atual — ela NÃO controla o ciclo de vida das instâncias
// dos parts.
//
// Regras fiéis ao spec preservadas aqui:
// - A navegação de volta remove só a camada do topo; quando a pilha esvazia, a
//   volta "sai" da superfície da sessão (sinalizado por `exitedSession`).
// - Abrir outra sessão RESETA/substitui as camadas transitórias (a troca de
//   sessão é o dono da limpeza, não os componentes).
// - Não há um segundo store de sessão ativa aqui: a pilha só guarda camadas.
// - Empurrar a MESMA camada (mesmo id) não duplica — traz ao topo (replace).

export type MobileLayerKind = 'drawer' | 'custom-view' | 'picker' | 'full-screen-editor'

export interface MobileLayer {
  id: string
  kind: MobileLayerKind
  /** Rótulo legível (para acessibilidade/telemetria). */
  label?: string
}

export interface MobileNavigationStack {
  /** Camadas do fundo → topo. A última é a camada ativa (topo). */
  readonly layers: readonly MobileLayer[]
}

export const EMPTY_NAVIGATION_STACK: MobileNavigationStack = { layers: [] }

/** A camada do topo (ativa), ou undefined se a pilha está vazia. */
export function topLayer(stack: MobileNavigationStack): MobileLayer | undefined {
  return stack.layers[stack.layers.length - 1]
}

export function hasLayers(stack: MobileNavigationStack): boolean {
  return stack.layers.length > 0
}

/**
 * Empurra uma camada para o topo. Se já existir uma camada com o mesmo id, ela
 * é movida para o topo (replace, sem duplicar) preservando a nova definição.
 */
export function pushLayer(stack: MobileNavigationStack, layer: MobileLayer): MobileNavigationStack {
  const without = stack.layers.filter((existing) => existing.id !== layer.id)
  return { layers: [...without, layer] }
}

export interface BackNavigationResult {
  stack: MobileNavigationStack
  /** A camada dispensada nesta volta (se havia alguma). */
  dismissed?: MobileLayer
  /**
   * true quando a pilha já estava vazia: a back-navigation sai da superfície da
   * sessão atual em vez de dispensar uma camada.
   */
  exitedSession: boolean
}

/**
 * Back-navigation da plataforma: dispensa apenas a camada do topo. Quando a
 * pilha está vazia, sinaliza a saída da superfície da sessão (`exitedSession`).
 */
export function navigateBack(stack: MobileNavigationStack): BackNavigationResult {
  if (stack.layers.length === 0) {
    return { stack: EMPTY_NAVIGATION_STACK, exitedSession: true }
  }
  const dismissed = stack.layers[stack.layers.length - 1]
  return {
    stack: { layers: stack.layers.slice(0, -1) },
    dismissed,
    exitedSession: false,
  }
}

/** Dispensa uma camada específica por id (ex.: fechar um drawer por botão). */
export function dismissLayer(stack: MobileNavigationStack, id: string): MobileNavigationStack {
  return { layers: stack.layers.filter((layer) => layer.id !== id) }
}

/**
 * Troca de sessão: reseta todas as camadas transitórias. O dono da limpeza é a
 * troca de sessão (não os componentes lendo storage keys uns dos outros).
 */
export function resetForSessionSwitch(): MobileNavigationStack {
  return EMPTY_NAVIGATION_STACK
}

