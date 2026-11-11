// ============================================================================
// Casa Conversa — montagem do pedido por protocolo (FATIA 09, conquista 1).
// Um protocolo = um jeito de falar (os MESMOS 4 da sonda da FATIA 08):
//   openai-chat · anthropic · gemini · ollama
// A chave vai SEMPRE por cabeçalho — nunca na URL, nunca no corpo.
// Conquista 2: TODOS os pedidos já pedem streaming (fio aos pedaços).
// ============================================================================
import type { AlvoConversa, MensagemChat } from '../contract'
import { opcaoUsoOpenAI } from '../../../../../domain/usoContexto'

export interface PedidoHttp {
  url: string
  init: RequestInit
  reservaSaida?: number
}

function cabecalhosBase(apiKey: string | null, protocolo: AlvoConversa['protocolo']): Record<string, string> {
  const cabecalhos: Record<string, string> = { 'Content-Type': 'application/json' }
  if (protocolo === 'openai-chat' && apiKey) cabecalhos.Authorization = `Bearer ${apiKey}`
  if (protocolo === 'anthropic') {
    cabecalhos['anthropic-version'] = '2023-06-01'
    if (apiKey) cabecalhos['x-api-key'] = apiKey
  }
  if (protocolo === 'gemini' && apiKey) cabecalhos['x-goog-api-key'] = apiKey
  return cabecalhos
}

/** Papel do Gemini: assistant vira "model" (o resto dos protocolos é igual). */
function conteudoGemini(messages: MensagemChat[]): { role: string; parts: { text: string }[] }[] {
  return messages.map((mensagem) => ({
    role: mensagem.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: mensagem.content }],
  }))
}

export function montarPedido(alvo: AlvoConversa, messages: MensagemChat[]): PedidoHttp {
  const baseUrl = alvo.baseUrl.replace(/\/+$/, '')
  const cabecalhos = cabecalhosBase(alvo.apiKey, alvo.protocolo)
  const temperatura = typeof alvo.temperatura === 'number' ? { temperature: alvo.temperatura } : {}
  const reserva = alvo.maxSaida && alvo.maxSaida > 0 ? alvo.maxSaida : undefined

  if (alvo.protocolo === 'openai-chat') {
    return {
      url: `${baseUrl}/chat/completions`,
      reservaSaida: reserva,
      init: {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({ model: alvo.modelo, messages, stream: true, ...opcaoUsoOpenAI(baseUrl), ...(reserva ? { max_tokens: reserva } : {}), ...(alvo.esforcoResumo ? { reasoning_effort: alvo.esforcoResumo } : {}), ...temperatura }),
      },
    }
  }

  if (alvo.protocolo === 'anthropic') {
    const reservaSaida = alvo.maxSaida && alvo.maxSaida > 0 ? alvo.maxSaida : 8192
    return {
      url: `${baseUrl}/messages`,
      reservaSaida,
      init: {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({
          model: alvo.modelo,
          max_tokens: reservaSaida,
          messages,
          stream: true,
          ...temperatura,
        }),
      },
    }
  }

  if (alvo.protocolo === 'gemini') {
    return {
      url: `${baseUrl}/models/${encodeURIComponent(alvo.modelo)}:streamGenerateContent?alt=sse`,
      reservaSaida: reserva,
      init: {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({ contents: conteudoGemini(messages), generationConfig: { ...temperatura, ...(reserva ? { maxOutputTokens: reserva } : {}), ...(alvo.esforcoResumo ? { thinkingConfig: { thinkingBudget: 0 } } : {}) } }),
      },
    }
  }

  // ollama (API nativa): sem chave; NDJSON de resposta — aqui ainda sem stream.
  return {
    url: `${baseUrl}/api/chat`,
    reservaSaida: reserva,
    init: {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify({ model: alvo.modelo, messages, stream: true, options: { ...temperatura, ...(reserva ? { num_predict: reserva } : {}),
        ...(alvo.capacidade?.limites.total ? { num_ctx: alvo.capacidade.limites.total } : {}) } }),
    },
  }
}
