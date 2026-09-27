// ============================================================================
// core/editor/editorService.ts — 4.7 c2. Modelo de abas do Editor Anexo,
// PURO (zero DOM/React; FT-07). Espelha editorGroupModel.ts do VS Code:
//   • um grupo por sessão (04_05 §2.2) — abas de S1 não vazam para S2;
//   • preview ÚNICO por grupo: clique simples abre em preview (itálico);
//     o próximo preview SUBSTITUI o anterior NA MESMA POSIÇÃO; duplo clique,
//     `pinned:true` ou edição (dirty) promovem a pinado;
//   • dirty por aba; fechar dirty sem `force` é bloqueado (c5 mostra o diálogo);
//     um preview dirty nunca é substituído;
//   • MRU: fechar a ativa ativa a mais recentemente usada;
//   • última aba fechada → `editor.attachCollapsed` (quem esconde é o layout,
//     com display:none — Regra 10 docs/18); primeira aberta → `attachExpanded`.
// ============================================================================
import type { AttachTab, ExplorerSearchEvent, WorkspaceUri } from '../../contract';
import { Emitter } from '../emitter';

export interface EditorTab extends AttachTab {
  preview: boolean;
  active: boolean;
}

/** 4.7-b c2: URI sintética da aba fixa "Changes" (nunca vai ao servidor). */
export const ATTACH_CHANGES_URI = 'file:///.explorer-search/changes' as WorkspaceUri;

export type AttachTabKind = 'code' | 'search' | 'changes';

export interface OpenInput {
  sessionId: string;
  uri: WorkspaceUri;
  kind: AttachTabKind;
  /** true = abre/promove a pinado (duplo clique, Ctrl+Enter, "Keep Open"). */
  pinned?: boolean;
  line?: number;
  column?: number;
}

interface TabState { uri: WorkspaceUri; kind: AttachTabKind; dirty: boolean; preview: boolean }
interface Group { tabs: TabState[]; active: WorkspaceUri | null; mru: WorkspaceUri[] }

export class EditorService {
  private readonly groups = new Map<string, Group>();
  private readonly events = new Emitter<ExplorerSearchEvent>();
  private disposed = false;

  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void { return this.events.add(cb); }

  // ---- leitura ----
  getTabs(sessionId: string): EditorTab[] {
    const g = this.groups.get(sessionId);
    if (!g) return [];
    return g.tabs.map((t) => ({ ...t, active: g.active === t.uri }));
  }
  getActive(sessionId: string): EditorTab | null {
    const g = this.groups.get(sessionId);
    if (!g || !g.active) return null;
    const t = g.tabs.find((x) => x.uri === g.active);
    return t ? { ...t, active: true } : null;
  }
  hasDirty(sessionId: string): boolean { return (this.groups.get(sessionId)?.tabs ?? []).some((t) => t.dirty); }
  /** Todas as sessões com esta URI aberta (c5: conflito externo / save). */
  sessionsWith(uri: WorkspaceUri): string[] {
    const out: string[] = [];
    for (const [sid, g] of this.groups) if (g.tabs.some((t) => t.uri === uri)) out.push(sid);
    return out;
  }

  // ---- mutações ----
  open(input: OpenInput): void {
    if (this.disposed) return;
    const { sessionId, uri, kind } = input;
    const g = this.group(sessionId);
    const wasEmpty = g.tabs.length === 0;
    const existing = g.tabs.find((t) => t.uri === uri);
    if (existing) {
      if (input.pinned && existing.preview) {
        existing.preview = false;
        this.fire({ type: 'editor.tabPinned', sessionId, uri });
      }
    } else if (kind === 'changes') {
      // 4.7-b c2: aba fixa — sempre a PRIMEIRA, nunca preview, nunca dirty, 1 por sessão.
      const tab: TabState = { uri, kind, dirty: false, preview: false };
      g.tabs.unshift(tab);
      this.fire({ type: 'editor.tabOpened', sessionId, uri, kind, preview: false });
    } else {
      const tab: TabState = { uri, kind, dirty: false, preview: !input.pinned };
      const previewIdx = tab.preview ? g.tabs.findIndex((t) => t.preview && !t.dirty) : -1;
      if (previewIdx >= 0) {
        const old = g.tabs[previewIdx];
        g.tabs[previewIdx] = tab;
        g.mru = g.mru.filter((u) => u !== old.uri);
        this.fire({ type: 'editor.tabClosed', sessionId, uri: old.uri });
      } else {
        g.tabs.push(tab);
      }
      this.fire({ type: 'editor.tabOpened', sessionId, uri, kind, preview: tab.preview });
    }
    this.setActive(g, sessionId, uri);
    if (wasEmpty) this.fire({ type: 'editor.attachExpanded', sessionId });
    if (typeof input.line === 'number') {
      this.fire({ type: 'editor.revealRequested', sessionId, uri, line: input.line, column: input.column });
    }
  }

  activate(input: { sessionId: string; uri: WorkspaceUri }): void {
    if (this.disposed) return;
    const g = this.groups.get(input.sessionId);
    if (!g || !g.tabs.some((t) => t.uri === input.uri)) return;
    this.setActive(g, input.sessionId, input.uri);
  }

