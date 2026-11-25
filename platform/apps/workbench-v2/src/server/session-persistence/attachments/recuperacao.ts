// C-3a — recuperação (R11/R13; parecer B02).
//
// Duas operações DIFERENTES, que o parecer exige separar:
//
//  1. `retomarUpload` — retomada da MESMA tentativa de transferência
//     (stage→final do próprio dono). NÃO aceita caminho do cliente: as fontes
//     possíveis são o stage do dono, o final já ligado e o recibo do ledger.
//
//  2. `prepareRecovery`/`confirmRecovery` — cópia de CONVERSA (R13): um plano
//     opaco curto (`recoveryId` + `token`) ligado a origem/destino/conjunto de
//     itens. A origem é resolvida no catálogo e no TRANSCRIPT persistido do
//     dono de origem — nunca por path, nome ou DTO do snapshot. `confirm`
//     materializa cópias privadas INDEPENDENTES (bytes próprios, hash
//     próprio), devolve mapa oldId→newId + indisponíveis e é idempotente
//     mesmo depois do consumo (retry devolve o MESMO recibo).
//
// Nada aqui lê grants M/MC1: blobs não são autorizados por grants.
import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { getDatabase, getSessionRecord } from '../database'
import { consultarDelecao } from '../deletions'
import { PersistenceProblem } from '../persistenceErrors'
import { readTranscript } from '../transcripts'
import type { ChatMessage } from '../../../types'
import { lerEnvelopeMultimodal } from '../../../domain/multimodal/mensagens'
import { withSessionPersistenceQueue } from '../filaSessao'
import { emTransacao, obterArtigo, obterUpload, upsertArtigo } from './catalogo'
import {
  caminhoAbsolutoDeArtigo, caminhoStagePara, hashDeArquivo, publicarPreparado, publicarPreparadoSemFila, raizPrivadaChat, type OpcoesEstoque,
} from './estoque'
import { carregarPolitica, problemaPolitica } from './politica'
import { nomeSeguroArquivo } from '../../../domain/anexosRascunho'
import { preservarOriginalHistorico } from './originalHistorico'

export interface ReciboRetomada {
  uploadId: string
  artifactId: string
  state: 'preparado' | 'pronto'
  bytes: number
  sha256: string | null
  verified: boolean
}

/**
 * Retomada da MESMA tentativa (T30): sem path livre. Fontes: stage íntegro do
 * dono, final já ligado com hash da intenção, ou nada (indisponível honesto).
 */
