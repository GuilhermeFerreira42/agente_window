// C-3a — armazenamento e publicação de anexos (R03/R05/R06/R07).
//
// Protocolo (02_CONTRATOS §Publicação):
//  1. admissão: sob a fila do dono, conferir contexto/quota/concorrência e
//     gravar a reserva durável (transação única);
//  2. stream: stage EXCLUSIVO (`wx`, um escritor) no VOLUME DO DESTINO,
//     contando bytes e hash numa passada — fila liberada, nunca transação;
//  3. finalização: sob a fila, revalidar lifecycle, conferir bytes/hash REAIS
//     do stage e do destino, gravar intenção durável com o nome final já
//     decidido e publicar sem sobrescrever;
//  4. commit: estado `pronto` + ledger na MESMA transação; recibo só depois.
//
// Correções do parecer C-3a: B03 (hash real antes de publicar), B04 (commit
// único), B05 (fila do dono + revalidação de tombstone), B09 (pedido
// imutável), B11 (reserva atômica + stage no volume do destino + `wx`).
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import {
  link, lstat, mkdir, open, readdir, rename, rm, stat, statfs, unlink,
} from 'node:fs/promises'
import type { Readable } from 'node:stream'
import path from 'node:path'
import { getAppDir } from '../paths'
import { PersistenceProblem } from '../persistenceErrors'
import { consultarDelecao } from '../deletions'
import { withSessionPersistenceQueue } from '../filaSessao'
import {
  atualizarUpload, bytesPublicadosChat, finalizarPublicacao, listarUploads, obterArtigo, obterUpload,
  obterUploadPorId, reivindicarEscritor, reservarAdmissao, uploadsAtivos,
} from './catalogo'
import type { EscopoAnexo, LinhaUpload, ModoAnexo } from './schemaAnexos'
import { carregarPolitica, problemaPolitica, type PoliticaAnexos } from './politica'
import { nomeSeguroArquivo } from '../../../domain/anexosRascunho'
import { garantirDentroDaRaiz, garantirDiretorioReal, raizCanonica } from './contencao'

