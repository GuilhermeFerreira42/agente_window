import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TerminalInstanceTabs } from '../components/terminal/TerminalInstanceTabs';
describe('TerminalInstanceTabs', () => {
    it('renderiza tablist acessível, seleciona e fecha abas', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onClose = vi.fn();
        render(_jsx(TerminalInstanceTabs, { instances: [
                { key: 't0', label: 'bash', active: true },
                { key: 't1', label: '2: bash', active: false },
            ], activeKey: "t0", onSelect: onSelect, onClose: onClose, canClose: (key) => key !== 't0' }));
        const tablist = screen.getByRole('tablist', { name: 'Terminais abertos' });
        expect(tablist).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Terminal bash' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Terminal 2: bash' })).toHaveAttribute('aria-selected', 'false');
        await user.click(screen.getByRole('tab', { name: 'Terminal 2: bash' }));
        expect(onSelect).toHaveBeenCalledWith('t1');
        await user.click(screen.getByRole('button', { name: 'Fechar terminal 2: bash' }));
        expect(onClose).toHaveBeenCalledWith('t1');
        expect(screen.queryByRole('button', { name: 'Fechar terminal bash' })).not.toBeInTheDocument();
    });
});
//# sourceMappingURL=TerminalInstanceTabs.test.js.map