const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    pageErrors.push(err.stack || err.message);
  });

  console.log('1. Carregando http://127.0.0.1:5174/ (domcontentloaded)...');
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('2. Console inicial:');
  consoleMessages.forEach(m => console.log('  ', m));
  console.log('3. Erros iniciais:');
  pageErrors.forEach(e => console.log('  ', e));

  // Tenta achar o botão de alternar terminal
  console.log('4. Procurando botão do terminal...');
  const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
  const count = await termBtn.count();
  console.log('Botão encontrado:', count > 0);

  if (count > 0) {
    console.log('5. Clicando no botão do terminal...');
    await termBtn.click({ force: true });
    await page.waitForTimeout(2000);

    console.log('6. Console após clique:');
    consoleMessages.forEach(m => console.log('  ', m));
    console.log('7. Erros após clique:');
    pageErrors.forEach(e => console.log('  ', e));

    const panel = page.locator('.terminal-panel');
    const panelCount = await panel.count();
    console.log('8. Painel do terminal presente na DOM:', panelCount > 0);
    if (panelCount > 0) {
      const status = await panel.getAttribute('data-pty-status');
      const pid = await panel.getAttribute('data-pty-pid');
      console.log(`9. Status PTY: ${status}, PID: ${pid}`);

      // Testar digitação no terminal
      const textarea = page.locator('.xterm-helper-textarea').first();
      if (await textarea.count() > 0) {
        console.log('10. Digitando comando no terminal...');
        await textarea.focus();
        await page.keyboard.type('echo FUNCIONANDO_100_PERCENT\n', { delay: 30 });
        await page.waitForTimeout(1000);

        const rows = await page.locator('.xterm-rows').first().innerText();
        console.log('11. Conteúdo impresso no terminal:');
        console.log(rows.trim());
      }
    }
  }

  await page.screenshot({ path: '/home/user/antigravity_casa_nova_provada.png' });
  console.log('Screenshot salvo em /home/user/antigravity_casa_nova_provada.png');

  await browser.close();
})();
