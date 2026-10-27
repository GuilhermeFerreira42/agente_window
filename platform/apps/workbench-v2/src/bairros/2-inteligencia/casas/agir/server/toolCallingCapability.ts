// ============================================================================
// F5-B — verificação opt-in de tool calling para um par exato.
// O canary anuncia somente `ler`; a única resposta à ferramenta é um nonce
// inerte gerado em memória. Não recebe executor, workspace, disco ou shell.
// ============================================================================
import { randomBytes } from 'node:crypto'
import type { AlvoConversa, ConfigChamadaModelo, IniciarChamadaModelo } from '../../conversa'
import { AGIR_TOOL_ADAPTER_VERSION } from '../contract'
import type { PedidoFerramenta } from '../contract'
import type { ToolCallingAssessmentRecord, ToolCallingCheckReason, ToolCallingCapabilityStatus } from '../../provedores/server'
import {
  descritorPorId,
  fingerprintToolCalling,
  iniciarChamadaModelo,
  lerArquivo,
  registrarToolCallingAssessment,
  resolverChave,
} from '../../provedores/server'
import { ErroVizinho, criarVizinhoReal } from './vizinho'

const TIMEOUT_PROBE_MS = 12_000
const LIMITE_TEXTO_RETORNO = 512
const MARCADOR = 'CANARY-READ-ONLY:'

export interface ToolCallingVerificationResult {
  providerId: string
  modelId: string
  status: ToolCallingCapabilityStatus
  checkedAt: string
  reason: ToolCallingCheckReason
  cached: boolean
}

export class ToolCallingVerificationError extends Error {
  readonly status: number
  readonly code: 'invalid_pair' | 'consent_required' | 'configuration_changed'
  constructor(code: ToolCallingVerificationError['code'], status: number, message: string) {
    super(message)
    this.name = 'ToolCallingVerificationError'
    this.code = code
    this.status = status
  }
}

function obterFingerprint(
  providerId: string,
  modelId: string,
  config: { baseUrl: string; protocol: string; apiKey: string | null; temperature?: number; maxOutput?: number },
): string {
  return fingerprintToolCalling({
    providerId,
    modelId,
    baseUrl: config.baseUrl,
    protocol: config.protocol as 'openai-chat' | 'anthropic' | 'gemini' | 'ollama',
    adapterVersion: AGIR_TOOL_ADAPTER_VERSION,
    apiKey: config.apiKey,
    temperature: config.temperature,
    maxOutput: config.maxOutput,
  })
}

function classificarIncompatibilidade(status: number, corpo: string): 'tools_unsupported' | 'adapter_missing_field' | 'adapter_parameter_unsupported' | null {
  if (status !== 400 && status !== 422) return null
  const texto = corpo.slice(0, 16_384).toLowerCase()
  const negacao = '(?:does not support|doesn\'t support|not supported|unsupported|not available|unavailable)'
  const capacidade = '(?:tools?\\b|tool calls?\\b|tool use\\b|tool calling\\b|function calling\\b)'
  const tools = new RegExp(`(?:${negacao}).{0,100}${capacidade}|${capacidade}.{0,100}${negacao}`, 'i')
  if (/tool_choice/.test(texto) && new RegExp(negacao, 'i').test(texto)) return 'adapter_parameter_unsupported'
  if (tools.test(texto)) return 'tools_unsupported'
  // DeepSeek thinking mode exige replay de reasoning_content entre turnos.
  // O adaptador atual não o mantém; a recusa explícita identifica incompatibilidade.
  if (/reasoning_content/.test(texto) && /(?:must|required|missing|include|provide|pass(?:ed)? back|expected)/.test(texto)) {
    return 'adapter_missing_field'
  }
  return null
}

function motivoErro(erro: unknown): { status: ToolCallingCapabilityStatus; reason: ToolCallingCheckReason } {
  if (erro instanceof ErroVizinho) {
    if (erro.explicitIncompatibility === 'tools_unsupported') return { status: 'incompatible', reason: 'explicit_tools_unsupported' }
    if (erro.explicitIncompatibility === 'adapter_missing_field') return { status: 'incompatible', reason: 'adapter_missing_field' }
    if (erro.explicitIncompatibility === 'adapter_parameter_unsupported') return { status: 'incompatible', reason: 'adapter_parameter_unsupported' }
    if (erro.httpStatus === 401 || erro.httpStatus === 403 || erro.code === 'chave') return { status: 'unknown', reason: 'authentication_failure' }
    if (erro.code === 'endereco' || erro.code === 'tempo') return { status: 'unknown', reason: 'network_failure' }
    return { status: 'unknown', reason: 'provider_error' }
  }
  return { status: 'unknown', reason: 'network_failure' }
}

function motivoDaResposta(pedidos: PedidoFerramenta[]): ToolCallingCheckReason {
  if (pedidos.length === 0) return 'no_tool_call'
  return 'invalid_tool_call'
}

