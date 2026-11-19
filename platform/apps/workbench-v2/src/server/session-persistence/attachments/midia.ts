// ============================================================================
// C-3b — Rota de mídia passiva: GET/HEAD com Range, pelo MESMO resolver C-3a.
//
// Decisões que esta rota NÃO toma:
//   • não escolhe arquivo por path/URL/query — só `artifactId` escopado;
//   • não confia em MIME declarado no upload: classifica os BYTES;
//   • não reimplementa ownership/integridade: delega a `lerArtigo`, que é o
//     mesmo resolver do download (hash + contenção + presença).
//
// O que ela acrescenta: Content-Type do formato REAL, Accept-Ranges, 206/416
// corretos, nosniff/no-store e streaming com backpressure (createReadStream,
// nunca Buffer integral).
// ============================================================================
import { createReadStream } from 'node:fs'
import { open, type FileHandle } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { BYTES_SONDA, classificarPreview, type ClassificacaoPreview } from '../../../domain/politicaPreview'
import { PersistenceProblem } from '../persistenceErrors'
import { lerArtigo } from './estoque'

/**
 * Lê apenas o cabeçalho necessário à classificação. Nunca o arquivo inteiro:
 * o limite é `BYTES_SONDA`, independente do tamanho do arquivo.
 */
export async function lerSondaDePreview(caminho: string): Promise<Uint8Array | undefined> {
  let handle: FileHandle | null = null
  try {
    handle = await open(caminho, 'r')
    const buffer = Buffer.alloc(BYTES_SONDA)
    const { bytesRead } = await handle.read(buffer, 0, BYTES_SONDA, 0)
    return buffer.subarray(0, bytesRead)
  } catch {
    return undefined
  } finally {
    if (handle) await handle.close().catch(() => undefined)
  }
}

/** Intervalo HTTP já validado como sintaticamente aceitável. */
export type Intervalo = { inicio: number; fim: number }

/**
 * Interpreta `Range: bytes=…` com as três formas exigidas (fechado, aberto e
 * sufixo) e devolve o que fazer. Não suporta multipart — um único intervalo
 * malformado/múltiplo é IGNORADO (200 integral), como o HTTP permite.
 */
export type PedidoRange =
  | { tipo: 'sem' }
  | { tipo: 'ignorado'; motivo: 'malformado' | 'multiplo' | 'unidade' }
  | { tipo: 'satisfativel'; intervalo: Intervalo }
  | { tipo: 'insatisfativel' }

export function interpretarRange(cabecalho: string | undefined, tamanho: number): PedidoRange {
  if (!cabecalho) return { tipo: 'sem' }
  const texto = cabecalho.trim()
  const casar = /^bytes=(.+)$/i.exec(texto)
  if (!casar) return { tipo: 'ignorado', motivo: 'unidade' }
  const especificacao = casar[1].trim()
  if (especificacao.includes(',')) return { tipo: 'ignorado', motivo: 'multiplo' }
  const partes = /^(\d*)-(\d*)$/.exec(especificacao)
  if (!partes) return { tipo: 'ignorado', motivo: 'malformado' }
  const [, brutoInicio, brutoFim] = partes
  if (brutoInicio === '' && brutoFim === '') return { tipo: 'ignorado', motivo: 'malformado' }

  // Arquivo vazio: qualquer intervalo é insatisfatível (não existe byte 0).
  if (tamanho === 0) return { tipo: 'insatisfativel' }

  if (brutoInicio === '') {
    // Sufixo: `bytes=-N` = últimos N bytes.
    const quantidade = Number(brutoFim)
    if (!Number.isSafeInteger(quantidade) || quantidade <= 0) return { tipo: 'insatisfativel' }
    const inicio = Math.max(0, tamanho - quantidade)
    return { tipo: 'satisfativel', intervalo: { inicio, fim: tamanho - 1 } }
  }

  const inicio = Number(brutoInicio)
  if (!Number.isSafeInteger(inicio) || inicio < 0) return { tipo: 'ignorado', motivo: 'malformado' }
  if (inicio >= tamanho) return { tipo: 'insatisfativel' }
  if (brutoFim === '') return { tipo: 'satisfativel', intervalo: { inicio, fim: tamanho - 1 } }
  const fim = Number(brutoFim)
  if (!Number.isSafeInteger(fim) || fim < inicio) return { tipo: 'insatisfativel' }
  // Fim além do EOF é aparado (HTTP permite), nunca estendido.
  return { tipo: 'satisfativel', intervalo: { inicio, fim: Math.min(fim, tamanho - 1) } }
}

