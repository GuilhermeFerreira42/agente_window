// FATIA-05 5.1 c1 — um item da Activity Bar.
// DOM espelha o VS Code 1.135 (05_01 §1 / 04_17):
//   li.action-item[role=tab][aria-selected][aria-expanded] > a.action-label.codicon.codicon-<x>
//                                                             + .active-item-indicator (::before 2 px)
import type { KeyboardEvent } from 'react'
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
}

export function ActivityBarItem({ view, active, expanded, tabIndex, onSelect, onKeyDown }: ActivityBarItemProps) {
  const checked = active && expanded
  return (
    <li
      className={`action-item icon${checked ? ' checked' : ''}${active ? ' is-active-view' : ''}`}
      role="tab"
      data-testid="activity-bar-item"
      data-view-id={view.id}
      aria-selected={checked}
      aria-expanded={checked}
      aria-label={view.title}
      tabIndex={tabIndex}
      onClick={() => onSelect(view.id)}
      onKeyDown={onKeyDown}
    >
      <a className={`action-label codicon codicon-${view.codicon}`} role="none" aria-label={view.ariaLabel} title={view.ariaLabel} draggable={false} />
      <div className="active-item-indicator" />
    </li>
  )
}
