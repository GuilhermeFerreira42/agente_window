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
// U1-E08 (revisão) o modal lembra o tamanho entre aberturas, inclusive após F5
// U1-E09 (revisão) layout de TODOS os painéis: nada cortado, Salvar/Fechar à mão
// U1-E10 (revisão) desativar provedor: sai da conversa, avisa e reativa sem recadastro
// U1-E11 (revisão) rascunho em painel OCULTO ainda pede confirmação ao fechar
// U1-E12 (revisão) chave revelada não é rascunho nem volta no PUT
// U1-E13 (revisão) aba de arquivo ativa sobrevive à restauração com aba antiga
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
/** Salvamentos reais da Casa Provedores (PUT /api/providers). */
const putsProvedores: string[] = []
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
    if (url.pathname === '/api/providers' && req.method() === 'PUT') putsProvedores.push(req.postData() ?? '')
    if (url.pathname === '/api/config' && req.method() === 'PUT') putsConfig.push(req.postData() ?? '')
    if (url.pathname === '/api/config' && req.method() === 'GET') getsConfig += 1
  })
}

/** O primeiro provedor da lista (evita repetir o nome em 2 lugares). */
const PROVEDOR_SELECIONADO = 'openai-compat'

async function abrir(page: Page): Promise<void> {
  observarRede(page)
  await page.goto(BASE)
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
  await page.waitForTimeout(500)
}

