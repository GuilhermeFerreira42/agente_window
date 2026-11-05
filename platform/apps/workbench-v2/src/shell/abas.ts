// ============================================================================
// shell/abas.ts — FATIA 15, Onda 1 (SPEC 2I §2 entregáveis (a) e (d);
// docs/06 §"escopo técnico da unificação" itens 1 e 4; D144 §3.1 e §3.4).
//
// MODELO ÚNICO DE ABA e DONO NOVO da gestão de abas.
//
// Por que nasce no SHELL (D144 §3.4): gestão de abas é layout de Workbench sem
// IA. A regra de ouro do condomínio diz que o Bairro 1 funciona sem IA; uma casa
// no Bairro 2 faria o layout depender de inteligência, invertendo a dependência.
//
// Por que fundir aqui e não dentro do módulo (D144, decisão 1): `core/**` do
// módulo é intocável (regra dura 2) e o `AttachTab` continua interno a ele,
// adaptado na fronteira. Regra 8 (LEGO): reposicionar, nunca reescrever. Os
// algoritmos de MRU, preview único e bloqueio de dirty abaixo ESPELHAM
// `core/editor/editorService.ts` — espelhar, não reinventar. Aquele serviço tem
// 21 testes que atravessam as quatro ondas sem nenhuma linha alterada; se este
// arquivo divergir dele, a divergência é bug deste arquivo.
//
// A diferença estrutural que a fusão resolve: o modelo do centro era por **id**
// (`types.ts` EditorTab) e o do anexo era por **uri** (`editorService`). O modelo
// único é por id e carrega a uri como dado, porque id é o que o React e a
// persistência do App já usam, e uri é o que a fronteira com o módulo precisa.
//
// PURO: zero DOM, zero React, zero import do módulo.
// ============================================================================
import type { EditorTab } from '../types'

/**
 * Aba do modelo único: o `EditorTab` do centro acrescido do que só o modelo do
 * anexo tinha.
 *
 * D144 (tensão central): o estado deixa de ser preservado por MONTAGEM
 * PERMANENTE (Regra 10, aposentada nesta fatia) e passa a ser preservado por
 * MODELO. A carga desta interface É a prova — RF15-2 pede que abas irmãs
 * alternem sem perder estado, e RF15-4 pede que o F5 restaure abas e modos;
 * ambos só são possíveis se a aba carregar o próprio estado.
 */
export interface Aba extends EditorTab {
  /**
   * URI canônica do recurso. Fronteira com o módulo: abas sintéticas (Changes,
   * Diff) usam a uri sintética que o `editorService` já define. Ausente em abas
   * que não têm recurso de disco (ex.: Provedores, Personalizações).
   */
  readonly uri?: string
  /**
   * Conteúdo não salvo. O texto em edição vive em `content` (herdado), que é o
   * campo que o App já persiste — não se cria um segundo campo para a mesma
   * coisa. RF15-1: salvar sem F5.
   */
  readonly dirty?: boolean
  /**
   * Clique simples abre em preview (itálico); o próximo preview SUBSTITUI o
   * anterior NA MESMA POSIÇÃO; duplo clique, `pinned` ou edição promovem a
   * pinado (`preview: false`).
   */
  readonly preview?: boolean
}

/**
 * A coleção é o estado do dono: abas + ordem de uso. Manter o MRU FORA da aba é
 * deliberado — MRU é propriedade da coleção, e colocá-lo na aba obrigaria a
 * reescrever todas as abas a cada ativação.
 */
export interface ColecaoDeAbas {
  readonly abas: readonly Aba[]
  /** Ids, mais recentemente usada primeiro. */
  readonly mru: readonly string[]
}

export const COLECAO_VAZIA: ColecaoDeAbas = { abas: [], mru: [] }