export async function retomarUpload(
  sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {},
): Promise<ReciboRetomada> {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  if (linha.mode === 'reference') {
    throw new PersistenceProblem(409, 'upload_not_recoverable', 'Referências de projeto não têm transferência a recuperar.')
  }
  if (linha.state === 'pronto') {
    return { uploadId, artifactId: linha.artifactId ?? '', state: 'pronto', bytes: linha.receivedBytes, sha256: linha.digest, verified: true }
  }
  if (linha.state === 'cancelado') {
    throw new PersistenceProblem(409, 'upload_cancelled', 'Esta transferência foi cancelada; reabra um novo envio.')
  }
  if (consultarDelecao(sessionId)) {
    throw new PersistenceProblem(410, 'session_deleted', 'Esta conversa foi excluída; nada é recuperado.')
  }

  const stagePath = linha.stagePath ?? (linha.finalPath ? caminhoStagePara(linha.finalPath, uploadId) : null)
  const stage = stagePath ? await stat(stagePath).catch(() => null) : null
  const stageCompleto = !!stage && stage.size > 0 && (linha.declaredBytes == null || stage.size === linha.declaredBytes)
  const final = linha.finalPath ? await stat(linha.finalPath).catch(() => null) : null
  const finalCompleto = !!final && final.isFile() && final.size > 0
    && (linha.declaredBytes == null || final.size === linha.declaredBytes)

  if (stageCompleto && stagePath) {
    const sha256 = await hashDeArquivo(stagePath)
    if (!sha256) throw new PersistenceProblem(500, 'recovery_verification_failed', 'Não foi possível verificar o stage.')
    if (linha.digest && linha.digest !== sha256) {
      await unlink(stagePath).catch(() => undefined)
      throw new PersistenceProblem(409, 'recovery_verification_failed',
        'O stage não bate com o hash registrado. A tentativa ficou como falha; reenvie o arquivo do rascunho.')
    }
    const { atualizarUpload } = await import('./catalogo')
    atualizarUpload(sessionId, chatId, uploadId, {
      state: 'preparado', stagePath, receivedBytes: stage!.size, digest: sha256, errorCode: null,
    })
    // Prepare+confirm na MESMA chamada idempotente: o stage verificado é
    // publicado; se a publicação não for possível agora, a tentativa fica
    // `preparado` e o cliente confirma depois sem reenviar bytes.
    const publicado = await publicarPreparado(sessionId, chatId, uploadId, opcoes).catch(() => null)
    if (publicado) {
      return {
        uploadId, artifactId: publicado.artifactId, state: 'pronto',
        bytes: publicado.bytes, sha256: publicado.sha256, verified: true,
      }
    }
    return { uploadId, artifactId: linha.artifactId ?? '', state: 'preparado', bytes: stage!.size, sha256, verified: true }
  }

  if (finalCompleto && linha.finalPath) {
    const sha256 = await hashDeArquivo(linha.finalPath)
    if (sha256 && (!linha.digest || linha.digest === sha256)) {
      const recibo = await publicarPreparado(sessionId, chatId, uploadId, opcoes).catch(() => null)
      if (recibo) {
        return { uploadId, artifactId: recibo.artifactId, state: 'pronto', bytes: recibo.bytes, sha256: recibo.sha256, verified: true }
      }
    }
  }

  throw new PersistenceProblem(410, 'recovery_unavailable',
    'Não há cópia íntegra desta origem no servidor. Reenvie o arquivo do rascunho; nada foi inventado.')
}

// ─────────────────────────── R13 — cópia de conversa ───────────────────────────

export interface PlanoRecovery {
  recoveryId: string
  token: string
  origemSessionId: string
  origemChatId: string
  destinoSessionId: string
  destinoChatId: string
  itens: Array<{ oldId: string; name: string; bytes: number; disponivel: boolean }>
  expiraEm: number
}

export interface ReciboRecovery {
  recoveryId: string
  mapa: Array<{ oldId: string; newId: string }>
  indisponiveis: Array<{ oldId: string; name: string; motivo: string }>
  consumidoEm: number
}

/**
 * R4 — progresso DURÁVEL por item. `newId` é a identidade de cópia, sorteada
 * UMA vez e gravada ANTES de materializar; `consumidoEm` marca o item pronto.
 * O recibo final é sempre derivado destes itens, nunca recalculado.
 */
interface ProgressoItem { newId?: string; consumidoEm?: number; motivo?: string }
type ProgressoPlano = Record<string, ProgressoItem>

function progressoDoPlano(plano: LinhaPlano): ProgressoPlano {
  if (!plano.mapa) return {}
  try {
    const bruto = JSON.parse(plano.mapa) as ProgressoPlano & { __itens?: ProgressoPlano }
    return bruto.__itens ?? {}
  } catch {
    return {}
  }
}

/**
 * Grava o progresso durável. U3 — devolve `false` quando a gravação falha, em
 * vez de propagar: uma falha de PROGRESSO não pode apagar o que está no disco
 * nem transformar um item materializado em "indisponível". O chamador decide
 * (o recibo continua sendo derivado do que foi comprovado).
 */
function gravarProgresso(recoveryId: string, progresso: ProgressoPlano): boolean {
  try {
    emTransacao(() => {
      getDatabase().prepare('UPDATE attachment_recovery_plans SET mapa = ? WHERE recovery_id = ?')
        .run(JSON.stringify({ __itens: progresso }), recoveryId)
    })
    return true
  } catch {
    return false
  }
}

