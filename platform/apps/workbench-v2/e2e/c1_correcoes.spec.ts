// ==============================================================================
// C-1 (revisão Codex, 15/11) — testes INTEGRADOS das correções B1/B2/B3/F4.
//
// Infraestrutura REAL neste arquivo:
//   · servidor Vite spawnado pelo teste (mesma receita da m7_restart): rotas de
//     produção, better-sqlite3 e migração C-1 executam de verdade;
//   · banco LEGADO plantado ANTES do primeiro boot (sessões + grants +
//     receipts + checkpoints + origens + tombstone preenchidos);
//   · navegador Chromium via Playwright;
//   · provedor FIXTURE em servidor HTTP local (SSE OpenAI-compatível) — isto é
//     um teste integrado com BACKEND CONTROLADO, NÃO uma E2E com provedor real
//     de produção. A distinção fica registrada na entrega; E2E com provedor
//     real não é declarada sem executar.
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
// ==============================================================================
import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { resetApp, shot } from './helpers'

const PORTA = 5211
const BASE = `http://127.0.0.1:${PORTA}`
const app = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const marca = `C1E2E${Date.now()}`
const PASTA = join(tmpdir(), `c1-e2e-ws-${Date.now()}`)
/** Ressalva 16/11 — comparação de caminhos normalizada (Windows usa `\` e
 *  caixa diferente; a regra é por segmento normalizado, nunca regex com o
 *  caminho bruto). */
const norm = (valor: string) => valor.replace(/\\/g, '/').toLowerCase()

test.setTimeout(240_000)
test.describe.configure({ mode: 'serial' })

let processo: ChildProcess | undefined
let raiz: string
let provedor: Server | undefined
let chamadasProvedor = 0

async function iniciarServidor(): Promise<void> {
  processo = spawn(process.execPath, [resolve(app, '../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(PORTA), '--strictPort'], {
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
  })
  await expect.poll(async () => {
    try { return (await fetch(BASE)).status } catch { return 0 }
  }, { timeout: 30_000 }).toBe(200)
}

async function pararServidor(): Promise<void> {
  if (!processo || processo.exitCode !== null) return
  const terminou = new Promise<void>((resolveExit) => processo!.once('exit', () => resolveExit()))
  processo.kill('SIGKILL')
  await terminou
}

/** Provedor OpenAI-compatível local: devolve texto simples (sem ferramentas),
 *  variando entre Chat e Pasta para o teste provar qual fluxo completou. */
async function subirProvedor(): Promise<number> {
  provedor = createServer((req, res) => {
    if (req.method !== 'POST') { res.writeHead(404).end(); return }
    const partes: Buffer[] = []
    req.on('data', (pedaco: Buffer) => partes.push(pedaco))
    req.on('end', () => {
      chamadasProvedor += 1
      const corpo = Buffer.concat(partes).toString('utf8')
      const texto = corpo.includes('Pasta') ? 'Resposta C-1 em Pasta.' : 'Resposta C-1 em Chat.'
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: texto } }] })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
    })
  })
  await new Promise<void>((ok) => provedor!.listen(0, '127.0.0.1', ok))
  const endereco = provedor.address()
  if (!endereco || typeof endereco === 'string') throw new Error('provedor fixture indisponível')
  return endereco.port
}

/**
 * BANCO LEGADO (pré-C-1) PREENCHIDO — mesma estrutura do teste unitário
 * C-1/B1: sessions no formato antigo + filhos com FK (grants, receipts,
 * checkpoints, origens) + tombstone sem FK. O boot do servidor real é que
 * roda a migração; a prova é o `foreign_key_check` vazio depois.
 */
