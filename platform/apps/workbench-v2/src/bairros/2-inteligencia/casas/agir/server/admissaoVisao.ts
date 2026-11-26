import { createHash, randomUUID } from 'node:crypto'
import type { AlvoConversa } from '../../conversa'
import { avaliarAlvoVisao, CHAVE_VISAO, identidadeVisao, type ProvaVisao, type RevisoesVisao } from './capacidadeVisao'
import { construirCorpoVisaoOpenAI, LIMITES_LOCAIS_VISAO } from './limitesVisao'
import { prepararImagemVisao, TETO_ORIGINAL_VISAO, type CodecImagemVisao } from './prepararImagemVisao'

const DURACAO_PROPOSTA = 5 * 60_000
const MAX_PROPOSTAS = 64
type Proposta = { limite: number; identidade: string; messageId: string; textoHash: string }
const hashTexto = (texto: string) => createHash('sha256').update(texto).digest('hex')
const idValido = (id: unknown): id is string => typeof id === 'string' && /^[\w-]{1,200}$/.test(id)
const propostas = new Map<string, Proposta>()
let emPreparacao = 0

export interface PedidoVisao {
  proposta: string
  messageId: string
  artifactIds: string[]
}
export type LerImagemVisao = (pedido: { sessionId: string; chatId: string; messageId: string; artifactId: string; artifactIds: readonly string[]; maxBytes: number; texto: string; sinal?: AbortSignal }) => Promise<{ bytes: Buffer }>
export type FonteVisao = (alvo: AlvoConversa) => { revisoes: RevisoesVisao; prova: ProvaVisao; destinoLiteLLM?: string } | undefined

function assinatura(alvo: AlvoConversa, fonte: FonteVisao) {
  const origem = fonte(alvo)
  if (!origem) return undefined
  const identidade = identidadeVisao(alvo, origem.revisoes)
  if (!identidade) return undefined
  const decisao = avaliarAlvoVisao(alvo, origem.revisoes, origem.prova)
  if (decisao.estado !== 'disponivel' || !decisao.limites) return undefined
  return {
    identidade: JSON.stringify([identidade, decisao.limites, origem.destinoLiteLLM]),
    limites: decisao.limites,
    destinoLiteLLM: origem.destinoLiteLLM,
  }
}

export function proporVisao(alvo: AlvoConversa, fonte: FonteVisao, messageId: unknown, texto: unknown) {
  if (!idValido(messageId) || typeof texto !== 'string' || !texto.trim() || texto.length > 100_000) return null
  const assinaturaAtual = assinatura(alvo, fonte)
  if (!assinaturaAtual) return null
  const agora = Date.now()
  for (const [id, item] of propostas) if (item.limite <= agora) propostas.delete(id)
  if (propostas.size >= MAX_PROPOSTAS) return null
  const proposta = randomUUID()
  propostas.set(proposta, { identidade: assinaturaAtual.identidade, limite: agora + DURACAO_PROPOSTA, messageId, textoHash: hashTexto(texto) })
  return { proposta, quantidade: assinaturaAtual.limites.quantidade, arquivoBytes: TETO_ORIGINAL_VISAO,
    providerId: alvo.providerId, modelId: alvo.modelId }
}

function recusar(mensagem: string): never {
  throw Object.assign(new Error(mensagem), { code: 'configuracao' })
}

export function validarPedidoVisao(valor: unknown): PedidoVisao {
  if (!valor || typeof valor !== 'object') return recusar('A autorização de imagem é inválida.')
  const { proposta, messageId, artifactIds } = valor as Partial<PedidoVisao>
  if (!idValido(proposta) || !idValido(messageId) || !Array.isArray(artifactIds) || !artifactIds.length ||
      artifactIds.length > LIMITES_LOCAIS_VISAO.quantidade || !artifactIds.every(idValido) ||
      new Set(artifactIds).size !== artifactIds.length) return recusar('A autorização de imagem é inválida.')
  return { proposta, messageId, artifactIds }
}

