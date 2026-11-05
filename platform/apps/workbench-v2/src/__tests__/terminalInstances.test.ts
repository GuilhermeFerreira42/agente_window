import { describe, expect, it } from 'vitest'
import {
  closeTerminalInstance,
  createInitialTerminalInstances,
  formatTerminalInstanceLabel,
  getActiveTerminalInstance,
  openTerminalInstance,
  setActiveTerminalInstance,
  updateTerminalInstance,
} from '../domain/terminalInstances'

describe('terminalInstances', () => {
  it('cria a instância default com ptySessionId determinístico', () => {
    const state = createInitialTerminalInstances('S', 'bash', 'bash')
    expect(state.instances).toHaveLength(1)
    expect(state.instances[0]).toMatchObject({
      key: 't0',
      ordinal: 0,
      ptySessionId: 'S:0',
      label: 'bash',
      shellId: 'bash',
    })
    expect(state.activeKey).toBe('t0')
    expect(state.nextOrdinal).toBe(1)
  })

  it('abre nova instância com ordinal monotônico e label numerado quando repete shell', () => {
    const state = openTerminalInstance(createInitialTerminalInstances('S', 'bash', 'bash'), 'S', 'bash', 'bash')
    expect(state.instances).toHaveLength(2)
    expect(state.instances[1]).toMatchObject({
      key: 't1',
      ordinal: 1,
      ptySessionId: 'S:1',
      label: '2: bash',
      shellId: 'bash',
    })
    expect(state.activeKey).toBe('t1')
  })

  it('reaproveita a mesma ptySessionId quando o ordinal preferido já existe', () => {
    const base = openTerminalInstance(createInitialTerminalInstances('S', 'bash', 'bash'), 'S', 'bash', 'bash')
    const reused = openTerminalInstance(base, 'S', 'bash', 'bash', 1)
    expect(reused.instances).toHaveLength(2)
    expect(reused.activeKey).toBe('t1')
  })

  it('troca ativo, atualiza metadata e fecha apenas a instância pedida', () => {
    let state = openTerminalInstance(createInitialTerminalInstances('S', 'bash', 'bash'), 'S', 'bash', 'bash')
    state = setActiveTerminalInstance(state, 't0')
    expect(getActiveTerminalInstance(state)?.ptySessionId).toBe('S:0')

    state = updateTerminalInstance(state, 't0', {
      label: formatTerminalInstanceLabel('zsh', 0),
      shellId: 'zsh',
    })
    expect(getActiveTerminalInstance(state)).toMatchObject({ label: 'zsh', shellId: 'zsh' })

    state = closeTerminalInstance(state, 't1')
    expect(state.instances).toHaveLength(1)
    expect(state.instances[0].ptySessionId).toBe('S:0')
    expect(state.activeKey).toBe('t0')
  })
})
