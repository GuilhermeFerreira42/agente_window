import { describe, expect, it } from 'vitest'
import { criarLeitorDeUso, ocupacaoContexto, opcaoUsoOpenAI, estimarEntrada, completarMedicao, recusouOpcaoUso } from '../domain/usoContexto'

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

  it('solicita uso também em endpoints compatíveis, sem inferir capacidades pelo domínio', () => {
    expect(opcaoUsoOpenAI('https://api.openai.com/v1')).toEqual({ stream_options: { include_usage: true } })
    expect(opcaoUsoOpenAI('https://api.openai.com.example/v1')).toEqual({ stream_options: { include_usage: true } })
    expect(opcaoUsoOpenAI('http://localhost:1234/v1')).toEqual({ stream_options: { include_usage: true } })
  })

  it('identifica estimativas, inclui dados UTF-8 e dá precedência ao uso real', () => {
    const payload = { messages: [{ content: 'CANARIO_PRIVADO_漢字'.repeat(20) }], tools: [{ description: 'schema' }] }
    const faixa = estimarEntrada(payload)
    expect(faixa.maximo).toBeGreaterThan(faixa.minimo)
    expect(faixa.maximo).toBeGreaterThan(JSON.stringify(payload).length)
    const chamada = { requestId: 'r', providerId: 'p', modelId: 'm' }
    const estimada = completarMedicao(chamada, payload, {}, 'enviado')
    expect(estimada).toMatchObject({ origemEntrada: 'estimativa', fase: 'enviado', estimativa: faixa })
    expect(JSON.stringify(estimada)).not.toContain('CANARIO_PRIVADO')
    expect(completarMedicao(chamada, payload, { entrada: 15, saida: 3 }, 'respondido'))
      .toEqual({ ...chamada, entrada: 15, saida: 3, origemEntrada: 'provedor', fase: 'respondido' })
    expect(recusouOpcaoUso(400, 'Unsupported stream_options')).toBe(true)
    expect(recusouOpcaoUso(400, 'maximum context length exceeded')).toBe(false)
    expect(recusouOpcaoUso(500, 'Unsupported stream_options')).toBe(false)
  })
})
