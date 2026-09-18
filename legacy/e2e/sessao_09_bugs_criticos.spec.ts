import { expect, test } from '@playwright/test'
import { BTN, SEL, collectConsoleErrors, resetApp, shot } from './helpers'

test.describe('Sessão 09 — Bugs Críticos', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: menu de contexto na aba do editor traz as ações da aba (R-072)', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(400)

    await page.locator(`${SEL.editorTabs} .editor-tab`).first().click({ button: 'right' })
    const menu = page.locator(SEL.contextMenu)
    await expect(menu, 'botão direito na aba deve abrir menu').toBeVisible()

    const items = (await menu.locator('[role="menuitem"]').allInnerTexts()).join(' | ')
    expect(items, 'menu da aba deve permitir abrir').toContain('Abrir aba')
    expect(items, 'menu da aba deve permitir dividir o editor').toContain('Dividir editor')
    await shot(page, 'sessao09_T1_menu_aba')
    await page.keyboard.press('Escape')
    await expect(menu).toHaveCount(0)
  })

  test('T2: F2 renomeia a sessão de verdade (R-076)', async ({ page }) => {
    const row = page.locator(SEL.sessionRow).first()
    const id = await row.getAttribute('data-session-id')
    const original = (await row.locator('.session-title-text').innerText()).trim()

    await row.click()
    await row.press('F2')
    const input = page.locator(`${SEL.sessionRow}[data-session-id="${id}"] input`).first()
    await expect(input, 'F2 deve abrir o editor de nome inline').toBeVisible()

    const novo = `Renomeada pelo E2E ${Date.now() % 10000}`
    await input.fill(novo)
    await input.press('Enter')
    await page.waitForTimeout(400)

    const atual = (await page.locator(`${SEL.sessionRow}[data-session-id="${id}"] .session-title-text`).innerText()).trim()
    expect(atual, 'o título tem que mudar de fato').toBe(novo)
    expect(atual).not.toBe(original)
    await shot(page, 'sessao09_T2_rename_f2')
  })

  test('T3: Delete remove a sessão da lista (R-076)', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const before = await rows.count()
    const row = rows.first()
    const id = await row.getAttribute('data-session-id')

    await row.click()
    await row.press('Delete')
    await page.waitForTimeout(400)

    await expect(rows, 'a lista deve perder exatamente uma linha').toHaveCount(before - 1)
    expect(await page.locator(`${SEL.sessionRow}[data-session-id="${id}"]`).count(), 'a sessão excluída não pode continuar na lista').toBe(0)
    await shot(page, 'sessao09_T3_delete')
  })

  test('T4: as setas movem o foco entre sessões (roving index)', async ({ page }) => {
    const rows = page.locator(`${SEL.sessionRow}[data-session-nav="true"]`)
    const first = rows.first()
    await first.focus()
    const idFocado = await page.evaluate(() => document.activeElement?.getAttribute('data-session-id'))

    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(200)
    const idDepois = await page.evaluate(() => document.activeElement?.getAttribute('data-session-id'))

    expect(idDepois, 'ArrowDown precisa mover o foco para outra linha').not.toBe(idFocado)
    expect(idDepois, 'o foco deve continuar numa linha de sessão').toBeTruthy()

    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(200)
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-session-id')), 'ArrowUp volta ao item anterior').toBe(idFocado)
    await shot(page, 'sessao09_T4_roving_index')
  })

  test('T5: sessões são arrastáveis e o menu oferece fixar/arquivar (R-085)', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const rows = page.locator(SEL.sessionRow)

    const draggables = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('draggable')))
    expect(draggables.every((value) => value === 'true'), 'toda sessão deve ser arrastável').toBe(true)

    // Fixar via menu de contexto move a sessão para a seção Fixadas.
    const target = rows.nth(1)
    const titulo = (await target.locator('.session-title-text').innerText()).trim()
    const secaoFixadas = page.locator(SEL.sessionSection).filter({ hasText: 'Fixadas' }).first()
    const badge = secaoFixadas.locator('.session-section-count').first()
    const antes = Number((await badge.innerText()).trim() || '0')

    await target.click({ button: 'right' })
    await page.getByRole('menuitem', { name: 'Fixar' }).click()
    await page.waitForTimeout(400)

    expect(Number((await badge.innerText()).trim() || '0'), 'o contador de Fixadas deve subir').toBe(antes + 1)

    // Expande a seção (vem recolhida) e confere que é a sessão certa.
    const header = secaoFixadas.locator(SEL.sectionHeader).first()
    if ((await header.getAttribute('aria-expanded')) === 'false') {
      await header.click()
      await page.waitForTimeout(300)
    }
    await expect(secaoFixadas.locator(SEL.sessionRow), 'a seção Fixadas deve listar a sessão fixada').toHaveCount(antes + 1)
    await expect(secaoFixadas, 'a sessão fixada deve aparecer em Fixadas').toContainText(titulo)
    expect(errors).toEqual([])
    await shot(page, 'sessao09_T5_fixar_e_drag')
  })
})
