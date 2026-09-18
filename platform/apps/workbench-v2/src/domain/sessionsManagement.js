// E?/R-001/R-002/R-003 — ISessionsManagementService (SESSIONS.md §Service ownership).
//
// A camada de orquestração de modelo, provider-neutra: agrega sessões e tipos de
// TODOS os providers registrados, resolve workspaces e seleciona um provider
// para novas sessões, e possui os "drafts" pendentes (workspace-session,
// quick-chat e automation). NÃO possui estado ativo/visível/foco/layout — isso
// pertence a `ISessionsService` (ver sessionsService.ts).
//
// Tudo aqui é puro/imutável para casar com os contratos de teste do projeto.
/** Cria o estado inicial do serviço a partir de um conjunto de providers. */
export function createManagementState(providers = []) {
    return { providers: sortProviders(providers), drafts: [] };
}
function sortProviders(providers) {
    return [...providers].sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
}
// ---- Registro de providers (ISessionsProvidersService) ----
/** Registra (ou substitui) um provider, mantendo a ordem estável. */
export function registerProvider(state, provider) {
    const without = state.providers.filter((candidate) => candidate.id !== provider.id);
    return { ...state, providers: sortProviders([...without, provider]) };
}
/** Remove um provider e quaisquer drafts que dependiam dele. */
export function unregisterProvider(state, providerId) {
    return {
        providers: state.providers.filter((provider) => provider.id !== providerId),
        drafts: state.drafts.filter((draft) => draft.providerId !== providerId),
    };
}
/** Resolve um provider por id (undefined se não registrado). */
export function resolveProvider(state, providerId) {
    return state.providers.find((provider) => provider.id === providerId);
}
/** Todos os tipos de sessão agregados dos providers, sem duplicatas, ordenados. */
export function aggregateSessionTypes(state) {
    const types = new Set();
    for (const provider of state.providers) {
        for (const type of provider.sessionTypes)
            types.add(type);
    }
    return [...types].sort();
}
// ---- Resolução de workspace + seleção de provider (R-002) ----
/**
 * Seleciona o provider para uma nova sessão em `workspace`: o primeiro provider
 * (na ordem estável) que atende o workspace; providers sem restrição de
 * workspace atendem qualquer um. Retorna undefined se nenhum atende.
 */
export function selectProviderForNewSession(state, workspace) {
    return state.providers.find((provider) => {
        if (!provider.workspaces || provider.workspaces.length === 0)
            return true;
        return provider.workspaces.includes(workspace);
    });
}
/** Workspaces distintos que algum provider consegue atender, ordenados. */
export function resolvableWorkspaces(state) {
    const workspaces = new Set();
    for (const provider of state.providers) {
        for (const workspace of provider.workspaces ?? [])
            workspaces.add(workspace);
    }
    return [...workspaces].sort();
}
// ---- Drafts pendentes (R-003) ----
/**
 * Abre um draft pendente. Um provider deve estar registrado; para
 * `workspace-session` o provider precisa atender o workspace informado.
 * Retorna o estado inalterado se a pré-condição falhar.
 */
export function openDraft(state, draft) {
    const provider = resolveProvider(state, draft.providerId);
    if (!provider)
        return state;
    if (draft.kind === 'workspace-session' && draft.workspace) {
        const owner = selectProviderForNewSession(state, draft.workspace);
        if (!owner || owner.id !== provider.id)
            return state;
    }
    if (state.drafts.some((existing) => existing.id === draft.id))
        return state;
    return { ...state, drafts: [...state.drafts, { ...draft }] };
}
/** Confirma (remove) um draft — a sessão real foi criada pela UI. */
export function commitDraft(state, draftId) {
    if (!state.drafts.some((draft) => draft.id === draftId))
        return state;
    return { ...state, drafts: state.drafts.filter((draft) => draft.id !== draftId) };
}
/** Descarta um draft pendente sem criar sessão. */
export function discardDraft(state, draftId) {
    return commitDraft(state, draftId);
}
/** Há um draft pendente de um dado tipo? */
export function hasPendingDraft(state, kind) {
    return state.drafts.some((draft) => draft.kind === kind);
}
//# sourceMappingURL=sessionsManagement.js.map