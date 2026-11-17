import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, FolderOpen, MessageSquare } from 'lucide-react'
import { listRecentSessionWorkspaces } from '../services/sessions/sessionsClient'
import { normalizeDirectoryQuery, useWorkspaceDirectorySuggestions } from '../hooks/useWorkspaceDirectorySuggestions'

interface Props {
  contexto: 'chat' | 'workspace'
  workspace: string
  workspacePath: string | null
  onChangeContexto?: (contexto: 'chat' | 'workspace') => void
  onPickWorkspace?: () => void
  onValidateWorkspacePath?: (path: string) => Promise<void>
  disabled?: boolean
  disabledReason?: string
  pickerPending?: boolean
  nativeAvailable?: boolean
}

/** Escolha de contexto antes da criação; toda pasta passa pela validação existente. */
export function LandingContextMenu({ contexto, workspace, workspacePath, onChangeContexto,
  onPickWorkspace, onValidateWorkspacePath, disabled = false, disabledReason,
  pickerPending = false, nativeAvailable = true }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [edited, setEdited] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentError, setRecentError] = useState(false)
  const [validating, setValidating] = useState(false)
  const [bounds, setBounds] = useState({ width: 500, bottom: 0 })
  const wrap = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const inFlight = useRef(false)
  const locked = disabled || Boolean(disabledReason) || pickerPending || validating
  const suggestions = useWorkspaceDirectorySuggestions(open, query)
  const close = (focus = true) => { setOpen(false); if (focus) trigger.current?.focus() }

  useEffect(() => {
    if (open && !edited) setQuery(contexto === 'workspace' ? workspacePath ?? '' : '')
  }, [open, edited, contexto, workspacePath])

  useLayoutEffect(() => {
    if (!open) return
    const columnElement = wrap.current?.closest('.session-landing-center')
    const measure = () => {
      const rect = wrap.current?.getBoundingClientRect()
      const column = columnElement?.getBoundingClientRect()
      if (rect) setBounds({ width: Math.max(0, Math.min(window.innerWidth - 16, column?.right ?? window.innerWidth - 16) - rect.left), bottom: rect.bottom })
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (columnElement) observer?.observe(columnElement)
    if (wrap.current) observer?.observe(wrap.current)
    return () => { window.removeEventListener('resize', measure); observer?.disconnect() }
  }, [open])

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true); setRecentError(false)
    void listRecentSessionWorkspaces().then((paths) => { if (active) setRecent(paths) })
      .catch(() => { if (active) setRecentError(true) })
      .finally(() => { if (active) setLoading(false) })
    input.current?.focus()
    input.current?.select()
    const outside = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node) && !inFlight.current) close(false)
    }
    document.addEventListener('pointerdown', outside, true)
    return () => { active = false; document.removeEventListener('pointerdown', outside, true) }
  }, [open])

  const choosePath = async (path: string) => {
    if (locked || inFlight.current || !onValidateWorkspacePath || !path.trim()) return
    inFlight.current = true; setValidating(true); setError('')
    try {
      await onValidateWorkspacePath(normalizeDirectoryQuery(path))
      setQuery(''); close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível abrir esta pasta.')
    } finally { inFlight.current = false; setValidating(false) }
  }
  const browse = (path: string) => {
    if (locked) return
    const separator = path.includes('\\') ? '\\' : '/'
    setQuery(/[\\/]$/.test(path) ? path : path + separator)
    setEdited(true); setError(''); input.current?.focus()
  }
  const paths = [...new Set([...(workspacePath ? [workspacePath] : []), ...recent])]
    .filter((path) => !edited || path.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const label = contexto === 'chat' ? 'Chat' : workspace.split(/[\\/]/).filter(Boolean).pop() || workspace

  return <div className="session-landing-context-menu" ref={wrap}>
    <button ref={trigger} type="button" className="session-landing-chip is-clickable"
      data-testid="landing-contexto" aria-label={`${contexto === 'chat' ? 'Contexto: Chat. Escolher chat ou pasta' : `Workspace atual: ${workspace}. Escolher chat ou pasta`}${disabledReason ? `. ${disabledReason}` : ''}`}
      aria-haspopup="dialog" aria-expanded={open} aria-busy={pickerPending || validating}
      title={disabledReason ?? (contexto === 'chat' ? 'Chat sem pasta' : workspace)}
      disabled={locked} onClick={() => { setError(''); setEdited(false); setQuery(contexto === 'workspace' ? workspacePath ?? '' : ''); setOpen((value) => !value) }}>
      {contexto === 'chat' ? <MessageSquare size={14} aria-hidden="true" /> : <FolderOpen size={14} aria-hidden="true" />}
      <span data-testid={contexto === 'chat' ? 'landing-chat-chip' : 'landing-workspace-chip'}>{label}</span>
      <ChevronDown size={13} aria-hidden="true" />
    </button>
    {open && <div className="session-landing-menu session-landing-context-dialog" role="dialog" aria-label="Escolher chat ou pasta"
      style={{ maxWidth: `min(500px, ${bounds.width}px)`, maxHeight: `min(320px, calc(100vh - ${bounds.bottom}px - 24px))` }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); close(); return }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
        if (event.target === input.current && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
        const current = items.findIndex((item) => item === document.activeElement)
        const suggested = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-directory-suggestion]:not(:disabled)'))
        if (event.target === input.current && suggested.length) {
          event.preventDefault(); (event.key === 'ArrowUp' ? suggested[suggested.length - 1] : suggested[0])?.focus(); return
        }
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : current < 0 ? (event.key === 'ArrowUp' ? items.length - 1 : 0)
          : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
        if (items[next]) { event.preventDefault(); items[next].focus() }
      }}>
      <input ref={input} value={query} disabled={locked}
        aria-label="Buscar ou digitar caminho da pasta" placeholder="Buscar ou digitar caminho da pasta"
        onChange={(event) => { setQuery(event.target.value); setEdited(true); setError('') }}
        onKeyDown={(event) => { if (event.key === 'Enter' && query.trim()) { event.preventDefault(); void choosePath(query) } }} />
      <button type="button" className="session-landing-menu-item" disabled={locked || !onChangeContexto}
        aria-pressed={contexto === 'chat'} onClick={() => { onChangeContexto?.('chat'); close() }}>
        <MessageSquare size={14} aria-hidden="true" /><span>Chat<small>Conversa sem pasta</small></span>
      </button>
      {(suggestions.pending || suggestions.error || suggestions.available) && <div className="session-landing-directory-suggestions" role="group" aria-label="Subpastas disponíveis">
        <p>Subpastas</p>
        {suggestions.pending && <p role="status">Buscando subpastas…</p>}
        {suggestions.error && !error && <p role="alert">{suggestions.error}</p>}
        {suggestions.available && suggestions.folders.length === 0 && <p role="status">Nenhuma subpasta encontrada.</p>}
        {suggestions.folders.map((folder) => <button key={folder.path} type="button" className="session-landing-menu-item"
          data-directory-suggestion disabled={locked} title={folder.path} aria-label={`Explorar pasta: ${folder.name}. ${folder.path}`}
          onClick={() => browse(folder.path)}>
          <FolderOpen size={14} aria-hidden="true" /><span><strong>{folder.name}</strong><small>{folder.path}</small></span><ChevronDown size={12} aria-hidden="true" />
        </button>)}
      </div>}
      <div className="session-landing-context-recents" aria-label="Pastas recentes">
        {loading && <p role="status">Carregando pastas recentes…</p>}
        {recentError && <p role="status">Não foi possível carregar o histórico. Você pode digitar um caminho.</p>}
        {!loading && !recentError && paths.length === 0 && <p>Nenhuma pasta recente encontrada.</p>}
        {paths.map((path) => <button key={path} type="button" className="session-landing-menu-item"
          disabled={locked || !onValidateWorkspacePath} title={path} onClick={() => void choosePath(path)}>
          <FolderOpen size={14} aria-hidden="true" /><span><strong>{path.split(/[\\/]/).filter(Boolean).pop() || path}</strong><small>{path}</small></span>
        </button>)}
      </div>
      {onValidateWorkspacePath && query.trim() && <button type="button" className="session-landing-menu-item"
        disabled={locked} onClick={() => void choosePath(query)}>Usar pasta: {query.trim()}</button>}
      {onPickWorkspace && <button type="button" className="session-landing-menu-acoes"
        disabled={locked || !nativeAvailable} title={nativeAvailable ? 'Escolher uma pasta do disco' : 'Seletor nativo indisponível. Digite o caminho acima.'}
        onClick={onPickWorkspace}><FolderOpen size={14} aria-hidden="true" />Abrir pasta…</button>}
      {validating && <p role="status">Validando pasta…</p>}
      {!nativeAvailable && <p role="status">Seletor nativo indisponível. Digite o caminho acima.</p>}
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>
}
