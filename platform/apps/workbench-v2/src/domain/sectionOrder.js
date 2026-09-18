// E6/R-013 — ISessionSectionOrderService (SESSIONS_LIST.md §Ordering).
//
// A ordem das SEÇÕES fixas (Pinned, Quick Chats, date sections, Archived) é
// determinada pelo modelo. Mas grupos criados pelo usuário e seções de
// workspace compartilham uma ORDEM GERENCIADA PELO USUÁRIO, abaixo das seções
// fixas. Este serviço possui essa ordem — persistida, reordenável — e é a fonte
// de verdade para ordenar o bloco de grupos customizados (em vez de alfabético).
export function createSectionOrderState(order = []) {
    return { customOrder: dedupe(order) };
}
function dedupe(order) {
    const seen = new Set();
    const result = [];
    for (const id of order) {
        if (!seen.has(id)) {
            seen.add(id);
            result.push(id);
        }
    }
    return result;
}
/**
 * Ordena os ids de grupos customizados presentes segundo a ordem gerenciada
 * pelo usuário. Ids conhecidos vêm primeiro (na ordem persistida); ids novos
 * (ainda não ordenados) vão ao fim, em ordem alfabética estável pelo rótulo,
 * para permanecerem determinísticos até o usuário reordená-los.
 */
export function orderCustomGroups(state, presentIds, labelOf = (id) => id) {
    const present = new Set(presentIds);
    const known = state.customOrder.filter((id) => present.has(id));
    const knownSet = new Set(known);
    const unknown = presentIds
        .filter((id) => !knownSet.has(id))
        .sort((a, b) => labelOf(a).localeCompare(labelOf(b)));
    return [...known, ...unknown];
}
/**
 * Move um grupo customizado da posição `fromId` para a posição de `toId`,
 * retornando um novo estado. `presentIds` garante que ids ainda não
 * persistidos entrem na ordem antes do move (mantém a operação total).
 */
export function reorderCustomGroup(state, presentIds, fromId, toId, labelOf = (id) => id) {
    if (fromId === toId)
        return state;
    const current = orderCustomGroups(state, presentIds, labelOf);
    const from = current.indexOf(fromId);
    const to = current.indexOf(toId);
    if (from < 0 || to < 0)
        return state;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, fromId);
    return { customOrder: next };
}
//# sourceMappingURL=sectionOrder.js.map