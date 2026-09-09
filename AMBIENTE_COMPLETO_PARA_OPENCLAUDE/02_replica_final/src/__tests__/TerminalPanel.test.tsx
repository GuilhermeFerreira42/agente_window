import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TerminalPanel } from '../components/TerminalPanel'

const xtermMock = vi.hoisted(() => {
  class MockTerminal {
    static instances: MockTerminal[] = []
    cols = 80
    rows = 24
    options: { theme?: unknown }
    blur = vi.fn()
    clear = vi.fn()
    dispose = vi.fn()
    focus = vi.fn()
    loadAddon = vi.fn()
    open = vi.fn()
    write = vi.fn()
    writeln = vi.fn()
    hasSelection = vi.fn(() => false)
    getSelection = vi.fn(() => '')
    selectAll = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    dataHandlers: Array<(data: string) => void> = []
    onData = vi.fn((handler: (data: string) => void) => {
      this.dataHandlers.push(handler)
      return { dispose: vi.fn() }
    })
    type(data: string) {
      for (const handler of this.dataHandlers) handler(data)
    }

    constructor(options?: { theme?: unknown }) {
      this.options = { theme: options?.theme }
      MockTerminal.instances.push(this)
    }
  }

  return { MockTerminal }
})

const fitMock = vi.hoisted(() => ({ fit: vi.fn() }))

function buildSession(pid: number, label = 'Bash', shellId = 'bash', path = '/bin/bash') {
  return {
    status: 'open' as const,
    pid,
    activeProfile: { id: shellId, label, path },
    availableProfiles: [
      { id: 'bash', label: 'Bash', path: '/bin/bash' },
      { id: 'zsh', label: 'Zsh', path: '/bin/zsh' },
      { id: 'cmd', label: 'Command Prompt', path: 'cmd.exe' },
    ],
    lastError: undefined,
    sendInput: vi.fn(),
    sendResize: vi.fn(),
    closeSession: vi.fn(),
    clearOutputBuffer: vi.fn(),
    onOutput: vi.fn((_cb: (data: string) => void) => () => {}),
  }
}

const sessionZero = vi.hoisted(() => buildSession(1234))
const sessionOne = vi.hoisted(() => buildSession(4321))
const splitSession = vi.hoisted(() => buildSession(5555))
const sessionTwo = vi.hoisted(() => buildSession(2468, 'Zsh', 'zsh', '/bin/zsh'))

const terminalSessionsMock = vi.hoisted(() => ({
  sessions: {
    'session-one:0': sessionZero,
    'session-one:1': sessionOne,
    'session-one-split': splitSession,
    'session-two:0': sessionTwo,
  },
  getOrCreateSession: vi.fn(),
  closeSession: vi.fn(),
}))

vi.mock('@xterm/xterm', () => ({ Terminal: xtermMock.MockTerminal }))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = fitMock.fit
  },
}))
vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: class {},
}))
vi.mock('../providers/TerminalSessionProvider', () => ({
  useTerminalSessions: vi.fn(() => terminalSessionsMock),
}))

const baseProps: ComponentProps<typeof TerminalPanel> = {
  visible: true,
  sessionId: 'session-one',
  workspace: 'workspace-one',
  onClose: vi.fn(),
}

function renderPanel(overrides: Partial<ComponentProps<typeof TerminalPanel>> = {}) {
  return render(<TerminalPanel {...baseProps} {...overrides} />)
}

