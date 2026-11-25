// Avalia capacidade a partir da configuração e das provas fornecidas pelo servidor.
// A autorização de cada envio é verificada separadamente.
import { createHmac, randomBytes } from 'node:crypto'
import type { AlvoConversa } from '../../conversa'
import { avaliarCapacidadeEfetiva, type ChaveCapacidade, type IdentidadeAlvoMultimodal, type PerfilMultimodal, type ResultadoCapacidade } from '../../../../../domain/multimodal'
import { LIMITES_LOCAIS_VISAO, type LimitesVisao } from './limitesVisao'

const CHAVE_PROCESSO = randomBytes(32)
const REVISAO_ADAPTADOR = 'openai-chat-visao-mm-i-1'
export const CHAVE_VISAO: ChaveCapacidade = { operacao: 'analisar-imagem', direcao: 'entrada', modalidade: 'imagem', representacao: 'inline-base64' }

/** Revisões obrigatórias fornecidas pelo dono, nunca inventadas do nome. */
export interface RevisoesVisao {
  /** Identifica a configuração COMPLETA do provedor/modelo na autoridade. */
  configuracao: string
  /** Revisão da API efetivamente comprovada para esse endpoint. */
  api: string
}

/** Fonte já autenticada no servidor; browser nunca pode produzir este objeto. */
export interface ProvaVisao {
  topologia: 'individual-comprovada' | 'desconhecida' | 'pool'
  perfil: PerfilMultimodal
  limites: Readonly<LimitesVisao>
}

function hmac(tipo: string, conteudo: string): string {
  return createHmac('sha256', CHAVE_PROCESSO).update(tipo).update('\0').update(conteudo).digest('hex')
}

/** Identificador opaco e efêmero: não inclui URL ou credencial em claro. */
export function identidadeVisao(alvo: AlvoConversa, revisoes: RevisoesVisao): IdentidadeAlvoMultimodal | null {
  if (!alvo || !revisoes || typeof revisoes.configuracao !== 'string' || !revisoes.configuracao.trim() ||
      typeof revisoes.api !== 'string' || !revisoes.api.trim() || alvo.protocolo !== 'openai-chat' ||
      typeof alvo.providerId !== 'string' || !alvo.providerId.trim() || typeof alvo.modelId !== 'string' || !alvo.modelId.trim() ||
      alvo.modelo !== alvo.modelId || typeof alvo.baseUrl !== 'string' || !alvo.baseUrl.trim()) return null
  // A revisão completa, fornecida pela autoridade, cobre também configurações
  // que AlvoConversa não projeta. Os campos projetados são protegidos em
  // profundidade; reinício invalida toda prova efêmera por uma nova chave.
  const config = JSON.stringify([revisoes.configuracao, alvo.baseUrl, alvo.apiKey, alvo.temperatura,
    alvo.configRevision ?? [alvo.maxSaida, alvo.limiteContexto, alvo.capacidade]])
  return {
    providerId: alvo.providerId, modelId: alvo.modelId, protocolo: alvo.protocolo,
    endpointIdentity: hmac('endpoint', alvo.baseUrl), configRevision: hmac('config', config),
    apiRevision: revisoes.api, adapterRevision: REVISAO_ADAPTADOR,
  }
}

export type DecisaoVisao = ResultadoCapacidade & { limites?: LimitesVisao }

/** Sem prova do alvo efetivo, limite completo ou topologia, fecha a mídia. */
export function avaliarAlvoVisao(alvo: AlvoConversa, revisoes: RevisoesVisao, prova?: ProvaVisao): DecisaoVisao {
  const identidade = identidadeVisao(alvo, revisoes)
  if (!identidade) return { estado: 'desconhecida', motivos: ['identidade-ou-revisao-desconhecida'] }
  if (!prova || prova.topologia !== 'individual-comprovada') return { estado: 'desconhecida', motivos: ['topologia-ou-prova-desconhecida'] }
  const capacidade = avaliarCapacidadeEfetiva({ alvo: identidade, perfil: prova.perfil, pedido: CHAVE_VISAO, codec: { chave: CHAVE_VISAO, implementado: true } })
  if (capacidade.estado !== 'disponivel') return capacidade
  const limites = {} as LimitesVisao
  for (const chave of Object.keys(LIMITES_LOCAIS_VISAO) as (keyof LimitesVisao)[]) {
    const valor = prova.limites?.[chave]
    if (!Number.isSafeInteger(valor) || valor <= 0) return { estado: 'desconhecida', motivos: ['limite-desconhecido'] }
    limites[chave] = Math.min(valor, LIMITES_LOCAIS_VISAO[chave])
  }
  return { ...capacidade, limites }
}