function plantarLegado(caminhoBanco: string): void {
  mkdirSync(dirname(caminhoBanco), { recursive: true })
  const json = (id: string, titulo: string) => JSON.stringify({
    id, title: titulo, workspace: 'Synthetic', workspacePath: '/synthetic', worktreePath: null,
    contexto: { tipo: 'workspace' }, section: 'today', status: 'completed', updated: 'agora',
    diffAdded: 0, diffRemoved: 0, branch: null,
    chats: [{ id: 'main', title: 'Main', status: 'completed', messages: [] }], mainChatId: 'main',
  })
  const legacy = new Database(caminhoBanco)
  legacy.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL, title TEXT NOT NULL, workspace_path TEXT NOT NULL,
      worktree_path TEXT, message_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, session_json TEXT NOT NULL
    );
    INSERT INTO sessions VALUES
      ('c1-keep', 'c1-keep', 'Preservada C1', '/synthetic', NULL, 0, 1, 2, '${json('c1-keep', 'Preservada C1').replace(/'/g, "''")}'),
      ('c1-cascade', 'c1-cascade', 'Para cascatas C1', '/synthetic', NULL, 0, 1, 3, '${json('c1-cascade', 'Para cascatas C1').replace(/'/g, "''")}'),
      ('c1-tomb', 'c1-tomb', 'Com tombstone C1', '/synthetic', NULL, 0, 1, 4, '${json('c1-tomb', 'Com tombstone C1').replace(/'/g, "''")}');
    CREATE TABLE session_tool_grants (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_path TEXT NOT NULL, tool_id TEXT NOT NULL CHECK (tool_id IN ('criar','escrever')),
      granted_at INTEGER NOT NULL, PRIMARY KEY (session_id, workspace_path, tool_id));
    INSERT INTO session_tool_grants VALUES ('c1-keep','/synthetic','criar',1);
    CREATE TABLE session_command_grants (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      workspace_path TEXT NOT NULL, tool_id TEXT NOT NULL CHECK (tool_id = 'executar'),
      granted_at INTEGER NOT NULL, PRIMARY KEY (session_id, workspace_path, tool_id));
    INSERT INTO session_command_grants VALUES ('c1-keep','/synthetic','executar',1);
    CREATE TABLE session_checkpoints (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL, checkpoint_json TEXT NOT NULL, PRIMARY KEY (session_id, chat_id));
    INSERT INTO session_checkpoints VALUES ('c1-keep','a','{"legado":true}');
    INSERT INTO session_checkpoints VALUES ('c1-cascade','a','{"legadoCascade":true}');
    CREATE TABLE session_persistence_receipts (
      session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
      mutation_id TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL, digest TEXT NOT NULL,
      creation_id UNIQUE, creation_digest TEXT, creation_revision INTEGER);
    INSERT INTO session_persistence_receipts VALUES ('c1-keep','mut-legacy',2,'digest-legacy',NULL,NULL,NULL);
    CREATE TABLE chat_history_origins (
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL, epoch TEXT NOT NULL, operator_id TEXT NOT NULL,
      project_key TEXT, root_identity TEXT,
      state TEXT NOT NULL CHECK(state IN ('empty','verified','unverifiable')),
      digest TEXT NOT NULL, title TEXT NOT NULL, title_norm TEXT NOT NULL,
      session_title TEXT NOT NULL, chat_title TEXT NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY(session_id,chat_id));
    INSERT INTO chat_history_origins VALUES ('c1-keep','main','ep','op',NULL,NULL,'verified','d','T','t','S','C',1);
    CREATE TABLE session_deletions (
      session_id TEXT PRIMARY KEY, deletion_id TEXT NOT NULL UNIQUE, revision INTEGER NOT NULL,
      requested_at INTEGER NOT NULL,
      cleanup_state TEXT NOT NULL CHECK (cleanup_state IN ('preparado','limpeza_pendente','concluido')));
    INSERT INTO session_deletions VALUES ('c1-tomb','del-1',0,1,'preparado');
  `)
  legacy.close()
}

function abrirBanco(): Database.Database {
  return new Database(join(raiz, 'data', 'agente_window.db'))
}

interface RequisicaoApp { url: string; metodo: string; corpo?: string }
interface Coletor {
  requisicoes: RequisicaoApp[]
  quadrosPty: string[]
  naoDuzentos: Array<{ url: string; status: number }>
  marcar(): number
  urlsDepois(antes: number, filtro: (url: string) => boolean): string[]
}

async function coletar(page: Page): Promise<Coletor> {
  const requisicoes: RequisicaoApp[] = []
  const quadrosPty: string[] = []
  const naoDuzentos: Array<{ url: string; status: number }> = []
  page.on('request', (req) => {
    // Caminho puro (navegador devolve URL absoluta) — os filtros são por caminho.
    let caminho = req.url()
    try { caminho = new URL(req.url()).pathname + new URL(req.url()).search } catch { /* relativa */ }
    requisicoes.push({ url: caminho, metodo: req.method(), corpo: req.postData() ?? undefined })
  })
  page.on('response', (res) => {
    if (res.status() >= 400) naoDuzentos.push({ url: res.url(), status: res.status() })
  })
  page.on('websocket', (ws) => {
    if (!ws.url().includes('/pty')) return
    ws.on('framesent', (quadro) => quadrosPty.push(String(quadro.payload)))
  })
  return {
    requisicoes,
    quadrosPty,
    naoDuzentos,
    marcar: () => requisicoes.length,
    urlsDepois: (antes, filtro) => requisicoes.slice(antes).map((r) => r.url).filter(filtro),
  }
}

async function configurarProvedor(page: Page, portaProvedor: number): Promise<void> {
  const headers = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }
  const resposta = await page.request.put(`${BASE}/api/providers`, {
    headers,
    data: {
      ativo: 'openai-compat',
      provedores: { 'openai-compat': { nome: 'C1 fixture', baseUrl: `http://127.0.0.1:${portaProvedor}/v1`, modelo: 'c1-fixture', apiKey: 'fixture' } },
    },
  })
  expect(resposta.ok(), 'PUT /api/providers deve aceitar a fixture de teste').toBe(true)
}

