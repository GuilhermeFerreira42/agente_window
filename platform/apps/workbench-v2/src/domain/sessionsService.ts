// E14 — ISessionsService: modelo de sessões visíveis do Sessions Part
// (LAYOUT.md §Sessions Part, LAYOUT_CONTROLLER.md §Multiple visible sessions).
//
// O serviço é o dono único de:
// - identidade e ordem das sessões visíveis;
// - a sessão visível ativa;
// - qual chat está ativo em cada sessão;
// - a restauração do arranjo visível.
//
// O Sessions Part apenas renderiza esse modelo — NÃO cria um segundo store de
// sessão ativa. Quando mais de uma sessão está visível, a sincronização por
// sessão é suprimida (multipleSessionsVisibleObs) e o estado de view/panel por
// sessão é limpo.

export interface SessionsServiceState {
  /** Ids das sessões visíveis, na ordem de exibição no grid. */
  visible: string[]
  /** A sessão visível ativa (deve pertencer a `visible`). */
  active: string
  /** Chat ativo por sessão. */
  activeChatBySession: Record<string, string>
}

export interface SessionsServiceInit {
  active: string
  activeChatBySession?: Record<string, string>
}

export function createSessionsServiceState(init: SessionsServiceInit): SessionsServiceState {
  return {
    visible: [init.active],
    active: init.active,
    activeChatBySession: { ...(init.activeChatBySession ?? {}) },
  }
}

/** Mais de uma sessão visível ao mesmo tempo (multipleSessionsVisibleObs). */
export function multipleSessionsVisible(state: SessionsServiceState): boolean {
  return state.visible.length > 1
}

/**
 * Torna `id` a sessão ativa. Se ainda não estiver visível, entra como única
 * visível (comportamento padrão de troca de sessão). Idempotente para a ativa.
 */
export function setActiveSession(state: SessionsServiceState, id: string): SessionsServiceState {
  if (state.active === id && state.visible.includes(id)) return state
  const visible = state.visible.includes(id) ? state.visible : [id]
  return { ...state, visible, active: id }
}

/**
 * Adiciona `id` ao grid de sessões visíveis (sem duplicar) e o torna ativo,
 * preservando a ordem existente. Um novo id é anexado ao fim.
 */
export function addVisibleSession(state: SessionsServiceState, id: string): SessionsServiceState {
  const visible = state.visible.includes(id) ? state.visible : [...state.visible, id]
  return { ...state, visible, active: id }
}

/**
 * Remove `id` do grid. Nunca deixa o grid vazio: se remover a última visível, é
 * no-op. Se remover a ativa, promove a vizinha (anterior, senão a primeira).
 */
export function removeVisibleSession(state: SessionsServiceState, id: string): SessionsServiceState {
  if (!state.visible.includes(id)) return state
  if (state.visible.length === 1) return state
  const index = state.visible.indexOf(id)
  const visible = state.visible.filter((candidate) => candidate !== id)
  let active = state.active
  if (active === id) {
    active = visible[Math.max(0, index - 1)] ?? visible[0]
  }
  return { ...state, visible, active }
}

/** Reordena o grid movendo `fromId` para a posição de `toId`. */
export function reorderVisibleSessions(state: SessionsServiceState, fromId: string, toId: string): SessionsServiceState {
  if (fromId === toId) return state
  const from = state.visible.indexOf(fromId)
  const to = state.visible.indexOf(toId)
  if (from < 0 || to < 0) return state
  const visible = [...state.visible]
  visible.splice(from, 1)
  visible.splice(to, 0, fromId)
  return { ...state, visible }
}

/** Define o chat ativo de uma sessão. */
export function setActiveChat(state: SessionsServiceState, sessionId: string, chatId: string): SessionsServiceState {
  return { ...state, activeChatBySession: { ...state.activeChatBySession, [sessionId]: chatId } }
}

/**
 * Resultado da supressão de sync por multi-sessão: quando várias sessões estão
 * visíveis, os stores de view/panel por sessão são limpos para as visíveis e os
 * autoruns de sync devem "bailar" cedo (shouldSyncPerSession=false).
 */
export interface SyncSuppression<TView, TPanel> {
  shouldSyncPerSession: boolean
  viewStateBySession: Record<string, TView>
  panelVisibilityBySession: Record<string, TPanel>
}

/**
 * Aplica a regra de supressão. Com uma única sessão visível, o sync por sessão
 * segue normal. Com múltiplas, limpa as entradas das sessões visíveis e sinaliza
 * que os autoruns devem bailar cedo.
 */
export function applySyncSuppression<TView, TPanel>(
  state: SessionsServiceState,
  viewStateBySession: Record<string, TView>,
  panelVisibilityBySession: Record<string, TPanel>,
): SyncSuppression<TView, TPanel> {
  if (!multipleSessionsVisible(state)) {
    return { shouldSyncPerSession: true, viewStateBySession, panelVisibilityBySession }
  }
  const visible = new Set(state.visible)
  const clearedView: Record<string, TView> = {}
  for (const [key, value] of Object.entries(viewStateBySession)) {
    if (!visible.has(key)) clearedView[key] = value
  }
  const clearedPanel: Record<string, TPanel> = {}
  for (const [key, value] of Object.entries(panelVisibilityBySession)) {
    if (!visible.has(key)) clearedPanel[key] = value
  }
  return { shouldSyncPerSession: false, viewStateBySession: clearedView, panelVisibilityBySession: clearedPanel }
}

/**
 * Detecta uma troca real de sessão (previous !== active), distinguindo de uma
 * carga inicial (previous indefinido) ou reavaliação sem mudança.
 */
export function isRealSwitch(previous: string | undefined, active: string): boolean {
  return previous !== undefined && previous !== active
}

