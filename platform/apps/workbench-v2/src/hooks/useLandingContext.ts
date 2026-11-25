import { useCallback, useState } from 'react'
import type { WorkspaceDescriptor } from '../services/sessions/sessionsClient'

/** Preferência de navegação; não armazena conversa, rascunho ou permissões. */
export const LANDING_VISIBLE_KEY = 'agente-window:landing-visible:v1'

function readLandingVisible(): boolean {
  try { return window.localStorage.getItem(LANDING_VISIBLE_KEY) === 'true' }
  catch { return false }
}

export function useLandingContext() {
  const [newSessionLanding, setVisible] = useState(readLandingVisible)
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceDescriptor>()
  const [landingContexto, setContexto] = useState<'chat' | 'workspace'>('chat')
  const setNewSessionLanding = useCallback((visible: boolean) => {
    setVisible(visible)
    // Síncrono no ponto de navegação: F5 imediato não reabre a conversa anterior.
    try { window.localStorage.setItem(LANDING_VISIBLE_KEY, String(visible)) } catch { /* Preferência best-effort. */ }
  }, [])
  const setLandingContexto = useCallback((contexto: 'chat' | 'workspace') => {
    setContexto(contexto)
    if (contexto === 'chat') setSelectedWorkspace(undefined)
  }, [])
  return { newSessionLanding, setNewSessionLanding, selectedWorkspace, setSelectedWorkspace, landingContexto, setLandingContexto }
}
