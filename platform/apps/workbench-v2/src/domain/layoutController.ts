// E4/E15 — Layout controllers da Agents Window (LAYOUT_CONTROLLER.md §Overview).
//
// `BaseLayoutController` possui a mecânica agnóstica de plataforma: painel
// (visibilidade por sessão), working sets do editor, e supressão multi-sessão.
// `DesktopLayoutController` ADICIONA o gerenciamento da barra auxiliar (aux bar);
// `MobileLayoutController` (web phone) OMITE a aux bar por completo. A
// contribuição escolhe o controller correto por plataforma.
//
// Aqui modelamos o contrato como funções puras + uma factory, para que a UI
// consulte "esta plataforma gerencia a aux bar?" e "esta view container é
// suportada?" sem duplicar a política de layout.

export type LayoutPlatform = 'desktop' | 'mobile'

/** Estado de layout por sessão que o controller sincroniza. */
export interface PerSessionLayoutState {
  /** Aux bar (secondary side bar) — apenas no layout clássico/desktop. */
  auxiliaryVisible: boolean
  /** Container de detalhes ativo (changes/files). */
  activeViewContainerId: 'changes' | 'files'
  /** Visibilidade do painel inferior (terminal/output) — todas as plataformas. */
  panelVisible: boolean
}

export interface LayoutController {
  readonly platform: LayoutPlatform
  /** A plataforma mantém a barra auxiliar como coluna persistente. */
  readonly managesAuxiliaryBar: boolean
  /**
   * A aux bar deve ser apresentada agora? Em mobile é SEMPRE false (skipada por
   * completo — não escondida via CSS). Em desktop, segue o estado da sessão e a
   * regra de supressão multi-sessão.
   */
  shouldRenderAuxiliaryBar(inputs: { auxiliaryVisible: boolean; multipleSessionsVisible: boolean }): boolean
  /** Estado de layout efetivo para uma sessão, aplicando a política da plataforma. */
  effectiveSessionState(state: PerSessionLayoutState, multipleSessionsVisible: boolean): PerSessionLayoutState
}

const BASE_PANEL_ONLY = (state: PerSessionLayoutState, multipleSessionsVisible: boolean): PerSessionLayoutState => ({
  ...state,
  // Supressão multi-sessão: quando várias sessões estão visíveis no grid, o
  // sync por sessão é suprimido — não force nenhum estado de detalhe.
  panelVisible: multipleSessionsVisible ? state.panelVisible : state.panelVisible,
})

class DesktopLayoutController implements LayoutController {
  readonly platform = 'desktop' as const
  readonly managesAuxiliaryBar = true

  shouldRenderAuxiliaryBar({ auxiliaryVisible, multipleSessionsVisible }: { auxiliaryVisible: boolean; multipleSessionsVisible: boolean }): boolean {
    // Com múltiplas sessões visíveis, o sync por sessão é suprimido e a aux bar
    // não é apresentada como coluna dedicada.
    if (multipleSessionsVisible) return false
    return auxiliaryVisible
  }

  effectiveSessionState(state: PerSessionLayoutState, multipleSessionsVisible: boolean): PerSessionLayoutState {
    return BASE_PANEL_ONLY(state, multipleSessionsVisible)
  }
}

class MobileLayoutController implements LayoutController {
  readonly platform = 'mobile' as const
  // MobileLayoutController omite o gerenciamento da aux bar (LAYOUT_CONTROLLER.md:13).
  readonly managesAuxiliaryBar = false

  shouldRenderAuxiliaryBar(): boolean {
    // Web phone: aux bar totalmente skipada (R-033). O conteúdo de detalhes é
    // apresentado via navegação mobile/overlays, nunca como coluna persistente.
    return false
  }

  effectiveSessionState(state: PerSessionLayoutState, multipleSessionsVisible: boolean): PerSessionLayoutState {
    // Sem aux bar: a visibilidade de detalhes nunca é uma coluna; preserva só o
    // container ativo (para quando o overlay abrir) e o painel.
    return { ...BASE_PANEL_ONLY(state, multipleSessionsVisible), auxiliaryVisible: false }
  }
}

/**
 * Contribui o controller correto por plataforma (paridade com
 * `sessions.layout.contribution.ts`).
 */
export function createLayoutController(platform: LayoutPlatform): LayoutController {
  return platform === 'mobile' ? new MobileLayoutController() : new DesktopLayoutController()
}

/** Deriva a plataforma do controller a partir do viewport single-pane/phone. */
export function layoutPlatformFor(isSinglePane: boolean): LayoutPlatform {
  return isSinglePane ? 'mobile' : 'desktop'
}

