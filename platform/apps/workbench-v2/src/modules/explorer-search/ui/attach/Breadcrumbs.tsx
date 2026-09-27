// ============================================================================
// ui/attach/Breadcrumbs.tsx — 4.7 c3. `breadcrumbsControl.ts`: faixa 22 px sob
// as abas, um item por segmento do caminho RELATIVO à raiz do workspace,
// separador `codicon-breadcrumb-separator` (chevron-right), último item com
// ícone Seti. Picker (dropdown ao clicar) é débito 4.7-c (D2.23).
// ============================================================================
import React from 'react';
import type { WorkspaceUri } from '../../contract';
import { uriPath, uriRelative } from '../../core/uri';
import { fileIconLabelClasses } from './fileIconClasses';

export function breadcrumbSegments(root: WorkspaceUri, uri: WorkspaceUri): string[] {
  const rel = uriRelative(root, uri);
  const path = rel !== undefined && rel !== '' ? rel : uriPath(uri);
  return path.split('/').filter(Boolean);
}

export function Breadcrumbs({ root, uri }: { root: WorkspaceUri; uri: WorkspaceUri }) {
  const segs = breadcrumbSegments(root, uri);
  return (
    <div className="breadcrumbs-control" data-testid="attach-breadcrumbs">
      <div className="monaco-breadcrumbs" role="list" aria-label="Breadcrumbs">
        {segs.map((seg, i) => {
          const last = i === segs.length - 1;
          return (
            <React.Fragment key={`${i}-${seg}`}>
              <div className={`monaco-breadcrumb-item${last ? ' focused' : ''}`} role="listitem" title={seg}>
                {last ? (
                  <div className={fileIconLabelClasses(seg)}>
                    <span className="monaco-icon-label-container"><span className="monaco-icon-name-container"><a className="label-name">{seg}</a></span></span>
                  </div>
                ) : (
                  <div className="monaco-icon-label">
                    <span className="monaco-icon-label-container"><span className="monaco-icon-name-container"><a className="label-name">{seg}</a></span></span>
                  </div>
                )}
              </div>
              {!last && <span className="codicon codicon-breadcrumb-separator" aria-hidden="true" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
