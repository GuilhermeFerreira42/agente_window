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
import type { Attachment } from '../types'
import type { TentativaConfirmada } from '../domain/primeiroEnvio'
import type { SelecaoModelo } from '../bairros/2-inteligencia/casas/conversa'
import type { ModoAgir, NivelPermissaoAgir } from '../bairros/2-inteligencia/casas/agir'
import { pedidoEscolhaAnexos } from '../domain/pedidosArquivo'
import { portaDialogos } from '../shell/portaDialogos'

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

export interface EstadoTentativa {
  pending: boolean
  confirmada: TentativaConfirmada | null
}

/**
 * C2-RV05 — estado da tentativa no DONO (App): sobrevive ao remount da
 * landing (abrir Provedores com criação em voo) sem perder lock/identidade.
 */
export function useLandingTentativa() {
  const [estado, setEstado] = useState<EstadoTentativa>({ pending: false, confirmada: null })
  const inFlight = useRef(false)
  return { estado, setEstado, inFlight }
}

export type ControleTentativa = ReturnType<typeof useLandingTentativa>

// O rascunho pode ser controlado pelo dono (App) — assim ele sobrevive a
// remounts da landing (ex.: abrir a aba de Provedores) — ou ficar interno
// quando o componente é usado de forma isolada.
export function useLandingSubmission(
  onSubmit: SubmitLanding,
  contextoAtual: ContextoLanding,
  controle?: ControleRascunho,
  tentativa?: ControleTentativa,
) {
  const [rascunhoInterno, setRascunhoInterno] = useState<RascunhoLanding>(rascunhoInicial)
  const rascunho = controle?.rascunho ?? rascunhoInterno
  const setRascunhoState = controle?.setRascunho ?? setRascunhoInterno
  const [pendingInterno, setPendingInterno] = useState(false)
  const inFlightInterno = useRef(false)
  const confirmadaInterna = useRef<TentativaConfirmada | null>(null)
  const pending = tentativa ? tentativa.estado.pending : pendingInterno
  const inFlight = tentativa ? tentativa.inFlight : inFlightInterno
  const confirmadaAtual = tentativa ? tentativa.estado.confirmada : confirmadaInterna.current
  const setPending = (valor: boolean) => {
    if (tentativa) tentativa.setEstado((atual) => ({ ...atual, pending: valor }))
    else setPendingInterno(valor)
  }
  const setConfirmada = (valor: TentativaConfirmada | null) => {
    if (tentativa) tentativa.setEstado((atual) => ({ ...atual, confirmada: valor }))
    else confirmadaInterna.current = valor
  }
  const rascunhoRef = useRef(rascunho)
  const contextoRef = useRef(contextoAtual)
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

  /** C-3a — anexos do rascunho da landing (metadados; Files em arquivosVivos). */
  const setAnexos = (anexos: Attachment[]) => patch({ anexos })

  const submit = async (): Promise<boolean> => {
    const rascunhoAtual = rascunhoRef.current
    const mensagem = rascunhoAtual.texto.trim()
    // C-3a — arquivo sem texto também admite o primeiro envio (E01).
    if (inFlight.current || (!mensagem && !(rascunhoAtual.anexos?.length))) return false
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
      // Antes de criar sessão/worktree ou transferir: o recibo da landing
      // só é marcado como escolha feita após esta confirmação explícita.
      if (snapshot.texto.trim() && snapshot.anexos?.length &&
          !(await portaDialogos().confirmar(pedidoEscolhaAnexos(snapshot.anexos.map((anexo) => anexo.name))))) return false
      const aceito = await onSubmit({
        snapshot,
        confirmada: confirmadaAtual,
        aoConfirmar: (t) => { setConfirmada(t) },
        aoEncerrar: (t) => { setConfirmada(t) },
      })
      if (aceito !== false) {
        rascunhoRef.current = rascunhoInicial()
        setConfirmada(null)
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
    setAnexos,
    pending,
    submit,
  }
}
