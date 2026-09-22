// ============================================================================
// modules/explorer-search/ui/ExplorerView.tsx — Raiz montada em mount() (4.4)
// Header (5 botões) + Árvore lazy + 3 seções + status upload/download + dialog.
// Regra 04_02 §1: a View NÃO toca FS — tudo passa pelo ExplorerService.
// Transferências (upload/download) usam core/transfer/* (port upstream do
// BrowserFileUpload/BrowserFileDownload); menus executam via CommandRegistry.
// ============================================================================

import React from 'react';
import type { ExplorerService } from '../core/explorerService';
import { ExplorerCreateConflictError, ExplorerRenameConflictError } from '../core/explorerService';
import type { CommandRegistryLike, FileSystemPortLike, WorkspaceUri, ExplorerSearchEvent } from '../contract';
import { uriBasename, uriDirname, uriJoinPath } from '../core/uri';
import { decideDragOver, planDrop, resolveDropTarget } from '../core/dndPolicy';
import type { DndData } from '../core/dndPolicy';
import { collectDroppedFiles, uploadFiles, resetUploadDirCache } from '../core/transfer/upload';
import { downloadFiles } from '../core/transfer/download';
import { saveBlob } from './transfer/saveBlob';
import { ExplorerHeader } from './ExplorerHeader';
import { ExplorerTree, type InlineEditState } from './ExplorerTree';
import { OpenEditorsSection, OutlineSection, TimelineSection } from './sections';
import type { OpenEditorEntry, OutlineEntry, TimelineEntry } from './sections';
import { ConflictDialog, type ConflictDialogState } from './ConflictDialog';
import './explorer.css';

export interface ExplorerViewProps {
  service: ExplorerService;
  menus: CommandRegistryLike;
  contextMenu: {
    open(input: {
      x: number; y: number;
      items: Array<{ id: string; label: string; enabled: boolean; group?: string; order: number; danger?: boolean }>;
    }): void;
  };
  fs: FileSystemPortLike;
  baseUrl?: string;
}

const DND_MIME = 'application/x-agente-window-explorer';

interface TransferStatus { kind: 'upload' | 'download'; text: string }

class ViewRenderTick {
  private listeners = new Set<() => void>();
  private v = 0;
  bump(): void { this.v++; for (const l of [...this.listeners]) l(); }
  subscribe = (l: () => void): (() => void) => { this.listeners.add(l); return () => this.listeners.delete(l); };
  snapshot = (): number => this.v;
}

