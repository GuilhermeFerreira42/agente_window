/**
 * useXterm — FATIA-03.3
 * Hook isolado para xterm.js, sem conhecer TerminalService diretamente.
 * Responsabilidades:
 * - criar Terminal + FitAddon + WebLinks opcional
 * - medir cols/rows via fit e notificar resize
 * - encaminhar onData para callback
 * - expor write, clear, focus, etc
 * Usa tokens CSS var(--vscode-*) para tema, sem hex hardcoded.
 */

import { useCallback, useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

function readCssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function buildTheme() {
  // usa tokens do VS Code quando disponíveis, fallback neutro
  return {
    background: readCssVar('--vscode-terminal-background', readCssVar('--vscode-panel-background', '#1e1e1e')),
    foreground: readCssVar('--vscode-terminal-foreground', readCssVar('--vscode-foreground', '#cccccc')),
    cursor: readCssVar('--vscode-terminalCursor-foreground', '#cccccc'),
    selectionBackground: readCssVar('--vscode-terminal-selectionBackground', 'rgba(255,255,255,0.3)'),
    black: readCssVar('--vscode-terminal-ansiBlack', '#000000'),
    red: readCssVar('--vscode-terminal-ansiRed', '#cd3131'),
    green: readCssVar('--vscode-terminal-ansiGreen', '#0dbc79'),
    yellow: readCssVar('--vscode-terminal-ansiYellow', '#e5e510'),
    blue: readCssVar('--vscode-terminal-ansiBlue', '#2472c8'),
    magenta: readCssVar('--vscode-terminal-ansiMagenta', '#bc3fbc'),
    cyan: readCssVar('--vscode-terminal-ansiCyan', '#11a8cd'),
    white: readCssVar('--vscode-terminal-ansiWhite', '#e5e5e5'),
  };
}

export interface UseXtermOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
  active: boolean;
  loadWebLinks?: boolean;
  onData: (data: string) => void;
  onResize: (cols: number, rows: number) => void;
}

export interface UseXtermResult {
  terminalRef: MutableRefObject<Terminal | null>;
  focus: () => void;
  clear: () => void;
  write: (data: string) => void;
  fitAndResize: () => void;
  getSelection: () => string;
  hasSelection: () => boolean;
  selectAll: () => void;
}

export function useXterm(options: UseXtermOptions): UseXtermResult {
  const { containerRef, enabled, active, loadWebLinks = false, onData, onResize } = options;

  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  onDataRef.current = onData;
  onResizeRef.current = onResize;

  const fitAndResize = useCallback(() => {
    const term = terminalRef.current;
    const fit = fitAddonRef.current;
    if (!term || !fit) return;
    try {
      fit.fit();
    } catch {
      // ignora corrida de layout
    }
    onResizeRef.current(term.cols, term.rows);
  }, []);

  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  const clear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const write = useCallback((data: string) => {
    terminalRef.current?.write(data);
  }, []);

  const getSelection = useCallback(() => {
    const t = terminalRef.current as any;
    return t?.getSelection?.() ?? '';
  }, []);

  const hasSelection = useCallback(() => {
    const t = terminalRef.current as any;
    return Boolean(t?.hasSelection?.());
  }, []);

  const selectAll = useCallback(() => {
    const t = terminalRef.current as any;
    t?.selectAll?.();
    t?.focus?.();
  }, []);

  // criação
  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const theme = buildTheme();
    const fit = new FitAddon();
    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: readCssVar('--vscode-editor-font-family', readCssVar('--monaco-monospace-font', 'monospace')),
      fontSize: 12,
      theme,
      allowTransparency: true,
      scrollback: 1000,
    });

    term.loadAddon(fit);
    if (loadWebLinks) {
      term.loadAddon(new WebLinksAddon());
    }
    term.open(container);

    terminalRef.current = term;
    fitAddonRef.current = fit;

    if (active) {
      // fit após abrir
      requestAnimationFrame(() => fitAndResize());
    }

    const dataDisp = term.onData((d) => onDataRef.current(d));

    const resizeHandler = () => {
      if (active) fitAndResize();
    };
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      dataDisp.dispose();
      term.dispose();
      if (fitAddonRef.current === fit) fitAddonRef.current = null;
      if (terminalRef.current === term) terminalRef.current = null;
    };
  }, [enabled, active, containerRef, loadWebLinks, fitAndResize]);

  // tema reativo — MutationObserver para troca dark/light (Bug 4 fix, RNF-05)
  useEffect(() => {
    if (!enabled || !terminalRef.current) return;
    const term = terminalRef.current as any;
    const applyTheme = () => {
      const newTheme = buildTheme();
      if (term.options) {
        term.options.theme = newTheme;
        term.refresh?.(0, term.rows - 1);
      }
    };
    applyTheme();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    return () => observer.disconnect();
  }, [enabled]);

  // ResizeObserver para container
  useEffect(() => {
    if (!enabled || !active) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(() => fitAndResize());
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, active, containerRef, fitAndResize]);

  // fit quando fica ativo
  useEffect(() => {
    if (!enabled || !active) return;
    fitAndResize();
    const t = setTimeout(fitAndResize, 60);
    return () => clearTimeout(t);
  }, [enabled, active, fitAndResize]);

  return {
    terminalRef,
    focus,
    clear,
    write,
    fitAndResize,
    getSelection,
    hasSelection,
    selectAll,
  };
}
