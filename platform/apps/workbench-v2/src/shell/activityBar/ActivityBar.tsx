// FATIA-05 5.1 c1 — Activity Bar (docs/24 §4 5.1, RF-01, RF-13, RF-14, D1, D5, D25).
// 48 px de largura, 3 ícones (viewRegistry), montada à DIREITA (prop `side` já
// existe para a 5.4). Não conhece a Side Bar: só emite `onSelect(id)`; quem decide
// "trocar view" vs "fechar" é o dono do layoutState (RF-14).
import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { hasViewDrag, readViewDrag } from '../dnd'
import type { ViewContainerSide, ViewDescriptor, ViewId } from '../viewRegistry'
import { ActivityBarItem } from './ActivityBarItem'
import './activityBar.css'

export interface ActivityBarProps {
  readonly side: ViewContainerSide
  readonly views: readonly ViewDescriptor[]
  readonly activeViewId: ViewId
  readonly sideBarVisible: boolean
  readonly onSelect: (id: ViewId) => void
  /** FATIA-05 5.3: badge numérico por view (ex.: `scm` = git.count()). 0/ausente = sem badge. */
  readonly badges?: Partial<Record<ViewId, number>>
  /** 5.4 (RF-10): botão direito em qualquer ponto da tirinha (ícone ou vazio) → o dono abre o menu "Move Activity Bar …". */
  readonly onContextMenu?: (x: number, y: number) => void
  /** 5.5 (DnD): uma view foi solta na tirinha — `index` = posição na ordem da Side Bar (antes do item alvo; fim se no vazio). */
  readonly onDropView?: (id: ViewId, index: number) => void
}

export function ActivityBar({ side, views, activeViewId, sideBarVisible, onSelect, badges, onContextMenu, onDropView }: ActivityBarProps) {
  const listRef = useRef<HTMLUListElement | null>(null)
  // 5.5: índice alvo do drop em andamento (-1 = nenhum; views.length = fim). Só feedback visual.
  const [dropIndex, setDropIndex] = useState(-1)
  const acceptDrag = useCallback((e: DragEvent<HTMLElement>, index: number) => {
    if (!onDropView || !hasViewDrag(e.dataTransfer)) return false
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
    return true
  }, [onDropView])
  const finishDrop = useCallback((e: DragEvent<HTMLElement>, index: number) => {
    setDropIndex(-1)
    const id = readViewDrag(e.dataTransfer)
    if (!id || !onDropView) return
    e.preventDefault()
    e.stopPropagation()
    onDropView(id, index)
  }, [onDropView])
  const dropPropsFor = (index: number) => ({
    onDragEnter: (e: DragEvent<HTMLElement>) => { acceptDrag(e, index) },
    onDragOver: (e: DragEvent<HTMLElement>) => { acceptDrag(e, index) },
    onDragLeave: () => setDropIndex((i) => (i === index ? -1 : i)),
    onDrop: (e: DragEvent<HTMLElement>) => finishDrop(e, index),
  })
  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!onContextMenu) return
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(e.clientX, e.clientY)
  }, [onContextMenu])

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
    <div
      className={`part activitybar ${side} bordered${dropIndex >= 0 ? ' drop-target' : ''}`}
      data-testid="activity-bar"
      role="none"
      onContextMenu={handleContextMenu}
      {...dropPropsFor(views.length)}
    >
      <div className="content">
        <div className="composite-bar">
          <div className="monaco-action-bar vertical">
            <ul ref={listRef} className="actions-container" role="tablist" aria-label="Active View Switcher">
              {views.map((view, index) => (
                <ActivityBarItem
                  key={view.id}
                  view={view}
                  active={view.id === activeViewId}
                  expanded={sideBarVisible}
                  tabIndex={view.id === activeViewId ? 0 : -1}
                  badge={badges?.[view.id] ?? 0}
                  onSelect={onSelect}
                  onKeyDown={handleKeyDown}
                  dropProps={onDropView ? dropPropsFor(index) : undefined}
                  dropBefore={dropIndex === index}
                  draggable={!!onDropView}
                />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