function cabecalhoDisposicaoInline(nome: string): string {
  const ascii = nome.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  const utf8 = encodeURIComponent(nome)
  return `inline; filename="${ascii}"; filename*=UTF-8''${utf8}`
}

/** Headers comuns a GET/HEAD — o corpo é a única diferença. */
export function aplicarHeadersMidia(
  response: ServerResponse,
  classificacao: Extract<ClassificacaoPreview, { ok: true }>,
  nome: string,
): void {
  response.setHeader('Content-Type', classificacao.mime)
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('Cache-Control', 'private, no-store')
  response.setHeader('Accept-Ranges', 'bytes')
  response.setHeader('Content-Disposition', cabecalhoDisposicaoInline(nome))
}

export interface OpcoesRespostaMidia {
  /** `HEAD` descreve sem corpo — nunca simula 206 de corpo ausente. */
  somenteCabecalhos?: boolean
}

/**
 * Serve a mídia de um artefato do dono.
 *
 * Ordem deliberada: resolver/validar (ownership + hash) ANTES de qualquer
 * header de sucesso. Se a referência mudou, o 409 sai aqui, não no meio do
 * stream.
 */
export async function servirMidia(
  response: ServerResponse,
  artifactId: string,
  cabecalhoRange: string | undefined,
  opcoes: OpcoesRespostaMidia = {},
): Promise<void> {
  const artigo = await lerArtigo(artifactId)
  const sonda = await lerSondaDePreview(artigo.caminho)
  const classificacao = classificarPreview(sonda)

  if (!classificacao.ok) {
    // 415: o arquivo existe e está íntegro, mas não é exibível. O download
    // continua funcionando pela rota legada — isto não é ausência.
    throw new PersistenceProblem(415, 'preview_unsupported',
      'Este formato não tem pré-visualização passiva. O download continua disponível.')
  }

  aplicarHeadersMidia(response, classificacao, artigo.name)
  const tamanho = artigo.bytes
  response.setHeader('Content-Length', String(tamanho))

  if (opcoes.somenteCabecalhos) {
    // HEAD ignora Range: 200 com metadata integral, sem corpo.
    response.statusCode = 200
    response.end()
    return
  }

  const pedido = interpretarRange(cabecalhoRange, tamanho)

  if (pedido.tipo === 'insatisfativel') {
    // 416 com o tamanho real — o player entende e reposiciona.
    response.statusCode = 416
    response.setHeader('Content-Range', `bytes */${tamanho}`)
    response.removeHeader('Content-Length')
    response.end()
    return
  }

  if (pedido.tipo === 'satisfativel') {
    const { inicio, fim } = pedido.intervalo
    const largura = fim - inicio + 1
    response.statusCode = 206
    response.setHeader('Content-Range', `bytes ${inicio}-${fim}/${tamanho}`)
    response.setHeader('Content-Length', String(largura))
    transmitir(response, artigo.caminho, { inicio, fim })
    return
  }

  // `sem` ou `ignorado` (malformado/multirange): 200 integral, como o HTTP
  // permite. Nunca anunciamos suporte multipart que não existe.
  response.statusCode = 200
  transmitir(response, artigo.caminho, undefined)
}

/** Streaming com backpressure e fechamento em aborto do cliente. */
function transmitir(
  response: ServerResponse,
  caminho: string,
  intervalo: Intervalo | undefined,
): void {
  // `start`/`end` são INCLUSIVOS no createReadStream — daí `fim` já aparado.
  const fluxo = createReadStream(caminho, intervalo ? { start: intervalo.inicio, end: intervalo.fim } : undefined)
  let encerrado = false
  const fechar = () => {
    if (encerrado) return
    encerrado = true
    fluxo.destroy()
  }
  // Cliente desistiu (player busca/aborta): fecha o FD imediatamente.
  response.on('close', fechar)
  fluxo.on('error', () => {
    // Erro depois dos headers não pode virar corpo truncado silencioso.
    try { response.destroy() } catch { /* socket já fechou */ }
  })
  fluxo.on('end', () => { encerrado = true })
  fluxo.pipe(response)
}