describe('TerminalPanel', () => {
  beforeEach(() => {
    xtermMock.MockTerminal.instances.length = 0
    vi.clearAllMocks()
    Object.assign(sessionZero, { status: 'open', lastError: undefined, pid: 1234, activeProfile: { id: 'bash', label: 'Bash', path: '/bin/bash' } })
    Object.assign(sessionOne, { status: 'open', lastError: undefined, pid: 4321, activeProfile: { id: 'bash', label: 'Bash', path: '/bin/bash' } })
    Object.assign(splitSession, { status: 'open', lastError: undefined, pid: 5555, activeProfile: { id: 'bash', label: 'Bash', path: '/bin/bash' } })
    Object.assign(sessionTwo, { status: 'open', lastError: undefined, pid: 2468, activeProfile: { id: 'zsh', label: 'Zsh', path: '/bin/zsh' } })
  })

  it('abre o terminal, limpa a saída ativa, maximiza/restaura e fecha pelo callback', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPanel({ onClose })

    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-session-id', 'session-one')
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-pty-pid', '1234')
    const instance = xtermMock.MockTerminal.instances[0]
    expect(instance.open).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Limpar terminal' }))
    expect(instance.clear).toHaveBeenCalledTimes(1)
    expect(sessionZero.clearOutputBuffer).toHaveBeenCalledTimes(1)

    const maximize = screen.getByRole('button', { name: 'Maximizar terminal' })
    await user.click(maximize)
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveClass('is-maximized')
    expect(screen.getByRole('button', { name: 'Restaurar terminal' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restaurar terminal' }))
    expect(screen.getByRole('region', { name: 'Terminal' })).not.toHaveClass('is-maximized')

    await user.click(screen.getByRole('button', { name: 'Fechar terminal' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(terminalSessionsMock.closeSession).toHaveBeenCalledWith('session-one:0')
  })

  it('alterna abas Output/Problems e volta ao Terminal', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Output' }))
    expect(screen.getByRole('tabpanel', { name: 'Output' })).toBeInTheDocument()
    expect(screen.getByText(/vite v5 building/i)).toBeInTheDocument()

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
    await user.click(screen.getByRole('menuitemradio', { name: /Command Prompt/ }))
    expect(screen.queryByRole('menu', { name: 'Shells disponíveis' })).not.toBeInTheDocument()
    expect(terminalSessionsMock.closeSession).toHaveBeenCalledWith('session-one:0')
  })

  it('abre um novo terminal em aba, alterna o PID ativo e limpa só a instância focada', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Novo terminal' }))

    const instanceTabs = screen.getByRole('tablist', { name: 'Terminais abertos' })
    const tabs = within(instanceTabs).getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-pty-pid', '4321')

    await vi.waitFor(() => {
      expect(xtermMock.MockTerminal.instances.length).toBeGreaterThanOrEqual(2)
    })

    await user.click(screen.getByRole('button', { name: 'Limpar terminal' }))
    expect(xtermMock.MockTerminal.instances.filter((instance) => instance.clear.mock.calls.length > 0)).toHaveLength(1)
    expect(sessionOne.clearOutputBuffer).toHaveBeenCalledTimes(1)
    expect(sessionZero.clearOutputBuffer).not.toHaveBeenCalled()

    await user.click(screen.getByRole('tab', { name: 'Terminal Bash' }))
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-pty-pid', '1234')

    await user.click(screen.getByRole('button', { name: 'Limpar terminal' }))
    expect(xtermMock.MockTerminal.instances.reduce((total, instance) => total + instance.clear.mock.calls.length, 0)).toBe(2)
    expect(sessionZero.clearOutputBuffer).toHaveBeenCalledTimes(1)
  })

  it('divide o terminal, limpa a divisão focada e fecha a split', async () => {
    const user = userEvent.setup()
    renderPanel()

    expect(document.querySelector('.terminal-panes.is-split')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Dividir terminal' }))
    expect(document.querySelector('.terminal-panes.is-split')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Terminal dividido' })).toBeInTheDocument()

    await vi.waitFor(() => {
      expect(xtermMock.MockTerminal.instances.length).toBeGreaterThanOrEqual(2)
    })

    await user.click(screen.getByRole('button', { name: 'Limpar terminal' }))
    expect(xtermMock.MockTerminal.instances.filter((instance) => instance.clear.mock.calls.length > 0)).toHaveLength(1)
    expect(splitSession.clearOutputBuffer).toHaveBeenCalledTimes(1)
    expect(sessionZero.clearOutputBuffer).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Fechar divisão' }))
    expect(terminalSessionsMock.closeSession).toHaveBeenCalledWith('session-one-split')
  })

  it('fecha a instância secundária pela aba', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Novo terminal' }))
    await user.click(screen.getByRole('button', { name: 'Fechar terminal 2: Bash' }))

    expect(terminalSessionsMock.closeSession).toHaveBeenCalledWith('session-one:1')
    expect(screen.getByRole('tablist', { name: 'Terminais abertos' })).toBeInTheDocument()
    expect(within(screen.getByRole('tablist', { name: 'Terminais abertos' })).getAllByRole('tab')).toHaveLength(1)
  })

  it('abre o menu de contexto do terminal e dispara selecionar tudo / encerrar processo', async () => {
    const user = userEvent.setup()
    renderPanel()

    const terminal = document.querySelector('.terminal-container.is-active') as HTMLElement
    const instance = xtermMock.MockTerminal.instances[0]

    fireEvent.contextMenu(terminal, { clientX: 24, clientY: 24 })

    const menu = screen.getByRole('menu', { name: 'Ações do terminal' })
    expect(within(menu).getByRole('menuitem', { name: 'Copiar' })).toBeDisabled()
    expect(within(menu).getByRole('menuitem', { name: 'Colar' })).toBeEnabled()
    expect(within(menu).getByRole('menuitem', { name: 'Selecionar tudo' })).toBeEnabled()
    expect(within(menu).getByRole('menuitem', { name: 'Limpar terminal' })).toBeEnabled()
    expect(within(menu).getByRole('menuitem', { name: 'Encerrar processo' })).toBeEnabled()

    await user.click(within(menu).getByRole('menuitem', { name: 'Selecionar tudo' }))
    expect(instance.selectAll).toHaveBeenCalledTimes(1)

    fireEvent.contextMenu(terminal, { clientX: 24, clientY: 24 })
    await user.click(screen.getByRole('menuitem', { name: 'Encerrar processo' }))
    expect(sessionZero.closeSession).toHaveBeenCalledTimes(1)
  })

  it('mostra banner de erro quando a sessão PTY entra em falha', () => {
    Object.assign(sessionZero, {
      status: 'error',
      lastError: { message: 'Falha ao conectar ao PTY' },
    })

    renderPanel()

    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-pty-status', 'error')
    expect(screen.getByRole('status')).toHaveTextContent('Falha ao conectar ao PTY')
    expect(document.querySelector('.terminal-container.is-active')).toHaveAttribute('data-pty-status', 'error')
  })

  it('descarta a instância anterior ao trocar de sessão', () => {
    const view = renderPanel()
    const first = xtermMock.MockTerminal.instances[0]

    view.rerender(<TerminalPanel {...baseProps} sessionId="session-two" workspace="workspace-two" />)
    const second = xtermMock.MockTerminal.instances[xtermMock.MockTerminal.instances.length - 1]

    expect(first.dispose).toHaveBeenCalledTimes(1)
    expect(second?.open).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-session-id', 'session-two')
    expect(screen.getByRole('region', { name: 'Terminal' })).toHaveAttribute('data-pty-pid', '2468')
  })
})
