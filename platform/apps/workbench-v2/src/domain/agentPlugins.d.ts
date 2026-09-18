import type { CustomizationItem } from './aiCustomizations';
/** Formatos de manifesto reconhecidos (auto-detecção do original). */
export type PluginFormat = 'agent-v1' | 'copilot' | 'claude' | 'open-plugin';
/** Um componente contribuído por um plugin (mapeia para as seções). */
export interface PluginComponent {
    kind: 'command' | 'skill' | 'agent' | 'hook' | 'mcp';
    name: string;
    description?: string;
    /** Skills e commands são executáveis (SKILL.md / *.md em commands/). */
    runnable?: boolean;
    /** Servidores MCP podem pertencer a uma coleção. */
    mcpCollection?: string;
    hostPublished?: boolean;
}
/** Um plugin descoberto (IAgentPlugin, forma mockável). */
export interface DiscoveredPlugin {
    /** URI única da raiz do plugin (identidade de ordenação). */
    uri: string;
    label: string;
    format: PluginFormat;
    /** Identidade canônica p/ colisão/enablement (marketplace + nome do pacote). */
    canonicalId: string;
    /** Marca instalação a partir de um marketplace. */
    fromMarketplace?: boolean;
    components: readonly PluginComponent[];
}
/**
 * Uma discovery: estratégia que encontra plugins de uma fonte. Reporta
 * `undefined` enquanto o 1º scan não terminou (IAgentPluginDiscovery).
 */
export interface PluginDiscovery {
    id: string;
    /** Maior prioridade vence em colisão de identidade canônica. */
    priority: number;
    /** `undefined` = ainda não escaneou; array (possivelmente vazio) = pronto. */
    plugins: readonly DiscoveredPlugin[] | undefined;
}
/** Uma entrada registrada no agentPluginDiscoveryRegistry. */
export interface DiscoveryRegistration {
    id: string;
    priority: number;
}
/** Registry global de discoveries (singleton no original). Aqui é puro. */
export declare function createDiscoveryRegistry(): DiscoveryRegistration[];
/** Registra uma discovery mantendo ordem estável por prioridade desc. */
export declare function registerDiscovery(registry: readonly DiscoveryRegistration[], registration: DiscoveryRegistration): DiscoveryRegistration[];
/** Estado de enablement por identidade canônica (agentPlugins.enablement). */
export interface PluginEnablementModel {
    /** Ids canônicos explicitamente desabilitados pelo usuário. */
    disabled: readonly string[];
}
export declare const EMPTY_PLUGIN_ENABLEMENT: PluginEnablementModel;
/** Opções do AgentPluginService. */
export interface AgentPluginServiceOptions {
    /** Master switch `chat.pluginsEnabled` (default true). */
    pluginsEnabled?: boolean;
    enablement?: PluginEnablementModel;
}
/**
 * O serviço está pronto quando TODAS as discoveries produziram um resultado
 * inicial (nenhuma `plugins === undefined`).
 */
export declare function isServiceReady(discoveries: readonly PluginDiscovery[]): boolean;
/**
 * Agrega os plugins de todas as discoveries PRONTAS. Resolve colisões de
 * identidade canônica por prioridade da discovery (maior vence) e ordena o
 * resultado por URI. Enquanto o serviço não está pronto, retorna [].
 */
export declare function aggregatePlugins(discoveries: readonly PluginDiscovery[], options?: AgentPluginServiceOptions): DiscoveredPlugin[];
/** Um plugin habilitado? (identidade canônica; store separado da descoberta). */
export declare function isPluginEnabled(plugin: Pick<DiscoveredPlugin, 'canonicalId'>, enablement?: PluginEnablementModel): boolean;
/** Alterna o enablement de um plugin por identidade canônica (imutável). */
export declare function togglePluginEnablement(enablement: PluginEnablementModel, canonicalId: string): PluginEnablementModel;
/**
 * Projeta os conteúdos dos plugins HABILITADOS para o contrato compartilhado de
 * CustomizationItem (fonte 'plugin'), para que fluam pelo mesmo pipeline de
 * harness/enablement da view de AI Customizations. Plugins desabilitados não
 * contribuem itens.
 */
export declare function projectPluginContributions(plugins: readonly DiscoveredPlugin[], enablement?: PluginEnablementModel): CustomizationItem[];
//# sourceMappingURL=agentPlugins.d.ts.map