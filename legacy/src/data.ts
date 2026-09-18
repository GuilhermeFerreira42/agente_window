import type { DiffFile, SearchResult, Session } from './types'

const setupMessages = [
  {
    id: 's1-m1',
    role: 'user' as const,
    content: 'Replicar a Janela de Agentes com uma composição contínua, sem menu bar e com o navegador aberto na área do editor.',
    time: '09:14',
  },
  {
    id: 's1-m2',
    role: 'assistant' as const,
    content: 'Entendido. Vou manter a sessão e o editor como superfícies independentes, com a lista de chats aninhada no painel de sessões.\n\n```ts\nconst editorSurface = { browser: true, diff: true, search: true }\n```',
    time: '09:15',
    model: 'Claude Sonnet 4',
  },
  {
    id: 's1-m3',
    role: 'user' as const,
    content: 'Use o tema Dark+ e preserve o shimmer de execução e a borda cônica do input.',
    time: '09:18',
  },
  {
    id: 's1-m4',
    role: 'assistant' as const,
    content: 'A composição visual está pronta para revisão. A borda de progresso usa um `conic-gradient` animado; o restante do workbench lê somente os tokens centralizados do tema.',
    time: '09:19',
    model: 'Claude Sonnet 4',
  },
]

const waitingMessages = [
  {
    id: 's2-m1',
    role: 'user' as const,
    content: 'Analise as alterações pendentes e prepare uma revisão multi-diff por arquivo.',
    time: '08:42',
  },
  {
    id: 's2-m2',
    role: 'assistant' as const,
    content: 'Encontrei 7 arquivos modificados: 284 linhas adicionadas e 36 removidas. Antes de executar o comando de verificação, preciso da sua aprovação.',
    time: '08:43',
    model: 'GPT-5',
  },
]

const layoutMessages = [
  {
    id: 's3-m1',
    role: 'user' as const,
    content: 'Abaixo de 900px, mostre uma única superfície por vez com abas docked.',
    time: 'Ontem',
  },
  {
    id: 's3-m2',
    role: 'assistant' as const,
    content: 'O controlador single-pane alterna entre Chat, Editor e Detalhes sem criar um segundo estado de sessão.',
    time: 'Ontem',
    model: 'GPT-5 mini',
  },
]

const errorMessages = [
  {
    id: 's4-m1',
    role: 'user' as const,
    content: 'Corrija os tipos do navegador e rode a checagem de integração.',
    time: 'Seg',
  },
  {
    id: 's4-m2',
    role: 'assistant' as const,
    content: 'A revisão encontrou uma falha no check de acessibilidade do navegador. Abra o painel Fix CI para continuar.',
    time: 'Seg',
    model: 'Claude Sonnet 4',
  },
]

const quickMessages = [
  {
    id: 's5-m1',
    role: 'user' as const,
    content: 'Como o terminal é associado ao workspace da sessão?',
    time: 'Sex',
  },
  {
    id: 's5-m2',
    role: 'assistant' as const,
    content: 'O terminal acompanha o diretório de trabalho da sessão e é reutilizado quando o workbench volta a ficar ativo.',
    time: 'Sex',
    model: 'GPT-5 mini',
  },
]

const archivedMessages = [
  {
    id: 's6-m1',
    role: 'user' as const,
    content: 'Arquive esta sessão quando a migração terminar.',
    time: '12 ago',
  },
  {
    id: 's6-m2',
    role: 'assistant' as const,
    content: 'Sessão arquivada. O histórico permanece disponível para consulta.',
    time: '12 ago',
    model: 'GPT-5 mini',
  },
]

const chat = (id: string, title: string, status: Session['status'], messages: Session['chats'][number]['messages'], extra: Partial<Session['chats'][number]> = {}) => ({
  id,
  title,
  status,
  messages,
  ...extra,
})

