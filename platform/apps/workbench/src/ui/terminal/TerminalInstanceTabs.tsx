/**
 * TerminalInstanceTabs — VERSÃO FINAL IGUAL AO ORIGINAL
 * Abas com ícone terminal + label + close ×, igual VS Code
 */

import { X, TerminalSquare } from 'lucide-react';
import type { TerminalId } from '@contracts/common.js';

interface TabItem {
  id: TerminalId;
  label: string;
  active: boolean;
}

interface Props {
  tabs: TabItem[];
  onSelect: (id: TerminalId) => void;
  onClose: (id: TerminalId) => void;
  canClose?: (id: TerminalId) => boolean;
}

export function TerminalInstanceTabs({ tabs, onSelect, onClose, canClose }: Props) {
  return (
    <div
      className="terminal-instance-tabs"
      role="tablist"
      aria-label="Terminais"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        height: '28px',
        padding: '0 8px',
        background: 'var(--vscode-terminal-background, var(--vscode-panel-background, #1e1e1e))',
        borderBottom: '1px solid var(--vscode-panel-border, rgba(255,255,255,0.1))',
        overflowX: 'auto',
        overflowY: 'hidden',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.active}
          onClick={() => onSelect(tab.id)}
          title={tab.label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '22px',
            padding: '0 8px',
            border: '1px solid transparent',
            borderBottom: tab.active ? '1px solid var(--vscode-panelTitle-activeBorder, #007acc)' : '1px solid transparent',
            borderRadius: '2px',
            background: tab.active
              ? 'var(--vscode-tab-activeBackground, #1e1e1e)'
              : 'transparent',
            color: tab.active
              ? 'var(--vscode-tab-activeForeground, #ffffff)'
              : 'var(--vscode-tab-inactiveForeground, #969696)',
            cursor: 'pointer',
            fontSize: '12px',
            maxWidth: '160px',
          }}
        >
          <TerminalSquare size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
          {(canClose ? canClose(tab.id) : tabs.length > 1) && (
            <span
              role="button"
              aria-label={`Fechar ${tab.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              style={{
                display: 'inline-flex',
                width: '16px',
                height: '16px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
                marginLeft: '4px',
              }}
            >
              <X size={12} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
