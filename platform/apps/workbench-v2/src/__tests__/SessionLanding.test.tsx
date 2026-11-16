import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SessionLanding } from '../components/SessionLanding'

describe('SessionLanding — confirmação de criação e rascunho pendente', () => {
  it.each(['recusa', 'rejeição'] as const)('preserva texto e impede corrida até %s; permite retentativa', async (resultado) => {
    let resolver!: (value: boolean) => void
    let rejeitar!: (reason: Error) => void
    const espera = new Promise<boolean>((resolve, reject) => { resolver = resolve; rejeitar = reject })
    const onSubmit = vi.fn().mockImplementationOnce(() => espera).mockResolvedValue(true)
    const user = userEvent.setup()
    render(<SessionLanding workspace="fixture" onSubmit={onSubmit} />)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'primeiro texto preservado')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(campo).toHaveValue('primeiro texto preservado')
    expect(campo).toHaveAttribute('readonly')
    expect(screen.getByRole('status')).toHaveTextContent('Sua mensagem está preservada')
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
    await user.type(campo, 'segundo texto durante a espera')
    fireEvent.change(campo, { target: { value: 'mudança concorrente' } })
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(campo).toHaveValue('primeiro texto preservado')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    await act(async () => {
      if (resultado === 'recusa') resolver(false)
      else rejeitar(new Error('falha de criação'))
      await espera.catch(() => {})
    })
    expect(campo).not.toHaveAttribute('readonly')
    expect(campo).toHaveValue('primeiro texto preservado')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(onSubmit).toHaveBeenLastCalledWith('primeiro texto preservado')
    expect(campo).toHaveValue('')
  })

  it('preserva o rascunho e libera a edição se o callback lançar antes de retornar', async () => {
    const user = userEvent.setup()
    render(<SessionLanding workspace="fixture" onSubmit={() => { throw new Error('falha síncrona') }} />)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'rascunho intacto')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(campo).toHaveValue('rascunho intacto')
    expect(campo).not.toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled()
  })
})

describe('SessionLanding (estado inicial vazio)', () => {
  it('mostra o cabeçalho de nova sessão e o input centralizado', () => {
    render(<SessionLanding workspace="vscode-main" contexto="workspace" onSubmit={() => {}} />)
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
    expect(screen.getByText('vscode-main')).toBeInTheDocument()
    const composer = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    expect(composer).toBeInTheDocument()
    expect(composer).toHaveFocus()
    expect(document.querySelector('.session-landing-center')).toBeInTheDocument()
  })

  it('mantém o botão enviar desabilitado enquanto o input está vazio', () => {
    render(<SessionLanding workspace="vscode-main" contexto="workspace" onSubmit={() => {}} />)
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
    render(<SessionLanding workspace="workspace-local" contexto="workspace" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} />)
    await user.click(screen.getByRole('button', { name: /Workspace atual: workspace-local/ }))
    expect(onPickWorkspace).toHaveBeenCalledTimes(1)
  })

  it('mostra o nome do repositório selecionado', () => {
    render(<SessionLanding workspace="repo-b" contexto="workspace" onSubmit={() => {}} onPickWorkspace={() => {}} />)
    expect(screen.getByRole('button', { name: /Workspace atual: repo-b/ })).toBeInTheDocument()
  })

  it('bloqueia novos cliques enquanto o diálogo nativo está pendente', () => {
    render(<SessionLanding workspace="workspace-local" contexto="workspace" onSubmit={() => {}} onPickWorkspace={() => {}} workspacePickerPending />)
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

  it('explica a escolha e permite caminho manual validado quando o diálogo não existe', async () => {
    const user = userEvent.setup(); const onValidateWorkspacePath = vi.fn().mockResolvedValue(undefined)
    const onListWorkspaceDirectories = vi.fn().mockResolvedValue([{ name: 'home', path: '/home' }, { name: 'tmp', path: '/tmp' }])
    render(<SessionLanding workspace="workspace-local" contexto="workspace" onSubmit={() => {}} onPickWorkspace={() => {}} onValidateWorkspacePath={onValidateWorkspacePath} onListWorkspaceDirectories={onListWorkspaceDirectories} isFileSystemSupported={false} />)
    expect(screen.getByText(/seletor nativo não está disponível/i)).toBeInTheDocument()
    await user.type(screen.getByRole('combobox', { name: 'Caminho manual do workspace' }), '/')
    await user.click(await screen.findByRole('option', { name: /home/ }))
    expect(screen.getByRole('combobox', { name: 'Caminho manual do workspace' })).toHaveValue('/home/')
    await user.click(screen.getByRole('button', { name: 'Usar pasta' }))
    expect(onValidateWorkspacePath).toHaveBeenCalledWith('/home/')
  })

  it('suporta bloqueio explícito com motivo sem chamar o seletor', async () => {
    const user = userEvent.setup(); const onPickWorkspace = vi.fn()
    render(<SessionLanding workspace="workspace-local" contexto="workspace" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} workspaceSelectionDisabledReason="Política administrativa" />)
    const button = screen.getByRole('button', { name: /Política administrativa/ })
    expect(button).toBeDisabled(); await user.click(button); expect(onPickWorkspace).not.toHaveBeenCalled()
  })
})

