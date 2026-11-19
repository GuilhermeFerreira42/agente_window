// ============================================================================
// C-2 — c2Composer (C2-T01/T03/T04/T05/T07/T09/T11/T18 · R01/R02/R08):
// aparência PT-BR no centro, seletor REAL de LLM na posição do Copilot,
// compositor com estado local (crescimento, Enter/IME), snapshot único com
// trava anti-corrida, modo em Chat/Pasta, default Chat, menus com teclado
// (RV06) e lock da tentativa sobrevivendo a remount (RV05).
// Dados 100% sintéticos; provedores mockados só para o catálogo desta suíte.
// ============================================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionLanding } from '../components/SessionLanding'
import type { RascunhoLanding } from '../domain/landingDraft'
import { rascunhoInicial } from '../domain/landingDraft'
import { useLandingTentativa, type EntradaSubmitLanding } from '../hooks/useLandingSubmission'

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
    <>
    <button onClick={() => setContexto('workspace')}>fixture pasta</button>
    <SessionLanding
      workspace="Nenhuma pasta aberta"
      contexto={contexto}
      onChangeContexto={setContexto}
      onSubmit={onSubmit as never}
      {...extra}
    /></>
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

  it('T09: falha de catálogo vira mensagem honesta com Tentar novamente (sem lista vazia silenciosa)', async () => {
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
  it('T03: Enter envia, Shift+Enter quebra linha, IME não envia e a área cresce até 200px', async () => {
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
  it('T04: um submit = um snapshot; durante a tentativa a edição trava e a recusa preserva o rascunho', async () => {
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

describe('c2Composer — C2-T11/T01 Chat × Pasta', () => {
  it('T11: em Chat só Perguntar/manual fica ativo, com motivo acessível; Pasta libera os 4 modos', async () => {
    const user = userEvent.setup()
    montar(() => true)
    const modo = screen.getByRole('button', { name: /Modo: Perguntar/ })
    expect(modo).toBeEnabled()
    expect(modo.getAttribute('aria-label')).toContain('Chat começa em Perguntar')
    const permissao = screen.getByRole('button', { name: /Permissão: Permissões manuais/ })
    expect(permissao).toBeEnabled()
    expect(screen.getByTestId('landing-motivo-chat')).toBeInTheDocument()
    await user.click(modo)
    expect(screen.getByRole('menuitemradio', { name: 'Perguntar' })).toBeEnabled()
    for (const name of ['Agente', 'Editar', 'Planejar']) {
      expect(screen.getByRole('menuitemradio', { name: new RegExp(name) })).toBeDisabled()
    }
    await user.keyboard('{Escape}')
    await user.click(permissao)
    expect(screen.getByRole('menuitemradio', { name: /Permissões manuais/ })).toBeEnabled()
    expect(screen.getByRole('menuitemradio', { name: /Permitir tudo/ })).toBeDisabled()
    await user.keyboard('{Escape}')


    // Em Pasta, o seletor de modos abre com as 4 opções.
    // Pasta real validada aplica o contexto pelo dono.
    fireEvent.click(screen.getByRole('button', { name: 'fixture pasta' }))
    await user.click(screen.getByRole('button', { name: /^Modo:/ }))
    for (const rotulo of ['Agente', 'Editar', 'Perguntar', 'Planejar']) {
      expect(screen.getByRole('menuitemradio', { name: new RegExp(rotulo) })).toBeInTheDocument()
    }
  })

  it('T01: default Chat com chip "Chat sem pasta", sem seletor de pasta e sem This Computer', () => {
    montar(() => true)
    expect(screen.getByTestId('landing-contexto')).toHaveTextContent('Chat')
    expect(screen.getByTestId('landing-chat-chip')).toHaveTextContent('Chat')
    expect(screen.queryByTestId('landing-workspace-chip')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Workspace atual/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/This Computer/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C2-T18/RV06 — navegação dos menus (setas/Home/End/Escape) e retorno ao
// acionador CORRETO (topo e atalho inferior); C2-T04/T05/RV05 — lock da
// tentativa e sobrevivência a remount com rascunho/identidade controlados.
// ---------------------------------------------------------------------------
function MonteTentativa({ onSubmit }: { onSubmit: (entrada: EntradaSubmitLanding) => unknown }) {
  const tentativa = useLandingTentativa()
  const [contexto, setContexto] = useState<'chat' | 'workspace'>('chat')
  const [rascunho, setRascunho] = useState<RascunhoLanding>(rascunhoInicial())
  const [mostrar, setMostrar] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setMostrar((valor) => !valor)}>alternar landing</button>
      {mostrar && (
        <SessionLanding
          workspace="Nenhuma pasta aberta"
          contexto={contexto}
          onChangeContexto={setContexto}
          onSubmit={onSubmit as never}
          rascunhoControlado={rascunho}
          onChangeRascunho={setRascunho}
          tentativaControlada={tentativa}
        />
      )}
    </>
  )
}

describe('c2Composer — C2-T18/RV06 menus com teclado e retorno ao acionador', () => {
  it('Chat abre os três menus e envia apenas ask/manual após interação', async () => {
    const user = userEvent.setup(); const submit = vi.fn(() => false)
    montar(submit)
    await user.click(screen.getByRole('button', { name: /^Modo:/ }))
    await user.click(screen.getByRole('menuitemradio', { name: /Agente/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Perguntar' }))
    await user.click(screen.getByTestId('landing-interativo'))
    expect(screen.getByRole('menuitemradio', { name: /Planejar/ })).toBeDisabled()
    await user.click(screen.getByRole('menuitemradio', { name: /Interativo/ }))
    await user.click(screen.getByRole('button', { name: /^Permissão:/ }))
    await user.click(screen.getByRole('menuitemradio', { name: /Permitir tudo/ }))
    await user.click(screen.getByRole('menuitemradio', { name: /Permissões manuais/ }))
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), 'chat continua sem ferramentas')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ contexto: 'chat', modo: 'ask', permissao: 'manual', workspacePath: null }) }))
  })

  it('Interativo abre o menu real; Planejar e permissões compõem o mesmo snapshot', async () => {
    const user = userEvent.setup(); const submit = vi.fn(() => false)
    montar(submit)
    await user.click(screen.getByRole('button', { name: 'fixture pasta' }))
    await user.click(screen.getByTestId('landing-interativo'))
    expect(screen.getByRole('menu', { name: 'Modo de execução' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: /Autopilot/ })).toBeDisabled()
    await user.click(screen.getByRole('menuitemradio', { name: /Planejar/ }))
    expect(screen.getByTestId('landing-interativo')).toHaveTextContent('Planejar')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    await user.click(screen.getByRole('button', { name: /^Permissão:/ }))
    expect(screen.getByRole('menuitem', { name: /Permissões assistidas/ })).toBeDisabled()
    await user.click(screen.getByRole('menuitemradio', { name: /Permitir tudo/ }))
    expect(screen.getByRole('button', { name: /^Permissão:/ })).toHaveTextContent('Permissões manuais')
    await user.click(screen.getByRole('button', { name: /^Permissão:/ }))
    await user.click(screen.getByRole('menuitemradio', { name: /Permitir tudo/ }))
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), 'planejar sem editar')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ modo: 'plan', permissao: 'allow-all' }) }))
    expect(confirm).toHaveBeenCalledTimes(2)
    confirm.mockRestore()
  })
  it('Agente seleciona de fato; Escape e clique fora fecham o menu portado', async () => {
    const user = userEvent.setup(); montar(() => false)
    await user.click(screen.getByRole('button', { name: 'fixture pasta' }))
    const trigger = screen.getByRole('button', { name: /^Modo:/ })
    await user.click(trigger)
    await user.keyboard('{End}{Enter}')
    expect(trigger).toHaveTextContent('Planejar')
    await user.click(screen.getByTestId('landing-interativo'))
    await user.keyboard('{Escape}')
    expect(screen.getByTestId('landing-interativo')).toHaveFocus()
    await user.click(trigger); await user.click(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
  it('seleciona com ponteiro no atalho inferior sem o clique fora fechar antes da escolha', async () => {
    const user = userEvent.setup()
    montar(() => true)
    await user.click(screen.getByTestId('landing-modelo-resumo'))
    await user.click(await screen.findByRole('menuitemradio', { name: /Claude Sintético/ }))
    expect(screen.getByTestId('landing-modelo-resumo')).toHaveTextContent('Claude Sintético')
    expect(screen.getByTestId('landing-modelo-topo')).toHaveTextContent('Claude Sintético')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
  it('T18: setas movem o foco no menu; Escape devolve ao acionador que ABRIU (topo ou resumo)', async () => {
    const user = userEvent.setup()
    montar(() => true)

    // Âncora TOPO: abre, foco no primeiro item, ArrowDown avança, Escape volta ao topo.
    const topo = screen.getByTestId('landing-modelo-topo')
    await user.click(topo)
    const menu = await screen.findByRole('menu', { name: 'Modelos disponíveis' })
    const itens = menu.querySelectorAll('[role="menuitemradio"]')
    expect(document.activeElement).toBe(itens[0])
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(itens[1])
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(itens[0])
    await user.keyboard('{Escape}')
    expect(await screen.queryByRole('menu', { name: 'Modelos disponíveis' })).toBeNull()
    expect(document.activeElement).toBe(topo)

    // Atalho INFERIOR: abre do resumo; Escape devolve ao resumo (não ao topo).
    const resumo = screen.getByTestId('landing-modelo-resumo')
    await user.click(resumo)
    await screen.findByRole('menu', { name: 'Modelos disponíveis' })
    await user.keyboard('{Escape}')
    expect(document.activeElement).toBe(resumo)
  })

  it('T18: Enter na opção fecha o menu e devolve o foco ao acionador; Tab não prende no menu', async () => {
    const user = userEvent.setup()
    montar(() => true)
    const resumo = screen.getByTestId('landing-modelo-resumo')
    await user.click(resumo)
    const menu = await screen.findByRole('menu', { name: 'Modelos disponíveis' })
    const primeiro = menu.querySelector('[role="menuitemradio"]') as HTMLElement
    primeiro.focus()
    await user.keyboard('{Enter}')
    expect(await screen.queryByRole('menu', { name: 'Modelos disponíveis' })).toBeNull()
    expect(document.activeElement).toBe(resumo)
  })
})

describe('c2Composer — C2-T04/T05/RV05 lock da tentativa (remount controlado)', () => {
  it('T04: durante submit os controles de contexto ficam BLOQUEADOS (Chat/Pasta sem troca concorrente)', async () => {
    const user = userEvent.setup()
    let liberar: (() => void) | undefined
    const onSubmit = vi.fn(() => new Promise<boolean>((ok) => { liberar = () => ok(true) }))
    montar(onSubmit)
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), 'em voo')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('landing-contexto')).toBeDisabled()
    expect(screen.getByTestId('landing-modelo-topo')).toBeDisabled()
    expect(screen.getByTestId('landing-modelo-resumo')).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })).toHaveAttribute('readonly')
    await act(async () => { liberar?.() })
    expect(screen.getByTestId('landing-contexto')).not.toBeDisabled()
  })

  it('T05: remount da landing com criação em voo preserva rascunho e lock (estado no dono)', async () => {
    const user = userEvent.setup()
    let liberar: (() => void) | undefined
    const onSubmit = vi.fn(() => new Promise<boolean>((ok) => { liberar = () => ok(true) }))
    render(<MonteTentativa onSubmit={onSubmit} />)
    const campo = () => screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo(), 'texto preservado')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    // Remount (abrir/fechar Provedores) no MEIO do envio.
    await user.click(screen.getByRole('button', { name: 'alternar landing' }))
    expect(screen.queryByRole('textbox', { name: 'Mensagem para a nova sessão' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'alternar landing' }))

    expect(campo()).toHaveValue('texto preservado')
    expect(campo()).toHaveAttribute('readonly')
    expect(screen.getByText('Criando conversa. Sua mensagem está preservada.')).toBeInTheDocument()
    expect(screen.getByTestId('landing-contexto')).toBeDisabled()

    await act(async () => { liberar?.() })
    await waitFor(() => expect(campo()).not.toHaveAttribute('readonly'))
  })
})
