// ============================================================================
// ui/search/SearchResults.tsx — 4.6 c4. Porta da árvore de resultados do
// `searchView.ts:128` (renderers FileMatch/Match do `searchResultsView.ts`).
// DOM igual ao original (monaco-list > monaco-list-row > monaco-tl-row >
// indent + twistie + contents{filematch|linematch}) para reaproveitar o CSS
// de árvore da 4.4 (explorer.css) e a comparação lado a lado.
// Medido no 8080 (auditoria_46/, 2026-09-26):
//   nível 1: indent 0, twistie `padding-left 8px` (codicon tree-item-expanded,
//            collapsible force-twistie), .monaco-icon-label (Seti) + .label-name
//            + .label-description (0.9em, opacity .95) + .monaco-count-badge
//            18×18 padding 3px 5px radius 11 margin-right 12;
//   nível 2: indent 8 (indent-guide), twistie `padding-left 16px` (vazio),
//            .linematch > .matchLineNum + a.plain.match > span(before, opacity .7)
//            + span.findInFileMatch + span.replaceMatch + span(after).
// Teclado (searchView/listWidget): ↓ do input → lista; ↑↓ Home End; ←/→
// recolhe/expande arquivo; Enter/Space alterna arquivo ou abre match (c6);
// Esc → volta ao input.
// ============================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchMatch, WorkspaceUri } from '../../contract';
import { groupMatchesByFile, type FileMatchGroup } from '../../core/search/model';

export interface SearchResultsProps {
  matches: SearchMatch[];
  root: WorkspaceUri;
  /** Comprimento do termo casado em cada match (para recortar o preview). */
  matchLengthOf: (m: SearchMatch) => number;
  onOpenMatch?: (m: SearchMatch) => void;
  onEscape?: () => void;
  /** c5 — replace aberto: preview riscado + `.replaceMatch` + ação Replace. */
  replaceActive?: boolean;
  /** Texto que a ocorrência vira (preview do `.replaceMatch`). */
  replacementOf?: (m: SearchMatch) => string;
  onReplaceMatch?: (m: SearchMatch) => void;
  onReplaceFile?: (g: FileMatchGroup) => void;
  onDismissMatch?: (m: SearchMatch) => void;
  onDismissFile?: (g: FileMatchGroup) => void;
  /** Incrementa para focar a lista (↓ vindo do input). */
  focusRequest?: number;
}

type Row =
  | { kind: 'file'; key: string; group: FileMatchGroup; expanded: boolean }
  | { kind: 'match'; key: string; group: FileMatchGroup; match: SearchMatch };

function iconLabelClasses(name: string): string {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  const ext = dot > 0 ? lower.slice(dot + 1) : dot === 0 ? lower.slice(1) : '';
  const extCls = ext ? `${ext}-ext-file-icon ext-file-icon` : '';
  return `monaco-icon-label file-icon ${lower}-name-file-icon name-file-icon ${extCls}`.replace(/\s+/g, ' ').trim();
}

/** searchResultsView.ts (MatchRenderer): trecho antes limitado a 26 chars com
 *  reticência (`preview.before` → `lcut(before, 26, '…')`). */
const BEFORE_MAX = 26;
function splitPreview(m: SearchMatch, len: number): { before: string; hit: string; after: string } {
  const col = Math.max(0, m.column - 1);
  let before = m.preview.slice(0, col);
  const hit = m.preview.slice(col, col + len);
  const after = m.preview.slice(col + len);
  if (before.length > BEFORE_MAX) before = `…${before.slice(before.length - BEFORE_MAX)}`;
  return { before, hit, after };
}

/** `.actionBarContainer > .monaco-toolbar > .monaco-action-bar` do renderer
 *  (searchResultsView.ts) — a.action-label 20×20 padding 2 radius 6 font 16
 *  (medido 8080). `visibility` controlada por hover/focus no CSS. */
