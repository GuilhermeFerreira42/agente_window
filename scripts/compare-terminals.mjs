import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = '/home/user/agente_window/docs/comparacao-terminal';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();

async function screenshot(name, page) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Screenshot saved: ${file}`);
  return file;
}

console.log('=== VS Code (code-server) 8080 ===');
try {
  await page.goto('http://localhost:8080/?folder=/home/user/agente_window', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000); // VS Code loads slow
  await screenshot('01-vscode-initial.png', page);

  // Try to open terminal via Ctrl+`
  await page.keyboard.press('Control+`');
  await page.waitForTimeout(2000);
  await screenshot('02-vscode-after-ctrl-backtick.png', page);

  // Try to find terminal element
  const terminalVisible = await page.locator('.terminal, .xterm, [aria-label="Terminal"]').first().isVisible().catch(() => false);
  console.log('VS Code terminal visible:', terminalVisible);

  // Try command palette: Ctrl+Shift+P then "Terminal: Create New Terminal"
  await page.keyboard.press('Control+Shift+P');
  await page.waitForTimeout(1000);
  await page.keyboard.type('Terminal: Create New Terminal');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await screenshot('03-vscode-new-terminal.png', page);

} catch (e) {
  console.error('VS Code error:', e);
  await screenshot('vscode-error.png', page);
}

console.log('=== Agente Window Legacy 5173 ===');
try {
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await screenshot('04-agente-window-initial.png', page);

  // Try to find terminal panel
  const terminalPanel = page.locator('.terminal-panel, [aria-label="Terminal"]').first();
  const hasTerminal = await terminalPanel.isVisible().catch(() => false);
  console.log('Agente Window terminal panel visible:', hasTerminal);

  // Click new terminal button
  const newBtn = page.locator('button[title="Novo terminal"], button[aria-label="Novo terminal"]').first();
  if (await newBtn.isVisible().catch(() => false)) {
    await newBtn.click();
    await page.waitForTimeout(1000);
    await screenshot('05-agente-window-new-terminal.png', page);
  }

  // Click split vertical (ao lado)
  const splitV = page.locator('button[title*="Dividir vertical"], button[aria-label*="vertical"]').first();
  if (await splitV.isVisible().catch(() => false)) {
    await splitV.click();
    await page.waitForTimeout(1000);
    await screenshot('06-agente-window-split-vertical.png', page);
  }

  // Click split horizontal
  const splitH = page.locator('button[title*="Dividir horizontal"], button[aria-label*="horizontal"]').first();
  if (await splitH.isVisible().catch(() => false)) {
    await splitH.click();
    await page.waitForTimeout(1000);
    await screenshot('07-agente-window-split-horizontal.png', page);
  }

  // Click clear
  const clearBtn = page.locator('button[title="Limpar"], button[aria-label*="Limpar terminal"]').first();
  if (await clearBtn.isVisible().catch(() => false)) {
    await clearBtn.click();
    await page.waitForTimeout(500);
    await screenshot('08-agente-window-clear.png', page);
  }

  // Click maximize
  const maxBtn = page.locator('button[title="Maximizar"], button[aria-label*="Maximizar painel"]').first();
  if (await maxBtn.isVisible().catch(() => false)) {
    await maxBtn.click();
    await page.waitForTimeout(1000);
    await screenshot('09-agente-window-maximized.png', page);

    // restore
    const restoreBtn = page.locator('button[title="Restaurar"], button[aria-label*="Restaurar painel"]').first();
    if (await restoreBtn.isVisible().catch(() => false)) {
      await restoreBtn.click();
      await page.waitForTimeout(1000);
      await screenshot('10-agente-window-restored.png', page);
    }
  }

  // Test context menu
  const termContainer = page.locator('.terminal-container, .terminal-instance, .xterm').first();
  if (await termContainer.isVisible().catch(() => false)) {
    await termContainer.click({ button: 'right' });
    await page.waitForTimeout(1000);
    await screenshot('11-agente-window-context-menu.png', page);
    await page.keyboard.press('Escape');
  }

  // Test tabs
  const tabs = page.locator('.terminal-instance-tabs, .terminal-tab, [role="tab"]');
  const tabCount = await tabs.count();
  console.log(`Found ${tabCount} terminal tabs`);

  // Type in terminal if possible
  const xterm = page.locator('.xterm-helper-textarea, .terminal-container').first();
  if (await xterm.isVisible().catch(() => false)) {
    await xterm.click();
    await page.keyboard.type('echo "teste terminal agente window"\n');
    await page.waitForTimeout(1500);
    await screenshot('12-agente-window-typing.png', page);
  }

} catch (e) {
  console.error('Agente Window error:', e);
  await screenshot('agente-error.png', page);
}

await browser.close();
console.log('Done');
