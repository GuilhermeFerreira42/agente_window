import { useEffect, useRef, useState } from 'react';
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';

export type FileCommand = 'open' | 'new' | 'save-as';
export function EditorFileDialog({ mode, fs, root, onAccept, onCancel }: {
  mode: FileCommand; fs: Pick<FileSystemPortLike, 'list'>; root: WorkspaceUri;
  onAccept(path: string): Promise<void>; onCancel(): void;
}) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const title = mode === 'open' ? 'Abrir arquivo' : mode === 'new' ? 'Novo arquivo' : 'Salvar como';
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
      <form onSubmit={e => { e.preventDefault(); void submit(mode === 'open' ? (matches.find(file => file === query) ?? matches[0] ?? query) : query); }}>
        <label>Caminho relativo ao projeto<input ref={input} value={query} disabled={busy} onChange={e => setQuery(e.target.value)} /></label>
        {mode === 'open' && <div className="editor-command-files">{matches.map(file =>
          <button type="button" key={file} disabled={busy} onClick={() => void submit(file)}>{file}</button>)}</div>}
        {mode === 'open' && <p>Até 5.000 arquivos; digite o caminho completo relativo se não aparecer na lista.</p>}
        {mode === 'save-as' && <p>O destino deve ser um arquivo novo. Um arquivo existente não será sobrescrito.</p>}
        {error && <p role="alert">{error}</p>}
        <footer><button type="submit" disabled={busy || (!query.trim() && !matches.length)}>{busy ? 'Aguarde…' : title}</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar</button></footer>
      </form>
    </section>
  </div>;
}
