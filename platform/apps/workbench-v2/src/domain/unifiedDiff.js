// E15 — Unified diff para as superfícies mobile (MOBILE_DIFF_EDITORS.md).
//
// O review mobile usa diff unificado full-screen em vez dos painéis lado-a-lado
// do desktop. Este módulo produz o payload leve e as linhas unificadas com um
// pequeno contexto, sem importar tipos de multi-diff do workbench desktop.
function diffLines(original, modified) {
    const n = original.length;
    const m = modified.length;
    // Tabela LCS.
    const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            lcs[i][j] = original[i] === modified[j]
                ? lcs[i + 1][j + 1] + 1
                : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
        if (original[i] === modified[j]) {
            ops.push({ type: 'keep', original: i + 1, modified: j + 1, content: original[i] });
            i++;
            j++;
        }
        else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
            ops.push({ type: 'remove', original: i + 1, content: original[i] });
            i++;
        }
        else {
            ops.push({ type: 'add', modified: j + 1, content: modified[j] });
            j++;
        }
    }
    while (i < n) {
        ops.push({ type: 'remove', original: i + 1, content: original[i] });
        i++;
    }
    while (j < m) {
        ops.push({ type: 'add', modified: j + 1, content: modified[j] });
        j++;
    }
    return ops;
}
function splitLines(text) {
    if (text === '')
        return [];
    return text.split('\n');
}
/** Payload leve calculado a partir do conteúdo original/modificado. */
export function computeFileDiffViewData(original, modified) {
    const ops = diffLines(splitLines(original), splitLines(modified));
    const added = ops.filter((op) => op.type === 'add').length;
    const removed = ops.filter((op) => op.type === 'remove').length;
    return { identical: added === 0 && removed === 0, added, removed };
}
/**
 * Constrói hunks unificados com `context` linhas de contexto ao redor das
 * mudanças. Linhas iguais fora do contexto são omitidas (agrupadas em hunks).
 */
export function buildUnifiedDiff(original, modified, context = 3) {
    const ops = diffLines(splitLines(original), splitLines(modified));
    // Marca quais índices de op estão "perto" de uma mudança (dentro do contexto).
    const keep = new Array(ops.length).fill(false);
    ops.forEach((op, index) => {
        if (op.type !== 'keep') {
            for (let k = Math.max(0, index - context); k <= Math.min(ops.length - 1, index + context); k++) {
                keep[k] = true;
            }
        }
    });
    const hunks = [];
    let current = null;
    for (let index = 0; index < ops.length; index++) {
        if (!keep[index]) {
            current = null;
            continue;
        }
        const op = ops[index];
        const line = {
            kind: op.type === 'keep' ? 'context' : op.type === 'add' ? 'added' : 'removed',
            originalLine: op.original,
            modifiedLine: op.modified,
            content: op.content,
        };
        if (!current) {
            current = {
                originalStart: op.original ?? op.modified ?? 1,
                modifiedStart: op.modified ?? op.original ?? 1,
                lines: [],
            };
            hunks.push(current);
        }
        current.lines.push(line);
    }
    return hunks;
}
//# sourceMappingURL=unifiedDiff.js.map