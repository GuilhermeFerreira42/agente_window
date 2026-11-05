// ============================================================================
// Casa Conversa — montagem do pedido por protocolo (FATIA 09, conquista 1).
// Um protocolo = um jeito de falar (os MESMOS 4 da sonda da FATIA 08):
//   openai-chat · anthropic · gemini · ollama
// A chave vai SEMPRE por cabeçalho — nunca na URL, nunca no corpo.
// Conquista 2: TODOS os pedidos já pedem streaming (fio aos pedaços).
// ============================================================================
import type { AlvoConversa, MensagemChat } from '../contract'

export interface PedidoHttp {
  url: string
  init: RequestInit
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

  if (alvo.protocolo === 'openai-chat') {
    return {
      url: `${baseUrl}/chat/completions`,
      init: {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({ model: alvo.modelo, messages, stream: true, ...temperatura }),
      },
    }
  }

  if (alvo.protocolo === 'anthropic') {
    return {
      url: `${baseUrl}/messages`,
      init: {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({
          model: alvo.modelo,
          max_tokens: alvo.maxSaida && alvo.maxSaida > 0 ? alvo.maxSaida : 8192,
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
      init: {
        method: 'POST',
        headers: cabecalhos,
        body: JSON.stringify({ contents: conteudoGemini(messages), generationConfig: temperatura }),
      },
    }
  }

  // ollama (API nativa): sem chave; NDJSON de resposta — aqui ainda sem stream.
  return {
    url: `${baseUrl}/api/chat`,
    init: {
      method: 'POST',
      headers: cabecalhos,
      body: JSON.stringify({ model: alvo.modelo, messages, stream: true, ...(alvo.temperatura !== undefined ? { options: temperatura } : {}) }),
    },
  }
}
