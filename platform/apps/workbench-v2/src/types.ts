import type { EnvelopeMensagemMultimodal } from './domain/multimodal/contrato'
import type { FerramentaEntreChats, FonteEntreChats, EscolhaEntreChats } from './domain/consultaEntreChats'
export type SessionStatus = 'untitled' | 'working' | 'needs-input' | 'completed' | 'error'
export type SessionSection = 'pinned' | 'today' | 'yesterday' | 'lastWeek' | 'older' | 'archived'
export type ChatStatus = SessionStatus
export type MessageRole = 'user' | 'assistant'
export type ChatVote = 'up' | 'down'
export type ChatCopyKind = 'message' | 'code'
// FATIA 15 (D146 §1): 'diff-arquivo' e o diff read-only de UM arquivo que so o modulo
// tem (aba fixa ATTACH_DIFF_URI, original/modified ja resolvidos). Nao pode ser o mesmo
// tipo de 'diff' porque os dois sao superficies singleton e colidiriam na reutilizacao de
// aba. Aditivo: verificado que nao ha validador de tipo em runtime e que tabIcon tem default.
export type EditorTabType = 'file' | 'browser' | 'search' | 'diff' | 'diff-arquivo' | 'customizations' | 'providers' | 'config'
export type BrowserViewport = 'desktop' | 'tablet' | 'mobile'
export type BrowserStatus = 'loading' | 'ready' | 'error'

/** Cartão de ferramenta do agente (FATIA 10) preso a uma resposta do chat. */
export interface FerramentaNoChat {
  fontesHistoricas?: FonteEntreChats[]
  escolhasHistoricas?: EscolhaEntreChats[]
  id: string
  ferramenta: 'ler' | 'listar' | 'buscar' | 'criar' | 'escrever' | 'excluir' | 'executar' | 'historico' | FerramentaEntreChats
  /** Caminho (ou padrão de busca) mostrado no cartão. */
  alvo: string
  /** Prévia do conteúdo quando o cartão pede permissão (Q3a). */
  previa?: string
  status: 'aguardando' | 'aguardando_continuacao' | 'executando' | 'ok' | 'negado' | 'erro' | 'expirado'
  /** O servidor indica se o grant de sessão é aceito por esta ferramenta/chamada. */
  allowSession?: boolean
  /** Saída recente limitada, enviada como progresso durante comando longo. */
  progresso?: string
  /** Resumo honesto do resultado (texto do servidor). */
  resumo?: string
  /** Ordem de chegada (pós-11) — a tela mostra os cartões em ordem cronológica. */
  ordem?: number
}

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
  /** Bolha de ERRO honesto (FATIA 09) — fica fora do histórico enviado ao modelo. */
  erro?: boolean
  vote?: ChatVote
  reported?: boolean
  /**
   * C-3b (R07) — envelope MM-0 com a ORDEM canônica de partes (texto e
   * artefatos). Aditivo e opcional: mensagens da C-3a continuam sem ele e a
   * apresentação cai no adapter legado. `multimodal.messageId === id`.
   */
  multimodal?: EnvelopeMensagemMultimodal
  /** Cartões de ferramenta do agente (FATIA 10) — presos a esta resposta. */
  ferramentas?: FerramentaNoChat[]
  /** Cartões "continuar?" do teto (FATIA 11) — presos a esta resposta. */
  continuar?: ContinuarNoChat[]
  /** Progresso do agente (pós-11): a iteração atual e o teto — "iteração 2 de 25". */
  iteracaoAtual?: number
  tetoAtual?: number
  /** Quando a corrida começou (pós-11) — o contador "há Xs" do dono. */
  inicioEm?: number
  /**
   * C-3a (R11/B10) — chip de artefato PRONTO que ainda não tem mensagem
   * (upload publicado, publicação da mensagem falhou). Nunca vai ao modelo e
   * não participa do histórico enviado à IA.
   */
  salvoSemMensagem?: boolean
}

