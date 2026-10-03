const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  page.on('console', msg => logs.push());
  page.on('pageerror', err => errors.push(err.message));

  console.log('Navegando para 5174...');
  await page.goto('http://127.0.0.1:5174/');
  await page.waitForTimeout(2000);

  const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
  console.log('Clicando no terminal...');
  await termBtn.click();
  await page.waitForTimeout(2000);

  const termContainer = page.locator('.terminal-panel, [data-pty-status]').first();
  const count = await termContainer.count();
  console.log('Container do terminal encontrado:', count > 0);
  if (count > 0) {
    const status = await termContainer.getAttribute('data-pty-status');
    const pid = await termContainer.getAttribute('data-pty-pid');
    console.log();
  }

  console.log('Logs recentes:', logs.slice(-10));
  console.log('Erros:', errors);

  await browser.close();
})();