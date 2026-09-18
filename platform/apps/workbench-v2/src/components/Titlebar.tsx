import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CircleAlert,
  CircleUserRound,
  GitCompareArrows,
  Globe2,
  Moon,
  PanelLeft,
  PanelRight,
  Plus,
  Search,
  Sun,
  TerminalSquare,
} from 'lucide-react'
import type { Session } from '../types'

interface TitlebarProps {
  activeSession: Session
  unreadCount: number
  sidebarVisible: boolean
  auxiliaryVisible: boolean
  terminalVisible: boolean
  approved: boolean
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onToggleSidebar: () => void
  onToggleAuxiliary: () => void
  onToggleTerminal: () => void
  onOpenSearch: () => void
  onOpenBrowser: () => void
  onOpenDiff: () => void
  onNewSession: () => void
  onShowSessions: () => void
  onAccountAction: (action: string) => void
}

export function Titlebar({
  activeSession,
  unreadCount,
  sidebarVisible,
  auxiliaryVisible,
  terminalVisible,
  approved,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onToggleAuxiliary,
  onToggleTerminal,
  onOpenSearch,
  onOpenBrowser,
  onOpenDiff,
  onNewSession,
  onShowSessions,
  onAccountAction,
}: TitlebarProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountMenuOpen) return
    const closeOnOutside = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [accountMenuOpen])

  const runAccountAction = (action: string) => {
    setAccountMenuOpen(false)
    onAccountAction(action)
  }

  return (
    <header className="titlebar" aria-label="Barra de título da Janela de Agentes">
      <div className="titlebar-inner">
        <div className="titlebar-left">
          <button className={`titlebar-button sidebar-toggle${sidebarVisible ? ' is-active' : ''}`} type="button" aria-label="Alternar lista de sessões" title="Lista de sessões" onClick={onToggleSidebar}>
            <PanelLeft size={15} />
            {unreadCount > 0 && <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <div className="brand" aria-label="Agent Sessions">
            <span className="brand-mark" aria-hidden="true"><Bot size={12} /></span>
            <span className="brand-label">Agent Sessions</span>
          </div>
        </div>

        <div className="titlebar-center">
          <div className={`command-center${approved ? ' is-approved' : ''}`} role="button" tabIndex={0} aria-label="Command Center">
            {approved ? (
              <span className="command-center-approved-label">Ação aprovada</span>
            ) : (
              <button className={`command-center-pill${activeSession.status === 'needs-input' ? ' is-needs-input' : ''}`} type="button" aria-label="Mostrar sessões" title="Mostrar sessões" onClick={onShowSessions}>
                {activeSession.status === 'needs-input'
                  ? <CircleAlert className="command-center-status-icon" size={12} aria-label="Sessão aguardando resposta" />
                  : <Bot size={12} />}
                <span className="command-center-label">{activeSession.title}</span>
                <span className="command-center-path">{activeSession.workspace}</span>
              </button>
            )}
          </div>
        </div>

        <div className="titlebar-right">
          <button className="titlebar-button is-secondary" type="button" aria-label="Nova sessão" title="Nova sessão" onClick={onNewSession}>
            <Plus size={15} />
          </button>
          <button className="titlebar-button is-secondary" type="button" aria-label="Abrir navegador no editor" title="Abrir navegador no editor" onClick={onOpenBrowser}>
            <Globe2 size={15} />
          </button>
          <button className="titlebar-button is-secondary" type="button" aria-label="Abrir busca no editor" title="Abrir busca no editor" onClick={onOpenSearch}>
            <Search size={15} />
          </button>
          <button className="titlebar-button is-secondary" type="button" aria-label="Abrir alterações no editor" title="Abrir multi-diff" onClick={onOpenDiff}>
            <GitCompareArrows size={15} />
          </button>
          <button className={`titlebar-button is-secondary${terminalVisible ? ' is-active' : ''}`} type="button" aria-label="Alternar terminal" title="Terminal" onClick={onToggleTerminal}>
            <TerminalSquare size={15} />
          </button>
          <button className={`titlebar-button${auxiliaryVisible ? ' is-active' : ''}`} type="button" aria-label="Alternar barra auxiliar" title="Barra auxiliar" onClick={onToggleAuxiliary}>
            <PanelRight size={15} />
          </button>
          <button className="titlebar-button" type="button" aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} onClick={onToggleTheme}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className="account-menu-anchor" ref={accountRef}>
            <button className={`titlebar-button${accountMenuOpen ? ' is-active' : ''}`} type="button" aria-label="Conta" title="Conta" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => setAccountMenuOpen((current) => !current)}>
              <CircleUserRound size={15} />
            </button>
            {accountMenuOpen && (
              <div className="account-menu" role="menu" aria-label="Menu da conta">
                <div className="account-menu-header">
                  <span className="account-menu-name">Agente Dev</span>
                  <span className="account-menu-email">dev@agents.local</span>
                </div>
                <button type="button" role="menuitem" onClick={() => runAccountAction('Perfil aberto')}>Perfil</button>
                <button type="button" role="menuitem" onClick={() => runAccountAction('Configurações da conta abertas')}>Configurações da conta</button>
                <button type="button" role="menuitem" onClick={() => runAccountAction('Sessão encerrada')}>Sair</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

