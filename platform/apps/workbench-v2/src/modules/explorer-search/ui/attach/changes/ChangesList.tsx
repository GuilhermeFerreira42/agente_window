// ============================================================================
// ui/attach/changes/ChangesList.tsx — virtualized Source Control View.
// The complete GitService model remains authoritative; only the DOM window is
// bounded. Stable row identities preserve focus/actions while the viewport moves.
// ============================================================================
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { GitGroupId, GitResourceGroup, GitResourceItem, GitServiceState } from '../../../core/git/gitService';
import { fileIconLabelClasses } from '../fileIconClasses';
import { CHANGES_STRINGS as S } from './changesStrings';
import { getScmVirtualRange, SCM_ROW_HEIGHT } from './changesViewport';

export type ResourceActionId = 'stage' | 'unstage' | 'discard';
export type GroupActionId = 'stage-all' | 'unstage-all' | 'discard-all';

export interface ChangesListProps {
  state: GitServiceState;
  repoName: string;
  onRefresh: () => void;
  /** 4.7-c: deletados também abrem (diff com lado modificado vazio). */
  onOpen: (item: GitResourceItem, group: GitGroupId) => void;
  onAction: (action: ResourceActionId, item: GitResourceItem) => void;
  onGroupAction: (action: GroupActionId, group: GitResourceGroup) => void;
}

interface ActionSpec { id: string; icon: string; title: string; run: () => void; testId: string }
type LogicalRow =
  | { kind: 'provider'; key: 'provider'; index: number }
  | { kind: 'group'; key: string; index: number; group: GitResourceGroup; groupIndex: number }
  | { kind: 'resource'; key: string; index: number; group: GitResourceGroup; item: GitResourceItem; groupIndex: number; itemIndex: number }
  | { kind: 'empty'; key: 'empty'; index: number };
interface FocusTarget { rowKey: string; actionId?: string }
interface ViewportMetrics { scrollTop: number; height: number }

function makeRows(groups: GitResourceGroup[], loading: boolean): LogicalRow[] {
  const rows: LogicalRow[] = [{ kind: 'provider', key: 'provider', index: 0 }];
  groups.forEach((group, groupIndex) => {
    rows.push({ kind: 'group', key: `group:${group.id}`, index: rows.length, group, groupIndex });
    group.items.forEach((item, itemIndex) => {
      rows.push({
        kind: 'resource', key: `resource:${group.id}:${item.uri}`, index: rows.length,
        group, item, groupIndex, itemIndex,
      });
    });
  });
  const total = groups.reduce((n, group) => n + group.items.length, 0);
  if (total === 0 && !loading) rows.push({ kind: 'empty', key: 'empty', index: rows.length });
  return rows;
}

function ActionBar({ actions }: { actions: ActionSpec[] }) {
  return (
    <div className="actions">
      <div className="monaco-toolbar"><div className="monaco-action-bar"><ul className="actions-container" role="toolbar">
        {actions.map((a) => (
          <li key={a.id} className="action-item" role="presentation">
            <a className={`action-label codicon ${a.icon}`} role="button" tabIndex={0} title={a.title} aria-label={a.title}
              data-testid={a.testId} data-action-id={a.id}
              onClick={(e) => { e.stopPropagation(); a.run(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); a.run(); } }} />
          </li>
        ))}
      </ul></div></div>
    </div>
  );
}

function groupActions(group: GitResourceGroup, onGroupAction: ChangesListProps['onGroupAction']): ActionSpec[] {
  if (group.items.length === 0) return [];
  if (group.id === 'index') return [{ id: 'unstage-all', icon: 'codicon-remove', title: S.unstageAll, testId: 'scm-group-unstage-all', run: () => onGroupAction('unstage-all', group) }];
  return [
    { id: 'discard-all', icon: 'codicon-discard', title: S.discardAll, testId: 'scm-group-discard-all', run: () => onGroupAction('discard-all', group) },
    { id: 'stage-all', icon: 'codicon-add', title: S.stageAll, testId: 'scm-group-stage-all', run: () => onGroupAction('stage-all', group) },
  ];
}

