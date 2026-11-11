// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { gerarResumo } from '../compactacao'
import type { AlvoConversa, IniciarChamadaModelo } from '../../../bairros/2-inteligencia/casas/conversa'

afterEach(() => vi.unstubAllGlobals())

function alvo(protocolo: AlvoConversa['protocolo']): AlvoConversa {
  return { protocolo, providerId: 'fixture', modelId: 'm', modelo: 'm', apiKey: null, baseUrl: 'https://fixture.invalid', maxSaida: 1024 }
}
function iniciar(a: AlvoConversa): IniciarChamadaModelo {
  return (_p, _m, chamar) => chamar({ providerId: 'fixture', modelId: 'm', protocolo: a.protocolo, apiKey: null, baseUrl: a.baseUrl, maxSaida: 1024 })
}

describe('compactação — transporte real com respostas controladas', () => {
  it('não aceita EOF parcial nem credencial reconhecível como checkpoint', async () => {
    const a = alvo('openai-chat')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('data: {"choices":[{"delta":{"content":"Resumo pela metade"}}]}\n\n')))
    await expect(gerarResumo(a, [], undefined, iniciar(a), new AbortController().signal)).rejects.toThrow(/sem confirmação/)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('data: {"choices":[{"delta":{"content":"senha=CANARIO_PRIVADO"},"finish_reason":"stop"}]}\n\n')))
    await expect(gerarResumo(a, [], undefined, iniciar(a), new AbortController().signal)).rejects.toThrow(/resumo utilizável/)
  })
  it('recua uma vez por opção explicitamente recusada, sem retry genérico de geração', async () => {
    const a = alvo('openai-chat'), corpos: Array<Record<string, unknown>> = []
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      corpos.push(JSON.parse(String(init.body)))
      if (corpos.length === 1) return new Response('Unsupported reasoning_effort', { status: 400 })
      if (corpos.length === 2) return new Response('Unsupported stream_options', { status: 400 })
      return new Response('data: {"choices":[{"delta":{"content":"Resumo completo."},"finish_reason":"stop"}]}\n\n')
    }))
    await expect(gerarResumo(a, [{ papel: 'usuario', conteudo: 'Decisão sintética.' }], undefined, iniciar(a), new AbortController().signal)).resolves.toBe('Resumo completo.')
    expect(corpos).toHaveLength(3)
    expect(corpos[0]).toHaveProperty('reasoning_effort', 'none')
    expect(corpos[1]).not.toHaveProperty('reasoning_effort')
    expect(corpos[1]).toHaveProperty('stream_options')
    expect(corpos[2]).not.toHaveProperty('stream_options')
  })
  it.each([
    ['openai-chat', 'data: {"choices":[{"delta":{"content":"Resumo parcial"},"finish_reason":"content_filter"}]}\n\ndata: [DONE]\n\n'],
    ['anthropic', 'data: {"delta":{"text":"Resumo parcial","stop_reason":"refusal"}}\n\ndata: {"type":"message_stop"}\n\n'],
    ['gemini', 'data: {"candidates":[{"content":{"parts":[{"text":"Resumo parcial"}]},"finishReason":"SAFETY"}]}\n\n'],
    ['ollama', '{"message":{"content":"Resumo parcial"},"done":true,"done_reason":"abort"}\n'],
    ['openai-chat', 'data: {"choices":[{"delta":{"content":"Resumo parcial"},"finish_reason":"length"}]}\n\n'],
    ['anthropic', 'data: {"delta":{"text":"Resumo parcial"}}\n\ndata: {"delta":{"stop_reason":"max_tokens"}}\n\n'],
    ['gemini', 'data: {"candidates":[{"content":{"parts":[{"text":"Resumo parcial"}]},"finishReason":"MAX_TOKENS"}]}\n\n'],
    ['ollama', '{"message":{"content":"Resumo parcial"},"done":true,"done_reason":"length"}\n'],
  ] as const)('rejeita resumo truncado pelo protocolo %s', async (protocolo, resposta) => {
    const a = alvo(protocolo)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(resposta)))
    await expect(gerarResumo(a, [{ papel: 'usuario', conteudo: 'Uma decisão que não pode sumir.' }], undefined,
      iniciar(a), new AbortController().signal)).rejects.toThrow(/incompleto/)
  })

  it('divide fonte grande em lotes limitados, carrega resumo anterior e limita saída', async () => {
    const a = alvo('openai-chat'), pedidos: Array<{ messages: Array<{ content: string }>; max_tokens: number }> = []
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      pedidos.push(JSON.parse(String(init.body)))
      return new Response('data: {"choices":[{"delta":{"content":"Resumo acumulado sem perdas declaradas."},"finish_reason":"stop"}]}\n\n')
    }))
    const resultado = await gerarResumo(a, [{ papel: 'usuario', conteudo: 'PRIMEIRO_MARCADOR ' + 'dado '.repeat(8000) + ' ULTIMO_MARCADOR' }],
      'DECISAO_ANTERIOR', iniciar(a), new AbortController().signal)
    expect(resultado).toContain('Resumo acumulado')
    expect(pedidos.length).toBeGreaterThan(1)
    expect(pedidos.length).toBeLessThanOrEqual(8)
    expect(pedidos.every((p) => p.max_tokens > 0 && p.max_tokens <= 1024)).toBe(true)
    const dados = pedidos.map((p) => p.messages[0].content).join('')
    expect(dados).toContain('PRIMEIRO_MARCADOR')
    expect(dados).toContain('ULTIMO_MARCADOR')
    expect(dados).toContain('DECISAO_ANTERIOR')
  })
})