function RowActions({ items }: { items: Array<{ cls: string; label: string; onClick: () => void }> }) {
  return (
    <span className="actionBarContainer">
      <div className="monaco-toolbar">
        <div className="monaco-action-bar">
          <ul className="actions-container" role="toolbar">
            {items.map((it) => (
              <li key={it.cls} className="action-item menu-entry" role="presentation">
                <a
                  className={`action-label codicon ${it.cls}`}
                  role="button"
                  aria-label={it.label}
                  title={it.label}
                  tabIndex={-1}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); it.onClick(); }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </span>
  );
}

export function SearchResults({
  matches, root, matchLengthOf, onOpenMatch, onEscape, focusRequest,
  replaceActive = false, replacementOf, onReplaceMatch, onReplaceFile, onDismissMatch, onDismissFile,
}: SearchResultsProps) {
  const groups = useMemo(() => groupMatchesByFile(matches, root), [matches, root]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // nova busca → estado de colapso zera (o modelo é recriado no upstream); o
  // índice de foco só é limitado (após Dismiss/Replace o foco cai no vizinho)
  useEffect(() => { setCollapsed(new Set()); }, [matches]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const g of groups) {
      const expanded = !collapsed.has(g.uri);
      out.push({ kind: 'file', key: g.uri, group: g, expanded });
      if (expanded) for (const m of g.matches) out.push({ kind: 'match', key: `${m.uri}:${m.line}:${m.column}`, group: g, match: m });
    }
    return out;
  }, [groups, collapsed]);

  useEffect(() => { setFocusIndex((i) => Math.max(0, Math.min(i, rows.length - 1))); }, [rows.length]);

  const toggle = useCallback((uri: WorkspaceUri, force?: boolean) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      const isCollapsed = next.has(uri);
      const shouldCollapse = force === undefined ? !isCollapsed : force;
      if (shouldCollapse) next.add(uri); else next.delete(uri);
      return next;
    });
  }, []);

  useEffect(() => {
    if (focusRequest === undefined || focusRequest === 0) return;
    listRef.current?.focus();
    setFocusIndex((i) => Math.min(i, Math.max(0, rows.length - 1)));
  }, [focusRequest, rows.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('.monaco-list-row.focused');
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusIndex, rows]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const row = rows[focusIndex];
    const clamp = (i: number) => Math.max(0, Math.min(rows.length - 1, i));
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setFocusIndex((i) => clamp(i + 1)); break;
      case 'ArrowUp': e.preventDefault(); setFocusIndex((i) => clamp(i - 1)); break;
      case 'Home': e.preventDefault(); setFocusIndex(0); break;
      case 'End': e.preventDefault(); setFocusIndex(clamp(rows.length - 1)); break;
      case 'PageDown': e.preventDefault(); setFocusIndex((i) => clamp(i + 10)); break;
      case 'PageUp': e.preventDefault(); setFocusIndex((i) => clamp(i - 10)); break;
      case 'ArrowLeft':
        e.preventDefault();
        if (!row) break;
        if (row.kind === 'file' && row.expanded) toggle(row.group.uri, true);
        else if (row.kind === 'match') setFocusIndex(rows.findIndex((r) => r.kind === 'file' && r.group.uri === row.group.uri));
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (row?.kind === 'file' && !row.expanded) toggle(row.group.uri, false);
        else if (row?.kind === 'file') setFocusIndex((i) => clamp(i + 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (row?.kind === 'file') toggle(row.group.uri);
        else if (row?.kind === 'match') onOpenMatch?.(row.match);
        break;
      case 'Escape':
        e.preventDefault();
        onEscape?.();
        break;
      case 'Delete':
      case 'Backspace': // searchActions: search.action.remove (Del / Shift+Backspace… aceitamos Backspace como no Mac)
        e.preventDefault();
        if (row?.kind === 'file') onDismissFile?.(row.group);
        else if (row?.kind === 'match') onDismissMatch?.(row.match);
        break;
      case '1':
      case '!':
        // Ctrl+Shift+1 → search.action.replace / replaceAllInFile
        if (!(e.ctrlKey && e.shiftKey) || !replaceActive) return;
        e.preventDefault();
        if (row?.kind === 'file') onReplaceFile?.(row.group);
        else if (row?.kind === 'match') onReplaceMatch?.(row.match);
        break;
      default:
        return;
    }
  };

  if (rows.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="monaco-list mouse-support selection-none file-icon-themable-tree show-file-icons search-results-tree"
      role="tree"
      aria-label="Search Results"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="monaco-list-rows">
        {rows.map((r, i) => {
          const focused = i === focusIndex;
          if (r.kind === 'file') {
            const g = r.group;
            return (
              <div
                key={r.key}
                className={`monaco-list-row${focused ? ' focused' : ''}`}
                role="treeitem"
                aria-level={1}
                aria-expanded={r.expanded}
                aria-label={`${g.name} ${g.folder} ${g.matches.length} matches`}
                data-index={i}
                onMouseDown={() => setFocusIndex(i)}
                onClick={() => toggle(g.uri)}
              >
                <div className="monaco-tl-row">
                  <div className="monaco-tl-indent" style={{ width: 0 }} />
                  <div className={`monaco-tl-twistie codicon ${r.expanded ? 'codicon-tree-item-expanded' : 'codicon-tree-item-expanded collapsed'} collapsible force-twistie`} style={{ paddingLeft: 8 }} />
                  <div className="monaco-tl-contents">
                    <div className="filematch" data-resource={g.uri}>
                      <div className={iconLabelClasses(g.name)} title={g.uri}>
                        <div className="monaco-icon-label-container">
                          <span className="monaco-icon-name-container"><a className="label-name">{g.name}</a></span>
                          {g.folder && <span className="monaco-icon-description-container"><span className="label-description">{g.folder}</span></span>}
                        </div>
                      </div>
                      <div className="monaco-count-badge" aria-label={`${g.matches.length} matches`}>{g.matches.length}</div>
                      <RowActions items={[
                        ...(replaceActive ? [{ cls: 'codicon-search-replace', label: 'Replace All (Ctrl+Shift+1)', onClick: () => onReplaceFile?.(g) }] : []),
                        { cls: 'codicon-search-remove', label: 'Dismiss (Del)', onClick: () => onDismissFile?.(g) },
                      ]} />
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          const m = r.match;
          const { before, hit, after } = splitPreview(m, matchLengthOf(m));
          return (
            <div
              key={r.key}
              className={`monaco-list-row${focused ? ' focused' : ''}`}
              role="treeitem"
              aria-level={2}
              aria-label={`${m.preview.trim()} line ${m.line} column ${m.column}`}
              data-index={i}
              data-line={m.line}
              data-column={m.column}
              onMouseDown={() => setFocusIndex(i)}
              onClick={() => onOpenMatch?.(m)}
            >
              <div className="monaco-tl-row">
                <div className="monaco-tl-indent" style={{ width: 8 }}><div className="indent-guide" style={{ width: 8 }} /></div>
                <div className="monaco-tl-twistie" style={{ paddingLeft: 16 }} />
                <div className="monaco-tl-contents linematch">
                  <span className="matchLineNum" />
                  <a className="plain match" title={m.preview.trim()}>
                    <span>{before}</span>
                    <span className={`findInFileMatch${replaceActive ? ' replace' : ''}`}>{hit}</span>
                    <span className="replaceMatch">{replaceActive ? replacementOf?.(m) ?? '' : ''}</span>
                    <span>{after}</span>
                  </a>
                  <RowActions items={[
                    ...(replaceActive ? [{ cls: 'codicon-search-replace', label: 'Replace (Ctrl+Shift+1)', onClick: () => onReplaceMatch?.(m) }] : []),
                    { cls: 'codicon-search-remove', label: 'Dismiss (Del)', onClick: () => onDismissMatch?.(m) },
                  ]} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
