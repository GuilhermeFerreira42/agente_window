/**
 * Contrato do Editor — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 7
 */
import type { WorkspaceUri } from './common.js';

export interface EditorResource {
  uri: WorkspaceUri;
  kind: 'code' | 'browser' | 'search' | 'changes' | 'diff';
  title: string;
}

export interface EditorService {
  open(resource: EditorResource): Promise<void>;
  close(input: { uri: WorkspaceUri }): Promise<void>;
  split(input: { direction: 'horizontal' | 'vertical' }): void;
  reveal(input: { uri: WorkspaceUri; line?: number; column?: number }): Promise<void>;
  save(input: { uri: WorkspaceUri }): Promise<void>;
}
