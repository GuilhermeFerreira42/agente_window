// R-040 — DockedAuxiliaryBarController (SINGLE_PANE_SCENARIOS.md §1–§2).
//
// No layout single-pane, o terceiro painel é um único cartão com TRÊS regiões:
//   1) Tab bar (uma faixa de abas no topo, sempre visível quando o painel existe)
//   2) Editor content (abaixo da tab bar, recuado à direita pela largura do detalhe)
//   3) Detail panel (a barra auxiliar acoplada à direita DENTRO do editor part)
//
// O controller acopla a barra auxiliar dentro do editor part e governa a
// transição para o estado **Detail-only** (Hide Editor):
//
// - Entrar em Detail-only FECHA todas as abas NÃO-acopladas (mantém só as abas
//   acopladas Changes/Files). As reabríveis são CAPTURADAS e restauradas quando
//   o editor volta a aparecer; as não-restauráveis (ex.: um Search editor
//   untitled "sujo") são DESCARTADAS.
// - A tab bar permanece visível em Detail-only (keepForDockedTabBar).
// - Mostrar o editor de novo restaura as abas capturadas ao FINAL da faixa,
//   preservando a ordem de captura.
//
// Tudo aqui é puro/imutável.

import type { EditorTab } from '../types'

/** Abas acopladas (docked) ao painel de detalhe: Changes/Files. */
export const DOCKED_TAB_TYPES: readonly EditorTab['type'][] = ['diff', 'file']

export function isDockedTab(tab: EditorTab): boolean {
  return DOCKED_TAB_TYPES.includes(tab.type)
}

/**
 * Uma aba não-acoplada é restaurável quando pode ser reaberta de forma idêntica
 * ao mostrar o editor novamente. Search editors são untitled/efêmeros no
 * original ("dirty untitled Search editor") → não-restauráveis (descartados).
 * Browser e AI Customizations são restauráveis.
 */
export function isRestorableTab(tab: EditorTab): boolean {
  if (isDockedTab(tab)) return true
  return tab.type === 'browser' || tab.type === 'customizations'
}

/** Uma aba capturada para restauração posterior. */
export interface CapturedTab {
  tab: EditorTab
  /** Posição relativa (índice) que a aba ocupava, para ordenação estável. */
  order: number
}

export interface DockedControllerState {
  /** Abas capturadas ao entrar em Detail-only, aguardando o editor reaparecer. */
  captured: readonly CapturedTab[]
}

export const EMPTY_DOCKED_STATE: DockedControllerState = { captured: [] }

export interface EnterDetailOnlyResult {
  /** Abas que permanecem (apenas as acopladas Changes/Files). */
  tabs: EditorTab[]
  /** Novo estado do controller com as abas restauráveis capturadas. */
  state: DockedControllerState
  /** Abas descartadas por não serem restauráveis (ex.: Search sujo). */
  dropped: EditorTab[]
}

/**
 * Entra no estado Detail-only (Hide Editor). Mantém só as abas acopladas,
 * captura as não-acopladas restauráveis e descarta as não-restauráveis.
 * Restringe a operação às abas da sessão ativa (as demais sessões não são
 * tocadas), casando com o escopo por-sessão do editor group.
 */
export function enterDetailOnly(
  tabs: readonly EditorTab[],
  activeSessionId: string | undefined,
): EnterDetailOnlyResult {
  // O contrato "mantém apenas as abas acopladas Changes/Files" pressupõe que
  // exista ao menos uma aba acoplada da sessão ativa. Sem nenhuma aba acoplada
  // (ex.: uma sessão só com Browser), a tab bar precisa permanecer para o
  // placeholder de editor oculto — então não fechamos nada.
  const activeTabs = tabs.filter((tab) => tab.sessionId === undefined || tab.sessionId === activeSessionId)
  const hasDocked = activeTabs.some((tab) => isDockedTab(tab))
  if (!hasDocked) {
    return { tabs: [...tabs], state: EMPTY_DOCKED_STATE, dropped: [] }
  }

  const kept: EditorTab[] = []
  const captured: CapturedTab[] = []
  const dropped: EditorTab[] = []

  tabs.forEach((tab, index) => {
    // Abas de outra sessão passam intactas.
    const belongsToActive = tab.sessionId === undefined || tab.sessionId === activeSessionId
    if (!belongsToActive) {
      kept.push(tab)
      return
    }
    if (isDockedTab(tab)) {
      kept.push(tab)
      return
    }
    // Não-acoplada: captura se restaurável, senão descarta.
    if (isRestorableTab(tab)) {
      captured.push({ tab, order: index })
    } else {
      dropped.push(tab)
    }
  })

  return { tabs: kept, state: { captured }, dropped }
}

/**
 * Mostra o editor de novo (Show Editor): restaura as abas capturadas ao FINAL
 * da faixa, preservando a ordem de captura, e limpa o estado. Restored tabs
 * managed no original entram ao fim — aqui idem.
 */
export function showEditorRestore(
  tabs: readonly EditorTab[],
  state: DockedControllerState,
): { tabs: EditorTab[]; state: DockedControllerState } {
  if (state.captured.length === 0) return { tabs: [...tabs], state: EMPTY_DOCKED_STATE }
  const restored = [...state.captured]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.tab)
  // Evita duplicar abas que porventura já existam (por id).
  const existingIds = new Set(tabs.map((tab) => tab.id))
  const toAppend = restored.filter((tab) => !existingIds.has(tab.id))
  return { tabs: [...tabs, ...toAppend], state: EMPTY_DOCKED_STATE }
}

