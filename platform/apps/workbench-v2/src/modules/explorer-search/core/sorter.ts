// ============================================================================
// modules/explorer-search/core/sorter.ts — Ordenação do Explorer (port).
// Fonte upstream (7debcd0e):
//  - FileSorter: workbench/contrib/files/browser/views/explorerViewer.ts:1440
//  - Comparadores: vs/base/common/comparers.ts:54 (compareFileNamesDefault),
//    :117 (compareFileExtensionsDefault)
// Subset: sem lexicographicOptions (default), sem roots-multi (Q4 single-root).
// Mapeamento do nosso SortOrder (contract): 'default' | 'name' → diretórios
// primeiro + nome com collator numérico (upstream Default); 'type' → diretórios
// com nome + arquivos por extensão; 'modified' → diretórios com nome + arquivos
// por mtime desc com fallback nome. Decisão congelada 2026-09-20 (4.2).
// Sem imports de React/DOM/fs.
// ============================================================================
import type { SortOrder } from '../contract';

// --- Comparadores portados (base/common/comparers.ts) -----------------------

// Collator com ordenação numérica (IntL) — porte da Lazy<...> upstream.
let numericCollator: Intl.Collator | undefined;
function collatorNumeric(): Intl.Collator {
  if (!numericCollator) {
    numericCollator = new Intl.Collator(undefined, { numeric: true });
  }
  return numericCollator;
}

let numericCaseInsensitiveCollator: Intl.Collator | undefined;
function collatorNumericCaseInsensitive(): Intl.Collator {
  if (!numericCaseInsensitiveCollator) {
    numericCaseInsensitiveCollator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'accent',
    });
  }
  return numericCaseInsensitiveCollator;
}

/** Upstream: compareAndDisambiguateByLength (comparers.ts) — colator e depois
 *  desambigua 'foo1' vs 'foo01' com comparação unicode estrita. */
function compareAndDisambiguateByLength(
  collator: Intl.Collator,
  a: string,
  b: string,
): number {
  const result = collator.compare(a, b);
  if (result !== 0) return result;
  // collators intl numeric tratam foo1==foo01; desambigua.
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Porte de compareFileNamesDefault (comparers.ts:54). */
export function compareFileNames(
  one: string | null | undefined,
  other: string | null | undefined,
): number {
  const a = one || '';
  const b = other || '';
  return compareAndDisambiguateByLength(collatorNumeric(), a, b);
}

const FILE_NAME_MATCH = /^(.*?)(\.([^.]*))?$/;

/** Porte de extractExtension (comparers.ts) — dotfiles são nomes, não extensões. */
function extractExtension(name: string): string {
  const match = FILE_NAME_MATCH.exec(name);
  return (match?.[1] != null && match[1].charAt(0) !== '.' ? match[3] : '') || '';
}

/** Porte de compareFileExtensionsDefault (comparers.ts:117). */
export function compareFileExtensions(
  one: string | null | undefined,
  other: string | null | undefined,
): number {
  const a = one || '';
  const b = other || '';
  const extA = extractExtension(a);
  const extB = extractExtension(b);
  return (
    compareAndDisambiguateByLength(collatorNumericCaseInsensitive(), extA, extB) ||
    compareAndDisambiguateByLength(collatorNumeric(), a, b)
  );
}

// --- FileSorter (port de explorerViewer.ts:1440, subset) ---------------------

export interface SortableItem {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly mtimeMs?: number | undefined;
}

/** Comparador final usado pela árvore — semântica upstream FileSorter.compare,
 *  com seu SortOrder mapeado pelo contract. */
export function compareExplorerItems(order: SortOrder) {
  return (a: SortableItem, b: SortableItem): number => {
    // Diretórios primeiro (default/mixed/filesFirst/foldersNestsFiles default e type)
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    if (a.isDirectory && b.isDirectory) {
      return compareFileNames(a.name, b.name);
    }
    switch (order) {
      case 'type':
        return compareFileExtensions(a.name, b.name);
      case 'modified': {
        const ma = a.mtimeMs;
        const mb = b.mtimeMs;
        if (ma !== mb) {
          return ma != null && mb != null && ma < mb ? 1 : -1;
        }
        return compareFileNames(a.name, b.name);
      }
      default:
        // 'default' | 'name' — nome natural
        return compareFileNames(a.name, b.name);
    }
  };
}
