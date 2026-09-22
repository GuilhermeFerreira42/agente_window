import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// FATIA-04 (4.4): módulo explorer-search via Barrel único — App NUNCA importa
// caminhos internos do módulo (fronteira LEGO, FT).
import { BrowserFsPort, createExplorerSearchModule, ExplorerFsWatchClient, type IExplorerSearchModule, type WorkspaceUri } from './modules/explorer-search'
import { createShellCommandRegistry } from './domain/shellCommandRegistry'
import { clampMenuPosition, isImageFile } from './domain/filePreview'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels'
import { CheckCircle2, ChevronLeft, Info, X } from 'lucide-react'
import { buildProjectDiffFiles, initialDiffFiles, initialProviders, initialSessions, searchResults as allSearchResults } from './data'
import { customizationItems, harnesses, DEFAULT_HARNESS_ID } from './aiCustomizationsData'
import { toggleEnablement, type EnablementState, type ProjectedItem } from './domain/aiCustomizations'
import { aggregatePlugins, projectPluginContributions, EMPTY_PLUGIN_ENABLEMENT } from './domain/agentPlugins'
import { initialPluginDiscoveries } from './agentPluginsData'
import { CustomizationsView } from './components/CustomizationsView'
import {
  closeCustomView,
  customViewTitle,
  dismissCustomViewOnBack,
  dismissCustomViewOnSessionOpen,
  loadCustomViewState,
  openCustomView,
  restoredPartVisibility,
  saveCustomViewState,
  shouldShowCustomViewGrid,
  type CustomViewId,
} from './domain/customView'
import type { Attachment, BrowserViewState, BrowserViewport, ChatCopyKind, ComposerDraft, ComposerHistoryEntry, DiffFile, EditorTab, Session } from './types'
import {
  assertWorkbenchInvariants,
  navigateBrowser as navigateBrowserState,
  reloadBrowser as reloadBrowserState,
  resolveActiveChatId,
  setAllDiffAccepted,
  setBrowserStatus as setBrowserStatusState,
  setBrowserViewport as setBrowserViewportState,
  setDiffAccepted,
  stepBrowserHistory,
  toggleDiffViewed,
  updateSessionAndChatStatus,
  updateSessionStatus,
} from './domain/sessionState'
import {
  getBrowserViewsForSession,
  getEditorTabsVisibleForSession,
  removeBrowserResourceForTab,
  removeBrowserResourcesForSession,
} from './domain/browserOwnership'
import { filterSearchResults } from './domain/search'
import { resolveNextEditorTabId, resolveVisibleEditorTabId } from './domain/editorTabs'
import { reorderEditorTabs, reorderSessions } from './domain/dragAndDrop'
import { isChatCentered, isEditorContentVisible, isTabBarVisible, isTabCloseable, resolveDetailPanelVisible, resolveSidePaneState } from './domain/sidePane'
import { clampSidebarWidth, loadLayoutState, partSizesForSession, saveLayoutState, SIDEBAR_WIDTH_DEFAULT, loadSessionLayouts, saveSessionLayouts } from './domain/layoutPersistence'
import { isFileSystemAccessSupported, pickDirectory as pickDirectoryReal, readDirectoryEntries, readFileContent, saveRootHandle, loadRootHandle, clearRootHandle, type FileSystemEntry } from './domain/fileSystem'
import { captureSessionLayout, forgetSessionLayout, restoreSessionLayout, type SessionLayoutMap } from './domain/sessionLayout'
import { observableValue, transaction } from './domain/observable'
import { createLayoutSync } from './domain/sessionLayoutSync'
import { canSplitMainEditor, createAgentWorkbenchLayout, readSinglePaneSetting } from './domain/agentWorkbenchLayout'
import { enterDetailOnly, showEditorRestore, EMPTY_DOCKED_STATE, type DockedControllerState } from './domain/dockedAuxiliaryController'
import { classifyViewport, isPhoneViewport } from './domain/mobileLayout'
import {
  EMPTY_NAVIGATION_STACK,
  navigateBack,
  dismissLayer,
  pushLayer,
  resetForSessionSwitch,
  topLayer,
  type MobileLayer,
  type MobileNavigationStack,
} from './domain/mobileNavigationStack'
import { createLayoutController, layoutPlatformFor } from './domain/layoutController'
import { commitDraft, createManagementState, discardDraft, openDraft, selectProviderForNewSession } from './domain/sessionsManagement'
import { AuxiliaryBar } from './components/AuxiliaryBar'
import { ChatPanel } from './components/ChatPanel'
import { EditorArea } from './components/EditorArea'
import { MobileDiffView } from './components/MobileDiffView'
import { SessionLanding } from './components/SessionLanding'
import { SessionSidebar } from './components/SessionSidebar'
import { SessionsPicker } from './components/SessionsPicker'
import { TerminalPanel } from './components/TerminalPanel'
import { Titlebar } from './components/Titlebar'
import {
  readNewSessionViewState,
  writeNewSessionViewState,
  seedCreatedFromNewSession,
  type NewSessionViewState,
} from './domain/newSessionViewState'

// Breakpoints do original (layoutPolicy.ts): phone ≤600px, tablet ≤1024px, e o
// single-pane só é acionado em plataformas móveis (toque). Encolher uma janela de
// desktop nunca deve virar single-pane — por isso o gate por toque/SO.
// A classificação de viewport é derivada pelo domínio `mobileLayout` (R-045/R-047).

/** Detecta plataforma de toque/móvel a partir do ambiente do browser. */
function detectTouch(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  const touch = (nav?.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(nav?.userAgent ?? '')
  return coarse || (touch && mobileUa) || mobileUa
}

// single-pane só é acionado em plataforma móvel (toque). O domínio `mobileLayout`
// classifica o viewport; desktop (sem toque) nunca vira single-pane, mesmo
// estreito. Em plataforma móvel, phone e tablet acionam single-pane.
function isSinglePaneWidth(width: number): boolean {
  if (!detectTouch()) return false
  const viewportClass = classifyViewport({ width, touch: true })
  return viewportClass === 'phone' || viewportClass === 'tablet'
}

const firstSession = initialSessions[0]
const initialBrowser: BrowserViewState = {
  id: 'browser-s1-1',
  sessionId: firstSession.id,
  title: 'Browser',
  url: 'https://agents.local/sessions/s1',
  history: ['https://agents.local/sessions/s1'],
  historyIndex: 0,
  status: 'loading',
  viewport: 'desktop',
  reloadToken: 0,
}

const initialEditorTabs: EditorTab[] = [
  { id: 'browser-tab-s1-1', type: 'browser', title: 'Browser', sessionId: firstSession.id, browserId: initialBrowser.id },
]

const initialDiffFilesBySession: Record<string, DiffFile[]> = Object.fromEntries(
  initialSessions
    .filter((session) => !session.archived)
    .map((session) => [session.id, initialDiffFiles.map((file) => ({ ...file }))]),
)

function timeLabel() {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date())
}

const COMPOSER_HISTORY_MAX_ENTRIES = 40

function sameComposerHistoryEntry(left: ComposerHistoryEntry | undefined, right: ComposerHistoryEntry): boolean {
  if (!left || left.text !== right.text || left.model !== right.model || left.mode !== right.mode) return false
  return left.attachments.length === right.attachments.length && left.attachments.every((attachment, index) => {
    const other = right.attachments[index]
    return attachment.id === other.id && attachment.name === other.name && attachment.kind === other.kind
  })
}

// FATIA-04 (4.4): slot DOM do módulo explorer-search. O mount/unmount REAL é
// do módulo (DOM só dentro do slot; estado do serviço sobrevive a remount).
type ExplorerContextMenuState = {
  x: number; y: number;
  items: Array<{ id: string; label: string; enabled: boolean; group?: string; order: number; danger?: boolean }>
}

function ExplorerModuleSlot({ module }: { module: IExplorerSearchModule }) {
  const hostRef = useCallback((el: HTMLDivElement | null) => {
    if (el) module.mount(el)
    else module.unmount()
  }, [module])
  return <div ref={hostRef} style={{ display: 'contents' }} data-testid="explorer-module-slot" />
}

