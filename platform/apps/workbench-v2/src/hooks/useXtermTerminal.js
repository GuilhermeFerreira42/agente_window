import { useCallback, useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
function readToken(name) {
    if (typeof document === 'undefined')
        return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
export function useXtermTerminal({ containerRef, sessionId, session, enabled, active = true, theme, loadWebLinks = false, }) {
    const instanceRef = useRef(null);
    const fitAddonRef = useRef(null);
    const sessionRef = useRef(session);
    sessionRef.current = session;
    const fitAndSync = useCallback(() => {
        const instance = instanceRef.current;
        if (!instance)
            return;
        try {
            fitAddonRef.current?.fit();
        }
        catch {
            // Ignore fit races while layout settles.
        }
        sessionRef.current?.sendResize(instance.cols, instance.rows);
    }, []);
    const focus = useCallback(() => {
        instanceRef.current?.focus();
    }, []);
    const clear = useCallback(() => {
        instanceRef.current?.clear();
    }, []);
    const hasSelection = useCallback(() => {
        const terminal = instanceRef.current;
        return Boolean(terminal?.hasSelection?.());
    }, []);
    const getSelection = useCallback(() => {
        const terminal = instanceRef.current;
        return terminal?.getSelection?.() || '';
    }, []);
    const selectAll = useCallback(() => {
        const terminal = instanceRef.current;
        terminal?.selectAll?.();
        terminal?.focus();
    }, []);
    useEffect(() => {
        if (!enabled || !containerRef.current)
            return;
        const fit = new FitAddon();
        const instance = new Terminal({
            convertEol: true,
            cursorBlink: true,
            cursorStyle: 'bar',
            fontFamily: readToken('--monaco-monospace-font') || 'monospace',
            fontSize: 12,
            theme,
        });
        instance.loadAddon(fit);
        if (loadWebLinks) {
            instance.loadAddon(new WebLinksAddon());
        }
        instance.open(containerRef.current);
        fitAddonRef.current = fit;
        instanceRef.current = instance;
        if (active) {
            fitAndSync();
        }
        const dataDisposable = instance.onData((data) => {
            sessionRef.current?.sendInput(data);
        });
        instance.attachCustomKeyEventHandler((event) => {
            if (event.type === 'keydown' && event.key === 'Escape') {
                instance.blur();
                return false;
            }
            return true;
        });
        const handleResize = () => {
            if (active) {
                fitAndSync();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            dataDisposable.dispose();
            instance.dispose();
            if (fitAddonRef.current === fit)
                fitAddonRef.current = null;
            if (instanceRef.current === instance)
                instanceRef.current = null;
        };
    }, [active, containerRef, enabled, fitAndSync, loadWebLinks, sessionId]);
    useEffect(() => {
        if (!enabled || !instanceRef.current)
            return;
        const instanceWithOptions = instanceRef.current;
        if (!instanceWithOptions.options)
            return;
        instanceWithOptions.options.theme = theme;
        if (typeof instanceWithOptions.refresh === 'function') {
            instanceWithOptions.refresh(0, Math.max(0, instanceRef.current.rows - 1));
        }
        if (active) {
            fitAndSync();
        }
    }, [active, enabled, fitAndSync, theme]);
    useEffect(() => {
        if (!enabled || !session || !instanceRef.current)
            return;
        const unsubscribe = session.onOutput((data) => {
            instanceRef.current?.write(data);
        });
        if (active) {
            fitAndSync();
        }
        return unsubscribe;
    }, [active, enabled, fitAndSync, session]);
    useEffect(() => {
        if (!enabled || !active)
            return;
        fitAndSync();
        const timer = window.setTimeout(() => {
            fitAndSync();
        }, 50);
        return () => window.clearTimeout(timer);
    }, [active, enabled, fitAndSync]);
    useEffect(() => {
        if (!enabled || !active || !containerRef.current || typeof ResizeObserver === 'undefined')
            return;
        const observer = new ResizeObserver(() => {
            fitAndSync();
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [active, containerRef, enabled, fitAndSync, sessionId]);
    return {
        instanceRef,
        focus,
        clear,
        fitAndSync,
        hasSelection,
        getSelection,
        selectAll,
    };
}
//# sourceMappingURL=useXtermTerminal.js.map