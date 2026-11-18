// C-3a — armazenamento e publicação de anexos (R03/R05/R06):
// stage no mesmo volume, journal durável antes do link, publicação
// no-overwrite (link EEXIST preserva bytes anteriores) e reconciliação
// idempotente por identidade. Sem rename por cima de arquivo do usuário.
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import {
  link, mkdir, open, readdir, rm, stat, statfs, unlink,
} from 'node:fs/promises'
import type { Readable } from 'node:stream'
import path from 'node:path'
import { getAppDir } from '../paths'
import { PersistenceProblem } from '../persistenceErrors'
import {
  atualizarUpload, bytesPublicadosChat, inserirUpload, listarUploads, obterArtigo, obterUpload,
  upsertArtigo, uploadsAtivos,
} from './catalogo'
import type { EscopoAnexo, LinhaUpload, ModoAnexo } from './schemaAnexos'
import { carregarPolitica, problemaPolitica, type PoliticaAnexos } from './politica'
import { nomeSeguroArquivo } from '../../../domain/anexosRascunho'

export interface OpcoesEstoque {
  appDir?: string
  agora?: () => number
  uuid?: () => string
}

export interface EntradaAdmissao {
  sessionId: string
  chatId: string
  name: string
  declaredBytes: number | null
  mime?: string
  mode: ModoAnexo
  scope: EscopoAnexo
  workspaceRoot?: string | null
  /** Identificador estável do cliente (R11: retry reutiliza o mesmo id). */
  uploadId?: string
}

export interface ReciboUpload {
  uploadId: string
  artifactId: string
  name: string
  bytes: number
  sha256: string | null
  state: LinhaUpload['state']
  mode: ModoAnexo
  scope: EscopoAnexo
  errorCode: string | null
}

function raiz(appDir?: string): string { return appDir ?? getAppDir() }

export function caminhoStage(appDir: string | undefined, sessionId: string, chatId: string, uploadId: string): string {
  return path.join(raiz(appDir), 'uploads', 'stages', sessionId, chatId, `${uploadId}.part`)
}

export function caminhoFinalChat(appDir: string | undefined, sessionId: string, chatId: string, artifactId: string, nome: string): string {
  return path.join(raiz(appDir), 'uploads', 'chats', sessionId, chatId, artifactId, nome)
}

export function caminhoFinalWorkspace(workspaceRoot: string, nome: string): string {
  return path.join(workspaceRoot, 'uploads', nome)
}

function politicaOuBloqueio(): PoliticaAnexos {
  const resultado = carregarPolitica()
  if (!resultado.ok) {
    const problema = problemaPolitica(resultado)
    throw new PersistenceProblem(problema.status, problema.code, problema.message)
  }
  return resultado.politica
}

function falhaUpload(linha: LinhaUpload, code: string, message: string, status = 400): never {
  atualizarUpload(linha.sessionId, linha.chatId, linha.uploadId, { state: 'falhou', errorCode: code })
  throw new PersistenceProblem(status, code, message)
}

async function garantirVolume(alvo: string, bytes: number, politica: PoliticaAnexos): Promise<void> {
  await mkdir(path.dirname(alvo), { recursive: true })
  const info = await statfs(path.dirname(alvo))
  const livre = info.bavail * info.bsize
  if (livre - bytes < politica.reservaDiscoBytes) {
    throw new PersistenceProblem(507, 'insufficient_storage',
      'Espaço livre insuficiente no disco para esta transferência. Nenhum arquivo parcial foi salvo.')
  }
}

