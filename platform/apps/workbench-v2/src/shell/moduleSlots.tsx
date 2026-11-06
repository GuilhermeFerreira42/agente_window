// ============================================================================
// shell/moduleSlots.tsx — Fatia 15, Onda 3 (D160).
//
// Os slots que o SHELL oferece ao módulo explorer-search. Cada um é um `div`
// `display:contents` onde o módulo monta o próprio DOM; o shell nunca alcança
// abaixo do barrel (Regra 3) e o módulo nunca alcança o layout do shell.
//
// Por que estes quatro saíram do App.tsx: eles são a FRONTEIRA shell↔módulo, e
// estavam no meio de 2 500 linhas de estado de sessão/layout/chat. Aqui a
// fronteira fica num lugar só, visível de uma olhada, e o App fica com o que é
// dele: estado e orquestração. Nenhum comportamento mudou — os componentes são
// os mesmos, byte a byte, só mudaram de arquivo.
//
// Padrão comum: `useRef` + efeito de mount + efeito de cleanup no unmount. O
// estado do SERVIÇO sobrevive ao remount, porque ele mora no módulo, não aqui.
// ============================================================================
import React, { useCallback, useEffect, useRef } from 'react'
import type { IExplorerSearchModule } from '../modules/explorer-search'

/** FATIA-04 (4.4): slot DOM do módulo explorer-search.
 *  O mount/unmount REAL é do módulo (DOM só dentro do slot; o estado do serviço
 *  sobrevive a remount). Usa `useCallback` como ref: o React chama a função com
 *  `null` no unmount e com o elemento no mount — não há efeito separado. */
export function ExplorerModuleSlot({ module }: { module: IExplorerSearchModule }) {
  const hostRef = useCallback((el: HTMLDivElement | null) => {
    if (el) module.mount(el)
    else module.unmount()
  }, [module])
  return <div ref={hostRef} style={{ display: 'contents' }} data-testid="explorer-module-slot" />
}

/** FATIA-04 4.6 (opção A aprovada 2026-09-25): slot da aba Search → módulo real.
 *  Mesmo padrão do ExplorerModuleSlot; `focusRequest` repassa o Ctrl+Shift+F. */
export function SearchModuleSlot({ module, focusRequest }: { module: IExplorerSearchModule; focusRequest: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (hostRef.current) module.mountSearch(hostRef.current, { focusRequest })
  }, [module, focusRequest])
  useEffect(() => () => module.unmountSearch(), [module])
  return <div ref={hostRef} style={{ display: 'contents' }} data-testid="search-module-slot" />
}

/** FATIA-15 Onda 3 (D166): slot da aba `Changes` do CORPO CENTRAL → o MESMO
 *  ChangesPane real da view `scm`. Host próprio (não é a view da Side Bar que
 *  mudou de lugar): o App mantém este slot montado e só alterna a visibilidade,
 *  do mesmo jeito que faz com o corpo de arquivo — desmontar perderia seleção e
 *  mensagem de commit a cada troca de aba (RF15-2). */
export function CenterChangesSlot({ module }: { module: IExplorerSearchModule }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (hostRef.current) module.mountChanges?.(hostRef.current)
  }, [module])
  useEffect(() => () => module.unmountChanges?.(), [module])
  return <div ref={hostRef} style={{ display: 'contents' }} data-testid="center-changes-slot" />
}

/** FATIA-05 5.3: slot da view `scm` da Side Bar → Source Control View real.
 *  Mesmo padrão do SearchModuleSlot (mount 1×; troca de view = display flex/none). */
export function ScmModuleSlot({ module }: { module: IExplorerSearchModule }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (hostRef.current) module.mountScm(hostRef.current)
  }, [module])
  useEffect(() => () => module.unmountScm(), [module])
  return <div ref={hostRef} style={{ display: 'contents' }} data-testid="scm-module-slot" />
}

/**
 * FATIA 15 Onda 2c-i (D148 §2) — Fatia 15 Onda 2c-ii (D155/D156): o corpo da aba
 * central, ÚNICA superfície de edição desde que a coluna saiu.
 *
 * Espelho do antigo `AttachModuleSlot`: `mountCodeEditor` no efeito e
 * `unmountCodeEditor` no cleanup. Sem equivalente a `pendingAttachOpen` — abrir
 * arquivo no centro é decisão do shell, que já sabe a uri.
 */
export function CenterCodeEditorSlot({ module, sessionId }: { module: IExplorerSearchModule; sessionId: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (hostRef.current) module.mountCodeEditor?.(hostRef.current, { sessionId })
  }, [module, sessionId])
  useEffect(() => () => module.unmountCodeEditor?.(), [module])
  return <div ref={hostRef} style={{ display: 'contents' }} data-testid="center-code-editor-slot" />
}
