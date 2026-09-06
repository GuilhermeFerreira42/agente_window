import { test, expect } from '@playwright/test';

test.describe('Gate 0 - Terminal Real Validation', () => {
  test('should validate terminal connectivity and session persistence', async ({ page }) => {
    console.log('Step 1: Navigating to app...');
    await page.goto('http://localhost:5173');

    console.log('Step 2: Opening terminal...');
    const terminalToggle = page.getByRole('button', { name: 'Alternar terminal' });
    await terminalToggle.click();

    console.log('Step 3: Confirming .terminal-panel visibility...');
    const terminalPanel = page.locator('.terminal-panel');
    await expect(terminalPanel).toBeVisible({ timeout: 10000 });
    console.log('✅ .terminal-panel is visible');

    console.log('Step 4: Executing deterministic command...');
    await terminalPanel.click();
    await page.keyboard.type('echo "GATE0_TEST"');
    await page.keyboard.press('Enter');

    console.log('Step 5: Confirming output in xterm...');
    await expect(page.locator('.xterm-rows')).toContainText('GATE0_TEST', { timeout: 10000 });
    console.log('✅ Output "GATE0_TEST" confirmed');

    console.log('Step 6: Closing/Hiding the panel...');
    await terminalToggle.click();
    await expect(terminalPanel).not.toBeVisible();
    console.log('✅ Panel hidden');

    console.log('Step 7: Reopening the panel...');
    await terminalToggle.click();
    await expect(terminalPanel).toBeVisible();
    console.log('✅ Panel reopened');

    console.log('Step 8: Confirming reconnection to SAME PTY...');
    await expect(page.locator('.xterm-rows')).toContainText('GATE0_TEST', { timeout: 10000 });
    console.log('✅ Reconnected to same PTY (output preserved)');
  });
});
