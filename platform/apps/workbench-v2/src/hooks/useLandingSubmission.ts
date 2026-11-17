// ============================================================================
// C-2 — dono do rascunho da landing e da tentativa de primeiro envio.
// Contrato evoluído (02 §3): o callback recebe o SNAPSHOT imutável + a
// identidade já confirmada (retentativa sem duplicar sessão) e devolve
// `false` para preservar o rascunho; qualquer outro retorno/aceitação limpa.
// Durante a tentativa, mutação dos controles fica bloqueada (sem edição
// concorrente); um único submit admite por vez (lock antes do próximo render).
// ============================================================================

import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import {
  editarRascunho,
  rascunhoInicial,
  snapshotDoRascunho,
  type RascunhoLanding,
} from '../domain/landingDraft'
import type { SnapshotPrimeiroEnvio } from '../domain/landingDraft'
import type { TentativaConfirmada } from '../domain/primeiroEnvio'
import type { SelecaoModelo } from '../bairros/2-inteligencia/casas/conversa'
import type { ModoAgir, NivelPermissaoAgir } from '../bairros/2-inteligencia/casas/agir'

export interface EntradaSubmitLanding {
  /** Snapshot imutável da tentativa (texto/contexto/raiz/seleção/mode/permissão). */
  snapshot: SnapshotPrimeiroEnvio
  /** Identidade confirmada de tentativa anterior da MESMA geração (retry). */
  confirmada: TentativaConfirmada | null
  aoConfirmar: (confirmada: TentativaConfirmada) => void
  aoEncerrar: (confirmada: TentativaConfirmada | null) => void
}

export type SubmitLanding = (entrada: EntradaSubmitLanding) => boolean | void | Promise<boolean | void>

interface ContextoLanding {
  contexto: 'chat' | 'workspace'
  workspacePath: string | null
  workspaceName: string | null
}

export type ControleRascunho = {
  rascunho: RascunhoLanding
  setRascunho: Dispatch<SetStateAction<RascunhoLanding>>
}

// O rascunho pode ser controlado pelo dono (App) — assim ele sobrevive a
// remounts da landing (ex.: abrir a aba de Provedores) — ou ficar interno
// quando o componente é usado de forma isolada.
export function useLandingSubmission(
  onSubmit: SubmitLanding,
  contextoAtual: ContextoLanding,
  controle?: ControleRascunho,
) {
  const [rascunhoInterno, setRascunhoInterno] = useState<RascunhoLanding>(rascunhoInicial)
  const rascunho = controle?.rascunho ?? rascunhoInterno
  const setRascunhoState = controle?.setRascunho ?? setRascunhoInterno
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)
  const rascunhoRef = useRef(rascunho)
  const contextoRef = useRef(contextoAtual)
  const confirmadaRef = useRef<TentativaConfirmada | null>(null)
  rascunhoRef.current = rascunho
  contextoRef.current = contextoAtual

  /** Edição bloqueada durante a tentativa (02 §1: sem mutação concorrente). */
  const patch = (mudanca: Partial<Omit<RascunhoLanding, 'geracao'>>) => {
    if (inFlight.current) return
    setRascunhoState((atual) => editarRascunho(atual, mudanca))
  }

  const setText = (value: string) => patch({ texto: value })

  const setSelecaoModelo = (selecaoModelo: SelecaoModelo) => patch({ selecaoModelo })
  const setModo = (modo: ModoAgir) => patch({ modo })
  const setPermissao = (permissao: NivelPermissaoAgir) => patch({ permissao })

  const submit = async (): Promise<boolean> => {
    const rascunhoAtual = rascunhoRef.current
    const mensagem = rascunhoAtual.texto.trim()
    if (inFlight.current || !mensagem) return false
    inFlight.current = true
    setPending(true)
    try {
      const contexto = contextoRef.current
      const snapshot = snapshotDoRascunho(
        rascunhoAtual,
        contexto.contexto,
        contexto.workspacePath,
        contexto.workspaceName,
        crypto.randomUUID(),
      )
      const aceito = await onSubmit({
        snapshot,
        confirmada: confirmadaRef.current,
        aoConfirmar: (t) => { confirmadaRef.current = t },
        aoEncerrar: (t) => { confirmadaRef.current = t },
      })
      if (aceito !== false) {
        rascunhoRef.current = rascunhoInicial()
        confirmadaRef.current = null
        setRascunhoState(rascunhoInicial())
      }
      return aceito !== false
    } catch {
      // O dono informa a falha; o rascunho continua disponível para retentativa.
      return false
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return {
    rascunho,
    setText,
    setSelecaoModelo,
    setModo,
    setPermissao,
    pending,
    submit,
  }
}
