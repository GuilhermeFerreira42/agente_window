import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionSidebar } from '../components/SessionSidebar'
import type { Session } from '../types'

const sessions: Session[] = [
  {
    id: 's-test',
    title: 'Sessão demonstrativa',
    workspace: 'workspace-test',
    workspacePath: '~/workspace-test',
    section: 'today',
    status: 'completed',
    updated: 'agora',
    diffAdded: 3,
    diffRemoved: 1,
    branch: 'main',
    chats: [
      { id: 'chat-main', title: 'Chat principal', status: 'completed', messages: [] },
      { id: 'chat-child', title: 'Chat filho', status: 'completed', messages: [] },
    ],
    mainChatId: 'chat-main',
  },
]

function renderSidebar() {
  const props = {
    sessions,
    visible: true,
    activeSessionId: 's-test',
    activeChatId: 'chat-main',
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
  }
  return { ...render(<SessionSidebar {...props} />), props }
}

describe('SessionSidebar', () => {
  it('aplica is-hidden e aria-hidden quando não está visível', () => {
    const { props, unmount } = renderSidebar()
    unmount()
    const view = render(<SessionSidebar {...props} visible={false} />)
    const aside = view.container.querySelector('.sessions-sidebar')
    expect(aside).toHaveClass('is-hidden')
    expect(aside).toHaveAttribute('aria-hidden', 'true')
  })

  it('seleciona o chat filho e preserva o id da sessão', async () => {
    const user = userEvent.setup()
    const { props } = renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Expandir chats' }))
    await user.click(screen.getByText('Chat filho'))

    expect(props.onSelectSession).toHaveBeenCalledWith('s-test')
    expect(props.onSelectChat).toHaveBeenCalledWith('s-test', 'chat-child')
  })

  it('expande/recolhe chats e encaminha ações de sessão', async () => {
    const user = userEvent.setup()
    const { props } = renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Expandir chats' }))
    expect(screen.getByText('Chat filho')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Recolher chats' }))
    expect(screen.queryByText('Chat filho')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Expandir chats' }))
    expect(screen.getByText('Chat filho')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fixar' }))
    expect(props.onTogglePinned).toHaveBeenCalledWith('s-test')
  })

  it('seleciona chat filho por teclado (Enter) e aprova aprovação do chat', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    const sessionWithApproval: Session = {
      ...sessions[0],
      chats: [
        { id: 'chat-main', title: 'Chat principal', status: 'completed', messages: [] },
        { id: 'chat-child', title: 'Chat filho', status: 'needs-input', approval: 'Aprovar execução do chat', messages: [] },
      ],
    }
    render(<SessionSidebar {...props} sessions={[sessionWithApproval]} />)

    await user.click(screen.getByRole('button', { name: 'Expandir chats' }))

    // Seleção do chat filho via teclado (Enter) sobre a linha role="button".
    const childRow = screen.getByText('Chat filho').closest('[role="button"]') as HTMLElement
    childRow.focus()
    await user.keyboard('{Enter}')
    expect(props.onSelectChat).toHaveBeenCalledWith('s-test', 'chat-child')

    // Aprovação dentro do card do chat aninhado.
    await user.click(screen.getByRole('button', { name: 'Permitir' }))
    expect(props.onApprove).toHaveBeenCalledWith('s-test', 'chat-child')
  })

  it('o botão de buscar sessões foca o campo de filtro', async () => {
    const user = userEvent.setup()
    renderSidebar()

    await user.click(screen.getByRole('button', { name: 'Buscar sessões' }))
    expect(screen.getByPlaceholderText('Filtrar sessões')).toHaveFocus()
  })

  it('filtra sessões pelo campo da sidebar mantendo a sessão ativa sempre visível', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    const otherSession: Session = { ...sessions[0], id: 's-other', title: 'Outra sessão', chats: [], mainChatId: 'chat-main' }
    const view = render(<SessionSidebar {...props} sessions={[sessions[0], otherSession]} activeSessionId="s-test" />)

    const filter = view.getByPlaceholderText('Filtrar sessões')
    await user.type(filter, 'inexistente')

    // A sessão que não corresponde ao filtro E não é a ativa desaparece...
    expect(view.queryByText('Outra sessão')).not.toBeInTheDocument()
    // ...mas a sessão ativa permanece visível mesmo sem casar com o filtro (paridade com o original).
    expect(view.getByText('Sessão demonstrativa')).toBeInTheDocument()
    expect(view.queryByText('Nenhuma sessão encontrada.')).not.toBeInTheDocument()
  })

  it('não duplica uma sessão fixada no agrupamento temporal e recolhe a seção', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    const pinnedToday = { ...sessions[0], title: 'Fixada hoje', pinned: true }
    const view = render(<SessionSidebar {...props} sessions={[pinnedToday]} />)

    expect(view.container.querySelectorAll('.session-title-text')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /Fixadas/ })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: /Fixadas/ }))
    expect(view.container.querySelectorAll('.session-title-text')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /Fixadas/ }))

    expect(screen.queryByText('Fixada hoje')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Fixadas/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('encaminha ações, aprovação, rename por F2 e estado de atenção', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    const attentionSession = {
      ...sessions[0],
      status: 'needs-input' as const,
      unread: true,
      approval: 'Aprovar comando',
      ciFailure: true,
    }
    render(<SessionSidebar {...props} sessions={[attentionSession]} />)

    const row = screen.getByText('Sessão demonstrativa').closest('[role="button"]')
    expect(row).toHaveClass('is-needs-input', 'is-unread')
    expect(row).toHaveAttribute('aria-current', 'true')

    await user.click(screen.getByRole('button', { name: 'Permitir' }))
    expect(props.onApprove).toHaveBeenCalledWith('s-test', undefined)
    expect(props.onSelectSession).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Fix CI' }))
    expect(props.onOpenDiff).toHaveBeenCalledWith('s-test')

    await user.click(row as HTMLElement)
    await user.keyboard('{F2}')
    const rename = screen.getByRole('textbox', { name: 'Renomear sessão' })
    await user.clear(rename)
    await user.type(rename, 'Sessão renomeada')
    await user.keyboard('{Enter}')
    expect(props.onRename).toHaveBeenCalledWith('s-test', 'Sessão renomeada')
  })

  // E6 — lista avançada: seções derivadas do domínio (buildSessionsList).
  it('agrupa Quick Chats, grupos personalizados e exclui runs de automação', () => {
    const { props, unmount } = renderSidebar()
    unmount()
    const many: Session[] = [
      { ...sessions[0], id: 'p1', title: 'Fixada', pinned: true },
      { ...sessions[0], id: 'q1', title: 'Rápida', isQuickChat: true },
      { ...sessions[0], id: 'g1', title: 'Do grupo', customGroup: 'a11y' },
      { ...sessions[0], id: 'a1', title: 'Automática', automation: true },
      { ...sessions[0], id: 'd1', title: 'Do dia' },
    ]
    render(<SessionSidebar {...props} sessions={many} activeSessionId="d1" />)

    expect(screen.getByRole('button', { name: /Fixadas/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Quick Chats/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acessibilidade/ })).toBeInTheDocument()
    expect(screen.getByText('Do dia')).toBeInTheDocument()
    // Automação nunca aparece na lista primária.
    expect(screen.queryByText('Automática')).not.toBeInTheDocument()
  })

  it('filtra por estado de leitura (não lidas)', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    const items: Session[] = [
      { ...sessions[0], id: 'r1', title: 'Lida', unread: false },
      { ...sessions[0], id: 'u1', title: 'Não lida', unread: true },
    ]
    render(<SessionSidebar {...props} sessions={items} activeSessionId="x" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por leitura' }), 'unread')
    expect(screen.getByText('Não lida')).toBeInTheDocument()
    expect(screen.queryByText('Lida')).not.toBeInTheDocument()
  })

  // R-020: capping de workspaces — fora de busca só os primeiros N workspaces
  // aparecem; o do workspace ativo é promovido; busca revela todos; botão expande.
  it('aplica capping de workspaces e promove o workspace ativo', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    // 5 workspaces na mesma seção "today"; o ativo é o 5º (deve ser promovido).
    const items: Session[] = ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map((ws, index) => ({
      ...sessions[0],
      id: `s-${ws}`,
      title: `Sessão ${ws}`,
      workspace: `ws-${ws}`,
      workspacePath: `~/ws-${ws}`,
      createdSeq: index + 1,
    }))
    render(<SessionSidebar {...props} sessions={items} activeSessionId="s-echo" />)

    const workspaceHeaders = () => Array.from(document.querySelectorAll('.workspace-section-header')).map((el) => el.textContent)

    // Capping em 3: só 3 workspaces visíveis, e o ativo (ws-echo) foi promovido.
    const capped = workspaceHeaders()
    expect(capped).toHaveLength(3)
    expect(capped).toContain('ws-echo')

    // Botão "Mostrar mais N workspaces" revela os demais.
    await user.click(screen.getByRole('button', { name: /Mostrar mais 2 workspaces/ }))
    expect(workspaceHeaders()).toHaveLength(5)

    // Recolhe de volta.
    await user.click(screen.getByRole('button', { name: /Mostrar menos workspaces/ }))
    expect(workspaceHeaders()).toHaveLength(3)

    // Busca ignora o capping (revela todos).
    await user.type(screen.getByPlaceholderText('Filtrar sessões'), 'Sessão')
    expect(workspaceHeaders()).toHaveLength(5)
  })

  it('ordena por criação quando o modo de ordenação muda', async () => {
    const user = userEvent.setup()
    const { props, unmount } = renderSidebar()
    unmount()
    const items: Session[] = [
      { ...sessions[0], id: 'old', title: 'Antiga', createdSeq: 1 },
      { ...sessions[0], id: 'new', title: 'Recente', createdSeq: 9 },
    ]
    render(<SessionSidebar {...props} sessions={items} activeSessionId="x" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ordenar sessões' }), 'created')
    const titles = screen.getAllByText(/Antiga|Recente/).map((node) => node.textContent)
    expect(titles.indexOf('Recente')).toBeLessThan(titles.indexOf('Antiga'))
  })
})

