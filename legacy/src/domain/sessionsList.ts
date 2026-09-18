import type { Session, SessionSection } from '../types'

/**
 * Advanced Sessions List model (E6), mirroring SESSIONS_LIST.md. Pure functions
 * over the session collection: placement precedence, grouping, sorting, and
 * composite filtering. The React component renders whatever these return.
 */

export type SortMode = 'manual' | 'created' | 'updated'

export interface SessionFilters {
  /** Free-text query, matched against title, workspace, branch and chat titles. */
  query: string
  /** Only these statuses (empty = all). */
  statuses: readonly Session['status'][]
  /** Only these providers (empty = all). */
  providers: readonly string[]
  /** 'all' | 'unread' | 'read'. */
  readState: 'all' | 'unread' | 'read'
  /** Whether archived sessions are included. */
  includeArchived: boolean
}

export const EMPTY_FILTERS: SessionFilters = {
  query: '',
  statuses: [],
  providers: [],
  readState: 'all',
  includeArchived: true,
}

/** A resolved section of the list: a fixed kind, or a user custom group. */
export type PrimarySection =
  | { kind: 'pinned' }
  | { kind: 'custom'; id: string }
  | { kind: 'quickChats' }
  | { kind: 'date'; section: SessionSection }
  | { kind: 'archived' }

export interface SessionGroup {
  id: string
  label: string
  section: PrimarySection
  sessions: Session[]
}

const DATE_LABELS: Record<SessionSection, string> = {
  pinned: 'Fixadas',
  today: 'Hoje',
  yesterday: 'Ontem',
  lastWeek: 'Semana passada',
  older: 'Mais antigos',
  archived: 'Arquivadas',
}

const DATE_ORDER: SessionSection[] = ['today', 'yesterday', 'lastWeek', 'older']

/** The provider identity of a session, defaulting to 'local'. */
export function sessionProvider(session: Session): string {
  return session.provider ?? 'local'
}

/**
 * Placement precedence (SESSIONS_LIST.md): Archived > Pinned > Custom group >
 * Quick chat > Workspace/date group. Returns the single section a session
 * belongs to. Archived always wins; archiving conceptually drops custom-group
 * membership, so an archived session never lands in a custom group here.
 */
export function placeSession(session: Session): PrimarySection {
  if (session.archived || session.section === 'archived') return { kind: 'archived' }
  if (session.pinned) return { kind: 'pinned' }
  if (session.customGroup) return { kind: 'custom', id: session.customGroup }
  if (session.isQuickChat) return { kind: 'quickChats' }
  return { kind: 'date', section: session.section }
}

/** Composite filter (SESSIONS_LIST.md §Sorting and filtering). */
export function sessionMatchesFilters(session: Session, filters: SessionFilters): boolean {
  const q = filters.query.trim().toLocaleLowerCase()
  if (q) {
    const haystack = [session.title, session.workspace, session.branch, ...session.chats.map((c) => c.title)]
      .join(' ')
      .toLocaleLowerCase()
    if (!haystack.includes(q)) return false
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(session.status)) return false
  if (filters.providers.length > 0 && !filters.providers.includes(sessionProvider(session))) return false
  if (filters.readState === 'unread' && !session.unread) return false
  if (filters.readState === 'read' && session.unread) return false
  if (!filters.includeArchived && (session.archived || session.section === 'archived')) return false
  return true
}

function compareForSort(a: Session, b: Session, mode: SortMode): number {
  if (mode === 'created') return (b.createdSeq ?? 0) - (a.createdSeq ?? 0)
  if (mode === 'updated') return (b.updatedSeq ?? 0) - (a.updatedSeq ?? 0)
  return 0 // manual: preserve incoming (list-owned) order
}

/**
 * Builds the ordered, grouped, filtered Sessions List.
 *
 * - Excludes automation runs from the primary list.
 * - Keeps the active session visible even when a filter would exclude it.
 * - Applies placement precedence, then orders groups: Pinned, Custom groups,
 *   Quick Chats, date sections, Archived last.
 * - Sorts sessions within each group by the selected sort mode.
 * - `activeCustomGroups` names the known custom groups (id → label) so empty
 *   ones can still be omitted while labels stay stable.
 */
