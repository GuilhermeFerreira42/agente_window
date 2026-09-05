// E15 — Unified diff para as superfícies mobile (MOBILE_DIFF_EDITORS.md).
//
// O review mobile usa diff unificado full-screen em vez dos painéis lado-a-lado
// do desktop. Este módulo produz o payload leve e as linhas unificadas com um
// pequeno contexto, sem importar tipos de multi-diff do workbench desktop.

/** Payload leve por arquivo (IFileDiffViewData). */
export interface FileDiffViewData {
  identical: boolean
  added: number
  removed: number
}

export type UnifiedLineKind = 'context' | 'added' | 'removed'

export interface UnifiedLine {
  kind: UnifiedLineKind
  /** Número da linha no original (para removed/context). */
  originalLine?: number
  /** Número da linha no modificado (para added/context). */
  modifiedLine?: number
  content: string
}

export interface UnifiedHunk {
  originalStart: number
  modifiedStart: number
  lines: UnifiedLine[]
}

/**
 * LCS clássico entre duas listas de linhas — base determinística para o diff.
 * Retorna a sequência de operações (keep/add/remove) em ordem.
 */
type Op = { type: 'keep' | 'add' | 'remove'; original?: number; modified?: number; content: string }

function diffLines(original: string[], modified: string[]): Op[] {
  const n = original.length
  const m = modified.length
  // Tabela LCS.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = original[i] === modified[j]
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (original[i] === modified[j]) {
      ops.push({ type: 'keep', original: i + 1, modified: j + 1, content: original[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: 'remove', original: i + 1, content: original[i] })
      i++
    } else {
      ops.push({ type: 'add', modified: j + 1, content: modified[j] })
      j++
    }
  }
  while (i < n) { ops.push({ type: 'remove', original: i + 1, content: original[i] }); i++ }
  while (j < m) { ops.push({ type: 'add', modified: j + 1, content: modified[j] }); j++ }
  return ops
}

function splitLines(text: string): string[] {
  if (text === '') return []
  return text.split('\n')
}

/** Payload leve calculado a partir do conteúdo original/modificado. */
export function computeFileDiffViewData(original: string, modified: string): FileDiffViewData {
  const ops = diffLines(splitLines(original), splitLines(modified))
  const added = ops.filter((op) => op.type === 'add').length
  const removed = ops.filter((op) => op.type === 'remove').length
  return { identical: added === 0 && removed === 0, added, removed }
}

/**
 * Constrói hunks unificados com `context` linhas de contexto ao redor das
 * mudanças. Linhas iguais fora do contexto são omitidas (agrupadas em hunks).
 */
export function buildUnifiedDiff(original: string, modified: string, context = 3): UnifiedHunk[] {
  const ops = diffLines(splitLines(original), splitLines(modified))
  // Marca quais índices de op estão "perto" de uma mudança (dentro do contexto).
  const keep = new Array<boolean>(ops.length).fill(false)
  ops.forEach((op, index) => {
    if (op.type !== 'keep') {
      for (let k = Math.max(0, index - context); k <= Math.min(ops.length - 1, index + context); k++) {
        keep[k] = true
      }
    }
  })

  const hunks: UnifiedHunk[] = []
  let current: UnifiedHunk | null = null
  for (let index = 0; index < ops.length; index++) {
    if (!keep[index]) {
      current = null
      continue
    }
    const op = ops[index]
    const line: UnifiedLine = {
      kind: op.type === 'keep' ? 'context' : op.type === 'add' ? 'added' : 'removed',
      originalLine: op.original,
      modifiedLine: op.modified,
      content: op.content,
    }
    if (!current) {
      current = {
        originalStart: op.original ?? op.modified ?? 1,
        modifiedStart: op.modified ?? op.original ?? 1,
        lines: [],
      }
      hunks.push(current)
    }
    current.lines.push(line)
  }
  return hunks
}