/** Admissão: valida política/escopo/quota/concorrência e grava a intenção durável. */
export async function admitirUpload(entrada: EntradaAdmissao, opcoes: OpcoesEstoque = {}): Promise<ReciboUpload> {
  const politica = politicaOuBloqueio()
  const agora = opcoes.agora?.() ?? Date.now()
  const uuid = opcoes.uuid?.() ?? crypto.randomUUID()
  const nome = nomeSeguroArquivo(entrada.name, politica.maxNomeBytes)

  if (entrada.declaredBytes != null) {
    if (!Number.isSafeInteger(entrada.declaredBytes) || entrada.declaredBytes < 0) {
      throw new PersistenceProblem(400, 'file_too_large', 'Tamanho declarado inválido.')
    }
    if (entrada.declaredBytes > politica.maxUploadBytes) {
      throw new PersistenceProblem(413, 'file_too_large',
        `O arquivo excede o limite de ${politica.maxUploadBytes} bytes desta política local. Nada foi transferido.`)
    }
  }
  if (entrada.mode === 'copy' && entrada.declaredBytes == null) {
    throw new PersistenceProblem(400, 'size_mismatch', 'Cópia exige tamanho declarado antes da admissão.')
  }
  if (entrada.mode === 'reference' && !entrada.workspaceRoot) {
    throw new PersistenceProblem(400, 'reference_out_of_scope', 'Referência de projeto exige a pasta do workspace.')
  }

  const ativos = uploadsAtivos()
  if (ativos.length >= politica.concorrencia) {
    throw new PersistenceProblem(429, 'too_many_uploads',
      `Já existem ${ativos.length} transferências ativas (limite ${politica.concorrencia}). Conclua uma antes de iniciar outra.`)
  }

  if (entrada.mode === 'copy' && entrada.scope === 'chat') {
    const publicados = bytesPublicadosChat(entrada.sessionId, entrada.chatId)
    const emVoo = ativos
      .filter((linha) => linha.sessionId === entrada.sessionId && linha.chatId === entrada.chatId)
      .reduce((total, linha) => total + (linha.declaredBytes ?? 0), 0)
    if (publicados + emVoo + (entrada.declaredBytes ?? 0) > politica.quotaChatBytes) {
      throw new PersistenceProblem(507, 'quota_exceeded',
        'A quota privada desta conversa foi excedida pela soma dos arquivos armazenados. Nada foi transferido.')
    }
  }

  // Retomada (R11): mesmo identificador local reutiliza a linha — sem duplicar.
  const uploadId = entrada.uploadId && /^[0-9a-f-]{36}$/i.test(entrada.uploadId) ? entrada.uploadId : uuid
  const artifactId = uploadId
  const stagePath = caminhoStage(opcoes.appDir, entrada.sessionId, entrada.chatId, uploadId)
  const finalPath = entrada.mode === 'reference' || entrada.scope === 'workspace'
    ? caminhoFinalWorkspace(entrada.workspaceRoot!, nome)
    : caminhoFinalChat(opcoes.appDir, entrada.sessionId, entrada.chatId, artifactId, nome)
  const existenteUpload = obterUpload(entrada.sessionId, entrada.chatId, uploadId)
  if (existenteUpload) {
    if (existenteUpload.state === 'pronto') return reciboDe(existenteUpload)
    if (existenteUpload.state === 'recebendo' || existenteUpload.state === 'preparado') {
      throw new PersistenceProblem(409, 'upload_in_flight', 'Esta transferência já está em andamento.')
    }
    // falhou/cancelado/admitido → nova tentativa no MESMO id (sem duplicar).
    atualizarUpload(entrada.sessionId, entrada.chatId, uploadId, {
      state: 'admitido', name: nome, declaredBytes: entrada.declaredBytes, mime: entrada.mime ?? '',
      receivedBytes: 0, digest: null, errorCode: null, stagePath, finalPath,
    })
    const reatualizado = obterUpload(entrada.sessionId, entrada.chatId, uploadId)!
    return reciboDe(reatualizado)
  }

  await garantirVolume(finalPath, entrada.declaredBytes ?? 0, politica)

  inserirUpload({
    sessionId: entrada.sessionId, chatId: entrada.chatId, uploadId, artifactId,
    name: nome, declaredBytes: entrada.declaredBytes, mime: entrada.mime ?? '',
    state: 'admitido', stagePath, finalPath, mode: entrada.mode, scope: entrada.scope,
    workspaceRoot: entrada.workspaceRoot ?? null, createdAt: agora, updatedAt: agora,
  })
  return {
    uploadId, artifactId, name: nome, bytes: entrada.declaredBytes ?? 0,
    sha256: null, state: 'admitido', mode: entrada.mode, scope: entrada.scope, errorCode: null,
  }
}

