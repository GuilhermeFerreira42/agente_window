import type { CustomizationItem, HarnessDescriptor } from './domain/aiCustomizations'

// E16 — dados mockáveis das customizações de IA. Espelham as fontes do original
// (local/user/extension/built-in/plugin) e os quatro skills built-in com ação.

export const harnesses: HarnessDescriptor[] = [
  {
    id: 'local',
    label: 'Local',
    visibleSections: ['agents', 'skills', 'instructions', 'prompts', 'hooks', 'mcp', 'tools'],
  },
  {
    id: 'copilot',
    label: 'Copilot CLI',
    visibleSections: ['agents', 'skills', 'instructions', 'prompts', 'mcp', 'tools', 'plugins'],
    excludedMcpCollections: ['local-only'],
  },
  {
    id: 'claude',
    label: 'Claude',
    visibleSections: ['agents', 'skills', 'instructions', 'prompts', 'hooks', 'mcp', 'tools'],
    hiddenSources: ['plugin'],
  },
]

export const DEFAULT_HARNESS_ID = 'local'

const uri = (section: string, name: string) => `ai-customization://${section}/${name}`

export const customizationItems: CustomizationItem[] = [
  // Agents
  { id: 'agent-planner', section: 'agents', source: 'user', name: 'Planner', description: 'Agente de planejamento multi-etapas.', uri: uri('agents', 'planner') },
  { id: 'agent-reviewer', section: 'agents', source: 'built-in', name: 'Reviewer', description: 'Agente revisor de código integrado.', uri: uri('agents', 'reviewer') },
  { id: 'agent-scout', section: 'agents', source: 'extension', name: 'Scout', description: 'Explora o workspace e resume o contexto.', uri: uri('agents', 'scout') },

  // Skills (os quatro built-in são runnable — mapeiam os SKILL.md)
  { id: 'skill-commit', section: 'skills', source: 'built-in', name: 'commit', description: 'Cria um commit com mensagem gerada seguindo o estilo do repositório.', uri: uri('skills', 'commit'), runnable: true },
  { id: 'skill-create-pr', section: 'skills', source: 'built-in', name: 'create-pr', description: 'Abre um pull request com as alterações da sessão.', uri: uri('skills', 'create-pr'), runnable: true },
  { id: 'skill-fix-ci', section: 'skills', source: 'built-in', name: 'fix-ci', description: 'Corrige as falhas de CI da sessão atual.', uri: uri('skills', 'fix-ci'), runnable: true },
  { id: 'skill-code-review', section: 'skills', source: 'built-in', name: 'code-review', description: 'Revisa os arquivos alterados e adiciona comentários inline.', uri: uri('skills', 'code-review'), runnable: true },
  { id: 'skill-changelog', section: 'skills', source: 'user', name: 'changelog', description: 'Gera entradas de changelog a partir dos commits.', uri: uri('skills', 'changelog'), runnable: true },

  // Instructions
  { id: 'inst-style', section: 'instructions', source: 'local', name: 'style-guide', description: 'Convenções de código do projeto (Dark+, tokens).', uri: uri('instructions', 'style-guide') },
  { id: 'inst-security', section: 'instructions', source: 'user', name: 'security', description: 'Diretrizes de manuseio de dados e segredos.', uri: uri('instructions', 'security') },

  // Prompts
  { id: 'prompt-refactor', section: 'prompts', source: 'user', name: 'refactor', description: 'Prompt salvo para refatorações seguras.', uri: uri('prompts', 'refactor') },
  { id: 'prompt-explain', section: 'prompts', source: 'built-in', name: 'explain', description: 'Explica o trecho selecionado.', uri: uri('prompts', 'explain') },

  // Hooks
  { id: 'hook-precommit', section: 'hooks', source: 'local', name: 'pre-commit', description: 'Executa lint e testes antes do commit.', uri: uri('hooks', 'pre-commit') },

  // MCP servers
  { id: 'mcp-github', section: 'mcp', source: 'extension', name: 'github', description: 'Servidor MCP do GitHub (PRs, issues).', uri: uri('mcp', 'github'), mcpCollection: 'shared', hostPublished: true },
  { id: 'mcp-filesystem', section: 'mcp', source: 'user', name: 'filesystem', description: 'Acesso a arquivos via MCP.', uri: uri('mcp', 'filesystem'), mcpCollection: 'local-only' },

  // Tools
  { id: 'tool-search', section: 'tools', source: 'built-in', name: 'search-workspace', description: 'Busca textual no workspace.', uri: uri('tools', 'search-workspace') },
  { id: 'tool-terminal', section: 'tools', source: 'built-in', name: 'run-terminal', description: 'Executa comandos no terminal integrado.', uri: uri('tools', 'run-terminal') },

  // Plugins
  { id: 'plugin-telemetry', section: 'plugins', source: 'plugin', name: 'telemetry-optout', description: 'Plugin de agentes que desativa telemetria.', uri: uri('plugins', 'telemetry-optout') },
]

