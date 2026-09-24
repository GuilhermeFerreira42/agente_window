// ============================================================================
// modules/explorer-search/core/constants.ts — CONSTANTES CONGELADAS (fase 4.1)
// Sem imports, sem DOM, sem fs — dados puros (04_15 §3, DoD 4.1).
// Toda linha carrega a fonte congelada (04_10 REV-LEGO ou arquivo:linha do
// upstream microsoft/vscode @ 7debcd0e — ver 04_11).
// ============================================================================

/** ID canônico da view do Explorer.
 *  Upstream: workbench/contrib/files/common/files.ts:34 (VIEW_ID). */
export const EXPLORER_VIEW_ID = 'workbench.explorer.fileView' as const;

/** Altura da linha da árvore do Explorer.
 *  Upstream: views/explorerViewer.ts:80 (ITEM_HEIGHT = 22). Q9: imutável. */
export const EXPLORER_ITEM_HEIGHT_PX = 22 as const;

// ---------------------------------------------------------------------------
// Área do anexo lateral (4.6/4.7) — métricas congeladas 04_10 §1 (IEditorAttachApi)
// ---------------------------------------------------------------------------
/** Largura do sash (arraste) do anexo — 6 px, padrão do shell (Regra 1 docs/18:
 *  espelho de --terminal-height; governado por CSS var local). */
export const ATTACH_SASH_WIDTH_PX = 6 as const;
/** CSS var local que governa a largura do anexo (mesmo padrão do terminal). */
export const ATTACH_WIDTH_CSS_VAR = '--attach-width' as const;
export const ATTACH_MIN_WIDTH_PX = 280 as const;
export const ATTACH_MAX_WIDTH_PX = 1200 as const;
export const ATTACH_MIN_WIDTH_RATIO = 0.25 as const;
export const ATTACH_MAX_WIDTH_RATIO = 0.75 as const;

// ---------------------------------------------------------------------------
// Explorer — `files.exclude` padrão (upstream files.contribution.ts, registro
// da configuração `files.exclude`: `**/.git`, `**/.svn`, `**/.hg`, `**/CVS`,
// `**/.DS_Store`, `**/Thumbs.db`). Aplicado pelo FilesFilter (explorerViewer.ts)
// em QUALQUER nível — aqui: por nome de entrada, no resolve lazy do diretório.
// ---------------------------------------------------------------------------
export const EXPLORER_DEFAULT_EXCLUDES = [
  '.git',
  '.svn',
  '.hg',
  'CVS',
  '.DS_Store',
  'Thumbs.db',
] as const;

// ---------------------------------------------------------------------------
// Search (4.6) — 04_10 §2.3
// ---------------------------------------------------------------------------
/** Debounce da busca local à sessão — "última busca vence". */
export const SEARCH_DEBOUNCE_MS = 250 as const;
/** Limites antes de marcar `truncated: true` (A6: "resultados truncados"). */
export const SEARCH_DEFAULT_MAX_RESULTS = 2000 as const;
export const SEARCH_DEFAULT_MAX_FILES = 500 as const;
/** Excludes padrão CONGELADOS (04_10 §2.3) — sempre aplicados, mesmo sem
 *  `exclude` explícito: pastas pesadas/versionadas + binários detectados. */
export const SEARCH_DEFAULT_EXCLUDES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  'coverage',
  '.venv',
  '__pycache__',
] as const;

// ---------------------------------------------------------------------------
// Watcher (4.3) — 04_10 §2.2
// ---------------------------------------------------------------------------
/** Janela de coalescência de eventos de disco por uri (espelho do
 *  EventCoalescer upstream: platform/files/common/watcher.ts:378). */
export const WATCHER_COALESCE_MS = 300 as const;

// ---------------------------------------------------------------------------
// Context keys do menu (4.5) — CONJUNTO CONGELADO 04_10 §2.4.
// Mesma semântica do ContextKeyService upstream, publicados via
// deps.menus.setContext() em cada selectionChanged/operação.
// Upstream de exemplo: views/explorerView.ts:1096 (CanCreateContext).
// ---------------------------------------------------------------------------
export const EXPLORER_CONTEXT_KEYS = [
  'explorerResourceIsFolder',
  'explorerResourceIsRoot',
  'explorerResourceParentReadOnly',
  'resourceCopied',
  'resourceCut',
  'multiSelectionActive',
  'explorerViewletFocus',
] as const;
export type ExplorerContextKey = (typeof EXPLORER_CONTEXT_KEYS)[number];
