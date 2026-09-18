// R-065 — dados mock de discoveries de agent plugins.
//
// Duas discoveries prontas: uma de marketplace (prioridade alta) e uma
// configurada localmente (prioridade menor). O plugin "team-toolkit" existe nas
// duas fontes com a MESMA identidade canônica → a de marketplace vence (colisão
// resolvida por prioridade), demonstrando a contribuição dinâmica.

import type { PluginDiscovery } from './domain/agentPlugins'

export const marketplaceDiscovery: PluginDiscovery = {
  id: 'marketplace',
  priority: 100,
  plugins: [
    {
      uri: 'file:///plugins/marketplace/team-toolkit',
      label: 'Team Toolkit',
      format: 'agent-v1',
      canonicalId: 'acme/team-toolkit',
      fromMarketplace: true,
      components: [
        { kind: 'command', name: 'scaffold-component', description: 'Cria um componente com testes e estilos.', runnable: true },
        { kind: 'skill', name: 'release-notes', description: 'Gera notas de release a partir dos commits.', runnable: true },
        { kind: 'agent', name: 'triage-bot', description: 'Triagem automática de issues.' },
        { kind: 'mcp', name: 'jira', description: 'Servidor MCP do Jira (tickets).', mcpCollection: 'shared' },
      ],
    },
    {
      uri: 'file:///plugins/marketplace/security-pack',
      label: 'Security Pack',
      format: 'copilot',
      canonicalId: 'acme/security-pack',
      fromMarketplace: true,
      components: [
        { kind: 'hook', name: 'secret-scan', description: 'Bloqueia commits com segredos.' },
        { kind: 'skill', name: 'audit-deps', description: 'Audita dependências vulneráveis.', runnable: true },
      ],
    },
  ],
}

export const configuredDiscovery: PluginDiscovery = {
  id: 'configured',
  priority: 50,
  plugins: [
    {
      // Mesma identidade canônica do team-toolkit do marketplace → colide e
      // perde para a fonte de maior prioridade.
      uri: 'file:///home/user/.plugins/team-toolkit',
      label: 'Team Toolkit (local)',
      format: 'open-plugin',
      canonicalId: 'acme/team-toolkit',
      components: [
        { kind: 'command', name: 'scaffold-component', description: 'Versão local (deveria perder para o marketplace).', runnable: true },
      ],
    },
    {
      uri: 'file:///home/user/.plugins/docs-helper',
      label: 'Docs Helper',
      format: 'claude',
      canonicalId: 'local/docs-helper',
      components: [
        { kind: 'command', name: 'write-docs', description: 'Gera documentação a partir do código.', runnable: true },
        { kind: 'agent', name: 'doc-reviewer', description: 'Revisa a documentação do PR.' },
      ],
    },
  ],
}

export const initialPluginDiscoveries: PluginDiscovery[] = [marketplaceDiscovery, configuredDiscovery]

