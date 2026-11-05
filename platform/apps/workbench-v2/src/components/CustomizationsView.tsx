import { useMemo, useState } from 'react'
import {
  Blocks,
  Bot,
  ChevronDown,
  ChevronRight,
  FileText,
  Play,
  Plug,
  Puzzle,
  ScrollText,
  Search,
  Server,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Wrench,
} from 'lucide-react'
import {
  buildManagementModel,
  type CustomizationSection,
  type HarnessDescriptor,
  type EnablementState,
  type CustomizationItem,
  type ProjectedItem,
} from '../domain/aiCustomizations'

// E16 — superfície de AI Customizations: árvore/overview com seleção de harness,
// seções agrupadas por fonte, contagens (== linhas), enablement de built-ins e
// ação de executar skills. Estado mockável, interações com efeito real.

const SECTION_ICON: Record<CustomizationSection, JSX.Element> = {
  agents: <Bot size={13} />,
  skills: <Sparkles size={13} />,
  instructions: <ScrollText size={13} />,
  prompts: <FileText size={13} />,
  hooks: <Plug size={13} />,
  mcp: <Server size={13} />,
  tools: <Wrench size={13} />,
  plugins: <Puzzle size={13} />,
}

interface CustomizationsViewProps {
  items: readonly CustomizationItem[]
  harnesses: readonly HarnessDescriptor[]
  harnessId: string
  enablement: EnablementState
  onChangeHarness: (id: string) => void
  onToggleEnablement: (item: ProjectedItem) => void
  onRunSkill: (item: ProjectedItem) => void
  onRevealItem: (item: ProjectedItem) => void
  /** true quando renderizada dentro do Custom View Grid (o grid já dá o título). */
  embedded?: boolean
}

export function CustomizationsView({
  items,
  harnesses,
  harnessId,
  enablement,
  onChangeHarness,
  onToggleEnablement,
  onRunSkill,
  onRevealItem,
  embedded = false,
}: CustomizationsViewProps) {
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Partial<Record<CustomizationSection, boolean>>>({})

  const harness = useMemo(
    () => harnesses.find((h) => h.id === harnessId) ?? harnesses[0],
    [harnesses, harnessId],
  )
  const model = useMemo(
    () => buildManagementModel(items, harness, enablement, { query }),
    [items, harness, enablement, query],
  )

  return (
    <section className="customizations-view" aria-label="Personalizações de IA">
      <header className="customizations-header">
        <div className="customizations-title">
          <Blocks size={15} />
          {/* Dentro do Custom View Grid o título já vem do cabeçalho do grid;
              repetir criaria dois headings com o mesmo nome acessível. */}
          {!embedded && <h2>AI Customizations</h2>}
          <span className="customizations-total" aria-label={`${model.totalCount} itens no total`}>{model.totalCount}</span>
        </div>
        <label className="customizations-harness" htmlFor="customizations-harness-select">
          <span>Harness</span>
          <select
            id="customizations-harness-select"
            aria-label="Selecionar harness"
            value={harness.id}
            onChange={(event) => onChangeHarness(event.target.value)}
          >
            {harnesses.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
      </header>

      <label className="customizations-filter" htmlFor="customizations-filter-input">
        <Search size={12} />
        <input
          id="customizations-filter-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filtrar personalizações"
        />
      </label>

      <div className="customizations-tree" role="tree" aria-label="Árvore de personalizações">
        {model.sections.map((section) => {
          const isCollapsed = collapsed[section.section] ?? false
          const contentId = `customizations-section-${section.section}`
          return (
            <div className="customizations-section" key={section.section} role="treeitem" aria-expanded={!isCollapsed}>
              <button
                type="button"
                className="customizations-section-header"
                aria-expanded={!isCollapsed}
                aria-controls={contentId}
                onClick={() => setCollapsed((current) => ({ ...current, [section.section]: !isCollapsed }))}
              >
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                {SECTION_ICON[section.section]}
                <span className="customizations-section-label">{section.label}</span>
                <span className="customizations-section-count">{section.count}</span>
              </button>
              {!isCollapsed && (
                <div className="customizations-section-body" id={contentId} role="group">
                  {section.count === 0 && <p className="customizations-empty">Nenhum item nesta seção.</p>}
                  {section.sources.map((group) => (
                    <div className="customizations-source-group" key={group.source}>
                      <div className="customizations-source-label">{group.label}</div>
                      {group.items.map((item) => (
                        <div
                          className={`customizations-item${item.enabled ? '' : ' is-disabled'}`}
                          key={item.id}
                          role="treeitem"
                        >
                          <button
                            type="button"
                            className="customizations-item-main"
                            onClick={() => onRevealItem(item)}
                            title={item.uri}
                          >
                            <span className="customizations-item-name">{item.name}</span>
                            <span className="customizations-item-desc">{item.description}</span>
                          </button>
                          <div className="customizations-item-actions">
                            {item.runnable && (
                              <button
                                type="button"
                                className="customizations-item-run"
                                aria-label={`Executar skill ${item.name}`}
                                title={`Executar skill ${item.name}`}
                                onClick={() => onRunSkill(item)}
                              >
                                <Play size={12} />
                              </button>
                            )}
                            {item.canToggleEnablement && (
                              <button
                                type="button"
                                className="customizations-item-toggle"
                                aria-label={`${item.enabled ? 'Desabilitar' : 'Habilitar'} ${item.name}`}
                                aria-pressed={item.enabled}
                                title={item.enabled ? 'Desabilitar' : 'Habilitar'}
                                onClick={() => onToggleEnablement(item)}
                              >
                                {item.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {model.sections.length === 0 && (
          <div className="customizations-empty-state">
            <Blocks size={22} />
            <p>Nenhuma personalização corresponde ao filtro.</p>
          </div>
        )}
      </div>
    </section>
  )
}

