import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: ReactNode
  /** Ação executada ao escolher; o menu fecha em seguida. */
  onSelect: () => void
  /** Item desabilitado (não selecionável). */
  disabled?: boolean
  /** Estilo destrutivo (ex.: Excluir). */
  danger?: boolean
  /** Renderiza um separador ANTES deste item. */
  separatorBefore?: boolean
}

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
  /** Rótulo acessível do menu (ex.: "Ações da sessão"). */
  label?: string
}

interface ContextMenuProps {
  menu: ContextMenuState | null
  onClose: () => void
}

/**
 * Menu de contexto reutilizável (botão direito), fiel ao comportamento do
 * original: abre na posição do cursor, fecha ao clicar fora / Escape / rolar,
 * navega por teclado (setas, Home/End, Enter, Escape) e reposiciona para não
 * vazar da viewport. Renderiza inline (sem portal) — o overlay fixo captura o
 * clique-fora sem bloquear o resto da app.
 */
export function ContextMenu({ menu, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Primeiro item habilitado, quando o menu (re)abre.
  useEffect(() => {
    if (!menu) return
    const firstEnabled = menu.items.findIndex((item) => !item.disabled)
    setActive(firstEnabled < 0 ? 0 : firstEnabled)
    setPos({ x: menu.x, y: menu.y })
  }, [menu])

  // Reposiciona dentro da viewport depois de medir o tamanho real.
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const margin = 8
    let x = menu.x
    let y = menu.y
    if (x + rect.width > window.innerWidth - margin) x = Math.max(margin, window.innerWidth - rect.width - margin)
    if (y + rect.height > window.innerHeight - margin) y = Math.max(margin, window.innerHeight - rect.height - margin)
    if (x !== pos.x || y !== pos.y) setPos({ x, y })
    // Foco no container para receber teclado imediatamente.
    menuRef.current.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const onScroll = () => onClose()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [menu, onClose])

  if (!menu) return null

  const enabledIndexes = menu.items.map((item, index) => (item.disabled ? -1 : index)).filter((i) => i >= 0)
  const moveActive = (delta: number) => {
    if (enabledIndexes.length === 0) return
    const current = enabledIndexes.indexOf(active)
    const nextPos = current < 0 ? 0 : (current + delta + enabledIndexes.length) % enabledIndexes.length
    setActive(enabledIndexes[nextPos])
  }

  const choose = (item: ContextMenuItem) => {
    if (item.disabled) return
    item.onSelect()
    onClose()
  }

  return (
    <div
      className="context-menu-overlay"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
      onContextMenu={(event) => { event.preventDefault(); onClose() }}
    >
      <div
        ref={menuRef}
        className="context-menu"
        role="menu"
        aria-label={menu.label ?? 'Menu de contexto'}
        tabIndex={-1}
        style={{ left: pos.x, top: pos.y }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
          else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
          else if (event.key === 'Home') { event.preventDefault(); if (enabledIndexes.length) setActive(enabledIndexes[0]) }
          else if (event.key === 'End') { event.preventDefault(); if (enabledIndexes.length) setActive(enabledIndexes[enabledIndexes.length - 1]) }
          else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(menu.items[active]) }
        }}
      >
        {menu.items.map((item, index) => (
          <div key={item.id} role="none">
            {item.separatorBefore && <div className="context-menu-separator" role="separator" />}
            <button
              type="button"
              role="menuitem"
              className={`context-menu-item${item.danger ? ' is-danger' : ''}${index === active ? ' is-active' : ''}`}
              disabled={item.disabled}
              aria-disabled={item.disabled}
              onMouseEnter={() => !item.disabled && setActive(index)}
              onClick={() => choose(item)}
            >
              {item.icon && <span className="context-menu-icon" aria-hidden="true">{item.icon}</span>}
              <span className="context-menu-label">{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

