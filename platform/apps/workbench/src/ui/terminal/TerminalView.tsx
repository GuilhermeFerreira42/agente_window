/**
 * TerminalView — FATIA-03.3
 * Renderiza uma instância xterm vinculada a um terminalId do TerminalService.
 * - escuta terminal.output / exit / cwd do service
 * - envia input via service.write
 * - notifica resize via service.resize
 * - preserva scrollback ao receber exit (não limpa)
 * - usa tokens CSS var(--vscode-*) sem hex hardcoded
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { useXterm } from './useXterm.js';
import type { TerminalServiceImpl } from '../../logic/terminal/terminalService.js';
import type { TerminalId } from '@contracts/common.js';

export interface TerminalViewHandle {
  focus: () => void;
  clear: () => void;
  fitAndResize: () => void;
  getSelection: () => string;
  hasSelection: () => boolean;
  selectAll: () => void;
  getTerminalId: () => TerminalId;
}

interface TerminalViewProps {
  terminalId: TerminalId;
  service: TerminalServiceImpl;
  active: boolean;
  enabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onFocus?: (terminalId: TerminalId) => void;
  onContextMenu?: (e: ReactMouseEvent<HTMLDivElement>, terminalId: TerminalId) => void;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { terminalId, service, active, enabled = true, className = '', ariaLabel, onFocus, onContextMenu },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const exitNotifiedRef = useRef(false);

  const { focus, clear, write, fitAndResize, getSelection, hasSelection, selectAll } = useXterm({
    containerRef,
    enabled,
    active,
    loadWebLinks: false,
    onData: (data) => {
      // envia para PTY real
      void service.write({ terminalId, data });
    },
    onResize: (cols, rows) => {
      void service.resize({ terminalId, cols, rows });
    },
  });

  // expõe handle
  useImperativeHandle(
    ref,
    () => ({
      focus,
      clear,
      fitAndResize,
      getSelection,
      hasSelection,
      selectAll,
      getTerminalId: () => terminalId,
    }),
    [focus, clear, fitAndResize, getSelection, hasSelection, selectAll, terminalId],
  );

  // escuta output/exit do service para este terminalId
  useEffect(() => {
    if (!enabled) return;

    const unsub = service.onEvent((ev) => {
      if (!('terminalId' in ev)) return;
      if (ev.terminalId !== terminalId) return;
      switch (ev.type) {
        case 'terminal.output': {
          write(ev.chunk);
          break;
        }
        case 'terminal.exit': {
          // preserva aba, mostra mensagem (01E §3.1)
          if (!exitNotifiedRef.current) {
            exitNotifiedRef.current = true;
            const msg = `\r\n\x1b[90mProcess exited with code ${ev.exitCode ?? 'unknown'}. Press any key to close or use context menu.\x1b[0m\r\n`;
            write(msg);
          }
          break;
        }
        case 'terminal.cwd': {
          // opcional: poderia atualizar título, mas mantém simples
          break;
        }
      }
    });

    return unsub;
  }, [enabled, terminalId, service, write]);

  // foco
  useEffect(() => {
    if (!active || !enabled) return;
    const t = setTimeout(() => focus(), 50);
    return () => clearTimeout(t);
  }, [active, enabled, focus]);

  return (
    <div
      ref={containerRef}
      className={`terminal-instance ${active ? 'is-active' : 'is-inactive'} ${className}`.trim()}
      role="group"
      aria-label={ariaLabel ?? `Terminal ${terminalId}`}
      data-terminal-id={terminalId}
      data-active={active ? 'true' : 'false'}
      tabIndex={0}
      onFocus={() => onFocus?.(terminalId)}
      onContextMenu={(e) => onContextMenu?.(e, terminalId)}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--vscode-terminal-background, var(--vscode-panel-background, transparent))',
        color: 'var(--vscode-terminal-foreground, var(--vscode-foreground))',
        position: 'relative',
      }}
    />
  );
});
