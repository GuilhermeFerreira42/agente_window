import type * as Monaco from 'monaco-editor';

/** Só as ligações ausentes no Monaco standalone. Edição/linguagens usam as ações nativas. */
export function registerEditorShortcuts(monaco: typeof Monaco, editor: Monaco.editor.IStandaloneCodeEditor, command: (id: string) => void) {
  const workbench = [
    ['workbench.action.quickOpen', 'Abrir arquivo rapidamente', monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP],
    ['workbench.action.files.openFile', 'Abrir arquivo', monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO],
    ['workbench.action.files.newFile', 'Novo arquivo', monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN],
    ['workbench.action.files.saveAs', 'Salvar como', monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS],
    ['workbench.action.closeActiveEditor', 'Fechar editor', monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW],
    ['workbench.action.splitEditor', 'Dividir editor', monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash],
    ['workbench.action.focusFirstEditorGroup', 'Focar primeiro grupo', monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit1],
    ['workbench.action.focusSecondEditorGroup', 'Focar segundo grupo', monaco.KeyMod.CtrlCmd | monaco.KeyCode.Digit2],
    ['workbench.action.toggleSidebarVisibility', 'Alternar barra lateral', monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB],
    ['workbench.action.terminal.toggleTerminal', 'Alternar terminal integrado', monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote],
    ['workbench.action.openSettings', 'Abrir configurações', monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma],
    ['workbench.action.showAllSymbols', 'Símbolos no projeto', monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT],
    ['workbench.action.openGlobalKeybindings', 'Atalhos de teclado', monaco.KeyMod.chord(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS)],
  ] as const;
  const actions = workbench.map(([id, label, key]) => editor.addAction({ id, label, keybindings: [key], run: () => command(id) }));
  const wrap = editor.addAction({
    id: 'editor.action.toggleWordWrap',
    label: 'Alternar quebra de linha (Toggle Word Wrap)',
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyZ],
    precondition: 'editorTextFocus',
    run: (target) => target.updateOptions({ wordWrap: target.getRawOptions().wordWrap === 'on' ? 'off' : 'on' }),
  });
  // A paleta standalone vem com F1; o segundo atalho pertence ao Workbench.
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
    () => { void editor.getAction('editor.action.quickCommand')?.run(); });
  // O Monaco varia o atalho de formatação por SO. Aceitar também o solicitado
  // pelo dono, sem substituir o formatador registrado para a linguagem.
  editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
    () => { void editor.getAction('editor.action.formatDocument')?.run(); });
  return () => { wrap.dispose(); actions.forEach(action => action.dispose()); };
}
