// FATIA 12 — prova E2E do EXCLUIR (SPEC PARTE 2F §7/§8 — os critérios de aceite).
//
// Condições de execução (fora do repo, como as fatias 08–11):
//   · Vite 5174 com AGENTE_WINDOW_PROVIDERS_PATH em fixture;
//   · stub 4610 (uploads/stub_agir.cjs) com os cenários EXCLUIR_* (FATIA 12);
//   · AGENTE_DELETE_E2E_ROOT = árvore temporária exclusiva com marcador;
//   · workspace e lixeira XDG ficam dentro dela (nunca a lixeira pessoal);
//   · servidor separado com o mesmo XDG_DATA_HOME e persistência isolada.
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve, sep } from 'node:path'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { resetApp, shot } from './helpers'

const STUB = 'http://127.0.0.1:4610/v1'
const CHAVE_BOA = 'nvapi-TESTE-agir-0001'
const MODELO = 'stub-agir-1'
// O harness deve criar esta árvore descartável e iniciar o servidor com
// XDG_DATA_HOME=ROOT/xdg e perfil de persistência/provedores também isolado.
const ROOT = process.env.AGENTE_DELETE_E2E_ROOT ? resolve(process.env.AGENTE_DELETE_E2E_ROOT) : ''
const PASTA = join(ROOT, 'workspace')
const TRASH = join(ROOT, 'xdg', 'Trash')
function conferirIsolamento(): void {
  if (process.platform !== 'linux') throw new Error('Este E2E verifica XDG/Linux; Windows exige seu cenário próprio de Lixeira real.')
  if (!ROOT || !ROOT.startsWith(resolve(tmpdir()) + sep) || !basename(ROOT).startsWith('agent-window-delete-e2e-')) throw new Error('Forneça uma árvore temporária exclusiva em AGENTE_DELETE_E2E_ROOT.')
  if (realpathSync(ROOT) !== ROOT || readFileSync(join(ROOT, 'ISOLATED_DELETE_E2E'), 'utf8').trim() !== ROOT) throw new Error('Raiz de teste sem marcador válido ou com redirecionamento.')
  if (process.env.XDG_DATA_HOME !== join(ROOT, 'xdg')) throw new Error('O teste e o servidor isolado devem usar ROOT/xdg como XDG_DATA_HOME.')
  for (const caminho of [join(ROOT, 'xdg'), PASTA, TRASH, join(TRASH, 'files'), join(TRASH, 'info')]) {
    if (existsSync(caminho) && realpathSync(caminho) !== caminho) throw new Error('A árvore de teste contém redirecionamento no workspace ou na lixeira.')
  }
}
const LIXEIRA_TESTE = ['alvo.txt', 'caixa', 'preservado.txt', 'alvo-sessao.txt', 's12.txt', 'ola.txt', 'fora12.txt']
const marcador = () => `EXCLUIR-E2E-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

interface ConfigProvedor {
  nome?: string
  baseUrl: string
  modelo: string
  apiKey?: string
}

async function salvar(request: APIRequestContext, ativo: string | null, provedores: Record<string, ConfigProvedor>): Promise<void> {
  const resposta = await request.put('/api/providers', { data: { ativo, provedores } })
  expect(resposta.ok(), 'PUT /api/providers deve aceitar o estado de teste').toBe(true)
}

async function ligarStub(request: APIRequestContext): Promise<void> {
  await salvar(request, 'openai-compat', {
    'openai-compat': { nome: 'Stub Agir', baseUrl: STUB, modelo: MODELO, apiKey: CHAVE_BOA },
  })
}

/** Limpa SOMENTE as sessões desta bateria (marcador EXCLUIR-E2E). */
async function varrerMinhasSessoes(request: APIRequestContext): Promise<void> {
  const resposta = await request.get('/api/sessions')
  if (!resposta.ok()) return
  const corpo = (await resposta.json()) as { sessions?: Array<{ id: string; title?: string }> }
  for (const sessao of corpo.sessions ?? []) {
    if ((sessao.title ?? '').startsWith('EXCLUIR-E2E-')) {
      await request.delete(`/api/sessions/${encodeURIComponent(sessao.id)}?force=true`)
    }
  }
}

/** Limpa somente itens da lixeira XDG pertencente à árvore descartável. */
function limparLixeira(): void {
  conferirIsolamento()
  for (const nome of LIXEIRA_TESTE) {
    rmSync(join(TRASH, 'files', nome), { recursive: true, force: true })
    rmSync(join(TRASH, 'info', nome + '.trashinfo'), { force: true })
  }
}

const ultimaBolha = (page: Page) => page.locator('.chat-message').last()
const cartoes = (page: Page) => ultimaBolha(page).locator('.chat-tool-card')

async function enviar(page: Page, texto: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
}

async function prepararSessaoComPasta(page: Page, marca: string): Promise<void> {
  await resetApp(page)
  await page.getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByLabel('Mensagem para a nova sessão').fill(`${marca} primeira`)
  await page.getByLabel('Mensagem para a nova sessão').press('Enter')
  const seletor = page.getByLabel('Workspace atual').first()
  await seletor.click()
  await seletor.fill(PASTA)
  await seletor.press('Enter')
  await expect(seletor).toHaveValue(PASTA, { timeout: 8000 })
  await expect(page.getByRole('textbox', { name: 'Mensagem para o agente' })).toBeVisible()
  const linha = page.locator('.session-row', { hasText: marca })
  await expect(linha.first()).toBeVisible({ timeout: 8000 })
  await enviar(page, 'oi sem ferramenta')
  await expect(ultimaBolha(page)).toContainText('Resposta simples sem ferramenta.', { timeout: 8000 })
}

test.beforeEach(async ({ request }) => {
  conferirIsolamento()
  rmSync(PASTA, { recursive: true, force: true })
  mkdirSync(PASTA, { recursive: true })
  mkdirSync(`${PASTA}/caixa/sub`, { recursive: true })
  writeFileSync(`${PASTA}/alvo.txt`, 'conteúdo do alvo 12')
  writeFileSync(`${PASTA}/preservado.txt`, 'não me apague')
  writeFileSync(`${PASTA}/alvo-sessao.txt`, 'alvo da sessao')
  writeFileSync(`${PASTA}/caixa/um.txt`, '1')
  writeFileSync(`${PASTA}/caixa/sub/dois.txt`, '2')
  limparLixeira()
  await varrerMinhasSessoes(request)
  await ligarStub(request)
})

test.afterAll(() => {
  if (!ROOT) return
  conferirIsolamento()
  rmSync(PASTA, { recursive: true, force: true })
  limparLixeira()
})

test.describe('FATIA 12 — Excluir (lixeira + cartão reforçado)', () => {
  test('T1: aprovar some da pasta e aparece inteiro na lixeira, com bilhete (arquivo + pasta)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'EXCLUIR_ARQUIVO alvo.txt')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Excluir (lixeira)', { timeout: 8000 })
    await expect(cartao).toContainText('alvo.txt')
    await expect(cartao).toContainText('Sem desfazer direto')
    await expect(cartao).toContainText('conteúdo do alvo 12') // prévia do disco (RF12-6)
    await expect(cartao).toContainText('Esperando você permitir')
    await expect(cartao.getByRole('button', { name: 'Permitir nesta sessão' })).toHaveCount(0) // RF12-3
    expect(existsSync(`${PASTA}/alvo.txt`), 'sem aprovar, nada some').toBe(true)
    await page.getByRole('button', { name: 'Permitir esta mexida' }).click()
    await expect(cartao).toContainText('Feito', { timeout: 8000 })
    await expect(ultimaBolha(page)).toContainText('Rodada concluída', { timeout: 8000 })
    expect(existsSync(`${PASTA}/alvo.txt`), 'aprovado some da pasta').toBe(false)
    // a restauração é conferível: inteiro na lixeira, com bilhete de origem:
    expect(readFileSync(`${TRASH}/files/alvo.txt`, 'utf8')).toBe('conteúdo do alvo 12')
    expect(readFileSync(`${TRASH}/info/alvo.txt.trashinfo`, 'utf8')).toContain(`${PASTA}/alvo.txt`)
    await shot(page, 'f12_T1_arquivo_na_lixeira')

    await enviar(page, 'EXCLUIR_PASTA caixa')
    const cartaoPasta = page.locator('.chat-tool-card', { hasText: 'caixa' }) // bolha nova: busca global
    await expect(cartaoPasta).toContainText('TODO o seu conteúdo', { timeout: 8000 }) // D138: confirmação resumida
    await page.getByRole('button', { name: 'Permitir esta mexida' }).click()
    await expect(cartaoPasta).toContainText('Feito', { timeout: 8000 })
    expect(existsSync(`${PASTA}/caixa`), 'pasta some inteira').toBe(false)
    expect(readFileSync(`${TRASH}/files/caixa/sub/dois.txt`, 'utf8')).toBe('2')
    await shot(page, 'f12_T1_pasta_na_lixeira')
  })

  test('T2: Negar = nada some e a IA sabe do "não" (RF12-2)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'EXCLUIR_NEGAR preservado.txt')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Esperando você permitir', { timeout: 8000 })
    await page.getByRole('button', { name: 'Negar esta mexida' }).click()
    await expect(cartao).toContainText('Negado por você', { timeout: 8000 })
    await expect(cartao).toContainText('nada sumiu')
    await expect(ultimaBolha(page)).toContainText('Rodada concluída', { timeout: 8000 })
    expect(readFileSync(`${PASTA}/preservado.txt`, 'utf8'), 'negado = intacto').toBe('não me apague')
    expect(existsSync(`${TRASH}/files/preservado.txt`), 'negado = fora da lixeira').toBe(false)
    await shot(page, 'f12_T2_negado_intacto')
  })

  test('T3: sessão liberada NÃO cobre excluir — o 2.º cartão pergunta igual (RF12-3)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'EXCLUIR_SESSAO')
    const cartao1 = cartoes(page).first()
    await expect(cartao1).toContainText('Criar arquivo', { timeout: 8000 })
    await page.getByRole('button', { name: 'Permitir nesta sessão' }).click()
    await expect(cartao1).toContainText('Feito', { timeout: 8000 })
    expect(readFileSync(`${PASTA}/s12.txt`, 'utf8')).toBe('da sessao 12')
    // o excluir do MESMO fluxo pergunta de novo (a sessão não cobre):
    const cartao2 = cartoes(page).nth(1)
    await expect(cartao2).toContainText('Excluir (lixeira)', { timeout: 8000 })
    await expect(cartao2).toContainText('Esperando você permitir')
    await expect(cartao2.getByRole('button', { name: 'Permitir nesta sessão' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Negar esta mexida' }).click()
    await expect(cartao2).toContainText('Negado por você', { timeout: 8000 })
    expect(readFileSync(`${PASTA}/alvo-sessao.txt`, 'utf8'), 'excluir negado = intacto').toBe('alvo da sessao')
    await shot(page, 'f12_T3_sessao_nao_cobre')
  })

  test('T4: externo descartável mediante cartão vai inteiro à lixeira isolada (D138)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    conferirIsolamento()
    writeFileSync(join(ROOT,'fora12.txt'),'EXTERNO-DESCARTÁVEL')
    await enviar(page, 'EXCLUIR_FORA')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Excluir (lixeira)', { timeout: 8000 })
    await page.getByRole('button', { name: 'Permitir esta mexida' }).click()
    await expect(cartao).toContainText('Feito', { timeout: 8000 })
    expect(existsSync(join(ROOT, 'fora12.txt')), 'externo saiu da origem').toBe(false)
    expect(readFileSync(join(TRASH,'files','fora12.txt'),'utf8')).toBe('EXTERNO-DESCARTÁVEL')
    await shot(page, 'f12_T4_fora_recusado')
  })

  test('T5: regressão da 10 — criar/escrever intactos, com botão de sessão (SPEC §8)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'CRIE_ARQUIVO ola.txt')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Criar arquivo', { timeout: 8000 })
    await expect(cartao.getByRole('button', { name: 'Permitir nesta sessão' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Permitir esta mexida' }).click()
    await expect(cartao).toContainText('Feito', { timeout: 8000 })
    expect(readFileSync(`${PASTA}/ola.txt`, 'utf8')).toBe('Conteúdo gravado pela FATIA 10')
    await shot(page, 'f12_T5_regressao_10')
  })
})