export interface OpcoesEstoque {
  appDir?: string
  agora?: () => number
  uuid?: () => string
  /** Fila do dono injetável nos ensaios (padrão: a fila real da sessão). */
  fila?: <T>(operacao: () => Promise<T>) => Promise<T>
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

/** Área privada da conversa — única raiz permitida para cópia de Chat. */
export function raizPrivadaChat(appDir?: string): string {
  return path.join(raiz(appDir), 'uploads', 'chats')
}

export function caminhoStage(appDir: string | undefined, sessionId: string, chatId: string, uploadId: string): string {
  return path.join(raiz(appDir), 'uploads', 'stages', sessionId, chatId, `${uploadId}.part`)
}

/** Stage no VOLUME DO DESTINO (B11): mesma partição do arquivo final. */
export function caminhoStagePara(finalPath: string, uploadId: string): string {
  return path.join(path.dirname(finalPath), '.stages', `${uploadId}.part`)
}

export function caminhoFinalChat(appDir: string | undefined, sessionId: string, chatId: string, artifactId: string, nome: string): string {
  return path.join(raizPrivadaChat(appDir), sessionId, chatId, artifactId, nome)
}

/**
 * Destino da cópia EXPLÍCITA no projeto.
 *
 * O nome original é preservado (`<raiz>/uploads/relatorio final.txt`). A
 * identidade interna continua sendo o `artifactId` (ledger/recibos), não o
 * nome do arquivo. Colisões NUNCA sobrescrevem: `destinoLivre` publica como
 * `arquivo (1).ext`, na publicação (que é quem prova ownership por inode).
 *
 * Arquivos antigos (`<artifactId>-<nome>`) permanecem intactos e acessíveis:
 * nada é renomeado, e o ledger continua apontando para o caminho gravado.
 */
export function caminhoFinalWorkspace(workspaceRoot: string, _artifactId: string, nome: string): string {
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

/** R2 — só marca falha se este fluxo ainda for o dono do stage (nunca pisa no vencedor). */
function marcarComoFalhaSeAindaForEscritor(linha: LinhaUpload, code: string): void {
  const atual = obterUpload(linha.sessionId, linha.chatId, linha.uploadId)
  if (!atual || atual.state !== 'recebendo') return
  atualizarUpload(linha.sessionId, linha.chatId, linha.uploadId, { state: 'falhou', errorCode: code })
}

/** B05 — revalidação de lifecycle na fronteira final (nunca só na entrada). */
function exigirDonoVivo(sessionId: string): void {
  if (consultarDelecao(sessionId)) {
    throw new PersistenceProblem(410, 'session_deleted',
      'Esta conversa foi excluída durante a transferência. Nada foi publicado; a tentativa foi encerrada.')
  }
}

function filaDe(sessionId: string, opcoes: OpcoesEstoque) {
  return opcoes.fila ?? (<T>(operacao: () => Promise<T>) => withSessionPersistenceQueue(sessionId, operacao))
}

/**
 * Reserva de disco (R05/B11): o espaço livre é comparado com a reserva MENOS o
 * que as tentativas admitidas/em voo prometeram no MESMO VOLUME (mesmo `dev`).
 * Sem isso, N admissões concorrentes passam pelo mesmo `statfs`.
 */
async function garantirVolume(alvo: string, bytes: number, politica: PoliticaAnexos): Promise<void> {
  const dir = path.dirname(alvo)
  await mkdir(dir, { recursive: true })
  await garantirDiretorioReal(dir).catch(() => {
    throw new PersistenceProblem(409, 'storage_out_of_scope',
      'O diretório de destino não é um diretório real (há um link no caminho). Nada foi gravado.')
  })
  const info = await statfs(dir)
  const disco = await stat(dir)
  const prometido = (await Promise.all(uploadsAtivos().map(async (linha) => {
    if (!linha.finalPath) return 0
    const pai = await stat(path.dirname(linha.finalPath)).catch(() => null)
    return pai && pai.dev === disco.dev ? (linha.declaredBytes ?? 0) : 0
  }))).reduce((total, valor) => total + valor, 0)
  const livre = info.bavail * info.bsize
  if (livre - bytes - prometido < politica.reservaDiscoBytes) {
    throw new PersistenceProblem(507, 'insufficient_storage',
      'Espaço livre insuficiente no disco para esta transferência. Nenhum arquivo parcial foi salvo.')
  }
}

/**
 * IDENTIDADE do artefato (R1): é a identidade da TENTATIVA (`uploadId`), nunca
 * uma derivação de nome+tamanho. Dois arquivos diferentes com o mesmo nome e o
 * mesmo tamanho são tentativas distintas e recebem artefatos distintos; o
 * replay do MESMO `uploadId` reusa o mesmo registro.
 *
 * U1 — a identidade é da tentativa **no dono**. O `uploadId` é fornecido pelo
 * cliente e o banco admite o mesmo valor em sessões/chats diferentes; sem o
 * dono no hash, a tentativa de B caía no artifactId de A e o upsert global
 * redirecionava o locator/bytes da linha de A (A passava a ler os bytes de B).
 * Incluir `sessionId`/`chatId` mantém o replay idempotente no MESMO dono e
 * isola donos distintos — que também não compartilham diretório de destino.
 */
export function artifactIdDe(entrada: { sessionId: string; chatId: string; uploadId: string }): string {
  const hex = createHash('sha256')
    .update(`tentativa\u0000${entrada.sessionId}\u0000${entrada.chatId}\u0000${entrada.uploadId}`)
    .digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** Identidade do pedido (B09): mesmo uploadId só continua com o MESMO pedido. */
function pedidoIncompativel(linha: LinhaUpload, entrada: EntradaAdmissao, nome: string, raizWorkspace: string | null): string | null {
  if (linha.name !== nome) return `nome "${linha.name}" ≠ "${nome}"`
  if ((linha.declaredBytes ?? null) !== (entrada.declaredBytes ?? null)) return 'tamanho declarado diferente'
  if (linha.mode !== entrada.mode) return 'modo diferente'
  if (linha.scope !== entrada.scope) return 'escopo diferente'
  const raizPedido = raizWorkspace
  const raizLinha = linha.workspaceRoot ? path.resolve(linha.workspaceRoot) : null
  if (raizPedido !== raizLinha) return 'pasta de destino diferente'
  if ((linha.mime ?? '') !== (entrada.mime ?? '')) return 'tipo declarado diferente'
  return null
}

/**
 * Admissão: valida política/escopo/quota/concorrência e grava a reserva numa
 * transação única (B11). Replay do MESMO pedido devolve o recibo; pedido
 * divergente no mesmo id vira 409 `upload_conflict` (B09) — antes de quota.
 */
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
  if (entrada.mode === 'reference') {
    throw new PersistenceProblem(400, 'invalid_field',
      'Referência de projeto é registrada pela rota de referências, não pela admissão de transferência.')
  }
  const uploadId = entrada.uploadId && /^[0-9a-f-]{36}$/i.test(entrada.uploadId) ? entrada.uploadId : uuid
  // R1 — identidade do artefato = identidade da tentativa (estável no replay).
  const artifactId = artifactIdDe({ sessionId: entrada.sessionId, chatId: entrada.chatId, uploadId })
  // Raiz do projeto CANÔNICA (realpath): build e checagens usam a mesma forma,
  // e um link no caminho da raiz nunca é aceito como destino.
  const raizWorkspace = entrada.scope === 'workspace' && entrada.workspaceRoot
    ? await raizCanonica(entrada.workspaceRoot)
    : null

  return filaDe(entrada.sessionId, opcoes)(async () => {
    exigirDonoVivo(entrada.sessionId)
    const reserva = reservarAdmissao(entrada.sessionId, entrada.chatId, (ativos) => {
      const existente = obterUpload(entrada.sessionId, entrada.chatId, uploadId)
      if (existente) {
        const divergencia = pedidoIncompativel(existente, entrada, nome, raizWorkspace)
        if (divergencia) {
          return { recusar: new PersistenceProblem(409, 'upload_conflict',
            `Esta transferência já existe com outro pedido (${divergencia}). Envie um identificador novo em vez de reescrever a tentativa.`) }
        }
        if (existente.state === 'pronto') return { reutilizar: existente }
        if (existente.state === 'recebendo' || existente.state === 'preparado') {
          return { recusar: new PersistenceProblem(409, 'upload_in_flight', 'Esta transferência já está em andamento.') }
        }
        return { reutilizar: existente }
      }

      if (ativos.length >= politica.concorrencia) {
        return { recusar: new PersistenceProblem(429, 'too_many_uploads',
          `Já existem ${ativos.length} transferências ativas (limite ${politica.concorrencia}). Conclua uma antes de iniciar outra.`) }
      }
      if (entrada.scope === 'chat') {
        const publicados = bytesPublicadosChat(entrada.sessionId, entrada.chatId)
        const emVoo = ativos
          .filter((linha) => linha.sessionId === entrada.sessionId && linha.chatId === entrada.chatId)
          .reduce((total, linha) => total + (linha.declaredBytes ?? 0), 0)
        if (publicados + emVoo + (entrada.declaredBytes ?? 0) > politica.quotaChatBytes) {
          return { recusar: new PersistenceProblem(507, 'quota_exceeded',
            'A quota privada desta conversa foi excedida pela soma dos arquivos armazenados. Nada foi transferido.') }
        }
      }
      const finalPath = raizWorkspace
        ? caminhoFinalWorkspace(raizWorkspace, artifactId, nome)
        : caminhoFinalChat(opcoes.appDir, entrada.sessionId, entrada.chatId, artifactId, nome)
      return {
        inserir: {
          sessionId: entrada.sessionId, chatId: entrada.chatId, uploadId, artifactId,
          name: nome, declaredBytes: entrada.declaredBytes, mime: entrada.mime ?? '',
          receivedBytes: 0, digest: null, state: 'admitido' as const,
          stagePath: caminhoStagePara(finalPath, uploadId), finalPath,
          mode: entrada.mode, scope: entrada.scope,
          workspaceRoot: raizWorkspace,
          createdAt: agora, updatedAt: agora, errorCode: null,
        },
      }
    })

    const existente = reserva.existente ?? obterUpload(entrada.sessionId, entrada.chatId, uploadId)!
    if (existente.state === 'pronto') return reciboDe(existente)
    // Retomada no MESMO id (falhou/cancelado): o pedido já foi provado igual;
    // só reabre a tentativa, sem tocar em nome/tamanho/escopo.
    const reaberta = reserva.criado ? existente : (() => {
      atualizarUpload(entrada.sessionId, entrada.chatId, uploadId, {
        state: 'admitido', receivedBytes: 0, digest: null, errorCode: null,
      })
      return obterUpload(entrada.sessionId, entrada.chatId, uploadId)!
    })()

    await garantirVolume(reaberta.finalPath!, entrada.declaredBytes ?? 0, politica)
    return reciboDe(reaberta)
  })
}

/** Bytes/hash reais de um arquivo, sem confiar em metadados. */
async function medirArquivo(caminho: string): Promise<{ bytes: number; sha256: string } | null> {
  const hash = createHash('sha256')
  let bytes = 0
  try {
    for await (const pedaco of createReadStream(caminho)) {
      hash.update(pedaco as Buffer)
      bytes += (pedaco as Buffer).length
    }
  } catch {
    return null
  }
  return { bytes, sha256: hash.digest('hex') }
}

export async function hashDeArquivo(caminho: string): Promise<string | null> {
  const medido = await medirArquivo(caminho)
  return medido?.sha256 ?? null
}

/**
 * Recebe o corpo binário em stream (nunca JSON/base64), conta bytes e grava o
 * hash em uma passada só. Stage EXCLUSIVO (`wx`): duas transmissões na mesma
 * tentativa não escrevem no mesmo arquivo (R06/B11).
 */
export async function receberConteudo(
  sessionId: string, chatId: string, uploadId: string,
  fonte: Readable, opcoes: OpcoesEstoque = {},
): Promise<ReciboUpload> {
  const linha = obterUpload(sessionId, chatId, uploadId)
  if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  if (linha.state === 'pronto') throw new PersistenceProblem(409, 'upload_already_finalized', 'Esta transferência já foi publicada.')
  if (linha.state === 'cancelado') throw new PersistenceProblem(409, 'upload_cancelled', 'Esta transferência foi cancelada.')
  if (linha.state === 'recebendo') {
    throw new PersistenceProblem(409, 'upload_in_flight',
      'Esta transferência já está recebendo bytes agora. Uma transmissão por tentativa.')
  }
  exigirDonoVivo(sessionId)
  const politica = politicaOuBloqueio()
  const limite = Math.min(linha.declaredBytes ?? politica.maxUploadBytes, politica.maxUploadBytes)

  const stagePath = linha.stagePath ?? caminhoStagePara(linha.finalPath!, uploadId)

  // R2 — CLAIM ATÔMICO do escritor, antes do primeiro `await` de filesystem.
  // A leitura acima é só diagnóstico amigável; quem decide é o UPDATE
  // condicional: dois PUTs que entram juntos nunca passam ambos.
  if (!reivindicarEscritor(sessionId, chatId, uploadId, stagePath)) {
    const atual = obterUpload(sessionId, chatId, uploadId)
    if (atual?.state === 'pronto') throw new PersistenceProblem(409, 'upload_already_finalized', 'Esta transferência já foi publicada.')
    throw new PersistenceProblem(409, 'upload_in_flight',
      'Esta transferência já está recebendo bytes agora. Uma transmissão por tentativa.')
  }
  await mkdir(path.dirname(stagePath), { recursive: true })

  const hash = createHash('sha256')
  let bytes = 0
  await new Promise<void>((resolve, reject) => {
    const destino = createWriteStream(stagePath, { flags: 'wx', mode: 0o600 })
    let encerrado = false
    const finalizar = (erro?: Error) => {
      if (encerrado) return
      encerrado = true
      if (erro) reject(erro)
      else resolve()
    }
    destino.on('error', (erro) => {
      // `EEXIST` = another writer owns this stage: nunca truncar o alheio.
      fonte.destroy()
      finalizar(erro)
    })
    fonte.on('error', (erro) => {
      destino.destroy()
      finalizar(erro)
    })
    destino.on('finish', () => finalizar())
    fonte.on('data', (pedaco: Buffer | string) => {
      const bloco = typeof pedaco === 'string' ? Buffer.from(pedaco) : pedaco
      bytes += bloco.length
      if (bytes > limite) {
        fonte.destroy()
        destino.destroy()
        finalizar(new PayloadGrandeError(limite))
        return
      }
      hash.update(bloco)
    })
    fonte.pipe(destino)
  }).catch(async (erro) => {
    // R2 — `EEXIST`: a exclusividade do stage provou que outro escritor é o
    // dono do arquivo. Este fluxo NÃO remove nada e responde conflito; assim o
    // stage do vencedor sobrevive e continua publicável.
    if ((erro as NodeJS.ErrnoException)?.code === 'EEXIST') {
      marcarComoFalhaSeAindaForEscritor(linha, 'upload_in_flight')
      throw new PersistenceProblem(409, 'upload_in_flight',
        'Outra transmissão desta tentativa está escrevendo agora. Aguarde o resultado dela antes de reenviar.')
    }
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
  // Revalidação de bytes/hash do que ficou no disco: o stream pode ter sido
  // truncado por um erro de sistema depois do 'finish'.
  const medido = await medirArquivo(stagePath)
  if (!medido || medido.bytes !== bytes || medido.sha256 !== digest) {
    await unlink(stagePath).catch(() => undefined)
    falhaUpload(linha, 'verification_failed',
      'O arquivo gravado não confere com o que foi recebido (bytes/hash). Nada foi publicado.', 500)
  }
  atualizarUpload(sessionId, chatId, uploadId, { receivedBytes: bytes, digest, stagePath, state: 'preparado' })
  return publicarPreparado(sessionId, chatId, uploadId, opcoes)
}

class PayloadGrandeError extends Error {
  disputaStage = false
  constructor(public readonly limite: number) { super('payload') }
}

/** Nome final único quando o destino já tem outro conteúdo (B04: durável). */
async function destinoLivre(desejado: string): Promise<string> {
  const existente = await lstat(desejado).catch(() => null)
  if (!existente) return desejado
  const dir = path.dirname(desejado)
  const base = path.basename(desejado)
  const ponto = base.lastIndexOf('.')
  const stem = ponto > 0 ? base.slice(0, ponto) : base
  const sufixo = ponto > 0 ? base.slice(ponto) : ''
  for (let indice = 1; indice <= 200; indice += 1) {
    const tentativa = path.join(dir, `${stem} (${indice})${sufixo}`)
    if (!(await lstat(tentativa).catch(() => null))) return tentativa
  }
  throw new PersistenceProblem(409, 'destination_exists',
    'O destino já contém arquivos com o mesmo nome e não foi possível nomear a cópia sem tocar nos bytes existentes.')
}

/**
 * Publica o stage preparado. Verifica ANTES de publicar:
 *  - lifecycle (tombstone) sob a fila do dono (B05);
 *  - stage presente e com bytes/hash iguais à intenção (B03);
 *  - destino: se já existe com o MESMO hash, é o mesmo conteúdo — o artefato
 *    ganha nome próprio e os bytes alheios não são tocados (T11/T16); se
 *    existe com hash diferente, nunca é aceito como prova (H5);
 *  - nome final escolhido é gravado ANTES do link (B04), sem retarget em
 *    memória.
 */
export async function publicarPreparado(sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {}): Promise<ReciboUpload> {
  return filaDe(sessionId, opcoes)(() => publicarPreparadoSemFila(sessionId, chatId, uploadId, opcoes))
}

/** Corpo da publicação — JÁ sob a fila do dono (nunca reentra na fila). */
export async function publicarPreparadoSemFila(sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {}): Promise<ReciboUpload> {
  {
    exigirDonoVivo(sessionId)
    const linha = obterUpload(sessionId, chatId, uploadId)
    if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
    if (linha.state === 'pronto') return reciboDe(linha)
    if (linha.state !== 'preparado') {
      throw new PersistenceProblem(409, 'upload_not_prepared', 'A transferência ainda não está preparada para publicação.')
    }
    const stagePath = linha.stagePath ?? caminhoStagePara(linha.finalPath!, uploadId)
    let destinoFinal = linha.finalPath!
    const stage = await lstat(stagePath).catch(() => null)
    let medidoStage: { bytes: number; sha256: string } | null = null
    if (stage?.isFile()) medidoStage = await medirArquivo(stagePath)

    const digestEsperado = linha.digest

    if (!stage) {
      // Fronteira T15 — o link aconteceu antes do crash. Só conclui o commit
      // se o destino EXISTIR e bater com o digest da intenção (H5: existência
      // sozinha não é prova).
      const finalInfo = destinoFinal ? await lstat(destinoFinal).catch(() => null) : null
      if (!finalInfo || !finalInfo.isFile() || !digestEsperado) {
        atualizarUpload(sessionId, chatId, uploadId, { state: 'falhou', errorCode: 'stage_missing' })
        throw new PersistenceProblem(410, 'stage_missing',
          'O stage desta transferência não existe mais. Retome o envio do mesmo identificador.')
      }
      const medidoFinal = await medirArquivo(destinoFinal)
      if (!medidoFinal || medidoFinal.sha256 !== digestEsperado) {
        atualizarUpload(sessionId, chatId, uploadId, { state: 'falhou', errorCode: 'integrity_mismatch' })
        throw new PersistenceProblem(409, 'recovery_verification_failed',
          'O destino encontrado não confere com o hash registrado desta transferência. Nada foi anunciado como pronto; os bytes existentes continuam intactos.')
      }
      return concluirCommit(linha, destinoFinal, medidoFinal, opcoes)
    }

    if (!medidoStage) {
      falhaUpload(linha, 'verification_failed', 'O stage desta transferência não pôde ser lido. Nada foi publicado.', 500)
    }
    if (digestEsperado && medidoStage.sha256 !== digestEsperado) {
      // B03 — stage em disco divergente do digest registrado: bloqueia,
      // PRESERVA o stage para diagnóstico e não anuncia pronto.
      atualizarUpload(sessionId, chatId, uploadId, { state: 'falhou', errorCode: 'integrity_mismatch' })
      throw new PersistenceProblem(409, 'integrity_mismatch',
        'O conteúdo do stage não confere com o hash registrado (stage alterado depois do recebimento). Nada foi publicado; os bytes foram preservados para diagnóstico.')
    }
    if (linha.declaredBytes != null && medidoStage.bytes !== linha.declaredBytes) {
      falhaUpload(linha, 'size_mismatch', 'O stage não tem o tamanho declarado. Nada foi publicado.', 409)
    }

    // Destino já ocupado por arquivo ESTRANGEIRO (T11/T16): bytes alheios são
    // preservados e o nosso stage ganha nome próprio. Nome ou conteúdo igual
    // NÃO provam que o arquivo existente é nosso — ownership é o inode.
    const existente = await lstat(destinoFinal).catch(() => null)
    if (existente) {
      const mesmoInode = stage.ino === existente.ino && stage.dev === existente.dev
      if (!mesmoInode) destinoFinal = await destinoLivre(destinoFinal)
    }
    // Intenção durável com o NOME FINAL já decidido (antes do link).
    if (destinoFinal !== linha.finalPath) atualizarUpload(sessionId, chatId, uploadId, { finalPath: destinoFinal })

    const destinoAtual = await lstat(destinoFinal).catch(() => null)
    if (!destinoAtual) {
      await mkdir(path.dirname(destinoFinal), { recursive: true })
      try {
        await link(stagePath, destinoFinal)
      } catch (erro) {
        const codigo = (erro as NodeJS.ErrnoException).code
        if (codigo === 'EEXIST') {
          destinoFinal = await destinoLivre(destinoFinal)
          atualizarUpload(sessionId, chatId, uploadId, { finalPath: destinoFinal })
          await mkdir(path.dirname(destinoFinal), { recursive: true })
          await link(stagePath, destinoFinal)
        } else if (codigo === 'EXDEV') {
          // Stage no volume errado nunca vira cópia parcial visível como
          // pronto: falha de capacidade honesta (B11).
          falhaUpload(linha, 'storage_capacity',
            'O stage e o destino estão em volumes diferentes e não há publicação atômica disponível. Nada foi publicado.', 507)
        } else {
          falhaUpload(linha, 'publish_failed', `Publicação interrompida antes do commit: ${String(erro)}`, 500)
        }
      }
    }

    // O destino publicado tem de ser byte a byte o stage verificado.
    const medidoPublicado = await medirArquivo(destinoFinal)
    if (!medidoPublicado || medidoPublicado.sha256 !== medidoStage.sha256) {
      await unlink(destinoFinal).catch(() => undefined)
      atualizarUpload(sessionId, chatId, uploadId, { state: 'falhou', errorCode: 'verification_failed' })
      throw new PersistenceProblem(500, 'verification_failed',
        'O arquivo publicado não confere com o stage verificado. Ele foi removido e nada foi anunciado como pronto.')
    }
    await unlink(stagePath).catch(() => undefined)
    return concluirCommit(linha, destinoFinal, medidoPublicado, opcoes)
  }
}

/** Commit único (B04): estado pronto + ledger na MESMA transação. */
function concluirCommit(linha: LinhaUpload, destinoFinal: string, medido: { bytes: number; sha256: string }, opcoes: OpcoesEstoque): ReciboUpload {
  const finalizado = finalizarPublicacao(linha, {
    finalPath: destinoFinal,
    bytes: medido.bytes,
    sha256: medido.sha256,
    locator: caminhoRelativoRaiz(linha, destinoFinal, opcoes.appDir),
    modalidade: modalidadeDe(linha.mime, linha.name),
    papel: linha.scope === 'workspace' ? 'upload-workspace' : 'upload-chat',
    createdAt: Date.now(),
  })
  return reciboDe(finalizado)
}

function caminhoRelativoRaiz(linha: LinhaUpload, finalPath: string, appDir?: string): string {
  if (linha.scope === 'workspace' && linha.workspaceRoot) {
    return path.relative(linha.workspaceRoot, finalPath).split(path.sep).join('/')
  }
  const base = path.join(raiz(appDir), 'uploads')
  return path.relative(base, finalPath).split(path.sep).join('/')
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

/** Recibo por ID (ACK perdido) — só para o dono informado na chamada. */
export function consultarUploadPorId(uploadId: string, dono?: { sessionId: string; chatId: string }): ReciboUpload {
  const linha = obterUploadPorId(uploadId)
  if (!linha || (dono && (linha.sessionId !== dono.sessionId || linha.chatId !== dono.chatId))) {
    throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
  }
  return reciboDe(linha)
}

/**
 * Cancelamento idempotente: remove APENAS o stage desta identidade e nunca o
 * destino. Recusar um upload já pronto virou resposta estável de estado
 * (R11/contrato DELETE), não erro.
 */
export async function cancelarUpload(sessionId: string, chatId: string, uploadId: string, opcoes: OpcoesEstoque = {}): Promise<ReciboUpload> {
  return filaDe(sessionId, opcoes)(async () => {
    const linha = obterUpload(sessionId, chatId, uploadId)
    if (!linha) throw new PersistenceProblem(404, 'upload_not_found', 'Transferência não encontrada.')
    if (linha.state === 'pronto') return reciboDe(linha)
    if (linha.state === 'cancelado') return reciboDe(linha)
    if (linha.stagePath) await unlink(linha.stagePath).catch(() => undefined)
    atualizarUpload(sessionId, chatId, uploadId, { state: 'cancelado', errorCode: 'cancelled_by_user' })
    return reciboDe(obterUpload(sessionId, chatId, uploadId)!)
  })
}

/**
 * Reconciliação por identidade (R06). Invariantes:
 *  - `recebendo` NÃO é tratado como morto por padrão: um GET concorrente não
 *    pode matar o PUT que está escrevendo (B05). Só o chamador que PROVOU a
 *    morte do escritor (processo novo após crash) limpa, via
 *    `escritoresInterrompidos`;
 *  - stage ausente + destino com hash da intenção finaliza (T15);
 *  - stage presente com hash divergente NUNCA publica (B03);
 *  - linha `pronto` sem artefato (estado legado do B04) é reparada.
 */
export async function reconciliarIdentidade(
  sessionId: string, chatId: string,
  opcoes: OpcoesEstoque = {},
  escritoresInterrompidos: { todos?: boolean; limiteMs?: number } = {},
): Promise<void> {
  const politica = politicaOuBloqueio()
  const agora = opcoes.agora?.() ?? Date.now()
  const limite = escritoresInterrompidos.limiteMs ?? politica.prazoAbandonoMs
  await filaDe(sessionId, opcoes)(async () => {
    for (const linha of listarUploads(sessionId, chatId)) {
      if (linha.state === 'pronto') {
        if (linha.artifactId && !obterArtigo(linha.artifactId) && linha.finalPath && linha.digest) {
          const medido = await medirArquivo(linha.finalPath)
          if (medido && medido.sha256 === linha.digest) {
            try { concluirCommit(linha, linha.finalPath, medido, opcoes) } catch { /* fica visível na lista */ }
          }
        }
        continue
      }
      if (!['admitido', 'recebendo', 'preparado'].includes(linha.state)) continue
      if (consultarDelecao(sessionId)) continue

      const stagePath = linha.stagePath ?? (linha.finalPath ? caminhoStagePara(linha.finalPath, linha.uploadId) : null)
      const stage = stagePath ? await lstat(stagePath).catch(() => null) : null
      const expirou = agora - linha.updatedAt > limite
      const interrompido = escritoresInterrompidos.todos === true && linha.state === 'recebendo'

      if (!stage) {
        if (linha.state === 'preparado' && linha.digest && linha.finalPath) {
          await publicarPreparadoSemFila(sessionId, chatId, linha.uploadId, opcoes).catch(() => undefined)
          continue
        }
        if (linha.state === 'recebendo' && !interrompido && !expirou) continue // escritor pode estar vivo
        if (linha.state === 'recebendo') {
          atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'interrupted' })
          continue
        }
        if (linha.state === 'preparado') {
          atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'stage_missing' })
          continue
        }
        if (expirou) atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'abandoned' })
        continue
      }

      if (expirou && linha.state !== 'preparado' && !interrompido) {
        // Janela de abandono vencida: o escritor não pode mais estar ativo.
        await unlink(stagePath!).catch(() => undefined)
        atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'abandoned' })
        continue
      }
      if (linha.state === 'recebendo' && !interrompido) continue // escritor ATIVO (B05)

