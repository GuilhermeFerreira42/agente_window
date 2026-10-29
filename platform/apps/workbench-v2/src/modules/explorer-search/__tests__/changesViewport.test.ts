import { describe, expect, it } from 'vitest';
import { getScmVirtualRange, SCM_ROW_HEIGHT } from '../ui/attach/changes/changesViewport';

describe('SCM viewport range', () => {
  it('does not render rows for an empty or zero-height viewport', () => {
    expect(getScmVirtualRange(10_000, 0, 0)).toEqual({ start: 0, end: 0, totalHeight: 10_000 * SCM_ROW_HEIGHT });
    expect(getScmVirtualRange(0, 0, 220)).toEqual({ start: 0, end: 0, totalHeight: 0 });
  });

  it('uses a bounded overscanned window at the start and end of the full model', () => {
    const first = getScmVirtualRange(10_002, 0, 220);
    expect(first.start).toBe(0);
    expect(first.end).toBeLessThan(20);
    expect(first.totalHeight).toBe(10_002 * SCM_ROW_HEIGHT);

    const last = getScmVirtualRange(10_002, 10_002 * SCM_ROW_HEIGHT, 220);
    expect(last.end).toBe(10_002);
    expect(last.start).toBeGreaterThan(9_980);
  });

  it('clamps invalid scroll and overscan inputs without dividing by zero', () => {
    expect(getScmVirtualRange(4, Number.NaN, 44, Number.POSITIVE_INFINITY)).toEqual({ start: 0, end: 2, totalHeight: 4 * SCM_ROW_HEIGHT });
    expect(getScmVirtualRange(4, -200, 44, -1)).toEqual({ start: 0, end: 2, totalHeight: 4 * SCM_ROW_HEIGHT });
  });
});
