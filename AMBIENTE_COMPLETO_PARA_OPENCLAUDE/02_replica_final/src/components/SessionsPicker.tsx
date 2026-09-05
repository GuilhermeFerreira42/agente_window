import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageCircle, Plus, Search } from 'lucide-react'
import type { Session } from '../types'
import { buildSessionPickerEntries, selectablePickItems, type SessionPickItem } from '../domain/sessionsPicker'

interface SessionsPickerProps {
  open: boolean
  sessions: Session[]
  activeSessionId: string
  onClose: () => void
  onSelectSession: (id: string) => void
  onNewSession: () => void
}

/**
 * Floating sessions picker (E9 / R-073) — the Command Center "Show Sessions"
 * quick-pick. A centered overlay with a search field that matches on session
 * name and folder/branch, grouped results (needs input / unread / recently
 * opened / other), a leading "New Session" action, and full keyboard control
 * (↑/↓ to move, Enter to open, Esc to close).
 */
export function SessionsPicker({ open, sessions, activeSessionId, onClose, onSelectSession, onNewSession }: SessionsPickerProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const entries = useMemo(() => buildSessionPickerEntries(sessions, query), [sessions, query])
  const items = useMemo(() => selectablePickItems(entries), [entries])

  // Reset state and focus on open.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    const id = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  // Keep the active index within bounds when the filtered set shrinks.
  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(0, items.length - 1)))
  }, [items.length])

  // Scroll the active row into view as selection moves.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-item-index="${activeIndex}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex, open])

  if (!open) return null

  const commit = (item: SessionPickItem | undefined) => {
    if (!item) return
    if (item.session) onSelectSession(item.session.id)
    else onNewSession()
    onClose()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (items.length === 0 ? 0 : (current + 1) % items.length))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => (items.length === 0 ? 0 : (current - 1 + items.length) % items.length))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      commit(items[activeIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return (
    <div className="sessions-picker-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="sessions-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar sessões"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sessions-picker-search">
          <Search size={14} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="sessions-picker-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="sessions-picker-list"
            aria-label="Buscar sessões por nome ou pasta"
            placeholder="Buscar sessões por nome ou pasta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="sessions-picker-list" id="sessions-picker-list" role="listbox" aria-label="Sessões" ref={listRef}>
          {entries.map((entry) => {
            if (entry.kind === 'separator') {
              return <div className="sessions-picker-separator" key={entry.id} role="presentation">{entry.label}</div>
            }
            const index = items.indexOf(entry)
            const isActive = index === activeIndex
            const isCurrent = entry.session?.id === activeSessionId
            return (
              <button
                key={entry.id}
                type="button"
                role="option"
                aria-selected={isActive}
                data-item-index={index}
                className={`sessions-picker-item${isActive ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => commit(entry)}
              >
                <span className="sessions-picker-item-icon" aria-hidden="true">
                  {entry.session ? <MessageCircle size={14} /> : <Plus size={14} />}
                </span>
                <span className="sessions-picker-item-label">{entry.label}</span>
                {entry.detail && <span className="sessions-picker-item-detail">{entry.detail}</span>}
              </button>
            )
          })}
          {items.length <= 1 && query.trim() !== '' && (
            <p className="sessions-picker-empty" role="status">Nenhuma sessão corresponde a “{query}”.</p>
          )}
        </div>
      </div>
    </div>
  )
}