/** Recibo derivado do progresso durável — mesma resposta para qualquer retry. */
function reciboDoProgresso(recoveryId: string, itens: PlanoRecovery['itens'], progresso: ProgressoPlano): Omit<ReciboRecovery, 'recoveryId'> {
  const mapa: ReciboRecovery['mapa'] = []
  const indisponiveis: ReciboRecovery['indisponiveis'] = []
  let consumidoEm = 0
  for (const item of itens) {
    const progressoItem = progresso[item.oldId]
    if (progressoItem?.consumidoEm && progressoItem.newId) {
      mapa.push({ oldId: item.oldId, newId: progressoItem.newId })
      consumidoEm = Math.max(consumidoEm, progressoItem.consumidoEm)
      continue
    }
    indisponiveis.push({
      oldId: item.oldId, name: item.name,
      motivo: progressoItem?.motivo
        ?? (item.disponivel ? 'cópia ainda não concluída' : 'fonte indisponível'),
    })
  }
  return { mapa, indisponiveis, consumidoEm: consumidoEm || Date.now() }
}

const VALIDADE_PLANO_MS = 10 * 60_000

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

interface LinhaPlano {
  recoveryId: string
  origemSessionId: string
  origemChatId: string
  destinoSessionId: string
  destinoChatId: string
  tokenHash: string
  itens: string
  state: 'preparado' | 'consumido'
  mapa: string | null
  criadoEm: number
  expiraEm: number
}

function linhaPlano(bruto: Record<string, unknown>): LinhaPlano {
  return {
    recoveryId: bruto.recovery_id as string,
    origemSessionId: bruto.origem_session_id as string,
    origemChatId: bruto.origem_chat_id as string,
    destinoSessionId: bruto.destino_session_id as string,
    destinoChatId: bruto.destino_chat_id as string,
    tokenHash: bruto.token_hash as string,
    itens: bruto.itens as string,
    state: bruto.state as 'preparado' | 'consumido',
    mapa: (bruto.mapa as string | null) ?? null,
    criadoEm: bruto.criado_em as number,
    expiraEm: bruto.expira_em as number,
  }
}

function obterPlano(recoveryId: string): LinhaPlano | undefined {
  const bruto = getDatabase().prepare('SELECT * FROM attachment_recovery_plans WHERE recovery_id = ?').get(recoveryId) as Record<string, unknown> | undefined
  return bruto ? linhaPlano(bruto) : undefined
}

/** ArtifactIds de anexos citados no TRANSCRIPT persistido da origem (prova de vínculo). */
async function artifactsCitadosNaOrigem(sessionId: string): Promise<Map<string, { chatId: string; name: string }>> {
  const record = getSessionRecord(sessionId)
  if (!record) throw new PersistenceProblem(404, 'session_not_found', 'Sessão de origem não encontrada.')
  const entradas = await readTranscript(record.slug, sessionId, 16 * 1024 * 1024)
  const citados = new Map<string, { chatId: string; name: string }>()
  for (const entrada of entradas) {
    const mensagem = entrada.message as ChatMessage | null
    for (const anexo of mensagem?.attachments ?? []) {
      if (anexo.artifactId) citados.set(anexo.artifactId, { chatId: entrada.chatId, name: anexo.name })
    }
    const leitura = lerEnvelopeMultimodal(mensagem?.multimodal)
    if (leitura.estado !== 'valido') continue
    for (const parte of leitura.envelope.partes) {
      if (parte.tipo === 'artefato' && !citados.has(parte.artifactId)) {
        citados.set(parte.artifactId, { chatId: entrada.chatId, name: 'Arquivo da conversa' })
      }
    }
  }
  return citados
}

/**
 * Prepare: valida origem (catálogo + transcript) e destino (dono), escolhe os
 * itens disponíveis e devolve plano opaco curto. Sem origem viva, NÃO emite
 * token: a recuperação textual segue, os anexos ficam indisponíveis até
 * reenvio humano explícito.
 */