      const completo = linha.declaredBytes != null && stage.size === linha.declaredBytes
      if (linha.state === 'preparado' || completo) {
        const medido = await medirArquivo(stagePath!)
        if (!medido) {
          await unlink(stagePath!).catch(() => undefined)
          atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'interrupted' })
          continue
        }
        if (linha.digest && linha.digest !== medido.sha256) {
          // B03 — stage divergente: falha honesta, bytes PRESERVADOS.
          atualizarUpload(sessionId, chatId, linha.uploadId, {
            receivedBytes: medido.bytes, state: 'falhou', errorCode: 'integrity_mismatch',
          })
          continue
        }
        atualizarUpload(sessionId, chatId, linha.uploadId, {
          receivedBytes: medido.bytes, digest: medido.sha256, state: 'preparado', stagePath,
        })
        await publicarPreparadoSemFila(sessionId, chatId, linha.uploadId, opcoes).catch(() => undefined)
        continue
      }
      // `recebendo` interrompido com stage parcial: evidência da queda (T17).
      await unlink(stagePath!).catch(() => undefined)
      atualizarUpload(sessionId, chatId, linha.uploadId, { state: 'falhou', errorCode: 'interrupted' })
    }
    await limparStagesAbandonados(sessionId, chatId, opcoes)
  })
}

