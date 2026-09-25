// ============================================================================
// modules/explorer-search/ui/ExplorerView.tsx — Explorer (4.4).
// ESTRUTURA: transcrita do DOM real do VS Code (HTML SingleFile do vscode.dev,
// `.composite.viewlet.explorer-viewlet`): pane-view → split-view → panes
// (pane-header 22px + pane-body); árvore monaco-list/monaco-tl-row; seções
// Open Editors / Outline / Timeline.
// LÓGICA: toda no core (ExplorerService, menus/explorerMenus, dndPolicy,
// transfer/*). Esta view só traduz eventos DOM em chamadas ao serviço e
// re-renderiza a cada evento dele.
// Regra: nada é importado de ui/_prev (implementação anterior, só referência).
// ============================================================================

import React from 'react';
import type { ExplorerService } from '../core/explorerService';
import { ExplorerCreateConflictError, ExplorerRenameConflictError } from '../core/explorerService';
import type { ExplorerItem } from '../core/explorerModel';
import type { CommandRegistryLike, FileSystemPortLike, WorkspaceUri, ExplorerSearchEvent } from '../contract';
import { uriBasename, uriDirname, uriJoinPath, uriPath, uriRelative } from '../core/uri';
import { decideDragOver, planDrop, resolveDropTarget } from '../core/dndPolicy';
import type { DndData } from '../core/dndPolicy';
import { collectDroppedFiles, uploadFiles, resetUploadDirCache } from '../core/transfer/upload';
import type { UploadFileRecord } from '../core/transfer/upload';
import { downloadFiles } from '../core/transfer/download';
import { computeExplorerContext, resolveExplorerContextMenu } from '../core/menus/explorerMenus';
import type { ExplorerContextValues } from '../core/menus/explorerMenus';
import {
  DEFAULT_VIEWS_VISIBILITY, EXPLORER_VIEWS, applyViewVisibility, normalizeViewsVisibility,
  resolveViewTitleContextMenu, viewHideCommandId, viewToggleCommandId,
} from '../core/menus/viewTitleMenus';
import type { ExplorerViewId, ExplorerViewsVisibility } from '../core/menus/viewTitleMenus';
import { saveBlob } from './transfer/saveBlob';
import './explorer.css';

export interface ExplorerViewProps {
  service: ExplorerService;
  menus: CommandRegistryLike;
  contextMenu: {
    open(input: { x: number; y: number; items: Array<{ id: string; label: string; enabled: boolean; group?: string; order: number; danger?: boolean }> }): void;
  };
  fs: FileSystemPortLike;
  baseUrl?: string;
}

const DND_MIME = 'application/vnd.code.tree.explorer';
const ROW_HEIGHT = 22;
const INDENT = 8; // `--vscode-tree-indent` padrão

// ---------------------------------------------------------------------------
// Pane (split-view-view > pane > pane-header + pane-body)
// ---------------------------------------------------------------------------
interface PaneProps {
  id: string;
  title: string;
  ariaLabel: string;
  expanded: boolean;
  onToggle(): void;
  headerClassName?: string;
  paneClassName?: string;
  actions?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children?: React.ReactNode;
  /** 4.5 c5: botão direito no header → MenuId.ViewTitleContext (viewPane.ts onContextMenu). */
  onHeaderContextMenu?(ev: React.MouseEvent): void;
}

