// R-030 — Gatilho de troca de sessão orientado a observable (LAYOUT_CONTROLLER.md §2).
//
// "All state flows from the `activeSession` observable (never events)." O
// controller deriva `activeSessionResourceObs` e reage com um `autorun` que
// mantém um `previousSessionResource` local para distinguir uma **troca real**
// (`previous !== active`) de um load inicial ou re-avaliação não relacionada.
//
// Além disso (§2 Multiple visible sessions): quando mais de uma sessão está
// visível no grid, TODO o sync por sessão é suprimido, e um autorun dedicado
// LIMPA o estado por sessão de cada sessão visível, garantindo que, ao colapsar
// de volta para uma sessão, a lógica de visibilidade padrão rode de novo em vez
// de restaurar estado obsoleto.
//
// Este módulo NÃO conhece React: recebe os observables de entrada e os callbacks
// de efeito (capturar/restaurar/limpar), e devolve um dispose. Assim o gatilho é
// unitariamente testável com o motor de `observable.ts`.

import { autorun, type IObservable } from './observable'

export interface LayoutSyncInputs {
  /** Recurso (id/URI) da sessão ativa; `undefined` no landing/rascunho sem id. */
  readonly activeSessionResource: IObservable<string | undefined>
  /** Há mais de uma sessão visível no grid (Sessions Part). */
  readonly multipleSessionsVisible: IObservable<boolean>
  /** Ids das sessões atualmente visíveis (usado para limpar estado na supressão). */
  readonly visibleSessionResources: IObservable<readonly string[]>
}

export interface LayoutSyncEffects {
  /**
   * Captura o estado de layout da sessão que está SAINDO. Chamado apenas numa
   * troca real e apenas fora do modo multi-sessão.
   */
  captureOutgoing(resource: string): void
  /**
   * Restaura o estado de layout da sessão que está ENTRANDO. Chamado numa troca
   * real fora do modo multi-sessão.
   */
  restoreIncoming(resource: string): void
  /**
   * Limpa o estado por sessão (aux bar + painel) das sessões visíveis. Chamado
   * pelo autorun de supressão enquanto múltiplas sessões estão visíveis, para
   * que a visibilidade padrão rode de novo ao colapsar.
   */
  clearVisibleSessionState(resources: readonly string[]): void
}

export interface LayoutSyncOptions {
  /**
   * Semeia o `previousSessionResource` local na construção. Usar quando a sessão
   * ativa inicial já está "posicionada" (load inicial) e NÃO deve disparar um
   * restore que sobrescreveria o estado de layout já persistido/hidratado.
   */
  readonly initialPreviousResource?: string
}

/**
 * Instala o gatilho de troca de sessão. Retorna um `dispose` que remove ambos os
 * autoruns.
 */
export interface LayoutSyncHandle {
  dispose(): void
  /**
   * Rebaseia o `previousSessionResource` local sem disparar capturar/restaurar.
   * Usado para trocas "passivas" (criação/exclusão de sessão): definindo o
   * previous ANTES de atualizar o observable da sessão ativa, o autorun observa
   * `previous === active` e não aplica restore — preservando o comportamento em
   * que criar/excluir sessão não restaura layout salvo.
   */
  setPreviousResource(resource: string | undefined): void
}

export function createLayoutSync(
  inputs: LayoutSyncInputs,
  effects: LayoutSyncEffects,
  options: LayoutSyncOptions = {},
): LayoutSyncHandle {
  // Estado local do controller (LAYOUT_CONTROLLER.md §2: "keeps a local
  // previousSessionResource"). Vive fora do autorun para sobreviver às re-runs.
  let previousSessionResource: string | undefined = options.initialPreviousResource

  // Autorun principal: reage à sessão ativa + ao flag multi-sessão.
  const switchRun = autorun('layoutSync.switch', () => {
    const active = inputs.activeSessionResource.get()
    const multiple = inputs.multipleSessionsVisible.get()

    // Em modo multi-sessão o sync por sessão é suprimido por completo. Ainda
    // assim acompanhamos `previous` para que, ao colapsar, a próxima troca seja
    // detectada corretamente.
    if (multiple) {
      previousSessionResource = active
      return
    }

    // Detecta troca real: previous !== active. Load inicial (previous undefined
    // → primeira sessão) restaura, mas não captura (não há de onde capturar).
    if (previousSessionResource === active) return

    if (previousSessionResource !== undefined) {
      effects.captureOutgoing(previousSessionResource)
    }
    if (active !== undefined) {
      effects.restoreIncoming(active)
    }
    previousSessionResource = active
  })

  // Autorun de supressão: enquanto múltiplas sessões estão visíveis, limpa o
  // estado por sessão de todas elas (§2).
  const suppressionRun = autorun('layoutSync.suppression', () => {
    const multiple = inputs.multipleSessionsVisible.get()
    const resources = inputs.visibleSessionResources.get()
    if (!multiple) return
    effects.clearVisibleSessionState(resources)
  })

  return {
    dispose() {
      switchRun.dispose()
      suppressionRun.dispose()
    },
    setPreviousResource(resource: string | undefined) {
      previousSessionResource = resource
    },
  }
}

