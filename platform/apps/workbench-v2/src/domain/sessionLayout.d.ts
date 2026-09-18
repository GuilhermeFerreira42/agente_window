/** O container de detalhes ativo dentro da barra auxiliar. */
export type AuxViewContainerId = 'changes' | 'files';
/** Estado de layout que pertence a uma sessão individual. */
export interface SessionLayoutState {
    /** A barra auxiliar (painel de detalhes) estava visível nessa sessão. */
    auxiliaryVisible: boolean;
    /** Qual container de detalhes estava ativo. */
    activeViewContainerId: AuxViewContainerId;
}
/** Estado padrão para uma sessão nunca vista antes. */
export declare const DEFAULT_SESSION_LAYOUT: SessionLayoutState;
export type SessionLayoutMap = Readonly<Record<string, SessionLayoutState>>;
/**
 * Captura o estado de layout da sessão que está sendo deixada. Retorna um novo
 * mapa (imutável) — não muta a entrada. Sessões sem id (rascunho/landing) são
 * ignoradas, pois não têm working set persistente.
 */
export declare function captureSessionLayout(map: SessionLayoutMap, sessionId: string | undefined, state: SessionLayoutState): SessionLayoutMap;
/**
 * Restaura o estado de layout para a sessão que está sendo aberta. Se a sessão
 * nunca foi vista, cai no padrão (ou no fallback fornecido, p.ex. a preferência
 * global inicial).
 */
export declare function restoreSessionLayout(map: SessionLayoutMap, sessionId: string | undefined, fallback?: SessionLayoutState): SessionLayoutState;
/**
 * Remove o estado de layout de uma sessão excluída, evitando entradas órfãs.
 * Retorna um novo mapa; não muta a entrada.
 */
export declare function forgetSessionLayout(map: SessionLayoutMap, sessionId: string): SessionLayoutMap;
//# sourceMappingURL=sessionLayout.d.ts.map