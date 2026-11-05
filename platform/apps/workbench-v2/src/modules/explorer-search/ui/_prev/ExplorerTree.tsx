// ============================================================================
// modules/explorer-search/ui/ExplorerTree.tsx — Árvore lazy 22 px (4.4)
// Fonte upstream: FilesRenderer + WorkbenchAsyncDataTree (views/explorerView.ts
// :177 + explorerViewer.ts :80 ITEM_HEIGHT=22, :92 ExplorerDataSource).
// A UI NÃO fala com FS: tudo via ExplorerService (04_02 §1). Visual/estado
// apenas: hover/seleção/drop-target vêm do serviço via re-render por eventos.
// ============================================================================

import React from 'react';
import {
  ChevronDown, ChevronRight, Folder, FolderOpen,
  FileText, FileCode, FileJson, File as FileIcon,
} from 'lucide-react';
import type { ExplorerService } from '../../core/explorerService';
import type { ExplorerItem } from '../../core/explorerModel';
import type { WorkspaceUri } from '../../contract';
import { uriJoinPath } from '../../core/uri';

export interface InlineEditState {
  /** create-file/create-folder: parentUri = pasta de destino; rename: targetUri = uri renomeada. */
  mode: 'create-file' | 'create-folder' | 'rename';
  parentUri: WorkspaceUri;
  targetUri?: WorkspaceUri;
  /** depth visual da linha fantasma (para indentar o input). */
  depth: number;
  error?: string;
}

export interface ExplorerTreeProps {
  service: ExplorerService;
  rows: Array<{ item: ExplorerItem; depth: number }>;
  inlineEdit: InlineEditState | null;
  cutUris: ReadonlySet<WorkspaceUri>;
  dropTargetUri: WorkspaceUri | null;
  onOpen: (uri: WorkspaceUri) => void;
  onSelect: (uris: WorkspaceUri[], additive: boolean) => void;
  onToggle: (uri: WorkspaceUri) => void;
  onInlineBegin: (state: InlineEditState | null) => void;
  onInlineCommit: (value: string) => void;
  onInlineCancel: () => void;
  onItemDragStart: (uris: WorkspaceUri[], ev: React.DragEvent) => void;
  onItemContextMenu?: (input: { uri: WorkspaceUri; x: number; y: number }) => void;
  /** Botão direito em área vazia da árvore → menu da raiz (04_18 §4.5 item 5). */
  onTreeContextMenu?: (ev: React.MouseEvent) => void;
  onItemDragOver: (uri: WorkspaceUri | null, ev: React.DragEvent) => void;
  onItemDrop: (ev: React.DragEvent) => void;
  onItemDragEnd: () => void;
  onKeyDown: (ev: React.KeyboardEvent) => void;
}

function fileIcon(name: string): React.ReactElement {
  const lower = name.toLowerCase();
  if (/\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(lower)) return <FileCode size={16} />;
  if (lower === 'package.json' || /\.json[5c]?$/.test(lower)) return <FileJson size={16} />;
  if (/\.(md|markdown|txt)$/.test(lower)) return <FileText size={16} />;
  return <FileIcon size={16} />;
}

const INDENT = 8; // px por nível (04_01 §3: indentação ~8–10 px)

