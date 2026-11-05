import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitResourceGroup, GitResourceItem, GitServiceState } from '../core/git/gitService';
import { asWorkspaceUri } from '../core/uri';
import { ChangesList } from '../ui/attach/changes/ChangesList';

let viewportHeight = 220;
let groups: GitResourceItem[];

function resource(index: number): GitResourceItem {
  const name = `change-${String(index).padStart(5, '0')}.txt`;
  return {
    uri: asWorkspaceUri(`/ws/changes/${name}`), path: `changes/${name}`, name, folder: 'changes',
    letter: 'U', tooltip: 'Untracked', colorToken: '--vscode-gitDecoration-untrackedResourceForeground',
    strikethrough: false, deleted: false,
  };
}
function stateFor(items: GitResourceItem[] = groups): GitServiceState {
  return { loading: false, isRepo: true, branch: 'main', error: null, groups: [{ id: 'workingTree', label: 'Changes', items }] };
}
function renderList(state = stateFor(), onGroupAction = vi.fn()) {
  const onOpen = vi.fn();
  const onAction = vi.fn();
  const onRefresh = vi.fn();
  const view = render(<ChangesList state={state} repoName="fixture" onRefresh={onRefresh} onOpen={onOpen} onAction={onAction} onGroupAction={onGroupAction} />);
  return { ...view, onOpen, onAction, onRefresh, onGroupAction };
}
function scrollElement(): HTMLDivElement {
  return screen.getByTestId('scm-list').querySelector('.monaco-scrollable-element') as HTMLDivElement;
}
async function settleFrame(): Promise<void> {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
}

beforeEach(() => {
  viewportHeight = 220;
  groups = Array.from({ length: 1_000 }, (_, index) => resource(index));
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() { return this.classList.contains('monaco-scrollable-element') ? viewportHeight : 0; },
  });
});
afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
});

