// FATIA-05 5.1 c1 — Activity Bar (docs/24 §4 5.1, RF-01, RF-13, RF-14, D1, D5, D25).
// 48 px de largura, 3 ícones (viewRegistry), montada à DIREITA (prop `side` já
// existe para a 5.4). Não conhece a Side Bar: só emite `onSelect(id)`; quem decide
// "trocar view" vs "fechar" é o dono do layoutState (RF-14).
import { useCallback, useRef, type KeyboardEvent } from 'react'
import type { ViewContainerSide, ViewDescriptor, ViewId } from '../viewRegistry'
import { ActivityBarItem } from './ActivityBarItem'
import './activityBar.css'

export interface ActivityBarProps {
  readonly side: ViewContainerSide
  readonly views: readonly ViewDescriptor[]
  readonly activeViewId: ViewId
  readonly sideBarVisible: boolean
  readonly onSelect: (id: ViewId) => void
}

export function ActivityBar({ side, views, activeViewId, sideBarVisible, onSelect }: ActivityBarProps) {
  const listRef = useRef<HTMLUListElement | null>(null)

  // Navegação por teclado como no VS Code (ActionBar vertical): ↑/↓ movem o foco, Home/End, Enter/Espaço ativam.
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLLIElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLLIElement>('li[role="tab"]') ?? [])
    const index = items.indexOf(e.currentTarget)
    if (index < 0) return
    let next = -1
    if (e.key === 'ArrowDown') next = (index + 1) % items.length
    else if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const id = e.currentTarget.dataset.viewId as ViewId | undefined
      if (id) onSelect(id)
      return
    }
    if (next >= 0) { e.preventDefault(); items[next]?.focus() }
  }, [onSelect])

  return (
    <div className={`part activitybar ${side} bordered`} data-testid="activity-bar" role="none">
      <div className="content">
        <div className="composite-bar">
          <div className="monaco-action-bar vertical">
            <ul ref={listRef} className="actions-container" role="tablist" aria-label="Active View Switcher">
              {views.map((view) => (
                <ActivityBarItem
                  key={view.id}
                  view={view}
                  active={view.id === activeViewId}
                  expanded={sideBarVisible}
                  tabIndex={view.id === activeViewId ? 0 : -1}
                  onSelect={onSelect}
                  onKeyDown={handleKeyDown}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
