// ============================================================================
// modules/explorer-search/core/timeline/browserTimelinePort.ts — 5.6 (A0.6).
// TimelinePortLike via fetch nas rotas aditivas do Single Port: `POST /git/log`
// e `POST /git/show` (ref = sha). Mesmo padrão do core/git/browserGitPort
// (que segue intocável — este arquivo é novo/aditivo). PURO: só globals web.
// ============================================================================
import type { WorkspaceUri } from '../../contract';
import type { TimelineCommit, TimelinePortLike } from './timelineModel';

export class BrowserTimelineError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = 'BrowserTimelineError';
  }
}

export class BrowserTimelinePort implements TimelinePortLike {
  constructor(private readonly base: string = '', private readonly fetchImpl: typeof fetch = (...a) => fetch(...a)) {}

  private async post<T>(op: string, body: Record<string, unknown>): Promise<T> {
    const res = await this.fetchImpl(`${this.base}/git/${op}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      let code = 'io';
      let message = res.statusText;
      try { const d = (await res.json()) as { code?: string; message?: string }; code = d.code ?? code; message = d.message ?? message; } catch { /* não-JSON */ }
      throw new BrowserTimelineError(code, message, res.status);
    }
    const text = await res.text();
    return (text.length > 0 ? JSON.parse(text) : undefined) as T;
  }

  async log(root: WorkspaceUri, uri: WorkspaceUri, limit?: number): Promise<TimelineCommit[]> {
    return (await this.post<{ entries: TimelineCommit[] }>('log', { root, uri, ...(limit ? { limit } : {}) })).entries ?? [];
  }
  async showAt(root: WorkspaceUri, uri: WorkspaceUri, sha: string): Promise<string> {
    return (await this.post<{ content: string }>('show', { root, uri, ref: sha })).content ?? '';
  }
}
