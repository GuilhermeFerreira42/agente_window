import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_SHELL,
  LAYOUT_STORAGE_KEY,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  clampSidebarWidth,
  defaultLayoutState,
  loadLayoutState,
  partSizesForSession,
  saveLayoutState,
  type LayoutState,
} from '../domain/layoutPersistence'

function makeStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  }
}

describe('layoutPersistence', () => {
  let storage: ReturnType<typeof makeStorage>
  beforeEach(() => { storage = makeStorage() })

  it('returns defaults when nothing is stored', () => {
    expect(loadLayoutState(storage)).toEqual(defaultLayoutState())
    expect(loadLayoutState(storage).shell).toEqual(DEFAULT_SHELL)
  })

  it('round-trips a saved state across a simulated reload', () => {
    const state: LayoutState = {
      shell: { sidebarVisible: false, auxiliaryVisible: false, terminalVisible: true, editorHidden: true, sidebarWidth: 320 },
      partSizesBySession: { s1: [30, 70], s2: [60, 40] },
    }
    saveLayoutState(state, storage)
    // Nova leitura (como após um reload) reconstrói o mesmo estado.
    expect(loadLayoutState(storage)).toEqual(state)
    expect(storage._map.has(LAYOUT_STORAGE_KEY)).toBe(true)
  })

  it('falls back to defaults on corrupted JSON', () => {
    const bad = makeStorage({ [LAYOUT_STORAGE_KEY]: '{not valid json' })
    expect(loadLayoutState(bad)).toEqual(defaultLayoutState())
  })

  it('merges partial shell with defaults and drops invalid sizes', () => {
    const partial = makeStorage({
      [LAYOUT_STORAGE_KEY]: JSON.stringify({ shell: { terminalVisible: true }, partSizesBySession: { s1: [50, 50], bad: 'x' } }),
    })
    const loaded = loadLayoutState(partial)
    expect(loaded.shell.terminalVisible).toBe(true)
    expect(loaded.shell.sidebarVisible).toBe(true) // veio do default
    expect(loaded.partSizesBySession).toEqual({ s1: [50, 50] })
  })

  it('limita (clamp) a largura da sidebar aos limites válidos', () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR_WIDTH_MIN)
    expect(clampSidebarWidth(9999)).toBe(SIDEBAR_WIDTH_MAX)
    expect(clampSidebarWidth(320)).toBe(320)
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_WIDTH_DEFAULT)
  })

  it('sanea uma largura de sidebar corrompida ao carregar', () => {
    const store = makeStorage({
      [LAYOUT_STORAGE_KEY]: JSON.stringify({ shell: { sidebarWidth: 5000 }, partSizesBySession: {} }),
    })
    expect(loadLayoutState(store).shell.sidebarWidth).toBe(SIDEBAR_WIDTH_MAX)
  })

  it('provides an even split as the per-session default', () => {
    const state = defaultLayoutState()
    expect(partSizesForSession(state, 'unknown')).toEqual([50, 50])
    state.partSizesBySession.s9 = [25, 75]
    expect(partSizesForSession(state, 's9')).toEqual([25, 75])
  })

  it('degrades gracefully when no storage is available', () => {
    expect(loadLayoutState(undefined as never)).toEqual(defaultLayoutState())
    // Não deve lançar.
    expect(() => saveLayoutState(defaultLayoutState(), undefined as never)).not.toThrow()
  })
})

