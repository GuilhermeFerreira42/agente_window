// C-3a — DONO e CONTEXTO derivados do servidor (R02/R03/R08; parecer B01):
// o corpo do cliente NUNCA declara dono, chat, raiz ou escopo de armazenamento.
// Toda operação de anexo passa por `resolverDonoAnexos`, que:
//   - aplica a fronteira HTTP local (a rota também aplica, em profundidade);
//   - consulta o catálogo (sessão existente, não tombstoned);
//   - exige que o CHAT exista no snapshot persistido da sessão (o `void chatId`
//     do parecer B01 desaparece);
//   - deriva a raiz REAL do contexto (`contextKind`), validada no filesystem;
//   - recusa declaração de workspace que o catálogo não confirma.
import { getDatabase, getSessionRecord, getSessionRecordRaw } from '../database'
import { consultarDelecao } from '../deletions'
import { resolverContextoAgir } from '../agirContext'
import { PersistenceProblem } from '../persistenceErrors'
import { validarSchemaAnexos } from './schemaAnexos'
import type { EscopoAnexo } from './schemaAnexos'

export interface DonoAnexos {
  sessionId: string
  chatId: string
  /** `chat` = sem raiz; `workspace` = raiz real validada. */
  contextKind: 'chat' | 'workspace'
  /** Raiz REAL do contexto (null em Chat). Nunca vem do corpo. */
  raiz: string | null
  /**
   * Leitura degradada: a pasta do projeto está fora do ar. Vale só para
   * operações de LEITURA (F5/offline: a lista do dono continua consultável);
   * qualquer escrita continua recusada com 409 até a pasta voltar.
   */
  raizOffline?: boolean
}

/** Operações de leitura toleram pasta offline; escritas, nunca. */
export interface OpcoesDono {
  permitirRaizOffline?: boolean
  /**
   * W3 — requisição de LEITURA (`GET`). O que a rota serve nesse caso já está
   * commitado no catálogo (arquivo publicado é imutável); não depende do
   * journal de publicação de OUTRA operação. Escrita continua exigindo a
   * fronteira completa. Tombstone (410) continua valendo em ambos.
   */
  leitura?: boolean
}

/** Sessão excluída responde 410 (P-C), nunca 404 ambíguo. */
export function exigirVivo(sessionId: string): void {
  if (consultarDelecao(sessionId)) {
    throw new PersistenceProblem(410, 'session_deleted',
      'Esta conversa foi excluída. Gravações, execuções e reaberturas não são mais aceitas.')
  }
}

/**
 * Resolve o dono a partir da URL (`:sid`/`:cid`) e do catálogo. Nenhum campo
 * do corpo participa. `chatId` inexistente na sessão persistida = 404.
 */
