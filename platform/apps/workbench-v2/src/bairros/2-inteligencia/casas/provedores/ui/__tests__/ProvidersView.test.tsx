// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EstadoProvedores } from '../../contract'

const mocks = vi.hoisted(() => ({
  carregarEstado: vi.fn(),
  buscarModelos: vi.fn(),
  revelarChave: vi.fn(),
  salvar: vi.fn(),
  testar: vi.fn(),
}))

vi.mock('../client/api', () => mocks)
import { ProvidersView } from '../ProvidersView'

const estadoFixture: EstadoProvedores = {
  storage: 'fixture',
  ativo: 'openai',
  provedores: [{
    id: 'openai',
    nome: 'OpenAI',
    baseUrl: 'https://mock.invalid/v1',
    modelo: 'fixture-model',
    modelosHabilitados: ['fixture-model'],
    habilitado: true,
    contexto: 8192,
    maxSaida: 2048,
    temperatura: 0.2,
    chaveMascarada: '••••••••test',
    origemChave: 'salva',
    variavelAmbiente: 'OPENAI_API_KEY',
  }],
  catalogo: [{
    providerId: 'openai',
    modelId: 'fixture-model',
    label: 'OpenAI — fixture-model',
    protocol: 'openai-chat',
  }],
}

describe('ProvidersView · provedor sem requisito de canary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.carregarEstado.mockResolvedValue(structuredClone(estadoFixture))
  })

  afterEach(() => vi.useRealTimers())

  it('mantém a configuração e seleção de provedor sem apresentar fluxo de prova', async () => {
    render(<ProvidersView />)
    await waitFor(() => expect(mocks.carregarEstado).toHaveBeenCalled())
    expect(await screen.findByLabelText('Modelo OpenAI')).toBeTruthy()
    expect((screen.getByLabelText('Endereço do serviço OpenAI') as HTMLInputElement).value).toBe('https://mock.invalid/v1')
    expect((screen.getByLabelText('Modelo OpenAI') as HTMLInputElement).value).toBe('fixture-model')
    expect(screen.getByLabelText('usar este provedor no chat')).toBeTruthy()
    expect(screen.queryByText(/canary|verificado por round-trip|tool calling/i)).toBeNull()
  })

  it('abre com opções locais enquanto a leitura está pendente e não inicia chamadas externas', () => {
    mocks.carregarEstado.mockReturnValue(new Promise(() => {}))
    render(<ProvidersView />)
    expect(screen.getByRole('status').textContent).toContain('opções locais')
    expect((screen.getByLabelText('Endereço do serviço OpenAI') as HTMLInputElement).value).toBe('https://api.openai.com/v1')
    expect(screen.getByRole('button', { name: /Salvar provedores/ })).toHaveProperty('disabled', true)
    expect(mocks.buscarModelos).not.toHaveBeenCalled()
    expect(mocks.testar).not.toHaveBeenCalled()
    expect(mocks.revelarChave).not.toHaveBeenCalled()
  })

  it('atualiza modelos descobertos do Ollama após adição/remoção e preserva configuração e seleção', async () => {
    const ollamaEstado: EstadoProvedores = {
      storage: 'fixture',
      ativo: 'ollama',
      provedores: [{
        id: 'ollama',
        nome: 'Ollama (local)',
        baseUrl: 'http://localhost:11434',
        modelo: 'llama3.2:latest',
        modelosHabilitados: ['llama3.2:latest', 'qwen2.5-coder:latest'],
        habilitado: true,
        contexto: 32768,
        maxSaida: 4096,
        temperatura: 0.2,
        chaveMascarada: null,
        origemChave: null,
        variavelAmbiente: null,
      }],
      catalogo: [],
    }
    mocks.carregarEstado.mockResolvedValue(ollamaEstado)
    mocks.buscarModelos
      .mockResolvedValueOnce({ ok: true, modelos: ['llama3.2:latest', 'qwen2.5-coder:latest'] })
      .mockResolvedValueOnce({ ok: true, modelos: ['llama3.2:latest', 'gemma4:31b-cloud'] })
      .mockResolvedValueOnce({ ok: true, modelos: [], mensagem: 'Ollama respondeu sem modelos locais.' })

    render(<ProvidersView />)
    const modeloPadrao = await screen.findByLabelText('Modelo Ollama (local)') as HTMLInputElement
    const buscar = screen.getByRole('button', { name: /Buscar modelos/ })

    fireEvent.click(buscar)
    expect(await screen.findByRole('option', { name: 'qwen2.5-coder:latest' })).toBeTruthy()

    fireEvent.click(buscar)
    expect(await screen.findByRole('option', { name: 'gemma4:31b-cloud' })).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'qwen2.5-coder:latest' })).toBeNull()
    expect(modeloPadrao.value).toBe('llama3.2:latest')
    expect((screen.getByRole('checkbox', { name: 'Desabilitar modelo configurado qwen2.5-coder:latest' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText(/Habilitado nas configurações, mas não retornado pela busca atual/)).toBeTruthy()

    fireEvent.click(buscar)
    expect(await screen.findByText('Ollama respondeu sem modelos locais.')).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'llama3.2:latest' })).toBeNull()
    expect(screen.queryByRole('option', { name: 'gemma4:31b-cloud' })).toBeNull()
    expect(modeloPadrao.value).toBe('llama3.2:latest')
    expect((screen.getByRole('checkbox', { name: 'Desabilitar modelo configurado qwen2.5-coder:latest' }) as HTMLInputElement).checked).toBe(true)
    expect(mocks.buscarModelos.mock.calls.map(([alvo]) => alvo.id)).toEqual(['ollama', 'ollama', 'ollama'])
    expect(mocks.salvar).not.toHaveBeenCalled()
  })

  it('associa uma resposta ao provedor consultado mesmo que a seleção mude durante a requisição', async () => {
    const base = structuredClone(estadoFixture)
    const ollamaEstado: EstadoProvedores = {
      ...base,
      ativo: 'ollama',
      provedores: [...base.provedores, {
        id: 'ollama',
        nome: 'Ollama (local)',
        baseUrl: 'http://localhost:11434',
        modelo: 'llama3.2:latest',
        modelosHabilitados: [],
        habilitado: true,
        contexto: 32768,
        maxSaida: 4096,
        temperatura: 0.2,
        chaveMascarada: null,
        origemChave: null,
        variavelAmbiente: null,
      }],
    }
    let resolver: ((valor: { ok: boolean; modelos: string[] }) => void) | undefined
    mocks.carregarEstado.mockResolvedValue(ollamaEstado)
    mocks.buscarModelos.mockImplementationOnce(() => new Promise((resolve) => { resolver = resolve }))

    render(<ProvidersView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Buscar modelos' }))
    fireEvent.click(screen.getByRole('button', { name: 'OpenAI configurado' }))
    await act(async () => resolver?.({ ok: true, modelos: ['modelo-exclusivo-ollama'] }))

    expect(screen.queryByRole('option', { name: 'modelo-exclusivo-ollama' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ollama (local) configurado' }))
    expect(await screen.findByRole('option', { name: 'modelo-exclusivo-ollama' })).toBeTruthy()
  })

  it('não mantém catálogo antigo visível quando a atualização falha e preserva os modelos habilitados', async () => {
    const ollamaEstado: EstadoProvedores = {
      storage: 'fixture',
      ativo: 'ollama',
      provedores: [{
        id: 'ollama',
        nome: 'Ollama (local)',
        baseUrl: 'http://localhost:11434',
        modelo: 'llama3.2:latest',
        modelosHabilitados: ['llama3.2:latest'],
        habilitado: true,
        contexto: 32768,
        maxSaida: 4096,
        temperatura: 0.2,
        chaveMascarada: null,
        origemChave: null,
        variavelAmbiente: null,
      }],
      catalogo: [],
    }
    mocks.carregarEstado.mockResolvedValue(ollamaEstado)
    mocks.buscarModelos
      .mockResolvedValueOnce({ ok: true, modelos: ['llama3.2:latest'] })
      .mockResolvedValueOnce({ ok: false, modelos: [], mensagem: 'Ollama indisponível nesta tentativa.' })

    render(<ProvidersView />)
    fireEvent.click(await screen.findByRole('button', { name: 'Buscar modelos' }))
    expect(await screen.findByRole('option', { name: 'llama3.2:latest' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Buscar modelos' }))
    expect(await screen.findByText('Ollama indisponível nesta tentativa.')).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'llama3.2:latest' })).toBeNull()
    expect((screen.getByRole('checkbox', { name: 'Desabilitar modelo configurado llama3.2:latest' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText(/A busca falhou; disponibilidade não confirmada/)).toBeTruthy()
  })

  it('mostra falha da leitura sem esconder formulário nem deixar loader infinito', async () => {
    mocks.carregarEstado.mockRejectedValue(new Error('Falha local de leitura'))
    render(<ProvidersView />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha local de leitura')
    expect(screen.getByLabelText('Endereço do serviço OpenAI')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar carregar novamente' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Salvar provedores/ })).toHaveProperty('disabled', true)
    expect(screen.queryByText(/Mostrando opções locais enquanto leio/)).toBeNull()
  })

  it('encerra leitura pendente pelo timeout e permite tentar novamente', async () => {
    vi.useFakeTimers()
    mocks.carregarEstado
      .mockReturnValueOnce(new Promise(() => {}))
      .mockResolvedValueOnce(structuredClone(estadoFixture))
    render(<ProvidersView />)
    await act(async () => { vi.advanceTimersByTime(10_000) })
    expect(screen.getByRole('alert').textContent).toContain('10 segundos')
    expect((mocks.carregarEstado.mock.calls[0][0] as AbortSignal).aborted).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar novamente' }))
    await act(async () => { await Promise.resolve() })
    expect(mocks.carregarEstado).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Endereço do serviço OpenAI')).toBeTruthy()
  })
})
