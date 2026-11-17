// ============================================================================
// C-2 — c2SessaoLateral (C2-T16/T17 · R10/R12): projeção lateral Chat ×
// grupos por workspacePath (homônimos distintos, sem inferir por `workspace`),
// colocação fixadas/quick/archived preservada, Personalizações no topo abrindo
// o MESMO modal e legado sem `contexto` intacto.
// ============================================================================

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionSidebar } from '../components/SessionSidebar'
import type { Session } from '../types'

function sessao(parcial: Partial<Session> & Pick<Session, 'id' | 'title'>): Session {
  return {
    workspace: 'Chat',
    workspacePath: null,
    contexto: { tipo: 'chat' },
    section: 'today',
    status: 'completed',
    updated: 'agora',
    diffAdded: 0,
    diffRemoved: 0,
    branch: null,
    chats: [{ id: `${parcial.id}-main`, title: 'Chat principal', status: 'completed', messages: [] }],
    mainChatId: `${parcial.id}-main`,
    ...parcial,
  }
}

const sessoesComContexto: Session[] = [
  sessao({ id: 'c1', title: 'Chat um' }),
  sessao({ id: 'c2', title: 'Chat dois' }),
  sessao({ id: 'p1', title: 'Sessão fixada', pinned: true }),
  // Dois workspaces HOMÔNIMOS (mesmo nome, raízes diferentes) — sem colisão.
  sessao({ id: 'w1', title: 'Repo alpha', workspace: 'repo-x', workspacePath: '/home/u/alpha/repo-x', contexto: { tipo: 'workspace' } }),
  sessao({ id: 'w2', title: 'Repo beta', workspace: 'repo-x', workspacePath: '/home/u/beta/repo-x', contexto: { tipo: 'workspace' } }),
]

function props(onOpenPersonalizations = vi.fn()) {
  return {
    sessions: sessoesComContexto,
    visible: true,
    activeSessionId: 'c1',
    activeChatId: 'c1-main',
    onSelectSession: vi.fn(),
    onSelectChat: vi.fn(),
    onNewSession: vi.fn(),
    onTogglePinned: vi.fn(),
    onToggleArchived: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn(),
    onApprove: vi.fn(),
    onOpenDiff: vi.fn(),
    onReorderSessions: vi.fn(),
    onAssignGroup: vi.fn(),
    onRemoveGroup: vi.fn(),
    onOpenPersonalizations,
  }
}

describe('c2SessaoLateral — C2-T16 projeção Chat × pastas', () => {
  it('sessões de Chat e de pasta ficam em grupos separados, sem inferir por workspace', () => {
    render(<SessionSidebar {...props()} />)
    const chats = screen.getByTestId('sidebar-secao-chats')
    expect(within(chats).getByText('Chat um')).toBeInTheDocument()
    expect(within(chats).getByText('Chat dois')).toBeInTheDocument()
    // A fixada mantém a colocação (Fixadas) e NÃO entra na seção Chat.
    expect(screen.getByText('Fixadas')).toBeInTheDocument()
    expect(within(chats).queryByText('Sessão fixada')).not.toBeInTheDocument()
    // As pastas aparecem como grupos próprios.
    expect(within(chats).queryByText('Repo alpha')).not.toBeInTheDocument()
    expect(within(chats).queryByText('Repo beta')).not.toBeInTheDocument()
  })

  it('workspaces homônimos viram grupos DISTINTOS com a raiz canônica no atributo', () => {
    render(<SessionSidebar {...props()} />)
    const pastas = screen.getAllByTestId('sidebar-grupo-pasta')
    expect(pastas).toHaveLength(2)
    const raizes = pastas.map((grupo) => grupo.getAttribute('data-workspace-path'))
    expect(raizes).toEqual(['/home/u/alpha/repo-x', '/home/u/beta/repo-x'])
    expect(pastas[0]).toHaveTextContent('repo-x')
    expect(pastas[1]).toHaveTextContent('repo-x')
    expect(within(pastas[0]).getByText('Repo alpha')).toBeInTheDocument()
    expect(within(pastas[1]).getByText('Repo beta')).toBeInTheDocument()
  })

  it('lista legada (sem campo contexto) mantém o formato antigo — R10', () => {
    // Fixture antiga: MESMA sessão sem o campo contexto (modo legado R10).
    const legado: Session[] = [{ ...sessoesComContexto[0], contexto: undefined }]
    render(<SessionSidebar {...props()} sessions={legado} />)
    expect(screen.queryByTestId('sidebar-secao-chats')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-grupo-pasta')).not.toBeInTheDocument()
    expect(screen.getByText('Hoje')).toBeInTheDocument()
  })
})

describe('c2SessaoLateral — C2-T17 Personalizações no topo → MESMO modal', () => {
  it('botão no topo chama o MESMO handler de Personalizações e os atalhos da base saíram', async () => {
    const user = userEvent.setup()
    const onOpenPersonalizations = vi.fn()
    render(<SessionSidebar {...props(onOpenPersonalizations)} />)
    const botao = screen.getByTestId('sidebar-personalizacoes')
    expect(botao).toBeInTheDocument()
    await user.click(botao)
    expect(onOpenPersonalizations).toHaveBeenCalledTimes(1)
    expect(onOpenPersonalizations).toHaveBeenCalledWith('visao')
    // Atalhos por seção na base da sidebar: removidos (mesmo modal, um ponto).
    expect(document.querySelector('.personalizations-shortcuts')).not.toBeInTheDocument()
    // "Novo" continua no topo, ao lado.
    expect(screen.getByRole('button', { name: 'Nova sessão' })).toBeInTheDocument()
  })
})
