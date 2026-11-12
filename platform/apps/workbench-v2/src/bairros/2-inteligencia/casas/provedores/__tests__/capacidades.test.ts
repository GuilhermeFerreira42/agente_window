// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { descobrirCapacidade, invalidarCapacidades } from '../server/capacidades'
import { orcamentoContexto, saidaEfetiva } from '../../../../../domain/capacidadeContexto'
import type { Protocolo, ProvedorConfig } from '../contract'

const config = (protocolo: Protocolo = 'openai-chat', modelId = 'alias') => ({ providerId: 'fixture', modelId, protocolo, baseUrl: 'http://fixture.invalid/v1', apiKey: 'SEGREDO_FIXTURE' })
const salvo: ProvedorConfig = { baseUrl: 'http://fixture.invalid/v1', modelo: 'alias', modoContexto: 'auto' }
beforeEach(() => { invalidarCapacidades() })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
const json = (dados: unknown) => new Response(JSON.stringify(dados))

describe('DEBT-25 — descoberta e orçamento por contrato', () => {
  it('usa saída automática limitada e recupera reserva manual incompatível sem ampliar a janela', () => {
    const cap = { limites: { total: 128000 } }
    expect(saidaEfetiva(204800, cap, 'auto')).toBe(4096)
    expect(saidaEfetiva(204800, cap, 'manual')).toBe(4096)
    expect(saidaEfetiva(8192, cap, 'manual')).toBe(8192)
    expect(saidaEfetiva(204800, { limites: { total: 128000, saida: 512 } }, 'manual')).toBe(512)
    expect(saidaEfetiva(204800, { limites: { total: 2048 } }, 'auto')).toBe(512)
    expect(saidaEfetiva(204800, undefined, 'auto')).toBe(4096)
    expect(cap.limites.total).toBe(128000)
  })
  it.each([32768, 131072, 1_000_000])('descobre janela %s anunciada pelo endpoint sem geração', async total => {
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      expect(init.body).toBeUndefined(); expect(init.redirect).toBe('error')
      return url.endsWith('/model/info') ? json({}) : json({ data: [{ id: 'alias', context_window: total, max_output_tokens: 4096 }] })
    }); vi.stubGlobal('fetch', fetcher)
    const cap = await descobrirCapacidade(config(), salvo)
    expect(cap.limites).toEqual({ total, saida: 4096 })
    expect(orcamentoContexto(cap, 4096)?.preventivo).toBe(Math.floor((total - 4096) * 0.75))
    expect(JSON.stringify(cap)).not.toContain('SEGREDO_FIXTURE')
    expect(fetcher.mock.calls.every(([url]) => !url.includes('completions'))).toBe(true)
  })
  it('Gemini distingue entrada e saída sem subtrair a reserva da entrada', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ name: 'models/custom', inputTokenLimit: 131072, outputTokenLimit: 8192 })))
    const cap = await descobrirCapacidade(config('gemini', 'custom'), salvo)
    expect(cap.limites).toEqual({ entrada: 131072, saida: 8192 })
    expect(orcamentoContexto(cap, 8192)).toEqual({ entrada: 131072, preventivo: 98304 })
  })
  it('Anthropic consulta metadados com cabeçalhos nativos e limites distintos', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, init: RequestInit) => {
      expect(init.headers).toMatchObject({ 'x-api-key': 'SEGREDO_FIXTURE', 'anthropic-version': '2023-06-01' })
      expect(init.headers).not.toHaveProperty('Authorization')
      return json({ id: 'modelo-real', max_input_tokens: 200000, max_tokens: 64000 })
    }))
    const cap = await descobrirCapacidade(config('anthropic'), salvo)
    expect(cap.limites).toEqual({ entrada: 200000, saida: 64000 })
  })
  it('catálogo vencido não continua apresentando capacidade nominal como vigente', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2027-03-01T00:00:00Z'))
    expect((await descobrirCapacidade({ ...config(), baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4.1' }, salvo)).estado).toBe('desconhecida')
  })
  it('pool LiteLLM usa mínimo por dimensão, sem consultar agregado máximo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [32768,131072].map((n, i) => ({ model_name: 'alias', litellm_params: { model: `openai/backend${i}` }, model_info: { max_input_tokens: n, max_output_tokens: 8192 } })) })))
    const cap = await descobrirCapacidade(config(), salvo)
    expect(cap.identidade.estado).toBe('pool'); expect(cap.limites.entrada).toBe(32768)
    expect(orcamentoContexto(cap, 8192)?.preventivo).toBe(24576)
  })
  it('membro desconhecido impede inventar entrada comum ao pool', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [{ model_name: 'alias', model_info: { max_input_tokens: 1_000_000 } }, { model_name: 'alias', model_info: {} }] })))
    const cap = await descobrirCapacidade(config(), salvo)
    expect(cap.limites).toEqual({}); expect(cap.avisos).toContain('pool-incompleto')
  })
  it('preserva restrição assimétrica de um deployment além do catálogo comum', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [
      { model_name: 'alias', litellm_params: { model: 'openai/gpt-4o', api_base: 'https://api.openai.com/v1' }, model_info: { max_input_tokens: 32768 } },
      { model_name: 'alias', litellm_params: { model: 'openai/gpt-4o', api_base: 'https://api.openai.com/v1' }, model_info: {} },
    ] })))
    const cap = await descobrirCapacidade(config(), salvo)
    expect(cap.limites).toMatchObject({ total: 128000, entrada: 32768 })
    expect(orcamentoContexto(cap, 4096)?.preventivo).toBe(24576)
  })
  it.each(['nvidia/nemotron-3.5-lightning-30b-a3b', 'nvidia/nemotron-3-ultra-550b-a55b'])('resolve catálogo do backend %s anunciado, nunca pelo alias comercial', async (modelo) => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [{ model_name: 'alias', litellm_params: {
      model: `openai/${modelo}`, api_base: 'https://integrate.api.nvidia.com/v1', api_key: 'SEGREDO_BACKEND',
    }, model_info: {} }] })))
    const cap = await descobrirCapacidade(config(), salvo)
    expect(cap.limites.total).toBe(1_000_000)
    expect(cap.fontes[0].origem).toBe('catalogo')
    expect(JSON.stringify(cap)).not.toContain('SEGREDO_BACKEND')
  })
  it('Ollama usa alocação carregada menor que arquitetura', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/api/show') ? json({ model_info: { 'llama.context_length': 131072 } }) : json({ models: [{ name: 'alias:latest', context_length: 32768 }] })))
    const cap = await descobrirCapacidade(config('ollama'), salvo)
    expect(cap.limites.total).toBe(32768)
  })
  it('Ollama não confunde arquitetura com contexto alocado desconhecido', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ model_info: { 'llama.context_length': 131072 } })))
    expect((await descobrirCapacidade(config('ollama'), salvo)).estado).toBe('desconhecida')
  })
  it('Ollama restringe ps maior pelo num_ctx menor do modelo', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/api/show') ? json({ parameters: 'num_ctx 4096', model_info: { 'llama.context_length': 131072 } }) : json({ models: [{ name: 'alias', context_length: 131072 }] })))
    expect((await descobrirCapacidade(config('ollama'), salvo)).limites.total).toBe(4096)
  })
  it('manual Ollama sem runtime conhecido não amplia o teto arquitetural', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ model_info: { 'llama.context_length': 32768 } })))
    const cap = await descobrirCapacidade(config('ollama'), { ...salvo, modoContexto: 'manual', contextoModelo: 'alias', contexto: 131072 })
    expect(cap.limites.total).toBe(32768)
  })
  it('não usa agregado LiteLLM quando o mapa dos deployments está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [{ id: 'alias', owned_by: 'litellm', max_input_tokens: 1_000_000 }] })))
    expect((await descobrirCapacidade(config(), salvo)).estado).toBe('desconhecida')
  })
  it('catálogo exato oficial é alternativa nominal, sem associação por substring', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const oficial = { ...config(), baseUrl: 'https://api.openai.com/v1', modelId: 'gpt-4.1' }
    expect((await descobrirCapacidade(oficial, salvo)).limites.total).toBe(1047576)
    expect((await descobrirCapacidade({ ...oficial, modelId: 'meu-gpt-4.1' }, salvo)).estado).toBe('desconhecida')
    expect((await descobrirCapacidade({ ...oficial, baseUrl: 'https://custom.invalid/v1' }, salvo)).estado).toBe('desconhecida')
  })
  it('manual declarado reduz teto, não o amplia nem muda cadastro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [{ id: 'alias', context_window: 32768 }] })))
    const manual = { ...salvo, modoContexto: 'manual' as const, contexto: 131072, contextoModelo: 'alias' }
    expect((await descobrirCapacidade(config(), manual)).limites.total).toBe(32768)
    manual.contexto = 16000
    expect((await descobrirCapacidade(config(), manual)).limites.total).toBe(16000)
    expect(manual.contexto).toBe(16000)
    expect((await descobrirCapacidade({ ...config(), modelId: 'outro' }, manual)).estado).toBe('desconhecida')
  })
  it('cache deduplica e invalida por endpoint, credencial, configuração e atualização', async () => {
    let limite = 32768
    const fetcher = vi.fn(async () => json({ data: [{ id: 'alias', context_window: limite }] })); vi.stubGlobal('fetch', fetcher)
    await Promise.all([descobrirCapacidade(config(), salvo), descobrirCapacidade(config(), salvo)])
    expect(fetcher).toHaveBeenCalledTimes(2)
    limite = 131072
    expect((await descobrirCapacidade(config(), salvo)).limites.total).toBe(32768)
    expect((await descobrirCapacidade(config(), salvo, true)).limites.total).toBe(131072)
    await descobrirCapacidade({ ...config(), apiKey: 'OUTRA' }, salvo)
    await descobrirCapacidade({ ...config(), baseUrl: 'http://outro.invalid/v1' }, salvo)
    expect(fetcher).toHaveBeenCalledTimes(8)
  })
  it('falha/malformação e números impossíveis retornam desconhecido sem expor payload', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('SEGREDO_DA_RECUSA', { status: 403 })))
    const cap = await descobrirCapacidade(config(), salvo)
    expect(cap.estado).toBe('desconhecida'); expect(JSON.stringify(cap)).not.toContain('SEGREDO_DA_RECUSA')
    vi.stubGlobal('fetch', vi.fn(async () => json({ data: [{ id: 'alias', context_window: Number.MAX_SAFE_INTEGER, max_input_tokens: -1 }] })))
    expect((await descobrirCapacidade(config(), salvo, true)).limites).toEqual({})
  })
  it('reserva superior ao total dá orçamento zero, não piso fictício', () => {
    expect(orcamentoContexto(undefined, 4096, 1024)).toEqual({ entrada: 0, preventivo: 0 })
  })
})
