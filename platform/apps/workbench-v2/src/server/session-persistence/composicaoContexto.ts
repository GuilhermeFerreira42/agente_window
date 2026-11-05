// ============================================================================
// Prefeitura — COMPOSIÇÃO DE CONTEXTO (DP-06 / D141, decisões E-2 e E-3).
//
// DP-06 diz três coisas e este módulo obedece às três: o SERVIDOR compõe (não o
// browser), a PREFEITURA é o endereço (não dona da regra), e cada fato tem UM
// DONO. Aqui nenhuma regra de negócio é reinventada — o módulo apenas pergunta a
// cada dona pelo seu fato e entrega o resultado pronto para a casa Agir.
//
// Donos dos fatos nesta composição:
//   raiz / território → a sessão persistida (`agirContext.ts`). NUNCA o browser.
//   skills e ferramentas → a casa Personalizações.
//   histórico → o browser, nesta fatia. Ver `fonteHistorico` abaixo.
//
// É irmão de `chatAlvo.ts` pelo mesmo motivo: os dois resolvem um fato que a casa
// Agir precisa e não pode pedir ao browser.
//
// E-3: a composição é feita em etapas ADITIVAS e cada etapa reporta a própria
// FONTE, para que tela e log possam dizer de onde veio cada fato em vez de
// esconder. A Fatia 14 liga apenas a ETAPA 1 (skills invocadas + ferramentas
// permitidas). As etapas seguintes entram sem mudar esta assinatura — por isso o
// resultado é um objeto com campos nomeados, e não uma tupla.
// ============================================================================
import type { InstrucaoDeProduto } from '../../bairros/2-inteligencia/casas/agir'
// Importa do CONTRACT da casa, não do barrel: o barrel também exporta a tela
// React, e a prefeitura roda no servidor — puxar React e CSS para dentro do grafo
// do servidor por causa de duas constantes seria um defeito gratuito. É o mesmo
// motivo pelo qual a prefeitura importa `config/server/repo` direto.
import { ESTADO_PADRAO, FONTE_PADRAO_NOME_SKILL } from '../../bairros/2-inteligencia/casas/personalizacoes/contract'
import type { EstadoPersonalizacoes, Skill } from '../../bairros/2-inteligencia/casas/personalizacoes/contract'
import { lerEstado } from '../../bairros/2-inteligencia/casas/personalizacoes/server/estado'
import { ferramentasPermitidas } from '../../bairros/2-inteligencia/casas/personalizacoes/server/ferramentas'
import { descobrirSkills, resolverInvocacao } from '../../bairros/2-inteligencia/casas/personalizacoes/server/skills'

/**
 * Onde o histórico nasceu (E-3, reporte da fonte).
 *
 * Na Fatia 14 é SEMPRE `'browser'`: o histórico continua chegando pelo payload de
 * `/api/agir`, como antes. Este campo existe para que a migração do histórico
 * para o servidor seja visível quando acontecer, em vez de trocar de dono em
 * silêncio. Nada aqui lê nem grava transcript — essa é uma etapa posterior.
 */
export type FonteHistorico = 'browser'

export interface PedidoComposicao {
  /** Texto da mensagem nova do dono. É dele que sai o `/nome` (RF14-2). */
  texto: string
  /**
   * Raiz de projeto resolvida pela SESSÃO PERSISTIDA (F1/D113). `null` = só o
   * escopo de usuário existe; nenhuma raiz é deduzida a partir daqui.
   */
  raizProjeto: string | null
  /**
   * Costura de teste: raiz das skills do USUÁRIO. Em produção fica `undefined` e
   * vale a raiz real da casa Personalizações. Existe para que a prova não
   * dependa do conteúdo do diretório home de quem a roda.
   *
   * Não é uma porta aberta ao browser: quem constrói este objeto é a casa Agir,
   * com um literal de dois campos (`texto` e `raizProjeto`). O payload HTTP nunca
   * é espalhado aqui.
   */
  raizUsuario?: string
}

export interface ComposicaoContexto {
  /** O que vai ao modelo pelo canal nativo de sistema. Vazia = nenhuma instrução. */
  instrucoesDeProduto: InstrucaoDeProduto[]
  /** Ids efetivamente injetados, na ordem da mensagem. Para auditoria e para a tela. */
  skillsInvocadas: string[]
  /**
   * Nomes que o dono invocou e NÃO puderam ser injetados — skill inexistente,
   * desligada ou com erro (RF14-1/RF14-3). A tela pode dizer a verdade em vez de
   * o dono achar que a skill funcionou.
   */
  invocacoesIgnoradas: string[]
  /**
   * Ferramentas que o anúncio ao modelo pode incluir (RF14-4). Sempre uma lista
   * concreta, nunca `undefined`: aqui o estado É conhecido. `undefined` só é
   * admitido no contrato da casa Agir para chamadores antigos.
   */
  ferramentasPermitidas: string[]
  fonteHistorico: FonteHistorico
  /**
   * Problemas encontrados ao compor, em português legível. Vazio = composição
   * limpa. RNF14-2: um problema aqui NUNCA derruba a execução — é reportado.
   */
  falhas: string[]
}