export async function comCorpoVisao<T>(
  pedido: PedidoVisao, contexto: { sessionId: string; chatId: string; texto: string },
  alvo: AlvoConversa, fonte: FonteVisao, ler: LerImagemVisao, executar: (
    preparar: (alvo: AlvoConversa, corpo: Record<string, unknown>) => Record<string, unknown>,
  ) => Promise<T>, codec?: CodecImagemVisao, sinal?: AbortSignal,
): Promise<T> {
  const proposta = propostas.get(pedido.proposta)
  const atual = assinatura(alvo, fonte)
  if (sinal?.aborted || !proposta || proposta.limite <= Date.now() || !atual || proposta.identidade !== atual.identidade ||
      proposta.messageId !== pedido.messageId || proposta.textoHash !== hashTexto(contexto.texto)) {
    return recusar('O modelo ou a autorização de imagens mudou. Confirme novamente antes de enviar.')
  }
  if (pedido.artifactIds.length > atual.limites.quantidade) return recusar('O lote excede o limite de imagens.')
  if (emPreparacao >= 1) return recusar('Já há outro envio de imagem em andamento. Tente novamente depois.')
  propostas.delete(pedido.proposta)
  emPreparacao++
  try {
    const imagens: Buffer[] = []
    for (const artifactId of pedido.artifactIds) {
      try {
        const { bytes } = await ler({ ...contexto, messageId: pedido.messageId, artifactId, artifactIds: pedido.artifactIds, maxBytes: TETO_ORIGINAL_VISAO, sinal })
        if (sinal?.aborted) return recusar('A análise foi cancelada. Nenhuma imagem foi enviada.')
        imagens.push(await prepararImagemVisao(bytes, codec))
      } catch (erro) {
        return recusar(erro instanceof Error ? erro.message : 'O anexo publicado não está disponível.')
      }
    }
    return await executar((alvoNoFetch, corpo) => {
      if (sinal?.aborted || assinatura(alvoNoFetch, fonte)?.identidade !== proposta.identidade || proposta.limite <= Date.now()) {
        return recusar('O destino de imagem mudou antes do envio. Confirme novamente.')
      }
      const corpoRoteado = atual.destinoLiteLLM ? { ...corpo, model: atual.destinoLiteLLM, disable_fallbacks: true } : corpo
      try { return construirCorpoVisaoOpenAI(corpoRoteado, imagens, atual.limites).corpo }
      catch (erro) { return recusar(erro instanceof Error ? erro.message : 'A imagem não pôde ser enviada.') }
    })
  } finally {
    emPreparacao--
  }
}

/** O simulador é ativado pelo perfil de testes e só para seu endpoint de loopback exato. */
export const provaVisaoDoSimulador: FonteVisao = (alvo) => {
  const endpoint = process.env.AGENTE_WINDOW_VISION_FIXTURE_URL
  const modelo = process.env.AGENTE_WINDOW_VISION_FIXTURE_MODEL
  if (!process.env.AGENTE_WINDOW_TEST_HOME || !endpoint || !/^http:\/\/127\.0\.0\.1:\d+\/v1$/.test(endpoint) ||
      alvo.baseUrl !== endpoint || !modelo || alvo.modelId !== modelo || alvo.providerId !== 'openai-compat') return undefined
  const revisoes = { configuracao: 'fixture-local-v1', api: 'fixture-chat-completions-v1' }
  return construirProvaVisao(alvo, revisoes, '2026-11-24T00:00:00Z')
}

export function construirProvaVisao(alvo: AlvoConversa, revisoes: RevisoesVisao, consultadaEm: string): ReturnType<FonteVisao> {
  const identidade = identidadeVisao(alvo, revisoes)
  if (!identidade) return undefined
  return { revisoes, prova: {
    topologia: 'individual-comprovada',
    limites: LIMITES_LOCAIS_VISAO,
    perfil: { alvo: identidade, entradas: [{ chave: CHAVE_VISAO, evidencias: [{
      alvo: identidade, estado: 'suportada', origem: 'teste-do-adaptador', revisao: revisoes.api, consultadaEm,
    }] }] },
  } }
}
