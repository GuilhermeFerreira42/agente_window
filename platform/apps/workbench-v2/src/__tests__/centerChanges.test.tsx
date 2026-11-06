// ============================================================================
// Fatia 15 — Onda 3 (D166): a aba `Changes` do centro deixa de ser demonstração.
//
// O que existia até aqui: a aba `diff` renderizava o `DiffView` do EditorArea, que
// pinta `diffFiles` — e `diffFilesBySession` nasce `{}` e permanece vazio desde a
// 5.3 (o comentário no App diz isso literalmente). Ou seja: o centro abria uma
// aba chamada "Branch Changes" cujo corpo era um estado vazio honesto, enquanto o
// painel REAL (ChangesPane + GitService) vivia só na view `scm` da Side Bar.
//
// O que passa a existir: o App monta `CenterChangesSlot` e o repassa como
// `changesSlot`; o EditorArea o usa como corpo da aba `diff`. O `DiffView` mock
// fica como fallback de shell-sem-módulo — não é apagado, porque apagá-lo agora
// quebraria a única renderização existente quando o slot não vier.
//
// Estas 3 provas policiam o LADO DO SHELL (o EditorArea, que é onde a escolha do
// corpo acontece). O lado do módulo — que `mountChanges` monta o ChangesPane real
// e NÃO rouba o host da Side Bar — é provado em
// modules/explorer-search/__tests__/centerChangesMount.test.tsx.
// ============================================================================
import React, { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { EditorArea } from '../components/EditorArea'
import type { SidePaneState } from '../domain/sidePane'
import type { EditorTab } from '../types'

type Props = React.ComponentProps<typeof EditorArea>

const SESSAO = 's1'

const abaChanges: EditorTab = { id: 'ch', type: 'diff', title: 'Branch Changes', sessionId: SESSAO }
const abaArquivo: EditorTab = { id: 'arq', type: 'file', title: 'a.ts', path: 'a.ts', sessionId: SESSAO }

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

const renderArea = (sobre: Partial<Props> = {}) => render(<EditorArea {...propsBase(sobre)} />)
const hostChanges = () => screen.queryByTestId('center-changes-host') as HTMLElement | null

describe('Fatia 15 Onda 3 (D166) — a aba Changes do centro mostra o painel real', () => {
  it('1. com slot, o corpo da aba `diff` é o painel do módulo e o mock NÃO aparece', () => {
    const corpoReal: ReactNode = <div data-testid="changes-real">painel real</div>
    renderArea({ tabs: [abaChanges], activeTabId: 'ch', changesSlot: corpoReal })

    expect(screen.getByTestId('changes-real')).toBeTruthy()
    // O mock é o `DiffView`, que sempre desenha o empty state quando a lista está
    // vazia. Se ele aparecesse junto, haveria DOIS corpos para a mesma aba.
    expect(screen.queryByTestId('diff-empty-state')).toBeNull()
    expect(hostChanges()!.style.display).toBe('contents')
  })

  it('2. trocar de aba e voltar NÃO desmonta o painel (RF15-2: nada de perder estado)', () => {
    const corpoReal: ReactNode = <div data-testid="changes-real">painel real</div>
    const { rerender } = render(<EditorArea {...propsBase({ tabs: [abaChanges, abaArquivo], activeTabId: 'ch', changesSlot: corpoReal })} />)
    const painelAntes = screen.getByTestId('changes-real')

    // Sai da aba Changes: o host continua no DOM, só oculto.
    rerender(<EditorArea {...propsBase({ tabs: [abaChanges, abaArquivo], activeTabId: 'arq', changesSlot: corpoReal })} />)
    expect(hostChanges()!.style.display).toBe('none')
    expect(screen.getByTestId('changes-real')).toBe(painelAntes)

    // Volta: o MESMO nó (mesma referência), sinal de que não houve remontagem —
    // num painel com seleção de arquivo e mensagem de commit, remontar é perder tudo.
    rerender(<EditorArea {...propsBase({ tabs: [abaChanges, abaArquivo], activeTabId: 'ch', changesSlot: corpoReal })} />)
    expect(screen.getByTestId('changes-real')).toBe(painelAntes)
    expect(hostChanges()!.style.display).toBe('contents')
  })

  it('3. sem slot (shell sem módulo) o mock continua sendo o corpo — fallback preservado', () => {
    renderArea({ tabs: [abaChanges], activeTabId: 'ch' })
    expect(hostChanges()).toBeNull()
    expect(screen.getByTestId('diff-empty-state')).toBeTruthy()
  })
})
