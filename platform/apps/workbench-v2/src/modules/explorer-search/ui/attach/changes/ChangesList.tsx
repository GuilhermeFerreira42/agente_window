// ============================================================================
// ui/attach/changes/ChangesList.tsx — 4.7-b c2/c3. Lista da Source Control View
// (DOM/classes do `scmViewPane.ts`, medidas 04_21 §1.1):
//   .scm-view > .monaco-list > .monaco-list-rows > .monaco-list-row (22 px)
//     ├ .scm-provider      (repositório: nome bold + branch + count + Refresh)
//     ├ .resource-group    (> .name + .actions[hover] + .monaco-count-badge)
//     └ .resource          (> .name > .monaco-icon-label[file-icon] > label + .actions[hover] ; letra ::after)
// c3: ações inline 22×22 (`.monaco-icon-label > .actions`, display:none → block
// no hover/focus-within, `max-width: fit-content`), ordem oficial do menu
// `scm/resourceState/context` grupo inline: workingTree/untracked = Discard ·
// Stage; index = Unstage. Grupo: Stage All / Unstage All / Discard All.
// Teclado: linha focável (Enter = abrir, Delete = discard); Tab entra nas ações.
// ============================================================================
import React from 'react';
import type { GitGroupId, GitResourceGroup, GitResourceItem, GitServiceState } from '../../../core/git/gitService';
import { fileIconLabelClasses } from '../fileIconClasses';
import { CHANGES_STRINGS as S } from './changesStrings';

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

function ActionBar({ actions }: { actions: ActionSpec[] }) {
  return (
    <div className="actions">
      <div className="monaco-toolbar"><div className="monaco-action-bar"><ul className="actions-container" role="toolbar">
        {actions.map((a) => (
          <li key={a.id} className="action-item" role="presentation">
            <a className={`action-label codicon ${a.icon}`} role="button" tabIndex={0} title={a.title} aria-label={a.title} data-testid={a.testId}
              onClick={(e) => { e.stopPropagation(); a.run(); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); a.run(); } }} />
          </li>
        ))}
      </ul></div></div>
    </div>
  );
}

export function ChangesList({ state, repoName, onRefresh, onOpen, onAction, onGroupAction }: ChangesListProps) {
  const total = state.groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <div className="monaco-list mouse-support" role="tree" aria-label="Source Control">
      <div className="monaco-scrollable-element">
        <div className="monaco-list-rows">
          <div className="monaco-list-row scm-provider-row" role="treeitem" aria-level={1} data-testid="scm-provider" tabIndex={0}>
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
          {state.groups.map((g) => <GroupRows key={g.id} group={g} onOpen={onOpen} onAction={onAction} onGroupAction={onGroupAction} />)}
          {total === 0 && !state.loading && (
            <div className="scm-empty" data-testid="scm-empty" role="note">{S.noChanges}</div>
          )}
        </div>
      </div>
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

function GroupRows({ group, onOpen, onAction, onGroupAction }: { group: GitResourceGroup } & Pick<ChangesListProps, 'onOpen' | 'onAction' | 'onGroupAction'>) {
  return (
    <>
      <div className="monaco-list-row" role="treeitem" aria-level={1} aria-expanded="true" data-group={group.id} tabIndex={0}>
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
      {group.items.map((it) => {
        const acts = resourceActions(group.id, it, onAction);
        return (
          <div key={`${group.id}:${it.uri}`} className="monaco-list-row" role="treeitem" aria-level={2} tabIndex={0}
            data-uri={it.uri} data-letter={it.letter} data-in-group={group.id} title={`${it.path} • ${it.tooltip}`}
            onClick={() => onOpen(it, group.id)}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return; // teclas nas ações são delas
              if (e.key === 'Enter') { e.preventDefault(); onOpen(it, group.id); }
              else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (group.id !== 'index') onAction('discard', it); }
            }}>
            <div className="monaco-tl-row">
              <div className="monaco-tl-twistie" style={{ paddingLeft: 16 }} />
              <div className="monaco-tl-contents">
                <div className={`resource${it.deleted ? ' deleted' : ''}`}>
                  <div className="name">
                    <div className={fileIconLabelClasses(it.name, ['scm-resource-label', it.strikethrough ? 'strikethrough' : ''])}
                      data-letter={it.letter} data-tooltip={it.tooltip}
                      style={{ color: `var(${it.colorToken}, var(${fallbackFor(it.colorToken)}))` }}>
                      <span className="monaco-icon-label-container">
                        <span className="monaco-icon-name-container"><a className="label-name">{it.name}</a></span>
                        {it.folder && <span className="monaco-icon-description-container"><span className="label-description">{it.folder}</span></span>}
                      </span>
                      <ActionBar actions={acts} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Tokens que o tema do shell ainda não define caem no token semântico mais
 *  próximo (mesma família do VS Code) — nunca uma cor literal. Débito D2.37. */
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
