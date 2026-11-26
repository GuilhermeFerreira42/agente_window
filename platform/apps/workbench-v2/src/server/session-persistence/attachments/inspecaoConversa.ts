// Porta privada da prefeitura: dados do chat efetivo, nunca caminhos do cliente.
// A integração ao agente exige confirmação individual antes do envio ao provedor.
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { basename, join, posix } from 'node:path'
import { Readable } from 'node:stream'
import { withSessionPersistenceQueue } from '../filaSessao'
import { getAppDir } from '../paths'
import { PersistenceProblem } from '../persistenceErrors'
import { listarArtigosChat, obterArtigo } from './catalogo'
import { garantirDentroDaRaiz } from './contencao'
import { resolverDonoAnexos } from './dono'
import { admitirUpload, cancelarUpload, caminhoAbsolutoDeArtigo, consultarUpload, receberConteudo } from './estoque'
import { extrairZipSeguro, listarZipSeguro, type EntradaZipSegura } from './zipSeguro'
import { extrairTextoPdf } from './leitorPdf'
import { caminhoTrabalhoPrivado, obterVinculoTrabalho, sincronizarTrabalhosPrivadosSobFila } from './trabalhoPrivado'
import { raizPrivadaDaConversa } from '../raizPrivadaChat'
import { resolverRaizExplorer } from '../raizExplorer'
import { usarTrabalhoProjeto } from '../movimentoProjeto'
import { transcreverAudioLocal } from './leitorAudio'

export const TETO_FONTE_BYTES = 32 * 1024 * 1024
export interface FonteConversa { artifactId: string; nome: string; bytes: number; modalidade: string; estado?: 'trabalho' | 'trabalho_ausente' }
function recusar(): never { throw new PersistenceProblem(409, 'source_unavailable', 'A fonte não está disponível nesta conversa ou foi alterada.') }

export async function listarFontesConversa(sessionId: string, chatId: string): Promise<FonteConversa[]> {
  return withSessionPersistenceQueue(sessionId, async () => {
    const dono = resolverDonoAnexos(sessionId, chatId)
    if (dono.contextKind === 'chat') await sincronizarTrabalhosPrivadosSobFila(sessionId, chatId)
    const artigos = listarArtigosChat(sessionId, chatId).filter(a => a.state === 'pronto' && a.papel !== 'gerado-gerenciado')
    return Promise.all(artigos.map(async a => {
      const fonte: FonteConversa = { artifactId: a.artifactId, nome: a.name, bytes: a.bytes, modalidade: a.modalidade }
      const privado = dono.contextKind === 'chat' && a.rootKind === 'appdir' && a.mode === 'copy' && a.papel === 'upload-chat'
      const projeto = a.rootKind === 'workspace' && a.mode === 'copy' && a.papel === 'upload-workspace' && !!a.workspaceRoot
      if (!privado && !projeto) return fonte
      try {
        const vinculo = privado ? obterVinculoTrabalho(a.artifactId) : undefined
        if (privado && (!vinculo || vinculo.state !== 'pronto')) throw new Error('Arquivo de trabalho indisponível.')
        const verificar = async (caminho: string) => {
          const raiz = privado ? raizPrivadaDaConversa(sessionId, chatId) : a.workspaceRoot!
          await garantirDentroDaRaiz(raiz, caminho, { code: 'source_unavailable' })
          const info = await lstat(caminho)
          if (!info.isFile() || info.isSymbolicLink()) throw new Error('Arquivo de trabalho indisponível.')
          return { ...fonte, nome: basename(caminho), bytes: info.size, estado: 'trabalho' as const }
        }
        return projeto ? await usarTrabalhoProjeto(a, verificar) : await verificar(caminhoTrabalhoPrivado(vinculo!))
      } catch { return { ...fonte, estado: 'trabalho_ausente' as const } }
    }))
  })
}

/** Confere dono e conteúdo da versão de trabalho, sem retornar caminho. */
export async function lerFonteConversa(sessionId: string, chatId: string, artifactId: string, maxBytes: number): Promise<{ nome: string; bytes: Buffer; sha256: string }> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > TETO_FONTE_BYTES) return recusar()
  return withSessionPersistenceQueue(sessionId, () => lerFonteSobFila(sessionId, chatId, artifactId, maxBytes))
}

