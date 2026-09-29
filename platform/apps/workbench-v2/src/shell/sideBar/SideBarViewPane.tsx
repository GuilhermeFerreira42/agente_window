// FATIA-05 5.1 c2 — painel de UMA view dentro da Side Bar. Nunca desmonta: a troca
// de view é `display: flex/none` (D17) para o React/módulo hospedado sobreviver.
import type { ReactNode } from 'react'
import type { ViewId } from '../viewRegistry'

export interface SideBarViewPaneProps {
  readonly viewId: ViewId
  readonly active: boolean
  readonly children?: ReactNode
}

export function SideBarViewPane({ viewId, active, children }: SideBarViewPaneProps) {
  return (
    <div className="side-bar-view-pane" data-view-pane={viewId} style={{ display: active ? 'flex' : 'none' }} aria-hidden={!active}>
      {children}
    </div>
  )
}