/** Objeto do último salvamento de provedores (o corpo vem serializado em camadas). */
function ultimoSalvamento(id: string): Record<string, unknown> | undefined {
  const bruto = putsProvedores.at(-1)
  if (!bruto) return undefined
  let valor: unknown = bruto
  for (let i = 0; i < 3 && typeof valor === 'string'; i += 1) {
    try { valor = JSON.parse(valor) } catch { return undefined }
  }
  const corpo = valor as { provedores?: Record<string, Record<string, unknown>> }
  return corpo?.provedores?.[id]
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

    // R04 — trocar de categoria limpa o SEGREDO REVELADO. O rascunho que o dono
    // digitou continua (é dele, não do servidor) e o "olho" continua sendo o
    // único caminho para ver a chave GUARDADA.
    await categoria(page, 'Geral').click()
    await categoria(page, 'Provedores e modelos').click()
    await expect(dialogo(page).locator('[data-chave-revelada="sim"]')).toHaveCount(0)
    await expect(dialogo(page).getByRole('button', { name: 'Mostrar a chave' }).first()).toBeVisible()
    await expect(dialogo(page).locator('input[aria-label^="Chave de API"]').first())
      .toHaveValue('u1-fixture-chave')
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

  test('U1-E08 — o modal lembra o tamanho: primeira abertura expandida, depois o último, inclusive após F5', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Configurações')
    const modal = dialogo(page)
    // Primeira abertura desta instalação: expandido (regra do proprietário).
    await expect(modal).toHaveAttribute('data-modo', 'expandido')

    // O dono escolhe o menor; a escolha é PERSISTIDA (medida no storage real).
    await modal.getByRole('button', { name: 'Restaurar configurações' }).click()
    await expect(modal).toHaveAttribute('data-modo', 'restaurado')
    expect(await page.evaluate(() => window.localStorage.getItem('workbench.configuracoes.modo.v1'))).toBe('restaurado')

    // Fechar e reabrir: já vem no último modo (antes voltava expandido sempre).
    await page.keyboard.press('Escape')
    await expect(dialogo(page)).toHaveCount(0)
    await abrirPelaConta(page, 'Configurações')
    await expect(dialogo(page)).toHaveAttribute('data-modo', 'restaurado')

    // F5: a escolha sobrevive ao recarregamento.
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await abrirPelaConta(page, 'Configurações')
    await expect(dialogo(page)).toHaveAttribute('data-modo', 'restaurado')

    // E voltar a expandir também é lembrado.
    await dialogo(page).getByRole('button', { name: 'Maximizar configurações' }).click()
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await abrirPelaConta(page, 'Configurações')
    await expect(dialogo(page)).toHaveAttribute('data-modo', 'expandido')
  })

  test('U1-E09 — layout de todos os painéis: nada cortado e Salvar/Fechar sempre à mão', async ({ page }) => {
    const capturas = process.env.U1_EVIDENCIA_DIR
    const problemas: string[] = []
    const categorias = ['Geral', 'Aparência', 'Provedores e modelos', 'Personalizações', 'Permissões', 'Conversas e armazenamento', 'Workspaces']

    for (const [largura, altura] of [[1400, 900], [800, 600]] as const) {
      await page.setViewportSize({ width: largura, height: altura })
      await abrir(page)
      await abrirPelaConta(page, 'Configurações')
      const modal = dialogo(page)
      for (const tema of ['escuro', 'claro']) {
        if (tema === 'claro') {
          await categoria(page, 'Aparência').click()
          await modal.getByRole('radio', { name: /claro/i }).check()
        }
        for (const tamanho of ['expandido', 'restaurado'] as const) {
          const atual = await modal.getAttribute('data-modo')
          if (atual !== tamanho) {
            await modal.getByRole('button', { name: tamanho === 'expandido' ? 'Maximizar configurações' : 'Restaurar configurações' }).click()
          }
          for (const nome of categorias) {
            await categoria(page, nome).click()
            await page.waitForTimeout(nome === 'Provedores e modelos' ? 700 : 200)

            // Medição no DOM: o que o dono NÃO alcança é defeito.
            const medida = await page.evaluate(() => {
              const dlg = document.querySelector('.config-unificadas')!
              const caixa = dlg.getBoundingClientRect()
              const painel = Array.from(dlg.querySelectorAll('[data-painel]')).find((p) => !p.hasAttribute('hidden')) as HTMLElement | undefined
              const salvar = painel?.querySelector('.config-foot button, .providers-foot button[type="submit"]')
              const fechar = dlg.querySelector('[aria-label="Fechar configurações"]')
              const dentro = (el: Element | null | undefined) => {
                if (!el || !el.getClientRects().length) return el ? false : true
                const b = el.getBoundingClientRect()
                return b.top >= caixa.top - 1 && b.bottom <= caixa.bottom + 1 && b.left >= caixa.left - 1 && b.right <= caixa.right + 1
              }
              // Transbordo horizontal de conteúdo (não de reticências).
              let transbordo = 0
              for (const el of painel?.querySelectorAll('*') ?? []) {
                const est = getComputedStyle(el)
                if (!el.getClientRects().length || est.textOverflow === 'ellipsis') continue
                if (['auto', 'scroll'].includes(est.overflowX) || est.overflowX === 'hidden') continue
                if (el.scrollWidth > el.clientWidth + 2) transbordo += 1
              }
              return { salvarOk: dentro(salvar), fecharOk: dentro(fechar), transbordo, painel: painel?.getAttribute('data-painel') }
            })
            const rotulo = `${largura}x${altura}-${tema}-${tamanho}-${nome}`
            if (!medida.salvarOk && nome === 'Geral') problemas.push(`${rotulo}: Salvar fora da tela`)
            if (nome === 'Provedores e modelos' && !medida.salvarOk) problemas.push(`${rotulo}: Salvar provedores fora da tela`)
            if (!medida.fecharOk) problemas.push(`${rotulo}: Fechar fora da tela`)
            if (medida.transbordo > 0) problemas.push(`${rotulo}: ${medida.transbordo} elemento(s) cortados na horizontal`)
            if (capturas) await modal.screenshot({ path: join(capturas, `u1-${rotulo}.png`) })
          }
        }
      }
      await page.keyboard.press('Escape')
      await expect(dialogo(page)).toHaveCount(0)
    }
    expect(problemas, `defeitos de layout: ${problemas.join(' | ')}`).toEqual([])
  })

  test('U1-E10 — desativar provedor: sai da conversa, avisa e reativa sem recadastrar', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Provedores')
    const modal = dialogo(page)
    await page.waitForTimeout(1200)

    // Cadastra um provedor de fixture local COM modelo habilitado (ato do dono).
    await modal.getByRole('button', { name: 'Compatível com OpenAI' }).first().click()
    await modal.getByLabel('Nome do serviço').fill('Fixture E10')
    await modal.getByLabel(/^Endereço do serviço/).first().fill(`http://127.0.0.1:${fixturePorta}/v1`)
    await modal.locator('input[aria-label^="Chave de API"]').first().fill('u1-e10-chave')
    // Modelo PRÓPRIO deste cenário: se outro teste já habilitou este id, o
    // painel não oferece "habilitar o padrão" e o par já está no servidor —
    // o que este teste mede é a PRESERVAÇÃO na desativação, não o clique.
    await modal.getByLabel(/^Modelo /).first().fill('fixture-modelo-e10')
    const habilitarPadrao = modal.getByRole('button', { name: 'Habilitar modelo padrão atual' })
    if (await habilitarPadrao.count()) await habilitarPadrao.click()
    const putsAntes = putsConfig.length
    const putAntes = putsProvedores.length
    await modal.getByRole('button', { name: /Salvar provedores/ }).click()
    await expect.poll(() => putsProvedores.length, { timeout: 10_000 }).toBeGreaterThan(putAntes)

    // Desativar: o interruptor vai para o servidor e a config continua na tela.
    const corpoSalvo = putsProvedores.at(-1) ?? ''
    expect(corpoSalvo).toContain('fixture-modelo-e10')
    await modal.getByRole('checkbox', { name: 'Provedor habilitado' }).uncheck()
    await modal.getByRole('button', { name: /Salvar provedores/ }).click()
    await expect.poll(() => ultimoSalvamento(PROVEDOR_SELECIONADO)?.habilitado, { timeout: 10_000 }).toBe(false)

    // O painel NÃO apaga nada: modelo e endereço continuam ali.
    await expect(modal.getByLabel(/^Modelo /).first()).toHaveValue('fixture-modelo-e10')
    await expect(modal.getByLabel(/^Endereço do serviço/).first()).toHaveValue(`http://127.0.0.1:${fixturePorta}/v1`)
    expect(putsConfig.length).toBe(putsAntes)

    // Reativar é um clique — nada é recadastrado.
    await modal.getByRole('checkbox', { name: 'Provedor habilitado' }).check()
    await modal.getByRole('button', { name: /Salvar provedores/ }).click()
    await expect.poll(() => ultimoSalvamento(PROVEDOR_SELECIONADO)?.habilitado, { timeout: 10_000 }).toBe(true)
    await expect(modal.getByLabel(/^Modelo /).first()).toHaveValue('fixture-modelo-e10')
  })

  test('U1-E11 — rascunho em painel OCULTO pede confirmação ao fechar', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Configurações')
    const modal = dialogo(page)
    await expect(modal).toBeVisible()

    // Reprodução do defeito: altera Geral, vai para Aparência e fecha.
    await modal.getByRole('spinbutton', { name: /teto/i }).first().fill('133')
    await categoria(page, 'Aparência').click()
    await expect(modal.locator('[data-painel-aparencia]')).toBeVisible()
    await modal.getByRole('button', { name: 'Fechar configurações' }).click()

    // Antes: fechava seco. Agora pede decisão — o rascunho é do painel oculto.
    const confirmacao = page.getByRole('alertdialog', { name: 'Descartar rascunhos' })
    await expect(confirmacao).toBeVisible()
    await confirmacao.getByRole('button', { name: 'Continuar editando' }).click()
    await categoria(page, 'Geral').click()
    await expect(modal.getByRole('spinbutton', { name: /teto/i }).first()).toHaveValue('133')

    // Descartar fecha; e nenhum PUT saiu com o valor não confirmado.
    const putsAntes = putsConfig.length
    await modal.getByRole('button', { name: 'Fechar configurações' }).click()
    await confirmacao.getByRole('button', { name: 'Descartar rascunhos' }).click()
    await expect(dialogo(page)).toHaveCount(0)
    expect(putsConfig.length).toBe(putsAntes)
  })

  test('U1-E12 — ver a chave NÃO suja o formulário nem volta no PUT', async ({ page }) => {
    await abrir(page)
    await abrirPelaConta(page, 'Provedores')
    const modal = dialogo(page)
    await page.waitForTimeout(1200)

    // Cadastra o provedor de fixture com a chave e o modelo habilitado (ato do dono).
    await modal.getByRole('button', { name: 'Compatível com OpenAI' }).first().click()
    await modal.getByLabel('Nome do serviço').fill('Fixture E12')
    await modal.getByLabel(/^Endereço do serviço/).first().fill(`http://127.0.0.1:${fixturePorta}/v1`)
    await modal.locator('input[aria-label^="Chave de API"]').first().fill('u1-e12-chave-segredo')
    // Modelo próprio deste cenário (não depende do que a E10 deixou habilitado).
    await modal.getByLabel(/^Modelo /).first().fill('fixture-modelo-2')
    const habilitarPadrao = modal.getByRole('button', { name: 'Habilitar modelo padrão atual' })
    if (await habilitarPadrao.count()) await habilitarPadrao.click()
    await modal.getByRole('button', { name: /Salvar provedores/ }).click()
    // O par habilitado é o que o servidor guardou (nada de estado só na tela).
    await expect.poll(() => ultimoSalvamento(PROVEDOR_SELECIONADO)?.modelosHabilitados, { timeout: 10_000 })
      .toContain('fixture-modelo-2')

    // Ver a chave: o olhinho devolve do servidor; nada de "rascunho".
    await modal.getByRole('button', { name: 'Mostrar a chave' }).first().click()
    await expect(modal.locator('[data-chave-revelada="sim"]')).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Fechar configurações' })).toBeEnabled()
    // Fechar SEM confirmação: ver não é editar (antes abria a caixa de descarte).
    await modal.getByRole('button', { name: 'Fechar configurações' }).click()
    await expect(page.getByRole('alertdialog', { name: 'Descartar rascunhos' })).toHaveCount(0)
    await expect(dialogo(page)).toHaveCount(0)

    // Reabre e SALVA sem tocar na chave: o segredo não pode reaparecer no PUT.
    const putsAntes = putsProvedores.length
    await abrirPelaConta(page, 'Provedores')
    await page.waitForTimeout(1200)
    await dialogo(page).getByRole('button', { name: 'Mostrar a chave' }).first().click()
    await expect(dialogo(page).locator('[data-chave-revelada="sim"]')).toBeVisible()
    await dialogo(page).getByRole('button', { name: /Salvar provedores/ }).click()
    await expect.poll(() => putsProvedores.length, { timeout: 10_000 }).toBeGreaterThan(putsAntes)
    expect(ultimoSalvamento(PROVEDOR_SELECIONADO)?.apiKey, 'a chave revelada não volta no PUT').not.toBe('u1-e12-chave-segredo')
  })

  test('U1-E13 — aba de arquivo ativa sobrevive à restauração com aba antiga de Configurações', async ({ page }) => {
    await abrir(page)
    // Sessão real no banco (o app precisa de uma sessão para restaurar abas).
    const sessao = await page.evaluate(async () => {
      const resposta = await fetch('/api/sessions')
      return (await resposta.json()) as { sessions: Array<{ id: string }> }
    })
    expect(Array.isArray(sessao.sessions)).toBe(true)

    // Snapshot com aba de ARQUIVO ativa + aba antiga de Provedores em segundo plano.
    await page.evaluate(() => {
      window.localStorage.setItem('workbench.nativeTabs.v1', JSON.stringify({
        version: 1,
        tabs: [
          { id: 'aba-arquivo-e13', title: 'leia-me.md', type: 'file', sessionId: 'global' },
          { id: 'aba-prov-e13', title: 'Provedores', type: 'providers', sessionId: 'global' },
        ],
        browserViews: [],
        activeBySession: {},
        activeGlobalTabId: 'aba-arquivo-e13',
        activeTabId: 'aba-arquivo-e13',
        ordinalBySession: {},
      }))
    })
    await page.reload()
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
    await page.waitForTimeout(800)

    // O snapshot foi saneado: a aba antiga saiu e o ARQUIVO continua ativo.
    const depois = await page.evaluate(() => JSON.parse(window.localStorage.getItem('workbench.nativeTabs.v1') ?? '{}'))
    expect(depois.tabs.map((tab: { id: string }) => tab.id)).toEqual(['aba-arquivo-e13'])
    expect(depois.activeGlobalTabId ?? depois.activeTabId).toBe('aba-arquivo-e13')
    // Aba antiga de segundo plano NÃO abre modal nenhum por cima do arquivo.
    await expect(page.getByRole('dialog', { name: 'Configurações' })).toHaveCount(0)
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
