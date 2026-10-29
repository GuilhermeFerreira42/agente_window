export const SCM_ROW_HEIGHT = 22;
export const SCM_OVERSCAN = 4;

export interface VirtualRowRange {
  start: number;
  end: number;
  totalHeight: number;
}

/**
 * Returns a half-open range for a fixed-height list. An empty/hidden viewport
 * intentionally returns no rows: rendering the whole model as a fallback would
 * turn a layout/visibility edge case into an unbounded DOM commit.
 */
export function getScmVirtualRange(
  rowCount: number,
  scrollTop: number,
  viewportHeight: number,
  overscan = SCM_OVERSCAN,
): VirtualRowRange {
  const count = Math.max(0, Math.floor(Number.isFinite(rowCount) ? rowCount : 0));
  const totalHeight = count * SCM_ROW_HEIGHT;
  if (count === 0 || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return { start: 0, end: 0, totalHeight };
  }

  const top = Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0);
  const pad = Math.max(0, Math.floor(Number.isFinite(overscan) ? overscan : 0));
  const firstVisible = Math.floor(top / SCM_ROW_HEIGHT);
  const afterLastVisible = Math.ceil((top + viewportHeight) / SCM_ROW_HEIGHT);
  return {
    start: Math.max(0, firstVisible - pad),
    end: Math.min(count, afterLastVisible + pad),
    totalHeight,
  };
}