/**
 * Limpeza de stage (R12): só stages de identidades DESTE dono que já
 * terminaram (`pronto`/`falhou`/`cancelado`) ou venceram a janela de abandono.
 * Nunca varredura cega por mtime em pasta de projeto: o stage só é removido
 * quando o ledger localiza a tentativa.
 */
export async function limparStagesAbandonados(sessionId: string, chatId: string, opcoes: OpcoesEstoque = {}): Promise<void> {
  const politica = politicaOuBloqueio()
  const agora = opcoes.agora?.() ?? Date.now()
  for (const linha of listarUploads(sessionId, chatId)) {
    if (!linha.stagePath) continue
    const encerrada = ['pronto', 'falhou', 'cancelado'].includes(linha.state)
    const abandonada = agora - linha.updatedAt > politica.prazoAbandonoMs
    if (!encerrada && !abandonada) continue
    await unlink(linha.stagePath).catch(() => undefined)
  }
  // Área legada desta identidade: só o diretório VAZIO (nunca recursive).
  const dir = path.join(raiz(opcoes.appDir), 'uploads', 'stages', sessionId, chatId)
  const restantes = await readdir(dir).catch(() => null)
  if (restantes && restantes.length === 0) await rm(dir, { recursive: false }).catch(() => undefined)
}

