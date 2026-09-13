import { useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Columns2,
  CircleCheck,
  CircleDot,
  FilePlus2,
  Folder,
  GitBranch,
  GitPullRequest,
  LoaderCircle,
  MessageCircle,
  Pin,
  PinOff,
  Search,
  Trash2,
  Wrench,
} from 'lucide-react'
import type { NestedChat, Session, SessionStatus } from '../types'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import { DragTypes, canReorderSessions } from '../domain/dragAndDrop'
import {
  EMPTY_FILTERS,
  applyWorkspaceCapping,
  buildSessionsList,
  type SessionFilters,
  type SessionGroup,
  type SortMode,
} from '../domain/sessionsList'

// Capping de workspaces (SESSIONS_LIST.md §Workspace grouping): fora de busca,
// só os primeiros N workspaces de uma seção aparecem; o do workspace ativo é
// sempre promovido; a busca revela todos.
const WORKSPACE_CAP = 3
import { customGroupLabels } from '../data'
import { isNavigationKey, nextRovingIndex } from '../domain/keyboardNavigation'
import { createSectionOrderState, orderCustomGroups } from '../domain/sectionOrder'

interface SessionSidebarProps {
  sessions: Session[]
  visible: boolean
  activeSessionId: string
  activeChatId: string
  onSelectSession: (id: string) => void
  onSelectChat: (sessionId: string, chatId: string) => void
  onNewSession: () => void
  onTogglePinned: (id: string) => void
  onToggleArchived: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onApprove: (sessionId: string, chatId?: string) => void
  onOpenDiff: (sessionId: string) => void
  onReorderSessions: (fromId: string, toId: string) => void
  /** (R-012) Atribui uma sessão a um grupo customizado. */
  onAssignGroup: (sessionId: string, groupId: string) => void
  /** (R-012) Remove uma sessão do grupo customizado. */
  onRemoveGroup: (sessionId: string) => void
  /** (E14) Abre a sessão como peer ao lado da ativa no Sessions Part grid. */
  onOpenBeside?: (sessionId: string) => void
}

function StatusIcon({ status, unread = false, archived = false }: { status: SessionStatus | NestedChat['status']; unread?: boolean; archived?: boolean }) {
  if (status === 'working') return <LoaderCircle size={16} className="spin-icon" />
  if (status === 'needs-input') return <CircleAlert size={16} />
  if (status === 'error') return <CircleAlert size={16} />
  if (archived) return <CircleCheck size={16} />
  if (unread) return <CircleDot size={16} />
  return <CircleCheck size={16} />
}

function NestedChatRow({
  chat,
  active,
  last,
  onSelect,
  onApprove,
  onContextMenu,
}: {
  chat: NestedChat
  active: boolean
  last: boolean
  onSelect: () => void
  onApprove: () => void
  onContextMenu: (event: React.MouseEvent) => void
}) {
  return (
    <div className={`nested-chat-row${active ? ' is-selected' : ''}${chat.status === 'needs-input' ? ' is-needs-input' : ''}${last ? ' is-last' : ''}`} onClick={onSelect} onContextMenu={onContextMenu} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect()}>
      <div className="nested-chat-title-row">
        <span className="nested-chat-icon"><MessageCircle size={12} /></span>
        <span className="nested-chat-title">{chat.title}</span>
        <span className="nested-chat-status" title={chat.status}>
          <StatusIcon status={chat.status} unread={chat.unread} />
        </span>
        {chat.unread && <span className="unread-dot" />}
      </div>
      {chat.approval && (
        <div className="session-approval-card" onClick={(event) => event.stopPropagation()}>
          <Wrench size={12} />
          <span className="session-approval-text">{chat.approval}</span>
          <button className="primary-button" type="button" onClick={onApprove}>Permitir</button>
        </div>
      )}
    </div>
  )
}

