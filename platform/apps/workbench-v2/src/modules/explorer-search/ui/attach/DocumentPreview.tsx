import { useSyncExternalStore, type ReactNode } from 'react';
import type * as Monaco from 'monaco-editor';

export const supportsDocumentPreview = (name: string) => /\.(md|markdown|txt|text|log)$/i.test(name);
export function DocumentPreview({ model, name, renderMarkdown }: { model: Monaco.editor.ITextModel; name: string; renderMarkdown?: (content: string) => ReactNode }) {
  const content = useSyncExternalStore(
    notify => { const subscription = model.onDidChangeContent(notify); return () => subscription.dispose(); },
    () => model.isDisposed() ? '' : model.getValue(),
  );
  return <article className="attach-document-preview" data-testid="document-preview" aria-label={`Visualização de ${name}`}>
    {/\.(md|markdown)$/i.test(name) && renderMarkdown
      ? renderMarkdown(content)
      : <pre>{content}</pre>}
  </article>;
}
