// ============================================================================
// C-3b — R08 / T15–T19: porta INTERNA de artefatos gerenciados.
//
// O que esta porta é: o caminho pelo qual um produtor CONFIÁVEL do servidor
// (run de agente, no futuro) publica bytes que ele mesmo gerou. Ela reusa o
// MESMO ledger (`attachment_artifacts`), o mesmo conceito de claims/durabilidade
// e o mesmo lifecycle da C-3a — não há segundo store.
//
// O que esta porta NÃO é: uma API pública. `contextoServidor` chega pronto do
// run já validado; o browser nunca fornece owner/run/generation. Nenhuma rota
// HTTP chama isto com identidade alegada pelo cliente.
//
// Raiz: `getAppDir()/artifacts/<sid>/<cid>/<artifactId>/<nomeSeguro>`, inclusive
// em modo Pasta. Cópia explícita do usuário no projeto continua em `uploads/`
// do workspace e é território do usuário (limpeza não toca).
// ============================================================================
import { createHash } from 'node:crypto'
import { lstat, mkdir, readdir, rename, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import path from 'node:path'
import { Transform, Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { getAppDir } from '../paths'
import { PersistenceProblem } from '../persistenceErrors'
import { upsertArtigo, obterArtigo, listarArtigosChat } from './catalogo'
import type { LinhaArtigo } from './schemaAnexos'

/** Teto de bytes por artefato gerenciado — alinhado ao limite local C-3a. */
export const LIMITE_BYTES_GERADO = 64 * 1024 * 1024

/**
 * Identidade DURÁVEL da tentativa. Tudo aqui vem do servidor: `runId` e
 * `generation` são provados pelo run, nunca pelo corpo de uma requisição.
 */
export interface IdentidadeGeracao {
  sessionId: string
  chatId: string
  runId: string
  generation: number
  messageId: string
  partId: string
  /** Tentativa explícita (replay do mesmo pedido reusa o mesmo valor). */
  tentativa: string
  /** Nome exibido; não é destino — o destino é derivado. */
  name: string
  mime?: string
}

export interface ArtefatoGerenciado {
  artifactId: string
  name: string
  bytes: number
  sha256: string
  locator: string
  /** `true` quando este pedido apenas reconheceu um artefato já publicado. */
  replay: boolean
}

/**
 * Chave determinística do artefato. Mesma identidade ⇒ mesmo artifactId ⇒
 * replay idempotente. Inclui dono para que dois chats nunca colidam (U1).
 */
export function artifactIdDeGeracao(identidade: IdentidadeGeracao): string {
  const material = [
    'gerado', identidade.sessionId, identidade.chatId, identidade.runId,
    String(identidade.generation), identidade.messageId, identidade.partId, identidade.tentativa,
  ].join('\u0000')
  const hash = createHash('sha256').update(material).digest('hex')
  // Formato UUID v4-ish estável, compatível com o resto do ledger.
  const s = hash.slice(0, 32).split('')
  s[12] = '4'
  s[16] = ((parseInt(s[16], 16) & 0x3) | 0x8).toString(16)
  const hex = s.join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** Nome seguro para o sistema de arquivos — o nome de exibição fica no ledger. */
export function nomeSeguro(nome: string): string {
  const base = path.basename(nome).replace(/[^A-Za-z0-9._ -]/g, '_').trim()
  const semPontos = base.replace(/^\.+/, '')
  return (semPontos.length > 0 ? semPontos : 'artefato').slice(0, 120)
}

/** Raiz gerenciada do dono — sempre em `getAppDir()`, inclusive em Pasta. */
export function raizGerada(appDir: string | undefined, sessionId: string, chatId: string, artifactId: string): string {
  return path.join(appDir ?? getAppDir(), 'artifacts', sessionId, chatId, artifactId)
}

function locatorDe(sessionId: string, chatId: string, artifactId: string, nome: string): string {
  return path.posix.join(sessionId, chatId, artifactId, nomeSeguro(nome))
}

/**
 * Grava o stream em disco calculando hash e respeitando o teto.
 *
 * Nunca carrega o arquivo inteiro em memória: um `Transform` conta bytes e
 * alimenta o hash durante o pipeline. Estourar o limite aborta o pipeline e
 * o chamador descarta o temporário.
 */
async function gravarStream(
  destino: string,
  origem: Readable,
  limite: number,
): Promise<{ bytes: number; sha256: string }> {
  const hash = createHash('sha256')
  let bytes = 0
  const medidor = new Transform({
    transform(pedaco: Buffer, _codificacao, aoPronto) {
      bytes += pedaco.length
      if (bytes > limite) {
        aoPronto(new PersistenceProblem(413, 'artifact_too_large',
          'A saída excede o limite local de artefatos. Nada foi publicado.'))
        return
      }
      hash.update(pedaco)
      aoPronto(null, pedaco)
    },
  })
  await pipeline(origem, medidor, createWriteStream(destino))
  return { bytes, sha256: hash.digest('hex') }
}

/**
 * Publica bytes de um produtor confiável.
 *
 * Garantias (contrato §4):
 *  • identidade determinística ⇒ replay devolve o MESMO artefato;
 *  • payload diferente na mesma identidade ⇒ 409, bytes anteriores intactos;
 *  • bytes só viram "pronto" no ledger depois de medidos e no destino final;
 *  • falha no stream não deixa sucesso falso nem arquivo parcial anunciado.
 */
export async function publicarArtefatoGerenciado(
  identidade: IdentidadeGeracao,
  conteudo: Buffer | Readable,
  opcoes: { appDir?: string; limiteBytes?: number } = {},
): Promise<ArtefatoGerenciado> {
  const artifactId = artifactIdDeGeracao(identidade)
  const limite = opcoes.limiteBytes ?? LIMITE_BYTES_GERADO
  const existente = obterArtigo(artifactId)

  if (existente) {
    // Só é replay se for do MESMO dono. Outro dono nunca é redirecionado.
    if (existente.sessionId !== identidade.sessionId || existente.chatId !== identidade.chatId) {
      throw new PersistenceProblem(409, 'artifact_identity_conflict',
        'Esta identidade de artefato já pertence a outra conversa.')
    }
    // Replay com os mesmos bytes: devolve o recibo, sem tocar no arquivo.
    if (Buffer.isBuffer(conteudo)) {
      const sha = createHash('sha256').update(conteudo).digest('hex')
      if (existente.sha256 && sha !== existente.sha256) {
        throw new PersistenceProblem(409, 'artifact_payload_conflict',
          'A mesma identidade foi reenviada com conteúdo diferente. O artefato anterior foi preservado.')
      }
      return {
        artifactId, name: existente.name, bytes: existente.bytes,
        sha256: existente.sha256, locator: existente.locator, replay: true,
      }
    }
    // Stream no replay não dá para comparar antes de ler: recusa explícita em
    // vez de sobrescrever às cegas.
    throw new PersistenceProblem(409, 'artifact_payload_conflict',
      'Identidade já publicada não aceita novo stream. O artefato anterior foi preservado.')
  }

  const diretorio = raizGerada(opcoes.appDir, identidade.sessionId, identidade.chatId, artifactId)
  const nome = nomeSeguro(identidade.name)
  const destino = path.join(diretorio, nome)
  const temporario = path.join(diretorio, `.${nome}.part`)

  await mkdir(diretorio, { recursive: true })
  let medido: { bytes: number; sha256: string }
  try {
    const fluxo = Buffer.isBuffer(conteudo) ? Readable.from([conteudo]) : conteudo
    medido = await gravarStream(temporario, fluxo, limite)
  } catch (erro) {
    // Nenhum arquivo parcial fica anunciado; o temporário é descartado.
    await rm(temporario, { force: true }).catch(() => undefined)
    if (erro instanceof PersistenceProblem) throw erro
    throw new PersistenceProblem(500, 'artifact_write_failed',
      `A gravação da saída falhou e nada foi publicado: ${String(erro)}`)
  }

  // Publicação atômica no destino final: rename no mesmo diretório.
  await rename(temporario, destino)

  const confirmado = await lstat(destino).catch(() => null)
  if (!confirmado?.isFile()) {
    await rm(destino, { force: true }).catch(() => undefined)
    throw new PersistenceProblem(500, 'artifact_publish_failed',
      'O arquivo publicado não pôde ser confirmado. Nada foi anunciado como pronto.')
  }

  const artigo: LinhaArtigo = {
    artifactId,
    sessionId: identidade.sessionId,
    chatId: identidade.chatId,
    uploadId: `${artifactId}-gerado`,
    name: identidade.name,
    modalidade: 'arquivo',
    // `gerado-gerenciado` distingue no ledger o que a limpeza pode remover
    // como artefato gerado (ao contrário de cópia de projeto do usuário).
    papel: 'gerado-gerenciado',
    mode: 'copy',
    locator: locatorDe(identidade.sessionId, identidade.chatId, artifactId, identidade.name),
    // Raiz `appdir`: o resolver/cleanup existentes já entendem essa raiz;
    // `artifacts/` é uma subárvore dela, não um segundo store.
    rootKind: 'appdir',
    workspaceRoot: null,
    bytes: medido.bytes,
    sha256: medido.sha256,
    state: 'pronto',
    messageId: identidade.messageId,
    partId: identidade.partId,
    createdAt: Date.now(),
  }
  upsertArtigo(artigo)

  const relido = obterArtigo(artifactId)
  if (!relido || relido.sha256 !== medido.sha256) {
    throw new PersistenceProblem(503, 'artifact_commit_failed',
      'O artefato foi gravado mas não foi possível confirmar o ledger. Ele fica preservado para reconciliação.')
  }

  return {
    artifactId, name: identidade.name, bytes: medido.bytes,
    sha256: medido.sha256, locator: artigo.locator, replay: false,
  }
}

/** Caminho absoluto do artefato gerenciado (para o resolver comum). */
export function caminhoGerado(appDir: string | undefined, artigo: LinhaArtigo): string {
  return path.join(appDir ?? getAppDir(), 'artifacts', artigo.locator)
}

/**
 * Reconciliador de reinício: arquivos gerenciados no disco sem linha no ledger
 * (processo caiu entre rename e commit) NÃO são apagados automaticamente —
 * eles são reportados para que a publicação seja retomada. GC por varredura
 * está fora do escopo desta fatia.
 */
export async function conciliarGerados(
  sessionId: string,
  chatId: string,
  opcoes: { appDir?: string } = {},
): Promise<{ orfaos: string[]; conhecidos: number }> {
  const raizDono = path.join(opcoes.appDir ?? getAppDir(), 'artifacts', sessionId, chatId)
  const entradas = await readdir(raizDono).catch(() => null)
  if (!entradas) return { orfaos: [], conhecidos: listarArtigosChat(sessionId, chatId).length }
  const orfaos: string[] = []
  for (const entrada of entradas) {
    if (!obterArtigo(entrada)) orfaos.push(entrada)
  }
  return { orfaos, conhecidos: listarArtigosChat(sessionId, chatId).length }
}
