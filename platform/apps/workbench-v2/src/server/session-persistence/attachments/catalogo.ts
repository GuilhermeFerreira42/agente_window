// C-3a — ledger de anexos no MESMO SQLite da sessão (sem banco paralelo).
// Consultas do ledger; o schema aditivo vive em schemaAnexos.ts (T32).
//
// Duas invariantes desta camada (parecer B04/B09/B11):
//  - estado do upload e registro do artefato finalizam na MESMA transação
//    (`finalizarPublicacao`), nunca em dois commits separados;
//  - contagem de concorrência/quota é feita DENTRO da transação de admissão
//    (`reservarAdmissao`), então duas admissões simultâneas não passam juntas.
import { getDatabase } from '../database'
import { PersistenceProblem } from '../persistenceErrors'
import type { LinhaUpload, LinhaArtigo, EstadoUpload, ModoAnexo, EscopoAnexo } from './schemaAnexos'

export type { LinhaUpload, LinhaArtigo, EstadoUpload, ModoAnexo, EscopoAnexo }

function linhaUpload(bruto: Record<string, unknown>): LinhaUpload {
  return {
    sessionId: bruto.session_id as string,
    chatId: bruto.chat_id as string,
    uploadId: bruto.upload_id as string,
    artifactId: (bruto.artifact_id as string | null) ?? null,
    name: bruto.name as string,
    declaredBytes: (bruto.declared_bytes as number | null) ?? null,
    mime: bruto.mime as string,
    receivedBytes: bruto.received_bytes as number,
    digest: (bruto.digest as string | null) ?? null,
    state: bruto.state as EstadoUpload,
    stagePath: (bruto.stage_path as string | null) ?? null,
    finalPath: (bruto.final_path as string | null) ?? null,
    mode: bruto.mode as ModoAnexo,
    scope: bruto.scope as EscopoAnexo,
    workspaceRoot: (bruto.workspace_root as string | null) ?? null,
    createdAt: bruto.created_at as number,
    updatedAt: bruto.updated_at as number,
    errorCode: (bruto.error_code as string | null) ?? null,
  }
}

function linhaArtigo(bruto: Record<string, unknown>): LinhaArtigo {
  return {
    artifactId: bruto.artifact_id as string,
    sessionId: bruto.session_id as string,
    chatId: bruto.chat_id as string,
    uploadId: bruto.upload_id as string,
    name: bruto.name as string,
    modalidade: bruto.modalidade as string,
    papel: bruto.papel as string,
    mode: bruto.mode as ModoAnexo,
    locator: bruto.locator as string,
    rootKind: bruto.root_kind as 'appdir' | 'workspace',
    workspaceRoot: (bruto.workspace_root as string | null) ?? null,
    bytes: bruto.bytes as number,
    sha256: bruto.sha256 as string,
    state: bruto.state as 'pronto',
    messageId: (bruto.message_id as string | null) ?? null,
    partId: (bruto.part_id as string | null) ?? null,
    createdAt: bruto.created_at as number,
  }
}

export function inserirUpload(linha: Partial<LinhaUpload> & Pick<LinhaUpload,
  'sessionId' | 'chatId' | 'uploadId' | 'name' | 'state' | 'mode' | 'scope' | 'createdAt' | 'updatedAt'>): void {
  const agora = linha.updatedAt
  getDatabase().prepare(`
    INSERT INTO attachment_uploads (session_id, chat_id, upload_id, artifact_id, name, declared_bytes, mime,
      received_bytes, digest, state, stage_path, final_path, mode, scope, workspace_root, created_at, updated_at, error_code)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(linha.sessionId, linha.chatId, linha.uploadId, linha.artifactId ?? null, linha.name,
    linha.declaredBytes ?? null, linha.mime, linha.receivedBytes ?? 0, linha.digest ?? null, linha.state,
    linha.stagePath ?? null, linha.finalPath ?? null, linha.mode, linha.scope, linha.workspaceRoot ?? null,
    linha.createdAt, agora, linha.errorCode ?? null)
}

export function atualizarUpload(sessionId: string, chatId: string, uploadId: string, campos: Partial<LinhaUpload>): void {
  const conhecidos: (keyof LinhaUpload)[] = ['artifactId', 'name', 'declaredBytes', 'mime', 'receivedBytes', 'digest', 'state', 'stagePath', 'finalPath', 'errorCode']
  const sets: string[] = []
  const valores: unknown[] = []
  for (const campo of conhecidos) {
    if (!(campo in campos)) continue
    const coluna = campo.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`)
    sets.push(`${coluna} = ?`)
    valores.push((campos as Record<string, unknown>)[campo] ?? null)
  }
  if (sets.length === 0) return
  sets.push('updated_at = ?')
  valores.push(Date.now(), sessionId, chatId, uploadId)
  getDatabase().prepare(`UPDATE attachment_uploads SET ${sets.join(', ')} WHERE session_id = ? AND chat_id = ? AND upload_id = ?`)
    .run(...valores)
}

