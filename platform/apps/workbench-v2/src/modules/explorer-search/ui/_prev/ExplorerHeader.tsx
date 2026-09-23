// ============================================================================
// modules/explorer-search/ui/ExplorerHeader.tsx — Título + 5 botões do vídeo
// (04_01 §2 — mesmos tooltips/aria-labels do explorerView.ts upstream:
// "New File...", "New Folder...", "Refresh Explorer",
//  "Collapse Folders in Explorer", "More Actions...").
// Ações NÃO executam lógica própria: disparam via callbacks injetados pela
// View (que delega ao CommandRegistry/service — separação 04_02 §1).
// ============================================================================

import React from 'react';
import { FilePlus, FolderPlus, RefreshCw, ChevronsDownUp, MoreHorizontal } from 'lucide-react';

export interface ExplorerHeaderProps {
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
  onCollapseAll: () => void;
  onMoreActions: (anchor: DOMRect) => void;
  disabled?: boolean;
}

export function ExplorerHeader({
  onNewFile, onNewFolder, onRefresh, onCollapseAll, onMoreActions, disabled,
}: ExplorerHeaderProps): React.ReactElement {
  return (
    <div className="explorer-header">
      <span className="explorer-header-title">Explorer</span>
      <div className="explorer-header-actions" role="toolbar" aria-label="Explorer actions">
        <button
          type="button"
          className="explorer-header-btn"
          title="New File..."
          aria-label="New File..."
          onClick={onNewFile}
          disabled={disabled}
          data-testid="explorer-new-file"
        >
          <FilePlus size={16} />
        </button>
        <button
          type="button"
          className="explorer-header-btn"
          title="New Folder..."
          aria-label="New Folder..."
          onClick={onNewFolder}
          disabled={disabled}
          data-testid="explorer-new-folder"
        >
          <FolderPlus size={16} />
        </button>
        <button
          type="button"
          className="explorer-header-btn"
          title="Refresh Explorer"
          aria-label="Refresh Explorer"
          onClick={onRefresh}
          disabled={disabled}
          data-testid="explorer-refresh"
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          className="explorer-header-btn"
          title="Collapse Folders in Explorer"
          aria-label="Collapse Folders in Explorer"
          onClick={onCollapseAll}
          disabled={disabled}
          data-testid="explorer-collapse-all"
        >
          <ChevronsDownUp size={16} />
        </button>
        <button
          type="button"
          className="explorer-header-btn"
          title="More Actions..."
          aria-label="More Actions..."
          onClick={(e) => onMoreActions((e.currentTarget as HTMLElement).getBoundingClientRect())}
          disabled={disabled}
          data-testid="explorer-overflow"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}
