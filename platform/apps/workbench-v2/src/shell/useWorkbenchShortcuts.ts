import { useEffect, useRef } from 'react';

export type WorkbenchShortcutHandlers = Record<string, () => void>;
/** Uma ligação para os comandos existentes; nenhum estado de abas/arquivos aqui. */
export function useWorkbenchShortcuts(handlers: WorkbenchShortcutHandlers, registry: { register(command: { id: string; title: string; run(): void }): () => void }) {
  const current = useRef(handlers);
  current.current = handlers;
  useEffect(() => {
    const ids: Record<string, string> = { 'search-editor': 'workbench.action.openSearchEditor', '\\': 'workbench.action.splitEditor', b: 'workbench.action.toggleSidebarVisibility', '`': 'workbench.action.terminal.toggleTerminal', ',': 'workbench.action.openSettings', f11: 'workbench.action.toggleFullScreen' };
    const offs = Object.entries(ids).map(([key, id]) => registry.register({ id, title: id, run: () => current.current[key]?.() }));
    return () => offs.forEach(off => off());
  }, [registry]);
  useEffect(() => {
    let chord = false;
    let monacoChord = false;
    let timer: ReturnType<typeof setTimeout>;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (['control', 'meta', 'shift', 'alt'].includes(key)) return;
      if (chord) {
        chord = false; clearTimeout(timer);
        if (monacoChord) return; // Monaco resolve seus próprios acordes, inclusive Ctrl+K Ctrl+F.
        if (mod && key === 's') { event.preventDefault(); current.current['k s']?.(); }
        return;
      }
      if (mod && key === 'k' && !event.shiftKey) {
        chord = true; monacoChord = !!(event.target as Element | null)?.closest('.monaco-editor');
        timer = setTimeout(() => { chord = false; }, 2000);
        if (!monacoChord) event.preventDefault();
        return;
      }
      const command = mod ? `${event.shiftKey ? 'shift+' : ''}${key}` : /^f(1|11)$/.test(key) ? key : '';
      const action = current.current[command];
      if (!action) return;
      if (command === 'w' && !(event.target as Element | null)?.closest?.('.editor-pane,.monaco-editor')) return;
      // Dentro de um diálogo, seus botões/campos conservam o teclado.
      if ((event.target as Element | null)?.closest('[role="dialog"],[aria-modal="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      action();
    };
    window.addEventListener('keydown', onKey, true);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', onKey, true); };
  }, []);
}
