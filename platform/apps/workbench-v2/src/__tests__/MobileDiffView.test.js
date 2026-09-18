import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MobileDiffView } from '../components/MobileDiffView';
const files = [
    {
        id: 'f1',
        path: 'src/a.ts',
        status: 'modified',
        added: 2,
        removed: 1,
        original: 'const a = 1\nconst b = 2',
        modified: 'const a = 2\nconst b = 2\nconst c = 3',
    },
    {
        id: 'f2',
        path: 'src/b.ts',
        status: 'added',
        added: 3,
        removed: 0,
        original: '',
        modified: 'export const b = 1',
    },
];
function overlay() {
    return screen.getByRole('dialog', { name: 'Revisão de alterações' });
}
describe('MobileDiffView — gesto pulldown-to-dismiss (R-049)', () => {
    it('dispensa o overlay ao arrastar bem para baixo a partir do topo', () => {
        const onClose = vi.fn();
        render(_jsx(MobileDiffView, { files: files, selectedFileId: "f1", onSelectFile: vi.fn(), onClose: onClose }));
        const view = overlay();
        fireEvent.touchStart(view, { touches: [{ clientX: 100, clientY: 0 }] });
        fireEvent.touchMove(view, { touches: [{ clientX: 100, clientY: 240 }] });
        // Durante o arrasto, o overlay reflete o deslocamento (com resistência).
        expect(Number(view.getAttribute('data-pull-offset'))).toBeGreaterThan(0);
        fireEvent.touchEnd(view, {});
        expect(onClose).toHaveBeenCalledTimes(1);
    });
    it('não dispensa em um toque curto', () => {
        const onClose = vi.fn();
        render(_jsx(MobileDiffView, { files: files, selectedFileId: "f1", onSelectFile: vi.fn(), onClose: onClose }));
        const view = overlay();
        fireEvent.touchStart(view, { touches: [{ clientX: 100, clientY: 0 }] });
        fireEvent.touchMove(view, { touches: [{ clientX: 100, clientY: 10 }] });
        fireEvent.touchEnd(view, {});
        expect(onClose).not.toHaveBeenCalled();
        // O deslocamento é resetado ao soltar.
        expect(Number(view.getAttribute('data-pull-offset'))).toBe(0);
    });
    it('cancela o gesto quando o arrasto é horizontal (não dispensa)', () => {
        const onClose = vi.fn();
        render(_jsx(MobileDiffView, { files: files, selectedFileId: "f1", onSelectFile: vi.fn(), onClose: onClose }));
        const view = overlay();
        fireEvent.touchStart(view, { touches: [{ clientX: 0, clientY: 0 }] });
        fireEvent.touchMove(view, { touches: [{ clientX: 240, clientY: 30 }] });
        fireEvent.touchEnd(view, {});
        expect(onClose).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=MobileDiffView.test.js.map