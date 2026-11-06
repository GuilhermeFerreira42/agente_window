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
//
// FATIA 15 Onda 3 (D169) — SPLIT: até aqui "uma sessão = um grupo". O botão
// "Dividir editor" do centro existia mas não dividia nada (abria uma aba falsa
// `workspace/split`), porque o gate de single-pane (E15/R-039) rejeita o split
// enquanto o layout single-pane está ligado. A partir daqui o serviço sabe
// manter DOIS grupos por sessão (principal/secundário), com abas, ativa e MRU
// INDEPENDENTES — é o que o VS Code chama de `editorGroupModel` por grupo.
//
// A decisão de projeto que importa: uma aba NUNCA está nos dois grupos ao mesmo
// tempo. O `CodeEditorPane` cacheia UM modelo do Monaco por URI; se a mesma URI
// vivesse em dois grupos, os dois painéis disputariam o mesmo modelo (o segundo
// `createModel` com a mesma uri estoura) ou editariam o mesmo texto por baixo um
// do outro. Por isso "abrir do outro lado" MOVE a aba (migração), preservando
// dirty/preview — e o painel de origem solta o modelo no `editor.tabClosed`.
// ============================================================================
import type { AttachDiffPayload, AttachTab, ExplorerSearchEvent, WorkspaceUri } from '../../contract';
import { Emitter } from '../emitter';

export interface EditorTab extends AttachTab {
  preview: boolean;
  active: boolean;
}

/** 4.7-b c2: URI sintética da aba fixa "Changes" (nunca vai ao servidor). */
export const ATTACH_CHANGES_URI = 'file:///.explorer-search/changes' as WorkspaceUri;

/** 4.7-c c1: URI sintética da aba fixa "Diff" (1 por sessão; payload trocado a cada open). */
export const ATTACH_DIFF_URI = 'file:///.explorer-search/diff' as WorkspaceUri;

export type AttachTabKind = 'code' | 'search' | 'changes' | 'diff';

/**
 * D169: os grupos de uma sessão. `principal` é o de sempre; `secundario` só
 * existe depois de um split. `split(sessionId)` abre um id de grupo IRMÃO
 * (`${sessionId}#2`) e o painel secundário passa a LER/ESCREVER nesse id — o
 * serviço continua agnóstico de quem é painel e de onde ele está na tela
 * (sobrevive a anexo↔maximizado, que é só layout).
 */
export const GRUPO_SECUNDARIO = (sessionId: string): string => `${sessionId}#2`;

export interface OpenInput {
  sessionId: string;
  uri: WorkspaceUri;
  kind: AttachTabKind;
  /** true = abre/promove a pinado (duplo clique, Ctrl+Enter, "Keep Open"). */
  pinned?: boolean;
  line?: number;
  column?: number;
  /** 4.7-c: obrigatório quando kind === 'diff'. */
  diff?: AttachDiffPayload;
}

interface TabState { uri: WorkspaceUri; kind: AttachTabKind; dirty: boolean; preview: boolean; diff?: AttachDiffPayload }
interface Group { tabs: TabState[]; active: WorkspaceUri | null; mru: WorkspaceUri[] }

