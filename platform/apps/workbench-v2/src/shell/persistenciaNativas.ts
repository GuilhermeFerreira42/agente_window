// RF15-4 / D175b — armazenamento da faixa NATIVA, sem React e sem estado duplicado.
// O modulo persiste arquivos kind:code em persistenciaDeAbas.ts. Estes dados
// nunca incluem texto editavel, data URL, cookies, tokens ou modelos Monaco.
import type { BrowserViewState, EditorTab } from '../types'
import { rotaDaSuperficieLegada, type RotaConfiguracoes } from '../domain/configuracoesUnificadas'

export const NATIVE_TABS_KEY = 'workbench.nativeTabs.v1'
export interface SnapshotNativas {
  tabs: EditorTab[]
  browserViews: BrowserViewState[]
  activeTabId?: string
  activeBySession: Record<string, string>
  activeGlobalTabId?: string
  ordinalBySession: Record<string, number>
}
const vazio = (): SnapshotNativas => ({ tabs: [], browserViews: [], activeBySession: {}, ordinalBySession: {} })
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
const texto = (x: unknown, max = 300): x is string => typeof x === 'string' && x.length > 0 && x.length <= max
const registro = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const tipos = new Set<EditorTab['type']>(['browser', 'providers', 'config', 'diff', 'customizations', 'file'])

function normalizar(raw: unknown): SnapshotNativas {
  if (!registro(raw) || raw.version !== 1 || !Array.isArray(raw.tabs) || !Array.isArray(raw.browserViews)) return vazio()
  const views = new Map<string, BrowserViewState>()
  for (const item of raw.browserViews.slice(0, 80)) {
    if (!registro(item) || !texto(item.id) || !texto(item.sessionId) || !texto(item.url, 2048) || !texto(item.title) || !Array.isArray(item.history)) continue
    const history = item.history.filter((url): url is string => texto(url, 2048)).slice(0, 30)
    if (!history.length) continue
    const historyIndex = Number.isInteger(item.historyIndex) ? Math.max(0, Math.min(Number(item.historyIndex), history.length - 1)) : history.length - 1
    const viewport = item.viewport === 'tablet' || item.viewport === 'mobile' ? item.viewport : 'desktop'
    views.set(item.id, { id: item.id, sessionId: item.sessionId, title: item.title, url: item.url, history, historyIndex, viewport, status: 'loading', reloadToken: 0 })
  }
  const tabs: EditorTab[] = []
  const used = new Set<string>()
  for (const item of raw.tabs.slice(0, 80)) {
    if (!registro(item) || !texto(item.id) || used.has(item.id) || !texto(item.title) || !tipos.has(item.type as EditorTab['type'])) continue
    const sessionId = texto(item.sessionId) ? item.sessionId : undefined
    if (item.type === 'browser') {
      const view = texto(item.browserId) ? views.get(item.browserId) : undefined
      if (!view || !sessionId || view.sessionId !== sessionId) continue
      tabs.push({ id: item.id, title: item.title, type: 'browser', sessionId, browserId: view.id })
    } else {
      tabs.push({ id: item.id, title: item.title, type: item.type as EditorTab['type'], ...(sessionId ? { sessionId } : {}) })
    }
    used.add(item.id)
  }
  const ownedViews = new Set(tabs.map((t) => t.browserId).filter(Boolean))
  const browserViews = [...views.values()].filter((v) => ownedViews.has(v.id))
  const activeBySession: Record<string, string> = {}
  if (registro(raw.activeBySession)) for (const [session, id] of Object.entries(raw.activeBySession).slice(0, 80)) {
    if (texto(session) && texto(id, 900)) activeBySession[session] = id
  }
  const ordinalBySession: Record<string, number> = {}
  if (registro(raw.ordinalBySession)) for (const [session, count] of Object.entries(raw.ordinalBySession).slice(0, 80)) {
    if (texto(session) && Number.isInteger(count) && Number(count) > 0 && Number(count) < 10000) ordinalBySession[session] = Number(count)
  }
  // U-1 R09 — memória de aba ativa SEM aba correspondente é sujeira de snapshot
  // antigo (a aba legada drenada ou uma aba que o dono fechou). Preservá-la
  // fazia a faixa "lembrar" de uma aba inexistente e desativar a que o dono
  // estava usando, inclusive a de arquivo. Aqui ela é descartada na leitura.
  const existe = (id: string) => used.has(id)
  return {
    tabs, browserViews, ordinalBySession,
    activeBySession: Object.fromEntries(Object.entries(activeBySession).filter(([, id]) => existe(id))),
    activeTabId: texto(raw.activeTabId) && existe(raw.activeTabId) ? raw.activeTabId : undefined,
    activeGlobalTabId: texto(raw.activeGlobalTabId) && existe(raw.activeGlobalTabId) ? raw.activeGlobalTabId : undefined,
  }
}

