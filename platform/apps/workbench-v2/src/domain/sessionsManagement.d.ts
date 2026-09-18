/** Um provider registrado (SESSIONS.md §ISessionsProvidersService). */
export interface SessionProvider {
    id: string;
    label: string;
    /** Ordem estável de exibição/seleção; menor = maior precedência. */
    order: number;
    /** Tipos de sessão que este provider adapta. */
    sessionTypes: readonly string[];
    /** Workspaces que este provider consegue atender (vazio = qualquer um). */
    workspaces?: readonly string[];
}
/** Rascunho pendente possuído pelo Management (SESSIONS.md §Management). */
export type SessionDraftKind = 'workspace-session' | 'quick-chat' | 'automation';
export interface SessionDraft {
    id: string;
    kind: SessionDraftKind;
    providerId: string;
    workspace?: string;
}
export interface SessionsManagementState {
    /** Registro de providers em ordem estável. */
    readonly providers: readonly SessionProvider[];
    /** Drafts pendentes, em ordem de criação. */
    readonly drafts: readonly SessionDraft[];
}
/** Cria o estado inicial do serviço a partir de um conjunto de providers. */
export declare function createManagementState(providers?: readonly SessionProvider[]): SessionsManagementState;
/** Registra (ou substitui) um provider, mantendo a ordem estável. */
export declare function registerProvider(state: SessionsManagementState, provider: SessionProvider): SessionsManagementState;
/** Remove um provider e quaisquer drafts que dependiam dele. */
export declare function unregisterProvider(state: SessionsManagementState, providerId: string): SessionsManagementState;
/** Resolve um provider por id (undefined se não registrado). */
export declare function resolveProvider(state: SessionsManagementState, providerId: string): SessionProvider | undefined;
/** Todos os tipos de sessão agregados dos providers, sem duplicatas, ordenados. */
export declare function aggregateSessionTypes(state: SessionsManagementState): string[];
/**
 * Seleciona o provider para uma nova sessão em `workspace`: o primeiro provider
 * (na ordem estável) que atende o workspace; providers sem restrição de
 * workspace atendem qualquer um. Retorna undefined se nenhum atende.
 */
export declare function selectProviderForNewSession(state: SessionsManagementState, workspace: string): SessionProvider | undefined;
/** Workspaces distintos que algum provider consegue atender, ordenados. */
export declare function resolvableWorkspaces(state: SessionsManagementState): string[];
/**
 * Abre um draft pendente. Um provider deve estar registrado; para
 * `workspace-session` o provider precisa atender o workspace informado.
 * Retorna o estado inalterado se a pré-condição falhar.
 */
export declare function openDraft(state: SessionsManagementState, draft: SessionDraft): SessionsManagementState;
/** Confirma (remove) um draft — a sessão real foi criada pela UI. */
export declare function commitDraft(state: SessionsManagementState, draftId: string): SessionsManagementState;
/** Descarta um draft pendente sem criar sessão. */
export declare function discardDraft(state: SessionsManagementState, draftId: string): SessionsManagementState;
/** Há um draft pendente de um dado tipo? */
export declare function hasPendingDraft(state: SessionsManagementState, kind: SessionDraftKind): boolean;
//# sourceMappingURL=sessionsManagement.d.ts.map