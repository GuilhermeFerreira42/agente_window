// ============================================================================
// domain/pedidosArquivo.ts — pedidos de confirmação dos fluxos de ARQUIVO e
// DADOS do produto (anexos, memória do projeto, retomada operacional, versão
// salva). Antes eram `window.confirm`; os textos são os mesmos, agora num
// dono único e em diálogo interno.
//
// Regra preservada: nenhum destes pedidos decide nada sozinho. Quem transfere
// anexo, grava memória ou recarrega versão continua sendo o dono do fluxo;
// cancelar/Esc apenas não segue adiante.
// ============================================================================
import { pedidoDestrutivo, type PedidoDialogo, type PedidoEntrada } from './dialogoConfirmacao'

/** Anexos com texto: os arquivos ficam na conversa, mas não vão ao modelo. */
export const TEXTO_ESCOLHA_ANEXOS =
  'Os arquivos serão armazenados nesta conversa. O envio ao modelo não está disponível para esses arquivos nesta seleção. '
  + 'Continuar apenas com o texto? Os arquivos ficam disponíveis para download na conversa.'

export function pedidoEscolhaAnexos(nomes: readonly string[] = []): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Enviar só o texto e manter os arquivos anexados?',
    detalhe: TEXTO_ESCOLHA_ANEXOS + (nomes.length ? ` Apenas armazenados: ${nomes.join(', ')}.` : ''),
    confirmar: 'Continuar com o texto',
    rotuloAcessivel: 'Confirmar envio com anexos sem codec',
    testId: 'anexo-escolha-confirm',
  })
}

/** Gravar memória do projeto: dado persistido, confirmado antes de sair. */
export function pedidoGravarMemoria(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Guardar este texto na memória deste projeto?',
    detalhe: 'Confira se ele pode ser persistido: a memória fica salva com este projeto.',
    confirmar: 'Guardar memória',
    rotuloAcessivel: 'Confirmar gravação na memória do projeto',
    testId: 'memoria-gravar-confirm',
  })
}

/** Excluir memória: apaga o registro E todas as revisões. */
export function pedidoExcluirMemoria(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Excluir esta memória e todas as suas revisões?',
    detalhe: 'O texto e o histórico de revisões desta memória serão removidos. As demais memórias do projeto ficam intactas.',
    confirmar: 'Excluir memória',
    rotuloAcessivel: 'Confirmar exclusão da memória',
    testId: 'memoria-excluir-confirm',
  })
}

/** Retomar planejamento de uma tarefa interrompida (sem executar ferramentas). */
export function pedidoRetomarPlanejamento(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Iniciar um novo planejamento?',
    detalhe: 'Nenhuma ferramenta será executada: o planejamento apenas propõe os passos para você revisar.',
    confirmar: 'Retomar planejamento',
    rotuloAcessivel: 'Confirmar novo planejamento',
    testId: 'revisao-planejar-confirm',
  })
}

/** Recarregar a versão salva substitui as edições locais da conversa. */
export function pedidoRecarregarVersaoSalva(): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: 'Recarregar a versão salva desta conversa?',
    detalhe: 'Isso substituirá as edições locais desta conversa. Salve uma cópia antes se quiser mantê-las.',
    confirmar: 'Recarregar versão salva',
    rotuloAcessivel: 'Confirmar recarga da versão salva',
    testId: 'conversa-recarregar-confirm',
  })
}

/**
 * Grupo da sessão (substitui os dois `window.prompt` da barra de sessões):
 * mesmo nome do grupo atual, mesmas escolhas, agora em diálogo com campo.
 * `sugestoes` traz os grupos existentes; digitar um nome novo continua valendo.
 */
export function pedidoGrupoDaSessao(entrada: {
  titulo: string
  grupoAtual?: string
  gruposExistentes: readonly string[]
  /** `mover`: "Mover para grupo"; `atribuir`: "Nome do grupo". */
  modo: 'mover' | 'atribuir'
}): PedidoEntrada {
  const { titulo, grupoAtual, gruposExistentes, modo } = entrada
  const existentes = gruposExistentes.length
    ? `Grupos existentes: ${gruposExistentes.join(', ')}.`
    : 'Ainda não há grupos nesta lista.'
  const pedido = pedidoDestrutivo({
    mensagem: modo === 'mover' ? `Mover “${titulo}” para qual grupo?` : `Atribuir “${titulo}” a um grupo`,
    detalhe: `Digite o nome de um grupo existente ou crie um novo. ${existentes} A conversa não é renomeada nem movida de pasta.`,
    confirmar: modo === 'mover' ? 'Mover para grupo' : 'Atribuir grupo',
    rotuloAcessivel: `Grupo da sessão ${titulo}`,
    testId: 'sessao-grupo-prompt',
  })
  return {
    ...pedido,
    entrada: {
      rotulo: 'Nome do grupo',
      valorInicial: grupoAtual ?? '',
      sugestoes: gruposExistentes,
      limite: 80,
    },
  }
}

/** Remover do grupo é destrutivo para a organização, não para a conversa. */
export function pedidoRemoverDoGrupo(titulo: string, grupo: string): PedidoDialogo {
  return pedidoDestrutivo({
    mensagem: `Remover “${titulo}” do grupo “${grupo}”?`,
    detalhe: 'A conversa continua na lista, com todo o histórico. Apenas deixa de pertencer a este grupo.',
    confirmar: 'Remover do grupo',
    rotuloAcessivel: 'Confirmar remoção do grupo',
    testId: 'sessao-grupo-remover-confirm',
  })
}
