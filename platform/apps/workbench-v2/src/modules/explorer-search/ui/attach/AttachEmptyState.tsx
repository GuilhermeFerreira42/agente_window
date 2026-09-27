// ============================================================================
// ui/attach/AttachEmptyState.tsx — 4.7 c6. Empty state do Editor Anexo
// (editorGroupWatermark do VS Code: `.editor-group-watermark` ≤ 290 px,
// `.letterpress` quadrado 256 px + `dl` de atalhos label/keybinding).
// Aparece SOMENTE quando o anexo está visível sem abas (decisão 2026-09-26:
// fechar a última aba continua recolhendo — 04_05). Os chips disparam os
// atalhos REAIS do shell (window keydown) — nada de lógica de negócio aqui.
// Acessível: role=region + aria-live=polite; chips são <button> focáveis.
// ============================================================================
import React from 'react';
import { ATTACH_STRINGS } from './attachStrings';

export interface AttachShortcut { id: string; label: string; keys: string[]; event: KeyboardEventInit }

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';
/** Atalhos que o shell realmente escuta em `window` (App.tsx handleShortcuts). */
export const ATTACH_SHORTCUTS: AttachShortcut[] = [
  { id: 'find-in-files', label: 'Localizar nos Arquivos', keys: [MOD, 'Shift', 'F'], event: { key: 'F', code: 'KeyF', ctrlKey: !IS_MAC, metaKey: IS_MAC, shiftKey: true } },
  { id: 'toggle-editor', label: 'Alternar Editor', keys: [IS_MAC ? '⌥' : 'Alt', MOD, 'E'], event: { key: 'e', code: 'KeyE', ctrlKey: !IS_MAC, metaKey: IS_MAC, altKey: true } },
  { id: 'toggle-details', label: 'Alternar Detalhes', keys: [IS_MAC ? '⌥' : 'Alt', MOD, 'L'], event: { key: 'l', code: 'KeyL', ctrlKey: !IS_MAC, metaKey: IS_MAC, altKey: true } },
];

export function fireShortcut(sc: AttachShortcut): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...sc.event }));
}

/** Letterpress genérico (documento com linhas), 256×256, cor via currentColor —
 *  o do VS Code é a marca do produto (não copiável); a régua é o tamanho/posição. */
function Letterpress() {
  return (
    <svg className="letterpress" viewBox="0 0 256 256" width="256" height="256" aria-hidden="true" focusable="false">
      <rect x="40" y="24" width="176" height="208" rx="18" ry="18" fill="none" stroke="currentColor" strokeWidth="14" />
      <line x1="78" y1="82" x2="178" y2="82" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
      <line x1="78" y1="128" x2="178" y2="128" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
      <line x1="78" y1="174" x2="140" y2="174" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
    </svg>
  );
}

export function AttachEmptyState({ onAction }: { onAction?: (id: string) => void }) {
  return (
    <div className="editor-group-watermark attach-empty" data-testid="attach-empty-state" role="region" aria-live="polite" aria-label={ATTACH_STRINGS.emptyTitle}>
      <Letterpress />
      <p className="attach-empty-title">{ATTACH_STRINGS.emptyTitle}</p>
      <p className="attach-empty-hint">{ATTACH_STRINGS.emptyHint}</p>
      <dl className="shortcuts" aria-label={ATTACH_STRINGS.emptyShortcuts}>
        {ATTACH_SHORTCUTS.map((sc) => (
          <React.Fragment key={sc.id}>
            <dt>{sc.label}</dt>
            <dd>
              <button type="button" className="monaco-keybinding attach-shortcut-chip" data-shortcut={sc.id}
                title={`${sc.label} (${sc.keys.join('+')})`}
                onClick={() => { fireShortcut(sc); onAction?.(sc.id); }}>
                {sc.keys.map((k, i) => (
                  <React.Fragment key={k}>
                    {i > 0 && <span className="monaco-keybinding-key-separator">+</span>}
                    <span className="monaco-keybinding-key">{k}</span>
                  </React.Fragment>
                ))}
              </button>
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}
