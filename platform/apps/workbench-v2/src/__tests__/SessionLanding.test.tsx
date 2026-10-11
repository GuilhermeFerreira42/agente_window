import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SessionLanding } from '../components/SessionLanding'

describe('SessionLanding (estado inicial vazio)', () => {
  it('mostra o cabeçalho de nova sessão e o input centralizado', () => {
    render(<SessionLanding workspace="vscode-main" onSubmit={() => {}} />)
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
    expect(screen.getByText('vscode-main')).toBeInTheDocument()
    const composer = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    expect(composer).toBeInTheDocument()
    expect(composer).toHaveFocus()
    expect(document.querySelector('.session-landing-center')).toBeInTheDocument()
  })

  it('mantém o botão enviar desabilitado enquanto o input está vazio', () => {
    render(<SessionLanding workspace="vscode-main" onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
  })

  it('envia o texto ao clicar em enviar', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SessionLanding workspace="vscode-main" onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), 'criar réplica fiel')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(onSubmit).toHaveBeenCalledWith('criar réplica fiel')
  })

  it('envia com Enter e não envia com Shift+Enter', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SessionLanding workspace="vscode-main" onSubmit={onSubmit} />)
    const input = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(input, 'primeira linha')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(onSubmit).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('primeira linha')
  })

  it('não envia texto apenas com espaços', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SessionLanding workspace="vscode-main" onSubmit={onSubmit} />)
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), '   ')
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('aciona o seletor de workspace do servidor', async () => {
    const user = userEvent.setup(); const onPickWorkspace = vi.fn()
    render(<SessionLanding workspace="workspace-local" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} />)
    await user.click(screen.getByRole('button', { name: /Workspace atual: workspace-local/ }))
    expect(onPickWorkspace).toHaveBeenCalledTimes(1)
  })

  it('mostra o nome do repositório selecionado', () => {
    render(<SessionLanding workspace="repo-b" onSubmit={() => {}} onPickWorkspace={() => {}} />)
    expect(screen.getByRole('button', { name: /Workspace atual: repo-b/ })).toBeInTheDocument()
  })

  it('bloqueia novos cliques enquanto o diálogo nativo está pendente', () => {
    render(<SessionLanding workspace="workspace-local" onSubmit={() => {}} onPickWorkspace={() => {}} workspacePickerPending />)
    const button = screen.getByRole('button', { name: /Workspace atual: workspace-local/ })
    expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('mantém o composer utilizável enquanto há seletor de workspace', async () => {
    const user = userEvent.setup()
    render(<SessionLanding workspace="repo-a" onSubmit={() => {}} onPickWorkspace={() => {}} />)
    const input = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(input, 'mensagem preservada')
    expect(input).toHaveValue('mensagem preservada')
  })

  it('explica que a escolha é de pasta real do disco', () => {
    render(<SessionLanding workspace="workspace-local" onSubmit={() => {}} onPickWorkspace={() => {}} />)
    expect(screen.getByText(/escolher pasta real do disco/i)).toBeInTheDocument()
  })

  it('suporta bloqueio explícito com motivo sem chamar o seletor', async () => {
    const user = userEvent.setup(); const onPickWorkspace = vi.fn()
    render(<SessionLanding workspace="workspace-local" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} workspaceSelectionDisabledReason="Política administrativa" />)
    const button = screen.getByRole('button', { name: /Política administrativa/ })
    expect(button).toBeDisabled(); await user.click(button); expect(onPickWorkspace).not.toHaveBeenCalled()
  })
})