/**
 * Ordem de uso: `id` vai para a frente, sem acumular duplicata. Espelha a linha
 * do `editorService.setActive` (`mru = [uri, ...mru.filter(u => u !== uri)]`).
 * Existe separada de `registrarAbaAtiva` porque quem guarda o MRU fora da
 * coleção (o App, num ref) precisa atualizar só a ordem, sem forjar coleção.
 */
export function registrarUso(mru: readonly string[], id: string | undefined): readonly string[] {
  if (!id) return mru
  return [id, ...mru.filter((cada) => cada !== id)]
}

/** Espelha `editorService.setActive`: a aba ativada vai para a frente do MRU. */
export function registrarAbaAtiva(colecao: ColecaoDeAbas, id: string | undefined): ColecaoDeAbas {
  if (!id) return colecao
  return { abas: colecao.abas, mru: registrarUso(colecao.mru, id) }
}

/**
 * Monta a coleção de um ESCOPO (as abas visíveis de uma sessão, ou as abas de um
 * dono) a partir de um MRU que é global ao App. Filtrar o MRU para as candidatas
 * é o que impede uma aba de outra sessão — invisível no escopo — de ganhar o foco
 * só por ter sido usada recentemente. Sem o filtro, a sucessão MRU vazaria entre
 * sessões e quebraria "um grupo por sessão".
 */
export function colecaoParaEscopo(abas: readonly Aba[], mru: readonly string[]): ColecaoDeAbas {
  return { abas, mru: mru.filter((id) => abas.some((aba) => aba.id === id)) }
}

/**
 * Regra de dono (docs/06: "uma superfície por tipo, com dono: sessão ou
 * global"). Espelha `browserOwnership.getEditorTabsVisibleForSession`: aba que
 * declara dono pertence àquela sessão; aba SEM dono é global e aparece em todas.
 * Os 10 testes de `sessionState.test.ts` são a especificação executável disto.
 */
export function abasVisiveisParaSessao(colecao: ColecaoDeAbas, sessionId: string | undefined): readonly Aba[] {
  if (!sessionId) return colecao.abas.filter((aba) => !aba.sessionId)
  return colecao.abas.filter((aba) => !aba.sessionId || aba.sessionId === sessionId)
}

/**
 * A aba pedida vence quando ainda é visível; senão a primeira é o fallback
 * determinístico dos caminhos de vazio/restauração. Mesmo contrato do
 * `resolveVisibleEditorTabId` que substitui.
 */
export function resolverAbaVisivel(abas: readonly Aba[], pedidaId?: string): string | undefined {
  return abas.find((aba) => aba.id === pedidaId)?.id ?? abas[0]?.id
}

/**
 * Sucessão ao fechar a aba ativa: **MRU primeiro**, e só na falta dele a vizinha
 * da posição que a aba ocupava. Espelha `editorService.close` linha por linha:
 * `mru[0] ?? tabs[min(idx, tabs.length - 1)]?.uri ?? null`.
 *
 * D144 §3.1: conviviam duas políticas — o centro ativava a vizinha da direita, o
 * anexo ativava a MRU. Prevalece a MRU, que é o comportamento do VS Code e já
 * estava implementada e testada no módulo que a Regra 8 manda reposicionar.
 *
 * `abasAposFecho` e `mruAposFecho` são as coleções JÁ sem a aba fechada, na mesma
 * ordem em que o serviço as calcula. Fechar aba inativa não rouba o foco.
 */
export function resolverSucessora(entradas: {
  abasAposFecho: readonly Aba[]
  mruAposFecho: readonly string[]
  indiceDaFechada: number
}): string | undefined {
  const { abasAposFecho, mruAposFecho, indiceDaFechada } = entradas
  if (mruAposFecho.length > 0) return mruAposFecho[0]
  if (abasAposFecho.length === 0) return undefined
  return abasAposFecho[Math.min(indiceDaFechada, abasAposFecho.length - 1)]?.id
}

/** Uma aba só é fechável se não está dirty — ou se o chamador forçou. */
export function abaFechavel(aba: Aba, opts?: { force?: boolean }): boolean {
  return !aba.dirty || opts?.force === true
}

