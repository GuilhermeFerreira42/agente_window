import { expect, test } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const baseURL = process.env.M5_E2E_BASE_URL
const workspace = process.env.M5_E2E_WORKSPACE
test.use({ baseURL })
test.skip(!baseURL || !workspace, 'Exige servidor e workspace descartáveis')

test.describe('M5 — memória de projeto', () => {
  test('confirma, revisa, exporta e apaga sem cruzar os projetos', async ({ page }) => {
    test.setTimeout(60_000)
    const nonce = Date.now()
    const headers = { Origin: baseURL!, 'Sec-Fetch-Site': 'same-origin' }
    const pastaA = join(workspace!, `m5-a-${nonce}`)
    const pastaB = join(workspace!, `m5-b-${nonce}`)
    await Promise.all([mkdir(pastaA), mkdir(pastaB)])
    const a = `Projeto A ${nonce}`
    const b = `Projeto B ${nonce}`
    const a2 = `Outro chat A ${nonce}`
    for (const [id, path] of [[a, pastaA], [b, pastaB], [a2, pastaA]]) {
      const session = {
        id, title: id, workspace: 'Fixture M5', workspacePath: path, section: 'today', status: 'completed',
        updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null, mainChatId: 'main', persistenceRevision: 1,
        chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [] }],
      }
      expect((await page.request.put('/api/sessions', { headers, data: { session } })).ok()).toBe(true)
    }
    await page.goto('/')
    const painel = page.getByRole('region', { name: 'Memória do projeto' })
    async function abrir(titulo: string, caminho: string) {
      await page.locator('.session-row').filter({ hasText: titulo }).click()
      await page.getByRole('button', { name: 'Memória do projeto', exact: true }).click()
      await expect(painel.getByText(caminho, { exact: true })).toBeVisible()
    }
    const confirmar = () => page.once('dialog', (dialog) => void dialog.accept())
    await abrir(a, pastaA)
    await painel.getByLabel('Conteúdo da memória').fill('token = FIXTURE_PRIVATE_CREDENTIAL')
    confirmar()
    await painel.getByRole('button', { name: 'Salvar memória' }).click()
    await expect(painel.getByText(/Credenciais não podem/)).toBeVisible()
    await painel.getByLabel('Conteúdo da memória').fill('Decisão original do projeto sintético')
    confirmar()
    await painel.getByRole('button', { name: 'Salvar memória' }).click()
    await expect(painel.getByText('Decisão original do projeto sintético', { exact: true })).toBeVisible()
    await abrir(b, pastaB)
    await expect(painel.getByText('Decisão original do projeto sintético', { exact: true })).toHaveCount(0)
    await abrir(a2, pastaA)
    await expect(painel.getByText('Decisão original do projeto sintético', { exact: true })).toBeVisible()
    await painel.getByRole('button', { name: 'Editar memória' }).click()
    await painel.getByLabel('Conteúdo da memória').fill('Decisão revisada do projeto sintético')
    await painel.getByLabel('Motivo da revisão').fill('Atualização de fixture')
    confirmar()
    await painel.getByRole('button', { name: 'Salvar memória' }).click()
    await expect(painel.getByText(/revisão 2 · Vigente/)).toBeVisible()
    await expect(painel.getByText(/revisão 1 · Substituída/)).toBeVisible()
    // Let the app finish its unload snapshot before deleting the synthetic source.
    await page.goto('about:blank')
    expect((await page.request.delete(`/api/sessions/${encodeURIComponent(a)}?force=true`, { headers, data: {} })).ok()).toBe(true)
    await page.goto('/')
    await abrir(a2, pastaA)
    await expect(painel.getByText(/Origem indisponível/)).toBeVisible()
    const baixou = page.waitForEvent('download')
    await painel.getByRole('button', { name: 'Exportar memória do projeto' }).click()
    const arquivo = await (await baixou).path()
    const exportado = await readFile(arquivo, 'utf8')
    expect(exportado).toContain('Decisão revisada do projeto sintético')
    expect(exportado).not.toContain('FIXTURE_PRIVATE_CREDENTIAL')
    confirmar()
    await painel.getByRole('button', { name: 'Excluir memória' }).click()
    await expect(painel.getByText('Memória excluída.')).toBeVisible()
    await expect(painel.getByText(/projeto sintético/)).toHaveCount(0)
  })
})
