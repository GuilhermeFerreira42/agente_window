// Casa Conversa — montagem do pedido por protocolo (conquista 1 da FATIA 09).
// Prova: endereço certo, cabeçalho certo e a chave NUNCA na URL nem no corpo.
import { describe, expect, it } from 'vitest'
import type { AlvoConversa, MensagemChat } from '../contract'
import { montarPedido } from '../server/requisicao'

const MENSAGENS: MensagemChat[] = [
  { role: 'user', content: 'Olá' },
  { role: 'assistant', content: 'Oi!' },
]

function corpoDe(pedido: { init: RequestInit }): Record<string, unknown> {
  return JSON.parse(String(pedido.init.body)) as Record<string, unknown>
}

function cabecalhosDe(pedido: { init: RequestInit }): Record<string, string> {
  return pedido.init.headers as Record<string, string>
}

describe('requisicao — um protocolo, um jeito de falar', () => {
  it('openai-chat: /chat/completions, Bearer no cabeçalho, barra final limpa', () => {
    const pedido = montarPedido(
      { protocolo: 'openai-chat', baseUrl: 'https://api.openai.com/v1/', modelo: 'gpt-4o-mini', apiKey: 'sk-123', temperatura: 0.2 },
      MENSAGENS,
    )
    expect(pedido.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(cabecalhosDe(pedido).Authorization).toBe('Bearer sk-123')
    expect(pedido.url).not.toContain('sk-123')
    const corpo = corpoDe(pedido)
    expect(corpo.model).toBe('gpt-4o-mini')
    expect(corpo.messages).toHaveLength(2)
    expect(corpo.temperature).toBe(0.2)
  })

  it('anthropic: /messages, x-api-key + versão, max_tokens obrigatório', () => {
    const pedido = montarPedido(
      { protocolo: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', modelo: 'claude-haiku-4-5', apiKey: 'ant-1', maxSaida: 4096 },
      MENSAGENS,
    )
    expect(pedido.url).toBe('https://api.anthropic.com/v1/messages')
    const cabecalhos = cabecalhosDe(pedido)
    expect(cabecalhos['x-api-key']).toBe('ant-1')
    expect(cabecalhos['anthropic-version']).toBe('2023-06-01')
    expect(pedido.url).not.toContain('ant-1')
    expect(corpoDe(pedido).max_tokens).toBe(4096)
    expect(String(pedido.init.body)).not.toContain('ant-1')
  })

  it('gemini: generateContent, chave por cabeçalho próprio, papel assistant → model', () => {
    const pedido = montarPedido(
      { protocolo: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', modelo: 'gemini-2.5-flash', apiKey: 'AIza-1' },
      MENSAGENS,
    )
    expect(pedido.url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent')
    expect(cabecalhosDe(pedido)['x-goog-api-key']).toBe('AIza-1')
    expect(pedido.url).not.toContain('AIza')
    const conteudo = corpoDe(pedido).contents as { role: string }[]
    expect(conteudo.map((item) => item.role)).toEqual(['user', 'model'])
  })

  it('ollama: API nativa /api/chat, sem chave, temperatura em options', () => {
    const pedido = montarPedido(
      { protocolo: 'ollama', baseUrl: 'http://localhost:11434', modelo: 'nemotron', apiKey: null, temperatura: 0.7 },
      MENSAGENS,
    )
    expect(pedido.url).toBe('http://localhost:11434/api/chat')
    const cabecalhos = cabecalhosDe(pedido)
    expect(cabecalhos.Authorization).toBeUndefined()
    expect(cabecalhos['x-api-key']).toBeUndefined()
    const corpo = corpoDe(pedido)
    expect(corpo.model).toBe('nemotron')
    expect((corpo.options as { temperature: number }).temperature).toBe(0.7)
  })
})
