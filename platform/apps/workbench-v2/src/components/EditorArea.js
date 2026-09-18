import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Blocks, Check, CircleAlert, CircleCheck, Code2, ExternalLink, FileCode2, GitCompareArrows, Globe2, LoaderCircle, Eye, EyeOff, ListPlus, Maximize2, Minimize2, PanelRight, RefreshCw, RotateCcw, Search, ShieldCheck, SplitSquareHorizontal, X, } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { getEditorTabsVisibleForSession } from '../domain/browserOwnership';
import { resolveVisibleEditorTabId } from '../domain/editorTabs';
import { getDiffResolution } from '../domain/sessionState';
import { isTabCloseable } from '../domain/sidePane';
import { formatSearchSummary, splitSearchHighlight } from '../domain/search';
import { ContextMenu } from './ContextMenu';
import { DragTypes } from '../domain/dragAndDrop';
function tabIcon(tab) {
    if (tab.type === 'browser')
        return _jsx(Globe2, { size: 13 });
    if (tab.type === 'search')
        return _jsx(Search, { size: 13 });
    if (tab.type === 'diff')
        return _jsx(GitCompareArrows, { size: 13 });
    if (tab.type === 'customizations')
        return _jsx(Blocks, { size: 13 });
    return _jsx(FileCode2, { size: 13 });
}
function BrowserPreview({ view, onNavigate, onBack, onForward, onReload, onStatus, onChangeViewport, monacoTheme, }) {
    const [address, setAddress] = useState(view.url);
    const [loadError, setLoadError] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    useEffect(() => setAddress(view.url), [view.url]);
    useEffect(() => {
        setLoadError(false);
        setIsBlocked(false);
    }, [view.url, view.reloadToken]);
    const canBack = view.historyIndex > 0;
    const canForward = view.historyIndex < view.history.length - 1;
    const submit = (event) => {
        event.preventDefault();
        const normalized = normalizeBrowserAddress(address);
        if (!normalized) {
            onStatus('error');
            setLoadError(true);
            return;
        }
        setLoadError(false);
        setIsBlocked(false);
        onNavigate(normalized);
    };
    const isInternal = view.url.startsWith('https://agents.local') || view.url.startsWith('http://agents.local') || view.url.startsWith('agents.local');
    const colorScheme = monacoTheme === 'vs' ? 'light' : 'dark';
    const internalSrcDoc = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:${colorScheme}}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:Canvas;color:CanvasText;font-family:system-ui,sans-serif}main{max-width:920px;margin:0 auto;padding:38px clamp(20px,7vw,72px)}nav{display:flex;gap:12px;align-items:center;color:GrayText;font-size:12px;margin-bottom:54px}nav strong{color:CanvasText}h1{font-size:clamp(28px,4vw,48px);line-height:1.08;letter-spacing:-.03em;max-width:680px;margin:0 0 14px}p{max-width:620px;color:GrayText;line-height:1.6;margin:0 0 26px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.card{min-height:100px;border:1px solid ButtonBorder;border-radius:8px;padding:14px;background:color-mix(in srgb, CanvasText 6%, Canvas)}.card strong{display:block;margin-bottom:8px}.card span{color:GrayText;font-size:12px}@media(max-width:620px){.grid{grid-template-columns:1fr}}</style></head><body><main><nav><strong>Agent Sessions</strong><span>›</span><span>${escapeHtml(view.url)}</span></nav><h1>Contextual browser for this session.</h1><p>This browser tab belongs to <strong>${escapeHtml(view.sessionId)}</strong>. Switching sessions hides it; archiving the session disposes it.</p><div class="grid"><div class="card"><strong>Session scope</strong><span>History stays with the active session.</span></div><div class="card"><strong>Editor tab</strong><span>Viewport can be desktop, tablet, or mobile.</span></div><div class="card"><strong>Load lifecycle</strong><span>The host reports iframe load and error events.</span></div></div></main></body></html>`;
    const handleLoad = () => {
        // Detect if iframe was blocked by X-Frame-Options by trying to access content
        // For external sites that block iframe, onLoad may still fire but content is empty
        // We keep ready state, but show helper if known blocklist
        const blockedHosts = ['google.com', 'github.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com'];
        const isKnownBlocked = blockedHosts.some(h => view.url.includes(h));
        if (isKnownBlocked && !isInternal) {
            setIsBlocked(true);
        }
        onStatus('ready');
    };
    const handleError = () => {
        setLoadError(true);
        onStatus('error');
    };
    return (_jsxs("div", { className: "browser-view", "data-browser-id": view.id, "data-session-id": view.sessionId, children: [_jsxs("div", { className: "browser-toolbar", children: [_jsx("button", { className: "browser-control", type: "button", title: "Voltar", "aria-label": "Voltar", disabled: !canBack, onClick: onBack, children: _jsx(ArrowLeft, { size: 14 }) }), _jsx("button", { className: "browser-control", type: "button", title: "Avan\u00E7ar", "aria-label": "Avan\u00E7ar", disabled: !canForward, onClick: onForward, children: _jsx(ArrowRight, { size: 14 }) }), _jsx("button", { className: "browser-control", type: "button", title: "Recarregar", "aria-label": "Recarregar", onClick: onReload, children: _jsx(RefreshCw, { size: 14 }) }), _jsxs("form", { className: "browser-address", onSubmit: submit, children: [_jsx(ShieldCheck, { size: 12 }), _jsx("input", { className: "browser-url-input", value: address, onChange: (event) => setAddress(event.target.value), "aria-label": "Endere\u00E7o" })] }), _jsxs("span", { className: `browser-status${view.status === 'loading' ? ' is-loading' : ''}${view.status === 'error' || loadError ? ' is-error' : ''}`, "aria-live": "polite", children: [view.status === 'loading' ? _jsx(LoaderCircle, { size: 12, className: "spin-icon" }) : view.status === 'error' || loadError ? _jsx(CircleAlert, { size: 12 }) : _jsx(CircleCheck, { size: 12 }), view.status === 'loading' ? 'Carregando' : view.status === 'error' || loadError ? 'Falha' : 'Pronto'] }), _jsx("div", { className: "browser-viewport-controls", "aria-label": "Viewport", children: ['desktop', 'tablet', 'mobile'].map((viewport) => _jsx("button", { className: `browser-viewport-button${view.viewport === viewport ? ' is-active' : ''}`, type: "button", onClick: () => onChangeViewport(viewport), children: viewport === 'desktop' ? 'Desk' : viewport === 'tablet' ? '768' : '375' }, viewport)) }), _jsx("button", { className: "browser-control", type: "button", title: "Abrir em janela externa", "aria-label": "Abrir em janela externa", onClick: () => window.open(view.url, '_blank', 'noopener,noreferrer'), children: _jsx(ExternalLink, { size: 13 }) })] }), _jsxs("div", { className: "browser-canvas", children: [(view.status === 'error' || loadError) && (_jsxs("div", { className: "browser-error-banner", role: "alert", children: [_jsx(CircleAlert, { size: 14 }), _jsxs("div", { className: "browser-error-copy", children: [_jsx("strong", { children: "Falha ao carregar a p\u00E1gina" }), _jsx("span", { children: "Verifique o endere\u00E7o. Sites como Google bloqueiam incorpora\u00E7\u00E3o (X-Frame-Options). Use o bot\u00E3o para abrir externamente." })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "secondary-button", type: "button", onClick: onReload, children: "Tentar novamente" }), _jsx("button", { className: "secondary-button", type: "button", onClick: () => window.open(view.url, '_blank', 'noopener,noreferrer'), children: "Abrir em nova aba" })] })] })), isBlocked && !loadError && (_jsxs("div", { className: "browser-error-banner is-warning", role: "alert", children: [_jsx(CircleAlert, { size: 14 }), _jsxs("div", { className: "browser-error-copy", children: [_jsx("strong", { children: "Site bloqueia incorpora\u00E7\u00E3o" }), _jsxs("span", { children: [view.url, " envia X-Frame-Options: DENY. O original usa Electron webview. Na web, abra externamente."] })] }), _jsx("button", { className: "secondary-button", type: "button", onClick: () => window.open(view.url, '_blank', 'noopener,noreferrer'), children: "Abrir em nova aba" })] })), _jsx("div", { className: `browser-frame-wrap${view.viewport === 'tablet' ? ' is-tablet' : ''}${view.viewport === 'mobile' ? ' is-mobile' : ''}`, children: isInternal ? (_jsx("iframe", { className: "browser-frame", title: `Browser ${view.url}`, srcDoc: internalSrcDoc, onLoad: handleLoad, onError: handleError }, `${view.id}-${view.reloadToken}-${view.url}`)) : (_jsx("iframe", { className: "browser-frame", title: `Browser ${view.url}`, src: view.url, sandbox: "allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-presentation", allow: "fullscreen; clipboard-read; clipboard-write", onLoad: handleLoad, onError: handleError }, `${view.id}-${view.reloadToken}-${view.url}`)) })] })] }));
}
function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function normalizeBrowserAddress(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return 'https://agents.local/';
    const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const parsed = new URL(candidate);
        if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname)
            return undefined;
        return parsed.toString();
    }
    catch {
        return undefined;
    }
}
function HighlightedSearchText({ text, query }) {
    return _jsx(_Fragment, { children: splitSearchHighlight(text, query).map((part, index) => part.highlighted ? _jsx("mark", { children: part.text }, `${part.text}-${index}`) : _jsx("span", { children: part.text }, `${part.text}-${index}`)) });
}
function SearchView({ query, results, searchFocusRequest, onChangeQuery, onOpenResult }) {
    const inputRef = useRef(null);
    useEffect(() => {
        inputRef.current?.focus();
    }, [searchFocusRequest]);
    return (_jsxs("div", { className: "search-view", children: [_jsxs("div", { className: "search-toolbar", children: [_jsxs("div", { className: "search-input-wrap", children: [_jsx(Search, { size: 14 }), _jsx("input", { ref: inputRef, autoFocus: true, className: "search-input", value: query, onChange: (event) => onChangeQuery(event.target.value), placeholder: "Pesquisar no workspace", "aria-label": "Pesquisar no workspace" })] }), _jsx("span", { className: "search-summary", "aria-live": "polite", children: formatSearchSummary(results.length) })] }), _jsxs("div", { className: "search-results", "aria-label": results.length > 0 ? 'Resultados da busca' : undefined, children: [results.map((result) => (_jsxs("button", { className: "search-result", type: "button", "aria-label": `Abrir ${result.path}, linha ${result.line}: ${result.content}`, onClick: () => onOpenResult(result), children: [_jsxs("span", { className: "search-result-meta", children: [_jsx(Code2, { size: 12 }), _jsx("span", { className: "search-result-path", children: _jsx(HighlightedSearchText, { text: result.path, query: query }) }), _jsxs("span", { children: [":", result.line] })] }), _jsx("span", { className: "search-result-line", children: _jsx(HighlightedSearchText, { text: result.content, query: query }) })] }, `${result.path}-${result.line}`))), results.length === 0 && _jsxs("div", { className: "editor-surface-empty", role: "status", children: [_jsx(Search, { size: 24 }), _jsx("strong", { children: "Nenhum resultado" }), _jsx("span", { children: query.trim() ? `Nenhum arquivo contém “${query.trim()}”.` : 'Digite um termo para pesquisar no workspace.' })] })] })] }));
}
function DiffView({ files, selectedFileId, onSelectFile, onAccept, onRevert, onAcceptAll, onRevertAll, onToggleViewed, onCommit, onCreatePr, monacoTheme, }) {
    // The reference keeps the active tree item and the multi-diff editor view
    // state when the editor is backgrounded. The owner lives in App, keyed by
    // session; this component only resolves a safe first item for a new/empty
    // selection and reports user changes upward.
    const selected = files.find((file) => file.id === selectedFileId) ?? files[0];
    const pendingFiles = files.filter((file) => !getDiffResolution(file));
    const added = pendingFiles.reduce((sum, file) => sum + file.added, 0);
    const removed = pendingFiles.reduce((sum, file) => sum + file.removed, 0);
    const select = (id) => onSelectFile(id);
    if (!selected) {
        return (_jsxs("div", { className: "editor-surface-empty diff-empty-state", "data-testid": "diff-empty-state", role: "status", children: [_jsx(GitCompareArrows, { size: 28 }), _jsx("strong", { children: "Sem altera\u00E7\u00F5es pendentes" }), _jsx("span", { children: "Esta sess\u00E3o n\u00E3o possui arquivos alterados para revisar." })] }));
    }
    return (_jsxs("div", { className: "diff-view", children: [_jsxs("div", { className: "diff-toolbar", "aria-label": "Barra de ferramentas de Branch Changes", children: [_jsxs("div", { className: "diff-toolbar-heading", children: [_jsx("span", { className: "diff-toolbar-title", children: "Branch Changes" }), _jsxs("span", { className: "diff-toolbar-count", children: [files.length, " arquivos"] })] }), _jsxs("span", { className: "diff-toolbar-stats", "aria-label": `Estatísticas: mais ${added}, menos ${removed}`, children: [_jsxs("span", { className: "session-diff-added", children: ["+", added] }), _jsxs("span", { className: "session-diff-removed", children: ["\u2212", removed] })] }), _jsxs("button", { className: "secondary-button", type: "button", onClick: onRevertAll, children: [_jsx(RotateCcw, { size: 12 }), "Reverter tudo"] }), _jsxs("button", { className: "primary-button", type: "button", onClick: onAcceptAll, children: [_jsx(Check, { size: 12 }), "Aceitar tudo"] }), _jsx("button", { className: "secondary-button", type: "button", onClick: onCommit, children: "Commit" }), _jsx("button", { className: "secondary-button", type: "button", onClick: onCreatePr, children: "Criar PR" })] }), _jsx("div", { className: "diff-file-list", "aria-label": "Arquivos alterados", children: files.map((file) => {
                    const isSelected = file.id === selected.id;
                    const resolution = getDiffResolution(file);
                    const resolutionLabel = resolution === 'accepted' ? 'Aceito' : resolution === 'reverted' ? 'Revertido' : 'Pendente';
                    const effectiveAdded = resolution ? 0 : file.added;
                    const effectiveRemoved = resolution ? 0 : file.removed;
                    const statusLabel = file.status === 'added' ? 'Adicionado' : file.status === 'deleted' ? 'Excluído' : file.status === 'renamed' ? 'Renomeado' : 'Modificado';
                    const statusGlyph = file.status === 'added' ? 'A' : file.status === 'deleted' ? 'D' : file.status === 'renamed' ? 'R' : 'M';
                    const language = file.path.endsWith('.css') ? 'css' : file.path.endsWith('.ts') ? 'typescript' : 'plaintext';
                    return (_jsxs("article", { className: `diff-entry${isSelected ? ' is-active' : ''}${resolution ? ' is-resolved' : ''}${file.viewed ? ' is-viewed' : ''}`, "data-diff-file-id": file.id, children: [_jsxs("div", { className: "diff-entry-header", role: "button", tabIndex: 0, "aria-pressed": isSelected, "aria-label": `Selecionar ${file.path}`, onClick: () => select(file.id), onKeyDown: (event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        select(file.id);
                                    }
                                }, children: [_jsx("span", { className: `diff-status ${file.status}`, title: statusLabel, "aria-label": statusLabel, children: statusGlyph }), _jsxs("span", { className: "diff-path", children: [_jsx(Code2, { size: 13 }), " ", file.path] }), _jsx("span", { className: `diff-resolution ${resolution ?? 'pending'}`, "aria-label": `Estado: ${resolutionLabel}`, children: resolutionLabel }), _jsxs("span", { className: `diff-stats${resolution ? ' is-resolved' : ''}`, "aria-label": `mais ${effectiveAdded}, menos ${effectiveRemoved}`, children: [_jsxs("span", { className: "session-diff-added", children: ["+", effectiveAdded] }), _jsxs("span", { className: "session-diff-removed", children: ["\u2212", effectiveRemoved] })] }), _jsxs("div", { className: "diff-actions", onClick: (event) => event.stopPropagation(), children: [_jsxs("button", { className: `diff-viewed${file.viewed ? ' is-checked' : ''}`, type: "button", "aria-pressed": !!file.viewed, onClick: () => onToggleViewed(file.id), title: file.viewed ? 'Desmarcar como visto' : 'Marcar como visto', children: [_jsx(Check, { size: 11 }), "Viewed"] }), _jsx("button", { className: "icon-button", type: "button", title: `Aceitar ${file.path}`, "aria-label": `Aceitar ${file.path}`, onClick: () => onAccept(file.id), children: _jsx(Check, { size: 13 }) }), _jsx("button", { className: "icon-button", type: "button", title: `Reverter ${file.path}`, "aria-label": `Reverter ${file.path}`, onClick: () => onRevert(file.id), children: _jsx(RotateCcw, { size: 13 }) })] })] }), isSelected && file.viewed && _jsxs("div", { className: "diff-viewed-state", children: [_jsx(Check, { size: 14 }), _jsx("span", { children: "Arquivo marcado como Viewed; diff recolhido." })] }), isSelected && !file.viewed && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "diff-code-preview", "aria-label": `Preview de ${file.path}`, children: [_jsxs("div", { className: "diff-code-pane original", children: [_jsx("span", { className: "diff-code-label", children: "Original" }), _jsx("pre", { className: "diff-code-column original", children: file.original || 'Arquivo novo' })] }), _jsxs("div", { className: "diff-code-pane modified", children: [_jsx("span", { className: "diff-code-label", children: "Modificado" }), _jsx("pre", { className: "diff-code-column modified", children: file.modified || 'Arquivo removido' })] })] }), _jsx("div", { className: "diff-selected-editor", "data-selected-diff-id": file.id, "aria-label": `Diff Monaco de ${file.path}`, children: _jsx(DiffEditor, { height: "100%", original: file.original, modified: file.modified, theme: monacoTheme, language: language, 
                                            /* (R-091) Sem keepCurrent*Model, ocultar o editor desmonta o widget
                                               antes do reset dos modelos e o Monaco lança
                                               "TextModel got disposed before DiffEditorWidget model got reset". */
                                            keepCurrentOriginalModel: true, keepCurrentModifiedModel: true, options: { readOnly: true, renderSideBySide: true, minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false, automaticLayout: true } }) })] }))] }, file.id));
                }) })] }));
}
export function EditorArea({ activeSessionId, tabs, activeTabId, browserViews, searchQuery, searchResults, searchFocusRequest, diffFiles, selectedDiffFileId, onSelectTab, onCloseTab, onReorderTabs, onNewBrowser, onNewFile, onNewSearch, onNewDiff, onNewCustomizations, customizationsSurface, onNavigateBrowser, onBrowserBack, onBrowserForward, onReloadBrowser, onBrowserStatus, onChangeViewport, onChangeSearchQuery, onOpenSearchResult, onSelectDiffFile, onAcceptDiff, onRevertDiff, onAcceptAllDiff, onRevertAllDiff, onToggleViewed, onCommit, onCreatePr, editorMaximized, onToggleMaximize, onSplit, editorContentVisible, sidePaneState, onToggleEditorHidden, onToggleDetails, detailsVisible, theme = 'dark', }) {
    const monacoTheme = theme === 'light' ? 'vs' : 'vs-dark';
    const visibleTabs = useMemo(() => getEditorTabsVisibleForSession(tabs, activeSessionId), [tabs, activeSessionId]);
    const resolvedActiveTabId = resolveVisibleEditorTabId(visibleTabs, activeTabId);
    const activeTab = visibleTabs.find((tab) => tab.id === resolvedActiveTabId);
    const activeBrowser = activeTab?.browserId ? browserViews.find((view) => view.id === activeTab.browserId && view.sessionId === activeSessionId) : undefined;
    const [addTabMenuOpen, setAddTabMenuOpen] = useState(false);
    const [tabMenu, setTabMenu] = useState(null);
    const [tabDragId, setTabDragId] = useState(null);
    const [tabDropId, setTabDropId] = useState(null);
    // Menu de contexto (botão direito) de uma aba do editor.
    const openTabMenu = (event, tab) => {
        event.preventDefault();
        event.stopPropagation();
        const closeable = isTabCloseable(tab, sidePaneState);
        setTabMenu({
            x: event.clientX,
            y: event.clientY,
            label: `Ações da aba ${tab.title}`,
            items: [
                { id: 'select', label: 'Abrir aba', icon: tabIcon(tab), onSelect: () => onSelectTab(tab.id) },
                { id: 'close', label: 'Fechar aba', icon: _jsx(X, { size: 14 }), disabled: !closeable, onSelect: () => onCloseTab(tab.id) },
                { id: 'split', label: 'Dividir editor', icon: _jsx(SplitSquareHorizontal, { size: 14 }), separatorBefore: true, onSelect: onSplit },
            ],
        });
    };
    const addTabMenuRef = useRef(null);
    useEffect(() => {
        if (!addTabMenuOpen)
            return;
        const closeOnOutsidePointer = (event) => {
            if (!addTabMenuRef.current?.contains(event.target))
                setAddTabMenuOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === 'Escape')
                setAddTabMenuOpen(false);
        };
        document.addEventListener('pointerdown', closeOnOutsidePointer);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [addTabMenuOpen]);
    const panelId = activeTab ? editorTabDomId('editor-tabpanel', activeTab.id) : 'editor-tabpanel-empty';
    const activeTabDomId = activeTab ? editorTabDomId('editor-tab', activeTab.id) : undefined;
    const hasActiveSurface = !!activeTab && (activeTab.type !== 'browser' || !!activeBrowser);
    const runAddTabAction = (action) => {
        setAddTabMenuOpen(false);
        action();
    };
    return (_jsxs("section", { className: "editor-pane", "aria-label": "\u00C1rea principal do editor", children: [_jsxs("div", { className: "editor-pane-header", children: [_jsx("div", { className: "editor-tabs", role: "tablist", "aria-label": "Abas do editor", children: visibleTabs.map((tab, index) => {
                            const isActive = tab.id === activeTab?.id;
                            const tabId = editorTabDomId('editor-tab', tab.id);
                            return (_jsxs("div", { className: `editor-tab${isActive ? ' is-active' : ''}${tabDragId === tab.id ? ' is-dragging' : ''}${tabDropId === tab.id ? ' is-drop-over' : ''}`, role: "tab", draggable: true, onDragStart: (event) => {
                                    event.dataTransfer.setData(DragTypes.EDITOR_TAB, tab.id);
                                    event.dataTransfer.effectAllowed = 'move';
                                    setTabDragId(tab.id);
                                }, onDragOver: (event) => {
                                    if (!tabDragId || tabDragId === tab.id)
                                        return;
                                    const source = visibleTabs.find((item) => item.id === tabDragId);
                                    if (!source || source.sessionId !== tab.sessionId)
                                        return;
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = 'move';
                                    if (tabDropId !== tab.id)
                                        setTabDropId(tab.id);
                                }, onDragLeave: () => { if (tabDropId === tab.id)
                                    setTabDropId(null); }, onDrop: (event) => {
                                    event.preventDefault();
                                    const fromId = event.dataTransfer.getData(DragTypes.EDITOR_TAB) || tabDragId;
                                    setTabDropId(null);
                                    setTabDragId(null);
                                    if (fromId && fromId !== tab.id)
                                        onReorderTabs(fromId, tab.id);
                                }, onDragEnd: () => { setTabDragId(null); setTabDropId(null); }, tabIndex: isActive ? 0 : -1, "aria-selected": isActive, "aria-controls": isActive ? panelId : undefined, "aria-label": tab.title, title: tab.title, "data-session-id": tab.sessionId, "data-browser-id": tab.browserId, "data-tab-type": tab.type, "data-active": isActive, id: tabId, "aria-setsize": visibleTabs.length, "aria-posinset": index + 1, onClick: () => onSelectTab(tab.id), onContextMenu: (event) => openTabMenu(event, tab), onKeyDown: (event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        onSelectTab(tab.id);
                                        return;
                                    }
                                    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
                                        event.preventDefault();
                                        const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? visibleTabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % visibleTabs.length : (index - 1 + visibleTabs.length) % visibleTabs.length;
                                        const nextTab = visibleTabs[nextIndex];
                                        if (nextTab)
                                            onSelectTab(nextTab.id);
                                    }
                                }, children: [tabIcon(tab), _jsx("span", { className: "editor-tab-title", children: tab.title }), isTabCloseable(tab, sidePaneState) ? (_jsx("button", { className: "editor-tab-close", type: "button", "aria-label": `Fechar ${tab.title}`, title: `Fechar ${tab.title}`, onClick: (event) => {
                                            event.stopPropagation();
                                            onCloseTab(tab.id);
                                        }, onKeyDown: (event) => event.stopPropagation(), children: _jsx(X, { size: 12, "aria-hidden": "true" }) })) : (_jsx("span", { className: "editor-tab-managed", title: "Aba gerenciada \u2014 n\u00E3o pode ser fechada em modo somente-detalhes", "aria-label": "Aba gerenciada", children: _jsx(ShieldCheck, { size: 11, "aria-hidden": "true" }) }))] }, tab.id));
                        }) }), _jsxs("div", { className: "editor-add-tab-wrap", ref: addTabMenuRef, children: [_jsx("button", { className: "editor-tab-add-menu-button", type: "button", "aria-haspopup": "menu", "aria-expanded": addTabMenuOpen, "aria-label": "Adicionar aba do editor", title: "Adicionar aba do editor", onClick: () => setAddTabMenuOpen((current) => !current), children: _jsx(ListPlus, { size: 15 }) }), addTabMenuOpen && _jsxs("div", { className: "editor-tab-add-menu", role: "menu", "aria-label": "Novas abas do editor", children: [_jsxs("button", { type: "button", role: "menuitem", onClick: () => runAddTabAction(onNewDiff), children: [_jsx(GitCompareArrows, { size: 13 }), _jsx("span", { children: "Changes" })] }), _jsxs("button", { type: "button", role: "menuitem", onClick: () => runAddTabAction(onNewFile), children: [_jsx(FileCode2, { size: 13 }), _jsx("span", { children: "Files" })] }), _jsxs("button", { type: "button", role: "menuitem", onClick: () => runAddTabAction(onNewBrowser), children: [_jsx(Globe2, { size: 13 }), _jsx("span", { children: "Browser" })] }), _jsxs("button", { type: "button", role: "menuitem", onClick: () => runAddTabAction(onNewSearch), children: [_jsx(Search, { size: 13 }), _jsx("span", { children: "Search" })] }), _jsxs("button", { type: "button", role: "menuitem", onClick: () => runAddTabAction(onNewCustomizations), children: [_jsx(Blocks, { size: 13 }), _jsx("span", { children: "AI Customizations" })] })] })] }), _jsxs("div", { className: "editor-toolbar", children: [_jsx("button", { className: "toolbar-button", type: "button", title: "Dividir editor", "aria-label": "Dividir editor", onClick: onSplit, children: _jsx(SplitSquareHorizontal, { size: 14 }) }), _jsx("button", { className: "toolbar-button", type: "button", title: editorContentVisible ? 'Ocultar editor' : 'Mostrar editor', "aria-label": editorContentVisible ? 'Ocultar editor' : 'Mostrar editor', "aria-pressed": !editorContentVisible, onClick: onToggleEditorHidden, children: editorContentVisible ? _jsx(EyeOff, { size: 14 }) : _jsx(Eye, { size: 14 }) }), (activeTab?.type === 'diff' || activeTab?.type === 'file') && (_jsx("button", { className: `toolbar-button${detailsVisible ? ' is-active' : ''}`, type: "button", title: "Alternar detalhes (Alt+Cmd+L)", "aria-label": "Alternar detalhes", "aria-pressed": detailsVisible, onClick: onToggleDetails, children: _jsx(PanelRight, { size: 14 }) })), _jsx("button", { className: `toolbar-button${editorMaximized ? ' is-active' : ''}`, type: "button", title: editorMaximized ? 'Restaurar editor' : 'Maximizar editor', "aria-label": editorMaximized ? 'Restaurar editor' : 'Maximizar editor', "aria-pressed": editorMaximized, onClick: onToggleMaximize, children: editorMaximized ? _jsx(Minimize2, { size: 14 }) : _jsx(Maximize2, { size: 14 }) })] })] }), _jsxs("div", { className: "editor-body", id: panelId, role: "tabpanel", tabIndex: 0, "aria-labelledby": activeTabDomId, "aria-label": !activeTab ? 'Nenhum editor ativo' : undefined, children: [!editorContentVisible && hasActiveSurface && _jsxs("div", { className: "editor-hidden-content", "data-testid": "editor-hidden-content", children: [_jsx(EyeOff, { size: 26 }), _jsx("strong", { children: "Editor oculto" }), _jsx("span", { children: "A barra de abas permanece vis\u00EDvel. Use \"Mostrar editor\" para reexibir o conte\u00FAdo." }), _jsxs("button", { className: "secondary-button", type: "button", onClick: onToggleEditorHidden, children: [_jsx(Eye, { size: 13 }), "Mostrar editor"] })] }), editorContentVisible && !hasActiveSurface && _jsxs("div", { className: "editor-empty", "data-testid": "editor-empty-state", children: [_jsx(Code2, { size: 30 }), _jsx("strong", { children: "Nenhum editor ativo" }), _jsx("span", { children: "Browser, Search e Branch Changes abrem aqui \u2014 n\u00E3o na barra auxiliar." }), _jsxs("button", { className: "secondary-button", type: "button", onClick: onNewBrowser, children: [_jsx(Globe2, { size: 13 }), "Abrir Browser"] })] }), editorContentVisible && activeTab?.type === 'browser' && activeBrowser && _jsx(BrowserPreview, { view: activeBrowser, monacoTheme: monacoTheme, onNavigate: (url) => onNavigateBrowser(activeBrowser.id, url), onBack: () => onBrowserBack(activeBrowser.id), onForward: () => onBrowserForward(activeBrowser.id), onReload: () => onReloadBrowser(activeBrowser.id), onStatus: (status) => onBrowserStatus(activeBrowser.id, status), onChangeViewport: (viewport) => onChangeViewport(activeBrowser.id, viewport) }), editorContentVisible && activeTab?.type === 'search' && _jsx(SearchView, { query: searchQuery, results: searchResults, searchFocusRequest: searchFocusRequest, onChangeQuery: onChangeSearchQuery, onOpenResult: onOpenSearchResult }), editorContentVisible && activeTab?.type === 'diff' && _jsx(DiffView, { files: diffFiles, selectedFileId: selectedDiffFileId, onSelectFile: onSelectDiffFile, onAccept: onAcceptDiff, onRevert: onRevertDiff, onAcceptAll: onAcceptAllDiff, onRevertAll: onRevertAllDiff, onToggleViewed: onToggleViewed, onCommit: onCommit, onCreatePr: onCreatePr, monacoTheme: monacoTheme }), editorContentVisible && activeTab?.type === 'customizations' && customizationsSurface, editorContentVisible && activeTab?.type === 'file' && _jsxs("div", { className: "monaco-editor-shell", children: [_jsxs("div", { style: { padding: '8px 12px', fontSize: 11, color: 'var(--vscode-descriptionForeground)', borderBottom: '1px solid var(--vscode-panel-border)', background: 'var(--vscode-editor-background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("span", { children: [activeTab.isRealFile ? '📄 Arquivo real do disco' : '📄 Arquivo mock', " \u2014 ", activeTab.path] }), activeTab.isRealFile && _jsx("span", { style: { fontSize: 10, background: 'var(--vscode-badge-background)', color: 'var(--vscode-badge-foreground)', padding: '2px 6px', borderRadius: 4 }, children: "REAL" })] }), _jsx(Editor, { height: "calc(100% - 29px)", defaultLanguage: activeTab.path?.endsWith('.json') ? 'json' : activeTab.path?.endsWith('.css') ? 'css' : activeTab.path?.endsWith('.md') ? 'markdown' : 'typescript', defaultValue: activeTab.content ?? `// ${activeTab.path ?? 'workspace file'}\n\nexport const agentWindow = {\n  sessions: true,\n  editorSurface: 'browser | search | diff',\n  singlePaneBreakpoint: 1024,\n  isReal: ${!!activeTab.isRealFile},\n};`, value: activeTab.content, theme: monacoTheme, options: { minimap: { enabled: false }, fontSize: 13, automaticLayout: true, padding: { top: 12 }, readOnly: false } })] })] }), _jsx(ContextMenu, { menu: tabMenu, onClose: () => setTabMenu(null) })] }));
}
function editorTabDomId(prefix, id) {
    return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}
//# sourceMappingURL=EditorArea.js.map