export const initialSessions: Session[] = [
  {
    id: 's1',
    title: 'Replicar a Janela de Agentes',
    workspace: 'vscode-main',
    workspacePath: '~/dev/vscode-main',
    section: 'today',
    createdSeq: 70,
    updatedSeq: 70,
    provider: 'copilot',
    status: 'working',
    updated: 'agora',
    diffAdded: 247,
    diffRemoved: 18,
    branch: 'agents-window',
    chats: [
      chat('s1-main', 'Implementação principal', 'working', setupMessages),
      chat('s1-ui', 'Ajustes de UI', 'completed', [
        { id: 's1-ui-1', role: 'assistant', content: 'Ajustei os tokens de spacing e as guias de árvore.', time: '09:11', model: 'GPT-5 mini' },
      ]),
      chat('s1-browser', 'Browser por sessão', 'completed', [
        { id: 's1-browser-1', role: 'assistant', content: 'Histórico e ciclo de vida do browser agora são escopados à sessão.', time: '09:08', model: 'Claude Sonnet 4' },
      ]),
    ],
    mainChatId: 's1-main',
  },
  {
    id: 's2',
    title: 'Revisar alterações do workbench',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'today',
    createdSeq: 60,
    updatedSeq: 68,
    provider: 'copilot',
    status: 'needs-input',
    updated: '8 min',
    diffAdded: 284,
    diffRemoved: 36,
    branch: 'review/session-changes',
    unread: true,
    approval: 'Executar git status e validar os checks da sessão',
    chats: [
      chat('s2-main', 'Revisão de alterações', 'needs-input', waitingMessages, { approval: 'Permitir execução de git status?' }),
      chat('s2-ci', 'Checks de CI', 'needs-input', [
        { id: 's2-ci-1', role: 'assistant', content: 'O check de acessibilidade está aguardando uma ação.', time: '08:44', model: 'GPT-5' },
      ], { approval: 'Executar a suíte de checks?' }),
    ],
    mainChatId: 's2-main',
  },
  {
    id: 's3',
    title: 'Ajustar layout single-pane',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'today',
    createdSeq: 50,
    updatedSeq: 52,
    provider: 'local',
    status: 'completed',
    updated: '32 min',
    diffAdded: 96,
    diffRemoved: 12,
    branch: 'single-pane',
    chats: [
      chat('s3-main', 'Estratégia de layout', 'completed', layoutMessages),
      chat('s3-tests', 'Cenários de transição', 'completed', [
        { id: 's3-tests-1', role: 'assistant', content: 'Cobri as transições de Browser para Changes e Files.', time: 'Ontem', model: 'GPT-5 mini' },
      ]),
    ],
    mainChatId: 's3-main',
  },
  {
    id: 's4',
    title: 'Corrigir tipos do navegador',
    workspace: 'vscode-main',
    workspacePath: '~/dev/vscode-main',
    section: 'yesterday',
    createdSeq: 40,
    updatedSeq: 45,
    provider: 'codex',
    status: 'error',
    updated: 'Ontem',
    diffAdded: 41,
    diffRemoved: 9,
    branch: 'browser-lifecycle',
    unread: true,
    ciFailure: true,
    chats: [
      chat('s4-main', 'Lifecycle do Browser', 'error', errorMessages),
    ],
    mainChatId: 's4-main',
  },
  {
    id: 's5',
    title: 'Revisar comandos do terminal',
    workspace: 'vscode-main',
    workspacePath: '~/dev/vscode-main',
    section: 'older',
    createdSeq: 30,
    updatedSeq: 55,
    provider: 'local',
    status: 'completed',
    updated: 'Sex',
    diffAdded: 18,
    diffRemoved: 4,
    branch: 'terminal-session',
    pinned: true,
    chats: [
      chat('s5-main', 'Terminal por workspace', 'completed', quickMessages),
    ],
    mainChatId: 's5-main',
  },
  {
    id: 's7',
    title: 'Ajustar densidade da lista',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'lastWeek',
    createdSeq: 20,
    updatedSeq: 25,
    provider: 'local',
    status: 'completed',
    updated: '3 dias',
    diffAdded: 12,
    diffRemoved: 5,
    branch: 'list-density',
    chats: [
      chat('s7-main', 'Densidade e espaçamento', 'completed', quickMessages),
    ],
    mainChatId: 's7-main',
  },
  {
    id: 's6',
    title: 'Migração da barra auxiliar',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'archived',
    createdSeq: 10,
    updatedSeq: 15,
    provider: 'copilot',
    status: 'completed',
    updated: '12 ago',
    diffAdded: 72,
    diffRemoved: 31,
    branch: 'archive/aux-bar',
    archived: true,
    chats: [
      chat('s6-main', 'Detalhes e arquivos', 'completed', archivedMessages),
    ],
    mainChatId: 's6-main',
  },
  {
    id: 'sq1',
    title: 'Pergunta rápida sobre tokens',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'today',
    status: 'completed',
    updated: '5 min',
    diffAdded: 0,
    diffRemoved: 0,
    branch: 'quick-chat',
    isQuickChat: true,
    createdSeq: 65,
    updatedSeq: 66,
    provider: 'copilot',
    chats: [
      chat('sq1-main', 'Quick chat', 'completed', quickMessages),
    ],
    mainChatId: 'sq1-main',
  },
  {
    id: 'sg1',
    title: 'Épico: acessibilidade da lista',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'today',
    status: 'needs-input',
    updated: '20 min',
    diffAdded: 22,
    diffRemoved: 4,
    branch: 'a11y/list',
    customGroup: 'a11y',
    createdSeq: 55,
    updatedSeq: 63,
    provider: 'local',
    chats: [
      chat('sg1-main', 'Rótulos e roles', 'needs-input', quickMessages),
    ],
    mainChatId: 'sg1-main',
  },
  {
    id: 'sauto1',
    title: 'Automação: revisão noturna',
    workspace: 'sessions',
    workspacePath: '~/dev/sessions',
    section: 'today',
    status: 'working',
    updated: '1 h',
    diffAdded: 8,
    diffRemoved: 2,
    branch: 'cron/nightly',
    automation: true,
    createdSeq: 5,
    updatedSeq: 8,
    provider: 'codex',
    chats: [
      chat('sauto1-main', 'Execução agendada', 'working', quickMessages),
    ],
    mainChatId: 'sauto1-main',
  },
]

