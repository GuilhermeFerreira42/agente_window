import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ texto: 'primeiro texto preservado' }) }))
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
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ texto: 'criar réplica fiel' }) }))
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
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ snapshot: expect.objectContaining({ texto: 'primeira linha' }) }))
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
    await user.click(screen.getByTestId('landing-contexto'))
    await user.click(screen.getByRole('button', { name: 'Abrir pasta…' }))
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

  it('permite caminho manual mesmo sem seletor nativo', async () => {
    const user = userEvent.setup(); const validate = vi.fn().mockResolvedValue(undefined)
    render(<SessionLanding workspace="fixture" onSubmit={() => {}} onValidateWorkspacePath={validate} isFileSystemSupported={false} />)
    await user.click(screen.getByTestId('landing-contexto'))
    await user.type(screen.getByRole('textbox', { name: 'Buscar ou digitar caminho da pasta' }), '/home{Enter}')
    expect(validate).toHaveBeenCalledWith('/home')
  })

  it('suporta bloqueio explícito com motivo sem chamar o seletor', async () => {
    const user = userEvent.setup(); const onPickWorkspace = vi.fn()
    render(<SessionLanding workspace="workspace-local" contexto="workspace" onSubmit={() => {}} onPickWorkspace={onPickWorkspace} workspaceSelectionDisabledReason="Política administrativa" />)
    const button = screen.getByRole('button', { name: /Política administrativa/ })
    expect(button).toBeDisabled(); await user.click(button); expect(onPickWorkspace).not.toHaveBeenCalled()
  })
})

// C-1: Chat continua sem raiz; a escolha agora vive em um único menu.
describe('SessionLanding — contexto único', () => {
  it('default Chat, sem dicas e sem botões separados Chat/Pasta', () => {
    render(<SessionLanding workspace="Nenhuma pasta aberta" contexto="chat" onChangeContexto={() => {}} onSubmit={() => {}} />)
    expect(screen.getByTestId('landing-contexto')).toHaveTextContent('Chat')
    expect(screen.queryByTestId('contexto-workspace')).not.toBeInTheDocument()
    expect(screen.queryByTestId('landing-dica')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('SessionLanding — C-3a cópia na pasta do projeto (antes do 1º envio)', () => {
  function anexar(user: ReturnType<typeof userEvent.setup>, nome = 'nota.txt') {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], nome, { type: 'text/plain' })
    return user.upload(input, file)
  }

  it('informa o destino uploads/ antes do primeiro envio', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(true)
    render(
      <SessionLanding
        workspace="projeto"
        workspacePath="/tmp/projeto"
        workspaceName="projeto"
        contexto="workspace"
        onSubmit={onSubmit}
      />,
    )
    await anexar(user)
    expect(await screen.findByText('Arquivos novos serão salvos em uploads/ do projeto.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), 'primeiro envio')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    const dialogo = await screen.findByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados/ })
    await user.click(within(dialogo).getByRole('button', { name: 'Continuar com o texto' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const snapshot = onSubmit.mock.calls[0][0].snapshot as { anexos: Array<{ name: string }> }
    expect(snapshot.anexos[0].name).toBe('nota.txt')
  })

  it('NÃO aparece em Chat sem pasta', async () => {
    const user = userEvent.setup()
    render(<SessionLanding workspace="Chat" contexto="chat" onSubmit={vi.fn().mockResolvedValue(true)} />)
    await anexar(user)
    expect(await screen.findByRole('list', { name: 'Arquivos anexados' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Salvar cópia na pasta do projeto' })).toBeNull()
  })

  it('falha no envio preserva o anexo para a retentativa', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('falha sintética')).mockResolvedValueOnce(true)
    render(
      <SessionLanding
        workspace="projeto"
        workspacePath="/tmp/projeto"
        workspaceName="projeto"
        contexto="workspace"
        onSubmit={onSubmit}
      />,
    )
    await anexar(user)
    expect(await screen.findByText('Arquivos novos serão salvos em uploads/ do projeto.')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' }), 'vai falhar')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    const dialogo = await screen.findByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados/ })
    await user.click(within(dialogo).getByRole('button', { name: 'Continuar com o texto' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))

    // Depois da falha o destino e o anexo permanecem.
    expect(await screen.findByText('Arquivos novos serão salvos em uploads/ do projeto.')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Arquivos anexados' })).toBeInTheDocument()
  })
})
