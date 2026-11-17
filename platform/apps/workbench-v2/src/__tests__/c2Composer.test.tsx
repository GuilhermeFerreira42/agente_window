// ============================================================================
// C-2 — c2Composer (C2-T01..T05 · R01/R02): aparência PT-BR no centro, seletor
// REAL de LLM na posição do Copilot, compositor com estado local (crescimento,
// Enter/IME), snapshot único por tentativa com trava anti-corrida, modo em
// Chat/Pasta e default Chat sem pasta.
// Dados 100% sintéticos; provedores mockados só para o catálogo desta suíte.
// ============================================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionLanding } from '../components/SessionLanding'
import type { EntradaSubmitLanding } from '../hooks/useLandingSubmission'

const catalogoMock = [
  { providerId: 'p1', modelId: 'm1', label: 'GPT Sintético', protocol: 'openai' as const },
  { providerId: 'p2', modelId: 'm2', label: 'Claude Sintético', protocol: 'anthropic' as const },
]
const { carregarEstado } = vi.hoisted(() => ({ carregarEstado: vi.fn() }))

vi.mock('../bairros/2-inteligencia/casas/provedores', () => ({
  carregarEstado: () => carregarEstado(),
}))

beforeEach(() => {
  carregarEstado.mockClear()
  carregarEstado.mockResolvedValue({ provedores: [], catalogo: catalogoMock, ativo: 'p1', storage: 'fixture' })
})

function Monte({ onSubmit, extra }: { onSubmit: (entrada: EntradaSubmitLanding) => unknown; extra?: Record<string, unknown> }) {
  const [contexto, setContexto] = useState<'chat' | 'workspace'>('chat')
  return (
    <SessionLanding
      workspace="Nenhuma pasta aberta"
      contexto={contexto}
      onChangeContexto={setContexto}
      onSubmit={onSubmit as never}
      {...extra}
    />
  )
}

function montar(onSubmit: (entrada: EntradaSubmitLanding) => unknown, extra: Record<string, unknown> = {}) {
  return render(<Monte onSubmit={onSubmit} extra={extra} />)
}