// (BLOCO 4.4-fix BUG-V1) Host do menu de contexto do Explorer COM clamp na
// viewport: no painel estreito à direita o botão "…" abre o menu sangrando para
// fora da tela (texto truncado). Medimos o tamanho real no mount e reposicionamos
// — rótulos sempre íntegros, nunca fora da tela.
function ExplorerContextMenuHost({ state, onClose, onExecute }: {
  state: ExplorerContextMenuState
  onClose: () => void
  onExecute: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: state.x, y: state.y })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const clamped = clampMenuPosition(state.x, state.y, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight)
    if (clamped.x !== pos.x || clamped.y !== pos.y) setPos(clamped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])
  return (
    <div
      ref={ref}
      role="menu"
      data-explorer-context-menu
      data-testid="explorer-context-menu"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 2000,
        minWidth: 180,
        // largura natural do conteúdo: rótulos longos NUNCA quebram linha
        // (fiel ao VSCode); o clamp reposiciona para caber o menu inteiro.
        width: 'max-content',
        maxWidth: 'calc(100vw - 16px)',
        background: 'var(--vscode-menu-background, #252526)',
        border: '1px solid var(--vscode-menu-border, #454545)',
        borderRadius: 4,
        padding: '2px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.36)',
      }}
    >
      {[...state.items].sort((a, b) => a.order - b.order).map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          disabled={!item.enabled}
          style={{
            display: 'block', width: '100%', textAlign: 'left', whiteSpace: 'nowrap',
            background: 'none', border: 'none', padding: '4px 12px',
            color: item.enabled ? 'var(--vscode-menu-foreground, #cccccc)' : 'var(--vscode-disabledForeground, #6b6b6b)',
            cursor: item.enabled ? 'pointer' : 'default', font: 'inherit', fontSize: 13,
          }}
          onClick={() => {
            onClose()
            void onExecute(item.id)
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const persistedLayout = useRef(loadLayoutState())
  const [activeSessionId, setActiveSessionId] = useState(firstSession.id)
  // (E14/R-022/R-026) Sessions Part grid: ids das sessões visíveis lado a lado.
  // Por padrão só a sessão ativa é visível (arranjo single). Abrir uma sessão
  // "ao lado" anexa um peer; o grid renderiza uma view por sessão visível.
  const [visibleSessionIds, setVisibleSessionIds] = useState<string[]>([firstSession.id])
  const [activeChatBySession, setActiveChatBySession] = useState<Record<string, string>>(() => Object.fromEntries(initialSessions.map((session) => [session.id, session.mainChatId])))
  const [sidebarVisible, setSidebarVisible] = useState(persistedLayout.current.shell.sidebarVisible)
  const [auxiliaryVisible, setAuxiliaryVisible] = useState(persistedLayout.current.shell.auxiliaryVisible)
  const [terminalVisible, setTerminalVisible] = useState(persistedLayout.current.shell.terminalVisible)
  const [sidebarWidth, setSidebarWidth] = useState(persistedLayout.current.shell.sidebarWidth)
  const [partSizesBySession, setPartSizesBySession] = useState<Record<string, number[]>>(persistedLayout.current.partSizesBySession)

  const [auxiliaryTab, setAuxiliaryTab] = useState<'changes' | 'files'>('changes')
  // FATIA-04 (4.4): módulo explorer-search — criado UMA vez no boot (raiz da
  // config do server, Q9: sem picker), sobrevive a trocas de sessão/aba.
  const [explorerModule, setExplorerModule] = useState<IExplorerSearchModule | null>(null)
  const explorerFsRef = useRef<BrowserFsPort | null>(null)
  const handleExplorerFileOpenedRef = useRef<(uri: WorkspaceUri) => void>()
  const explorerMenusRef = useRef(createShellCommandRegistry())
  const [explorerContextMenu, setExplorerContextMenu] = useState<ExplorerContextMenuState | null>(null)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const fs = new BrowserFsPort({ watchClient: new ExplorerFsWatchClient({}) })
        explorerFsRef.current = fs
        const root: WorkspaceUri = await fs.discoverRoot()
        if (cancelled) return
        const module = createExplorerSearchModule({
          fs,
          menus: explorerMenusRef.current,
          contextMenu: { open: (input) => setExplorerContextMenu(input) },
          workspaceRoot: root,
        })
        await module.explorer.openFolder({ uri: root })
        if (cancelled) { module.dispose(); return }
        module.onEvent((e) => {
          if (e.type === 'error') console.warn('[explorer-search]', e.code, e.message)
          if (e.type === 'explorer.fileOpened') handleExplorerFileOpenedRef.current?.(e.uri)
        })
        setExplorerModule(module)
      } catch (err) {
        // Sem raiz configurada o Explorer fica vazio, mas NUNCA derruba o app.
        console.warn('[explorer-search] boot: raiz não descoberta', err)
      }
    })()
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    if (!explorerContextMenu) return
    const onDown = (ev: MouseEvent) => {
      if (!(ev.target as HTMLElement).closest('[data-explorer-context-menu]')) setExplorerContextMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [explorerContextMenu])
  // E4 — estado de layout por sessão: ao sair capturamos auxiliaryVisible +
  // activeViewContainerId; ao voltar restauramos. Working sets (abas/browser)
  // são preservados separadamente e nunca limpos ao alternar de sessão.
  const sessionLayouts = useRef<SessionLayoutMap>(loadSessionLayouts())

  // FileSystem real - integração com File System Access API (02_FILESYSTEM_WORKSPACE_REAL)
  const [fileSystemEntries, setFileSystemEntries] = useState<FileSystemEntry[]>([])
  const [, setFileSystemRootHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [fileSystemRootName, setFileSystemRootName] = useState<string>('')
  const [fileSystemLoading, setFileSystemLoading] = useState(false)
  const fileSystemSupported = isFileSystemAccessSupported()

  // (R-092 / LAYOUT.md §Custom View Grid) Superfície full-surface contribuída,
  // mutuamente exclusiva com Sessions Part, Editor, Auxiliary Bar e Panel.
  const [customView, setCustomView] = useState(() => loadCustomViewState())
  const customViewActive = shouldShowCustomViewGrid(customView)

  // Carregar handle persistido do IndexedDB ao iniciar
  useEffect(() => {
    if (!fileSystemSupported) return
    loadRootHandle().then(async (handle) => {
      if (handle) {
        try {
          const entries = await readDirectoryEntries(handle)
          setFileSystemRootHandle(handle)
          setFileSystemRootName(handle.name)
          setFileSystemEntries(entries)
        } catch {
          // Handle salvo ficou inválido (pasta movida/permissão revogada):
          // seguimos com o workspace mockado em vez de quebrar a inicialização.
        }
      }
    })
  }, [fileSystemSupported])

  const handlePickDirectory = async () => {
    if (!fileSystemSupported) {
      notify('File System Access API não suportada - use Chrome/Edge')
      return
    }
    setFileSystemLoading(true)
    try {
      const handle = await pickDirectoryReal()
      if (handle) {
        const entries = await readDirectoryEntries(handle)
        setFileSystemRootHandle(handle)
        setFileSystemRootName(handle.name)
        setFileSystemEntries(entries)
        await saveRootHandle(handle)
        notify(`Pasta real selecionada: ${handle.name} - ${entries.length} itens`)
      }
    } catch (e) {
      console.error(e)
      notify('Falha ao escolher pasta')
    } finally {
      setFileSystemLoading(false)
    }
  }

  const handleClearDirectory = async () => {
    setFileSystemEntries([])
    setFileSystemRootHandle(null)
    setFileSystemRootName('')
    await clearRootHandle()
    notify('Pasta real limpa')
  }

  const handleOpenFileHandle = async (entry: FileSystemEntry) => {
    if (entry.kind === 'directory') {
      toggleFolder(entry.path)
      return
    }
    try {
      const fileHandle = entry.handle as FileSystemFileHandle
      const content = await readFileContent(fileHandle)
      // Abrir no editor como file tab real
      openEditorTab('file', { title: entry.name, path: entry.path, content })
      // (E10/R-083) mesmo reveal do fluxo do Explorer — o anexo precisa acordar.
      setEditorHidden(false)
      notify(`Arquivo real aberto: ${entry.name}`)
    } catch (e) {
      console.error(e)
      notify(`Falha ao ler ${entry.name}`)
    }
  }

  // R-030 — Todo o estado de layout por sessão flui de um OBSERVABLE da sessão
  // ativa (nunca de eventos), como no LAYOUT_CONTROLLER.md. As três células
  // abaixo são as fontes observáveis; um `autorun` (instalado no effect adiante)
  // detecta a troca real e dispara capturar/restaurar/suprimir. `liveLayoutRef`
  // espelha o estado renderizado da sessão que sai, para a captura lê-lo.
  const activeSessionResourceObs = useRef(observableValue<string | undefined>('activeSessionResource', firstSession.id))
  const multipleSessionsVisibleObs = useRef(observableValue('multipleSessionsVisible', false))
  const visibleSessionResourcesObs = useRef(observableValue<readonly string[]>('visibleSessionResources', [firstSession.id]))
  const liveLayoutRef = useRef<{ auxiliaryVisible: boolean; activeViewContainerId: 'changes' | 'files' }>({ auxiliaryVisible: persistedLayout.current.shell.auxiliaryVisible, activeViewContainerId: 'changes' })
  // E16 — AI Customizations: harness ativo + enablement dos built-ins (store
  // separado da descoberta). Estado por janela, como no original.
  const [harnessId, setHarnessId] = useState(DEFAULT_HARNESS_ID)
  const [customizationEnablement, setCustomizationEnablement] = useState<EnablementState>({ disabled: [] })
  // (R-065) Agent plugins contribuídos dinamicamente: o AgentPluginService
  // agrega as discoveries (colisão por identidade canônica resolvida por
  // prioridade) e projeta seus conteúdos como itens 'plugin', que fluem pelo
  // mesmo pipeline de harness/enablement da view de AI Customizations.
  const pluginDiscoveries = useRef(initialPluginDiscoveries)
  const allCustomizationItems = useMemo(() => {
    const plugins = aggregatePlugins(pluginDiscoveries.current, { pluginsEnabled: true })
    return [...customizationItems, ...projectPluginContributions(plugins, EMPTY_PLUGIN_ENABLEMENT)]
  }, [])
  // Auxiliary sections mirror the reference view state: collapse/expand is
  // remembered by session instead of leaking between independent workspaces.
  const [checksExpandedBySession, setChecksExpandedBySession] = useState<Record<string, boolean>>({})
  const [expandedFoldersBySession, setExpandedFoldersBySession] = useState<Record<string, Record<string, boolean>>>({})
  const [editorTabs, setEditorTabs] = useState<EditorTab[]>(initialEditorTabs)
  const [activeTabId, setActiveTabId] = useState<string | undefined>(initialEditorTabs[0].id)
  const [browserViews, setBrowserViews] = useState<BrowserViewState[]>([initialBrowser])
  const [searchQuery, setSearchQuery] = useState('menubar')
  const [searchFocusRequest, setSearchFocusRequest] = useState(0)
  // Changes are resolved from the active session, matching the reference
  // SessionChangesEditor input instead of sharing accept/view state globally.
  const [diffFilesBySession, setDiffFilesBySession] = useState<Record<string, DiffFile[]>>(initialDiffFilesBySession)
  const [selectedDiffFileBySession, setSelectedDiffFileBySession] = useState<Record<string, string | undefined>>({})
  // The original input model stores picker state with the active conversation.
  // Keep the mock equivalent keyed by session plus nested chat, not globally.
  const [modelByChat, setModelByChat] = useState<Record<string, string>>({})
  const [modeByChat, setModeByChat] = useState<Record<string, string>>({})
  const [composerDrafts, setComposerDrafts] = useState<Record<string, ComposerDraft>>({})
  const [composerHistoryByChat, setComposerHistoryByChat] = useState<Record<string, ComposerHistoryEntry[]>>({})
  const [approved, setApproved] = useState(false)
  const [toast, setToast] = useState<string | undefined>()
  const [mobilePane, setMobilePane] = useState<'chat' | 'editor' | 'details'>('chat')
  // (R-077) Pilha de navegação mobile: camadas transitórias (drawers, pickers,
  // editores full-screen) empilhadas no phone. A back-navigation dispensa a
  // camada do topo; trocar de sessão reseta a pilha.
  const [navStack, setNavStack] = useState<MobileNavigationStack>(EMPTY_NAVIGATION_STACK)
  const [isSinglePane, setIsSinglePane] = useState(() => typeof window !== 'undefined' && isSinglePaneWidth(window.innerWidth))
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && isPhoneViewport({ width: window.innerWidth, touch: detectTouch() }))
  // E15 — serviço de layout da Agents Window: o setting single-pane é lido UMA
  // vez no startup (como `createSessionsWorkbench`) e publicado imutável. Gate
  // imperativo de split/grid do Main Editor deriva daqui.
  const agentLayout = useRef(createAgentWorkbenchLayout({
    singlePaneSetting: typeof window !== 'undefined' ? readSinglePaneSetting(window.localStorage) : true,
    isPhone: typeof window !== 'undefined' && isPhoneViewport({ width: window.innerWidth, touch: detectTouch() }),
  }))
  // ISessionsManagementService — registro de providers (ordem estável) usado
  // para resolver o provider dono de uma nova sessão (R-002).
  const management = useRef(createManagementState(initialProviders))
  // (R-040) Estado do DockedAuxiliaryBarController: abas capturadas ao entrar em
  // Detail-only, restauradas ao mostrar o editor de novo.
  const dockedController = useRef<DockedControllerState>(EMPTY_DOCKED_STATE)
  // Views de browser capturadas junto com suas abas ao entrar em Detail-only.
  const capturedBrowserViews = useRef<BrowserViewState[]>([])
  // Flag para pular assertWorkbenchInvariants durante transições atômicas
  // (Hide/Show editor) onde browserViews e editorTabs ficam temporariamente
  // dessincronizados entre renders.
  const skipInvariantCheck = useRef(false)
  const [editorMaximized, setEditorMaximized] = useState(false)
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false)
  const [editorHidden, setEditorHidden] = useState(persistedLayout.current.shell.editorHidden)
  // (R-BUG/Val2) — Estado compartilhado de novas sessões (landing). Persiste no
  // localStorage e é herdado pela primeira sessão criada a partir da landing.
  const [newSessionState, setNewSessionState] = useState<NewSessionViewState>(() => readNewSessionViewState())
  // (R-087) Tema claro/escuro: lido do localStorage uma vez, alternado pelo Titlebar.
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (window.localStorage.getItem('agents-theme') as 'dark' | 'light') ?? 'dark'
  })
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
    window.localStorage.setItem('agents-theme', theme)
  }, [theme])
  // (R-BUG/Val2) Sincroniza o newSessionViewState com a preferência atual de
  // aux bar. Assim, quando o usuário for para a landing (excluir todas as
  // sessões), a próxima sessão criada herda a preferência deixada.
  useEffect(() => {
    const next: NewSessionViewState = { ...newSessionState, auxiliaryVisible }
    if (next.auxiliaryVisible !== newSessionState.auxiliaryVisible) {
      writeNewSessionViewState(next)
      setNewSessionState(next)
    }
  }, [auxiliaryVisible])
  const handleToggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])
  const pendingResponseTimers = useRef<Map<string, number>>(new Map())
  const approvalTimer = useRef<number | undefined>(undefined)
  // Editor resources are keyed by an explicit monotonic sequence because
  // Date.now() alone can collide when the user creates tabs quickly.
  const browserSequence = useRef(0)
  const editorTabSequence = useRef(0)
  const browserOrdinalBySession = useRef<Record<string, number>>({ [firstSession.id]: 2 })
  // The reference editor group remembers its active editor while a session is
  // swapped. Keep that memory for owned tabs and a separate pointer for shared
  // Search/file tabs that remain visible across sessions.
  const activeTabBySession = useRef<Record<string, string>>({ [firstSession.id]: initialEditorTabs[0].id })
  const activeGlobalTabId = useRef<string | undefined>()

  // Estado inicial vazio (todas as sessões excluídas). Em vez de trocar por uma
  // tela cheia que esconde as laterais, mantemos o shell montado e usamos uma
  // sessão "rascunho" vazia como sessão ativa; a coluna central mostra o input
  // centralizado (landing) enquanto sidebar e barra auxiliar permanecem visíveis.
  // A landing depende da lista primária (visível ao usuário) estar vazia; runs de
  // automação ficam fora da lista e, portanto, não contam para "há sessões".
  const hasSessions = sessions.some((session) => !session.automation)
  const draftSession = useMemo<Session>(() => ({
    id: 'draft-empty',
    title: 'Nova sessão',
    workspace: 'workspace-local',
    workspacePath: '~/workspace-local',
    section: 'today',
    status: 'completed',
    updated: 'agora',
    diffAdded: 0,
    diffRemoved: 0,
    branch: 'main',
    chats: [{ id: 'draft-empty-main', title: 'Novo chat', status: 'completed', messages: [] }],
    mainChatId: 'draft-empty-main',
  }), [])
  const activeSession = hasSessions
    ? (sessions.find((session) => session.id === activeSessionId) ?? sessions[0])
    : draftSession
  const activeChatId = resolveActiveChatId(activeSession, activeChatBySession)
  // (R-063) Rótulo estável "session-N" por sessão: o terminal segue a sessão
  // ativa e o número é atribuído por ordem de primeira aparição (não muda ao
  // reordenar a lista). Espelha o cenário e2e 05-full-workflow.
  const sessionOrdinals = useRef<Map<string, number>>(new Map())
  if (!sessionOrdinals.current.has(activeSession.id)) {
    sessionOrdinals.current.set(activeSession.id, sessionOrdinals.current.size + 1)
  }
  const activeSessionLabel = `session-${sessionOrdinals.current.get(activeSession.id)}`
  const activeDiffFiles = diffFilesBySession[activeSession.id] ?? []
  const selectedDiffFileId = selectedDiffFileBySession[activeSession.id]
  const checksExpanded = checksExpandedBySession[activeSession.id] ?? true
  const expandedFolders = expandedFoldersBySession[activeSession.id] ?? {}
  const chatKey = `${activeSession.id}:${activeChatId}`
  const selectedModel = modelByChat[chatKey] ?? 'Claude Sonnet 4'
  const selectedMode = modeByChat[chatKey] ?? 'agent'
  const visibleEditorTabs = useMemo(() => hasSessions ? getEditorTabsVisibleForSession(editorTabs, activeSession.id) : [], [hasSessions, editorTabs, activeSession.id])
  // Tipo da aba ativa — usado para "gate" da ação Toggle Details (só faz sentido
  // em abas com painel de detalhes acoplado: Changes/Files, nunca Browser/Search).
  const activeVisibleTabId = resolveVisibleEditorTabId(visibleEditorTabs, activeTabId)
  const activeTabType = visibleEditorTabs.find((tab) => tab.id === activeVisibleTabId)?.type
  const detailsToggleGated = activeTabType === 'diff' || activeTabType === 'file'
  // Sem sessões, o rascunho vazio não tem editor: o chat é a única superfície e
  // centraliza (landing). Forçamos os inputs do side pane para o estado "closed".
  const sidePaneInputs = hasSessions
    ? { hasEditorTabs: visibleEditorTabs.length > 0, editorHidden, auxVisible: auxiliaryVisible }
    : { hasEditorTabs: false, editorHidden: true, auxVisible: false }
  const sidePaneState = resolveSidePaneState(sidePaneInputs)
  const editorContentVisible = isEditorContentVisible(sidePaneInputs)
  const tabBarVisible = isTabBarVisible(sidePaneInputs)
  const chatCentered = isChatCentered(sidePaneInputs)
  // (E7/R-044) O detalhe é transiente sob uma aba Browser enquanto o editor está
  // visível — some ao ativar Browser e retorna ao voltar p/ Changes/Files. Se o
  // editor for oculto com Browser ativo, o painel mostra o fallback Changes/Files.
  const detailPanelVisible = resolveDetailPanelVisible({ auxVisible: auxiliaryVisible, activeTabType, editorContentVisible })
  // (E4/R-033) Controller de layout por plataforma: desktop gerencia a aux bar;
  // mobile/single-pane a omite por completo (não escondida via CSS). O gate de
  // render da coluna de detalhes consulta o controller, não `isSinglePane` cru.
  const layoutController = useMemo(() => createLayoutController(layoutPlatformFor(isSinglePane)), [isSinglePane])
  const renderDesktopAuxiliaryBar = layoutController.managesAuxiliaryBar
    && layoutController.shouldRenderAuxiliaryBar({ auxiliaryVisible: detailPanelVisible, multipleSessionsVisible: false })
  // R-030 — espelha o estado de layout RENDERIZADO da sessão ativa para o ref
  // que a captura (no autorun) lê ao sair da sessão. Atualizado a cada render:
  // enquanto a sessão não troca, este é o estado "ao vivo"; no instante da troca
  // ainda reflete a sessão que sai (a restauração da nova só ocorre no autorun).
  liveLayoutRef.current = { auxiliaryVisible, activeViewContainerId: auxiliaryTab }

  // R-030 — instala UMA vez o gatilho observável de troca de sessão. O autorun
  // reage a `activeSessionResourceObs`/`multipleSessionsVisibleObs` e aplica os
  // efeitos de capturar/restaurar/limpar (LAYOUT_CONTROLLER.md §2). Semeamos o
  // `previous` com a sessão inicial para não sobrescrever o layout hidratado.
  const layoutSyncRef = useRef<ReturnType<typeof createLayoutSync> | null>(null)
  useEffect(() => {
    const handle = createLayoutSync(
      {
        activeSessionResource: activeSessionResourceObs.current,
        multipleSessionsVisible: multipleSessionsVisibleObs.current,
        visibleSessionResources: visibleSessionResourcesObs.current,
      },
      {
        captureOutgoing: (resource) => {
          sessionLayouts.current = captureSessionLayout(sessionLayouts.current, resource, liveLayoutRef.current)
          saveSessionLayouts(sessionLayouts.current)
        },
        restoreIncoming: (resource) => {
          const restored = restoreSessionLayout(sessionLayouts.current, resource)
          setAuxiliaryVisible(restored.auxiliaryVisible)
          setAuxiliaryTab(restored.activeViewContainerId)
        },
        clearVisibleSessionState: (resources) => {
          let map = sessionLayouts.current
          for (const resource of resources) map = forgetSessionLayout(map, resource)
          sessionLayouts.current = map
          saveSessionLayouts(map)
        },
      },
      { initialPreviousResource: firstSession.id },
    )
    layoutSyncRef.current = handle
    return () => {
      handle.dispose()
      layoutSyncRef.current = null
    }
    // Instalação única: os inputs são refs estáveis e os efeitos usam refs/setters estáveis.
  }, [])

  // R-030 — mirror React→observable: sempre que a sessão ativa ou o arranjo
  // visível mudam, publicamos nos observables DENTRO de uma transação, para que
  // o autorun rode no máximo uma vez por lote.
  useEffect(() => {
    transaction(() => {
      multipleSessionsVisibleObs.current.set(visibleSessionIds.length > 1)
      visibleSessionResourcesObs.current.set(visibleSessionIds)
      activeSessionResourceObs.current.set(activeSessionId || undefined)
    })
  }, [activeSessionId, visibleSessionIds])

  // F5 com custom view ativa: volta ativa, com a desired visibility intacta.
  useEffect(() => {
    saveCustomViewState(customView)
  }, [customView])

  const activePartSizes = partSizesForSession({ shell: persistedLayout.current.shell, partSizesBySession }, activeSession.id)
  const unreadCount = sessions.filter((session) => session.unread).length
  const filteredSearchResults = useMemo(() => filterSearchResults(allSearchResults, searchQuery), [searchQuery])

  useEffect(() => {
    const update = () => {
      setIsSinglePane(isSinglePaneWidth(window.innerWidth))
      setIsPhone(isPhoneViewport({ width: window.innerWidth, touch: detectTouch() }))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Persiste o layout entre reloads (visibilidade global + tamanhos por sessão).
  useEffect(() => {
    saveLayoutState({
      shell: { sidebarVisible, auxiliaryVisible, terminalVisible, editorHidden, sidebarWidth },
      partSizesBySession,
    })
  }, [sidebarVisible, auxiliaryVisible, terminalVisible, editorHidden, sidebarWidth, partSizesBySession])

  useEffect(() => () => {
    for (const timer of pendingResponseTimers.current.values()) window.clearTimeout(timer)
    pendingResponseTimers.current.clear()
    window.clearTimeout(approvalTimer.current)
  }, [])

  useEffect(() => {
    if (skipInvariantCheck.current) return
    assertWorkbenchInvariants(sessions, browserViews, editorTabs, activeSession.id, activeChatBySession)
  }, [sessions, browserViews, editorTabs, activeSession.id, activeChatBySession])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(undefined), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = (message: string) => setToast(message)



  const copyText = async (text: string) => {
    try {
      await navigator.clipboard?.writeText(text)
    } catch {
      // Clipboard is optional in a sandboxed preview.
    }
  }

  const activateEditorTab = useCallback((tab: EditorTab | undefined) => {
    if (!tab) {
      setActiveTabId(undefined)
      return
    }
    setActiveTabId(tab.id)
    setMobilePane('editor')
    if (tab.sessionId) {
      activeTabBySession.current[tab.sessionId] = tab.id
    } else {
      activeGlobalTabId.current = tab.id
    }
  }, [])

  const preferredEditorTabForSession = (allTabs: readonly EditorTab[], sessionId: string, requestedId?: string): EditorTab | undefined => {
    const visibleTabs = getEditorTabsVisibleForSession(allTabs, sessionId)
    const requested = visibleTabs.find((tab) => tab.id === requestedId)
    const remembered = visibleTabs.find((tab) => tab.id === activeTabBySession.current[sessionId])
    // Prefer the target session's remembered editor when it has one. Shared
    // Search/file tabs stay in the collection and become the fallback when the
    // target session has no remembered owned editor.
    if (remembered) return remembered
    if (requested && !requested.sessionId) return requested
    const rememberedGlobal = visibleTabs.find((tab) => tab.id === activeGlobalTabId.current)
    return requested ?? rememberedGlobal ?? visibleTabs[0]
  }

  const selectSession = (id: string) => {
    // (LAYOUT.md) Abrir uma sessão dispensa a custom view ativa e devolve as
    // parts cobertas ao estado que o usuário tinha escolhido.
    if (customView.activeView !== null) {
      const desired = restoredPartVisibility(customView)
      setAuxiliaryVisible(desired.auxiliaryBar)
      setTerminalVisible(desired.panel)
      setEditorHidden(!desired.editor)
      setCustomView(dismissCustomViewOnSessionOpen(customView))
      setNavStack((current) => dismissLayer(current, 'custom-view-aiCustomizations'))
    }
    if (id === activeSessionId) return
    // R-030 — a captura/restauração do layout por sessão NÃO é imperativa: flui
    // do observable da sessão ativa via `autorun` (ver createLayoutSync). Aqui
    // só publicamos a nova sessão ativa + arranjo; o gatilho reage e aplica
    // capturar (sessão que sai) → restaurar (sessão que entra).
    setActiveSessionId(id)
    // (E14) Trocar de sessão pela lista colapsa o grid para só a escolhida,
    // exceto quando ela já é um peer visível (aí o grid é mantido, só muda a
    // ativa) — paridade com setActiveSession do ISessionsService.
    setVisibleSessionIds((current) => (current.includes(id) ? current : [id]))
    setSessions((current) => current.map((session) => session.id === id ? { ...session, unread: false } : session))
    activateEditorTab(preferredEditorTabForSession(editorTabs, id, activeTabId))
    setMobilePane('chat')
    // (R-077) Abrir outra sessão reseta as camadas transitórias de navegação.
    setNavStack(resetForSessionSwitch())
  }

  // (R-077) Navega para uma superfície mobile empilhando a camada correspondente
  // na MobileNavigationStack (só faz sentido no phone; no desktop o pane troca
  // sem empilhar). Mantém o `mobilePane` em sincronia.
  const openMobileLayer = (pane: 'editor' | 'details', layer: MobileLayer) => {
    setMobilePane(pane)
    if (isPhone) setNavStack((current) => pushLayer(current, layer))
  }

  // (R-077) Back-navigation da plataforma: dispensa a camada do topo; ao esvaziar
  // volta para o chat (superfície-base da sessão). Retorna true se tratou o back.
  const handleMobileBack = useCallback((): boolean => {
    // No phone a custom view participa da navegação: o back dispensa primeiro.
    const dismissed = dismissCustomViewOnBack(customView)
    if (dismissed.handled) {
      const desired = restoredPartVisibility(customView)
      setAuxiliaryVisible(desired.auxiliaryBar)
      setTerminalVisible(desired.panel)
      setEditorHidden(!desired.editor)
      setCustomView(dismissed.state)
      setNavStack((current) => dismissLayer(current, 'custom-view-aiCustomizations'))
      return true
    }
    const result = navigateBack(navStack)
    if (result.exitedSession) return false
    setNavStack(result.stack)
    // A camada remanescente define para onde voltar; sem mais camadas, chat.
    setMobilePane(topLayer(result.stack) ? 'details' : 'chat')
    return true
  }, [customView, navStack])

  // (E14) Abre uma sessão como PEER ao lado da ativa no Sessions Part grid,
  // sem duplicar. A sessão aberta torna-se a ativa.
  const openSessionBeside = (id: string) => {
    setVisibleSessionIds((current) => (current.includes(id) ? current : [...current, id]))
    if (id !== activeSessionId) selectSession(id)
    notify('Sessão aberta ao lado no grid')
  }

  // (E14) Fecha uma sessão do grid. Nunca esvazia: se fechar a ativa, promove a
  // vizinha anterior; se sobrar só uma, o grid volta ao arranjo single.
  const closeVisibleSession = (id: string) => {
    if (!visibleSessionIds.includes(id) || visibleSessionIds.length <= 1) return
    const index = visibleSessionIds.indexOf(id)
    const next = visibleSessionIds.filter((candidate) => candidate !== id)
    setVisibleSessionIds(next)
    if (id === activeSessionId) {
      const neighbor = next[Math.max(0, index - 1)]
      // Promove a vizinha sem colapsar o grid restante: ajusta a ativa e o
      // layout, mas mantém `next` como arranjo visível.
      if (neighbor && neighbor !== activeSessionId) {
        setActiveSessionId(neighbor)
        // R-030 — promover a vizinha ao fechar um peer do grid é passivo (mantém
        // o layout corrente, não restaura o salvo da vizinha).
        layoutSyncRef.current?.setPreviousResource(neighbor)
        setSessions((current) => current.map((session) => session.id === neighbor ? { ...session, unread: false } : session))
        activateEditorTab(preferredEditorTabForSession(editorTabs, neighbor, activeTabId))
        setMobilePane('chat')
      }
    }
  }

  // Ao selecionar um chat aninhado específico, limpa o unread daquele chat (CAT-D4 / V-11).
  const markNestedChatRead = (sessionId: string, chatId: string) => {
    setSessions((current) => current.map((session) => session.id === sessionId
      ? { ...session, chats: session.chats.map((chat) => chat.id === chatId ? { ...chat, unread: false } : chat) }
      : session))
  }

  // Redimensionamento da barra de sessões via sash/arraste (V-12), com persistência.
  const startSidebarResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const onMove = (moveEvent: PointerEvent) => {
      setSidebarWidth(clampSidebarWidth(startWidth + (moveEvent.clientX - startX)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // (R-071) Duplo-clique no sash da barra de sessões restaura a largura padrão
  // (paridade com o reset de sash do workbench: Sizing → largura default).
  const resetSidebarWidth = () => {
    setSidebarWidth(SIDEBAR_WIDTH_DEFAULT)
    notify('Largura da barra de sessões restaurada')
  }

  const selectEditorTab = (id: string) => {
    const tab = editorTabs.find((candidate) => candidate.id === id)
    if (!tab || (tab.sessionId && tab.sessionId !== activeSession.id)) return
    activateEditorTab(tab)
    // (R-069) Ao trocar a aba do editor, a barra auxiliar reflete o conteúdo
    // correspondente: Changes abre → aux mostra changes; Files abre → aux mostra files.
    if (tab.type === 'diff') {
      setAuxiliaryTab('changes')
      if (!auxiliaryVisible) setAuxiliaryVisible(true)
    }
    if (tab.type === 'file') {
      setAuxiliaryTab('files')
      if (!auxiliaryVisible) setAuxiliaryVisible(true)
    }
  }

  const updateSession = (id: string, updater: (session: Session) => Session) => {
    setSessions((current) => current.map((session) => session.id === id ? updater(session) : session))
  }

  // (E3) Drag & drop: reordenar sessões dentro da mesma seção visível e reordenar
  // abas do editor dentro da mesma sessão. A regra de "seção válida" mora em
  // domain/dragAndDrop.ts (paridade com SESSIONS_LIST.md §Drag and drop).
  const handleReorderSessions = (fromId: string, toId: string) => {
    setSessions((current) => reorderSessions(current, fromId, toId) as Session[])
  }
  const handleReorderEditorTabs = (fromId: string, toId: string) => {
    setEditorTabs((current) => reorderEditorTabs(current, fromId, toId) as EditorTab[])
  }

  const completeChatRun = (session: Session, chatId: string): Session => {
    const next = updateSessionAndChatStatus(session, chatId, 'completed')
    // The workbench cancellation/response lifecycle is session-owned. Keep the
    // parent session working when another nested chat still has an active run.
    return next.chats.some((chat) => chat.status === 'working') ? { ...next, status: 'working' } : next
  }

  const clearPendingTimersForSession = (sessionId: string) => {
    const prefix = `${sessionId}:`
    for (const [key, timer] of pendingResponseTimers.current) {
      if (key.startsWith(prefix)) {
        window.clearTimeout(timer)
        pendingResponseTimers.current.delete(key)
      }
    }
  }

  const createBrowser = () => {
    const sessionId = activeSession.id
    const nextOrdinal = browserOrdinalBySession.current[sessionId] ?? getBrowserViewsForSession(browserViews, sessionId).length + 1
    browserOrdinalBySession.current[sessionId] = nextOrdinal + 1
    const sequence = browserSequence.current++
    const id = `browser-${sessionId}-${Date.now()}-${sequence}`
    const url = `https://agents.local/sessions/${sessionId}`
    const view: BrowserViewState = { id, sessionId, title: `Browser ${nextOrdinal}`, url, history: [url], historyIndex: 0, status: 'loading', viewport: 'desktop', reloadToken: 0 }
    const tab: EditorTab = { id: `${id}-tab`, type: 'browser', title: view.title, sessionId, browserId: id }
    activeTabBySession.current[sessionId] = tab.id
    setBrowserViews((current) => [...current, view])
    setEditorTabs((current) => [...current, tab])
    activateEditorTab(tab)
    setMobilePane('editor')
  }

  const showSessionPicker = () => {
    // Paridade com o Command Center do original: o pill abre o seletor flutuante
    // de sessões (quick-pick "Show Sessions"), não cria uma nova sessão.
    setSessionPickerOpen(true)
  }

  const handleToggleSidebar = () => {
    setSidebarVisible((current) => {
      const next = !current
      // CAT-B4: no single-pane, colapsar a lista de sessões cede a largura ao side
      // pane (editor/detalhe), não ao chat. Enviesamos o split em favor do editor.
      if (!next && editorContentVisible) {
        setPartSizesBySession((sizes) => ({ ...sizes, [activeSession.id]: [38, 62] }))
      }
      return next
    })
  }

  // (R-093 / LAYOUT.md) O grid do workbench é NÃO-proporcional: a Sessions Part
  // é a superfície flexível que absorve o resize da janela; Sidebar, Editor e
  // Auxiliary Bar preservam o tamanho estabelecido pelo usuário.
  //
  // react-resizable-panels trabalha em %, então ao mudar a largura do container
  // reconvertemos o split para manter os PIXELS do editor e jogar todo o delta
  // no chat — sem isso as duas colunas encolheriam proporcionalmente.
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null)
  const surfaceGroupRef = useRef<HTMLDivElement | null>(null)
  const lastSurfaceWidth = useRef(0)

  useEffect(() => {
    const element = surfaceGroupRef.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      const previous = lastSurfaceWidth.current
      lastSurfaceWidth.current = width
      if (!previous || !width || Math.abs(width - previous) < 1) return
      const group = panelGroupRef.current
      if (!group) return
      const [chatPct, editorPct] = group.getLayout()
      if (typeof editorPct !== 'number') return
      const editorPx = (editorPct / 100) * previous
      const nextEditorPct = Math.min(66, Math.max(28, (editorPx / width) * 100))
      if (Math.abs(nextEditorPct - editorPct) < 0.1) return
      group.setLayout([100 - nextEditorPct, nextEditorPct])
      void chatPct
    })
    observer.observe(element)
    return () => observer.disconnect()
  })

  const handlePanelLayout = (sizes: number[]) => {
    // Persiste os tamanhos do split por sessão (Sizing.Distribute + partSizes).
    setPartSizesBySession((current) => {
      const existing = current[activeSession.id]
      if (existing && existing.length === sizes.length && existing.every((value, index) => Math.abs(value - sizes[index]) < 0.5)) return current
      return { ...current, [activeSession.id]: sizes }
    })
  }

  const resetPartSizes = () => {
    // Duplo-clique no sash redistribui igualmente (Sizing.Distribute).
    setPartSizesBySession((current) => ({ ...current, [activeSession.id]: [50, 50] }))
    notify('Tamanhos do painel redistribuídos igualmente')
  }

  const handleSplitEditor = () => {
    // (E15/R-039) No layout single-pane o Main Editor é restrito a exatamente 1
    // group — split/grid são rejeitados. Enquanto o single-pane estiver ativo, o
    // gate consulta o serviço de layout (nunca o setting/context key direto).
    if (isSinglePane && !canSplitMainEditor(agentLayout.current)) {
      notify('Divisão indisponível: o layout single-pane usa um único grupo de editor')
      return
    }
    openEditorTab('file', { title: 'Files (divisão)', path: 'workspace/split' })
    notify('Editor dividido: nova superfície de arquivos aberta')
  }

  const openEditorTab = useCallback((type: EditorTab['type'], options: { title: string; path?: string; sessionId?: string; content?: string; isRealFile?: boolean; imagePreview?: EditorTab['imagePreview']; readError?: string } = { title: type }) => {
    const ownerSessionId = options.sessionId ?? (type === 'browser' || type === 'diff' ? activeSession.id : undefined)
    // For real files with content, don't reuse tab unless same path and same content - allow update
    const existing = editorTabs.find((tab) => tab.type === type
      && (type !== 'file' || tab.path === options.path)
      && (!ownerSessionId || tab.sessionId === ownerSessionId))
    if (existing) {
      // If real file with new content, update it; readError também atualiza a
      // aba existente (content ↔ readError são mutuamente exclusivos: o novo
      // estado sempre substitui o anterior — nunca mock/placeholder residual).
      if (options.readError || (options.content && existing.content !== options.content)) {
        setEditorTabs((current) => current.map((t) => t.id === existing.id ? { ...t, content: options.content, readError: options.readError, isRealFile: options.isRealFile ?? t.isRealFile } : t))
      }
      activateEditorTab(existing)
      return
    }
    const tab: EditorTab = { id: `${type}-${Date.now()}-${editorTabSequence.current++}`, type, title: options.title, path: options.path, sessionId: ownerSessionId, content: options.content, isRealFile: options.isRealFile ?? (!!options.content || !!options.imagePreview), imagePreview: options.imagePreview, readError: options.readError }
    setEditorTabs((current) => [...current, tab])
    activateEditorTab(tab)
  }, [activeSession.id, activateEditorTab, editorTabs])

  // (BLOCO 4.4-fix BUG-P1 + GAP-V1) Clique num arquivo da árvore (evento
  // explorer.fileOpened): lê o conteúdo REAL via FileSystemPort (Single Port),
  // abre/reusa a aba `file` do editor (Image Preview para binários — aceite do
  // bloco) e faz o reveal explícito do anexo no padrão R-083 (nunca só ativar).
  // Mock segue apenas como fallback declarado (aba sem content, criada por
  // outros fluxos — demo Files, pesquisa, split etc.).
  handleExplorerFileOpenedRef.current = (uri: WorkspaceUri) => {
    setExplorerContextMenu(null)
    const fs = explorerFsRef.current
    if (!fs) return
    const name = uri.split('/').pop() ?? uri
    void (async () => {
      try {
        if (isImageFile(name)) {
          const bin = await fs.readFileBinary({ uri, maxBytes: 8 * 1024 * 1024 })
          openEditorTab('file', { title: name, path: uri, isRealFile: true, imagePreview: { dataBase64: bin.dataBase64, mime: bin.mime } })
        } else {
          const read = await fs.readFile({ uri })
          openEditorTab('file', { title: name, path: uri, content: read.content, isRealFile: true })
        }
        // (E10/R-083 — mesmo padrão do openDiff) revelar o anexo do editor.
        setEditorHidden(false)
      } catch (err) {
        console.warn('[explorer-search] falha ao abrir arquivo', err)
        // (4.4-fix, validação manual) Falha de leitura NUNCA cai em conteúdo
        // sintético: abre a aba como ERROR EDITOR explícito (espelha o
        // createEditorOpenError do VS Code — handleSetInputError).
        openEditorTab('file', {
          title: name,
          path: uri,
          readError: err instanceof Error ? err.message : String(err),
        })
        setEditorHidden(false)
        notify(`Não foi possível abrir ${name}`)
      }
    })()
  }

  const openBrowser = () => createBrowser()
  const openSearch = useCallback(() => {
    setSearchFocusRequest((current) => current + 1)
    openEditorTab('search', { title: 'Search' })
  }, [openEditorTab])
  const openDiff = (sessionId: string = activeSession.id, diffFileId?: string) => {
    if (sessionId !== activeSession.id) selectSession(sessionId)
    if (diffFileId) {
      setSelectedDiffFileBySession((current) => ({ ...current, [sessionId]: diffFileId }))
    }
    openEditorTab('diff', { title: 'Branch Changes', sessionId })
    setAuxiliaryTab('changes')
    setAuxiliaryVisible(true)
    // (E10/R-083) A Changes pill revela explicitamente o editor mesmo se o side
    // pane estava fechado ou em detail-only — nunca apenas ativa a aba.
    setEditorHidden(false)
  }

  // (R-092) AI Customizations é uma CUSTOM VIEW full-surface, não uma aba:
  // ao abrir, captura a visibilidade desejada das parts e as cobre por inteiro
  // (só Title Bar e Sidebar sobrevivem).
  const openCustomViewGrid = useCallback((view: CustomViewId) => {
    setCustomView((current) =>
      openCustomView(current, view, {
        sessionsPart: true,
        editor: !editorHidden,
        auxiliaryBar: auxiliaryVisible,
        panel: terminalVisible,
      }),
    )
  }, [auxiliaryVisible, editorHidden, terminalVisible])

  const openCustomizations = useCallback(() => {
    openCustomViewGrid('aiCustomizations')
    // (LAYOUT.md) No phone a custom view entra na pilha de navegação, para que o
    // back da plataforma consiga dispensá-la.
    if (isPhone) {
      setNavStack((current) =>
        pushLayer(current, { id: 'custom-view-aiCustomizations', kind: 'custom-view', label: 'AI Customizations' }),
      )
    }
  }, [isPhone, openCustomViewGrid])

  // Fechar restaura EXATAMENTE a visibilidade retida (desired), nunca um default.
  const closeCustomViewGrid = useCallback(() => {
    setCustomView((current) => {
      if (current.activeView === null) return current
      const desired = restoredPartVisibility(current)
      setAuxiliaryVisible(desired.auxiliaryBar)
      setTerminalVisible(desired.panel)
      setEditorHidden(!desired.editor)
      setNavStack((stack) => dismissLayer(stack, 'custom-view-aiCustomizations'))
      return closeCustomView(current)
    })
  }, [])

  const handleRunSkill = (item: ProjectedItem) => {
    notify(`Skill ${item.name} executada (mock)`)
  }
  const handleToggleCustomization = (item: ProjectedItem) => {
    setCustomizationEnablement((current) => toggleEnablement(current, item))
    notify(item.enabled ? `${item.name} desabilitada` : `${item.name} habilitada`)
  }
  const handleRevealCustomization = (item: ProjectedItem) => {
    notify(`Aberto: ${item.uri}`)
  }

  const customizationsSurfaceEmbedded = (
    <CustomizationsView
      embedded
      items={allCustomizationItems}
      harnesses={harnesses}
      harnessId={harnessId}
      enablement={customizationEnablement}
      onChangeHarness={setHarnessId}
      onToggleEnablement={handleToggleCustomization}
      onRunSkill={handleRunSkill}
      onRevealItem={handleRevealCustomization}
    />
  )

  const customizationsSurface = (
    <CustomizationsView
      items={allCustomizationItems}
      harnesses={harnesses}
      harnessId={harnessId}
      enablement={customizationEnablement}
      onChangeHarness={setHarnessId}
      onToggleEnablement={handleToggleCustomization}
      onRunSkill={handleRunSkill}
      onRevealItem={handleRevealCustomization}
    />
  )

  // Hide/Show Editor (⌥⌘E). Par mutuamente exclusivo editor/detalhe: ocultar o
  // editor cai em "detail-only" e, como o painel nunca pode ficar vazio, garante
  // que a barra auxiliar (detalhe) esteja visível como fallback.
  //
  // (R-040) O DockedAuxiliaryBarController governa a transição: entrar em
  // Detail-only FECHA as abas não-acopladas (mantém Changes/Files), CAPTURANDO
  // as restauráveis (Browser/Customizations) e DESCARTANDO as não-restauráveis
  // (Search untitled sujo). Mostrar o editor restaura as capturadas ao fim.
  const handleToggleEditorHidden = useCallback(() => {
    setEditorHidden((current) => {
      const next = !current
      if (next) {
        setAuxiliaryVisible(true)
        setEditorTabs((tabs) => {
          const result = enterDetailOnly(tabs, activeSession.id)
          dockedController.current = result.state
          // Browser tabs capturadas levam junto a sua view viva (a ownership
          // browser-view↔tab é invariante); guardamos as views para restaurar.
          const capturedBrowserIds = new Set(
            result.state.captured
              .map((entry) => entry.tab)
              .filter((tab) => tab.type === 'browser' && tab.browserId)
              .map((tab) => tab.browserId as string),
          )
          if (capturedBrowserIds.size > 0) {
            setBrowserViews((views) => {
              capturedBrowserViews.current = views.filter((view) => capturedBrowserIds.has(view.id))
              return views.filter((view) => !capturedBrowserIds.has(view.id))
            })
          } else {
            capturedBrowserViews.current = []
          }
          if (result.dropped.length > 0) {
            const dirty = result.dropped.some((tab) => tab.type === 'search')
            notify(dirty
              ? 'Editor oculto: abas não-acopladas fechadas (Search descartado)'
              : 'Editor oculto: abas não-acopladas fechadas')
          }
          return result.tabs
        })
      } else {
        // (R-040) Show Editor: restaura abas E BrowserViews atomicamente.
        // A ordem importa: abas PRIMEIRO, depois BrowserViews, para que o
        // invariante "cada BrowserView tem aba" nunca seja violado entre renders.
        // skipInvariantCheck pula o assert durante a transição.
        const restoredViews = [...capturedBrowserViews.current]
        capturedBrowserViews.current = []
        skipInvariantCheck.current = true
        setEditorTabs((tabs) => {
          const result = showEditorRestore(tabs, dockedController.current)
          dockedController.current = result.state
          return result.tabs
        })
        if (restoredViews.length > 0) {
          setBrowserViews((views) => [...views, ...restoredViews])
        }
        // Reseta a flag no próximo tick (após o render com ambos atualizados).
        queueMicrotask(() => { skipInvariantCheck.current = false })
      }
      return next
    })
  }, [activeSession.id])

  // Toggle Details (⌥⌘L). "Gated": só atua quando a aba ativa tem detalhe
  // acoplado (Changes/Files). Esconder o detalhe com o editor oculto revelaria um
  // painel vazio — nesse caso, revela o editor de volta.
  const handleToggleDetails = useCallback(() => {
    if (!detailsToggleGated) return
    setAuxiliaryVisible((current) => {
      const next = !current
      if (!next && editorHidden) setEditorHidden(false)
      return next
    })
  }, [detailsToggleGated, editorHidden])

  useEffect(() => {
    const handleShortcuts = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      // (R-077) Escape faz back-navigation mobile: dispensa a camada do topo da
      // MobileNavigationStack antes de qualquer outra coisa.
      if (event.key === 'Escape' && isPhone) {
        if (handleMobileBack()) {
          event.preventDefault()
          return
        }
      }
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      const key = event.key.toLocaleLowerCase()
      // Ctrl/Cmd+Shift+F → busca global.
      if (event.shiftKey && key === 'f') {
        event.preventDefault()
        openSearch()
        return
      }
      // ⌥⌘E (Alt+mod+E) → alterna ocultar/mostrar editor.
      if (event.altKey && key === 'e') {
        event.preventDefault()
        handleToggleEditorHidden()
        return
      }
      // ⌥⌘L (Alt+mod+L) → alterna painel de detalhes (gated por tipo de aba).
      if (event.altKey && key === 'l') {
        event.preventDefault()
        handleToggleDetails()
        return
      }
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [openSearch, handleToggleEditorHidden, handleToggleDetails, handleMobileBack, isPhone])

  const closeEditorTab = (id: string) => {
    const closing = editorTabs.find((tab) => tab.id === id)
    if (!closing) return
    // (E13/R-081) Reforço "CannotClose": abas gerenciadas (Changes/Files) não
    // podem ser fechadas em detail-only, mesmo por caminho programático. O botão
    // já é escondido em EditorArea; este guard cobre atalhos/DnD/menu de contexto.
    if (!isTabCloseable(closing, sidePaneState)) return

    const visibleBeforeClose = getEditorTabsVisibleForSession(editorTabs, activeSession.id)
    const nextIdBeforeCleanup = resolveNextEditorTabId(visibleBeforeClose, id, activeTabId)
    const nextResources = removeBrowserResourceForTab({ browserViews, editorTabs }, id)
    setBrowserViews(nextResources.browserViews)
    setEditorTabs(nextResources.editorTabs)

    if (closing.sessionId && activeTabBySession.current[closing.sessionId] === id) {
      const ownerTabsBeforeClose = editorTabs.filter((tab) => tab.sessionId === closing.sessionId)
      const replacement = resolveNextEditorTabId(ownerTabsBeforeClose, id, id)
      if (replacement) activeTabBySession.current[closing.sessionId] = replacement
      else delete activeTabBySession.current[closing.sessionId]
    }
    if (!closing.sessionId && activeGlobalTabId.current === id) delete activeGlobalTabId.current

    const visibleAfterClose = getEditorTabsVisibleForSession(nextResources.editorTabs, activeSession.id)
    const requestedNextId = activeTabId === id ? nextIdBeforeCleanup : activeTabId
    activateEditorTab(nextResources.editorTabs.find((tab) => tab.id === resolveVisibleEditorTabId(visibleAfterClose, requestedNextId)))
  }

  const navigateBrowser = (id: string, url: string) => setBrowserViews((current) => current.map((view) => view.id === id ? navigateBrowserState(view, url) : view))
  const browserBack = (id: string) => setBrowserViews((current) => current.map((view) => view.id === id ? stepBrowserHistory(view, -1) : view))
  const browserForward = (id: string) => setBrowserViews((current) => current.map((view) => view.id === id ? stepBrowserHistory(view, 1) : view))
  const reloadBrowser = (id: string) => setBrowserViews((current) => current.map((view) => view.id === id ? reloadBrowserState(view) : view))
  const setBrowserStatus = (id: string, status: BrowserViewState['status']) => setBrowserViews((current) => current.map((view) => view.id === id ? setBrowserStatusState(view, status) : view))
  const setBrowserViewport = (id: string, viewport: BrowserViewport) => setBrowserViews((current) => current.map((view) => view.id === id ? setBrowserViewportState(view, viewport) : view))

  const handleNewSession = () => {
    const id = `new-${Date.now()}`
    const chatId = `${id}-main`
    // (R-002) O Management resolve o workspace (herda o da sessão ativa) e
    // seleciona o provider dono para a nova sessão.
    const workspace = activeSession.workspace || 'workspace-local'
    const provider = selectProviderForNewSession(management.current, workspace)?.id ?? activeSession.provider ?? 'local'
    // (R-003) A nova sessão nasce como DRAFT não-commitado: o Management passa a
    // possuir o rascunho pendente (SESSIONS.md §Drafts / §New session). Ela só
    // entra no catálogo commitado no primeiro envio (handleSend → commitDraft).
    management.current = openDraft(management.current, {
      id,
      kind: 'workspace-session',
      providerId: provider,
      workspace,
    })
    // (R-BUG/Val2) Nova sessão herda o estado de aux bar do newSessionViewState,
    // evitando que "Novo Chat" esconda as laterais quando o usuário tinha a aux
    // bar aberta na sessão anterior.
    const seededLayout = seedCreatedFromNewSession(newSessionState)
    setAuxiliaryVisible(seededLayout.auxiliaryVisible)
    setAuxiliaryTab(seededLayout.activeViewContainerId)
    const next: Session = {
      id,
      title: 'Nova sessão',
      workspace,
      workspacePath: activeSession.workspacePath || '~/workspace-local',
      section: 'today',
      status: 'completed',
      updated: 'agora',
      diffAdded: 0,
      diffRemoved: 0,
      branch: 'main',
      provider,
      isDraft: true,
      chats: [{ id: chatId, title: 'Novo chat', status: 'completed', messages: [] }],
      mainChatId: chatId,
    }
    setSessions((current) => [next, ...current])
    setActiveChatBySession((current) => ({ ...current, [id]: chatId }))
    setActiveSessionId(id)
    // R-030 — criar sessão é uma transição "passiva" de layout: rebaseia o
    // previous para a nova sessão, para o autorun não restaurar layout salvo
    // (paridade com o comportamento anterior, em que criar não mexia na aux bar).
    layoutSyncRef.current?.setPreviousResource(id)
    setMobilePane('chat')
    notify('Rascunho de sessão criado')
  }

  // Estado inicial vazio (nenhuma sessão) → cria a sessão a partir da 1ª mensagem
  // digitada na landing, derivando o título do texto (paridade com o original).
  const handleLandingSubmit = (text: string) => {
    const id = `new-${Date.now()}`
    const chatId = `${id}-main`
    const title = text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text
    // (R-BUG/Val2) Sessão criada da landing herda o estado de aux bar do
    // newSessionViewState.
    const seededLayout = seedCreatedFromNewSession(newSessionState)
    setAuxiliaryVisible(seededLayout.auxiliaryVisible)
    setAuxiliaryTab(seededLayout.activeViewContainerId)
    const next: Session = {
      id,
      title,
      workspace: 'workspace-local',
      workspacePath: '~/workspace-local',
      section: 'today',
      status: 'completed',
      updated: 'agora',
      diffAdded: 0,
      diffRemoved: 0,
      branch: 'main',
      chats: [{ id: chatId, title: 'Novo chat', status: 'completed', messages: [] }],
      mainChatId: chatId,
    }
    setSessions([next])
    // A landing recria a lista do zero: descarta o mapa de chats ativos antigo
    // (incluindo entradas de runs de automação) para não deixar referências órfãs.
    setActiveChatBySession({ [id]: chatId })
    setActiveSessionId(id)
    // R-030 — landing recria a sessão do zero: transição passiva (sem restore).
    layoutSyncRef.current?.setPreviousResource(id)
    setMobilePane('chat')
    // Após criar, envia a primeira mensagem para a sessão recém-criada. Passamos
    // o alvo explícito porque o estado (activeSession) só reflete a nova sessão
    // no próximo render — sem isso, a 1ª mensagem cairia no rascunho vazio.
    window.setTimeout(() => handleSend(text, [], { sessionId: id, chatId }), 0)
  }

  const handleToggleArchived = (id: string) => {
    const target = sessions.find((session) => session.id === id)
    const archived = !target?.archived
    updateSession(id, (session) => ({ ...updateSessionStatus(session, archived ? 'completed' : session.status), archived, section: archived ? 'archived' : 'today' }))
    if (archived) {
      clearPendingTimersForSession(id)
      const nextResources = removeBrowserResourcesForSession({ browserViews, editorTabs }, id)
      setBrowserViews(nextResources.browserViews)
      setEditorTabs(nextResources.editorTabs)
      delete activeTabBySession.current[id]
      if (activeSessionId === id) {
        setActiveTabId(resolveVisibleEditorTabId(getEditorTabsVisibleForSession(nextResources.editorTabs, id), activeTabId))
        setTerminalVisible(false)
      }
      notify('Sessão arquivada e browsers descartados')
    } else {
      notify('Sessão restaurada')
    }
  }

  // (R-012) Atribui ou remove sessão de grupo customizado.
  const handleAssignGroup = (id: string, groupId: string) => {
    updateSession(id, (session) => ({ ...session, customGroup: groupId }))
    notify(`Sessão atribuída ao grupo "${groupId}"`)
  }
  const handleRemoveGroup = (id: string) => {
    const session = sessions.find((s) => s.id === id)
    const groupName = session?.customGroup ?? ''
    updateSession(id, (s) => ({ ...s, customGroup: undefined }))
    notify(`Sessão removida do grupo "${groupName}"`)
  }

  const handleDelete = (id: string) => {
    clearPendingTimersForSession(id)
    // (R-003) Excluir um draft abandonado descarta o rascunho pendente do
    // Management (deleteNewSession dispose — SESSIONS.md §Drafts).
    management.current = discardDraft(management.current, id)
    const remaining = sessions.filter((session) => session.id !== id)
    setSessions(remaining)
    const nextResources = removeBrowserResourcesForSession({ browserViews, editorTabs }, id)
    setBrowserViews(nextResources.browserViews)
    setEditorTabs(nextResources.editorTabs)
    delete activeTabBySession.current[id]
    sessionLayouts.current = forgetSessionLayout(sessionLayouts.current, id)
    if (activeSessionId === id) {
      // Ao excluir a última sessão, cai na tela inicial (landing) — não há
      // próxima sessão para ativar.
      const nextSessionId = remaining[0]?.id
      const nextTab = nextSessionId
        ? preferredEditorTabForSession(nextResources.editorTabs, nextSessionId, activeGlobalTabId.current)
        : undefined
      activateEditorTab(nextTab)
      setTerminalVisible(false)
    }
    setActiveChatBySession((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setModeByChat((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))))
    setModelByChat((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))))
    setComposerDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))))
    setComposerHistoryByChat((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))))
    setDiffFilesBySession((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setSelectedDiffFileBySession((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setChecksExpandedBySession((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setExpandedFoldersBySession((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    // remaining[0] pode não existir ao excluir a última sessão (→ landing).
    if (activeSessionId === id) {
      const promoted = remaining[0]?.id ?? ''
      setActiveSessionId(promoted)
      // R-030 — excluir a sessão ativa é transição passiva: rebaseia o previous
      // para não capturar a sessão excluída (o que a re-adicionaria ao mapa após
      // o forget) e não restaurar layout ao promover a vizinha.
      layoutSyncRef.current?.setPreviousResource(promoted || undefined)
    }
    notify('Sessão excluída')
  }

  const handleApprove = (sessionId: string, chatId?: string) => {
    const targetSession = sessions.find((session) => session.id === sessionId)
    if (!targetSession) return
    const targetChatId = chatId ?? targetSession.mainChatId
    updateSession(sessionId, (session) => {
      const next = updateSessionAndChatStatus(session, targetChatId, 'working')
      return {
        ...next,
        approval: undefined,
        chats: next.chats.map((chat) => chat.id === targetChatId ? { ...chat, approval: undefined } : chat),
      }
    })
    setApproved(true)
    window.clearTimeout(approvalTimer.current)
    approvalTimer.current = window.setTimeout(() => setApproved(false), 1800)
    const runKey = `${sessionId}:${targetChatId}`
    const previousTimer = pendingResponseTimers.current.get(runKey)
    if (previousTimer !== undefined) window.clearTimeout(previousTimer)
    const timer = window.setTimeout(() => {
      if (pendingResponseTimers.current.get(runKey) !== timer) return
      pendingResponseTimers.current.delete(runKey)
      updateSession(sessionId, (session) => {
        const next = completeChatRun(session, targetChatId)
        return { ...next, approval: undefined }
      })
    }, 4600)
    pendingResponseTimers.current.set(runKey, timer)
  }

  const handleSend = (text: string, attachments: Attachment[], target?: { sessionId: string; chatId: string }) => {
    const sessionId = target?.sessionId ?? activeSession.id
    const chatId = target?.chatId ?? activeChatId
    const runKey = `${sessionId}:${chatId}`
    const attachmentText = attachments.length > 0 ? `Arquivos anexados: ${attachments.map((item) => item.name).join(', ')}` : ''
    const messageContent = [text.trim(), attachmentText].filter(Boolean).join('\n\n')
    const requestLabel = text.trim() || attachments.map((item) => item.name).join(', ')
    const responseId = `response-${Date.now()}`
    const userMessage = {
      id: `message-${Date.now()}`,
      role: 'user' as const,
      content: messageContent,
      time: timeLabel(),
      mode: selectedMode,
      attachments: attachments.length > 0 ? attachments.map((attachment) => ({ ...attachment })) : undefined,
    }
    const runningResponse = {
      id: responseId,
      role: 'assistant' as const,
      content: '',
      time: timeLabel(),
      model: selectedModel,
      running: true,
    }

    updateSession(sessionId, (session) => {
      const next = updateSessionAndChatStatus(session, chatId, 'working')
      // (R-003) Primeiro envio commita o draft: o Management deixa de possuir o
      // rascunho e a sessão entra no catálogo. O título "Nova sessão" passa a
      // ser derivado do texto enviado (paridade com o original).
      let committed = next
      if (session.isDraft) {
        management.current = commitDraft(management.current, sessionId)
        const derived = requestLabel.trim()
        const title = derived
          ? (derived.length > 48 ? `${derived.slice(0, 48).trimEnd()}…` : derived)
          : next.title
        committed = { ...next, isDraft: false, title }
      }
      return {
        ...committed,
        updated: 'agora',
        unread: false,
        chats: committed.chats.map((chat) => chat.id === chatId ? {
          ...chat,
          messages: [...chat.messages, userMessage, runningResponse],
          approval: undefined,
        } : chat),
      }
    })

    // (R-060/R-063) Uma requisição de build ("build the project") produz um
    // changeset real na changes view — espelha os cenários e2e 02/05.
    const isBuildRequest = /\bbuild\b/i.test(text)

    const timer = window.setTimeout(() => {
      if (pendingResponseTimers.current.get(runKey) !== timer) return
      pendingResponseTimers.current.delete(runKey)
      const response = isBuildRequest
        ? 'Compilei o projeto. Atualizei **package.json**, adicionei **build.ts** e ajustei **src/index.ts** — veja a changes view; abra **index.ts** para revisar o diff, ou use **Abrir terminal** para acompanhar a saída do build.'
        : `Estou trabalhando em **${requestLabel.slice(0, 72)}**. A resposta fica vinculada à sessão e pode abrir Browser, Search ou Changes na área do editor.`
      if (isBuildRequest) {
        // Semeia o changeset de build na sessão e reflete os stats no cabeçalho.
        setDiffFilesBySession((current) => ({
          ...current,
          [sessionId]: buildProjectDiffFiles.map((file) => ({ ...file })),
        }))
      }
      updateSession(sessionId, (session) => {
        const next = completeChatRun(session, chatId)
        const buildStats = isBuildRequest
          ? {
              diffAdded: buildProjectDiffFiles.reduce((sum, file) => sum + file.added, 0),
              diffRemoved: buildProjectDiffFiles.reduce((sum, file) => sum + file.removed, 0),
            }
          : {}
        return {
          ...next,
          ...buildStats,
          updated: 'agora',
          chats: next.chats.map((chat) => chat.id === chatId ? {
            ...chat,
            messages: chat.messages.map((message) => message.id === responseId ? { ...message, content: response, time: timeLabel(), running: false } : message),
          } : chat),
        }
      })
    }, 1000)
    pendingResponseTimers.current.set(runKey, timer)
  }

  const handleStop = () => {
    const sessionId = activeSession.id
    // CancelAction in the workbench cancels the request owned by the current
    // session, not merely the nested chat currently visible in the UI. Clear
    // every mock timer for that session so switching chats cannot leave a
    // response completing after the user pressed Stop.
    clearPendingTimersForSession(sessionId)
    updateSession(sessionId, (session) => {
      const next = updateSessionStatus(session, 'completed')
      return {
        ...next,
        chats: next.chats.map((chat) => {
          const hasRunningResponse = chat.messages.some((message) => message.running)
          if (chat.status !== 'working' && !hasRunningResponse) return chat
          return {
            ...chat,
            status: 'completed',
            messages: chat.messages.map((message) => message.running ? {
              ...message,
              content: 'Execução interrompida antes da resposta. Envie uma nova mensagem para continuar.',
              running: false,
              cancelled: true,
              time: timeLabel(),
            } : message),
          }
        }),
      }
    })
    notify('Execução interrompida')
  }

  const handleRegenerate = (chatId: string, messageId: string) => {
    const sessionId = activeSession.id
    const targetChat = activeSession.chats.find((chat) => chat.id === chatId)
    const original = targetChat?.messages.find((message) => message.id === messageId)
    if (!original || original.role !== 'assistant') return

    const preview = original.content.replace(/\s+/g, ' ').trim().slice(0, 72)
    const runKey = `${sessionId}:${chatId}`
    const previousTimer = pendingResponseTimers.current.get(runKey)
    if (previousTimer !== undefined) {
      window.clearTimeout(previousTimer)
      pendingResponseTimers.current.delete(runKey)
    }
    updateSession(sessionId, (session) => {
      const next = updateSessionAndChatStatus(session, chatId, 'working')
      return {
        ...next,
        updated: 'agora',
        chats: next.chats.map((candidate) => candidate.id === chatId ? {
          ...candidate,
          messages: candidate.messages.map((message) => message.id === messageId ? {
            ...message,
            content: '',
            time: timeLabel(),
            running: true,
          } : message),
        } : candidate),
      }
    })
    notify('Regenerando resposta')

    const timer = window.setTimeout(() => {
      if (pendingResponseTimers.current.get(runKey) !== timer) return
      pendingResponseTimers.current.delete(runKey)
      updateSession(sessionId, (session) => {
        const next = completeChatRun(session, chatId)
        return {
          ...next,
          updated: 'agora',
          chats: next.chats.map((candidate) => candidate.id === chatId ? {
            ...candidate,
            messages: candidate.messages.map((message) => message.id === messageId ? {
              ...message,
              content: `Resposta regenerada${preview ? ` para: **${preview}**` : '.'}\n\nA nova tentativa preserva o contexto desta sessão.`,
              time: timeLabel(),
              running: false,
            } : message),
          } : candidate),
        }
      })
      notify('Resposta regenerada')
    }, 1000)
    pendingResponseTimers.current.set(runKey, timer)
  }

  const handleMessageCopy = (_chatId: string, _messageId: string, kind: ChatCopyKind) => {
    notify(kind === 'code' ? 'Código copiado' : 'Mensagem copiada')
  }

  const handleCopyAll = (chatId: string) => {
    const chat = activeSession.chats.find((candidate) => candidate.id === chatId)
    if (!chat) return
    void copyText(chat.messages.map((message) => message.content).filter(Boolean).join('\n\n'))
    notify('Todas as mensagens copiadas')
  }

  const handleCopyFinalResponse = (chatId: string, messageId: string) => {
    const chat = activeSession.chats.find((candidate) => candidate.id === chatId)
    const message = chat?.messages.find((candidate) => candidate.id === messageId && candidate.role === 'assistant')
    if (!message) return
    void copyText(message.content)
    notify('Resposta final copiada')
  }

  const handleFeedback = (chatId: string, messageId: string, vote: 'up' | 'down') => {
    updateSession(activeSession.id, (session) => ({
      ...session,
      updated: 'agora',
      chats: session.chats.map((chat) => chat.id === chatId ? {
        ...chat,
        messages: chat.messages.map((message) => message.id === messageId ? { ...message, vote } : message),
      } : chat),
    }))
    notify(vote === 'up' ? 'Feedback útil registrado' : 'Feedback não útil registrado')
  }

  const handleReport = (chatId: string, messageId: string) => {
    updateSession(activeSession.id, (session) => ({
      ...session,
      updated: 'agora',
      chats: session.chats.map((chat) => chat.id === chatId ? {
        ...chat,
        messages: chat.messages.map((message) => message.id === messageId ? { ...message, reported: true } : message),
      } : chat),
    }))
    notify('Problema relatado para análise')
  }

  const updateDiffFilesForSession = (sessionId: string, updater: (files: DiffFile[]) => DiffFile[]) => {
    setDiffFilesBySession((current) => ({
      ...current,
      [sessionId]: updater(current[sessionId] ?? []),
    }))
  }

  const selectDiffFile = (id: string) => {
    setSelectedDiffFileBySession((current) => ({ ...current, [activeSession.id]: id }))
  }

  const acceptDiff = (id: string) => { updateDiffFilesForSession(activeSession.id, (current) => setDiffAccepted(current, id, true)); notify('Alteração aceita') }
  const revertDiff = (id: string) => { updateDiffFilesForSession(activeSession.id, (current) => setDiffAccepted(current, id, false)); notify('Alteração revertida') }
  const acceptAllDiff = () => { updateDiffFilesForSession(activeSession.id, (current) => setAllDiffAccepted(current, true)); notify('Todas as alterações foram aceitas') }
  const revertAllDiff = () => { updateDiffFilesForSession(activeSession.id, (current) => setAllDiffAccepted(current, false)); notify('Todas as alterações foram revertidas') }
  const toggleViewed = (id: string) => {
    const file = activeDiffFiles.find((candidate) => candidate.id === id)
    if (!file) return
    const nextViewed = !file.viewed
    updateDiffFilesForSession(activeSession.id, (current) => toggleDiffViewed(current, id))
    notify(nextViewed ? 'Arquivo marcado como Viewed' : 'Arquivo reaberto para revisão')
  }

  const toggleChecks = () => {
    setChecksExpandedBySession((current) => ({ ...current, [activeSession.id]: !checksExpanded }))
  }

  const toggleFolder = (folderName: string) => {
    setExpandedFoldersBySession((current) => ({
      ...current,
      [activeSession.id]: {
        ...(current[activeSession.id] ?? {}),
        [folderName]: !(current[activeSession.id]?.[folderName] ?? true),
      },
    }))
  }

  const rerunChecks = (checkName?: string) => {
    notify(checkName ? `Check ${checkName} executado novamente (mock)` : 'Checks executados novamente (mock)')
  }

  const openCheck = (checkName: string) => {
    notify(`${checkName} aberto no GitHub (mock)`)
  }

  const preparePullRequest = () => {
    notify('Pull request preparado')
  }

  // (R-060/R-063) Merge das alterações da sessão + Abrir terminal a partir da
  // changes view (espelha os cenários e2e 02/05).
  const mergeChanges = () => {
    const count = activeDiffFiles.length
    if (count === 0) {
      notify('Nada para mesclar nesta sessão')
      return
    }
    setDiffFilesBySession((current) => ({ ...current, [activeSession.id]: [] }))
    updateSession(activeSession.id, (session) => ({ ...session, diffAdded: 0, diffRemoved: 0 }))
    notify(`${count} arquivo(s) mesclado(s)`)
  }

  const openTerminalFromChanges = () => {
    setTerminalVisible(true)
    notify('Terminal aberto')
  }

  const renderChatFor = (session: Session) => {
    const sessionChatId = resolveActiveChatId(session, activeChatBySession)
    const sessionChatKey = `${session.id}:${sessionChatId}`
    return (
      <ChatPanel
        session={session}
        activeChatId={sessionChatId}
        model={modelByChat[sessionChatKey] ?? selectedModel}
        mode={modeByChat[sessionChatKey] ?? selectedMode}
        auxiliaryVisible={auxiliaryVisible}
        onSelectChat={(chatId) => { setActiveChatBySession((current) => ({ ...current, [session.id]: chatId })); markNestedChatRead(session.id, chatId) }}
        onChangeModel={(nextModel) => setModelByChat((current) => ({ ...current, [sessionChatKey]: nextModel }))}
        onChangeMode={(nextMode) => setModeByChat((current) => ({ ...current, [sessionChatKey]: nextMode }))}
        onSend={handleSend}
        onStop={handleStop}
        onApprove={(chatId) => handleApprove(session.id, chatId)}
        composerDrafts={composerDrafts}
        onChangeComposerDraft={(key, updater) => setComposerDrafts((current) => ({ ...current, [key]: updater(current[key] ?? { text: '', attachments: [] }) }))}
        composerHistory={composerHistoryByChat}
        onAppendComposerHistory={(key, entry) => setComposerHistoryByChat((current) => {
          const history = current[key] ?? []
          if (sameComposerHistoryEntry(history[history.length - 1], entry)) return current
          return { ...current, [key]: [...history, { ...entry, attachments: entry.attachments.map((attachment) => ({ ...attachment })) }].slice(-COMPOSER_HISTORY_MAX_ENTRIES) }
        })}
        onCopy={handleMessageCopy}
        onCopyAll={handleCopyAll}
        onCopyFinalResponse={handleCopyFinalResponse}
        onRegenerate={handleRegenerate}
        onFeedback={handleFeedback}
        onReport={handleReport}
        onOpenBrowser={openBrowser}
        onOpenDiff={() => openDiff(session.id)}
        onToggleAuxiliary={() => setAuxiliaryVisible((current) => !current)}
      />
    )
  }

  const renderChat = () => (
    !hasSessions ? (
      // Sessão vazia: o próprio painel central mostra o input centralizado
      // (landing), mantendo sidebar e barra auxiliar intactas ao redor.
      <SessionLanding workspace={activeSession.workspace} onSubmit={handleLandingSubmit} onPickWorkspace={handlePickDirectory} isFileSystemSupported={fileSystemSupported}
        onChangeMode={() => notify('Seletor de modo (mock)')}
        onChangeModel={() => notify('Seletor de modelo (mock)')}
        onAddContext={() => notify('Adicionar contexto (mock)')}
        onDictate={() => notify('Ditar por voz (mock)')}
      />
    ) : (
      // (E14) Grid multi-sessão quando há peers visíveis (só fora do single-pane);
      // caso contrário, o chat único da sessão ativa.
      !isSinglePane && gridSessions.length > 1 ? renderSessionsPartGrid() : renderChatFor(activeSession)
    )
  )

  // (E14/R-022/R-026/R-027/R-028) Sessions Part grid: renderiza uma view por
  // sessão visível quando há mais de uma, dividindo a largura disponível
  // (não-proporcional: cada leaf começa igual). Clicar numa view a torna ativa;
  // um botão fecha o peer. Com uma única sessão visível, cai no render normal.
  const gridSessions = useMemo(
    () => visibleSessionIds.map((id) => sessions.find((session) => session.id === id)).filter((s): s is Session => Boolean(s)),
    [visibleSessionIds, sessions],
  )
  const renderSessionsPartGrid = () => (
    <div className="sessions-part-grid" role="group" aria-label="Sessões visíveis">
      {gridSessions.map((session) => (
        <div
          key={session.id}
          className={`sessions-part-leaf${session.id === activeSession.id ? ' is-active' : ''}`}
          role="group"
          aria-label={`Sessão ${session.title}`}
          aria-current={session.id === activeSession.id ? 'true' : undefined}
          onMouseDown={() => { if (session.id !== activeSessionId) selectSession(session.id) }}
        >
          <div className="sessions-part-leaf-header">
            <span className="sessions-part-leaf-title">{session.title}</span>
            <button
              className="sessions-part-leaf-close"
              type="button"
              aria-label={`Fechar sessão ${session.title} do grid`}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); closeVisibleSession(session.id) }}
            >
              <X size={13} />
            </button>
          </div>
          <div className="sessions-part-leaf-body">{renderChatFor(session)}</div>
        </div>
      ))}
    </div>
  )

  const renderEditor = () => (
    <EditorArea
      activeSessionId={activeSession.id}
      tabs={editorTabs}
      activeTabId={activeTabId}
      browserViews={browserViews}
      searchQuery={searchQuery}
      searchResults={filteredSearchResults}
      searchFocusRequest={searchFocusRequest}
      diffFiles={activeDiffFiles}
      selectedDiffFileId={selectedDiffFileId}
      onSelectTab={selectEditorTab}
      onCloseTab={closeEditorTab}
      onReorderTabs={handleReorderEditorTabs}
      onNewBrowser={openBrowser}
      onNewFile={() => openEditorTab('file', { title: 'Files', path: 'workspace' })}
      onNewSearch={openSearch}
      onNewDiff={() => openDiff(activeSession.id)}
      onNewCustomizations={openCustomizations}
      customizationsSurface={customizationsSurface}
      onNavigateBrowser={navigateBrowser}
      onBrowserBack={browserBack}
      onBrowserForward={browserForward}
      onReloadBrowser={reloadBrowser}
      onBrowserStatus={setBrowserStatus}
      onChangeViewport={setBrowserViewport}
      onChangeSearchQuery={setSearchQuery}
      onOpenSearchResult={(result) => openEditorTab('file', { title: result.path.split('/').pop() ?? result.path, path: result.path })}
      onSelectDiffFile={selectDiffFile}
      onAcceptDiff={acceptDiff}
      onRevertDiff={revertDiff}
      onAcceptAllDiff={acceptAllDiff}
      onRevertAllDiff={revertAllDiff}
      onToggleViewed={toggleViewed}
      onCommit={() => notify('Commit preparado para a sessão')}
      onCreatePr={() => notify('Pull request preparado')}
      editorMaximized={editorMaximized}
      onToggleMaximize={() => setEditorMaximized((current) => !current)}
      onSplit={handleSplitEditor}
      editorContentVisible={editorContentVisible}
      sidePaneState={sidePaneState}
      onToggleEditorHidden={handleToggleEditorHidden}
      onToggleDetails={handleToggleDetails}
      detailsVisible={auxiliaryVisible}
      theme={theme}
    />
  )

  const touchStartRef = useRef<{ x: number, y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const endX = e.changedTouches[0].clientX
    const endY = e.changedTouches[0].clientY
    const deltaX = endX - touchStartRef.current.x
    const deltaY = endY - touchStartRef.current.y
    
    if (Math.abs(deltaY) > Math.abs(deltaX) || Math.abs(deltaX) < 40) {
      touchStartRef.current = null
      return
    }

    if (!sidebarVisible && deltaX > 0 && touchStartRef.current.x < 30) {
      setSidebarVisible(true)
    } else if (sidebarVisible && deltaX < 0) {
      setSidebarVisible(false)
    }
    touchStartRef.current = null
  }

  return (
    <div 
      className={`app-frame agent-sessions-workbench${isSinglePane ? ' single-pane' : ''}${customViewActive ? ' custom-view-active' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Titlebar
        activeSession={activeSession}
        unreadCount={unreadCount}
        sidebarVisible={sidebarVisible}
        auxiliaryVisible={auxiliaryVisible}
        terminalVisible={terminalVisible}
        approved={approved}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleSidebar={handleToggleSidebar}
        onToggleAuxiliary={() => setAuxiliaryVisible((current) => !current)}
        onToggleTerminal={() => setTerminalVisible((current) => !current)}
        onOpenSearch={openSearch}
        onOpenBrowser={openBrowser}
        onOpenDiff={() => openDiff(activeSession.id)}
        onNewSession={handleNewSession}
        onShowSessions={showSessionPicker}
        onAccountAction={notify}
      />
      <div className="workbench-body" style={{ ['--sidebar-width' as string]: `${sidebarWidth}px` }}>
        <SessionSidebar
          sessions={sessions}
          visible={sidebarVisible}
          activeSessionId={activeSession.id}
          activeChatId={activeChatId}
          onSelectSession={selectSession}
          onSelectChat={(sessionId, chatId) => { selectSession(sessionId); setActiveChatBySession((current) => ({ ...current, [sessionId]: chatId })); markNestedChatRead(sessionId, chatId) }}
          onNewSession={handleNewSession}
          onTogglePinned={(id) => updateSession(id, (session) => ({ ...session, pinned: !session.pinned }))}
          onToggleArchived={handleToggleArchived}
          onDelete={handleDelete}
          onRename={(id, title) => updateSession(id, (session) => ({ ...session, title }))}
          onApprove={handleApprove}
          onOpenDiff={openDiff}
          onReorderSessions={handleReorderSessions}
          onAssignGroup={handleAssignGroup}
          onRemoveGroup={handleRemoveGroup}
          onOpenBeside={isSinglePane ? undefined : openSessionBeside}
        />
        {sidebarVisible && (
          <div
            className="sidebar-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar barra de sessões"
            title="Arraste para redimensionar (duplo-clique para restaurar)"
            onPointerDown={startSidebarResize}
            onDoubleClick={resetSidebarWidth}
          />
        )}
        <div className="main-region">
          <div className="right-section">
            <div className="top-right-section">
              <div className="main-surface" ref={surfaceGroupRef}>
            <div className="mobile-dock-tabs" role="tablist" aria-label="Navegação single-pane">
              {isPhone && topLayer(navStack) && (
                <button className="dock-tab dock-back" type="button" aria-label="Voltar navegação" title="Voltar" onClick={() => handleMobileBack()}><ChevronLeft size={13} />Voltar</button>
              )}
              <button className={`dock-tab${mobilePane === 'chat' ? ' is-active' : ''}`} type="button" onClick={() => { setMobilePane('chat'); setNavStack(EMPTY_NAVIGATION_STACK) }}><CheckCircle2 size={13} />Chat</button>
              <button className={`dock-tab${mobilePane === 'editor' ? ' is-active' : ''}`} type="button" onClick={() => openMobileLayer('editor', { id: 'editor', kind: 'full-screen-editor', label: 'Editor' })}><Info size={13} />Editor{visibleEditorTabs.length > 0 ? ` · ${visibleEditorTabs.length}` : ''}</button>
              <button className={`dock-tab${mobilePane === 'details' ? ' is-active' : ''}`} type="button" onClick={() => openMobileLayer('details', { id: 'details', kind: 'drawer', label: 'Detalhes' })}><Info size={13} />Detalhes</button>
            </div>
            {customViewActive && customView.activeView ? (
              // Custom View Grid (LAYOUT.md): full-surface que substitui o
              // conteúdo da sessão. Sessions Part, Editor, Auxiliary Bar e Panel
              // não são renderizados; Title Bar, Sidebar e (no phone) o dock de
              // navegação continuam disponíveis.
              <section
                className="custom-view-grid"
                role="region"
                aria-label={`Custom View: ${customViewTitle(customView.activeView)}`}
                data-custom-view={customView.activeView}
              >
                <header className="custom-view-header">
                  <h1 className="custom-view-title">{customViewTitle(customView.activeView)}</h1>
                  <button
                    className="secondary-button"
                    type="button"
                    aria-label="Fechar custom view"
                    onClick={closeCustomViewGrid}
                  >
                    <X size={13} />Fechar
                  </button>
                </header>
                <div className="custom-view-content">{customizationsSurfaceEmbedded}</div>
              </section>
            ) : (
              <>
            {isSinglePane ? (
              <div className="desktop-surface-group">
                {mobilePane === 'chat' && renderChat()}
                {mobilePane === 'editor' && renderEditor()}
                {mobilePane === 'details' && (
                  // (E15/R-049) Em telefone, a revisão de diff usa a superfície
                  // full-screen unificada (MobileDiffView) quando há arquivos
                  // alterados; caso contrário, mostra os detalhes da sessão.
                  activeDiffFiles.length > 0 ? (
                    <MobileDiffView
                      files={activeDiffFiles}
                      selectedFileId={selectedDiffFileId}
                      onSelectFile={selectDiffFile}
                      onClose={() => setMobilePane('chat')}
                    />
                  ) : (
                    <div className="mobile-detail-wrapper"><AuxiliaryBar session={activeSession} fileSystemEntries={fileSystemEntries} fileSystemRootName={fileSystemRootName} fileSystemLoading={fileSystemLoading} isFileSystemSupported={fileSystemSupported} onPickDirectory={handlePickDirectory} onClearDirectory={handleClearDirectory} onOpenFileHandle={handleOpenFileHandle} visible diffFiles={activeDiffFiles} tab={auxiliaryTab} checksExpanded={checksExpanded} expandedFolders={expandedFolders} onChangeTab={setAuxiliaryTab} onOpenDiff={(fileId) => openDiff(activeSession.id, fileId)} onOpenFile={(path) => openEditorTab('file', { title: path.split('/').pop() ?? path, path })} onToggleChecks={toggleChecks} onToggleFolder={toggleFolder} onRerunChecks={rerunChecks} onOpenCheck={openCheck} onPreparePr={preparePullRequest} onMerge={mergeChanges} onOpenTerminal={openTerminalFromChanges} onClose={() => setMobilePane('chat')} filesSlot={explorerModule ? <ExplorerModuleSlot module={explorerModule} /> : undefined} /></div>
                  )
                )}
              </div>
            ) : (
              // Modelo de 4 estados do painel lateral (SINGLE_PANE_SCENARIOS.md).
              // A barra de abas permanece visível quando há abas, mesmo se o
              // conteúdo do editor estiver oculto (estado detail-only).
              editorContentVisible ? (
                editorMaximized ? (
                  <div className={`desktop-surface-group editor-maximized side-pane-${sidePaneState}`}>{renderEditor()}</div>
                ) : (
                  <PanelGroup
                    key={activeSession.id}
                    ref={panelGroupRef}
                    direction="horizontal"
                    className={`desktop-surface-group side-pane-${sidePaneState}`}
                    onLayout={handlePanelLayout}
                    // Sessions Part flexível: o delta de resize da janela vai
                    // todo para o chat (ver ResizeObserver acima).
                    data-flexible-part="sessions"
                  >
                    <Panel defaultSize={activePartSizes[0]} minSize={34} order={1}>{renderChat()}</Panel>
                    <PanelResizeHandle
                      className="panel-resize-handle"
                      onDoubleClick={resetPartSizes}
                      title="Duplo-clique para redistribuir igualmente"
                    />
                    <Panel defaultSize={activePartSizes[1]} minSize={28} order={2}>{renderEditor()}</Panel>
                  </PanelGroup>
                )
              ) : tabBarVisible ? (
                // Detail-only / editor oculto: mantém a barra de abas, mas o chat
                // absorve a largura do conteúdo do editor.
                <div className={`desktop-surface-group side-pane-${sidePaneState}`}>
                  <div className="chat-region">{renderChat()}</div>
                  {renderEditor()}
                </div>
              ) : (
                // Sem conteúdo de editor e sem abas: o chat é a única superfície da
                // banda central. Centraliza em 950px quando o side pane está fechado
                // (detail-only ainda exibe a barra auxiliar ao lado, renderizada abaixo).
                <div className={`desktop-surface-group side-pane-${sidePaneState}${chatCentered ? ' chat-centered' : ''}`}>
                  {renderChat()}
                </div>
              )
            )}
              </>
            )}
              </div>
              {!customViewActive && layoutController.managesAuxiliaryBar && <AuxiliaryBar session={activeSession} visible={renderDesktopAuxiliaryBar} fileSystemEntries={fileSystemEntries} fileSystemRootName={fileSystemRootName} fileSystemLoading={fileSystemLoading} isFileSystemSupported={fileSystemSupported} onPickDirectory={handlePickDirectory} onClearDirectory={handleClearDirectory} onOpenFileHandle={handleOpenFileHandle} diffFiles={activeDiffFiles} tab={auxiliaryTab} checksExpanded={checksExpanded} expandedFolders={expandedFolders} onChangeTab={setAuxiliaryTab} onOpenDiff={(fileId) => openDiff(activeSession.id, fileId)} onOpenFile={(path) => openEditorTab('file', { title: path.split('/').pop() ?? path, path })} onToggleChecks={toggleChecks} onToggleFolder={toggleFolder} onRerunChecks={rerunChecks} onOpenCheck={openCheck} onPreparePr={preparePullRequest} onMerge={mergeChanges} onOpenTerminal={openTerminalFromChanges} onClose={() => setAuxiliaryVisible(false)} filesSlot={explorerModule ? <ExplorerModuleSlot module={explorerModule} /> : undefined} />}
            </div>
            <TerminalPanel
              visible={terminalVisible && !customViewActive}
              sessionId={activeSession.id}
              sessionLabel={activeSessionLabel}
              workspace={activeSession.workspace}
              onClose={() => setTerminalVisible(false)}
            />
          </div>
        </div>
      </div>
      {toast && <div className="toast" role="status"><Info size={14} /><span>{toast}</span><button type="button" aria-label="Fechar aviso" title="Fechar aviso" onClick={() => setToast(undefined)}><X size={13} /></button></div>}
      {explorerContextMenu && (
        <ExplorerContextMenuHost
          state={explorerContextMenu}
          onClose={() => setExplorerContextMenu(null)}
          onExecute={(id) => void explorerMenusRef.current.execute(id)}
        />
      )}
      <SessionsPicker
        open={sessionPickerOpen}
        sessions={sessions}
        activeSessionId={activeSession.id}
        onClose={() => setSessionPickerOpen(false)}
        onSelectSession={(id) => { selectSession(id); setMobilePane('chat') }}
        onNewSession={handleNewSession}
      />
    </div>
  )
}

