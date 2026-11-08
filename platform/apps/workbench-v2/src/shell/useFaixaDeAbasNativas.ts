// RNF15-2 / D174-D175 — um dono React para as abas NATIVAS E seus recursos Browser.
// As abas do modulo NAO entram aqui: o modulo continua dono delas; a fusao
// ocorre so no derivado `fundirAbas`. Nenhum localStorage novo: a persistencia
// do modulo continua em persistenciaDeAbas (somente kind: code).
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BrowserViewState, BrowserViewport, EditorTab } from '../types'
import {
  getBrowserViewsForSession, getEditorTabsVisibleForSession,
  removeBrowserResourceForTab, removeBrowserResourcesForSession,
  type BrowserResources,
} from '../domain/browserOwnership'
import {
  navigateBrowser as navigateBrowserState, reloadBrowser as reloadBrowserState,
  setBrowserStatus as setBrowserStatusState, setBrowserViewport as setBrowserViewportState,
  stepBrowserHistory,
} from '../domain/sessionState'
import { colecaoParaEscopo, fecharAba, registrarUso, resolverAbaVisivel } from './abas'
import { reorderEditorTabs } from '../domain/dragAndDrop'
import { enterDetailOnly, showEditorRestore, EMPTY_DOCKED_STATE, type DockedControllerState } from '../domain/dockedAuxiliaryController'
import { abaExistentePara, atualizacaoDeAbaReusada, idDeAbaNova, montarAba, type PedidoDeAba } from './identidadeDaAba'
import { dividirIdDoModulo, idDaAbaDoModulo } from './ponteAnexo'
import { lerSnapshotNativas, salvarSnapshotNativas } from './persistenciaNativas'

