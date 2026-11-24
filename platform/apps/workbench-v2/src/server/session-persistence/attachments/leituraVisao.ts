// MM-I: leitura de UMA cópia publicada. Não decide capacidade, formato,
// consentimento ou envio: esses gates continuam obrigatórios no chamador.
// O arquivo aberto é limitado e os mesmos bytes devolvidos são re-hashados;
// não se confia no nome, MIME, tamanho ou caminho fornecidos pelo browser.
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open } from 'node:fs/promises'
import { join } from 'node:path'
import { getSessionRecord } from '../database'
import { getAppDir } from '../paths'
import { withSessionPersistenceQueue } from '../filaSessao'
import { PersistenceProblem } from '../persistenceErrors'
import { readTranscript } from '../transcripts'
import { obterArtigo } from './catalogo'
import { resolverDonoAnexos } from './dono'
import { caminhoAbsolutoDeArtigo } from './estoque'
import { garantirDentroDaRaiz } from './contencao'

// Limite local provisório de leitura, independente da quota C-3a. O futuro
// adaptador deve também aplicar os menores limites comprovados do alvo e do
// corpo codificado; esta constante não é evidência de suporte do provedor.
export const TETO_LEITURA_VISAO_BYTES = 4 * 1024 * 1024
const TETO_TRANSCRIPT_BYTES = 16 * 1024 * 1024

export interface PedidoLeituraVisao {
  sessionId: string
  chatId: string
  messageId: string
  artifactId: string
  /** Limite já escolhido pelo chamador; ausente, inválido ou desconhecido bloqueia. */
  maxBytes: number
}

function recusar(code: string, message: string): never {
  throw new PersistenceProblem(409, code, message)
}

/** Não recebe nem retorna caminho; somente bytes conferidos e digest. */
export async function lerCopiaPublicadaParaVisao(pedido: PedidoLeituraVisao): Promise<{ bytes: Buffer; sha256: string }> {
  if (!Number.isSafeInteger(pedido.maxBytes) || pedido.maxBytes <= 0 || pedido.maxBytes > TETO_LEITURA_VISAO_BYTES) {
    return recusar('vision_limit_unknown', 'O limite seguro de leitura da imagem não foi confirmado.')
  }
  return withSessionPersistenceQueue(pedido.sessionId, async () => {
    resolverDonoAnexos(pedido.sessionId, pedido.chatId)
    const registro = getSessionRecord(pedido.sessionId)
    if (!registro) return recusar('vision_session_missing', 'A conversa não está disponível.')
    const artigo = obterArtigo(pedido.artifactId)
    if (!artigo || artigo.sessionId !== pedido.sessionId || artigo.chatId !== pedido.chatId || artigo.state !== 'pronto' || artigo.mode !== 'copy') {
      return recusar('vision_attachment_unavailable', 'A cópia do anexo não está disponível nesta conversa.')
    }
    if (!Number.isSafeInteger(artigo.bytes) || artigo.bytes <= 0 || artigo.bytes > pedido.maxBytes || !/^[a-f0-9]{64}$/.test(artigo.sha256)) {
      return recusar('vision_attachment_limit', 'A cópia excede o limite de leitura ou não tem integridade confirmada.')
    }
    const entradas = await readTranscript(registro.slug, pedido.sessionId, TETO_TRANSCRIPT_BYTES)
    const publicadas = entradas.filter((e) => e.type === 'user' && e.chatId === pedido.chatId && e.uuid === pedido.messageId)
    if (publicadas.length !== 1) return recusar('vision_message_unavailable', 'A mensagem publicada não foi encontrada ou é ambígua.')
    const msg = publicadas[0].message as { id?: unknown; role?: unknown; attachments?: unknown }
    if (msg.id !== pedido.messageId || msg.role !== 'user' || !Array.isArray(msg.attachments) || !msg.attachments.some((item: unknown) =>
      typeof item === 'object' && item !== null && (item as { artifactId?: unknown }).artifactId === pedido.artifactId)) {
      return recusar('vision_attachment_unlinked', 'O anexo não pertence à mensagem publicada.')
    }
    // Reutiliza o resolver e a contenção da C-3a, mas evita o hash anterior de
    // arquivo potencialmente enorme: a leitura e o hash abaixo são limitados.
    const caminho = caminhoAbsolutoDeArtigo(artigo)
    const raiz = artigo.rootKind === 'workspace' ? artigo.workspaceRoot : join(getAppDir(), artigo.papel === 'gerado-gerenciado' ? 'artifacts' : 'uploads')
    if (!raiz) return recusar('vision_attachment_unavailable', 'A cópia não está disponível.')
    await garantirDentroDaRaiz(raiz, caminho, { code: 'vision_attachment_unavailable', mensagem: 'A cópia não está disponível.' })
    const antes = await lstat(caminho).catch(() => null)
    if (!antes?.isFile() || antes.isSymbolicLink()) return recusar('vision_attachment_unavailable', 'A cópia não está disponível.')
    const arquivo = await open(caminho, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)).catch(() => null)
    if (!arquivo) return recusar('vision_attachment_unavailable', 'A cópia não está disponível.')
    try {
      const info = await arquivo.stat()
      if (!info.isFile() || info.size !== artigo.bytes || info.dev !== antes.dev || info.ino !== antes.ino) {
        return recusar('vision_attachment_changed', 'A cópia foi alterada. Nada foi enviado.')
      }
      const buffer = Buffer.alloc(artigo.bytes + 1)
      let lidos = 0
      while (lidos < buffer.length) {
        const resultado = await arquivo.read(buffer, lidos, buffer.length - lidos, lidos)
        if (!resultado.bytesRead) break
        lidos += resultado.bytesRead
      }
      const bytes = buffer.subarray(0, lidos)
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      if (lidos !== artigo.bytes || sha256 !== artigo.sha256) return recusar('vision_attachment_changed', 'A cópia foi alterada. Nada foi enviado.')
      return { bytes, sha256 }
    } finally {
      await arquivo.close()
    }
  })
}
