import { describe, expect, it } from 'vitest'
import { isNavigationKey, nextRovingIndex } from '../domain/keyboardNavigation'

describe('keyboardNavigation (E2/R-076 — roving focus)', () => {
  it('ArrowDown/ArrowUp movem um item sem wrap', () => {
    expect(nextRovingIndex('ArrowDown', { count: 5, current: 0 })).toBe(1)
    expect(nextRovingIndex('ArrowUp', { count: 5, current: 2 })).toBe(1)
    // clamp nas extremidades (sem wrap)
    expect(nextRovingIndex('ArrowDown', { count: 5, current: 4 })).toBe(4)
    expect(nextRovingIndex('ArrowUp', { count: 5, current: 0 })).toBe(0)
  })

  it('sem foco: ArrowDown começa no topo, ArrowUp começa no fim', () => {
    expect(nextRovingIndex('ArrowDown', { count: 5, current: -1 })).toBe(0)
    expect(nextRovingIndex('ArrowUp', { count: 5, current: -1 })).toBe(4)
  })

  it('Home/End vão para as extremidades', () => {
    expect(nextRovingIndex('Home', { count: 5, current: 3 })).toBe(0)
    expect(nextRovingIndex('End', { count: 5, current: 1 })).toBe(4)
  })

  it('PageDown/PageUp saltam uma página com clamp', () => {
    expect(nextRovingIndex('PageDown', { count: 20, current: 2, pageSize: 8 })).toBe(10)
    expect(nextRovingIndex('PageUp', { count: 20, current: 2, pageSize: 8 })).toBe(0)
    expect(nextRovingIndex('PageDown', { count: 5, current: 0, pageSize: 8 })).toBe(4)
  })

  it('lista vazia retorna -1', () => {
    expect(nextRovingIndex('ArrowDown', { count: 0, current: -1 })).toBe(-1)
  })

  it('isNavigationKey reconhece só as teclas de navegação', () => {
    expect(isNavigationKey('ArrowDown')).toBe(true)
    expect(isNavigationKey('End')).toBe(true)
    expect(isNavigationKey('Enter')).toBe(false)
    expect(isNavigationKey('a')).toBe(false)
  })
})