export interface ResultadoDeFecharAba {
  readonly colecao: ColecaoDeAbas
  /**
   * Id da aba que deve virar ativa. `undefined` = não há sucessora (a coleção
   * esvaziou) ou a aba fechada não era a ativa (a ativa se mantém, e o chamador
   * não deve trocar nada).
   */
  readonly sucessoraId?: string
  /** true = a aba está dirty e o fechamento foi BLOQUEADO (nada mudou). */
  readonly bloqueado: boolean
  /** true = a aba pedida não existia (no-op, como o serviço: retorna sucesso). */
  readonly inexistente: boolean
}

/**
 * Fecha uma aba. Espelha `editorService.close`, incluindo as duas proteções que
 * os 21 testes do serviço já cobrem: dirty sem `force` BLOQUEIA (c5 mostra o
 * diálogo) e fechar aba inativa não rouba o foco da ativa.
 *
 * Substitui o guard antigo `isTabCloseable(aba, 'detail-only')`: aquele existia
 * para impedir fechar Changes/Files quando a coluna era a única superfície. Com
 * a coluna aposentada não há mais superfície única — tudo é aba irmã na mesma
 * barra, e o que protege o trabalho não salvo é o dirty, não o estado do painel.
 */
export function fecharAba(
  colecao: ColecaoDeAbas,
  id: string,
  ativaId?: string,
  opts?: { force?: boolean },
): ResultadoDeFecharAba {
  const indice = colecao.abas.findIndex((aba) => aba.id === id)
  if (indice < 0) return { colecao, bloqueado: false, inexistente: true }

  const fechando = colecao.abas[indice]
  if (!abaFechavel(fechando, opts)) return { colecao, bloqueado: true, inexistente: false }

  const abas = colecao.abas.filter((aba) => aba.id !== id)
  const mru = colecao.mru.filter((cada) => cada !== id)
  const eraAtiva = ativaId === id
  const sucessoraId = eraAtiva
    ? resolverSucessora({ abasAposFecho: abas, mruAposFecho: mru, indiceDaFechada: indice })
    : undefined

  return { colecao: { abas, mru }, sucessoraId, bloqueado: false, inexistente: false }
}

export interface ResultadoDeAbrirAba {
  readonly colecao: ColecaoDeAbas
  /** Id da aba que deve virar ativa (sempre existe após abrir). */
  readonly ativaId: string
  /** Id da aba que o preview substituiu, se houve substituição. */
  readonly substituidaId?: string
}

/**
 * Abre (ou foca) uma aba. Espelha `editorService.open` no que é política de aba:
 *
 * - já existe (mesmo id) → foca; `pinned: true` promove um preview a pinado;
 * - preview novo → SUBSTITUI o preview anterior não-dirty NA MESMA POSIÇÃO
 *   (por isso a faixa não cresce a cada clique simples na árvore);
 * - um preview dirty nunca é substituído (trabalho não salvo não se perde);
 * - pinado novo → entra ao final da faixa.
 *
 * A aba aberta vira ativa e vai para a frente do MRU.
 */
export function abrirAba(
  colecao: ColecaoDeAbas,
  aba: Aba,
  opts?: { pinned?: boolean },
): ResultadoDeAbrirAba {
  const existente = colecao.abas.find((cada) => cada.id === aba.id)
  if (existente) {
    const promove = opts?.pinned === true && existente.preview === true
    const abas = promove
      ? colecao.abas.map((cada) => (cada.id === aba.id ? { ...cada, preview: false } : cada))
      : colecao.abas
    return { colecao: { abas, mru: colecao.mru }, ativaId: aba.id }
  }

  const preview = opts?.pinned !== true
  const nova: Aba = { ...aba, preview }
  const indiceDoPreview = preview
    ? colecao.abas.findIndex((cada) => cada.preview === true && !cada.dirty)
    : -1

  if (indiceDoPreview >= 0) {
    const substituida = colecao.abas[indiceDoPreview]
    const abas = colecao.abas.map((cada, indice) => (indice === indiceDoPreview ? nova : cada))
    const mru = [nova.id, ...colecao.mru.filter((cada) => cada !== substituida.id && cada !== nova.id)]
    return { colecao: { abas, mru }, ativaId: nova.id, substituidaId: substituida.id }
  }

  return {
    colecao: { abas: [...colecao.abas, nova], mru: [nova.id, ...colecao.mru.filter((cada) => cada !== nova.id)] },
    ativaId: nova.id,
  }
}

