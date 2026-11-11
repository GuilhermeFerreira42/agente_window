type Protocolo = 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'
import type { CapacidadeContexto } from './capacidadeContexto'

export interface EstadoCompactacao { estado: 'compactando' | 'compactado' | 'falhou'; ultimaEm?: number }

export interface MedicaoContexto {
  capacidade?: CapacidadeContexto
  modeloRespondido?: string
  requestId: string
  iteracao: number
  providerId: string
  modelId: string
  entrada?: number
  saida?: number
  janela?: { tokens: number; origem: 'configuracao' | 'api' | 'gateway' | 'catalogo' }
  reservaSaida?: number
  origemEntrada?: 'provedor' | 'estimativa'
  estimativa?: { minimo: number; maximo: number; metodo: 'bytes-utf8' }
  fase?: 'enviado' | 'respondido'
}

type Contagens = Pick<MedicaoContexto, 'entrada' | 'saida'>
const registro = (valor: unknown): Record<string, unknown> =>
  valor !== null && typeof valor === 'object' ? valor as Record<string, unknown> : {}

export const tokensValidos = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0

/** Os quadros de uso descrevem a mesma chamada. Campos ausentes não apagam os anteriores. */
export function criarLeitorDeUso(protocolo: Protocolo) {
  let entrada: number | undefined
  let saida: number | undefined
  let cacheCriado = 0
  let cacheLido = 0
  let raciocinio = 0
  let modeloRespondido: string | undefined
  return {
    ler(quadro: unknown): void {
      const dados = registro(quadro)
      const nome = dados.model ?? dados.modelVersion
      if (typeof nome === 'string' && /^[\w./:@+-]{1,180}$/.test(nome) && !/sk-|nvapi-|AIza/.test(nome)) modeloRespondido = nome
      let input: unknown
      let output: unknown
      if (protocolo === 'anthropic') {
        const uso = { ...registro(registro(dados.message).usage), ...registro(dados.usage) }
        input = uso.input_tokens
        output = uso.output_tokens
        if (tokensValidos(uso.cache_creation_input_tokens)) cacheCriado = uso.cache_creation_input_tokens
        if (tokensValidos(uso.cache_read_input_tokens)) cacheLido = uso.cache_read_input_tokens
      } else if (protocolo === 'gemini') {
        const uso = registro(dados.usageMetadata)
        input = uso.promptTokenCount
        output = uso.candidatesTokenCount
        if (tokensValidos(uso.thoughtsTokenCount)) raciocinio = uso.thoughtsTokenCount
      } else if (protocolo === 'ollama') {
        input = dados.prompt_eval_count
        output = dados.eval_count
      } else {
        const uso = registro(dados.usage)
        input = uso.prompt_tokens
        output = uso.completion_tokens
      }
      if (tokensValidos(input)) entrada = input
      if (tokensValidos(output)) saida = output
    },
    resultado(): Contagens {
      const total = entrada === undefined ? undefined : entrada + cacheCriado + cacheLido
      const totalSaida = saida === undefined ? undefined : saida + raciocinio
      return {
        ...(modeloRespondido ? { modeloRespondido } : {}),
        ...(tokensValidos(total) ? { entrada: total } : {}),
        ...(tokensValidos(totalSaida) ? { saida: totalSaida } : {}),
      }
    },
  }
}

export function metadadosDaChamada(
  alvo: { providerId?: string; modelId?: string; limiteContexto?: number; capacidade?: CapacidadeContexto },
  reserva: unknown,
): Omit<MedicaoContexto, 'iteracao' | 'entrada' | 'saida'> | undefined {
  if (!alvo.providerId || !alvo.modelId) return
  return {
    requestId: globalThis.crypto.randomUUID(),
    providerId: alvo.providerId,
    modelId: alvo.modelId,
    ...(alvo.capacidade ? { capacidade: alvo.capacidade } : {}),
    ...(tokensValidos(alvo.limiteContexto) && alvo.limiteContexto > 0
      ? { janela: { tokens: alvo.limiteContexto, origem: (() => {
        const origem = alvo.capacidade?.fontes.find((f) => f.limites.total === alvo.limiteContexto)?.origem
        return origem === 'manual' || !origem ? 'configuracao' as const : origem
      })() } }
      : {}),
    ...(tokensValidos(reserva) && reserva > 0 ? { reservaSaida: reserva } : {}),
  }
}

export function opcaoUsoOpenAI(baseUrl: string): { stream_options?: { include_usage: true } } {
  return /^https?:\/\//i.test(baseUrl) ? { stream_options: { include_usage: true } } : {}
}

/** Faixa heurística, sem tokenizador/modelo conhecido; o teto guia o orçamento. */
export function estimarEntrada(payload: unknown): { minimo: number; maximo: number; metodo: 'bytes-utf8' } {
  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length
  return { minimo: Math.ceil(bytes / 6), maximo: bytes + 128, metodo: 'bytes-utf8' }
}

export function completarMedicao(
  chamada: Omit<MedicaoContexto, 'iteracao'>, payload: unknown, contagens: Contagens, fase: 'enviado' | 'respondido',
): Omit<MedicaoContexto, 'iteracao'> {
  if (tokensValidos(contagens.entrada)) return { ...chamada, ...contagens, origemEntrada: 'provedor', fase }
  const estimativa = estimarEntrada(payload)
  return { ...chamada, ...contagens, entrada: estimativa.maximo, origemEntrada: 'estimativa', estimativa, fase }
}

/** Somente recusa explícita do parâmetro; nunca retry de erro genérico. */
export function recusouOpcaoUso(status: number, detalhe: string): boolean {
  return (status === 400 || status === 422) && /stream_options|include_usage/iu.test(detalhe) &&
    /unsupported|unknown|unrecognized|not supported|not permitted|unexpected|extra inputs/iu.test(detalhe)
}

export function removerOpcaoRecusada(corpo: Record<string, unknown>, status: number, detalhe: string): boolean {
  if (corpo.stream_options && recusouOpcaoUso(status, detalhe)) { delete corpo.stream_options; return true }
  if ((status === 400 || status === 422) && /reasoning_effort|thinkingConfig|thinkingBudget/iu.test(detalhe) &&
      /unsupported|unknown|unrecognized|not supported|not permitted|unexpected|extra inputs|invalid/iu.test(detalhe)) {
    if (corpo.reasoning_effort) { delete corpo.reasoning_effort; return true }
    const config = corpo.generationConfig as { thinkingConfig?: unknown } | undefined
    if (config?.thinkingConfig) { delete config.thinkingConfig; return true }
  }
  return false
}

export function ocupacaoContexto(medicao: MedicaoContexto) {
  const tetos = [medicao.janela?.tokens, medicao.capacidade?.limites.total, medicao.capacidade?.limites.entrada].filter((n): n is number => tokensValidos(n) && n > 0)
  if (!tokensValidos(medicao.entrada) || !tetos.length) return
  const razao = medicao.entrada / Math.min(...tetos)
  return { percentual: Math.floor(razao * 100), alerta: razao >= 0.9 ? 'critico' : razao >= 0.75 ? 'alto' : null }
}
