const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  
  const logs = [];
  const errors = [];
  page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
  page.on('pageerror', err => errors.push(err.message));

  console.log('1. Navegando para http://127.0.0.1:5174/ ...');
  await page.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('2. Clicando no botao do terminal...');
  const termBtn = page.locator('button[title*="Terminal"], button[aria-label*="Terminal"]').first();
  await termBtn.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(2000);

  console.log('3. Verificando estado do terminal...');
  const panel = page.locator('.terminal-panel');
  const panelCount = await panel.count();
  console.log('Terminal panel presente:', panelCount > 0);

  if (panelCount > 0) {
    const ptyStatus = await panel.getAttribute('data-pty-status');
    const ptyPid = await panel.getAttribute('data-pty-pid');
    console.log('Status PTY:', ptyStatus, '| PID:', ptyPid);

    // Verificar cor de fundo
    const bg = await panel.evaluate(el => getComputedStyle(el).backgroundColor);
    console.log('Cor de fundo do painel:', bg);

    // Tentar digitar no textarea do xterm
    const xtermTextarea = page.locator('.xterm-helper-textarea').first();
    if (await xtermTextarea.count() > 0) {
      console.log('4. Digitando echo teste-antigravity ...');
      await xtermTextarea.focus();
      await page.keyboard.type('echo teste-antigravity\n', { delay: 50 });
      await page.waitForTimeout(1000);

      const terminalText = await page.locator('.xterm-rows').first().innerText();
      console.log('Conteudo do terminal:', terminalText.replace(/\n+/g, ' | '));
    }
  }

  await page.screenshot({ path: '/home/user/antigravity_terminal_success.png' });
  console.log('Screenshot final salvo em /home/user/antigravity_terminal_success.png');

  console.log('Logs recentes do console:', logs.slice(-6));
  console.log('Erros capturados:', errors);

  await browser.close();
})();
