import { describe, expect, it } from 'vitest'
import {
  NEW_SESSION_ITEM,
  buildSessionPickerEntries,
  pickItemMatches,
  selectablePickItems,
} from '../domain/sessionsPicker'
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

describe('sessions picker', () => {
  const sessions: Session[] = [
    makeSession('replicar', { title: 'Replicar a Janela', workspace: 'vscode-main', section: 'today' }),
    makeSession('needs', { title: 'Revisar changes', status: 'needs-input', section: 'today' }),
    makeSession('unread', { title: 'Layout single-pane', unread: true, section: 'today' }),
    makeSession('old', { title: 'Densidade da lista', section: 'lastWeek', workspace: 'sessions' }),
    makeSession('arch', { title: 'Migração aux', archived: true, section: 'archived' }),
  ]

  it('always starts with the New Session item', () => {
    const entries = buildSessionPickerEntries(sessions, '')
    expect(entries[0]).toBe(NEW_SESSION_ITEM)
  })

  it('groups needs input / unread / recently opened / other and excludes archived', () => {
    const entries = buildSessionPickerEntries(sessions, '')
    const labels = entries.filter((e) => e.kind === 'separator').map((e) => e.label)
    expect(labels).toEqual(['needs input', 'unread', 'recently opened', 'other sessions'])
    const ids = selectablePickItems(entries).map((item) => item.id)
    expect(ids).toContain('needs')
    expect(ids).toContain('unread')
    expect(ids).toContain('old')
    expect(ids).not.toContain('arch') // arquivadas ficam fora do switcher
  })

  it('matches on name and on folder/branch (matchOnDetail)', () => {
    expect(pickItemMatches({ kind: 'item', id: 'x', label: 'Replicar', detail: 'vscode-main · main' }, 'vscode')).toBe(true)
    expect(pickItemMatches({ kind: 'item', id: 'x', label: 'Replicar', detail: 'vscode-main · main' }, 'zzz')).toBe(false)
  })

  it('filters items by query while keeping the New Session row and dropping empty groups', () => {
    const entries = buildSessionPickerEntries(sessions, 'vscode-main')
    expect(entries[0]).toBe(NEW_SESSION_ITEM)
    const sessionIds = selectablePickItems(entries).filter((item) => item.session).map((item) => item.id)
    expect(sessionIds).toEqual(['replicar'])
    // Só o grupo "recently opened" sobrou (a sessão vscode-main é de hoje).
    expect(entries.filter((e) => e.kind === 'separator').map((e) => e.label)).toEqual(['recently opened'])
  })
})