export async function prepareRecovery(entrada: {
  destinoSessionId: string
  destinoChatId: string
  origemSessionId: string
  agora?: () => number
}): Promise<PlanoRecovery> {
  const politica = carregarPolitica()
  if (!politica.ok) {
    const problema = problemaPolitica(politica)
    throw new PersistenceProblem(problema.status, problema.code, problema.message)
  }
  const { destinoSessionId, destinoChatId, origemSessionId } = entrada
  if (destinoSessionId === origemSessionId && entrada.destinoChatId === undefined) {
    throw new PersistenceProblem(400, 'invalid_field', 'Origem e destino precisam ser explícitos.')
  }
  if (consultarDelecao(origemSessionId)) {
    // R13 — origem excluída: nenhum token de leitura. Texto pode ser
    // recuperado; anexos ficam como indisponíveis.
    throw new PersistenceProblem(410, 'recovery_source_unavailable',
      'A conversa de origem foi excluída: os anexos dela não podem ser copiados. O histórico textual pode ser recuperado, e os arquivos exigem reenvio explícito.')
  }
  const origem = getSessionRecord(origemSessionId)
  if (!origem) {
    throw new PersistenceProblem(410, 'recovery_source_unavailable',
      'A conversa de origem não está mais no servidor: os arquivos exigem reenvio explícito.')
  }
  const citados = await artifactsCitadosNaOrigem(origemSessionId)
  if (citados.size === 0) {
    return {
      recoveryId: '', token: '', origemSessionId, origemChatId: '',
      destinoSessionId, destinoChatId, itens: [], expiraEm: 0,
    }
  }
  const itens: PlanoRecovery['itens'] = []
  for (const [oldId, citacao] of citados) {
    const artigo = obterArtigo(oldId)
    const donoCorreto = artigo?.sessionId === origemSessionId && artigo.chatId === citacao.chatId
    if (!donoCorreto) {
      itens.push({ oldId, name: citacao.name, bytes: 0, disponivel: false })
      continue
    }
    itens.push({ oldId, name: artigo.name, bytes: artigo.bytes, disponivel: true })
  }
  const recuperaveis = itens.filter((item) => item.disponivel)
  if (recuperaveis.length === 0) {
    const planoVazio: PlanoRecovery = {
      recoveryId: '', token: '', origemSessionId, origemChatId: itens.length ? '' : '',
      destinoSessionId, destinoChatId, itens, expiraEm: 0,
    }
    return planoVazio
  }

  const recoveryId = randomUUID()
  const token = randomUUID() + randomUUID().replace(/-/g, '')
  const agora = entrada.agora?.() ?? Date.now()
  const expiraEm = agora + VALIDADE_PLANO_MS
  emTransacao(() => {
    getDatabase().prepare(`
      INSERT INTO attachment_recovery_plans (recovery_id, origem_session_id, origem_chat_id, destino_session_id,
        destino_chat_id, token_hash, itens, state, mapa, criado_em, expira_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'preparado', NULL, ?, ?)
    `).run(recoveryId, origemSessionId, recuperaveis[0] ? citados.get(recuperaveis[0].oldId)?.chatId ?? '' : '',
      destinoSessionId, destinoChatId, hashToken(token), JSON.stringify(itens), agora, expiraEm)
  })
  return {
    recoveryId, token, origemSessionId,
    origemChatId: recuperaveis[0] ? citados.get(recuperaveis[0].oldId)?.chatId ?? '' : '',
    destinoSessionId, destinoChatId, itens, expiraEm,
  }
}

/**
 * U3 — reconhece a cópia já publicada por ESTA tentativa (mesmo `newId`, mesmo
 * dono) e devolve o artifactId, sem copiar nem inserir de novo. Só aceita a
 * adoção quando o artefato do destino pertence ao dono esperado e os bytes
 * conferem com o hash da origem; qualquer divergência cai no fluxo normal.
 */
