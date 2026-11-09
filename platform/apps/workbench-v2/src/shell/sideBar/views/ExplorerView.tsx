// FATIA-05 5.1 c3 (docs/24 §4 5.1, RF-03, RF-08) — host da view "Explorer" dentro da Side Bar.
// O Explorer REAL é o módulo explorer-search (4.4): o shell só oferece o ponto de montagem
// (`slot`), montado UMA vez. Outline/Timeline já são panes do próprio viewlet do módulo
// (colapsadas e vazias por padrão — dados reais na 5.6). Nada do módulo é importado aqui.
import type { ReactNode } from 'react'

export interface ExplorerViewProps {
  /** Slot do módulo (ExplorerModuleSlot do App). Ausente = módulo ainda não subiu. */
  readonly slot?: ReactNode
  readonly onOpenFolder?: () => void
}

export function ExplorerView({ slot, onOpenFolder }: ExplorerViewProps) {
  return (
    <div className="side-bar-view explorer" data-testid="side-bar-view-explorer">
      {slot ?? <div className="side-bar-view-empty">
        <p>Nenhuma pasta aberta.</p>
        {onOpenFolder && <button type="button" className="side-bar-open-folder" onClick={onOpenFolder}>Abrir pasta</button>}
      </div>}
    </div>
  )
}
