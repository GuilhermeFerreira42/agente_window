// R-065 — Agent Plugins via contribuição (AGENTS_PLUGINS.md).
//
// Modelo puro/mockável do pipeline de plugins de agents do original:
//
//   discovery registry (por prioridade)
//     -> AgentPluginService agrega plugins de todas as discoveries prontas
//     -> EnablementModel resolve enable/disable com identidade canônica
//     -> projeção dos conteúdos (commands/skills/agents/hooks/mcp) para o
//        contrato compartilhado de CustomizationItem (fonte 'plugin')
//
// Regras fiéis ao spec preservadas aqui:
// - Uma discovery reporta `undefined` até o 1º scan; o service só expõe plugins
//   quando TODAS as discoveries têm um resultado inicial (`ready`).
// - Plugins agregados são ordenados por URI (determinístico).
// - Identidade canônica: um plugin instalado do marketplace colide com o mesmo
//   plugin descoberto localmente; a colisão é resolvida por prioridade da
//   discovery (maior prioridade vence), nunca duplicando a identidade.
// - EnablementModel é um store separado da descoberta (o que existe × o que está
//   desabilitado), com identidade canônica.
// - `chat.pluginsEnabled` é o master switch: desligado, o service não expõe
//   nenhum plugin.

import type { CustomizationItem, CustomizationSection } from './aiCustomizations'

/** Formatos de manifesto reconhecidos (auto-detecção do original). */
export type PluginFormat = 'agent-v1' | 'copilot' | 'claude' | 'open-plugin'

/** Um componente contribuído por um plugin (mapeia para as seções). */
export interface PluginComponent {
  kind: 'command' | 'skill' | 'agent' | 'hook' | 'mcp'
  name: string
  description?: string
  /** Skills e commands são executáveis (SKILL.md / *.md em commands/). */
  runnable?: boolean
  /** Servidores MCP podem pertencer a uma coleção. */
  mcpCollection?: string
  hostPublished?: boolean
}

/** Um plugin descoberto (IAgentPlugin, forma mockável). */
export interface DiscoveredPlugin {
  /** URI única da raiz do plugin (identidade de ordenação). */
  uri: string
  label: string
  format: PluginFormat
  /** Identidade canônica p/ colisão/enablement (marketplace + nome do pacote). */
  canonicalId: string
  /** Marca instalação a partir de um marketplace. */
  fromMarketplace?: boolean
  components: readonly PluginComponent[]
}

/**
 * Uma discovery: estratégia que encontra plugins de uma fonte. Reporta
 * `undefined` enquanto o 1º scan não terminou (IAgentPluginDiscovery).
 */
export interface PluginDiscovery {
  id: string
  /** Maior prioridade vence em colisão de identidade canônica. */
  priority: number
  /** `undefined` = ainda não escaneou; array (possivelmente vazio) = pronto. */
  plugins: readonly DiscoveredPlugin[] | undefined
}

/** Uma entrada registrada no agentPluginDiscoveryRegistry. */
export interface DiscoveryRegistration {
  id: string
  priority: number
}

/** Registry global de discoveries (singleton no original). Aqui é puro. */
export function createDiscoveryRegistry(): DiscoveryRegistration[] {
  return []
}

/** Registra uma discovery mantendo ordem estável por prioridade desc. */
export function registerDiscovery(
  registry: readonly DiscoveryRegistration[],
  registration: DiscoveryRegistration,
): DiscoveryRegistration[] {
  const without = registry.filter((entry) => entry.id !== registration.id)
  return [...without, registration].sort((a, b) => (b.priority - a.priority) || a.id.localeCompare(b.id))
}

/** Estado de enablement por identidade canônica (agentPlugins.enablement). */
export interface PluginEnablementModel {
  /** Ids canônicos explicitamente desabilitados pelo usuário. */
  disabled: readonly string[]
}

export const EMPTY_PLUGIN_ENABLEMENT: PluginEnablementModel = { disabled: [] }

