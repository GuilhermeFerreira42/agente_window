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
