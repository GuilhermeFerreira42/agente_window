import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useFaixaDeAbasNativas } from './useFaixaDeAbasNativas'
import { idDaAbaDoModulo } from './ponteAnexo'
beforeEach(() => window.localStorage.clear())
it('navegação do módulo troca a aba nativa sem duplicar abas, reentrar no módulo ou roubar outra sessão', () => {
  const activate = vi.fn(), show = vi.fn()
  const { result } = renderHook(() => useFaixaDeAbasNativas(activate, show, 's1'))
  act(() => { result.current.createBrowser('s1') })
  const browser = result.current.activeTabId
  expect(browser).toBeTruthy()
  act(() => { result.current.acceptModuleNavigation('s1', 'file:///fixture/a.ts') })
  expect(result.current.activeTabId).toBe(idDaAbaDoModulo('s1', 'file:///fixture/a.ts'))
  expect(result.current.editorTabs).toHaveLength(1)
  expect(activate).not.toHaveBeenCalled()
  act(() => { expect(result.current.acceptModuleNavigation('s2', 'file:///fixture/b.ts')).toBe(false) })
  expect(result.current.activeTabId).toBe(idDaAbaDoModulo('s1', 'file:///fixture/a.ts'))
})
