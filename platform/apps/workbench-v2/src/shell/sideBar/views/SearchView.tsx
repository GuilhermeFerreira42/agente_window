// FATIA-05 5.2 (docs/24 §4 5.2, RF-04, RF-06) — host da view "Search" dentro da Side Bar.
// O Search REAL é o SearchPanel do módulo explorer-search (4.6), montado pelo App via
// `SearchModuleSlot` (mesmo padrão do Explorer no c3). Montado UMA vez; a troca de view
// é display flex/none, então termo e resultados sobrevivem. Nada do módulo é importado aqui.
import type { ReactNode } from 'react'

export interface SearchViewProps {
  readonly slot?: ReactNode
}

export function SearchView({ slot }: SearchViewProps) {
  return (
    <div className="side-bar-view search" data-testid="side-bar-view-search">
      {slot ?? <div className="side-bar-view-empty">Search is not available.</div>}
    </div>
  )
}
