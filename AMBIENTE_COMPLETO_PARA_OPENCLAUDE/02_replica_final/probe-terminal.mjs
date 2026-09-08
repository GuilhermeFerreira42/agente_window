import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

function fail(message) {
  console.error(message)
  process.exit(1)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

try {
  await page.goto(BASE_URL)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })

  const toggleButton = page.getByRole('button', { name: 'Alternar terminal' })
  await toggleButton.click()

  const terminalPanel = page.locator('.terminal-panel')
  await terminalPanel.waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForFunction(
    () => document.querySelector('.terminal-panel')?.getAttribute('data-pty-status') === 'open',
    undefined,
    { timeout: 15000 }
  )

  const rows = page.locator('.terminal-container .xterm-rows').first()
  const promptText = (await rows.textContent()) || ''
  const hasPrompt = /[$>#]|user@/i.test(promptText)
  if (!hasPrompt) {
    fail(`PROMPT_MISSING: conteúdo inicial não parece um prompt. Recebido: ${JSON.stringify(promptText)}`)
  }

  const pidBeforeToggle = await terminalPanel.getAttribute('data-pty-pid')
  if (!pidBeforeToggle) {
    fail('PID_MISSING: terminal aberto sem data-pty-pid')
  }

  const textarea = page.locator('.terminal-container').first().locator('textarea.xterm-helper-textarea')
  await textarea.focus()

  const marker = `PROBE_${Date.now()}`
  await page.keyboard.type(`echo ${marker}`)
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    (value) => document.querySelector('.terminal-container .xterm-rows')?.textContent?.includes(value),
    marker,
    { timeout: 12000 }
  )

  await toggleButton.click()
  await terminalPanel.waitFor({ state: 'hidden', timeout: 10000 })

  await toggleButton.click()
  await terminalPanel.waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForFunction(
    () => document.querySelector('.terminal-panel')?.getAttribute('data-pty-status') === 'open',
    undefined,
    { timeout: 15000 }
  )
  await page.waitForFunction(
    (value) => document.querySelector('.terminal-container .xterm-rows')?.textContent?.includes(value),
    marker,
    { timeout: 12000 }
  )

  const pidAfterToggle = await terminalPanel.getAttribute('data-pty-pid')
  if (pidAfterToggle !== pidBeforeToggle) {
    fail(`PID_CHANGED: esperado mesmo PID após toggle. Antes=${pidBeforeToggle} Depois=${pidAfterToggle}`)
  }

  console.log('PROBE_OK')
  console.log(`PID=${pidBeforeToggle}`)
  console.log(`MARKER=${marker}`)
} finally {
  await browser.close()
}