function resourceActions(groupId: GitGroupId, item: GitResourceItem, onAction: ChangesListProps['onAction']): ActionSpec[] {
  if (groupId === 'index') return [{ id: 'unstage', icon: 'codicon-remove', title: S.unstage, testId: 'scm-action-unstage', run: () => onAction('unstage', item) }];
  const acts: ActionSpec[] = [];
  if (item.letter !== '!') acts.push({ id: 'discard', icon: 'codicon-discard', title: S.discard, testId: 'scm-action-discard', run: () => onAction('discard', item) });
  acts.push({ id: 'stage', icon: 'codicon-add', title: S.stage, testId: 'scm-action-stage', run: () => onAction('stage', item) });
  return acts;
}

function actionIds(row: LogicalRow): string[] {
  if (row.kind === 'provider') return ['refresh'];
  if (row.kind === 'group') {
    if (row.group.items.length === 0) return [];
    return row.group.id === 'index' ? ['unstage-all'] : ['discard-all', 'stage-all'];
  }
  if (row.kind !== 'resource') return [];
  if (row.group.id === 'index') return ['unstage'];
  return row.item.letter === '!' ? ['stage'] : ['discard', 'stage'];
}

function nextRowIndex(rows: LogicalRow[], from: number, direction: 1 | -1): number {
  for (let index = from; index >= 0 && index < rows.length; index += direction) {
    if (rows[index].kind !== 'empty') return index;
  }
  return -1;
}

/** Computes the adjacent logical Tab stop without allocating N action targets. */
function adjacentTabTarget(rows: LogicalRow[], current: FocusTarget, reverse: boolean): FocusTarget | undefined {
  const index = rows.findIndex((row) => row.key === current.rowKey);
  if (index < 0) return undefined;
  const row = rows[index];
  const actions = actionIds(row);
  if (!reverse) {
    if (!current.actionId) {
      if (actions.length > 0) return { rowKey: row.key, actionId: actions[0] };
      const next = nextRowIndex(rows, index + 1, 1);
      return next < 0 ? undefined : { rowKey: rows[next].key };
    }
    const actionIndex = actions.indexOf(current.actionId);
    if (actionIndex >= 0 && actionIndex + 1 < actions.length) return { rowKey: row.key, actionId: actions[actionIndex + 1] };
    const next = nextRowIndex(rows, index + 1, 1);
    return next < 0 ? undefined : { rowKey: rows[next].key };
  }
  if (current.actionId) {
    const actionIndex = actions.indexOf(current.actionId);
    if (actionIndex > 0) return { rowKey: row.key, actionId: actions[actionIndex - 1] };
    return { rowKey: row.key };
  }
  const previous = nextRowIndex(rows, index - 1, -1);
  if (previous < 0) return undefined;
  const previousRow = rows[previous];
  const previousActions = actionIds(previousRow);
  return previousActions.length > 0
    ? { rowKey: previousRow.key, actionId: previousActions[previousActions.length - 1] }
    : { rowKey: previousRow.key };
}

function rowDomId(rowKey: string): string {
  return `scm-row-${encodeURIComponent(rowKey)}`;
}

function requestFrame(callback: FrameRequestCallback): number {
  return typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(() => callback(performance.now()), 16);
}
function cancelFrame(id: number): void {
  if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(id);
  else window.clearTimeout(id);
}

