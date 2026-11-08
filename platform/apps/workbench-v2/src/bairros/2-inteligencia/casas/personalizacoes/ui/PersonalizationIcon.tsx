import { BookOpen, Bot, Home, Lightbulb, Plug, Server, Wrench, Zap } from 'lucide-react'
import type { PersonalizationSection } from './sections'

const icons = { visao: Home, agentes: Bot, habilidades: Lightbulb, instrucoes: BookOpen, hooks: Zap, mcp: Server, plugins: Plug, ferramentas: Wrench }
export function PersonalizationIcon({ section }: { section: PersonalizationSection }) {
  const Icon = icons[section]
  return <Icon size={14} aria-hidden="true" />
}
