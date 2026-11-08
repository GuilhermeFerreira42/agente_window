// ============================================================================
// modules/explorer-search/ui/attach/monacoOutline.ts — 5.6 (A0.6) Outline REAL.
// Fonte: DocumentSymbolProvider do Monaco (ILanguageFeaturesService) sobre o
// modelo ATIVO do editor do anexo (mesmo caminho do OutlineModel.create do
// VS Code, sem importar o contrib). Recalcula em: troca de modelo, edição
// (debounce), registro de provider (o TS/JSON só registram após o worker).
// Achatamento/kinds ficam no core puro (core/outline/outlineModel).
// ============================================================================
import type * as Monaco from 'monaco-editor';
import { flattenSymbols, type OutlineRow } from '../../core/outline/outlineModel';
import { readDocumentSymbols } from './documentSymbols';

type Editor = Monaco.editor.IStandaloneCodeEditor;
interface SymbolRegistry {
  ordered(model: Monaco.editor.ITextModel): Monaco.languages.DocumentSymbolProvider[];
  onDidChange(cb: () => void): { dispose(): void };
}

export interface MonacoOutlineTracker {
  /**
   * Liga um editor candidato (chamado em cada `onEditorReady`; idempotente).
   *
   * FATIA 15 Onda 2c-ii (D152 §3): durante a sobreposição da unificação existem
   * DUAS superfícies capazes de hospedar o Monaco — o Editor Anexo (coluna) e a aba
   * central. O tracker era dono de UM editor só, e o do anexo vencia por chegar
   * primeiro; como o Outline é servido pela Side Bar, ele descreveria o editor
   * errado (ou nenhum) quando a coluna deixasse de existir.
   *
   * Agora é uma FILA de candidatos com posse explícita: o editor que está EM USO
   * manda; `detach` devolve a posse para o próximo vivo. Sem candidato, o Outline
   * fica vazio em vez de mentir sobre o arquivo ativo.
   */
  attach(editor: Editor): void;
  /** Devolve a posse (chamado no unmount da superfície). Idempotente. */
  detach(editor: Editor): void;
  /** Quantos editores vivos estão ligados — só para testes e diagnóstico. */
  candidateCount(): number;
  rows(): OutlineRow[];
  /** URI (string do modelo) a que `rows()` pertence. */
  modelUri(): string | null;
  onChanged(cb: () => void): () => void;
  /**
   * Posição do cursor no editor com posse (1-based), ou null sem editor/modelo.
   *
   * FATIA 15 Onda 3 (D169): o breadcrumb precisa mostrar o CAMINHO DE SÍMBOLOS
   * até onde o cursor está (igual ao VS Code), não o arquivo inteiro. Em vez de
   * criar um segundo coletor de símbolos, o breadcrumb lê `rows()` — que é o
   * MESMO resultado do provedor que o Outline já usa — e casa com esta posição.
   */
  cursorPosition(): { line: number; column: number } | null;
  /** Revela a linha/coluna no editor (revealLineInCenter + setPosition + focus). */
  reveal(line: number, column: number): void;
  dispose(): void;
}

const DEBOUNCE_MS = 250;

export function createMonacoOutlineTracker(): MonacoOutlineTracker {
  /** Candidatos vivos na ordem em que se ligaram; o ÚLTIMO a se ligar tem a posse. */
  const candidatos: Editor[] = [];
  let editor: Editor | null = null;
  /**
   * Quem ouviu o quê: cada candidato tem os próprios listeners. Sem esta tabela, o
   * `attach` de um segundo editor deixaria os listeners do primeiro vivos para
   * sempre (vazamento) e um `dispose` do primeiro levaria os do segundo junto.
   */
  const listenersPorEditor = new Map<Editor, Array<{ dispose(): void }>>();
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
    const all = await readDocumentSymbols(model, providers, { isCancellationRequested: false, onCancellationRequested: () => ({ dispose() {} }) } as Monaco.CancellationToken);
    if (my !== seq || disposed) return;
    set(flattenSymbols(all), model.uri.toString());
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void compute(); }, DEBOUNCE_MS);
  };

  /** Entrega a posse a `ed`: recalcula a partir do modelo DELE e avisa os ouvintes. */
  const tomarPosse = (ed: Editor) => {
    if (editor === ed || disposed) return;
    editor = ed;
    set([], null);      // as linhas do editor anterior não valem para este
    void compute();
  };

  return {
    attach(ed) {
      if (disposed) return;
      if (candidatos.includes(ed)) { tomarPosse(ed); return; }
      candidatos.push(ed);
      listenersPorEditor.set(ed, [
        ed.onDidChangeModel(() => { if (editor !== ed) return; set([], null); void compute(); }),
        ed.onDidChangeModelContent(() => { if (editor === ed) schedule(); }),
      ]);
      tomarPosse(ed);
    },
    detach(ed) {
      const i = candidatos.indexOf(ed);
      if (i >= 0) candidatos.splice(i, 1);
      for (const d of listenersPorEditor.get(ed) ?? []) d.dispose();
      listenersPorEditor.delete(ed);
      if (editor !== ed) return;
      // O dono da posse saiu: passa para o candidato vivo (o último que sobrou).
      const proximo = candidatos[candidatos.length - 1] ?? null;
      editor = null;
      if (proximo) tomarPosse(proximo);
      else { set([], null); }
    },
    candidateCount: () => candidatos.length,
    rows: () => rows,
    modelUri: () => uri,
    onChanged(cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },
    reveal(line, column) {
      if (!editor) return;
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column });
      editor.focus();
    },
    cursorPosition() {
      if (!editor) return null;
      // Defensivo de propósito: em produção `editor` é sempre um Monaco real, mas
      // as fábricas de teste montam o CenterCodeEditor com editores DUBLÊS que não
      // têm a API inteira. Sem esta guarda o breadcrumb derrubava o componente
      // inteiro (TypeError: getPosition is not a function) — e breadcrumb é
      // decoração: ele nunca pode ser motivo de o editor não montar.
      if (typeof editor.getPosition !== 'function') return null;
      const pos = editor.getPosition();
      return pos ? { line: pos.lineNumber, column: pos.column } : null;
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      candidatos.splice(0);
      for (const ds of listenersPorEditor.values()) for (const d of ds) d.dispose();
      listenersPorEditor.clear();
      editor = null;
      for (const d of disposables.splice(0)) d.dispose();
      listeners.clear();
    },
  };
}