export function ChangesList({ state, repoName, onRefresh, onOpen, onAction, onGroupAction }: ChangesListProps) {
  const { groups, loading } = state;
  const total = groups.reduce((n, group) => n + group.items.length, 0);
  const rows = useMemo(() => makeRows(groups, loading), [groups, loading]);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ViewportMetrics>({ scrollTop: 0, height: 0 });
  const metricsRef = useRef(metrics);
  const savedScrollTopRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const focusRef = useRef<FocusTarget | null>(null);
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);
  const [focusRequestRevision, setFocusRequestRevision] = useState(0);
  const [focusWithin, setFocusWithin] = useState(false);
  const pendingFocusRef = useRef<FocusTarget | null>(null);
  const previousRowsRef = useRef<LogicalRow[]>(rows);

  const publishMetrics = useCallback((scrollTop: number, height: number) => {
    const next = { scrollTop: Math.max(0, scrollTop), height: Math.max(0, height) };
    metricsRef.current = next;
    setMetrics((old) => old.scrollTop === next.scrollTop && old.height === next.height ? old : next);
  }, []);

  useLayoutEffect(() => {
    const element = scrollElementRef.current;
    if (!element) return;
    const measure = () => {
      const height = element.clientHeight;
      if (height > 0 && metricsRef.current.height === 0 && element.scrollTop === 0 && savedScrollTopRef.current > 0) {
        element.scrollTop = savedScrollTopRef.current;
      }
      publishMetrics(element.scrollTop, height);
    };
    const onScroll = () => {
      savedScrollTopRef.current = element.scrollTop;
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = requestFrame(() => {
        scrollFrameRef.current = null;
        publishMetrics(element.scrollTop, element.clientHeight);
      });
    };
    measure();
    element.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      element.removeEventListener('scroll', onScroll);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      if (scrollFrameRef.current !== null) cancelFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    };
  }, [publishMetrics]);

  // Keep the visible content anchored by logical row identity if Git refreshes
  // or an action moves/removes an item. The whole model is used for the anchor.
  useLayoutEffect(() => {
    if (metricsRef.current.height <= 0) return;
    const previous = previousRowsRef.current;
    if (previous !== rows && previous.length > 0 && metricsRef.current.scrollTop > 0) {
      const oldTop = metricsRef.current.scrollTop;
      const oldIndex = Math.min(previous.length - 1, Math.floor(oldTop / SCM_ROW_HEIGHT));
      const anchor = previous[oldIndex];
      let nextIndex = anchor ? rows.findIndex((row) => row.key === anchor.key) : -1;
      if (nextIndex < 0 && anchor?.kind === 'resource') {
        nextIndex = rows.findIndex((row) => row.kind === 'resource' && row.item.uri === anchor.item.uri);
      }
      if (nextIndex < 0 && rows.length > 0) nextIndex = Math.min(oldIndex, rows.length - 1);
      const offset = oldTop - oldIndex * SCM_ROW_HEIGHT;
      const maxTop = Math.max(0, rows.length * SCM_ROW_HEIGHT - metricsRef.current.height);
      const nextTop = Math.min(maxTop, Math.max(0, nextIndex * SCM_ROW_HEIGHT + offset));
      const element = scrollElementRef.current;
      if (element && Math.abs(element.scrollTop - nextTop) >= 1) {
        element.scrollTop = nextTop;
        savedScrollTopRef.current = nextTop;
        publishMetrics(nextTop, element.clientHeight);
      }
    }
  }, [rows, publishMetrics]);

  // Repair focus after Git changes the logical model. Prefer the same URI in a
  // different group (e.g. stage/unstage), then the nearest surviving row.
  useLayoutEffect(() => {
    if (metricsRef.current.height <= 0) return;
    const previous = previousRowsRef.current;
    const oldFocus = focusRef.current;
    if (oldFocus) {
      const exact = rows.find((row) => row.key === oldFocus.rowKey);
      if (!exact) {
        const oldIndex = Math.max(0, previous.findIndex((row) => row.key === oldFocus.rowKey));
        const oldRow = previous.find((row) => row.key === oldFocus.rowKey);
        let replacement = oldRow?.kind === 'resource'
          ? rows.find((row) => row.kind === 'resource' && row.item.uri === oldRow.item.uri)
          : undefined;
        if (!replacement) replacement = rows.find((row) => row.kind !== 'empty' && row.index >= oldIndex);
        if (!replacement) replacement = [...rows].reverse().find((row) => row.kind !== 'empty');
        if (replacement) {
          const preservedAction = oldFocus.actionId && actionIds(replacement).includes(oldFocus.actionId)
            ? oldFocus.actionId : undefined;
          const nextFocus = { rowKey: replacement.key, ...(preservedAction ? { actionId: preservedAction } : {}) };
          focusRef.current = nextFocus;
          setFocusedRowKey(replacement.key);
          if (focusWithin) pendingFocusRef.current = nextFocus;
        } else {
          focusRef.current = null;
          setFocusedRowKey(null);
          if (focusWithin) scrollElementRef.current?.focus();
        }
      } else if (oldFocus.actionId && !actionIds(exact).includes(oldFocus.actionId)) {
        focusRef.current = { rowKey: exact.key };
        pendingFocusRef.current = { rowKey: exact.key };
      }
    }
    previousRowsRef.current = rows;
  }, [rows, metrics.height, focusWithin]);

  // A hidden view unmounts its DOM rows at zero height, but keeps the logical
  // focus target. Re-pin and restore that target when the viewport returns.
  useLayoutEffect(() => {
    if (metrics.height <= 0 || !focusWithin || !focusRef.current) return;
    const element = scrollElementRef.current;
    if (!element || element.contains(document.activeElement)) return;
    pendingFocusRef.current = focusRef.current;
    setFocusRequestRevision((revision) => revision + 1);
  }, [metrics.height, focusWithin]);

  const range = getScmVirtualRange(rows.length, metrics.scrollTop, metrics.height);
  const visibleIndexes = useMemo(() => {
    const indexes = new Set<number>();
    for (let index = range.start; index < range.end; index++) indexes.add(index);
    if (metrics.height > 0 && focusWithin && focusedRowKey) {
      const pinned = rows.find((row) => row.key === focusedRowKey);
      if (pinned) indexes.add(pinned.index);
    }
    return [...indexes].sort((a, b) => a - b);
  }, [range.start, range.end, rows, focusedRowKey, metrics.height, focusWithin]);

  const focusTarget = useCallback((target: FocusTarget) => {
    const row = rows.find((candidate) => candidate.key === target.rowKey);
    if (!row || row.kind === 'empty') return;
    focusRef.current = target;
    setFocusWithin(true);
    setFocusedRowKey(row.key);
    pendingFocusRef.current = target;
    setFocusRequestRevision((revision) => revision + 1);
    const element = scrollElementRef.current;
    if (!element || metricsRef.current.height <= 0) return;
    const top = row.index * SCM_ROW_HEIGHT;
    const bottom = top + SCM_ROW_HEIGHT;
    if (top < element.scrollTop) element.scrollTop = top;
    else if (bottom > element.scrollTop + element.clientHeight) element.scrollTop = bottom - element.clientHeight;
    savedScrollTopRef.current = element.scrollTop;
    publishMetrics(element.scrollTop, element.clientHeight);
  }, [rows, publishMetrics]);

  // Focus occurs after the target row is mounted in the bounded window. For an
  // action, focus the row first so :focus-within reveals the inline toolbar.
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    const element = scrollElementRef.current;
    if (!pending || !element || metricsRef.current.height <= 0) return;
    const row = [...element.querySelectorAll<HTMLElement>('[data-row-key]')]
      .find((node) => node.dataset.rowKey === pending.rowKey);
    if (!row) return;
    if (pending.actionId) {
      const action = [...row.querySelectorAll<HTMLElement>('[data-action-id]')]
        .find((node) => node.dataset.actionId === pending.actionId);
      if (action) {
        row.focus();
        action.focus();
        pendingFocusRef.current = null;
        return;
      }
    }
    row.focus();
    pendingFocusRef.current = null;
  }, [visibleIndexes, focusedRowKey, metrics.height, focusRequestRevision]);

  const onTreeFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-row-key]');
    if (!row?.dataset.rowKey) return;
    const action = target.closest<HTMLElement>('[data-action-id]');
    const next = { rowKey: row.dataset.rowKey, ...(action?.dataset.actionId ? { actionId: action.dataset.actionId } : {}) };
    focusRef.current = next;
    setFocusWithin(true);
    setFocusedRowKey(next.rowKey);
  };

  const onTreeBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    const scroller = scrollElementRef.current;
    // Focus moves to the Activity Bar before React hides the old view. Defer
    // the decision one frame: a zero-height view is a hide/reopen transition,
    // while a still-visible view means focus intentionally left the tree.
    const next = event.relatedTarget as HTMLElement | null;
    if (next?.closest('[data-testid="activity-bar-item"]')) {
      requestFrame(() => {
        if (scroller?.clientHeight === 0 || !scroller) return;
        const focused = focusRef.current;
        if (focused && !rows.some((row) => row.key === focused.rowKey)) return;
        setFocusWithin(false);
      });
      return;
    }
    // display:none can blur a focused row without a user changing focus. Keep
    // the logical target while there is no viewport; a later reveal restores it.
    if (scroller?.clientHeight === 0) return;
    const focused = focusRef.current;
    if (focused && !rows.some((row) => row.key === focused.rowKey)) return; // reconciliation handles a removed row
    setFocusWithin(false);
  };

  const onTreeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-action-id]');
    if (event.key === 'Tab') {
      const current = focusRef.current;
      if (!current) return;
      const next = adjacentTabTarget(rows, current, event.shiftKey);
      if (next) {
        event.preventDefault();
        focusTarget(next);
      } else {
        setFocusWithin(false);
      }
      return; // at the boundary native Tab leaves/enters the tree
    }
    if (action) return;
    const current = focusRef.current;
    if (!current) return;
    const currentIndex = rows.findIndex((row) => row.key === current.rowKey);
    let nextIndex = -1;
    if (event.key === 'ArrowDown') nextIndex = Math.min(rows.length - 1, currentIndex + 1);
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = rows.length - 1;
    if (nextIndex >= 0 && nextIndex !== currentIndex && rows[nextIndex]?.kind !== 'empty') {
      event.preventDefault();
      focusTarget({ rowKey: rows[nextIndex].key });
    }
  };

  const renderRow = (row: LogicalRow) => {
    const position = { top: row.index * SCM_ROW_HEIGHT, height: SCM_ROW_HEIGHT, lineHeight: `${SCM_ROW_HEIGHT}px` } as const;
    if (row.kind === 'provider') {
      return (
        <div key={row.key} id={rowDomId(row.key)} className={`monaco-list-row scm-provider-row${focusedRowKey === row.key ? ' focused' : ''}`}
          role="treeitem" aria-level={1} aria-posinset={1} aria-setsize={1} data-row-key={row.key} data-testid="scm-provider"
          tabIndex={0} style={position}>
          <div className="monaco-tl-row">
            <div className="monaco-tl-twistie" />
            <div className="monaco-tl-contents">
              <div className="scm-provider">
                <span className="codicon codicon-source-control" aria-hidden="true" />
                <div className="monaco-icon-label">
                  <span className="monaco-icon-label-container">
                    <span className="monaco-icon-name-container"><span className="label-name monaco-highlighted-label">{repoName}</span></span>
                    {state.branch && <span className="monaco-icon-description-container"><span className="label-description">{state.branch}</span></span>}
                  </span>
                </div>
                <div className="count monaco-count-badge" data-count={total} aria-label={`${total} pending changes`}>{total}</div>
                <ActionBar actions={[{ id: 'refresh', icon: 'codicon-refresh', title: S.refresh, run: onRefresh, testId: 'scm-refresh' }]} />
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (row.kind === 'group') {
      const group = row.group;
      return (
        <div key={row.key} id={rowDomId(row.key)} className={`monaco-list-row${focusedRowKey === row.key ? ' focused' : ''}`}
          role="treeitem" aria-level={1} aria-posinset={row.groupIndex + 1} aria-setsize={state.groups.length} aria-expanded="true"
          aria-label={group.label} data-row-key={row.key} data-group={group.id} tabIndex={0} style={position}>
          <div className="monaco-tl-row">
            <div className="monaco-tl-twistie codicon codicon-tree-item-expanded collapsible force-twistie" style={{ paddingLeft: 8 }} />
            <div className="monaco-tl-contents">
              <div className="resource-group">
                <div className="name">{group.label}</div>
                <ActionBar actions={groupActions(group, onGroupAction)} />
                <div className="monaco-count-badge" aria-label={`${group.items.length} items`}>{group.items.length}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (row.kind === 'empty') {
      return <div key={row.key} className="scm-empty" data-testid="scm-empty" role="note" style={position}>{S.noChanges}</div>;
    }
    const { group, item } = row;
    const actions = resourceActions(group.id, item, onAction);
    return (
      <div key={row.key} id={rowDomId(row.key)} className={`monaco-list-row${focusedRowKey === row.key ? ' focused' : ''}`}
        role="treeitem" aria-level={2} aria-posinset={row.itemIndex + 1} aria-setsize={group.items.length}
        aria-label={`${item.name}${item.folder ? `, ${item.folder}` : ''}, ${item.tooltip}`} aria-selected={focusedRowKey === row.key}
        data-row-key={row.key} data-uri={item.uri} data-letter={item.letter} data-in-group={group.id}
        title={`${item.path} • ${item.tooltip}`} tabIndex={0} style={position}
        onClick={() => onOpen(item, group.id)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter') { event.preventDefault(); onOpen(item, group.id); }
          else if (event.key === 'Delete' || event.key === 'Backspace') {
            event.preventDefault();
            if (group.id !== 'index') onAction('discard', item);
          }
        }}>
        <div className="monaco-tl-row">
          <div className="monaco-tl-twistie" style={{ paddingLeft: 16 }} />
          <div className="monaco-tl-contents">
            <div className={`resource${item.deleted ? ' deleted' : ''}`}>
              <div className="name">
                <div className={fileIconLabelClasses(item.name, ['scm-resource-label', item.strikethrough ? 'strikethrough' : ''])}
                  data-letter={item.letter} data-tooltip={item.tooltip}
                  style={{ color: `var(${item.colorToken}, var(${fallbackFor(item.colorToken)}))` }}>
                  <span className="monaco-icon-label-container">
                    <span className="monaco-icon-name-container"><a className="label-name">{item.name}</a></span>
                    {item.folder && <span className="monaco-icon-description-container"><span className="label-description">{item.folder}</span></span>}
                  </span>
                  <ActionBar actions={actions} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="monaco-list mouse-support" role="tree" aria-label="Source Control" aria-busy={state.loading}
      data-testid="scm-list" data-total={total} onFocusCapture={onTreeFocusCapture} onBlurCapture={onTreeBlurCapture} onKeyDown={onTreeKeyDown}>
      <div className="monaco-scrollable-element" ref={scrollElementRef}>
        <div className="monaco-list-rows" style={{ height: metrics.height > 0 ? range.totalHeight : 0 }}>
          {visibleIndexes.map((index) => renderRow(rows[index]))}
        </div>
      </div>
    </div>
  );
}

/** Tokens ausentes caem no token semântico mais próximo (sem cor literal). */
function fallbackFor(token: string): string {
  switch (token) {
    case '--vscode-gitDecoration-untrackedResourceForeground': return '--vscode-gitDecoration-addedResourceForeground';
    case '--vscode-gitDecoration-stageModifiedResourceForeground': return '--vscode-gitDecoration-modifiedResourceForeground';
    case '--vscode-gitDecoration-stageDeletedResourceForeground': return '--vscode-gitDecoration-deletedResourceForeground';
    case '--vscode-gitDecoration-renamedResourceForeground': return '--vscode-gitDecoration-modifiedResourceForeground';
    case '--vscode-gitDecoration-conflictingResourceForeground': return '--vscode-errorForeground';
    case '--vscode-gitDecoration-ignoredResourceForeground': return '--vscode-descriptionForeground';
    default: return '--vscode-foreground';
  }
}
