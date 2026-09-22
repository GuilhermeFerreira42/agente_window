import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  Check,
  CircleAlert,
  CircleCheck,
  Code2,
  ExternalLink,
  FileCode2,
  GitCompareArrows,
  Globe2,
  LoaderCircle,
  Eye,
  EyeOff,
  ListPlus,
  Maximize2,
  Minimize2,
  PanelRight,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  SplitSquareHorizontal,
  X,
} from 'lucide-react'
import Editor, { DiffEditor } from '@monaco-editor/react'
import type { BrowserViewState, BrowserViewport, DiffFile, EditorTab, SearchResult } from '../types'
import { getEditorTabsVisibleForSession } from '../domain/browserOwnership'
import { resolveVisibleEditorTabId } from '../domain/editorTabs'
import { getDiffResolution } from '../domain/sessionState'
import { isTabCloseable, type SidePaneState } from '../domain/sidePane'
import { formatSearchSummary, splitSearchHighlight } from '../domain/search'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import { ImagePreview } from './ImagePreview'
import { languageForPath } from '../domain/filePreview'
import { DragTypes } from '../domain/dragAndDrop'

interface EditorAreaProps {
  activeSessionId: string
  tabs: EditorTab[]
  activeTabId?: string
  browserViews: BrowserViewState[]
  searchQuery: string
  searchResults: SearchResult[]
  searchFocusRequest: number
  diffFiles: DiffFile[]
  selectedDiffFileId?: string
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onReorderTabs: (fromId: string, toId: string) => void
  onNewBrowser: () => void
  onNewFile: () => void
  onNewSearch: () => void
  onNewDiff: () => void
  onNavigateBrowser: (id: string, url: string) => void
  onBrowserBack: (id: string) => void
  onBrowserForward: (id: string) => void
  onReloadBrowser: (id: string) => void
  onBrowserStatus: (id: string, status: BrowserViewState['status']) => void
  onChangeViewport: (id: string, viewport: BrowserViewport) => void
  onChangeSearchQuery: (query: string) => void
  onOpenSearchResult: (result: SearchResult) => void
  onSelectDiffFile: (id: string) => void
  onAcceptDiff: (id: string) => void
  onRevertDiff: (id: string) => void
  onAcceptAllDiff: () => void
  onRevertAllDiff: () => void
  onToggleViewed: (id: string) => void
  onCommit: () => void
  onCreatePr: () => void
  editorMaximized: boolean
  onToggleMaximize: () => void
  onSplit: () => void
  editorContentVisible: boolean
  sidePaneState: SidePaneState
  onToggleEditorHidden: () => void
  onToggleDetails: () => void
  detailsVisible: boolean
  onNewCustomizations: () => void
  customizationsSurface: ReactNode
  /** (R-087) Tema ativo — controla o tema do Monaco Editor. */
  theme?: 'dark' | 'light'
}

function tabIcon(tab: EditorTab) {
  if (tab.type === 'browser') return <Globe2 size={13} />
  if (tab.type === 'search') return <Search size={13} />
  if (tab.type === 'diff') return <GitCompareArrows size={13} />
  if (tab.type === 'customizations') return <Blocks size={13} />
  return <FileCode2 size={13} />
}

