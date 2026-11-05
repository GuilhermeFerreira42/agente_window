import { test, expect } from '@playwright/test';

test.describe('Terminal V2 Interativo (Single Port & Regras de Abas)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('deve abrir o terminal sem tela cinza e conectar ao PTY com status open', async ({ page }) => {
    const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
    await expect(termBtn).toBeVisible();
    await termBtn.click();

    const panel = page.locator('.terminal-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-pty-status', 'open', { timeout: 10000 });
    
    // Background do painel deve respeitar tema escuro (não pode ser branco nem cinza puro desconfigurado)
    const bg = await panel.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(24, 24, 24)');
  });

  test('regra de abas: 1 terminal oculta gaveta lateral; 2+ terminais exibem gaveta de abas', async ({ page }) => {
    const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
    await termBtn.click();

    const panel = page.locator('.terminal-panel');
    await expect(panel).toBeVisible();

    // Com 1 terminal: gaveta lateral não deve existir
    const sidebar = page.locator('[data-testid="terminal-tabs-sidebar"], .terminal-tabs-sidebar');
    expect(await sidebar.count()).toBe(0);

    // Clica no botão + (Novo Terminal)
    const plusBtn = page.locator('button[title*="Novo Terminal"]').first();
    await expect(plusBtn).toBeVisible();
    await plusBtn.click();

    // Com 2 terminais: gaveta lateral deve existir e estar visível
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    expect(await sidebar.locator('.terminal-tab-item').count()).toBeGreaterThanOrEqual(2);
  });

  test('deve receber input de teclado no xterm e executar comando no shell real', async ({ page }) => {
    const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
    await termBtn.click();

    const panel = page.locator('.terminal-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-pty-status', 'open', { timeout: 10000 });

    const textarea = page.locator('.xterm-helper-textarea').first();
    await expect(textarea).toBeAttached();
    await textarea.focus();

    await page.keyboard.type('echo TESTE_AUTOMATIZADO_OK\n', { delay: 30 });
    await page.waitForTimeout(1500);

    const terminalRows = page.locator('.xterm-rows').first();
    await expect(terminalRows).toContainText('TESTE_AUTOMATIZADO_OK');
  });
});
