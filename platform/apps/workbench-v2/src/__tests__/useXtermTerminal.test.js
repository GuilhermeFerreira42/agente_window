import { jsx as _jsx } from "react/jsx-runtime";
import { useRef } from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useXtermTerminal } from '../hooks/useXtermTerminal';
const xtermMock = vi.hoisted(() => {
    class MockTerminal {
        static instances = [];
        cols = 80;
        rows = 24;
        options;
        blur = vi.fn();
        clear = vi.fn();
        dispose = vi.fn();
        focus = vi.fn();
        loadAddon = vi.fn();
        open = vi.fn();
        refresh = vi.fn();
        attachCustomKeyEventHandler = vi.fn();
        dataHandlers = [];
        onData = vi.fn((handler) => {
            this.dataHandlers.push(handler);
            return { dispose: vi.fn() };
        });
        constructor(options) {
            this.options = { theme: options?.theme };
            MockTerminal.instances.push(this);
        }
    }
    return { MockTerminal };
});
const fitMock = vi.hoisted(() => ({ fit: vi.fn() }));
vi.mock('@xterm/xterm', () => ({ Terminal: xtermMock.MockTerminal }));
vi.mock('@xterm/addon-fit', () => ({
    FitAddon: class {
        fit = fitMock.fit;
    },
}));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {
    } }));
const darkTheme = {
    background: '#1e1e1e',
    foreground: '#cccccc',
    cursor: '#cccccc',
    cursorAccent: '#000000',
    selectionBackground: '#264f78',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5',
};
const lightTheme = {
    ...darkTheme,
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#333333',
    cursorAccent: '#ffffff',
    selectionBackground: '#add6ff',
};
function Harness({ theme }) {
    const ref = useRef(null);
    useXtermTerminal({
        containerRef: ref,
        sessionId: 'session-theme-test',
        session: {
            status: 'open',
            pid: 1234,
            activeProfile: { id: 'bash', label: 'Bash', path: '/bin/bash' },
            availableProfiles: [{ id: 'bash', label: 'Bash', path: '/bin/bash' }],
            lastError: undefined,
            sendInput: vi.fn(),
            sendResize: vi.fn(),
            closeSession: vi.fn(),
            clearOutputBuffer: vi.fn(),
            onOutput: vi.fn(() => () => { }),
        },
        enabled: true,
        active: true,
        theme,
    });
    return _jsx("div", { ref: ref });
}
describe('useXtermTerminal', () => {
    beforeEach(() => {
        xtermMock.MockTerminal.instances.length = 0;
        vi.clearAllMocks();
        vi.stubGlobal('ResizeObserver', class {
            observe() { }
            disconnect() { }
        });
    });
    it('reaplica o tema sem recriar a instância do xterm', () => {
        const view = render(_jsx(Harness, { theme: darkTheme }));
        expect(xtermMock.MockTerminal.instances).toHaveLength(1);
        const instance = xtermMock.MockTerminal.instances[0];
        expect(instance.options.theme).toMatchObject({ background: '#1e1e1e' });
        view.rerender(_jsx(Harness, { theme: lightTheme }));
        expect(xtermMock.MockTerminal.instances).toHaveLength(1);
        expect(instance.options.theme).toMatchObject({ background: '#ffffff', foreground: '#333333' });
        expect(instance.refresh).toHaveBeenCalled();
        expect(instance.dispose).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=useXtermTerminal.test.js.map