/**
 * Persistência de layout entre reloads e por sessão (paridade com
 * workbench.sessions.partSizes + captura por sessão do original).
 *
 * Guardamos:
 * - `shell`: visibilidade global (sidebar / auxiliar / terminal) e se o editor
 *   está oculto — restaurado de uma só vez no boot (reload flicker-free).
 * - `partSizesBySession`: os tamanhos do split chat|editor por sessão.
 * - `sessionLayouts`: layout por sessão (auxiliar visível + activeViewContainerId) - B3/B4
 */
export interface ShellVisibility {
    sidebarVisible: boolean;
    auxiliaryVisible: boolean;
    terminalVisible: boolean;
    editorHidden: boolean;
    sidebarWidth: number;
}
export declare const SIDEBAR_WIDTH_MIN = 230;
export declare const SIDEBAR_WIDTH_MAX = 410;
export declare const SIDEBAR_WIDTH_DEFAULT = 300;
export declare function clampSidebarWidth(width: number): number;
export interface LayoutState {
    shell: ShellVisibility;
    partSizesBySession: Record<string, number[]>;
}
export declare const LAYOUT_STORAGE_KEY = "workbench.sessions.layout.v1";
export declare const SESSION_LAYOUTS_STORAGE_KEY = "workbench.sessions.layouts.v1";
export declare const DEFAULT_SHELL: ShellVisibility;
export declare function defaultLayoutState(): LayoutState;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export declare function loadLayoutState(storage?: StorageLike): LayoutState;
export declare function saveLayoutState(state: LayoutState, storage?: StorageLike): void;
export declare function partSizesForSession(state: LayoutState, sessionId: string): number[];
import type { SessionLayoutMap } from './sessionLayout';
export declare function loadSessionLayouts(storage?: StorageLike): SessionLayoutMap;
export declare function saveSessionLayouts(map: SessionLayoutMap, storage?: StorageLike): void;
export {};
//# sourceMappingURL=layoutPersistence.d.ts.map