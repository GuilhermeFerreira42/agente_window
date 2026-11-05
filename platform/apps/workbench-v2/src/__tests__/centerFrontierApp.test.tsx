// ============================================================================
// src/__tests__/centerFrontierApp.test.tsx — Fatia 15, Onda 2c-i (D148 §3).
//
// O que este arquivo policia: que o APP atravessa a fronteira. O
// centerFrontier.test.tsx prova o centro (qual corpo aparece para qual aba);
// aqui a pergunta é se o App fornece o slot, projeta as abas do módulo na faixa
// central e se clicar/fechar chega ao EditorService do módulo.
//
// Por que com o módulo REAL e não com dublê: um módulo fake provaria apenas que
// o App chama o que o fake registra — tautologia. Aqui as abas são abertas pelo
// `attach.open` de verdade e as provas leem o estado de verdade:
//   • `attach.getTabs` dizer que a uri virou ativa só é possível se o App chamou
//     `activateTab`, porque só o EditorService do módulo sabe quem está ativa;
//   • o diálogo `center-save-dialog` aparecer a partir de um clique no X da faixa
//     do shell só é possível se `requestCloseTab` atravessou E se o corpo central
//     está montado (sem corpo não há atendente — D147 §5).
// O acesso ao módulo montado é pelo gancho DEV `window.__explorerSearchModule`,
// que existe para isso (o E2E da 4.7 usa o mesmo caminho).
//
// Custo conhecido: renderizar o App inteiro leva dezenas de segundos. Vale porque
// a RF15-1 só pode ser declarada acessível na interface com prova de integração.
// ============================================================================
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { testSessions } from './fixtures/sessions'
import type { IExplorerSearchModule, WorkspaceUri } from '../modules/explorer-search'

// O projeto tem um stub de `monaco-editor` cujo editor.create() LANÇA de propósito
// ("não disponível em testes unitários"). Como aqui o CodeEditorPane é REAL — é o
// que torna a prova de integração forte — o loadMonaco().then(...) sem .catch vira
// rejeição não tratada e o vitest fecha com EXIT 1 mesmo com todos os testes verdes.
// Sobrescrever o PACOTE (não o componente) mantém a fronteira intacta: o FT-01
// proíbe importar abaixo do barrel do módulo, e `monaco-editor` é dependência externa.
vi.mock('monaco-editor', () => {
  const descartavel = { dispose: () => undefined }
  const instancia = {
    dispose: () => undefined, addCommand: () => undefined, addAction: () => descartavel,
    onDidChangeCursorPosition: () => descartavel, onDidChangeModelContent: () => descartavel,
    onDidChangeModel: () => descartavel, onDidDispose: () => descartavel,
    createDecorationsCollection: () => ({ clear: () => undefined, set: () => undefined }),
    setModel: () => undefined, getModel: () => null, layout: () => undefined,
    getValue: () => '', setValue: () => undefined, updateOptions: () => undefined,
    revealLineInCenter: () => undefined, revealLine: () => undefined, setPosition: () => undefined,
    focus: () => undefined, saveViewState: () => null, restoreViewState: () => undefined,
    getContribution: () => null, trigger: () => undefined, hasTextFocus: () => false,
  }
  const modelo = {
    getValue: () => '', setValue: () => undefined, dispose: () => undefined,
    getValueLength: () => 0, uri: { toString: () => 'file:///stub' },
    onDidChangeContent: () => descartavel, getAlternativeVersion: () => modelo,
    getLineCount: () => 1, findMatches: () => [], updateOptions: () => undefined,
  }
  return {
    editor: {
      create: () => instancia, createModel: () => modelo, setTheme: () => undefined,
      getModel: () => null, getModels: () => [], createDecorationsCollection: () => ({ clear: () => undefined }),
      createDiffEditor: () => instancia, onDidCreateModel: () => descartavel,
    },
    KeyMod: { CtrlCmd: 2048, Shift: 1024, Alt: 512, WinCtrl: 256 },
    KeyCode: { KeyS: 49, Enter: 3, Tab: 2 },
    Uri: { parse: (s: string) => ({ toString: () => s }), file: (s: string) => ({ toString: () => s }) },
    Range: class { constructor(_a: number, _b: number, _c: number, _d: number) { /* stub */ } },
    Position: class { constructor(_l: number, _c: number) { /* stub */ } },
    MarkerSeverity: { Error: 8, Warning: 4, Info: 2, Hint: 1 },
    languages: { register: () => undefined, setMonarchTokensProvider: () => descartavel, registerCompletionItemProvider: () => descartavel },
  }
})

