// FATIA-05 5.1 c1 — um item da Activity Bar.
// DOM espelha o VS Code 1.135 (05_01 §1 / 04_17):
//   li.action-item[role=tab][aria-selected][aria-expanded] > a.action-label.codicon.codicon-<x>
//                                                             + .active-item-indicator (::before 2 px)
import type { DragEvent, HTMLAttributes, KeyboardEvent } from 'react'
import { setViewDrag } from '../dnd'
import type { ViewDescriptor } from '../viewRegistry'

export interface ActivityBarItemProps {
  readonly view: ViewDescriptor
  /** View ativa do container (D25: o indicador fica nela mesmo com a Side Bar fechada). */
  readonly active: boolean
  /** Side Bar aberta nessa view → aria-selected/aria-expanded = true e classe `checked`. */
  readonly expanded: boolean
  readonly tabIndex: 0 | -1
  readonly onSelect: (id: ViewDescriptor['id']) => void
  readonly onKeyDown: (e: KeyboardEvent<HTMLLIElement>) => void
  /** 5.3: contagem do badge (VS Code: `.badge > .badge-content`, 16 px, raio 20 — regra medida 05_02). 0 = não renderiza. */
  readonly badge?: number
  /** 5.5 (DnD): handlers de drop zone do dono (dragover/drop) e indicador "inserir antes". */
  readonly dropProps?: Pick<HTMLAttributes<HTMLLIElement>, 'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'>
  readonly dropBefore?: boolean
  /** 5.5 (DnD): o ícone é a alça de arrasto da view (VS Code reordena arrastando o ícone). */
  readonly draggable?: boolean
}

export function ActivityBarItem({ view, active, expanded, tabIndex, onSelect, onKeyDown, badge = 0, dropProps, dropBefore = false, draggable = false }: ActivityBarItemProps) {
  const onDragStart = (e: DragEvent<HTMLLIElement>) => { setViewDrag(e.dataTransfer, view.id) }
  const checked = active && expanded
  return (
    <li
      className={`action-item icon${checked ? ' checked' : ''}${active ? ' is-active-view' : ''}${dropBefore ? ' drop-before' : ''}`}
      role="tab"
      data-testid="activity-bar-item"
      data-view-id={view.id}
      aria-selected={checked}
      aria-expanded={checked}
      aria-label={badge > 0 ? `${view.title} (${badge})` : view.title}
      tabIndex={tabIndex}
      onClick={() => onSelect(view.id)}
      onKeyDown={onKeyDown}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      {...dropProps}
    >
      <a className={`action-label codicon codicon-${view.codicon}`} role="none" aria-label={view.ariaLabel} title={view.ariaLabel} draggable={false} />
      {badge > 0 && (
        <div className="badge" aria-hidden="true">
          <div className="badge-content" data-count={badge}>{badge > 99 ? '99+' : badge}</div>
        </div>
      )}
      <div className="active-item-indicator" />
    </li>
  )
}
