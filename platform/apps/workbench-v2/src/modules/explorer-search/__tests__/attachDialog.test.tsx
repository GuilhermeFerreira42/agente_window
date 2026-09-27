// attachDialog.test.tsx — 4.7 c5 (RTL/jsdom): AttachDialog acessível — role
// dialog + aria-modal, foco inicial no primário, Enter = botão focado/primário,
// Esc = cancelar, Tab circula (focus trap), botões na ordem dada.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AttachDialog } from '../ui/attach/AttachDialog';

afterEach(cleanup);

function mount() {
  const save = vi.fn(); const dont = vi.fn(); const cancel = vi.fn();
  render(<AttachDialog kind="warning" message="Deseja salvar x?" detail="detalhe" onCancel={cancel}
    buttons={[{ id: 'save', label: 'Salvar', primary: true, onSelect: save }, { id: 'dontSave', label: 'Não Salvar', onSelect: dont }, { id: 'cancel', label: 'Cancelar', onSelect: cancel }]} />);
  const box = document.body.querySelector('.monaco-dialog-box') as HTMLElement;
  return { box, save, dont, cancel };
}

describe('AttachDialog', () => {
  it('acessibilidade: role=dialog, aria-modal, ícone warning, botões na ordem, foco no primário', () => {
    const { box } = mount();
    expect(box.getAttribute('role')).toBe('dialog');
    expect(box.getAttribute('aria-modal')).toBe('true');
    expect(box.querySelector('.dialog-icon')?.classList.contains('codicon-dialog-warning')).toBe(true);
    expect(Array.from(box.querySelectorAll('.dialog-buttons .monaco-button')).map((b) => b.textContent)).toEqual(['Salvar', 'Não Salvar', 'Cancelar']);
    expect(document.activeElement?.textContent).toBe('Salvar');
  });
  it('Enter = primário; Esc = cancelar; clique em Não Salvar', () => {
    const { box, save, dont, cancel } = mount();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(save).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(cancel).toHaveBeenCalledTimes(1);
    fireEvent.click(box.querySelectorAll('.dialog-buttons .monaco-button')[1]);
    expect(dont).toHaveBeenCalledTimes(1);
  });
  it('focus trap: Tab a partir do último volta ao primeiro; Shift+Tab do primeiro vai ao último', () => {
    const { box } = mount();
    const focusables = Array.from(box.querySelectorAll<HTMLElement>('[tabindex="0"]'));
    focusables[focusables.length - 1].focus();
    fireEvent.keyDown(box, { key: 'Tab' });
    expect(document.activeElement).toBe(focusables[0]);
    fireEvent.keyDown(box, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });
});
