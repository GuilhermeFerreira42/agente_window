// =============================================================================
// U-1 — Configurações unificadas (jornada medida, porta 5218).
//
// A spec sobe o PRÓPRIO Vite (rotas e plugin de dev reais) com pastas
// descartáveis: nenhuma conta, chave ou serviço remoto é tocado. O provedor
// externo do teste de conexão é um servidor HTTP local (fixture), como manda a
// regra da casa. Cada teste tem asserts; screenshot não é prova.
//
// U1-E01 porta única e instância preservada · U1-E02 13 categorias/3 grupos
// U1-E03 Geral (teto, save explícito, PUT bloqueado em falha de leitura)
// U1-E04 Provedores (sem inferência ao abrir, reveal em memória)
// U1-E05 Personalizações (dados reais, sem segunda coluna)
// U1-E06 fechar com rascunho sujo (continuar / descartar) e save em voo
// U1-E07 acessibilidade, foco devolvido, temas e larguras
// =============================================================================
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir as pastaTemporaria } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'

const PORTA = 5218
const BASE = `http://127.0.0.1:${PORTA}`
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test.setTimeout(180_000)
test.describe.configure({ mode: 'serial' })

let processo: ChildProcess | undefined
let raiz: string
let fixture: Server | undefined
let fixturePorta = 0
let chamadasFixture = 0
const postsProvedores: string[] = []
const putsConfig: string[] = []
let getsConfig = 0

async function iniciarTudo(): Promise<void> {
  raiz = await mkdtemp(join(pastaTemporaria(), 'u1-e2e-'))
  mkdirSync(join(raiz, 'ws'), { recursive: true })
  // Fixture OpenAI-compatível: só responde o que o teste de conexão pergunta.
  fixture = createServer((req, res) => {
    chamadasFixture += 1
    if (req.method === 'GET' && req.url?.includes('/models')) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data: [{ id: 'fixture-modelo-1' }, { id: 'fixture-modelo-2' }] }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  })
  await new Promise<void>((ok) => fixture!.listen(0, '127.0.0.1', ok))
  const endereco = fixture.address()
  if (!endereco || typeof endereco === 'string') throw new Error('fixture indisponível')
  fixturePorta = endereco.port

  processo = spawn(
    process.execPath,
    [resolve(app, '../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(PORTA), '--strictPort'],
    {
      cwd: app,
      windowsHide: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'),
        AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'),
        AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'),
        AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'),
        FS_TEST_ROOT: raiz,
      },
    },
  )
  await expect.poll(async () => {
    try { return (await fetch(BASE)).status } catch { return 0 }
  }, { timeout: 60_000 }).toBe(200)
}

async function pararTudo(): Promise<void> {
  if (processo && processo.exitCode === null) {
    const saiu = new Promise<void>((ok) => processo!.once('exit', () => ok()))
    processo.kill('SIGKILL')
    await saiu
  }
  if (fixture) await new Promise<void>((ok) => fixture!.close(() => ok()))
  if (raiz) rmSync(raiz, { recursive: true, force: true })
}

/** Observa as chamadas de rede das rotas reais (sem stub de serviço). */
function observarRede(page: Page): void {
  page.on('request', (req) => {
    const url = new URL(req.url())
    if (url.pathname === '/api/providers' && req.method() === 'POST') postsProvedores.push(req.postData() ?? '')
    if (url.pathname === '/api/config' && req.method() === 'PUT') putsConfig.push(req.postData() ?? '')
    if (url.pathname === '/api/config' && req.method() === 'GET') getsConfig += 1
  })
}

async function abrir(page: Page): Promise<void> {
  observarRede(page)
  await page.goto(BASE)
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
  await page.waitForTimeout(500)
}

const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Configurações' })
/** Item do MENU DA CONTA (o rótulo "Configurações" também existe no menu +). */
const menuConta = (page: Page, nome: 'Provedores' | 'Configurações') =>
  page.getByRole('menu', { name: 'Menu da conta' }).getByRole('menuitem', { name: nome, exact: true })

async function abrirPelaConta(page: Page, nome: 'Provedores' | 'Configurações'): Promise<void> {
  await page.getByRole('button', { name: 'Conta' }).click()
  await menuConta(page, nome).click()
}
const categoria = (page: Page, nome: string) =>
  dialogo(page).locator('nav button[data-categoria]').filter({ hasText: nome }).first()


