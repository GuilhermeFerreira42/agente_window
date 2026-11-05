/// <reference types="vite/client" />

declare module '*.css?raw' {
  const source: string
  export default source
}

declare module 'monaco-editor/esm/vs/editor/standalone/browser/standaloneServices.js' {
  export const StandaloneServices: { get<T>(service: unknown): T }
}

declare module 'monaco-editor/esm/vs/editor/common/services/languageFeatures.js' {
  export const ILanguageFeaturesService: unknown
}

