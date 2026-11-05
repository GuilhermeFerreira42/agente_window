import { describe, expect, it } from 'vitest'
import {
  EMPTY_NAVIGATION_STACK,
  dismissLayer,
  hasLayers,
  navigateBack,
  pushLayer,
  resetForSessionSwitch,
  topLayer,
  type MobileLayer,
} from '../domain/mobileNavigationStack'

const drawer: MobileLayer = { id: 'details', kind: 'drawer', label: 'Detalhes' }
const picker: MobileLayer = { id: 'picker', kind: 'picker', label: 'Sessões' }
const editor: MobileLayer = { id: 'editor', kind: 'full-screen-editor', label: 'Editor' }

describe('MobileNavigationStack (R-077)', () => {
  it('empilha camadas e expõe o topo', () => {
    let stack = EMPTY_NAVIGATION_STACK
    expect(hasLayers(stack)).toBe(false)
    stack = pushLayer(stack, drawer)
    stack = pushLayer(stack, picker)
    expect(stack.layers.map((l) => l.id)).toEqual(['details', 'picker'])
    expect(topLayer(stack)?.id).toBe('picker')
  })

  it('empurrar a mesma camada (id) traz ao topo sem duplicar', () => {
    let stack = pushLayer(EMPTY_NAVIGATION_STACK, drawer)
    stack = pushLayer(stack, picker)
    stack = pushLayer(stack, drawer)
    expect(stack.layers.map((l) => l.id)).toEqual(['picker', 'details'])
    expect(topLayer(stack)?.id).toBe('details')
  })

  it('back-navigation dispensa só a camada do topo', () => {
    let stack = pushLayer(EMPTY_NAVIGATION_STACK, drawer)
    stack = pushLayer(stack, editor)
    const result = navigateBack(stack)
    expect(result.exitedSession).toBe(false)
    expect(result.dismissed?.id).toBe('editor')
    expect(result.stack.layers.map((l) => l.id)).toEqual(['details'])
  })

  it('back-navigation com pilha vazia sai da superfície da sessão', () => {
    const result = navigateBack(EMPTY_NAVIGATION_STACK)
    expect(result.exitedSession).toBe(true)
    expect(result.dismissed).toBeUndefined()
    expect(result.stack).toEqual(EMPTY_NAVIGATION_STACK)
  })

  it('dismissLayer remove uma camada específica por id', () => {
    let stack = pushLayer(EMPTY_NAVIGATION_STACK, drawer)
    stack = pushLayer(stack, picker)
    stack = dismissLayer(stack, 'details')
    expect(stack.layers.map((l) => l.id)).toEqual(['picker'])
  })

  it('trocar de sessão reseta todas as camadas transitórias', () => {
    let stack = pushLayer(EMPTY_NAVIGATION_STACK, drawer)
    stack = pushLayer(stack, editor)
    expect(hasLayers(stack)).toBe(true)
    expect(resetForSessionSwitch()).toEqual(EMPTY_NAVIGATION_STACK)
  })
})

