// C-3a — validação de anexos na publicação da mensagem (R04/R05/T18/T19/T23):
// o servidor resolve cada identidade no ledger do dono; DTO `pronto` sem
// respaldo (ou com hash divergente) é recusado — nunca confiar no cliente.
import type { ChatMessage, Session } from '../../../types'
import { getDatabase } from '../database'
import { PersistenceProblem } from '../persistenceErrors'
import { obterArtigo, obterUpload } from './catalogo'
import { validarSchemaAnexos } from './schemaAnexos'
import { lerEnvelopeMultimodal, validarMensagemMultimodal } from '../../../domain/multimodal/mensagens'

function exigirArtigoBackeado(sessionId: string, chatId: string, artifactId: string, claim: { bytes?: number; sha256?: string }): void {
  const artigo = obterArtigo(artifactId)
  if (!artigo || artigo.sessionId !== sessionId || artigo.chatId !== chatId) {
    throw new PersistenceProblem(409, 'attachment_not_ready',
      'Um anexo da mensagem não está pronto no servidor desta conversa. Nada foi publicado com esse conteúdo.')
  }
  if (artigo.state !== 'pronto') {
    throw new PersistenceProblem(409, 'attachment_not_ready', 'O anexo ainda não terminou de ser publicado. Nada foi publicado com esse conteúdo.')
  }
  if (claim.sha256 != null && claim.sha256 !== artigo.sha256) {
    throw new PersistenceProblem(409, 'attachment_forged',
      'O estado enviado para um anexo diverge do ledger do servidor. Recarregue a conversa e tente novamente.')
  }
  if (claim.bytes != null && claim.bytes !== artigo.bytes) {
    throw new PersistenceProblem(409, 'attachment_forged',
      'O tamanho enviado para um anexo diverge do ledger do servidor. Recarregue a conversa e tente novamente.')
  }
}

/**
 * C-3b (T02/T03/T10) — valida o envelope multimodal de uma mensagem contra o
 * ledger do dono.
 *
 * Por que aqui: `attachments` é a lista de chips; o envelope é a ORDEM
 * canônica. Se as partes não passarem pela mesma autoridade, um cliente
 * poderia citar um `artifactId` de outro dono — ou inexistente — e a UI
 * tentaria resolver bytes que ele não possui.
 *
 * Escrita inválida (versão errada, partId duplicado, artefato sem lastro)
 * falha. Envelope de versão FUTURA desconhecida é preservado e não bloqueia:
 * descartar seria perda de dados de uma conversa já gravada.
 */
function validarEnvelopeDaMensagem(sessionId: string, chatId: string, mensagem: ChatMessage): void {
  const bruto = (mensagem as ChatMessage & { multimodal?: unknown }).multimodal
  const leitura = lerEnvelopeMultimodal(bruto)
  if (leitura.estado !== 'valido') return

  const envelope = leitura.envelope
  if (envelope.messageId !== mensagem.id) {
    throw new PersistenceProblem(409, 'multimodal_message_mismatch',
      'O envelope multimodal não corresponde a esta mensagem. Nada foi publicado com esse conteúdo.')
  }
  // Revalidação explícita: `lerEnvelopeMultimodal` já validou, mas a fronteira
  // de escrita precisa do erro estruturado, não de um caminho tolerante.
  const revalidado = validarMensagemMultimodal(bruto)
  if (!revalidado.ok) {
    throw new PersistenceProblem(409, 'multimodal_invalid',
      `O envelope multimodal desta mensagem é inválido (${revalidado.codigo}). Nada foi publicado.`)
  }
  for (const parte of envelope.partes) {
    if (parte.tipo !== 'artefato') continue
    // `exigirArtigoBackeado` já garante dono + pronto + hash quando há claim;
    // aqui a claim é vazia porque a parte não carrega bytes.
    exigirArtigoBackeado(sessionId, chatId, parte.artifactId, {})
  }
}

/**
 * Enriquece a sessão projetada com a verdade do ledger e recusa DTOs
 * forjados. Regras:
 *  - claim de `pronto`/`referencia` exige artefato publicado do dono;
 *  - artefato publicado sempre substitui bytes/sha256/estado do cliente;
 *  - anexo sem artifactId e sem claim de prontidão é legado (preservado);
 *  - estado `transferindo`/`falhou` sem artefato é aceito (falha honesta —
 *    a retomada revalida e re-publica com a verdade do ledger).
 */
export function validarAnexosPublicados(sessionId: string, session: Session): Session {
  validarSchemaAnexos(getDatabase())
  return {
    ...session,
    chats: session.chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((mensagem: ChatMessage): ChatMessage => {
        // Antes do early-return: mensagem SÓ com partes (sem chips) também
        // precisa passar pela autoridade do ledger.
        validarEnvelopeDaMensagem(sessionId, chat.id, mensagem)
        if (!mensagem.attachments?.length) return mensagem
        return {
          ...mensagem,
          attachments: mensagem.attachments.map((anexo) => {
            const claimPronto = anexo.estado === 'pronto' || anexo.estado === 'referencia'
            if (!anexo.artifactId) {
              if (claimPronto) {
                throw new PersistenceProblem(409, 'attachment_forged',
                  'A mensagem declara um anexo pronto sem artefato publicado no servidor. Nada foi publicado com esse estado.')
              }
              // Legado preservado EXATAMENTE como está ({id,name,kind});
              // sem flag aditiva — snapshots antigos continuam comparáveis.
              return anexo
            }
            if (claimPronto) {
              exigirArtigoBackeado(sessionId, chat.id, anexo.artifactId, anexo)
              const artigo = obterArtigo(anexo.artifactId)!
              return {
                ...anexo,
                name: artigo.name,
                bytes: artigo.bytes,
                sha256: artigo.sha256,
                estado: artigo.mode === 'reference' ? 'referencia' : 'pronto',
                mode: artigo.mode,
                modalidade: anexo.modalidade,
                legado: false,
              }
            }
            // Estado incompleto: o uploadId precisa pertencer a este dono
            // quando existe; sem linha (falha antes da admissão) fica congelado.
            const upload = obterUpload(sessionId, chat.id, anexo.artifactId)
            if (!upload) return anexo
            if (upload.state === 'pronto' && upload.artifactId) {
              exigirArtigoBackeado(sessionId, chat.id, upload.artifactId, anexo)
              const artigo = obterArtigo(upload.artifactId)!
              return {
                ...anexo, artifactId: artigo.artifactId, name: artigo.name, bytes: artigo.bytes,
                sha256: artigo.sha256, estado: artigo.mode === 'reference' ? 'referencia' : 'pronto',
                mode: artigo.mode, legado: false,
              }
            }
            const estado = upload.state === 'cancelado' ? 'falhou'
              : upload.state === 'falhou' ? 'falhou'
              : 'transferindo'
            return { ...anexo, estado, mode: upload.mode, legado: false }
          }),
        }
      }),
    })),
  }
}
