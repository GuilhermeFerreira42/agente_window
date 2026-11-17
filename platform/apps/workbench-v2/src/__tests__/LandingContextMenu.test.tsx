import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LandingContextMenu } from '../components/LandingContextMenu'
import { listRecentSessionWorkspaces } from '../services/sessions/sessionsClient'

vi.mock('../services/sessions/sessionsClient', () => ({ listRecentSessionWorkspaces: vi.fn() }))
beforeEach(() => { vi.mocked(listRecentSessionWorkspaces).mockResolvedValue(['/a/repo', '/b/repo']) })
const props = () => ({ contexto: 'chat' as const, workspace: 'Nenhuma pasta aberta', workspacePath: null,
  onChangeContexto: vi.fn(), onValidateWorkspacePath: vi.fn().mockResolvedValue(undefined) })

describe('LandingContextMenu — contexto único antes da criação', () => {
  it('não carrega histórico nem acessa pastas até abrir; recentes homônimas mostram a raiz completa', async () => {
    const user = userEvent.setup(); render(<LandingContextMenu {...props()} />)
    expect(listRecentSessionWorkspaces).not.toHaveBeenCalled()
    await user.click(screen.getByTestId('landing-contexto'))
    const dialog = await screen.findByRole('dialog', { name: 'Escolher chat ou pasta' })
    expect(await within(dialog).findByRole('button', { name: /\/a\/repo/ })).toBeVisible()
    expect(within(dialog).getByRole('button', { name: /\/b\/repo/ })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('landing-contexto')).toHaveFocus()
  })
  it('seleciona recente somente pela porta de validação existente', async () => {
    const user = userEvent.setup(); const p = props(); render(<LandingContextMenu {...p} />)
    await user.click(screen.getByTestId('landing-contexto'))
    await user.click(await screen.findByRole('button', { name: /\/b\/repo/ }))
    expect(p.onValidateWorkspacePath).toHaveBeenCalledWith('/b/repo')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(p.onChangeContexto).not.toHaveBeenCalled()
  })
  it('permite caminho digitado com Enter; erro mantém caminho e não altera contexto', async () => {
    const user = userEvent.setup(); const p = props()
    p.onValidateWorkspacePath.mockRejectedValueOnce(new Error('Pasta não existe'))
    render(<LandingContextMenu {...p} />)
    await user.click(screen.getByTestId('landing-contexto'))
    const input = screen.getByRole('textbox', { name: 'Buscar ou digitar caminho da pasta' })
    await user.type(input, 'C:\\projeto{Enter}')
    expect(await screen.findByRole('alert')).toHaveTextContent('Pasta não existe')
    expect(input).toHaveValue('C:\\projeto')
    expect(p.onChangeContexto).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(p.onValidateWorkspacePath).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('histórico indisponível não bloqueia entrada manual e não finge lista vazia', async () => {
    vi.mocked(listRecentSessionWorkspaces).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup(); const p = props(); render(<LandingContextMenu {...p} />)
    await user.click(screen.getByTestId('landing-contexto'))
    expect(await screen.findByText(/Não foi possível carregar o histórico/)).toBeVisible()
    await user.type(screen.getByRole('textbox'), '/outro{Enter}')
    expect(p.onValidateWorkspacePath).toHaveBeenCalledWith('/outro')
  })
  it('trava escolha durante validação, sem dupla chamada nem troca para Chat', async () => {
    let release!: () => void; const p = props()
    p.onValidateWorkspacePath.mockReturnValue(new Promise<void>((resolve) => { release = resolve }))
    const user = userEvent.setup(); render(<LandingContextMenu {...p} />)
    await user.click(screen.getByTestId('landing-contexto'))
    await user.click(await screen.findByRole('button', { name: /\/a\/repo/ }))
    expect(screen.getByRole('button', { name: /Chat.*Conversa sem pasta/ })).toBeDisabled()
    await user.keyboard('{Enter}{Enter}')
    expect(p.onValidateWorkspacePath).toHaveBeenCalledTimes(1)
    await act(async () => release())
  })
  it('teclado navega e Chat notifica o dono; clique fora fecha', async () => {
    const user = userEvent.setup(); const p = props(); render(<LandingContextMenu {...p} contexto="workspace" />)
    await user.click(screen.getByTestId('landing-contexto'))
    await user.keyboard('{ArrowDown}{Enter}')
    expect(p.onChangeContexto).toHaveBeenCalledWith('chat')
    await user.click(screen.getByTestId('landing-contexto'))
    await user.click(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
