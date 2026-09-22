// ============================================================================
// modules/explorer-search/ui/sections.tsx — Open Editors / Timeline / Outline
// (04_01 §4 — mínimas presentes e reativas na 4.4; completude evolui nas
//  sub-fatias seguintes. Estado vazio EXIGIDO: "Nenhum editor aberto" — A2.4.)
// Upstream: openEditorsView.ts / timeline.contribution.ts / outline.contribution.
// ============================================================================

import React from 'react';
import { ChevronDown, ChevronRight, X, FileText, History, ListTree } from 'lucide-react';
import type { WorkspaceUri } from '../contract';
import { uriBasename } from '../core/uri';

export interface OpenEditorEntry {
  uri: WorkspaceUri;
  dirty?: boolean;
}

export interface TimelineEntry {
  id: string;
  label: string;
  timestampMs: number;
}

export interface OutlineEntry {
  id: string;
  label: string;
  kind: string;
  line?: number;
}

function useCollapsed(initial: boolean): [boolean, () => void] {
  const [v, setV] = React.useState(initial);
  return [v, () => setV((s) => !s)];
}

function SectionHeader({
  title, collapsed, onToggle, testId,
}: { title: string; collapsed: boolean; onToggle: () => void; testId?: string }): React.ReactElement {
  return (
    <button
      type="button"
      className="explorer-section-header"
      onClick={onToggle}
      aria-expanded={!collapsed}
      data-testid={testId}
    >
      {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      <span>{title}</span>
    </button>
  );
}

/** Open Editors (04_01 §4.1): reflete abas abertas; vazio = "Nenhum editor aberto". */
export function OpenEditorsSection({
  entries, onActivate, onClose,
}: {
  entries: OpenEditorEntry[];
  onActivate: (uri: WorkspaceUri) => void;
  onClose: (uri: WorkspaceUri) => void;
}): React.ReactElement {
  const [collapsed, toggle] = useCollapsed(false);
  return (
    <div className="explorer-section" data-testid="explorer-section-open-editors">
      <SectionHeader title="Open Editors" collapsed={collapsed} onToggle={toggle} />
      {!collapsed && (
        <div className="explorer-section-body">
          {entries.length === 0 ? (
            <div className="explorer-section-empty">Nenhum editor aberto</div>
          ) : (
            entries.map((e) => (
              <div
                key={e.uri}
                className="explorer-section-row"
                role="button"
                tabIndex={0}
                onClick={() => onActivate(e.uri)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') onActivate(e.uri); }}
                title={e.uri}
              >
                <FileText size={14} aria-hidden />
                <span className="explorer-row-label">{uriBasename(e.uri)}</span>
                <button
                  type="button"
                  className="explorer-header-btn"
                  title="Close Editor"
                  aria-label={`Close ${uriBasename(e.uri)}`}
                  onClick={(ev) => { ev.stopPropagation(); onClose(e.uri); }}
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Timeline (04_01 §4.2): eventos do recurso selecionado; mínima na 4.4:
 *  reage à seleção mostrando operações fs.recentes do recurso. */
export function TimelineSection({
  subjectName, entries,
}: {
  subjectName: string | null;
  entries: TimelineEntry[];
}): React.ReactElement {
  const [collapsed, toggle] = useCollapsed(true);
  return (
    <div className="explorer-section" data-testid="explorer-section-timeline">
      <SectionHeader title="Timeline" collapsed={collapsed} onToggle={toggle} />
      {!collapsed && (
        <div className="explorer-section-body">
          {entries.length === 0 ? (
            <div className="explorer-section-empty">
              {subjectName
                ? `Nenhuma linha do tempo disponível para ${subjectName}`
                : 'Selecione um recurso para ver a linha do tempo'}
            </div>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="explorer-section-row" title={e.label}>
                <History size={14} aria-hidden />
                <span className="explorer-row-label">{e.label}</span>
                <span className="explorer-section-row-time">
                  {new Date(e.timestampMs).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Outline (04_01 §4.3): segue o editor ativo; 4.4 = presente + reage
 *  (provider completo de símbolos = evolução futura). */
export function OutlineSection({
  subjectName, entries,
}: {
  subjectName: string | null;
  entries: OutlineEntry[];
}): React.ReactElement {
  const [collapsed, toggle] = useCollapsed(true);
  return (
    <div className="explorer-section" data-testid="explorer-section-outline">
      <SectionHeader title="Outline" collapsed={collapsed} onToggle={toggle} />
      {!collapsed && (
        <div className="explorer-section-body">
          {entries.length === 0 ? (
            <div className="explorer-section-empty">
              {subjectName ? `Sem símbolos em ${subjectName}` : <><ListTree size={12} aria-hidden /> Nenhum símbolo — abra um arquivo</>}
            </div>
          ) : (
            entries.map((e) => (
              <div key={e.id} className="explorer-section-row" title={e.kind}>
                <span className="explorer-row-label">{e.label}</span>
                {e.line != null && <span className="explorer-section-row-time">:{e.line}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
