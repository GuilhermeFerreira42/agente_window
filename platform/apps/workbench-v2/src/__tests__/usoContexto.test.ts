import { describe, expect, it } from 'vitest'
import { criarLeitorDeUso, ocupacaoContexto, opcaoUsoOpenAI } from '../domain/usoContexto'

describe('M1 — contagens de contexto', () => {
  it('combina cache de entrada Anthropic e substitui totais cumulativos', () => {
    const leitor = criarLeitorDeUso('anthropic')
    leitor.ler({ message: { usage: { input_tokens: 10, cache_creation_input_tokens: 100, cache_read_input_tokens: 600, output_tokens: 1 } } })
    leitor.ler({ usage: { output_tokens: 15 } })
    leitor.ler({ usage: { output_tokens: -1 } })
    expect(leitor.resultado()).toEqual({ entrada: 710, saida: 15 })
  })

  it('preserva o total de prompt Gemini com cache e inclui raciocínio na saída', () => {
    const leitor = criarLeitorDeUso('gemini')
    leitor.ler({ usageMetadata: { promptTokenCount: 780, cachedContentTokenCount: 500, thoughtsTokenCount: 30 } })
    leitor.ler({ usageMetadata: { candidatesTokenCount: 25 } })
    expect(leitor.resultado()).toEqual({ entrada: 780, saida: 55 })
  })

  it('Ollama aceita zero e ignora contagens malformadas e textos longos', () => {
    const leitor = criarLeitorDeUso('ollama')
    leitor.ler({ message: { content: 'texto '.repeat(20_000) }, prompt_eval_count: '400', eval_count: 1.1 })
    expect(leitor.resultado()).toEqual({})
    leitor.ler({ done: true, prompt_eval_count: 800, eval_count: 0 })
    expect(leitor.resultado()).toEqual({ entrada: 800, saida: 0 })
    expect(criarLeitorDeUso('ollama').resultado()).toEqual({})
  })

  it.each([[749, 74, null], [750, 75, 'alto'], [899, 89, 'alto'], [900, 90, 'critico'], [1100, 110, 'critico']])(
    'classifica %s tokens no limite informado, sem usar a saída no numerador',
    (entrada, percentual, alerta) => {
      const medicao = { requestId: 'r', providerId: 'p', modelId: 'm', iteracao: 1, entrada, saida: 500 }
      expect(ocupacaoContexto(medicao)).toBeUndefined()
      expect(ocupacaoContexto({ ...medicao, janela: { tokens: 1000, origem: 'configuracao' } })).toEqual({ percentual, alerta })
    },
  )

  it('solicita quadro de uso extra somente no endpoint oficial OpenAI', () => {
    expect(opcaoUsoOpenAI('https://api.openai.com/v1')).toEqual({ stream_options: { include_usage: true } })
    expect(opcaoUsoOpenAI('https://api.openai.com.example/v1')).toEqual({})
    expect(opcaoUsoOpenAI('http://localhost:1234/v1')).toEqual({})
  })
})
