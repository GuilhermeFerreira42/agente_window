// changesConfirm.test.ts — 4.7-b c3: textos oficiais de Discard (git.clean / git.cleanAll).
import { describe, expect, it } from 'vitest';
import { discardCopy } from '../ui/attach/changes/ConfirmDialog';
import type { GitResourceItem } from '../core/git/gitService';

const it_ = (name: string, letter: string): GitResourceItem => ({ uri: `file:///ws/${name}`, path: name, name, folder: '', letter, tooltip: '', colorToken: '', strikethrough: false, deleted: letter === 'D' });

describe('discardCopy — textos verificados no dist/main.js da extensão git', () => {
  it('1 rastreado → pergunta simples, sem detalhe, botão "Discard File"', () => {
    expect(discardCopy({ items: [it_('a.ts', 'M')] })).toEqual({ message: "Are you sure you want to discard changes in 'a.ts'?", detail: '', confirm: 'Discard File' });
  });
  it('n rastreados → "discard ALL changes in N files?" + IRREVERSIBLE + "Discard All N Files"', () => {
    expect(discardCopy({ items: [it_('a', 'M'), it_('b', 'D')], all: true })).toEqual({ message: 'Are you sure you want to discard ALL changes in 2 files?', detail: 'This is IRREVERSIBLE!\nYour current working set will be FOREVER LOST if you proceed.', confirm: 'Discard All 2 Files' });
  });
  it('1 untracked → DELETE / Delete File; n untracked → plural / Delete Files', () => {
    expect(discardCopy({ items: [it_('n.txt', 'U')] })).toEqual({ message: "Are you sure you want to DELETE the following untracked file: 'n.txt'?", detail: 'This is IRREVERSIBLE!\nThis file will be FOREVER LOST if you proceed.', confirm: 'Delete File' });
    expect(discardCopy({ items: [it_('n.txt', 'U'), it_('m.txt', 'U')] })).toMatchObject({ message: 'Are you sure you want to DELETE the 2 untracked files?', confirm: 'Delete Files' });
  });
  it('misto → pergunta dos untracked + dos rastreados, botão "Discard All N Files"', () => {
    const mixed = discardCopy({ items: [it_('a', 'M'), it_('n', 'U')], all: true });
    expect(mixed.message).toBe("Are you sure you want to DELETE the following untracked file: 'n'? Are you sure you want to discard changes in 'a'?");
    expect(mixed.confirm).toBe('Discard All 2 Files');
  });
});