const ultimaBolha = (page: Page) => page.locator('.chat-message').last()
/** Boundary local do servidor: mesma origem obrigatória em toda chamada API. */
const headersApi = { Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }

test.beforeAll(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'c1-e2e-'))
  mkdirSync(PASTA, { recursive: true })
  plantarLegado(join(raiz, 'data', 'agente_window.db'))
  await iniciarServidor()
  await subirProvedor()
})

test.afterAll(async () => {
  await pararServidor()
  if (provedor) await new Promise<void>((ok) => provedor!.close(() => ok()))
  rmSync(PASTA, { recursive: true, force: true })
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test.describe('C-1 — correções integradas (servidor real + navegador + backend controlado)', () => {
  test('B1 — migração do banco legado preenchida: dependentes preservados e cascatas na tabela certa', async ({ page }) => {
    // Boot real já migrou no beforeAll. API preserva os títulos.
    const resposta = await page.request.get(`${BASE}/api/sessions`, { headers: headersApi })
    const texto = await resposta.text()
    expect(resposta.ok(), `GET /api/sessions status ${resposta.status()} corpo: ${texto.slice(0, 400)}`).toBe(true)
    const lista = JSON.parse(texto) as { sessions?: Array<{ id: string; title: string; persistenceRevision?: number }> } & Record<string, unknown>
    expect(Array.isArray(lista.sessions), `corpo: ${texto.slice(0, 200)}`).toBe(true)
    const titulosBrutos = (lista.sessions as Array<{ id: string; title: string }>).map((s) => `${s.id}:${s.title}`)
    expect(titulosBrutos, `todos os títulos: ${titulosBrutos.join(' | ')}`).toContain('c1-keep:Preservada C1')

    // Integridade referencial: zero violações e nenhum filho apontando para a
    // tabela temporária derrubada.
    const banco = abrirBanco()
    try {
      banco.pragma('foreign_keys = ON')
      expect(banco.prepare('PRAGMA foreign_key_check').all()).toEqual([])
      const sqlFilho = (banco.prepare("SELECT sql FROM sqlite_master WHERE name='session_tool_grants'").get() as { sql: string }).sql
      expect(sqlFilho).toContain('REFERENCES sessions(')
      expect(sqlFilho).not.toContain('sessions_legacy')
      expect(banco.prepare('SELECT COUNT(*) AS n FROM session_tool_grants').get()).toEqual({ n: 1 })
      expect(banco.prepare('SELECT COUNT(*) AS n FROM session_persistence_receipts').get()).toEqual({ n: 1 })
      expect(banco.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'sessions_legacy%'").get()).toEqual({ n: 0 })
      // O tombstone SOBREVIVEU (linha presente, estado válido). O servidor
      // real pode avançar a limpeza no boot — o contrato é a sobrevivência.
      expect(['preparado', 'limpeza_pendente', 'concluido']).toContain(
        (banco.prepare('SELECT cleanup_state FROM session_deletions').get() as { cleanup_state: string }).cleanup_state,
      )
    } finally { banco.close() }

    // UI: a sessão preservada aparece na lista.
    await resetApp(page)
    await expect(page.locator('.session-row', { hasText: 'Preservada C1' }).first()).toBeVisible()
    await shot(page, 'c1_b1_legado_preservado')

    // Cascatas reais no servidor: apagar c1-cascade remove os filhos.
    const cascade = (lista.sessions as Array<{ id: string; title: string; persistenceRevision?: number }>).find((sessao) => sessao.id === 'c1-cascade')
    expect(cascade, 'c1-cascade deve estar na lista antes da exclusão').toBeDefined()
    const detalhe = await (await page.request.get(`${BASE}/api/sessions/c1-cascade`, { headers: headersApi })).json() as {
      ack?: { revision?: number }; session?: { persistenceRevision?: number }
    }
    // Registro legado sem receipt de mutação gravado → revisão armazenada 0.
    const revisao = detalhe.ack?.revision ?? detalhe.session?.persistenceRevision ?? cascade?.persistenceRevision ?? 0
    expect(typeof revisao).toBe('number')
    const del = await page.request.delete(`${BASE}/api/sessions/c1-cascade?force=true`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: { deletionId: randomUUID(), expectedRevision: revisao },
    })
    expect([200, 201, 204], `DELETE status ${del.status()} corpo: ${(await del.text()).slice(0, 300)}`).toContain(del.status())
    const bancoDepois = abrirBanco()
    try {
      bancoDepois.pragma('foreign_keys = ON')
      expect(bancoDepois.prepare('PRAGMA foreign_key_check').all()).toEqual([])
      expect(bancoDepois.prepare('SELECT COUNT(*) AS n FROM sessions WHERE id=?').get('c1-cascade')).toEqual({ n: 0 })
      expect(bancoDepois.prepare('SELECT COUNT(*) AS n FROM session_checkpoints WHERE session_id=?').get('c1-cascade')).toEqual({ n: 0 })
      expect(bancoDepois.prepare('SELECT COUNT(*) AS n FROM session_tool_grants WHERE session_id=?').get('c1-keep')).toEqual({ n: 1 })
    } finally { bancoDepois.close() }
  })

  test('B2+B3+F4 — 1º envio em Chat: completa no modelo sem 409, sem permission/instruction, sem /fs nem /git e terminal sem raiz', async ({ page }) => {
    const coletor = await coletar(page)
    await configurarProvedor(page, (provedor!.address() as { port: number }).port)
    await resetApp(page)

    // Landing padrão = Chat (chip "Chat sem pasta"), sem seletor de pasta.
    await page.getByRole('button', { name: 'Nova sessão' }).first().click()
    await expect(page.getByTestId('landing-chat-chip')).toBeVisible()
    const envio = `${marca} Chat primeira mensagem`
    const marcas = coletor.marcar()
    await page.getByLabel('Mensagem para a nova sessão').fill(envio)
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()

    // ★ O fluxo do modelo COMPLETA — sem o 409 de permissão/instrução que
    //   existia antes da correção (a rota real está no ar; o409 viria dela).
    await expect(ultimaBolha(page)).toContainText('Resposta C-1 em Chat.', { timeout: 20_000 })
    // A fixture local FOI CHAMADA — o backend controlado recebeu o request do
    // servidor real (prova de que o run saiu do servidor até o modelo).
    expect(chamadasProvedor).toBeGreaterThanOrEqual(1)

    const depois = coletor.requisicoes.slice(marcas)
    const urls = depois.map((r) => r.url)
    // Ausência de chamadas de permissão/instrução de pasta no envio em Chat.
    expect(urls.filter((u) => u.startsWith('/api/agir/permission'))).toEqual([])
    expect(urls.filter((u) => u.startsWith('/api/agir/instruction'))).toEqual([])
    // O modo registrado é o efetivo `ask`.
    const envioAgir = depois.find((r) => r.url === '/api/agir' && r.metodo === 'POST')
    expect(envioAgir, 'o run /api/agir precisa ter sido chamado').toBeDefined()
    expect(JSON.parse(envioAgir!.corpo!)).toMatchObject({ mode: 'ask' })
    // Nenhum 409 em toda a jornada.
    expect(coletor.naoDuzentos.filter((r) => r.status === 409)).toEqual([])

    // Explorer em Chat: sem descoberta de raiz, sem leitura de arquivos, sem Git.
    expect(coletor.urlsDepois(marcas, (u) => u.startsWith('/fs/'))).toEqual([])
    expect(coletor.urlsDepois(marcas, (u) => u.includes('/git/'))).toEqual([])
    // Estado vazio do Explorer (view padrão) e SEM botão "Abrir pasta" em sessão.
    await expect(page.getByText('Nenhuma pasta aberta.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abrir pasta' })).toHaveCount(0)

    // F4 — terminal em Chat: painel indisponível e NENHUM open de PTY
    // (sem shell implícito na raiz global).
    await page.getByRole('button', { name: 'Alternar terminal' }).click()
    const painel = page.locator('.terminal-panel')
    await expect(painel).toBeVisible()
    await expect(painel).toHaveAttribute('data-pty-status', 'sem-workspace')
    await expect(painel).toContainText('Terminal indisponível nesta sessão')
    await page.waitForTimeout(1500)
    expect(coletor.quadrosPty.filter((q) => q.includes('"type":"open"'))).toEqual([])
    await shot(page, 'c1_chat_sem_raiz')
  })

  test('B3+F4 — Pasta preservada: envio completo, Explorer com /fs/workspace da raiz real e terminal com cwd real', async ({ page }) => {
    const coletor = await coletar(page)
    await configurarProvedor(page, (provedor!.address() as { port: number }).port)
    await resetApp(page)

    // Jornada Pasta na landing: modalidade Pasta → caminho manual validado.
    await page.getByRole('button', { name: 'Nova sessão' }).first().click()
    await page.getByTestId('contexto-workspace').click()
    await page.getByRole('button', { name: 'Digitar caminho' }).click()
    await page.getByLabel('Caminho manual do workspace').fill(PASTA)
    await page.getByLabel('Caminho manual do workspace').press('Enter')
    // Pasta escolhida (pendência da landing): a landing segue visível com o
    // caminho validado no cabeçalho — o 1º envio cria a sessão workspace.
    await expect(page.getByRole('button', { name: 'Workspace atual' })).toBeVisible({ timeout: 15_000 })

    const marcas = coletor.marcar()
    await page.getByLabel('Mensagem para a nova sessão').fill(`${marca} Pasta primeira mensagem`)
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await expect(ultimaBolha(page)).toContainText('Resposta C-1 em Pasta.', { timeout: 20_000 })

    // Em Pasta a preparação de permissão acontece (simetria: o chamado que
    // NÃO existe em Chat existe aqui).
    expect(coletor.urlsDepois(marcas, (u) => u.startsWith('/api/agir/permission')).length).toBeGreaterThanOrEqual(1)

    // Explorer ligado com a raiz REAL da sessão.
    const chamadasWorkspace = coletor.requisicoes.filter((r) => r.url.startsWith('/fs/workspace') && norm(r.corpo ?? '').includes(norm(PASTA)))
    expect(chamadasWorkspace.length).toBeGreaterThanOrEqual(1)
    await expect(page.getByText('Nenhuma pasta aberta.')).toHaveCount(0, { timeout: 15_000 })
    await shot(page, 'c1_pasta_explorer')

    // Terminal em Pasta: instância nasce e o `open` sai com cwd da raiz real.
    await page.getByRole('button', { name: 'Alternar terminal' }).click()
    await expect(page.locator('.terminal-panel')).toBeVisible()
    await expect.poll(() => coletor.quadrosPty.some((q) => q.includes('"type":"open"') && norm(q).includes(norm(PASTA))), { timeout: 15_000 })
      .toBe(true)
    await shot(page, 'c1_pasta_terminal')
  })

  test('rodada2 — envio durante a validação da pasta: bloqueio visível com texto mantido e conclusão após liberar', async ({ page }) => {
    // Ressalva do reteste 16/11 ("tentativa de envio antecipado em Pasta"):
    // causa isolada no cliente (limpeza sem handshake + guarda em silêncio).
    // Cenário DETERMINÍSTICO: o teste segura a resposta REAL da validação e
    // envia durante a espera — sem qualquer espera arbitrária.
    const coletor = await coletar(page)
    await configurarProvedor(page, (provedor!.address() as { port: number }).port)
    await resetApp(page)

    let liberarValidacao = (): void => {}
    const validacaoLiberada = new Promise<void>((liberar) => { liberarValidacao = liberar })
    await page.route('**/api/workspaces/validate', async (rota) => {
      await validacaoLiberada
      await rota.continue()
    })

    await page.getByRole('button', { name: 'Nova sessão' }).first().click()
    await page.getByTestId('contexto-workspace').click()
    await page.getByRole('button', { name: 'Digitar caminho' }).click()
    await page.getByLabel('Caminho manual do workspace').fill(PASTA)
    await page.getByLabel('Caminho manual do workspace').press('Enter')

    // Validação em voo (segurada pelo gate) → envia ENQUANTO carrega.
    const rascunho = `${marca} Pasta durante validacao`
    await page.getByLabel('Mensagem para a nova sessão').fill(rascunho)
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()

    // ★ Garantia: bloqueio VISÍVEL e texto MANTIDO.
    await expect(page.getByText(/ainda está sendo validada/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByLabel('Mensagem para a nova sessão')).toHaveValue(rascunho)
    // Nada criado durante o bloqueio (o sintoma relatado: sem /api/worktrees).
    expect(coletor.requisicoes.filter((r) => r.url.includes('/api/worktrees'))).toEqual([])

    // Libera a validação → workspace selecionado → reenvio ACEITO E CONCLUÍDO.
    liberarValidacao()
    await expect(page.getByText(/Workspace selecionado/)).toBeVisible({ timeout: 15_000 })
    const antes = coletor.marcar()
    await page.getByRole('button', { name: 'Enviar mensagem' }).click()
    await expect(ultimaBolha(page)).toContainText('Resposta C-1 em Pasta.', { timeout: 20_000 })
    expect(coletor.urlsDepois(antes, (u) => u.includes('/api/worktrees')).length).toBeGreaterThanOrEqual(1)
    await shot(page, 'c1_rodada2_envio_durante_validacao')
  })

  test('B1 — reinicialização: dados migrados persistem e a modalidade é imutável (409 session_context_immutable)', async ({ page }) => {
    // Reinício REAL do servidor no mesmo perfil descartável.
    await page.goto('about:blank')
    await pararServidor()
    await iniciarServidor()

    const lista = await (await page.request.get(`${BASE}/api/sessions`, { headers: headersApi })).json() as {
      sessions: Array<{ id: string; title: string; workspacePath: string | null; persistenceRevision?: number; contexto?: { tipo: string }; chats: unknown[] }>
    }
    const titulos = lista.sessions.map((s) => s.title)
    expect(titulos).toContain('Preservada C1')
    expect(titulos.some((t) => t.startsWith(marca))).toBe(true)

    // Imutabilidade: tentativa de converter a sessão Chat em workspace → 409.
    const chat = lista.sessions.find((s) => (s.title ?? '').includes('Chat primeira')) ?? lista.sessions.find((s) => (s.title ?? '').startsWith(marca))
    expect(chat, 'a sessão Chat criada no teste B2 deve existir após o reinício').toBeDefined()
    const detalhe = await page.request.get(`${BASE}/api/sessions/${encodeURIComponent(chat!.id)}`, { headers: headersApi })
    expect(detalhe.ok(), `GET da sessão Chat falhou: ${detalhe.status()}`).toBe(true)
    const { session: chatDetalhe, ack } = await detalhe.json() as { session: Record<string, unknown>; ack?: { revision?: number } }
    const revisao = ack?.revision ?? (chatDetalhe as { persistenceRevision?: number }).persistenceRevision ?? 0
    const tentativa = await page.request.put(`${BASE}/api/sessions`, {
      headers: { ...headersApi, 'Content-Type': 'application/json' },
      data: {
        session: { ...chatDetalhe, workspacePath: PASTA, worktreePath: null, contexto: { tipo: 'workspace', path: PASTA } },
        expectedRevision: revisao,
        mutationId: randomUUID(),
        contexto: { tipo: 'workspace', path: PASTA },
      },
    })
    expect(tentativa.status(), `PUT imutável respondeu ${tentativa.status()}: ${(await tentativa.text()).slice(0, 300)}`).toBe(409)
    expect(await tentativa.json()).toMatchObject({ code: 'session_context_immutable' })

    // O registro segue Chat de verdade.
    const registro = await (await page.request.get(`${BASE}/api/sessions/${encodeURIComponent(chat!.id)}`, { headers: headersApi })).json() as { session?: { workspacePath?: string | null; contexto?: { tipo: string } } }
    const sessionRecuperada = registro.session ?? (registro as unknown as { workspacePath?: string | null })
    expect(sessionRecuperada.workspacePath ?? null).toBeNull()

    // Integridade referencial após o reinício (idempotência da migração).
    const banco = abrirBanco()
    try {
      banco.pragma('foreign_keys = ON')
      expect(banco.prepare('PRAGMA foreign_key_check').all()).toEqual([])
      expect(banco.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'sessions_legacy%'").get()).toEqual({ n: 0 })
    } finally { banco.close() }

    // UI após F5: as sessões continuam lá.
    await resetApp(page)
    await expect(page.locator('.session-row', { hasText: 'Preservada C1' }).first()).toBeVisible()
    await expect(page.locator('.session-row', { hasText: marca }).first()).toBeVisible()
    await shot(page, 'c1_apos_reinicio')
  })
})