/** Rótulos legíveis dos grupos personalizados (custom groups) da lista. */
export const customGroupLabels: Record<string, string> = {
  a11y: 'Acessibilidade',
}

export const initialDiffFiles: DiffFile[] = [
  {
    id: 'diff-1',
    path: 'src/browser/parts/titlebarPart.ts',
    status: 'modified',
    added: 54,
    removed: 12,
    original: `export class TitlebarPart {\n  readonly hasMenubar = true;\n\n  render() {\n    return this.createMenuBar();\n  }\n}`,
    modified: `export class TitlebarPart {\n  readonly hasMenubar = false;\n\n  render() {\n    return this.createCommandCenter();\n  }\n}`,
  },
  {
    id: 'diff-2',
    path: 'src/contrib/sessions/browser/media/sessionsList.css',
    status: 'modified',
    added: 28,
    removed: 6,
    original: `.session-title {\n  font-size: 14px;\n  color: var(--vscode-foreground);\n}`,
    modified: `.session-title {\n  font-size: var(--vscode-fontSize-body1);\n  color: var(--vscode-strongForeground);\n}`,
  },
  {
    id: 'diff-3',
    path: 'src/contrib/browserView/browser/sessionBrowserView.ts',
    status: 'added',
    added: 66,
    removed: 0,
    original: '',
    modified: `export interface BrowserOwner {\n  sessionId: string;\n  history: string[];\n}\n\nexport const browserViews = new Map<string, BrowserOwner>();`,
  },
  {
    id: 'diff-4',
    path: 'src/contrib/changes/browser/changesView.ts',
    status: 'deleted',
    added: 0,
    removed: 36,
    original: `export function openChangesEditor() {\n  return openMultiDiff();\n}`,
    modified: '',
  },
]

