const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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

  console.log('1. Carregando http://127.0.0.1:5174/ ...');
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'networkidle' });

  console.log('2. Console inicial:');
  consoleMessages.forEach(m => console.log('  ', m));
  console.log('3. Erros iniciais:');
  pageErrors.forEach(e => console.log('  ', e));

  // Tenta achar o botão de alternar terminal
  console.log('4. Procurando botões na tela...');
  const buttons = await page.$$eval('button', els => els.map(b => ({
    title: b.getAttribute('title'),
    aria: b.getAttribute('aria-label'),
    text: b.innerText,
    className: b.className
  })));
  console.log('Botões encontrados:', buttons);

  // Clica no botão de alternar terminal
  const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
  if (await termBtn.count() > 0) {
    console.log('5. Clicando no botão do terminal...');
    await termBtn.click();
    await page.waitForTimeout(2000);

    console.log('6. Console após clique:');
    consoleMessages.forEach(m => console.log('  ', m));
    console.log('7. Erros após clique:');
    pageErrors.forEach(e => console.log('  ', e));
  } else {
    console.log('Botão do terminal NÃO encontrado na tela!');
  }

  await page.screenshot({ path: '/home/user/debug_5174.png' });
  console.log('Screenshot salvo em /home/user/debug_5174.png');

  await browser.close();
})();