/**
 * `/nome` é invocação só no começo da mensagem ou após espaço, e seguido de
 * espaço ou fim de texto. A fronteira evita que um caminho como `/home/user`
 * vire invocação de uma skill chamada `home` no meio de uma frase.
 *
 * O padrão de nome é o MESMO do contrato da casa Personalizações — nenhuma
 * segunda definição de nome válido nasce aqui.
 */
export function nomesInvocados(texto: string): string[] {
  // Regex global tem `lastIndex` mutável: uma instância nova por chamada, senão
  // a segunda chamada começaria do meio do texto.
  // A FONTE sem âncoras é usada de propósito: compor com `PADRAO_NOME_SKILL.source`
  // enfiaria `^` e `$` no meio do padrão e nada jamais casaria.
  const padrao = new RegExp(`(?:^|\\s)/(${FONTE_PADRAO_NOME_SKILL})(?=\\s|$)`, 'g')
  const nomes: string[] = []
  let achado: RegExpExecArray | null = padrao.exec(texto)
  while (achado !== null) {
    const nome = achado[1]
    if (nome && !nomes.includes(nome)) nomes.push(nome)
    achado = padrao.exec(texto)
  }
  return nomes
}

/**
 * Compõe o contexto de produto para UMA execução (etapa 1 de E-3).
 *
 * Não lança. Um estado ilegível degrada para o padrão documentado ("ausente =
 * padrão") e é reportado em `falhas`; a rota própria de Personalizações devolve
 * 409 à tela, então o dono vê o problema — ele não é engolido aqui.
 *
 * Sobre a segurança dessa degradação: o liga/desliga de ferramentas filtra o
 * ANÚNCIO ao modelo, não a autorização. `excluir`, `criar`, `escrever` e
 * `executar` continuam passando pelo fluxo de aprovação e pelo nível de permissão
 * da sessão, que são de outra dona e não são tocados por este módulo. Portanto
 * degradar para o catálogo completo não libera nenhuma ação: apenas volta a
 * anunciar o que a autorização já governa.
 */
export async function comporContexto(pedido: PedidoComposicao): Promise<ComposicaoContexto> {
  const falhas: string[] = []

  let estado: EstadoPersonalizacoes
  try {
    estado = await lerEstado()
  } catch (erro) {
    estado = ESTADO_PADRAO
    falhas.push(erro instanceof Error ? erro.message : String(erro))
  }

  // `descobrirSkills` já é tolerante: skill com frontmatter torto volta marcada
  // como `com_erro` e a lista continua de pé (RF14-3). Não precisa de try aqui.
  const skills: Skill[] = await descobrirSkills(pedido.raizProjeto, estado, pedido.raizUsuario)

  const instrucoesDeProduto: InstrucaoDeProduto[] = []
  const skillsInvocadas: string[] = []
  const invocacoesIgnoradas: string[] = []

  for (const nome of nomesInvocados(pedido.texto)) {
    const skill = resolverInvocacao(skills, nome)
    if (!skill) {
      // Inexistente, desligada ou com erro: nada é injetado (RF14-1, RNF14-2).
      invocacoesIgnoradas.push(nome)
      continue
    }
    // O mesmo `/nome` citado duas vezes injeta uma vez só.
    if (instrucoesDeProduto.some((instrucao) => instrucao.id === skill.id)) continue
    instrucoesDeProduto.push({ origem: 'skill', id: skill.id, nome: skill.nome, corpo: skill.corpo })
    skillsInvocadas.push(skill.id)
  }

  return {
    instrucoesDeProduto,
    skillsInvocadas,
    invocacoesIgnoradas,
    ferramentasPermitidas: ferramentasPermitidas(estado),
    fonteHistorico: 'browser',
    falhas,
  }
}

/**
 * Atalho para quem só precisa do filtro de ferramentas (RF14-4) sem compor
 * instrução. Mesma regra de não lançar: estado ilegível degrada para o padrão e
 * devolve o catálogo completo, pelo motivo documentado em `comporContexto`.
 */
export async function comporFerramentasPermitidas(): Promise<string[]> {
  try {
    return ferramentasPermitidas(await lerEstado())
  } catch {
    return ferramentasPermitidas(ESTADO_PADRAO)
  }
}