export interface ContinuarNoChat {
  id: string
  status: 'aguardando' | 'continuado' | 'parado' | 'expirado'
  /** Iterações usadas quando pausou (= o teto da época). */
  iteracoes: number
  /** Orçamento cheio que o Continuar concede. */
  teto: number
  /** Ordem de chegada (pós-11) — a tela mostra os cartões em ordem cronológica. */
  ordem?: number
  /** Título próprio (pós-11) — o cartão de "continuar após erro" não é teto. */
  titulo?: string
  /** Texto próprio (pós-11) — ausente = o texto padrão do teto. */
  motivo?: string
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
  /**
   * C-3a (R11/B10) — chip de artefato PRONTO que ainda não tem mensagem
   * (upload publicado, publicação da mensagem falhou). Nunca vai ao modelo e
   * não participa do histórico enviado à IA.
   */
  salvoSemMensagem?: boolean
}

export interface NestedChat {
  revisaoOperacional?: boolean
  id: string
  title: string
  status: ChatStatus
  unread?: boolean
  approval?: string
  messages: ChatMessage[]
}

/** C-1 (SPEC C §3) — modalidade EXPLÍCITA da sessão. `chat` não tem raiz;
   * `workspace` carrega a pasta original canônica. Catálogo SQLite é autoridade. */
export type ContextoSessao = { tipo: 'chat' } | { tipo: 'workspace'; path?: string }

export interface Session {
  id: string
  title: string
  workspace: string
  /** C-1 — raiz REAL da conversa; `null` somente em modalidade `chat`
   * (nunca `''`, repoRoot, cwd ou outro fallback). Legados preservam a pasta. */
  workspacePath: string | null
  /** Modalidade explícita; ausente em snapshots legados — o catálogo materializa na leitura. */
  contexto?: ContextoSessao
  /** Stable filesystem-safe project key used by SQLite and JSONL storage. */
  slug?: string
  /** Optional isolated directory; null/absent means direct workspace mode. */
  worktreePath?: string | null
  section: SessionSection
  status: SessionStatus
  updated: string
  diffAdded: number
  diffRemoved: number
  branch: string | null
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
  /** Monotonic write token used to reject late/stale session snapshots. */
  persistenceRevision?: number
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
  /** (BLOCO 4.4-fix BUG-P1) binário aberto do Explorer — renderiza Image Preview
   *  de verdade (data URL), nunca via Monaco. Aditivo ao contrato do tab. */
  imagePreview?: { dataBase64: string; mime: string }
  /** (4.4-fix, validação manual) Falha de leitura do disco/da handle — exibida
   *  como error editor EXPLÍCITO na aba (padrão VS Code `createEditorOpenError`),
   *  nunca conteúdo sintético/mock silencioso. */
  readError?: string
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
  /** C-3a: artefato publicado no ledger do dono (sessão/chat atuais). */
  artifactId?: string
  /** C-3a: identificador estável LOCAL da transferência (R11 — retry reutiliza). */
  uploadId?: string
  /** C-3a: modalidade MM-0 do artefato (aditiva, sem bytes/locator). */
  modalidade?: 'texto' | 'imagem' | 'audio' | 'video' | 'arquivo'
  bytes?: number
  sha256?: string
  /**
   * C-3a: estado real exibido no chip (F5/offline). `legado` = metadado
   * antigo sem artefato publicado; `referencia` = projeto apontado.
   */
  estado?: 'selecionado' | 'transferindo' | 'pronto' | 'falhou' | 'referencia' | 'legado'
  /** C-3a: modo do artefato — cópia privada ou referência de projeto. */
  mode?: 'copy' | 'reference'
  /** C-3a: escolha EXPLÍCITA de cópia na pasta do projeto (R03; default privado). */
  modoCopia?: 'privado' | 'projeto'
  /** C-3a: destino de envio ao modelo registrado na publicação (R10). */
  envioModelo?: 'excluido-sem-codec'
  /** C-3a: referência de projeto como caminho relativo ao workspace. */
  referencia?: string
  /** C-3a: marcador de item publicado sem artefato da C-3a. */
  legado?: boolean
}

