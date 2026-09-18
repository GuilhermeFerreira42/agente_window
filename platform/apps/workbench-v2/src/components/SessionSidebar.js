import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { Archive, ArchiveRestore, ChevronDown, ChevronRight, CircleAlert, Columns2, CircleCheck, CircleDot, FilePlus2, Folder, GitBranch, GitPullRequest, LoaderCircle, MessageCircle, Pin, PinOff, Search, Trash2, Wrench, } from 'lucide-react';
import { ContextMenu } from './ContextMenu';
import { DragTypes, canReorderSessions } from '../domain/dragAndDrop';
import { EMPTY_FILTERS, applyWorkspaceCapping, buildSessionsList, } from '../domain/sessionsList';
// Capping de workspaces (SESSIONS_LIST.md §Workspace grouping): fora de busca,
// só os primeiros N workspaces de uma seção aparecem; o do workspace ativo é
// sempre promovido; a busca revela todos.
const WORKSPACE_CAP = 3;
import { customGroupLabels } from '../data';
import { isNavigationKey, nextRovingIndex } from '../domain/keyboardNavigation';
import { createSectionOrderState, orderCustomGroups } from '../domain/sectionOrder';
function StatusIcon({ status, unread = false, archived = false }) {
    if (status === 'working')
        return _jsx(LoaderCircle, { size: 16, className: "spin-icon" });
    if (status === 'needs-input')
        return _jsx(CircleAlert, { size: 16 });
    if (status === 'error')
        return _jsx(CircleAlert, { size: 16 });
    if (archived)
        return _jsx(CircleCheck, { size: 16 });
    if (unread)
        return _jsx(CircleDot, { size: 16 });
    return _jsx(CircleCheck, { size: 16 });
}
function NestedChatRow({ chat, active, last, onSelect, onApprove, onContextMenu, }) {
    return (_jsxs("div", { className: `nested-chat-row${active ? ' is-selected' : ''}${chat.status === 'needs-input' ? ' is-needs-input' : ''}${last ? ' is-last' : ''}`, onClick: onSelect, onContextMenu: onContextMenu, role: "button", tabIndex: 0, onKeyDown: (event) => event.key === 'Enter' && onSelect(), children: [_jsxs("div", { className: "nested-chat-title-row", children: [_jsx("span", { className: "nested-chat-icon", children: _jsx(MessageCircle, { size: 12 }) }), _jsx("span", { className: "nested-chat-title", children: chat.title }), _jsx("span", { className: "nested-chat-status", title: chat.status, children: _jsx(StatusIcon, { status: chat.status, unread: chat.unread }) }), chat.unread && _jsx("span", { className: "unread-dot" })] }), chat.approval && (_jsxs("div", { className: "session-approval-card", onClick: (event) => event.stopPropagation(), children: [_jsx(Wrench, { size: 12 }), _jsx("span", { className: "session-approval-text", children: chat.approval }), _jsx("button", { className: "primary-button", type: "button", onClick: onApprove, children: "Permitir" })] }))] }));
}
function SessionRow({ session, active, activeChatId, expanded, editing, onSelect, onSelectChat, onToggleExpanded, onTogglePinned, onToggleArchived, onDelete, onApprove, onOpenDiff, onStartRename, onFinishRename, onContextMenu, onChatContextMenu, dragState, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, }) {
    const [renameValue, setRenameValue] = useState(session.title);
    const showNested = expanded && session.chats.length > 0;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: `session-row${active ? ' is-selected' : ''}${session.unread ? ' is-unread' : ''}${session.status === 'needs-input' ? ' is-needs-input' : ''}${session.status === 'working' ? ' is-working' : ''}${session.status === 'error' ? ' is-error' : ''}${session.archived ? ' is-archived' : ''}${session.pinned ? ' is-pinned' : ''}${dragState === 'dragging' ? ' is-dragging' : ''}${dragState === 'over' ? ' is-drop-over' : ''}`, draggable: !editing, onDragStart: onDragStart, onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop, onDragEnd: onDragEnd, onClick: onSelect, onContextMenu: onContextMenu, role: "button", tabIndex: 0, "data-session-nav": "true", "data-session-id": session.id, "aria-label": `Sessão ${session.title}`, "aria-current": active ? 'true' : undefined, onKeyDown: (event) => {
                    // Só reage a teclas originadas na própria linha (não em inputs/botões
                    // filhos, p.ex. o editor de rename), evitando engolir espaços/enter.
                    if (event.target !== event.currentTarget)
                        return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelect();
                    }
                    if (event.key === 'F2')
                        onStartRename();
                    if (event.key === 'Delete') {
                        event.preventDefault();
                        onDelete();
                    }
                }, children: [_jsx("span", { className: "session-status-icon", title: session.status, children: _jsx(StatusIcon, { status: session.status, unread: session.unread, archived: session.archived || session.section === 'archived' }) }), _jsxs("div", { className: "session-main", children: [_jsxs("div", { className: "session-title-line", children: [session.chats.length > 0 && (_jsx("button", { className: "section-action", type: "button", "aria-label": expanded ? 'Recolher chats' : 'Expandir chats', title: expanded ? 'Recolher chats' : 'Expandir chats', onClick: (event) => { event.stopPropagation(); onToggleExpanded(); }, children: expanded ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }) })), editing ? (_jsx("input", { autoFocus: true, className: "session-title-editor", value: renameValue, onChange: (event) => setRenameValue(event.target.value), onClick: (event) => event.stopPropagation(), onKeyDown: (event) => {
                                            if (event.key === 'Enter') {
                                                event.stopPropagation();
                                                onFinishRename(renameValue);
                                            }
                                            if (event.key === 'Escape') {
                                                event.stopPropagation();
                                                onFinishRename(session.title);
                                            }
                                        }, onBlur: () => onFinishRename(renameValue), "aria-label": "Renomear sess\u00E3o" })) : (_jsx("span", { className: "session-title-text", children: session.title })), session.unread && _jsx("span", { className: "unread-dot", title: "N\u00E3o lida" }), _jsxs("span", { className: "session-title-toolbar", "aria-label": "A\u00E7\u00F5es da sess\u00E3o", children: [_jsx("button", { className: "session-action-button", type: "button", title: session.pinned ? 'Desafixar' : 'Fixar', "aria-label": session.pinned ? 'Desafixar' : 'Fixar', onClick: (event) => { event.stopPropagation(); onTogglePinned(); }, children: session.pinned ? _jsx(PinOff, { size: 12 }) : _jsx(Pin, { size: 12 }) }), _jsx("button", { className: "session-action-button", type: "button", title: session.archived ? 'Restaurar' : 'Arquivar', "aria-label": session.archived ? 'Restaurar' : 'Arquivar', onClick: (event) => { event.stopPropagation(); onToggleArchived(); }, children: session.archived ? _jsx(ArchiveRestore, { size: 12 }) : _jsx(Archive, { size: 12 }) }), _jsx("button", { className: "session-action-button", type: "button", title: "Renomear (F2)", "aria-label": "Renomear sess\u00E3o", onClick: (event) => { event.stopPropagation(); onStartRename(); }, children: _jsx(FilePlus2, { size: 12 }) }), _jsx("button", { className: "session-action-button", type: "button", title: "Excluir", "aria-label": "Excluir sess\u00E3o", onClick: (event) => { event.stopPropagation(); onDelete(); }, children: _jsx(Trash2, { size: 12 }) })] })] }), _jsxs("div", { className: "session-details-line", children: [_jsx(GitBranch, { size: 12 }), _jsx("span", { className: "session-workspace", children: session.workspace }), _jsx("span", { children: "\u00B7" }), _jsxs("button", { className: "session-diff", type: "button", title: "Abrir altera\u00E7\u00F5es no editor", "aria-label": `Abrir alterações: +${session.diffAdded} −${session.diffRemoved}`, onClick: (event) => { event.stopPropagation(); onOpenDiff(); }, children: [_jsxs("span", { className: "session-diff-added", children: ["+", session.diffAdded] }), _jsxs("span", { className: "session-diff-removed", children: ["\u2212", session.diffRemoved] })] }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: session.updated })] }), session.approval && (_jsxs("div", { className: "session-approval-card", onClick: (event) => event.stopPropagation(), children: [_jsx(Wrench, { size: 12 }), _jsx("span", { className: "session-approval-text", children: session.approval }), _jsx("button", { className: "primary-button", type: "button", onClick: () => onApprove(), children: "Permitir" })] })), session.ciFailure && (_jsxs("div", { className: "session-ci-card", onClick: (event) => event.stopPropagation(), children: [_jsx(GitPullRequest, { size: 12 }), _jsx("span", { className: "session-ci-text", children: "CI falhando \u00B7 acessibilidade" }), _jsx("button", { className: "warning-button", type: "button", onClick: onOpenDiff, children: "Fix CI" })] }))] })] }), showNested && (_jsx("div", { className: "nested-chats", "aria-label": `Chats de ${session.title}`, children: session.chats.map((chat, index) => (_jsx(NestedChatRow, { chat: chat, active: active && chat.id === activeChatId, last: index === session.chats.length - 1, onSelect: () => onSelectChat(chat.id), onApprove: () => onApprove(chat.id), onContextMenu: (event) => onChatContextMenu(chat.id, event) }, chat.id))) }))] }));
}
export function SessionSidebar({ sessions, visible, activeSessionId, activeChatId, onSelectSession, onSelectChat, onNewSession, onTogglePinned, onToggleArchived, onDelete, onRename, onApprove, onOpenDiff, onReorderSessions, onAssignGroup, onRemoveGroup, onOpenBeside, }) {
    const [query, setQuery] = useState('');
    const [sortMode, setSortMode] = useState('manual');
    const [readState, setReadState] = useState('all');
    const [expanded, setExpanded] = useState({ s1: true, s2: true });
    const [collapsedSections, setCollapsedSections] = useState({ pinned: true, older: true, archived: true });
    const [editingId, setEditingId] = useState();
    const [showAllOlder, setShowAllOlder] = useState(false);
    // Seções cujo capping de workspaces foi expandido manualmente pelo usuário.
    const [expandedWorkspaceSections, setExpandedWorkspaceSections] = useState({});
    // (R-013) Ordem gerenciada pelo usuário para o bloco de grupos customizados.
    const [sectionOrder] = useState(() => createSectionOrderState());
    const [contextMenu, setContextMenu] = useState(null);
    const [draggingId, setDraggingId] = useState(null);
    const [dropOverId, setDropOverId] = useState(null);
    const listRef = useRef(null);
    // R-076 — navegação por teclado (roving focus) entre as linhas de sessão.
    // As setas movem o foco DOM entre os itens `[data-session-nav]` renderizados,
    // respeitando ordem visual, seções colapsadas e filtros (só conta o que está
    // no DOM). Sem wrap, paridade com WorkbenchList.
    const handleListKeyDown = (event) => {
        if (!isNavigationKey(event.key))
            return;
        // Não sequestrar setas digitadas dentro de inputs (ex.: editor de rename).
        const eventTarget = event.target;
        if (eventTarget.matches('input, textarea, select'))
            return;
        const container = listRef.current;
        if (!container)
            return;
        const rows = Array.from(container.querySelectorAll('[data-session-nav="true"]'));
        if (rows.length === 0)
            return;
        const activeElement = document.activeElement;
        const current = activeElement ? rows.indexOf(activeElement) : -1;
        const targetIndex = nextRovingIndex(event.key, { count: rows.length, current });
        if (targetIndex < 0)
            return;
        event.preventDefault();
        rows[targetIndex]?.focus();
    };
    // Menu de contexto (botão direito) de uma sessão — mesmas ações do original:
    // abrir, fixar/desafixar, arquivar/restaurar, renomear, revisar alterações, excluir.
    const openSessionMenu = (event, session) => {
        event.preventDefault();
        event.stopPropagation();
        // (R-012) Coleta grupos customizados existentes para o submenu.
        const existingGroups = Array.from(new Set(sessions.filter((s) => s.customGroup && !s.automation).map((s) => s.customGroup))).sort();
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            label: `Ações da sessão ${session.title}`,
            items: [
                { id: 'open', label: 'Abrir sessão', icon: _jsx(MessageCircle, { size: 14 }), onSelect: () => onSelectSession(session.id) },
                ...(onOpenBeside ? [{ id: 'open-beside', label: 'Abrir ao lado', icon: _jsx(Columns2, { size: 14 }), onSelect: () => onOpenBeside(session.id) }] : []),
                { id: 'pin', label: session.pinned ? 'Desafixar' : 'Fixar', icon: session.pinned ? _jsx(PinOff, { size: 14 }) : _jsx(Pin, { size: 14 }), onSelect: () => onTogglePinned(session.id) },
                { id: 'archive', label: session.archived ? 'Restaurar' : 'Arquivar', icon: session.archived ? _jsx(ArchiveRestore, { size: 14 }) : _jsx(Archive, { size: 14 }), onSelect: () => onToggleArchived(session.id) },
                { id: 'rename', label: 'Renomear', icon: _jsx(FilePlus2, { size: 14 }), onSelect: () => { setEditingId(session.id); setExpanded((current) => ({ ...current, [session.id]: true })); } },
                { id: 'diff', label: 'Revisar alterações', icon: _jsx(GitBranch, { size: 14 }), onSelect: () => onOpenDiff(session.id) },
                // (R-012) Custom Groups: mover para grupo, criar grupo, remover do grupo.
                ...(existingGroups.length > 0 ? [{
                        id: 'move-group',
                        label: 'Mover para grupo',
                        icon: _jsx(Folder, { size: 14 }),
                        onSelect: () => {
                            const choice = window.prompt(`Mover "${session.title}" para qual grupo?\n\nGrupos existentes: ${existingGroups.join(', ')}\n\nDigite o nome do grupo (ou crie um novo):`, session.customGroup ?? '');
                            if (choice !== null && choice.trim()) {
                                onRename(session.id, session.title); // no-op; group assignment below
                                onAssignGroup(session.id, choice.trim());
                            }
                        },
                    }] : []),
                {
                    id: 'create-group',
                    label: session.customGroup ? `Grupo: ${session.customGroup}` : 'Atribuir a grupo',
                    icon: _jsx(Folder, { size: 14 }),
                    onSelect: () => {
                        const name = window.prompt(existingGroups.length > 0
                            ? `Nome do grupo (existentes: ${existingGroups.join(', ')}):`
                            : 'Nome do novo grupo:', session.customGroup ?? '');
                        if (name !== null && name.trim())
                            onAssignGroup(session.id, name.trim());
                    },
                },
                ...(session.customGroup ? [{
                        id: 'remove-group',
                        label: `Remover do grupo "${session.customGroup}"`,
                        icon: _jsx(Folder, { size: 14 }),
                        separatorBefore: true,
                        onSelect: () => onRemoveGroup(session.id),
                    }] : []),
                { id: 'delete', label: 'Excluir', icon: _jsx(Trash2, { size: 14 }), danger: true, separatorBefore: true, onSelect: () => onDelete(session.id) },
            ],
        });
    };
    // Menu de contexto de um chat aninhado (3ª superfície de menu de contexto).
    const openChatMenu = (sessionId, chatId, chat, event) => {
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
            x: event.clientX,
            y: event.clientY,
            label: `Ações do chat ${chat.title}`,
            items: [
                { id: 'open', label: 'Abrir chat', icon: _jsx(MessageCircle, { size: 14 }), onSelect: () => { onSelectSession(sessionId); onSelectChat(sessionId, chatId); } },
                ...(chat.approval ? [{ id: 'approve', label: 'Permitir ação', icon: _jsx(Wrench, { size: 14 }), onSelect: () => onApprove(sessionId, chatId) }] : []),
                { id: 'diff', label: 'Revisar alterações', icon: _jsx(GitBranch, { size: 14 }), separatorBefore: true, onSelect: () => onOpenDiff(sessionId) },
            ],
        });
    };
    // Lista agrupada/ordenada/filtrada, derivada do domínio (E6). Exclui automação,
    // mantém a sessão ativa sempre visível e ordena os grupos por precedência.
    // Filtros: query de texto, readState, sortMode (SESSIONS_LIST.md original).
    const filters = useMemo(() => ({
        ...EMPTY_FILTERS,
        query,
        readState,
    }), [query, readState]);
    const groups = useMemo(() => buildSessionsList(sessions, filters, sortMode, activeSessionId, customGroupLabels, (presentIds, labelOf) => orderCustomGroups(sectionOrder, presentIds, labelOf)), [sessions, filters, sortMode, activeSessionId, sectionOrder]);
    const totalVisible = useMemo(() => groups.reduce((sum, group) => sum + group.sessions.length, 0), [groups]);
    const renderGroup = (group) => {
        const name = group.id;
        const isOlder = group.section.kind === 'date' && group.section.section === 'older';
        // "older" mostra só a 1ª sessão até "Mostrar mais" (paridade densidade).
        const items = isOlder && !showAllOlder ? group.sessions.slice(0, 1) : group.sessions;
        const totalCount = group.sessions.length;
        if (totalCount === 0)
            return null;
        const grouped = items.reduce((accumulator, session) => {
            ;
            (accumulator[session.workspace] ??= []).push(session);
            return accumulator;
        }, {});
        // (R-020) Capping de workspaces: fora de busca, limita a WORKSPACE_CAP, mas
        // promove sempre o workspace da sessão ativa e permite expandir manualmente.
        const searching = query.trim().length > 0;
        const activeWorkspace = sessions.find((session) => session.id === activeSessionId)?.workspace;
        const allWorkspaces = Object.keys(grouped);
        const sectionExpanded = expandedWorkspaceSections[name] ?? false;
        const capResult = applyWorkspaceCapping(allWorkspaces, WORKSPACE_CAP, searching || sectionExpanded, activeWorkspace);
        const visibleWorkspaces = capResult.visible;
        const hiddenWorkspaceCount = capResult.hiddenCount;
        const collapsed = collapsedSections[name] ?? false;
        const contentId = `sessions-section-${name}`;
        const hiddenOlderCount = totalCount - items.length;
        return (_jsxs("section", { className: "session-section-block", children: [_jsxs("button", { className: "session-section-header", type: "button", "aria-expanded": !collapsed, "aria-controls": contentId, onClick: () => setCollapsedSections((current) => ({ ...current, [name]: !collapsed })), children: [collapsed ? _jsx(ChevronRight, { size: 12 }) : _jsx(ChevronDown, { size: 12 }), _jsx("span", { children: group.label }), _jsx("span", { className: "session-section-count", children: totalCount })] }), !collapsed && _jsxs("div", { id: contentId, className: "session-section-content", children: [visibleWorkspaces.map((workspace) => (_jsxs("div", { children: [_jsxs("div", { className: "workspace-section-header", children: [_jsx(Folder, { size: 12 }), _jsx("span", { children: workspace })] }), (grouped[workspace] ?? []).map((session) => (_jsx(SessionRow, { session: session, active: session.id === activeSessionId, activeChatId: session.id === activeSessionId ? activeChatId : '', expanded: expanded[session.id] ?? false, editing: editingId === session.id, onSelect: () => onSelectSession(session.id), onSelectChat: (chatId) => { onSelectSession(session.id); onSelectChat(session.id, chatId); }, onToggleExpanded: () => setExpanded((current) => ({ ...current, [session.id]: !(current[session.id] ?? false) })), onTogglePinned: () => onTogglePinned(session.id), onToggleArchived: () => onToggleArchived(session.id), onDelete: () => onDelete(session.id), onApprove: (chatId) => onApprove(session.id, chatId), onOpenDiff: () => onOpenDiff(session.id), onStartRename: () => { setEditingId(session.id); setExpanded((current) => ({ ...current, [session.id]: true })); }, onFinishRename: (value) => { onRename(session.id, value.trim() || session.title); setEditingId(undefined); }, onContextMenu: (event) => openSessionMenu(event, session), onChatContextMenu: (chatId, event) => {
                                        const chat = session.chats.find((item) => item.id === chatId);
                                        if (chat)
                                            openChatMenu(session.id, chatId, chat, event);
                                    }, dragState: draggingId === session.id ? 'dragging' : dropOverId === session.id ? 'over' : 'none', onDragStart: (event) => {
                                        event.dataTransfer.setData(DragTypes.SESSION, session.id);
                                        event.dataTransfer.effectAllowed = 'move';
                                        setDraggingId(session.id);
                                    }, onDragOver: (event) => {
                                        if (!draggingId || draggingId === session.id)
                                            return;
                                        const source = sessions.find((item) => item.id === draggingId);
                                        if (!canReorderSessions(source, session))
                                            return;
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = 'move';
                                        if (dropOverId !== session.id)
                                            setDropOverId(session.id);
                                    }, onDragLeave: () => { if (dropOverId === session.id)
                                        setDropOverId(null); }, onDrop: (event) => {
                                        event.preventDefault();
                                        const fromId = event.dataTransfer.getData(DragTypes.SESSION) || draggingId;
                                        setDropOverId(null);
                                        setDraggingId(null);
                                        if (fromId && fromId !== session.id)
                                            onReorderSessions(fromId, session.id);
                                    }, onDragEnd: () => { setDraggingId(null); setDropOverId(null); } }, `${name}-${session.id}`)))] }, `${name}-${workspace}`))), isOlder && totalCount > 1 && (_jsx("button", { className: "show-more-row", type: "button", onClick: () => setShowAllOlder((current) => !current), children: _jsx("span", { children: showAllOlder ? 'Mostrar menos' : `Mostrar mais ${hiddenOlderCount}` }) })), (hiddenWorkspaceCount > 0 || sectionExpanded) && !searching && allWorkspaces.length > WORKSPACE_CAP && (_jsx("button", { className: "show-more-row", type: "button", onClick: () => setExpandedWorkspaceSections((current) => ({ ...current, [name]: !sectionExpanded })), children: _jsx("span", { children: sectionExpanded ? 'Mostrar menos workspaces' : `Mostrar mais ${hiddenWorkspaceCount} workspace${hiddenWorkspaceCount > 1 ? 's' : ''}` }) }))] })] }, name));
    };
    return (_jsxs("aside", { className: `sessions-sidebar${visible ? '' : ' is-hidden'}`, "aria-label": "Lista de sess\u00F5es", "aria-hidden": !visible, children: [_jsxs("div", { className: "sessions-sidebar-header", children: [_jsx("span", { className: "sessions-sidebar-title", children: "Sessions" }), _jsxs("div", { className: "sessions-header-actions", children: [_jsx("button", { className: "toolbar-button", type: "button", title: "Nova sess\u00E3o", "aria-label": "Nova sess\u00E3o", onClick: onNewSession, children: _jsx(FilePlus2, { size: 14 }) }), _jsx("button", { className: "toolbar-button", type: "button", title: "Buscar sess\u00F5es", "aria-label": "Buscar sess\u00F5es", onClick: () => document.getElementById('sessions-filter-input')?.focus(), children: _jsx(Search, { size: 14 }) })] })] }), _jsxs("div", { className: "sessions-toolbar", children: [_jsxs("label", { className: "sessions-filter", htmlFor: "sessions-filter-input", children: [_jsx(Search, { size: 12 }), _jsx("input", { id: "sessions-filter-input", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Filtrar sess\u00F5es" })] }), _jsxs("select", { className: "sessions-sort-select", id: "sessions-sort-select", value: sortMode, onChange: (event) => setSortMode(event.target.value), "aria-label": "Ordenar sess\u00F5es", children: [_jsx("option", { value: "manual", children: "Manual" }), _jsx("option", { value: "created", children: "Cria\u00E7\u00E3o" }), _jsx("option", { value: "updated", children: "Atualiza\u00E7\u00E3o" })] }), _jsxs("select", { className: "sessions-read-filter", id: "sessions-read-filter", value: readState, onChange: (event) => setReadState(event.target.value), "aria-label": "Filtrar por leitura", children: [_jsx("option", { value: "all", children: "Todas" }), _jsx("option", { value: "unread", children: "N\u00E3o lidas" }), _jsx("option", { value: "read", children: "Lidas" })] })] }), _jsxs("div", { className: "sessions-list-scroll", ref: listRef, onKeyDown: handleListKeyDown, children: [groups.map((group) => renderGroup(group)), totalVisible === 0 && _jsxs("div", { className: "sessions-empty", children: [_jsx(MessageCircle, { size: 22 }), _jsx("p", { children: "Nenhuma sess\u00E3o encontrada." })] })] }), _jsx(ContextMenu, { menu: contextMenu, onClose: () => setContextMenu(null) })] }));
}
//# sourceMappingURL=SessionSidebar.js.map