// C-3a — ledger de anexos no MESMO SQLite da sessão (sem banco paralelo).
// Consultas do ledger; o schema aditivo vive em schemaAnexos.ts (T32).
import { getDatabase } from '../database'
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

export function obterUpload(sessionId: string, chatId: string, uploadId: string): LinhaUpload | undefined {
  const bruto = getDatabase().prepare('SELECT * FROM attachment_uploads WHERE session_id = ? AND chat_id = ? AND upload_id = ?')
    .get(sessionId, chatId, uploadId) as Record<string, unknown> | undefined
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

/** Uploads ativos (concorrência) — identidades em recebimento recente. */
export function uploadsAtivos(): LinhaUpload[] {
  const brutos = getDatabase().prepare(`SELECT * FROM attachment_uploads WHERE state IN ('admitido','recebendo','preparado')`).all() as Array<Record<string, unknown>>
  return brutos.map(linhaUpload)
}

export function inserirPlanoLimpeza(linha: { sessionId: string; artifactId: string; alvo: 'chat-copy' | 'workspace-copy' | 'referencia'; locator: string; rootKind: string; workspaceRoot: string | null; sha256: string | null }): void {
  getDatabase().prepare(`
    INSERT INTO attachment_cleanup_plan (session_id, artifact_id, alvo, locator, root_kind, workspace_root, sha256, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pendente', ?)
    ON CONFLICT(session_id, artifact_id) DO NOTHING
  `).run(linha.sessionId, linha.artifactId, linha.alvo, linha.locator, linha.rootKind, linha.workspaceRoot, linha.sha256, Date.now())
}

export function planosPendentes(sessionId: string): Array<{ artifactId: string; alvo: string; locator: string; rootKind: string; workspaceRoot: string | null; sha256: string | null; state: string }> {
  const brutos = getDatabase().prepare('SELECT * FROM attachment_cleanup_plan WHERE session_id = ? ORDER BY created_at').all(sessionId) as Array<Record<string, unknown>>
  return brutos.map((bruto) => ({
    artifactId: bruto.artifact_id as string,
    alvo: bruto.alvo as string,
    locator: bruto.locator as string,
    rootKind: bruto.root_kind as string,
    workspaceRoot: (bruto.workspace_root as string | null) ?? null,
    sha256: (bruto.sha256 as string | null) ?? null,
    state: bruto.state as string,
  }))
}

export function marcarPlano(artifactId: string, state: 'concluido' | 'falhou'): void {
  getDatabase().prepare('UPDATE attachment_cleanup_plan SET state = ? WHERE artifact_id = ?').run(state, artifactId)
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
