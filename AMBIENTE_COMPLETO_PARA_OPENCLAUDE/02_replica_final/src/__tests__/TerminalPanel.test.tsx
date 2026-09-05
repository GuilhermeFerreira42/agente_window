import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TerminalPanel, type TerminalSnapshot } from '../components/TerminalPanel'

const xtermMock = vi.hoisted(() => {
  // O mock precisa acompanhar a superfície REAL da API do xterm usada por
  // TerminalPanel.tsx. Quando o terminal deixou de ser somente-leitura
  // (passou a aceitar digitação), o componente passou a chamar `write` e
  // `onData` — que faltavam aqui e faziam os 7 testes deste arquivo
  // quebrarem com "instance.write is not a function".
  class MockTerminal {
    static instances: MockTerminal[] = []
    clear = vi.fn()
    dispose = vi.fn()
    fit = vi.fn()
    focus = vi.fn()
    loadAddon = vi.fn()
    open = vi.fn()
    write = vi.fn()
    writeln = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    // Guarda o callback para que os testes possam simular digitação real.
    dataHandlers: Array<(data: string) => void> = []
    onData = vi.fn((handler: (data: string) => void) => {
      this.dataHandlers.push(handler)
      return { dispose: vi.fn() }
    })
    onKey = vi.fn(() => ({ dispose: vi.fn() }))
    /** Helper de teste: simula o usuário digitando no terminal. */
    type(data: string) {
      for (const handler of this.dataHandlers) handler(data)
    }

    constructor() {
      MockTerminal.instances.push(this)
    }
  }

  return { MockTerminal }
})

const fitMock = vi.hoisted(() => ({ fit: vi.fn() }))

vi.mock('@xterm/xterm', () => ({ Terminal: xtermMock.MockTerminal }))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = fitMock.fit
  },
}))
vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: class {},
}))

const baseProps: React.ComponentProps<typeof TerminalPanel> = {
  visible: true,
  sessionId: 'session-one',
  workspace: 'workspace-one',
  onClose: vi.fn(),
}

function renderPanel(overrides: Partial<React.ComponentProps<typeof TerminalPanel>> = {}) {
  return render(<TerminalPanel {...baseProps} {...overrides} />)
}

describe('TerminalPanel', () => {
  beforeEach(() => {
    xtermMock.MockTerminal.instances.length = 0
    vi.clearAllMocks()
  })

  it('abre o terminal, limpa a saída, maximiza/restaura e fecha pelo callback', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ onClose })

    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-session-id', 'session-one')
    const instance = xtermMock.MockTerminal.instances[0]
    expect(instance.open).toHaveBeenCalledTimes(1)
    expect(instance.writeln).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Limpar terminal' }))
    expect(instance.clear).toHaveBeenCalledTimes(1)

    const maximize = screen.getByRole('button', { name: 'Maximizar terminal' })
    await user.click(maximize)
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveClass('is-maximized')
    expect(maximize).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Restaurar terminal' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restaurar terminal' }))
    expect(screen.getByRole('region', { name: 'Terminal' })).not.toHaveClass('is-maximized')

    await user.click(screen.getByRole('button', { name: 'Fechar terminal' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('alterna abas Output/Problems e volta ao Terminal (E8)', async () => {
    const user = userEvent.setup()
    renderPanel()

    // Terminal ativo por padrão.
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Output' }))
    expect(screen.getByRole('tabpanel', { name: 'Output' })).toBeInTheDocument()
    expect(screen.getByText(/vite v5 building/)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Problems/ }))
    const problems = screen.getByRole('tabpanel', { name: 'Problems' })
    expect(within(problems).getAllByRole('listitem').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('tab', { name: 'Terminal' }))
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
  })

  it('seleciona o shell pelo seletor (E8)', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /Selecionar shell/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'zsh' }))
    expect(screen.getByRole('button', { name: /atual: zsh/ })).toBeInTheDocument()
    expect(document.querySelector('.terminal-container')).toHaveAttribute('data-shell', 'zsh')
  })

  it('divide o terminal e fecha a divisão (E8)', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(document.querySelector('.terminal-panes.is-split')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Dividir terminal' }))
    expect(document.querySelector('.terminal-panes.is-split')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Terminal dividido' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar divisão' }))
    expect(document.querySelector('.terminal-panes.is-split')).toBeNull()
  })

  it('descarta a instância anterior e mantém snapshots isolados ao trocar de sessão', () => {
    const onSnapshot = vi.fn()
    const view = renderPanel({ onSnapshot })
    const first = xtermMock.MockTerminal.instances[0]

    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" workspace="workspace-two" onSnapshot={onSnapshot} />)
    const second = xtermMock.MockTerminal.instances[1]

    expect(first.dispose).toHaveBeenCalledTimes(1)
    expect(second.open).toHaveBeenCalledTimes(1)
    expect(onSnapshot).toHaveBeenCalledWith('session-one', expect.objectContaining({
      cleared: false,
      lines: expect.arrayContaining(['Agent Sessions terminal  workspace-one']),
    }))
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-session-id', 'session-two')
    expect(second.writeln).toHaveBeenCalledWith('Agent Sessions terminal  workspace-two')
  })

  it('salva o clear ao fechar e restaura a sessão sem recuperar saída de outra sessão', () => {
    const onSnapshot = vi.fn()
    const view = renderPanel({ onSnapshot })
    const first = xtermMock.MockTerminal.instances[0]

    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" workspace="workspace-two" onSnapshot={onSnapshot} />)
    const second = xtermMock.MockTerminal.instances[1]
    fireEvent.click(screen.getByRole('button', { name: 'Limpar terminal' }))

    view.rerender(<TerminalPanel {...baseProps} visible={false} sessionId="session-two" workspace="workspace-two" onSnapshot={onSnapshot} />)
    expect(second.dispose).toHaveBeenCalledTimes(1)
    expect(onSnapshot).toHaveBeenLastCalledWith('session-two', { lines: [], cleared: true })

    const sessionTwoSnapshot: TerminalSnapshot = { lines: [], cleared: true }
    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" workspace="workspace-two" snapshot={sessionTwoSnapshot} onSnapshot={onSnapshot} />)
    const restored = xtermMock.MockTerminal.instances[2]
    expect(restored.writeln).not.toHaveBeenCalled()
    expect(first.dispose).toHaveBeenCalledTimes(1)
  })

  it('rotula a aba Terminal com o nome da sessão e o rótulo segue a sessão (R-063)', () => {
    const view = renderPanel({ sessionLabel: 'session-1' })
    expect(screen.getByRole('tab', { name: /session-1/ })).toBeInTheDocument()

    // Trocar de sessão troca o rótulo exibido.
    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" sessionLabel="session-2" workspace="workspace-two" />)
    expect(screen.getByRole('tab', { name: /session-2/ })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /session-1/ })).not.toBeInTheDocument()
  })
})