export function resolverDonoAnexos(sessionId: string, chatId: string, opcoes: OpcoesDono = {}): DonoAnexos {
  validarSchemaAnexos(getDatabase())
  exigirVivo(sessionId)
  // W3 — CAUSA do 503 `session_publication_pending` intermitente do E05.
  //
  // `assertSessionPublicationReadable` recusa a sessão inteira enquanto
  // existir QUALQUER intenção de escrita viva — inclusive a de um autosave da
  // própria conversa. Como este resolver roda antes do despacho de TODA rota
  // de anexo, um `GET` de bytes já publicados (arquivo imutável, recibo já
  // commitado) devolvia 503 por causa do journal de OUTRA operação.
  //
  // Regra corrigida, sem afrouxar escrita: LEITURA lê o registro COMMITADO
  // (`getSessionRecordRaw`, mesmo dado que `getSessionRecord` devolve quando a
  // sessão está limpa); ESCRITA continua passando pela fronteira completa
  // (journal → 503, tombstone → 410).
  const registro = opcoes.leitura
    ? getSessionRecordRaw(sessionId)
    : getSessionRecord(sessionId)
  if (!registro) {
    throw new PersistenceProblem(404, 'session_not_found', 'Sessão não encontrada.')
  }
  const contexto = resolverContextoAgir(sessionId, chatId, { leitura: opcoes.leitura })
  if (!contexto.ok) {
    // Pasta fora do ar NÃO é incoerência de contexto: é estado operacional.
    // Leitura degrada (lista honesta); escrita continua 409.
    const pastaFora = /pasta de trabalho da sessão não está acessível/.test(contexto.message)
    if (pastaFora && opcoes.permitirRaizOffline) {
      return { sessionId, chatId, contextKind: 'workspace', raiz: null, raizOffline: true }
    }
    if (pastaFora) {
      throw new PersistenceProblem(409, 'session_context_mismatch',
        'A pasta desta conversa não está acessível; nada será gravado até ela voltar.')
    }
    // Chat que não pertence à sessão é "não encontrado" para esta operação;
    // qualquer outra incoerência de contexto é 409 (estado, não permissão).
    const pertence = /não pertence à sessão persistida/.test(contexto.message)
    throw new PersistenceProblem(pertence ? 404 : 409,
      pertence ? 'chat_not_found' : 'session_context_mismatch',
      pertence
        ? 'Esta conversa não pertence à sessão informada. Recarregue e tente novamente.'
        : contexto.message)
  }
  if (registro.contextKind === 'chat') {
    if (contexto.raiz !== null) {
      throw new PersistenceProblem(409, 'session_context_mismatch',
        'O contexto persistido da sessão não corresponde ao registro do servidor.')
    }
    return { sessionId, chatId, contextKind: 'chat', raiz: null }
  }
  if (!contexto.raiz) {
    throw new PersistenceProblem(409, 'session_context_mismatch',
      'O contexto persistido da sessão não corresponde ao registro do servidor.')
  }
  return { sessionId, chatId, contextKind: 'workspace', raiz: contexto.raiz }
}

/**
 * Deriva o escopo (B01): Chat só admite cópia privada; workspace pode copiar
 * para o projeto por escolha explícita. Declaração divergente é recusada em
 * vez de virar default permissivo.
 */
export function escopoDoPedido(dono: DonoAnexos, declarado: unknown): EscopoAnexo {
  if (declarado !== undefined && declarado !== null && declarado !== 'chat' && declarado !== 'workspace') {
    throw new PersistenceProblem(400, 'invalid_field', 'Campo scope inválido: use "chat" ou "workspace".')
  }
  const escopo = (declarado ?? 'chat') as EscopoAnexo
  if (dono.contextKind === 'chat' && escopo === 'workspace') {
    throw new PersistenceProblem(403, 'storage_out_of_scope',
      'Esta conversa não tem pasta de projeto. O arquivo pode ser salvo apenas na área privada da conversa.')
  }
  return escopo
}

/**
 * Raiz de destino de uma operação: SEMPRE a raiz do catálogo. Se o cliente
 * mandou uma raiz diferente (ou mandou raiz em Chat), recusa — nunca "usa a do
 * servidor e ignora o resto" em silêncio.
 */
export function raizDoPedido(dono: DonoAnexos, declarada: unknown): string | null {
  if (declarada !== undefined && declarada !== null) {
    if (typeof declarada !== 'string' || declarada.length === 0) {
      throw new PersistenceProblem(400, 'invalid_field', 'Campo workspaceRoot inválido.')
    }
    if (dono.contextKind !== 'workspace' || !dono.raiz) {
      throw new PersistenceProblem(403, 'workspace_not_allowed',
        'Esta conversa não tem pasta de projeto; nenhum arquivo será gravado fora da área privada.')
    }
    if (declarada !== dono.raiz) {
      throw new PersistenceProblem(403, 'workspace_mismatch',
        'A pasta informada não é a pasta original desta conversa. Recarregue a conversa e tente novamente.')
    }
  }
  return dono.raiz
}

/** Campos de corpo aceitos por rota: qualquer extra é recusado (R08). */
export function exigirCampos(corpo: Record<string, unknown>, permitidos: readonly string[]): void {
  for (const chave of Object.keys(corpo)) {
    if (!permitidos.includes(chave)) {
      throw new PersistenceProblem(400, 'unexpected_field',
        `Campo não aceito nesta operação: ${chave}. Nada foi gravado.`)
    }
  }
}
