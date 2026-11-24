// ============================================================================
// domain/dialogoConfirmacao.ts — DIÁLOGOS INTERNOS DA APLICAÇÃO: decisão pura.
//
// Por que existe: até a U-2 as confirmações de risco usavam
// `window.confirm`/`alert`/`prompt`. Pop-up nativo do navegador
//   · ignora o tema da aplicação (não combina com a janela);
//   · não pode ser estilizado, testado por leitor de tela nem por Playwright;
//   · bloqueia a thread e, em alguns runtimes, abre janela do SISTEMA
//     (o caso relatado da Lixeira do Windows);
//   · não devolve o foco ao acionador com previsibilidade.
//
// Este módulo é PURO: decide o PEDIDO (texto, tom, botões, rótulos de
// acessibilidade) e a RESPOSTA (o que cada escolha significa). Não importa
// React, não toca no DOM, não executa efeito nenhum. Quem desenha é
// `shell/DialogoConfirmacao.tsx`; quem orquestra é
// `shell/confirmacaoDialogo.ts`.
// ============================================================================

/** Tom visual do pedido — só muda o ícone; o texto nunca depende só da cor. */
export type TomDialogo = 'pergunta' | 'aviso'

/** Um botão do diálogo. `primario` recebe o foco inicial. */
export interface BotaoDialogo {
  id: string
  rotulo: string
  /** `perigo` = ação destrutiva; pinta com o vermelho de erro do tema. */
  variacao?: 'primario' | 'secundario' | 'perigo'
}

/**
 * Pedido de decisão. `mensagem` é a pergunta (uma linha, sem quebra);
 * `detalhe` explica a consequência e aceita `\n` (o CSS usa `pre-wrap`);
 * `rotuloAcessivel` nomeia o diálogo para leitores de tela e para o teste.
 */
export interface PedidoDialogo {
  mensagem: string
  detalhe?: string
  tom?: TomDialogo
  /** Nomeia a barra de ações do modal. O nome ACESSÍVEL do diálogo é a
   *  própria `mensagem`: o leitor de tela anuncia o que está em jogo. */
  rotuloAcessivel: string
  /** Rótulo do botão de fuga (Esc/clique fora). Padrão: `Cancelar`. */
  cancelar?: string
  /** Sequência na ORDEM VISUAL (o CSS alinha à direita). */
  botoes: BotaoDialogo[]
  testId: string
}

/** Resposta: o id do botão escolhido, ou `null` quando o dono fechou sem escolher. */
export type RespostaDialogo = string | null

/**
 * Pedido com CAMPO de texto (substitui `window.prompt`). Resposta é o texto
 * digitado (trim) quando o botão de confirmação é escolhido; `null` em fuga.
 * O campo nunca vem preenchido com segredo: só o valor atual do dono.
 */
export interface PedidoEntrada extends PedidoDialogo {
  entrada: {
    rotulo: string
    valorInicial?: string
    /** Sugestões viram `datalist`: digitar livre continua possível. */
    sugestoes?: readonly string[]
    /** Texto de apoio abaixo do campo (ex.: grupos existentes). */
    ajuda?: string
    limite?: number
  }
}

/** Resposta de um pedido com entrada: texto confirmado, ou `null` na fuga. */
export type RespostaEntrada = string | null

/** Normaliza e valida o pedido. Falha alto: diálogo sem botão não existe. */
export function normalizarPedido(pedido: PedidoDialogo): PedidoDialogo {
  const mensagem = pedido.mensagem.trim()
  if (!mensagem) throw new Error('Diálogo sem mensagem: o dono precisa dizer o que está em jogo.')
  if (pedido.botoes.length === 0) throw new Error('Diálogo sem botões: o dono precisa oferecer uma saída.')
  const ids = new Set<string>()
  for (const botao of pedido.botoes) {
    if (!botao.id) throw new Error('Diálogo com botão sem id.')
    if (ids.has(botao.id)) throw new Error(`Diálogo com id de botão repetido: ${botao.id}`)
    ids.add(botao.id)
  }
  const primarios = pedido.botoes.filter((botao) => botao.variacao === 'primario')
  if (primarios.length > 1) throw new Error('Diálogo com mais de um botão primário: o foco inicial seria ambíguo.')
  return {
    ...pedido,
    mensagem,
    detalhe: pedido.detalhe?.trim() ? pedido.detalhe : undefined,
    tom: pedido.tom ?? 'pergunta',
    cancelar: pedido.cancelar ?? 'Cancelar',
  }
}

/** Rótulo do botão que recebe foco ao abrir: o primário; sem ele, o primeiro. */
export function botaoInicial(pedido: PedidoDialogo): BotaoDialogo {
  return pedido.botoes.find((botao) => botao.variacao === 'primario') ?? pedido.botoes[0]
}

/** O que Esc/clique no fundo/✕ devolve: nunca um botão — fuga é `null`. */
export const RESPOSTA_FUGA: RespostaDialogo = null

/**
 * Diálogo de uma única saída explícita (`alert` legado): um botão só.
 * O dono continua livre para chamar `confirmar` quando precisa de recusa.
 */
export function pedidoDeAviso(mensagem: string, rotuloAcessivel: string, testId: string, detalhe?: string): PedidoDialogo {
  return normalizarPedido({
    mensagem, detalhe, tom: 'pergunta', rotuloAcessivel, testId,
    botoes: [{ id: 'ok', rotulo: 'OK', variacao: 'primario' }],
  })
}

/**
 * Confirmação com texto do DONO do fluxo (ex.: acesso ao histórico, que já
 * escreve a pergunta e as consequências). A primeira linha é a pergunta; o
 * resto vira detalhe. Foco inicial em Cancelar: sem escolha, nada acontece.
 */
export function pedidoDeConfirmacao(entrada: {
  texto: string
  confirmar: string
  rotuloAcessivel: string
  testId: string
  detalhe?: string
}): PedidoDialogo {
  const [primeira, ...resto] = entrada.texto.split('\n')
  const cauda = resto.join('\n').trim()
  return pedidoDestrutivo({
    mensagem: primeira.trim(),
    detalhe: entrada.detalhe ?? (cauda || undefined),
    confirmar: entrada.confirmar,
    rotuloAcessivel: entrada.rotuloAcessivel,
    testId: entrada.testId,
  })
}

/**
 * Confirmação destrutiva: foco inicial em CANCELAR (o padrão seguro, como no
 * diálogo de exclusão permanente do Explorer) e ação perigosa à direita.
 */
export function pedidoDestrutivo(entrada: {
  mensagem: string
  detalhe?: string
  confirmar: string
  cancelar?: string
  rotuloAcessivel: string
  testId: string
}): PedidoDialogo {
  return normalizarPedido({
    mensagem: entrada.mensagem,
    detalhe: entrada.detalhe,
    tom: 'aviso',
    rotuloAcessivel: entrada.rotuloAcessivel,
    cancelar: entrada.cancelar,
    testId: entrada.testId,
    botoes: [
      { id: 'cancelar', rotulo: entrada.cancelar ?? 'Cancelar', variacao: 'primario' },
      { id: 'confirmar', rotulo: entrada.confirmar, variacao: 'perigo' },
    ],
  })
}
