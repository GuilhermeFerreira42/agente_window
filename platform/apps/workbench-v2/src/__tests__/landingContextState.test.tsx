import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDING_VISIBLE_KEY, useLandingContext } from '../hooks/useLandingContext'

beforeEach(() => { localStorage.clear() })
afterEach(() => { vi.restoreAllMocks() })

describe('contexto e destino da landing', () => {
  it('destino sobrevive ao remount; abrir conversa revoga a preferência de landing', () => {
    const first = renderHook(useLandingContext)
    act(() => first.result.current.setNewSessionLanding(true))
    first.unmount()
    const second = renderHook(useLandingContext)
    expect(second.result.current.newSessionLanding).toBe(true)
    expect(second.result.current.landingContexto).toBe('chat')
    expect(second.result.current.selectedWorkspace).toBeUndefined()
    act(() => second.result.current.setNewSessionLanding(false))
    second.unmount()
    expect(renderHook(useLandingContext).result.current.newSessionLanding).toBe(false)
  })
  it('voltar para Chat apaga a seleção pendente, sem persistir caminho ou alterar conversa', () => {
    const { result } = renderHook(useLandingContext)
    act(() => {
      result.current.setSelectedWorkspace({ path: '/fixture/projeto', name: 'projeto', slug: 'projeto', isGit: false })
      result.current.setLandingContexto('workspace')
    })
    expect(result.current.selectedWorkspace?.path).toBe('/fixture/projeto')
    act(() => result.current.setLandingContexto('chat'))
    expect(result.current.selectedWorkspace).toBeUndefined()
    expect(result.current.landingContexto).toBe('chat')
    expect(localStorage.length).toBe(0)
  })
  it('preferência inválida ou falha de storage não impede navegação', () => {
    localStorage.setItem(LANDING_VISIBLE_KEY, 'inválido')
    const { result } = renderHook(useLandingContext)
    expect(result.current.newSessionLanding).toBe(false)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    act(() => result.current.setNewSessionLanding(true))
    expect(result.current.newSessionLanding).toBe(true)
  })
})
