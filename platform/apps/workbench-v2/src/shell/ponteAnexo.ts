// ============================================================================
// shell/ponteAnexo.ts — FATIA 15, Onda 2, passo 2a (D146: contrato da fusão).
//
// A FRONTEIRA entre os dois modelos de aba. D144 decisão 1: o modelo fundido
// nasce no SHELL e o `AttachTab` permanece interno ao módulo, ADAPTADO aqui.
// Regra dura 2 (`core/**` e `server/**` intocáveis) e Regra 8 (LEGO: reposicionar,
// nunca reescrever) são respeitadas por construção: este arquivo só LÊ tipos do
// módulo e só ESCREVE no modelo do shell.
//
// Os `import type` vêm do barrel público do módulo, que reexporta o contract
// (`index.ts: export type * from './contract'`). São apagados na compilação, então
// não há dependência de runtime do shell para o módulo — e nada aqui alcança
// `core/uri`, cujo `uriBasename` o barrel não exporta.
//
// PURO: zero DOM, zero React, zero efeito.
// ============================================================================
import type { AttachTab } from '../modules/explorer-search'
import type { EditorTabType } from '../types'
import type { Aba } from './abas'

/** Separador do id de fronteira (D146 §2). */
export const SEPARADOR_ID = '::'

/**
 * Id de fronteira: `sessionId::uri`.
 *
 * Estável — a mesma uri na mesma sessão produz o mesmo id, então reabrir não
 * duplica. Único — a mesma uri aberta em duas sessões não colide, e sem isso
 * "abas de S1 não vazam para S2" quebraria. Reversível — separa no primeiro
 * `SEPARADOR_ID`, e o primeiro é o certo porque uri pode conter `::` enquanto
 * sessionId não.
 */
export function idDaAbaDoModulo(sessionId: string, uri: string): string {
  return `${sessionId}${SEPARADOR_ID}${uri}`
}

/** True quando o id veio da fronteira (e não de uma aba nativa do App). */
export function ehIdDoModulo(id: string): boolean {
  return id.includes(SEPARADOR_ID)
}

/** Inverso de `idDaAbaDoModulo`. `undefined` para id nativo do App. */
export function dividirIdDoModulo(id: string): { sessionId: string; uri: string } | undefined {
  const corte = id.indexOf(SEPARADOR_ID)
  if (corte <= 0) return undefined
  const sessionId = id.slice(0, corte)
  const uri = id.slice(corte + SEPARADOR_ID.length)
  return uri ? { sessionId, uri } : undefined
}

/**
 * Kind do módulo → tipo do App (D146 §1).
 *
 * `changes` vira `diff` de propósito: o NOME do tipo é preservado para não quebrar
 * ícone, CSS, `MANAGED_TAB_TYPES`/`DOCKED_TAB_TYPES` e os testes que o citam; o que
 * a D146 troca é o CORPO, que deixa de ser a casca vazia do App e passa a ser o
 * `ChangesPane` real do módulo.
 */
export function tipoParaKind(kind: AttachTab['kind']): EditorTabType {
  switch (kind) {
    case 'code': return 'file'
    case 'search': return 'search'
    case 'changes': return 'diff'
    case 'diff': return 'diff-arquivo'
  }
}

/**
 * Porta fiel de `core/uri.normalizePosixPath`, sem importá-la: `WorkspaceUri` é
 * SEMPRE `file://` (o próprio `core/uri.ts` diz "sem scheme genérico"), então não
 * há outro scheme a tratar. Normalizar `.`/`..`/`//`/barra final importa porque o
 * `path` projetado é comparado e lido pelo App (`languageForPath`) e precisa ser o
 * mesmo caminho que o módulo calcularia, não um parecido.
 */
export function caminhoDaUri(uri: string): string {
  let cru = uri.startsWith('file://') ? uri.slice('file://'.length) : uri
  if (!cru.startsWith('/')) cru = `/${cru}`
  const partes: string[] = []
  for (const segmento of cru.split('/')) {
    if (segmento === '' || segmento === '.') continue
    if (segmento === '..') { partes.pop(); continue }
    partes.push(segmento)
  }
  return `/${partes.join('/')}`
}

/** Espelha `core/uri.uriBasename`: o último segmento do caminho normalizado. */
export function nomeDoArquivo(uri: string): string {
  const caminho = caminhoDaUri(uri)
  return caminho.slice(caminho.lastIndexOf('/') + 1)
}

/**
 * Rótulo da aba, ESPELHANDO `ui/attach/EditorTabs.tsx:50` — a faixa que o dono já
 * vê hoje. Não invento rótulo: se o módulo mudar o seu, um teste desta pasta falha.
 *
 * `changes` → o rótulo do módulo ('Changes'); `diff` → o título do payload, que já
 * vem resolvido ("a.ts (Working Tree)"), com 'Diff' de fallback; os demais → o nome
 * do arquivo.
 */
export function tituloDaAbaDoModulo(tab: AttachTab): string {
  if (tab.kind === 'changes') return ROTULO_CHANGES
  if (tab.kind === 'diff') return tab.diff?.title ?? 'Diff'
  return nomeDoArquivo(tab.uri)
}

/**
 * Valor copiado de `ui/attach/changes/changesStrings.ts:5`. Fica duplicado aqui
 * porque aquele arquivo é interno a `ui/**` e o barrel não o exporta; o teste
 * `ponteAnexo.test.ts` importa o original e compara, então deriva silenciosa
 * derruba a suíte em vez de chegar na tela.
 */
