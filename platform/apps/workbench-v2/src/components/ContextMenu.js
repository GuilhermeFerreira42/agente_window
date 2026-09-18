import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
/**
 * Menu de contexto reutilizável (botão direito), fiel ao comportamento do
 * original: abre na posição do cursor, fecha ao clicar fora / Escape / rolar,
 * navega por teclado (setas, Home/End, Enter, Escape) e reposiciona para não
 * vazar da viewport. Renderiza inline (sem portal) — o overlay fixo captura o
 * clique-fora sem bloquear o resto da app.
 */
export function ContextMenu({ menu, onClose }) {
    const menuRef = useRef(null);
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    // Primeiro item habilitado, quando o menu (re)abre.
    useEffect(() => {
        if (!menu)
            return;
        const firstEnabled = menu.items.findIndex((item) => !item.disabled);
        setActive(firstEnabled < 0 ? 0 : firstEnabled);
        setPos({ x: menu.x, y: menu.y });
    }, [menu]);
    // Reposiciona dentro da viewport depois de medir o tamanho real.
    useLayoutEffect(() => {
        if (!menu || !menuRef.current)
            return;
        const rect = menuRef.current.getBoundingClientRect();
        const margin = 8;
        let x = menu.x;
        let y = menu.y;
        if (x + rect.width > window.innerWidth - margin)
            x = Math.max(margin, window.innerWidth - rect.width - margin);
        if (y + rect.height > window.innerHeight - margin)
            y = Math.max(margin, window.innerHeight - rect.height - margin);
        if (x !== pos.x || y !== pos.y)
            setPos({ x, y });
        // Foco no container para receber teclado imediatamente.
        menuRef.current.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [menu]);
    useEffect(() => {
        if (!menu)
            return;
        const onScroll = () => onClose();
        const onKey = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('keydown', onKey, true);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('keydown', onKey, true);
        };
    }, [menu, onClose]);
    if (!menu)
        return null;
    const enabledIndexes = menu.items.map((item, index) => (item.disabled ? -1 : index)).filter((i) => i >= 0);
    const moveActive = (delta) => {
        if (enabledIndexes.length === 0)
            return;
        const current = enabledIndexes.indexOf(active);
        const nextPos = current < 0 ? 0 : (current + delta + enabledIndexes.length) % enabledIndexes.length;
        setActive(enabledIndexes[nextPos]);
    };
    const choose = (item) => {
        if (item.disabled)
            return;
        item.onSelect();
        onClose();
    };
    return (_jsx("div", { className: "context-menu-overlay", role: "presentation", onMouseDown: (event) => { if (event.target === event.currentTarget)
            onClose(); }, onContextMenu: (event) => { event.preventDefault(); onClose(); }, children: _jsx("div", { ref: menuRef, className: "context-menu", role: "menu", "aria-label": menu.label ?? 'Menu de contexto', tabIndex: -1, style: { left: pos.x, top: pos.y }, onKeyDown: (event) => {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    moveActive(1);
                }
                else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    moveActive(-1);
                }
                else if (event.key === 'Home') {
                    event.preventDefault();
                    if (enabledIndexes.length)
                        setActive(enabledIndexes[0]);
                }
                else if (event.key === 'End') {
                    event.preventDefault();
                    if (enabledIndexes.length)
                        setActive(enabledIndexes[enabledIndexes.length - 1]);
                }
                else if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    choose(menu.items[active]);
                }
            }, children: menu.items.map((item, index) => (_jsxs("div", { role: "none", children: [item.separatorBefore && _jsx("div", { className: "context-menu-separator", role: "separator" }), _jsxs("button", { type: "button", role: "menuitem", className: `context-menu-item${item.danger ? ' is-danger' : ''}${index === active ? ' is-active' : ''}`, disabled: item.disabled, "aria-disabled": item.disabled, onMouseEnter: () => !item.disabled && setActive(index), onClick: () => choose(item), children: [item.icon && _jsx("span", { className: "context-menu-icon", "aria-hidden": "true", children: item.icon }), _jsx("span", { className: "context-menu-label", children: item.label })] })] }, item.id))) }) }));
}
//# sourceMappingURL=ContextMenu.js.map