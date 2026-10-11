import type { SearchResult } from './types'

export const customGroupLabels: Record<string, string> = {
  a11y: 'Acessibilidade',
}

// FATIA-05 5.3: `initialDiffFiles` e `buildProjectDiffFiles` (maquete "Changes N") removidos (docs/24 §4 5.3, RF-05).

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