export class EditorService {
  private readonly groups = new Map<string, Group>();
  /**
   * D169: qual grupo desta sessão está com o foco. É o que decide ONDE um
   * arquivo aberto pelo Explorer aterrissa — sem isso o painel secundário
   * existiria mas nunca receberia nada, e "dividir" viraria um retângulo vazio.
   * Chave: sessão lógica. Valor: id de grupo.
   */
  private readonly focused = new Map<string, string>();
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
    const { uri, kind } = input;
    // D169: se a URI já está aberta em QUALQUER lado, ativo aquele lado (nunca
    // abro a mesma URI em dois grupos — ver cabeçalho). Senão, abro no lado com
    // foco: é o que faz o painel dividido receber arquivos do Explorer.
    const jahAberta = this.groupIdOf(input.sessionId, uri);
    const alvo = jahAberta ?? (this.focused.get(input.sessionId) && this.groups.has(this.focused.get(input.sessionId)!)
      ? this.focused.get(input.sessionId)!
      : input.sessionId);
    // O resto do método trabalha por GRUPO: `sessionId` aqui é o id do grupo
    // (principal = id da sessão, secundário = `${sessão}#2`). Os eventos saem com
    // o id do grupo de propósito — é o filtro que cada painel usa para saber se
    // o evento é dele. O shell nunca vê id de grupo: ele lê as projeções do
    // grupo principal e o `editor.splitChanged`/`tabMoved`, que levam a sessão.
    const sessionId = alvo;
    const g = this.group(sessionId);
    const wasEmpty = g.tabs.length === 0;
    const existing = g.tabs.find((t) => t.uri === uri);
    if (existing) {
      if (input.pinned && existing.preview) {
        existing.preview = false;
        this.fire({ type: 'editor.tabPinned', sessionId, uri });
      }
      if (kind === 'diff' && input.diff) {
        // 4.7-c: mesma aba, novo conteúdo (nunca abre uma 2.ª aba Diff)
        existing.diff = input.diff;
        this.fire({ type: 'editor.diffChanged', sessionId, uri });
      }
    } else if (kind === 'diff') {
      // 4.7-c c1: aba fixa — logo após "Changes" (ou primeira), nunca preview, nunca dirty, 1 por sessão.
      if (!input.diff) return;
      const tab: TabState = { uri, kind, dirty: false, preview: false, diff: input.diff };
      const afterChanges = g.tabs.findIndex((t) => t.kind === 'changes') + 1;
      g.tabs.splice(afterChanges, 0, tab);
      this.fire({ type: 'editor.tabOpened', sessionId, uri, kind, preview: false });
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
    if (!t || t.kind === 'changes' || t.kind === 'diff' || t.dirty === input.dirty) return;
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
    // 4.7-b/4.7-c: abas fixas (Changes, Diff) são imunes ao Close All.
    for (const t of [...g.tabs]) if (t.kind !== 'changes' && t.kind !== 'diff') this.close({ sessionId: input.sessionId, uri: t.uri, force: input.force });
    return g.tabs.every((t) => t.kind === 'changes' || t.kind === 'diff');
  }

  /** 4.7-b c2: a aba "Changes" está aberta nesta sessão? */
  /** 4.7-c: payload atual da aba Diff (null se fechada). */
  getDiff(sessionId: string): AttachDiffPayload | null {
    return this.groups.get(sessionId)?.tabs.find((t) => t.kind === 'diff')?.diff ?? null;
  }
  hasChanges(sessionId: string): boolean {
    return (this.groups.get(sessionId)?.tabs ?? []).some((t) => t.kind === 'changes');
  }

  // ---- D169: split ----

  /** O grupo secundário desta sessão existe (há divisão aberta)? */
  isSplit(sessionId: string): boolean { return this.groups.has(GRUPO_SECUNDARIO(sessionId)); }

  /** Ids dos grupos desta sessão, na ordem de exibição (principal primeiro). */
  groupIds(sessionId: string): string[] {
    const out: string[] = [];
    if (this.groups.has(sessionId)) out.push(sessionId);
    if (this.groups.has(GRUPO_SECUNDARIO(sessionId))) out.push(GRUPO_SECUNDARIO(sessionId));
    return out;
  }

  /**
   * Cria o grupo secundário VAZIO e devolve o id. O painel secundário abre com a
   * aba que o usuário escolher — não herdo a ativa de propósito: duplicar a
   * mesma aba nos dois lados é exatamente o estado que o cache de modelos não
   * suporta (ver cabeçalho). Devolve null se já havia split (idempotente).
   */
  split(sessionId: string): string | null {
    if (this.disposed) return null;
    const id = GRUPO_SECUNDARIO(sessionId);
    if (this.groups.has(id)) return null;
    this.group(sessionId);            // garante o principal existindo
    this.groups.set(id, { tabs: [], active: null, mru: [] });
    this.fire({ type: 'editor.splitChanged', sessionId, split: true });
    return id;
  }

