import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorArea } from '../components/EditorArea'
import type { Aba } from '../shell/abas'

/**
 * D170 — a faixa central precisa MOSTRAR que a aba tem alteração não salva.
 *
 * DEFEITO MEDIDO em navegador real (2026-11-06, pós-`3eec773`): editar
 * `data.ts` no centro mudava o texto (`ZZimport type …`) e marcava a aba como
 * suja no EditorService (`setDirty` emitia `dirtyChanged`, confirmado por
 * instrumentação: `achouAba: true`, `dirty: true`). Mesmo assim a faixa
 * desenhava `aria-label="data.ts"` e o botão dizia `Fechar data.ts` — nunca
 * `, unsaved` / `Close (unsaved)`. O `EditorTabs` do módulo (coluna) fazia
 * certo; a faixa do shell, que desde a D169 é a única superfície visível,
 * simplesmente ignorava `tab.dirty`. Consequência: o usuário não tinha como
 * saber que fechar aquela aba abriria o diálogo Salvar/Não Salvar, e podia
 * descartar trabalho sem aviso.
 *
 * O que estes testes protegem (e que um ajuste "só de CSS" não protegeria):
 *  1. `dirty` vira CLASSE (é o que pinta o ponto no lugar do X);
 *  2. `dirty` vira RÓTULO acessível — leitor de tela e teste E2E ouvem
 *     "não salvo", não só veem um pixel;
 *  3. aba limpa NÃO ganha a marca (senão a marca deixa de significar algo);
 *  4. o X continua fechando a aba suja, para o diálogo do c5 responder.
 */

function aba(over: Partial<Aba> = {}): Aba {
  return { id: 'a1', type: 'file', title: 'data.ts', ...over } as Aba
}

function montar(tabs: Aba[], over: Partial<React.ComponentProps<typeof EditorArea>> = {}) {
  const onCloseTab = vi.fn()
  const onOpenToSide = vi.fn()
  render(
    <EditorArea
      activeSessionId="s1"
      tabs={tabs as never}
      activeTabId={tabs[0]?.id}
      browserViews={[]}
      searchQuery=""
      searchResults={[]}
      searchFocusRequest={0}
      diffFiles={[]}
      onSelectTab={vi.fn()}
      onCloseTab={onCloseTab}
      onOpenToSide={onOpenToSide}
      onReorderTabs={vi.fn()}
      onNewBrowser={vi.fn()}
      onNewDiff={vi.fn()}
      onNavigateBrowser={vi.fn()}
      onBrowserBack={vi.fn()}
      onBrowserForward={vi.fn()}
      onReloadBrowser={vi.fn()}
      onBrowserStatus={vi.fn()}
      onChangeViewport={vi.fn()}
      onChangeSearchQuery={vi.fn()}
      onOpenSearchResult={vi.fn()}
      onSelectDiffFile={vi.fn()}
      onAcceptDiff={vi.fn()}
      onRevertDiff={vi.fn()}
      onAcceptAllDiff={vi.fn()}
      onRevertAllDiff={vi.fn()}
      onToggleViewed={vi.fn()}
      onCommit={vi.fn()}
      onCreatePr={vi.fn()}
      editorMaximized={false}
      onToggleMaximize={vi.fn()}
      onSplit={vi.fn()}
      editorContentVisible
      sidePaneState={{ mode: 'attached', detailOnly: false } as never}
      onToggleEditorHidden={vi.fn()}
      onNewCustomizations={vi.fn()}
      // Superfícies do centro que o App injeta: o teste não as exercita, mas o
      // tipo exige presença — passar `null` é o mesmo que "sem slot".
      customizationsSurface={null}
      providersSurface={null}
      configSurface={null}
      {...over}
    />,
  )
  return { onCloseTab, onOpenToSide }
}

describe('D170 — a faixa central mostra alteração não salva', () => {
  it('aba suja: o rótulo acessível diz "não salvo" e a classe marca a aba', () => {
    montar([aba({ dirty: true })])
    const tab = screen.getByRole('tab', { name: /unsaved|não salv/i })
    expect(tab.className).toContain('is-dirty')
    // O X também muda de rótulo: é ele que o usuário aperta quando quer fechar,
    // e é o texto que o teste E2E usa para distinguir "fechar" de "descartar".
    expect(screen.getByRole('button', { name: /Close \(unsaved\)|não salvo/i })).toBeTruthy()
  })

  it('aba limpa NÃO ganha a marca (a marca precisa significar algo)', () => {
    montar([aba()])
    const tab = screen.getByRole('tab', { name: 'data.ts' })
    expect(tab.className).not.toContain('is-dirty')
    expect(screen.queryByRole('button', { name: /unsaved|não salv/i })).toBeNull()
  })

  it('D170-b: o menu da aba oferece "Abrir ao lado" (a dica do painel 2 manda usar isso)', () => {
    // DEFEITO MEDIDO no browser: `CenterSplitPane` diz "…ou use «Abrir ao lado»
    // na aba", e o menu de contexto da aba só oferecia Abrir aba / Fechar aba /
    // Dividir editor. A dica mandava usar o que não existia. O caminho por
    // `moveTab` já estava implementado no EditorService (D169) mas sem chamador
    // de UI — mecanismo sem botão.
    const { onOpenToSide } = montar([aba()])
    fireEvent.contextMenu(screen.getByRole('tab', { name: 'data.ts' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Abrir ao lado' }))
    expect(onOpenToSide).toHaveBeenCalledWith('a1')
  })

  it('o X da aba suja ainda pede o fechamento (o diálogo do c5 é quem responde)', () => {
    const { onCloseTab } = montar([aba({ dirty: true })])
    fireEvent.click(screen.getByRole('button', { name: /Close \(unsaved\)|não salvo/i }))
    expect(onCloseTab).toHaveBeenCalledWith('a1')
  })
})