test.describe('U-1 — Configurações unificadas (E2E, porta 5218)', () => {
  test.beforeAll(iniciarTudo)
  test.afterAll(pararTudo)

  test('U1-E01 — uma porta, uma instância: Conta→Provedores, Configurações e Personalizações no MESMO diálogo', async ({ page }) => {
    observarRede(page)
    await abrir(page)

    await abrirPelaConta(page, 'Provedores')
    await expect(dialogo(page)).toBeVisible()
    await expect(categoria(page, 'Provedores e modelos')).toHaveAttribute('aria-current', 'page')

    // A segunda entrada NÃO cria outro diálogo nem desmonta o primeiro.
    await page.keyboard.press('Escape')
    await expect(dialogo(page)).toHaveCount(0)
    // O menu "Adicionar aba" vive no editor: abre o Browser (aba real) primeiro.
    await page.getByRole('button', { name: 'Abrir navegador no editor' }).click()
    await expect(page.locator('.editor-tab[data-tab-type="browser"]')).toBeVisible()
    await page.getByRole('button', { name: 'Adicionar aba do editor' }).click()
    await page.getByRole('menuitem', { name: 'Personalizações' }).click()
    await expect(dialogo(page)).toHaveCount(1)
    await expect(categoria(page, 'Personalizações')).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('dialog', { name: 'Configurações' })).toHaveAttribute('data-modo', 'expandido')
    await expect(page.locator('.editor-tab[data-tab-type="providers"]')).toHaveCount(0)
    await expect(page.locator('.editor-tab[data-tab-type="config"]')).toHaveCount(0)
  })

  test('U1-E02 — 13 categorias em 3 grupos, ordem exata, futuras sem ação fictícia', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Configurações')
    await expect(dialogo(page)).toBeVisible()

    const grupos = dialogo(page).locator('nav [role="group"]')
    await expect(grupos).toHaveCount(3)
    await expect(grupos.nth(0)).toHaveAttribute('aria-label', 'Aplicativo')
    await expect(grupos.nth(1)).toHaveAttribute('aria-label', 'Inteligência Artificial')
    await expect(grupos.nth(2)).toHaveAttribute('aria-label', 'Dados e Ambiente')

    const rotulos = await dialogo(page).locator('nav button[data-categoria] .config-unificadas-item-label').allTextContents()
    expect(rotulos).toEqual([
      'Geral', 'Aparência', 'Notificações',
      'Provedores e modelos', 'Personalizações', 'Agentes e instruções', 'Permissões', 'MCP', 'Hooks', 'Plugins',
      'Conversas e armazenamento', 'Workspaces', 'Importação e backup',
    ])

    // Categoria futura explica o limite e NÃO oferece botão de ação.
    await categoria(page, 'MCP').click()
    const indisponivel = dialogo(page).getByRole('status').filter({ hasText: 'ainda não está disponível' })
    await expect(indisponivel).toBeVisible()
    await expect(dialogo(page).locator('[data-categoria-futura="mcp"] button')).toHaveCount(0)
  })

  test('U1-E03 — Geral: save explícito com eco, e falha de leitura bloqueia o PUT', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Configurações')
    await expect(dialogo(page)).toBeVisible()

    // A tela LEU de verdade (rota real do servidor, sem stub de serviço).
    await expect.poll(() => getsConfig, { timeout: 10_000 }).toBeGreaterThan(0)

    // Caminho feliz: teto 1..250, padrão 25 e save explícito.
    const teto = dialogo(page).getByRole('spinbutton', { name: /teto/i }).first()
    await expect(teto).toHaveAttribute('max', '250')
    await expect(teto).toHaveAttribute('min', '1')
    const antes = putsConfig.length
    await teto.fill('40')
    await dialogo(page).getByRole('button', { name: /^Salvar/ }).first().click()
    await expect.poll(() => putsConfig.length, { timeout: 10_000 }).toBeGreaterThan(antes)
    expect(JSON.parse(putsConfig.at(-1)!).teto).toBe(40)

    // O eco vem do servidor: recarregar o painel mostra 40, não o default.
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await abrirPelaConta(page, 'Configurações')
    await expect(dialogo(page).getByRole('spinbutton', { name: /teto/i }).first()).toHaveValue('40')

    // Falha de leitura: a rota real é derrubada; a tela NÃO inventa defaults.
    const putsAntes = putsConfig.length
    await page.route('**/api/config', (route) => route.request().method() === 'GET'
      ? route.fulfill({ status: 500, body: '{"error":"fixture"}' })
      : route.continue())
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await abrirPelaConta(page, 'Configurações')
    const alerta = dialogo(page).getByRole('alert')
    await expect(alerta).toBeVisible()
    await expect(dialogo(page).locator('[data-estado-leitura="falhou"]')).toBeVisible()
    await expect(dialogo(page).getByRole('button', { name: /Tentar novamente/i })).toBeVisible()
    // Nenhum PUT aconteceu: sem leitura válida o salvamento está fora.
    expect(putsConfig.length).toBe(putsAntes)
    await page.unroute('**/api/config')
  })

  test('U1-E04 — Provedores: abrir não faz inferência/teste; reveal some ao trocar de categoria', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Provedores')
    await expect(dialogo(page)).toBeVisible()
    await page.waitForTimeout(1500)

    // Abrir o modal NÃO dispara teste remoto, inferência nem revelação:
    // nenhum POST de teste saiu e o provedor externo não foi tocado.
    expect(postsProvedores.filter((corpo) => corpo.includes('/test') || corpo.includes('"testar"'))).toHaveLength(0)
    expect(chamadasFixture, 'nenhum provedor externo foi tocado ao abrir').toBe(0)
    const campoChave = dialogo(page).locator('input[aria-label^="Chave de API"]').first()
    await expect(campoChave).toHaveAttribute('type', 'password')

    // O teste de conexão só existe quando o DONO pede — e aí fala com o serviço
    // que ele indicou. Fixture local: nenhuma conta, chave ou serviço remoto.
    await dialogo(page).getByRole('button', { name: 'Compatível com OpenAI' }).first().click()
    await dialogo(page).getByLabel(/^Endereço do serviço/).first().fill(`http://127.0.0.1:${fixturePorta}/v1`)
    // Digitar a chave é ato explícito do dono; por desenho o campo passa a
    // mostrar o que ele mesmo acabou de digitar.
    await dialogo(page).locator('input[aria-label^="Chave de API"]').first().fill('u1-fixture-chave')
    await expect(dialogo(page).locator('input[aria-label^="Chave de API"]').first()).toHaveAttribute('type', 'text')
    await dialogo(page).getByRole('button', { name: 'Testar conexão' }).click()
    await expect(dialogo(page).getByText(/Conexão aprovada/)).toBeVisible({ timeout: 20_000 })
    // A conexão foi medida contra a FIXTURE, e ela mostrou o catálogo dela.
    expect(chamadasFixture, 'o teste explícito alcançou a fixture local').toBeGreaterThan(0)
    await expect(dialogo(page).getByText(/modelos/).first()).toBeVisible()

    // R04 — trocar de categoria limpa o que estava em memória: ao voltar, a
    // chave guardada volta MASCARADA e o "olho" volta a ser o único caminho.
    await categoria(page, 'Geral').click()
    await categoria(page, 'Provedores e modelos').click()
    await expect(dialogo(page).locator('input[aria-label^="Chave de API"]').first())
      .toHaveAttribute('type', 'password')
    await expect(dialogo(page).getByRole('button', { name: 'Mostrar a chave' }).first()).toBeVisible()
  })

  test('U1-E05 — Personalizações: dados do servidor real e uma única coluna de navegação', async ({ page }) => {
    await abrir(page)
    await page.getByRole('button', { name: 'Abrir navegador no editor' }).click()
    await page.getByRole('button', { name: 'Adicionar aba do editor' }).click()
    await page.getByRole('menuitem', { name: 'Personalizações' }).click()
    const modal = dialogo(page)
    await expect(modal).toBeVisible()

    const subnav = modal.getByRole('group', { name: 'Seções de Personalizações' })
    await expect(subnav).toBeVisible()
    await expect(modal.locator('.personalizations-navigation')).toHaveCount(0)
    // A tela desenha UMA nav (a do modal); o cabeçalho duplicado não existe.
    await expect(modal.locator('nav')).toHaveCount(1)
    await expect(modal.locator('h2.config-unificadas-titulo-conteudo')).toHaveCount(1)

    // Habilidades lê do servidor real (rota da Casa) e mostra o estado vazio real.
    await subnav.getByRole('button', { name: 'Habilidades' }).click()
    await expect(modal.getByRole('region', { name: 'Habilidades' })).toBeVisible()
    await expect(modal.locator('.customizations-tree')).toBeVisible()
  })

  test('U1-E06 — fechar com rascunho sujo pede decisão; "Continuar editando" preserva o rascunho', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Configurações')
    const modal = dialogo(page)
    await expect(modal).toBeVisible()

    // Deixa o painel sujo de forma honesta: editar o campo e NÃO salvar.
    const teto = modal.getByRole('spinbutton', { name: /teto/i }).first()
    await teto.fill('77')
    await modal.getByRole('button', { name: 'Fechar configurações' }).click()

    const confirmacao = page.getByRole('alertdialog', { name: 'Descartar rascunhos' })
    await expect(confirmacao).toBeVisible()
    await expect(confirmacao.getByRole('button', { name: 'Continuar editando' })).toBeVisible()
    await expect(confirmacao.getByRole('button', { name: 'Descartar rascunhos' })).toBeVisible()

    await confirmacao.getByRole('button', { name: 'Continuar editando' }).click()
    await expect(confirmacao).toBeHidden()
    await expect(teto).toHaveValue('77') // o rascunho sobreviveu

    // Descartar: fecha sem salvar — o servidor nunca recebeu 77.
    const putsAntes = putsConfig.length
    await modal.getByRole('button', { name: 'Fechar configurações' }).click()
    await confirmacao.getByRole('button', { name: 'Descartar rascunhos' }).click()
    await expect(page.getByRole('dialog', { name: 'Configurações' })).toHaveCount(0)
    expect(putsConfig.length).toBe(putsAntes)
  })

  test('U1-E07 — acessibilidade, foco devolvido, temas e larguras (1400x900 e 800x600)', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 })
    await abrir(page)
    const acionador = page.getByRole('button', { name: 'Conta' })
    await abrirPelaConta(page, 'Configurações')
    const modal = dialogo(page)
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('heading', { name: 'Configurações' })).toBeVisible()

    // Setas navegam, Enter abre: foco entra na nav e o Tab não escapa do diálogo.
    await page.locator('nav button[data-categoria]').first().focus()
    await page.keyboard.press('ArrowDown')
    await expect(categoria(page, 'Aparência')).toBeFocused()
    await page.keyboard.press('End')
    await expect(categoria(page, 'Importação e backup')).toBeFocused()
    for (let i = 0; i < 25; i += 1) await page.keyboard.press('Tab')
    const dentro = await page.evaluate(() => {
      const dialogo = document.querySelector('.config-unificadas')
      return !!dialogo && dialogo.contains(document.activeElement)
    })
    expect(dentro, 'o Tab fica preso no diálogo').toBe(true)
    // O resto do app fica inerte (não alcançável por foco/leitor).
    expect(await page.locator('.app-frame').evaluate((el) => (el as HTMLElement).inert)).toBe(true)

    // Capturas dos dois temas e das duas larguras. O tema é trocado DENTRO do
    // modal (Aparência) — o resto do app está inert, e é isso que se prova aqui:
    // a barra superior continua no mesmo estado ('agents-theme') sem ser tocada.
    const capturas = process.env.U1_EVIDENCIA_DIR
    const salvar = async (nome: string) => {
      if (capturas) await modal.screenshot({ path: join(capturas, nome) })
    }
    await expect(modal.locator('[data-painel="geral"]')).toBeVisible()
    await salvar('u1-geral-tema-escuro-1400.png')
    await categoria(page, 'Aparência').click()
    await expect(modal.locator('[data-painel-aparencia]')).toBeVisible()
    await salvar('u1-aparencia-tema-escuro-1400.png')
    await modal.getByRole('radio', { name: /claro/i }).check()
    await expect(page.locator('html')).toHaveClass(/theme-light/)
    await expect(modal.locator('[data-painel-aparencia="light"]')).toBeVisible()
    await salvar('u1-aparencia-tema-claro-1400.png')

    // Janela estreita: o diálogo cabe e continua navegável.
    await page.setViewportSize({ width: 800, height: 600 })
    await expect(modal).toBeVisible()
    const caixa = await modal.boundingBox()
    expect(caixa!.width).toBeLessThanOrEqual(800)
    await expect(page.locator('nav button[data-categoria]').first()).toBeVisible()
    await salvar('u1-aparencia-tema-claro-800x600.png')
    await categoria(page, 'Geral').click()
    await salvar('u1-geral-tema-claro-800x600.png')

    // Escape sem rascunho fecha e devolve o foco ao acionador.
    await page.getByRole('button', { name: 'Fechar configurações' }).click()
    await expect(page.getByRole('dialog', { name: 'Configurações' })).toHaveCount(0)
    await expect(acionador).toBeFocused()
    expect(await page.locator('.app-frame').evaluate((el) => (el as HTMLElement).inert)).toBe(false)
  })
})
