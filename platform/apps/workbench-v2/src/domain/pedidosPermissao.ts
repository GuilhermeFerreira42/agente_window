// ============================================================================
// domain/pedidosPermissao.ts — PEDIDOS de confirmação das permissões do Agir.
//
// O texto de risco de "Permitir tudo" e de "Permitir exclusões automáticas"
// estava duplicado (ChatInput e tela inicial) dentro de chamadas a
// `window.confirm`. Aqui ele passa a ter UM dono: o mesmo texto, as mesmas
// escolhas, os mesmos limites — agora em diálogo interno da aplicação.
//
// Regra preservada: o pedido não decide nada. Quem aplica a permissão é
// `onChangePermission`/`onChangeAutomaticDeletes`, como antes. Cancelar ou
// Esc fecha e NÃO chama o dono.
// ============================================================================
import { pedidoDestrutivo, type PedidoDialogo } from './dialogoConfirmacao'

/** Texto literal do risco de Permitir tudo (idêntico ao anterior, sem corte). */
export const TEXTO_PERMITIR_TUDO =
  'ATENÇÃO — Permitir tudo: tools e comandos de terminal poderão executar sem confirmações individuais, '
  + 'acessar arquivos fora do workspace e modificar ou apagar dados, limitados pelos privilégios da sua conta no sistema operacional. '
  + 'Perguntar e Planejar continuam somente leitura; proteções do servidor e da origem local permanecem ativas. '
  + 'Você pode voltar a Permissões manuais a qualquer momento.'

/** Pergunta de uma linha; o detalhe é o risco completo. */
export function pedidoPermitirTudo(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Ativar “Permitir tudo” nesta conversa?',
    detalhe: TEXTO_PERMITIR_TUDO,
    confirmar: 'Ativar Permitir tudo',
    rotuloAcessivel: 'Confirmar ativação de Permitir tudo',
    testId: 'permissao-allow-all-confirm',
  })
}

/** Exclusões automáticas: exige Permitir tudo antes (regra do dono, inalterada). */
export const TEXTO_EXCLUSOES_AUTOMATICAS =
  'Permitir exclusões automáticas nesta conversa e pasta? A IA poderá enviar alvos da tarefa à Lixeira sem cartão individual, '
  + 'inclusive caminhos externos mencionados na sua instrução atual. Não autoriza exclusão permanente. '
  + 'Você pode desativar esta opção a qualquer momento.'

export function pedidoExclusoesAutomaticas(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Ativar “Permitir exclusões automáticas”?',
    detalhe: TEXTO_EXCLUSOES_AUTOMATICAS,
    confirmar: 'Ativar exclusões automáticas',
    rotuloAcessivel: 'Confirmar ativação de exclusões automáticas',
    testId: 'permissao-exclusoes-automaticas-confirm',
  })
}

/**
 * Compactação de contexto: gasta uma chamada ao modelo escolhido e preserva o
 * histórico original. Pergunta com uma linha + detalhe.
 */
export function pedidoCompactarContexto(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Compactar o contexto agora?',
    detalhe: 'A compactação faz uma chamada ao modelo selecionado. As mensagens originais ficam no histórico.',
    confirmar: 'Compactar',
    rotuloAcessivel: 'Confirmar compactação do contexto',
    testId: 'contexto-compactar-confirm',
  })
}
