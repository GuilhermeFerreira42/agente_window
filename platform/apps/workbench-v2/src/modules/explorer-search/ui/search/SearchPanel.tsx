// ============================================================================
// ui/search/SearchPanel.tsx — 4.6 c3. Porta do SearchWidget do VS Code
// (`contrib/search/browser/searchWidget.ts:115` + `searchFindInput.ts:18` +
// `patternInputWidget.ts`) para o slot da aba Search do shell.
// Régua: code-server 8080 (auditoria_46/) — widget 26 px (replace fechado) /
// 58 px (aberto); inputbox 26 px; toggles 20×20; toggle-replace 16 px à
// esquerda; details `…` 25×16 com include/exclude (h4 11 px, inputs 25 px).
// c3 entrega o WIDGET + mensagem de contagem; a árvore de resultados é o c4.
// Classes mantêm os nomes do DOM original (search-widget, monaco-inputbox,
// monaco-custom-toggle, toggle-replace-button, query-details…) para a
// comparação lado a lado (04_18 §5.2).
// ============================================================================
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ExplorerSearchEvent, ISearchApi, SearchMatch, SearchQuery, SearchReplaceSummary, WorkspaceUri } from '../../contract';
import { formatResultsMessage, NO_RESULTS_MESSAGE, type FileMatchGroup } from '../../core/search/model';
import { compileSearchQuery } from '../../core/search/queryBuilder';
import { replacementFor } from '../../core/search/textMatcher';
import { SearchResults } from './SearchResults';
import './search.css';

export interface SearchPanelProps {
  search: ISearchApi & {
    onEvent(cb: (e: ExplorerSearchEvent) => void): () => void;
    cancelPending(): void;
    /** c5 — troca pontual (1 match / 1 arquivo); fora do contrato congelado. */
    replaceMatches?(input: { query: SearchQuery; replacement: string; matches: ReadonlyArray<SearchMatch>; preserveCase?: boolean }): Promise<SearchReplaceSummary>;
    /** c6 — resultado retido pelo serviço (a UI é desmontada ao trocar de aba). */
    lastResult?: { root: WorkspaceUri; query: SearchQuery; matches: SearchMatch[]; fileCount: number; truncated: boolean } | null;
  };
  root: WorkspaceUri;
  /** Incrementa para focar o input (Ctrl+Shift+F do shell). */
  focusRequest?: number;
  /** c6 — clique/Enter num match: o módulo emite `explorer.fileOpened` (+ reveal no Explorer). */
  onOpenMatch?: (m: SearchMatch) => void;
}

// c6 — persistência (searchView.ts saveState: query/replace/toggles/include/
// exclude + widgets abertos). Só o estado do widget; resultados não.
export const SEARCH_STORAGE_KEY = 'explorer-search.search.v1';
export interface PersistedSearchState {
  pattern: string; replacement: string; include: string; exclude: string;
  isCaseSensitive: boolean; isWholeWord: boolean; isRegExp: boolean; preserveCase: boolean; useExcludeSettings: boolean;
  replaceOpen: boolean; detailsOpen: boolean;
}
function loadPersisted(): PersistedSearchState | null {
  try {
    const raw = globalThis.localStorage?.getItem(SEARCH_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<PersistedSearchState>;
    if (typeof v.pattern !== 'string' || v.pattern.length === 0) return null;
    return {
      pattern: v.pattern, replacement: typeof v.replacement === 'string' ? v.replacement : '',
      include: typeof v.include === 'string' ? v.include : '', exclude: typeof v.exclude === 'string' ? v.exclude : '',
      isCaseSensitive: v.isCaseSensitive === true, isWholeWord: v.isWholeWord === true, isRegExp: v.isRegExp === true,
      preserveCase: v.preserveCase === true, useExcludeSettings: v.useExcludeSettings !== false,
      replaceOpen: v.replaceOpen === true, detailsOpen: v.detailsOpen === true,
    };
  } catch { return null; }
}

export interface SearchToggles { isCaseSensitive: boolean; isWholeWord: boolean; isRegExp: boolean; preserveCase: boolean; useExcludeSettings: boolean }

interface Toggle { cls: string; title: string; checked: boolean; onToggle: () => void }

/** `.monaco-custom-toggle` (base/browser/ui/toggle/toggle.ts) — 20×20, radius 3. */
function CustomToggle({ cls, title, checked, onToggle }: Toggle) {
  return (
    <div
      className={`monaco-custom-toggle codicon ${cls}${checked ? ' checked' : ''}`}
      role="checkbox"
      aria-checked={checked}
      aria-label={title}
      title={title}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onToggle(); }
      }}
    />
  );
}