// C-1 (SPEC C §2) — modalidade explícita na landing: Chat é o DEFAULT, sem
// pasta, sem seletor de pasta; Pasta aparece só após escolha explícita.
describe('SessionLanding — C-1 modalidade Chat/Pasta', () => {
  it('C-T05 — default é Chat: chip "Chat sem pasta" e NENHUM seletor de pasta visível', () => {
    const onPickWorkspace = vi.fn()
    render(<SessionLanding workspace="Nenhuma pasta aberta" contexto="chat" onChangeContexto={() => {}} onSubmit={() => {}} onPickWorkspace={onPickWorkspace} onValidateWorkspacePath={async () => undefined} />)
    expect(screen.getByTestId('contexto-chat')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('landing-chat-chip')).toHaveTextContent('Chat sem pasta')
    expect(screen.queryByRole('button', { name: /Workspace atual/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/seletor nativo não está disponível/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Caminho manual do workspace' })).not.toBeInTheDocument()
  })

  it('C-T05 — alternar para Pasta notifica onChangeContexto e, com o estado aplicado, revela o seletor', async () => {
    const user = userEvent.setup()
    const onChangeContexto = vi.fn()
    const onPickWorkspace = vi.fn()
    const { rerender } = render(<SessionLanding workspace="repo-x" contexto="chat" onChangeContexto={onChangeContexto} onSubmit={() => {}} onPickWorkspace={onPickWorkspace} />)
    expect(screen.queryByRole('button', { name: /Workspace atual/ })).not.toBeInTheDocument()
    await user.click(screen.getByTestId('contexto-workspace'))
    expect(onChangeContexto).toHaveBeenCalledWith('workspace')
    rerender(<SessionLanding workspace="repo-x" contexto="workspace" onChangeContexto={onChangeContexto} onSubmit={() => {}} onPickWorkspace={onPickWorkspace} />)
    expect(screen.getByRole('button', { name: /Workspace atual: repo-x/ })).toBeInTheDocument()
    expect(screen.queryByTestId('landing-chat-chip')).not.toBeInTheDocument()
  })

  it('C-T05 — em Pasta, escolher pasta dispara onPickWorkspace; em Chat o chip não dispara nada', async () => {
    const user = userEvent.setup()
    const onPickWorkspace = vi.fn()
    const { rerender } = render(<SessionLanding workspace="repo-x" contexto="chat" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} />)
    expect(screen.queryByRole('button', { name: /Workspace atual/ })).not.toBeInTheDocument()
    rerender(<SessionLanding workspace="repo-x" contexto="workspace" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} />)
    await user.click(screen.getByRole('button', { name: /Workspace atual: repo-x/ }))
    expect(onPickWorkspace).toHaveBeenCalledTimes(1)
  })
})

