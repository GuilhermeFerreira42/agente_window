import type * as Monaco from 'monaco-editor';
import type { OutlineSymbolInput } from '../../core/outline/outlineModel';

export async function documentSymbolProviders(model: Monaco.editor.ITextModel) {
  const [{ StandaloneServices }, { ILanguageFeaturesService }] = await Promise.all([
    import('monaco-editor/esm/vs/editor/standalone/browser/standaloneServices.js'),
    import('monaco-editor/esm/vs/editor/common/services/languageFeatures.js'),
  ]);
  const service = StandaloneServices.get<{ documentSymbolProvider: { ordered(model: Monaco.editor.ITextModel): Monaco.languages.DocumentSymbolProvider[] } }>(ILanguageFeaturesService);
  return service.documentSymbolProvider.ordered(model);
}
/** Um único coletor para Outline/breadcrumb e busca de símbolos no projeto. */
export async function readDocumentSymbols(model: Monaco.editor.ITextModel, providers: Monaco.languages.DocumentSymbolProvider[], token: Monaco.CancellationToken) {
  const all: OutlineSymbolInput[] = [];
  for (const provider of providers) {
    if (token.isCancellationRequested || model.isDisposed()) break;
    try {
      const result = await provider.provideDocumentSymbols(model, token);
      if (Array.isArray(result)) all.push(...result as unknown as OutlineSymbolInput[]);
    } catch { /* Provedor externo indisponível: mantém a política do Outline. */ }
  }
  return all;
}
