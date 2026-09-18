import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Plus, Search } from 'lucide-react';
import { buildSessionPickerEntries, selectablePickItems } from '../domain/sessionsPicker';
/**
 * Floating sessions picker (E9 / R-073) — the Command Center "Show Sessions"
 * quick-pick. A centered overlay with a search field that matches on session
 * name and folder/branch, grouped results (needs input / unread / recently
 * opened / other), a leading "New Session" action, and full keyboard control
 * (↑/↓ to move, Enter to open, Esc to close).
 */
export function SessionsPicker({ open, sessions, activeSessionId, onClose, onSelectSession, onNewSession }) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const entries = useMemo(() => buildSessionPickerEntries(sessions, query), [sessions, query]);
    const items = useMemo(() => selectablePickItems(entries), [entries]);
    // Reset state and focus on open.
    useEffect(() => {
        if (!open)
            return;
        setQuery('');
        setActiveIndex(0);
        const id = window.requestAnimationFrame(() => inputRef.current?.focus());
        return () => window.cancelAnimationFrame(id);
    }, [open]);
    // Keep the active index within bounds when the filtered set shrinks.
    useEffect(() => {
        setActiveIndex((current) => Math.min(current, Math.max(0, items.length - 1)));
    }, [items.length]);
    // Scroll the active row into view as selection moves.
    useEffect(() => {
        if (!open)
            return;
        const el = listRef.current?.querySelector(`[data-item-index="${activeIndex}"]`);
        el?.scrollIntoView?.({ block: 'nearest' });
    }, [activeIndex, open]);
    if (!open)
        return null;
    const commit = (item) => {
        if (!item)
            return;
        if (item.session)
            onSelectSession(item.session.id);
        else
            onNewSession();
        onClose();
    };
    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((current) => (items.length === 0 ? 0 : (current + 1) % items.length));
        }
        else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((current) => (items.length === 0 ? 0 : (current - 1 + items.length) % items.length));
        }
        else if (event.key === 'Enter') {
            event.preventDefault();
            commit(items[activeIndex]);
        }
        else if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
        }
    };
    return (_jsx("div", { className: "sessions-picker-overlay", role: "presentation", onMouseDown: onClose, children: _jsxs("div", { className: "sessions-picker", role: "dialog", "aria-modal": "true", "aria-label": "Buscar sess\u00F5es", onMouseDown: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "sessions-picker-search", children: [_jsx(Search, { size: 14, "aria-hidden": "true" }), _jsx("input", { ref: inputRef, type: "text", className: "sessions-picker-input", role: "combobox", "aria-expanded": "true", "aria-controls": "sessions-picker-list", "aria-label": "Buscar sess\u00F5es por nome ou pasta", placeholder: "Buscar sess\u00F5es por nome ou pasta", value: query, onChange: (event) => setQuery(event.target.value), onKeyDown: handleKeyDown })] }), _jsxs("div", { className: "sessions-picker-list", id: "sessions-picker-list", role: "listbox", "aria-label": "Sess\u00F5es", ref: listRef, children: [entries.map((entry) => {
                            if (entry.kind === 'separator') {
                                return _jsx("div", { className: "sessions-picker-separator", role: "presentation", children: entry.label }, entry.id);
                            }
                            const index = items.indexOf(entry);
                            const isActive = index === activeIndex;
                            const isCurrent = entry.session?.id === activeSessionId;
                            return (_jsxs("button", { type: "button", role: "option", "aria-selected": isActive, "data-item-index": index, className: `sessions-picker-item${isActive ? ' is-active' : ''}${isCurrent ? ' is-current' : ''}`, onMouseEnter: () => setActiveIndex(index), onClick: () => commit(entry), children: [_jsx("span", { className: "sessions-picker-item-icon", "aria-hidden": "true", children: entry.session ? _jsx(MessageCircle, { size: 14 }) : _jsx(Plus, { size: 14 }) }), _jsx("span", { className: "sessions-picker-item-label", children: entry.label }), entry.detail && _jsx("span", { className: "sessions-picker-item-detail", children: entry.detail })] }, entry.id));
                        }), items.length <= 1 && query.trim() !== '' && (_jsxs("p", { className: "sessions-picker-empty", role: "status", children: ["Nenhuma sess\u00E3o corresponde a \u201C", query, "\u201D."] }))] })] }) }));
}
//# sourceMappingURL=SessionsPicker.js.map