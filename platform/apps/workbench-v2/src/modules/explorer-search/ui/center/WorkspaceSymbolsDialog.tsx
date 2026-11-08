import { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import { flattenSymbols, type OutlineRow } from '../../core/outline/outlineModel';
import { languageFor } from '../attach/CodeEditorPane';
import { documentSymbolProviders, readDocumentSymbols } from '../attach/documentSymbols';

export function WorkspaceSymbolsDialog({ fs, root, modelFor, onPick, onCancel }: {
  fs: Pick<FileSystemPortLike, 'list' | 'readFile' | 'stat'>; root: WorkspaceUri;
  modelFor(uri: WorkspaceUri): Monaco.editor.ITextModel | null;
  onPick(uri: WorkspaceUri, row: OutlineRow): void; onCancel(): void;
}) {
  const [query, setQuery] = useState('');
  const [symbols, setSymbols] = useState<Array<{ uri: WorkspaceUri; path: string; row: OutlineRow }>>([]);
  const [status, setStatus] = useState('Lendo símbolos…');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    let alive = true;
    let cancel: Monaco.CancellationTokenSource | undefined;
    void (async () => {
      const monaco = await import('monaco-editor');
      cancel = new monaco.CancellationTokenSource();
      const queue = [root];
      let visited = 0, scanned = 0;
      while (alive && queue.length && scanned < 200 && visited++ < 1000) {
        for (const file of await fs.list({ uri: queue.shift()! })) {
          if (!alive || scanned >= 200) break;
          if (['.git', 'node_modules', '.runtime', 'dist', 'build'].includes(file.name)) continue;
          if (file.kind === 'directory') { queue.push(file.uri); continue; }
          if (!/\.(tsx?|jsx?|json|html?|css|scss|less)$/i.test(file.name)) continue;
          if ((await fs.stat({ uri: file.uri })).size > 256 * 1024) continue;
          scanned++;
          let model = modelFor(file.uri);
          const owned = !model;
          try {
            if (!model) model = monaco.editor.createModel((await fs.readFile({ uri: file.uri })).content, languageFor(monaco, file.name), monaco.Uri.parse(`workspace-symbols:/${Date.now()}/${scanned}/${encodeURIComponent(file.name)}`));
            let providers = await documentSymbolProviders(model);
            for (let tries = 0; alive && !providers.length && tries < 10; tries++) {
              await new Promise(resolve => setTimeout(resolve, 100));
              providers = await documentSymbolProviders(model);
            }
            const rows = flattenSymbols(await readDocumentSymbols(model, providers, cancel.token));
            if (alive) {
              const path = decodeURIComponent(file.uri.slice(root.replace(/\/$/, '').length + 1));
              setSymbols(current => [...current, ...rows.map(row => ({ uri: file.uri, path, row }))]);
              setStatus(`${scanned} arquivos examinados…`);
            }
          } finally { if (owned) model?.dispose(); }
        }
      }
      if (alive) setStatus(`${scanned} arquivos examinados. Limite: 200 arquivos de até 256 KB, com provedor de símbolos disponível.`);
    })().catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; cancel?.cancel(); cancel?.dispose(); };
  }, [fs, root, modelFor]);
  const matches = symbols.filter(symbol => `${symbol.row.name} ${symbol.path}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 100);
  return <div className="editor-command-backdrop" onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') onCancel();
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Tab') {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input,button'));
      const index = items.indexOf(document.activeElement as HTMLElement), direction = event.shiftKey || event.key === 'ArrowUp' ? -1 : 1;
      event.preventDefault(); items[(index + direction + items.length) % items.length]?.focus();
    }
  }}><section role="dialog" aria-modal="true" aria-label="Símbolos no projeto" className="editor-command-dialog">
    <h2>Símbolos no projeto</h2>
    <input ref={input} aria-label="Buscar símbolo" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && matches[0]) onPick(matches[0].uri, matches[0].row); }} />
    <p role="status">{status}</p>
    <div className="editor-command-files">{matches.map(symbol => <button type="button" key={`${symbol.uri}:${symbol.row.id}`} onClick={() => onPick(symbol.uri, symbol.row)}>{symbol.row.name} — {symbol.path}:{symbol.row.line}</button>)}</div>
    {error && <p role="alert">{error}</p>}<footer><button type="button" onClick={onCancel}>Cancelar</button></footer>
  </section></div>;
}
