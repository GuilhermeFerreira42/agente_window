import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SplitSash } from '../components/terminal/SplitSash';
describe('SplitSash', () => {
    it('emite deltas incrementais durante o drag horizontal', () => {
        const onResize = vi.fn();
        render(_jsx(SplitSash, { orientation: "vertical", onResize: onResize }));
        const separator = screen.getByRole('separator', { name: 'Redimensionar split do terminal' });
        fireEvent.mouseDown(separator, { clientX: 200 });
        fireEvent.mouseMove(window, { clientX: 250 });
        fireEvent.mouseMove(window, { clientX: 275 });
        fireEvent.mouseUp(window);
        fireEvent.mouseMove(window, { clientX: 320 });
        expect(onResize).toHaveBeenCalledTimes(2);
        expect(onResize).toHaveBeenNthCalledWith(1, 50);
        expect(onResize).toHaveBeenNthCalledWith(2, 25);
    });
});
//# sourceMappingURL=SplitSash.test.js.map