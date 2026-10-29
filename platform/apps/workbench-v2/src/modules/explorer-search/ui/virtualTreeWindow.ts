export interface VirtualTreeRange {
  /** Inclusive first index in the full logical tree. */
  start: number;
  /** Exclusive end index in the full logical tree. */
  end: number;
}

/** Return visible row indexes plus a small bounded overscan; the logical tree
 * remains untouched and callers retain the full row count for ARIA/scrolling. */
export function computeVirtualTreeRange(input: {
  totalCount: number;
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan: number;
}): VirtualTreeRange {
  const total = Math.max(0, Math.floor(input.totalCount));
  if (total === 0) return { start: 0, end: 0 };
  const rowHeight = Math.max(1, input.rowHeight);
  const overscan = Math.max(0, Math.floor(input.overscan));
  const viewportHeight = Math.max(rowHeight, input.viewportHeight);
  const scrollTop = Math.min(Math.max(0, input.scrollTop), Math.max(0, total * rowHeight - viewportHeight));
  const start = Math.min(total, Math.max(0, Math.floor(scrollTop / rowHeight) - overscan));
  const end = Math.min(total, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  return { start, end: Math.max(start, end) };
}
