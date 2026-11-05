// ============================================================================
// modules/explorer-search/ui/activeFileApi.ts — 5.6 (A0.6): o que as seções
// Outline/Timeline do ExplorerView precisam saber do editor do anexo. Injetado
// por index.ts (prop ADITIVA e opcional — sem ela as seções mostram a mensagem
// padrão, como antes).
// ============================================================================
import type { WorkspaceUri } from '../contract';
import type { OutlineRow } from '../core/outline/outlineModel';
import type { TimelineItem } from '../core/timeline/timelineModel';

export interface ExplorerActiveFileApi {
  /** URI do arquivo (aba `code`) ativo no anexo; null sem aba/aba não-arquivo. */
  getActiveUri(): WorkspaceUri | null;
  onActiveChanged(cb: (uri: WorkspaceUri | null) => void): () => void;
  outline: {
    rows(): OutlineRow[];
    onChanged(cb: () => void): () => void;
    reveal(line: number, column: number): void;
  };
  timeline: {
    load(uri: WorkspaceUri): Promise<TimelineItem[]>;
    openDiff(uri: WorkspaceUri, item: TimelineItem): Promise<void>;
  };
}
