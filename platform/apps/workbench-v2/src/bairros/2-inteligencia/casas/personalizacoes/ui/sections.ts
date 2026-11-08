/** D182: navegação visual não antecipa serviços das fatias futuras. */
export const PERSONALIZATION_SECTIONS = [
  { id: 'visao', label: 'Visão geral', icon: 'home', available: true },
  { id: 'agentes', label: 'Agentes', icon: 'hubot', available: false },
  { id: 'habilidades', label: 'Habilidades', icon: 'lightbulb', available: true },
  { id: 'instrucoes', label: 'Instruções', icon: 'book', available: false },
  { id: 'hooks', label: 'Hooks', icon: 'zap', available: false },
  { id: 'mcp', label: 'Servidores MCP', icon: 'server', available: false },
  { id: 'plugins', label: 'Plugins', icon: 'plug', available: false },
  { id: 'ferramentas', label: 'Ferramentas', icon: 'tools', available: true },
] as const
export type PersonalizationSection = typeof PERSONALIZATION_SECTIONS[number]['id']