vi.mock('../services/sessions/sessionsClient', () => ({
  SessionPersistenceError: class SessionPersistenceError extends Error {},
  loadPersistedSessions: vi.fn(async () => (await import('./fixtures/sessions')).testSessions),
  persistSession: vi.fn(async () => undefined),
  pickSessionWorkspace: vi.fn(async () => undefined),
  createSessionWorktree: vi.fn(async () => ({ slug: 'workspace-local', path: null, branch: null, repoRoot: '/repo' })),
  removePersistedSession: vi.fn(async () => undefined),
}))

const RAIZ = 'file:///trabalho'
const ARQ_A = `${RAIZ}/a.ts` as WorkspaceUri

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

beforeEach(() => {
  window.localStorage.clear()
  delete (window as { __explorerSearchModule?: unknown }).__explorerSearchModule
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    // O boot do módulo passa por aqui: discoverRoot() lê /fs/root e em seguida
    // explorer.openFolder valida que a raiz É UMA PASTA. A primeira versão deste
    // harness devolvia kind:'file' para tudo e o boot morria com
    // 'openFolder: "file:///trabalho" não é uma pasta' — o módulo nem chegava a
    // ser exposto. A raiz tem de responder 'directory'.
    let uriNoBody = ''
    try { uriNoBody = String((JSON.parse(String(init?.body ?? '{}')) as { uri?: unknown }).uri ?? '') } catch { uriNoBody = '' }
    const ehRaiz = uriNoBody === RAIZ || url.includes(encodeURIComponent(RAIZ))
    if (url.includes('/fs/root')) return json({ root: RAIZ })
    // BrowserFsPort.list faz `.then((r) => r.entries)`: devolver array cru quebra
    // com '(intermediate value).filter is not a function' dentro de resolveDirectory.
    if (url.includes('/fs/list')) return json({ entries: [{ uri: `${RAIZ}/a.ts`, name: 'a.ts', kind: 'file' }] })
    if (url.includes('/fs/statBatch')) {
      // O port exige results.length === uris.length, senão lança 'Resposta inválida
      // do lote de stat'. Responder com o mesmo tamanho do pedido.
      let uris: string[] = []
      try { uris = (JSON.parse(String(init?.body ?? '{}')) as { uris?: string[] }).uris ?? [] } catch { uris = [] }
      return json({ results: uris.map((u) => ({ ok: true, stat: { uri: u, size: 10, mtimeMs: 0, readonly: false, kind: u === RAIZ ? 'directory' : 'file' } })) })
    }
    if (url.includes('/fs/stat')) return json({ uri: uriNoBody || RAIZ, size: 10, mtimeMs: 0, readonly: false, kind: ehRaiz ? 'directory' : 'file' })
    if (url.includes('/fs/read')) return json({ content: 'const a = 1\n', encoding: 'utf-8' })
    if (url.includes('/fs/write')) return json({ ok: true })
    if (url.includes('/fs/workspace')) return json({ ok: true })
    if (url.includes('/api/providers')) return json({ provedores: [], ativo: null, storage: 'fixture', catalogo: [] })
    if (url.includes('/api/config')) return json({ autoScrollChat: true })
    if (url.includes('/api/')) return json({ ok: true })
    return json({})
  })
})

/** O módulo montado pelo App, pelo gancho DEV — o mesmo que o E2E da 4.7 usa. */
async function moduloMontado(): Promise<IExplorerSearchModule> {
  await waitFor(() => {
    expect((window as { __explorerSearchModule?: unknown }).__explorerSearchModule,
      'o App não expôs o módulo: o gancho DEV existe só com import.meta.env.DEV').toBeTruthy()
  }, { timeout: 15000 })
  return (window as unknown as { __explorerSearchModule: IExplorerSearchModule }).__explorerSearchModule
}

/** Abre o arquivo em TODAS as sessões das fixtures: seja qual for a ativa, a aba
 *  projetada aparece na faixa. Evita depender de qual sessão o App escolheu. */
async function abrirArquivoNoModulo(mod: IExplorerSearchModule): Promise<void> {
  for (const sessao of testSessions) {
    await mod.attach.open({ uri: ARQ_A, kind: 'code', sessionId: sessao.id, pinned: true })
  }
}

const faixa = () => within(document.querySelector('.editor-tabs') as HTMLElement)

