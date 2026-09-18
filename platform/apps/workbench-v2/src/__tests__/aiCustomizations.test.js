import { describe, expect, it } from 'vitest';
import { applyHarnessFilter, buildManagementModel, projectItems, toggleEnablement, } from '../domain/aiCustomizations';
const items = [
    { id: 'a1', section: 'agents', source: 'user', name: 'Planner', description: 'plan', uri: 'u://a1' },
    { id: 's1', section: 'skills', source: 'built-in', name: 'commit', description: 'commit changes', uri: 'u://s1', runnable: true },
    { id: 's2', section: 'skills', source: 'user', name: 'changelog', description: 'notes', uri: 'u://s2' },
    { id: 'p1', section: 'plugins', source: 'plugin', name: 'telemetry', description: 'plugin', uri: 'u://p1' },
    { id: 'm1', section: 'mcp', source: 'extension', name: 'github', description: 'gh', uri: 'u://m1', mcpCollection: 'shared', hostPublished: true },
    { id: 'm2', section: 'mcp', source: 'user', name: 'fs', description: 'files', uri: 'u://m2', mcpCollection: 'local-only' },
];
const local = {
    id: 'local',
    label: 'Local',
    visibleSections: ['agents', 'skills', 'mcp'],
};
const copilot = {
    id: 'copilot',
    label: 'Copilot',
    visibleSections: ['agents', 'skills', 'mcp', 'plugins'],
    excludedMcpCollections: ['local-only'],
};
describe('aiCustomizations — harness filtering', () => {
    it('esconde seções fora do harness (plugins não aparece no Local)', () => {
        const filtered = applyHarnessFilter(items, local);
        expect(filtered.some((i) => i.section === 'plugins')).toBe(false);
    });
    it('exclui coleção MCP mas mantém servidores host-published', () => {
        const filtered = applyHarnessFilter(items, copilot);
        // m2 (local-only) some; m1 (host-published) permanece.
        expect(filtered.find((i) => i.id === 'm2')).toBeUndefined();
        expect(filtered.find((i) => i.id === 'm1')).toBeDefined();
    });
    it('respeita hiddenSources', () => {
        const noPlugins = { ...copilot, hiddenSources: ['plugin'] };
        const filtered = applyHarnessFilter(items, noPlugins);
        expect(filtered.some((i) => i.source === 'plugin')).toBe(false);
    });
});
describe('aiCustomizations — enablement', () => {
    it('só itens built-in podem alternar enablement', () => {
        const projected = projectItems(items, { disabled: [] });
        expect(projected.find((i) => i.id === 's1').canToggleEnablement).toBe(true);
        expect(projected.find((i) => i.id === 's2').canToggleEnablement).toBe(false);
    });
    it('toggle desabilita e reabilita item built-in; ignora não-built-in', () => {
        let en = toggleEnablement({ disabled: [] }, { id: 's1', source: 'built-in' });
        expect(en.disabled).toContain('s1');
        en = toggleEnablement(en, { id: 's1', source: 'built-in' });
        expect(en.disabled).not.toContain('s1');
        // não-built-in é ignorado.
        expect(toggleEnablement(en, { id: 's2', source: 'user' })).toBe(en);
    });
    it('harness filtra antes do enablement: item escondido não é reintroduzido', () => {
        // p1 (plugin) está desabilitado, mas nem deveria aparecer no Local.
        const model = buildManagementModel(items, local, { disabled: ['p1'] });
        expect(model.sections.some((s) => s.section === 'plugins')).toBe(false);
    });
});
describe('aiCustomizations — management model', () => {
    it('contagens == linhas renderizadas (mesmo modelo filtrado)', () => {
        const model = buildManagementModel(items, local);
        for (const section of model.sections) {
            const rows = section.sources.reduce((sum, g) => sum + g.items.length, 0);
            expect(section.count).toBe(rows);
        }
    });
    it('agrupa por fonte e ordena seções canônicas', () => {
        const model = buildManagementModel(items, copilot);
        const sectionIds = model.sections.map((s) => s.section);
        // agents antes de skills antes de mcp antes de plugins
        expect(sectionIds.indexOf('agents')).toBeLessThan(sectionIds.indexOf('skills'));
        expect(sectionIds.indexOf('skills')).toBeLessThan(sectionIds.indexOf('mcp'));
        expect(sectionIds.indexOf('mcp')).toBeLessThan(sectionIds.indexOf('plugins'));
    });
    it('filtra por query em nome/descrição', () => {
        const model = buildManagementModel(items, local, { disabled: [] }, { query: 'commit' });
        const names = model.sections.flatMap((s) => s.sources.flatMap((g) => g.items.map((i) => i.name)));
        expect(names).toContain('commit');
        expect(names).not.toContain('Planner');
    });
    it('hideEmptySections omite seções sem itens', () => {
        const emptyMcp = { id: 'x', label: 'X', visibleSections: ['agents', 'hooks'] };
        const model = buildManagementModel(items, emptyMcp, { disabled: [] }, { hideEmptySections: true });
        expect(model.sections.some((s) => s.section === 'hooks')).toBe(false);
        expect(model.sections.some((s) => s.section === 'agents')).toBe(true);
    });
    it('totalCount soma todas as seções visíveis', () => {
        const model = buildManagementModel(items, local);
        const sum = model.sections.reduce((acc, s) => acc + s.count, 0);
        expect(model.totalCount).toBe(sum);
    });
});
//# sourceMappingURL=aiCustomizations.test.js.map