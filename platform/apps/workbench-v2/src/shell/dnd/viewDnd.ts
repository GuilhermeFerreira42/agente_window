// FATIA-05 5.5 — view drag & drop (docs/24 §4 5.5). Native HTML5 DnD only (no library),
// same line as c3: `draggable` + DataTransfer with a private MIME type. Pure helpers, testable.
import { isViewId, type ViewId } from '../viewRegistry'

/** Private MIME type carried by a view drag; foreign drags (files, text) are ignored by every drop zone. */
export const VIEW_DRAG_MIME = 'application/vnd.agents-window.view-id'

/** Fallback payload: some hosts strip custom types from `types`; text/plain always survives. */
const TEXT_MIME = 'text/plain'

export function setViewDrag(dt: DataTransfer | null, id: ViewId): void {
  if (!dt) return
  dt.setData(VIEW_DRAG_MIME, id)
  dt.setData(TEXT_MIME, id)
  dt.effectAllowed = 'move'
}

/** True while a view drag is over a zone (`dragover` cannot read the payload in Chromium — only the types). */
export function hasViewDrag(dt: DataTransfer | null): boolean {
  if (!dt) return false
  const types = Array.from(dt.types)
  // never accept OS file drags (Explorer upload owns those); text/plain is accepted optimistically and validated on drop
  if (types.includes('Files')) return false
  return types.includes(VIEW_DRAG_MIME) || types.includes(TEXT_MIME)
}

/** Payload at `drop` time; null for anything that is not a view. */
export function readViewDrag(dt: DataTransfer | null): ViewId | null {
  if (!dt) return null
  const id = dt.getData(VIEW_DRAG_MIME) || dt.getData(TEXT_MIME)
  return isViewId(id) ? id : null
}