export interface ArtigoServivel {
  caminho: string
  name: string
  bytes: number
  sha256: string
}

/**
 * C-3b — caminho absoluto de QUALQUER artefato do ledger, por raiz declarada.
 *
 * Antes desta função havia duas fórmulas (upload privado e cópia de projeto) e
 * cada consumidor repetia uma delas. Com a saída gerenciada existe uma terceira
 * (`artifacts/`), então a resolução passa a ser UM lugar só — resolver, DTO,
 * limpeza e reconciliação chamam isto em vez de montar path por conta própria.
 *
 * `rootKind` continua sendo a autoridade: `workspace` = território do usuário;
 * `appdir` cobre upload privado (`uploads/…`) e gerado (`artifacts/…`).
 */
export function caminhoAbsolutoDeArtigo(
  artigo: { rootKind: 'appdir' | 'workspace'; workspaceRoot: string | null; locator: string; papel?: string },
  appDir?: string,
): string {
  if (artigo.rootKind === 'workspace' && artigo.workspaceRoot) {
    return path.resolve(artigo.workspaceRoot, artigo.locator)
  }
  const base = artigo.papel === 'gerado-gerenciado' ? 'artifacts' : 'uploads'
  return path.join(raiz(appDir), base, artigo.locator)
}

/**
 * Resolve os bytes do artefato para o dono com a MESMA validação da metadata
 * (R08/R09/B07): contenção de pais, presença, tamanho E hash. Referência
 * alterada não é servida — 409 `reference_changed` honesto, nunca bytes novos
 * sob hash antigo.
 */
