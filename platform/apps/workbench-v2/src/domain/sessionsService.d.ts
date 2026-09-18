export interface SessionsServiceState {
    /** Ids das sessões visíveis, na ordem de exibição no grid. */
    visible: string[];
    /** A sessão visível ativa (deve pertencer a `visible`). */
    active: string;
    /** Chat ativo por sessão. */
    activeChatBySession: Record<string, string>;
}
export interface SessionsServiceInit {
    active: string;
    activeChatBySession?: Record<string, string>;
}
export declare function createSessionsServiceState(init: SessionsServiceInit): SessionsServiceState;
/** Mais de uma sessão visível ao mesmo tempo (multipleSessionsVisibleObs). */
export declare function multipleSessionsVisible(state: SessionsServiceState): boolean;
/**
 * Torna `id` a sessão ativa. Se ainda não estiver visível, entra como única
 * visível (comportamento padrão de troca de sessão). Idempotente para a ativa.
 */
export declare function setActiveSession(state: SessionsServiceState, id: string): SessionsServiceState;
/**
 * Adiciona `id` ao grid de sessões visíveis (sem duplicar) e o torna ativo,
 * preservando a ordem existente. Um novo id é anexado ao fim.
 */
export declare function addVisibleSession(state: SessionsServiceState, id: string): SessionsServiceState;
/**
 * Remove `id` do grid. Nunca deixa o grid vazio: se remover a última visível, é
 * no-op. Se remover a ativa, promove a vizinha (anterior, senão a primeira).
 */
export declare function removeVisibleSession(state: SessionsServiceState, id: string): SessionsServiceState;
/** Reordena o grid movendo `fromId` para a posição de `toId`. */
export declare function reorderVisibleSessions(state: SessionsServiceState, fromId: string, toId: string): SessionsServiceState;
/** Define o chat ativo de uma sessão. */
export declare function setActiveChat(state: SessionsServiceState, sessionId: string, chatId: string): SessionsServiceState;
/**
 * Resultado da supressão de sync por multi-sessão: quando várias sessões estão
 * visíveis, os stores de view/panel por sessão são limpos para as visíveis e os
 * autoruns de sync devem "bailar" cedo (shouldSyncPerSession=false).
 */
export interface SyncSuppression<TView, TPanel> {
    shouldSyncPerSession: boolean;
    viewStateBySession: Record<string, TView>;
    panelVisibilityBySession: Record<string, TPanel>;
}
/**
 * Aplica a regra de supressão. Com uma única sessão visível, o sync por sessão
 * segue normal. Com múltiplas, limpa as entradas das sessões visíveis e sinaliza
 * que os autoruns devem bailar cedo.
 */
export declare function applySyncSuppression<TView, TPanel>(state: SessionsServiceState, viewStateBySession: Record<string, TView>, panelVisibilityBySession: Record<string, TPanel>): SyncSuppression<TView, TPanel>;
/**
 * Detecta uma troca real de sessão (previous !== active), distinguindo de uma
 * carga inicial (previous indefinido) ou reavaliação sem mudança.
 */
export declare function isRealSwitch(previous: string | undefined, active: string): boolean;
//# sourceMappingURL=sessionsService.d.ts.map