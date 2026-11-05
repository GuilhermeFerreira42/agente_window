import { describe, expect, it } from 'vitest'
import {
  EMPTY_FILTERS,
  applyWorkspaceCapping,
  buildSessionsList,
  placeSession,
  sessionMatchesFilters,
  type SessionFilters,
} from '../domain/sessionsList'
import type { Session } from '../types'

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

describe('placement precedence', () => {
  it('resolves archived > pinned > custom > quick chat > date', () => {
    expect(placeSession(makeSession('a', { archived: true, pinned: true, customGroup: 'g' })).kind).toBe('archived')
    expect(placeSession(makeSession('b', { pinned: true, customGroup: 'g', isQuickChat: true })).kind).toBe('pinned')
    expect(placeSession(makeSession('c', { customGroup: 'g', isQuickChat: true })).kind).toBe('custom')
    expect(placeSession(makeSession('d', { isQuickChat: true })).kind).toBe('quickChats')
    expect(placeSession(makeSession('e', { section: 'yesterday' })).kind).toBe('date')
  })
})

describe('composite filters', () => {
  const base = makeSession('x', { title: 'Refatorar layout', workspace: 'vscode', branch: 'feat', provider: 'openai', unread: true })

  it('matches by query across title/workspace/branch', () => {
    expect(sessionMatchesFilters(base, { ...EMPTY_FILTERS, query: 'vscode' })).toBe(true)
    expect(sessionMatchesFilters(base, { ...EMPTY_FILTERS, query: 'zzz' })).toBe(false)
  })

  it('composes status, provider and read-state filters', () => {
    const f: SessionFilters = { ...EMPTY_FILTERS, statuses: ['completed'], providers: ['openai'], readState: 'unread' }
    expect(sessionMatchesFilters(base, f)).toBe(true)
    expect(sessionMatchesFilters(base, { ...f, statuses: ['working'] })).toBe(false)
    expect(sessionMatchesFilters(base, { ...f, providers: ['anthropic'] })).toBe(false)
    expect(sessionMatchesFilters(base, { ...f, readState: 'read' })).toBe(false)
  })

  it('excludes archived when includeArchived is false', () => {
    const arch = makeSession('y', { archived: true })
    expect(sessionMatchesFilters(arch, { ...EMPTY_FILTERS, includeArchived: false })).toBe(false)
    expect(sessionMatchesFilters(arch, { ...EMPTY_FILTERS, includeArchived: true })).toBe(true)
  })
})