/** Opções do AgentPluginService. */
export interface AgentPluginServiceOptions {
  /** Master switch `chat.pluginsEnabled` (default true). */
  pluginsEnabled?: boolean
  enablement?: PluginEnablementModel
}

/**
 * O serviço está pronto quando TODAS as discoveries produziram um resultado
 * inicial (nenhuma `plugins === undefined`).
 */
export function isServiceReady(discoveries: readonly PluginDiscovery[]): boolean {
  return discoveries.every((discovery) => discovery.plugins !== undefined)
}

/**
 * Agrega os plugins de todas as discoveries PRONTAS. Resolve colisões de
 * identidade canônica por prioridade da discovery (maior vence) e ordena o
 * resultado por URI. Enquanto o serviço não está pronto, retorna [].
 */
export function aggregatePlugins(
  discoveries: readonly PluginDiscovery[],
  options: AgentPluginServiceOptions = {},
): DiscoveredPlugin[] {
  if (options.pluginsEnabled === false) return []
  if (!isServiceReady(discoveries)) return []

  // Prioridade desc; empate por id estável.
  const ordered = [...discoveries].sort((a, b) => (b.priority - a.priority) || a.id.localeCompare(b.id))
  const byCanonical = new Map<string, DiscoveredPlugin>()
  for (const discovery of ordered) {
    for (const plugin of discovery.plugins ?? []) {
      // A primeira ocorrência (discovery de maior prioridade) vence.
      if (!byCanonical.has(plugin.canonicalId)) {
        byCanonical.set(plugin.canonicalId, plugin)
      }
    }
  }
  return [...byCanonical.values()].sort((a, b) => a.uri.localeCompare(b.uri))
}

/** Um plugin habilitado? (identidade canônica; store separado da descoberta). */
export function isPluginEnabled(
  plugin: Pick<DiscoveredPlugin, 'canonicalId'>,
  enablement: PluginEnablementModel = EMPTY_PLUGIN_ENABLEMENT,
): boolean {
  return !enablement.disabled.includes(plugin.canonicalId)
}

/** Alterna o enablement de um plugin por identidade canônica (imutável). */
export function togglePluginEnablement(
  enablement: PluginEnablementModel,
  canonicalId: string,
): PluginEnablementModel {
  const disabled = new Set(enablement.disabled)
  if (disabled.has(canonicalId)) disabled.delete(canonicalId)
  else disabled.add(canonicalId)
  return { disabled: Array.from(disabled) }
}

const COMPONENT_SECTION: Record<PluginComponent['kind'], CustomizationSection> = {
  command: 'prompts',
  skill: 'skills',
  agent: 'agents',
  hook: 'hooks',
  mcp: 'mcp',
}

/**
 * Projeta os conteúdos dos plugins HABILITADOS para o contrato compartilhado de
 * CustomizationItem (fonte 'plugin'), para que fluam pelo mesmo pipeline de
 * harness/enablement da view de AI Customizations. Plugins desabilitados não
 * contribuem itens.
 */
export function projectPluginContributions(
  plugins: readonly DiscoveredPlugin[],
  enablement: PluginEnablementModel = EMPTY_PLUGIN_ENABLEMENT,
): CustomizationItem[] {
  const items: CustomizationItem[] = []
  for (const plugin of plugins) {
    if (!isPluginEnabled(plugin, enablement)) continue
    for (const component of plugin.components) {
      items.push({
        id: `plugin:${plugin.canonicalId}:${component.kind}:${component.name}`,
        section: COMPONENT_SECTION[component.kind],
        source: 'plugin',
        name: component.name,
        description: component.description ?? `${component.name} (via ${plugin.label})`,
        uri: `${plugin.uri}/${component.kind}/${component.name}`,
        runnable: component.runnable,
        mcpCollection: component.mcpCollection,
        hostPublished: component.hostPublished,
      })
    }
  }
  return items
}