  /** Remove o grupo secundário INTEIRO. Bloqueado por dirty sem `force`. */
  unsplit(input: { sessionId: string; force?: boolean }): boolean {
    if (this.disposed) return false;
    const id = GRUPO_SECUNDARIO(input.sessionId);
    const g = this.groups.get(id);
    if (!g) return true;
    if (!input.force && g.tabs.some((t) => t.dirty)) return false;
    // Fecho as abas uma a uma para o painel descartar os modelos do Monaco
    // (`editor.tabClosed` é o gatilho do `disposeEntry`), e só então removo o grupo.
    for (const t of [...g.tabs]) this.close({ sessionId: id, uri: t.uri, force: true });
    this.groups.delete(id);
    this.fire({ type: 'editor.splitChanged', sessionId: input.sessionId, split: false });
    return true;
  }

  /**
   * Move uma aba para o OUTRO lado (abrir do outro lado / mover para o lado).
   * Preserva dirty, preview e o payload de diff; a aba sai do grupo de origem
   * (nunca duplica) e passa a ser a ATIVA do destino.
   */
  moveTab(input: { sessionId: string; uri: WorkspaceUri; to: 'principal' | 'secundario' }): boolean {
    if (this.disposed) return false;
    const origemId = this.groupIdOf(input.sessionId, input.uri);
    const destinoId = input.to === 'principal' ? input.sessionId : GRUPO_SECUNDARIO(input.sessionId);
    if (!origemId || origemId === destinoId) return false;
    const origem = this.groups.get(origemId);
    if (!origem || !this.groups.has(destinoId)) return false;
    if (origem.tabs.length <= 1) return false;   // não deixo um painel sem nenhuma aba
    const idx = origem.tabs.findIndex((t) => t.uri === input.uri);
    if (idx < 0) return false;
    const [tab] = origem.tabs.splice(idx, 1);
    origem.mru = origem.mru.filter((u) => u !== input.uri);
    this.groups.get(destinoId)!.tabs.push(tab);
    this.fire({ type: 'editor.tabClosed', sessionId: origemId, uri: input.uri });
    if (origem.active === input.uri) {
      const next = origem.mru[0] ?? origem.tabs[Math.min(idx, origem.tabs.length - 1)]?.uri ?? null;
      origem.active = null;
      if (next) this.setActive(origem, origemId, next);
      else this.fire({ type: 'editor.activeChanged', sessionId: origemId, uri: null });
    }
    this.fire({ type: 'editor.tabOpened', sessionId: destinoId, uri: tab.uri, kind: tab.kind, preview: tab.preview });
    this.setActive(this.groups.get(destinoId)!, destinoId, tab.uri);
    this.fire({ type: 'editor.tabMoved', sessionId: input.sessionId, uri: input.uri, to: input.to });
    return true;
  }

  /** Marca qual lado tem o foco (chamado pelo painel ao receber foco de verdade). */
  setFocusGroup(input: { sessionId: string; side: 'principal' | 'secundario' }): void {
    if (this.disposed) return;
    const id = input.side === 'principal' ? input.sessionId : GRUPO_SECUNDARIO(input.sessionId);
    if (!this.groups.has(id)) return;
    if (this.focused.get(input.sessionId) === id) return;
    this.focused.set(input.sessionId, id);
    this.fire({ type: 'editor.focusGroupChanged', sessionId: input.sessionId, side: input.side });
  }

  /** Lado com foco (default: principal). */
  focusGroupOf(sessionId: string): 'principal' | 'secundario' {
    const id = this.focused.get(sessionId);
    return id && id !== sessionId && this.groups.has(id) ? 'secundario' : 'principal';
  }

  /** Em qual grupo (id de grupo) esta URI está, nesta sessão. `null` = em lugar nenhum. */
  groupIdOf(sessionId: string, uri: WorkspaceUri): string | null {
    for (const id of this.groupIds(sessionId)) {
      if (this.groups.get(id)?.tabs.some((t) => t.uri === uri)) return id;
    }
    return null;
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
