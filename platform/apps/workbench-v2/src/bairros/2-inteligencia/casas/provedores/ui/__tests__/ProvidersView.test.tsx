// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EstadoProvedores, ResultadoVerificacaoToolCalling } from '../../contract'

const mocks = vi.hoisted(() => ({
  carregarEstado: vi.fn(),
  buscarModelos: vi.fn(),
  revelarChave: vi.fn(),
  salvar: vi.fn(),
  testar: vi.fn(),
  verificarToolCalling: vi.fn(),
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
    capability: 'unknown',
    assessment: { status: 'unknown', checkedAt: null, reason: null },
  }],
}

describe('ProvidersView · consentimento do canary F5-B', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.carregarEstado.mockResolvedValue(structuredClone(estadoFixture))
    mocks.verificarToolCalling.mockResolvedValue({
      providerId: 'openai', modelId: 'fixture-model', status: 'verified',
      checkedAt: '2026-10-27T12:00:00.000Z', reason: 'roundtrip_verified', cached: false,
    } satisfies ResultadoVerificacaoToolCalling)
  })

  it('avisa sobre custos, não chama sem autorização e exige clique após consentir', async () => {
    render(<ProvidersView />)
    const consentimento = await screen.findByLabelText(/Autorizo agora o canary/)
    const botao = screen.getByRole('button', { name: 'Verificar tool calling' })
    expect(screen.getByText(/consumir créditos\/custos/)).toBeTruthy()
    expect(botao).toBeDisabled()
    expect(mocks.verificarToolCalling).not.toHaveBeenCalled()

    fireEvent.click(consentimento)
    expect(botao).toBeEnabled()
    expect(mocks.verificarToolCalling).not.toHaveBeenCalled()
    fireEvent.click(botao)
    await waitFor(() => expect(mocks.verificarToolCalling).toHaveBeenCalledWith({
      providerId: 'openai', modelId: 'fixture-model', consent: true,
    }))
    await waitFor(() => expect(screen.getByText(/verificado por round-trip/i)).toBeTruthy())
    expect(screen.getByLabelText(/Autorizo agora o canary/)).not.toBeChecked()
  })
})
