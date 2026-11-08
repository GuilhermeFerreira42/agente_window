import { createElement } from 'react';
import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createExplorerSearchModule, type SearchMatch } from '../index';
import { asWorkspaceUri } from '../core/uri';
import { FakeFsPort } from './fakeFs';
const h = vi.hoisted(() => ({ open: null as ((match: SearchMatch) => void) | null }));
vi.mock('../ui/search/SearchPanel', () => ({ SearchPanel: (props: { onOpenMatch: (match: SearchMatch) => void }) => {
  h.open = props.onOpenMatch;
  return createElement('div');
} }));

describe('contexto de Search/SCM antes do primeiro editor', () => {
  it('abre resultado na sessão ativa sem mount Monaco e troca o dono ao alternar sessão', async () => {
    const root = asWorkspaceUri('/ws');
    const uri = asWorkspaceUri('/ws/a.ts');
    const fs = new FakeFsPort(root);
    fs.seed([{ path: '/ws', kind: 'directory' }, { path: '/ws/a.ts', kind: 'file' }]);
    const mod = createExplorerSearchModule({ fs, workspaceRoot: root,
      menus: { register: () => () => {}, execute: async () => {}, setContext: () => {}, getContext: () => undefined },
      contextMenu: { open: () => {} } });
    const host = document.createElement('div'); document.body.appendChild(host);
    const navigation: string[] = [];
    mod.onEvent((event) => { if (event.type === 'editor.navigationRequested') navigation.push(event.sessionId); });
    try {
      await act(async () => { mod.mountSearch(host); });
      for (const sessionId of ['s1', 's2']) {
        act(() => {
          mod.attach.setSessionContext?.({ sessionId });
          h.open?.({ uri, line: 7, column: 3, preview: 'resultado' });
        });
        expect(mod.attach.getTabs({ sessionId }).map(t => t.uri)).toEqual([uri]);
      }
      expect(mod.attach.getTabs({ sessionId: 's1' })).toHaveLength(1);
      expect(navigation).toEqual(['s1', 's2']);
      // Restauração programática não deve roubar a seleção de uma aba nativa.
      await act(async () => { await mod.attach.open({ sessionId: 's1', uri, kind: 'code', pinned: true }); });
      expect(navigation).toEqual(['s1', 's2']);
    } finally {
      await act(async () => { mod.dispose(); await new Promise(r => setTimeout(r, 0)); });
      host.remove();
    }
  });
});
