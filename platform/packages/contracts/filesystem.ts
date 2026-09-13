/**
 * Contrato do Filesystem — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 5
 */
import type { WorkspaceUri, FileNode } from './common.js';

export interface FileSystemPort {
  list(input: { uri: WorkspaceUri }): Promise<Array<FileNode>>;
  readFile(input: { uri: WorkspaceUri }): Promise<{ content: string; encoding: 'utf-8' }>;
  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void>;
  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  remove(input: { uri: WorkspaceUri; recursive?: boolean }): Promise<void>;
  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }>;
}

export type { FileNode };
