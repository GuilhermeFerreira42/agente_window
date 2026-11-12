import { randomUUID } from 'node:crypto'
import { getSessionRecord } from './database'
import { resolverContextoAgir } from './agirContext'
import { autorizarConsultaHistorica, consentimentoHistorico, digestChat, identidadeRaizHistorico, operadorHistoricoLocal,
  origemChat, revogarConsentimentoHistorico, textoHistoricoSeguro, revisaoConsentimentoHistorico, invalidarOrigensForaDaRaiz, origemElegivelParaConsentimento } from './origensChats'
import { readTranscript } from './transcripts'
import { idHistoricoValido } from '../../domain/consultaEntreChats'

interface Receipt { sessionId: string; chatId: string; epoch: string; digest: string; owner: string; raiz: string; identity: string; action: 'autorizar' | 'revogar'; expires: number; revision: string }
const receipts = new Map<string, Receipt>()
type Serializar = <T>(sessionId: string, action: () => Promise<T>) => Promise<T>
export interface PreparacaoAcessoHistorico { status: 'observed' | 'needs_consent' | 'consented'; title: string; project: string; token?: string }
export async function prepararAcessoHistorico(sessionId: string, chatId: string, serializar: Serializar): Promise<PreparacaoAcessoHistorico> {
  if (!idHistoricoValido(sessionId) || !idHistoricoValido(chatId)) throw new Error('Conversa inválida.')
  return serializar(sessionId, async () => {
    const contexto = resolverContextoAgir(sessionId, chatId), anterior = origemChat(sessionId, chatId)
    if (!contexto.ok || !anterior || anterior.operatorId !== operadorHistoricoLocal()) throw new Error('A conversa não está disponível neste perfil.')
    const identity = identidadeRaizHistorico(contexto.raiz)
    if (!identity) throw new Error('A pasta do projeto não está disponível.')
    invalidarOrigensForaDaRaiz(sessionId, contexto.raiz, identity)
    const origem = origemChat(sessionId, chatId)!
    const info = { title: textoHistoricoSeguro(origem.title) ? origem.title : 'Conversa selecionada', project: contexto.raiz }
    if (origem.state === 'verified') return { ...info, status: 'observed' }
    if (!origemElegivelParaConsentimento(origem, contexto.raiz, identity)) throw new Error('O vínculo conhecido não corresponde ao projeto atual. A confirmação não transfere histórico entre projetos.')
    const consent = consentimentoHistorico(sessionId, chatId, origem.epoch)
    const action = consent ? 'revogar' : 'autorizar', token = randomUUID()
    while (receipts.size >= 128) receipts.delete(receipts.keys().next().value!)
    receipts.set(token, { sessionId, chatId, epoch: origem.epoch, digest: origem.digest, owner: origem.operatorId,
      raiz: contexto.raiz, identity, action, expires: Date.now() + 5 * 60_000, revision: revisaoConsentimentoHistorico(sessionId, chatId, origem.epoch) })
    return { ...info, status: consent ? 'consented' : 'needs_consent', token }
  })
}
/** Only the human UI receives this one-use token. No agent tool issues or consumes it. */
export async function confirmarAcessoHistorico(token: string, serializar: Serializar): Promise<{ autorizado: boolean }> {
  const receipt = receipts.get(token); receipts.delete(token)
  if (!receipt || receipt.expires < Date.now()) throw new Error('A confirmação expirou. Abra novamente o menu de acesso histórico.')
  return serializar(receipt.sessionId, async () => {
    if (receipt.expires < Date.now()) throw new Error('A confirmação expirou.')
    const contexto = resolverContextoAgir(receipt.sessionId, receipt.chatId), origem = origemChat(receipt.sessionId, receipt.chatId)
    if (!contexto.ok || contexto.raiz !== receipt.raiz || identidadeRaizHistorico(receipt.raiz) !== receipt.identity ||
      !origem || origem.epoch !== receipt.epoch || origem.digest !== receipt.digest || origem.operatorId !== receipt.owner ||
      operadorHistoricoLocal() !== receipt.owner || origem.state !== 'unverifiable' ||
      (receipt.action === 'autorizar' && !origemElegivelParaConsentimento(origem, receipt.raiz, receipt.identity)) ||
      revisaoConsentimentoHistorico(receipt.sessionId, receipt.chatId, receipt.epoch) !== receipt.revision) throw new Error('A conversa ou o projeto mudou. Confirme novamente.')
    if (receipt.action === 'revogar') {
      revogarConsentimentoHistorico(receipt.sessionId, receipt.chatId)
      return { autorizado: false }
    }
    const entries = await readTranscript(getSessionRecord(receipt.sessionId)!.slug, receipt.sessionId, 16 * 1024 * 1024)
    const depois = resolverContextoAgir(receipt.sessionId, receipt.chatId), origemDepois = origemChat(receipt.sessionId, receipt.chatId)
    if (digestChat(entries, receipt.chatId) !== receipt.digest || identidadeRaizHistorico(receipt.raiz) !== receipt.identity ||
      !depois.ok || depois.raiz !== receipt.raiz || operadorHistoricoLocal() !== receipt.owner || receipt.expires < Date.now() ||
      !origemDepois || origemDepois.epoch !== receipt.epoch || origemDepois.digest !== receipt.digest || origemDepois.operatorId !== receipt.owner ||
      !origemElegivelParaConsentimento(origemDepois, receipt.raiz, receipt.identity) ||
      revisaoConsentimentoHistorico(receipt.sessionId, receipt.chatId, receipt.epoch) !== receipt.revision) throw new Error('O histórico mudou. A autorização não foi aplicada.')
    autorizarConsultaHistorica(origemDepois, receipt.raiz, receipt.identity)
    return { autorizado: true }
  })
}
