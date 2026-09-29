// FATIA-05 5.1 c2 — sash da Side Bar (D22: 4 px; D23: min 170 / máx largura − 220 / snap-to-close).
// Lógica pura (testável) + handlers de ponteiro. Sem `transform`: a largura muda no
// próprio frame do pointermove (a régua não tem transição — RF-11).
import { clampSideBarWidth, SIDE_BAR_MIN_WIDTH } from '../layoutState'
import type { ViewContainerSide } from '../viewRegistry'

export const SIDE_BAR_SASH_SIZE = 4
/** Passo do teclado (←/→) em px. "não medido — validar na homologação". */
export const SASH_KEYBOARD_STEP = 10

export interface SashDragResult {
  /** Largura válida (já clampada) ou `null` quando o arrasto passou do mínimo → snap-to-close. */
  readonly width: number | null
}

/** Largura bruta pedida pelo ponteiro: Side Bar à direita cresce quando o ponteiro vai para a ESQUERDA. */
export function requestedWidth(side: ViewContainerSide, startWidth: number, startX: number, clientX: number): number {
  const delta = clientX - startX
  return side === 'right' ? startWidth - delta : startWidth + delta
}

export function resolveDrag(side: ViewContainerSide, startWidth: number, startX: number, clientX: number, availableWidth: number): SashDragResult {
  const raw = requestedWidth(side, startWidth, startX, clientX)
  if (raw < SIDE_BAR_MIN_WIDTH) return { width: null }
  return { width: clampSideBarWidth(raw, availableWidth) }
}

export function resolveKeyboard(key: string, side: ViewContainerSide, width: number, availableWidth: number): number | null {
  let delta = 0
  if (key === 'ArrowLeft') delta = side === 'right' ? SASH_KEYBOARD_STEP : -SASH_KEYBOARD_STEP
  else if (key === 'ArrowRight') delta = side === 'right' ? -SASH_KEYBOARD_STEP : SASH_KEYBOARD_STEP
  else return null
  return clampSideBarWidth(width + delta, availableWidth)
}
