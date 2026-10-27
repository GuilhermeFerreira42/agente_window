import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { obterAlvoDeConversa } from '../chatAlvo'
import { AGIR_TOOL_ADAPTER_VERSION } from '../../../bairros/2-inteligencia/casas/agir'
import { fingerprintToolCalling, registrarToolCallingAssessment, salvarArquivo } from '../../../bairros/2-inteligencia/casas/provedores/server/providersRepo'

let pastaFixture: string | null = null

afterEach(async () => {
  delete process.env.AGENTE_WINDOW_PROVIDERS_PATH
  if (pastaFixture) await rm(pastaFixture, { recursive: true, force: true })
  pastaFixture = null
})

async function configurarFixture(): Promise<void> {
  pastaFixture = await mkdtemp(join(tmpdir(), 'chat-alvo-f5b-'))
  process.env.AGENTE_WINDOW_PROVIDERS_PATH = join(pastaFixture, 'providers.json')
  await salvarArquivo({
    ativo: 'openai',
    provedores: {
      openai: {
        baseUrl: 'https://fixture.invalid/v1',
        modelo: 'gpt-5',
        modelosHabilitados: ['gpt-5', 'gpt-5-mini'],
        apiKey: 'sk-fixture-nao-real',
      },
      anthropic: {
        baseUrl: 'https://fixture.invalid/v1',
        modelo: 'claude-fixture',
        modelosHabilitados: ['claude-fixture'],
        apiKey: 'fixture-nao-real',
      },
    },
  })
}

describe('alvo de conversa — resolução F5-B', () => {
  it('Auto fixa o provedor/modelo padrão atual e explicita respeita o par exato', async () => {
    await configurarFixture()

    const automatico = await obterAlvoDeConversa({ tipo: 'auto' })
    expect(automatico.alvo).toMatchObject({
      providerId: 'openai',
      modelId: 'gpt-5',
      modelo: 'gpt-5',
      toolCallingCapability: 'unknown',
    })

    const explicito = await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'anthropic', modelId: 'claude-fixture' })
    expect(explicito.alvo).toMatchObject({ providerId: 'anthropic', modelId: 'claude-fixture', modelo: 'claude-fixture' })
  })

  it('só libera capability para a prova válida do mesmo par e configuração atual', async () => {
    await configurarFixture()
    const caminho = process.env.AGENTE_WINDOW_PROVIDERS_PATH!
    const fingerprint = fingerprintToolCalling({
      providerId: 'openai',
      modelId: 'gpt-5',
      baseUrl: 'https://fixture.invalid/v1',
      protocol: 'openai-chat',
      adapterVersion: AGIR_TOOL_ADAPTER_VERSION,
      apiKey: 'sk-fixture-nao-real',
    })
    await registrarToolCallingAssessment('openai', 'gpt-5', {
      status: 'verified',
      fingerprint,
      adapterVersion: AGIR_TOOL_ADAPTER_VERSION,
      checkedAt: '2026-10-27T12:00:00.000Z',
      reason: 'roundtrip_verified',
    }, caminho)

    expect((await obterAlvoDeConversa({ tipo: 'auto' })).alvo?.toolCallingCapability).toBe('verified')
    expect((await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'openai', modelId: 'gpt-5-mini' })).alvo?.toolCallingCapability).toBe('unknown')

    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: {
          baseUrl: 'https://fixture.invalid/v1',
          modelo: 'gpt-5',
          modelosHabilitados: ['gpt-5', 'gpt-5-mini'],
          apiKey: 'another-fake-fixture-key',
        },
        anthropic: {
          baseUrl: 'https://fixture.invalid/v1',
          modelo: 'claude-fixture',
          modelosHabilitados: ['claude-fixture'],
          apiKey: 'fixture-nao-real',
        },
      },
    }, caminho)
    expect((await obterAlvoDeConversa({ tipo: 'auto' })).alvo?.toolCallingCapability).toBe('unknown')
  })

  it('par explícito removido/desabilitado falha sem fallback para Auto', async () => {
    await configurarFixture()
    const caminho = process.env.AGENTE_WINDOW_PROVIDERS_PATH!
    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: { baseUrl: 'https://fixture.invalid/v1', modelo: 'gpt-5', modelosHabilitados: ['gpt-5'], apiKey: 'sk-fixture-nao-real' },
        anthropic: { baseUrl: 'https://fixture.invalid/v1', modelo: 'claude-fixture', modelosHabilitados: [], apiKey: 'fixture-nao-real' },
      },
    }, caminho)

    const resultado = await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'anthropic', modelId: 'claude-fixture' })
    expect(resultado.alvo).toBeNull()
    expect(resultado.erro).toMatchObject({ code: 'model_disabled' })
  })

  it('provedor desabilitado torna indisponível a seleção explícita sem trocar o par', async () => {
    await configurarFixture()
    const caminho = process.env.AGENTE_WINDOW_PROVIDERS_PATH!
    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: { baseUrl: 'https://fixture.invalid/v1', modelo: 'gpt-5', modelosHabilitados: ['gpt-5'], apiKey: 'sk-fixture-nao-real' },
        anthropic: { baseUrl: 'https://fixture.invalid/v1', modelo: 'claude-fixture', modelosHabilitados: ['claude-fixture'], habilitado: false, apiKey: 'fixture-nao-real' },
      },
    }, caminho)

    const resultado = await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'anthropic', modelId: 'claude-fixture' })
    expect(resultado.alvo).toBeNull()
    expect(resultado.erro).toMatchObject({ code: 'selection_unavailable' })
  })
})