/**
 * Recebe o corpo binário em stream (nunca JSON/base64), conta bytes e grava o
 * hash em uma passada só. Acima do máximo declarado/policy → falha de
 * transferência (T07): stage removido, nenhum estado pronto, mensagem nunca
 * publicada com aquele conteúdo.
 */
export async function receberConteudo(
  sessionId: string, chatId: string, uploadId: string,
  fonte: Readable, opcoes: OpcoesEstoque = {},
): Promise<ReciboUpload> {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  if (linha.state === 'pronto') throw new PersistenceProblem(409, 'upload_already_finalized', 'Esta transferência já foi publicada.')
  if (linha.state === 'cancelado') throw new PersistenceProblem(409, 'upload_cancelled', 'Esta transferência foi cancelada.')
  const politica = politicaOuBloqueio()
  const limite = Math.min(linha.declaredBytes ?? politica.maxUploadBytes, politica.maxUploadBytes)

  atualizarUpload(sessionId, chatId, uploadId, { state: 'recebendo' })
  const stagePath = linha.stagePath ?? caminhoStage(opcoes.appDir, sessionId, chatId, uploadId)
  await mkdir(path.dirname(stagePath), { recursive: true })

  const hash = createHash('sha256')
  let bytes = 0
  await new Promise<void>((resolve, reject) => {
    const destino = createWriteStream(stagePath, { flags: 'w' })
    fonte.on('data', (pedaco: Buffer | string) => {
      bytes += typeof pedaco === 'string' ? Buffer.byteLength(pedaco) : pedaco.length
      if (bytes > limite) {
        fonte.destroy()
        destino.destroy()
        reject(new PayloadGrandeError(limite))
      }
    })
    fonte.on('error', (erro) => { destino.destroy(); reject(erro) })
    destino.on('error', (erro) => { fonte.destroy(); reject(erro) })
    destino.on('finish', () => resolve())
    fonte.pipe(destino)
    fonte.on('data', (pedaco: Buffer | string) => hash.update(typeof pedaco === 'string' ? Buffer.from(pedaco) : pedaco))
  }).catch(async (erro) => {
    await unlink(stagePath).catch(() => undefined)
    if (erro instanceof PayloadGrandeError) {
      falhaUpload(linha, 'file_too_large',
        `O corpo excede o limite de ${erro.limite} bytes. O stage parcial foi removido e nada foi publicado.`, 413)
    }
    falhaUpload(linha, 'transfer_failed', `Falha na transferência: ${String(erro)}`, 500)
  })

  if (linha.declaredBytes != null && bytes !== linha.declaredBytes) {
    await unlink(stagePath).catch(() => undefined)
    falhaUpload(linha, 'size_mismatch',
      `Tamanho recebido (${bytes}) difere do declarado (${linha.declaredBytes}). Nada foi publicado.`, 409)
  }

  // fsync do stage antes de qualquer intenção de publicação (R05).
  const handle = await open(stagePath, 'r+')
  try { await handle.sync() } finally { await handle.close() }


  const digest = hash.digest('hex')
  atualizarUpload(sessionId, chatId, uploadId, { receivedBytes: bytes, digest, stagePath, state: 'preparado' })
  return publicarPreparado(sessionId, chatId, uploadId, opcoes)
}

class PayloadGrandeError extends Error { constructor(public readonly limite: number) { super('payload') } }

/**
 * Journal → link → commit. Ordem garante que a confirmação de publicação só
 * chega depois de stage íntegro, intenção durável e commit (R04/T18).
 * Colisão de destino preserva os bytes anteriores (T11): nunca sobrescrever.
 */
