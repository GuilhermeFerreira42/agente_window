import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWorkbenchHistory } from './useWorkbenchHistory'

describe('histórico interno do workbench', () => {
  it('replay não cria outra entrada; nova navegação descarta o ramo Avançar', () => {
    const restore = vi.fn()
    const { result, rerender } = renderHook(({ screen }) => useWorkbenchHistory({ route: { screen }, restore, valid: () => true }), { initialProps: { screen: 'chat-a' } })
    rerender({ screen: 'config' }); rerender({ screen: 'chat-b' })
    act(() => result.current.back())
    expect(restore).toHaveBeenLastCalledWith({ screen: 'config' })
    rerender({ screen: 'config' })
    expect(result.current.canForward).toBe(true)
    act(() => result.current.forward()); rerender({ screen: 'chat-b' })
    expect(restore).toHaveBeenLastCalledWith({ screen: 'chat-b' })
    act(() => result.current.back()); rerender({ screen: 'config' })
    rerender({ screen: 'personalizacoes' })
    expect(result.current.canForward).toBe(false)
  })
  it('ignora destinos removidos sem recriar sessão ou aba', () => {
    const restore = vi.fn(); const removed = new Set<string>()
    const { result, rerender } = renderHook(({ screen }) => useWorkbenchHistory({ route: { screen }, restore, valid: route => !removed.has(route.screen) }), { initialProps: { screen: 'chat-a' } })
    rerender({ screen: 'arquivo-fechado' }); rerender({ screen: 'chat-b' })
    removed.add('arquivo-fechado')
    act(() => result.current.back())
    expect(restore).toHaveBeenLastCalledWith({ screen: 'chat-a' })
    expect(restore).toHaveBeenCalledTimes(1)
  })
})
