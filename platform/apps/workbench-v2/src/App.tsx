import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// FATIA-04 (4.4): módulo explorer-search via Barrel único — App NUNCA importa
// caminhos internos do módulo (fronteira LEGO, FT).
import { BrowserFsPort, createExplorerSearchModule, ExplorerFsWatchClient, type IExplorerSearchModule, type WorkspaceUri } from './modules/explorer-search'
// FATIA-05 5.1 c1 — chassi (docs/24): Activity Bar à direita; views vêm do viewRegistry.
import { ActivityBar, buildActivityBarMenuItems, activityBarPositionFromMenuId } from './shell/activityBar'
import { SideBar, ExplorerView, SearchView, ScmView } from './shell/sideBar'
import { useLayoutState } from './shell/layoutState'
import { viewsByIds, type ViewDescriptor } from './shell/viewRegistry'
import { ViewsPanel } from './shell/panel'
import { createShellCommandRegistry } from './domain/shellCommandRegistry'
import { ExplorerContextMenuHost, type ExplorerContextMenuState } from './components/ExplorerContextMenuHost'
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelGroupHandle } from 'react-resizable-panels'
import { CheckCircle2, ChevronLeft, Info, X } from 'lucide-react'
import { initialProviders, searchResults as allSearchResults } from './data'
import { changeSessionWorkspace, createSessionWorktree, loadPersistedSessions, persistSession, pickSessionWorkspace, removePersistedSession, SessionPersistenceError, validateSessionWorkspace, type WorkspaceDescriptor } from './services/sessions/sessionsClient'
import { useSessionPersistence } from './services/sessions/useSessionPersistence'
import { removeSessionRecovery, restoreUnsavedSessions } from './services/sessions/sessionRecovery'
import { SessionPersistenceNotice } from './services/sessions/SessionPersistenceNotice'
// FATIA 14 (RNF14-3): a tela de Personalizações é da CASA. O síndico só a
// renderiza — nenhum estado de personalização mora aqui.
import { PersonalizacoesView } from './bairros/2-inteligencia/casas/personalizacoes'
import { ProvidersView } from './bairros/2-inteligencia/casas/provedores'
import type { SelecaoModelo } from './bairros/2-inteligencia/casas/conversa'
import { AUTOSCROLL_PADRAO, ConfigView, carregarConfig } from './bairros/2-inteligencia/casas/config'
import { continuarAgir, enviarAgir, responderAguardarComando, responderAprovacao, selecionarModoAgir, selecionarPermissaoAgir, registrarInstrucaoAgir, type ControleAgir, type DecisaoAprovacao, type MensagemSimples, type OuvintesAgir, type PedidoFerramenta, type IdentidadeExecucaoAgir, type ModoAgir, type NivelPermissaoAgir } from './bairros/2-inteligencia/casas/agir'
import type { ContinuarNoChat, FerramentaNoChat } from './types'
import { sanarCartoesAposF5 } from './services/agir/sanar'
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
import type { Attachment, BrowserViewState, BrowserViewport, ChatCopyKind, ChatMessage, ComposerDraft, ComposerHistoryEntry, DiffFile, EditorTab, Session } from './types'
import {
  assertWorkbenchInvariants,
  resolveActiveChatId,
  setAllDiffAccepted,
  setDiffAccepted,
  toggleDiffViewed,
  updateSessionAndChatStatus,
  updateSessionStatus,
} from './domain/sessionState'
import {
  getEditorTabsVisibleForSession,
} from './domain/browserOwnership'
import { filterSearchResults } from './domain/search'
// FATIA 15 Onda 1 (D144 §3.4): a gestão de abas tem DONO NOVO no shell. O App
// deixa de decidir política de sucessão — ele orquestra e delega.
import { resolverAbaVisivel, type Aba } from './shell/abas'
// FATIA 15 (D172 / RNF15-2): a IDENTIDADE da aba (de quem e', qual reusa, qual id
// nasce) sai do App. Fica no Bairro 1: e' politica de Workbench, sem IA.
// FATIA 15 Onda 2c-i (D148): a ponte que projeta as abas do módulo para a faixa
// central. É do bairro 1 (shell) — por aqui o App não desce abaixo do barrel.
import { dividirIdDoModulo, fundirAbas, projetarAbasDoModulo } from './shell/ponteAnexo'
import { useFaixaDeAbasNativas } from './shell/useFaixaDeAbasNativas'
// FATIA 15 Onda 3 (D160): a fronteira shell↔módulo e a memória de abas saíram do App.
import { CenterChangesSlot, CenterCodeEditorSlot, ExplorerModuleSlot, ScmModuleSlot, SearchModuleSlot } from './shell/moduleSlots'
import { ACTIVE_SESSION_KEY, restoreAttachTabs, snapshotAttachTabs } from './shell/persistenciaDeAbas'
import { reorderSessions } from './domain/dragAndDrop'
import { isChatCentered, isEditorContentVisible, isTabBarVisible, isTabCloseable, resolveSidePaneState } from './domain/sidePane'
import { clampSidebarWidth, loadLayoutState, partSizesForSession, saveLayoutState, SIDEBAR_WIDTH_DEFAULT, loadSessionLayouts, saveSessionLayouts } from './domain/layoutPersistence'
import { captureSessionLayout, forgetSessionLayout, restoreSessionLayout, type SessionLayoutMap } from './domain/sessionLayout'
import { observableValue, transaction } from './domain/observable'
import { createLayoutSync } from './domain/sessionLayoutSync'
import { canSplitMainEditor, createAgentWorkbenchLayout, readSinglePaneSetting } from './domain/agentWorkbenchLayout'
import { classifyViewport, isPhoneViewport } from './domain/mobileLayout'
// FATIA 15 Onda 3 (D161): as perguntas de ambiente e a regra do histórico do
// compositor saíram do App — elas são do DOMÍNIO, não do síndico. A regra do
// histórico estava duplicada aqui e no ChatInput; agora existe uma só.
import { detectTouch, ehModoAgir, isSinglePaneWidth, timeLabel } from './domain/appRuntime'
import { COMPOSER_HISTORY_MAX_ENTRIES, sameComposerHistoryEntry } from './domain/composerHistory'
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
import { commitDraft, createManagementState, discardDraft, openDraft, selectProviderForNewSession } from './domain/sessionsManagement'
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

const BOOT_SESSION_ID = 'draft-empty'
// 4.8-B3 (hotfix): o Browser NÃO abre por padrão — começar com uma aba Browser
// ativa escondia a barra auxiliar (regra Browser→aux bar oculta) e cobria o
// Explorer no boot. O estado "sem abas / sem browsers" já é válido (é o que
// resta ao fechar a aba). Novos browsers vêm de `createBrowser` (botão da UI).

// FATIA-05 5.3 (RF-05): a maquete "Changes N" (`initialDiffFiles`/`buildProjectDiffFiles`) foi removida.
// O estado `diffFilesBySession` continua existindo só porque o `EditorArea` (intocável até a 5.7)
// ainda recebe `diffFiles`; nasce e permanece vazio.
const initialDiffFilesBySession: Record<string, DiffFile[]> = {}


interface AppProps {
  /** Test-only dependency injection; production always hydrates from SQLite. */
  initialSessionSnapshot?: Session[]
}