/**
 * R2 — CLAIM do escritor numa única instrução condicional (atômica no SQLite).
 * Devolve `true` só para quem realmente transicionou `admitido|falhou|cancelado`
 * -> `recebendo`. Dois PUTs concorrentes nunca "veem" o mesmo estado livre:
 * exatamente um ganha, antes de qualquer `await` de filesystem.
 */
export function reivindicarEscritor(sessionId: string, chatId: string, uploadId: string, stagePath: string): boolean {
  const resultado = getDatabase().prepare(`
    UPDATE attachment_uploads SET state = 'recebendo', stage_path = ?, updated_at = ?
    WHERE session_id = ? AND chat_id = ? AND upload_id = ? AND state IN ('admitido', 'falhou', 'cancelado')
  `).run(stagePath, Date.now(), sessionId, chatId, uploadId)
  return Number(resultado.changes) === 1
}

export function obterUpload(sessionId: string, chatId: string, uploadId: string): LinhaUpload | undefined {
  const bruto = getDatabase().prepare('SELECT * FROM attachment_uploads WHERE session_id = ? AND chat_id = ? AND upload_id = ?')
    .get(sessionId, chatId, uploadId) as Record<string, unknown> | undefined
  return bruto ? linhaUpload(bruto) : undefined
}

/** Busca por uploadId no ledger inteiro (recibo de ACK perdido, sem dono na URL). */
export function obterUploadPorId(uploadId: string): LinhaUpload | undefined {
  const bruto = getDatabase().prepare('SELECT * FROM attachment_uploads WHERE upload_id = ?').get(uploadId) as Record<string, unknown> | undefined
  return bruto ? linhaUpload(bruto) : undefined
}

export function listarUploads(sessionId: string, chatId: string): LinhaUpload[] {
  const brutos = getDatabase().prepare('SELECT * FROM attachment_uploads WHERE session_id = ? AND chat_id = ? ORDER BY created_at')
    .all(sessionId, chatId) as Array<Record<string, unknown>>
  return brutos.map(linhaUpload)
}

export function upsertArtigo(linha: LinhaArtigo): void {
  getDatabase().prepare(`
    INSERT INTO attachment_artifacts (artifact_id, session_id, chat_id, upload_id, name, modalidade, papel,
      mode, locator, root_kind, workspace_root, bytes, sha256, state, message_id, part_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(artifact_id) DO UPDATE SET
      -- R1 — o MESMO artefato (mesma tentativa) sempre tem os MESMOS bytes:
      -- locator/hash/tamanho acompanham o commit, nunca ficam presos ao
      -- primeiro registro. Vínculo de mensagem só é preenchido, não apagado.
      locator = excluded.locator,
      bytes = excluded.bytes,
      sha256 = excluded.sha256,
      message_id = COALESCE(excluded.message_id, attachment_artifacts.message_id),
      part_id = COALESCE(excluded.part_id, attachment_artifacts.part_id)
  `).run(linha.artifactId, linha.sessionId, linha.chatId, linha.uploadId, linha.name, linha.modalidade, linha.papel,
    linha.mode, linha.locator, linha.rootKind, linha.workspaceRoot, linha.bytes, linha.sha256, linha.state,
    linha.messageId, linha.partId, linha.createdAt)
}

export function obterArtigo(artifactId: string): LinhaArtigo | undefined {
  const bruto = getDatabase().prepare('SELECT * FROM attachment_artifacts WHERE artifact_id = ?').get(artifactId) as Record<string, unknown> | undefined
  return bruto ? linhaArtigo(bruto) : undefined
}

export function listarArtigosChat(sessionId: string, chatId: string): LinhaArtigo[] {
  const brutos = getDatabase().prepare('SELECT * FROM attachment_artifacts WHERE session_id = ? AND chat_id = ? ORDER BY created_at')
    .all(sessionId, chatId) as Array<Record<string, unknown>>
  return brutos.map(linhaArtigo)
}

export function vincularMensagem(artifactIds: string[], messageId: string): void {
  const stmt = getDatabase().prepare('UPDATE attachment_artifacts SET message_id = ? WHERE artifact_id = ?')
  for (const artifactId of artifactIds) stmt.run(messageId, artifactId)
}

export function removerArtigo(artifactId: string): void {
  getDatabase().prepare('DELETE FROM attachment_artifacts WHERE artifact_id = ?').run(artifactId)
}

