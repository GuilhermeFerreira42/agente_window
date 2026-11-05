// D98-Explorer browser acceptance against isolated 0/1/1k/5k filesystem fixtures.
// Runner contract: set FS_TEST_ROOT to the fixture workspace URI and
// PLAYWRIGHT_BASE_URL to the Vite server using that same FS_TEST_ROOT.
// A sibling marker `<workspace>.d98-explorer-fixture` guards the fixture; the
// 5k refresh scenario makes temporary mutations and restores them in finally.
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { relative, resolve, sep, join } from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

const rootUri = process.env.FS_TEST_ROOT;
const root = rootUri?.startsWith('file:') ? fileURLToPath(rootUri) : rootUri;
const marker = root ? `${root}.d98-explorer-fixture` : '';
const largeDirectory = root ? join(root, 'five-thousand-files') : '';
const itemCount = Number(process.env.D98_EXPLORER_EXPECTED ?? 5_000);
const fixtureReady = !!root && existsSync(marker) && existsSync(largeDirectory) && [0, 1, 1_000, 5_000].includes(itemCount);
const disposableMarker = 'D98 disposable Explorer fixture\n';
const lastName = `item-${String(itemCount - 1).padStart(5, '0')}.txt`;
const activity = (view: string) => `[data-testid="activity-bar-item"][data-view-id="${view}"]`;

interface ExplorerPerfWindow extends Window {
  __d98ExplorerPerf?: {
    startedAt: number;
    previousTick: number;
    maxTimerDelayMs: number;
    maxLongTaskMs: number;
    timer: number;
    observer: PerformanceObserver;
    stop(): { expansionMs: number; maxTimerDelayMs: number; maxLongTaskMs: number };
  };
}

