// FATIA-05 5.5 (docs/24 §4 5.5) — Views Panel: a NEW `.part.panel` that hosts views dragged out of the
// Side Bar. Lives inside `.right-section`, ABOVE the terminal (`.terminal-panel`, untouchable — docs/24 §11).
// Hidden with `display: none` while it has no views (same rule as the Side Bar, D17). Tabs are the drag handles;
// the whole part is the drop zone (drop on a tab = insert before it). Native HTML5 DnD only.
import { useCallback, useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { hasViewDrag, readViewDrag, setViewDrag } from '../dnd'
import type { ViewDescriptor, ViewId } from '../viewRegistry'
import './viewsPanel.css'

export interface ViewsPanelProps {
  readonly views: readonly ViewDescriptor[]
  readonly activeViewId: ViewId | null
  readonly onSelect: (id: ViewId) => void
  /** A view was dropped here; `index` = position among the panel tabs (end when dropped on empty space). */
  readonly onDropView: (id: ViewId, index: number) => void
  readonly renderView?: (view: ViewDescriptor) => ReactNode
}

export function ViewsPanel({ views, activeViewId, onSelect, onDropView, renderView }: ViewsPanelProps) {
  const [dropIndex, setDropIndex] = useState(-1)
  // While a view is being dragged anywhere in the window, an EMPTY panel shows itself as a slim drop strip
  // (otherwise there would be no visible target). Window-level listeners; reset on drop/dragend.
  const [dragActive, setDragActive] = useState(false)
  useEffect(() => {
    const on = (e: globalThis.DragEvent) => { if (hasViewDrag(e.dataTransfer)) setDragActive(true) }
    const off = () => { setDragActive(false); setDropIndex(-1) }
    window.addEventListener('dragstart', on)
    window.addEventListener('dragend', off)
    window.addEventListener('drop', off)
    return () => { window.removeEventListener('dragstart', on); window.removeEventListener('dragend', off); window.removeEventListener('drop', off) }
  }, [])
  const active = views.find((v) => v.id === activeViewId) ?? views[0]
  const empty = views.length === 0

  const accept = useCallback((e: DragEvent<HTMLElement>, index: number) => {
    if (!hasViewDrag(e.dataTransfer)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }, [])
  const drop = useCallback((e: DragEvent<HTMLElement>, index: number) => {
    setDropIndex(-1)
    const id = readViewDrag(e.dataTransfer)
    if (!id) return
    e.preventDefault()
    e.stopPropagation()
    onDropView(id, index)
  }, [onDropView])
  const zone = (index: number) => ({
    onDragEnter: (e: DragEvent<HTMLElement>) => accept(e, index),
    onDragOver: (e: DragEvent<HTMLElement>) => accept(e, index),
    onDragLeave: () => setDropIndex((i) => (i === index ? -1 : i)),
    onDrop: (e: DragEvent<HTMLElement>) => drop(e, index),
  })

  return (
    <div
      className={`part panel views-panel${dropIndex >= 0 ? ' drop-target' : ''}${empty ? ' empty' : ''}`}
      data-testid="views-panel"
      role="none"
      style={{ display: !empty || dragActive ? 'flex' : 'none' }}
      {...zone(views.length)}
    >
      <div className="composite-bar panel-switcher" role="tablist" aria-label="Panel views">
        {empty && <span className="panel-drop-hint" aria-hidden="true">Drop view here</span>}
        {views.map((view, index) => (
          <div
            key={view.id}
            className={`panel-tab${view.id === active?.id ? ' checked' : ''}${dropIndex === index ? ' drop-before' : ''}`}
            role="tab"
            aria-selected={view.id === active?.id}
            data-testid="views-panel-tab"
            data-view-id={view.id}
            tabIndex={view.id === active?.id ? 0 : -1}
            draggable
            onDragStart={(e) => setViewDrag(e.dataTransfer, view.id)}
            onClick={() => onSelect(view.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(view.id) } }}
            {...zone(index)}
          >
            <span className="panel-tab-label">{view.title.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div className="content">
        {views.map((view) => (
          <div key={view.id} className="views-panel-pane" data-view-pane={view.id} style={{ display: view.id === active?.id ? 'flex' : 'none' }} aria-hidden={view.id !== active?.id}>
            {renderView?.(view)}
          </div>
        ))}
      </div>
    </div>
  )
}