const Pane: React.FC<PaneProps> = ({ id, title, ariaLabel, expanded, onToggle, headerClassName, paneClassName, actions, headerExtra, children, onHeaderContextMenu }) => (
  <div className="split-view-view visible" data-pane={id}>
    <div className={`pane vertical${expanded ? ' expanded' : ''}${paneClassName ? ' ' + paneClassName : ''}`}>
      <div
        className={`pane-header${expanded ? ' expanded' : ''}${headerClassName ? ' ' + headerClassName : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={ariaLabel}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        onContextMenu={onHeaderContextMenu}
      >
        <div className={`twisty-container codicon codicon-view-pane-container-${expanded ? 'expanded' : 'collapsed'}`} />
        <h3 className="title" aria-label={ariaLabel}>{title}</h3>
        {headerExtra}
        <div className="actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>
      {expanded && <div className="pane-body">{children}</div>}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Toolbar do pane-header (`.monaco-toolbar > .monaco-action-bar > ul.actions-container`)
// ---------------------------------------------------------------------------
interface HeaderAction { id: string; label: string; icon: string; testId?: string; disabled?: boolean }

const HeaderActions: React.FC<{ actions: HeaderAction[]; onRun(id: string, anchor: DOMRect): void }> = ({ actions, onRun }) => (
  <div className="monaco-toolbar">
    <div className="monaco-action-bar">
      <ul className="actions-container" role="toolbar">
        {actions.map((a) => (
          <li key={a.id} className={`action-item menu-entry${a.disabled ? ' disabled' : ''}`} role="presentation">
            <a
              className={`action-label codicon codicon-${a.icon}${a.disabled ? ' disabled' : ''}`}
              role="button"
              aria-label={a.label}
              aria-disabled={a.disabled || undefined}
              title={a.label}
              tabIndex={0}
              data-action={a.id}
              data-testid={a.testId}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!a.disabled) onRun(a.id, e.currentTarget.getBoundingClientRect()); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!a.disabled) onRun(a.id, e.currentTarget.getBoundingClientRect()); } }}
            />
          </li>
        ))}
      </ul>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Ícone de arquivo — classes Seti (`file-icon <name>-name-file-icon name-file-icon
// <ext>-ext-file-icon ext-file-icon`); pastas sem ícone.
// ---------------------------------------------------------------------------
function iconLabelClasses(item: ExplorerItem, extra: string[] = []): string {
  const name = item.name.toLowerCase();
  const tail = ['explorer-item', ...extra].join(' ');
  if (item.isDirectory) return `monaco-icon-label folder-icon ${name}-name-folder-icon ${tail}`;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1) : dot === 0 ? name.slice(1) : '';
  const extCls = ext ? `${ext}-ext-file-icon ext-file-icon` : '';
  return `monaco-icon-label file-icon ${name}-name-file-icon name-file-icon ${extCls} ${tail}`.replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Input inline (create/rename) — `.monaco-inputbox > .ibwrapper > input.input`
// dentro do `.explorer-item.explorer-item-edited` (explorerViewer renderInputBox).
// ---------------------------------------------------------------------------
export interface InlineEditState {
  mode: 'create-file' | 'create-folder' | 'rename';
  parentUri: WorkspaceUri;
  targetUri?: WorkspaceUri;
  depth: number; // depth visual (0 = nível 1)
  error?: string;
}

const InlineInput: React.FC<{
  defaultValue: string;
  error?: string;
  onCommit(value: string): void;
  onCancel(): void;
}> = ({ defaultValue, error, onCommit, onCancel }) => {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (defaultValue) {
      // renomear: seleciona só o stem (sem extensão) — igual VS Code
      const dot = defaultValue.lastIndexOf('.');
      el.setSelectionRange(0, dot > 0 ? dot : defaultValue.length);
    }
  }, [defaultValue]);
  return (
    <div className={`monaco-inputbox idle${error ? ' error' : ''}`}>
      <div className="ibwrapper">
        <input
          ref={ref}
          className="input"
          type="text"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          defaultValue={defaultValue}
          aria-label="Nome"
          data-testid="explorer-inline-input"
          onKeyDown={(ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') onCommit((ev.target as HTMLInputElement).value.trim());
            else if (ev.key === 'Escape') onCancel();
          }}
          onBlur={onCancel}
          onClick={(ev) => ev.stopPropagation()}
        />
      </div>
      {error && (
        <div className="monaco-inputbox-container">
          <div className="monaco-inputbox-message error" role="alert">{error}</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Linha da árvore — `.monaco-list-row[role=treeitem]` > `.monaco-tl-row`
// ---------------------------------------------------------------------------
interface RowShellProps {
  depth: number;
  index: number;
  isDir: boolean;
  expanded: boolean;
  className?: string;
  aria: React.HTMLAttributes<HTMLDivElement>;
  dataUri?: string;
  handlers?: React.HTMLAttributes<HTMLDivElement>;
  draggable?: boolean;
  onTwistie?(): void;
  children: React.ReactNode;
}

const RowShell: React.FC<RowShellProps> = ({ depth, index, isDir, expanded, className, aria, dataUri, handlers, draggable, onTwistie, children }) => {
  const indentWidth = depth * INDENT;
  return (
    <div
      className={`monaco-list-row${className ? ' ' + className : ''}`}
      role="treeitem"
      data-index={index}
      data-uri={dataUri}
      draggable={draggable}
      style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
      {...aria}
      {...handlers}
    >
      <div className="monaco-tl-row">
        <div className="monaco-tl-indent" style={{ width: indentWidth }}>
          {Array.from({ length: depth }, (_, i) => <div key={i} className="indent-guide" style={{ width: INDENT }} />)}
        </div>
        <div
          className={isDir
            ? `monaco-tl-twistie codicon codicon-tree-item-expanded collapsible${expanded ? '' : ' collapsed'}`
            : 'monaco-tl-twistie'}
          style={{ paddingLeft: 8 + indentWidth }}
          onClick={(e) => { if (isDir && onTwistie) { e.stopPropagation(); onTwistie(); } }}
        />
        <div className="monaco-tl-contents">{children}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Re-render externo (bump a cada evento do serviço)
// ---------------------------------------------------------------------------
class ViewRenderTick {
  private listeners = new Set<() => void>();
  private v = 0;
  bump(): void { this.v++; for (const l of [...this.listeners]) l(); }
  subscribe = (l: () => void): (() => void) => { this.listeners.add(l); return () => this.listeners.delete(l); };
  snapshot = (): number => this.v;
}

interface TransferStatus { kind: 'upload' | 'download'; text: string }
interface ConflictState { name: string; resolve: (action: 'replace' | 'skip' | 'cancel') => void }
interface OpenEditorEntry { uri: WorkspaceUri }
interface TimelineEntry { id: string; label: string; timestampMs: number }
type PaneId = 'folders' | 'openEditors' | 'outline' | 'timeline';
const VIEWS_VISIBILITY_STORAGE_KEY = 'explorer-search.viewsVisibility.v1';

const FOLDER_ACTIONS: HeaderAction[] = [
  { id: 'explorer.newFile', label: 'New File...', icon: 'new-file', testId: 'explorer-new-file' },
  { id: 'explorer.newFolder', label: 'New Folder...', icon: 'new-folder', testId: 'explorer-new-folder' },
  { id: 'explorer.refresh', label: 'Refresh Explorer', icon: 'refresh', testId: 'explorer-refresh' },
  { id: 'explorer.collapseAll', label: 'Collapse Folders in Explorer', icon: 'collapse-all', testId: 'explorer-collapse-all' },
];

// ---------------------------------------------------------------------------
// ExplorerView
// ---------------------------------------------------------------------------
export function ExplorerView({ service, menus, contextMenu, fs, baseUrl }: ExplorerViewProps): React.ReactElement {
  const tickRef = React.useRef<ViewRenderTick | null>(null);
  if (!tickRef.current) tickRef.current = new ViewRenderTick();
  const tick = tickRef.current;
  const version = React.useSyncExternalStore(tick.subscribe, tick.snapshot, tick.snapshot);

  // ---- estado local ----
  const [expandedPanes, setExpandedPanes] = React.useState<Record<PaneId, boolean>>({
    folders: true, openEditors: false, outline: false, timeline: false,
  });
  // 4.5 c5 — visibilidade das views (ViewTitleContext). Padrão VS Code: Open
  // Editors OCULTA. Persistida por workspace (estado de UI, não de disco).
  const [viewsVisibility, setViewsVisibility] = React.useState<ExplorerViewsVisibility>(() => {
    try {
      const raw = globalThis.localStorage?.getItem(VIEWS_VISIBILITY_STORAGE_KEY);
      return raw ? normalizeViewsVisibility(JSON.parse(raw)) : DEFAULT_VIEWS_VISIBILITY;
    } catch { return DEFAULT_VIEWS_VISIBILITY; }
  });
  React.useEffect(() => {
    try { globalThis.localStorage?.setItem(VIEWS_VISIBILITY_STORAGE_KEY, JSON.stringify(viewsVisibility)); } catch { /* storage indisponível */ }
  }, [viewsVisibility]);
  const setViewVisible = React.useCallback((id: ExplorerViewId, next: boolean) => {
    setViewsVisibility((cur) => applyViewVisibility(cur, id, next));
  }, []);
  const [inlineEdit, setInlineEdit] = React.useState<InlineEditState | null>(null);
  const [dropTargetUri, setDropTargetUri] = React.useState<WorkspaceUri | null>(null);
  const [transferStatus, setTransferStatus] = React.useState<TransferStatus | null>(null);
  const [conflict, setConflict] = React.useState<ConflictState | null>(null);
  const [openEditors, setOpenEditors] = React.useState<OpenEditorEntry[]>([]);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const [listFocused, setListFocused] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const dragData = React.useRef<DndData | null>(null);
  const anchorRef = React.useRef<WorkspaceUri | null>(null); // âncora do Shift+click
  const listRef = React.useRef<HTMLDivElement>(null);
  const viewletFocusRef = React.useRef(false);

  // ---- derivado do serviço ----
  const root = service.getRootItem();
  const allRows = service.getVisibleRows();
  // VS Code: a raiz NÃO é linha (é o pane-header) — filhos começam em aria-level 1.
  const rootDepth = allRows.length && root && allRows[0].item === root ? allRows[0].depth : -1;
  const rows = allRows
    .filter((r) => r.item !== root)
    .map((r) => ({ item: r.item, depth: r.depth - rootDepth - 1 }));
  const selection = service.getSelection();
  const selectionSet = new Set(selection);
  const focusedUri = selection[selection.length - 1] ?? null;
  const clip = service.getClipboardState();
  const cutSet = new Set(clip.kind === 'cut' ? clip.uris : []);
  const rootName = root ? (root.name || uriBasename(root.resource)) : '';

  // ---- eventos do serviço → re-render + Open Editors + Timeline ----
  React.useEffect(() => service.onEvent((e: ExplorerSearchEvent) => {
    if (e.type === 'explorer.fileOpened') {
      setOpenEditors((prev) => (prev.some((o) => o.uri === e.uri) ? prev : [...prev, { uri: e.uri }]));
    }
    if (e.type === 'fs.changed') {
      const now = Date.now();
      setTimeline((prev) => [
        ...e.changes.map((c, i) => ({
          id: `${now}-${i}`,
          label: `${uriBasename(c.uri)} ${c.kind === 'added' ? 'adicionado' : c.kind === 'removed' ? 'removido' : 'alterado'}`,
          timestampMs: now,
        })),
        ...prev,
      ].slice(0, 20));
    }
    tick.bump();
  }), [service, tick]);

  // ---- context keys (04_03 §7) publicadas via menus.setContext ----
  const computeContext = React.useCallback((contextUri?: WorkspaceUri | null): ExplorerContextValues => {
    const sel = service.getSelection();
    const targetUri = contextUri === undefined ? sel[sel.length - 1] : contextUri;
    const item = targetUri ? service.findItem(targetUri) : null;
    return computeExplorerContext({
      selection: sel,
      target: item
        ? { isDirectory: item.isDirectory, isRoot: item.isRoot, isReadonly: item.isReadonly, parentReadonly: item.parent?.isReadonly ?? false }
        : null,
      clipboardKind: service.getClipboardState().kind,
      viewletFocus: viewletFocusRef.current,
    });
  }, [service]);

  const publishContext = React.useCallback((contextUri?: WorkspaceUri | null) => {
    const ctx = computeContext(contextUri);
    for (const key of Object.keys(ctx) as Array<keyof ExplorerContextValues>) menus.setContext(key, ctx[key]);
    return ctx;
  }, [computeContext, menus]);

  React.useEffect(() => {
    publishContext();
    return service.onEvent((e) => {
      if (e.type === 'explorer.selectionChanged' || e.type === 'explorer.rootChanged' || e.type === 'fs.changed') publishContext();
    });
  }, [service, publishContext]);

  // ---- ações ----
  const openRow = React.useCallback((uri: WorkspaceUri) => {
    void service.open({ uri }).then(() => tick.bump(), () => tick.bump());
  }, [service, tick]);

  const selectRows = React.useCallback((uris: WorkspaceUri[]) => {
    service.select({ uris });
    tick.bump();
  }, [service, tick]);

  const depthOf = React.useCallback((uri: WorkspaceUri): number => {
    const r = rows.find((x) => x.item.resource === uri);
    return r ? r.depth : -1;
  }, [rows]);

  const beginCreate = React.useCallback((mode: 'create-file' | 'create-folder', contextUri?: WorkspaceUri) => {
    const sel = contextUri ?? service.getSelection()[0];
    const ctxItem = sel ? service.findItem(sel) : null;
    const parent = ctxItem ? service.resolveCreateParent(ctxItem.resource) : service.getRootItem()?.resource;
    if (!parent) return;
    setExpandedPanes((s) => (s.folders ? s : { ...s, folders: true }));
    void (async () => {
      try {
        if (!service.isExpandedUri(parent) && parent !== service.getRootItem()?.resource) await service.expand({ uri: parent });
      } catch { /* input aparece mesmo assim */ }
      const parentIsRoot = parent === service.getRootItem()?.resource;
      const d = parentIsRoot ? 0 : depthOf(parent) + 1;
      setInlineEdit({ mode, parentUri: parent, depth: d });
      tick.bump();
    })();
  }, [service, tick, depthOf]);

  const beginRename = React.useCallback((uri: WorkspaceUri | undefined) => {
    if (!uri) return;
    setInlineEdit({ mode: 'rename', parentUri: uriDirname(uri), targetUri: uri, depth: Math.max(0, depthOf(uri)) });
    tick.bump();
  }, [tick, depthOf]);

  const refreshAll = React.useCallback(() => {
    resetUploadDirCache();
    void service.refresh().then(() => tick.bump(), () => tick.bump());
  }, [service, tick]);

  const collapseAll = React.useCallback(() => { service.collapseAll(); tick.bump(); }, [service, tick]);

  const downloadSelection = React.useCallback(() => {
    const uris = service.getSelection();
    if (uris.length === 0) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setTransferStatus({ kind: 'download', text: 'Preparando download…' });
    void downloadFiles({
      fs, uris, baseUrl, save: saveBlob,
      onProgress: (p) => setTransferStatus({ kind: 'download', text: `Baixando ${p.filesDone}/${p.filesTotal} — ${p.currentName}` }),
      signal: ac.signal,
    }).then(() => setTransferStatus(null), () => setTransferStatus(null))
      .finally(() => { abortRef.current = null; });
  }, [fs, baseUrl, service]);

  const runUpload = React.useCallback((target: WorkspaceUri, records: UploadFileRecord[]) => {
    if (records.length === 0) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setTransferStatus({ kind: 'upload', text: 'Lendo itens…' });
    void (async () => {
      try {
        const result = await uploadFiles({
          fs, target, records, baseUrl, conflict: 'ask',
          askConflict: ({ name }) => new Promise((resolve) => setConflict({ name, resolve })),
          onProgress: (p) => setTransferStatus({
            kind: 'upload',
            text: p.filesTotal === 1 ? `Enviando ${p.currentName}…` : `Enviando ${p.filesDone}/${p.filesTotal} — ${p.currentName}`,
          }),
          signal: ac.signal,
        });
        if (result.filesCreated > 0) await service.refresh({ uri: target });
      } catch (err) {
        if ((err as DOMException)?.name !== 'AbortError') {
          setTransferStatus({ kind: 'upload', text: `Upload falhou: ${(err as Error).message}` });
          setTimeout(() => setTransferStatus(null), 4000);
        }
      } finally {
        abortRef.current = null;
        setTransferStatus((s) => (s?.kind === 'upload' && !s.text.startsWith('Upload falhou') ? null : s));
        tick.bump();
      }
    })();
  }, [fs, baseUrl, service, tick]);

  const uploadInputRef = React.useRef<HTMLInputElement>(null);
  const uploadTargetRef = React.useRef<WorkspaceUri | null>(null);
  const uploadViaPicker = React.useCallback(() => {
    const sel = service.getSelection()[0];
    const item = sel ? service.findItem(sel) : null;
    const target = item ? service.resolveCreateParent(item.resource) : service.getRootItem()?.resource;
    if (!target) return;
    uploadTargetRef.current = target;
    uploadInputRef.current?.click();
  }, [service]);
  const onUploadInputChange = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    const target = uploadTargetRef.current;
    const files = Array.from(ev.target.files ?? []);
    ev.target.value = '';
    if (!target) return;
    runUpload(target, files.map((file) => ({ file, relativePath: file.name })));
  }, [runUpload]);

  // ---- comandos (header/menu executam via CommandRegistry) ----
  const copyPaths = React.useCallback((relative: boolean) => {
    const sel = service.getSelection();
    const rootUri = service.getRootItem()?.resource;
    const uris = sel.length ? sel : rootUri ? [rootUri] : [];
    if (uris.length === 0) return;
    const text = uris
      .map((u) => (relative && rootUri ? (uriRelative(rootUri, u) ?? uriPath(u)) : uriPath(u)))
      .join('\n');
    return navigator.clipboard?.writeText(text).catch(() => undefined);
  }, [service]);
  React.useEffect(() => {
    const lastSel = () => { const s = service.getSelection(); return s[s.length - 1]; };
    const unsubs = [
      menus.register({ id: 'explorer.newFile', title: 'New File...', run: () => beginCreate('create-file') }),
      menus.register({ id: 'explorer.newFolder', title: 'New Folder...', run: () => beginCreate('create-folder') }),
      menus.register({ id: 'explorer.refresh', title: 'Refresh Explorer', run: refreshAll }),
      menus.register({ id: 'explorer.collapseAll', title: 'Collapse Folders in Explorer', run: collapseAll }),
      // 4.5 c5 — ViewTitleContext: Hide '<view>' + toggles (viewPaneContainer.ts)
      ...EXPLORER_VIEWS.flatMap((v) => [
        menus.register({ id: viewHideCommandId(v.id), title: `Hide '${v.label}'`, run: () => setViewVisible(v.id, false) }),
        menus.register({ id: viewToggleCommandId(v.id), title: v.label, run: () => setViewVisible(v.id, !viewsVisibilityRef.current[v.id]) }),
      ]),
      menus.register({ id: 'explorer.download', title: 'Download...', run: downloadSelection }),
      menus.register({ id: 'explorer.upload', title: 'Upload...', run: uploadViaPicker }),
      menus.register({ id: 'explorer.download.finished', title: 'internal noop', run: () => undefined }),
      menus.register({ id: 'explorer.open', title: 'Open', run: () => { const u = lastSel(); if (u) openRow(u); } }),
      menus.register({ id: 'explorer.rename', title: 'Rename...', run: () => beginRename(lastSel()) }),
      menus.register({
        id: 'explorer.delete', title: 'Delete Permanently',
        run: () => {
          const sel = service.getSelection();
          if (sel.length === 0) return;
          void service.remove({ uris: sel, useTrash: false }).then(() => tick.bump(), () => tick.bump());
        },
      }),
      // G2 — upstream fileActions.contribution.ts:603/610 → fileCommands.ts
      // `resourcesToClipboard(resources, relative)`: N recursos unidos por quebra
      // de linha; relativo = ao workspace folder (single-root: sem o nome da raiz).
      menus.register({ id: 'explorer.copyPath', title: 'Copy Path', run: () => copyPaths(false) }),
      menus.register({ id: 'explorer.copyRelativePath', title: 'Copy Relative Path', run: () => copyPaths(true) }),
      menus.register({ id: 'explorer.cut', title: 'Cut', run: () => { const s = service.getSelection(); if (s.length) { service.cut({ uris: s }); tick.bump(); } } }),
      menus.register({ id: 'explorer.copy', title: 'Copy', run: () => { const s = service.getSelection(); if (s.length) { service.copy({ uris: s }); tick.bump(); } } }),
      menus.register({
        id: 'explorer.paste', title: 'Paste',
        run: () => {
          const sel = service.getSelection()[0];
          const item = sel ? service.findItem(sel) : null;
          const target = item ? service.resolveCreateParent(item.resource) : service.getRootItem()?.resource;
          if (!target) return;
          void service.paste({ target }).then(() => tick.bump(), () => tick.bump());
        },
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [menus, service, tick, beginCreate, beginRename, refreshAll, collapseAll, downloadSelection, uploadViaPicker, openRow, copyPaths, setViewVisible]);
  const viewsVisibilityRef = React.useRef(viewsVisibility);
  viewsVisibilityRef.current = viewsVisibility;

  // 4.5 c5 — menu de contexto do pane-header (viewPane.ts onContextMenu → ViewTitleContext)
  const onPaneHeaderContextMenu = React.useCallback((id: ExplorerViewId) => (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    contextMenu.open({ x: ev.clientX, y: ev.clientY, items: resolveViewTitleContextMenu(id, viewsVisibilityRef.current) });
  }, [contextMenu]);

  // ---- inline commit ----
  const commitInline = React.useCallback((value: string) => {
    const edit = inlineEdit;
    if (!edit) return;
    if (!value) { setInlineEdit({ ...edit, error: 'Nome não pode ficar vazio.' }); return; }
    if (value.includes('/') || value.includes('\\')) { setInlineEdit({ ...edit, error: 'Nome não pode conter "/" ou "\\".' }); return; }
    void (async () => {
      try {
        if (edit.mode === 'rename' && edit.targetUri) await service.rename({ uri: edit.targetUri, newName: value });
        else if (edit.mode === 'create-file') await service.createFile({ uri: uriJoinPath(edit.parentUri, value) });
        else await service.createFolder({ uri: uriJoinPath(edit.parentUri, value) });
        setInlineEdit(null);
      } catch (err) {
        if (err instanceof ExplorerCreateConflictError) setInlineEdit({ ...edit, error: `Já existe um arquivo ou pasta chamado “${value}” aqui.` });
        else if (err instanceof ExplorerRenameConflictError) setInlineEdit({ ...edit, error: `Já existe “${value}” nesta pasta.` });
        else setInlineEdit({ ...edit, error: (err as Error)?.message ?? String(err) });
      }
      tick.bump();
    })();
  }, [inlineEdit, service, tick]);
  const cancelInline = React.useCallback(() => setInlineEdit(null), []);

  // ---- menu de contexto ----
  const openItemContextMenu = React.useCallback((uri: WorkspaceUri | null, x: number, y: number) => {
    const ctx = publishContext(uri);
    contextMenu.open({ x, y, items: resolveExplorerContextMenu(ctx) });
  }, [contextMenu, publishContext]);

  const onRowContextMenu = React.useCallback((item: ExplorerItem, ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!service.getSelection().includes(item.resource)) service.select({ uris: [item.resource] });
    tick.bump();
    openItemContextMenu(item.resource, ev.clientX, ev.clientY);
  }, [service, tick, openItemContextMenu]);

  const onTreeContextMenu = React.useCallback((ev: React.MouseEvent) => {
    if ((ev.target as HTMLElement).closest('[role="treeitem"]')) return;
    ev.preventDefault();
    const r = service.getRootItem();
    if (!r) return;
    service.select({ uris: [r.resource] });
    tick.bump();
    openItemContextMenu(r.resource, ev.clientX, ev.clientY);
  }, [service, tick, openItemContextMenu]);

  // ---- clique / seleção (list.multipleSelectionSupport: Ctrl toggle, Shift range) ----
  const onRowClick = React.useCallback((item: ExplorerItem, ev: React.MouseEvent) => {
    const uri = item.resource;
    if (ev.ctrlKey || ev.metaKey) {
      const cur = service.getSelection();
      selectRows(cur.includes(uri) ? cur.filter((u) => u !== uri) : [...cur, uri]);
      anchorRef.current = uri;
      return;
    }
    if (ev.shiftKey && anchorRef.current) {
      const a = rows.findIndex((r) => r.item.resource === anchorRef.current);
      const b = rows.findIndex((r) => r.item.resource === uri);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        selectRows(rows.slice(lo, hi + 1).map((r) => r.item.resource));
        return;
      }
    }
    anchorRef.current = uri;
    // clique simples: pasta alterna expansão; arquivo abre (workbench.list.openMode = singleClick)
    openRow(uri);
  }, [service, rows, selectRows, openRow]);

  // ---- teclado ----
  const onKeyDown = React.useCallback((ev: React.KeyboardEvent) => {
    if ((ev.target as HTMLElement).tagName === 'INPUT') return;
    const sel = service.getSelection();
    const focused = sel[sel.length - 1];
    const idx = rows.findIndex((r) => r.item.resource === focused);
    const go = (i: number) => { const n = rows[Math.max(0, Math.min(rows.length - 1, i))]; if (n) { anchorRef.current = n.item.resource; selectRows([n.item.resource]); } };
    switch (ev.key) {
      case 'ArrowDown': ev.preventDefault(); go(idx + 1); return;
      case 'ArrowUp': ev.preventDefault(); go(idx - 1); return;
      case 'Home': ev.preventDefault(); go(0); return;
      case 'End': ev.preventDefault(); go(rows.length - 1); return;
      case 'Enter': if (focused) { ev.preventDefault(); openRow(focused); } return;
      case ' ': if (focused) { ev.preventDefault(); const it = service.findItem(focused); if (it?.isDirectory) openRow(focused); } return;
      case 'F2': if (focused) { ev.preventDefault(); beginRename(focused); } return;
      case 'Delete': if (sel.length) { ev.preventDefault(); void menus.execute('explorer.delete'); } return;
      case 'F10':
      case 'ContextMenu': {
        // 04_03 §6: tecla Menu / Shift+F10 abre o menu no item focado (listWidget
        // upstream: keyboard contextmenu ancora no elemento focado; sem foco →
        // menu da raiz, como o clique em área vazia).
        if (ev.key === 'F10' && !ev.shiftKey) return;
        ev.preventDefault();
        ev.stopPropagation();
        const container = ev.currentTarget as HTMLElement;
        const rowEl = focused ? (container.querySelector(`[data-uri="${CSS.escape(focused)}"]`) as HTMLElement | null) : null;
        const rect = (rowEl ?? container).getBoundingClientRect();
        const target = focused ?? service.getRootItem()?.resource ?? null;
        if (!target) return;
        if (!focused && target) { service.select({ uris: [target] }); tick.bump(); }
        openItemContextMenu(target, rect.left + 20, rowEl ? rect.bottom : rect.top);
        return;
      }
      case 'ArrowRight': {
        if (!focused) return;
        const it = service.findItem(focused);
        if (it?.isDirectory) {
          ev.preventDefault();
          if (!service.isExpandedUri(focused)) void service.expand({ uri: focused }).then(() => tick.bump());
          else go(idx + 1);
        }
        return;
      }
      case 'ArrowLeft': {
        if (!focused) return;
        const it = service.findItem(focused);
        if (it?.isDirectory && service.isExpandedUri(focused)) { ev.preventDefault(); void service.collapse({ uri: focused }).then(() => tick.bump()); }
        else if (it?.parent && it.parent !== service.getRootItem()) { ev.preventDefault(); selectRows([it.parent.resource]); }
        return;
      }
      case 'Escape': if (abortRef.current) { abortRef.current.abort(); setTransferStatus(null); } setDropTargetUri(null); return;
      default: {
        // Copy Path Ctrl+Alt+C / Copy Relative Path Ctrl+Shift+Alt+C
        // (fileActions.contribution.ts keybindings; 04_17 §3.8 ordem medida).
        if ((ev.ctrlKey || ev.metaKey) && ev.altKey && ev.key.toLowerCase() === 'c') {
          ev.preventDefault();
          void menus.execute(ev.shiftKey ? 'explorer.copyRelativePath' : 'explorer.copyPath');
          return;
        }
        if ((ev.ctrlKey || ev.metaKey) && !ev.altKey) {
          const k = ev.key.toLowerCase();
          if (k === 'c') { ev.preventDefault(); void menus.execute('explorer.copy'); }
          else if (k === 'x') { ev.preventDefault(); void menus.execute('explorer.cut'); }
          else if (k === 'v') { ev.preventDefault(); void menus.execute('explorer.paste'); }
          else if (k === 'a') { ev.preventDefault(); selectRows(rows.map((r) => r.item.resource)); }
        }
      }
    }
  }, [service, rows, selectRows, openRow, beginRename, menus, tick, openItemContextMenu]);

  // ---- DnD (política pura em core/dndPolicy) ----
  const buildData = React.useCallback((ev: React.DragEvent): DndData | null => {
    const dt = ev.dataTransfer;
    if (!dt) return null;
    if (dragData.current?.kind === 'internal') return dragData.current;
    if (dt.types.includes('Files')) return { kind: 'external', uris: [], hasFiles: true };
    return null;
  }, []);
  const dndCtx = (ev: React.DragEvent | React.MouseEvent) => ({
    ctrlKey: ev.ctrlKey, altKey: ev.altKey,
    isMacintosh: typeof navigator !== 'undefined' && /mac/i.test(navigator.platform),
  });

  const onRowDragStart = React.useCallback((item: ExplorerItem, ev: React.DragEvent) => {
    const sel = service.getSelection();
    const uris = sel.includes(item.resource) ? sel : [item.resource];
    if (!sel.includes(item.resource)) service.select({ uris });
    const items = uris.map((u) => service.findItem(u)).filter((i): i is ExplorerItem => i != null);
    dragData.current = { kind: 'internal', items };
    ev.dataTransfer.setData(DND_MIME, JSON.stringify(uris));
    ev.dataTransfer.effectAllowed = 'copyMove';
  }, [service]);

  const onDragOverTarget = React.useCallback((uri: WorkspaceUri | null, ev: React.DragEvent) => {
    const data = buildData(ev);
    if (!data) return;
    const targetItem = uri ? service.findItem(uri) : service.getRootItem();
    const decision = decideDragOver(data, targetItem ?? null, dndCtx(ev));
    if (decision.accept) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.dataTransfer.dropEffect = decision.effect === 'copy' ? 'copy' : 'move';
      const resolved = resolveDropTarget(targetItem ?? null) ?? service.getRootItem();
      setDropTargetUri(resolved?.resource ?? null);
    } else {
      setDropTargetUri(null);
    }
  }, [buildData, service]);

  const onDrop = React.useCallback((ev: React.DragEvent) => {
    const data = buildData(ev);
    const targetEl = (ev.target as HTMLElement).closest('[data-uri]') as HTMLElement | null;
    const targetItem = targetEl?.dataset.uri ? service.findItem(targetEl.dataset.uri as WorkspaceUri) : service.getRootItem();
    ev.preventDefault();
    ev.stopPropagation();
    setDropTargetUri(null);
    if (!data) return;
    const decision = decideDragOver(data, targetItem ?? null, dndCtx(ev));
    if (!decision.accept) { dragData.current = null; return; }
    const plan = planDrop(data, decision, targetItem ?? null);
    if (!plan) { dragData.current = null; return; }
    if (plan.kind === 'move' || plan.kind === 'copy') {
      const uris = plan.sources.map((s) => s.resource);
      void (async () => {
        try {
          if (plan.kind === 'move') service.cut({ uris }); else service.copy({ uris });
          await service.paste({ target: plan.target.resource });
        } catch { /* serviço já emite 'error' */ }
        dragData.current = null;
        tick.bump();
      })();
      return;
    }
    setTransferStatus({ kind: 'upload', text: 'Lendo itens arrastados…' });
    void collectDroppedFiles(ev.dataTransfer.items).then(
      (records) => { dragData.current = null; if (records.length === 0) { setTransferStatus(null); return; } runUpload(plan.target.resource, records); },
      (err: Error) => { setTransferStatus({ kind: 'upload', text: `Upload falhou: ${err.message}` }); setTimeout(() => setTransferStatus(null), 4000); },
    );
  }, [buildData, service, tick, runUpload]);

  const onDragEnd = React.useCallback(() => { dragData.current = null; setDropTargetUri(null); }, []);

  // ---- header actions ----
  const runHeaderAction = React.useCallback((id: string) => { void menus.execute(id); }, [menus]);
  const togglePane = (id: PaneId) => setExpandedPanes((s) => ({ ...s, [id]: !s[id] }));

  // ---- posição do input inline na lista ----
  // create: logo após a última linha visível do pai (ou no topo se pai = raiz vazio); rename: no lugar da linha.
  let inlineIndex = -1;
  if (inlineEdit) {
    if (inlineEdit.mode === 'rename') inlineIndex = rows.findIndex((r) => r.item.resource === inlineEdit.targetUri);
    else {
      const parentIsRoot = inlineEdit.parentUri === root?.resource;
      const pIdx = parentIsRoot ? -1 : rows.findIndex((r) => r.item.resource === inlineEdit.parentUri);
      inlineIndex = pIdx + 1;
    }
  }
  const rowCount = rows.length + (inlineEdit && inlineEdit.mode !== 'rename' ? 1 : 0);

  void version;

  const renderRows = (): React.ReactNode[] => {
    const out: React.ReactNode[] = [];
    let vi = 0;
    const pushInline = () => {
      const isRename = inlineEdit!.mode === 'rename';
      const target = isRename && inlineEdit!.targetUri ? service.findItem(inlineEdit!.targetUri) : null;
      const isDir = isRename ? !!target?.isDirectory : inlineEdit!.mode === 'create-folder';
      const cls = target ? iconLabelClasses(target, ['explorer-item-edited']) : `monaco-icon-label ${isDir ? 'folder-icon' : 'file-icon'} explorer-item explorer-item-edited`;
      out.push(
        <RowShell key="__inline" depth={inlineEdit!.depth} index={vi++} isDir={isDir} expanded={false} className="focused"
          aria={{ 'aria-level': inlineEdit!.depth + 1, 'aria-label': isRename ? 'Rename' : 'New' }}>
          <div className={cls} style={{ display: 'flex' }}>
            <div className="monaco-icon-label-container">
              <InlineInput defaultValue={target?.name ?? ''} error={inlineEdit!.error} onCommit={commitInline} onCancel={cancelInline} />
            </div>
          </div>
        </RowShell>,
      );
    };
    if (inlineEdit && inlineEdit.mode !== 'rename' && inlineIndex === 0) pushInline();
    rows.forEach((r, i) => {
      const { item, depth } = r;
      const uri = item.resource;
      if (inlineEdit?.mode === 'rename' && inlineIndex === i) { pushInline(); return; }
      const expanded = item.isDirectory && service.isExpandedUri(uri);
      const selected = selectionSet.has(uri);
      const focused = focusedUri === uri;
      const isDrop = dropTargetUri === uri;
      out.push(
        <RowShell
          key={uri}
          depth={depth}
          index={vi++}
          isDir={item.isDirectory}
          expanded={expanded}
          dataUri={uri}
          draggable
          className={`${selected ? 'selected' : ''}${focused ? ' focused' : ''}${isDrop ? ' drop-target' : ''}`.trim()}
          aria={{
            'aria-level': depth + 1,
            'aria-label': item.name,
            'aria-selected': selected,
            ...(item.isDirectory ? { 'aria-expanded': expanded } : {}),
          }}
          onTwistie={() => openRow(uri)}
          handlers={{
            onClick: (ev) => onRowClick(item, ev),
            onContextMenu: (ev) => onRowContextMenu(item, ev),
            onDragStart: (ev) => onRowDragStart(item, ev),
            onDragOver: (ev) => onDragOverTarget(uri, ev),
            onDrop,
            onDragEnd,
          }}
        >
          <div className={iconLabelClasses(item, cutSet.has(uri) ? ['cut'] : [])} aria-label={uri} title={uri} style={{ display: 'flex' }}>
            <div className="monaco-icon-label-container">
              <span className="monaco-icon-name-container">
                <a className="label-name"><span className="monaco-highlighted-label">{item.name}</span></a>
              </span>
            </div>
          </div>
        </RowShell>,
      );
      if (inlineEdit && inlineEdit.mode !== 'rename' && inlineIndex === i + 1) pushInline();
    });
    return out;
  };

  return (
    <div
      className="composite viewlet explorer-viewlet"
      data-testid="explorer-view"
      onFocus={() => { viewletFocusRef.current = true; menus.setContext('explorerViewletFocus', true); }}
      onBlur={(ev) => {
        if (ev.currentTarget.contains(ev.relatedTarget as Node | null)) return;
        viewletFocusRef.current = false;
        menus.setContext('explorerViewletFocus', false);
      }}
      onDragLeave={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setDropTargetUri(null); }}
    >
      <input ref={uploadInputRef} type="file" multiple hidden data-testid="explorer-upload-input" onChange={onUploadInputChange} />
      <div className="monaco-pane-view">
        <div className="monaco-split-view2 vertical">
          <div className="monaco-scrollable-element" role="presentation">
            <div className="split-view-container">
              {/* ---- Pasta raiz ---- */}
              <Pane
                id="folders"
                title={rootName || 'No Folder Opened'}
                ariaLabel={`Explorer Section: ${rootName}`}
                onHeaderContextMenu={onPaneHeaderContextMenu('folders')}
                expanded={expandedPanes.folders}
                onToggle={() => togglePane('folders')}
                paneClassName="preserve-workspace-name-case"
                actions={<HeaderActions actions={FOLDER_ACTIONS.map((a) => ({ ...a, disabled: !root }))} onRun={runHeaderAction} />}
              >
                {!root ? (
                  <div className="pane-message" data-testid="explorer-empty-root">Nenhuma pasta aberta.</div>
                ) : (
                  <div className={`explorer-folders-view file-icon-themable-tree show-file-icons align-icons-and-twisties${dropTargetUri === root.resource ? ' drop-target-root' : ''}`}>
                    <div
                      ref={listRef}
                      className={`monaco-list list_id_1 mouse-support${listFocused ? ' focused' : ''}${selection.length > 1 ? ' selection-multiple' : selection.length === 1 ? ' selection-single' : ' selection-none'}`}
                      role="tree"
                      aria-label="Files Explorer"
                      aria-multiselectable
                      tabIndex={0}
                      onKeyDown={onKeyDown}
                      onFocus={() => setListFocused(true)}
                      onBlur={(ev) => { if (!ev.currentTarget.contains(ev.relatedTarget as Node | null)) setListFocused(false); }}
                      onContextMenu={onTreeContextMenu}
                      onDragOver={(ev) => { if (!(ev.target as HTMLElement).closest('[role="treeitem"]')) onDragOverTarget(null, ev); }}
                      onDrop={onDrop}
                    >
                      <div className="monaco-scrollable-element" role="presentation">
                        <div className="monaco-list-rows" style={{ height: rowCount * ROW_HEIGHT }}>
                          {renderRows()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Pane>

              {/* ---- Open Editors (oculta por padrão — VS Code) ---- */}
              {viewsVisibility.openEditors && <Pane
                id="openEditors"
                title="Open Editors"
                ariaLabel="Open Editors Section"
                expanded={expandedPanes.openEditors}
                onToggle={() => togglePane('openEditors')}
                onHeaderContextMenu={onPaneHeaderContextMenu('openEditors')}
                headerExtra={<div className="open-editors-dirty-count-container" />}
              >
                <div className="pane-body-inner open-editors show-file-icons">
                  <div className="monaco-list list_id_2 mouse-support" role="list" aria-label="Open Editors">
                    <div className="monaco-scrollable-element" role="presentation">
                      <div className="monaco-list-rows" style={{ height: openEditors.length * ROW_HEIGHT }}>
                        {openEditors.map((o, i) => {
                          const item = service.findItem(o.uri);
                          const name = uriBasename(o.uri);
                          return (
                            <div key={o.uri} className="monaco-list-row" role="listitem" aria-label={name}
                              style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
                              onClick={() => openRow(o.uri)}>
                              <div className="monaco-action-bar">
                                <ul className="actions-container" role="toolbar">
                                  <li className="action-item" role="presentation">
                                    <a className="action-label codicon codicon-close" role="button" aria-label="Close Editor" title="Close Editor"
                                      onClick={(ev) => { ev.stopPropagation(); setOpenEditors((prev) => prev.filter((x) => x.uri !== o.uri)); }} />
                                  </li>
                                </ul>
                              </div>
                              <div className={`${item ? iconLabelClasses(item) : 'monaco-icon-label file-icon explorer-item'} open-editor`} aria-label={o.uri}>
                                <div className="monaco-icon-label-container">
                                  <span className="monaco-icon-name-container"><a className="label-name">{name}</a></span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Pane>}

              {/* ---- Outline ---- */}
              {viewsVisibility.outline && <Pane id="outline" title="Outline" ariaLabel="Outline Section" expanded={expandedPanes.outline} onToggle={() => togglePane('outline')} onHeaderContextMenu={onPaneHeaderContextMenu('outline')}>
                <div className="outline-pane"><div className="pane-message">No symbols found in document</div></div>
              </Pane>}

              {/* ---- Timeline ---- */}
              {viewsVisibility.timeline && <Pane id="timeline" title="Timeline" ariaLabel="Timeline Section" expanded={expandedPanes.timeline} onToggle={() => togglePane('timeline')} headerClassName="timeline-view" onHeaderContextMenu={onPaneHeaderContextMenu('timeline')}>
                <div className="timeline-pane">
                  {timeline.length === 0
                    ? <div className="pane-message">The active editor cannot provide timeline information.</div>
                    : (
                      <div className="monaco-list" role="list">
                        <div className="monaco-scrollable-element" role="presentation">
                          <div className="monaco-list-rows" style={{ height: timeline.length * ROW_HEIGHT }}>
                            {timeline.map((t, i) => (
                              <div key={t.id} className="monaco-list-row" role="listitem" style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px`, paddingLeft: 20 }}>
                                <span className="timeline-label">{t.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </Pane>}
            </div>
          </div>
        </div>
      </div>

      {/* status de transferência (upload/download) */}
      <div className="explorer-transfer-status" data-testid="explorer-status" role="status">
        {transferStatus && (
          <>
            <span>{transferStatus.text}</span>
            {transferStatus.kind === 'upload' && (
              <a className="action-label codicon codicon-close" role="button" title="Cancelar upload" aria-label="Cancelar upload" onClick={() => abortRef.current?.abort()} />
            )}
          </>
        )}
      </div>

      {/* conflito de upload: Replace / Skip / Cancel */}
      {conflict && (
        <div className="explorer-conflict-dialog" role="dialog" aria-modal="true" aria-label="Conflito de upload" data-testid="explorer-conflict-dialog">
          <div className="explorer-conflict-box">
            <div className="explorer-conflict-title">Já existe um arquivo chamado “{conflict.name}” na pasta de destino. Deseja substituí-lo?</div>
            <div className="explorer-conflict-actions">
              <button type="button" className="monaco-button" data-testid="conflict-replace" onClick={() => { const r = conflict.resolve; setConflict(null); r('replace'); }}>Replace</button>
              <button type="button" className="monaco-button secondary" data-testid="conflict-skip" onClick={() => { const r = conflict.resolve; setConflict(null); r('skip'); }}>Skip</button>
              <button type="button" className="monaco-button secondary" data-testid="conflict-cancel" onClick={() => { const r = conflict.resolve; setConflict(null); r('cancel'); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExplorerView;
