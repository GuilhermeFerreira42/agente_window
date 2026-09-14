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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setReady(true), 100);
      return () => clearTimeout(t);
    } else {
      setReady(false);
    }
  }, [visible]);

  if (!visible) return null;

  if (!ready) {
    return (
      <div style={{ padding: '12px', background: '#181818', color: '#cccccc', fontSize: '12px', borderTop: '1px solid #2b2b2b' }}>
        Carregando terminal VS Code fiel...
      </div>
    );
  }

  return <VSCodeTerminal visible={visible} sessionId={sessionId} workspace={workspace} onClose={onClose} />;
}