async function lerFonteSobFila(sessionId: string, chatId: string, artifactId: string, maxBytes: number): Promise<{ nome: string; bytes: Buffer; sha256: string }> {
  const dono = resolverDonoAnexos(sessionId, chatId)
  const artigo = obterArtigo(artifactId)
  if (!artigo || artigo.sessionId !== sessionId || artigo.chatId !== chatId || artigo.state !== 'pronto' || artigo.papel === 'gerado-gerenciado' ||
      !Number.isSafeInteger(artigo.bytes) || artigo.bytes < 0 || !/^[a-f0-9]{64}$/.test(artigo.sha256)) return recusar()
  const privado = dono.contextKind === 'chat' && artigo.rootKind === 'appdir' && artigo.mode === 'copy' && artigo.papel === 'upload-chat'
  if (privado) await sincronizarTrabalhosPrivadosSobFila(sessionId, chatId)
  const vinculo = privado ? obterVinculoTrabalho(artifactId) : undefined
  if (privado && (!vinculo || vinculo.state !== 'pronto')) return recusar()
  const trabalhoMutavel = privado || artigo.rootKind === 'workspace' && artigo.mode === 'copy' && artigo.papel === 'upload-workspace'
  if (!trabalhoMutavel && artigo.bytes > maxBytes) return recusar()
  const lerCaminho = async (caminho: string) => {
  const raiz = privado ? raizPrivadaDaConversa(sessionId, chatId) : artigo.rootKind === 'workspace' ? artigo.workspaceRoot : join(getAppDir(), 'uploads')
  if (!raiz) return recusar()
  await garantirDentroDaRaiz(raiz, caminho, { code: 'source_unavailable', mensagem: 'A fonte não está disponível nesta conversa.' })
  const antes = await lstat(caminho).catch(() => null)
  if (!antes?.isFile() || antes.isSymbolicLink()) return recusar()
  const arquivo = await open(caminho, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null)
  if (!arquivo) return recusar()
  try {
    const info = await arquivo.stat()
    if (!info.isFile() || info.size < 0 || info.size > maxBytes || (!trabalhoMutavel && info.size !== artigo.bytes) || info.dev !== antes.dev || info.ino !== antes.ino) return recusar()
    const buffer = Buffer.alloc(info.size + 1)
    let total = 0
    while (total < buffer.length) {
      const resultado = await arquivo.read(buffer, total, buffer.length - total, total)
      if (!resultado.bytesRead) break
      total += resultado.bytesRead
    }
    const bytes = buffer.subarray(0, total), sha256 = createHash('sha256').update(bytes).digest('hex')
    if (total !== info.size || (!trabalhoMutavel && sha256 !== artigo.sha256)) return recusar()
    return { nome: trabalhoMutavel ? basename(caminho) : artigo.name, bytes, sha256 }
  } finally { await arquivo.close() }
  }
  return trabalhoMutavel && artigo.rootKind === 'workspace'
    ? usarTrabalhoProjeto(artigo, lerCaminho)
    : lerCaminho(vinculo ? caminhoTrabalhoPrivado(vinculo) : caminhoAbsolutoDeArtigo(artigo))
}

/** A listagem pertence à conversa e valida o ZIP inteiro antes de retornar metadados. */
export async function listarZipConversa(sessionId: string, chatId: string, artifactId: string): Promise<EntradaZipSegura[]> {
  const fonte = await lerFonteConversa(sessionId, chatId, artifactId, TETO_FONTE_BYTES)
  return listarZipSeguro(fonte.bytes)
}

/**
 * Um item por operação: valida antes de escrever e reutiliza o ledger/quota da
 * C-3a. O nome do ZIP é apenas metadado; diretórios internos nunca viram paths.
 * A identidade e o cancelamento são revalidados sob a fila na admissão e commit.
 * O chamador precisa obter consentimento e acompanhar o resultado até o fim.
 */