export function lerSnapshotNativas(storage: StoragePort = window.localStorage): SnapshotNativas {
  try {
    const raw = storage.getItem(NATIVE_TABS_KEY)
    return raw ? normalizar(JSON.parse(raw) as unknown) : vazio()
  } catch { return vazio() } // privado, storage indisponivel, JSON truncado
}

/**
 * U-1 R09 — tradução das ABAS legadas antes de montar.
 *
 * `providers` e `config` deixaram de ser abas do editor: viraram categorias do
 * modal unificado. Uma aba dessas restaurada de um snapshot antigo é drenada e
 * NÃO volta para a faixa — assim o F5 antigo abre a categoria em vez de uma
 * superfície que não existe mais. `file`, `browser`, `diff` e `customizations`
 * seguem donos das suas abas.
 *
 * R09 (correção da revisão): a exigência é dupla e a antiga versão só cumpria a
 * primeira metade.
 *   1. aba de ARQUIVO ativa + aba antiga de Provedores/Configurações em segundo
 *      plano → o arquivo CONTINUA ativo (o modal pode até abrir, mas a aba que
 *      o dono estava usando não pode ser trocada por acidente);
 *   2. a aba antiga era a ATIVA → abre a categoria equivalente no modal.
 * Por isso `rotas` agora devolve `{ rota, ativa }`: só é `ativa` a aba legada
 * que ocupava o lugar de aba ativa (da sessão ou global). As demais são
 * drenadas em silêncio.
 */
export interface RotaLegadaDrenada {
  rota: RotaConfiguracoes
  /** true = era a aba ATIVA do seu escopo; a categoria deve abrir no modal. */
  ativa: boolean
}

export function drenarAbasLegadas(
  snapshot: SnapshotNativas,
): { snapshot: SnapshotNativas; rotas: RotaLegadaDrenada[] } {
  const rotas: RotaLegadaDrenada[] = []
  // Aba que ocupava o lugar de ativa: a da sessão (por `activeBySession`) ou a
  // global (`activeGlobalTabId`/`activeTabId` quando a aba não é de sessão).
  const eraAtiva = (tab: { id: string; sessionId?: string }): boolean => {
    if (tab.sessionId) return snapshot.activeBySession[tab.sessionId] === tab.id
    return snapshot.activeGlobalTabId === tab.id || snapshot.activeTabId === tab.id
  }
  const tabs = snapshot.tabs.filter((tab) => {
    const rota = rotaDaSuperficieLegada(tab.type)
    if (!rota) return true
    rotas.push({ rota, ativa: eraAtiva(tab) })
    return false
  })
  if (tabs.length === snapshot.tabs.length) return { snapshot, rotas }
  const ids = new Set(tabs.map((tab) => tab.id))
  const activeBySession: Record<string, string> = {}
  for (const [sessao, id] of Object.entries(snapshot.activeBySession)) {
    if (ids.has(id)) activeBySession[sessao] = id
  }
  return {
    snapshot: {
      ...snapshot,
      tabs,
      activeBySession,
      activeTabId: snapshot.activeTabId && ids.has(snapshot.activeTabId) ? snapshot.activeTabId : undefined,
      activeGlobalTabId: snapshot.activeGlobalTabId && ids.has(snapshot.activeGlobalTabId) ? snapshot.activeGlobalTabId : undefined,
    },
    rotas,
  }
}

export function salvarSnapshotNativas(snapshot: SnapshotNativas, storage: StoragePort = window.localStorage): void {
  try {
    const safe = normalizar({ version: 1, ...snapshot })
    storage.setItem(NATIVE_TABS_KEY, JSON.stringify({ version: 1, ...safe }))
  } catch { /* quota/privado: o app continua utilizavel nesta sessao */ }
}
