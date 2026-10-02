// 5.6 — stub dos internos ESM do Monaco (StandaloneServices/ILanguageFeaturesService)
// usados por ui/attach/monacoOutline.ts. Em jsdom não há Monaco; registry vazia.
export const ILanguageFeaturesService = Symbol('ILanguageFeaturesService');
const emptyRegistry = { ordered: () => [], onDidChange: () => ({ dispose() {} }) };
export const StandaloneServices = { get: () => ({ documentSymbolProvider: emptyRegistry }), initialize: () => undefined };
