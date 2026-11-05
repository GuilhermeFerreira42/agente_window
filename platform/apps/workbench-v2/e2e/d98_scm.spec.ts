// D98-SCM browser integration against a real disposable Git fixture.
// Runner contract: set FS_TEST_ROOT to a file:// URI outside the repository,
// D98_SCM_EXPECTED (1k/5k/10k), and PLAYWRIGHT_BASE_URL to the local Vite port.
// The fixture root must contain .d98-scm-fixture with the exact marker below.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve, sep } from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE_URL } from './helpers';

const rootUri = process.env.FS_TEST_ROOT;
const root = rootUri?.startsWith('file:') ? fileURLToPath(rootUri) : rootUri;
const expected = Number(process.env.D98_SCM_EXPECTED ?? 5_000);
const marker = root ? join(root, '.d98-scm-fixture') : '';
const fixtureReady = !!root && existsSync(marker) && [1_000, 5_000, 10_000].includes(expected);
const disposableMarker = 'D98 disposable SCM fixture\n';
const itemName = `item-${String(expected - 1).padStart(5, '0')}.txt`;
const itemPath = root ? join(root, 'files', itemName) : '';
const extraName = `d98-live-${process.pid}.txt`;
const extraPath = root ? join(root, 'files', extraName) : '';
const scm = '[data-testid="side-bar"] [data-testid="side-bar-view-scm"]';
const activity = (view: string) => `[data-testid="activity-bar-item"][data-view-id="${view}"]`;
const gitStatus = (path: string) => execFileSync('git', ['status', '--porcelain', '--', path], {
  cwd: root!, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
}).trim();

test.describe('D98-SCM virtualization', () => {
  test.afterEach(() => {
    if (!fixtureReady) return;
    if (existsSync(extraPath)) unlinkSync(extraPath);
    // Restore only the known fixture resource exercised by this spec.
    execFileSync('git', ['reset', '--quiet', '--', `files/${itemName}`], { cwd: root!, stdio: 'ignore' });
  });

  test('virtualized Source Control retains the complete model, keyboard reach, refresh and Git actions', async ({ page }) => {
    test.skip(!fixtureReady, 'Set FS_TEST_ROOT to an isolated marked fixture and D98_SCM_EXPECTED=1000|5000|10000.');
    test.setTimeout(120_000);

    expect(readFileSync(marker, 'utf8')).toBe(disposableMarker);
    const relativeFixture = relative(resolve(process.cwd(), '../../../..'), resolve(root!));
    expect(relativeFixture === '..' || relativeFixture.startsWith(`..${sep}`)).toBe(true);
    expect(existsSync(itemPath)).toBe(true);
    const bytesBefore = readFileSync(itemPath);
    expect(gitStatus(`files/${itemName}`)).toBe(`?? files/${itemName}`);

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' });
    await page.locator(activity('scm')).click();

    const tree = page.locator(`${scm} [data-testid="scm-list"]`);
    await expect(tree).toHaveAttribute('data-total', String(expected), { timeout: 90_000 });
    await expect(page.locator(`${scm} .scm-view[data-loading="false"]`)).toBeAttached();
    await expect(page.getByRole('tree', { name: 'Source Control', exact: true })).toHaveCount(1);
    expect(await page.locator(`${scm} [data-uri]`).count()).toBeLessThan(100);
    await expect(page.locator(`${scm} [data-testid="scm-provider"] [data-count="${expected}"]`)).toHaveCount(1);

    // Tab traverses the provider action and group controls; End reaches the
    // last logical resource even though its DOM row was not initially mounted.
    const provider = page.locator(`${scm} [data-testid="scm-provider"]`);
    await provider.focus();
    await provider.press('Tab');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-action-id'))).toBe('refresh');
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-group'))).toBe('workingTree');
    await provider.focus();
    await provider.press('End');
    const last = page.locator(`${scm} [data-uri$="${itemName}"]`).first();
    await expect(last).toBeAttached();
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-uri'))).toContain(itemName);
    const rowBox = await last.boundingBox();
    const viewportBox = await page.locator(`${scm} .monaco-scrollable-element`).boundingBox();
    expect(rowBox).not.toBeNull();
    expect(viewportBox).not.toBeNull();
    expect(rowBox!.y).toBeGreaterThanOrEqual(viewportBox!.y);
    expect(rowBox!.y + rowBox!.height).toBeLessThanOrEqual(viewportBox!.y + viewportBox!.height);
    expect(await page.locator(`${scm} [data-uri]`).count()).toBeLessThan(100);

    await last.hover();
    await page.locator(`${scm} [data-testid="scm-action-stage"]:visible`).first().click();
    const staged = page.locator(`${scm} [data-in-group="index"][data-uri$="${itemName}"]`).first();
    await expect(staged).toBeAttached({ timeout: 30_000 });
    await expect(tree).toHaveAttribute('data-total', String(expected));
    await expect.poll(() => gitStatus(`files/${itemName}`)).toBe(`A  files/${itemName}`);
    await staged.hover();
    await page.locator(`${scm} [data-testid="scm-action-unstage"]:visible`).first().click();
    await expect(page.locator(`${scm} [data-in-group="workingTree"][data-uri$="${itemName}"]`).first()).toBeAttached({ timeout: 30_000 });
    await expect.poll(() => gitStatus(`files/${itemName}`)).toBe(`?? files/${itemName}`);
    expect(readFileSync(itemPath).equals(bytesBefore)).toBe(true);

    // Refresh applies confirmed Git snapshots without truncating the model.
    // Provider is outside the DOM window after End, so return to the top first.
    await page.locator(`${scm} .monaco-scrollable-element`).evaluate((element) => {
      element.scrollTop = 0;
      element.dispatchEvent(new Event('scroll', { bubbles: true }));
    });
    await expect(provider).toBeVisible();
    writeFileSync(extraPath, 'temporary D98 SCM E2E row\n');
    await provider.hover();
    await page.locator(`${scm} [data-testid="scm-refresh"]:visible`).click();
    await expect(tree).toHaveAttribute('data-total', String(expected + 1), { timeout: 30_000 });
    await expect(page.locator(`${scm} [data-uri$="${extraName}"]`)).toHaveCount(1);
    unlinkSync(extraPath);
    await provider.hover();
    await page.locator(`${scm} [data-testid="scm-refresh"]:visible`).click();
    await expect(tree).toHaveAttribute('data-total', String(expected), { timeout: 30_000 });
    await expect(page.locator(`${scm} [data-uri$="${extraName}"]`)).toHaveCount(0);
    expect(await page.locator(`${scm} [data-uri]`).count()).toBeLessThan(100);

    // Switching views drops resource DOM but restores the logical focus target.
    const focusedBeforeHide = page.locator(`${scm} [data-uri$="item-00000.txt"]`).first();
    await focusedBeforeHide.focus();
    const focusedUri = await focusedBeforeHide.getAttribute('data-uri');
    await page.locator(activity('explorer')).click();
    await expect.poll(() => page.locator(`${scm} [data-uri]`).count()).toBe(0);
    await page.locator(activity('scm')).click();
    await expect(tree).toHaveAttribute('data-total', String(expected));
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-uri'))).toBe(focusedUri);
    expect(await page.locator(`${scm} [data-uri]`).count()).toBeLessThan(100);
  });
});
