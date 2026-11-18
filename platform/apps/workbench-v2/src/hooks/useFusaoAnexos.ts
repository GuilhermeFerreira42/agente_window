// C-3a — F5/offline: reconcilia os chips das mensagens com a VERDADE do
// ledger (transferindo/falhou/salvo) ao abrir cada conversa. Efeito fino no
// App (R11): sem estado próprio — só atualiza o dono das sessões.
//
// B10 — prontos AINDA SEM MENSAGEM não podem desaparecer: quando o ledger tem
// um artefato que nenhuma mensagem cita (upload publicado e mensagem que
// falhou depois), o dono recebe um chip honesto na conversa ("salvo sem
// mensagem"), sem inventar mensagem, conteúdo ou envio ao modelo.
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { ChatMessage, Session } from '../types'
import { fundirEstadoAnexos, listarAnexos } from '../services/sessions/anexosClient'

const ID_PREFIXO = 'attachment-salvo-'

/** Chip de artefato pronto sem mensagem (id estável; sem bytes nem locator). */
export function chipSalvoSemMensagem(artigo: { artifactId: string; name: string; bytes: number; sha256: string; mode: 'copy' | 'reference'; referencia?: string }): ChatMessage {
  return {
    id: `${ID_PREFIXO}${artigo.artifactId}`,
    role: 'assistant',
    content: '',
    time: '',
    mode: 'ask',
    salvoSemMensagem: true,
    attachments: [{
      id: artigo.artifactId,
      artifactId: artigo.artifactId,
      name: artigo.name,
      kind: artigo.mode === 'reference' ? 'workspace' : 'local',
      estado: artigo.mode === 'reference' ? 'referencia' : 'pronto',
      bytes: artigo.bytes,
      sha256: artigo.sha256,
      mode: artigo.mode,
      ...(artigo.referencia ? { referencia: artigo.referencia } : {}),
    }],
  }
}

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
            chats: session.chats.map((c) => {
              if (c.id !== chat.id) return c
              const fundido = fundirEstadoAnexos(c.messages, lista)
              const presentes = new Set(fundido.mensagens.map((mensagem) => (mensagem as ChatMessage).id))
              const chips = fundido.orfaos
                .map((artigo) => chipSalvoSemMensagem(artigo))
                .filter((chip) => !presentes.has(chip.id))
              return {
                ...c,
                messages: [...(fundido.mensagens as ChatMessage[]), ...chips],
              }
            }),
          }))
        } catch { /* offline: mantém o estado congelado do transcript (honesto) */ }
      }
    })()
    return () => { cancelado = true }
  }, [activeSessionId, sessions, newSessionLanding, setSessions])
}
