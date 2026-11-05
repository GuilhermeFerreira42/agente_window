// ============================================================================
// src/__tests__/centerCorpoDoModulo.test.tsx — Fatia 15, Onda 2c-ii (D152).
//
// O que este arquivo policia, e por que ele existe separado do centerFrontierApp:
//   1. a SUPERFÍCIE do módulo pode ser o CENTRO mesmo sem a coluna montada
//      (D152 §1) — sem isso, desligar a coluna deixaria toda abertura pendente
//      para sempre, e é justamente esse o passo que vem em seguida;
//   2. o corpo do centro serve DOIS tipos do módulo (`file` e `diff-arquivo`),
//      reaproveitando o DiffPane real (D152 §2) — o Source Control migra para
//      o contêiner central em vez de ficar sem corpo quando a coluna sair.
//
// O acesso ao módulo é pelo gancho DEV `window.__explorerSearchModule`, o mesmo
// que o E2E da 4.7 e o centerFrontierApp usam.
// ============================================================================
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { testSessions } from './fixtures/sessions'
import type { IExplorerSearchModule, WorkspaceUri } from '../modules/explorer-search'

// Mesmo motivo do centerFrontierApp: o CodeEditorPane é REAL aqui, e o stub do
// projeto faz `editor.create()` LANÇAR dentro de um `.then` sem `.catch`. Mockar o
// PACOTE (não o componente) mantém FT-01 intacto — `monaco-editor` é externo.
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
    // `getLanguages` NÃO é decoração: CodeEditorPane.languageFor (L50) itera o
    // retorno dele ao abrir qualquer arquivo. Sem esta linha o dublê derruba o
    // DiffPane e o DiffPaneBoundary mostra o aviso honesto — o teste passaria a
    // medir o dublê, não o produto.
    languages: {
      register: () => undefined, setMonarchTokensProvider: () => descartavel,
      registerCompletionItemProvider: () => descartavel,
      getLanguages: () => [{ id: 'typescript', extensions: ['.ts'] }],
    },
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
    let uriNoBody = ''
    try { uriNoBody = String((JSON.parse(String(init?.body ?? '{}')) as { uri?: unknown }).uri ?? '') } catch { uriNoBody = '' }
    const ehRaiz = uriNoBody === RAIZ || url.includes(encodeURIComponent(RAIZ))
    if (url.includes('/fs/root')) return json({ root: RAIZ })
    if (url.includes('/fs/list')) return json({ entries: [{ uri: ARQ_A, name: 'a.ts', kind: 'file' }] })
    if (url.includes('/fs/statBatch')) {
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

async function moduloMontado(): Promise<IExplorerSearchModule> {
  await waitFor(() => {
    expect((window as { __explorerSearchModule?: unknown }).__explorerSearchModule,
      'o App não expôs o módulo: o gancho DEV existe só com import.meta.env.DEV').toBeTruthy()
  }, { timeout: 15000 })
  return (window as unknown as { __explorerSearchModule: IExplorerSearchModule }).__explorerSearchModule
}

const faixa = () => within(document.querySelector('.editor-tabs') as HTMLElement)

/**
 * Escopo do CORPO DO CENTRO.
 *
 * Existe porque `attach-diff-pane` aparece DUAS vezes enquanto a sobreposição da
 * D151 §2/§3 durar: uma no Editor Anexo (coluna, que o 2c-ii ainda vai desligar) e
 * outra no centro (o alvo). Contar ocorrências globais mediria as duas superfícies
 * juntas e esconderia justamente o que se quer provar. Depois do passo C, quando a
 * coluna sair, este escopo continua correto — e passa a ser o único.
 */
const corpoDoCentro = () => within(document.querySelector('[data-testid="center-code-editor"]') as HTMLElement)

describe('Fatia 15 Onda 2c-ii — corpo do centro e superfície (D152)', () => {
  it('1. a abertura de arquivo chega ao EditorService mesmo ANTES de qualquer host montar', async () => {
    // D152 §1: a derivação da superfície usa o centro quando a coluna não está
    // montada. Aqui a prova não depende de paint: assim que o módulo existe,
    // `attach.open` tem de virar aba de verdade — nunca ficar pendente para sempre.
    render(<App />)
    const mod = await moduloMontado()
    const sessao = testSessions[0]

    await mod.attach.open({ uri: ARQ_A, kind: 'code', sessionId: sessao.id, pinned: true })

    await waitFor(() => {
      expect(mod.attach.getTabs({ sessionId: sessao.id }).map((t) => t.uri)).toContain(ARQ_A)
    }, { timeout: 10000 })
  })

  it('2. a aba de DIFF do módulo aparece na faixa central e o corpo do centro mostra o DiffPane real', async () => {
    // D152 §2: o Source Control abre `kind: 'diff'`; no centro ele é `diff-arquivo`.
    // Se o corpo não existisse, a aba apareceria na faixa e o conteúdo ficaria vazio
    // quando a coluna sair — o mesmo defeito que o `file-content-unavailable` evita
    // para arquivos.
    render(<App />)
    const mod = await moduloMontado()

    for (const sessao of testSessions) {
      await mod.attach.open({
        uri: ARQ_A,
        kind: 'diff',
        sessionId: sessao.id,
        pinned: true,
        diff: { resource: ARQ_A, title: 'a.ts (Working Tree)', original: 'const a = 0\n', modified: 'const a = 1\n' },
      })
    }

    await waitFor(() => expect(faixa().queryByRole('tab', { name: /a\.ts \(Working Tree\)/ })).toBeTruthy(), { timeout: 10000 })

    fireEvent.click(faixa().getByRole('tab', { name: /a\.ts \(Working Tree\)/ }))

    // O DiffPane é o componente REAL do módulo (`attach-diff-pane`), não um placeholder —
    // e tem de estar DENTRO do corpo do centro, que é o que o 2c-ii entrega.
    await waitFor(() => expect(corpoDoCentro().queryByTestId('attach-diff-pane')).toBeTruthy(), { timeout: 10000 })
  })

  it('3. alternar arquivo ↔ diff não desmonta o corpo (RF15-2: o estado do Monaco sobrevive)', async () => {
    render(<App />)
    const mod = await moduloMontado()
    // Abre em TODAS as sessões das fixtures: a aba projetada é por sessão, e a
    // prova não deve depender de qual delas o App elegeu como ativa.
    for (const sessao of testSessions) {
      await mod.attach.open({ uri: ARQ_A, kind: 'code', sessionId: sessao.id, pinned: true })
    }

    // O corpo é montado pelo módulo dentro do slot (root React próprio), então a
    // existência do slot NÃO implica o painel pronto — esperar o painel em si.
    await waitFor(() => expect(document.querySelector('[data-testid="center-code-editor"]')).toBeTruthy(), { timeout: 10000 })
    const painelAntes = document.querySelector('[data-testid="center-code-editor"]')

    for (const sessao of testSessions) {
      await mod.attach.open({
        uri: `file:///.explorer-search/diff` as WorkspaceUri,
        kind: 'diff',
        sessionId: sessao.id,
        pinned: true,
        diff: { resource: ARQ_A, title: 'a.ts (Working Tree)', original: 'const a = 0\n', modified: 'const a = 1\n' },
      })
    }
    // O corpo segue a ABA ATIVA DO SHELL, não o último open do módulo: clicar é o
    // gesto real do usuário e é ele que torna o diff a aba corrente da faixa.
    await waitFor(() => expect(faixa().queryByRole('tab', { name: /a\.ts \(Working Tree\)/ })).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(faixa().getByRole('tab', { name: /a\.ts \(Working Tree\)/ }))
    await waitFor(() => expect(corpoDoCentro().queryByTestId('attach-diff-pane')).toBeTruthy(), { timeout: 10000 })

    // A MESMA instância continua na árvore: o corpo é um só justamente para não
    // perder os modelos. Comparação por identidade de nó, não por testid.
    expect(document.querySelector('[data-testid="center-code-editor"]')).toBe(painelAntes)
  })
})
