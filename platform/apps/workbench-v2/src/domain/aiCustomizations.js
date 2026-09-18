// E16 — AI Customizations (AI_CUSTOMIZATIONS.md).
//
// Lógica pura do pipeline de itens de customização, espelhando o contrato do
// original em forma mockável:
//
//   source providers
//     -> customization item contract
//     -> harness and storage filtering
//     -> management model and section counts
//     -> list/tree presentation
//
// Regras fiéis ao spec:
// - As seções e as linhas renderizadas consomem o MESMO modelo filtrado, então
//   um item escondido de um harness não pode aparecer numa superfície e sumir
//   na outra (contagens == linhas).
// - O harness filtra ANTES da apresentação de enablement, de forma que um item
//   escondido do harness não pode ser reintroduzido pelo seu estado salvo.
// - Descoberta (built-in) e enablement do usuário são stores separados: a
//   descoberta diz o que existe; o enablement guarda o conjunto desabilitado.
// - A fonte built-in permanece distinta de extension/user.
/** Rótulos legíveis das seções (ordem canônica de apresentação). */
export const SECTION_ORDER = [
    'agents',
    'skills',
    'instructions',
    'prompts',
    'hooks',
    'mcp',
    'tools',
    'plugins',
];
export const SECTION_LABELS = {
    agents: 'Agents',
    skills: 'Skills',
    instructions: 'Instructions',
    prompts: 'Prompts',
    hooks: 'Hooks',
    mcp: 'MCP Servers',
    tools: 'Tools',
    plugins: 'Plugins',
};
export const SOURCE_LABELS = {
    local: 'Local',
    user: 'User',
    extension: 'Extension',
    plugin: 'Plugin',
    'built-in': 'Built-in',
};
export const EMPTY_ENABLEMENT = { disabled: [] };
/**
 * Aplica o filtro do harness a um conjunto de itens. Este passo acontece ANTES
 * da apresentação de enablement (regra do spec).
 */
export function applyHarnessFilter(items, harness) {
    const visible = new Set(harness.visibleSections);
    const hidden = new Set(harness.hiddenSections ?? []);
    const hiddenSources = new Set(harness.hiddenSources ?? []);
    const excludedCollections = new Set(harness.excludedMcpCollections ?? []);
    return items.filter((item) => {
        if (!visible.has(item.section))
            return false;
        if (hidden.has(item.section))
            return false;
        if (hiddenSources.has(item.source))
            return false;
        // Exclusão de coleção MCP não esconde servidores publicados pelo host.
        if (item.mcpCollection && excludedCollections.has(item.mcpCollection) && !item.hostPublished) {
            return false;
        }
        return true;
    });
}
/**
 * Projeta os itens combinando descoberta + enablement. Só itens built-in podem
 * ser desabilitados; as demais fontes permanecem sempre habilitadas.
 */
export function projectItems(items, enablement) {
    const disabled = new Set(enablement.disabled);
    return items.map((item) => ({
        ...item,
        canToggleEnablement: item.source === 'built-in',
        enabled: item.source === 'built-in' ? !disabled.has(item.id) : true,
    }));
}
const SOURCE_ORDER = ['local', 'user', 'extension', 'plugin', 'built-in'];
/**
 * Constrói o modelo de gerenciamento: filtra pelo harness, aplica enablement,
 * agrupa por seção e fonte, e calcula contagens. Seções e linhas consomem o
 * mesmo modelo filtrado.
 */
export function buildManagementModel(items, harness, enablement = EMPTY_ENABLEMENT, options = {}) {
    const filtered = applyHarnessFilter(items, harness);
    const q = (options.query ?? '').trim().toLocaleLowerCase();
    const searched = q
        ? filtered.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase().includes(q))
        : filtered;
    const projected = projectItems(searched, enablement);
    const sections = [];
    for (const section of SECTION_ORDER) {
        if (!harness.visibleSections.includes(section))
            continue;
        const sectionItems = projected.filter((item) => item.section === section);
        if (options.hideEmptySections && sectionItems.length === 0)
            continue;
        const sources = [];
        for (const source of SOURCE_ORDER) {
            const bucket = sectionItems.filter((item) => item.source === source);
            if (bucket.length > 0) {
                sources.push({ source, label: SOURCE_LABELS[source], items: bucket });
            }
        }
        sections.push({ section, label: SECTION_LABELS[section], count: sectionItems.length, sources });
    }
    const totalCount = sections.reduce((sum, section) => sum + section.count, 0);
    return { harnessId: harness.id, sections, totalCount };
}
/** Alterna o enablement de um item built-in (imutável). Ignora não-built-in. */
export function toggleEnablement(enablement, item) {
    if (item.source !== 'built-in')
        return enablement;
    const disabled = new Set(enablement.disabled);
    if (disabled.has(item.id))
        disabled.delete(item.id);
    else
        disabled.add(item.id);
    return { disabled: Array.from(disabled) };
}
//# sourceMappingURL=aiCustomizations.js.map