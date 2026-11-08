import { useEffect, useId, useRef, useState } from 'react';
import { File } from 'lucide-react';
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';

export type FileCommand = 'open' | 'new' | 'save-as';
export function EditorFileDialog({ mode, fs, root, onAccept, onCancel, onCommand }: {
  mode: FileCommand; fs: Pick<FileSystemPortLike, 'list'>; root: WorkspaceUri;
  onAccept(path: string): Promise<void>; onCancel(): void;
  onCommand?(id: string): void;
}) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(0);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const title = mode === 'open' ? 'Abrir arquivo' : mode === 'new' ? 'Novo arquivo' : 'Salvar como';
  useEffect(() => { if (mode === 'open') document.getElementById(`${listId}-${selected}`)?.scrollIntoView?.({ block: 'nearest' }); }, [listId, selected, mode]);
  useEffect(() => {
    input.current?.focus();
    if (mode !== 'open') return;
    let alive = true;
    void (async () => {
      const paths: string[] = [], queue = [root];
      let directories = 0;
      while (alive && queue.length && paths.length < 5000 && directories++ < 1000) {
        for (const entry of await fs.list({ uri: queue.shift()! })) {
          if (['.git', 'node_modules', '.runtime', 'dist', 'build'].includes(entry.name)) continue;
          if (entry.kind === 'directory') queue.push(entry.uri);
          else paths.push(entry.uri.slice(root.replace(/\/$/, '').length + 1));
        }
      }
      if (alive) setFiles(paths.sort());
    })().catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, [fs, root, mode]);
  const submit = async (path = query) => {
    if (busy || !path.trim()) return;
    setBusy(true); setError('');
    try { await onAccept(path.trim()); } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  const normalized = query.trim().toLocaleLowerCase();
  const glob = normalized.includes('*') ? new RegExp(normalized.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*'), 'i') : null;
  const matches = files.filter(file => glob ? glob.test(file) : file.toLocaleLowerCase().includes(normalized)).slice(0, 100);
  if (mode === 'open') return <div className="editor-quick-open-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onCancel(); }} onKeyDown={event => {
    event.stopPropagation();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') { event.preventDefault(); if (event.shiftKey && onCommand) onCommand('workbench.action.showCommands'); else setSelected(index => Math.min(matches.length - 1, index + 1)); }
    if (event.key === 'F1' && onCommand) { event.preventDefault(); onCommand('workbench.action.showCommands'); }
    if (event.key === 'Escape' && !busy) { event.preventDefault(); onCancel(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSelected(index => Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))); input.current?.focus(); }
    if (event.key === 'Tab') { const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)')); const index = items.indexOf(document.activeElement as HTMLElement); event.preventDefault(); items[(index + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus(); }
  }}><section className="editor-quick-open" role="dialog" aria-modal="true" aria-label={title}>
    <form onSubmit={event => { event.preventDefault(); void submit(matches[selected] ?? query); }}>
      <input ref={input} aria-label="Caminho relativo ao projeto" aria-controls={listId} aria-activedescendant={matches[selected] ? `${listId}-${selected}` : undefined} placeholder="Pesquisar arquivos por nome" value={query} disabled={busy} onChange={event => { const value = event.target.value; if (value === '>' && onCommand) { onCommand('workbench.action.showCommands'); return; } setQuery(value); setSelected(0); }} />
      {!query && <div className="editor-quick-open-modes"><button type="button" onClick={() => input.current?.focus()}><span>Ir para Arquivo</span><kbd>Ctrl + P</kbd></button>{onCommand && <button type="button" onClick={() => onCommand('workbench.action.showCommands')}><span>Mostrar e Executar Comandos &gt;</span><kbd>Ctrl + Shift + P</kbd></button>}</div>}
      <div className="editor-command-files" role="listbox" id={listId} aria-label="Arquivos do projeto">{matches.map((file, index) => {
        const parts = file.split('/'), name = parts.pop()!, directory = parts.join('/');
        return <div key={file} role="option" id={`${listId}-${index}`} aria-selected={index === selected}><button type="button" aria-label={file} disabled={busy} onMouseEnter={() => setSelected(index)} onClick={() => void submit(file)}><File size={13} aria-hidden="true"/><span className="quick-open-name">{name}</span><span className="quick-open-directory">{directory}</span></button></div>;
      })}</div>
      {!matches.length && <p role="status">{query ? 'Nenhum arquivo encontrado.' : 'Procurando arquivos no projeto…'}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="quick-open-footer"><span>Até 5.000 arquivos · Enter para abrir · Esc para fechar</span><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
    </form>
  </section></div>;
  return <div className="editor-command-backdrop" onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape' && !busy) onCancel();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const items = [input.current!, ...Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('.editor-command-files button'))];
      const index = items.indexOf(document.activeElement as HTMLInputElement);
      event.preventDefault(); items[(index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length]?.focus();
    }
    if (event.key === 'Tab') {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button:not(:disabled)'));
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey ? (index - 1 + items.length) % items.length : (index + 1) % items.length;
      event.preventDefault(); items[next]?.focus();
    }
  }}>
    <section className="editor-command-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <h2>{title}</h2>
      <form onSubmit={e => { e.preventDefault(); void submit(query); }}>
        <label>Caminho relativo ao projeto<input ref={input} value={query} disabled={busy} onChange={e => setQuery(e.target.value)} /></label>
        {mode === 'save-as' && <p>O destino deve ser um arquivo novo. Um arquivo existente não será sobrescrito.</p>}
        {error && <p role="alert">{error}</p>}
        <footer><button type="submit" disabled={busy || (!query.trim() && !matches.length)}>{busy ? 'Aguarde…' : title}</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></footer>
      </form>
    </section>
  </div>;
}
