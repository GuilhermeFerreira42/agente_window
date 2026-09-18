import { describe, expect, it } from 'vitest'
import {
  EMPTY_PLUGIN_ENABLEMENT,
  aggregatePlugins,
  createDiscoveryRegistry,
  isPluginEnabled,
  isServiceReady,
  projectPluginContributions,
  registerDiscovery,
  togglePluginEnablement,
  type DiscoveredPlugin,
  type PluginDiscovery,
} from '../domain/agentPlugins'

function plugin(overrides: Partial<DiscoveredPlugin> = {}): DiscoveredPlugin {
  return {
    uri: 'file:///plugins/a',
    label: 'A',
    format: 'agent-v1',
    canonicalId: 'acme/a',
    components: [{ kind: 'skill', name: 'do-thing', runnable: true }],
    ...overrides,
  }
}

describe('agent plugins — registry de discoveries (R-065)', () => {
  it('registra discoveries ordenadas por prioridade desc', () => {
    let registry = createDiscoveryRegistry()
    registry = registerDiscovery(registry, { id: 'low', priority: 10 })
    registry = registerDiscovery(registry, { id: 'high', priority: 100 })
    registry = registerDiscovery(registry, { id: 'mid', priority: 50 })
    expect(registry.map((entry) => entry.id)).toEqual(['high', 'mid', 'low'])
  })

  it('re-registrar por id substitui a entrada (sem duplicar)', () => {
    let registry = createDiscoveryRegistry()
    registry = registerDiscovery(registry, { id: 'x', priority: 10 })
    registry = registerDiscovery(registry, { id: 'x', priority: 90 })
    expect(registry).toHaveLength(1)
    expect(registry[0].priority).toBe(90)
  })
})

describe('agent plugins — prontidão e agregação (R-065)', () => {
  it('o serviço só fica pronto quando TODAS as discoveries escanearam', () => {
    const pending: PluginDiscovery[] = [
      { id: 'a', priority: 100, plugins: [plugin()] },
      { id: 'b', priority: 50, plugins: undefined },
    ]
    expect(isServiceReady(pending)).toBe(false)
    expect(aggregatePlugins(pending)).toEqual([])

    const ready: PluginDiscovery[] = [
      { id: 'a', priority: 100, plugins: [plugin()] },
      { id: 'b', priority: 50, plugins: [] },
    ]
    expect(isServiceReady(ready)).toBe(true)
    expect(aggregatePlugins(ready)).toHaveLength(1)
  })

  it('resolve colisão de identidade canônica por prioridade (maior vence) e ordena por URI', () => {
    const discoveries: PluginDiscovery[] = [
      {
        id: 'configured',
        priority: 50,
        plugins: [plugin({ uri: 'file:///z-local', canonicalId: 'acme/shared', label: 'local' })],
      },
      {
        id: 'marketplace',
        priority: 100,
        plugins: [
          plugin({ uri: 'file:///m-shared', canonicalId: 'acme/shared', label: 'market', fromMarketplace: true }),
          plugin({ uri: 'file:///a-other', canonicalId: 'acme/other', label: 'other' }),
        ],
      },
    ]
    const result = aggregatePlugins(discoveries)
    // 'acme/shared' resolvido para a versão do marketplace; sem duplicatas.
    expect(result).toHaveLength(2)
    const shared = result.find((p) => p.canonicalId === 'acme/shared')!
    expect(shared.label).toBe('market')
    // Ordenado por URI: file:///a-other < file:///m-shared.
    expect(result.map((p) => p.uri)).toEqual(['file:///a-other', 'file:///m-shared'])
  })

  it('o master switch pluginsEnabled=false esconde todos os plugins', () => {
    const discoveries: PluginDiscovery[] = [{ id: 'a', priority: 1, plugins: [plugin()] }]
    expect(aggregatePlugins(discoveries, { pluginsEnabled: false })).toEqual([])
  })
})

describe('agent plugins — enablement e projeção (R-065)', () => {
  it('enablement é store separado por identidade canônica', () => {
    let model = EMPTY_PLUGIN_ENABLEMENT
    expect(isPluginEnabled(plugin(), model)).toBe(true)
    model = togglePluginEnablement(model, 'acme/a')
    expect(isPluginEnabled(plugin(), model)).toBe(false)
    model = togglePluginEnablement(model, 'acme/a')
    expect(isPluginEnabled(plugin(), model)).toBe(true)
  })

  it('projeta conteúdos de plugins habilitados como itens de customização (fonte plugin)', () => {
    const plugins: DiscoveredPlugin[] = [
      plugin({
        canonicalId: 'acme/kit',
        uri: 'file:///kit',
        components: [
          { kind: 'command', name: 'scaffold', runnable: true },
          { kind: 'agent', name: 'triage' },
          { kind: 'mcp', name: 'jira', mcpCollection: 'shared' },
        ],
      }),
    ]
    const items = projectPluginContributions(plugins)
    expect(items).toHaveLength(3)
    expect(items.every((item) => item.source === 'plugin')).toBe(true)
    // command → prompts, agent → agents, mcp → mcp
    expect(items.map((item) => item.section).sort()).toEqual(['agents', 'mcp', 'prompts'])
    expect(items.find((item) => item.name === 'jira')!.mcpCollection).toBe('shared')
  })

  it('plugins desabilitados não contribuem itens', () => {
    const plugins: DiscoveredPlugin[] = [plugin({ canonicalId: 'acme/off' })]
    const model = togglePluginEnablement(EMPTY_PLUGIN_ENABLEMENT, 'acme/off')
    expect(projectPluginContributions(plugins, model)).toEqual([])
  })
})