describe('ChangesList virtualization and interaction', () => {
  it('keeps the full Git model, counts, group action payload, and aria set size while bounding DOM rows', async () => {
    const onGroupAction = vi.fn();
    renderList(stateFor(), onGroupAction);
    await waitFor(() => expect(screen.getByTestId('scm-provider').querySelector('[data-count="1000"]')).not.toBeNull());
    const tree = screen.getByTestId('scm-list');
    expect(tree.getAttribute('data-total')).toBe('1000');
    expect(tree.querySelectorAll('[role="treeitem"][data-uri]').length).toBeLessThan(20);
    expect(tree.querySelector('[data-uri$="change-00000.txt"]')?.getAttribute('aria-posinset')).toBe('1');
    expect(tree.querySelector('[data-uri$="change-00000.txt"]')?.getAttribute('aria-setsize')).toBe('1000');
    expect(tree.querySelector('[data-group="workingTree"]')?.getAttribute('aria-setsize')).toBe('1');

    fireEvent.click(screen.getByTestId('scm-group-stage-all'));
    expect(onGroupAction).toHaveBeenCalledTimes(1);
    expect(onGroupAction.mock.calls[0][0]).toBe('stage-all');
    expect(onGroupAction.mock.calls[0][1].items).toHaveLength(1_000);
  });

  it('bounds DOM at 10k without truncating counts, group actions, or keyboard navigation', async () => {
    groups = Array.from({ length: 10_000 }, (_, index) => resource(index));
    const onGroupAction = vi.fn();
    renderList(stateFor(), onGroupAction);
    await waitFor(() => expect(screen.getByTestId('scm-provider').querySelector('[data-count="10000"]')).not.toBeNull());
    const tree = screen.getByTestId('scm-list');
    expect(tree.getAttribute('data-total')).toBe('10000');
    expect(tree.querySelectorAll('[role="treeitem"][data-uri]').length).toBeLessThan(20);

    fireEvent.click(screen.getByTestId('scm-group-stage-all'));
    expect(onGroupAction.mock.calls[0][1].items).toHaveLength(10_000);

    const provider = screen.getByTestId('scm-provider');
    act(() => provider.focus());
    fireEvent.keyDown(provider, { key: 'End' });
    await waitFor(() => {
      const last = screen.getByLabelText('change-09999.txt, changes, Untracked') as HTMLElement;
      expect(document.activeElement).toBe(last);
      expect(last.getAttribute('aria-posinset')).toBe('10000');
      expect(last.getAttribute('aria-setsize')).toBe('10000');
    });
  });

  it('moves keyboard focus to the final logical resource and scrolls it into the window', async () => {
    renderList();
    await screen.findByTestId('scm-provider');
    const first = screen.getByTestId('scm-provider');
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'End' });
    await waitFor(() => {
      const last = screen.getByLabelText('change-00999.txt, changes, Untracked') as HTMLElement;
      expect(document.activeElement).toBe(last);
      expect(last.getAttribute('aria-posinset')).toBe('1000');
    });
    const tree = screen.getByTestId('scm-list');
    expect(tree.querySelectorAll('[role="treeitem"][data-uri]').length).toBeLessThan(20);
  });

  it('pins the focused row while scrolling past its normal viewport window', async () => {
    renderList();
    await screen.findByTestId('scm-provider');
    const first = screen.getByLabelText('change-00000.txt, changes, Untracked') as HTMLElement;
    act(() => first.focus());
    const scroller = scrollElement();
    scroller.scrollTop = 12_000;
    fireEvent.scroll(scroller);
    await settleFrame();
    expect(document.activeElement).toBe(first);
    expect(screen.getByTestId('scm-list').querySelector('[data-uri$="change-00000.txt"]')).toBe(first);
    expect(screen.getByTestId('scm-list').querySelectorAll('[role="treeitem"][data-uri]').length).toBeLessThan(25);
  });

  it('keeps Tab navigation across row/action boundaries and scrolls focus as needed', async () => {
    renderList();
    await screen.findByTestId('scm-provider');
    const provider = screen.getByTestId('scm-provider');
    act(() => provider.focus());
    fireEvent.keyDown(provider, { key: 'Tab' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-action-id')).toBe('refresh'));
    const refresh = document.activeElement as HTMLElement;
    fireEvent.keyDown(refresh, { key: 'Tab' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-group')).toBe('workingTree'));
    const group = document.activeElement as HTMLElement;
    fireEvent.keyDown(group, { key: 'Tab' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-action-id')).toBe('discard-all'));
    const discard = document.activeElement as HTMLElement;
    fireEvent.keyDown(discard, { key: 'Tab' });
    await waitFor(() => expect(document.activeElement?.getAttribute('data-action-id')).toBe('stage-all'));
    const stageAll = document.activeElement as HTMLElement;
    fireEvent.keyDown(stageAll, { key: 'Tab' });
    await waitFor(() => expect((document.activeElement as HTMLElement).dataset.uri ?? '').toContain('change-00000.txt'));
  });

  it('renders no rows for a zero-height hidden viewport and fills the bounded window after reveal', async () => {
    viewportHeight = 0;
    renderList();
    expect(screen.getByTestId('scm-list').querySelectorAll('[data-uri]').length).toBe(0);
    expect((screen.getByTestId('scm-list').querySelector('.monaco-list-rows') as HTMLElement).style.height).toBe('0px');
    viewportHeight = 220;
    act(() => { window.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(screen.getByTestId('scm-list').querySelectorAll('[data-uri]').length).toBeGreaterThan(0));
    expect(screen.getByTestId('scm-list').querySelectorAll('[data-uri]').length).toBeLessThan(20);
  });

  it('unmounts a focused row while hidden and restores logical focus when revealed', async () => {
    renderList();
    await screen.findByTestId('scm-provider');
    const first = screen.getByLabelText('change-00000.txt, changes, Untracked') as HTMLElement;
    act(() => first.focus());
    expect(document.activeElement).toBe(first);

    viewportHeight = 0;
    act(() => { window.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(screen.getByTestId('scm-list').querySelectorAll('[data-uri]').length).toBe(0));

    viewportHeight = 220;
    act(() => { window.dispatchEvent(new Event('resize')); });
    await waitFor(() => {
      const restored = screen.getByLabelText('change-00000.txt, changes, Untracked') as HTMLElement;
      expect(document.activeElement).toBe(restored);
    });
  });

  it('preserves focus by URI when an operation moves the resource into another Git group', async () => {
    const { rerender, onOpen, onAction, onRefresh } = renderList();
    await screen.findByTestId('scm-provider');
    const item = groups[0];
    const oldRow = screen.getByLabelText('change-00000.txt, changes, Untracked') as HTMLElement;
    act(() => oldRow.focus());
    const moved: GitResourceGroup[] = [
      { id: 'index', label: 'Staged Changes', items: [item] },
      { id: 'workingTree', label: 'Changes', items: groups.slice(1) },
    ];
    rerender(<ChangesList state={{ ...stateFor(groups.slice(1)), groups: moved }} repoName="fixture" onRefresh={onRefresh} onOpen={onOpen} onAction={onAction} onGroupAction={vi.fn()} />);
    await waitFor(() => {
      const newRow = screen.getByLabelText('change-00000.txt, changes, Untracked') as HTMLElement;
      expect(document.activeElement).toBe(newRow);
      expect(newRow.getAttribute('data-in-group')).toBe('index');
    });
  });

  it('preserves click and Enter open actions for resources', async () => {
    const { onOpen } = renderList();
    const row = await screen.findByLabelText('change-00000.txt, changes, Untracked');
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen.mock.calls[0][1]).toBe('workingTree');
  });

  it('shows the empty-state row only when loading has completed and there are no changes', async () => {
    groups = [];
    renderList({ loading: false, isRepo: true, branch: null, error: null, groups: [] });
    expect(await screen.findByTestId('scm-empty')).toBeTruthy();
    expect(screen.getByTestId('scm-provider').querySelector('[data-count="0"]')?.textContent).toBe('0');
  });
});