async function adotarCopiaExistente(
  destino: { sessionId: string; chatId: string }, novoId: string, nome: string, shaOrigem: string,
): Promise<string | null> {
  const linha = obterUpload(destino.sessionId, destino.chatId, novoId)
  if (!linha || !linha.artifactId || !linha.finalPath) return null
  if (linha.state !== 'pronto' && linha.state !== 'preparado') return null
  if (linha.digest && linha.digest !== shaOrigem) return null
  const artigo = obterArtigo(linha.artifactId)
  if (!artigo) return null
  if (artigo.sessionId !== destino.sessionId || artigo.chatId !== destino.chatId) return null
  if (artigo.sha256 && artigo.sha256 !== shaOrigem) return null
  const medido = await hashDeArquivo(linha.finalPath).catch(() => null)
  if (!medido || medido !== shaOrigem) return null
  if (linha.state === 'preparado') {
    // Publicado no disco mas não finalizado: conclui pelo mesmo caminho da
    // publicação (recuperação de "publicado antes do commit"). Já sob a fila.
    const recibo = await publicarPreparadoSemFila(destino.sessionId, destino.chatId, novoId).catch(() => null)
    if (!recibo) return null
    return recibo.artifactId
  }
  void nome
  return artigo.artifactId
}

async function copiarItem(
  oldId: string, artigo: NonNullable<ReturnType<typeof obterArtigo>>,
  destino: { sessionId: string; chatId: string }, novoId: string, opcoes: OpcoesEstoque,
): Promise<string> {
  const politicaResultado = carregarPolitica()
  if (!politicaResultado.ok) {
    const problema = problemaPolitica(politicaResultado)
    throw new PersistenceProblem(problema.status, problema.code, problema.message)
  }
  const politica = politicaResultado.politica
  const trabalho = caminhoAbsolutoDeArtigo(artigo, opcoes.appDir)
  const origemAbsoluta = artigo.rootKind === 'workspace' && artigo.mode === 'copy' && artigo.papel === 'upload-workspace' && artigo.workspaceRoot
    ? await preservarOriginalHistorico(artigo, trabalho, artigo.workspaceRoot, opcoes.appDir)
    : trabalho
  const info = await stat(origemAbsoluta).catch(() => null)
  if (!info || !info.isFile()) {
    throw new PersistenceProblem(410, 'recovery_item_unavailable', 'O arquivo de origem não está mais disponível.')
  }
  if (info.size > politica.maxUploadBytes) {
    throw new PersistenceProblem(413, 'file_too_large', 'O arquivo de origem excede a política local desta transferência.')
  }
  const shaOrigem = await hashDeArquivo(origemAbsoluta)
  if (!shaOrigem || (artigo.sha256 && shaOrigem !== artigo.sha256)) {
    throw new PersistenceProblem(409, 'recovery_item_changed',
      'O arquivo de origem mudou desde o registro. Nada foi copiado; atualize a referência ou reenvie o arquivo.')
  }
  // Cópia PRIVADA INDEPENDENTE: novos bytes no âmbito do chat de destino. A
  // identidade vem do progresso durável do plano (R4), nunca sorteada de novo.
  const nome = nomeSeguroArquivo(artigo.name, politica.maxNomeBytes)
  const finalPath = path.join(raizPrivadaChat(opcoes.appDir), destino.sessionId, destino.chatId, novoId, nome)
  const stagePath = caminhoStagePara(finalPath, novoId)

  // U3 — RETOMADA da própria operação. Se a tentativa anterior materializou a
  // cópia e só falhou ao gravar o recibo, a tentativa já existe no destino
  // (linha do próprio dono + artefato pronto + bytes com o hash da origem).
  // Nesse caso ADOTA-se o que está publicado; nunca se refaz INSERT/cópia nem
  // se rebaixa o item a "indisponível".
  const adotado = await adotarCopiaExistente(destino, novoId, nome, shaOrigem)
  if (adotado) return adotado
  await mkdir(path.dirname(stagePath), { recursive: true })
  await copyFile(origemAbsoluta, stagePath)
  const shaCopia = await hashDeArquivo(stagePath)
  if (!shaCopia || shaCopia !== shaOrigem) {
    await unlink(stagePath).catch(() => undefined)
    throw new PersistenceProblem(500, 'recovery_verification_failed', 'A cópia privada não confere com a origem.')
  }
  const agora = Date.now()
  emTransacao(() => {
    getDatabase().prepare(`
      INSERT INTO attachment_uploads (session_id, chat_id, upload_id, artifact_id, name, declared_bytes, mime,
        received_bytes, digest, state, stage_path, final_path, mode, scope, workspace_root, created_at, updated_at, error_code)
      VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, 'preparado', ?, ?, 'copy', 'chat', NULL, ?, ?, NULL)
    `).run(destino.sessionId, destino.chatId, novoId, novoId, nome, info.size, info.size, shaCopia,
      stagePath, finalPath, agora, agora)
  })
  // Já estamos sob a fila do dono (R4): usa o corpo sem fila, nunca reentra.
  const recibo = await publicarPreparadoSemFila(destino.sessionId, destino.chatId, novoId, opcoes)
  return recibo.artifactId
}

