import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { obterAlvoDeConversa } from '../chatAlvo'
import { salvarArquivo } from '../../../bairros/2-inteligencia/casas/provedores/server/providersRepo'

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
  it('recupera a janela confirmada do disco somente para o modelo vinculado', async () => {
    await configurarFixture()
    const selecao = { tipo: 'auto' } as const
    const padrao = { baseUrl: 'https://fixture.invalid/v1', modelo: 'gpt-5', modelosHabilitados: ['gpt-5', 'gpt-5-mini'], apiKey: 'fixture', contexto: 1000 }
    await salvarArquivo({ ativo: 'openai', provedores: { openai: padrao } })
    expect((await obterAlvoDeConversa(selecao)).alvo?.limiteContexto).toBeUndefined()
    await salvarArquivo({ ativo: 'openai', provedores: { openai: { ...padrao, contextoModelo: ' gpt-5 ' } } })
    expect((await obterAlvoDeConversa(selecao)).alvo?.limiteContexto).toBe(1000)
    expect((await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'openai', modelId: 'gpt-5-mini' })).alvo?.limiteContexto).toBeUndefined()
    await salvarArquivo({ ativo: 'openai', provedores: { openai: { ...padrao, modelo: 'gpt-5-mini', contextoModelo: 'gpt-5' } } })
    expect((await obterAlvoDeConversa(selecao)).alvo?.limiteContexto).toBeUndefined()
  })

  it('Auto fixa o provedor/modelo padrão atual e explicita respeita o par exato', async () => {
    await configurarFixture()

    const automatico = await obterAlvoDeConversa({ tipo: 'auto' })
    expect(automatico.alvo).toMatchObject({
      providerId: 'openai',
      modelId: 'gpt-5',
      modelo: 'gpt-5',
    })

    const explicito = await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'anthropic', modelId: 'claude-fixture' })
    expect(explicito.alvo).toMatchObject({ providerId: 'anthropic', modelId: 'claude-fixture', modelo: 'claude-fixture' })
  })

  it('resolve modelo sem qualquer avaliação e não acrescenta bloqueio ao alvo', async () => {
    await configurarFixture()
    const resultado = await obterAlvoDeConversa({ tipo: 'explicita', providerId: 'openai', modelId: 'gpt-5-mini' })
    expect(resultado.alvo).toMatchObject({ providerId: 'openai', modelId: 'gpt-5-mini', modelo: 'gpt-5-mini' })
    expect(resultado.alvo).not.toHaveProperty('toolCallingCapability')
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
