export interface SectionOrderState {
    /** Ids de grupos customizados na ordem escolhida pelo usuário. */
    readonly customOrder: readonly string[];
}
export declare function createSectionOrderState(order?: readonly string[]): SectionOrderState;
/**
 * Ordena os ids de grupos customizados presentes segundo a ordem gerenciada
 * pelo usuário. Ids conhecidos vêm primeiro (na ordem persistida); ids novos
 * (ainda não ordenados) vão ao fim, em ordem alfabética estável pelo rótulo,
 * para permanecerem determinísticos até o usuário reordená-los.
 */
export declare function orderCustomGroups(state: SectionOrderState, presentIds: readonly string[], labelOf?: (id: string) => string): string[];
/**
 * Move um grupo customizado da posição `fromId` para a posição de `toId`,
 * retornando um novo estado. `presentIds` garante que ids ainda não
 * persistidos entrem na ordem antes do move (mantém a operação total).
 */
export declare function reorderCustomGroup(state: SectionOrderState, presentIds: readonly string[], fromId: string, toId: string, labelOf?: (id: string) => string): SectionOrderState;
//# sourceMappingURL=sectionOrder.d.ts.map