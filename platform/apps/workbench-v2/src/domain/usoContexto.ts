type Protocolo = 'openai-chat' | 'anthropic' | 'gemini' | 'ollama'

export interface MedicaoContexto {
  requestId: string
  iteracao: number
  providerId: string
  modelId: string
  entrada?: number
  saida?: number
  janela?: { tokens: number; origem: 'configuracao' }
  reservaSaida?: number
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
  return {
    ler(quadro: unknown): void {
      const dados = registro(quadro)
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
        ...(tokensValidos(total) ? { entrada: total } : {}),
        ...(tokensValidos(totalSaida) ? { saida: totalSaida } : {}),
      }
    },
  }
}

export function metadadosDaChamada(
  alvo: { providerId?: string; modelId?: string; limiteContexto?: number },
  reserva: unknown,
): Omit<MedicaoContexto, 'iteracao' | 'entrada' | 'saida'> | undefined {
  if (!alvo.providerId || !alvo.modelId) return
  return {
    requestId: globalThis.crypto.randomUUID(),
    providerId: alvo.providerId,
    modelId: alvo.modelId,
    ...(tokensValidos(alvo.limiteContexto) && alvo.limiteContexto > 0
      ? { janela: { tokens: alvo.limiteContexto, origem: 'configuracao' } }
      : {}),
    ...(tokensValidos(reserva) && reserva > 0 ? { reservaSaida: reserva } : {}),
  }
}

export function opcaoUsoOpenAI(baseUrl: string): { stream_options?: { include_usage: true } } {
  return /^https:\/\/api\.openai\.com\/v1\/?$/i.test(baseUrl) ? { stream_options: { include_usage: true } } : {}
}

export function ocupacaoContexto(medicao: MedicaoContexto) {
  if (!tokensValidos(medicao.entrada) || !medicao.janela?.tokens) return
  const razao = medicao.entrada / medicao.janela.tokens
  return { percentual: Math.floor(razao * 100), alerta: razao >= 0.9 ? 'critico' : razao >= 0.75 ? 'alto' : null }
}
