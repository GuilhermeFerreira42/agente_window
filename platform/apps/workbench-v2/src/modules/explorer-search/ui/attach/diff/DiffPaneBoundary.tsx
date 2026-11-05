// ============================================================================
// ui/attach/diff/DiffPaneBoundary.tsx — pós-11 C7 (vídeo4 do dono).
// Cinto de segurança do DiffPane: um erro do Monaco (modelo/URI) cai AQUI e
// mostra um aviso honesto em vez de desmontar o anexo inteiro ("não abre
// nenhum arquivo"). Reseta sozinho ao trocar de arquivo/conteúdo (resetKey).
// ============================================================================
import React from 'react';

interface DiffPaneBoundaryProps {
  /** Muda a cada arquivo/conteúdo novo — tira a barreira do estado de erro. */
  resetKey: string;
  fileName: string;
  children: React.ReactNode;
}

interface DiffPaneBoundaryState {
  erro: boolean;
}

export class DiffPaneBoundary extends React.Component<DiffPaneBoundaryProps, DiffPaneBoundaryState> {
  state: DiffPaneBoundaryState = { erro: false };

  static getDerivedStateFromError(): DiffPaneBoundaryState {
    return { erro: true };
  }

  componentDidCatch(): void {
    // O console do navegador já registra o detalhe técnico; aqui só contém.
  }

  componentDidUpdate(prevProps: DiffPaneBoundaryProps): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.erro) {
      this.setState({ erro: false });
    }
  }

  render(): React.ReactNode {
    if (this.state.erro) {
      return (
        <div className="attach-diff-pane attach-diff-fallback" role="alert" data-testid="attach-diff-fallback">
          A comparação de {this.props.fileName} não abriu (erro interno). Clique em outro arquivo.
        </div>
      );
    }
    return this.props.children;
  }
}
