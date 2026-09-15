/**
 * PlatformTerminalBridge — 100% fiel ao VS Code, sem resquícios legados
 * Usa VSCodeTerminal auto-contido que fala WS /pty direto
 * Elimina dependência de platform para evitar tela cinza
 */

import { useEffect, useState } from 'react';
import { VSCodeTerminal } from './VSCodeTerminal';

interface Props {
  visible: boolean;
  sessionId: string;
  sessionLabel?: string;
  workspace: string;
  onClose: () => void;
}

export function PlatformTerminalBridge({ visible, sessionId, workspace, onClose }: Props) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible && !mounted) {
      setMounted(true);
    }
  }, [visible, mounted]);

  if (!mounted) return null;

  return (
    <div style={{ display: visible ? 'contents' : 'none' }}>
      <VSCodeTerminal visible={visible} sessionId={sessionId} workspace={workspace} onClose={onClose} />
    </div>
  );
}
