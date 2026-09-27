// ============================================================================
// modules/explorer-search/core/git/browserGitPort.ts — GitPortLike via fetch.
// 4.7-b c1: fala com /git/* do Single Port (04_21 §4). Erros carregam `code`.
// PURO (FT-07): só globals web.
// ============================================================================
import type { WorkspaceUri } from '../../contract';
import type { GitPortLike, GitStatus } from './gitService';

export class BrowserGitError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'BrowserGitError';
  }
}

export class BrowserGitPort implements GitPortLike {
  constructor(private readonly base: string = '') {}

  private async post<T>(op: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.base}/git/${op}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let code = 'io';
      let message = res.statusText;
      try {
        const data = (await res.json()) as { code?: string; message?: string };
        code = data.code ?? code;
        message = data.message ?? message;
      } catch { /* corpo não-JSON */ }
      throw new BrowserGitError(code, message, res.status);
    }
    const text = await res.text();
    return (text.length > 0 ? JSON.parse(text) : undefined) as T;
  }

  status(root: WorkspaceUri): Promise<GitStatus> { return this.post('status', { root }); }
  init(root: WorkspaceUri): Promise<void> { return this.post('init', { root }); }
  stage(root: WorkspaceUri, uris: WorkspaceUri[]): Promise<void> { return this.post('stage', { root, uris }); }
  unstage(root: WorkspaceUri, uris: WorkspaceUri[]): Promise<void> { return this.post('unstage', { root, uris }); }
  discard(root: WorkspaceUri, uris: WorkspaceUri[]): Promise<void> { return this.post('discard', { root, uris }); }
  commit(root: WorkspaceUri, message: string): Promise<{ oid: string }> { return this.post('commit', { root, message }); }
}
