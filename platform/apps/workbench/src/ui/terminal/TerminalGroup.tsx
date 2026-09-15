/**
 * TerminalGroup — VERSÃO FINAL IGUAL AO ORIGINAL
 * Suporta 1,2,4 terminais lado a lado (ref 09,12,14) com sash estilo VS Code
 */

import { useCallback, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react';

interface Props {
  direction?: 'horizontal' | 'vertical';
  terminalIds: string[];
  activeTerminalId: string | null;
  renderTerminal: (terminalId: string, active: boolean) => ReactNode;
  onSplitRatioChange?: (ratio: number) => void;
  splitRatio?: number;
}

export function TerminalGroup({
  direction = 'horizontal',
  terminalIds,
  activeTerminalId,
  renderTerminal,
  onSplitRatioChange,
  splitRatio = 0.5,
}: Props) {
  const [ratio, setRatio] = useState(splitRatio);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startRatio = ratio;
    // Bug 3 fix: pega container específico do grupo, não first querySelector global
    const sashEl = e.currentTarget as HTMLElement;
    const container = sashEl.closest('.terminal-group-container') as HTMLElement | null
      || sashEl.parentElement?.parentElement as HTMLElement | null
      || document.querySelector('.terminal-group-container') as HTMLElement | null;
    const rect = container?.getBoundingClientRect();

    const onMove = (ev: MouseEvent) => {
      if (!rect) return;
      let newRatio: number;
      if (direction === 'vertical') {
        const deltaY = ev.clientY - startY;
        newRatio = startRatio + deltaY / rect.height;
      } else {
        const deltaX = ev.clientX - startX;
        newRatio = startRatio + deltaX / rect.width;
      }
      // Min 80px por painel via ratio clamp 0.2-0.8
      newRatio = Math.min(0.8, Math.max(0.2, newRatio));
      setRatio(newRatio);
      onSplitRatioChange?.(newRatio);
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [direction, ratio, onSplitRatioChange]);

  if (terminalIds.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--vscode-descriptionForeground, #8a8a8a)',
          fontSize: '12px',
          fontFamily: 'monospace',
        }}
      >
        Nenhum terminal. Clique em + para criar.
      </div>
    );
  }

  if (terminalIds.length === 1) {
    return (
      <div className="terminal-group-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {renderTerminal(terminalIds[0], activeTerminalId === terminalIds[0])}
        </div>
      </div>
    );
  }

  const isVertical = direction === 'vertical';

  // Para 4 terminais (quadruplo ref 14), usa grid 2x2 se vertical, ou 4 colunas se horizontal
  if (terminalIds.length === 4) {
    return (
      <div
        className="terminal-group-container terminal-group-quadruplo"
        style={{
          display: 'grid',
          gridTemplateColumns: isVertical ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
          gridTemplateRows: isVertical ? '1fr 1fr' : '1fr',
          width: '100%',
          height: '100%',
          gap: '1px',
          background: 'var(--vscode-panel-border, rgba(255,255,255,0.1))',
        }}
      >
        {terminalIds.map((tid) => (
          <div
            key={tid}
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--vscode-terminal-background, #1e1e1e)',
              border: activeTerminalId === tid ? '1px solid var(--vscode-focusBorder, #007acc)' : '1px solid transparent',
            }}
          >
            {renderTerminal(tid, activeTerminalId === tid)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className="terminal-group-container"
      style={{
        display: 'flex',
        flexDirection: isVertical ? 'column' : 'row',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        gap: '1px',
        background: 'var(--vscode-panel-border, rgba(255,255,255,0.1))',
      }}
    >
      {terminalIds.map((tid, idx) => {
        const isLast = idx === terminalIds.length - 1;
        const isActive = tid === activeTerminalId;
        const basis = terminalIds.length === 2
          ? idx === 0 ? `${ratio * 100}%` : `${(1 - ratio) * 100}%`
          : `${100 / terminalIds.length}%`;

        return (
          <div
            key={tid}
            className="terminal-group-pane"
            style={{
              flex: `0 0 ${basis}`,
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--vscode-terminal-background, #1e1e1e)',
              border: isActive ? '1px solid var(--vscode-focusBorder, #007acc)' : '1px solid transparent',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(tid, isActive)}
            </div>
            {!isLast && terminalIds.length === 2 && (
              <div
                role="separator"
                aria-orientation={isVertical ? 'horizontal' : 'vertical'}
                aria-label="Redimensionar split do terminal"
                onMouseDown={handleMouseDown}
                className="terminal-sash"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: isVertical ? 0 : '-3px',
                  bottom: isVertical ? '-3px' : 0,
                  left: isVertical ? 0 : undefined,
                  width: isVertical ? '100%' : '6px',
                  height: isVertical ? '6px' : '100%',
                  cursor: isVertical ? 'row-resize' : 'col-resize',
                  zIndex: 10,
                  background: dragging ? 'var(--vscode-sash-hoverBorder, #007acc)' : 'transparent',
                  borderLeft: !isVertical ? '2px solid transparent' : undefined,
                  borderRight: !isVertical ? '2px solid transparent' : undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
