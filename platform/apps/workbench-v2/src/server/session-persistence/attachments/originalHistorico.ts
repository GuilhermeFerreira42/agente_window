// Cópia independente e verificável dos bytes de um upload de projeto.
// Não cria vínculo de mensagem nem autoriza acesso; o chamador valida o dono.
// O nome e as identidades vêm exclusivamente do catálogo de anexos.
import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { link, lstat, mkdir, open, statfs, unlink } from 'node:fs/promises'
import path from 'node:path'
import { getAppDir } from '../paths'
import { PersistenceProblem } from '../persistenceErrors'
import { garantirDentroDaRaiz, garantirDiretorioReal } from './contencao'
import { carregarPolitica, problemaPolitica } from './politica'

export interface IdentidadeOriginal {
  sessionId: string
  chatId: string
  artifactId: string
  name: string
  bytes: number
  sha256: string
}

function segmento(valor: string): boolean {
  return !!valor && valor !== '.' && valor !== '..' && !/[\\/\0]/u.test(valor)
}

/** No mesmo estoque privado existente, nunca sob a raiz de trabalho. */
export function caminhoOriginalHistorico(item: IdentidadeOriginal, appDir = getAppDir()): string {
  if (![item.sessionId, item.chatId, item.artifactId, item.name].every(segmento)) {
    throw new PersistenceProblem(409, 'attachment_original_invalid', 'Identidade do original inválida.')
  }
  return path.join(appDir, 'uploads', 'chats', item.sessionId, item.chatId, item.artifactId, item.name)
}

async function conferir(caminho: string, item: IdentidadeOriginal): Promise<boolean> {
  const anterior = await lstat(caminho).catch(() => null)
  if (!anterior?.isFile() || anterior.isSymbolicLink() || anterior.size !== item.bytes) return false
  const arquivo = await open(caminho, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null)
  if (!arquivo) return false
  try {
    const atual = await arquivo.stat()
    if (!atual.isFile() || atual.dev !== anterior.dev || atual.ino !== anterior.ino || atual.size !== item.bytes) return false
    const hash = createHash('sha256'), buffer = Buffer.allocUnsafe(64 * 1024)
    let total = 0
    for (;;) {
      const { bytesRead } = await arquivo.read(buffer, 0, buffer.length, null)
      if (!bytesRead) break
      total += bytesRead
      if (total > item.bytes) return false
      hash.update(buffer.subarray(0, bytesRead))
    }
    return total === item.bytes && hash.digest('hex') === item.sha256
  } finally { await arquivo.close() }
}

/**
 * Copia bytes limitados para stage privado, verifica hash e publica sem nunca
 * sobrescrever. Não usa hardlink do arquivo de trabalho: edição nele não pode
 * alterar o histórico. O stage temporário é descartado em qualquer falha.
 */
export async function preservarOriginalHistorico(item: IdentidadeOriginal, origem: string, raizOrigem: string, appDir = getAppDir()): Promise<string> {
  if (!Number.isSafeInteger(item.bytes) || item.bytes < 0 || !/^[a-f0-9]{64}$/u.test(item.sha256)) {
    throw new PersistenceProblem(409, 'attachment_original_invalid', 'O original não tem integridade verificável.')
  }
  const destino = caminhoOriginalHistorico(item, appDir)
  const pasta = path.dirname(destino)
  await garantirDiretorioReal(pasta)
  await mkdir(pasta, { recursive: true })
  await garantirDiretorioReal(pasta)
  const existente = await lstat(destino).catch(() => null)
  if (existente) {
    if (await conferir(destino, item)) return destino
    throw new PersistenceProblem(409, 'attachment_original_changed', 'A cópia histórica não confere; nenhum original foi substituído.')
  }
  const resultadoPolitica = carregarPolitica()
  if (!resultadoPolitica.ok) {
    const erro = problemaPolitica(resultadoPolitica)
    throw new PersistenceProblem(erro.status, erro.code, erro.message)
  }
  const volume = await statfs(pasta)
  if (volume.bavail * volume.bsize - item.bytes < resultadoPolitica.politica.reservaDiscoBytes) {
    throw new PersistenceProblem(507, 'insufficient_storage', 'Não há espaço para preservar o original; o arquivo de trabalho não foi alterado.')
  }
  await garantirDentroDaRaiz(raizOrigem, origem, { code: 'attachment_original_absent', mensagem: 'O original não está disponível.' })
  const anterior = await lstat(origem).catch(() => null)
  if (!anterior?.isFile() || anterior.isSymbolicLink() || anterior.size !== item.bytes) {
    throw new PersistenceProblem(409, 'attachment_original_absent', 'O original não está disponível ou foi alterado.')
  }
  const entrada = await open(origem, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null)
  if (!entrada) throw new PersistenceProblem(409, 'attachment_original_absent', 'O original não pôde ser aberto.')
  const temp = path.join(pasta, `.original-${randomUUID()}.part`)
  let saida: Awaited<ReturnType<typeof open>> | undefined
  try {
    const info = await entrada.stat()
    if (!info.isFile() || info.dev !== anterior.dev || info.ino !== anterior.ino || info.size !== item.bytes) {
      throw new PersistenceProblem(409, 'attachment_original_changed', 'O original mudou durante a preservação.')
    }
    saida = await open(temp, 'wx', 0o600)
    const buffer = Buffer.allocUnsafe(64 * 1024), hash = createHash('sha256')
    let total = 0
    for (;;) {
      const { bytesRead } = await entrada.read(buffer, 0, buffer.length, null)
      if (!bytesRead) break
      total += bytesRead
      if (total > item.bytes) throw new PersistenceProblem(409, 'attachment_original_changed', 'O original mudou durante a preservação.')
      hash.update(buffer.subarray(0, bytesRead))
      let gravados = 0
      while (gravados < bytesRead) {
        const resultado = await saida.write(buffer, gravados, bytesRead - gravados, null)
        if (!resultado.bytesWritten) throw new Error('Falha ao gravar cópia histórica.')
        gravados += resultado.bytesWritten
      }
    }
    if (total !== item.bytes || hash.digest('hex') !== item.sha256) {
      throw new PersistenceProblem(409, 'attachment_original_changed', 'O original não confere com o hash registrado.')
    }
    await saida.sync()
    await saida.close()
    saida = undefined
    try { await link(temp, destino) } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code !== 'EEXIST' || !(await conferir(destino, item))) throw erro
    }
    return destino
  } finally {
    await saida?.close().catch(() => undefined)
    await entrada.close()
    await unlink(temp).catch(() => undefined)
  }
}
