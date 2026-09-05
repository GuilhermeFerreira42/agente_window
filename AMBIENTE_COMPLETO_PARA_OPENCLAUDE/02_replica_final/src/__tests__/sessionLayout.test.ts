import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SESSION_LAYOUT,
  captureSessionLayout,
  forgetSessionLayout,
  restoreSessionLayout,
  type SessionLayoutMap,
  type SessionLayoutState,
} from '../domain/sessionLayout'

const visibleFiles: SessionLayoutState = { auxiliaryVisible: true, activeViewContainerId: 'files' }

describe('sessionLayout (E4 — estado por sessão)', () => {
  it('captura o estado ao sair e restaura ao voltar', () => {
    let map: SessionLayoutMap = {}
    map = captureSessionLayout(map, 's1', visibleFiles)
    expect(restoreSessionLayout(map, 's1')).toEqual(visibleFiles)
  })

  it('cai no padrão para sessões nunca vistas', () => {
    expect(restoreSessionLayout({}, 'nova')).toEqual(DEFAULT_SESSION_LAYOUT)
  })

  it('usa o fallback fornecido (preferência global) para sessões novas', () => {
    const fallback: SessionLayoutState = { auxiliaryVisible: true, activeViewContainerId: 'changes' }
    expect(restoreSessionLayout({}, 'nova', fallback)).toEqual(fallback)
  })

  it('ignora sessões sem id (rascunho/landing)', () => {
    const map = captureSessionLayout({}, undefined, visibleFiles)
    expect(map).toEqual({})
    expect(restoreSessionLayout(map, undefined, visibleFiles)).toEqual(visibleFiles)
  })

  it('não cria novo objeto quando o estado é idêntico (estável)', () => {
    const map = captureSessionLayout({}, 's1', visibleFiles)
    const again = captureSessionLayout(map, 's1', { ...visibleFiles })
    expect(again).toBe(map)
  })

  it('mantém working sets de outras sessões intactos ao alternar', () => {
    let map: SessionLayoutMap = {}
    map = captureSessionLayout(map, 's1', visibleFiles)
    map = captureSessionLayout(map, 's2', { auxiliaryVisible: false, activeViewContainerId: 'changes' })
    // Voltar para s1 preserva o que foi capturado nela.
    expect(restoreSessionLayout(map, 's1')).toEqual(visibleFiles)
    expect(restoreSessionLayout(map, 's2')).toEqual({ auxiliaryVisible: false, activeViewContainerId: 'changes' })
  })

  it('esquece o estado de uma sessão excluída sem tocar nas demais', () => {
    let map: SessionLayoutMap = {}
    map = captureSessionLayout(map, 's1', visibleFiles)
    map = captureSessionLayout(map, 's2', { auxiliaryVisible: false, activeViewContainerId: 'changes' })
    const after = forgetSessionLayout(map, 's1')
    expect(after.s1).toBeUndefined()
    expect(after.s2).toBeDefined()
    // Idempotente para ids inexistentes.
    expect(forgetSessionLayout(after, 's1')).toBe(after)
  })
})