export async function lerArtigo(artifactId: string): Promise<ArtigoServivel> {
  const artigo = obterArtigo(artifactId)
  if (!artigo) throw new PersistenceProblem(404, 'attachment_not_found', 'Artefato não encontrado.')
  const absoluto = caminhoAbsolutoDeArtigo(artigo)
  if (artigo.rootKind === 'workspace' && artigo.workspaceRoot) {
    await garantirDentroDaRaiz(artigo.workspaceRoot, absoluto, {
      code: 'reference_out_of_scope',
      mensagem: 'O caminho registrado para este arquivo do projeto não é mais válido. Nada foi entregue.',
    }).catch(() => {
      throw new PersistenceProblem(410, 'attachment_absent',
        'O caminho registrado para este arquivo do projeto não está mais disponível. O registro da conversa foi preservado.')
    })
  }
  const info = await lstat(absoluto).catch(() => null)
  if (!info || !info.isFile()) {
    throw new PersistenceProblem(410, 'attachment_absent',
      'O arquivo armazenado não está mais disponível. O registro da conversa foi preservado.')
  }
  const medido = await medirArquivo(absoluto)
  if (!medido) {
    throw new PersistenceProblem(410, 'attachment_absent',
      'O arquivo armazenado não pôde ser lido. O registro da conversa foi preservado.')
  }
  const divergente = medido.bytes !== artigo.bytes || (artigo.sha256 !== '' && medido.sha256 !== artigo.sha256)
  if (divergente) {
    throw new PersistenceProblem(409,
      artigo.mode === 'reference' ? 'reference_changed' : 'attachment_changed',
      artigo.mode === 'reference'
        ? 'Este arquivo do projeto foi alterado depois de anexado. Atualize a referência explicitamente para usar o conteúdo novo; o registro antigo foi preservado.'
        : 'O arquivo armazenado foi alterado fora do produto. O registro da conversa foi preservado e nada foi entregue.')
  }
  return { caminho: absoluto, name: artigo.name, bytes: medido.bytes, sha256: medido.sha256 }
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

/** Move um stage órfão para a área de quarentena (nunca delete cego). */
export async function quarentenarStage(stagePath: string, motivo: string): Promise<string | null> {
  const destino = `${stagePath}.orfa-${Date.now()}.${motivo.replace(/[^a-z0-9_-]/gi, '')}`
  return rename(stagePath, destino).then(() => destino).catch(() => null)
}

export { retomarUpload, type ReciboRetomada } from './recuperacao'

/** Concorrência efetiva do perfil (diagnóstico honesto de política). */
export function transferenciasAtivas(porDono?: { sessionId: string; chatId?: string }): number {
  return uploadsAtivos(porDono).length
}

export { lstat as inspecionarCaminho }
