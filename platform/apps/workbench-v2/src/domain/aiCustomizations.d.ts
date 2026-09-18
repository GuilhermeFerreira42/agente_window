/** Tipos de seção de gerenciamento (management sections). */
export type CustomizationSection = 'agents' | 'skills' | 'instructions' | 'prompts' | 'hooks' | 'mcp' | 'tools' | 'plugins';
/** Procedência de um item (AICustomizationSource). */
export type CustomizationSource = 'local' | 'user' | 'extension' | 'plugin' | 'built-in';
/** Um item de customização no contrato compartilhado. */
export interface CustomizationItem {
    id: string;
    section: CustomizationSection;
    source: CustomizationSource;
    name: string;
    description: string;
    /** URI endereçável (management-editor pode revelar por URI). */
    uri: string;
    /** Coleção MCP à qual o item pertence (para exclusões por harness). */
    mcpCollection?: string;
    /** Marca itens publicados pelo host — nunca escondidos por exclusão de coleção. */
    hostPublished?: boolean;
    /** Ação de skill executável (mapeia para os SKILL.md do original). */
    runnable?: boolean;
}
/** Descritor de harness: presentation + discovery policy (IHarnessDescriptor). */
export interface HarnessDescriptor {
    id: string;
    label: string;
    /** Seções visíveis neste harness. */
    visibleSections: readonly CustomizationSection[];
    /** Tipos de item escondidos (por seção). */
    hiddenSections?: readonly CustomizationSection[];
    /** Coleções MCP excluídas (não escondem servidores host-published). */
    excludedMcpCollections?: readonly string[];
    /** Fontes escondidas neste harness. */
    hiddenSources?: readonly CustomizationSource[];
}
/** Rótulos legíveis das seções (ordem canônica de apresentação). */
export declare const SECTION_ORDER: readonly CustomizationSection[];
export declare const SECTION_LABELS: Record<CustomizationSection, string>;
export declare const SOURCE_LABELS: Record<CustomizationSource, string>;
/** Estado de enablement do usuário (store separado da descoberta). */
export interface EnablementState {
    /** Ids de itens built-in desabilitados pelo usuário. */
    disabled: readonly string[];
}
export declare const EMPTY_ENABLEMENT: EnablementState;
/**
 * Aplica o filtro do harness a um conjunto de itens. Este passo acontece ANTES
 * da apresentação de enablement (regra do spec).
 */
export declare function applyHarnessFilter(items: readonly CustomizationItem[], harness: HarnessDescriptor): CustomizationItem[];
/** Um item projetado para a lista, com o estado de enablement resolvido. */
export interface ProjectedItem extends CustomizationItem {
    enabled: boolean;
    /** Só itens built-in podem alternar enablement. */
    canToggleEnablement: boolean;
}
/**
 * Projeta os itens combinando descoberta + enablement. Só itens built-in podem
 * ser desabilitados; as demais fontes permanecem sempre habilitadas.
 */
export declare function projectItems(items: readonly CustomizationItem[], enablement: EnablementState): ProjectedItem[];
export interface SourceGroup {
    source: CustomizationSource;
    label: string;
    items: ProjectedItem[];
}
export interface SectionGroup {
    section: CustomizationSection;
    label: string;
    /** Total de itens após filtro do harness (contagem == linhas). */
    count: number;
    /** Itens agrupados por fonte, na ordem local > user > extension > plugin > built-in. */
    sources: SourceGroup[];
}
export interface ManagementModel {
    harnessId: string;
    sections: SectionGroup[];
    /** Total de itens visíveis em todas as seções. */
    totalCount: number;
}
export interface BuildModelOptions {
    /** Só seções com itens são exibidas quando true (padrão false: mostra vazias visíveis do harness). */
    hideEmptySections?: boolean;
    /** Query de busca opcional (nome/descrição). */
    query?: string;
}
/**
 * Constrói o modelo de gerenciamento: filtra pelo harness, aplica enablement,
 * agrupa por seção e fonte, e calcula contagens. Seções e linhas consomem o
 * mesmo modelo filtrado.
 */
export declare function buildManagementModel(items: readonly CustomizationItem[], harness: HarnessDescriptor, enablement?: EnablementState, options?: BuildModelOptions): ManagementModel;
/** Alterna o enablement de um item built-in (imutável). Ignora não-built-in. */
export declare function toggleEnablement(enablement: EnablementState, item: Pick<CustomizationItem, 'id' | 'source'>): EnablementState;
//# sourceMappingURL=aiCustomizations.d.ts.map