export async function publicarPreparado(sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {}): Promise<ReciboUpload> {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  if (linha.state === 'pronto') return reciboDe(linha)
  if (linha.state !== 'preparado') {
    throw new PersistenceProblem(409, 'upload_not_prepared', 'A transferência ainda não está preparada para publicação.')
  }
  const stagePath = linha.stagePath!
  const stage = await stat(stagePath).catch(() => null)
  let destinoFinal = linha.finalPath!
  if (!stage) {
    // Fronteira T15 — a publicação (link) aconteceu ANTES do crash e o commit
    // do SQLite ficou pendente: o arquivo final é a prova; conclui o commit.
    const finalPreExistente = linha.finalPath ? await stat(linha.finalPath).catch(() => null) : null
    if (finalPreExistente?.isFile() && linha.digest && linha.receivedBytes > 0) {
      atualizarUpload(sessionId, chatId, uploadId, { state: 'pronto' })
      const concluido = obterUpload(sessionId, chatId, uploadId)!
      upsertArtigo({
        artifactId: concluido.artifactId!, sessionId, chatId, uploadId, name: concluido.name,
        modalidade: modalidadeDe(concluido.mime, concluido.name),
        papel: concluido.scope === 'workspace' ? 'upload-workspace' : 'upload-chat',
        mode: concluido.mode, locator: caminhoRelativoRaiz(concluido, opcoes.appDir),
        rootKind: concluido.scope === 'workspace' ? 'workspace' : 'appdir',
        workspaceRoot: concluido.workspaceRoot, bytes: concluido.receivedBytes, sha256: concluido.digest ?? '',
        state: 'pronto', messageId: null, partId: null, createdAt: Date.now(),
      })
      return reciboDe(concluido)
    }
    atualizarUpload(sessionId, chatId, uploadId, { state: 'falhou', errorCode: 'stage_missing' })
    throw new PersistenceProblem(410, 'stage_missing', 'O stage desta transferência não existe mais. Retome o envio do mesmo identificador.')
  }

  const existente = await stat(destinoFinal).catch(() => null)
  if (existente) {
    const mesmoInode = existente.ino === stage.ino && existente.dev === stage.dev
    if (!mesmoInode) {
      // Colisão: bytes anteriores preservados; nosso stage ganha nome único.
      const dir = path.dirname(destinoFinal)
      const base = path.basename(destinoFinal)
      const ponto = base.lastIndexOf('.')
      const stem = ponto > 0 ? base.slice(0, ponto) : base
      const sufixo = ponto > 0 ? base.slice(ponto) : ''
      let candidato = ''
      // Só slot LIVRE: reusar arquivo alheio amarraria ownerships de chats
      // diferentes (a exclusão de um apagaria o arquivo do outro).
      for (let indice = 1; indice <= 50; indice += 1) {
        const tentativa = path.join(dir, `${stem} (${indice})${sufixo}`)
        const ocupado = await stat(tentativa).catch(() => null)
        if (!ocupado) { candidato = tentativa; break }
      }
      if (!candidato) {
        falhaUpload(linha, 'destination_exists',
          'O destino já contém um arquivo diferente e não pôde ser nomeado sem tocar nos bytes existentes.', 409)
      }
      destinoFinal = candidato
      await mkdir(path.dirname(destinoFinal), { recursive: true })
    }
  }

  // Intenção durável já gravada (state=preparado + stage/final/digest no SQLite).
  // O link é decidido pelo destino ESCOLHIDO: nome único da colisão ainda não
  // existe e precisa do link; o mesmo-inode já está publicado.
  const destinoAtual = await stat(destinoFinal).catch(() => null)
  if (!destinoAtual) {
    await mkdir(path.dirname(destinoFinal), { recursive: true })
    try {
      await link(stagePath, destinoFinal)
    } catch (erro) {
      const codigo = (erro as NodeJS.ErrnoException).code
      if (codigo !== 'EEXIST') {
        falhaUpload(linha, 'publish_failed', `Publicação interrompida antes do commit: ${String(erro)}`, 500)
      }
      // Perda de corrida na colisão: preserva bytes e tenta nome único.
      const dir = path.dirname(destinoFinal)
      const base = path.basename(destinoFinal)
      const tentativa = path.join(dir, `${base} (${Date.now()})`)
      await link(stagePath, tentativa)
      destinoFinal = tentativa
    }
  }
  await unlink(stagePath).catch(() => undefined)

  atualizarUpload(sessionId, chatId, uploadId, { state: 'pronto', finalPath: destinoFinal })
  const depois = obterUpload(sessionId, chatId, uploadId)!
  // Registro no ledger (ownership provado antes de qualquer mensagem).
  upsertArtigo({
    artifactId: depois.artifactId!, sessionId, chatId, uploadId, name: depois.name,
    modalidade: modalidadeDe(depois.mime, depois.name), papel: depois.scope === 'workspace' ? 'upload-workspace' : 'upload-chat',
    mode: depois.mode, locator: caminhoRelativoRaiz(depois, opcoes.appDir), rootKind: depois.scope === 'workspace' ? 'workspace' : 'appdir',
    workspaceRoot: depois.workspaceRoot, bytes: depois.receivedBytes, sha256: depois.digest ?? '',
    state: 'pronto', messageId: null, partId: null, createdAt: Date.now(),
  })
  return reciboDe(depois)
}

