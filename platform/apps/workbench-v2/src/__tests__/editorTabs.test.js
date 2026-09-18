import { describe, expect, it } from 'vitest';
import { resolveNextEditorTabId, resolveVisibleEditorTabId } from '../domain/editorTabs';
const tabs = [
    { id: 'browser-1', type: 'browser', title: 'Browser', sessionId: 's1', browserId: 'view-1' },
    { id: 'search-1', type: 'search', title: 'Search' },
    { id: 'diff-1', type: 'diff', title: 'Branch Changes', sessionId: 's1' },
];
describe('editor tab selection', () => {
    it('uses a requested visible tab and falls back to the first tab', () => {
        expect(resolveVisibleEditorTabId(tabs, 'diff-1')).toBe('diff-1');
        expect(resolveVisibleEditorTabId(tabs, 'missing')).toBe('browser-1');
        expect(resolveVisibleEditorTabId([], 'missing')).toBeUndefined();
    });
    it('activates the right neighbour after closing an active middle tab', () => {
        expect(resolveNextEditorTabId(tabs, 'search-1', 'search-1')).toBe('diff-1');
    });
    it('falls back to the previous tab when closing the last active tab', () => {
        expect(resolveNextEditorTabId(tabs, 'diff-1', 'diff-1')).toBe('search-1');
    });
    it('keeps the active tab when closing an inactive tab', () => {
        expect(resolveNextEditorTabId(tabs, 'browser-1', 'diff-1')).toBe('diff-1');
        expect(resolveNextEditorTabId(tabs, 'missing', 'diff-1')).toBe('diff-1');
    });
});
//# sourceMappingURL=editorTabs.test.js.map