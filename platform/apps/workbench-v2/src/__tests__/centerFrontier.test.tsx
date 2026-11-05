// ============================================================================
// src/__tests__/centerFrontier.test.tsx — Fatia 15, Onda 2c-i (D148).
//
// O que este arquivo policia: a LIGAÇÃO do corpo capaz de salvar ao centro, e a
// fronteira entre as abas nativas do App e as abas projetadas do módulo.
//
// Por que renderizando o EditorArea e não o App: o App.test.tsx é a trava de 62
// testes e leva 73 s; o que o 2c-i muda no EditorArea são ramos de renderização
// decididos por props, então renderizar o componente com as props novas prova o
// comportamento de forma direta e barata. O lado do App (activateTab e
// requestCloseTab atravessando a fronteira) é provado em centerFrontierApp.test.tsx.
//
// Fronteira respeitada (FT-01/FT-02 do frontier.test.ts): nada aqui importa
// abaixo do barrel do módulo — `WorkspaceUri` vem de '../modules/explorer-search'
// e as abas são produzidas por `projetarAbasDoModulo`, que é do SHELL.
//
// O Monaco é dublê de propósito: quem prova que o Monaco real grava em disco é o
// centerSaveRouting.test.tsx (Onda 2b). Aqui a pergunta é outra — QUAL corpo o
// centro escolhe mostrar para cada aba.
// ============================================================================
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { EditorArea } from '../components/EditorArea'
import { projetarAbasDoModulo } from '../shell/ponteAnexo'
import type { Aba } from '../shell/abas'
import type { SidePaneState } from '../domain/sidePane'
import type { WorkspaceUri } from '../modules/explorer-search'
import type { EditorTab } from '../types'

vi.mock('@monaco-editor/react', async () => {
  const { createElement } = await import('react')
  return {
    default: (p: { value?: string }) =>
      createElement('div', { 'data-testid': 'monaco-stub', 'data-value': String(p.value ?? '') }),
    DiffEditor: () => createElement('div', { 'data-testid': 'diff-editor-stub' }),
  }
})

type Props = React.ComponentProps<typeof EditorArea>

const SESSAO = 's1'
const URI_A = 'file:///trabalho/a.ts' as WorkspaceUri
const URI_B = 'file:///trabalho/b.ts' as WorkspaceUri

/** Abas do módulo como a projeção real do shell as produz (id `sessionId::uri`). */
function abasDoModulo(ativa?: WorkspaceUri): readonly Aba[] {
  return projetarAbasDoModulo(SESSAO, [
    { uri: URI_A, kind: 'code', dirty: true, active: ativa === URI_A || ativa === undefined },
    { uri: URI_B, kind: 'code', dirty: false, active: ativa === URI_B },
  ])
}

/** Aba nativa demo: `content == null` e sem `isRealFile` — os três caminhos sem disco. */
const abaDemo = (id: string): EditorTab => ({
  id, type: 'file', title: 'Files', path: 'workspace', sessionId: SESSAO,
})

/** Aba nativa com conteúdo real lido pelo App (o caminho do `<Editor>` que não salva). */
const abaComConteudo = (id: string, content: string): EditorTab => ({
  id, type: 'file', title: 'a.ts', path: '/trabalho/a.ts', sessionId: SESSAO, content, isRealFile: true,
})

const corpoFalso: ReactNode = <div data-testid="corpo-capaz-falso">corpo capaz</div>

