import { jsx as _jsx } from "react/jsx-runtime";
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShellPicker } from '../components/terminal/ShellPicker';
describe('ShellPicker', () => {
    it('mostra o perfil ativo, marca aria-checked e ignora seleção do mesmo shell', async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        const onSelect = vi.fn();
        render(_jsx(ShellPicker, { profiles: [
                { id: 'bash', label: 'Bash', path: '/bin/bash' },
                { id: 'zsh', label: 'Zsh', path: '/bin/zsh' },
            ], activeShellId: "bash", activeShellLabel: "Bash", open: true, onToggle: onToggle, onSelect: onSelect }));
        expect(screen.getByRole('button', { name: 'Selecionar shell (atual: Bash)' })).toBeInTheDocument();
        expect(screen.getByRole('menuitemradio', { name: /Bash/ })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('menuitemradio', { name: /Zsh/ })).toHaveAttribute('aria-checked', 'false');
        await user.click(screen.getByRole('menuitemradio', { name: /Bash/ }));
        expect(onSelect).not.toHaveBeenCalled();
        await user.click(screen.getByRole('menuitemradio', { name: /Zsh/ }));
        expect(onSelect).toHaveBeenCalledWith({ id: 'zsh', label: 'Zsh', path: '/bin/zsh' });
    });
});
//# sourceMappingURL=ShellPicker.test.js.map