export function buildSessionsList(
  sessions: readonly Session[],
  filters: SessionFilters,
  sortMode: SortMode,
  activeSessionId: string | undefined,
  customGroupLabels: Readonly<Record<string, string>> = {},
  orderCustomIds?: (presentIds: string[], labelOf: (id: string) => string) => string[],
): SessionGroup[] {
  const primary = sessions.filter((session) => !session.automation)
  const visible = primary.filter(
    (session) => session.id === activeSessionId || sessionMatchesFilters(session, filters),
  )

  const pinned: Session[] = []
  const quickChats: Session[] = []
  const archived: Session[] = []
  const custom = new Map<string, Session[]>()
  const dates = new Map<SessionSection, Session[]>()

  for (const session of visible) {
    const place = placeSession(session)
    switch (place.kind) {
      case 'pinned':
        pinned.push(session)
        break
      case 'archived':
        archived.push(session)
        break
      case 'quickChats':
        quickChats.push(session)
        break
      case 'custom': {
        const bucket = custom.get(place.id) ?? []
        bucket.push(session)
        custom.set(place.id, bucket)
        break
      }
      case 'date': {
        const bucket = dates.get(place.section) ?? []
        bucket.push(session)
        dates.set(place.section, bucket)
        break
      }
    }
  }

  const sortBucket = (list: Session[]) => list.slice().sort((a, b) => compareForSort(a, b, sortMode))
  const groups: SessionGroup[] = []

  if (pinned.length > 0) {
    groups.push({ id: 'pinned', label: DATE_LABELS.pinned, section: { kind: 'pinned' }, sessions: sortBucket(pinned) })
  }

  // Custom groups form a contiguous user-managed block. The order is owned by
  // ISessionSectionOrderService (R-013) when provided; otherwise it falls back
  // to alphabetical by label.
  const labelOf = (id: string) => customGroupLabels[id] ?? id
  const presentCustomIds = Array.from(custom.keys())
  const customIds = orderCustomIds
    ? orderCustomIds(presentCustomIds, labelOf)
    : presentCustomIds.sort((a, b) => labelOf(a).localeCompare(labelOf(b)))
  for (const id of customIds) {
    groups.push({
      id: `custom:${id}`,
      label: customGroupLabels[id] ?? id,
      section: { kind: 'custom', id },
      sessions: sortBucket(custom.get(id)!),
    })
  }

  if (quickChats.length > 0) {
    groups.push({ id: 'quickChats', label: 'Quick Chats', section: { kind: 'quickChats' }, sessions: sortBucket(quickChats) })
  }

  for (const section of DATE_ORDER) {
    const bucket = dates.get(section)
    if (bucket && bucket.length > 0) {
      groups.push({ id: section, label: DATE_LABELS[section], section: { kind: 'date', section }, sessions: sortBucket(bucket) })
    }
  }

  if (archived.length > 0) {
    groups.push({ id: 'archived', label: DATE_LABELS.archived, section: { kind: 'archived' }, sessions: sortBucket(archived) })
  }

  return groups
}

/**
 * Workspace capping (SESSIONS_LIST.md §Workspace grouping): while not searching,
 * only the first `cap` workspaces are shown; the active session's workspace is
 * always promoted. A search bypasses capping entirely.
 */
export function applyWorkspaceCapping(
  workspaces: readonly string[],
  cap: number,
  searching: boolean,
  activeWorkspace: string | undefined,
): { visible: string[]; hiddenCount: number } {
  if (searching || workspaces.length <= cap) return { visible: [...workspaces], hiddenCount: 0 }
  const visible = workspaces.slice(0, cap)
  if (activeWorkspace && !visible.includes(activeWorkspace) && workspaces.includes(activeWorkspace)) {
    visible[visible.length - 1] = activeWorkspace
  }
  return { visible, hiddenCount: workspaces.length - visible.length }
}

