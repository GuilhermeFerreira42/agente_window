import { useRef, useState } from 'react'

export type SubmitLanding = (text: string) => boolean | void | Promise<boolean | void>

/** Mantém o rascunho até a confirmação e serializa a criação da conversa. */
export function useLandingSubmission(onSubmit: SubmitLanding) {
  const [text, updateText] = useState('')
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)

  const setText = (value: string) => {
    if (!inFlight.current) updateText(value)
  }

  const submit = async () => {
    const message = text.trim()
    if (inFlight.current || !message) return
    inFlight.current = true
    setPending(true)
    try {
      const accepted = await onSubmit(message)
      if (accepted !== false) updateText('')
    } catch {
      // O dono informa a falha; o rascunho continua disponível para retentativa.
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return { text, setText, pending, submit }
}