function caminhoRelativoRaiz(linha: LinhaUpload, appDir?: string): string {
  const finalPath = linha.finalPath!
  if (linha.scope === 'workspace' && linha.workspaceRoot) {
    return path.relative(linha.workspaceRoot, finalPath).split(path.sep).join('/')
  }
  const base = path.join(raiz(appDir), 'uploads')
  return path.relative(base, finalPath).split(path.sep).join('/')
}

export async function hashDeArquivo(caminho: string): Promise<string | null> {
  const hash = createHash('sha256')
  const fluxo = createReadStream(caminho)
  try {
    for await (const pedaco of fluxo) hash.update(pedaco as Buffer)
    return hash.digest('hex')
  } catch {
    return null
  }
}

function modalidadeDe(mime: string, nome: string): string {
  if (mime.startsWith('image/')) return 'imagem'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('text/')) return 'texto'
  void nome
  return 'arquivo'
}

function reciboDe(linha: LinhaUpload): ReciboUpload {
  return {
    uploadId: linha.uploadId, artifactId: linha.artifactId ?? '', name: linha.name,
    bytes: linha.receivedBytes || linha.declaredBytes || 0, sha256: linha.digest,
    state: linha.state, mode: linha.mode, scope: linha.scope, errorCode: linha.errorCode,
  }
}

export function consultarUpload(sessionId: string, chatId: string, uploadId: string): ReciboUpload {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  return reciboDe(linha)
}

/** Cancelamento: remove APENAS o stage desta identidade (nunca o destino). */
export async function cancelarUpload(sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {}): Promise<void> {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  if (linha.state === 'pronto') {
    throw new PersistenceProblem(409, 'upload_already_finalized', 'A transferência já foi publicada; use a exclusão da conversa para removê-la.')
  }
  if (linha.stagePath) await unlink(linha.stagePath).catch(() => undefined)
  atualizarUpload(sessionId, chatId, uploadId, { state: 'cancelado', errorCode: 'cancelled_by_user' })
  void opcoes
}

/**
 * Reconciliação por identidade (R06/T29): idempotente, reexecuta as ações
 * oficiais — stage completo antes do commit finaliza; commit sem SQLite
 * conclui o preparado; arquivo idêntico já existente preserva o artefato.
 */