export function ExplorerView({ service, menus, contextMenu, fs, baseUrl }: ExplorerViewProps): React.ReactElement {
  const tickRef = React.useRef<ViewRenderTick | null>(null);
  if (!tickRef.current) tickRef.current = new ViewRenderTick();
  const tick = tickRef.current;

  const version = React.useSyncExternalStore(tick.subscribe, tick.snapshot, tick.snapshot);

  // ---- estado derivado do serviço (re-lido a cada bump) ----
  const rows = service.getVisibleRows();
  const selection = service.getSelection();
  const rootItem = service.getRootItem();

  // ---- estado local da view ----
  const [inlineEdit, setInlineEdit] = React.useState<InlineEditState | null>(null);
  const [dropTargetUri, setDropTargetUri] = React.useState<WorkspaceUri | null>(null);
  const [transferStatus, setTransferStatus] = React.useState<TransferStatus | null>(null);
  const [conflict, setConflict] = React.useState<ConflictDialogState | null>(null);
  const [openEditors, setOpenEditors] = React.useState<OpenEditorEntry[]>([]);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);
  const dragOverDecision = React.useRef<ReturnType<typeof decideDragOver> | null>(null);
  const dragData = React.useRef<DndData | null>(null);
  const treeRef = React.useRef<HTMLDivElement>(null);

  // ---- re-render a cada evento do serviço + assinaturas reativas ----
  React.useEffect(() => {
    const off = service.onEvent((e: ExplorerSearchEvent) => {
      if (e.type === 'explorer.fileOpened') {
        setOpenEditors((prev) =>
          prev.some((o) => o.uri === e.uri) ? prev : [...prev, { uri: e.uri }],
        );
      }
      if (e.type === 'fs.changed') {
        const sel = service.getSelection()[0];
        const now = Date.now();
        setTimeline((prev) => [
          ...e.changes
            .filter((c) => !sel || c.uri.startsWith(sel.replace(/\/?$/, '/')) || c.uri === sel)
            .map((c, i) => ({
              id: `${now}-${i}`,
              label: `${uriBasename(c.uri)} ${c.kind === 'added' ? 'adicionado' : c.kind === 'removed' ? 'removido' : 'alterado'}`,
              timestampMs: now,
            })),
          ...prev,
        ].slice(0, 20));
      }
      tick.bump();
    });
    return off;
  }, [service, tick]);

  // ---- comandos registrados (header + overflow executam via CommandRegistry) ----
  const stateRef = React.useRef({ inlineEdit, selection, conflict, transferStatus });
  stateRef.current = { inlineEdit, selection, conflict, transferStatus };

  const beginCreate = React.useCallback((mode: 'create-file' | 'create-folder') => {
    const sel = service.getSelection()[0];
    const ctxItem = sel ? service.findItem(sel) : null;
    const parent = ctxItem ? service.resolveCreateParent(ctxItem.resource) : service.getRootItem()?.resource;
    if (!parent) return;
    const parentItem = service.findItem(parent);
    void (async () => {
      try {
        if (parentItem?.isDirectory && !service.isExpandedUri(parent)) {
          await service.expand({ uri: parent });
        }
      } catch { /* expand falhou — input ainda aparece */ }
      setInlineEdit({ mode, parentUri: parent, depth: depthOf(rowsDepth(), parent) });
      tick.bump();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const beginRename = React.useCallback((uri: WorkspaceUri | undefined) => {
    if (!uri) return;
    const flat = service.getVisibleRows();
    const f = flat.find((r) => r.item.resource === uri);
    setInlineEdit({
      mode: 'rename', parentUri: uriDirname(uri), targetUri: uri, depth: f?.depth ?? 0,
    });
    tick.bump();
  }, [service, tick]);

  // 4.4 (menu host do shell): right-click na linha abre o menu CONTEXUAL via
  // bridge `contextMenu.open` — tabela completa/grupos/when chega na 4.5; aqui
  // um subset funcional, todos os itens executando via ICommandRegistry (A3).
  const openItemContextMenu = React.useCallback((input: { uri: WorkspaceUri; x: number; y: number }) => {
    const sel = service.getSelection();
    const single = sel.length === 1 ? sel[0] : null;
    const ctxItem = single ? service.findItem(single) : null;
    const clip = service.getClipboardState();
    contextMenu.open({
      x: input.x,
      y: input.y,
      items: [
        { id: 'explorer.open', label: 'Open', enabled: !!single, group: 'navigation', order: 1 },
        { id: 'explorer.newFile', label: 'New File...', enabled: true, group: 'workspace', order: 2 },
        { id: 'explorer.newFolder', label: 'New Folder...', enabled: true, group: 'workspace', order: 3 },
        { id: 'explorer.refresh', label: 'Refresh Explorer', enabled: true, group: 'navigation', order: 4 },
        { id: 'explorer.cut', label: 'Cut', enabled: sel.length > 0, group: 'operation', order: 5 },
        { id: 'explorer.copy', label: 'Copy', enabled: sel.length > 0, group: 'operation', order: 6 },
        { id: 'explorer.paste', label: 'Paste', enabled: clip.kind !== null, group: 'operation', order: 7 },
        { id: 'explorer.rename', label: 'Rename...', enabled: !!single, group: 'operation', order: 8 },
        { id: 'explorer.delete', label: 'Delete', enabled: sel.length > 0, group: 'operation', order: 9, danger: true },
        { id: 'explorer.download', label: 'Download...', enabled: sel.length > 0, group: 'importexport', order: 10 },
        { id: 'explorer.collapseAll', label: 'Collapse Folders in Explorer', enabled: true, group: 'view', order: 11 },
      ],
    });
    void ctxItem;
  }, [service, contextMenu]);

  function rowsDepth(): Array<{ uri: WorkspaceUri; depth: number }> {
    return service.getVisibleRows().map((r) => ({ uri: r.item.resource, depth: r.depth }));
  }
  function depthOf(list: Array<{ uri: WorkspaceUri; depth: number }>, uri: WorkspaceUri): number {
    const row = list.find((r) => r.uri === uri);
    return (row?.depth ?? 0) + 1;
  }

  const refreshAll = React.useCallback(() => {
    resetUploadDirCache();
    void service.refresh().then(() => undefined, () => undefined);
    // fs.changed fará o bump; força leitura imediata também.
    setTimeout(() => tick.bump(), 50);
  }, [service, tick]);

  const collapseAll = React.useCallback(() => {
    service.collapseAll();
  }, [service]);

  const downloadSelection = React.useCallback(() => {
    const uris = service.getSelection();
    if (uris.length === 0) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setTransferStatus({ kind: 'download', text: 'Preparando download…' });
    void downloadFiles({
      fs, uris, baseUrl,
      save: saveBlob,
      onProgress: (p) => setTransferStatus({ kind: 'download', text: `Baixando ${p.filesDone}/${p.filesTotal} — ${p.currentName}` }),
      signal: ac.signal,
    }).then(
      () => setTransferStatus(null),
      () => setTransferStatus(null),
    ).finally(() => { abortRef.current = null; });
  }, [fs, baseUrl, service]);

  const openMoreActions = React.useCallback((anchor: DOMRect) => {
    const hasSelection = stateRef.current.selection.length > 0;
    contextMenu.open({
      x: anchor.left,
      y: anchor.bottom + 2,
      items: [
        { id: 'explorer.download', label: 'Download...', enabled: hasSelection, group: 'file', order: 10 },
        { id: 'explorer.refresh', label: 'Refresh Explorer', enabled: true, group: 'view', order: 20 },
        { id: 'explorer.collapseAll', label: 'Collapse Folders in Explorer', enabled: true, group: 'view', order: 21 },
      ],
    });
  }, [contextMenu]);

  React.useEffect(() => {
    const unsubs = [
      menus.register({ id: 'explorer.newFile', title: 'New File...', run: () => beginCreate('create-file') }),
      menus.register({ id: 'explorer.newFolder', title: 'New Folder...', run: () => beginCreate('create-folder') }),
      menus.register({ id: 'explorer.refresh', title: 'Refresh Explorer', run: refreshAll }),
      menus.register({ id: 'explorer.collapseAll', title: 'Collapse Folders in Explorer', run: collapseAll }),
      menus.register({ id: 'explorer.download', title: 'Download...', run: downloadSelection }),
      menus.register({ id: 'explorer.download.finished', title: 'internal noop', run: () => undefined }),
      menus.register({
        id: 'explorer.open', title: 'Open',
        run: () => {
          const sel = service.getSelection();
          const uri = sel[sel.length - 1];
          // inline (openRow é declarado depois deste effect — TDZ): mesmo corpo.
          if (uri) void service.open({ uri }).then(() => tick.bump(), () => tick.bump());
        },
      }),
      menus.register({
        id: 'explorer.rename', title: 'Rename...',
        run: () => {
          const sel = service.getSelection();
          beginRename(sel[sel.length - 1]);
        },
      }),
      menus.register({
        id: 'explorer.delete', title: 'Delete',
        run: () => {
          const sel = service.getSelection();
          if (sel.length === 0) return;
          void service.remove({ uris: sel, useTrash: false }).then(() => undefined, () => undefined);
        },
      }),
      menus.register({
        id: 'explorer.cut', title: 'Cut',
        run: () => {
          const sel = service.getSelection();
          if (sel.length > 0) service.cut({ uris: sel });
        },
      }),
      menus.register({
        id: 'explorer.copy', title: 'Copy',
        run: () => {
          const sel = service.getSelection();
          if (sel.length > 0) service.copy({ uris: sel });
        },
      }),
      menus.register({
        id: 'explorer.paste', title: 'Paste',
        run: () => {
          const sel = service.getSelection()[0];
          const item = sel ? service.findItem(sel) : null;
          const target = item ? service.resolveCreateParent(item.resource) : service.getRootItem()?.resource;
          if (!target) return;
          void service.paste({ target }).then(() => undefined, () => undefined);
        },
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [menus, beginCreate, refreshAll, collapseAll, downloadSelection, service, beginRename, tick]);

  // ---- inline create/rename ----
  const commitInline = React.useCallback((value: string) => {
    const edit = inlineEdit;
    if (!edit) return;
    if (!value) {
      setInlineEdit({ ...edit, error: 'Nome não pode ficar vazio.' });
      return;
    }
    if (value.includes('/') || value.includes('\\')) {
      setInlineEdit({ ...edit, error: 'Nome não pode conter "/" ou "\\".' });
      return;
    }
    void (async () => {
      try {
        if (edit.mode === 'rename' && edit.targetUri) {
          await service.rename({ uri: edit.targetUri, newName: value });
        } else if (edit.mode === 'create-file') {
          await service.createFile({ uri: uriJoinPath(edit.parentUri, value) });
        } else {
          await service.createFolder({ uri: uriJoinPath(edit.parentUri, value) });
        }
        setInlineEdit(null);
      } catch (err) {
        if (err instanceof ExplorerCreateConflictError) {
          setInlineEdit({ ...edit, error: `Já existe um arquivo ou pasta chamado “${value}” aqui.` });
        } else if (err instanceof ExplorerRenameConflictError) {
          setInlineEdit({ ...edit, error: `Já existe “${value}” nesta pasta.` });
        } else {
          setInlineEdit({ ...edit, error: (err as Error)?.message ?? String(err) });
        }
      }
      tick.bump();
    })();
  }, [inlineEdit, service, tick]);

  const cancelInline = React.useCallback(() => setInlineEdit(null), []);

  // ---- seleção/abertura/teclado ----
  const openRow = React.useCallback((uri: WorkspaceUri) => {
    void service.open({ uri }).then(() => tick.bump(), () => tick.bump());
  }, [service, tick]);

  const selectRows = React.useCallback((uris: WorkspaceUri[], additive: boolean) => {
    const cur = service.getSelection();
    const next = additive ? [...cur, ...uris.filter((u) => !cur.includes(u))] : uris;
    service.select({ uris: next });
    tick.bump();
  }, [service, tick]);

  const onKeyDown = React.useCallback((ev: React.KeyboardEvent) => {
    const sel = service.getSelection();
    const focused = sel[sel.length - 1];
    const flat = service.getVisibleRows();
    if (ev.key === 'F2' && focused) {
      ev.preventDefault();
      const f = flat.find((r) => r.item.resource === focused);
      setInlineEdit({
        mode: 'rename', parentUri: uriDirname(focused), targetUri: focused, depth: f?.depth ?? 0,
      });
      return;
    }
    if (ev.key === 'Enter' && focused) {
      ev.preventDefault();
      openRow(focused);
      return;
    }
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const idx = flat.findIndex((r) => r.item.resource === focused);
      const nextIdx = ev.key === 'ArrowDown'
        ? Math.min(flat.length - 1, Math.max(0, idx + 1))
        : Math.max(0, idx - 1);
      const next = flat[nextIdx];
      if (next) selectRows([next.item.resource], false);
      return;
    }
    if (ev.key === 'ArrowRight' && focused) {
      const item = service.findItem(focused);
      if (item?.isDirectory && !service.isExpandedUri(focused)) {
        ev.preventDefault();
        void service.expand({ uri: focused }).then(() => tick.bump());
      }
      return;
    }
    if (ev.key === 'ArrowLeft' && focused) {
      const item = service.findItem(focused);
      if (item?.isDirectory && service.isExpandedUri(focused)) {
        ev.preventDefault();
        void service.collapse({ uri: focused }).then(() => tick.bump());
      } else if (item?.parent && item.parent !== service.getRootItem()) {
        ev.preventDefault();
        selectRows([item.parent.resource], false);
      }
      return;
    }
    if (ev.key === 'Escape') {
      if (abortRef.current) {
        abortRef.current.abort();
        setTransferStatus(null);
      }
      setDropTargetUri(null);
    }
  }, [service, tick, openRow, selectRows]);

  // ---- DnD ----
  const buildData = React.useCallback((ev: React.DragEvent): DndData | null => {
    const dt = ev.dataTransfer;
    if (!dt) return null;
    // internos: dados vivos no ref (setData é opaco durante o dragover);
    // externos (OS): o tipo `Files` identifica o drop do sistema operacional.
    if (dragData.current?.kind === 'internal') return dragData.current;
    if (dt.types.includes('Files')) return { kind: 'external', uris: [], hasFiles: true };
    return null;
  }, []);

  const dndCtx = React.useCallback((ev: React.DragEvent | React.MouseEvent) => ({
    ctrlKey: ev.ctrlKey, altKey: ev.altKey,
    isMacintosh: typeof navigator !== 'undefined' && /mac/i.test(navigator.platform),
  }), []);

  const onItemDragStart = React.useCallback((uris: WorkspaceUri[], ev: React.DragEvent) => {
    const items = uris
      .map((u) => service.findItem(u))
      .filter((i): i is NonNullable<typeof i> => i != null);
    dragData.current = { kind: 'internal', items };
    ev.dataTransfer.setData(DND_MIME, JSON.stringify(uris));
    ev.dataTransfer.effectAllowed = 'copyMove';
  }, [service]);

  const onItemDragOver = React.useCallback((uri: WorkspaceUri | null, ev: React.DragEvent) => {
    const data = buildData(ev);
    if (!data) return;
    const targetItem = uri ? service.findItem(uri) : service.getRootItem();
    const decision = decideDragOver(data, targetItem ?? null, dndCtx(ev));
    dragOverDecision.current = decision.accept ? decision : null;
    if (decision.accept) {
      ev.preventDefault();
      ev.stopPropagation();
      ev.dataTransfer.dropEffect = decision.effect === 'copy' ? 'copy' : 'move';
      const resolved = resolveDropTarget(targetItem ?? null) ?? service.getRootItem();
      setDropTargetUri(resolved?.resource ?? null);
      (ev.currentTarget as HTMLElement).dataset.dropTarget = resolved?.resource ?? '';
    } else {
      setDropTargetUri(null);
    }
  }, [buildData, dndCtx, service]);

  const onItemDrop = React.useCallback((ev: React.DragEvent) => {
    const data = buildData(ev);
    const targetEl = (ev.target as HTMLElement).closest('[data-uri]') as HTMLElement | null;
    const targetItem = targetEl?.dataset.uri
      ? service.findItem(targetEl.dataset.uri as WorkspaceUri)
      : service.getRootItem();
    const decision = decideDragOver(data as DndData, targetItem ?? null, dndCtx(ev));
    ev.preventDefault();
    ev.stopPropagation();
    setDropTargetUri(null);
    dragOverDecision.current = null;
    if (!data || !decision.accept) return;
    const plan = planDrop(data, decision, targetItem ?? null);
    if (!plan) return;

    if (plan.kind === 'move' || plan.kind === 'copy') {
      const uris = plan.sources.map((s) => s.resource);
      void (async () => {
        try {
          if (plan.kind === 'move') {
            service.cut({ uris });
            await service.paste({ target: plan.target.resource });
          } else {
            service.copy({ uris });
            await service.paste({ target: plan.target.resource });
          }
        } catch { /* erro do serviço já emite evento 'error' */ }
        dragData.current = null;
        tick.bump();
      })();
      return;
    }

    // ---- drop do SO → upload (A4.1/A4.2/A4.3) ----
    const ac = new AbortController();
    abortRef.current = ac;
    setTransferStatus({ kind: 'upload', text: 'Lendo itens arrastados…' });
    void (async () => {
      try {
        const records = await collectDroppedFiles(ev.dataTransfer.items);
        if (records.length === 0) return;
        const result = await uploadFiles({
          fs,
          target: plan.target.resource,
          records,
          baseUrl,
          conflict: 'ask',
          askConflict: ({ name }) =>
            new Promise<'replace' | 'skip' | 'cancel'>((resolve) => {
              setConflict({ name, resolve });
            }),
          onProgress: (p) =>
            setTransferStatus({
              kind: 'upload',
              text: p.filesTotal === 1
                ? `Enviando ${p.currentName}…`
                : `Enviando ${p.filesDone}/${p.filesTotal} — ${p.currentName}`,
            }),
          signal: ac.signal,
        });
        if (result.filesCreated > 0) await service.refresh({ uri: plan.target.resource });
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
      dragData.current = null;
    })();
  }, [buildData, dndCtx, fs, baseUrl, service, tick]);

  const onItemDragEnd = React.useCallback(() => {
    dragData.current = null;
    dragOverDecision.current = null;
    setDropTargetUri(null);
  }, []);

  // ---- outline (mínimo reativo: exibe sujeito — símbolos completos: futuro) ----
  const lastOpened = openEditors[openEditors.length - 1]?.uri ?? null;
  const outlineEntries: OutlineEntry[] = [];
  const selectionName = selection[0] ? uriBasename(selection[0]) : null;

  void version; // dependência do re-render

  return (
    <div className="explorer-view" data-testid="explorer-view" onDragLeave={() => setDropTargetUri(null)}>
      <ExplorerHeader
        onNewFile={() => void menus.execute('explorer.newFile')}
        onNewFolder={() => void menus.execute('explorer.newFolder')}
        onRefresh={() => void menus.execute('explorer.refresh')}
        onCollapseAll={() => void menus.execute('explorer.collapseAll')}
        onMoreActions={openMoreActions}
        disabled={!rootItem}
      />
      <div className="explorer-body">
        {!rootItem ? (
          <div className="explorer-root-status" data-testid="explorer-empty-root">
            Nenhuma pasta aberta.
          </div>
        ) : (
          <>
            <ExplorerTree
              ref={treeRef}
              service={service}
              rows={rows}
              inlineEdit={inlineEdit}
              cutUris={new Set(service.getClipboardState().kind === 'cut' ? service.getClipboardState().uris : [])}
              dropTargetUri={dropTargetUri}
              onOpen={openRow}
              onSelect={selectRows}
              onToggle={openRow}
              onInlineBegin={setInlineEdit}
              onInlineCommit={commitInline}
              onInlineCancel={cancelInline}
              onItemDragStart={onItemDragStart}
              onItemDragOver={onItemDragOver}
              onItemDrop={onItemDrop}
              onItemDragEnd={onItemDragEnd}
              onItemContextMenu={openItemContextMenu}
              onKeyDown={onKeyDown}
            />
            <OpenEditorsSection
              entries={openEditors}
              onActivate={(uri) => void service.open({ uri }).then(() => tick.bump(), () => tick.bump())}
              onClose={(uri) => setOpenEditors((prev) => prev.filter((o) => o.uri !== uri))}
            />
            <TimelineSection subjectName={selectionName} entries={timeline} />
            <OutlineSection
              subjectName={lastOpened ? uriBasename(lastOpened) : selectionName}
              entries={outlineEntries}
            />
          </>
        )}
      </div>
      <div className="explorer-status" data-testid="explorer-status" role="status">
        {transferStatus && (
          <>
            <span>{transferStatus.text}</span>
            {transferStatus.kind === 'upload' && (
              <button
                type="button"
                className="explorer-header-btn"
                title="Cancelar upload"
                aria-label="Cancelar upload"
                onClick={() => abortRef.current?.abort()}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
      {conflict && (
        <ConflictDialog
          state={{
            name: conflict.name,
            resolve: (action) => {
              setConflict(null);
              conflict.resolve(action);
            },
          }}
        />
      )}
    </div>
  );
}
