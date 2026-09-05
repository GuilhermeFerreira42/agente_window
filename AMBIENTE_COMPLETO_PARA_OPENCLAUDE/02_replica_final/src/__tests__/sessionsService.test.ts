import { describe, expect, it } from 'vitest'
import {
  addVisibleSession,
  applySyncSuppression,
  createSessionsServiceState,
  isRealSwitch,
  multipleSessionsVisible,
  removeVisibleSession,
  reorderVisibleSessions,
  setActiveChat,
  setActiveSession,
} from '../domain/sessionsService'

describe('sessionsService (E14 — Sessions Part model)', () => {
  it('inicia com uma única sessão visível e ativa', () => {
    const s = createSessionsServiceState({ active: 's1' })
    expect(s.visible).toEqual(['s1'])
    expect(s.active).toBe('s1')
    expect(multipleSessionsVisible(s)).toBe(false)
  })

  it('setActiveSession troca para uma única visível quando não estava no grid', () => {
    let s = createSessionsServiceState({ active: 's1' })
    s = setActiveSession(s, 's2')
    expect(s.visible).toEqual(['s2'])
    expect(s.active).toBe('s2')
  })

  it('addVisibleSession forma um grid e ativa a nova; sem duplicar', () => {
    let s = createSessionsServiceState({ active: 's1' })
    s = addVisibleSession(s, 's2')
    expect(s.visible).toEqual(['s1', 's2'])
    expect(s.active).toBe('s2')
    expect(multipleSessionsVisible(s)).toBe(true)
    s = addVisibleSession(s, 's2')
    expect(s.visible).toEqual(['s1', 's2'])
  })

  it('setActiveSession dentro do grid não colapsa o grid', () => {
    let s = addVisibleSession(createSessionsServiceState({ active: 's1' }), 's2')
    s = setActiveSession(s, 's1')
    expect(s.visible).toEqual(['s1', 's2'])
    expect(s.active).toBe('s1')
  })

  it('removeVisibleSession promove vizinha e nunca esvazia', () => {
    let s = addVisibleSession(addVisibleSession(createSessionsServiceState({ active: 's1' }), 's2'), 's3')
    expect(s.visible).toEqual(['s1', 's2', 's3'])
    s = removeVisibleSession(s, 's3') // ativa era s3 → promove s2
    expect(s.visible).toEqual(['s1', 's2'])
    expect(s.active).toBe('s2')
    // remover a última visível é no-op.
    let single = createSessionsServiceState({ active: 's1' })
    single = removeVisibleSession(single, 's1')
    expect(single.visible).toEqual(['s1'])
  })

  it('reorderVisibleSessions move mantendo os membros', () => {
    let s = addVisibleSession(addVisibleSession(createSessionsServiceState({ active: 's1' }), 's2'), 's3')
    s = reorderVisibleSessions(s, 's3', 's1')
    expect(s.visible).toEqual(['s3', 's1', 's2'])
  })

  it('setActiveChat guarda o chat ativo por sessão', () => {
    let s = createSessionsServiceState({ active: 's1' })
    s = setActiveChat(s, 's1', 'c9')
    expect(s.activeChatBySession.s1).toBe('c9')
  })

  it('sync por sessão é normal com uma sessão visível', () => {
    const s = createSessionsServiceState({ active: 's1' })
    const res = applySyncSuppression(s, { s1: 'v' }, { s1: true })
    expect(res.shouldSyncPerSession).toBe(true)
    expect(res.viewStateBySession).toEqual({ s1: 'v' })
  })

  it('sync é suprimido e limpa entradas das visíveis com múltiplas sessões', () => {
    const s = addVisibleSession(createSessionsServiceState({ active: 's1' }), 's2')
    const res = applySyncSuppression(
      s,
      { s1: 'a', s2: 'b', s3: 'keep' },
      { s1: true, s2: false, s3: true },
    )
    expect(res.shouldSyncPerSession).toBe(false)
    // s1/s2 (visíveis) foram limpas; s3 (não visível) permanece.
    expect(res.viewStateBySession).toEqual({ s3: 'keep' })
    expect(res.panelVisibilityBySession).toEqual({ s3: true })
  })

  it('isRealSwitch distingue troca real de carga inicial/reavaliação', () => {
    expect(isRealSwitch(undefined, 's1')).toBe(false)
    expect(isRealSwitch('s1', 's1')).toBe(false)
    expect(isRealSwitch('s1', 's2')).toBe(true)
  })
})

