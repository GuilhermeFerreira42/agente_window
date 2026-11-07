// ============================================================================
// shell/identidadeDaAba.ts — FATIA 15, RNF15-2 (D172).
//
// A ultima decisao de "gestao de abas" que ainda morava no App: QUEM e a aba que
// eu vou abrir?
//
// Hoje o `openEditorTab` do App decide tres coisas de politica antes de mexer em
// estado:
//
//   1. de quem e a aba (sessao dona) — regra de escopo por TIPO de aba;
//   2. se ja existe aba desse tipo/arquivo naquele escopo (reusar em vez de abrir);
//   3. qual e o id canonico de uma aba nova (colisao de id no mesmo ms).
//
// Nenhuma das tres e' do sindico: sao politica de Workbench, do Bairro 1, sem IA.
// Estavam no App porque o App era o dono do estado — e ele deixou de ser (D144).
//
// Este modulo e' PURO: nao importa React, nao toca estado, nao conhece o modulo.
// Ele apenas responde perguntas. Quem aplica e' o App.
//
// Regra 8 (LEGO): isto NAO reescreve `abas.ts`. `abrirAba` continua sendo o lugar
// que aplica preview/substituicao/promocao. Aqui mora so a IDENTIDADE — o que
// faz o App parar de decidir "quem sou eu" no meio do useEffect.
// ============================================================================
import type { EditorTab } from '../types'

/** Uma aba nova, ja identificada, pronta para entrar na colecao. */
export interface AbaIdentificada {
  readonly id: string
  readonly type: EditorTab['type']
  readonly title: string
  readonly path?: string
  readonly sessionId?: string
  readonly content?: string
  readonly isRealFile?: boolean
  readonly imagePreview?: EditorTab['imagePreview']
  readonly readError?: string
}

export interface PedidoDeAba {
  readonly type: EditorTab['type']
  readonly title: string
  readonly path?: string
  readonly sessionId?: string
  readonly content?: string
  readonly isRealFile?: boolean
  readonly imagePreview?: EditorTab['imagePreview']
  readonly readError?: string
}

/**
 * De quem e' a aba. Abas de ambiente (browser/diff) pertencem a sessao ativa;
 * arquivo/resultado-de-busca so pertencem a uma sessao quando o chamador diz
 * explicitamente. Provedores, config e personalizacoes sao globais.
 *
 * MEDIDO, nao inventado: estas tres linhas eram literalmente o corpo do
 * `openEditorTab` do App antes desta migracao.
 */
export function sessaoDonaDaAba(
  pedido: Pick<PedidoDeAba, 'type' | 'sessionId'>,
  sessaoAtivaId: string,
): string | undefined {
  return pedido.sessionId ?? (pedido.type === 'browser' || pedido.type === 'diff' ? sessaoAtivaId : undefined)
}

/**
 * A aba que este pedido REUSA, se houver. Duas abas do mesmo tipo nao colidem se
 * forem de sessoes diferentes; duas abas `file` nao colidem se forem de arquivos
 * diferentes (o `path` e' a identidade do arquivo).
 *
 * Devolve a primeira correspondencia — a faixa nao admite dois arquivos iguais no
 * mesmo escopo, e se ja houver dois o primeiro e' o dono historico.
 */
export function abaExistentePara(
  abas: readonly EditorTab[],
  pedido: Pick<PedidoDeAba, 'type' | 'path' | 'sessionId'>,
  sessaoAtivaId: string,
): EditorTab | undefined {
  const dono = sessaoDonaDaAba(pedido, sessaoAtivaId)
  const tipo = pedido.type
  return abas.find(
    (aba) =>
      aba.type === tipo &&
      (tipo !== 'file' || aba.path === pedido.path) &&
      (!dono || aba.sessionId === dono),
  )
}

/**
 * Id canonico de uma aba nova: `<tipo>-<ms>-<sequencia>`.
 *
 * A sequencia resolve colisao no MESMO milissegundo (duas abas abertas pelo mesmo
 * efeito, ou um F5 que reabre varias de uma vez). Sem ela, duas abas nascem com o
 * mesmo id e a segunda some da faixa — bug silencioso, dificil de reproduzir.
 *
 * `sequencia` e' injetada (o App passa o contador dele) para o modulo continuar
 * puro e testavel sem relogio.
 */
export function idDeAbaNova(tipo: EditorTab['type'], agoraMs: number, sequencia: number): string {
  return `${tipo}-${agoraMs}-${sequencia}`
}

/**
 * Materializa o pedido numa aba pronta. `isRealFile` e' derivado: uma aba com
 * conteudo carregado ou preview de imagem veio do disco real. Sem conteudo, so
 * faz sentido chamar de "arquivo real" se o chamador afirmar que e'.
 */
export function montarAba(pedido: PedidoDeAba, sessaoAtivaId: string, id: string): AbaIdentificada {
  return {
    id,
    type: pedido.type,
    title: pedido.title,
    path: pedido.path,
    sessionId: sessaoDonaDaAba(pedido, sessaoAtivaId),
    content: pedido.content,
    isRealFile: pedido.isRealFile ?? (!!pedido.content || !!pedido.imagePreview),
    imagePreview: pedido.imagePreview,
    readError: pedido.readError,
  }
}

/**
 * Os campos que devem ser SOBRESCRITOS quando a aba reusada recebe conteudo novo.
 *
 * `content` e `readError` sao mutuamente exclusivos: o estado novo sempre
 * substitui o anterior, senao um erro de leitura antigo fica pendurado numa aba
 * que ja carregou bem (ou o contrario — um conteudo fantasma numa aba que falhou).
 * `isRealFile` so e' reescrito quando o chamador afirma algo.
 *
 * Devolve `undefined` quando nada muda — evita re-render e evita `setEditorTabs`
 * a toa (o que, no pior caso, descartaria edicao nao salva).
 */
export function atualizacaoDeAbaReusada(
  existente: Pick<EditorTab, 'content' | 'isRealFile' | 'readError'>,
  pedido: Pick<PedidoDeAba, 'content' | 'isRealFile' | 'readError'>,
): { content?: string; readError?: string; isRealFile?: boolean } | undefined {
  const temErro = !!pedido.readError
  const conteudoMudou = pedido.content !== undefined && pedido.content !== existente.content
  if (!temErro && !conteudoMudou) return undefined
  return {
    content: pedido.content,
    readError: pedido.readError,
    isRealFile: pedido.isRealFile ?? existente.isRealFile,
  }
}