  pin(input: { sessionId: string; uri: WorkspaceUri }): void {
    if (this.disposed) return;
    const t = this.groups.get(input.sessionId)?.tabs.find((x) => x.uri === input.uri);
    if (!t || !t.preview) return;
    t.preview = false;
    this.fire({ type: 'editor.tabPinned', sessionId: input.sessionId, uri: input.uri });
  }

  setDirty(input: { sessionId: string; uri: WorkspaceUri; dirty: boolean }): void {
    if (this.disposed) return;
    const t = this.groups.get(input.sessionId)?.tabs.find((x) => x.uri === input.uri);
    if (!t || t.kind === 'changes' || t.dirty === input.dirty) return;
    t.dirty = input.dirty;
    if (input.dirty && t.preview) {
      // editar promove o preview (editorGroupModel: pin on edit)
      t.preview = false;
      this.fire({ type: 'editor.tabPinned', sessionId: input.sessionId, uri: input.uri });
    }
    this.fire({ type: 'editor.dirtyChanged', sessionId: input.sessionId, uri: input.uri, dirty: input.dirty });
  }

  /** false = bloqueado por dirty (sem `force`). */
  close(input: { sessionId: string; uri: WorkspaceUri; force?: boolean }): boolean {
    if (this.disposed) return false;
    const g = this.groups.get(input.sessionId);
    const idx = g ? g.tabs.findIndex((t) => t.uri === input.uri) : -1;
    if (!g || idx < 0) return true;
    if (g.tabs[idx].dirty && !input.force) return false;
    g.tabs.splice(idx, 1);
    g.mru = g.mru.filter((u) => u !== input.uri);
    this.fire({ type: 'editor.tabClosed', sessionId: input.sessionId, uri: input.uri });
    if (g.active === input.uri) {
      const next = g.mru[0] ?? g.tabs[Math.min(idx, g.tabs.length - 1)]?.uri ?? null;
      g.active = null;
      if (next) this.setActive(g, input.sessionId, next);
      else this.fire({ type: 'editor.activeChanged', sessionId: input.sessionId, uri: null });
    }
    if (g.tabs.length === 0) this.fire({ type: 'editor.attachCollapsed', sessionId: input.sessionId });
    return true;
  }

  /** false = sobraram abas dirty (sem `force`). A aba fixa "Changes" NÃO é
   *  fechada por Close All (só por `close` explícito) — 4.7-b c2. */
  closeAll(input: { sessionId: string; force?: boolean }): boolean {
    if (this.disposed) return false;
    const g = this.groups.get(input.sessionId);
    if (!g) return true;
    for (const t of [...g.tabs]) if (t.kind !== 'changes') this.close({ sessionId: input.sessionId, uri: t.uri, force: input.force });
    return g.tabs.every((t) => t.kind === 'changes');
  }

  /** 4.7-b c2: a aba "Changes" está aberta nesta sessão? */
  hasChanges(sessionId: string): boolean {
    return (this.groups.get(sessionId)?.tabs ?? []).some((t) => t.kind === 'changes');
  }

  /** c5: aba salva com sucesso (quem escreve no disco é o barrel; aqui só o estado). */
  markSaved(input: { sessionId: string; uri: WorkspaceUri }): void {
    if (this.disposed) return;
    const t = this.groups.get(input.sessionId)?.tabs.find((x) => x.uri === input.uri);
    if (!t) return;
    if (t.dirty) { t.dirty = false; this.fire({ type: 'editor.dirtyChanged', sessionId: input.sessionId, uri: input.uri, dirty: false }); }
    this.fire({ type: 'editor.saved', sessionId: input.sessionId, uri: input.uri });
  }

  /** c5: `fs.changed` numa URI aberta → emite por sessão com o estado dirty
   *  (limpa: quem consome recarrega em silêncio; suja: pergunta). */
  notifyExternalChange(uri: WorkspaceUri): Array<{ sessionId: string; dirty: boolean }> {
    if (this.disposed) return [];
    const out: Array<{ sessionId: string; dirty: boolean }> = [];
    for (const [sessionId, g] of this.groups) {
      const t = g.tabs.find((x) => x.uri === uri);
      if (!t) continue;
      out.push({ sessionId, dirty: t.dirty });
      this.fire({ type: 'editor.externalChange', sessionId, uri, dirty: t.dirty });
    }
    return out;
  }

  dispose(): void {
    this.disposed = true;
    this.groups.clear();
    this.events.dispose();
  }

  // ---- internos ----
  private group(sessionId: string): Group {
    let g = this.groups.get(sessionId);
    if (!g) { g = { tabs: [], active: null, mru: [] }; this.groups.set(sessionId, g); }
    return g;
  }
  private setActive(g: Group, sessionId: string, uri: WorkspaceUri): void {
    g.mru = [uri, ...g.mru.filter((u) => u !== uri)];
    if (g.active === uri) return;
    g.active = uri;
    this.fire({ type: 'editor.activeChanged', sessionId, uri });
  }
  private fire(e: ExplorerSearchEvent): void { if (!this.disposed) this.events.fire(e); }
}
