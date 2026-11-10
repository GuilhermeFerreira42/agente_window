import { expect, test } from '@playwright/test'

const baseURL = process.env.M2_E2E_BASE_URL
const workspace = process.env.M2_E2E_WORKSPACE
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige servidor e workspace descartáveis')

test.describe('M2 — privacidade de snapshots', () => {
  test('restaura os cartões sem expor conteúdo transitório após F5', async ({ page }) => {
    const id = `m2-privacy-${Date.now()}`
    const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
    const session = {
      id, title: id, workspace: 'Fixture M2', workspacePath: workspace, section: 'today', status: 'completed',
      updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: 1,
      chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [
        { id: 'u1', role: 'user', content: 'Mensagem original da fixture', time: '10:00' },
        { id: 'a1', role: 'assistant', content: 'Resposta da fixture', time: '10:00', ferramentas: [
          { id: 'cmd1', ferramenta: 'executar', status: 'ok', alvo: 'FIXTURE_COMMAND', resumo: 'FIXTURE_STDOUT' },
        ] },
      ] }],
    }
    expect((await page.request.put('/api/sessions', { headers, data: { session } })).ok()).toBe(true)
    await page.goto('/')
    const linha = page.locator('.session-row').filter({ hasText: id })
    await linha.click()
    await expect(page.getByText('Resposta da fixture')).toBeVisible()
    await page.reload()
    await linha.click()
    await expect(page.getByText('Mensagem original da fixture')).toBeVisible()
    await expect(page.locator('.chat-tool-card')).toBeVisible()
    await expect(page.locator('.chat-tool-card')).not.toContainText(/FIXTURE_COMMAND|FIXTURE_STDOUT/)
    const resposta = await page.request.get('/api/sessions', { headers })
    expect(resposta.ok()).toBe(true)
    expect(await resposta.text()).not.toMatch(/FIXTURE_COMMAND|FIXTURE_STDOUT/)
  })
})
