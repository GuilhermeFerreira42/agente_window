// FATIA-05 5.1 c2 — Side Bar (docs/24 §4 5.1, RF-02, RF-11, D17, D22–D24).
// DOM espelha o VS Code (05_01 §2): .part.sidebar.right > .composite-title (35 px, h2 11 px
// uppercase) + .content (view panes). Sash próprio de 4 px na borda voltada ao editor.
// Recolher = display flex/none (D17): React montado, box mensurável quando visível.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { clampSideBarWidth, defaultSideBarWidth, maxSideBarWidth, SIDE_BAR_MIN_WIDTH } from '../layoutState'
import type { ViewContainerSide, ViewDescriptor, ViewId } from '../viewRegistry'
import { resolveDrag, resolveKeyboard, SIDE_BAR_SASH_SIZE } from './sash'
import { SideBarViewPane } from './SideBarViewPane'
import './sideBar.css'

export interface SideBarProps {
  readonly side: ViewContainerSide
  readonly views: readonly ViewDescriptor[]
  readonly activeViewId: ViewId
  readonly visible: boolean
  /** null → padrão min(300, largura/4) calculado sobre a largura disponível. */
  readonly width: number | null
  readonly onWidthChange: (width: number) => void
  readonly onResetWidth: () => void
  /** Snap-to-close (arrasto abaixo de 170 px). */
  readonly onClose: () => void
  readonly onToggle: () => void
  /** Conteúdo por view (c3 liga o Explorer real; Search/SCM chegam em 5.2/5.3). */
  readonly renderView?: (view: ViewDescriptor) => ReactNode
}

/** Largura da região do chassi (.main-region, inclui a Activity Bar) — é a "largura" da régua
 *  `min(300, largura/4)` (VS Code layout.ts usa a dimensão da janela). */
function regionWidthOf(el: HTMLElement | null): number {
  const parent = el?.parentElement
  return parent ? parent.getBoundingClientRect().width : 1200
}
/** Disponível para Side Bar + editor = região − Activity Bar (48) → máximo = disponível − 220 (05_01: 1012 em 1280). */
const ACTIVITY_BAR_WIDTH = 48
function availableWidthOf(el: HTMLElement | null): number { return regionWidthOf(el) - ACTIVITY_BAR_WIDTH }

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest('.xterm')
}

export function SideBar({ side, views, activeViewId, visible, width, onWidthChange, onResetWidth, onClose, onToggle, renderView }: SideBarProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [available, setAvailable] = useState<number>(1200)
  const [region, setRegion] = useState<number>(1248)
  const drag = useRef<{ startX: number; startWidth: number; pointerId: number } | null>(null)
  const active = views.find((v) => v.id === activeViewId) ?? views[0]

  // mede a largura disponível (para o padrão e para o clamp) — sem transições
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el || !el.parentElement) return
    const update = () => { setAvailable(availableWidthOf(el)); setRegion(regionWidthOf(el)) }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el.parentElement)
    return () => ro.disconnect()
  }, [])

  const effectiveWidth = width === null ? defaultSideBarWidth(region) : clampSideBarWidth(width, available)

  // Ctrl+B (View: Toggle Primary Side Bar Visibility)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'b') return
      if (e.defaultPrevented || isEditableTarget(e.target)) return
      e.preventDefault()
      onToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggle])

  const onSashPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    drag.current = { startX: e.clientX, startWidth: effectiveWidth, pointerId: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.classList.add('active')
    e.preventDefault()
  }, [effectiveWidth])

  const onSashPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const result = resolveDrag(side, d.startWidth, d.startX, e.clientX, availableWidthOf(rootRef.current))
    if (result.width === null) {
      // snap-to-close: volta à largura de ANTES do arrasto (D24 — reabrir devolve a mesma largura;
      // "largura no instante do snap" não medida — validar na homologação) e fecha
      drag.current = null
      e.currentTarget.classList.remove('active')
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      onWidthChange(d.startWidth)
      onClose()
      return
    }
    if (result.width !== effectiveWidth) onWidthChange(result.width)
  }, [side, effectiveWidth, onWidthChange, onClose])

  const onSashPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    drag.current = null
    e.currentTarget.classList.remove('active')
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }, [])

  const onSashKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    const next = resolveKeyboard(e.key, side, effectiveWidth, availableWidthOf(rootRef.current))
    if (next === null) return
    e.preventDefault()
    if (next !== effectiveWidth) onWidthChange(next)
  }, [side, effectiveWidth, onWidthChange])

  return (
    <div
      ref={rootRef}
      className={`part sidebar ${side}`}
      data-testid="side-bar"
      role="none"
      style={{ display: visible ? 'flex' : 'none', width: effectiveWidth, flexBasis: effectiveWidth }}
    >
      <div className="composite-title" data-testid="side-bar-title">
        <div className="title-label"><h2 title={active?.title}>{active?.title}</h2></div>
        <div className="title-actions" />
      </div>
      <div className="content">
        {views.map((view) => (
          <SideBarViewPane key={view.id} viewId={view.id} active={view.id === active?.id}>
            {renderView?.(view)}
          </SideBarViewPane>
        ))}
      </div>
      <div
        className={`side-bar-sash ${side}`}
        data-testid="side-bar-sash"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Primary Side Bar"
        aria-valuemin={SIDE_BAR_MIN_WIDTH}
        aria-valuemax={maxSideBarWidth(available)}
        aria-valuenow={effectiveWidth}
        tabIndex={0}
        style={{ width: SIDE_BAR_SASH_SIZE }}
        onPointerDown={onSashPointerDown}
        onPointerMove={onSashPointerMove}
        onPointerUp={onSashPointerUp}
        onPointerCancel={onSashPointerUp}
        onDoubleClick={onResetWidth}
        onKeyDown={onSashKeyDown}
      />
    </div>
  )
}