function BrowserPreview({
  view,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onStatus,
  onChangeViewport,
  monacoTheme,
}: {
  view: BrowserViewState
  onNavigate: (url: string) => void
  onBack: () => void
  onForward: () => void
  onReload: () => void
  onStatus: (status: BrowserViewState['status']) => void
  onChangeViewport: (viewport: BrowserViewport) => void
  monacoTheme: string
}) {
  const [address, setAddress] = useState(view.url)
  const [loadError, setLoadError] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  useEffect(() => setAddress(view.url), [view.url])
  useEffect(() => {
    setLoadError(false)
    setIsBlocked(false)
  }, [view.url, view.reloadToken])
  const canBack = view.historyIndex > 0
  const canForward = view.historyIndex < view.history.length - 1

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalized = normalizeBrowserAddress(address)
    if (!normalized) {
      onStatus('error')
      setLoadError(true)
      return
    }
    setLoadError(false)
    setIsBlocked(false)
    onNavigate(normalized)
  }

  const isInternal = view.url.startsWith('https://agents.local') || view.url.startsWith('http://agents.local') || view.url.startsWith('agents.local')
  const colorScheme = monacoTheme === 'vs' ? 'light' : 'dark'
  const internalSrcDoc = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:${colorScheme}}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:Canvas;color:CanvasText;font-family:system-ui,sans-serif}main{max-width:920px;margin:0 auto;padding:38px clamp(20px,7vw,72px)}nav{display:flex;gap:12px;align-items:center;color:GrayText;font-size:12px;margin-bottom:54px}nav strong{color:CanvasText}h1{font-size:clamp(28px,4vw,48px);line-height:1.08;letter-spacing:-.03em;max-width:680px;margin:0 0 14px}p{max-width:620px;color:GrayText;line-height:1.6;margin:0 0 26px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.card{min-height:100px;border:1px solid ButtonBorder;border-radius:8px;padding:14px;background:color-mix(in srgb, CanvasText 6%, Canvas)}.card strong{display:block;margin-bottom:8px}.card span{color:GrayText;font-size:12px}@media(max-width:620px){.grid{grid-template-columns:1fr}}</style></head><body><main><nav><strong>Agent Sessions</strong><span>›</span><span>${escapeHtml(view.url)}</span></nav><h1>Contextual browser for this session.</h1><p>This browser tab belongs to <strong>${escapeHtml(view.sessionId)}</strong>. Switching sessions hides it; archiving the session disposes it.</p><div class="grid"><div class="card"><strong>Session scope</strong><span>History stays with the active session.</span></div><div class="card"><strong>Editor tab</strong><span>Viewport can be desktop, tablet, or mobile.</span></div><div class="card"><strong>Load lifecycle</strong><span>The host reports iframe load and error events.</span></div></div></main></body></html>`

  const handleLoad = () => {
    // Detect if iframe was blocked by X-Frame-Options by trying to access content
    // For external sites that block iframe, onLoad may still fire but content is empty
    // We keep ready state, but show helper if known blocklist
    const blockedHosts = ['google.com', 'github.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com']
    const isKnownBlocked = blockedHosts.some(h => view.url.includes(h))
    if (isKnownBlocked && !isInternal) {
      setIsBlocked(true)
    }
    onStatus('ready')
  }

  const handleError = () => {
    setLoadError(true)
    onStatus('error')
  }

  return (
    <div className="browser-view" data-browser-id={view.id} data-session-id={view.sessionId}>
      <div className="browser-toolbar">
        <button className="browser-control" type="button" title="Voltar" aria-label="Voltar" disabled={!canBack} onClick={onBack}><ArrowLeft size={14} /></button>
        <button className="browser-control" type="button" title="Avançar" aria-label="Avançar" disabled={!canForward} onClick={onForward}><ArrowRight size={14} /></button>
        <button className="browser-control" type="button" title="Recarregar" aria-label="Recarregar" onClick={onReload}><RefreshCw size={14} /></button>
        <form className="browser-address" onSubmit={submit}>
          <ShieldCheck size={12} />
          <input className="browser-url-input" value={address} onChange={(event) => setAddress(event.target.value)} aria-label="Endereço" />
        </form>
        <span className={`browser-status${view.status === 'loading' ? ' is-loading' : ''}${view.status === 'error' || loadError ? ' is-error' : ''}`} aria-live="polite">
          {view.status === 'loading' ? <LoaderCircle size={12} className="spin-icon" /> : view.status === 'error' || loadError ? <CircleAlert size={12} /> : <CircleCheck size={12} />}
          {view.status === 'loading' ? 'Carregando' : view.status === 'error' || loadError ? 'Falha' : 'Pronto'}
        </span>
        <div className="browser-viewport-controls" aria-label="Viewport">
          {(['desktop', 'tablet', 'mobile'] as BrowserViewport[]).map((viewport) => <button key={viewport} className={`browser-viewport-button${view.viewport === viewport ? ' is-active' : ''}`} type="button" onClick={() => onChangeViewport(viewport)}>{viewport === 'desktop' ? 'Desk' : viewport === 'tablet' ? '768' : '375'}</button>)}
        </div>
        <button className="browser-control" type="button" title="Abrir em janela externa" aria-label="Abrir em janela externa" onClick={() => window.open(view.url, '_blank', 'noopener,noreferrer')}><ExternalLink size={13} /></button>
      </div>
      <div className="browser-canvas">
        {(view.status === 'error' || loadError) && (
          <div className="browser-error-banner" role="alert">
            <CircleAlert size={14} />
            <div className="browser-error-copy">
              <strong>Falha ao carregar a página</strong>
              <span>Verifique o endereço. Sites como Google bloqueiam incorporação (X-Frame-Options). Use o botão para abrir externamente.</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary-button" type="button" onClick={onReload}>Tentar novamente</button>
              <button className="secondary-button" type="button" onClick={() => window.open(view.url, '_blank', 'noopener,noreferrer')}>Abrir em nova aba</button>
            </div>
          </div>
        )}
        {isBlocked && !loadError && (
          <div className="browser-error-banner is-warning" role="alert">
            <CircleAlert size={14} />
            <div className="browser-error-copy">
              <strong>Site bloqueia incorporação</strong>
              <span>{view.url} envia X-Frame-Options: DENY. O original usa Electron webview. Na web, abra externamente.</span>
            </div>
            <button className="secondary-button" type="button" onClick={() => window.open(view.url, '_blank', 'noopener,noreferrer')}>Abrir em nova aba</button>
          </div>
        )}
        <div className={`browser-frame-wrap${view.viewport === 'tablet' ? ' is-tablet' : ''}${view.viewport === 'mobile' ? ' is-mobile' : ''}`}>
          {isInternal ? (
            <iframe
              key={`${view.id}-${view.reloadToken}-${view.url}`}
              className="browser-frame"
              title={`Browser ${view.url}`}
              srcDoc={internalSrcDoc}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : (
            <iframe
              key={`${view.id}-${view.reloadToken}-${view.url}`}
              className="browser-frame"
              title={`Browser ${view.url}`}
              src={view.url}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-presentation"
              allow="fullscreen; clipboard-read; clipboard-write"
              onLoad={handleLoad}
              onError={handleError}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function normalizeBrowserAddress(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'https://agents.local/'
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

function HighlightedSearchText({ text, query }: { text: string; query: string }) {
  return <>{splitSearchHighlight(text, query).map((part, index) => part.highlighted ? <mark key={`${part.text}-${index}`}>{part.text}</mark> : <span key={`${part.text}-${index}`}>{part.text}</span>)}</>
}

function SearchView({ query, results, searchFocusRequest, onChangeQuery, onOpenResult }: { query: string; results: SearchResult[]; searchFocusRequest: number; onChangeQuery: (query: string) => void; onOpenResult: (result: SearchResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [searchFocusRequest])

  return (
    <div className="search-view">
      <div className="search-toolbar">
        <div className="search-input-wrap"><Search size={14} /><input ref={inputRef} autoFocus className="search-input" value={query} onChange={(event) => onChangeQuery(event.target.value)} placeholder="Pesquisar no workspace" aria-label="Pesquisar no workspace" /></div>
        <span className="search-summary" aria-live="polite">{formatSearchSummary(results.length)}</span>
      </div>
      <div className="search-results" aria-label={results.length > 0 ? 'Resultados da busca' : undefined}>
        {results.map((result) => (
          <button className="search-result" type="button" key={`${result.path}-${result.line}`} aria-label={`Abrir ${result.path}, linha ${result.line}: ${result.content}`} onClick={() => onOpenResult(result)}>
            <span className="search-result-meta"><Code2 size={12} /><span className="search-result-path"><HighlightedSearchText text={result.path} query={query} /></span><span>:{result.line}</span></span>
            <span className="search-result-line"><HighlightedSearchText text={result.content} query={query} /></span>
          </button>
        ))}
        {results.length === 0 && <div className="editor-surface-empty" role="status"><Search size={24} /><strong>Nenhum resultado</strong><span>{query.trim() ? `Nenhum arquivo contém “${query.trim()}”.` : 'Digite um termo para pesquisar no workspace.'}</span></div>}
      </div>
    </div>
  )
}

function DiffView({
  files,
  selectedFileId,
  onSelectFile,
  onAccept,
  onRevert,
  onAcceptAll,
  onRevertAll,
  onToggleViewed,
  onCommit,
  onCreatePr,
  monacoTheme,
}: {
  files: DiffFile[]
  selectedFileId?: string
  onSelectFile: (id: string) => void
  onAccept: (id: string) => void
  onRevert: (id: string) => void
  onAcceptAll: () => void
  onRevertAll: () => void
  onToggleViewed: (id: string) => void
  onCommit: () => void
  onCreatePr: () => void
  monacoTheme: string
}) {
  // The reference keeps the active tree item and the multi-diff editor view
  // state when the editor is backgrounded. The owner lives in App, keyed by
  // session; this component only resolves a safe first item for a new/empty
  // selection and reports user changes upward.
  const selected = files.find((file) => file.id === selectedFileId) ?? files[0]
  const pendingFiles = files.filter((file) => !getDiffResolution(file))
  const added = pendingFiles.reduce((sum, file) => sum + file.added, 0)
  const removed = pendingFiles.reduce((sum, file) => sum + file.removed, 0)

  const select = (id: string) => onSelectFile(id)

  if (!selected) {
    return (
      <div className="editor-surface-empty diff-empty-state" data-testid="diff-empty-state" role="status">
        <GitCompareArrows size={28} />
        <strong>Sem alterações pendentes</strong>
        <span>Esta sessão não possui arquivos alterados para revisar.</span>
      </div>
    )
  }

  return (
    <div className="diff-view">
      <div className="diff-toolbar" aria-label="Barra de ferramentas de Branch Changes">
        <div className="diff-toolbar-heading">
          <span className="diff-toolbar-title">Branch Changes</span>
          <span className="diff-toolbar-count">{files.length} arquivos</span>
        </div>
        <span className="diff-toolbar-stats" aria-label={`Estatísticas: mais ${added}, menos ${removed}`}><span className="session-diff-added">+{added}</span><span className="session-diff-removed">−{removed}</span></span>
        <button className="secondary-button" type="button" onClick={onRevertAll}><RotateCcw size={12} />Reverter tudo</button>
        <button className="primary-button" type="button" onClick={onAcceptAll}><Check size={12} />Aceitar tudo</button>
        <button className="secondary-button" type="button" onClick={onCommit}>Commit</button>
        <button className="secondary-button" type="button" onClick={onCreatePr}>Criar PR</button>
      </div>
      <div className="diff-file-list" aria-label="Arquivos alterados">
        {files.map((file) => {
          const isSelected = file.id === selected.id
          const resolution = getDiffResolution(file)
          const resolutionLabel = resolution === 'accepted' ? 'Aceito' : resolution === 'reverted' ? 'Revertido' : 'Pendente'
          const effectiveAdded = resolution ? 0 : file.added
          const effectiveRemoved = resolution ? 0 : file.removed
          const statusLabel = file.status === 'added' ? 'Adicionado' : file.status === 'deleted' ? 'Excluído' : file.status === 'renamed' ? 'Renomeado' : 'Modificado'
          const statusGlyph = file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : file.status === 'renamed' ? 'R' : 'M'
          const language = file.path.endsWith('.css') ? 'css' : file.path.endsWith('.ts') ? 'typescript' : 'plaintext'

          return (
            <article className={`diff-entry${isSelected ? ' is-active' : ''}${resolution ? ' is-resolved' : ''}${file.viewed ? ' is-viewed' : ''}`} data-diff-file-id={file.id} key={file.id}>
              <div
                className="diff-entry-header"
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Selecionar ${file.path}`}
                onClick={() => select(file.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    select(file.id)
                  }
                }}
              >
                <span className={`diff-status ${file.status}`} title={statusLabel} aria-label={statusLabel}>{statusGlyph}</span>
                <span className="diff-path"><Code2 size={13} /> {file.path}</span>
                <span className={`diff-resolution ${resolution ?? 'pending'}`} aria-label={`Estado: ${resolutionLabel}`}>{resolutionLabel}</span>
                <span className={`diff-stats${resolution ? ' is-resolved' : ''}`} aria-label={`mais ${effectiveAdded}, menos ${effectiveRemoved}`}><span className="session-diff-added">+{effectiveAdded}</span><span className="session-diff-removed">−{effectiveRemoved}</span></span>
                <div className="diff-actions" onClick={(event) => event.stopPropagation()}>
                  <button className={`diff-viewed${file.viewed ? ' is-checked' : ''}`} type="button" aria-pressed={!!file.viewed} onClick={() => onToggleViewed(file.id)} title={file.viewed ? 'Desmarcar como visto' : 'Marcar como visto'}><Check size={11} />Viewed</button>
                  <button className="icon-button" type="button" title={`Aceitar ${file.path}`} aria-label={`Aceitar ${file.path}`} onClick={() => onAccept(file.id)}><Check size={13} /></button>
                  <button className="icon-button" type="button" title={`Reverter ${file.path}`} aria-label={`Reverter ${file.path}`} onClick={() => onRevert(file.id)}><RotateCcw size={13} /></button>
                </div>
              </div>
              {isSelected && file.viewed && <div className="diff-viewed-state"><Check size={14} /><span>Arquivo marcado como Viewed; diff recolhido.</span></div>}
              {isSelected && !file.viewed && (
                <>
                  <div className="diff-code-preview" aria-label={`Preview de ${file.path}`}>
                    <div className="diff-code-pane original">
                      <span className="diff-code-label">Original</span>
                      <pre className="diff-code-column original">{file.original || 'Arquivo novo'}</pre>
                    </div>
                    <div className="diff-code-pane modified">
                      <span className="diff-code-label">Modificado</span>
                      <pre className="diff-code-column modified">{file.modified || 'Arquivo removido'}</pre>
                    </div>
                  </div>
                  <div className="diff-selected-editor" data-selected-diff-id={file.id} aria-label={`Diff Monaco de ${file.path}`}>
                    <DiffEditor height="100%" original={file.original} modified={file.modified} theme={monacoTheme} language={language}
                      /* (R-091) Sem keepCurrent*Model, ocultar o editor desmonta o widget
                         antes do reset dos modelos e o Monaco lança
                         "TextModel got disposed before DiffEditorWidget model got reset". */
                      keepCurrentOriginalModel keepCurrentModifiedModel options={{ readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, automaticLayout: true }} />
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function EditorArea({
  activeSessionId,
  tabs,
  activeTabId,
  browserViews,
  searchQuery,
  searchResults,
  searchFocusRequest,
  diffFiles,
  selectedDiffFileId,
  onSelectTab,
  onCloseTab,
  onReorderTabs,
  onNewBrowser,
  onNewFile,
  onNewSearch,
  onNewDiff,
  onNewCustomizations,
  customizationsSurface,
  onNavigateBrowser,
  onBrowserBack,
  onBrowserForward,
  onReloadBrowser,
  onBrowserStatus,
  onChangeViewport,
  onChangeSearchQuery,
  onOpenSearchResult,
  onSelectDiffFile,
  onAcceptDiff,
  onRevertDiff,
  onAcceptAllDiff,
  onRevertAllDiff,
  onToggleViewed,
  onCommit,
  onCreatePr,
  editorMaximized,
  onToggleMaximize,
  onSplit,
  editorContentVisible,
  sidePaneState,
  onToggleEditorHidden,
  onToggleDetails,
  detailsVisible,
  theme = 'dark',
}: EditorAreaProps) {
  const monacoTheme = theme === 'light' ? 'vs' : 'vs-dark'
  const visibleTabs = useMemo(() => getEditorTabsVisibleForSession(tabs, activeSessionId), [tabs, activeSessionId])
  const resolvedActiveTabId = resolveVisibleEditorTabId(visibleTabs, activeTabId)
  const activeTab = visibleTabs.find((tab) => tab.id === resolvedActiveTabId)
  const activeBrowser = activeTab?.browserId ? browserViews.find((view) => view.id === activeTab.browserId && view.sessionId === activeSessionId) : undefined
  const [addTabMenuOpen, setAddTabMenuOpen] = useState(false)
  const [tabMenu, setTabMenu] = useState<ContextMenuState | null>(null)
  const [tabDragId, setTabDragId] = useState<string | null>(null)
  const [tabDropId, setTabDropId] = useState<string | null>(null)

  // Menu de contexto (botão direito) de uma aba do editor.
  const openTabMenu = (event: React.MouseEvent, tab: EditorTab) => {
    event.preventDefault()
    event.stopPropagation()
    const closeable = isTabCloseable(tab, sidePaneState)
    setTabMenu({
      x: event.clientX,
      y: event.clientY,
      label: `Ações da aba ${tab.title}`,
      items: [
        { id: 'select', label: 'Abrir aba', icon: tabIcon(tab), onSelect: () => onSelectTab(tab.id) },
        { id: 'close', label: 'Fechar aba', icon: <X size={14} />, disabled: !closeable, onSelect: () => onCloseTab(tab.id) },
        { id: 'split', label: 'Dividir editor', icon: <SplitSquareHorizontal size={14} />, separatorBefore: true, onSelect: onSplit },
      ],
    })
  }
  const addTabMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!addTabMenuOpen) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!addTabMenuRef.current?.contains(event.target as Node)) setAddTabMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddTabMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [addTabMenuOpen])

  const panelId = activeTab ? editorTabDomId('editor-tabpanel', activeTab.id) : 'editor-tabpanel-empty'
  const activeTabDomId = activeTab ? editorTabDomId('editor-tab', activeTab.id) : undefined
  const hasActiveSurface = !!activeTab && (activeTab.type !== 'browser' || !!activeBrowser)
  const runAddTabAction = (action: () => void) => {
    setAddTabMenuOpen(false)
    action()
  }

  return (
    <section className="editor-pane" aria-label="Área principal do editor">
      <div className="editor-pane-header">
        <div className="editor-tabs" role="tablist" aria-label="Abas do editor">
          {visibleTabs.map((tab, index) => {
            const isActive = tab.id === activeTab?.id
            const tabId = editorTabDomId('editor-tab', tab.id)
            return (
              <div
                className={`editor-tab${isActive ? ' is-active' : ''}${tabDragId === tab.id ? ' is-dragging' : ''}${tabDropId === tab.id ? ' is-drop-over' : ''}`}
                role="tab"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(DragTypes.EDITOR_TAB, tab.id)
                  event.dataTransfer.effectAllowed = 'move'
                  setTabDragId(tab.id)
                }}
                onDragOver={(event) => {
                  if (!tabDragId || tabDragId === tab.id) return
                  const source = visibleTabs.find((item) => item.id === tabDragId)
                  if (!source || source.sessionId !== tab.sessionId) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  if (tabDropId !== tab.id) setTabDropId(tab.id)
                }}
                onDragLeave={() => { if (tabDropId === tab.id) setTabDropId(null) }}
                onDrop={(event) => {
                  event.preventDefault()
                  const fromId = event.dataTransfer.getData(DragTypes.EDITOR_TAB) || tabDragId
                  setTabDropId(null)
                  setTabDragId(null)
                  if (fromId && fromId !== tab.id) onReorderTabs(fromId, tab.id)
                }}
                onDragEnd={() => { setTabDragId(null); setTabDropId(null) }}
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-controls={isActive ? panelId : undefined}
                aria-label={tab.title}
                title={tab.title}
                data-session-id={tab.sessionId}
                data-browser-id={tab.browserId}
                data-tab-type={tab.type}
                data-active={isActive}
                id={tabId}
                aria-setsize={visibleTabs.length}
                aria-posinset={index + 1}
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                onContextMenu={(event) => openTabMenu(event, tab)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectTab(tab.id)
                    return
                  }
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
                    event.preventDefault()
                    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % visibleTabs.length : (index - 1 + visibleTabs.length) % visibleTabs.length
                    const nextTab = visibleTabs[nextIndex]
                    if (nextTab) onSelectTab(nextTab.id)
                  }
                }}
              >
                {tabIcon(tab)}<span className="editor-tab-title">{tab.title}</span>
                {isTabCloseable(tab, sidePaneState) ? (
                  <button
                    className="editor-tab-close"
                    type="button"
                    aria-label={`Fechar ${tab.title}`}
                    title={`Fechar ${tab.title}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onCloseTab(tab.id)
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="editor-tab-managed" title="Aba gerenciada — não pode ser fechada em modo somente-detalhes" aria-label="Aba gerenciada">
                    <ShieldCheck size={11} aria-hidden="true" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="editor-add-tab-wrap" ref={addTabMenuRef}>
          <button className="editor-tab-add-menu-button" type="button" aria-haspopup="menu" aria-expanded={addTabMenuOpen} aria-label="Adicionar aba do editor" title="Adicionar aba do editor" onClick={() => setAddTabMenuOpen((current) => !current)}><ListPlus size={15} /></button>
          {addTabMenuOpen && <div className="editor-tab-add-menu" role="menu" aria-label="Novas abas do editor">
            <button type="button" role="menuitem" onClick={() => runAddTabAction(onNewDiff)}><GitCompareArrows size={13} /><span>Changes</span></button>
            <button type="button" role="menuitem" onClick={() => runAddTabAction(onNewFile)}><FileCode2 size={13} /><span>Files</span></button>
            <button type="button" role="menuitem" onClick={() => runAddTabAction(onNewBrowser)}><Globe2 size={13} /><span>Browser</span></button>
            <button type="button" role="menuitem" onClick={() => runAddTabAction(onNewSearch)}><Search size={13} /><span>Search</span></button>
            <button type="button" role="menuitem" onClick={() => runAddTabAction(onNewCustomizations)}><Blocks size={13} /><span>AI Customizations</span></button>
          </div>}
        </div>
        <div className="editor-toolbar">
          <button className="toolbar-button" type="button" title="Dividir editor" aria-label="Dividir editor" onClick={onSplit}><SplitSquareHorizontal size={14} /></button>
          <button className="toolbar-button" type="button" title={editorContentVisible ? 'Ocultar editor' : 'Mostrar editor'} aria-label={editorContentVisible ? 'Ocultar editor' : 'Mostrar editor'} aria-pressed={!editorContentVisible} onClick={onToggleEditorHidden}>{editorContentVisible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          {(activeTab?.type === 'diff' || activeTab?.type === 'file') && (
            <button className={`toolbar-button${detailsVisible ? ' is-active' : ''}`} type="button" title="Alternar detalhes (Alt+Cmd+L)" aria-label="Alternar detalhes" aria-pressed={detailsVisible} onClick={onToggleDetails}><PanelRight size={14} /></button>
          )}
          <button className={`toolbar-button${editorMaximized ? ' is-active' : ''}`} type="button" title={editorMaximized ? 'Restaurar editor' : 'Maximizar editor'} aria-label={editorMaximized ? 'Restaurar editor' : 'Maximizar editor'} aria-pressed={editorMaximized} onClick={onToggleMaximize}>{editorMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div>
      </div>
      <div className="editor-body" id={panelId} role="tabpanel" tabIndex={0} aria-labelledby={activeTabDomId} aria-label={!activeTab ? 'Nenhum editor ativo' : undefined}>
        {!editorContentVisible && hasActiveSurface && <div className="editor-hidden-content" data-testid="editor-hidden-content"><EyeOff size={26} /><strong>Editor oculto</strong><span>A barra de abas permanece visível. Use "Mostrar editor" para reexibir o conteúdo.</span><button className="secondary-button" type="button" onClick={onToggleEditorHidden}><Eye size={13} />Mostrar editor</button></div>}
        {editorContentVisible && !hasActiveSurface && <div className="editor-empty" data-testid="editor-empty-state"><Code2 size={30} /><strong>Nenhum editor ativo</strong><span>Browser, Search e Branch Changes abrem aqui — não na barra auxiliar.</span><button className="secondary-button" type="button" onClick={onNewBrowser}><Globe2 size={13} />Abrir Browser</button></div>}
        {editorContentVisible && activeTab?.type === 'browser' && activeBrowser && <BrowserPreview view={activeBrowser} monacoTheme={monacoTheme} onNavigate={(url) => onNavigateBrowser(activeBrowser.id, url)} onBack={() => onBrowserBack(activeBrowser.id)} onForward={() => onBrowserForward(activeBrowser.id)} onReload={() => onReloadBrowser(activeBrowser.id)} onStatus={(status) => onBrowserStatus(activeBrowser.id, status)} onChangeViewport={(viewport) => onChangeViewport(activeBrowser.id, viewport)} />}
        {editorContentVisible && activeTab?.type === 'search' && <SearchView query={searchQuery} results={searchResults} searchFocusRequest={searchFocusRequest} onChangeQuery={onChangeSearchQuery} onOpenResult={onOpenSearchResult} />}
        {editorContentVisible && activeTab?.type === 'diff' && <DiffView files={diffFiles} selectedFileId={selectedDiffFileId} onSelectFile={onSelectDiffFile} onAccept={onAcceptDiff} onRevert={onRevertDiff} onAcceptAll={onAcceptAllDiff} onRevertAll={onRevertAllDiff} onToggleViewed={onToggleViewed} onCommit={onCommit} onCreatePr={onCreatePr} monacoTheme={monacoTheme} />}
        {editorContentVisible && activeTab?.type === 'customizations' && customizationsSurface}
        {editorContentVisible && activeTab?.type === 'file' && activeTab.imagePreview && (
          <ImagePreview
            path={activeTab.path}
            alt={activeTab.title}
            dataBase64={activeTab.imagePreview.dataBase64}
            mime={activeTab.imagePreview.mime}
            isRealFile={!!activeTab.isRealFile}
          />
        )}
        {/* (4.4-fix, validação manual) Falha de leitura = ERROR EDITOR explícito
            (espelha createEditorOpenError do VS Code) — nunca conteúdo sintético. */}
        {editorContentVisible && activeTab?.type === 'file' && !activeTab.imagePreview && activeTab.readError && (
          <div className="monaco-editor-shell" data-testid="file-read-error">
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--vscode-errorForeground)', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ Não foi possível ler o arquivo — {activeTab.path}</span>
            </div>
            <div style={{ height: 'calc(100% - 29px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, background: 'var(--vscode-editor-background)', color: 'var(--vscode-errorForeground)', textAlign: 'center', padding: 24 }}>
              <CircleAlert size={28} aria-hidden="true" />
              <strong>O editor não pôde ser aberto</strong>
              <span style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)', maxWidth: 420 }}>{activeTab.readError}</span>
              <span style={{ fontSize: 11, color: 'var(--vscode-descriptionForeground)' }}>A leitura veio do backend Single Port (/fs/read). Verifique se o arquivo existe em disco.</span>
            </div>
          </div>
        )}
        {/* Sem conteúdo E sem erro: estado honesto — este fluxo abriu a aba sem
            dados (superfícies demo: split/new-file/search). NUNCA mock silencioso. */}
        {editorContentVisible && activeTab?.type === 'file' && !activeTab.imagePreview && !activeTab.readError && activeTab.content == null && (
          <div className="monaco-editor-shell" data-testid="file-content-unavailable">
            <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--vscode-descriptionForeground)', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)' }}>
              <span>📄 Conteúdo indisponível — {activeTab.path}</span>
            </div>
            <div style={{ height: 'calc(100% - 29px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, background: 'var(--vscode-editor-background)', color: 'var(--vscode-foreground)', textAlign: 'center', padding: 24 }}>
              <FileCode2 size={28} aria-hidden="true" />
              <strong>Este arquivo não foi lido do disco</strong>
              <span style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)', maxWidth: 420 }}>Aberturas pelo EXPLORER (Single Port) trazem o conteúdo real. Este caminho é de uma superfície sem leitura.</span>
            </div>
          </div>
        )}
        {editorContentVisible && activeTab?.type === 'file' && !activeTab.imagePreview && !activeTab.readError && activeTab.content != null && <div className="monaco-editor-shell">
          <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--vscode-descriptionForeground)', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📄 Arquivo real do disco — {activeTab.path}</span>
            <span style={{ fontSize: 10, background: 'var(--vscode-badge-background)', color: 'var(--vscode-badge-foreground)', padding: '2px 6px', borderRadius: 4 }}>REAL</span>
          </div>
          <Editor height="calc(100% - 29px)" defaultLanguage={languageForPath(activeTab.path)} defaultValue={activeTab.content} value={activeTab.content} theme={monacoTheme} options={{ minimap: { enabled: false }, fontSize: 13, automaticLayout: true, padding: { top: 12 }, readOnly: false }} />
        </div>}
      </div>
      <ContextMenu menu={tabMenu} onClose={() => setTabMenu(null)} />
    </section>
  )
}

function editorTabDomId(prefix: string, id: string): string {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

