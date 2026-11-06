// ============================================================================
// ui/attach/Breadcrumbs.tsx — 4.7 c3. `breadcrumbsControl.ts`: faixa 22 px sob
// as abas, um item por segmento do caminho RELATIVO à raiz do workspace,
// separador `codicon-breadcrumb-separator` (chevron-right), último item com
// ícone Seti. Picker (dropdown ao clicar) é débito 4.7-c (D2.23).
// ============================================================================
import React from 'react';
import type { WorkspaceUri } from '../../contract';
import { uriPath, uriRelative } from '../../core/uri';
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

export function Breadcrumbs({ root, uri }: { root: WorkspaceUri; uri: WorkspaceUri }) {
  const segs = breadcrumbSegments(root, uri);
  return (
    <div className="breadcrumbs-control" data-testid="attach-breadcrumbs">
      <div className="monaco-breadcrumbs" role="list" aria-label="Breadcrumbs">
        {segs.map((seg, i) => {
          const last = i === segs.length - 1;
          return (
            <React.Fragment key={`${i}-${seg}`}>
              <div className={`monaco-breadcrumb-item${last ? ' focused' : ''}`} role="listitem" title={seg}>
                {last ? (
                  <div className={fileIconLabelClasses(seg)}>
                    <span className="monaco-icon-label-container"><span className="monaco-icon-name-container"><a className="label-name">{seg}</a></span></span>
                  </div>
                ) : (
                  <div className="monaco-icon-label">
                    <span className="monaco-icon-label-container"><span className="monaco-icon-name-container"><a className="label-name">{seg}</a></span></span>
                  </div>
                )}
              </div>
              {!last && <span className="codicon codicon-breadcrumb-separator" aria-hidden="true" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Trilha de símbolos (VSCode: a parte do breadcrumb depois do arquivo).
 * Cada item é um BOTÃO de verdade — o pedido era navegável, não decorativo.
 * Sem símbolos no cursor, devolve null: nada de barra mentirosa.
 */
export function BreadcrumbsSimbolos({ trilha, onIr }: { trilha: readonly OutlineRow[]; onIr: (row: OutlineRow) => void }) {
  if (trilha.length === 0) return null;
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
    </>
  );
}
