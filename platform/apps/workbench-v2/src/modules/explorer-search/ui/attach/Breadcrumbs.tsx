// ============================================================================
// ui/attach/Breadcrumbs.tsx — 4.7 c3. `breadcrumbsControl.ts`: faixa 22 px sob
// as abas, um item por segmento do caminho RELATIVO à raiz do workspace,
// separador `codicon-breadcrumb-separator` (chevron-right), último item com
// ícone Seti. Picker (dropdown ao clicar) é débito 4.7-c (D2.23).
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import { uriPath, uriRelative, uriBasename, uriDirname, uriJoinPath } from '../../core/uri';
import type { OutlineRow } from '../../core/outline/outlineModel';
import { fileIconLabelClasses } from './fileIconClasses';

export function breadcrumbSegments(root: WorkspaceUri, uri: WorkspaceUri): string[] {
  const rel = uriRelative(root, uri);
  const path = rel !== undefined && rel !== '' ? rel : uriPath(uri);
  return path.split('/').filter(Boolean);
}

/**
 * FATIA 15 Onda 3 (D169) — a trilha de SÍMBOLOS dentro do arquivo.
 *
 * O que o componente antigo fazia: só o caminho do arquivo. O que o dono pediu:
 * "o caminho do arquivo **e** a estrutura interna do código, incluindo classes,
 * funções e métodos", navegável.
 *
 * Por que NÃO reimplementei a coleta: `monacoOutline` já pergunta os símbolos ao
 * provedor do Monaco (`ILanguageFeaturesService.documentSymbolProvider`) — o
 * mesmo que faz `Ctrl+Shift+O` listar 15 símbolos do `App.tsx` (medido no
 * browser). O breadcrumb só ACHA, nas linhas que o Outline já tem, a cadeia de
 * ancestrais do cursor. Uma fonte de verdade, dois consumidores.
 *
 * Regra da casa que vale aqui: lista vazia ≠ lista velha. Sem símbolos, a trilha
 * some; nunca mostra o símbolo do arquivo anterior.
 */
export function simbolosAteCursor(rows: readonly OutlineRow[], linha: number): OutlineRow[] {
  // Cadeia de ancestrais: o símbolo mais interno cujo intervalo contém a linha,
  // depois o pai dele, e assim por diante. `rows` vem achatado em pré-ordem, com
  // `depth` e `endLine`, então a subida é por profundidade decrescente.
  const dentro = rows.filter((r) => r.line <= linha && linha <= Math.max(r.endLine, r.line));
  if (dentro.length === 0) return [];
  let maisInterno = dentro[0];
  for (const r of dentro) if (r.depth >= maisInterno.depth && r.line >= maisInterno.line) maisInterno = r;
  const cadeia: OutlineRow[] = [maisInterno];
  let atual = maisInterno;
  while (atual.depth > 0) {
    const irmaosAntes = rows.filter((r) => r.depth < atual.depth && r.line <= atual.line);
    const pai = irmaosAntes[irmaosAntes.length - 1];
    if (!pai || pai.line === atual.line || cadeia.includes(pai)) break;
    cadeia.unshift(pai);
    atual = pai;
  }
  return cadeia;
}

