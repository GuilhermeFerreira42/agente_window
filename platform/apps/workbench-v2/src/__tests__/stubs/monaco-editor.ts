// Stub de `monaco-editor` para o vitest (jsdom): o pacote real só expõe
// `module` ESM voltado ao browser e não resolve em Node. O Editor Anexo (4.7)
// carrega o Monaco por import dinâmico, coberto pelos E2E (sessao_14); nos
// testes unitários basta o pacote resolver.
export const editor = {
  create: () => { throw new Error('[stub monaco-editor] não disponível em testes unitários'); },
  createModel: () => { throw new Error('[stub monaco-editor] não disponível em testes unitários'); },
  setTheme: () => undefined,
  TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 },
};
export const languages = { getLanguages: () => [] as Array<{ id: string; extensions?: string[]; filenames?: string[] }> };
export class Range { constructor(public startLineNumber: number, public startColumn: number, public endLineNumber: number, public endColumn: number) {} }
export const Uri = { parse: (s: string) => ({ toString: () => s }) };