function SessionRow({
  session,
  active,
  activeChatId,
  expanded,
  editing,
  onSelect,
  onSelectChat,
  onToggleExpanded,
  onTogglePinned,
  onToggleArchived,
  onDelete,
  onApprove,
  onOpenDiff,
  onStartRename,
  onFinishRename,
  onContextMenu,
  onChatContextMenu,
  dragState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  session: Session
  active: boolean
  activeChatId: string
  expanded: boolean
  editing: boolean
  onSelect: () => void
  onSelectChat: (chatId: string) => void
  onToggleExpanded: () => void
  onTogglePinned: () => void
  onToggleArchived: () => void
  onDelete: () => void
  onApprove: (chatId?: string) => void
  onOpenDiff: () => void
  onStartRename: () => void
  onFinishRename: (value: string) => void
  onContextMenu: (event: React.MouseEvent) => void
  onChatContextMenu: (chatId: string, event: React.MouseEvent) => void
  dragState: 'none' | 'dragging' | 'over'
  onDragStart: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
  onDragLeave: (event: React.DragEvent) => void
  onDrop: (event: React.DragEvent) => void
  onDragEnd: (event: React.DragEvent) => void
}) {
  const [renameValue, setRenameValue] = useState(session.title)
  const showNested = expanded && session.chats.length > 0
  return (
    <>
      <div
        className={`session-row${active ? ' is-selected' : ''}${session.unread ? ' is-unread' : ''}${session.status === 'needs-input' ? ' is-needs-input' : ''}${session.status === 'working' ? ' is-working' : ''}${session.status === 'error' ? ' is-error' : ''}${session.archived ? ' is-archived' : ''}${session.pinned ? ' is-pinned' : ''}${dragState === 'dragging' ? ' is-dragging' : ''}${dragState === 'over' ? ' is-drop-over' : ''}`}
        draggable={!editing}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onClick={onSelect}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        data-session-nav="true"
        data-session-id={session.id}
        // (a11y) Sem rótulo explícito, o nome acessível da linha vira a soma do
        // texto dos filhos — incluindo o botão "Expandir chats" —, o que faz
        // leitores de tela anunciarem uma sopa de palavras e faz consultas por
        // papel/nome (testes e automação) casarem a linha no lugar do botão.
        aria-label={`Sessão ${session.title}`}
        aria-current={active ? 'true' : undefined}
        onKeyDown={(event) => {
          // Só reage a teclas originadas na própria linha (não em inputs/botões
          // filhos, p.ex. o editor de rename), evitando engolir espaços/enter.
          if (event.target !== event.currentTarget) return
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect() }
          if (event.key === 'F2') onStartRename()
          if (event.key === 'Delete') { event.preventDefault(); onDelete() }
        }}
      >
        <span className="session-status-icon" title={session.status}>
          <StatusIcon status={session.status} unread={session.unread} archived={session.archived || session.section === 'archived'} />
        </span>
        <div className="session-main">
          <div className="session-title-line">
            {session.chats.length > 0 && (
              <button
                className="section-action"
                type="button"
                aria-label={expanded ? 'Recolher chats' : 'Expandir chats'}
                title={expanded ? 'Recolher chats' : 'Expandir chats'}
                onClick={(event) => { event.stopPropagation(); onToggleExpanded() }}
              >
                {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            {editing ? (
              <input
                autoFocus
                className="session-title-editor"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.stopPropagation(); onFinishRename(renameValue) }
                  if (event.key === 'Escape') { event.stopPropagation(); onFinishRename(session.title) }
                }}
                onBlur={() => onFinishRename(renameValue)}
                aria-label="Renomear sessão"
              />
            ) : (
              <span className="session-title-text">{session.title}</span>
            )}
            {session.unread && <span className="unread-dot" title="Não lida" />}
            <span className="session-title-toolbar" aria-label="Ações da sessão">
              <button className="session-action-button" type="button" title={session.pinned ? 'Desafixar' : 'Fixar'} aria-label={session.pinned ? 'Desafixar' : 'Fixar'} onClick={(event) => { event.stopPropagation(); onTogglePinned() }}>
                {session.pinned ? <PinOff size={12} /> : <Pin size={12} />}
              </button>
              <button className="session-action-button" type="button" title={session.archived ? 'Restaurar' : 'Arquivar'} aria-label={session.archived ? 'Restaurar' : 'Arquivar'} onClick={(event) => { event.stopPropagation(); onToggleArchived() }}>
                {session.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
              </button>
              <button className="session-action-button" type="button" title="Renomear (F2)" aria-label="Renomear sessão" onClick={(event) => { event.stopPropagation(); onStartRename() }}>
                <FilePlus2 size={12} />
              </button>
              <button className="session-action-button" type="button" title="Excluir" aria-label="Excluir sessão" onClick={(event) => { event.stopPropagation(); onDelete() }}>
                <Trash2 size={12} />
              </button>
            </span>
          </div>
          <div className="session-details-line">
            <GitBranch size={12} />
            <span className="session-workspace">{session.workspace}</span>
            <span>·</span>
            <button
              className="session-diff"
              type="button"
              title="Abrir alterações no editor"
              aria-label={`Abrir alterações: +${session.diffAdded} −${session.diffRemoved}`}
              onClick={(event) => { event.stopPropagation(); onOpenDiff() }}
            ><span className="session-diff-added">+{session.diffAdded}</span><span className="session-diff-removed">−{session.diffRemoved}</span></button>
            <span>·</span>
            <span>{session.updated}</span>
          </div>
          {session.approval && (
            <div className="session-approval-card" onClick={(event) => event.stopPropagation()}>
              <Wrench size={12} />
              <span className="session-approval-text">{session.approval}</span>
              <button className="primary-button" type="button" onClick={() => onApprove()}>Permitir</button>
            </div>
          )}
          {session.ciFailure && (
            <div className="session-ci-card" onClick={(event) => event.stopPropagation()}>
              <GitPullRequest size={12} />
              <span className="session-ci-text">CI falhando · acessibilidade</span>
              <button className="warning-button" type="button" onClick={onOpenDiff}>Fix CI</button>
            </div>
          )}
        </div>
      </div>
      {showNested && (
        <div className="nested-chats" aria-label={`Chats de ${session.title}`}>
          {session.chats.map((chat, index) => (
            <NestedChatRow
              key={chat.id}
              chat={chat}
              active={active && chat.id === activeChatId}
              last={index === session.chats.length - 1}
              onSelect={() => onSelectChat(chat.id)}
              onApprove={() => onApprove(chat.id)}
              onContextMenu={(event) => onChatContextMenu(chat.id, event)}
            />
          ))}
        </div>
      )}
    </>
  )
}

