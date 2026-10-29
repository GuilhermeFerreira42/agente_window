import { describe, expect, it } from 'vitest';
import { computeVirtualTreeRange } from '../virtualTreeWindow';

describe('computeVirtualTreeRange', () => {
  it('uses bounded overscan for a large logical tree', () => {
    const range = computeVirtualTreeRange({
      totalCount: 5_000,
      scrollTop: 22_000,
      viewportHeight: 440,
      rowHeight: 22,
      overscan: 4,
    });

    expect(range).toEqual({ start: 996, end: 1_024 });
    expect(range.end - range.start).toBeLessThanOrEqual(28);
  });

  it('clamps negative offsets and the tail without dropping the final row', () => {
    expect(computeVirtualTreeRange({ totalCount: 3, scrollTop: -50, viewportHeight: 1, rowHeight: 22, overscan: 4 }))
      .toEqual({ start: 0, end: 3 });
    expect(computeVirtualTreeRange({ totalCount: 100, scrollTop: 99_000, viewportHeight: 440, rowHeight: 22, overscan: 4 }))
      .toEqual({ start: 76, end: 100 });
  });

  it('returns an empty range for an empty tree', () => {
    expect(computeVirtualTreeRange({ totalCount: 0, scrollTop: 0, viewportHeight: 440, rowHeight: 22, overscan: 4 }))
      .toEqual({ start: 0, end: 0 });
  });
});
