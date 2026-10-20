// ============================================================================
// ConfigView.test.tsx — a tela de Configurações (FATIA 11, C2).
// fetch falso: GET devolve { teto: 25, autoScroll: true }; PUT ecoa grampeado.
// ============================================================================
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfigView } from '../ui/ConfigView'

const PADRAO = { teto: 25, autoScroll: true }

function mockFetch(ecoSalvar?: (corpo: Record<string, unknown>) => Record<string, unknown>) {
  const chamadas: { url: string; init?: RequestInit }[] = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init })
    if (init?.method === 'PUT') {
      const corpo = JSON.parse(String(init.body)) as Record<string, unknown>
      const eco = ecoSalvar?.(corpo) ?? { ...PADRAO, ...corpo }
      return { ok: true, status: 200, json: async () => eco }
    }
    return { ok: true, status: 200, json: async () => ({ ...PADRAO }) }
  })
  vi.stubGlobal('fetch', fn)
  return { fn, chamadas }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ConfigView (FATIA 11)', () => {
  it('carrega e mostra o teto + a rolagem automática', async () => {
    mockFetch()
    render(<ConfigView />)
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()
    expect(screen.getByLabelText('Teto de voltas do agente')).toHaveValue(25)
    expect(screen.getByLabelText('Ajustar teto de voltas')).toHaveValue('25')
    expect(screen.getByLabelText(/Rolagem automática do chat/)).toBeChecked()
  })

  it('slider + Salvar: manda PUT, mostra o eco e avisa quem está ouvindo', async () => {
    const user = userEvent.setup()
    const { chamadas } = mockFetch()
    const aoSalvar = vi.fn()
    render(<ConfigView aoSalvar={aoSalvar} />)
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Ajustar teto de voltas'), { target: { value: '50' } })
    expect(screen.getByText('50 voltas')).toBeInTheDocument()
    await user.click(screen.getByLabelText(/Rolagem automática do chat/))
    expect(screen.getByLabelText(/Rolagem automática do chat/)).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Salvar configurações' }))
    await waitFor(() => expect(screen.getByText('Configuração salva')).toBeInTheDocument())

    expect(chamadas).toHaveLength(2) // GET inicial + PUT do Salvar (slider não cospe PUT)
    expect(chamadas[1].url).toBe('/api/config')
    expect(JSON.parse(String(chamadas[1].init?.body))).toEqual({ teto: 50, autoScroll: false })
    expect(aoSalvar).toHaveBeenCalledWith({ teto: 50, autoScroll: false })
  })

  it('mostra o eco grampeado do servidor (digitou 999, vale 250)', async () => {
    const user = userEvent.setup()
    mockFetch((corpo) => ({ ...corpo, teto: 250 }))
    render(<ConfigView />)
    expect(await screen.findByRole('heading', { name: 'Configurações' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Teto de voltas do agente'), { target: { value: '999' } })
    await user.click(screen.getByRole('button', { name: 'Salvar configurações' }))
    await waitFor(() => expect(screen.getByLabelText('Teto de voltas do agente')).toHaveValue(250))
    expect(screen.getByText('250 voltas')).toBeInTheDocument()
  })

  it('GET quebrado = banner honesto (sem tela vazia)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ message: 'disco cheio' }) })))
    render(<ConfigView />)
    expect(await screen.findByRole('alert')).toHaveTextContent('disco cheio')
  })
})