test.describe('D98-Explorer virtual tree and responsiveness', () => {
  test('keeps the full logical tree while bounding DOM, long tasks and timer delay', async ({ page }) => {
    test.skip(!fixtureReady, 'Set FS_TEST_ROOT to an isolated marked 5,000-file fixture.');
    test.setTimeout(120_000);

    expect(readFileSync(marker, 'utf8')).toBe(disposableMarker);
    const relativeFixture = relative(resolve(process.cwd(), '../../../..'), resolve(root!));
    expect(relativeFixture === '..' || relativeFixture.startsWith(`..${sep}`)).toBe(true);
    expect(statSync(largeDirectory).isDirectory()).toBe(true);
    const entries = readdirSync(largeDirectory, { withFileTypes: true });
    expect(entries).toHaveLength(itemCount);
    expect(entries.every((entry) => entry.isFile())).toBe(true);
    expect(entries.some((entry) => entry.name === lastName)).toBe(itemCount > 0);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    const view = page.locator('[data-testid="explorer-view"]').first();
    if (!(await view.isVisible().catch(() => false))) await page.locator(activity('explorer')).click();
    await expect(view).toBeVisible();

    const tree = view.locator('[role="tree"]');
    const folder = tree.locator('[role="treeitem"]', { hasText: 'five-thousand-files' }).first();
    await expect(folder).toHaveCount(1);
    await expect(folder).toHaveAttribute('aria-expanded', 'false');

    let statRequests = 0;
    let statBatchRequests = 0;
    let statBatchResponses = 0;
    page.on('response', (response) => {
      if (new URL(response.url()).pathname === '/fs/statBatch') statBatchResponses++;
    });
    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      const pathname = new URL(request.url()).pathname;
      if (pathname === '/fs/stat') statRequests++;
      else if (pathname === '/fs/statBatch') {
        statBatchRequests++;
        const payload = request.postDataJSON() as { uris?: unknown } | null;
        if (Array.isArray(payload?.uris)) statRequests += payload.uris.length;
      }
    });
    await page.evaluate(() => {
      const w = window as ExplorerPerfWindow;
      const intervalMs = 20;
      const startedAt = performance.now();
      const state: NonNullable<ExplorerPerfWindow['__d98ExplorerPerf']> = {
        startedAt,
        previousTick: startedAt,
        maxTimerDelayMs: 0,
        maxLongTaskMs: 0,
        timer: 0,
        observer: new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) state.maxLongTaskMs = Math.max(state.maxLongTaskMs, entry.duration);
        }),
        stop: () => {
          clearInterval(state.timer);
          for (const entry of state.observer.takeRecords()) state.maxLongTaskMs = Math.max(state.maxLongTaskMs, entry.duration);
          state.observer.disconnect();
          return {
            expansionMs: performance.now() - state.startedAt,
            maxTimerDelayMs: state.maxTimerDelayMs,
            maxLongTaskMs: state.maxLongTaskMs,
          };
        },
      };
      state.observer.observe({ type: 'longtask', buffered: false });
      state.timer = window.setInterval(() => {
        const now = performance.now();
        state.maxTimerDelayMs = Math.max(state.maxTimerDelayMs, now - state.previousTick - intervalMs);
        state.previousTick = now;
      }, intervalMs);
      w.__d98ExplorerPerf = state;
    });

    await folder.click();
    await expect(folder).toHaveAttribute('aria-expanded', 'true', { timeout: 90_000 });
    const rowsContainer = tree.locator('.monaco-list-rows');
    await expect.poll(() => rowsContainer.getAttribute('style'), { timeout: 90_000 }).toContain(`${(itemCount + 1) * 22}px`);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const metrics = await page.evaluate(() => (window as ExplorerPerfWindow).__d98ExplorerPerf!.stop());

    // Full logical count = folder row + all 5,000 children, while the mounted
    // rows remain viewport-sized plus the fixed 8-row overscan on each side.
    expect(await rowsContainer.locator('[role="treeitem"]').count()).toBeLessThanOrEqual(60);
    const initialMounted = await rowsContainer.locator('[role="treeitem"]').count();
    expect(initialMounted).toBeGreaterThan(0);
    expect(await rowsContainer.locator(`[aria-setsize="${itemCount + 1}"]`).count()).toBeGreaterThan(0);
    expect(statRequests).toBe(itemCount);

    // Capture, then enforce the initial SPEC targets; failures remain visible
    // as benchmark failures rather than being converted into a passing result.
    await test.info().attach(`d98-explorer-metrics-${itemCount}.json`, {
      body: JSON.stringify({ itemCount, ...metrics, statRequests, statBatchRequests, initialMounted }, null, 2),
      contentType: 'application/json',
    });
    expect(statBatchRequests).toBe(itemCount > 1 ? Math.ceil(itemCount / 64) : 0);
    const expansionLimitMs = itemCount === 1_000 ? 1_500 : 4_500;
    expect(metrics.expansionMs, 'folder expansion through complete metadata and paint').toBeLessThanOrEqual(expansionLimitMs);
    expect(metrics.maxLongTaskMs, 'largest browser long task').toBeLessThanOrEqual(150);
    expect(metrics.maxTimerDelayMs, 'largest timer delay above 20ms interval').toBeLessThanOrEqual(150);

    if (itemCount === 5_000) {
      // Full refresh with a changed sort position must preserve the visible URI
      // and pixel offset; if the focused URI disappears, focus moves to its
      // former next neighbor rather than a stale/unmounted row.
      const scroller = tree.locator('.monaco-scrollable-element');
      const firstRemovedName = 'item-02000.txt';
      const firstNeighborName = 'item-02001.txt';
      const secondRemovedName = firstNeighborName;
      const secondNeighborName = 'item-02002.txt';
      const firstExtraPath = join(largeDirectory, 'aaa-before-refresh.txt');
      const secondExtraPath = join(largeDirectory, 'aab-before-second-refresh.txt');
      const removedNamesToRestore = new Set<string>();
      const extraPaths = [firstExtraPath, secondExtraPath];
      const anchorTop = 2_001 * 22 + 7;
      await scroller.evaluate((element, top) => {
        element.scrollTop = top;
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
      }, anchorTop);
      const firstRemovedRow = tree.locator(`[data-uri$="${firstRemovedName}"]`).first();
      await expect(firstRemovedRow).toBeAttached();
      await firstRemovedRow.click({ modifiers: ['Control'] });
      await expect(firstRemovedRow).toHaveAttribute('aria-selected', 'true');
      const beforeScrollBox = await scroller.boundingBox();
      const beforeAnchorBox = await firstRemovedRow.boundingBox();
      expect(beforeScrollBox).not.toBeNull();
      expect(beforeAnchorBox).not.toBeNull();
      const anchorOffsetInViewport = beforeAnchorBox!.y - beforeScrollBox!.y;
      try {
        writeFileSync(firstExtraPath, 'temporary D98 refresh anchor row\\n');
        unlinkSync(join(largeDirectory, firstRemovedName));
        removedNamesToRestore.add(firstRemovedName);
        await view.locator('.pane-header').first().hover();
        await view.locator('[data-testid="explorer-refresh"]').first().click();
        const firstNeighbor = tree.locator(`[data-uri$="${firstNeighborName}"]`).first();
        await expect(firstNeighbor).toBeAttached({ timeout: 30_000 });
        await expect(tree.locator(`[data-uri$="${firstRemovedName}"]`)).toHaveCount(0);
        await expect(firstNeighbor).toHaveAttribute('aria-selected', 'true');
        await expect(rowsContainer.locator(`[aria-setsize="${itemCount + 1}"]`)).not.toHaveCount(0);
        const firstAfterScrollBox = await scroller.boundingBox();
        const firstAfterAnchorBox = await firstNeighbor.boundingBox();
        expect(firstAfterScrollBox).not.toBeNull();
        expect(firstAfterAnchorBox).not.toBeNull();
        expect(firstAfterAnchorBox!.y - firstAfterScrollBox!.y).toBeCloseTo(anchorOffsetInViewport, 0);

        // Segunda atualização seguida: o URI que recebeu foco na primeira
        // passa a ser removido; foco/âncora devem avançar de novo, sem topo.
        const secondRemovedRow = tree.locator(`[data-uri$="${secondRemovedName}"]`).first();
        await expect(secondRemovedRow).toHaveAttribute('aria-selected', 'true');
        const secondBeforeScrollBox = await scroller.boundingBox();
        const secondBeforeAnchorBox = await secondRemovedRow.boundingBox();
        expect(secondBeforeScrollBox).not.toBeNull();
        expect(secondBeforeAnchorBox).not.toBeNull();
        const secondAnchorOffset = secondBeforeAnchorBox!.y - secondBeforeScrollBox!.y;
        writeFileSync(secondExtraPath, 'temporary D98 second refresh row\\n');
        unlinkSync(join(largeDirectory, secondRemovedName));
        removedNamesToRestore.add(secondRemovedName);
        await view.locator('.pane-header').first().hover();
        await view.locator('[data-testid="explorer-refresh"]').first().click();
        const secondNeighbor = tree.locator(`[data-uri$="${secondNeighborName}"]`).first();
        await expect(secondNeighbor).toBeAttached({ timeout: 30_000 });
        await expect(tree.locator(`[data-uri$="${secondRemovedName}"]`)).toHaveCount(0);
        await expect(secondNeighbor).toHaveAttribute('aria-selected', 'true');
        await expect(rowsContainer.locator(`[aria-setsize="${itemCount + 1}"]`)).not.toHaveCount(0);
        const secondAfterScrollBox = await scroller.boundingBox();
        const secondAfterAnchorBox = await secondNeighbor.boundingBox();
        expect(secondAfterScrollBox).not.toBeNull();
        expect(secondAfterAnchorBox).not.toBeNull();
        expect(secondAfterAnchorBox!.y - secondAfterScrollBox!.y).toBeCloseTo(secondAnchorOffset, 0);
      } finally {
        for (const extraPath of extraPaths) if (existsSync(extraPath)) unlinkSync(extraPath);
        for (const name of removedNamesToRestore) {
          const removedPath = join(largeDirectory, name);
          if (!existsSync(removedPath)) writeFileSync(removedPath, '');
        }
      }

      // Terceira atualização reverte as mutações da fixture; aguarda uma onda
      // completa de respostas batch e pintura antes de testar foco/End.
      const batchResponsesBeforeRestore = statBatchResponses;
      await view.locator('.pane-header').first().hover();
      await view.locator('[data-testid="explorer-refresh"]').first().click();
      await expect.poll(() => statBatchResponses - batchResponsesBeforeRestore, { timeout: 30_000 })
        .toBeGreaterThanOrEqual(Math.ceil(itemCount / 64) + 1);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const restoredFocus = tree.locator('[data-uri$="item-02002.txt"]').first();
      await expect(restoredFocus).toHaveAttribute('aria-selected', 'true', { timeout: 30_000 });
      await expect(rowsContainer.locator(`[aria-setsize="${itemCount + 1}"]`)).not.toHaveCount(0);
    }

    await tree.focus();
    await tree.press('End');
    const last = itemCount === 0
      ? tree.locator('[data-uri$="five-thousand-files"]').first()
      : tree.locator(`[data-uri$="${lastName}"]`).first();
    const lastIndex = itemCount === 0 ? 0 : itemCount;
    await expect(last).toBeAttached();
    await expect(last).toHaveAttribute('data-index', String(lastIndex));
    await expect(last).toHaveAttribute('aria-posinset', String(itemCount + 1));
    await expect(last).toHaveAttribute('aria-setsize', String(itemCount + 1));
    await expect(last).toHaveAttribute('aria-selected', 'true');
    const rowBox = await last.boundingBox();
    const viewportBox = await tree.locator('.monaco-scrollable-element').boundingBox();
    expect(rowBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    expect(rowBox!.y).toBeGreaterThanOrEqual(viewportBox!.y);
    expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(viewportBox!.y + viewportBox!.height);
    await expect.poll(() => tree.locator('[role="treeitem"]').count()).toBeLessThanOrEqual(60);
  });
});