export function Breadcrumbs({ root, uri, fs, onOpen }: { root: WorkspaceUri; uri: WorkspaceUri; fs?: Partial<Pick<FileSystemPortLike, 'list'>>; onOpen?: (uri: WorkspaceUri) => void }) {
  const segs = breadcrumbSegments(root, uri);
  const relative = uriRelative(root, uri);
  const inside = relative !== undefined;
  const parts = inside ? [{ label: uriBasename(root), uri: root }, ...segs.map((seg, i) => ({ label: seg, uri: uriJoinPath(root, ...segs.slice(0, i + 1)) }))] : segs.map((seg, i) => ({ label: seg, uri: (`file:///${segs.slice(0, i + 1).join('/')}`) as WorkspaceUri }));
  const host = useRef<HTMLDivElement>(null);
  const [directory, setDirectory] = useState<WorkspaceUri | null>(null);
  const [entries, setEntries] = useState<Awaited<ReturnType<FileSystemPortLike['list']>>>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { setDirectory(null); }, [uri]);
  useEffect(() => {
    let alive = true; setEntries([]); setError(''); setQuery('');
    if (directory && fs?.list) void fs.list({ uri: directory }).then(items => { if (alive) setEntries(items.sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1)); }).catch(e => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, [directory, fs]);
  useEffect(() => {
    if (!directory) return;
    const dismiss = (event: PointerEvent) => { if (!host.current?.contains(event.target as Node)) setDirectory(null); };
    document.addEventListener('pointerdown', dismiss); return () => document.removeEventListener('pointerdown', dismiss);
  }, [directory]);
  return <div ref={host} className="breadcrumbs-control" data-testid="attach-breadcrumbs" title={uriPath(uri)}>
    <div className="monaco-breadcrumbs" role="list" aria-label="Breadcrumbs">
      {parts.map((part, i) => <React.Fragment key={part.uri}>
        <div className={`monaco-breadcrumb-item${i === parts.length - 1 ? ' focused' : ''}`} role="listitem">
          <button type="button" className={`breadcrumb-path ${i === parts.length - 1 ? fileIconLabelClasses(part.label) : 'monaco-icon-label'}`} title={uriPath(part.uri)} disabled={!fs?.list || !onOpen} aria-label={`Navegar: ${part.label}`} aria-expanded={!!directory && directory === (i === parts.length - 1 ? uriDirname(uri) : part.uri)} onClick={() => setDirectory(i === parts.length - 1 ? uriDirname(uri) : part.uri)}>{part.label}</button>
        </div>
        {i < parts.length - 1 && <span className="codicon codicon-breadcrumb-separator" aria-hidden="true" />}
      </React.Fragment>)}
    </div>
    {directory && <div className="breadcrumb-picker" role="dialog" aria-label="Navegar pelo caminho" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') setDirectory(null); }}>
      <div className="breadcrumb-picker-heading" title={uriPath(directory)}>{uriPath(directory)}</div>
      <input autoFocus aria-label="Filtrar arquivos do caminho" value={query} onChange={event => setQuery(event.target.value)} />
      {directory !== root && <button type="button" onClick={() => setDirectory(uriDirname(directory))}>.. / Pasta acima</button>}
      {error && <p role="alert">{error}</p>}
      {entries.filter(entry => entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(entry => <button key={entry.uri} type="button" onClick={() => { if (entry.kind === 'directory') setDirectory(entry.uri); else { setDirectory(null); onOpen?.(entry.uri); } }}>{entry.kind === 'directory' ? '▸ ' : ''}{entry.name}</button>)}
      <button type="button" onClick={() => setDirectory(null)}>Fechar navegação</button>
    </div>}
  </div>;
}

/**
 * Trilha de símbolos (VSCode: a parte do breadcrumb depois do arquivo).
 * Cada item é um BOTÃO de verdade — o pedido era navegável, não decorativo.
 * Sem símbolos no cursor, devolve null: nada de barra mentirosa.
 */
export function BreadcrumbsSimbolos({ trilha, onIr, rows = trilha }: { trilha: readonly OutlineRow[]; rows?: readonly OutlineRow[]; onIr: (row: OutlineRow) => void }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  return (
    <>
      {trilha.map((row) => (
        <React.Fragment key={row.id}>
          <span className="codicon codicon-breadcrumb-separator" aria-hidden="true" />
          <div className="monaco-breadcrumb-item" role="listitem" title={`${row.kind} ${row.name}`}>
            <button
              type="button"
              className="label-name breadcrumb-symbol"
              data-testid="breadcrumb-symbol"
              data-symbol-kind={row.kind}
              onClick={() => onIr(row)}
            >
              <span className={`codicon codicon-symbol-${row.kind}`} aria-hidden="true" />
              {row.name}
            </button>
          </div>
        </React.Fragment>
      ))}
      <button type="button" className="breadcrumb-symbol" aria-label="Navegar pelos símbolos" aria-expanded={open} onClick={() => setOpen(value => !value)}>…</button>
      {open && <div className="breadcrumb-picker" role="dialog" aria-label="Símbolos do arquivo" onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
        {rows.map(row => <button key={row.id} type="button" onClick={() => { onIr(row); setOpen(false); }}>{row.name}</button>)}
        <button type="button" onClick={() => setOpen(false)}>Fechar símbolos</button>
      </div>}
    </>
  );
}