export async function extrairItemZipConversa(sessionId: string, chatId: string, artifactId: string, indice: number, sinal?: AbortSignal, sha256Esperado?: string): Promise<FonteConversa> {
  if (sinal?.aborted) throw new Error('Extração cancelada antes de começar.')
  const fonte = await lerFonteConversa(sessionId, chatId, artifactId, TETO_FONTE_BYTES)
  if (sha256Esperado && fonte.sha256 !== sha256Esperado) return recusar()
  const [item] = await extrairZipSeguro(fonte.bytes, [indice])
  if (sinal?.aborted) throw new Error('Extração cancelada antes de começar.')
  const fila = <T>(operacao: () => Promise<T>): Promise<T> => withSessionPersistenceQueue(sessionId, async () => {
    resolverDonoAnexos(sessionId, chatId)
    // A fonte de trabalho precisa continuar a mesma após a autorização. Não
    // compara com o hash histórico, pois o arquivo pode ter sido editado.
    const atual = await lerFonteSobFila(sessionId, chatId, artifactId, TETO_FONTE_BYTES)
    if (atual.sha256 !== fonte.sha256 || atual.nome !== fonte.nome) return recusar()
    return operacao()
  })
  const filaAdmissao = <T>(operacao: () => Promise<T>): Promise<T> => fila(async () => {
    if (sinal?.aborted) throw new Error('Extração cancelada antes da admissão.')
    return operacao()
  })
  const upload = await admitirUpload({ sessionId, chatId, name: posix.basename(item.nome), declaredBytes: item.bytes.length, mode: 'copy', scope: 'chat', workspaceRoot: null }, { fila: filaAdmissao })
  try {
    const recibo = await receberConteudo(sessionId, chatId, upload.uploadId, Readable.from([item.bytes], { signal: sinal }), { fila, sinalPublicacao: sinal })
    if (resolverDonoAnexos(sessionId, chatId).contextKind === 'chat') await resolverRaizExplorer(sessionId, chatId).catch(() => undefined)
    return { artifactId: recibo.artifactId, nome: recibo.name, bytes: recibo.bytes, modalidade: 'arquivo' }
  } catch (erro) {
    const atual = (() => { try { return consultarUpload(sessionId, chatId, upload.uploadId) } catch { return null } })()
    if (atual?.state === 'pronto') return { artifactId: atual.artifactId, nome: atual.name, bytes: atual.bytes, modalidade: 'arquivo' }
    // Em publicação preparada, o destino pode já existir: preserve journal/stage
    // para recuperação e não afirme que não houve efeito.
    if (!atual || atual.state === 'preparado') throw Object.assign(new Error('Resultado da extração não confirmado; confira as fontes antes de repetir.'), { efeitoPossivel: true })
    try {
      const cancelado = await cancelarUpload(sessionId, chatId, upload.uploadId)
      if (cancelado.state === 'pronto') return { artifactId: cancelado.artifactId, nome: cancelado.name, bytes: cancelado.bytes, modalidade: 'arquivo' }
      if (cancelado.state !== 'cancelado') throw new Error('Cancelamento não confirmado.')
    } catch {
      throw Object.assign(new Error('Resultado da extração não confirmado; confira as fontes antes de repetir.'), { efeitoPossivel: true })
    }
    throw erro
  }
}

export type ResultadoTextoConversa =
  | { disponivel: true; representacao: 'texto UTF-8' | 'texto extraído de PDF' | 'transcrição local de áudio'; nome: string; texto: string; idioma?: string }
  | { disponivel: false; nome: string; motivo: string }

/** Esta porta não concede envio ao modelo: o chamador deve pedir consentimento. */
export async function inspecionarTextoConversa(sessionId: string, chatId: string, artifactId: string, sinal?: AbortSignal): Promise<ResultadoTextoConversa> {
  const fonte = await lerFonteConversa(sessionId, chatId, artifactId, TETO_FONTE_BYTES)
  const indisponivel = (motivo: string): ResultadoTextoConversa => ({ disponivel: false, nome: fonte.nome, motivo: `${motivo} O original pode ser baixado se estiver disponível.` })
  const nome = fonte.nome.toLowerCase()
  if (fonte.bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    const extraido = await extrairTextoPdf(fonte.bytes, sinal)
    if (!extraido?.texto) return indisponivel('PDF sem texto extraível, inválido ou análise local indisponível (limites: 8 MiB, 20 páginas, 16 mil caracteres, tempo e concorrência); OCR não está disponível.')
    return { disponivel: true, representacao: 'texto extraído de PDF', nome: fonte.nome, texto: extraido.texto }
  }
  if (nome.endsWith('.wav')) {
    const resultado = await transcreverAudioLocal(fonte.bytes, sinal)
    if (!resultado) return indisponivel('Transcrição local de áudio indisponível ou formato não suportado. É necessário configurar o transcritor local; somente WAV PCM mono de 16 bits, 16 kHz e até 60 segundos é aceito.')
    return { disponivel: true, representacao: 'transcrição local de áudio', nome: fonte.nome, texto: resultado.texto, idioma: resultado.idioma }
  }
  if (/\.(mp3|m4a|ogg|flac|aac|opus)$/u.test(nome)) return indisponivel('Este formato de áudio não tem transcrição disponível; use WAV PCM mono de 16 bits e 16 kHz com o transcritor local configurado.')
  if (/\.(mp4|webm|mov|mkv|avi)$/u.test(nome)) return indisponivel('Extração de quadros ou transcrição de vídeo ainda não está disponível: não há ferramenta local integrada nem capacidade de vídeo comprovada para este fluxo.')
  if (!/\.(txt|md|csv|tsv|json|xml|log)$/u.test(nome)) return indisponivel('Este formato não possui um leitor de texto disponível.')
  if (fonte.bytes.length > 16 * 1024) return indisponivel('O texto excede o limite de leitura de 16 KiB.')
  let texto: string
  try { texto = new TextDecoder('utf-8', { fatal: true }).decode(fonte.bytes) } catch { return indisponivel('O conteúdo não é texto UTF-8 válido.') }
  if ([...texto].some(caractere => { const c = caractere.charCodeAt(0); return c < 32 && c !== 9 && c !== 10 && c !== 13 || c === 127 })) {
    return indisponivel('O conteúdo contém bytes de controle incompatíveis com texto.')
  }
  return { disponivel: true, representacao: 'texto UTF-8', nome: fonte.nome, texto }
}
