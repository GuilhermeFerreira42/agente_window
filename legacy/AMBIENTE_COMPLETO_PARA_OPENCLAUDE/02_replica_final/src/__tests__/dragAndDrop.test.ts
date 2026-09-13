import { describe, expect, it } from 'vitest'
import {
  DragTypes,
  canReorderSessions,
  reorderById,
  reorderEditorTabs,
  reorderSessions,
  sessionGroupKey,
} from '../domain/dragAndDrop'
import type { EditorTab, Session } from '../types'

function makeSession(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    title: id,
    workspace: 'ws',
    workspacePath: '/ws',
    section: 'today',
    status: 'completed',
    updated: '1m',
    diffAdded: 0,
    diffRemoved: 0,
    branch: 'main',
    chats: [],
    mainChatId: `${id}-main`,
    ...overrides,
  }
}

describe('reorderById', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('moves an item into the target slot', () => {
    expect(reorderById(items, 'a', 'c').map((item) => item.id)).toEqual(['b', 'c', 'a'])
    expect(reorderById(items, 'c', 'a').map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })

  it('returns the same reference for a no-op or unknown id', () => {
    expect(reorderById(items, 'a', 'a')).toBe(items)
    expect(reorderById(items, 'a', 'z')).toBe(items)
  })
})

describe('session reorder gating', () => {
  it('allows reordering within the same visible section', () => {
    const from = makeSession('a', { section: 'today' })
    const to = makeSession('b', { section: 'today' })
    expect(canReorderSessions(from, to)).toBe(true)
  })

  it('treats the pinned band as a single group regardless of section', () => {
    const from = makeSession('a', { section: 'today', pinned: true })
    const to = makeSession('b', { section: 'yesterday', pinned: true })
    expect(sessionGroupKey(from)).toBe('pinned')
    expect(canReorderSessions(from, to)).toBe(true)
  })

  it('forbids crossing sections and archived/fixed targets', () => {
    expect(canReorderSessions(makeSession('a', { section: 'today' }), makeSession('b', { section: 'yesterday' }))).toBe(false)
    expect(canReorderSessions(makeSession('a'), makeSession('b', { archived: true }))).toBe(false)
    expect(canReorderSessions(makeSession('a', { section: 'archived' }), makeSession('b', { section: 'archived' }))).toBe(false)
  })

  it('reorderSessions is a no-op across groups but reorders within one', () => {
    const sessions = [
      makeSession('a', { section: 'today' }),
      makeSession('b', { section: 'today' }),
      makeSession('c', { section: 'yesterday' }),
    ]
    expect(reorderSessions(sessions, 'a', 'c')).toBe(sessions)
    expect(reorderSessions(sessions, 'a', 'b').map((session) => session.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('editor tab reorder', () => {
  const tabs: EditorTab[] = [
    { id: 't1', type: 'browser', title: 'Browser', sessionId: 's1' },
    { id: 't2', type: 'diff', title: 'Changes', sessionId: 's1' },
    { id: 't3', type: 'file', title: 'File', sessionId: 's2' },
  ]

  it('reorders tabs within the same session', () => {
    expect(reorderEditorTabs(tabs, 't1', 't2').map((tab) => tab.id)).toEqual(['t2', 't1', 't3'])
  })

  it('refuses to reorder tabs across sessions', () => {
    expect(reorderEditorTabs(tabs, 't1', 't3')).toBe(tabs)
  })
})

describe('drag mime identifiers', () => {
  it('are stable strings mirroring the original', () => {
    expect(DragTypes.SESSION).toBe('application/vnd.code.session')
    expect(DragTypes.EDITOR_TAB).toBe('application/vnd.code.session.tab')
    expect(DragTypes.FILE).toBe('application/vnd.code.session.file')
  })
})