/** `.monaco-inputbox` com textarea auto-crescente (searchWidget: até ~6 linhas). */
function InputBox({ value, placeholder, ariaLabel, inputRef, onChange, onKeyDown, toggles, className }: {
  value: string; placeholder: string; ariaLabel: string; inputRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (v: string) => void; onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void; toggles: Toggle[]; className?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`monaco-findInput${className ? ` ${className}` : ''}`}>
      <div className={`monaco-inputbox idle${focused ? ' synthetic-focus' : ''}`}>
        <div className="ibwrapper">
          <textarea
            ref={inputRef}
            className="input"
            rows={1}
            wrap="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={placeholder}
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>
      </div>
      <div className="controls">
        {toggles.map((t) => <CustomToggle key={t.cls} {...t} />)}
      </div>
    </div>
  );
}

/** `.monaco-inputbox` simples (PatternInputWidget dos details): input 25 px. */
function PatternInput({ value, placeholder, ariaLabel, onChange, toggles }: { value: string; placeholder: string; ariaLabel: string; onChange: (v: string) => void; toggles: Toggle[] }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`monaco-findInput pattern-input${toggles.length > 0 ? ' has-controls' : ''}`}>
      <div className={`monaco-inputbox idle${focused ? ' synthetic-focus' : ''}`}>
        <div className="ibwrapper">
          <input className="input" type="text" placeholder={placeholder} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} spellCheck={false} />
        </div>
      </div>
      {toggles.length > 0 && <div className="controls">{toggles.map((t) => <CustomToggle key={t.cls} {...t} />)}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// c5 — frases do searchView.ts (replaceAll): confirmação e resultado.
// ---------------------------------------------------------------------------
export function replaceConfirmMessage(occurrences: number, files: number, replacement: string): string {
  const occ = occurrences === 1 ? `${occurrences} occurrence` : `${occurrences} occurrences`;
  const fil = files === 1 ? `${files} file` : `${files} files`;
  return replacement ? `Replace ${occ} across ${fil} with '${replacement}'?` : `Replace ${occ} across ${fil}?`;
}
export function replaceDoneMessage(occurrences: number, files: number, replacement: string): string {
  const occ = occurrences === 1 ? `${occurrences} occurrence` : `${occurrences} occurrences`;
  const fil = files === 1 ? `${files} file` : `${files} files`;
  return replacement ? `Replaced ${occ} across ${fil} with '${replacement}'.` : `Replaced ${occ} across ${fil}.`;
}

/** `.monaco-dialog-box` (base/browser/ui/dialog/dialog.ts) — medido 8080:
 *  498 px, radius 12, padding 8; botões 26 px [Cancel secondary] [Replace];
 *  Enter confirma, Esc cancela. Portal no body (modal-block dimmed). */
function ConfirmDialog({ message, primary, onConfirm, onCancel }: { message: string; primary: string; onConfirm: () => void; onCancel: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLElement>('.monaco-button:not(.secondary)')?.focus();
    return () => prev?.focus?.();
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onConfirm(); }
  };
  return createPortal(
    <div className="monaco-dialog-modal-block dimmed explorer-search-dialog" onKeyDown={onKeyDown} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div ref={boxRef} className="monaco-dialog-box" role="dialog" tabIndex={-1} aria-modal="true" aria-describedby="explorer-search-dialog-detail">
        <div className="dialog-buttons-row">
          <div className="dialog-buttons">
            <a className="monaco-button secondary monaco-text-button" tabIndex={0} role="button" onClick={onCancel} onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); onCancel(); } }}>Cancel</a>
            <a className="monaco-button monaco-text-button" tabIndex={0} role="button" onClick={onConfirm} onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); onConfirm(); } }}>{primary}</a>
          </div>
        </div>
        <div className="dialog-message-row">
          <div className="dialog-icon codicon codicon-dialog-info" aria-label="Info" />
          <div className="dialog-message-container">
            <div id="explorer-search-dialog-detail" className="dialog-message-detail">{message}</div>
          </div>
        </div>
        <div className="dialog-toolbar-row">
          <div className="dialog-toolbar">
            <div className="monaco-action-bar">
              <ul className="actions-container" role="toolbar">
                <li className="action-item" role="presentation"><a className="action-label codicon codicon-dialog-close" role="button" aria-label="Close Dialog" tabIndex={0} onClick={onCancel} /></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const matchKey = (m: SearchMatch) => `${m.uri}\u0000${m.line}\u0000${m.column}`;

