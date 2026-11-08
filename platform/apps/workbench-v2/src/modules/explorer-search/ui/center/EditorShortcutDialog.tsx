import { useEffect, useRef, useState } from 'react';

export const shortcutLabels: Record<string, string> = {
  undo: 'Ctrl+Z', redo: 'Ctrl+Y', 'editor.action.clipboardCutAction': 'Ctrl+X', 'editor.action.clipboardCopyAction': 'Ctrl+C', 'editor.action.clipboardPasteAction': 'Ctrl+V',
  'editor.action.moveLinesUpAction': 'Alt+↑', 'editor.action.moveLinesDownAction': 'Alt+↓',
  'editor.action.copyLinesUpAction': 'Shift+Alt+↑', 'editor.action.copyLinesDownAction': 'Shift+Alt+↓',
  'editor.action.deleteLines': 'Ctrl+Shift+K', 'editor.action.insertLineAfter': 'Ctrl+Enter', 'editor.action.insertLineBefore': 'Ctrl+Shift+Enter',
  'editor.action.jumpToBracket': 'Ctrl+Shift+\\', 'editor.action.indentLines': 'Ctrl+]', 'editor.action.outdentLines': 'Ctrl+[',
  'expandLineSelection': 'Ctrl+L', 'editor.action.smartSelect.expand': 'Shift+Alt+→', 'editor.action.smartSelect.shrink': 'Shift+Alt+←',
  'editor.action.toggleWordWrap': 'Alt+Z', 'actions.find': 'Ctrl+F', 'editor.action.startFindReplaceAction': 'Ctrl+H',
  'editor.action.nextMatchFindAction': 'F3', 'editor.action.previousMatchFindAction': 'Shift+F3',
  'editor.action.selectAllMatches': 'Alt+Enter', 'editor.action.addSelectionToNextFindMatch': 'Ctrl+D',
  'editor.action.moveSelectionToNextFindMatch': 'Ctrl+K Ctrl+D', 'cursorUndo': 'Ctrl+U',
  'editor.action.insertCursorAbove': 'Ctrl+Alt+↑', 'editor.action.insertCursorBelow': 'Ctrl+Alt+↓',
  'editor.action.insertCursorAtEndOfEachLineSelected': 'Shift+Alt+I', 'editor.action.selectHighlights': 'Ctrl+Shift+L',
  'editor.action.changeAll': 'Ctrl+F2', 'editor.action.triggerSuggest': 'Ctrl+Space', 'editor.action.triggerParameterHints': 'Ctrl+Shift+Space',
  'editor.action.formatDocument': 'Shift+Alt+F', 'editor.action.formatSelection': 'Ctrl+K Ctrl+F',
  'editor.action.revealDefinition': 'F12', 'editor.action.peekDefinition': 'Alt+F12', 'editor.action.revealDefinitionAside': 'Ctrl+K F12',
  'editor.action.quickFix': 'Ctrl+.', 'editor.action.goToReferences': 'Shift+F12', 'editor.action.rename': 'F2',
  'editor.action.quickOutline': 'Ctrl+Shift+O', 'editor.action.gotoLine': 'Ctrl+G',
  'editor.action.commentLine': 'Ctrl+/', 'editor.action.blockComment': 'Shift+Alt+A', 'editor.action.marker.next': 'F8', 'editor.action.marker.prev': 'Shift+F8',
  'editor.action.quickCommand': 'F1 / Ctrl+Shift+P', 'workbench.action.quickOpen': 'Ctrl+P',
  'workbench.action.files.newFile': 'Ctrl+N', 'workbench.action.files.openFile': 'Ctrl+O',
  'workbench.action.files.save': 'Ctrl+S', 'workbench.action.files.saveAs': 'Ctrl+Shift+S',
  'workbench.action.closeActiveEditor': 'Ctrl+W / Ctrl+F4', 'workbench.action.splitEditor': 'Ctrl+\\',
  'workbench.action.focusFirstEditorGroup': 'Ctrl+1', 'workbench.action.focusSecondEditorGroup': 'Ctrl+2',
  'workbench.action.toggleSidebarVisibility': 'Ctrl+B', 'workbench.action.terminal.toggleTerminal': 'Ctrl+`',
  'workbench.action.openSettings': 'Ctrl+,', 'workbench.action.openGlobalKeybindings': 'Ctrl+K Ctrl+S',
  'workbench.action.toggleFullScreen': 'F11',
  'workbench.action.showAllSymbols': 'Ctrl+T',
};
export interface ShortcutRow { id: string; label: string; enabled: boolean; run(): Promise<void> | void }
export function EditorShortcutDialog({ rows, onCancel, commands = false }: { rows: ShortcutRow[]; onCancel(): void; commands?: boolean }) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const visible = rows.filter(row => `${row.label} ${shortcutLabels[row.id] ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const run = async (row?: ShortcutRow) => { if (!row?.enabled) return; try { await row.run(); } catch (e) { setError(String(e)); } };
  return <div className="editor-command-backdrop" onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') onCancel();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Tab') {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
      const current = items.indexOf(document.activeElement as HTMLElement);
      const back = event.key === 'ArrowUp' || event.shiftKey;
      event.preventDefault(); items[(current + (back ? -1 : 1) + items.length) % items.length]?.focus();
    }
  }}>
    <section role="dialog" aria-modal="true" aria-label={commands ? 'Paleta de comandos' : 'Atalhos de teclado'} className="editor-command-dialog">
      <h2>{commands ? 'Paleta de comandos' : 'Atalhos de teclado'}</h2>
      <input ref={input} aria-label="Filtrar comandos e atalhos" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void run(visible.find(row => row.enabled)); } }} />
      <p>Combinações Windows/Linux; no macOS o Monaco usa os vínculos nativos. A disponibilidade depende do arquivo e dos provedores da linguagem. O layout atual possui dois grupos.</p>
      <div className="editor-command-files">{visible.map(row => <button type="button" key={row.id} disabled={!row.enabled} onClick={() => void run(row)}><span>{row.label}</span><kbd style={{ float: 'right' }}>{shortcutLabels[row.id] ?? 'Pela paleta (F1)'}</kbd></button>)}</div>
      <p>Ctrl+T pesquisa símbolos com os provedores disponíveis, até 200 arquivos de até 256 KB. Atalhos reservados do navegador podem ser interceptados por ele.</p>
      {error && <p role="alert">{error}</p>}
      <footer><button type="button" onClick={onCancel}>Fechar</button></footer>
    </section>
  </div>;
}
