import { type ReactNode } from 'react';
export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: ReactNode;
    /** Ação executada ao escolher; o menu fecha em seguida. */
    onSelect: () => void;
    /** Item desabilitado (não selecionável). */
    disabled?: boolean;
    /** Estilo destrutivo (ex.: Excluir). */
    danger?: boolean;
    /** Renderiza um separador ANTES deste item. */
    separatorBefore?: boolean;
}
export interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
    /** Rótulo acessível do menu (ex.: "Ações da sessão"). */
    label?: string;
}
interface ContextMenuProps {
    menu: ContextMenuState | null;
    onClose: () => void;
}
/**
 * Menu de contexto reutilizável (botão direito), fiel ao comportamento do
 * original: abre na posição do cursor, fecha ao clicar fora / Escape / rolar,
 * navega por teclado (setas, Home/End, Enter, Escape) e reposiciona para não
 * vazar da viewport. Renderiza inline (sem portal) — o overlay fixo captura o
 * clique-fora sem bloquear o resto da app.
 */
export declare function ContextMenu({ menu, onClose }: ContextMenuProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=ContextMenu.d.ts.map