import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SessionLanding } from '../components/SessionLanding'

describe('SessionLanding (estado inicial vazio)', () => {
  it('mostra o cabeçalho de nova sessão e o input centralizado', () => {
    render(<SessionLanding workspace="vscode-main" onSubmit={() => {}} />)
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
    expect(screen.getByText('vscode-main')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })).toBeInTheDocument()
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
})

