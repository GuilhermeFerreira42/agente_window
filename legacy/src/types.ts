export type SessionStatus = 'untitled' | 'working' | 'needs-input' | 'completed' | 'error'
export type SessionSection = 'pinned' | 'today' | 'yesterday' | 'lastWeek' | 'older' | 'archived'
export type ChatStatus = SessionStatus
export type MessageRole = 'user' | 'assistant'
export type ChatVote = 'up' | 'down'
export type ChatCopyKind = 'message' | 'code'
export type EditorTabType = 'file' | 'browser' | 'search' | 'diff' | 'customizations'
export type BrowserViewport = 'desktop' | 'tablet' | 'mobile'
export type BrowserStatus = 'loading' | 'ready' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  time: string
  model?: string
  mode?: string
  attachments?: Attachment[]
  running?: boolean
  cancelled?: boolean
  vote?: ChatVote
  reported?: boolean
}

export interface ComposerDraft {
  text: string
  attachments: Attachment[]
}

export interface ComposerHistoryEntry {
  text: string
  attachments: Attachment[]
  model: string
  mode: string
}

export interface NestedChat {
  id: string
  title: string
  status: ChatStatus
  unread?: boolean
  approval?: string
  messages: ChatMessage[]
}

export interface Session {
  id: string
  title: string
  workspace: string
  workspacePath: string
  section: SessionSection
  status: SessionStatus
  updated: string
  diffAdded: number
  diffRemoved: number
  branch: string
  pinned?: boolean
  unread?: boolean
  archived?: boolean
  ciFailure?: boolean
  approval?: string
  chats: NestedChat[]
  mainChatId: string
  /** Provider-neutral kind flags (SESSIONS_LIST.md §Placement precedence). */
  isQuickChat?: boolean
  /** Automation runs are excluded from the primary Sessions list. */
  automation?: boolean
  /** Custom-group membership id, when the user assigned one. */
  customGroup?: string
  /** Provider identity, for composite filtering. Defaults to 'local'. */
  provider?: string
  /**
   * Draft não-commitado (SESSIONS.md §Drafts / §New session): uma nova sessão
   * é um rascunho até o primeiro envio; ao enviar entra no catálogo commitado.
   * Abandonar um draft o descarta.
   */
  isDraft?: boolean
  /** Monotonic creation/update sort keys (list-owned, not provider timestamps). */
  createdSeq?: number
  updatedSeq?: number
}

export interface BrowserViewState {
  id: string
  sessionId: string
  title: string
  url: string
  history: string[]
  historyIndex: number
  status: BrowserStatus
  viewport: BrowserViewport
  reloadToken: number
}

export interface EditorTab {
  id: string
  type: EditorTabType
  title: string
  sessionId?: string
  path?: string
  browserId?: string
  content?: string
  isRealFile?: boolean
}

export type DiffResolution = 'accepted' | 'reverted'

export interface DiffFile {
  id: string
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed'
  added: number
  removed: number
  original: string
  modified: string
  viewed?: boolean
  /** Compatibility flag retained for the existing mock contract. */
  accepted?: boolean
  /** Explicit in-memory outcome of an accept/revert action. */
  resolution?: DiffResolution
}

export interface SearchResult {
  path: string
  line: number
  content: string
  match: string
}

export interface Attachment {
  id: string
  name: string
  kind: 'workspace' | 'local'
}

