/**
 * Contrato do Explorer — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 6
 */
import type { WorkspaceUri } from './common.js';

export interface ExplorerService {
  setRoot(input: { uri: WorkspaceUri }): Promise<void>;
  expand(input: { uri: WorkspaceUri }): Promise<void>;
  collapse(input: { uri: WorkspaceUri }): Promise<void>;
  open(input: { uri: WorkspaceUri }): Promise<void>;
  reveal(input: { uri: WorkspaceUri }): Promise<void>;
  refresh(input?: { uri?: WorkspaceUri }): Promise<void>;
}
