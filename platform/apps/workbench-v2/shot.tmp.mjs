import { chromium } from '@playwright/test';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--no-sandbox'] }); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto(url); await p.waitForSelector('.agent-sessions-workbench'); await p.waitForTimeout(1500);
await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1400, height: 900 } }); await b.close();
