// RNF15-2 / D174 — um unico dono React para o estado e a memoria das abas NATIVAS.
// As abas do modulo NAO entram aqui: o modulo continua dono delas; a fusao
// permanece no derivado `fundirAbas` do shell. Sem localStorage novo: o F5
// continua responsabilidade de persistenciaDeAbas (somente kind: code).
import { useCallback, useRef, useState } from 'react'
import type { EditorTab } from '../types'
import { getEditorTabsVisibleForSession } from '../domain/browserOwnership'
import { registrarUso } from './abas'
import { dividirIdDoModulo } from './ponteAnexo'

export function useFaixaDeAbasNativas(
  onActivateModuleTab: (sessionId: string, uri: string) => void,
  onShowEditor: () => void,
) {
  // A colecao nasce vazia no App original. NAO restaurar abas nativas por
  // acidente: isso seria comportamento novo e exigiria contrato de produto.
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | undefined>()
  const activeTabBySession = useRef<Record<string, string>>({})
  const activeGlobalTabId = useRef<string | undefined>()
  const mruRef = useRef<readonly string[]>([])
  const editorTabSequence = useRef(0)

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

  const preferredEditorTabForSession = useCallback((allTabs: readonly EditorTab[], sessionId: string, requestedId?: string): EditorTab | undefined => {
    const visibleTabs = getEditorTabsVisibleForSession(allTabs, sessionId)
    const requested = visibleTabs.find((tab) => tab.id === requestedId)
    const remembered = visibleTabs.find((tab) => tab.id === activeTabBySession.current[sessionId])
    if (remembered) return remembered
    if (requested && !requested.sessionId) return requested
    const rememberedGlobal = visibleTabs.find((tab) => tab.id === activeGlobalTabId.current)
    return requested ?? rememberedGlobal ?? visibleTabs[0]
  }, [])

  return {
    editorTabs, setEditorTabs, activeTabId, setActiveTabId,
    activeTabBySession, activeGlobalTabId, mruRef, editorTabSequence,
    activateEditorTab, preferredEditorTabForSession,
  }
}