export function SessionSidebar({
  sessions,
  visible,
  activeSessionId,
  activeChatId,
  onSelectSession,
  onSelectChat,
  onNewSession,
  onTogglePinned,
  onToggleArchived,
  onDelete,
  onRename,
  onApprove,
  onOpenDiff,
  onReorderSessions,
  onAssignGroup,
  onRemoveGroup,
  onOpenBeside,
}: SessionSidebarProps) {
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [readState, setReadState] = useState<SessionFilters['readState']>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ s1: true, s2: true })
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ pinned: true, older: true, archived: true })
  const [editingId, setEditingId] = useState<string | undefined>()
  const [showAllOlder, setShowAllOlder] = useState(false)
  // Seções cujo capping de workspaces foi expandido manualmente pelo usuário.
  const [expandedWorkspaceSections, setExpandedWorkspaceSections] = useState<Record<string, boolean>>({})
  // (R-013) Ordem gerenciada pelo usuário para o bloco de grupos customizados.
  const [sectionOrder] = useState(() => createSectionOrderState())
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropOverId, setDropOverId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // R-076 — navegação por teclado (roving focus) entre as linhas de sessão.
  // As setas movem o foco DOM entre os itens `[data-session-nav]` renderizados,
  // respeitando ordem visual, seções colapsadas e filtros (só conta o que está
  // no DOM). Sem wrap, paridade com WorkbenchList.
  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isNavigationKey(event.key)) return
    // Não sequestrar setas digitadas dentro de inputs (ex.: editor de rename).
    const eventTarget = event.target as HTMLElement
    if (eventTarget.matches('input, textarea, select')) return
    const container = listRef.current
    if (!container) return
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-session-nav="true"]'))
    if (rows.length === 0) return
    const activeElement = document.activeElement as HTMLElement | null
    const current = activeElement ? rows.indexOf(activeElement) : -1
    const targetIndex = nextRovingIndex(event.key, { count: rows.length, current })
    if (targetIndex < 0) return
    event.preventDefault()
    rows[targetIndex]?.focus()
  }

  // Menu de contexto (botão direito) de uma sessão — mesmas ações do original:
  // abrir, fixar/desafixar, arquivar/restaurar, renomear, revisar alterações, excluir.
  const openSessionMenu = (event: React.MouseEvent, session: Session) => {
    event.preventDefault()
    event.stopPropagation()
    // (R-012) Coleta grupos customizados existentes para o submenu.
    const existingGroups = Array.from(new Set(
      sessions.filter((s) => s.customGroup && !s.automation).map((s) => s.customGroup!),
    )).sort()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      label: `Ações da sessão ${session.title}`,
      items: [
        { id: 'open', label: 'Abrir sessão', icon: <MessageCircle size={14} />, onSelect: () => onSelectSession(session.id) },
        ...(onOpenBeside ? [{ id: 'open-beside', label: 'Abrir ao lado', icon: <Columns2 size={14} />, onSelect: () => onOpenBeside(session.id) }] : []),
        { id: 'pin', label: session.pinned ? 'Desafixar' : 'Fixar', icon: session.pinned ? <PinOff size={14} /> : <Pin size={14} />, onSelect: () => onTogglePinned(session.id) },
        { id: 'archive', label: session.archived ? 'Restaurar' : 'Arquivar', icon: session.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />, onSelect: () => onToggleArchived(session.id) },
        { id: 'rename', label: 'Renomear', icon: <FilePlus2 size={14} />, onSelect: () => { setEditingId(session.id); setExpanded((current) => ({ ...current, [session.id]: true })) } },
        { id: 'diff', label: 'Revisar alterações', icon: <GitBranch size={14} />, onSelect: () => onOpenDiff(session.id) },
        // (R-012) Custom Groups: mover para grupo, criar grupo, remover do grupo.
        ...(existingGroups.length > 0 ? [{
          id: 'move-group' as const,
          label: 'Mover para grupo' as const,
          icon: <Folder size={14} />,
          onSelect: () => {
            const choice = window.prompt(
              `Mover "${session.title}" para qual grupo?\n\nGrupos existentes: ${existingGroups.join(', ')}\n\nDigite o nome do grupo (ou crie um novo):`,
              session.customGroup ?? '',
            )
            if (choice !== null && choice.trim()) {
              onRename(session.id, session.title) // no-op; group assignment below
              onAssignGroup(session.id, choice.trim())
            }
          },
        }] : []),
        {
          id: 'create-group',
          label: session.customGroup ? `Grupo: ${session.customGroup}` : 'Atribuir a grupo',
          icon: <Folder size={14} />,
          onSelect: () => {
            const name = window.prompt(
              existingGroups.length > 0
                ? `Nome do grupo (existentes: ${existingGroups.join(', ')}):`
                : 'Nome do novo grupo:',
              session.customGroup ?? '',
            )
            if (name !== null && name.trim()) onAssignGroup(session.id, name.trim())
          },
        },
        ...(session.customGroup ? [{
          id: 'remove-group' as const,
          label: `Remover do grupo "${session.customGroup}"` as const,
          icon: <Folder size={14} />,
          separatorBefore: true,
          onSelect: () => onRemoveGroup(session.id),
        }] : []),
        { id: 'delete', label: 'Excluir', icon: <Trash2 size={14} />, danger: true, separatorBefore: true, onSelect: () => onDelete(session.id) },
      ],
    })
  }

  // Menu de contexto de um chat aninhado (3ª superfície de menu de contexto).
  const openChatMenu = (sessionId: string, chatId: string, chat: NestedChat, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      label: `Ações do chat ${chat.title}`,
      items: [
        { id: 'open', label: 'Abrir chat', icon: <MessageCircle size={14} />, onSelect: () => { onSelectSession(sessionId); onSelectChat(sessionId, chatId) } },
        ...(chat.approval ? [{ id: 'approve', label: 'Permitir ação', icon: <Wrench size={14} />, onSelect: () => onApprove(sessionId, chatId) }] : []),
        { id: 'diff', label: 'Revisar alterações', icon: <GitBranch size={14} />, separatorBefore: true, onSelect: () => onOpenDiff(sessionId) },
      ],
    })
  }


  // Lista agrupada/ordenada/filtrada, derivada do domínio (E6). Exclui automação,
  // mantém a sessão ativa sempre visível e ordena os grupos por precedência.
  // Filtros: query de texto, readState, sortMode (SESSIONS_LIST.md original).
  const filters: SessionFilters = useMemo(
    () => ({
      ...EMPTY_FILTERS,
      query,
      readState,
    }),
    [query, readState],
  )
  const groups = useMemo(
    () => buildSessionsList(
      sessions,
      filters,
      sortMode,
      activeSessionId,
      customGroupLabels,
      (presentIds, labelOf) => orderCustomGroups(sectionOrder, presentIds, labelOf),
    ),
    [sessions, filters, sortMode, activeSessionId, sectionOrder],
  )
  const totalVisible = useMemo(() => groups.reduce((sum, group) => sum + group.sessions.length, 0), [groups])

  const renderGroup = (group: SessionGroup) => {
    const name = group.id
    const isOlder = group.section.kind === 'date' && group.section.section === 'older'
    // "older" mostra só a 1ª sessão até "Mostrar mais" (paridade densidade).
    const items = isOlder && !showAllOlder ? group.sessions.slice(0, 1) : group.sessions
    const totalCount = group.sessions.length
    if (totalCount === 0) return null
    const grouped = items.reduce<Record<string, Session[]>>((accumulator, session) => {
      ;(accumulator[session.workspace] ??= []).push(session)
      return accumulator
    }, {})
    // (R-020) Capping de workspaces: fora de busca, limita a WORKSPACE_CAP, mas
    // promove sempre o workspace da sessão ativa e permite expandir manualmente.
    const searching = query.trim().length > 0
    const activeWorkspace = sessions.find((session) => session.id === activeSessionId)?.workspace
    const allWorkspaces = Object.keys(grouped)
    const sectionExpanded = expandedWorkspaceSections[name] ?? false
    const capResult = applyWorkspaceCapping(allWorkspaces, WORKSPACE_CAP, searching || sectionExpanded, activeWorkspace)
    const visibleWorkspaces = capResult.visible
    const hiddenWorkspaceCount = capResult.hiddenCount
    const collapsed = collapsedSections[name] ?? false
    const contentId = `sessions-section-${name}`
    const hiddenOlderCount = totalCount - items.length
    return (
      <section className="session-section-block" key={name}>
        <button
          className="session-section-header"
          type="button"
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => setCollapsedSections((current) => ({ ...current, [name]: !collapsed }))}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          <span>{group.label}</span>
          <span className="session-section-count">{totalCount}</span>
        </button>
        {!collapsed && <div id={contentId} className="session-section-content">
          {visibleWorkspaces.map((workspace) => (
            <div key={`${name}-${workspace}`}>
              <div className="workspace-section-header"><Folder size={12} /><span>{workspace}</span></div>
              {(grouped[workspace] ?? []).map((session) => (
                <SessionRow
                  key={`${name}-${session.id}`}
                  session={session}
                  active={session.id === activeSessionId}
                  activeChatId={session.id === activeSessionId ? activeChatId : ''}
                  expanded={expanded[session.id] ?? false}
                  editing={editingId === session.id}
                  onSelect={() => onSelectSession(session.id)}
                  onSelectChat={(chatId) => { onSelectSession(session.id); onSelectChat(session.id, chatId) }}
                  onToggleExpanded={() => setExpanded((current) => ({ ...current, [session.id]: !(current[session.id] ?? false) }))}
                  onTogglePinned={() => onTogglePinned(session.id)}
                  onToggleArchived={() => onToggleArchived(session.id)}
                  onDelete={() => onDelete(session.id)}
                  onApprove={(chatId) => onApprove(session.id, chatId)}
                  onOpenDiff={() => onOpenDiff(session.id)}
                  onStartRename={() => { setEditingId(session.id); setExpanded((current) => ({ ...current, [session.id]: true })) }}
                  onFinishRename={(value) => { onRename(session.id, value.trim() || session.title); setEditingId(undefined) }}
                  onContextMenu={(event) => openSessionMenu(event, session)}
                  onChatContextMenu={(chatId, event) => {
                    const chat = session.chats.find((item) => item.id === chatId)
                    if (chat) openChatMenu(session.id, chatId, chat, event)
                  }}
                  dragState={draggingId === session.id ? 'dragging' : dropOverId === session.id ? 'over' : 'none'}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DragTypes.SESSION, session.id)
                    event.dataTransfer.effectAllowed = 'move'
                    setDraggingId(session.id)
                  }}
                  onDragOver={(event) => {
                    if (!draggingId || draggingId === session.id) return
                    const source = sessions.find((item) => item.id === draggingId)
                    if (!canReorderSessions(source, session)) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    if (dropOverId !== session.id) setDropOverId(session.id)
                  }}
                  onDragLeave={() => { if (dropOverId === session.id) setDropOverId(null) }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const fromId = event.dataTransfer.getData(DragTypes.SESSION) || draggingId
                    setDropOverId(null)
                    setDraggingId(null)
                    if (fromId && fromId !== session.id) onReorderSessions(fromId, session.id)
                  }}
                  onDragEnd={() => { setDraggingId(null); setDropOverId(null) }}
                />
              ))}
            </div>
          ))}
          {isOlder && totalCount > 1 && (
            <button className="show-more-row" type="button" onClick={() => setShowAllOlder((current) => !current)}>
              <span>{showAllOlder ? 'Mostrar menos' : `Mostrar mais ${hiddenOlderCount}`}</span>
            </button>
          )}
          {(hiddenWorkspaceCount > 0 || sectionExpanded) && !searching && allWorkspaces.length > WORKSPACE_CAP && (
            <button
              className="show-more-row"
              type="button"
              onClick={() => setExpandedWorkspaceSections((current) => ({ ...current, [name]: !sectionExpanded }))}
            >
              <span>{sectionExpanded ? 'Mostrar menos workspaces' : `Mostrar mais ${hiddenWorkspaceCount} workspace${hiddenWorkspaceCount > 1 ? 's' : ''}`}</span>
            </button>
          )}
        </div>}
      </section>
    )
  }

  return (
    <aside className={`sessions-sidebar${visible ? '' : ' is-hidden'}`} aria-label="Lista de sessões" aria-hidden={!visible}>
      <div className="sessions-sidebar-header">
        <span className="sessions-sidebar-title">Sessions</span>
        <div className="sessions-header-actions">
          <button className="toolbar-button" type="button" title="Nova sessão" aria-label="Nova sessão" onClick={onNewSession}><FilePlus2 size={14} /></button>
          <button className="toolbar-button" type="button" title="Buscar sessões" aria-label="Buscar sessões" onClick={() => document.getElementById('sessions-filter-input')?.focus()}><Search size={14} /></button>
        </div>
      </div>
      <div className="sessions-toolbar">
        <label className="sessions-filter" htmlFor="sessions-filter-input">
          <Search size={12} />
          <input id="sessions-filter-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar sessões" />
        </label>
        <select
          className="sessions-sort-select"
          id="sessions-sort-select"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          aria-label="Ordenar sessões"
        >
          <option value="manual">Manual</option>
          <option value="created">Criação</option>
          <option value="updated">Atualização</option>
        </select>
        <select
          className="sessions-read-filter"
          id="sessions-read-filter"
          value={readState}
          onChange={(event) => setReadState(event.target.value as SessionFilters['readState'])}
          aria-label="Filtrar por leitura"
        >
          <option value="all">Todas</option>
          <option value="unread">Não lidas</option>
          <option value="read">Lidas</option>
        </select>
      </div>
      <div className="sessions-list-scroll" ref={listRef} onKeyDown={handleListKeyDown}>
        {groups.map((group) => renderGroup(group))}
        {totalVisible === 0 && <div className="sessions-empty"><MessageCircle size={22} /><p>Nenhuma sessão encontrada.</p></div>}
      </div>
      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
    </aside>
  )
}

