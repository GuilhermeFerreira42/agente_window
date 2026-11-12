import { createHash, randomUUID } from 'node:crypto'
import { statSync } from 'node:fs'
import type Database from 'better-sqlite3'
import type { Session } from '../../types'
import { idHistoricoValido, normalizarTitulo, normalizarBuscaHistorica } from '../../domain/consultaEntreChats'
import { pareceCredencial } from '../../domain/memoriaProjeto'
import { getDatabase, upsertSessionRecord, type SessionRecord } from './database'
import type { TranscriptEntry } from './transcripts'

const prontos = new WeakSet<Database.Database>()
function db() {
  const connection = getDatabase()
  if (!prontos.has(connection)) {
    connection.exec(`
      CREATE TABLE IF NOT EXISTS history_local_owner (singleton INTEGER PRIMARY KEY CHECK(singleton=1), id TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS chat_history_origins (
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        chat_id TEXT NOT NULL, epoch TEXT NOT NULL, operator_id TEXT NOT NULL,
        project_key TEXT, root_identity TEXT, state TEXT NOT NULL CHECK(state IN ('empty','verified','unverifiable')),
        digest TEXT NOT NULL, title TEXT NOT NULL, title_norm TEXT NOT NULL,
        session_title TEXT NOT NULL, chat_title TEXT NOT NULL, updated_at INTEGER NOT NULL,
        PRIMARY KEY(session_id,chat_id)
      );
      CREATE INDEX IF NOT EXISTS chat_origin_title_idx ON chat_history_origins(operator_id,project_key,state,title_norm);
      CREATE INDEX IF NOT EXISTS chat_origin_updated_idx ON chat_history_origins(operator_id,project_key,state,updated_at DESC);
      CREATE TABLE IF NOT EXISTS chat_history_consents (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, chat_id TEXT NOT NULL, epoch TEXT NOT NULL,
        operator_id TEXT NOT NULL, project_key TEXT NOT NULL, root_identity TEXT NOT NULL,
        granted_at INTEGER NOT NULL, revoked_at INTEGER,
        FOREIGN KEY(session_id,chat_id) REFERENCES chat_history_origins(session_id,chat_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS chat_history_consent_scope_idx ON chat_history_consents(session_id,chat_id,epoch,revoked_at);
    `)
    const columns = connection.prepare('PRAGMA table_info(chat_history_origins)').all() as Array<{ name: string }>
    if (!columns.some(c => c.name === 'root_identity')) connection.exec('ALTER TABLE chat_history_origins ADD COLUMN root_identity TEXT')
    connection.prepare('INSERT OR IGNORE INTO history_local_owner VALUES (1,?)').run(randomUUID())
    connection.function('mc1_title_fold', { deterministic: true }, (s: unknown) => typeof s === 'string' ? normalizarBuscaHistorica(s) : '')
    prontos.add(connection)
  }
  return connection
}
export function operadorHistoricoLocal(): string {
  return (db().prepare('SELECT id FROM history_local_owner WHERE singleton=1').get() as { id: string }).id
}
export const chaveProjetoHistorico = (raiz: string) => createHash('sha256').update(raiz.normalize('NFC')).digest('hex')
/** Root replacement at the same pathname is a different project incarnation. No marker is written into user folders. */
export function identidadeRaizHistorico(raiz: string): string | undefined {
  try {
    const info = statSync(raiz, { bigint: true })
    if (!info.isDirectory() || info.ino === 0n) return
    return createHash('sha256').update(`${info.dev}:${info.ino}:${info.birthtimeNs}`).digest('hex')
  } catch { return }
}
export function textoHistoricoSeguro(texto: unknown): texto is string {
  return typeof texto === 'string' && !pareceCredencial(texto) &&
    !/\bnvapi-[\w-]{12,}|\bAIza[\w-]{20,}|\b(?:access_token|refresh_token|client_secret)\s*["']?\s*[:=]\s*["']?\S{4,}/iu.test(texto)
}
export const digestChat = (entries: TranscriptEntry[], chatId: string) => createHash('sha256')
  .update(JSON.stringify(entries.filter(e => e.chatId === chatId && e.type !== 'agir_event')
    .map(({ type, chatId: id, uuid, message }) => ({ type, chatId: id, uuid, message })))).digest('hex')

export interface OrigemChat {
  sessionId: string; chatId: string; epoch: string; operatorId: string; projectKey: string | null
  rootIdentity: string | null; state: 'empty' | 'verified' | 'unverifiable'; digest: string; title: string; titleNorm: string
  sessionTitle: string; chatTitle: string; updatedAt: number
  consentId?: string | null
}
const COLUNAS = `session_id AS sessionId, chat_id AS chatId, epoch, operator_id AS operatorId,
 project_key AS projectKey, root_identity AS rootIdentity, state, digest, title, title_norm AS titleNorm, session_title AS sessionTitle,
 chat_title AS chatTitle, updated_at AS updatedAt`
export function origemChat(sessionId: string, chatId: string): OrigemChat | undefined {
  return db().prepare(`SELECT ${COLUNAS} FROM chat_history_origins WHERE session_id=? AND chat_id=?`).get(sessionId, chatId) as OrigemChat | undefined
}

export interface ConsentimentoHistorico {
  id: string; sessionId: string; chatId: string; epoch: string; operatorId: string; projectKey: string; rootIdentity: string; grantedAt: number
}
export function consentimentoHistorico(sessionId: string, chatId: string, epoch: string): ConsentimentoHistorico | undefined {
  return db().prepare(`SELECT id,session_id AS sessionId,chat_id AS chatId,epoch,operator_id AS operatorId,
    project_key AS projectKey,root_identity AS rootIdentity,granted_at AS grantedAt FROM chat_history_consents
    WHERE session_id=? AND chat_id=? AND epoch=? AND operator_id=? AND revoked_at IS NULL ORDER BY granted_at DESC LIMIT 1`)
    .get(sessionId, chatId, epoch, operadorHistoricoLocal()) as ConsentimentoHistorico | undefined
}
/** Changes on grant AND revoke, including a grant→revoke cycle with no active grant left. */
export function revisaoConsentimentoHistorico(sessionId: string, chatId: string, epoch: string): string {
  const ultima = db().prepare('SELECT id,revoked_at AS revokedAt FROM chat_history_consents WHERE session_id=? AND chat_id=? AND epoch=? ORDER BY rowid DESC LIMIT 1')
    .get(sessionId, chatId, epoch) as { id: string; revokedAt: number | null } | undefined
  return ultima ? `${ultima.id}:${ultima.revokedAt ?? 'active'}` : 'none'
}
/** Effective read authority, never used to rewrite historical provenance. */
export function origemConsultavel(sessionId: string, chatId: string): OrigemChat | undefined {
  const original = origemChat(sessionId, chatId)
  if (!original || original.state !== 'unverifiable') return original
  const consent = consentimentoHistorico(sessionId, chatId, original.epoch)
  return consent && consent.operatorId === original.operatorId &&
    (original.projectKey === null || original.projectKey === consent.projectKey) &&
    (original.rootIdentity === null || original.rootIdentity === consent.rootIdentity)
    ? { ...original, state: 'verified', projectKey: consent.projectKey, rootIdentity: consent.rootIdentity, consentId: consent.id } : original
}
export function revogarConsentimentoHistorico(sessionId: string, chatId: string): void {
  db().prepare('UPDATE chat_history_consents SET revoked_at=? WHERE session_id=? AND chat_id=? AND revoked_at IS NULL')
    .run(Date.now(), sessionId, chatId)
}
/** Called only by the human consent route after receipt/root/digest validation. */
export function autorizarConsultaHistorica(origem: OrigemChat, raiz: string, identidade: string): void {
  if (!origemElegivelParaConsentimento(origem, raiz, identidade) || origem.operatorId !== operadorHistoricoLocal()) throw new Error('Origem não elegível para esta autorização.')
  db().transaction(() => {
    revogarConsentimentoHistorico(origem.sessionId, origem.chatId)
    db().prepare(`INSERT INTO chat_history_consents VALUES (?,?,?,?,?,?,?,?,NULL)`)
      .run(randomUUID(), origem.sessionId, origem.chatId, origem.epoch, origem.operatorId, chaveProjetoHistorico(raiz), identidade, Date.now())
  })()
}
export function origemElegivelParaConsentimento(origem: OrigemChat, raiz: string, identidade: string): boolean {
  return origem.state === 'unverifiable' && (origem.projectKey === null || origem.projectKey === chaveProjetoHistorico(raiz)) &&
    (origem.rootIdentity === null || origem.rootIdentity === identidade)
}

/** Quarantine is committed BEFORE JSONL publication; a later I/O failure cannot reassign old content. */
export function invalidarOrigensForaDaRaiz(sessionId: string, raiz: string | null, identidade?: string): void {
  const chave = raiz ? chaveProjetoHistorico(raiz) : null
  const fisica = identidade ?? (raiz ? identidadeRaizHistorico(raiz) : undefined)
  db().prepare(`UPDATE chat_history_origins SET state='unverifiable'
    WHERE session_id=? AND state='verified' AND (project_key IS NOT ? OR ? IS NULL OR root_identity IS NOT ? OR ? IS NULL)`)
    .run(sessionId, chave, chave, fisica ?? null, fisica ?? null)
  db().prepare(`UPDATE chat_history_consents SET revoked_at=? WHERE session_id=? AND revoked_at IS NULL
    AND (project_key IS NOT ? OR ? IS NULL OR root_identity IS NOT ? OR ? IS NULL)`)
    .run(Date.now(), sessionId, chave, chave, fisica ?? null, fisica ?? null)
}

export function prepararOrigens(session: Session, anterior: Session | undefined, entriesAnteriores: TranscriptEntry[], raiz: string | null, identidade?: string): OrigemChat[] {
  const rootIdentity = identidade ?? (raiz ? identidadeRaizHistorico(raiz) : undefined)
  invalidarOrigensForaDaRaiz(session.id, raiz, rootIdentity)
  const owner = operadorHistoricoLocal(), projectKey = raiz ? chaveProjetoHistorico(raiz) : null
  return session.chats.filter(chat => idHistoricoValido(session.id) && idHistoricoValido(chat.id)).map(chat => {
    const previa = origemChat(session.id, chat.id)
    const existia = anterior?.chats.some(c => c.id === chat.id) === true
    const tinhaTexto = entriesAnteriores.some(e => e.chatId === chat.id && e.type !== 'agir_event')
    const contemTexto = chat.messages.some(m => !m.running)
    let state: OrigemChat['state'] = previa && existia ? previa.state : existia && (tinhaTexto || contemTexto) ? 'unverifiable' : 'empty'
    if (previa && existia && (previa.state === 'verified' || previa.state === 'empty' || !!consentimentoHistorico(session.id, chat.id, previa.epoch)) &&
        (previa.digest !== digestChat(entriesAnteriores, chat.id) || (previa.state === 'empty' && tinhaTexto))) {
      db().prepare("UPDATE chat_history_origins SET state='unverifiable' WHERE session_id=? AND chat_id=?").run(session.id, chat.id)
      revogarConsentimentoHistorico(session.id, chat.id)
      state = 'unverifiable'
    }
    if (state === 'empty' && contemTexto) state = projectKey && rootIdentity ? 'verified' : 'unverifiable'
    const sessionTitle = textoHistoricoSeguro(session.title) ? session.title.slice(0, 240) : ''
    const chatTitle = textoHistoricoSeguro(chat.title) ? chat.title.slice(0, 240) : ''
    const title = chat.id === session.mainChatId ? sessionTitle : `${sessionTitle} / ${chatTitle}`
    return { sessionId: session.id, chatId: chat.id, epoch: previa && existia ? previa.epoch : randomUUID(),
      operatorId: previa && existia ? previa.operatorId : owner, projectKey: previa && existia && previa.state !== 'empty' ? previa.projectKey : projectKey,
      rootIdentity: previa && existia && previa.state !== 'empty' ? previa.rootIdentity : rootIdentity ?? null,
      state, digest: '', title, titleNorm: normalizarTitulo(title), sessionTitle, chatTitle, updatedAt: Date.now() }
  })
}

/** SQLite metadata + provenance are one commit, after the existing atomic JSONL writer. */
export function publicarCatalogoComOrigens(record: SessionRecord, planos: OrigemChat[], entries: TranscriptEntry[]): void {
  const connection = db()
  connection.transaction(() => {
    upsertSessionRecord(record)
    connection.prepare(`DELETE FROM chat_history_origins WHERE session_id=? AND NOT EXISTS
      (SELECT 1 FROM json_each(?) WHERE value=chat_history_origins.chat_id)`).run(record.id, JSON.stringify(planos.map(p => p.chatId)))
    const inserir = connection.prepare(`INSERT INTO chat_history_origins
      (session_id,chat_id,epoch,operator_id,project_key,root_identity,state,digest,title,title_norm,session_title,chat_title,updated_at) VALUES
      (@sessionId,@chatId,@epoch,@operatorId,@projectKey,@rootIdentity,@state,@digest,@title,@titleNorm,@sessionTitle,@chatTitle,@updatedAt)
      ON CONFLICT(session_id,chat_id) DO UPDATE SET epoch=excluded.epoch,operator_id=excluded.operator_id,
      project_key=excluded.project_key,root_identity=excluded.root_identity,state=excluded.state,digest=excluded.digest,title=excluded.title,
      title_norm=excluded.title_norm,session_title=excluded.session_title,chat_title=excluded.chat_title,updated_at=excluded.updated_at`)
    for (const plano of planos) inserir.run({ ...plano, digest: digestChat(entries, plano.chatId) })
  })()
}

export function listarOrigensConsultaveis(projectKey: string, query: string, excluir: { sessionId: string; chatId: string },
  apos = 0, ate = Number.MAX_SAFE_INTEGER, limit = 201): { rows: OrigemChat[]; titulo: boolean; partial: boolean } {
  const connection = db(), owner = operadorHistoricoLocal(), norm = normalizarTitulo(query)
  const campos = 'o.session_id,o.chat_id,o.epoch,o.operator_id'
  const cauda = 'o.digest,o.title,o.title_norm,o.session_title,o.chat_title,o.updated_at'
  const colunasConsulta = `${COLUNAS},consent_id AS consentId`
  const fontes = `(SELECT ${campos},o.project_key,o.root_identity,o.state,${cauda},NULL AS consent_id FROM chat_history_origins o WHERE o.state='verified'
    UNION ALL SELECT ${campos},c.project_key,c.root_identity,'verified' AS state,${cauda},c.id AS consent_id
    FROM chat_history_origins o JOIN chat_history_consents c ON c.session_id=o.session_id AND c.chat_id=o.chat_id
    AND c.epoch=o.epoch AND c.operator_id=o.operator_id AND c.revoked_at IS NULL
    AND (o.project_key IS NULL OR o.project_key=c.project_key) AND (o.root_identity IS NULL OR o.root_identity=c.root_identity)
    WHERE o.state='unverifiable')`
  const base = `FROM ${fontes} WHERE operator_id=? AND project_key=? AND state='verified'
    AND NOT(session_id=? AND chat_id=?) AND updated_at>=? AND updated_at<=?`
  const parametros = [owner, projectKey, excluir.sessionId, excluir.chatId, apos, ate]
  const exatos = connection.prepare(`SELECT ${colunasConsulta} ${base} AND title_norm=? ORDER BY updated_at DESC,session_id,chat_id LIMIT ?`)
    .all(...parametros, norm, limit) as OrigemChat[]
  if (exatos.length) return { rows: exatos.slice(0, limit - 1), titulo: true, partial: exatos.length >= limit }
  const parciais = connection.prepare(`SELECT ${colunasConsulta} ${base} AND instr(title_norm,?)>0 ORDER BY updated_at DESC,session_id,chat_id LIMIT ?`)
    .all(...parametros, norm, limit) as OrigemChat[]
  if (parciais.length) return { rows: parciais.slice(0, limit - 1), titulo: true, partial: parciais.length >= limit }
  const aproximados = connection.prepare(`SELECT ${colunasConsulta} ${base} AND instr(mc1_title_fold(title_norm),?)>0 ORDER BY updated_at DESC,session_id,chat_id LIMIT ?`)
    .all(...parametros, normalizarBuscaHistorica(query), limit) as OrigemChat[]
  if (aproximados.length) return { rows: aproximados.slice(0, limit - 1), titulo: true, partial: aproximados.length >= limit }
  const rows = connection.prepare(`SELECT ${colunasConsulta} ${base} ORDER BY updated_at DESC,session_id,chat_id LIMIT ?`)
    .all(...parametros, limit) as OrigemChat[]
  return { rows: rows.slice(0, limit - 1), titulo: false, partial: rows.length >= limit }
}

export function haOrigemInverificavel(raiz: string, contexto: { sessionId: string; chatId: string }): boolean {
  // Only existence of OTHER chats under this exact catalog path is used for the warning; no title/text is exposed.
  return !!db().prepare(`SELECT 1 FROM sessions s,json_each(CASE WHEN json_valid(s.session_json) THEN s.session_json ELSE '{"chats":[]}' END,'$.chats') c
    LEFT JOIN chat_history_origins o ON o.session_id=s.id AND o.chat_id=json_extract(c.value,'$.id')
    WHERE json_valid(s.session_json) AND COALESCE(s.worktree_path,s.workspace_path)=?
    AND NOT(s.id=? AND json_extract(c.value,'$.id')=?)
    AND (o.state IS NULL OR (o.state='unverifiable' AND NOT EXISTS
      (SELECT 1 FROM chat_history_consents h WHERE h.session_id=o.session_id AND h.chat_id=o.chat_id AND h.epoch=o.epoch
       AND h.operator_id=o.operator_id AND h.operator_id=? AND h.project_key=? AND h.root_identity=? AND h.revoked_at IS NULL
       AND (o.project_key IS NULL OR o.project_key=h.project_key) AND (o.root_identity IS NULL OR o.root_identity=h.root_identity)))) LIMIT 1`)
    .get(raiz, contexto.sessionId, contexto.chatId, operadorHistoricoLocal(), chaveProjetoHistorico(raiz), identidadeRaizHistorico(raiz) ?? '')
}
