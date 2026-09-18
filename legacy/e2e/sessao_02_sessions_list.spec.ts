import { expect, test } from '@playwright/test'
import { SEL, activeSessionId, resetApp, shot } from './helpers'

test.describe('Sessão 02 — Sessions List', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: seções de agrupamento existem e o contador bate com as linhas', async ({ page }) => {
    const headerTexts = await page.locator(SEL.sectionHeader).allInnerTexts()
    const joined = headerTexts.join(' | ')
    for (const expected of ['Fixadas', 'Quick Chats', 'Hoje']) {
      expect(joined, `seção "${expected}" deveria existir na sidebar`).toContain(expected)
    }

    // O número exibido no cabeçalho precisa bater com as linhas renderizadas.
    const sections = page.locator(SEL.sessionSection)
    const total = await sections.count()
    expect(total, 'deveria haver várias seções').toBeGreaterThanOrEqual(3)

    for (let i = 0; i < total; i++) {
      const section = sections.nth(i)
      const badge = await section.locator('.session-section-count').first().innerText().catch(() => '')
      if (!badge.trim()) continue
      const header = section.locator(SEL.sectionHeader).first()
      const expanded = await header.getAttribute('aria-expanded')
      if (expanded === 'false') continue
      const rows = await section.locator(SEL.sessionRow).count()
      expect(Number(badge.trim()), `contador da seção ${i} deve bater com as linhas`).toBe(rows)
    }
    await shot(page, 'sessao02_T1_secoes')
  })

  test('T2: expandir/recolher chats aninhados muda o DOM de verdade', async ({ page }) => {
    const expandButton = page.getByRole('button', { name: 'Expandir chats' }).first()
    await expect(expandButton, 'deve existir sessão com chats aninhados').toBeVisible()

    const before = await page.locator(SEL.nestedChat).count()
    await expandButton.click()
    await page.waitForTimeout(200)
    const after = await page.locator(SEL.nestedChat).count()
    expect(after, 'expandir deve renderizar chats aninhados').toBeGreaterThan(before)

    // Cada chat aninhado precisa de título visível — nada de linha fantasma.
    const titles = await page.locator('.nested-chat-title').allInnerTexts()
    expect(titles.filter((t) => t.trim().length > 0).length).toBe(titles.length)

    await page.getByRole('button', { name: 'Recolher chats' }).first().click()
    await page.waitForTimeout(200)
    expect(await page.locator(SEL.nestedChat).count(), 'recolher deve remover chats').toBeLessThan(after)
    await shot(page, 'sessao02_T2_chats_aninhados')
  })

  test('T3: filtro mantém a sessão ativa visível (R-015)', async ({ page }) => {
    const activeId = await activeSessionId(page)
    expect(activeId).toBeTruthy()

    await page.locator(SEL.filterInput).fill('zzz-nao-existe-nada-com-isso')
    await page.waitForTimeout(300)

    const activeRow = page.locator(`${SEL.sessionRow}[data-session-id="${activeId}"]`)
    await expect(activeRow, 'a sessão ativa não pode sumir por causa do filtro').toBeVisible()
    expect(await activeSessionId(page), 'a sessão ativa continua a mesma').toBe(activeId)

    await page.locator(SEL.filterInput).fill('')
    await page.waitForTimeout(300)
    expect(await page.locator(SEL.sessionRow).count()).toBeGreaterThan(1)
    await shot(page, 'sessao02_T3_filtro_mantem_ativa')
  })

  test('T4: menu de contexto abre com as ações da sessão e fecha com Escape', async ({ page }) => {
    const row = page.locator(SEL.sessionRow).first()
    await row.click({ button: 'right' })

    const menu = page.locator(SEL.contextMenu)
    await expect(menu, 'botão direito deve abrir o menu de contexto').toBeVisible()

    const items = (await menu.locator('[role="menuitem"]').allInnerTexts()).join(' | ')
    for (const expected of ['Abrir sessão', 'Fixar', 'Arquivar', 'Renomear', 'Excluir']) {
      expect(items, `menu deveria conter "${expected}"`).toContain(expected)
    }
    await shot(page, 'sessao02_T4_context_menu')

    await page.keyboard.press('Escape')
    await expect(menu, 'Escape deve fechar o menu').toHaveCount(0)
  })

  test('T5: workspace capping limita a 3 workspaces por seção fora da busca', async ({ page }) => {
    const sections = page.locator(SEL.sessionSection)
    const total = await sections.count()
    let checked = 0

    for (let i = 0; i < total; i++) {
      const headers = await sections.nth(i).locator(SEL.workspaceHeader).count()
      if (headers === 0) continue
      checked++
      expect(headers, `seção ${i} não pode mostrar mais de 3 workspaces fora da busca`).toBeLessThanOrEqual(3)
    }
    expect(checked, 'deveria haver ao menos uma seção agrupada por workspace').toBeGreaterThan(0)

    // Se alguma seção tiver workspaces escondidos, o botão precisa revelá-los.
    const showMore = page.getByRole('button', { name: /Mostrar mais \d+ workspace/ }).first()
    if (await showMore.count()) {
      const before = await page.locator(SEL.workspaceHeader).count()
      await showMore.click()
      await page.waitForTimeout(200)
      expect(await page.locator(SEL.workspaceHeader).count()).toBeGreaterThan(before)
    }
    await shot(page, 'sessao02_T5_workspace_capping')
  })
})