export const ROTULO_CHANGES = 'Changes'

/**
 * Projeta as abas que o módulo tem para uma sessão na coleção fundida.
 *
 * O que cada campo carrega e por quê:
 * - `uri` — é o que faz a aba ser backed por recurso de verdade, e é o critério de
 *   desempate na fusão (a real vence a casca);
 * - `dirty` e `preview` — vêm do módulo, que é quem os governa; são o que permite
 *   RF15-2 (alternar sem perder estado) agora que o estado vive no modelo (D144);
 * - `path` — o App já lê `tab.path` (ex.: `languageForPath`), então vem preenchido;
 * - `isRealFile` — só em `code`, que é o único kind com arquivo de disco;
 * - `sessionId` — dono por sessão, nunca global: aba do módulo pertence à sessão
 *   que a abriu. `content` fica de propósito ausente — quem lê o disco é o módulo.
 */
export function projetarAbasDoModulo(sessionId: string, tabs: readonly AttachTab[]): Aba[] {
  return tabs.map((tab) => {
    const tipo = tipoParaKind(tab.kind)
    const aba: Aba = {
      id: idDaAbaDoModulo(sessionId, tab.uri),
      type: tipo,
      title: tituloDaAbaDoModulo(tab),
      sessionId,
      uri: tab.uri,
      dirty: tab.dirty,
      preview: tab.preview,
      path: tab.kind === 'code' ? caminhoDaUri(tab.uri) : undefined,
      isRealFile: tab.kind === 'code',
    }
    return aba
  })
}

/** Id fundido da aba que o módulo tem como ativa naquela sessão, se houver. */
export function idAtivoDoModulo(sessionId: string, tabs: readonly AttachTab[]): string | undefined {
  const ativa = tabs.find((tab) => tab.active)
  return ativa ? idDaAbaDoModulo(sessionId, ativa.uri) : undefined
}

/**
 * Duas abas são a MESMA superfície quando disputam o mesmo lugar na faixa.
 *
 * - mesma `uri` → é o mesmo recurso aberto pelos dois caminhos, o caso central da
 *   duplicação que a SPEC manda resolver;
 * - tipo singleton (`search`, `diff`, `diff-arquivo`, `providers`, `config`) com o
 *   mesmo dono → existe um só por dono, então dois do mesmo tipo são a mesma
 *   superfície;
 * - `file` sem uri (as superfícies demo de divisão/novo arquivo) e `browser` nunca
 *   colidem entre si: cada um é uma instância própria.
 */
export function mesmaSuperficie(a: Aba, b: Aba): boolean {
  if (a.uri && b.uri) return a.uri === b.uri
  const singleton: readonly EditorTabType[] = ['search', 'diff', 'diff-arquivo', 'providers', 'config']
  if (!singleton.includes(a.type) || !singleton.includes(b.type)) return false
  return a.type === b.type && (a.sessionId ?? null) === (b.sessionId ?? null)
}

/**
 * Funde as abas nativas do App com as projetadas do módulo numa faixa só.
 *
 * Ordem: a da primeira aparição, sem reordenar — quem decide a política de ordem da
 * faixa é o chamador, não o adaptador.
 *
 * Duplicata: quando as duas listas trazem a mesma superfície, vence a de MAIOR peso,
 * e o peso tem dois critérios nesta ordem:
 *   1. carregar `uri` — prova de que a aba é backed por recurso real. É o que aplica
 *      a D146 no caso concreto: o `ChangesPane` real do módulo substitui a casca
 *      `Branch Changes` do App, cujo `diffFiles` "nasce e permanece vazio"
 *      (`App.tsx:141`);
 *   2. ENTRE duas abas com uri, vence a de fronteira (id do módulo), porque é a que o
 *      `EditorService` governa — e é ele que sabe salvar, marcar dirty e manter
 *      preview. A aba `file` nativa do App renderiza o Monaco simples que não salva,
 *      então para o MESMO arquivo ela é a metade menos capaz. Sem este desempate a
 *      regra 1 não decide nada quando o arquivo foi aberto pelos dois caminhos.
 *
 * Atenção para o passo 2c: substituir em lugar troca o ID da aba, e o App guarda
 * `activeTabId`/`activeTabBySession` por id. A migração do foco é responsabilidade
 * de quem ligar isto na UI, não deste adaptador.
 */
export function fundirAbas(nativas: readonly Aba[], projetadas: readonly Aba[]): Aba[] {
  const resultado: Aba[] = []
  for (const aba of [...nativas, ...projetadas]) {
    const indice = resultado.findIndex((cada) => mesmaSuperficie(cada, aba))
    if (indice < 0) {
      resultado.push(aba)
      continue
    }
    resultado[indice] = preferir(resultado[indice], aba)
  }
  return resultado
}

/** Peso de uma aba na disputa por uma superfície (ver `fundirAbas`). */
function peso(aba: Aba): number {
  return (aba.uri ? 2 : 0) + (ehIdDoModulo(aba.id) ? 1 : 0)
}

/** Mantém a que já está na faixa em caso de empate, para a fusão ser determinística. */
function preferir(atual: Aba, candidata: Aba): Aba {
  return peso(candidata) > peso(atual) ? candidata : atual
}
