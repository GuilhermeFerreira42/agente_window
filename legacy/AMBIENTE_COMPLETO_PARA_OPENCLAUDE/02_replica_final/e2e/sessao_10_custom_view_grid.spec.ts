import { expect, test } from '@playwright/test'
import { BTN, SEL, collectConsoleErrors, openApp, resetApp, shot } from './helpers'

// LAYOUT.md §Custom View Grid: superfície full-surface contribuída, mutuamente
// exclusiva com Sessions Part, Editor, Auxiliary Bar e Panel. Title Bar e
// Sidebar permanecem. Abrir sessão dispensa. Phone: back dispensa.
const GRID = '.custom-view-grid'

async function abrirCustomizations(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Adicionar aba do editor' }).first().click()
  await page.getByRole('menuitem', { name: 'AI Customizations' }).click()
  await page.waitForTimeout(500)
}

test.describe('Sessão 10 — Custom View Grid', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: AI Customizations cobre Sessions Part, Editor, Aux e Panel — só Titlebar e Sidebar ficam', async ({ page }) => {
    // Estado de partida com TODAS as parts visíveis, para o "sumiço" ser real.
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.getByRole('button', { name: BTN.toggleTerminal }).click()
    await page.waitForTimeout(400)
    await expect(page.locator(SEL.chatPane)).toBeVisible()
    await expect(page.locator(SEL.editorPane)).toBeVisible()
    await expect(page.locator(SEL.auxiliaryBar)).toBeVisible()
    await expect(page.locator(SEL.terminalPanel)).toBeVisible()

    await abrirCustomizations(page)

    await expect(page.locator(GRID), 'o grid full-surface precisa aparecer').toBeVisible()
    expect(await page.locator(SEL.chatPane).count(), 'Sessions Part deve sumir').toBe(0)
    expect(await page.locator(SEL.editorPane).count(), 'Editor deve sumir').toBe(0)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'Auxiliary Bar deve sumir').toBe(0)
    await expect(page.locator(SEL.terminalPanel), 'Panel deve sumir').toBeHidden()

    // O que sobrevive: Title Bar e Sidebar.
    await expect(page.locator(SEL.titlebar), 'a Title Bar permanece').toBeVisible()
    await expect(page.locator(SEL.sidebar), 'a Sidebar permanece').toBeVisible()

    // E o grid ocupa a banda inteira à direita da sidebar.
    const grid = (await page.locator(GRID).boundingBox())!
    const sidebar = (await page.locator(SEL.sidebar).boundingBox())!
    const viewport = page.viewportSize()!
    expect(Math.round(grid.width + sidebar.width), 'grid + sidebar devem preencher a janela').toBeGreaterThanOrEqual(viewport.width - 8)
    expect(await page.locator(GRID).getAttribute('data-custom-view')).toBe('aiCustomizations')
    await shot(page, 'sessao10_T1_custom_view_full_surface')
  })

  test('T2: clicar numa sessão dispensa a custom view e restaura o estado anterior', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'partimos com a aux aberta').toBe(1)

    await abrirCustomizations(page)
    await expect(page.locator(GRID)).toBeVisible()

    await page.locator(SEL.sessionRow).nth(2).click()
    await page.waitForTimeout(600)

    expect(await page.locator(GRID).count(), 'abrir sessão dispensa a custom view').toBe(0)
    await expect(page.locator(SEL.chatPane), 'Sessions Part volta').toBeVisible()
    expect(await page.locator(SEL.auxiliaryBar).count(), 'a aux volta como estava (desired visibility)').toBe(1)
    await shot(page, 'sessao10_T2_dismiss_ao_abrir_sessao')
  })

  test('T3: F5 com custom view ativa mantém a view ativa', async ({ page }) => {
    await abrirCustomizations(page)
    await expect(page.locator(GRID)).toBeVisible()

    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('workbench.customView.v1') ?? 'null'))
    expect(persisted?.activeView, 'o estado precisa ser persistido').toBe('aiCustomizations')

    await openApp(page)
    await expect(page.locator(GRID), 'depois do F5 a custom view continua ativa').toBeVisible()
    expect(await page.locator(SEL.chatPane).count(), 'e as parts continuam cobertas').toBe(0)
    await shot(page, 'sessao10_T3_persiste_apos_f5')
  })

  test('T4: fechar pelo botão devolve exatamente a visibilidade retida (terminal incluso)', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.getByRole('button', { name: BTN.toggleTerminal }).click()
    await page.waitForTimeout(300)
    await expect(page.locator(SEL.terminalPanel), 'terminal aberto antes da custom view').toBeVisible()

    await abrirCustomizations(page)
    await expect(page.locator(GRID)).toBeVisible()

    await page.getByRole('button', { name: 'Fechar custom view' }).click()
    await page.waitForTimeout(500)

    expect(await page.locator(GRID).count()).toBe(0)
    await expect(page.locator(SEL.chatPane)).toBeVisible()
    await expect(page.locator(SEL.terminalPanel), 'o Panel volta porque era o estado desejado').toBeVisible()
    expect(errors, 'abrir/fechar custom view não pode lançar erro').toEqual([])
    await shot(page, 'sessao10_T4_restaura_visibilidade')
  })

  test('T5: a custom view mostra a árvore de agents/skills/MCP com contagens reais', async ({ page }) => {
    await abrirCustomizations(page)
    const grid = page.locator(GRID)
    await expect(grid.getByRole('heading', { name: 'AI Customizations' })).toBeVisible()

    const tree = grid.locator('[role="tree"]')
    await expect(tree, 'o grid precisa renderizar a árvore de personalizações').toBeVisible()

    // O contador de cada seção tem que bater com as linhas renderizadas nela.
    const primeira = grid.locator('.customizations-section').first()
    const header = primeira.locator('.customizations-section-header')
    if ((await header.getAttribute('aria-expanded')) === 'false') {
      await header.click()
      await page.waitForTimeout(200)
    }
    const contador = Number((await primeira.locator('.customizations-section-count').innerText()).trim())
    const linhas = await primeira.locator('.customizations-item').count()
    expect(linhas, 'a contagem da seção deve bater com as linhas exibidas').toBe(contador)
    await shot(page, 'sessao10_T5_arvore_customizations')
  })
})

test.describe('Sessão 10 — Custom View Grid no phone', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })

  test('T6: no phone o botão Voltar dispensa a custom view', async ({ page }) => {
    await resetApp(page)
    await page.locator('.mobile-dock-tabs .dock-tab', { hasText: 'Editor' }).click()
    await page.waitForTimeout(400)

    await abrirCustomizations(page)
    await expect(page.locator(GRID), 'a custom view também é full-surface no phone').toBeVisible()

    const voltar = page.getByRole('button', { name: 'Voltar navegação' })
    await expect(voltar, 'o dock precisa oferecer o back').toBeVisible()
    await voltar.click()
    await page.waitForTimeout(500)

    expect(await page.locator(GRID).count(), 'o back do phone dispensa a custom view').toBe(0)
    await shot(page, 'sessao10_T6_back_dispensa_no_phone')
  })
})
