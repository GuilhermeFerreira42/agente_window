// FATIA-05 5.4 (docs/24 §4 5.4, RF-10, A0.1) — Activity Bar context menu (pure, testable).
// Labels in English (new piece). Rendered by the shell's ExplorerContextMenuHost.
import { ACTIVITY_BAR_POSITIONS, isSupportedActivityBarPosition, type ActivityBarPosition } from '../layoutState'

export const ACTIVITY_BAR_MENU_ID_PREFIX = 'activityBar.move.'

export interface ActivityBarMenuItem {
  readonly id: string
  readonly label: string
  readonly enabled: boolean
  readonly checked: boolean
  readonly order: number
}

const LABELS: Record<ActivityBarPosition, string> = {
  left: 'Move Activity Bar Left',
  right: 'Move Activity Bar Right',
  top: 'Move Activity Bar Top',
  bottom: 'Move Activity Bar Bottom',
}

/** Four entries, current one checked; top/bottom disabled while deferred (D2.64). */
export function buildActivityBarMenuItems(current: ActivityBarPosition): ActivityBarMenuItem[] {
  return ACTIVITY_BAR_POSITIONS.map((p, i) => ({
    id: ACTIVITY_BAR_MENU_ID_PREFIX + p,
    label: LABELS[p],
    enabled: isSupportedActivityBarPosition(p),
    checked: p === current,
    order: i,
  }))
}

export function activityBarPositionFromMenuId(id: string): ActivityBarPosition | null {
  if (!id.startsWith(ACTIVITY_BAR_MENU_ID_PREFIX)) return null
  const p = id.slice(ACTIVITY_BAR_MENU_ID_PREFIX.length)
  return (ACTIVITY_BAR_POSITIONS as readonly string[]).includes(p) ? (p as ActivityBarPosition) : null
}