export function removerUploadsChat(sessionId: string, chatId: string): void {
  getDatabase().prepare('DELETE FROM attachment_uploads WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
}

/** Soma de bytes publicados no âmbito privado de um chat (quota). */
export function bytesPublicadosChat(sessionId: string, chatId: string): number {
  const linha = getDatabase().prepare(`
    SELECT COALESCE(SUM(bytes), 0) AS total FROM attachment_artifacts
    WHERE session_id = ? AND chat_id = ? AND root_kind = 'appdir'
  `).get(sessionId, chatId) as { total: number }
  return linha.total
}

/**
 * Transferências em voo (concorrência). `porDono` filtra o dono: a política é
 * um recurso do perfil, mas o DIAGNÓSTICO e a reconciliação de um chat nunca
 * precisam enxergar transferências de outro.
 */
export function uploadsAtivos(porDono?: { sessionId: string; chatId?: string }): LinhaUpload[] {
  const brutos = porDono
    ? porDono.chatId
      ? getDatabase().prepare("SELECT * FROM attachment_uploads WHERE state IN ('admitido','recebendo','preparado') AND session_id = ? AND chat_id = ?").all(porDono.sessionId, porDono.chatId)
      : getDatabase().prepare("SELECT * FROM attachment_uploads WHERE state IN ('admitido','recebendo','preparado') AND session_id = ?").all(porDono.sessionId)
    : getDatabase().prepare("SELECT * FROM attachment_uploads WHERE state IN ('admitido','recebendo','preparado')").all()
  return (brutos as Array<Record<string, unknown>>).map(linhaUpload)
}

export interface ReservaAdmissao {
  uploadId: string
  criado: boolean
  existente: LinhaUpload | null
  ativos: number
}

/**
 * Admissão ATÔMICA (R05/B11): a contagem de concorrência e a soma de quota do
 * dono são lidas e a linha é inserida na MESMA transação `IMMEDIATE`. Sem
 * isso, três `Promise.all` passavam pelo limite de concorrência 2.
 *
 * `criar` recebe o número de ativos (já sob a transação) e devolve a linha a
 * inserir, ou `null` quando o chamador só quer reutilizar/consultar. Erros de
 * política viram `PersistenceProblem` e a transação é revertida (nenhuma
 * reserva fantasma).
 */
export function reservarAdmissao(
  sessionId: string,
  chatId: string,
  decidir: (ativos: LinhaUpload[]) => { inserir?: Parameters<typeof inserirUpload>[0] } | { recusar: PersistenceProblem } | { reutilizar: LinhaUpload },
): ReservaAdmissao {
  const db = getDatabase()
  const transacao = db.transaction((): ReservaAdmissao => {
    const ativos = uploadsAtivos()
    const decisao = decidir(ativos)
    if ('recusar' in decisao) throw decisao.recusar
    if ('reutilizar' in decisao) {
      return { uploadId: decisao.reutilizar.uploadId, criado: false, existente: decisao.reutilizar, ativos: ativos.length }
    }
    if (!decisao.inserir) {
      throw new PersistenceProblem(500, 'attachment_error', 'Admissão sem decisão de reserva.')
    }
    inserirUpload(decisao.inserir)
    return { uploadId: decisao.inserir.uploadId, criado: true, existente: null, ativos: ativos.length }
  })
  return transacao.immediate()
}

/**
 * Finalização ATÔMICA (R04/B04): estado `pronto` + registro do artefato no
 * MESMO commit. Se o registro falhar (ex.: trigger/constraint), o estado
 * volta a `preparado` e o final continua íntegro para retomada — nunca uma
 * linha `pronto` sem artefato consultável.
 */
export function finalizarPublicacao(linha: LinhaUpload, campos: { finalPath: string; bytes: number; sha256: string; locator: string; modalidade: string; papel: string; createdAt: number }): LinhaUpload {
  const db = getDatabase()
  const transacao = db.transaction((): LinhaUpload => {
    atualizarUpload(linha.sessionId, linha.chatId, linha.uploadId, { state: 'pronto', finalPath: campos.finalPath })
    upsertArtigo({
      artifactId: linha.artifactId ?? linha.uploadId, sessionId: linha.sessionId, chatId: linha.chatId,
      uploadId: linha.uploadId, name: linha.name, modalidade: campos.modalidade, papel: campos.papel,
      mode: linha.mode, locator: campos.locator, rootKind: linha.scope === 'workspace' ? 'workspace' : 'appdir',
      workspaceRoot: linha.workspaceRoot, bytes: campos.bytes, sha256: campos.sha256, state: 'pronto',
      messageId: null, partId: null, createdAt: campos.createdAt,
    })
    const depois = obterUpload(linha.sessionId, linha.chatId, linha.uploadId)!
    if (depois.state !== 'pronto' || !obterArtigo(depois.artifactId ?? depois.uploadId)) {
      throw new PersistenceProblem(503, 'attachment_commit_failed',
        'Não foi possível finalizar o anexo no catálogo. O arquivo publicado fica preservado para reconciliação; nada foi anunciado como pronto.')
    }
    return depois
  })
  return transacao.immediate()
}

/** Gravação em lote (migração/reconciliação) sob UMA transação. */
export function emTransacao<T>(operacao: () => T): T {
  return getDatabase().transaction(operacao).immediate()
}

export function inserirPlanoLimpeza(linha: { sessionId: string; chatId?: string | null; artifactId: string; alvo: 'chat-copy' | 'workspace-copy' | 'referencia'; locator: string; rootKind: string; workspaceRoot: string | null; sha256: string | null }): void {
  getDatabase().prepare(`
    INSERT INTO attachment_cleanup_plan (session_id, chat_id, artifact_id, alvo, locator, root_kind, workspace_root, sha256, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?)
    ON CONFLICT(session_id, artifact_id) DO UPDATE SET
      chat_id = COALESCE(attachment_cleanup_plan.chat_id, excluded.chat_id),
      locator = excluded.locator,
      sha256 = COALESCE(attachment_cleanup_plan.sha256, excluded.sha256)
  `)
    .run(linha.sessionId, linha.chatId ?? null, linha.artifactId, linha.alvo, linha.locator, linha.rootKind,
      linha.workspaceRoot, linha.sha256, Date.now())
}

export function planosPendentes(
  sessionId: string,
  opcoes: { chatId?: string } = {},
): Array<{ artifactId: string; chatId: string | null; alvo: string; locator: string; rootKind: string; workspaceRoot: string | null; sha256: string | null; state: string; destino: string | null }> {
  const brutos = (opcoes.chatId
    ? getDatabase().prepare('SELECT * FROM attachment_cleanup_plan WHERE session_id = ? AND chat_id = ? ORDER BY created_at')
      .all(sessionId, opcoes.chatId)
    : getDatabase().prepare('SELECT * FROM attachment_cleanup_plan WHERE session_id = ? ORDER BY created_at').all(sessionId)) as Array<Record<string, unknown>>
  return brutos.map((bruto) => ({
    artifactId: bruto.artifact_id as string,
    chatId: (bruto.chat_id as string | null) ?? null,
    alvo: bruto.alvo as string,
    locator: bruto.locator as string,
    rootKind: bruto.root_kind as string,
    workspaceRoot: (bruto.workspace_root as string | null) ?? null,
    sha256: (bruto.sha256 as string | null) ?? null,
    state: bruto.state as string,
    destino: (bruto.destino as string | null) ?? null,
  }))
}

export function marcarPlano(artifactId: string, state: 'pendente' | 'concluido' | 'falhou', destino?: string | null, motivo?: string | null): void {
  getDatabase().prepare('UPDATE attachment_cleanup_plan SET state = ?, destino = COALESCE(?, destino), motivo = COALESCE(?, motivo) WHERE artifact_id = ?')
    .run(state, destino ?? null, motivo ?? null, artifactId)
}

/** Plano `falhou` cujo motivo é definitivo (não adianta retentar). */
export function planosDefinitivamenteFalhos(sessionId: string): number {
  const linha = getDatabase().prepare("SELECT COUNT(*) AS c FROM attachment_cleanup_plan WHERE session_id = ? AND state = 'falhou'").get(sessionId) as { c: number }
  return linha.c
}

export function removerPlanos(sessionId: string): void {
  getDatabase().prepare('DELETE FROM attachment_cleanup_plan WHERE session_id = ?').run(sessionId)
}

export function removerArtigosChatCompleto(sessionId: string, chatId?: string): void {
  if (chatId) {
    getDatabase().prepare('DELETE FROM attachment_artifacts WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
    getDatabase().prepare('DELETE FROM attachment_uploads WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
    return
  }
  getDatabase().prepare('DELETE FROM attachment_artifacts WHERE session_id = ?').run(sessionId)
  getDatabase().prepare('DELETE FROM attachment_uploads WHERE session_id = ?').run(sessionId)
}

/** Remove só as identidades do chat internos (T28), preservando o resto da sessão. */
export function removerLedgerDoChat(sessionId: string, chatId: string): void {
  getDatabase().prepare('DELETE FROM attachment_artifacts WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
  getDatabase().prepare('DELETE FROM attachment_uploads WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
}