export async function verificarToolCalling(
  providerId: string,
  modelId: string,
  consent: boolean,
  caminho?: string,
): Promise<ToolCallingVerificationResult> {
  if (consent !== true) throw new ToolCallingVerificationError('consent_required', 400, 'É necessária autorização explícita para iniciar o canary.')
  const arquivo = await lerArquivo(caminho)
  const salvo = arquivo.provedores[providerId]
  const descritor = descritorPorId(providerId)
  if (!salvo || !descritor || salvo.habilitado === false || !salvo.modelosHabilitados?.includes(modelId)) {
    throw new ToolCallingVerificationError('invalid_pair', 409, 'O par provedor/modelo não está habilitado. Atualize Provedores antes de verificar.')
  }

  const { chave } = resolverChave(providerId, arquivo)
  const baseUrl = (salvo.baseUrl || descritor.baseUrlPadrao).replace(/\/+$/, '')
  const fingerprint = obterFingerprint(providerId, modelId, {
    baseUrl,
    protocol: descritor.protocolo,
    apiKey: chave,
    temperature: salvo.temperatura,
    maxOutput: salvo.maxSaida,
  })
  const anterior = arquivo.toolCallingAssessments?.[providerId]?.[modelId]
  if (anterior?.status === 'verified' && anterior.fingerprint === fingerprint && anterior.adapterVersion === AGIR_TOOL_ADAPTER_VERSION) {
    return { providerId, modelId, status: 'verified', checkedAt: anterior.checkedAt, reason: anterior.reason, cached: true }
  }

  const agora = new Date().toISOString()
  const gravar = async (status: ToolCallingCapabilityStatus, reason: ToolCallingCheckReason): Promise<ToolCallingVerificationResult> => {
    const record: ToolCallingAssessmentRecord = {
      status,
      fingerprint,
      adapterVersion: AGIR_TOOL_ADAPTER_VERSION,
      checkedAt: agora,
      reason,
    }
    try {
      await registrarToolCallingAssessment(providerId, modelId, record, caminho)
    } catch (erro) {
      if ((erro as { code?: string }).code === 'configuration_changed') {
        throw new ToolCallingVerificationError('configuration_changed', 409, 'A configuração mudou durante a verificação. O resultado foi descartado; atualize a tela e tente de novo se desejar.')
      }
      throw erro
    }
    return { providerId, modelId, status, checkedAt: agora, reason, cached: false }
  }

  if (!descritor.chaveOpcional && !chave) return gravar('unknown', 'authentication_failure')

  const alvo: AlvoConversa = {
    providerId,
    modelId,
    protocolo: descritor.protocolo,
    baseUrl,
    modelo: modelId,
    apiKey: chave,
    temperatura: salvo.temperatura,
    maxSaida: salvo.maxSaida,
  }
  const iniciarComConfigVerificada: IniciarChamadaModelo = async <T>(
    id: string,
    model: string,
    iniciar: (config: ConfigChamadaModelo) => Promise<T>,
  ) => iniciarChamadaModelo(id, model, (config) => {
    const impressaoAtual = obterFingerprint(id, model, {
      baseUrl: config.baseUrl,
      protocol: config.protocolo,
      apiKey: config.apiKey,
      temperature: config.temperatura,
      maxOutput: config.maxSaida,
    })
    if (impressaoAtual !== fingerprint) {
      throw Object.assign(new Error('A configuração mudou durante a verificação.'), { code: 'configuration_changed' })
    }
    return iniciar(config)
  }, caminho)

  const canary = criarVizinhoReal(alvo, {
    primeiroByteMs: TIMEOUT_PROBE_MS,
    totalMs: TIMEOUT_PROBE_MS,
    ociosoMs: TIMEOUT_PROBE_MS,
    toolCallingProbe: true,
    classificarToolCallingIncompatibilidade: classificarIncompatibilidade,
  }, iniciarComConfigVerificada)
  const nonce = randomBytes(16).toString('hex')
  const caminhoCanary = `probe-${nonce}`
  const conteudoCanary = `${MARCADOR}${nonce}`
  const historico = [{
    papel: 'usuario' as const,
    conteudo: `Verificação automática inofensiva. Use exatamente uma vez a ferramenta ler, com o argumento caminho igual a "${caminhoCanary}". Não peça outra ferramenta. Depois, responda copiando exatamente o texto recebido como resultado da ferramenta.`,
  }]

  try {
    const primeira = await canary(historico)
    if (primeira.pedidos.length !== 1 || primeira.pedidos[0]?.ferramenta !== 'ler' || primeira.pedidos[0]?.argumentos.caminho !== caminhoCanary) {
      return gravar('unknown', motivoDaResposta(primeira.pedidos))
    }
    const pedido = primeira.pedidos[0]
    const resultadoInerte = conteudoCanary.slice(0, LIMITE_TEXTO_RETORNO)
    const segunda = await canary([
      ...historico,
      { papel: 'assistente', conteudo: primeira.texto, pedidos: primeira.pedidos },
      { papel: 'ferramenta', pedidoId: pedido.id, ferramenta: 'ler', conteudo: resultadoInerte },
    ])
    if (segunda.pedidos.length > 0) return gravar('unknown', 'continuation_failed')
    if (segunda.texto.trim() !== conteudoCanary) return gravar('unknown', 'continuation_failed')
    return gravar('verified', 'roundtrip_verified')
  } catch (erro) {
    if ((erro as { code?: string }).code === 'configuration_changed' || (erro as { code?: string }).code === 'selection_unavailable' || (erro as { code?: string }).code === 'model_disabled' || (erro as { code?: string }).code === 'credential_unavailable') {
      throw new ToolCallingVerificationError('configuration_changed', 409, 'O par ou a credencial mudou durante a verificação. Nenhum resultado foi salvo.')
    }
    const falha = motivoErro(erro)
    return gravar(falha.status, falha.reason)
  }
}
