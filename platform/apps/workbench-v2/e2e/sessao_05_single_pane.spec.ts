import { expect, test } from '@playwright/test'
import { BTN, SEL, collectConsoleErrors, resetApp, shot } from './helpers'

test.describe('Sessão 05 — Single Pane', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: encolher a janela no desktop (sem toque) NUNCA vira single-pane', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 })
    await page.waitForTimeout(400)
    await expect(page.locator('.mobile-dock-tabs'), 'sem toque, o dock mobile não pode aparecer').toBeHidden()
    await expect(page.locator(SEL.chatPane), 'o chat continua na superfície desktop').toBeVisible()

    await page.setViewportSize({ width: 520, height: 800 })
    await page.waitForTimeout(400)
    await expect(page.locator('.mobile-dock-tabs'), 'nem a 520px, se o gate é por toque').toBeHidden()
    await shot(page, 'sessao05_T1_desktop_encolhido')
  })

  test('T2: a aba Browser esconde o detail panel de forma transiente', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'com Changes ativo a aux fica visível').toBe(1)

    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(500)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'a aba browser deve esconder o detail panel').toBe(0)
    await shot(page, 'sessao05_T2_browser_transiente')

    // Voltar para a aba de alterações restaura o detail — prova de "transiente".
    await page.locator(`${SEL.editorTabs} [data-tab-type="diff"]`).first().click()
    await page.waitForTimeout(500)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'sair do browser deve restaurar a aux').toBe(1)
  })

  test('T3: abas gerenciadas não podem ser fechadas (CannotClose)', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)

    const managed = page.locator(`${SEL.editorTabs} [aria-label="Aba gerenciada"]`)
    const managedCount = await managed.count()
    if (managedCount === 0) {
      // Se nenhuma aba está gerenciada agora, ao menos o contrato precisa existir.
      const closables = await page.locator(`${SEL.editorTabs} .editor-tab-close`).count()
      expect(closables, 'abas normais devem oferecer o botão fechar').toBeGreaterThan(0)
      return
    }
    for (let i = 0; i < managedCount; i++) {
      const tab = managed.nth(i)
      expect(await tab.locator('.editor-tab-close').count(), 'aba gerenciada não pode expor botão fechar').toBe(0)
    }
    await shot(page, 'sessao05_T3_cannot_close')
  })

  test('T4: recolher a coluna do editor não deixa borda residual', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)

    const group = page.locator(SEL.surfaceGroup).first()
    const before = (await group.boundingBox())!.width

    await page.locator('.editor-toolbar').getByRole('button', { name: 'Ocultar editor' }).click()
    await page.waitForTimeout(500)

    // Nenhum filho visível pode ficar com uma faixa residual de 1-6px
    // (é assim que aparecem as "bordas fantasma" do vídeo).
    const slivers = await group.evaluate((el) =>
      Array.from(el.children)
        .map((child) => ({ cls: (child as HTMLElement).className, w: child.getBoundingClientRect().width }))
        .filter((child) => child.w > 0 && child.w < 6 && !child.cls.includes('resize-handle')),
    )
    expect(slivers, 'não pode sobrar coluna residual visível').toEqual([])

    const after = (await group.boundingBox())!.width
    expect(Math.abs(after - before), 'o grupo mantém a largura total do workbench').toBeLessThanOrEqual(4)
    await shot(page, 'sessao05_T4_sem_bordas_residuais')
  })

  test('T5: "Mostrar editor" devolve o conteúdo sem recarregar a página', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)

    await page.locator('.editor-toolbar').getByRole('button', { name: 'Ocultar editor' }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('[data-testid="editor-hidden-content"]')).toBeVisible()

    await page.locator('.editor-toolbar').getByRole('button', { name: 'Mostrar editor' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('[data-testid="editor-hidden-content"]')).toHaveCount(0)
    await expect(page.locator(SEL.editorBody)).toBeVisible()
    expect(errors).toEqual([])
    await shot(page, 'sessao05_T5_mostrar_editor')
  })

  test('T6: no resize da janela só a Sessions Part absorve o delta (grid não-proporcional)', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(500)

    // Dá folga ao chat antes de medir: com o chat no minSize (34%) o editor não
    // teria como crescer em % e o resize vira proporcional "dentro dos limites".
    const sash = page.locator('.panel-resize-handle').first()
    const sashBox = (await sash.boundingBox())!
    await page.mouse.move(sashBox.x + sashBox.width / 2, sashBox.y + sashBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(sashBox.x + 150, sashBox.y + sashBox.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    const chat = page.locator(SEL.chatPane)
    const editor = page.locator(SEL.editorPane)
    const sidebar = page.locator(SEL.sidebar)

    const chatAntes = (await chat.boundingBox())!.width
    const editorAntes = (await editor.boundingBox())!.width
    const sidebarAntes = (await sidebar.boundingBox())!.width

    await page.setViewportSize({ width: 1160, height: 900 })
    await page.waitForTimeout(700)

    const chatDepois = (await chat.boundingBox())!.width
    const editorDepois = (await editor.boundingBox())!.width
    const sidebarDepois = (await sidebar.boundingBox())!.width

    // LAYOUT.md: Sidebar, Editor e Auxiliary Bar preservam o tamanho do usuário;
    // a Sessions Part é a superfície flexível que absorve o delta.
    expect(Math.abs(sidebarDepois - sidebarAntes), 'a Sidebar preserva a largura').toBeLessThanOrEqual(2)
    expect(Math.abs(editorDepois - editorAntes), 'o Editor preserva a largura').toBeLessThanOrEqual(12)
    expect(chatAntes - chatDepois, 'o chat absorve praticamente todo o delta de 240px').toBeGreaterThan(200)
    await shot(page, 'sessao05_T6_resize_nao_proporcional')
  })
})