export default function App({ initialSessionSnapshot }: AppProps = {}) {
  const initialSnapshot = useRef(initialSessionSnapshot ?? [])
  const initialSnapshotFirst = initialSnapshot.current[0]
  const [sessions, setSessions] = useState<Session[]>(initialSnapshot.current)
  const [sessionsHydrated, setSessionsHydrated] = useState(Boolean(initialSessionSnapshot))
  const persistedLayout = useRef(loadLayoutState())
  const [activeSessionId, setActiveSessionId] = useState(initialSnapshotFirst?.id ?? window.localStorage.getItem(ACTIVE_SESSION_KEY) ?? BOOT_SESSION_ID)
  // (E14/R-022/R-026) Sessions Part grid: ids das sessões visíveis lado a lado.
  // Por padrão só a sessão ativa é visível (arranjo single). Abrir uma sessão
  // "ao lado" anexa um peer; o grid renderiza uma view por sessão visível.
  const [visibleSessionIds, setVisibleSessionIds] = useState<string[]>(initialSnapshotFirst ? [initialSnapshotFirst.id] : [])
  const [activeChatBySession, setActiveChatBySession] = useState<Record<string, string>>(() => Object.fromEntries(initialSnapshot.current.map((session) => [session.id, session.mainChatId])))
  const [newSessionLanding, setNewSessionLanding] = useState(false)
  // FATIA 09 (§3.8): persiste a sessão ativa — sem isto o F5 sempre reabria
  // a primeira da lista e a conversa "parecia" perdida.
  useEffect(() => {
    if (!activeSessionId) return
    window.localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId)
  }, [activeSessionId])
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceDescriptor>()
  const [workspacePickerPending, setWorkspacePickerPending] = useState(false)
  const [workspaceChangePending, setWorkspaceChangePending] = useState(false)
  const [workspaceNativePickerAvailable, setWorkspaceNativePickerAvailable] = useState(true)
  // FATIA 07 (DEBT-06, opção C aprovada 15/10): na tela inicial (nenhuma sessão),
  // a pasta escolhida em "Usar esta pasta" já comanda o Explorer — o efeito de boot
  // abaixo reage a esta dependência, então a árvore troca na hora (sem mensagem no
  // chat e sem F5). Com sessão ativa, a pasta continua vindo da sessão (inalterado).
  const selectedLandingWorkspacePath = newSessionLanding ? selectedWorkspace?.path : undefined
  const currentSessionWorkspacePath = sessions.find((session) => session.id === activeSessionId)?.worktreePath
    ?? sessions.find((session) => session.id === activeSessionId)?.workspacePath
  // A landing can sit above older sessions. Its selected folder is a pending
  // context for the new session and must drive Explorer before the first chat
  // message; it must not rewrite the older persisted session.
  const explorerWorkspacePath = selectedLandingWorkspacePath
    ?? currentSessionWorkspacePath
    ?? (sessions.length === 0 ? selectedWorkspace?.path : undefined)
  const [sidebarVisible, setSidebarVisible] = useState(persistedLayout.current.shell.sidebarVisible)
  // FATIA-05 5.8-c1 (RF-P-05): a coluna "Detalhes" não existe mais → o estado do shell é constante `false`.
  // O campo `auxiliaryVisible` continua nos tipos/persistência do domínio só por compatibilidade (D2.72: remover depois).
  const auxiliaryVisible = false
  const [terminalVisible, setTerminalVisible] = useState(persistedLayout.current.shell.terminalVisible)
  const [sidebarWidth, setSidebarWidth] = useState(persistedLayout.current.shell.sidebarWidth)
  const [partSizesBySession, setPartSizesBySession] = useState<Record<string, number[]>>(persistedLayout.current.partSizesBySession)

  const [auxiliaryTab, setAuxiliaryTab] = useState<'changes' | 'files'>('changes')
  // FATIA-05 5.1 c2 — estado do chassi (view ativa, Side Bar visível/largura) persistido em workbench.layoutState.v1.
  const layout = useLayoutState()
  // RF-09 (docs/24 §6.1, P1=A): anexo maximizado recolhe a Side Bar; restaurar devolve o estado anterior.
  // Ref porque o listener do módulo é registrado uma vez (boot) e precisa ver a API mais recente.
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  // FATIA-05 5.7 (D6): sessões cujo Editor Anexo tem abas (`editor.attachExpanded/attachCollapsed`).
  // A AuxiliaryBar fica montada enquanto o anexo tiver abas, independente da coluna "Detalhes"
  // (`auxiliaryVisible`) e do gate do Browser — senão o clique no Explorer cai em `pendingAttachOpen`
  // e só abre após F5 (bug do vídeo, docs/25 P20).
  // FATIA 15 Onda 3 (D164): `attachExpandedSessions` saiu. Ver comentário no handler de eventos.
  // FATIA 15 Onda 2c-i: versão das abas do módulo. A projeção é leitura pura de
  // `attach.getTabs`, que não é reativa; quem avisa que mudou é o onEvent do módulo,
  // então cada evento de aba bumpa esta versão e o useMemo que projeta recalcula.
  // Sem isto a faixa central não refletiria abrir/fechar/ativar feitos pelo módulo.
  const [moduloAbasVersao, setModuloAbasVersao] = useState(0)
  // 5.5: ordem/container das views vêm do layoutState (Side Bar = Activity Bar; Panel = abas do Views Panel)
  const rightViews = useMemo(() => viewsByIds(layout.state.viewLayout.sideBar), [layout.state.viewLayout.sideBar])
  const panelViews = useMemo(() => viewsByIds(layout.state.viewLayout.panel), [layout.state.viewLayout.panel])
  // FATIA-04 (4.4): módulo explorer-search — criado UMA vez no boot (raiz da
  // config do server, Q9: sem picker), sobrevive a trocas de sessão/aba.
  const [explorerModule, setExplorerModule] = useState<IExplorerSearchModule | null>(null)
  // FATIA-05 5.3: badge do ícone Source Control = `git.count()` do módulo (evento `git.statusChanged`).
  const [scmBadge, setScmBadge] = useState(0)
  const explorerFsRef = useRef<BrowserFsPort | null>(null)
  const handleExplorerFileOpenedRef = useRef<(uri: WorkspaceUri) => void>()
  const explorerMenusRef = useRef(createShellCommandRegistry())

  // FATIA-06.1: SQLite mantém o catálogo e um JSONL por sessão mantém o
  // transcript. O primeiro render nasce vazio para nunca reintroduzir mocks.
  useEffect(() => {
    if (initialSessionSnapshot) return
    const controller = new AbortController()
    void loadPersistedSessions(controller.signal)
      .then((restored) => {
        if (controller.signal.aborted) return
        // FATIA 10 (C4): cartão 'aguardando' que sobreviveu ao F5 vira 'expirado'.
        const sanadas = sanarCartoesAposF5(restoreUnsavedSessions(restored))
        setSessions(sanadas)
        const first = restored[0]
        // FATIA 09 (§3.8): o F5 volta para a MESMA sessão que estava aberta.
        const salva = window.localStorage.getItem(ACTIVE_SESSION_KEY)
        const recuperada = salva ? sanadas.find((session) => session.id === salva) : undefined
        const primeiraSanada = sanadas[0]
        setActiveSessionId(recuperada?.id ?? primeiraSanada?.id ?? BOOT_SESSION_ID)
        setVisibleSessionIds(recuperada ? [recuperada.id] : primeiraSanada ? [primeiraSanada.id] : [])
        setActiveChatBySession(Object.fromEntries(sanadas.map((session) => [session.id, session.mainChatId])))
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error('[sessions] hydration failed', error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setSessionsHydrated(true)
      })
    return () => controller.abort()
  }, [])

  const persistence = useSessionPersistence(sessions, sessionsHydrated, (copy, source, savedSource) => {
    setSessions((current) => [copy, ...current.flatMap((candidate) => {
      if (candidate.id !== source.id || JSON.stringify(candidate) !== JSON.stringify(source)) return [candidate]
      return savedSource ? [savedSource] : []
    })])
    setActiveSessionId(copy.id)
    setVisibleSessionIds([copy.id])
    setActiveChatBySession((current) => ({ ...current, [copy.id]: copy.mainChatId }))
  })

  const [explorerContextMenu, setExplorerContextMenu] = useState<ExplorerContextMenuState | null>(null)
  // FATIA-05 5.4 (RF-10): menu "Move Activity Bar …" — segundo host do mesmo menu de contexto do shell.
  const [activityBarMenu, setActivityBarMenu] = useState<ExplorerContextMenuState | null>(null)
  useEffect(() => {
    let cancelled = false
    let mountedModule: IExplorerSearchModule | undefined
    void (async () => {
      try {
        if (explorerWorkspacePath) {
          const response = await fetch('/fs/workspace', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: explorerWorkspacePath }),
          })
          if (!response.ok) throw new Error(`Falha ao ativar workspace no Explorer (${response.status})`)
        }
        const fs = new BrowserFsPort({ watchClient: new ExplorerFsWatchClient({}) })
        explorerFsRef.current = fs
        const root: WorkspaceUri = await fs.discoverRoot()
        if (cancelled) return
        const module = createExplorerSearchModule({
          fs,
          menus: explorerMenusRef.current,
          contextMenu: { open: (input) => setExplorerContextMenu(input) },
          workspaceRoot: root,
          // 5.3: "Open Source Control" (header do Explorer) → view `scm` da Side Bar.
          openSourceControl: () => layoutRef.current.showView('scm'),
        })
        await module.explorer.openFolder({ uri: root })
        if (cancelled) { module.dispose(); return }
        module.onEvent((e) => {
          if (e.type === 'error') console.warn('[explorer-search]', e.code, e.message)
          if (e.type === 'explorer.fileOpened') handleExplorerFileOpenedRef.current?.(e.uri)
          if (e.type === 'git.statusChanged') setScmBadge(e.isRepo ? e.count : 0)
          if (e.type === 'editor.tabOpened' || e.type === 'editor.tabClosed' || e.type === 'editor.tabPinned' || e.type === 'editor.activeChanged' || e.type === 'editor.attachCollapsed') snapshotAttachTabs(module, e.sessionId)
          // Onda 2c-i: as abas do módulo passaram a aparecer também na faixa CENTRAL,
          // então os eventos que mudam abas precisam invalidar a projeção. `dirtyChanged`
          // entra aqui e não no snapshot do anexo porque a faixa mostra o ponto de dirty.
          if (e.type === 'editor.tabOpened' || e.type === 'editor.tabClosed' || e.type === 'editor.tabPinned' ||
              e.type === 'editor.activeChanged' || e.type === 'editor.dirtyChanged') setModuloAbasVersao((v) => v + 1)
          // FATIA 15 Onda 3 (D164): `editor.attachExpanded/attachCollapsed` não alimentam mais
          // estado do shell. Esse estado existia para dizer "o anexo da coluna tem abas", e a
          // coluna saiu na 2c-ii. Lista que só cresce e encolhe sem ninguém ler é memória gasta
          // e ruído para quem lê o arquivo.
          // 5.7 (D6/RF-07) + docs/24 v1.2 (2026-10-02, RF-09 revogado para a 5.7): maximizar/restaurar NÃO mexem na
          // Side Bar — ela fica 274 como estava; só o chat some e o editor toma o centro. Persiste (F5 mantém).
          // FATIA 15 Onda 3 (D164): `editor.attachMaximized/attachRestored` NÃO escrevem mais em
          // `layout.state.editorMaximized`. Aquele campo era o maximizar da COLUNA: nenhum lugar
          // o lia (a coluna saiu na 2c-ii), mas ele era gravado no disco a cada evento, porque
          // `useLayoutState` persiste o estado inteiro. Escrever estado que ninguém lê não é só
          // inútil — é lixo que o próximo leitor vai tentar interpretar. O maximizar do centro é
          // `editorMaximized` (useState + centerEditorMaximized), que segue vivo e persistido.
        })
        restoreAttachTabs(module) // 5.7 fix: F5 mantém as abas do anexo (eventos acima já marcam attachExpanded)
        mountedModule = module
        explorerModuleRef.current = module
        setExplorerModule(module)
      } catch (err) {
        // Sem raiz configurada o Explorer fica vazio, mas NUNCA derruba o app.
        console.warn('[explorer-search] boot: raiz não descoberta', err)
      }
    })()
    return () => {
      cancelled = true
      mountedModule?.dispose()
    }
  }, [explorerWorkspacePath])
  useEffect(() => {
    if (!explorerContextMenu) return
    const onDown = (ev: MouseEvent) => {
      if (!(ev.target as HTMLElement).closest('[data-explorer-context-menu]')) setExplorerContextMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [explorerContextMenu])
  useEffect(() => {
    if (!activityBarMenu) return
    const onDown = (ev: MouseEvent) => {
      if (!(ev.target as HTMLElement).closest('[data-explorer-context-menu]')) setActivityBarMenu(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [activityBarMenu])
  // E4 — estado de layout por sessão: ao sair capturamos auxiliaryVisible +
  // activeViewContainerId; ao voltar restauramos. Working sets (abas/browser)
  // são preservados separadamente e nunca limpos ao alternar de sessão.
  const sessionLayouts = useRef<SessionLayoutMap>(loadSessionLayouts())

  // D171: o fluxo de "pasta real" via File System Access saiu daqui. Medido antes
  // de remover: `fileSystemEntries`, `fileSystemRootName` e `fileSystemLoading`
  // eram ESCRITOS e nunca lidos (1 ocorrência cada — a da própria declaração),
  // e `handlePickDirectory`/`handleClearDirectory` não tinham chamador nenhum.
  // Com `handleOpenFileHandle` fora na D159, o File System Access não tinha mais
  // caminho vivo: toda abertura de arquivo passa pelo módulo (attach.open), que
  // fala com o servidor. Manter 54 linhas de estado morto no App era lixo que o
  // próximo leitor tentaria interpretar. `domain/fileSystem.ts` FICA: é a base
  // que o seletor de workspace usa (`pickSessionWorkspace`).

  // (R-092 / LAYOUT.md §Custom View Grid) Superfície full-surface contribuída,
  // mutuamente exclusiva com Sessions Part, Editor, Auxiliary Bar e Panel.
  const [customView, setCustomView] = useState(() => loadCustomViewState())
  const customViewActive = shouldShowCustomViewGrid(customView)


  // FATIA 15 Onda 3 (D159): `handleOpenFileHandle` saiu daqui. Era o ÚNICO criador de aba
  // nativa COM `content` e estava ÓRFÃO desde a 4.7 (declaração sem nenhum chamador — D150 §4).
  // Toda abertura de arquivo passa pelo módulo (`attach.open`), que escreve/lê pelo servidor
  // em vez de usar File System Access. Com ele fora, o ramo do `<Editor>` antigo do
  // EditorArea fica comprovadamente inalcançável: nenhuma aba `file` do App carrega `content`.

  // R-030 — Todo o estado de layout por sessão flui de um OBSERVABLE da sessão
  // ativa (nunca de eventos), como no LAYOUT_CONTROLLER.md. As três células
  // abaixo são as fontes observáveis; um `autorun` (instalado no effect adiante)
  // detecta a troca real e dispara capturar/restaurar/suprimir. `liveLayoutRef`
  // espelha o estado renderizado da sessão que sai, para a captura lê-lo.
  const activeSessionResourceObs = useRef(observableValue<string | undefined>('activeSessionResource', BOOT_SESSION_ID))
  const multipleSessionsVisibleObs = useRef(observableValue('multipleSessionsVisible', false))
  const visibleSessionResourcesObs = useRef(observableValue<readonly string[]>('visibleSessionResources', [BOOT_SESSION_ID]))
  const liveLayoutRef = useRef<{ auxiliaryVisible: boolean; activeViewContainerId: 'changes' | 'files' }>({ auxiliaryVisible: persistedLayout.current.shell.auxiliaryVisible, activeViewContainerId: 'changes' })
  // FATIA 14: o estado de personalizações (harness ativo, enablement dos
  // built-ins, itens agregados e o pipeline de plugins R-065) SAIU do síndico e
  // foi para a casa Personalizações, que carrega dados REAIS do servidor em vez
  // do mock E16. RNF14-3: App.tsx não cresce — encolhe.
  //
  // O que NÃO foi apagado: os módulos de domínio aiCustomizations.ts,
  // aiCustomizationsData.ts, agentPlugins.ts, agentPluginsData.ts, a view
  // components/CustomizationsView.tsx e os testes de todos eles continuam
  // intactos. A SPEC 2H limita a v1 a Visão geral + Habilidades + Ferramentas;
  // os cinco cartões restantes (Agents, Instructions, Prompts, Hooks, MCP,
  // Plugins) voltam a ser renderizados nas fatias 17+, quando o R-065 for
  // religado a dados reais. Desconectar a tela do mock não é apagar o requisito.
  // Auxiliary sections mirror the reference view state: collapse/expand is
  // remembered by session instead of leaking between independent workspaces.
  const [checksExpandedBySession, setChecksExpandedBySession] = useState<Record<string, boolean>>({})
  const [expandedFoldersBySession, setExpandedFoldersBySession] = useState<Record<string, Record<string, boolean>>>({})
  const [searchQuery, setSearchQuery] = useState('menubar')
  const [searchFocusRequest, setSearchFocusRequest] = useState(0)

  // 5.5: mesma fábrica de conteúdo para Side Bar e Views Panel — a view só muda de pai (mount 1× por host; ver ModuleSlots)
  const renderShellView = (view: ViewDescriptor) => (view.id === 'explorer'
    ? <ExplorerView slot={explorerModule ? <ExplorerModuleSlot module={explorerModule} /> : undefined} />
    : view.id === 'search'
      ? <SearchView slot={explorerModule ? <SearchModuleSlot module={explorerModule} focusRequest={searchFocusRequest} /> : undefined} />
      : view.id === 'scm'
        ? <ScmView slot={explorerModule ? <ScmModuleSlot module={explorerModule} /> : undefined} />
        : null)
  // Changes are resolved from the active session, matching the reference
  // SessionChangesEditor input instead of sharing accept/view state globally.
  const [diffFilesBySession, setDiffFilesBySession] = useState<Record<string, DiffFile[]>>(initialDiffFilesBySession)
  const [selectedDiffFileBySession, setSelectedDiffFileBySession] = useState<Record<string, string | undefined>>({})
  // The original input model stores picker state with the active conversation.
  // Keep the mock equivalent keyed by session plus nested chat, not globally.
  const [modelByChat, setModelByChat] = useState<Record<string, string>>(() => {
    try {
      const salvo: unknown = JSON.parse(localStorage.getItem('agente-window:model-by-chat:v3') ?? '{}')
      return salvo && typeof salvo === 'object' && !Array.isArray(salvo) ? salvo as Record<string, string> : {}
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try { localStorage.setItem('agente-window:model-by-chat:v3', JSON.stringify(modelByChat)) } catch { /* preferência local é best-effort; backend sempre valida */ }
  }, [modelByChat])
  // Nível de permissões é separado dos quatro modos e não é restaurado como
  // Permitir tudo após recarregar o app: cada nova vida de UI volta a Manual.
  const [permissionByChat, setPermissionByChat] = useState<Record<string, NivelPermissaoAgir>>({})
  const [automaticDeletesByChat, setAutomaticDeletesByChat] = useState<Record<string, boolean>>({})
  const [modeByChat, setModeByChat] = useState<Record<string, ModoAgir>>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('agente-window:mode-by-chat:v1') ?? '{}')
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {}
      const valid: Record<string, ModoAgir> = {}
      for (const [key, value] of Object.entries(saved)) {
        if (key.length > 400) continue
        if (ehModoAgir(value)) valid[key] = value
      }
      return valid
    } catch {
      return {}
    }
  })
  useEffect(() => {
    try { localStorage.setItem('agente-window:mode-by-chat:v1', JSON.stringify(modeByChat)) } catch { /* a escolha local é best-effort; o servidor valida o enum a cada execução */ }
  }, [modeByChat])
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
  // Flag para pular assertWorkbenchInvariants durante transições atômicas
  // (Hide/Show editor) onde browserViews e editorTabs ficam temporariamente
  // dessincronizados entre renders.
  const skipInvariantCheck = useRef(false)
  // D88 (17/10): o modo do editor CENTRAL é lembrado entre reloads. Nasce do último valor
  // persistido (padrão de fábrica = anexo) e é gravado no mesmo efeito do layout.
  // NÃO confundir com `layout.state.editorMaximized` (shell/layoutState.ts), que maximiza a coluna anexa.
  const [editorMaximized, setEditorMaximized] = useState(persistedLayout.current.shell.centerEditorMaximized)
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
  const handleToggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])
  const pendingResponseTimers = useRef<Map<string, number>>(new Map())
  // FATIA 09: conversas REAIS em voo (runKey → controle de abort do fio).
  const agirAtivas = useRef<Map<string, ControleAgir>>(new Map())
  /** Numera os cartões do agente na ordem de chegada (ordem cronológica na tela). */
  const ordemCartao = useRef(0)
  /** O módulo Explorer (o agente manda atualizar após escrever no disco). */
  const explorerModuleRef = useRef<IExplorerSearchModule | null>(null)
  const approvalTimer = useRef<number | undefined>(undefined)
  // Editor resources are keyed by an explicit monotonic sequence because
  // Date.now() alone can collide when the user creates tabs quickly.
  // D174: a faixa NATIVA tem um unico dono de estado/memoria no shell. O App
  // segue orquestrando recursos de browser e a porta do modulo (sem copia das abas).
  const activateModuleTab = useCallback((sessionId: string, uri: string) => {
    explorerModuleRef.current?.attach.activateTab?.({ sessionId, uri: uri as WorkspaceUri })
  }, [])
  const showActivatedEditor = useCallback(() => setMobilePane('editor'), [])
  const {
    editorTabs, activeTabId, setActiveTabId, browserViews,
    activeGlobalTabId,
    activateEditorTab, preferredEditorTabForSession,
    openEditorTab: openNativeTab, createBrowser, closeNativeTab, removeSessionResources,
    reorderNativeTabs, hideNativeTabs, restoreNativeTabs,
    navigateBrowser, browserBack, browserForward, reloadBrowser, setBrowserStatus, setBrowserViewport,
  } = useFaixaDeAbasNativas(activateModuleTab, showActivatedEditor, activeSessionId)

  // Estado inicial vazio (todas as sessões excluídas). Em vez de trocar por uma
  // tela cheia que esconde as laterais, mantemos o shell montado e usamos uma
  // sessão "rascunho" vazia como sessão ativa; a coluna central mostra o input
  // centralizado (landing) enquanto sidebar e barra auxiliar permanecem visíveis.
  // A landing depende da lista primária (visível ao usuário) estar vazia; runs de
  // automação ficam fora da lista e, portanto, não contam para "há sessões".
  const hasSessions = sessions.some((session) => !session.automation)
  const landingVisible = newSessionLanding || !hasSessions
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
  const chatKey = `${activeSession.id}:${activeChatId}`
  const selectedModel = modelByChat[chatKey] ?? 'Auto'
  const selectedMode = modeByChat[chatKey] ?? 'agent'
  // FATIA 15 Onda 2c-i (D148 §1): as abas do módulo, projetadas para a sessão ativa.
  const abasProjetadasDoModulo = useMemo<readonly Aba[]>(() => {
    if (!hasSessions || !explorerModule) return []
    return projetarAbasDoModulo(activeSession.id, explorerModule.attach.getTabs({ sessionId: activeSession.id }))
  }, [hasSessions, explorerModule, activeSession.id, moduloAbasVersao])
  // A FUSÃO ACONTECE NO DERIVADO, NUNCA NO ESTADO: `editorTabs` continua dono só das
  // nativas, e a lista que o App usa para decidir passa a incluir as irmãs do módulo.
  const visibleEditorTabs = useMemo(
    () => hasSessions ? fundirAbas(getEditorTabsVisibleForSession(editorTabs, activeSession.id), abasProjetadasDoModulo) : [],
    [hasSessions, editorTabs, activeSession.id, abasProjetadasDoModulo],
  )
  // D148 §2/§4: o corpo capaz é fornecido enquanto a sessão tiver abas de ARQUIVO do
  // módulo — não só quando uma delas está ativa. Manter montado é o que dá atendente a
  // `requestCloseTab` de uma aba irmã (D147 §5); o EditorArea oculta com display:none
  // quando a aba ativa é outra, e isso é seguro porque o CodeEditorPane usa
  // automaticLayout. Se o módulo não oferece mountCodeEditor, o centro FALHA VISÍVEL.
  // D152 §2 (2c-ii): o corpo do centro é dono de DOIS tipos do módulo — `file` (Monaco
  // com gravação em disco) e `diff-arquivo` (diff read-only do Source Control). O corpo é
  // o MESMO: é ele que guarda os modelos do Monaco, e desmontá-lo ao trocar de tipo
  // perderia o estado que RF15-2 manda preservar. Por isso o slot monta quando QUALQUER
  // um dos dois existir, não só `file`.
  const haAbasDoCorpoCentral = abasProjetadasDoModulo.some((tab) => tab.type === 'file' || tab.type === 'diff-arquivo')
  const moduloMontaCentro = !!explorerModule && typeof explorerModule.mountCodeEditor === 'function'
  const codeEditorSlot = haAbasDoCorpoCentral && moduloMontaCentro && explorerModule
    ? <CenterCodeEditorSlot module={explorerModule} sessionId={activeSession.id} />
    : undefined
  // FATIA 15 Onda 3 (D166): a aba `Changes` do centro passa a mostrar o painel REAL
  // do módulo (ChangesPane → GitService), no lugar do `DiffView` de demonstração cujo
  // estado (`diffFilesBySession`) nasce e permanece vazio desde a 5.3. O slot é
  // montado sempre que o módulo oferece `mountChanges` — não só quando a aba está
  // ativa — pelo mesmo motivo do corpo de arquivo: desmontar perderia a seleção de
  // arquivo e a mensagem de commit a cada troca de aba (RF15-2).
  const moduloMontaChanges = !!explorerModule && typeof explorerModule.mountChanges === 'function'
  const changesSlot = moduloMontaChanges && explorerModule
    ? <CenterChangesSlot module={explorerModule} />
    : undefined
  const codeEditorUnavailable = haAbasDoCorpoCentral && !moduloMontaCentro
    ? 'O módulo Explorer/Busca desta cópia não oferece mountCodeEditor: as abas de arquivo aparecem na faixa, mas ninguém pode gravar em disco a partir do centro. Editar e salvar (RF15-1) não está disponível.'
    : undefined
  // Tipo da aba ativa — usado para "gate" da ação Toggle Details (só faz sentido
  // em abas com painel de detalhes acoplado: Changes/Files, nunca Browser/Search).
  const activeVisibleTabId = resolverAbaVisivel(visibleEditorTabs, activeTabId)
  const activeTabType = visibleEditorTabs.find((tab) => tab.id === activeVisibleTabId)?.type
  // FATIA 07 (DEBT-09, 15/10): abas GLOBAIS (sem dono de sessão — ex.: Provedores)
  // também abrem o editor central na landing. Abas com dono continuam invisíveis
  // fora da sessão dona (regra do `getEditorTabsVisibleForSession`).
  const globalEditorTabs = useMemo(() => editorTabs.filter((tab) => !tab.sessionId), [editorTabs])
  // Sem sessões, o rascunho vazio não tem editor: o chat é a única superfície e
  // centraliza (landing). Forçamos os inputs do side pane para o estado "closed" —
  // exceto quando há aba global aberta (DEBT-09): aí o editor abre ao lado da landing.
  const sidePaneInputs = hasSessions && !landingVisible
    ? { hasEditorTabs: visibleEditorTabs.length > 0, editorHidden, auxVisible: auxiliaryVisible }
    : globalEditorTabs.length > 0
      ? { hasEditorTabs: true, editorHidden, auxVisible: false }
      : { hasEditorTabs: false, editorHidden: true, auxVisible: false }
  const sidePaneState = resolveSidePaneState(sidePaneInputs)
  const editorContentVisible = isEditorContentVisible(sidePaneInputs)
  const tabBarVisible = isTabBarVisible(sidePaneInputs)
  const chatCentered = isChatCentered(sidePaneInputs)
  // (E7/R-044) O detalhe é transiente sob uma aba Browser enquanto o editor está
  // visível — some ao ativar Browser e retorna ao voltar p/ Changes/Files. Se o
  // editor for oculto com Browser ativo, o painel mostra o fallback Changes/Files.
  // FATIA 15 Onda 3 (D165): `layoutController` saiu. Ele existia para responder uma pergunta
  // só — "esta plataforma renderiza a coluna de detalhes?" — e quem a fazia era o gate de
  // render da coluna, removido na D156. Depois disso, `createLayoutController` era chamado a
  // cada mudança de `isSinglePane` e o resultado não era lido por ninguém.
  // O DOMÍNIO `domain/layoutController.ts` continua inteiro e testado (layoutController.test.ts):
  // o que saiu foi a instanciação sem consumidor no síndico, não a regra de plataforma.
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
          setAuxiliaryTab(restored.activeViewContainerId)
        },
        clearVisibleSessionState: (resources) => {
          let map = sessionLayouts.current
          for (const resource of resources) map = forgetSessionLayout(map, resource)
          sessionLayouts.current = map
          saveSessionLayouts(map)
        },
      },
      { initialPreviousResource: BOOT_SESSION_ID },
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
      shell: { sidebarVisible, auxiliaryVisible, terminalVisible, editorHidden, sidebarWidth, centerEditorMaximized: editorMaximized },
      partSizesBySession,
    })
  }, [sidebarVisible, auxiliaryVisible, terminalVisible, editorHidden, sidebarWidth, editorMaximized, partSizesBySession])

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

  const selectSession = (id: string) => {
    setNewSessionLanding(false)
    // (LAYOUT.md) Abrir uma sessão dispensa a custom view ativa e devolve as
    // parts cobertas ao estado que o usuário tinha escolhido.
    if (customView.activeView !== null) {
      const desired = restoredPartVisibility(customView)
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
    // Onda 2c-i: o clique pode cair numa aba de fronteira, que NÃO vive em
    // `editorTabs` — ela vem da projeção. Sem este ramo, clicar numa aba do módulo
    // na faixa central não faria nada (o find devolve undefined e o guard retorna).
    const projetada = abasProjetadasDoModulo.find((candidate) => candidate.id === id)
    if (projetada) {
      activateEditorTab(projetada)
      return
    }
    const tab = editorTabs.find((candidate) => candidate.id === id)
    if (!tab || (tab.sessionId && tab.sessionId !== activeSession.id)) return
    activateEditorTab(tab)
    // (R-069) Ao trocar a aba do editor, a barra auxiliar reflete o conteúdo
    // correspondente: Changes abre → aux mostra changes; Files abre → aux mostra files.
    if (tab.type === 'diff') setAuxiliaryTab('changes')
    if (tab.type === 'file') setAuxiliaryTab('files')
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
    reorderNativeTabs(fromId, toId)
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
      const group = panelGroupRef.current
      // 4.8-B3: sem PanelGroup (boot sem editor) a largura observada é só
      // baseline — não há editor cuja largura em px deva ser preservada.
      if (!group) { lastSurfaceWidth.current = 0; return }
      if (!previous || !width || Math.abs(width - previous) < 1) return
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

  /**
   * FATIA 15 Onda 3 (D169) — "Dividir editor" DIVIDE de verdade.
   *
   * O que este handler fazia antes: emitia "Divisão indisponível…" quando o gate
   * E15 barrava, e nos outros casos abria uma ABA FALSA chamada "Files (divisão)"
   * com `path: 'workspace/split'` — um arquivo que não existe no disco. Medido no
   * browser: nenhuma área nova, nenhum segundo grupo, e um erro de leitura de
   * arquivo no lugar do editor. Era função de mentira com nome de função.
   *
   * Agora: o mecanismo é do módulo (`attach.split` → EditorService, que passa a
   * manter dois grupos por sessão) e o GATE continua sendo do shell, que é quem
   * conhece o layout. Nada de aba falsa em nenhum caminho.
   */
  /**
   * D170-b — o gate do split, num lugar só. Duas ações precisam dele agora
   * ("Dividir editor" e "Abrir ao lado" sem divisão aberta) e duplicar a
   * condição é como os gates divergem. Devolve o MOTIVO da recusa, ou null.
   */
  const motivoSemDivisao = (): string | null => {
    if (!explorerModuleRef.current?.attach.split) {
      return 'Divisão indisponível: o módulo Explorer/Busca desta cópia não oferece split'
    }
    if (isSinglePane && !canSplitMainEditor(agentLayout.current)) {
      return 'Divisão indisponível: o layout single-pane usa um único grupo de editor'
    }
    return null
  }

  const handleSplitEditor = () => {
    const motivo = motivoSemDivisao()
    if (motivo) {
      notify(motivo)
      return
    }
    // (E15/R-039) O gate do single-pane continua valendo — está em
    // `motivoSemDivisao` e NÃO foi afrouxado. (Relaxar o gate é decisão de
    // produto do dono — ver D169.)
    const id = explorerModuleRef.current?.attach.split?.({ sessionId: activeSession.id }) ?? null
    if (id === null) notify('O editor já está dividido')
    else notify('Editor dividido: escolha um arquivo no Explorer para abrir do outro lado')
  }

  /**
   * D170-b — "Abrir ao lado" (menu da aba do centro).
   *
   * DEFEITO MEDIDO no browser: o painel secundário anunciava "…ou use «Abrir ao
   * lado» na aba", e o menu da aba só tinha Abrir/Fechar/Dividir. O
   * `EditorService.moveTab` (D169) já existia e estava correto — era mecanismo
   * sem botão. Aqui o shell só traduz: id da aba → uri → pedido ao módulo.
   *
   * Sem divisão aberta, o pedido é REJEITADO com aviso, nunca com silêncio: o
   * usuário clicou, tem de saber por que nada aconteceu. (Criar a divisão
   * sozinha seria mudar o produto sem decisão do dono.)
   */
  const handleOpenToSide = (id: string) => {
    const projetada = abasProjetadasDoModulo.find((tab) => tab.id === id)
    const modulo = explorerModuleRef.current
    if (!projetada?.uri || !modulo?.attach.moveTab) {
      notify('Abrir ao lado: só abas de arquivo do módulo podem ser movidas para o outro lado')
      return
    }
    // Sem divisão, "abrir ao lado" CRIA o lado. É o que a dica do painel 2
    // promete ("…ou use «Abrir ao lado» na aba") e é o que o VS Code faz: a ação
    // entrega a aba do outro lado, não um aviso para dividir antes. O gate do
    // single-pane continua barrando — recusar é diferente de não fazer nada.
    const jaDividido = modulo.attach.isSplit?.({ sessionId: activeSession.id }) ?? false
    if (!jaDividido) {
      const motivo = motivoSemDivisao()
      if (motivo) { notify(motivo); return }
    }
    // O `if` acima já provou que a capacidade existe; o optional evita repetir a
    // checagem com dois módulos diferentes em escopo (`modulo` e o ref).
    if (!jaDividido) {
      modulo.attach.split?.({ sessionId: activeSession.id })
    }
    const lado = modulo.attach.focusSideOf?.({ sessionId: activeSession.id })
    const destino = lado === 'secundario' ? 'principal' : 'secundario'
    const moveu = modulo.attach.moveTab({ sessionId: activeSession.id, uri: projetada.uri as WorkspaceUri, to: destino })
    // A única recusa que sobra é a do serviço: não deixar um painel sem abas.
    if (!moveu) notify('Abrir ao lado: o painel de origem ficaria sem abas')
    else notify(destino === 'secundario' ? 'Aba aberta ao lado' : 'Aba movida para o painel principal')
  }

  // A politica de abertura/reuso e a mutacao da faixa sao do hook no shell.
  const openEditorTab = (type: EditorTab['type'], options: { title: string; path?: string; sessionId?: string; content?: string; isRealFile?: boolean; imagePreview?: EditorTab['imagePreview']; readError?: string }) =>
    openNativeTab(type, options, activeSession.id)

  // (BLOCO 4.4-fix BUG-P1 + GAP-V1) Clique num arquivo da árvore (evento
  // explorer.fileOpened): lê o conteúdo REAL via FileSystemPort (Single Port),
  // abre/reusa a aba `file` do editor (Image Preview para binários — aceite do
  // bloco) e faz o reveal explícito do anexo no padrão R-083 (nunca só ativar).
  // Mock segue apenas como fallback declarado (aba sem content, criada por
  // outros fluxos — demo Files, pesquisa, split etc.).
  // (FATIA-04 4.7 c4 — exceção autorizada) Arquivo REAL clicado na árvore abre
  // no EDITOR ANEXO do módulo (`attach.open`, 04_05 §10), não mais no editor
  // central. Leitura, Image Preview e ERROR EDITOR vivem no módulo.
  // (FATIA-05 5.7, D6 — regra A+2/420 de 2026-10-01) Ao abrir arquivo a coluna "Detalhes" colapsa
  // sozinha (segue acessível pelo toggle "Barra auxiliar"); o anexo é quem fica à direita do chat.
  // 5.7 fix (BUG 5.7-01, homologação 2026-10-01): clique no Explorer abre aba FIXA (`pinned`) — 3 cliques = 3 abas.
  // O modo preview (clique simples substitui, itálico) continua disponível pela API `attach.open` sem `pinned` (T6 da 14).
  handleExplorerFileOpenedRef.current = (uri: WorkspaceUri) => {
    setExplorerContextMenu(null)
    revealEditor() // pós-11: clique no Explorer REEXIBE o editor (era o "não abre")
    void explorerModule?.attach.open({ uri, kind: 'code', sessionId: activeSession.id, pinned: true })
  }

  const openBrowser = () => createBrowser(activeSession.id)
  // FATIA 11: o auto-scroll do chat é config do servidor — carrega uma vez;
  // a aba Config avisa quando salvar (sem ela, vale o default LIGADO).
  const [autoScrollChat, setAutoScrollChat] = useState(AUTOSCROLL_PADRAO)
  useEffect(() => {
    carregarConfig().then((config) => setAutoScrollChat(config.autoScroll)).catch(() => {})
  }, [])

  const openProviders = () => {
    openEditorTab('providers', { title: 'Provedores' })
    revealEditor()
  }
  const openConfig = () => {
    openEditorTab('config', { title: 'Configurações' })
    revealEditor()
  }
  // FATIA-05 5.2 (RF-04): a busca vive na Side Bar — Ctrl+Shift+F, botão da titlebar e
  // menu "+" ativam a view `search` (sem alternar) e pedem foco ao módulo. A aba "Search"
  // do editor central não é mais criada.
  const openSearch = useCallback(() => {
    setSearchFocusRequest((current) => current + 1)
    layout.showView('search')
  }, [layout])
  const openDiff = (sessionId: string = activeSession.id, diffFileId?: string) => {
    if (sessionId !== activeSession.id) selectSession(sessionId)
    if (diffFileId) {
      setSelectedDiffFileBySession((current) => ({ ...current, [sessionId]: diffFileId }))
    }
    openEditorTab('diff', { title: 'Branch Changes', sessionId })
    setAuxiliaryTab('changes')
    // (E10/R-083) A Changes pill revela explicitamente o editor mesmo se o side
    // pane estava fechado ou em detail-only — nunca apenas ativa a aba.
    revealEditor()
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
        pushLayer(current, { id: 'custom-view-aiCustomizations', kind: 'custom-view', label: 'Personalizações' }),
      )
    }
  }, [isPhone, openCustomViewGrid])

  // Fechar restaura EXATAMENTE a visibilidade retida (desired), nunca um default.
  const closeCustomViewGrid = useCallback(() => {
    setCustomView((current) => {
      if (current.activeView === null) return current
      const desired = restoredPartVisibility(current)
      setTerminalVisible(desired.panel)
      setEditorHidden(!desired.editor)
      setNavStack((stack) => dismissLayer(stack, 'custom-view-aiCustomizations'))
      return closeCustomView(current)
    })
  }, [])

  // A identidade da conversa vai como parâmetro: é ela que permite ao servidor
  // resolver a raiz de projeto. O caminho NUNCA é enviado pela tela (F1/D113).
  const alvoPersonalizacoes = { sessionId: activeSession.id, chatId: activeChatId }

  const customizationsSurfaceEmbedded = (
    <PersonalizacoesView embedded alvo={alvoPersonalizacoes} />
  )

  const customizationsSurface = (
    <PersonalizacoesView alvo={alvoPersonalizacoes} />
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
        hideNativeTabs(activeSession.id, (dropped) => {
          const dirty = dropped.some((tab) => tab.type === 'search')
          notify(dirty
            ? 'Editor oculto: abas não-acopladas fechadas (Search descartado)'
            : 'Editor oculto: abas não-acopladas fechadas')
        })
      } else {
        // Durante o commit React das duas colecoes o invariante pode ver metade
        // da transicao. O flag do sindico so protege este instante; a memoria e
        // os BrowserViews capturados vivem agora exclusivamente no hook.
        skipInvariantCheck.current = true
        restoreNativeTabs()
        queueMicrotask(() => { skipInvariantCheck.current = false })
      }
      return next
    })
  }, [activeSession.id])

  // R-040: revelar pelo Explorer/Provedores/Config/Changes deve restaurar a
  // captura, NAO apenas mudar o booleano. O caminho antigo deixava o snapshot
  // do Browser congelado e perdia a aba nova no F5 (teste vermelho D175c).
  const revealEditor = () => {
    if (editorHidden) handleToggleEditorHidden()
    else setEditorHidden(false)
  }

  // Toggle Details (⌥⌘L). "Gated": só atua quando a aba ativa tem detalhe
  // acoplado (Changes/Files). Esconder o detalhe com o editor oculto revelaria um
  // painel vazio — nesse caso, revela o editor de volta.

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
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [openSearch, handleToggleEditorHidden, handleMobileBack, isPhone])

  const closeEditorTab = (id: string) => {
    // Onda 2c-i (D148 §3): fechar aba de fronteira chama `attach.requestCloseTab` e
    // NUNCA `setEditorTabs` — quem pode salvar ou descartar é o módulo, porque só ele
    // alcança o EditorService e o writeFile atômico (Regra 2). O shell pede; o
    // CenterCodeEditor abre o diálogo Salvar/Não Salvar/Cancelar e executa.
    const partes = dividirIdDoModulo(id)
    if (partes) {
      const uri = partes.uri as WorkspaceUri
      // R-081 preservado: a mesma regra de CannotClose que vale para as nativas.
      const projetada = abasProjetadasDoModulo.find((tab) => tab.id === id)
      if (projetada && !isTabCloseable(projetada, sidePaneState)) return
      if (haAbasDoCorpoCentral && moduloMontaCentro) {
        explorerModuleRef.current?.attach.requestCloseTab?.({ sessionId: partes.sessionId, uri })
      } else {
        // D148 §4 / D147 §5: sem corpo montado o pedido não faz nada, e o chamador
        // trata como FALHA — NUNCA como descarte silencioso. Nesta cópia o caso é
        // inatingível para abas `file` (o corpo fica montado enquanto houver aba de
        // arquivo do módulo); é real para search/changes/diff-arquivo, cujo corpo é
        // trabalho da Onda 3 (D148 §6). Nada é removido do estado por este caminho.
        console.warn('[agente-window] fechar aba de fronteira sem corpo central montado — pedido não atendido, nada foi descartado', id)
      }
      return
    }
    const closing = editorTabs.find((tab) => tab.id === id)
    if (!closing) return
    // (E13/R-081) Reforço "CannotClose": abas gerenciadas (Changes/Files) não
    // podem ser fechadas em detail-only, mesmo por caminho programático. O botão
    // já é escondido em EditorArea; este guard cobre atalhos/DnD/menu de contexto.
    if (!isTabCloseable(closing, sidePaneState)) return

    // R-081 e a fronteira do modulo sao do App; remocao e sucessao de aba
    // NATIVA e seu BrowserView sao responsabilidade unica do hook do shell.
    closeNativeTab(id, activeSession.id)
  }

  const handleNewSession = () => {
    // FATIA-06.2: o + GLOBAL abre sempre o mesmo SessionLanding validado.
    // O rascunho e o worktree só passam a existir após a primeira mensagem.
    setNewSessionLanding(true)
    setMobilePane('chat')
    notify('Nova sessão pronta para escolher contexto')
  }

  const handlePickWorkspace = async () => {
    setWorkspacePickerPending(true)
    try {
      const workspace = await pickSessionWorkspace()
      if (workspace) setSelectedWorkspace(workspace)
      setWorkspaceNativePickerAvailable(true)
    } catch (error) {
      setWorkspaceNativePickerAvailable(false)
      notify('Seletor nativo indisponível. Digite o caminho da pasta manualmente.')
    } finally {
      setWorkspacePickerPending(false)
    }
  }

  const handleChangeActiveWorkspace = async (path: string) => {
    if (workspaceChangePending) return
    setWorkspaceChangePending(true)
    if (landingVisible) {
      try {
        const workspace = await validateSessionWorkspace(path)
        const response = await fetch('/fs/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: workspace.path }) })
        if (!response.ok) throw new Error(`Falha ao atualizar Explorer (${response.status})`)
        setSelectedWorkspace(workspace)
        document.title = workspace.path
        notify(`Workspace selecionado: ${workspace.path}`)
        return
      } finally { setWorkspaceChangePending(false) }
    }
    if (!hasSessions) { setWorkspaceChangePending(false); return }
    const previousPath = activeSession.worktreePath ?? activeSession.workspacePath
    let workspaceCommitted = false
    try {
      // Sessão recém-criada pode ainda não existir no servidor (ela só vai em
      // bloco no pagehide) — persiste ANTES de trocar a pasta, senão a troca
      // morre no 404 silencioso (o caso do teste manual do dono na FATIA 10:
      // sessão nova → digita a pasta → agente seguia na pasta antiga).
      if (!activeSession.isDraft) await persistSession(activeSession)
      const { session } = await changeSessionWorkspace(activeSession.id, path)
      workspaceCommitted = true
      const fsResponse = await fetch('/fs/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: session.workspacePath }) })
      if (!fsResponse.ok) throw new Error(`Falha ao atualizar Explorer (${fsResponse.status})`)
      // TerminalPanel observes the committed workspace prop and opens a fresh
      // PTY there while keeping existing shells and their live WS state intact.
      setSessions((current) => current.map((candidate) => candidate.id === session.id ? {
        ...candidate, workspace: session.workspace, workspacePath: session.workspacePath,
        worktreePath: session.worktreePath, branch: session.branch, persistenceRevision: session.persistenceRevision,
      } : candidate))
      document.title = session.workspacePath
      notify(`Workspace alterado para ${session.workspacePath}`)
    } catch (error) {
      // Compensação: se a persistência já mudou antes de o Explorer falhar, restaura
      // o workspace anterior; terminais vivos não foram alterados nesta etapa.
      try {
        if (workspaceCommitted) {
          await changeSessionWorkspace(activeSession.id, previousPath)
          await fetch('/fs/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: previousPath }) })
        }
      } catch { /* o erro original é o relevante para o usuário */ }
      throw error
    } finally { setWorkspaceChangePending(false) }
  }

  const handleBrowseActiveWorkspace = async () => {
    setWorkspacePickerPending(true)
    try {
      const workspace = await pickSessionWorkspace()
      if (workspace) await handleChangeActiveWorkspace(workspace.path)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Falha ao abrir o seletor de pastas')
    } finally { setWorkspacePickerPending(false) }
  }

  // Estado inicial vazio (nenhuma sessão) → cria a sessão a partir da 1ª mensagem
  // digitada na landing, derivando o título do texto (paridade com o original).
  const handleLandingSubmit = async (text: string) => {
    const id = `new-${Date.now()}`
    const chatId = `${id}-main`
    const title = text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text
    try {
      const workspaceLabel = selectedWorkspace?.name ?? 'workspace-local'
      const worktree = await createSessionWorktree(selectedWorkspace?.path ?? '', selectedWorkspace?.slug ?? 'workspace-local', id)
      const seededLayout = seedCreatedFromNewSession(newSessionState)
      setAuxiliaryTab(seededLayout.activeViewContainerId)
      const next: Session = {
        id,
        title,
        workspace: workspaceLabel,
        workspacePath: worktree.repoRoot,
        worktreePath: worktree.path,
        slug: worktree.slug,
        section: 'today',
        status: 'completed',
        updated: 'agora',
        diffAdded: 0,
        diffRemoved: 0,
        branch: worktree.branch,
        chats: [{ id: chatId, title: 'Novo chat', status: 'completed', messages: [] }],
        mainChatId: chatId,
      }
      // F1: registrar sessão/contexto no servidor antes de abrir qualquer execução Agir.
      await persistSession(next)
      setSessions((current) => [next, ...current])
      setActiveChatBySession((current) => ({ ...current, [id]: chatId }))
      setActiveSessionId(id)
      setVisibleSessionIds([id])
      setNewSessionLanding(false)
      setSelectedWorkspace(undefined)
      layoutSyncRef.current?.setPreviousResource(id)
      setMobilePane('chat')
      window.setTimeout(() => handleSend(text, [], { sessionId: id, chatId }), 0)
    } catch (error) {
      console.error('[sessions] worktree creation failed', error)
      notify(error instanceof Error ? error.message : 'Falha ao criar worktree da sessão')
    }
  }

  const handleToggleArchived = (id: string) => {
    const target = sessions.find((session) => session.id === id)
    const archived = !target?.archived
    updateSession(id, (session) => ({ ...updateSessionStatus(session, archived ? 'completed' : session.status), archived, section: archived ? 'archived' : 'today' }))
    if (archived) {
      clearPendingTimersForSession(id)
      const nextResources = removeSessionResources(id)
      if (activeSessionId === id) {
        setActiveTabId(resolverAbaVisivel(getEditorTabsVisibleForSession(nextResources.editorTabs, id), activeTabId))
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

  const handleDelete = async (id: string) => {
    try {
      await removePersistedSession(id)
    } catch (error) {
      if (error instanceof SessionPersistenceError && error.code === 'worktree_dirty') {
        const confirmed = window.confirm('Este worktree possui alterações locais. Excluir a sessão e descartar essas alterações?')
        if (!confirmed) return
        try {
          await removePersistedSession(id, true)
        } catch (forcedError) {
          notify(forcedError instanceof Error ? forcedError.message : 'Falha ao remover worktree')
          return
        }
      } else {
        notify(error instanceof Error ? error.message : 'Falha ao excluir sessão')
        return
      }
    }
    try { removeSessionRecovery(id) } catch { notify('Sessão excluída; não foi possível limpar a cópia de recuperação no navegador.') }
    clearPendingTimersForSession(id)
    // (R-003) Excluir um draft abandonado descarta o rascunho pendente do
    // Management (deleteNewSession dispose — SESSIONS.md §Drafts).
    management.current = discardDraft(management.current, id)
    const remaining = sessions.filter((session) => session.id !== id)
    setSessions(remaining)
    const nextResources = removeSessionResources(id)
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
    setPermissionByChat((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${id}:`))))
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

  /** Histórico limpo do chat atual (G5): sem bolhas de erro, canceladas ou em voo. */
  const montarHistorico = (mensagens: ChatMessage[]): MensagemSimples[] =>
    mensagens
      .filter((mensagem) => !mensagem.running && !mensagem.cancelled && !mensagem.erro && mensagem.content.trim().length > 0)
      .map((mensagem) => ({ role: mensagem.role, content: mensagem.content }))

  /** Atualiza os cartões de ferramenta da resposta em voo (fonte única da verdade). */
  const mexerFerramentas = (
    sessionId: string,
    chatId: string,
    responseId: string,
    mexer: (cartoes: FerramentaNoChat[]) => FerramentaNoChat[],
  ): void => {
    updateSession(sessionId, (session) => ({
      ...session,
      chats: session.chats.map((chat) => chat.id === chatId ? {
        ...chat,
        messages: chat.messages.map((message) => message.id === responseId ? {
          ...message,
          ferramentas: mexer(message.ferramentas ?? []),
        } : message),
      } : chat),
    }))
  }

  /** Numera os cartões do agente na ordem de chegada (ordem cronológica na tela). */
  const proximaOrdemCartao = (): number => {
    ordemCartao.current += 1
    return ordemCartao.current
  }

  /** Atualiza os cartões "continuar?" da resposta em voo (FATIA 11). */
  const mexerContinuar = (
    sessionId: string,
    chatId: string,
    responseId: string,
    mexer: (cartoes: ContinuarNoChat[]) => ContinuarNoChat[],
  ): void => {
    updateSession(sessionId, (session) => ({
      ...session,
      chats: session.chats.map((chat) => chat.id === chatId ? {
        ...chat,
        messages: chat.messages.map((message) => message.id === responseId ? {
          ...message,
          continuar: mexer(message.continuar ?? []),
        } : message),
      } : chat),
    }))
  }

  /**
   * Ouvintes do fio do agente para UMA resposta (FATIA 11): o pedido novo e
   * o "continuar" usam os mesmos — a bolha cresce, os cartões nascem e o teto
   * pausa com o cartão "continuar?". `aoFluxoMorto` = 409 'fluxo' (só o
   * continuar recebe: a retomada venceu e o cartão expira).
   */
  const criarOuvintesAgir = (
    sessionId: string,
    chatId: string,
    responseId: string,
    acumuladoInicial: string,
    aoFluxoMorto?: () => void,
    aoConcluir?: () => void,
  ): OuvintesAgir => {
    const runKey = `${sessionId}:${chatId}`
    let acumulado = acumuladoInicial
    return {
      onChunk: (pedaco) => {
        acumulado += pedaco
        const conteudo = acumulado
        updateSession(sessionId, (session) => ({
          ...session,
          chats: session.chats.map((chat) => chat.id === chatId ? {
            ...chat,
            messages: chat.messages.map((message) => (message.id === responseId && message.running) ? { ...message, content: conteudo } : message),
          } : chat),
        }))
      },
      onTool: (pedido: PedidoFerramenta) => {
        mexerFerramentas(sessionId, chatId, responseId, (cartoes) => [...cartoes, {
          id: pedido.id,
          ferramenta: pedido.ferramenta,
          alvo: String(pedido.argumentos.comando ?? pedido.argumentos.caminho ?? pedido.argumentos.padrao ?? ''),
          status: 'executando',
          ordem: proximaOrdemCartao(),
        }])
      },
      onApproval: (pedido: PedidoFerramenta, previaServidor?: string, allowSession?: boolean) => {
        const bruta = pedido.argumentos.conteudo
        // FATIA 12: a prévia do `excluir` vem do servidor (viu o disco); o resto usa o conteúdo do pedido.
        const previa = previaServidor ?? (typeof bruta === 'string' ? bruta.slice(0, 400) : undefined)
        mexerFerramentas(sessionId, chatId, responseId, (cartoes) => cartoes.map((carta) => carta.id === pedido.id ? { ...carta, status: 'aguardando', allowSession, ...(previa !== undefined ? { previa } : {}) } : carta))
      },
      onToolProgress: (id, texto) => {
        mexerFerramentas(sessionId, chatId, responseId, (cartoes) => cartoes.map((carta) => carta.id === id ? { ...carta, progresso: texto } : carta))
      },
      onCommandWaiting: (id) => {
        mexerFerramentas(sessionId, chatId, responseId, (cartoes) => cartoes.map((carta) => carta.id === id ? { ...carta, status: 'aguardando_continuacao' } : carta))
      },
      onToolResult: (id, ferramenta, ok, resumo, efeitoIniciado) => {
        mexerFerramentas(sessionId, chatId, responseId, (cartoes) => cartoes.map((carta) => carta.id === id ? {
          ...carta,
          status: ok ? 'ok' : resumo.includes('dono negou') ? 'negado' : 'erro',
          resumo,
        } : carta))
        // O agente escreveu/apagou no disco: o Explorer mostra sem precisar resselecionar.
        if ((ok || efeitoIniciado) && (ferramenta === 'criar' || ferramenta === 'escrever' || ferramenta === 'excluir')) {
          const modulo = explorerModuleRef.current
          if (modulo) void modulo.explorer.refresh().catch(() => undefined)
        }
      },
      onTeto: (iteracoes, teto) => {
        agirAtivas.current.delete(runKey)
        mexerContinuar(sessionId, chatId, responseId, (cartoes) => [...cartoes, {
          id: `teto-${Date.now()}-${cartoes.length}`,
          status: 'aguardando',
          iteracoes,
          teto,
          ordem: proximaOrdemCartao(),
        }])
        updateSession(sessionId, (session) => {
          const next = completeChatRun(session, chatId)
          return {
            ...next,
            updated: 'agora',
            chats: next.chats.map((chat) => chat.id === chatId ? {
              ...chat,
              messages: chat.messages.map((message) => (message.id === responseId && message.running) ? {
                ...message,
                content: acumulado,
                running: false,
                time: timeLabel(),
              } : message),
            } : chat),
          }
        })
      },
      onIteracao: (iteracao, teto, modelo) => {
        updateSession(sessionId, (session) => ({
          ...session,
          chats: session.chats.map((chat) => chat.id === chatId ? {
            ...chat,
            messages: chat.messages.map((message) => (message.id === responseId && message.running) ? { ...message, model: modelo ?? message.model, iteracaoAtual: iteracao, tetoAtual: teto } : message),
          } : chat),
        }))
      },
      onDone: (modelo) => {
        agirAtivas.current.delete(runKey)
        updateSession(sessionId, (session) => {
          const next = completeChatRun(session, chatId)
          return {
            ...next,
            updated: 'agora',
            chats: next.chats.map((chat) => chat.id === chatId ? {
              ...chat,
              messages: chat.messages.map((message) => (message.id === responseId && message.running) ? {
                ...message,
                content: acumulado,
                model: modelo ?? message.model,
                running: false,
                time: timeLabel(),
              } : message),
            } : chat),
          }
        })
        aoConcluir?.()
      },
      onError: (code, mensagemErro, detalhe) => {
        if (code === 'fluxo' && aoFluxoMorto) {
          aoFluxoMorto()
          // Expirar o cartão também precisa encerrar o estado de trabalho.
        }
        agirAtivas.current.delete(runKey)
        // Erro TRANSITÓRIO com retomada guardada: a bolha mostra o erro E o
        // cartão "continuar de onde parou" (o mesmo Continuar do teto).
        if (detalhe?.retomavel === true) {
          const iteracoes = detalhe.iteracoes ?? 0
          const teto = detalhe.teto ?? 25
          mexerContinuar(sessionId, chatId, responseId, (cartoes) => [...cartoes, {
            id: `retomar-${Date.now()}`,
            status: 'aguardando',
            iteracoes,
            teto,
            ordem: proximaOrdemCartao(),
            titulo: 'A resposta não terminou a tempo',
            motivo: 'Dá para continuar de onde parou — o que já foi feito não se perdeu.',
          }])
        }
        updateSession(sessionId, (session) => {
          const next = completeChatRun(session, chatId)
          return {
            ...next,
            updated: 'agora',
            chats: next.chats.map((chat) => chat.id === chatId ? {
              ...chat,
              status: 'error',
              messages: chat.messages.map((message) => (message.id === responseId && message.running) ? {
                ...message,
                content: mensagemErro,
                running: false,
                erro: true,
                time: timeLabel(),
              } : message),
            } : chat),
          }
        })
      },
    }
  }

  /**
   * FATIA 10 — liga o AGIR no chat: o mesmo lugar da FATIA 09, agora com
   * ferramentas de arquivo. O texto continua crescendo em pedaços e os
   * cartões (ler/criar/…) nascem, esperam o dono e mostram o resultado
   * presos à resposta (SPEC PARTE 2D §5). Parar continua silencioso.
   * FATIA 11: o teto pausa com o cartão "continuar?" (MESMO fluxo, orçamento
   * cheio) — o pedido novo e o "continuar" dividem os ouvintes.
   */
  const iniciarAgirReal = (
    sessionId: string,
    chatId: string,
    responseId: string,
    historico: MensagemSimples[],
    aoConcluir?: () => void,
    modelSelection: SelecaoModelo = { tipo: 'auto' },
    instrucaoHumana?: string,
  ): void => {
    const runKey = `${sessionId}:${chatId}`
    agirAtivas.current.get(runKey)?.abortar() // substitui uma corrida em voo
    const modo = (modeByChat[runKey] ?? 'agent') as ModoAgir
    const sessaoPermissao = sessions.find(session => session.id === sessionId)
    const permissionKey = `${runKey}:${sessaoPermissao?.worktreePath ?? sessaoPermissao?.workspacePath ?? ''}`
    const permissao = permissionByChat[permissionKey] ?? 'manual'
    const entrada = {
      instructionToken: undefined as string | undefined,
      mensagens: historico,
      modelSelection,
      // Fluxo ÚNICO por troca (sessão:chat:resposta): o servidor isola as
      // aprovações desta resposta — nada vaza para a próxima troca.
      fluxo: `${sessionId}:${chatId}:${responseId}`,
      sessionId,
      chatId,
      // O servidor ignora este campo; o modo é enviado separadamente pelo
      // comando de seleção e permanece independente da resposta do modelo.
      mode: modo,
    }
    const ouvintes = criarOuvintesAgir(sessionId, chatId, responseId, '', undefined, aoConcluir)
    let real: ControleAgir | null = null
    let canceladaAntesDoInicio = false
    const controladorModo = new AbortController()
    const controle: ControleAgir = {
      identidade: () => real?.identidade() ?? null,
      abortar: async () => {
        if (real) return real.abortar()
        canceladaAntesDoInicio = true
        controladorModo.abort()
        return 'cancelled'
      },
    }
    agirAtivas.current.set(runKey, controle)
    void selecionarModoAgir(sessionId, chatId, modo, controladorModo.signal).then(async () => {
      if (canceladaAntesDoInicio) return
      await selecionarPermissaoAgir(sessionId, chatId, permissao)
      if (canceladaAntesDoInicio) return
      if (instrucaoHumana !== undefined) entrada.instructionToken = await registrarInstrucaoAgir(sessionId, chatId, entrada.fluxo, instrucaoHumana, controladorModo.signal)
      if (canceladaAntesDoInicio) return
      real = enviarAgir(entrada, ouvintes)
    }).catch((erro: unknown) => {
      if (canceladaAntesDoInicio) return
      ouvintes.onError('configuracao', erro instanceof Error ? erro.message : 'Não foi possível registrar o modo de execução.')
    })
  }

  /** O dono respondeu um cartão; o servidor grava grants de sessão após validar o contexto. */
  const decidirFerramenta = (sessionId: string, chatId: string, messageId: string, ferramentaId: string, decisao: DecisaoAprovacao): void => {
    const sessao = sessions.find((item) => item.id === sessionId)
    const chat = sessao?.chats.find((item) => item.id === chatId)
    const carta = chat?.messages.find((item) => item.id === messageId)?.ferramentas?.find((item) => item.id === ferramentaId)
    if (!sessao || !carta || carta.status !== 'aguardando') return
    const marcar = (status: FerramentaNoChat['status']): void => {
      updateSession(sessionId, (session) => ({
        ...session,
        chats: session.chats.map((item) => item.id === chatId ? {
          ...item,
          messages: item.messages.map((mensagem) => mensagem.id === messageId ? {
            ...mensagem,
            ferramentas: (mensagem.ferramentas ?? []).map((uma) => uma.id === carta.id ? { ...uma, status } : uma),
          } : mensagem),
        } : item),
      }))
    }
    marcar('executando')
    const identidade: IdentidadeExecucaoAgir | null = agirAtivas.current.get(`${sessionId}:${chatId}`)?.identidade() ?? null
    void responderAprovacao(sessionId, `${sessionId}:${chatId}:${messageId}`, carta.id, decisao, identidade).then((aceita) => {
      if (!aceita) marcar('expirado') // o fluxo já não esperava (recarregou/terminou)
    })
  }

  /** Resposta ao timeout de um processo one-shot (não usa nem altera PTY humano). */
  const decidirAguardarComando = (sessionId: string, chatId: string, messageId: string, ferramentaId: string, decisao: 'continuar' | 'parar'): void => {
    const sessao = sessions.find((item) => item.id === sessionId)
    const carta = sessao?.chats.find((chat) => chat.id === chatId)?.messages.find((item) => item.id === messageId)?.ferramentas?.find((item) => item.id === ferramentaId)
    if (!sessao || !carta || carta.status !== 'aguardando_continuacao') return
    updateSession(sessionId, (session) => ({
      ...session,
      chats: session.chats.map((chat) => chat.id === chatId ? {
        ...chat,
        messages: chat.messages.map((message) => message.id === messageId ? {
          ...message,
          ferramentas: (message.ferramentas ?? []).map((item) => item.id === ferramentaId ? { ...item, status: 'executando' } : item),
        } : message),
      } : chat),
    }))
    const fluxo = `${sessionId}:${chatId}:${messageId}`
    const identidade = agirAtivas.current.get(`${sessionId}:${chatId}`)?.identidade() ?? null
    void responderAguardarComando(sessionId, chatId, fluxo, ferramentaId, decisao, identidade).then((aceita) => {
      if (aceita) return
      updateSession(sessionId, (session) => ({
        ...session,
        chats: session.chats.map((chat) => chat.id === chatId ? {
          ...chat,
          messages: chat.messages.map((message) => message.id === messageId ? {
            ...message,
            ferramentas: (message.ferramentas ?? []).map((item) => item.id === ferramentaId ? { ...item, status: 'expirado', resumo: 'A espera do comando expirou; ele não foi retomado.' } : item),
          } : message),
        } : chat),
      }))
    })
  }

  /** O dono respondeu o cartão "continuar?" (FATIA 11): continuar reabre o fio no MESMO fluxo; parar morre limpo. */
  const decidirContinuar = (sessionId: string, chatId: string, messageId: string, continuarId: string, decisao: 'continuar' | 'parar'): void => {
    const sessao = sessions.find((item) => item.id === sessionId)
    const mensagem = sessao?.chats.find((item) => item.id === chatId)?.messages.find((item) => item.id === messageId)
    const pausa = mensagem?.continuar?.find((item) => item.id === continuarId)
    if (!sessao || !mensagem || !pausa || pausa.status !== 'aguardando') return
    const marcar = (status: ContinuarNoChat['status']): void => {
      mexerContinuar(sessionId, chatId, messageId, (cartoes) => cartoes.map((uma) => uma.id === pausa.id ? { ...uma, status } : uma))
    }
    if (decisao === 'parar') {
      marcar('parado')
      return
    }
    marcar('continuado')
    // Reabre a corrida na MESMA bolha: o texto continua de onde parou.
    const runKey = `${sessionId}:${chatId}`
    agirAtivas.current.get(runKey)?.abortar()
    updateSession(sessionId, (session) => {
      const next = updateSessionAndChatStatus(session, chatId, 'working')
      return {
        ...next,
        chats: next.chats.map((chat) => chat.id === chatId ? {
          ...chat,
          messages: chat.messages.map((uma) => uma.id === messageId ? { ...uma, running: true } : uma),
        } : chat),
      }
    })
    const controle = continuarAgir(
      sessionId,
      chatId,
      `${sessionId}:${chatId}:${messageId}`,
      criarOuvintesAgir(sessionId, chatId, messageId, mensagem.content, () => marcar('expirado')),
    )
    agirAtivas.current.set(runKey, controle)
  }

  const handleSend = (text: string, attachments: Attachment[], target?: { sessionId: string; chatId: string }, modelSelection: SelecaoModelo = { tipo: 'auto' }) => {
    const sessionId = target?.sessionId ?? activeSession.id
    const chatId = target?.chatId ?? activeChatId
    const attachmentText = attachments.length > 0 ? `Arquivos anexados: ${attachments.map((item) => item.name).join(', ')}` : ''
    const messageContent = [text.trim(), attachmentText].filter(Boolean).join('\n\n')
    const requestLabel = text.trim() || attachments.map((item) => item.name).join(', ')
    const responseId = `response-${Date.now()}`
    const requestedModel = modelSelection.tipo === 'auto' ? 'Auto' : `${modelSelection.providerId} / ${modelSelection.modelId}`
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
      model: requestedModel,
      running: true,
      inicioEm: Date.now(),
    }
    // Histórico da conversa atual (G5) + a mensagem nova — o que SAI para o servidor.
    const sessaoOrigem = sessions.find((session) => session.id === sessionId)
    const chatOrigem = sessaoOrigem?.chats.find((chat) => chat.id === chatId)
    const historico: MensagemSimples[] = [
      ...montarHistorico(chatOrigem?.messages ?? []),
      { role: 'user', content: messageContent },
    ]

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

    // (FATIA 10) AGIR real com o provedor ativo: o histórico vai para o
    // servidor, a resposta chega em pedaços e as ferramentas viram cartões
    // com aprovação do dono (SPEC PARTE 2D).
    iniciarAgirReal(sessionId, chatId, responseId, historico, undefined, modelSelection, text.trim())
  }

  const handleStop = async () => {
    const sessionId = activeSession.id
    const ativos = [...agirAtivas.current.entries()].filter(([key]) => key.startsWith(`${sessionId}:`))
    if (ativos.length === 0) return
    const respostas = await Promise.all(ativos.map(async ([key, controle]) => ({
      key,
      estado: await controle.abortar(),
    })))
    const chatsCancelados = new Set(respostas.filter((item) => item.estado === 'cancelled' || item.estado === 'cancelled_with_effects').map((item) => item.key.slice(sessionId.length + 1)))
    const chatsComEfeitosConfirmados = new Set(respostas.filter((item) => item.estado === 'cancelled_with_effects').map((item) => item.key.slice(sessionId.length + 1)))
    const aguardandoAck = respostas.some((item) => item.estado === 'pending')
    for (const item of respostas) {
      if (item.estado === 'cancelled' || item.estado === 'cancelled_with_effects') agirAtivas.current.delete(item.key)
    }
    if (chatsCancelados.size > 0) {
      updateSession(sessionId, (session) => {
        let next = session
        for (const chatId of chatsCancelados) {
          if (next.chats.some((chat) => chat.id === chatId)) next = updateSessionAndChatStatus(next, chatId, 'completed')
        }
        return {
          ...next,
          chats: next.chats.map((chat) => {
            if (!chatsCancelados.has(chat.id)) return chat
            return {
              ...chat,
              status: 'completed',
              messages: chat.messages.map((message) => message.running ? {
                ...message,
                content: chatsComEfeitosConfirmados.has(chat.id)
                  ? `${message.content.trim() ? `${message.content.trim()}\n\n` : ''}Execução interrompida; alterações já concluídas foram mantidas. Confira os cartões das ferramentas.`
                  : message.content.trim()
                    ? message.content
                    : 'Execução interrompida antes da resposta. Envie uma nova mensagem para continuar.',
                running: false,
                cancelled: true,
                time: timeLabel(),
                ferramentas: message.ferramentas?.map((carta) =>
                  carta.status === 'aguardando' || carta.status === 'executando'
                    ? { ...carta, status: 'expirado' as const, resumo: 'A execução foi cancelada; este cartão não pode mais executar.' }
                    : carta,
                ),
              } : message),
            }
          }),
        }
      })
    }
    if (aguardandoAck) {
      notify('Parada solicitada; confirmação pendente. A execução continua ativa até o servidor confirmar.')
      return
    }
    clearPendingTimersForSession(sessionId)
    if (chatsComEfeitosConfirmados.size > 0) notify('Execução interrompida; alterações já concluídas foram mantidas')
    else if (chatsCancelados.size > 0) notify('Execução interrompida')
  }

  const handleRegenerate = (chatId: string, messageId: string) => {
    const sessionId = activeSession.id
    const targetChat = activeSession.chats.find((chat) => chat.id === chatId)
    const original = targetChat?.messages.find((message) => message.id === messageId)
    if (!original || original.role !== 'assistant') return

    // FATIA 09: regenerar = conversa real com o histórico ANTES da mensagem alvo.
    const chatOrigemRegenerar = activeSession.chats.find((candidate) => candidate.id === chatId)
    const indiceAlvo = chatOrigemRegenerar
      ? chatOrigemRegenerar.messages.findIndex((candidate) => candidate.id === messageId)
      : -1
    const historicoRegenerar = montarHistorico(
      indiceAlvo >= 0 ? (chatOrigemRegenerar?.messages ?? []).slice(0, indiceAlvo) : [],
    )
    if (historicoRegenerar.length === 0) {
      notify('Não há histórico anterior para regenerar')
      return
    }
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

    iniciarAgirReal(sessionId, chatId, messageId, historicoRegenerar, () => notify('Resposta regenerada'))
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
    const permissionKey = `${sessionChatKey}:${session.worktreePath ?? session.workspacePath}`
    return (
      <ChatPanel
        session={session}
        activeChatId={sessionChatId}
        model={modelByChat[sessionChatKey] ?? selectedModel}
        mode={modeByChat[sessionChatKey] ?? selectedMode}
        permission={permissionByChat[permissionKey] ?? 'manual'}
        automaticDeletes={automaticDeletesByChat[permissionKey] === true && permissionByChat[permissionKey] === 'allow-all'}
        onChangeAutomaticDeletes={async (permitir) => {
          await selecionarPermissaoAgir(session.id, sessionChatId, permissionByChat[permissionKey] ?? 'manual', permitir)
          setAutomaticDeletesByChat(current => ({ ...current, [permissionKey]: permitir }))
        }}
        onSelectChat={(chatId) => { setActiveChatBySession((current) => ({ ...current, [session.id]: chatId })); markNestedChatRead(session.id, chatId) }}
        onChangeModel={(nextModel) => setModelByChat((current) => ({ ...current, [sessionChatKey]: nextModel }))}
        onChangeMode={(nextMode) => {
          if (ehModoAgir(nextMode)) setModeByChat((current) => ({ ...current, [sessionChatKey]: nextMode }))
        }}
        onChangePermission={async (nextPermission) => {
          await selecionarPermissaoAgir(session.id, sessionChatId, nextPermission)
          setPermissionByChat((current) => ({ ...current, [permissionKey]: nextPermission }))
          if (nextPermission === 'manual') setAutomaticDeletesByChat(current => ({ ...current, [permissionKey]: false }))
        }}
        onSend={(text, attachments, modelSelection) => handleSend(text, attachments, undefined, modelSelection)}
        onStop={handleStop}
        onApprove={(chatId) => handleApprove(session.id, chatId)}
        onDecidirFerramenta={(chatId, messageId, ferramentaId, decisao) => decidirFerramenta(session.id, chatId, messageId, ferramentaId, decisao)}
        onDecidirAguardarComando={(chatId, messageId, ferramentaId, decisao) => decidirAguardarComando(session.id, chatId, messageId, ferramentaId, decisao)}
        onDecidirContinuar={(chatId, messageId, continuarId, decisao) => decidirContinuar(session.id, chatId, messageId, continuarId, decisao)}
        autoScroll={autoScrollChat}
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
      />
    )
  }

  const renderChat = () => (
    landingVisible ? (
      // + GLOBAL abre sempre o landing. Na 06.2 a origem Git é o repositório
      // servido pelo Vite; outros repositórios entram na 06.3.
      <SessionLanding workspace={selectedWorkspace?.path ?? 'workspace-local'} onSubmit={(text) => void handleLandingSubmit(text)} onPickWorkspace={() => void handlePickWorkspace()} workspacePickerPending={workspacePickerPending} isFileSystemSupported={workspaceNativePickerAvailable}
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
      onNewDiff={() => openDiff(activeSession.id)}
      onNewCustomizations={openCustomizations}
      customizationsSurface={customizationsSurface}
      providersSurface={<ProvidersView />}
      configSurface={<ConfigView aoSalvar={(config) => setAutoScrollChat(config.autoScroll)} />}
      frontierTabs={abasProjetadasDoModulo}
      codeEditorSlot={codeEditorSlot}
      changesSlot={changesSlot}
      codeEditorUnavailable={codeEditorUnavailable}
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
      onOpenToSide={handleOpenToSide}
      editorContentVisible={editorContentVisible}
      sidePaneState={sidePaneState}
      onToggleEditorHidden={handleToggleEditorHidden}
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
        terminalVisible={terminalVisible}
        approved={approved}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onToggleSidebar={handleToggleSidebar}
        onToggleTerminal={() => setTerminalVisible((current) => !current)}
        onOpenSearch={openSearch}
        onOpenBrowser={openBrowser}
        onOpenDiff={() => openDiff(activeSession.id)}
        onNewSession={handleNewSession}
        onShowSessions={showSessionPicker}
        workspacePath={landingVisible ? (selectedWorkspace?.path ?? activeSession.workspacePath) : (activeSession.worktreePath ?? activeSession.workspacePath)}
        workspaceChangePending={workspaceChangePending || workspacePickerPending}
        onChangeWorkspace={handleChangeActiveWorkspace}
        onBrowseWorkspace={() => void handleBrowseActiveWorkspace()}
        onAccountAction={(action) => action === 'open-providers' ? openProviders() : action === 'open-config' ? openConfig() : notify(action)}
      />
      <SessionPersistenceNotice issues={persistence.issues} recovering={persistence.recovering} onRecover={persistence.recover} />
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
        <div className="main-region" data-activity-bar-position={layout.state.activityBarPosition}>
          <div className="right-section">
            {/* FATIA 15 Onda 3 (D163): `editor-maximized` da COLUNA saiu. As regras CSS que a
                davam efeito saíram na D158, então a classe era inerte; o `data-editor-maximized`
                existia só para alimentá-la. O maximizar do centro é outro
                (`.desktop-surface-group.editor-maximized`, mais abaixo) e continua vivo. */}
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
                    null /* 5.8-c1: o painel "Detalhes" mobile saiu junto com a coluna (RF-P-05) */
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
              {/* FATIA 15 Onda 2c-ii (D151 §2, D155): a COLUNA foi DESLIGADA. O Editor Anexo
                  não monta mais aqui — quem hospeda as abas do módulo (arquivo e diff) é o
                  contêiner central, e a abertura de arquivo chega lá pela derivação
                  `sessionIdDaSuperficie` (D152 §1). A remoção da casca vem no C3, depois de
                  esta versão passar pelos gates. */}
              {null}
            </div>
            {/* FATIA-05 5.5 (docs/25 O14): Views Panel = `.part.panel` NOVO acima do terminal, dentro de .right-section.
                Recebe views arrastadas da Side Bar; `display: none` sem views. O terminal abaixo não é tocado. */}
            {!isSinglePane && !customViewActive && (
              <ViewsPanel
                views={panelViews}
                activeViewId={layout.state.panelActiveView}
                onSelect={layout.selectPanelView}
                onDropView={(id, index) => layout.moveView(id, 'panel', index)}
                renderView={renderShellView}
              />
            )}
            {/* D60 / DEBT-06: o contexto de workspace só reinicia a criação de PTYs;
                a chave da sessão permanece estável para não desmontar os shells já abertos.
                Em uma landing sem sessões, o workspace pendente também inicia novos PTYs. */}
            <TerminalPanel
              key={activeSession.id}
              visible={terminalVisible && !customViewActive}
              sessionId={activeSession.id}
              sessionLabel={activeSessionLabel}
              workspace={!hasSessions && selectedWorkspace?.path ? selectedWorkspace.path : (activeSession.worktreePath ?? activeSession.workspacePath)}
              onClose={() => setTerminalVisible(false)}
            />
          </div>
          {/* FATIA-05 5.1 (docs/24 D1): chassi à DIREITA, depois de .right-section — [centro][AttachArea][Side Bar][Activity Bar]. Desktop only.
              5.4 (RF-10): `activityBarPosition` = left reordena por CSS `order` (activityBar.css) — o DOM não muda. */}
          {!isSinglePane && !customViewActive && (
            <>
              <SideBar
                side={layout.state.activityBarPosition}
                views={rightViews}
                activeViewId={layout.state.activeView}
                visible={layout.state.sideBarVisible}
                width={layout.state.sideBarWidth}
                onWidthChange={layout.setSideBarWidth}
                onResetWidth={layout.resetSideBarWidth}
                onClose={() => layout.setSideBarVisible(false)}
                onToggle={layout.toggleSideBar}
                renderView={renderShellView}
                onDropView={(id, index) => layout.moveView(id, 'sideBar', index)}
              />
              <ActivityBar
                side={layout.state.activityBarPosition}
                views={rightViews}
                activeViewId={layout.state.activeView}
                sideBarVisible={layout.state.sideBarVisible}
                onSelect={layout.selectView}
                badges={{ scm: scmBadge }}
                onContextMenu={(x, y) => { setExplorerContextMenu(null); setActivityBarMenu({ x, y, items: buildActivityBarMenuItems(layout.state.activityBarPosition) }) }}
                onDropView={(id, index) => layout.moveView(id, 'sideBar', index)}
              />
            </>
          )}
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
      {activityBarMenu && (
        <ExplorerContextMenuHost
          state={activityBarMenu}
          onClose={() => setActivityBarMenu(null)}
          onExecute={(id) => { const p = activityBarPositionFromMenuId(id); if (p) layout.setActivityBarPosition(p) }}
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