export async function reconciliarIdentidade(sessionId: string, chatId: string, opcoes: OpcoesEstoque = {}): Promise<void> {
  politicaOuBloqueio()
  const agora = opcoes.agora?.() ?? Date.now()
  for (const linha of listarUploads(sessionId, chatId)) {
    if (['admitido', 'recebendo', 'preparado'].includes(linha.state)) {
      const stagePath = linha.stagePath ?? caminhoStage(opcoes.appDir, sessionId, chatId, linha.uploadId)
      const stage = await stat(stagePath).catch(() => null)
      const expirou = agora - linha.updatedAt > politicaOuBloqueio().prazoAbandonoMs
      if (!stage) {
        if (linha.state === 'preparado' && linha.digest && linha.finalPath) {
          // Publicação antes do commit (T15): o final é a prova; conclui o commit.
          const final = await stat(linha.finalPath).catch(() => null)
          if (final?.isFile()) {
            await publicarPreparado(sessionId, chatId, linha.uploadId, opcoes).catch(() => undefined)
            continue
          }
        }
        if (linha.state === 'recebendo') {
          // Escritor morreu antes de criar o stage: falha honesta (T17).
          atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'interrupted' })
          continue
        }
        if (linha.state === 'preparado') {
          atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'stage_missing' })
          continue
        }
        // admitido sem bytes: a transferência pode ainda começar — abandono só
        // depois da janela da política (D141), nunca no primeiro F5.
        if (expirou) {
          atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'abandoned' })
        }
        continue
      }
      if (expirou && linha.state !== 'preparado') {
        await unlink(stagePath).catch(() => undefined)
        atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'abandoned' })
        continue
      }
      if (linha.state === 'preparado' || (stage.size > 0 && linha.declaredBytes != null && stage.size === linha.declaredBytes)) {
        // Stage completo → finalizar (mesmo caminho da publicação).
        const digest = linha.digest ?? await hashDeArquivo(stagePath)
        atualizarUpload(sessionId, chatId, linha.uploadId, {
          receivedBytes: stage.size, digest, state: 'preparado', stagePath,
        })
        await publicarPreparado(sessionId, chatId, linha.uploadId, opcoes).catch(() => undefined)
      } else if (linha.state === 'recebendo') {
        // Stage parcial antes do commit com escritor morto: evidência da falha (T17).
        await unlink(stagePath).catch(() => undefined)
        atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'interrupted' })
      } else if (expirou) {
        // admitido com stage parcial e sem escritor vivo: abandono pela janela (D141).
        await unlink(stagePath).catch(() => undefined)
        atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'abandoned' })
      }
    }
    // Linhas 'pronto' sem arquivo (apagado fora do produto) seguem no ledger;
    // a listagem calcula presença honesta (T22) sem forçar estado falso.
  }
  await limparStagesAbandonados(sessionId, chatId, opcoes)
}

/** Limpeza própria dos stages órfãos desta identidade (área/journal do chat). */
export async function limparStagesAbandonados(sessionId: string, chatId: string, opcoes: OpcoesEstoque = {}): Promise<void> {
  const politica = politicaOuBloqueio()
  const dir = path.join(raiz(opcoes.appDir), 'uploads', 'stages', sessionId, chatId)
  const agora = opcoes.agora?.() ?? Date.now()
  const arquivos = await readdir(dir).catch(() => [] as string[])
  for (const arquivo of arquivos) {
    const caminho = path.join(dir, arquivo)
    const info = await stat(caminho).catch(() => null)
    if (!info) continue
    if (agora - info.mtimeMs > politica.prazoAbandonoMs) await unlink(caminho).catch(() => undefined)
  }
}

/** Bytes íntegros do artefato para o dono (download). */
export async function lerArtigo(artifactId: string): Promise<{ caminho: string; name: string; bytes: number }> {
  const artigo = obterArtigo(artifactId)
  if (!artigo) throw new PersistenceProblem(404, 'attachment_not_found', 'Artefato não encontrado.')
  const absoluto = artigo.rootKind === 'workspace' && artigo.workspaceRoot
    ? path.resolve(artigo.workspaceRoot, artigo.locator)
    : path.join(raiz(undefined), 'uploads', artigo.locator)
  const info = await stat(absoluto).catch(() => null)
  if (!info || !info.isFile()) {
    throw new PersistenceProblem(410, 'attachment_absent',
      'O arquivo armazenado não está mais disponível. O registro da conversa foi preservado.')
  }
  return { caminho: absoluto, name: artigo.name, bytes: info.size }
}

export async function removerVazioDescendente(caminho: string, raizLimpa: string): Promise<void> {
  let atual = path.dirname(caminho)
  const limite = path.resolve(raizLimpa)
  while (path.resolve(atual).startsWith(limite)) {
    const entradas = await readdir(atual).catch(() => null)
    if (!entradas) return
    if (entradas.length > 0) return
    await rm(atual, { recursive: false }).catch(() => undefined)
    atual = path.dirname(atual)
  }
}

export { rm as removerArquivoSeguro }
