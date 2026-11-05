// ============================================================================
// modules/explorer-search/core/dndPolicy.ts — Decisão pura de Drag&Drop.
// Fonte upstream (7debcd0e): FileDragAndDrop (views/explorerViewer.ts:1571),
//  handleDragOver (:1601/:1636), despacho externo/interno (:1812–1830),
//  handleExplorerDrop (:1836, confirm + move/copy, Ctrl|⌘Alt=copiar, Esc=cancela).
// Subset LEGO (04_11 §11-A): sem CompressedFoldersEditor, sem multi-root (Q4
// roots-reorder = fora), sem ExplorerService.isEditable. Somente regras puras
// de aceite/rejeição + resolução do alvo. I/O quem faz é o service (move/copy).
// ============================================================================
import type { ExplorerItem } from './explorerModel';
import {
  uriDirname,
  uriEquals,
  uriIsEqualOrParent,
} from './uri';

/**
 * Dados do drag — dois mundos possíveis:
 * - 'internal': itens do próprio Explorer arrastados dentro da árvore;
 * - 'external': arquivos do SO caindo sobre a árvore (drop ⬆⬇).
 */
export type DndData =
  | { kind: 'internal'; items: ExplorerItem[] }
  | { kind: 'external'; uris: readonly [] | readonly string[]; hasFiles: boolean };

export type DndEffect = 'copy' | 'move';
export type DndPosition = 'over' | 'before' | 'after';

export interface DndDecision {
  accept: boolean;
  effect?: DndEffect;
  position?: DndPosition;
  /** true quando o alvo se auto-expande ao ficar em hover (pasta). */
  autoExpand?: boolean;
  /** Motivo legível (para UI/ l og). undefined quando accept=true. */
  reason?: string;
}

export interface DndContext {
  /** modificadores do evento real de mouse/teclado. */
  ctrlKey: boolean;
  altKey: boolean;
  /** plataforma: macOS reutiliza Alt para copiar. */
  isMacintosh: boolean;
}

/** Escolhe o alvo efetivo do drop: pasta vira alvo direto; arquivo vira a
 *  pasta pai (bubbling Up do upstream). */
export function resolveDropTarget(target: ExplorerItem | null): ExplorerItem | null {
  if (!target) return null;
  return target.isDirectory ? target : target.parent ?? null;
}

/**
 * Decisão do drag-over — porte fiel de handleDragOver (explorerViewer.ts:1636).
 * Regra: `onDragOver` de true NÃO executa move — só sinaliza feedback;
 * a execução acontece no drop (ExplorerService.move/copy). Esc cancela na UI.
 */
export function decideDragOver(
  data: DndData,
  target: ExplorerItem | null,
  ctx: DndContext,
): DndDecision {
  // Cópia: Ctrl no Windows/Linux, Alt (Option) no macOS — upstream:1641.
  const isCopy = (!ctx.isMacintosh && ctx.ctrlKey) || (ctx.isMacintosh && ctx.altKey);

  // --- Drag EXTERNO (OS -> árvore): aceita apenas se trouxer arquivos — :1653
  if (data.kind === 'external') {
    if (!data.hasFiles) {
      return { accept: false, reason: 'nenhum arquivo no drop externo' };
    }
    const resolved = resolveDropTarget(target);
    if (!resolved) {
      return { accept: false, reason: 'sem alvo' };
    }
    if (resolved.isReadonly) {
      return { accept: false, reason: 'pasta somente-leitura' };
    }
    return {
      accept: true,
      effect: 'copy', // externo sempre importa/carrega → efeito copy
      position: 'over',
      autoExpand: resolved.isDirectory,
    };
  }

  // --- Drag EXTERNO de outra tree (elementos) — :1658 rejeita
  // (no nosso subset essa categoria não existe; todo não-internal externo é OS)

  // --- Drag INTERNO (move/copy dentro da árvore) — do :1660 em diante
  const items = data.items;
  if (items.length === 0) return { accept: false, reason: 'sem itens' };

  const root = items[0].root;
  const resolvedTarget = resolveDropTarget(target);

  // Alvo = fundo vazio: só aceita copiar/mover PARA a raiz. Itens já no topo
  // da raiz não aceitam mover para a própria raiz (no-op visual) — :1666.
  if (!target) {
    if (!isCopy && items.every((i) => i.parent === root || i.parent == null)) {
      return { accept: false, reason: 'já está na raiz' };
    }
    return { accept: true, effect: isCopy ? 'copy' : 'move', position: 'over' };
  }
  if (!resolvedTarget) return { accept: false, reason: 'sem alvo resolvido' };

  // Todos somente-leitura → só permite copiar (move exige escrita) — :1675
  if (!isCopy && items.every((s) => s.isReadonly)) {
    return { accept: false, reason: 'itens somente-leitura não podem ser movidos' };
  }

  for (const source of items) {
    // Não pode mover nada para cima de si mesmo — :1683
    if (uriEquals(source.resource, resolvedTarget.resource)) {
      return { accept: false, reason: 'alvo é o próprio item' };
    }
    // Não pode mover para a MESMA pasta sem querer copiar — :1687
    if (!isCopy && uriEquals(uriDirname(source.resource), resolvedTarget.resource) && source.parent != null) {
      return { accept: false, reason: 'item já está na pasta alvo (use Ctrl para copiar)' };
    }
    // Não pode mover pasta para dentro de um dos seus filhos — :1691
    if (
      !uriEquals(resolvedTarget.resource, source.resource) &&
      uriIsEqualOrParent(resolvedTarget.resource, source.resource) &&
      source.isDirectory
    ) {
      return { accept: false, reason: 'não pode mover pasta para dentro de si mesma' };
    }
  }

  // Alvo = raiz da tree: aceita (move para o topo) — :1731
  // Alvo = pasta (resolvida acima): aceita com auto-expand — :1734
  if (resolvedTarget.isDirectory) {
    if (resolvedTarget.isReadonly) {
      return { accept: false, reason: 'pasta somente-leitura' };
    }
    return {
      accept: true,
      effect: isCopy ? 'copy' : 'move',
      position: 'over',
      autoExpand: true,
    };
  }

  return { accept: false, reason: 'alvo não suportado' };
}

/** Fluxo de drop externo no dispatched upstream (:1823): alvo resolvido vira
 *  destino de upload. Não executa nada — a UI/ service faz o upload via fs. */
export interface ExternalDropPlan {
  kind: 'upload';
  target: ExplorerItem;
}

/** Fluxo de drop interno (:1836→doHandleExplorerDrop...): move ou copy. */
export interface InternalDropPlan {
  kind: 'move' | 'copy';
  sources: ExplorerItem[];
  target: ExplorerItem;
}

export type DropPlan = ExternalDropPlan | InternalDropPlan;

/** Constrói o plano de execução do drop a partir da decisão do drag-over. */
export function planDrop(
  data: DndData,
  decision: DndDecision,
  target: ExplorerItem | null,
): DropPlan | null {
  if (!decision.accept) return null;
  const resolved = resolveDropTarget(target) ?? (data.kind === 'internal' ? data.items[0]?.root ?? null : null);
  if (!resolved) return null;
  if (data.kind === 'external') return { kind: 'upload', target: resolved };
  if (data.items.length === 0) return null;
  return {
    kind: decision.effect === 'copy' ? 'copy' : 'move',
    sources: data.items,
    target: resolved,
  };
}
