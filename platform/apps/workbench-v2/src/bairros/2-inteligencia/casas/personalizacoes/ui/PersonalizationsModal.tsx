import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, Minimize, X } from 'lucide-react'
import { PersonalizacoesView, type PersonalizacoesViewProps } from './PersonalizacoesView'

/** Somente contêiner: dados e ações continuam na tela/cliente da casa. */
export function PersonalizationsModal({ onClose, ...view }: PersonalizacoesViewProps & { onClose(): void }) {
  const [maximized, setMaximized] = useState(false)
  const dialog = useRef<HTMLElement>(null)
  const close = useRef(onClose); close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const app = document.querySelector<HTMLElement>('.app-frame')
    const wasInert = app?.inert ?? false
    if (app) app.inert = true
    dialog.current?.focus()
    return () => {
      if (app) app.inert = wasInert
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(<div className="personalizations-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { event.preventDefault(); dialog.current?.focus() } }} onKeyDown={event => {
    event.stopPropagation()
    if (event.key === 'Escape') { event.preventDefault(); close.current() }
    if (event.key === 'Tab') {
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,select,a[href],[tabindex="0"]') ?? [])
        .filter(item => item.getClientRects().length > 0)
      const index = items.indexOf(document.activeElement as HTMLElement)
      const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length
      event.preventDefault(); items[next]?.focus()
    }
  }}><section ref={dialog} className={`personalizations-modal${maximized ? ' is-maximized' : ''}`} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Personalizações do Agent Window">
    <header className="personalizations-modal-title"><h1>Personalizações do Agent Window</h1><div>
      <button type="button" aria-label={maximized ? 'Restaurar Personalizações' : 'Maximizar Personalizações'} onClick={() => setMaximized(value => !value)}>{maximized ? <Minimize size={15}/> : <Maximize size={15}/>}</button>
      <button type="button" aria-label="Fechar Personalizações" onClick={onClose}><X size={16}/></button>
    </div></header>
    <PersonalizacoesView {...view} embedded />
  </section></div>, document.body)
}
