import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { salvarArquivo } from '../../provedores/server/providersRepo'
import { ToolCallingVerificationError, verificarToolCalling } from '../server/toolCallingCapability'

describe('F5-B · verificação de tool calling', () => {
  let pasta: string
  let caminho: string
  let fetchStub: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    pasta = await mkdtemp(join(tmpdir(), 'agir-tool-calling-'))
    caminho = join(pasta, 'providers.json')
    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: {
          baseUrl: 'https://mock.invalid/v1',
          modelo: 'fixture-tool-model',
          modelosHabilitados: ['fixture-tool-model'],
          habilitado: true,
          apiKey: 'test-only-not-a-real-credential',
        },
      },
    }, caminho)
    fetchStub = vi.fn(async () => new Response('test guard: unexpected fetch', { status: 599 }))
    vi.stubGlobal('fetch', fetchStub)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    await rm(pasta, { recursive: true, force: true })
  })

  function respostaSse(payloads: unknown[], status = 200): Response {
    const texto = `${payloads.map((payload) => `data: ${JSON.stringify(payload)}\n\n`).join('')}data: [DONE]\n\n`
    return new Response(texto, { status, headers: { 'content-type': 'text/event-stream' } })
  }

  it('verifica round-trip com apenas ler e persiste; repetição não faz novas chamadas', async () => {
    const corpos: Array<Record<string, unknown>> = []
    fetchStub.mockImplementation(async (_url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body)) as Record<string, unknown>
      corpos.push(corpo)
      const mensagens = corpo.messages as Array<{ role: string; content?: string }>
      const tools = corpo.tools as Array<{ function?: { name?: string } }>
      expect(tools.map((tool) => tool.function?.name)).toEqual(['ler'])
      if (corpos.length === 1) {
        const pedidoCanary = mensagens[0]?.content ?? ''
        const caminhoCanary = pedidoCanary.match(/caminho igual a "([^"]+)"/)?.[1]
        expect(caminhoCanary).toMatch(/^probe-[a-f0-9]{32}$/)
        return respostaSse([{
          choices: [{ delta: { tool_calls: [{ index: 0, id: 'call-fixture', type: 'function', function: { name: 'ler', arguments: JSON.stringify({ caminho: caminhoCanary }) } }] } }],
        }])
      }
      const resultado = mensagens.find((mensagem) => mensagem.role === 'tool')?.content ?? ''
      expect(resultado).toMatch(/^CANARY-READ-ONLY:[a-f0-9]{32}$/)
      return respostaSse([{ choices: [{ delta: { content: resultado } }] }])
    })

    const primeiro = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(primeiro).toMatchObject({ status: 'verified', reason: 'roundtrip_verified', cached: false })
    expect(fetchStub).toHaveBeenCalledTimes(2)

    const repetido = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(repetido).toMatchObject({ status: 'verified', reason: 'roundtrip_verified', cached: true })
    expect(fetchStub).toHaveBeenCalledTimes(2)
    expect(corpos).toHaveLength(2)
  })

  it('exige opt-in e par exato; não inicia fetch quando falta consentimento ou habilitação', async () => {
    await expect(verificarToolCalling('openai', 'fixture-tool-model', false, caminho))
      .rejects.toBeInstanceOf(ToolCallingVerificationError)
    await expect(verificarToolCalling('openai', 'not-enabled', true, caminho))
      .rejects.toBeInstanceOf(ToolCallingVerificationError)
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('falha de autenticação permanece unknown, nunca incompatible', async () => {
    fetchStub.mockImplementation(async () => new Response(JSON.stringify({ error: 'invalid test key' }), { status: 401 }))
    const resultado = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(resultado).toMatchObject({ status: 'unknown', reason: 'authentication_failure' })
    expect(fetchStub).toHaveBeenCalledTimes(1)
  })

  it('falha de rede transitória permanece unknown', async () => {
    fetchStub.mockRejectedValue(new Error('temporary network outage'))
    const resultado = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(resultado).toMatchObject({ status: 'unknown', reason: 'network_failure' })
  })

  it('só classifica incompatibilidade quando o erro 400/422 declara isso explicitamente', async () => {
    fetchStub.mockImplementation(async () => new Response(JSON.stringify({ error: { message: 'This model does not support tool calling' } }), { status: 400 }))
    const semFerramentas = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(semFerramentas).toMatchObject({ status: 'incompatible', reason: 'explicit_tools_unsupported' })

    fetchStub.mockImplementation(async () => new Response(JSON.stringify({ error: { message: 'reasoning_content must be passed back with assistant tool calls' } }), { status: 400 }))
    const campoAusenteNoAdaptador = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(campoAusenteNoAdaptador).toMatchObject({ status: 'incompatible', reason: 'adapter_missing_field' })

    fetchStub.mockImplementation(async () => new Response(JSON.stringify({ error: { message: 'tool_choice is not supported for this model' } }), { status: 400 }))
    const parametroDoAdaptador = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(parametroDoAdaptador).toMatchObject({ status: 'incompatible', reason: 'adapter_parameter_unsupported' })

    fetchStub.mockImplementation(async () => new Response(JSON.stringify({ error: { message: 'invalid request payload' } }), { status: 400 }))
    const erroGenerico = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(erroGenerico).toMatchObject({ status: 'unknown', reason: 'provider_error' })
  })

  it('resposta sem chamada ou sem replay correto não libera Agir', async () => {
    fetchStub.mockImplementation(async () => respostaSse([{ choices: [{ delta: { content: 'I can help.' } }] }]))
    const semChamada = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(semChamada).toMatchObject({ status: 'unknown', reason: 'no_tool_call' })

    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: {
          baseUrl: 'https://mock.invalid/v1',
          modelo: 'fixture-tool-model',
          modelosHabilitados: ['fixture-tool-model'],
          habilitado: true,
          apiKey: 'test-only-not-a-real-credential',
          temperatura: 0.4,
        },
      },
    }, caminho)
    fetchStub.mockClear()
    fetchStub.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body)) as { messages: Array<{ content?: string }> }
      const texto = corpo.messages[0]?.content ?? ''
      const caminhoCanary = texto.match(/caminho igual a "([^"]+)"/)?.[1]
      return respostaSse([{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call-fixture', function: { name: 'ler', arguments: JSON.stringify({ caminho: caminhoCanary }) } }] } }] }])
    })
    fetchStub.mockImplementationOnce(async () => respostaSse([{ choices: [{ delta: { content: 'texto sem o marcador' } }] }]))
    const roundTripIncompleto = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(roundTripIncompleto).toMatchObject({ status: 'unknown', reason: 'continuation_failed' })
  })

  it('mudança de configuração invalida a evidência armazenada', async () => {
    fetchStub.mockImplementation(async (_url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body)) as Record<string, unknown>
      const mensagens = corpo.messages as Array<{ role: string; content?: string }>
      if (fetchStub.mock.calls.length === 1) {
        const caminhoCanary = (mensagens[0]?.content ?? '').match(/caminho igual a "([^"]+)"/)?.[1]
        return respostaSse([{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call-fixture', function: { name: 'ler', arguments: JSON.stringify({ caminho: caminhoCanary }) } }] } }] }])
      }
      const resultado = mensagens.find((mensagem) => mensagem.role === 'tool')?.content ?? ''
      return respostaSse([{ choices: [{ delta: { content: resultado } }] }])
    })
    expect((await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)).status).toBe('verified')
    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: {
          baseUrl: 'https://mock.invalid/changed',
          modelo: 'fixture-tool-model',
          modelosHabilitados: ['fixture-tool-model'],
          habilitado: true,
          apiKey: 'test-only-not-a-real-credential',
        },
      },
    }, caminho)
    fetchStub.mockClear()
    const novoEndpoint = await verificarToolCalling('openai', 'fixture-tool-model', true, caminho)
    expect(novoEndpoint.status).toBe('verified')
    expect(fetchStub).toHaveBeenCalledTimes(2)
  })

  it('descarta o resultado se a configuração mudar entre os dois turnos do canary', async () => {
    fetchStub.mockImplementation(async (_url: string, init: RequestInit) => {
      const corpo = JSON.parse(String(init.body)) as { messages: Array<{ content?: string }> }
      const prompt = corpo.messages[0]?.content ?? ''
      const caminhoCanary = prompt.match(/caminho igual a "([^"]+)"/)?.[1]
      await salvarArquivo({
        ativo: 'openai',
        provedores: {
          openai: {
            baseUrl: 'https://mock.invalid/changed-mid-probe',
            modelo: 'fixture-tool-model',
            modelosHabilitados: ['fixture-tool-model'],
            habilitado: true,
            apiKey: 'test-only-not-a-real-credential',
          },
        },
      }, caminho)
      return respostaSse([{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call-fixture', function: { name: 'ler', arguments: JSON.stringify({ caminho: caminhoCanary }) } }] } }] }])
    })
    await expect(verificarToolCalling('openai', 'fixture-tool-model', true, caminho))
      .rejects.toMatchObject({ code: 'configuration_changed', status: 409 })
    expect(fetchStub).toHaveBeenCalledTimes(1)
    const arquivo = await import('../../provedores/server/providersRepo').then(({ lerArquivo }) => lerArquivo(caminho))
    expect(arquivo.toolCallingAssessments.openai?.['fixture-tool-model']).toBeUndefined()
  })
})
