import { describe, expect, it } from 'vitest'
import { lerSnapshotNativas, salvarSnapshotNativas, NATIVE_TABS_KEY } from './persistenciaNativas'
import type { SnapshotNativas } from './persistenciaNativas'

const store = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v) } }
}
const exemplo = (): SnapshotNativas => ({
  tabs: [
    { id: 'browser-s1-tab', type: 'browser', title: 'Browser', sessionId: 's1', browserId: 'browser-s1' },
    { id: 'providers-1', type: 'providers', title: 'Provedores' },
  ],
  browserViews: [{ id: 'browser-s1', sessionId: 's1', title: 'Browser', url: 'https://example.test/', history: ['https://example.test/'], historyIndex: 0, status: 'ready', viewport: 'tablet', reloadToken: 8 }],
  activeTabId: 'browser-s1-tab', activeBySession: { s1: 'browser-s1-tab' }, activeGlobalTabId: 'providers-1', ordinalBySession: { s1: 2 },
})
describe('RF15-4: snapshot da faixa NATIVA', () => {
  it('preserva Browser/Provedores e reinicia recursos efemeros do iframe no F5', () => {
    const storage = store(); salvarSnapshotNativas(exemplo(), storage)
    const out = lerSnapshotNativas(storage)
    expect(out.tabs.map(t => t.type)).toEqual(['browser', 'providers'])
    expect(out.browserViews).toEqual([{ ...exemplo().browserViews[0], status: 'loading', reloadToken: 0 }])
    expect(out.activeBySession.s1).toBe('browser-s1-tab')
    expect(out.ordinalBySession.s1).toBe(2)
  })
  it('nao persiste content/isRealFile nem outros payloads de editor/arquivo', () => {
    const storage = store(); const snapshot = exemplo()
    snapshot.tabs.push({ id: 'native-file', type: 'file', title: 'segredo', content: 'NAO GRAVAR', isRealFile: true })
    snapshot.tabs[1].content = 'NAO GRAVAR'
    salvarSnapshotNativas(snapshot, storage)
    expect(storage.getItem(NATIVE_TABS_KEY)).not.toContain('NAO GRAVAR')
    expect(lerSnapshotNativas(storage).tabs).toHaveLength(2)
  })
  it('descarta aba Browser sem view e view sem aba, inclusive owner cruzado', () => {
    const storage = store(); const snapshot = exemplo()
    snapshot.browserViews.push({ ...snapshot.browserViews[0], id: 'orfa' })
    snapshot.tabs.push({ id: 'cruzada', type: 'browser', title: 'Cross', sessionId: 's2', browserId: 'orfa' })
    salvarSnapshotNativas(snapshot, storage)
    expect(lerSnapshotNativas(storage).browserViews).toHaveLength(1)
    expect(lerSnapshotNativas(storage).tabs).toHaveLength(2)
  })
  it('ignora JSON invalido e versao desconhecida sem derrubar a interface', () => {
    const storage = store(); storage.setItem(NATIVE_TABS_KEY, '{incompleto')
    expect(lerSnapshotNativas(storage).tabs).toEqual([])
    storage.setItem(NATIVE_TABS_KEY, JSON.stringify({ version: 2, ...exemplo() }))
    expect(lerSnapshotNativas(storage).browserViews).toEqual([])
  })
  it('falha de escrita/leitura do storage e best-effort', () => {
    const storage = { getItem: () => { throw new Error('privado') }, setItem: () => { throw new Error('quota') } }
    expect(() => salvarSnapshotNativas(exemplo(), storage)).not.toThrow()
    expect(lerSnapshotNativas(storage).tabs).toEqual([])
  })
})
