import { expect, test } from '@playwright/test'
import { BTN, SEL, collectConsoleErrors, openApp, readLayoutState, resetApp, shot, widthOf } from './helpers'

test.describe('Sessão 03 — Layout', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: sidebar escondida/reexibida persiste o estado após F5', async ({ page }) => {
    await expect(page.locator(SEL.sidebar)).toBeVisible()
    await page.getByRole('button', { name: BTN.toggleSidebar }).click()
    // A sidebar colapsa para largura 0 (continua no DOM); para o usuário e para
    // o Playwright isso é "não visível".
    await expect(page.locator(SEL.sidebar), 'toggle deve colapsar a sidebar').toBeHidden()
    expect(await page.locator(SEL.sidebar).evaluate((el) => Math.round(el.getBoundingClientRect().width))).toBe(0)

    let state = await readLayoutState(page)
    expect(state.shell.sidebarVisible, 'localStorage deve registrar sidebar oculta').toBe(false)

    await openApp(page)
    await expect(page.locator(SEL.sidebar), 'sidebar deve continuar oculta após F5').toBeHidden()

    await page.getByRole('button', { name: BTN.toggleSidebar }).click()
    await expect(page.locator(SEL.sidebar)).toBeVisible()
    state = await readLayoutState(page)
    expect(state.shell.sidebarVisible).toBe(true)
    await shot(page, 'sessao03_T1_sidebar_toggle_persist')
  })

  test('T2: tab bar continua visível com o editor oculto (keepForDockedTabBar)', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await expect(page.locator(SEL.editorTabs), 'abas do editor devem existir').toBeVisible()

    const hide = page.getByRole('button', { name: 'Ocultar editor' })
    await expect(hide).toBeVisible()
    await hide.click()
    await page.waitForTimeout(300)

    await expect(page.locator(SEL.editorTabs), 'a barra de abas NÃO pode sumir com o editor oculto').toBeVisible()
    await expect(page.locator('[data-testid="editor-hidden-content"]'), 'deve mostrar o placeholder de editor oculto').toBeVisible()
    const state = await readLayoutState(page)
    expect(state.shell.editorHidden).toBe(true)
    await shot(page, 'sessao03_T2_tabbar_com_editor_oculto')
  })

  test('T3: alternar editor 10x não gera erro nem perde a superfície', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(250)

    for (let i = 0; i < 10; i++) {
      await page.locator('.editor-toolbar').getByRole('button', { name: /Ocultar editor|Mostrar editor/ }).click()
      await page.waitForTimeout(60)
    }

    await expect(page.locator(SEL.workbench), 'o workbench deve continuar de pé').toBeVisible()
    await expect(page.locator(SEL.editorTabs)).toBeVisible()
    expect(errors, 'nenhum erro de runtime durante os 10 toggles').toEqual([])
    await shot(page, 'sessao03_T3_toggle_10x')
  })

  test('T4: estado de layout persistido tem o formato do contrato', async ({ page }) => {
    const state = await readLayoutState(page)
    expect(state, 'workbench.sessions.layout.v1 deve existir').toBeTruthy()
    expect(typeof state.shell.sidebarVisible).toBe('boolean')
    expect(typeof state.shell.auxiliaryVisible).toBe('boolean')
    expect(typeof state.shell.terminalVisible).toBe('boolean')
    expect(typeof state.shell.editorHidden).toBe('boolean')
    expect(typeof state.shell.sidebarWidth).toBe('number')
    expect(state.shell.sidebarWidth, 'largura persistida deve ser plausível').toBeGreaterThan(100)
    expect(typeof state.partSizesBySession).toBe('object')

    // O valor persistido tem que refletir a UI, não um default congelado.
    const rendered = await widthOf(page, SEL.sidebar)
    expect(Math.abs(state.shell.sidebarWidth - rendered)).toBeLessThanOrEqual(4)
    await shot(page, 'sessao03_T4_layout_state')
  })

  test('T5: alternar a barra auxiliar reflete no DOM e no localStorage', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(250)

    const toggle = page.getByRole('button', { name: BTN.toggleAux })
    const visibleBefore = (await page.locator(SEL.auxiliaryBar).count()) > 0
    await toggle.click()
    await page.waitForTimeout(300)
    const visibleAfter = (await page.locator(SEL.auxiliaryBar).count()) > 0
    expect(visibleAfter, 'o toggle precisa realmente alternar a barra auxiliar').not.toBe(visibleBefore)

    const state = await readLayoutState(page)
    expect(state.shell.auxiliaryVisible, 'localStorage deve acompanhar a barra auxiliar').toBe(visibleAfter)
    await shot(page, 'sessao03_T5_toggle_aux')
  })
})
