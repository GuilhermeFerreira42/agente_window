// ============================================================================
// domain/exclusaoConversa.ts — FLUXO de exclusão de conversa (puro).
//
// Por que este arquivo existe: o App.tsx estava em 2920 linhas contra o teto
// de 2889 (c2Arquitetura T22) e a exclusão era a maior regra de negócio que
// ainda morava no síndico. A regra NÃO mudou nesta extração — só o lugar:
//   · alvo e consequência confirmados ANTES de qualquer solicitação;
//   · worktree sujo exige uma confirmação PRÓPRIA (nunca `force` implícito);
//   · execução viva é cancelada antes do DELETE e um estado não terminal
//     aborta com falha honesta (nada de exclusão pela metade);
//   · `limpeza_pendente` NUNCA vira sucesso: fica como pendência com
//     retomada explícita (botão "Retomar exclusão").
//
// O que ele NÃO faz: nada de React, fetch, DOM ou storage. Recebe portas
// (confirmar, solicitar remoção, cancelar execuções, concluir) e devolve o
// resultado. Quem desenha é `shell/DialogoConfirmacao.tsx`; quem conecta as
// portas é o App (um único ponto de wiring).
// ============================================================================
import { pedidoDestrutivo, type PedidoDialogo } from './dialogoConfirmacao'

/** Porta de confirmação: recebe o pedido, devolve `true` só após escolha explícita. */
export type ConfirmarDialogo = (pedido: PedidoDialogo) => Promise<boolean>

export interface PortasExclusao {
  /** Confirmação interna da aplicação (nunca `window.confirm`). */
  confirmar: ConfirmarDialogo
  /** Pede ao servidor a remoção; devolve o ciclo (`limpeza_pendente` ≠ sucesso). */
  solicitarRemocao: (opcoes: { force?: boolean; expectedRevision: number }) => Promise<'concluido' | 'limpeza_pendente'>
  /** Cancela as execuções vivas do alvo e devolve o estado terminal de cada uma. */
  cancelarExecucoes: () => Promise<ReadonlyArray<'cancelled' | 'cancelled_with_effects' | 'already_terminal' | 'pending'>>
  /** Exclusão concluída no servidor: hora de limpar o estado local. */
  concluir: () => void
  /** Falha honesta (visível e retomável); o alvo continua na lista. */
  falhar: (erro: unknown) => void
  /** O dono aceitou: agora (e só agora) o alvo entra em `excluindo`. */
  comecar: () => void
  /** Erro de código conhecido do dono da persistência (`worktree_dirty`). */
  codigoDoErro: (erro: unknown) => string | undefined
}

export interface AlvoExclusao {
  id: string
  titulo: string
  persistenciaRevisao: number
}

export type ResultadoExclusao = 'excluida' | 'cancelada' | 'falhou' | 'limpeza_pendente'

/** Texto do primeiro pedido: alvo + consequência, como no P-C §2. */
export function pedidoDeExclusao(titulo: string): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: `Excluir a conversa “${titulo}”?`,
    detalhe: 'O histórico e os dados dela serão removidos. As outras conversas e edições ficam intactas.',
    confirmar: 'Excluir conversa',
    rotuloAcessivel: 'Confirmar exclusão da conversa',
    testId: 'conversa-delete-confirm',
  })
}

/** Texto do segundo pedido: só aparece quando o worktree sujo recusa a exclusão. */
export function pedidoDeDescarteDoWorktree(titulo: string): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: `Excluir “${titulo}” e descartar as alterações locais?`,
    detalhe: 'Este worktree possui alterações locais que ainda não foram commitadas. Excluir a conversa descarta essas alterações.',
    confirmar: 'Excluir e descartar',
    rotuloAcessivel: 'Confirmar descarte das alterações locais',
    testId: 'conversa-delete-worktree-confirm',
  })
}

/** Estado terminal de uma execução cancelada — `pending` NÃO é terminal. */
const TERMINAIS = new Set(['cancelled', 'cancelled_with_effects', 'already_terminal'])

/**
 * Executa o fluxo completo. Nunca lança: devolve o resultado e deixa a
 * consequência visível pelas portas (`falhar`/`concluir`).
 */
export async function excluirConversa(alvo: AlvoExclusao, portas: PortasExclusao): Promise<ResultadoExclusao> {
  if (!(await portas.confirmar(pedidoDeExclusao(alvo.titulo)))) return 'cancelada'
  // A tela só mostra "Excluindo conversa" DEPOIS da escolha: fechar o diálogo
  // não deixa rastro nenhum na lista.
  portas.comecar()

  const estados = await portas.cancelarExecucoes()
  if (estados.some((estado) => !TERMINAIS.has(estado))) {
    portas.falhar(new Error('A execução desta conversa ainda não terminou. Aguarde a parada terminar e tente excluir novamente.'))
    return 'falhou'
  }

  // O servidor é a autoridade: o ciclo `limpeza_pendente` (exclusão registrada,
  // anexos ainda na fila) NUNCA vira sucesso — fica pendente e retomável.
  const remover = (force?: boolean) => portas.solicitarRemocao({ force, expectedRevision: alvo.persistenciaRevisao })

  try {
    if ((await remover()) === 'limpeza_pendente') return pendente(portas)
  } catch (erro) {
    if (portas.codigoDoErro(erro) !== 'worktree_dirty') {
      portas.falhar(erro)
      return 'falhou'
    }
    // P-T08 — o descarte exige confirmação ESPECÍFICA; recusar deixa tudo como estava.
    if (!(await portas.confirmar(pedidoDeDescarteDoWorktree(alvo.titulo)))) return 'cancelada'
    try {
      if ((await remover(true)) === 'limpeza_pendente') return pendente(portas)
    } catch (erroForcado) {
      portas.falhar(erroForcado)
      return 'falhou'
    }
  }
  portas.concluir()
  return 'excluida'
}

function pendente(portas: PortasExclusao): ResultadoExclusao {
  portas.falhar(new Error('A exclusão foi registrada, mas a limpeza ainda não concluiu. Tente novamente para retomar.'))
  return 'limpeza_pendente'
}
