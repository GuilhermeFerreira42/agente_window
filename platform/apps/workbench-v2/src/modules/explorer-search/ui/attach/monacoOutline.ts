// ============================================================================
// modules/explorer-search/ui/attach/monacoOutline.ts — 5.6 (A0.6) Outline REAL.
// Fonte: DocumentSymbolProvider do Monaco (ILanguageFeaturesService) sobre o
// modelo ATIVO do editor do anexo (mesmo caminho do OutlineModel.create do
// VS Code, sem importar o contrib). Recalcula em: troca de modelo, edição
// (debounce), registro de provider (o TS/JSON só registram após o worker).
// Achatamento/kinds ficam no core puro (core/outline/outlineModel).
// ============================================================================
import type * as Monaco from 'monaco-editor';
import { flattenSymbols, type OutlineRow, type OutlineSymbolInput } from '../../core/outline/outlineModel';

type Editor = Monaco.editor.IStandaloneCodeEditor;
interface SymbolRegistry {
  ordered(model: Monaco.editor.ITextModel): Monaco.languages.DocumentSymbolProvider[];
  onDidChange(cb: () => void): { dispose(): void };
}

export interface MonacoOutlineTracker {
  /** Liga ao editor do anexo (chamado no onEditorReady; idempotente). */
  attach(editor: Editor): void;
  rows(): OutlineRow[];
  /** URI (string do modelo) a que `rows()` pertence. */
  modelUri(): string | null;
  onChanged(cb: () => void): () => void;
  /** Revela a linha/coluna no editor (revealLineInCenter + setPosition + focus). */
  reveal(line: number, column: number): void;
  dispose(): void;
}

const DEBOUNCE_MS = 250;

export function createMonacoOutlineTracker(): MonacoOutlineTracker {
  let editor: Editor | null = null;
  let registry: SymbolRegistry | null = null;
  let rows: OutlineRow[] = [];
  let uri: string | null = null;
  let disposed = false;
  let seq = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<() => void>();
  const disposables: Array<{ dispose(): void }> = [];
  const emit = () => { for (const l of [...listeners]) l(); };
  const set = (next: OutlineRow[], nextUri: string | null) => { rows = next; uri = nextUri; emit(); };

  const loadRegistry = async (): Promise<SymbolRegistry | null> => {
    if (registry) return registry;
    try {
      const [{ StandaloneServices }, { ILanguageFeaturesService }] = await Promise.all([
        import('monaco-editor/esm/vs/editor/standalone/browser/standaloneServices.js'),
        import('monaco-editor/esm/vs/editor/common/services/languageFeatures.js'),
      ]);
      const svc = StandaloneServices.get<{ documentSymbolProvider: SymbolRegistry }>(ILanguageFeaturesService);
      registry = svc.documentSymbolProvider;
      disposables.push(registry.onDidChange(() => schedule()));
      return registry;
    } catch {
      return null;
    }
  };

  const compute = async () => {
    const my = ++seq;
    const model = editor?.getModel() ?? null;
    if (!model || disposed) { if (rows.length || uri) set([], null); return; }
    const reg = await loadRegistry();
    if (!reg || my !== seq || model.isDisposed()) return;
    const providers = reg.ordered(model);
    const all: OutlineSymbolInput[] = [];
    for (const p of providers) {
      try {
        const res = await p.provideDocumentSymbols(model, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) } as Monaco.CancellationToken);
        if (Array.isArray(res)) all.push(...(res as unknown as OutlineSymbolInput[]));
      } catch { /* provider falhou → ignora (VS Code: onUnexpectedExternalError) */ }
    }
    if (my !== seq || disposed) return;
    set(flattenSymbols(all), model.uri.toString());
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void compute(); }, DEBOUNCE_MS);
  };

  return {
    attach(ed) {
      if (editor === ed || disposed) return;
      editor = ed;
      disposables.push(ed.onDidChangeModel(() => { set([], null); void compute(); }));
      disposables.push(ed.onDidChangeModelContent(() => schedule()));
      void compute();
    },
    rows: () => rows,
    modelUri: () => uri,
    onChanged(cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },
    reveal(line, column) {
      if (!editor) return;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column });
      editor.focus();
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      for (const d of disposables.splice(0)) d.dispose();
      listeners.clear();
    },
  };
}
