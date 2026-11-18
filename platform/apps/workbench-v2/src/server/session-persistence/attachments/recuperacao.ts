// C-3a — recuperação pós-falha (R11/T30/T31): prepare cria/verifica a
// cópia no âmbito PRIVADO com journal; confirm publica e liga ao artefato —
// sempre no MESMO identificador (nunca duplica o arquivo do rascunho).
import { copyFile, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { PersistenceProblem } from '../persistenceErrors'
import { obterUpload } from './catalogo'
import { caminhoStage, hashDeArquivo, publicarPreparado, type OpcoesEstoque } from './estoque'

export interface ReciboRecovery {
  uploadId: string
  artifactId: string
  state: 'preparado' | 'pronto'
  bytes: number
  sha256: string | null
  verified: boolean
}

/**
 * Prepare: garante a cópia verificada no âmbito privado (stage do dono) e
 * grava a intenção durável. Fonte aceita: stage atual, final já linkado ou
 * — para âmbito workspace — o próprio arquivo de origem declarado.
 */
export async function prepareRecovery(
  sessionId: string, chatId: string, uploadId: string, origem?: string, opcoes: OpcoesEstoque = {},
): Promise<ReciboRecovery> {
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

  const stagePath = linha.stagePath ?? caminhoStage(opcoes.appDir, sessionId, chatId, uploadId)
  const stageAtual = await stat(stagePath).catch(() => null)
  const stageCompleto = !!stageAtual && stageAtual.size > 0
    && (linha.declaredBytes == null || stageAtual.size === linha.declaredBytes)
  const finalAtual = linha.finalPath ? await stat(linha.finalPath).catch(() => null) : null
  const finalCompleto = !!finalAtual && finalAtual.isFile() && finalAtual.size > 0
    && (linha.declaredBytes == null || finalAtual.size === linha.declaredBytes)
  // Prioridade: stage íntegro → origem declarada (rascunho) → final já linkado.
  // Stage PARCIAL nunca publica: sem fonte íntegra a recuperação é indisponível honesta (T31).
  const fonte = stageCompleto
    ? stagePath
    : origem ?? (finalCompleto && linha.finalPath ? linha.finalPath : null)
  if (!fonte) {
    throw new PersistenceProblem(410, 'stage_missing',
      'Não há cópia de origem para recuperar. Retome o envio do MESMO identificador a partir do rascunho local.')
  }
  const info = await stat(fonte).catch(() => null)
  if (!info || !info.isFile()) {
    throw new PersistenceProblem(410, 'stage_missing', 'A origem da recuperação não existe mais.')
  }

  // Cópia verificada no âmbito privado (nunca move nem sobrescreve destino).
  if (path.resolve(fonte) !== path.resolve(stagePath)) {
    const { mkdir } = await import('node:fs/promises')
    await mkdir(path.dirname(stagePath), { recursive: true })
    await copyFile(fonte, stagePath)
  }
  const sha256 = await hashDeArquivo(stagePath)
  if (!sha256) {
    throw new PersistenceProblem(500, 'recovery_verification_failed', 'Não foi possível verificar a cópia recuperada.')
  }
  if (linha.digest && linha.digest !== sha256) {
    await unlink(stagePath).catch(() => undefined)
    throw new PersistenceProblem(409, 'recovery_verification_failed',
      'A cópia recuperada não bate com o hash registrado. A transferência original foi preservada como falha.')
  }
  const bytes = (await stat(stagePath)).size
  const { atualizarUpload } = await import('./catalogo')
  atualizarUpload(sessionId, chatId, uploadId, {
    state: 'preparado', stagePath, receivedBytes: bytes, digest: sha256, errorCode: null,
  })
  return { uploadId, artifactId: linha.artifactId ?? '', state: 'preparado', bytes, sha256, verified: true }
}

/** Confirm: publica (no-overwrite) e promove o artefato ao estado final. */
export async function confirmRecovery(sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {}): Promise<ReciboRecovery> {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  if (linha.state === 'pronto') {
    return { uploadId, artifactId: linha.artifactId ?? '', state: 'pronto', bytes: linha.receivedBytes, sha256: linha.digest, verified: true }
  }
  if (linha.state !== 'preparado') {
    throw new PersistenceProblem(409, 'upload_not_prepared', 'Prepare a recuperação antes de confirmar.')
  }
  const recibo = await publicarPreparado(sessionId, chatId, uploadId, opcoes)
  return {
    uploadId: recibo.uploadId, artifactId: recibo.artifactId, state: 'pronto',
    bytes: recibo.bytes, sha256: recibo.sha256, verified: true,
  }
}