function propsBase(sobre: Partial<Props> = {}): Props {
  return {
    activeSessionId: SESSAO,
    tabs: [],
    activeTabId: undefined,
    browserViews: [],
    searchQuery: '',
    searchResults: [],
    searchFocusRequest: 0,
    diffFiles: [],
    onSelectTab: vi.fn(),
    onCloseTab: vi.fn(),
    onReorderTabs: vi.fn(),
    onNewBrowser: vi.fn(),
    onNewFile: vi.fn(),
    onNewSearch: vi.fn(),
    onNewDiff: vi.fn(),
    onNavigateBrowser: vi.fn(),
    onBrowserBack: vi.fn(),
    onBrowserForward: vi.fn(),
    onReloadBrowser: vi.fn(),
    onBrowserStatus: vi.fn(),
    onChangeViewport: vi.fn(),
    onChangeSearchQuery: vi.fn(),
    onOpenSearchResult: vi.fn(),
    onSelectDiffFile: vi.fn(),
    onAcceptDiff: vi.fn(),
    onRevertDiff: vi.fn(),
    onAcceptAllDiff: vi.fn(),
    onRevertAllDiff: vi.fn(),
    onToggleViewed: vi.fn(),
    onCommit: vi.fn(),
    onCreatePr: vi.fn(),
    editorMaximized: false,
    onToggleMaximize: vi.fn(),
    onSplit: vi.fn(),
    editorContentVisible: true,
    sidePaneState: 'editor-only' as SidePaneState,
    onToggleEditorHidden: vi.fn(),
    onNewCustomizations: vi.fn(),
    customizationsSurface: null,
    providersSurface: null,
    configSurface: null,
    ...sobre,
  }
}

const host = () => document.querySelector('[data-testid="center-code-editor-host"]') as HTMLElement | null

