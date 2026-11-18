// C-3a — F5/offline: reconcilia os chips das mensagens com a VERDADE do
// ledger (transferindo/falhou/salvo) ao abrir cada conversa. Efeito fino no
// App (R11): sem estado próprio — só atualiza o dono das sessões.
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { Session } from '../types'
import { fundirEstadoAnexos, listarAnexos } from '../services/sessions/anexosClient'

export function useFusaoAnexos(entrada: {
  sessions: Session[]
  activeSessionId: string | null
  newSessionLanding: boolean
  setSessions: Dispatch<SetStateAction<Session[]>>
}): void {
  const { sessions, activeSessionId, newSessionLanding, setSessions } = entrada
  const sessoesComFusaoRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!activeSessionId || newSessionLanding) return
    const alvo = sessions.find((session) => session.id === activeSessionId)
    if (!alvo) return
    const chave = `${activeSessionId}:${alvo.chats.map((chat) => chat.id).join(',')}`
    if (sessoesComFusaoRef.current.has(chave)) return
    sessoesComFusaoRef.current.add(chave)
    let cancelado = false
    void (async () => {
      for (const chat of alvo.chats) {
        try {
          const lista = await listarAnexos(alvo.id, chat.id)
          if (cancelado) return
          setSessions((current) => current.map((session) => session.id !== alvo.id ? session : {
            ...session,
            chats: session.chats.map((c) => c.id !== chat.id ? c : {
              ...c,
              messages: fundirEstadoAnexos(c.messages, lista) as typeof c.messages,
            }),
          }))
        } catch { /* offline: mantém o estado congelado do transcript (honesto) */ }
      }
    })()
    return () => { cancelado = true }
  }, [activeSessionId, sessions, newSessionLanding, setSessions])
}