describe('c2Composer — R01 centro PT-BR + seletor LLM real', () => {
  it('T01: título PT-BR, SEM This Computer, seletor na posição do Copilot com catálogo real', async () => {
    const user = userEvent.setup()
    montar(() => true)
    expect(screen.getByText('O que vamos construir?')).toBeInTheDocument()
    expect(screen.queryByText(/This Computer/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Copilot/i)).not.toBeInTheDocument()

    const seletor = screen.getByTestId('landing-modelo-topo')
    expect(seletor).toHaveAttribute('aria-haspopup', 'menu')
    await user.click(seletor)
    expect(await screen.findByRole('menu', { name: 'Modelos disponíveis' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: /Auto/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitemradio', { name: /GPT Sintético/ })).toBeInTheDocument()
    // Escolha explícita vira seleção de par exato.
    await user.click(screen.getByRole('menuitemradio', { name: /Claude Sintético/ }))
    expect(screen.getByTestId('landing-modelo-topo')).toHaveTextContent('Claude Sintético')
    expect(screen.getByTestId('landing-modelo-resumo')).toHaveTextContent('Claude Sintético')
    // O seletor atualiza ao abrir (mudanças em Provedores aparecem sem restart).
    expect(carregarEstado).toHaveBeenCalled()
  })

  it('T13: falha de catálogo vira mensagem honesta com Tentar novamente (sem lista vazia silenciosa)', async () => {
    const user = userEvent.setup()
    // Falha no carregamento inicial E na abertura; só o retry resolve.
    carregarEstado.mockRejectedValueOnce(new Error('rede')).mockRejectedValueOnce(new Error('rede'))
    montar(() => true)
    await user.click(screen.getByTestId('landing-modelo-topo'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os modelos disponíveis.')
    const retry = screen.getByRole('button', { name: /Tentar novamente/i })
    await user.click(retry)
    await waitFor(() => expect(screen.getByRole('menuitemradio', { name: /GPT Sintético/ })).toBeInTheDocument())
  })
})

describe('c2Composer — R02 compositor', () => {
  it('T02: Enter envia, Shift+Enter quebra linha, IME não envia e a área cresce até 200px', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    montar(onSubmit)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })

    // Crescimento: scrollHeight sintético (jsdom não faz layout).
    Object.defineProperty(campo, 'scrollHeight', { configurable: true, get: () => 120 })
    fireEvent.change(campo, { target: { value: 'linha' } })
    expect(campo.style.height).toBe('120px')
    Object.defineProperty(campo, 'scrollHeight', { configurable: true, get: () => 9999 })
    fireEvent.change(campo, { target: { value: 'linha com muito conteúdo' } })
    expect(campo.style.height).toBe('200px')

    fireEvent.change(campo, { target: { value: 'primeira linha' } })
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(campo).toHaveValue('primeira linha\n')

    fireEvent.change(campo, { target: { value: 'mensagem pronta' } })
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalledTimes(1)

    // IME/composição (keyCode 229) nunca envia.
    fireEvent.keyDown(campo, { key: 'Enter', keyCode: 229 })
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('c2Composer — R03 snapshot único por tentativa', () => {
  it('T03: um submit = um snapshot; durante a tentativa a edição trava e a recusa preserva o rascunho', async () => {
    const user = userEvent.setup()
    let liberar!: (ok: boolean) => void
    const gate = new Promise<boolean>((resolve) => { liberar = resolve })
    const onSubmit = vi.fn<(entrada: EntradaSubmitLanding) => Promise<boolean>>(async () => gate)
    montar(onSubmit)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'primeiro envio')

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const primeira = onSubmit.mock.calls[0][0] as EntradaSubmitLanding
    expect(primeira.snapshot.texto).toBe('primeiro envio')
    expect(primeira.snapshot.geracao).toBeGreaterThan(0)
    expect(campo).toHaveAttribute('readonly')
    expect(screen.getByRole('status')).toHaveTextContent('Sua mensagem está preservada')
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()

    // Recusa (false): rascunho volta, tentativa pode ser repetida.
    await act(async () => { liberar(false) })
    await waitFor(() => expect(campo).not.toHaveAttribute('readonly'))
    expect(campo).toHaveValue('primeiro envio')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    const segunda = onSubmit.mock.calls[1][0] as EntradaSubmitLanding
    expect(segunda.snapshot.texto).toBe('primeiro envio')
    expect(segunda.snapshot.tentativaId).not.toBe(primeira.snapshot.tentativaId)
    // Mesma geração (sem edição) = mesma retentativa lógica.
    expect(segunda.snapshot.geracao).toBe(primeira.snapshot.geracao)
    expect(segunda.confirmada).toBeNull()
  })

  it('T07: o snapshot carrega o par EXATO escolhido e Auto distinto (sem fallback)', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(entrada: EntradaSubmitLanding) => void>()
    montar(onSubmit)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'com modelo')
    await user.click(screen.getByTestId('landing-modelo-topo'))
    await user.click(await screen.findByRole('menuitemradio', { name: /GPT Sintético/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    const entrada = onSubmit.mock.calls[0][0] as EntradaSubmitLanding
    expect(entrada.snapshot.selecaoModelo).toEqual({ tipo: 'explicita', providerId: 'p1', modelId: 'm1' })

    // Auto permanece um valor DISTINTO no rascunho (não vira fallback).
    await user.click(screen.getByTestId('landing-modelo-topo'))
    await user.click(await screen.findByRole('menuitemradio', { name: /Auto/ }))
    expect(screen.getByTestId('landing-modelo-topo')).toHaveTextContent('Auto')
  })
})

describe('c2Composer — C2-T04/T05 Chat × Pasta', () => {
  it('T04: em Chat só Perguntar/manual fica ativo, com motivo acessível; Pasta libera os 4 modos', async () => {
    const user = userEvent.setup()
    montar(() => true)
    const modo = screen.getByRole('button', { name: /Modo: Perguntar/ })
    expect(modo).toBeDisabled()
    expect(modo.getAttribute('aria-label')).toContain('Chat começa em Perguntar')
    const permissao = screen.getByRole('button', { name: /Permissão: Permissões manuais/ })
    expect(permissao).toBeDisabled()
    expect(screen.getByTestId('landing-motivo-chat')).toBeInTheDocument()

    // Em Pasta, o seletor de modos abre com as 4 opções.
    fireEvent.click(screen.getByTestId('contexto-workspace'))
    await user.click(screen.getByRole('button', { name: /^Modo:/ }))
    for (const rotulo of ['Agente', 'Editar', 'Perguntar', 'Planejar']) {
      expect(screen.getByRole('menuitemradio', { name: new RegExp(rotulo) })).toBeInTheDocument()
    }
  })

  it('T05: default Chat com chip "Chat sem pasta", sem seletor de pasta e sem This Computer', () => {
    montar(() => true)
    expect(screen.getByTestId('contexto-chat')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('landing-chat-chip')).toHaveTextContent('Chat sem pasta')
    expect(screen.queryByTestId('landing-workspace-chip')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Workspace atual/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/This Computer/i)).not.toBeInTheDocument()
  })
})