export const ExplorerTree = React.forwardRef<HTMLDivElement, ExplorerTreeProps>(function ExplorerTree(
  props, ref,
): React.ReactElement {
  const { service, rows, inlineEdit } = props;

  const renderRow = (row: { item: ExplorerItem; depth: number }) => {
    const { item, depth } = row;
    const selected = service.getSelection().includes(item.resource);
    const isDir = item.isDirectory;
    const expanded = isDir && service.isExpandedUri(item.resource);
    const isCut = props.cutUris.has(item.resource);
    const isDropTarget = props.dropTargetUri === item.resource;
    const depthPad = depth * INDENT + 16;

    if (inlineEdit?.mode === 'rename' && inlineEdit.targetUri === item.resource) {
      return (
        <InlineEditRow
          key={item.resource}
          depth={depth}
          basePad={depthPad}
          defaultValue={item.name}
          icon={isDir ? <Folder size={16} /> : fileIcon(item.name)}
          error={inlineEdit.error}
          onCommit={props.onInlineCommit}
          onCancel={props.onInlineCancel}
        />
      );
    }

    return (
      <div
        key={item.resource}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={isDir ? expanded : undefined}
        data-uri={item.resource}
        data-kind={isDir ? 'directory' : 'file'}
        className={[
          'explorer-row',
          isDir ? 'has-children' : '',
          selected ? 'is-selected' : '',
          isCut ? 'is-cut' : '',
          isDropTarget ? 'is-drop-target' : '',
        ].filter(Boolean).join(' ')}
        style={{ paddingLeft: depthPad }}
        draggable
        onDragStart={(ev) => props.onItemDragStart(
          selected && service.getSelection().length > 1 ? service.getSelection() : [item.resource],
          ev,
        )}
        onDragOver={(ev) => props.onItemDragOver(item.resource, ev)}
        onDrop={props.onItemDrop}
        onDragEnd={props.onItemDragEnd}
        onClick={(ev) => {
          ev.stopPropagation();
          if (ev.ctrlKey || ev.metaKey) {
            props.onSelect([item.resource], true);
          } else {
            props.onOpen(item.resource);
          }
        }}
        onContextMenu={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          // Fora da seleção atual: clique direito move a seleção pro item (VS Code).
          if (!service.getSelection().includes(item.resource)) props.onSelect([item.resource], false);
          props.onItemContextMenu?.({ uri: item.resource, x: ev.clientX, y: ev.clientY });
        }}
      >
        {isDir ? (
          <span className="explorer-row-chevron" aria-hidden>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        ) : (
          <span className="explorer-row-chevron" aria-hidden />
        )}
        <span className="explorer-row-icon" aria-hidden>
          {isDir ? (expanded ? <FolderOpen size={16} /> : <Folder size={16} />) : fileIcon(item.name)}
        </span>
        <span className="explorer-row-label" title={item.name}>{item.name}</span>
      </div>
    );
  };

  const createGhost = (inlineEdit?.mode === 'create-file' || inlineEdit?.mode === 'create-folder') ? (
    <InlineEditRow
      key="inline-ghost"
      depth={inlineEdit.depth}
      basePad={inlineEdit.depth * INDENT + 16}
      defaultValue=""
      placeholder={inlineEdit.mode === 'create-file' ? 'arquivo.txt' : 'pasta'}
      icon={inlineEdit.mode === 'create-file' ? <FileIcon size={16} /> : <Folder size={16} />}
      error={inlineEdit.error}
      onCommit={props.onInlineCommit}
      onCancel={props.onInlineCancel}
    />
  ) : null;

  // Posiciona a linha fantasma logo após a pasta de destino (VS Code: input
  // aparece dentro da pasta alvo — 04_01/prints), não no fim da árvore.
  const rendered: React.ReactNode[] = [];
  let ghostPlaced = false;
  for (const row of rows) {
    rendered.push(renderRow(row));
    if (createGhost && inlineEdit && row.item.resource === inlineEdit.parentUri) {
      rendered.push(createGhost);
      ghostPlaced = true;
    }
  }
  if (createGhost && !ghostPlaced) rendered.push(createGhost);

  return (
    <div
      ref={ref}
      role="tree"
      aria-label="Explorer"
      tabIndex={0}
      className="explorer-tree"
      onKeyDown={props.onKeyDown}
      onContextMenu={props.onTreeContextMenu}
      onDragOver={(ev) => props.onItemDragOver(null, ev)}
      onDrop={props.onItemDrop}
    >
      {rendered}
    </div>
  );
});

interface InlineEditRowProps {
  depth: number;
  basePad: number;
  defaultValue: string;
  placeholder?: string;
  icon: React.ReactElement;
  error?: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}

function InlineEditRow({
  basePad, defaultValue, placeholder, icon, error,
  onCommit, onCancel,
}: InlineEditRowProps): React.ReactElement {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (defaultValue) {
      // renomear: seleciona o stem (sem extensão) — igual VS Code
      const dot = defaultValue.lastIndexOf('.');
      el.setSelectionRange(0, dot > 0 ? dot : defaultValue.length);
    }
  }, [defaultValue]);

  return (
    <div className="explorer-row" style={{ paddingLeft: basePad }} data-inline-edit="true">
      <span className="explorer-row-chevron" aria-hidden />
      <span className="explorer-row-icon" aria-hidden>{icon}</span>
      <div style={{ flex: 1 }}>
        <input
          ref={ref}
          type="text"
          className={`explorer-inline-input${error ? ' is-error' : ''}`}
          defaultValue={defaultValue}
          placeholder={placeholder}
          aria-label="Nome"
          data-testid="explorer-inline-input"
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') onCommit((ev.target as HTMLInputElement).value.trim());
            else if (ev.key === 'Escape') onCancel();
            ev.stopPropagation();
          }}
          onBlur={onCancel}
        />
        {error && <div className="explorer-inline-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

export function joinUriUnderParent(parent: WorkspaceUri, name: string): WorkspaceUri {
  return uriJoinPath(parent, name);
}
