import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Blocks, Bot, ChevronDown, ChevronRight, FileText, Play, Plug, Puzzle, ScrollText, Search, Server, Sparkles, ToggleLeft, ToggleRight, Wrench, } from 'lucide-react';
import { buildManagementModel, } from '../domain/aiCustomizations';
// E16 — superfície de AI Customizations: árvore/overview com seleção de harness,
// seções agrupadas por fonte, contagens (== linhas), enablement de built-ins e
// ação de executar skills. Estado mockável, interações com efeito real.
const SECTION_ICON = {
    agents: _jsx(Bot, { size: 13 }),
    skills: _jsx(Sparkles, { size: 13 }),
    instructions: _jsx(ScrollText, { size: 13 }),
    prompts: _jsx(FileText, { size: 13 }),
    hooks: _jsx(Plug, { size: 13 }),
    mcp: _jsx(Server, { size: 13 }),
    tools: _jsx(Wrench, { size: 13 }),
    plugins: _jsx(Puzzle, { size: 13 }),
};
export function CustomizationsView({ items, harnesses, harnessId, enablement, onChangeHarness, onToggleEnablement, onRunSkill, onRevealItem, embedded = false, }) {
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState({});
    const harness = useMemo(() => harnesses.find((h) => h.id === harnessId) ?? harnesses[0], [harnesses, harnessId]);
    const model = useMemo(() => buildManagementModel(items, harness, enablement, { query }), [items, harness, enablement, query]);
    return (_jsxs("section", { className: "customizations-view", "aria-label": "Personaliza\u00E7\u00F5es de IA", children: [_jsxs("header", { className: "customizations-header", children: [_jsxs("div", { className: "customizations-title", children: [_jsx(Blocks, { size: 15 }), !embedded && _jsx("h2", { children: "AI Customizations" }), _jsx("span", { className: "customizations-total", "aria-label": `${model.totalCount} itens no total`, children: model.totalCount })] }), _jsxs("label", { className: "customizations-harness", htmlFor: "customizations-harness-select", children: [_jsx("span", { children: "Harness" }), _jsx("select", { id: "customizations-harness-select", "aria-label": "Selecionar harness", value: harness.id, onChange: (event) => onChangeHarness(event.target.value), children: harnesses.map((item) => (_jsx("option", { value: item.id, children: item.label }, item.id))) })] })] }), _jsxs("label", { className: "customizations-filter", htmlFor: "customizations-filter-input", children: [_jsx(Search, { size: 12 }), _jsx("input", { id: "customizations-filter-input", value: query, onChange: (event) => setQuery(event.target.value), placeholder: "Filtrar personaliza\u00E7\u00F5es" })] }), _jsxs("div", { className: "customizations-tree", role: "tree", "aria-label": "\u00C1rvore de personaliza\u00E7\u00F5es", children: [model.sections.map((section) => {
                        const isCollapsed = collapsed[section.section] ?? false;
                        const contentId = `customizations-section-${section.section}`;
                        return (_jsxs("div", { className: "customizations-section", role: "treeitem", "aria-expanded": !isCollapsed, children: [_jsxs("button", { type: "button", className: "customizations-section-header", "aria-expanded": !isCollapsed, "aria-controls": contentId, onClick: () => setCollapsed((current) => ({ ...current, [section.section]: !isCollapsed })), children: [isCollapsed ? _jsx(ChevronRight, { size: 12 }) : _jsx(ChevronDown, { size: 12 }), SECTION_ICON[section.section], _jsx("span", { className: "customizations-section-label", children: section.label }), _jsx("span", { className: "customizations-section-count", children: section.count })] }), !isCollapsed && (_jsxs("div", { className: "customizations-section-body", id: contentId, role: "group", children: [section.count === 0 && _jsx("p", { className: "customizations-empty", children: "Nenhum item nesta se\u00E7\u00E3o." }), section.sources.map((group) => (_jsxs("div", { className: "customizations-source-group", children: [_jsx("div", { className: "customizations-source-label", children: group.label }), group.items.map((item) => (_jsxs("div", { className: `customizations-item${item.enabled ? '' : ' is-disabled'}`, role: "treeitem", children: [_jsxs("button", { type: "button", className: "customizations-item-main", onClick: () => onRevealItem(item), title: item.uri, children: [_jsx("span", { className: "customizations-item-name", children: item.name }), _jsx("span", { className: "customizations-item-desc", children: item.description })] }), _jsxs("div", { className: "customizations-item-actions", children: [item.runnable && (_jsx("button", { type: "button", className: "customizations-item-run", "aria-label": `Executar skill ${item.name}`, title: `Executar skill ${item.name}`, onClick: () => onRunSkill(item), children: _jsx(Play, { size: 12 }) })), item.canToggleEnablement && (_jsx("button", { type: "button", className: "customizations-item-toggle", "aria-label": `${item.enabled ? 'Desabilitar' : 'Habilitar'} ${item.name}`, "aria-pressed": item.enabled, title: item.enabled ? 'Desabilitar' : 'Habilitar', onClick: () => onToggleEnablement(item), children: item.enabled ? _jsx(ToggleRight, { size: 16 }) : _jsx(ToggleLeft, { size: 16 }) }))] })] }, item.id)))] }, group.source)))] }))] }, section.section));
                    }), model.sections.length === 0 && (_jsxs("div", { className: "customizations-empty-state", children: [_jsx(Blocks, { size: 22 }), _jsx("p", { children: "Nenhuma personaliza\u00E7\u00E3o corresponde ao filtro." })] }))] })] }));
}
//# sourceMappingURL=CustomizationsView.js.map