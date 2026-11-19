// ============================================================================
// C-3b — Ciclo de vida das mídias de UMA conversa.
//
// Responsabilidades (T28):
//   • montar a URL escopada de cada artefato (o cliente HTTP é quem sabe o
//     namespace; o domínio não constrói URL);
//   • pausar TODOS os players ao trocar de conversa/desmontar;
//   • liberar referências transitórias, sem manter player tocando escondido.
//
// O que este hook NÃO faz: baixar mídia para Blob. O elemento nativo usa a URL
// direto, com Range — baixar tudo em memória quebraria o requisito R06.
// ============================================================================
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { urlDeMidia } from '../services/sessions/artefatosMediaClient'

export interface NoMidia {
  pausar: () => void
}

export function useMidiaDaConversa(sessionId: string | null, chatId: string | null) {
  // WeakSet não serve: precisamos iterar para pausar todos.
  const nos = useRef(new Set<HTMLMediaElement>())

  const registrar = useCallback((elemento: HTMLMediaElement | null) => {
    if (elemento) nos.current.add(elemento)
  }, [])

  const pausarTudo = useCallback(() => {
    for (const no of nos.current) {
      try { if (!no.paused) no.pause() } catch { /* nó já removido */ }
    }
  }, [])

  // Troca de conversa: pausa antes de qualquer nova montagem.
  useEffect(() => {
    pausarTudo()
    nos.current.clear()
    return () => { pausarTudo() }
  }, [sessionId, chatId, pausarTudo])

  const urlPara = useCallback(
    (artifactId: string) => urlDeMidia(sessionId, chatId, artifactId),
    [sessionId, chatId],
  )

  return useMemo(() => ({ registrar, pausarTudo, urlPara }), [registrar, pausarTudo, urlPara])
}
