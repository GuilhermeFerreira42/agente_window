import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Check, Folder, FolderOpen, LoaderCircle, Search, X } from 'lucide-react'
import { listSessionWorkspaceDirectories, type WorkspaceDirectoryEntry } from '../../services/sessions/sessionsClient'

interface WorkspaceSwitcherProps {
  currentPath: string
  pending?: boolean
  onConfirm: (path: string) => Promise<void>
  onBrowse?: () => void
}

function listPath(value: string): string {
  if (!value.trim()) return '/'
  if (value.endsWith('/') || value.endsWith('\\')) return value
  return value.replace(/[\\/][^\\/]*$/, '') || '/'
}

export function WorkspaceSwitcher({ currentPath, pending = false, onConfirm, onBrowse }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(currentPath)
  const [folders, setFolders] = useState<WorkspaceDirectoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!open) setValue(currentPath) }, [currentPath, open])
  useEffect(() => {
    if (!open) return
    const path = listPath(value)
    const timer = window.setTimeout(() => {
      setLoading(true); setError('')
      void listSessionWorkspaceDirectories(path).then((result) => {
        setFolders(result.folders); setActiveIndex(0)
        if (result.error === 'permission') setError('Sem permissão para listar esta pasta')
        else if (result.error) setError('Pasta não encontrada')
      }).catch((reason) => { setFolders([]); setError(reason instanceof Error ? reason.message : String(reason)) }).finally(() => setLoading(false))
    }, 100)
    return () => window.clearTimeout(timer)
  }, [open, value])
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setValue(currentPath) } }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [currentPath, open])

  const choose = (folder: WorkspaceDirectoryEntry) => {
    const separator = folder.path.includes('\\') && !folder.path.includes('/') ? '\\' : '/'
    setValue(folder.path.endsWith(separator) ? folder.path : `${folder.path}${separator}`)
    inputRef.current?.focus()
  }
  const confirm = async () => {
    if (!value.trim() || pending) return
    setError('')
    try { await onConfirm(value.trim()); setOpen(false) }
    catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); setOpen(true) }
  }
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.min(folders.length - 1, index + 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)) }
    else if (event.key === 'Tab' && folders[activeIndex]) { event.preventDefault(); choose(folders[activeIndex]) }
    else if (event.key === 'Enter') { event.preventDefault(); if (folders[activeIndex] && value.endsWith('/')) choose(folders[activeIndex]); else void confirm() }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setValue(currentPath) }
  }

  return <div className={`workspace-switcher${open ? ' is-open' : ''}`} ref={rootRef}>
    <div className="workspace-switcher-control">
      <Search size={14} aria-hidden="true"/>
      <input ref={inputRef} aria-label="Workspace atual" role="combobox" aria-expanded={open} aria-controls="workspace-switcher-list" aria-autocomplete="list" value={value} title={currentPath} onFocus={(event) => { setOpen(true); event.currentTarget.select() }} onChange={(event) => { setValue(event.target.value); setOpen(true) }} onKeyDown={keyDown}/>
      {open && <button type="button" className="workspace-switcher-clear" aria-label="Cancelar troca de workspace" onClick={() => { setOpen(false); setValue(currentPath) }}><X size={13}/></button>}
      {onBrowse && <button type="button" className="workspace-switcher-browse" aria-label="Procurar pasta" title="Procurar pasta" onClick={onBrowse}><FolderOpen size={14}/></button>}
      <button type="button" className="workspace-switcher-use" disabled={pending || !value.trim()} onClick={() => void confirm()}>{pending ? <LoaderCircle className="spin-icon" size={13}/> : <Check size={13}/>}<span>Usar esta pasta</span></button>
    </div>
    {open && <div className="workspace-switcher-dropdown" id="workspace-switcher-list" role="listbox" aria-label="Pastas do workspace">
      {loading && <div className="workspace-switcher-state">Listando pastas…</div>}
      {!loading && error && <div className="workspace-switcher-state is-error" role="alert">{error}</div>}
      {!loading && !error && folders.length === 0 && <div className="workspace-switcher-state">Pasta vazia</div>}
      {!loading && !error && folders.map((folder, index) => <button type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? 'is-active' : ''} key={folder.path} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(folder)}><Folder size={15}/><span><strong>{folder.name}</strong><small>{folder.path}</small></span></button>)}
    </div>}
  </div>
}