/**
 * Confirm: revalida lifecycle, materializa as cópias e devolve mapa +
 * indisponíveis. Consumo grava o recibo na linha do plano; retry posterior
 * devolve EXATAMENTE o mesmo recibo, sem duplicar arquivo.
 */
export async function confirmRecovery(entrada: {
  destinoSessionId: string
  destinoChatId: string
  recoveryId: string
  token: string
  agora?: () => number
}, opcoes: OpcoesEstoque = {}): Promise<ReciboRecovery> {
  const plano = obterPlano(entrada.recoveryId)
  if (!plano) throw new PersistenceProblem(404, 'recovery_not_found', 'Plano de recuperação não encontrado. Prepare novamente.')
  if (plano.destinoSessionId !== entrada.destinoSessionId || plano.destinoChatId !== entrada.destinoChatId) {
    throw new PersistenceProblem(403, 'recovery_out_of_scope', 'Este plano de recuperação pertence a outra conversa.')
  }
  if (plano.tokenHash !== hashToken(entrada.token)) {
    throw new PersistenceProblem(403, 'recovery_token_invalid', 'O plano de recuperação não confere. Prepare novamente.')
  }

  // R4 — as confirmações do MESMO plano são SERIALIZADAS pela fila do dono de
  // destino (a mesma fila da persistência; sem fila por módulo). Assim duas
  // chamadas simultâneas não leem "preparado" ao mesmo tempo: a segunda entra
  // depois da primeira e só vê o progresso durável.
  return withSessionPersistenceQueue(entrada.destinoSessionId, async () => {
    // Releitura DENTRO da seção crítica: o plano pode ter mudado enquanto
    // esperávamos a fila.
    const atual = obterPlano(entrada.recoveryId)!
    const agora = entrada.agora?.() ?? Date.now()
    const itens = JSON.parse(atual.itens) as PlanoRecovery['itens']
    const progresso = progressoDoPlano(atual)

    if (atual.state === 'consumido') {
      // Retry idempotente: mesmo recibo derivado do progresso, sem nova cópia.
      return { recoveryId: atual.recoveryId, ...reciboDoProgresso(atual.recoveryId, itens, progresso) }
    }
    if (agora > atual.expiraEm) {
      throw new PersistenceProblem(409, 'recovery_plan_expired',
        'O plano de recuperação expirou. Repita o gesto de recuperação para gerar outro.')
    }
    if (consultarDelecao(entrada.destinoSessionId)) {
      throw new PersistenceProblem(410, 'session_deleted', 'A conversa de destino foi excluída; nada foi copiado.')
    }
    // R5 — lifecycle da ORIGEM revalidado no confirm (o prepare pode ter sido
    // feito com a origem viva; o tombstone não pode liberar bytes depois).
    if (consultarDelecao(atual.origemSessionId)) {
      throw new PersistenceProblem(410, 'recovery_source_unavailable',
        'A conversa de origem foi excluída depois da preparação: os anexos dela não podem ser copiados. O histórico textual pode ser recuperado e os arquivos exigem reenvio explícito.')
    }

    for (const item of itens) {
      // Item já concluído em tentativa anterior: nada a refazer (R4).
      if (progresso[item.oldId]?.consumidoEm && progresso[item.oldId]?.newId) continue
      if (!item.disponivel) continue

      // R5 — fonte revalidada ANTES de materializar CADA item (o tombstone
      // pode chegar entre um item e outro da mesma confirmação).
      if (consultarDelecao(atual.origemSessionId)) {
        throw new PersistenceProblem(410, 'recovery_source_unavailable',
          'A conversa de origem foi excluída durante a recuperação: nenhuma cópia nova será feita. O histórico textual pode ser recuperado e os arquivos exigem reenvio explícito.')
      }
      const artigo = obterArtigo(item.oldId)
      if (!artigo || artigo.sessionId !== atual.origemSessionId) continue

      // Identidade de cópia estável: sorteada uma vez e GRAVADA antes de
      // materializar; um retry após reinício reusa o mesmo id.
      // A procedência do id É a prova de durabilidade: `progresso` foi lido do
      // plano no banco agora, então um `newId` presente nele já foi gravado
      // numa execução anterior (inclusive por versão anterior a esta).
      const newIdPersistido = progresso[item.oldId]?.newId
      const newId = newIdPersistido ?? randomUUID()
      const identidadeJaDuravel = Boolean(newIdPersistido)
      progresso[item.oldId] = { ...progresso[item.oldId], newId }
      if (!gravarProgresso(atual.recoveryId, progresso)) {
        // U4 — a RESERVA INICIAL da identidade é indispensável: sem ela, uma
        // resposta perdida faria o retry sortear outro `newId` e materializar
        // uma SEGUNDA cópia. Falhar aqui (antes de copiar) mantém plano e
        // artefatos intactos e é recuperável no retry.
        if (!identidadeJaDuravel) {
          delete progresso[item.oldId]
          throw new PersistenceProblem(503, 'recovery_progress_pending',
            'A identidade desta cópia ainda não pôde ser registrada. Nada foi copiado; repita a confirmação em instantes.')
        }
        // Já registrada em tentativa anterior: a cópia pode prosseguir e ser
        // adotada no retry (fluxo U3).
      }

      try {
        await copiarItem(item.oldId, artigo, {
          sessionId: entrada.destinoSessionId, chatId: entrada.destinoChatId,
        }, newId, opcoes)
        // A cópia ESTÁ no destino: o recibo desta execução a inclui mesmo que a
        // gravação durável falhe (U3). O retry a adota pelo mesmo `newId`.
        delete progresso[item.oldId]?.motivo
        progresso[item.oldId] = { newId, consumidoEm: Date.now() }
        gravarProgresso(atual.recoveryId, progresso)
      } catch (erro) {
        if (erro instanceof PersistenceProblem && erro.code === 'recovery_source_unavailable') throw erro
        // Falha de UM item não apaga o progresso dos outros; o motivo real fica
        // durável e o retry pode retomá-lo pelo mesmo newId.
        progresso[item.oldId] = {
          newId,
          motivo: erro instanceof PersistenceProblem ? erro.message : 'falha ao copiar o arquivo',
        }
        gravarProgresso(atual.recoveryId, progresso)
      }
    }

    const recibo = reciboDoProgresso(atual.recoveryId, itens, progresso)
    // U3 — o plano só é selado quando TODOS os itens do plano estão duráveis.
    // Se a gravação do progresso falhou, o plano permanece `preparado` e o
    // retry retoma pelo mesmo `newId` (adotando a cópia já materializada).
    const completo = itens.every((item) => !item.disponivel
      || (progresso[item.oldId]?.consumidoEm && progresso[item.oldId]?.newId))
    if (completo && gravarProgresso(atual.recoveryId, progresso)) {
      try {
        emTransacao(() => {
          getDatabase().prepare("UPDATE attachment_recovery_plans SET state = 'consumido', mapa = ? WHERE recovery_id = ?")
            .run(JSON.stringify({ __itens: progresso }), atual.recoveryId)
        })
      } catch {
        // Selo falhou: plano segue retomável; o recibo devolvido continua
        // refletindo o que foi comprovadamente materializado.
      }
    }
    return { recoveryId: atual.recoveryId, ...recibo }
  })
}

/** Reexport para quem já usava o helper de publicação do módulo. */
export { upsertArtigo }
