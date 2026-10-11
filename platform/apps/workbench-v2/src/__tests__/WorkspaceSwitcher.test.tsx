import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkspaceSwitcher } from '../components/TopBar/WorkspaceSwitcher'

const listing = (path: string) => ({ path, realpath: path, parent: '/', folders: path === '/' ? [{ name: 'home', path: '/home', isDir: true }, { name: 'mnt', path: '/mnt', isDir: true }, { name: 'tmp', path: '/tmp', isDir: true }] : [] })

beforeEach(() => vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => new Response(JSON.stringify(listing(new URL(String(input), 'http://local').searchParams.get('path') || '/')), { status: 200, headers: { 'Content-Type': 'application/json' } })))

describe('WorkspaceSwitcher', () => {
  it('lista diretórios da raiz e preenche a seleção', async () => {
    const user = userEvent.setup()
    render(<WorkspaceSwitcher currentPath="/home/user" onConfirm={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'Workspace atual' })
    await user.click(input); await user.clear(input); await user.type(input, '/')
    expect(await screen.findByRole('option', { name: /mnt/ })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /tmp/ }))
    expect(input).toHaveValue('/tmp/')
  })

  it('suporta setas, Tab e Escape', async () => {
    const user = userEvent.setup()
    render(<WorkspaceSwitcher currentPath="/home/user" onConfirm={vi.fn()} />)
    const input = screen.getByRole('combobox', { name: 'Workspace atual' })
    await user.click(input); await user.clear(input); await user.type(input, '/')
    await screen.findByRole('option', { name: /home/ })
    await user.keyboard('{ArrowDown}{Tab}')
    expect(input).toHaveValue('/mnt/')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('/home/user')
  })

  it('confirma o path digitado pelo botão', async () => {
    const user = userEvent.setup(); const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<WorkspaceSwitcher currentPath="/home/user" onConfirm={onConfirm} />)
    const input = screen.getByRole('combobox', { name: 'Workspace atual' })
    await user.click(input); await user.clear(input); await user.type(input, '/tmp')
    await user.click(screen.getByRole('button', { name: /Usar esta pasta/ }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('/tmp'))
  })
})
