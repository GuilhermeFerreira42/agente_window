import type { DiffFile, SearchResult, Session } from './types';
export declare const initialSessions: Session[];
/** Rótulos legíveis dos grupos personalizados (custom groups) da lista. */
export declare const customGroupLabels: Record<string, string>;
export declare const initialDiffFiles: DiffFile[];
export declare const buildProjectDiffFiles: DiffFile[];
export declare const searchResults: SearchResult[];
export declare const workspaceFiles: string[];
export declare const initialProviders: {
    id: string;
    label: string;
    order: number;
    sessionTypes: string[];
}[];
//# sourceMappingURL=data.d.ts.map