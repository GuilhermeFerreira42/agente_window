import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TerminalPanel } from '../components/TerminalPanel'

const xtermMock = vi.hoisted(() => {
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
    dataHandlers: Array<(data: string) => void> = []
    onData = vi.fn((handler: (data: string) => void) => {
      this.dataHandlers.push(handler)
      return { dispose: vi.fn() }
    })
    onKey = vi.fn(() => ({ dispose: vi.fn() }))
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

const mockPtySession = vi.hoisted(() => ({
  status: 'open' as const,
  pid: 1234,
  activeProfile: { id: 'powershell', label: 'Windows PowerShell', path: 'powershell.exe' },
  availableProfiles: [
    { id: 'pwsh', label: 'PowerShell 7', path: 'pwsh.exe' },
    { id: 'powershell', label: 'Windows PowerShell', path: 'powershell.exe' },
    { id: 'cmd', label: 'Command Prompt', path: 'cmd.exe' }
  ],
  lastError: undefined,
  sendInput: vi.fn(),
  sendResize: vi.fn(),
  closeSession: vi.fn(),
  onOutput: vi.fn((_cb: (d: string) => void) => () => {})
}))

vi.mock('../hooks/usePtySession', () => ({
  usePtySession: vi.fn(() => ({
    ...mockPtySession
  }))
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

  it('seleciona o shell pelo seletor de perfis reais', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: /Selecionar shell/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Command Prompt' }))
    expect(screen.queryByRole('menu', { name: 'Shells disponíveis' })).not.toBeInTheDocument()
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

  it('descarta a instância anterior ao trocar de sessão', () => {
    const view = renderPanel()
    const first = xtermMock.MockTerminal.instances[0]

    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" workspace="workspace-two" />)
    const second = xtermMock.MockTerminal.instances[1]

    expect(first.dispose).toHaveBeenCalledTimes(1)
    expect(second.open).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-session-id', 'session-two')
  })

  it('rotula a aba Terminal com o nome da sessão e o rótulo segue a sessão (R-063)', () => {
    const view = renderPanel({ sessionLabel: 'session-1' })
    expect(screen.getByRole('tab', { name: /session-1/ })).toBeInTheDocument()

    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" sessionLabel="session-2" workspace="workspace-two" />)
    expect(screen.getByRole('tab', { name: /session-2/ })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /session-1/ })).not.toBeInTheDocument()
  })
})
