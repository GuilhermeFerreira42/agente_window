// ============================================================================
// shell/gitTransition.ts — "Transição Temporária 4.7-b" (docs/12).
//
// O shell da réplica tem uma aba "Changes N" no painel Detalhes alimentada por
// dados simulados (`src/data.ts` → initialDiffFiles). A 4.7-b entregou a aba
// "Changes" REAL (Source Control View com git do SO) dentro do Editor Anexo.
// Enquanto a maquete não é removida de vez, esta função decide, num único
// lugar, se a aba simulada deve ser escondida:
//   - módulo explorer-search carregado (git real disponível) → esconde a maquete
//     e força a aba Files (que dá acesso ao Git real).
//   - módulo ausente/falhou → maquete continua (fallback: nunca tela vazia).
// Remoção definitiva: quando a maquete "Changes" do shell for aposentada
// (pós-homologação 4.7-b), apagar este arquivo, a prop `hideChangesTab` do
// AuxiliaryBar e o import em App.tsx.
// ============================================================================
import { useEffect } from 'react'
import type { IExplorerSearchModule } from '../modules/explorer-search'

export type AuxiliaryTab = 'changes' | 'files'

/** A aba simulada deve ser escondida? Só quando o módulo real está de pé. */
export function shouldHideMockChanges(explorerModule: IExplorerSearchModule | null | undefined): boolean {
  return Boolean(explorerModule && typeof explorerModule.attach?.open === 'function')
}

/** Mantém a aba do painel Detalhes coerente: se a maquete está escondida e a
 *  aba corrente é 'changes' (default do shell, ou setada por openDiff), volta
 *  para 'files'. Devolve a decisão para o JSX. */
export function useMockChangesTransition(
  explorerModule: IExplorerSearchModule | null | undefined,
  tab: AuxiliaryTab,
  setTab: (tab: AuxiliaryTab) => void,
): boolean {
  const hide = shouldHideMockChanges(explorerModule)
  useEffect(() => {
    if (hide && tab === 'changes') setTab('files')
  }, [hide, tab, setTab])
  return hide
}
