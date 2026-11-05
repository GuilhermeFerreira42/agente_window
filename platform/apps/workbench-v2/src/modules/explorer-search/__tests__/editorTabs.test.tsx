// ============================================================================
// editorTabs.test.tsx — 4.7 c3 (RTL/jsdom). EditorTabs + Breadcrumbs sobre o
// EditorService puro: classes fiéis ao workbench (tab / active / preview /
// dirty / tab-actions / codicon-close-dirty), interação (clique ativa,
// dblclick pina, ✕ fecha, dirty bloqueia) e breadcrumbs relativos à raiz.
// ============================================================================
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { EditorService } from '../core/editor/editorService';
import { EditorTabs } from '../ui/attach/EditorTabs';
import { Breadcrumbs } from '../ui/attach/Breadcrumbs';
import { asWorkspaceUri } from '../core/uri';

const ROOT = asWorkspaceUri('/ws');
const A = asWorkspaceUri('/ws/src/a.ts');
const B = asWorkspaceUri('/ws/README.md');
const S = 'sess';

afterEach(cleanup);

function mount(svc: EditorService, onCloseBlocked = vi.fn()) {
  return { ...render(<EditorTabs editor={svc} sessionId={S} onCloseBlocked={onCloseBlocked} />), onCloseBlocked };
}

describe('EditorTabs (tabsTitleControl.ts)', () => {
  it('renderiza uma .tab por aba, ativa com .active e tab-border-top-container, ícone Seti + label + tab-actions', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S, uri: B, kind: 'code', pinned: true });
    const { container } = mount(svc);
    const tabs = container.querySelectorAll('.tabs-container > .tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(tabs[0].classList.contains('active')).toBe(false);
    expect(tabs[1].querySelector('.tab-border-top-container')).not.toBeNull();
    expect(tabs[0].querySelector('.monaco-icon-label.file-icon.ts-ext-file-icon')).not.toBeNull();
    expect(tabs[0].querySelector('.label-name')?.textContent).toBe('a.ts');
    expect(tabs[1].querySelector('.tab-actions .codicon-close')).not.toBeNull();
    expect(tabs[1].getAttribute('role')).toBe('tab');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('title')).toBe('/ws/README.md');
  });

  it('preview ganha .preview (label itálico via CSS); dblclick pina; clique ativa', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S, uri: B, kind: 'code' });
    const { container } = mount(svc);
    const [ta, tb] = Array.from(container.querySelectorAll('.tabs-container > .tab'));
    expect(tb.classList.contains('preview')).toBe(true);
    fireEvent.click(ta);
    expect(svc.getActive(S)?.uri).toBe(A);
    expect(ta.classList.contains('active')).toBe(true);
    fireEvent.doubleClick(tb);
    expect(svc.getTabs(S)[1].preview).toBe(false);
    expect(container.querySelectorAll('.tab.preview')).toHaveLength(0);
  });

  it('dirty: .tab.dirty com codicon-close-dirty (●) e aria-label "unsaved"; ✕ em aba dirty chama onCloseBlocked e NÃO fecha', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: A, kind: 'code', pinned: true });
    svc.setDirty({ sessionId: S, uri: A, dirty: true });
    const { container, onCloseBlocked } = mount(svc);
    const tab = container.querySelector('.tab')!;
    expect(tab.classList.contains('dirty')).toBe(true);
    const action = tab.querySelector('.tab-actions .action-label')!;
    expect(action.classList.contains('codicon-close-dirty')).toBe(true);
    expect(action.getAttribute('aria-label')).toMatch(/unsaved|não salvo/i);
    fireEvent.click(action);
    expect(onCloseBlocked).toHaveBeenCalledWith({ sessionId: S, uri: A });
    expect(svc.getTabs(S)).toHaveLength(1);
  });

  it('✕ em aba limpa fecha (sem ativar a aba); clique do meio também fecha', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S, uri: B, kind: 'code', pinned: true });
    const { container } = mount(svc);
    const ta = container.querySelectorAll('.tabs-container > .tab')[0];
    fireEvent.click(ta.querySelector('.tab-actions .action-label')!);
    expect(svc.getTabs(S).map((t) => t.uri)).toEqual([B]);
    expect(svc.getActive(S)?.uri).toBe(B);
    const tb = container.querySelector('.tabs-container > .tab')!;
    fireEvent.mouseUp(tb, { button: 1 });
    expect(svc.getTabs(S)).toHaveLength(0);
  });

  it('re-renderiza ao vivo quando o serviço muda (eventos), sem remontar a lista', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: A, kind: 'code', pinned: true });
    const { container } = mount(svc);
    expect(container.querySelectorAll('.tab')).toHaveLength(1);
    act(() => svc.open({ sessionId: S, uri: B, kind: 'code' }));
    expect(container.querySelectorAll('.tab')).toHaveLength(2);
    act(() => svc.setDirty({ sessionId: S, uri: B, dirty: true }));
    expect(container.querySelectorAll('.tab.dirty')).toHaveLength(1);
  });
});

describe('Breadcrumbs (breadcrumbsControl.ts)', () => {
  it('caminho relativo à raiz, um item por segmento, separador codicon entre eles, último com ícone Seti', () => {
    const { container } = render(<Breadcrumbs root={ROOT} uri={A} />);
    const items = container.querySelectorAll('.monaco-breadcrumbs .monaco-breadcrumb-item');
    expect(Array.from(items).map((i) => i.textContent?.trim())).toEqual(['src', 'a.ts']);
    expect(container.querySelectorAll('.codicon-breadcrumb-separator')).toHaveLength(1);
    expect(items[1].querySelector('.monaco-icon-label.file-icon.ts-ext-file-icon')).not.toBeNull();
    expect(items[0].querySelector('.file-icon')).toBeNull();
  });
  it('uri fora da raiz → caminho absoluto sem quebrar', () => {
    const { container } = render(<Breadcrumbs root={ROOT} uri={asWorkspaceUri('/other/x.md')} />);
    expect(Array.from(container.querySelectorAll('.monaco-breadcrumb-item')).map((i) => i.textContent?.trim())).toEqual(['other', 'x.md']);
  });
});
