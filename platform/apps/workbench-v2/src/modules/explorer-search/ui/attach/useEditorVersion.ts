// ui/attach/useEditorVersion.ts — re-render quando o EditorService emite algo
// da sessão observada (padrão de assinatura do módulo; sem estado duplicado).
import { useEffect, useState } from 'react';
import type { EditorService } from '../../core/editor/editorService';

export function useEditorVersion(editor: EditorService, sessionId: string): number {
  const [v, setV] = useState(0);
  useEffect(() => editor.onEvent((e) => {
    if ('sessionId' in e && e.sessionId !== sessionId) return;
    setV((x) => x + 1);
  }), [editor, sessionId]);
  return v;
}
