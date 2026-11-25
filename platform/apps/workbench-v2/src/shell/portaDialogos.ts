// ============================================================================
// shell/portaDialogos.ts — a PORTA que liga a decisão (domínio) à casca (React)
// sem arrastar `window.confirm`/`alert`/`prompt` para o resto do produto.
//
// O React precisa que o diálogo seja ESTADO renderizado; as regras de negócio
// precisam de uma função que responda `Promise<boolean>`. Esta porta é a
// fronteira entre os dois mundos e é a única que fala com `createRoot`.
//
// Contrato:
//   · uma pergunta por vez — pedir enquanto outra espera falha alto, em vez de
//     empilhar modais e perder a resposta;
//   · a promise SÓ resolve com escolha explícita ou fuga (Esc/✕/fundo), nunca
//     por timeout e nunca por "auto-OK";
//   · `dispose()` cancela o que estiver aberto resolvendo como fuga (útil em
//     unmount/HMR) e remove o nó do DOM.
// ============================================================================
import { createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { normalizarPedido, type PedidoDialogo, type PedidoEntrada, type RespostaDialogo } from '../domain/dialogoConfirmacao'
import { DialogoConfirmacao } from './DialogoConfirmacao'
import { DialogoEntrada } from './DialogoEntrada'

export type PedirDialogo = (pedido: PedidoDialogo) => Promise<RespostaDialogo>

export interface PortaDialogos {
  /** Abre o diálogo e resolve com o id escolhido, ou `null` na fuga. */
  pedir: PedirDialogo
  /** Confirmação booleana: `true` só quando o botão `confirmar` é escolhido. */
  confirmar: (pedido: PedidoDialogo) => Promise<boolean>
  /** Aviso de uma saída: resolve no OK e não decide nada pelo dono. */
  avisar: (pedido: PedidoDialogo) => Promise<void>
  /** Pedido com campo de texto (substitui `window.prompt`). */
  pedirTexto: (pedido: PedidoEntrada) => Promise<string | null>
  /** Há um diálogo aberto? (o dono pode usar para bloquear atalhos) */
  aberto: () => boolean
  dispose: () => void
}

/** Id do botão de confirmação por convenção (`pedidoDestrutivo`/`pedidoDeConfirmacao`). */
export const BOTAO_CONFIRMAR = 'confirmar'

export function criarPortaDialogos(doc: Document = document): PortaDialogos {
  let raiz: Root | null = null
  let no: HTMLElement | null = null
  let pendente: ((resposta: RespostaDialogo) => void) | null = null

  const limpar = (resposta: RespostaDialogo) => {
    const resolver = pendente
    pendente = null
    if (raiz) raiz.unmount()
    raiz = null
    no?.remove()
    no = null
    resolver?.(resposta)
  }

  const abrir = (pedido: PedidoDialogo, elemento: ReactElement): Promise<RespostaDialogo> => {
    if (pendente) {
      return Promise.reject(new Error('Já existe um diálogo aberto. Feche-o antes de pedir outra confirmação.'))
    }
    const normalizado = normalizarPedido(pedido)
    no = doc.createElement('div')
    no.setAttribute('data-dialogo-porta', normalizado.testId)
    doc.body.appendChild(no)
    raiz = createRoot(no)
    return new Promise<RespostaDialogo>((resolver) => {
      pendente = resolver
      raiz!.render(elemento)
    })
  }

  const pedir: PedirDialogo = (pedido) => abrir(pedido, createElement(DialogoConfirmacao, {
    pedido,
    onResponder: (id) => limpar(id),
  }))

  return {
    pedir,
    confirmar: async (pedido) => (await pedir(pedido)) === BOTAO_CONFIRMAR,
    avisar: async (pedido) => { await pedir(pedido) },
    pedirTexto: (pedido) => abrir(pedido, createElement(DialogoEntrada, {
      pedido,
      onResponder: (id, texto) => limpar(id === BOTAO_CONFIRMAR ? texto : null),
    })),
    aberto: () => pendente !== null,
    dispose: () => { if (pendente) limpar(null) },
  }
}

/** Porta única do app (criada sob demanda; o dono é `main.tsx`). */
let portaUnica: PortaDialogos | null = null

export function portaDialogos(): PortaDialogos {
  if (!portaUnica) portaUnica = criarPortaDialogos()
  return portaUnica
}

/** Só para testes: descarta a porta única entre casos. */
export function esquecerPortaDialogos(): void {
  portaUnica?.dispose()
  portaUnica = null
}