describe('Fatia 15 Onda 2c-i — o App atravessa a fronteira (D148 §3)', () => {
  it('1. as abas abertas no módulo aparecem na faixa CENTRAL, e o corpo capaz é montado', async () => {
    render(<App />)
    const mod = await moduloMontado()
    await abrirArquivoNoModulo(mod)

    // RF15-2/RF15-3: a aba do módulo vira irmã na faixa do centro.
    await waitFor(() => expect(faixa().queryByRole('tab', { name: /a\.ts/ })).toBeTruthy(), { timeout: 10000 })
    // D148 §2: o App montou o corpo no centro (o host existe e o slot do módulo também).
    await waitFor(() => expect(document.querySelector('[data-testid="center-code-editor-slot"]')).toBeTruthy(), { timeout: 10000 })
  })

  it('2. clicar na aba projetada diz ao MÓDULO que aquela uri é a ativa (activateTab)', async () => {
    render(<App />)
    const mod = await moduloMontado()
    await abrirArquivoNoModulo(mod)
    await waitFor(() => expect(faixa().queryByRole('tab', { name: /a\.ts/ })).toBeTruthy(), { timeout: 10000 })

    const sessaoComAba = testSessions.find((s) => mod.attach.getTabs({ sessionId: s.id }).some((t) => t.uri === ARQ_A))
    expect(sessaoComAba, 'nenhuma sessão tem a aba aberta').toBeTruthy()

    // Tira a uri do posto de ativa por outra abertura, para o clique ter o que mudar.
    await mod.attach.open({ uri: `${RAIZ}/b.ts` as WorkspaceUri, kind: 'code', sessionId: sessaoComAba!.id, pinned: true })
    expect(mod.attach.getTabs({ sessionId: sessaoComAba!.id }).find((t) => t.uri === ARQ_A)?.active).toBe(false)

    fireEvent.click(faixa().getByRole('tab', { name: /a\.ts/ }))

    // Só o EditorService do módulo sabe quem está ativa: se ele mudou, o App
    // atravessou a fronteira. Nenhum mock foi consultado para isto.
    await waitFor(() => {
      expect(mod.attach.getTabs({ sessionId: sessaoComAba!.id }).find((t) => t.uri === ARQ_A)?.active).toBe(true)
    }, { timeout: 5000 })
  })

  it('3. fechar a aba projetada pelo X da faixa abre o diálogo do MÓDULO (requestCloseTab)', async () => {
    render(<App />)
    const mod = await moduloMontado()
    await abrirArquivoNoModulo(mod)
    await waitFor(() => expect(faixa().queryByRole('tab', { name: /a\.ts/ })).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(faixa().getByRole('tab', { name: /a\.ts/ }))

    // O X da faixa é do shell; o diálogo é do módulo. Ele aparecer prova as duas
    // pontas: o pedido atravessou E o corpo central está montado para atendê-lo.
    // `setEditorTabs` não é chamado neste caminho (D148 §3) — quem salva ou
    // descarta é o módulo, nunca o estado do App.
    fireEvent.click(screen.getByLabelText('Fechar a.ts'))
    await waitFor(() => expect(screen.getByTestId('center-save-dialog')).toBeTruthy(), { timeout: 5000 })
    expect(screen.getByTestId('center-save-dialog').textContent).toContain('Deseja salvar as alterações feitas em a.ts?')

    // Cancelar não fecha: a aba continua no módulo e na faixa.
    fireEvent.click(within(screen.getByTestId('center-save-dialog')).getByText('Cancelar'))
    await waitFor(() => expect(screen.queryByTestId('center-save-dialog')).toBeNull())
    expect(faixa().queryByRole('tab', { name: /a\.ts/ })).toBeTruthy()
  })

  it('4. o corpo montado no centro é o CenterCodeEditor REAL do módulo', async () => {
    render(<App />)
    const mod = await moduloMontado()
    await abrirArquivoNoModulo(mod)
    await waitFor(() => expect(faixa().queryByRole('tab', { name: /a\.ts/ })).toBeTruthy(), { timeout: 10000 })

    // O slot do App montou o componente do módulo, não um placeholder: o testid é
    // o do CenterCodeEditor (Onda 2b). É isto que torna o corpo capaz alcançável
    // pela interface — antes do 2c-i ele existia e estava testado, mas nada o
    // montava no centro, então a RF15-1 não era acessível ao usuário.
    await waitFor(() => expect(screen.getByTestId('center-code-editor')).toBeTruthy(), { timeout: 10000 })

    // LIMITE DO AMBIENTE, registrado em vez de escondido: em jsdom o Monaco não
    // carrega, então `onEditorReady` nunca regista a api do painel e `attach.save`
    // rejeita na guarda de "painel que tem a uri". Isso não é defeito do 2c-i — é o
    // mesmo limite que já constava como não verificado. A prova de que o save
    // GRAVA em disco quando a api existe está em centerSaveRouting.test.tsx
    // (11 provas, dentro do módulo, com o CodeEditorPane em dublê). Continua como
    // homologação humana pendente: Ctrl+S real no navegador gravando no disco.
    await expect(mod.attach.save({ uri: ARQ_A })).rejects.toThrow(/attach\.save/)
  })
})