export interface SearchState {
  matches: SearchMatch[]; fileCount: number; truncated: boolean; status: 'idle' | 'searching' | 'done' | 'error'; error?: string;
}

export function SearchPanel({ search, root, focusRequest, onOpenMatch }: SearchPanelProps) {
  const [persisted] = useState(() => loadPersisted());
  const [pattern, setPattern] = useState(persisted?.pattern ?? '');
  const [replacement, setReplacement] = useState(persisted?.replacement ?? '');
  const [include, setInclude] = useState(persisted?.include ?? '');
  const [exclude, setExclude] = useState(persisted?.exclude ?? '');
  const [toggles, setToggles] = useState<SearchToggles>(persisted
    ? { isCaseSensitive: persisted.isCaseSensitive, isWholeWord: persisted.isWholeWord, isRegExp: persisted.isRegExp, preserveCase: persisted.preserveCase, useExcludeSettings: persisted.useExcludeSettings }
    : { isCaseSensitive: false, isWholeWord: false, isRegExp: false, preserveCase: false, useExcludeSettings: true });
  const [replaceOpen, setReplaceOpen] = useState(persisted?.replaceOpen ?? false);
  const [detailsOpen, setDetailsOpen] = useState(persisted?.detailsOpen ?? false);
  // estado restaurado NÃO dispara busca sozinho (só digitação/Enter)
  const armedRef = useRef(!persisted);

  useEffect(() => {
    try {
      if (pattern.length === 0) { globalThis.localStorage?.removeItem(SEARCH_STORAGE_KEY); return; }
      const v: PersistedSearchState = { pattern, replacement, include, exclude, ...toggles, replaceOpen, detailsOpen };
      globalThis.localStorage?.setItem(SEARCH_STORAGE_KEY, JSON.stringify(v));
    } catch { /* storage indisponível */ }
  }, [pattern, replacement, include, exclude, toggles, replaceOpen, detailsOpen]);
  const [state, setState] = useState<SearchState>(() => {
    // remontagem (troca de aba): reaproveita o último resultado se for da mesma consulta
    const last = search.lastResult;
    const same = last && persisted && last.root === root && last.query.pattern === persisted.pattern
      && (last.query.isCaseSensitive === true) === persisted.isCaseSensitive && (last.query.isWholeWord === true) === persisted.isWholeWord
      && (last.query.isRegExp === true) === persisted.isRegExp && (last.query.include ?? '') === persisted.include.trim() && (last.query.exclude ?? '') === persisted.exclude.trim();
    return same && last ? { matches: last.matches, fileCount: last.fileCount, truncated: last.truncated, status: 'done' } : { matches: [], fileCount: 0, truncated: false, status: 'idle' };
  });
  const searchRef = useRef<HTMLTextAreaElement>(null);
  const replaceRef = useRef<HTMLTextAreaElement>(null);
  const focusReplaceNext = useRef(false);
  const [listFocusRequest, setListFocusRequest] = useState(0);
  // c5 — matches descartados (Dismiss) ou já trocados saem da árvore sem nova busca
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<{ message: string; run: () => void } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const flip = useCallback((k: keyof SearchToggles) => setToggles((t) => ({ ...t, [k]: !t[k] })), []);

  // foco pedido pelo shell (Ctrl+Shift+F) e no mount
  useEffect(() => { searchRef.current?.focus(); searchRef.current?.select(); }, [focusRequest]);
  useEffect(() => {
    if (replaceOpen && focusReplaceNext.current) { replaceRef.current?.focus(); focusReplaceNext.current = false; }
  }, [replaceOpen]);

  // eventos do serviço → estado
  useEffect(() => search.onEvent((e) => {
    if (e.type === 'search.started') setState((s) => ({ ...s, status: 'searching' }));
    else if (e.type === 'search.finished') { setState({ matches: e.matches, fileCount: e.fileCount, truncated: e.truncated, status: 'done' }); setDismissed(new Set()); setNotice(null); }
    else if (e.type === 'error' && (e.code === 'invalid_query' || e.code === 'search_failed')) setState((s) => ({ ...s, status: 'error', error: e.message }));
  }), [search]);

  const query: SearchQuery = useMemo(() => ({
    pattern, isCaseSensitive: toggles.isCaseSensitive, isWholeWord: toggles.isWholeWord, isRegExp: toggles.isRegExp,
    include: include.trim() || undefined, exclude: exclude.trim() || undefined,
  }), [pattern, toggles.isCaseSensitive, toggles.isWholeWord, toggles.isRegExp, include, exclude]);

  // busca enquanto digita (search.searchOnType) — debounce/cancel são do serviço
  useEffect(() => {
    if (pattern.length === 0) { search.cancelPending(); setState({ matches: [], fileCount: 0, truncated: false, status: 'idle' }); setNotice(null); return; }
    if (!armedRef.current) { armedRef.current = true; return; }
    const h = search.query({ root, query });
    return () => h.cancel();
  }, [search, root, query, pattern.length]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === 'c') { e.preventDefault(); flip('isCaseSensitive'); return; }
      if (k === 'w') { e.preventDefault(); flip('isWholeWord'); return; }
      if (k === 'r') { e.preventDefault(); flip('isRegExp'); return; }
    }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'h') { e.preventDefault(); focusReplaceNext.current = true; setReplaceOpen(true); return; }
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') { e.preventDefault(); setDetailsOpen((v) => !v); return; }
    if (e.ctrlKey && e.altKey && e.key === 'Enter' && replaceOpen) { e.preventDefault(); askReplaceAll(); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (pattern) search.query({ root, query }); return; }
    // ↓ no input → foco na lista (searchView.ts: focusNextInputBox/selectNextMatch)
    if (e.key === 'ArrowDown' && visible.length > 0) { e.preventDefault(); setListFocusRequest((n) => n + 1); }
  };

  // comprimento do trecho casado (o servidor devolve só coluna): regex sticky
  // na coluna do preview; fallback = tamanho do pattern literal.
  const matchLengthOf = useMemo(() => {
    let sticky: RegExp | null = null;
    try {
      const c = compileSearchQuery(query);
      sticky = new RegExp(c.source, `${c.flags.replace('g', '')}y`);
    } catch { sticky = null; }
    return (m: SearchMatch): number => {
      if (sticky) {
        sticky.lastIndex = Math.max(0, m.column - 1);
        const r = sticky.exec(m.preview);
        if (r && r[0].length > 0) return r[0].length;
      }
      return Math.max(1, pattern.length);
    };
  }, [query, pattern.length]);
  // ---- c5: matches visíveis (menos os descartados/trocados) + ações ----
  const visible = useMemo(() => (dismissed.size === 0 ? state.matches : state.matches.filter((m) => !dismissed.has(matchKey(m)))), [state.matches, dismissed]);
  const visibleFiles = useMemo(() => new Set(visible.map((m) => m.uri)).size, [visible]);

  const compiled = useMemo(() => { try { return compileSearchQuery(query); } catch { return null; } }, [query]);
  const replacementOf = useCallback((m: SearchMatch): string => {
    if (!compiled) return replacement;
    const hit = m.preview.slice(Math.max(0, m.column - 1), Math.max(0, m.column - 1) + matchLengthOf(m));
    return replacementFor(hit, compiled, replacement, toggles.isRegExp, toggles.preserveCase);
  }, [compiled, replacement, matchLengthOf, toggles.isRegExp, toggles.preserveCase]);

  const drop = useCallback((ms: ReadonlyArray<SearchMatch>) => {
    setDismissed((prev) => { const next = new Set(prev); for (const m of ms) next.add(matchKey(m)); return next; });
  }, []);
  const replaceSome = useCallback(async (ms: ReadonlyArray<SearchMatch>) => {
    if (!search.replaceMatches || ms.length === 0) return;
    try {
      await search.replaceMatches({ query, replacement, matches: ms, preserveCase: toggles.preserveCase });
      drop(ms);
    } catch (e) {
      setNotice((e as Error)?.message ?? String(e));
    }
  }, [search, query, replacement, toggles.preserveCase, drop]);
  const onDismissMatch = useCallback((m: SearchMatch) => drop([m]), [drop]);
  const onDismissFile = useCallback((g: FileMatchGroup) => drop(g.matches), [drop]);
  const onReplaceMatch = useCallback((m: SearchMatch) => { void replaceSome([m]); }, [replaceSome]);
  const onReplaceFile = useCallback((g: FileMatchGroup) => { void replaceSome(g.matches); }, [replaceSome]);

  // Replace All do widget (searchView.replaceAll): confirmação → replaceAll do
  // contrato (atômico por arquivo) → limpa árvore + mensagem "Replaced …".
  const askReplaceAll = useCallback(() => {
    if (visible.length === 0) return;
    const occ = visible.length; const fil = visibleFiles; const rep = replacement;
    setConfirm({
      message: replaceConfirmMessage(occ, fil, rep),
      run: () => {
        setConfirm(null);
        const doIt = dismissed.size === 0 || !search.replaceMatches
          ? search.replaceAll({ root, query, replacement: rep })
          : search.replaceMatches({ query, replacement: rep, matches: visible, preserveCase: toggles.preserveCase });
        void doIt.then((r) => {
          setNotice(replaceDoneMessage(r.replacements, r.files, rep));
          setState({ matches: [], fileCount: 0, truncated: false, status: 'idle' });
          setDismissed(new Set());
          searchRef.current?.focus();
        }).catch((e) => setNotice((e as Error)?.message ?? String(e)));
      },
    });
  }, [visible, visibleFiles, replacement, dismissed.size, search, root, query, toggles.preserveCase]);

  const onReplaceKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.altKey && e.key.toLowerCase() === 'p') { e.preventDefault(); flip('preserveCase'); return; }
    if (e.ctrlKey && e.altKey && e.key === 'Enter') { e.preventDefault(); askReplaceAll(); }
  };

  const message = notice ?? (state.status === 'done'
    ? (state.matches.length === 0 ? NO_RESULTS_MESSAGE : visible.length === 0 ? '' : formatResultsMessage(visible.length, visibleFiles, state.truncated))
    : state.status === 'error' ? state.error ?? '' : '');

  return (
    <div className="search-view explorer-viewlet" data-testid="explorer-search-panel">
      <div className="search-widgets-container">
        <div className={`search-widget${replaceOpen ? ' replace-active' : ''}`}>
          <div
            className={`toggle-replace-button codicon ${replaceOpen ? 'codicon-search-hide-replace' : 'codicon-search-show-replace'}`}
            role="button"
            tabIndex={0}
            title="Toggle Replace"
            aria-label="Toggle Replace"
            aria-expanded={replaceOpen}
            onClick={() => setReplaceOpen((v) => !v)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setReplaceOpen((v) => !v); } }}
          />
          <div className="search-container input-box">
            <InputBox
              value={pattern} placeholder="Search" ariaLabel="Search" inputRef={searchRef} onChange={setPattern} onKeyDown={onSearchKeyDown}
              toggles={[
                { cls: 'codicon-case-sensitive', title: 'Match Case (Alt+C)', checked: toggles.isCaseSensitive, onToggle: () => flip('isCaseSensitive') },
                { cls: 'codicon-whole-word', title: 'Match Whole Word (Alt+W)', checked: toggles.isWholeWord, onToggle: () => flip('isWholeWord') },
                { cls: 'codicon-regex', title: 'Use Regular Expression (Alt+R)', checked: toggles.isRegExp, onToggle: () => flip('isRegExp') },
              ]}
            />
          </div>
          {replaceOpen && (
            <div className="replace-container input-box">
              <InputBox
                value={replacement} placeholder="Replace" ariaLabel="Replace" inputRef={replaceRef} onChange={setReplacement} onKeyDown={onReplaceKeyDown} className="replace-input"
                toggles={[{ cls: 'codicon-preserve-case', title: 'Preserve Case (Alt+P)', checked: toggles.preserveCase, onToggle: () => flip('preserveCase') }]}
              />
              <div className="replace-actions">
                <a
                  className={`action-label codicon codicon-search-replace-all${visible.length === 0 ? ' disabled' : ''}`}
                  role="button"
                  title={visible.length === 0 ? 'Replace All (Submit Search to Enable)' : 'Replace All (Ctrl+Alt+Enter)'}
                  aria-label="Replace All"
                  aria-disabled={visible.length === 0}
                  tabIndex={visible.length === 0 ? -1 : 0}
                  onClick={askReplaceAll}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); askReplaceAll(); } }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="query-details">
          <div
            className="more codicon codicon-ellipsis"
            role="button"
            tabIndex={0}
            title="Toggle Search Details"
            aria-label="Toggle Search Details"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setDetailsOpen((v) => !v); } }}
          />
          {detailsOpen && (
            <>
              <div className="file-types includes">
                <h4>files to include</h4>
                <PatternInput value={include} placeholder="e.g. *.ts, src/**/include" ariaLabel="Search Include Patterns" onChange={setInclude} toggles={[]} />
              </div>
              <div className="file-types excludes">
                <h4>files to exclude</h4>
                <PatternInput
                  value={exclude} placeholder="" ariaLabel="Search Exclude Patterns" onChange={setExclude}
                  toggles={[{ cls: 'codicon-exclude', title: 'Use Exclude Settings and Ignore Files', checked: toggles.useExcludeSettings, onToggle: () => flip('useExcludeSettings') }]}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="messages" role="status" aria-live="polite">
        {message && <div className="message">{message}</div>}
      </div>
      <div className="results" data-testid="explorer-search-results">
        <SearchResults
          matches={visible}
          root={root}
          matchLengthOf={matchLengthOf}
          focusRequest={listFocusRequest}
          onEscape={() => searchRef.current?.focus()}
          onOpenMatch={onOpenMatch}
          replaceActive={replaceOpen}
          replacementOf={replacementOf}
          onReplaceMatch={onReplaceMatch}
          onReplaceFile={onReplaceFile}
          onDismissMatch={onDismissMatch}
          onDismissFile={onDismissFile}
        />
      </div>
      {confirm && <ConfirmDialog message={confirm.message} primary="Replace" onConfirm={confirm.run} onCancel={() => setConfirm(null)} />}
    </div>
  );
}
