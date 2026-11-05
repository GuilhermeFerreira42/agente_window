import { describe, expect, it } from 'vitest'
import {
  aggregateSessionTypes,
  commitDraft,
  createManagementState,
  discardDraft,
  hasPendingDraft,
  openDraft,
  registerProvider,
  resolvableWorkspaces,
  resolveProvider,
  selectProviderForNewSession,
  unregisterProvider,
  type SessionProvider,
} from '../domain/sessionsManagement'

const copilot: SessionProvider = { id: 'copilot', label: 'Copilot Chat', order: 0, sessionTypes: ['chat', 'quick-chat'] }
const agentHost: SessionProvider = { id: 'agent-host', label: 'Agent Host', order: 1, sessionTypes: ['chat', 'automation'], workspaces: ['vscode-main'] }
const remote: SessionProvider = { id: 'remote', label: 'Remote Agent Host', order: 2, sessionTypes: ['chat'], workspaces: ['sessions'] }

function seeded() {
  let state = createManagementState()
  state = registerProvider(state, agentHost)
  state = registerProvider(state, copilot)
  state = registerProvider(state, remote)
  return state
}

describe('sessionsManagement (R-001/R-002/R-003)', () => {
  it('registra providers em ordem estável e resolve por id', () => {
    const state = seeded()
    expect(state.providers.map((p) => p.id)).toEqual(['copilot', 'agent-host', 'remote'])
    expect(resolveProvider(state, 'remote')?.label).toBe('Remote Agent Host')
    expect(resolveProvider(state, 'nope')).toBeUndefined()
  })

  it('substituir um provider mantém a ordenação por order', () => {
    let state = seeded()
    state = registerProvider(state, { ...copilot, order: 9 })
    expect(state.providers.map((p) => p.id)).toEqual(['agent-host', 'remote', 'copilot'])
  })

  it('agrega tipos de sessão de todos os providers (R-001)', () => {
    expect(aggregateSessionTypes(seeded())).toEqual(['automation', 'chat', 'quick-chat'])
  })

  it('seleciona provider para nova sessão por workspace (R-002)', () => {
    const state = seeded()
    // 'vscode-main' → agent-host o atende; mas copilot (sem restrição) vem antes.
    expect(selectProviderForNewSession(state, 'vscode-main')?.id).toBe('copilot')
    // sem copilot, cai no provider restrito ao workspace
    const noCopilot = unregisterProvider(state, 'copilot')
    expect(selectProviderForNewSession(noCopilot, 'vscode-main')?.id).toBe('agent-host')
    expect(selectProviderForNewSession(noCopilot, 'sessions')?.id).toBe('remote')
    expect(selectProviderForNewSession(noCopilot, 'desconhecido')).toBeUndefined()
  })

  it('lista workspaces resolvíveis', () => {
    expect(resolvableWorkspaces(seeded())).toEqual(['sessions', 'vscode-main'])
  })

  it('abre, confirma e descarta drafts pendentes (R-003)', () => {
    let state = seeded()
    state = openDraft(state, { id: 'd1', kind: 'quick-chat', providerId: 'copilot' })
    expect(hasPendingDraft(state, 'quick-chat')).toBe(true)
    // draft com provider inexistente é ignorado
    const unchanged = openDraft(state, { id: 'd2', kind: 'chat' as never, providerId: 'ghost' })
    expect(unchanged.drafts).toHaveLength(1)
    // commit remove
    state = commitDraft(state, 'd1')
    expect(hasPendingDraft(state, 'quick-chat')).toBe(false)
    // discard idempotente
    expect(discardDraft(state, 'inexistente')).toEqual(state)
  })

  it('workspace-session draft exige provider dono do workspace', () => {
    const state = unregisterProvider(seeded(), 'copilot')
    // agent-host é dono de vscode-main → ok
    const ok = openDraft(state, { id: 'w1', kind: 'workspace-session', providerId: 'agent-host', workspace: 'vscode-main' })
    expect(ok.drafts).toHaveLength(1)
    // remote NÃO é dono de vscode-main → ignorado
    const rejected = openDraft(state, { id: 'w2', kind: 'workspace-session', providerId: 'remote', workspace: 'vscode-main' })
    expect(rejected.drafts.some((d) => d.id === 'w2')).toBe(false)
  })

  it('unregister remove o provider e seus drafts', () => {
    let state = seeded()
    state = openDraft(state, { id: 'd1', kind: 'automation', providerId: 'agent-host' })
    state = unregisterProvider(state, 'agent-host')
    expect(resolveProvider(state, 'agent-host')).toBeUndefined()
    expect(state.drafts).toHaveLength(0)
  })

  // R-005: Management NÃO possui estado ativo/visível/foco/layout — separação
  // de responsabilidades. Esse estado vive no App/layoutController, não aqui.
  it('não carrega estado ativo/visível/foco/layout (R-005)', () => {
    let state = seeded()
    state = openDraft(state, { id: 'd1', kind: 'automation', providerId: 'agent-host' })
    const keys = Object.keys(state)
    expect(keys).toEqual(['providers', 'drafts'])
    for (const forbidden of ['active', 'activeSessionId', 'visible', 'visibleSessionIds', 'focus', 'layout', 'partSizes']) {
      expect(keys).not.toContain(forbidden)
    }
  })
})