describe('buildSessionsList', () => {
  const sessions: Session[] = [
    makeSession('pin', { title: 'Fixada', pinned: true }),
    makeSession('grp', { title: 'Agrupada', customGroup: 'sprint' }),
    makeSession('qc', { title: 'Quick', isQuickChat: true }),
    makeSession('today', { title: 'Hoje', section: 'today' }),
    makeSession('old', { title: 'Antiga', section: 'older' }),
    makeSession('arch', { title: 'Arquivada', archived: true, section: 'archived' }),
    makeSession('auto', { title: 'Automation', automation: true }),
  ]

  it('orders groups Pinned → Custom → Quick Chats → dates → Archived, excluding automation', () => {
    const groups = buildSessionsList(sessions, EMPTY_FILTERS, 'manual', undefined, { sprint: 'Sprint' })
    expect(groups.map((g) => g.id)).toEqual(['pinned', 'custom:sprint', 'quickChats', 'today', 'older', 'archived'])
    // Automation não aparece em nenhum grupo.
    const allIds = groups.flatMap((g) => g.sessions.map((s) => s.id))
    expect(allIds).not.toContain('auto')
    // Rótulo do grupo custom vem do mapa de rótulos.
    expect(groups.find((g) => g.id === 'custom:sprint')?.label).toBe('Sprint')
  })

  it('keeps the active session visible even when filtered out', () => {
    const filters: SessionFilters = { ...EMPTY_FILTERS, query: 'inexistente' }
    const groups = buildSessionsList(sessions, filters, 'manual', 'today', {})
    const ids = groups.flatMap((g) => g.sessions.map((s) => s.id))
    expect(ids).toEqual(['today'])
  })

  it('sorts within a group by created/updated sequence', () => {
    const list = [
      makeSession('a', { section: 'today', createdSeq: 1, updatedSeq: 3 }),
      makeSession('b', { section: 'today', createdSeq: 2, updatedSeq: 1 }),
      makeSession('c', { section: 'today', createdSeq: 3, updatedSeq: 2 }),
    ]
    const created = buildSessionsList(list, EMPTY_FILTERS, 'created', undefined, {})
    expect(created[0].sessions.map((s) => s.id)).toEqual(['c', 'b', 'a'])
    const updated = buildSessionsList(list, EMPTY_FILTERS, 'updated', undefined, {})
    expect(updated[0].sessions.map((s) => s.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('workspace capping', () => {
  const workspaces = ['w1', 'w2', 'w3', 'w4']

  it('caps inactive workspaces while not searching', () => {
    const { visible, hiddenCount } = applyWorkspaceCapping(workspaces, 2, false, undefined)
    expect(visible).toEqual(['w1', 'w2'])
    expect(hiddenCount).toBe(2)
  })

  it('promotes the active workspace into the visible set', () => {
    const { visible } = applyWorkspaceCapping(workspaces, 2, false, 'w4')
    expect(visible).toContain('w4')
    expect(visible.length).toBe(2)
  })

  it('bypasses capping while searching', () => {
    const { visible, hiddenCount } = applyWorkspaceCapping(workspaces, 2, true, undefined)
    expect(visible).toEqual(workspaces)
    expect(hiddenCount).toBe(0)
  })
})

// R-084 — cenário composto: custom groups + quick chats + seções de data
// (incl. lastWeek) + ordenação + filtros + exclusão de automation.
describe('R-084 — composição completa da lista', () => {
  const sessions: Session[] = [
    makeSession('pin1', { pinned: true }),
    makeSession('grp1', { customGroup: 'g1' }),
    makeSession('qc1', { isQuickChat: true }),
    makeSession('today1', { section: 'today', updatedSeq: 5 }),
    makeSession('today2', { section: 'today', updatedSeq: 9 }),
    makeSession('yest1', { section: 'yesterday' }),
    makeSession('week1', { section: 'lastWeek' }),
    makeSession('old1', { section: 'older' }),
    makeSession('arch1', { archived: true, section: 'archived' }),
    makeSession('auto1', { automation: true }),
  ]

  it('ordena os grupos e inclui a seção lastWeek, excluindo automation', () => {
    const groups = buildSessionsList(sessions, EMPTY_FILTERS, 'updated', 'today2', { g1: 'Grupo 1' })
    const ids = groups.map((group) => group.id)
    expect(ids).toEqual(['pinned', 'custom:g1', 'quickChats', 'today', 'yesterday', 'lastWeek', 'older', 'archived'])
    // automation nunca aparece
    expect(groups.flatMap((g) => g.sessions.map((s) => s.id))).not.toContain('auto1')
  })

  it('ordena sessões dentro do grupo today por updatedSeq (desc)', () => {
    const groups = buildSessionsList(sessions, EMPTY_FILTERS, 'updated', 'today2', {})
    const today = groups.find((group) => group.id === 'today')!
    expect(today.sessions.map((s) => s.id)).toEqual(['today2', 'today1'])
  })

  it('a lastWeek existe como seção de data própria', () => {
    const groups = buildSessionsList(sessions, EMPTY_FILTERS, 'manual', 'today1', {})
    const week = groups.find((group) => group.id === 'lastWeek')
    expect(week).toBeDefined()
    expect(week!.sessions.map((s) => s.id)).toEqual(['week1'])
  })
})

