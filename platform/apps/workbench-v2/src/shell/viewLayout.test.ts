// FATIA-05 5.5 — pure view-layout helpers (container + order) used by the DnD.
import { describe, expect, it } from 'vitest'
import { DEFAULT_VIEW_LAYOUT, isViewLayout, moveViewInLayout } from './viewRegistry'
import { loadLayoutState, LAYOUT_STATE_KEY } from './layoutState'

describe('viewLayout (5.5)', () => {
  it('default: all views in the Side Bar, panel empty', () => {
    expect(DEFAULT_VIEW_LAYOUT).toEqual({ sideBar: ['explorer', 'search', 'scm'], panel: [] })
  })
  it('moveViewInLayout moves between containers and clamps the index', () => {
    const a = moveViewInLayout(DEFAULT_VIEW_LAYOUT, 'scm', 'panel', 99)
    expect(a).toEqual({ sideBar: ['explorer', 'search'], panel: ['scm'] })
    const b = moveViewInLayout(a, 'scm', 'sideBar', -5)
    expect(b).toEqual({ sideBar: ['scm', 'explorer', 'search'], panel: [] })
  })
  it('moveViewInLayout reorders inside the same container (drop before the first)', () => {
    expect(moveViewInLayout(DEFAULT_VIEW_LAYOUT, 'search', 'sideBar', 0)).toEqual({ sideBar: ['search', 'explorer', 'scm'], panel: [] })
  })
  it('isViewLayout rejects duplicates, missing views and unknown ids', () => {
    expect(isViewLayout({ sideBar: ['explorer', 'search'], panel: ['scm'] })).toBe(true)
    expect(isViewLayout({ sideBar: ['explorer', 'search', 'scm'], panel: ['scm'] })).toBe(false)
    expect(isViewLayout({ sideBar: ['explorer'], panel: [] })).toBe(false)
    expect(isViewLayout({ sideBar: ['explorer', 'search', 'terminal'], panel: [] })).toBe(false)
    expect(isViewLayout(null)).toBe(false)
  })
  it('loadLayoutState restores a valid viewLayout and falls back to default otherwise', () => {
    const ok = new Map([[LAYOUT_STATE_KEY, JSON.stringify({ viewLayout: { sideBar: ['search', 'explorer'], panel: ['scm'] }, panelActiveView: 'scm' })]])
    expect(loadLayoutState({ getItem: (k) => ok.get(k) ?? null }).viewLayout).toEqual({ sideBar: ['search', 'explorer'], panel: ['scm'] })
    expect(loadLayoutState({ getItem: (k) => ok.get(k) ?? null }).panelActiveView).toBe('scm')
    const bad = new Map([[LAYOUT_STATE_KEY, JSON.stringify({ viewLayout: { sideBar: ['scm', 'scm'], panel: [] } })]])
    expect(loadLayoutState({ getItem: (k) => bad.get(k) ?? null }).viewLayout).toEqual(DEFAULT_VIEW_LAYOUT)
  })
})
