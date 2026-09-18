/** Payload leve por arquivo (IFileDiffViewData). */
export interface FileDiffViewData {
    identical: boolean;
    added: number;
    removed: number;
}
export type UnifiedLineKind = 'context' | 'added' | 'removed';
export interface UnifiedLine {
    kind: UnifiedLineKind;
    /** Número da linha no original (para removed/context). */
    originalLine?: number;
    /** Número da linha no modificado (para added/context). */
    modifiedLine?: number;
    content: string;
}
export interface UnifiedHunk {
    originalStart: number;
    modifiedStart: number;
    lines: UnifiedLine[];
}
/** Payload leve calculado a partir do conteúdo original/modificado. */
export declare function computeFileDiffViewData(original: string, modified: string): FileDiffViewData;
/**
 * Constrói hunks unificados com `context` linhas de contexto ao redor das
 * mudanças. Linhas iguais fora do contexto são omitidas (agrupadas em hunks).
 */
export declare function buildUnifiedDiff(original: string, modified: string, context?: number): UnifiedHunk[];
//# sourceMappingURL=unifiedDiff.d.ts.map