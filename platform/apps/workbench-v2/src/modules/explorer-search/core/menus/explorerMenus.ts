// ============================================================================
// modules/explorer-search/core/menus/explorerMenus.ts — Tabela DECLARATIVA do
// menu de contexto do Explorer (04_03 §1/§2/§7; 04_18 §4.5 itens 1–3).
// Fonte upstream (7debcd0e): workbench/contrib/files/browser/
//   fileActions.contribution.ts:478–680 (appendMenuItem em MenuId.ExplorerContext)
//   — grupos/ordem/`when` portados 1:1 para o subset em escopo (04_11 §11-C:
//   fora de escopo Add/Remove Folder, Compare, Open With, Open Timeline).
// Regra 04_10 §2.4 / VAL-EXP-08: o componente de menu apenas lista os itens
// cujo `when` é verdadeiro e dispara `menus.execute(id)` — ZERO lógica inline.
//
// Context keys publicadas (conjunto congelado `EXPLORER_CONTEXT_KEYS`) são
// derivadas do estado do serviço por `computeExplorerContext` e avaliadas pelo
// evaluator `when.ts` (subset `!`, `&&`, `||`, `===`, `!==`).
// ============================================================================

import { compileWhen, type WhenEvaluator } from './when';
import type { ExplorerContextKey } from '../constants';

/** Item declarativo (equivale a um `appendMenuItem` upstream). */
export interface ExplorerMenuItemSpec {
  id: string;
  label: string;
  group: ExplorerMenuGroup;
  order: number;
  /** Visibilidade (upstream `when`). Ausente → sempre visível. */
  when?: string;
  /** Habilitação (upstream `precondition`). Ausente → sempre habilitado. */
  precondition?: string;
  danger?: boolean;
}

/** Grupos na ordem em que aparecem (separador entre grupos — 04_18 item 2). */
export const EXPLORER_MENU_GROUPS = [
  'navigation',
  '5_cutcopypaste',
  '5b_importexport',
  '7_modification',
  '9_view',
] as const;
export type ExplorerMenuGroup = (typeof EXPLORER_MENU_GROUPS)[number];

/** Valores publicados por seleção/operação (04_03 §7 mapeado ao conjunto congelado 04_10 §2.4). */
export type ExplorerContextValues = Record<ExplorerContextKey, boolean> & {
  /** `ResourceContextKey.HasResource` upstream — há um nó sob o cursor/seleção. */
  explorerResourceHasResource: boolean;
};

/**
 * Tabela 04_03 §1 (subset em escopo).
 *  - New File/New Folder: `navigation` 4/6, `when: ExplorerFolderContext`
 *    (upstream). No AGENTE WINDOW o clique em ARQUIVO cria "no pai" (Q3 /
 *    04_03 §2 "✔ (no pai)") — portanto `when` = há recurso; precondition = pai gravável.
 *  - Open: `navigation` 10 (upstream Open to the Side é a variante; aqui o Open
 *    principal já homologado na 4.4) — só arquivo.
 *  - Cut/Copy/Paste: `5_cutcopypaste` 8/10/20.
 *  - Download/Upload: `5b_importexport` 10/20 (Upload só em pasta gravável — web).
 *  - Rename/Delete: `7_modification` 10/20 (nunca na raiz).
 *  - Refresh/Collapse: `9_view` (ações do header também acessíveis pelo menu).
 */