describe('Fatia 15 Onda 2c-i — a fronteira das abas no centro (D148)', () => {
  it('1. as abas do módulo aparecem na faixa central como irmãs das nativas', () => {
    render(propsBaseRender({ tabs: [{ ...abaDemo('demo'), type: 'browser', title: 'Browser' }], frontierTabs: abasDoModulo() }))
    const faixa = screen.getByRole('tablist', { name: 'Abas do editor' })
    const nomes = Array.from(faixa.querySelectorAll('[role="tab"]')).map((t) => t.textContent ?? '')
    // RF15-2/RF15-3: o que o módulo tem aberto aparece ao lado do que o App tem.
    expect(nomes.some((n) => n.includes('Browser'))).toBe(true)
    expect(nomes.some((n) => n.includes('a.ts'))).toBe(true)
    expect(nomes.some((n) => n.includes('b.ts'))).toBe(true)
  })

  it('2. aba de fronteira ativa com slot: o host fica VISÍVEL e o corpo é renderizado', () => {
    const projetadas = abasDoModulo(URI_A)
    render(propsBaseRender({ frontierTabs: projetadas, activeTabId: projetadas[0].id, codeEditorSlot: corpoFalso }))
    expect(host()).not.toBeNull()
    expect(host()!.style.display).toBe('contents')
    expect(screen.getByTestId('corpo-capaz-falso')).toBeTruthy()
  })

  it('3. aba de fronteira ativa com slot: nenhum dos três estados demo aparece', () => {
    const projetadas = abasDoModulo(URI_A)
    render(propsBaseRender({ frontierTabs: projetadas, activeTabId: projetadas[0].id, codeEditorSlot: corpoFalso }))
    // A projeção não carrega `content` de propósito: sem estes guardas o centro
    // mostraria "conteúdo indisponível" AO LADO do corpo que sabe ler o disco.
    expect(screen.queryByTestId('file-content-unavailable')).toBeNull()
    expect(screen.queryByTestId('file-read-error')).toBeNull()
    expect(screen.queryByTestId('monaco-stub')).toBeNull()
  })

  it('4. aba nativa demo ativa com o slot MONTADO: host oculto e o estado honesto sobrevive', () => {
    // O App mantém o corpo montado enquanto houver aba de arquivo do módulo, para
    // que requestCloseTab de uma aba irmã tenha atendente. Montado ≠ em uso: quem
    // decide é a identidade da aba ativa. Sem esta distinção a demo perderia o
    // estado honesto que a D148 §2 manda preservar.
    render(propsBaseRender({ tabs: [abaDemo('demo')], activeTabId: 'demo', frontierTabs: abasDoModulo(), codeEditorSlot: corpoFalso }))
    expect(host()).not.toBeNull()
    expect(host()!.style.display).toBe('none')
    expect(screen.getByTestId('file-content-unavailable')).toBeTruthy()
    // O corpo CONTINUA MONTADO, apenas oculto — display:none não remove do DOM, e é
    // assim de propósito: é o que dá atendente a requestCloseTab de uma aba irmã
    // (D147 §5). A primeira versão desta prova exigia null aqui, o que seria exigir
    // desmontar; o correto é exigir invisível na caixa, presente na árvore.
    expect(screen.getByTestId('corpo-capaz-falso')).toBeTruthy()
  })

  it('5. aba de fronteira ativa sem mountCodeEditor: o centro FALHA VISÍVEL com a mensagem', () => {
    const projetadas = abasDoModulo(URI_A)
    const mensagem = 'O módulo desta cópia não oferece mountCodeEditor.'
    render(propsBaseRender({ frontierTabs: projetadas, activeTabId: projetadas[0].id, codeEditorUnavailable: mensagem }))
    const estado = screen.getByTestId('center-code-editor-unavailable')
    expect(estado.textContent).toContain(mensagem)
    // D148 §4: nunca cair em silêncio no <Editor> que não salva.
    expect(screen.queryByTestId('monaco-stub')).toBeNull()
    expect(screen.queryByTestId('file-content-unavailable')).toBeNull()
  })

  it('6. clique na aba de fronteira chama onSelectTab com o id fundido', () => {
    const projetadas = abasDoModulo(URI_B)
    const onSelectTab = vi.fn()
    render(propsBaseRender({ frontierTabs: projetadas, activeTabId: projetadas[1].id, onSelectTab, codeEditorSlot: corpoFalso }))
    const aba = Array.from(document.querySelectorAll('[role="tab"]')).find((t) => (t.textContent ?? '').includes('a.ts'))
    expect(aba).toBeTruthy()
    fireEvent.click(aba!)
    expect(onSelectTab).toHaveBeenCalledWith(`${SESSAO}::${URI_A}`)
  })

  it('7. fechar a aba de fronteira chama onCloseTab com o id fundido', () => {
    const projetadas = abasDoModulo(URI_A)
    const onCloseTab = vi.fn()
    render(propsBaseRender({ frontierTabs: projetadas, activeTabId: projetadas[0].id, onCloseTab, codeEditorSlot: corpoFalso }))
    // O botão existe porque isTabCloseable devolve true em 'editor-only' — em
    // 'detail-only' a aba type 'file' é gerenciada e o X dá lugar ao aviso.
    fireEvent.click(screen.getByLabelText('Fechar a.ts'))
    expect(onCloseTab).toHaveBeenCalledWith(`${SESSAO}::${URI_A}`)
  })

  it('8. aba nativa com conteúdo real continua no Editor atual enquanto o slot serve outra aba', () => {
    // O 2c-i NÃO muda o caminho que já funciona: clique na árvore do App cria aba
    // nativa com content, e ela segue no <Editor> de sempre. Trocar esse caminho é
    // o 2c-ii (D148 §5), em commit próprio e revertível.
    render(propsBaseRender({
      tabs: [abaComConteudo('n1', 'const a = 1')], activeTabId: 'n1',
      frontierTabs: abasDoModulo(), codeEditorSlot: corpoFalso,
    }))
    const monaco = screen.getByTestId('monaco-stub')
    expect(monaco.getAttribute('data-value')).toBe('const a = 1')
    expect(host()!.style.display).toBe('none')
  })

  it('9. sem frontierTabs o centro se comporta exatamente como antes (regressão zero)', () => {
    render(propsBaseRender({ tabs: [abaDemo('demo')], activeTabId: 'demo' }))
    expect(host()).toBeNull()
    expect(screen.getByTestId('file-content-unavailable')).toBeTruthy()
    expect(screen.queryByTestId('center-code-editor-unavailable')).toBeNull()
  })
})

/** Renderiza com cleanup implícito do testing-library entre testes. */
function propsBaseRender(sobre: Partial<Props> = {}) {
  const props = propsBase(sobre)
  return <EditorArea {...props} />
}