// (R-060/R-063) Changeset produzido ao enviar "build the project" no chat —
// espelha os cenários e2e 02-chat-with-changes / 05-full-workflow: package.json,
// build.ts e index.ts aparecem na changes view; index.ts abre no diff editor.
export const buildProjectDiffFiles: DiffFile[] = [
  {
    id: 'build-package-json',
    path: 'package.json',
    status: 'modified',
    added: 3,
    removed: 1,
    original: `{\n  "name": "agents-window",\n  "scripts": {\n    "start": "vite"\n  }\n}`,
    modified: `{\n  "name": "agents-window",\n  "scripts": {\n    "start": "vite",\n    "build": "tsc -b && node build.ts"\n  }\n}`,
  },
  {
    id: 'build-ts',
    path: 'build.ts',
    status: 'added',
    added: 18,
    removed: 0,
    original: '',
    modified: `import { build } from 'vite'\n\nasync function main() {\n  await build()\n  console.log('build complete')\n}\n\nmain()`,
  },
  {
    id: 'build-index-ts',
    path: 'src/index.ts',
    status: 'modified',
    added: 6,
    removed: 2,
    original: `export function main() {\n  console.log('hello')\n}`,
    modified: `import { bootstrap } from './bootstrap'\n\nexport function main() {\n  bootstrap()\n  console.log('agents window ready')\n}`,
  },
]

export const searchResults: SearchResult[] = [
  { path: 'src/browser/parts/titlebarPart.ts', line: 44, content: 'No menubar, no editor actions, no layout controls.', match: 'No menubar' },
  { path: 'src/contrib/sessions/browser/media/sessionsTitleBarWidget.css', line: 24, content: 'height: 22px;', match: '22px' },
  { path: 'src/contrib/sessions/browser/media/sessionsTitleBarWidget.css', line: 25, content: 'border: 1px solid var(--vscode-commandCenter-border);', match: 'commandCenter-border' },
  { path: 'src/workbench/contrib/chat/browser/widget/media/chat.css', line: 1215, content: 'background: conic-gradient(from var(--chat-input-anim-angle),', match: 'conic-gradient' },
  { path: 'src/contrib/layout/browser/singlePane/singlePaneLayoutStrategy.ts', line: 18, content: 'Base class for a single-pane layout behaviour.', match: 'single-pane' },
  { path: 'src/contrib/browserView/browser/sessionBrowserView.ts', line: 58, content: 'Restrict the window contextual browser views to those owned by the active session.', match: 'active session' },
]

export const workspaceFiles = [
  'src/browser/parts/titlebarPart.ts',
  'src/browser/parts/media/titlebarpart.css',
  'src/contrib/sessions/browser/views/sessionsList.ts',
  'src/contrib/sessions/browser/media/sessionsList.css',
  'src/contrib/changes/browser/changesView.ts',
  'src/contrib/browserView/browser/sessionBrowserView.ts',
  'src/workbench/contrib/chat/browser/widget/media/chat.css',
  'src/contrib/layout/browser/singlePane/singlePaneLayoutStrategy.ts',
]

// Providers registrados no ISessionsProvidersService (SESSIONS.md). Ordem estável
// espelha a precedência do original: Copilot Chat, Agent Host, Remote Agent Host.
export const initialProviders = [
  { id: 'copilot', label: 'Copilot Chat', order: 0, sessionTypes: ['chat', 'quick-chat'] },
  { id: 'codex', label: 'Agent Host', order: 1, sessionTypes: ['chat', 'automation'] },
  { id: 'local', label: 'Local Agent Host', order: 2, sessionTypes: ['chat'] },
]

