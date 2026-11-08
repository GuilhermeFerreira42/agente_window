import { useEffect, useRef, useState } from 'react'

/** Histórico de destinos de UI; nunca duplica dados/abas nem executa ações. */
export function useWorkbenchHistory<T>({ route, restore, valid }: { route: T; restore(route: T): void; valid(route: T): boolean }) {
  const key = JSON.stringify(route)
  const callbacks = useRef({ restore, valid }); callbacks.current = { restore, valid }
  const entries = useRef<{ key: string; route: T; focus: HTMLElement | null; field: 'composer' | 'editor' | null }[]>([])
  const index = useRef(-1)
  const replay = useRef<string | null>(null)
  const restoring = useRef(false)
  const restoreVersion = useRef(0)
  const [, refresh] = useState(0)
  useEffect(() => {
    if (replay.current !== null) { replay.current = null; return }
    if (entries.current[index.current]?.key === key) return
    entries.current = entries.current.slice(0, index.current + 1)
    entries.current.push({ key, route: JSON.parse(key) as T, focus: document.activeElement as HTMLElement | null, field: null })
    if (entries.current.length > 100) entries.current.shift()
    index.current = entries.current.length - 1
    refresh(value => value + 1)
  }, [key])
  useEffect(() => {
    const remember = (event: FocusEvent) => {
      const target = event.target
      const entry = entries.current[index.current]
      if (restoring.current || !entry || !(target instanceof HTMLElement) || !target.matches('input,textarea,[contenteditable="true"]')) return
      if (target.closest('.chat-pane')) { entry.focus = target; entry.field = 'composer' }
      else if (target.closest('.monaco-editor')) { entry.focus = target; entry.field = 'editor' }
    }
    document.addEventListener('focusin', remember)
    return () => document.removeEventListener('focusin', remember)
  }, [])
  const find = (delta: number) => {
    for (let i = index.current + delta; i >= 0 && i < entries.current.length; i += delta) {
      if (callbacks.current.valid(entries.current[i].route)) return i
    }
    return -1
  }
  const go = (delta: number) => {
    const target = find(delta)
    if (target < 0) return
    const entry = entries.current[target]
    restoring.current = true
    const version = ++restoreVersion.current
    index.current = target; replay.current = entry.key
    callbacks.current.restore(entry.route); refresh(value => value + 1)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (version !== restoreVersion.current) return
      restoring.current = false
      if (document.querySelector('[aria-modal="true"]')) return
      const selector = entry.field === 'composer' ? '.chat-pane textarea' : '.editor-pane .monaco-editor textarea.inputarea'
      const fallback = entry.field ? Array.from(document.querySelectorAll<HTMLElement>(selector)).find(node => node.getClientRects().length > 0) : null
      const target = entry.focus?.isConnected && entry.focus.getClientRects().length ? entry.focus : fallback
      target?.focus()
    }))
  }
  return { canBack: find(-1) >= 0, canForward: find(1) >= 0, back: () => go(-1), forward: () => go(1) }
}