export const EXPLORER_CONTEXT_MENU: readonly ExplorerMenuItemSpec[] = [
  { id: 'explorer.newFile', label: 'New File...', group: 'navigation', order: 4,
    when: 'explorerResourceHasResource && !multiSelectionActive', precondition: '!explorerResourceParentReadOnly' },
  { id: 'explorer.newFolder', label: 'New Folder...', group: 'navigation', order: 6,
    when: 'explorerResourceHasResource && !multiSelectionActive', precondition: '!explorerResourceParentReadOnly' },
  { id: 'explorer.open', label: 'Open', group: 'navigation', order: 10,
    when: '!explorerResourceIsFolder && explorerResourceHasResource && !multiSelectionActive' },

  { id: 'explorer.cut', label: 'Cut', group: '5_cutcopypaste', order: 8,
    when: 'explorerResourceHasResource && !explorerResourceIsRoot', precondition: '!explorerResourceParentReadOnly' },
  { id: 'explorer.copy', label: 'Copy', group: '5_cutcopypaste', order: 10,
    when: 'explorerResourceHasResource && !explorerResourceIsRoot' },
  { id: 'explorer.paste', label: 'Paste', group: '5_cutcopypaste', order: 20,
    when: 'explorerResourceIsFolder', precondition: '(resourceCopied || resourceCut) && !explorerResourceParentReadOnly' },

  { id: 'explorer.download', label: 'Download...', group: '5b_importexport', order: 10,
    when: 'explorerResourceHasResource && !explorerResourceIsRoot' },
  { id: 'explorer.upload', label: 'Upload...', group: '5b_importexport', order: 20,
    when: 'explorerResourceIsFolder && !multiSelectionActive', precondition: '!explorerResourceParentReadOnly' },

  { id: 'explorer.rename', label: 'Rename...', group: '7_modification', order: 10,
    when: 'explorerResourceHasResource && !explorerResourceIsRoot && !multiSelectionActive', precondition: '!explorerResourceParentReadOnly' },
  { id: 'explorer.delete', label: 'Delete', group: '7_modification', order: 20, danger: true,
    when: 'explorerResourceHasResource && !explorerResourceIsRoot', precondition: '!explorerResourceParentReadOnly' },

  { id: 'explorer.refresh', label: 'Refresh Explorer', group: '9_view', order: 10 },
  { id: 'explorer.collapseAll', label: 'Collapse Folders in Explorer', group: '9_view', order: 20 },
];

/** Item resolvido para o adapter `deps.contextMenu.open` (forma congelada do contrato). */
export interface ResolvedMenuItem {
  id: string;
  label: string;
  enabled: boolean;
  group: string;
  order: number;
  danger?: boolean;
}

const evaluatorCache = new Map<string, WhenEvaluator>();
function evalExpr(expr: string | undefined, ctx: ExplorerContextValues): boolean {
  if (!expr) return true;
  let ev = evaluatorCache.get(expr);
  if (!ev) { ev = compileWhen(expr); evaluatorCache.set(expr, ev); }
  return ev.evaluate((key) => (ctx as Record<string, boolean | undefined>)[key]);
}

/** Índice de ordenação: grupo (ordem da tabela) e depois `order` (upstream MenuRegistry). */
function groupIndex(group: string): number {
  const i = (EXPLORER_MENU_GROUPS as readonly string[]).indexOf(group);
  return i === -1 ? EXPLORER_MENU_GROUPS.length : i;
}

/**
 * Resolve a tabela contra as context keys: filtra por `when`, habilita por
 * `precondition`, ordena por grupo/order. `order` do item resolvido é GLOBAL
 * (grupo*100 + order) para o host do shell — que ordena só por `order` — manter
 * a sequência de grupos sem conhecer a tabela.
 */
export function resolveExplorerContextMenu(
  ctx: ExplorerContextValues,
  table: readonly ExplorerMenuItemSpec[] = EXPLORER_CONTEXT_MENU,
): ResolvedMenuItem[] {
  return table
    .filter((it) => evalExpr(it.when, ctx))
    .map((it) => ({
      id: it.id,
      label: it.label,
      group: it.group,
      order: groupIndex(it.group) * 100 + it.order,
      enabled: evalExpr(it.precondition, ctx),
      ...(it.danger ? { danger: true } : {}),
    }))
    .sort((a, b) => a.order - b.order);
}

/** Estado mínimo do serviço necessário para derivar as context keys. */
export interface ExplorerContextSource {
  selection: readonly string[];
  /** Nó de contexto (último selecionado / sob o cursor); `null` = área vazia (raiz). */
  target: { isDirectory: boolean; isRoot: boolean; isReadonly: boolean; parentReadonly: boolean } | null;
  clipboardKind: 'cut' | 'copy' | null;
  viewletFocus: boolean;
}

/** Deriva as context keys (04_03 §7) a partir do estado — puro, testável. */
export function computeExplorerContext(src: ExplorerContextSource): ExplorerContextValues {
  const t = src.target;
  return {
    explorerResourceHasResource: t != null,
    explorerResourceIsFolder: t?.isDirectory ?? false,
    explorerResourceIsRoot: t?.isRoot ?? false,
    // ParentReadOnly upstream = pasta de destino somente leitura; em pasta o
    // "pai" da operação de criação é a própria pasta.
    explorerResourceParentReadOnly: t ? (t.isDirectory ? t.isReadonly : t.parentReadonly) : false,
    resourceCopied: src.clipboardKind === 'copy',
    resourceCut: src.clipboardKind === 'cut',
    multiSelectionActive: src.selection.length > 1,
    explorerViewletFocus: src.viewletFocus,
  };
}