/** Duplo clique / "Keep Open": preview vira pinado, sem mudar a posição. */
export function promoverAba(colecao: ColecaoDeAbas, id: string): ColecaoDeAbas {
  return {
    abas: colecao.abas.map((aba) => (aba.id === id && aba.preview ? { ...aba, preview: false } : aba)),
    mru: colecao.mru,
  }
}

/**
 * Editar promove o preview (pin on edit, `editorService.markDirty`) e marca o
 * dirty. É o que faz RF15-2 ser possível: a aba que está sendo editada nunca é
 * substituída pelo próximo clique simples na árvore.
 */
export function marcarEdicao(
  colecao: ColecaoDeAbas,
  id: string,
  entradas: { content?: string; dirty?: boolean },
): ColecaoDeAbas {
  return {
    abas: colecao.abas.map((aba) => {
      if (aba.id !== id) return aba
      const proxima: Aba = {
        ...aba,
        content: entradas.content ?? aba.content,
        dirty: entradas.dirty ?? true,
      }
      // editar promove o preview (pin on edit)
      return proxima.dirty ? { ...proxima, preview: false } : proxima
    }),
    mru: colecao.mru,
  }
}

// ---------------------------------------------------------------------------
// Máquina de estados do painel: 4 → 2 (SPEC 2I §2 (d); docs/06 item 4:
// "simplifica de 4 estados → 2 ('tem abas / não tem')").
//
// Os quatro estados antigos (`domain/sidePane.ts`) eram
// editor+detail | editor-only | detail-only | closed, e existiam para descrever
// a convivência entre o editor do centro e a COLUNA de detalhes. Sem a coluna,
// três deles deixam de ter objeto:
//
//   • `detail-only` não é mais um modo de layout — é simplesmente "a aba ativa é
//     Changes/Files". Passa a ser DADO, não ESTADO.
//   • `editor+detail` × `editor-only` distinguia coluna aberta de coluna fechada;
//     não há coluna.
//   • `editorHidden` (esconder o conteúdo mantendo a faixa de abas) perde o
//     sentido: com uma barra só, ter abas É ver o conteúdo da aba ativa.
//
// Sobram dois, e são exatamente os que a SPEC nomeia.
// ---------------------------------------------------------------------------

/** Os dois estados do painel central, na formulação literal da SPEC. */
export type EstadoDoPainel = 'tem-abas' | 'sem-abas'

export function resolverEstadoDoPainel(abas: readonly Aba[]): EstadoDoPainel {
  return abas.length > 0 ? 'tem-abas' : 'sem-abas'
}

/** Com abas, o conteúdo da aba ativa é renderizado. Sem abas, não há o que mostrar. */
export function conteudoDoEditorVisivel(abas: readonly Aba[]): boolean {
  return resolverEstadoDoPainel(abas) === 'tem-abas'
}

/**
 * A faixa de abas é invariante do painel: existe quando o painel existe. Nos
 * dois estados ela coincide com o conteúdo — é o colapso 4→2 aparecendo aqui.
 */
export function barraDeAbasVisivel(abas: readonly Aba[]): boolean {
  return resolverEstadoDoPainel(abas) === 'tem-abas'
}

/** O chat só se centraliza na banda de 950px quando é a única superfície. */
export function chatCentralizado(abas: readonly Aba[]): boolean {
  return resolverEstadoDoPainel(abas) === 'sem-abas'
}