export function useFaixaDeAbasNativas(
  onActivateModuleTab: (sessionId: string, uri: string) => void,
  onShowEditor: () => void,
  currentSessionId: string,
) {
  // D175b: snapshot e dado de boot, NAO e' segundo estado. A fonte viva segue
  // sendo so este hook. `code` e diffs do modulo continuam fora deste snapshot.
  const [initial] = useState(lerSnapshotNativas)
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>(initial.tabs)
  const [activeTabId, setActiveTabId] = useState<string | undefined>(
    initial.activeBySession[currentSessionId] ?? initial.activeTabId,
  )
  const [browserViews, setBrowserViews] = useState<BrowserViewState[]>(initial.browserViews)
  const activeTabBySession = useRef<Record<string, string>>(initial.activeBySession)
  const activeGlobalTabId = useRef<string | undefined>(initial.activeGlobalTabId)
  const mruRef = useRef<readonly string[]>([])
  const editorTabSequence = useRef(0)
  const browserSequence = useRef(0)
  const browserOrdinalBySession = useRef<Record<string, number>>(initial.ordinalBySession)
  const dockedController = useRef<DockedControllerState>(EMPTY_DOCKED_STATE)
  const capturedBrowserViews = useRef<BrowserViewState[]>([])
  // R-040 captura temporariamente BrowserViews e abas ao ocultar o editor. Nao
  // escrever esse estado transitorio no storage; F5 no modo oculto nao as perde.
  const persistencePaused = useRef(false)
  const pauseNativePersistence = () => { persistencePaused.current = true }
  const resumeNativePersistence = () => { persistencePaused.current = false }
  useEffect(() => {
    if (persistencePaused.current) return
    salvarSnapshotNativas({
      tabs: editorTabs, browserViews, activeTabId,
      activeBySession: activeTabBySession.current,
      activeGlobalTabId: activeGlobalTabId.current,
      ordinalBySession: browserOrdinalBySession.current,
    })
  }, [editorTabs, browserViews, activeTabId, currentSessionId])

  const activateEditorTab = useCallback((tab: EditorTab | undefined) => {
    if (!tab) {
      setActiveTabId(undefined)
      return
    }
    const partes = dividirIdDoModulo(tab.id)
    if (partes) onActivateModuleTab(partes.sessionId, partes.uri)
    setActiveTabId(tab.id)
    onShowEditor()
    mruRef.current = registrarUso(mruRef.current, tab.id)
    if (tab.sessionId) activeTabBySession.current[tab.sessionId] = tab.id
    else activeGlobalTabId.current = tab.id
  }, [onActivateModuleTab, onShowEditor])

  // A URI já foi ativada pelo módulo. Adota a intenção na faixa sem chamar
  // activateTab de volta e sem confundir restauração com navegação do usuário.
  const acceptModuleNavigation = useCallback((sessionId: string, uri: string): boolean => {
    if (sessionId !== currentSessionId) return false
    const id = idDaAbaDoModulo(sessionId, uri)
    setActiveTabId(id)
    activeTabBySession.current[sessionId] = id
    mruRef.current = registrarUso(mruRef.current, id)
    onShowEditor()
    return true
  }, [currentSessionId, onShowEditor])

  const preferredEditorTabForSession = useCallback((allTabs: readonly EditorTab[], sessionId: string, requestedId?: string): EditorTab | undefined => {
    const visibleTabs = getEditorTabsVisibleForSession(allTabs, sessionId)
    const requested = visibleTabs.find((tab) => tab.id === requestedId)
    const remembered = visibleTabs.find((tab) => tab.id === activeTabBySession.current[sessionId])
    if (remembered) return remembered
    if (requested && !requested.sessionId) return requested
    const rememberedGlobal = visibleTabs.find((tab) => tab.id === activeGlobalTabId.current)
    return requested ?? rememberedGlobal ?? visibleTabs[0]
  }, [])

  const openEditorTab = useCallback((type: EditorTab['type'], options: Omit<PedidoDeAba, 'type'>, sessionId: string) => {
    const pedido = { type, ...options }
    const existing = abaExistentePara(editorTabs, pedido, sessionId)
    if (existing) {
      const atualizacao = atualizacaoDeAbaReusada(existing, pedido)
      if (atualizacao) setEditorTabs((current) => current.map((t) => t.id === existing.id ? { ...t, ...atualizacao } : t))
      activateEditorTab(existing)
      return
    }
    const tab: EditorTab = montarAba(pedido, sessionId, idDeAbaNova(type, Date.now(), editorTabSequence.current++))
    setEditorTabs((current) => [...current, tab])
    activateEditorTab(tab)
  }, [editorTabs, activateEditorTab])

  const createBrowser = (sessionId: string) => {
    const nextOrdinal = browserOrdinalBySession.current[sessionId] ?? getBrowserViewsForSession(browserViews, sessionId).length + 1
    browserOrdinalBySession.current[sessionId] = nextOrdinal + 1
    const sequence = browserSequence.current++
    const id = `browser-${sessionId}-${Date.now()}-${sequence}`
    const url = `https://agents.local/sessions/${sessionId}`
    const view: BrowserViewState = { id, sessionId, title: nextOrdinal === 1 ? 'Browser' : `Browser ${nextOrdinal}`, url, history: [url], historyIndex: 0, status: 'loading', viewport: 'desktop', reloadToken: 0 }
    const tab: EditorTab = { id: `${id}-tab`, type: 'browser', title: view.title, sessionId, browserId: id }
    activeTabBySession.current[sessionId] = tab.id
    setBrowserViews((current) => [...current, view])
    setEditorTabs((current) => [...current, tab])
    activateEditorTab(tab)
  }

  /** A guarda CannotClose e a fronteira do modulo ficam no chamador: so a aba
   * NATIVA chega aqui. A view Browser e a sua aba saem no mesmo passo. */
  const closeNativeTab = (id: string, sessionId: string) => {
    const closing = editorTabs.find((tab) => tab.id === id)
    if (!closing) return
    const sucessoraAoFechar = (candidatas: readonly EditorTab[], ativa: string | undefined) =>
      fecharAba(colecaoParaEscopo(candidatas, mruRef.current), id, ativa).sucessoraId
    const nextId = sucessoraAoFechar(getEditorTabsVisibleForSession(editorTabs, sessionId), activeTabId)
    const nextResources = removeBrowserResourceForTab({ browserViews, editorTabs }, id)
    setBrowserViews(nextResources.browserViews)
    setEditorTabs(nextResources.editorTabs)
    if (closing.sessionId && activeTabBySession.current[closing.sessionId] === id) {
      const replacement = sucessoraAoFechar(editorTabs.filter((tab) => tab.sessionId === closing.sessionId), id)
      if (replacement) activeTabBySession.current[closing.sessionId] = replacement
      else delete activeTabBySession.current[closing.sessionId]
    }
    if (!closing.sessionId && activeGlobalTabId.current === id) delete activeGlobalTabId.current
    const visibleAfterClose = getEditorTabsVisibleForSession(nextResources.editorTabs, sessionId)
    const requestedNextId = activeTabId === id ? nextId : activeTabId
    activateEditorTab(nextResources.editorTabs.find((tab) => tab.id === resolverAbaVisivel(visibleAfterClose, requestedNextId)))
  }

  /** Entrega o proximo estado imediatamente para o App escolher sessao/layout;
   * o hook e' o unico que altera as duas colecoes e a memoria do dono. */
  const removeSessionResources = (sessionId: string): BrowserResources => {
    const next = removeBrowserResourcesForSession({ browserViews, editorTabs }, sessionId)
    setBrowserViews(next.browserViews)
    setEditorTabs(next.editorTabs)
    delete activeTabBySession.current[sessionId]
    return next
  }

  const reorderNativeTabs = (fromId: string, toId: string) =>
    setEditorTabs((current) => reorderEditorTabs(current, fromId, toId) as EditorTab[])

  // R-040 pertence ao dono da colecao, nao ao App. O shell entrega apenas os
  // descartes ao orquestrador para mostrar um aviso; nenhuma copia de estado.
  const hideNativeTabs = (sessionId: string, onDropped: (dropped: readonly EditorTab[]) => void) => {
    pauseNativePersistence()
    setEditorTabs((tabs) => {
      const result = enterDetailOnly(tabs, sessionId)
      dockedController.current = result.state
      const capturedBrowserIds = new Set(result.state.captured
        .map((entry) => entry.tab)
        .filter((tab) => tab.type === 'browser' && tab.browserId)
        .map((tab) => tab.browserId as string))
      if (capturedBrowserIds.size > 0) {
        setBrowserViews((views) => {
          capturedBrowserViews.current = views.filter((view) => capturedBrowserIds.has(view.id))
          return views.filter((view) => !capturedBrowserIds.has(view.id))
        })
      } else capturedBrowserViews.current = []
      if (result.dropped.length > 0) onDropped(result.dropped)
      return result.tabs
    })
  }

  const restoreNativeTabs = () => {
    resumeNativePersistence()
    const restoredViews = [...capturedBrowserViews.current]
    capturedBrowserViews.current = []
    setEditorTabs((tabs) => {
      const result = showEditorRestore(tabs, dockedController.current)
      dockedController.current = result.state
      return result.tabs
    })
    if (restoredViews.length > 0) setBrowserViews((views) => [...views, ...restoredViews])
  }

  const navigateBrowser = (id: string, url: string) => setBrowserViews((current) => current.map((view) => view.id === id ? navigateBrowserState(view, url) : view))
  const browserBack = (id: string) => setBrowserViews((current) => current.map((view) => view.id === id ? stepBrowserHistory(view, -1) : view))
  const browserForward = (id: string) => setBrowserViews((current) => current.map((view) => view.id === id ? stepBrowserHistory(view, 1) : view))
  const reloadBrowser = (id: string) => setBrowserViews((current) => current.map((view) => view.id === id ? reloadBrowserState(view) : view))
  const setBrowserStatus = (id: string, status: BrowserViewState['status']) => setBrowserViews((current) => current.map((view) => view.id === id ? setBrowserStatusState(view, status) : view))
  const setBrowserViewport = (id: string, viewport: BrowserViewport) => setBrowserViews((current) => current.map((view) => view.id === id ? setBrowserViewportState(view, viewport) : view))
  const hasNativeSurface = (type: EditorTab['type']) => editorTabs.some(tab => tab.type === type)
    || dockedController.current.captured.some(entry => entry.tab.type === type)

  return {
    editorTabs, activeTabId, setActiveTabId, browserViews,
    activeTabBySession, activeGlobalTabId,
    activateEditorTab, acceptModuleNavigation, hasNativeSurface, preferredEditorTabForSession, openEditorTab, createBrowser,
    closeNativeTab, removeSessionResources, reorderNativeTabs, hideNativeTabs, restoreNativeTabs,
    navigateBrowser, browserBack, browserForward, reloadBrowser, setBrowserStatus, setBrowserViewport,
  }
}
