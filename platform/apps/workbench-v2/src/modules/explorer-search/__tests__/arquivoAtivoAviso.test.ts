import { describe, expect, it, vi } from 'vitest'
import { createExplorerSearchModule } from '../index'
import type { WorkspaceUri } from '../contract'
import { FakeFsPort } from './fakeFs'
import { asWorkspaceUri } from '../core/uri'

/**
 * DEF-D169-5 — o Outline ficava com 0 linhas ("No symbols found in document")
 * para um `App.tsx` de 2772 linhas, no navegador real.
 *
 * O QUE A INSTRUMENTAÇÃO MOSTROU (2026-11-06, cada elo medido)
 *   1. o tracker do Monaco FUNCIONAVA: 198 símbolos do provider do TypeScript
 *      viraram 1542 linhas (na verdade ~2600 — ver nota abaixo);
 *   2. `ExplorerView` recebia as linhas (`sync` com qtd=1542);
 *   3. `ExplorerView` só MOSTRA as linhas se `activeUri` existir:
 *      `const outlineVisibleRows = activeUri ? outlineRows : []`;
 *   4. `activeUri` era `null`. Ele nasce de `activeFile.getActiveUri()` — que
 *      devolvia a uri correta quando perguntado — e só muda pelo aviso de
 *      `onActiveChanged`;
 *   5. `onActiveChanged` gravava `last = activeCodeUri()` NO MOMENTO DA INSCRIÇÃO.
 *      Nesse instante o centro ainda não tinha montado, então `centerSessionId`
 *      era `null`, `activeCodeUri()` era `null` e `last` ficou `null`;
 *   6. o único `editor.activeChanged` depois disso chegou enquanto a sessão do
 *      centro ainda não estava registrada — `cur` também `null`, `null !== null`
 *      é falso, NADA foi anunciado. Depois disso não houve mais evento nenhum:
 *      o aviso se perdeu para sempre e o Outline nunca soube do arquivo.
 *
 * A correção não afrouxa nada: quem consome `onActiveChanged` continua recebendo
 * só mudanças (`null → uri` é mudança), e a comparação passou a ser feita contra
 * a uri REALMENTE entregue por último, inclusive quando a última entrega foi
 * `null` por não haver superfície montada. Há teste para os dois lados.
 */

/** Raiz `file:///w` com `a.ts` e `b.ts` — o mínimo para abrir arquivo. */
function fakeFs() {
  const fs = new FakeFsPort(asWorkspaceUri('file:///w'))
  fs.seed([{ path: '/w/a.ts', kind: 'file' }, { path: '/w/b.ts', kind: 'file' }])
  return fs
}

function moduloDeTeste() {
  const eventos: string[] = []
  const modulo = createExplorerSearchModule({
    // FakeFsPort é o dublê que o resto da suíte do módulo usa — escrever um
    // dublê novo aqui só criaria uma segunda verdade sobre a porta de FS.
    fs: fakeFs(),
    menus: { register: () => () => {}, execute: async () => {}, setContext: () => {}, getContext: () => undefined } as never,
    contextMenu: { open: () => {} } as never,
    workspaceRoot: 'file:///w' as WorkspaceUri,
    openSourceControl: () => {},
  } as never)
  modulo.onEvent((e) => eventos.push(e.type))
  return { modulo, eventos }
}

// A sessão do centro só existe depois de `mountCodeEditor` (é ele que registra
// `centerSessionId`). Estes testes reproduzem exatamente essa ordem, que é a
// ordem do app de verdade: o Explorer monta antes do corpo do editor.
describe('DEF-D169-5 — o aviso do arquivo ativo não se perde antes do centro montar', () => {
  it('abrir arquivo ANTES de o centro montar ainda avisa o consumidor', async () => {
    const { modulo } = moduloDeTeste()
    const vistos: (string | null)[] = []
    // 1. o consumidor se inscreve com o centro AINDA não montado (é o que o
    //    ExplorerView faz: módulo monta primeiro, corpo do editor depois)
    expect(typeof modulo.activeFile?.onActiveChanged).toBe('function')
    const desinscrever = modulo.activeFile?.onActiveChanged?.((uri) => vistos.push(uri ? String(uri) : null))
    // 2. o arquivo é aberto ANTES de o corpo do editor montar. Esta é a ordem do
    //    app de verdade: o slot do centro só é montado no render seguinte, quando
    //    o shell já vê a aba do módulo. Ou seja, o `editor.activeChanged` sai
    //    quando `centerSessionId` ainda é null — foi exatamente o que a
    //    instrumentação do navegador mostrou (`cur: null`, `last: null`).
    await modulo.attach.open?.({ uri: 'file:///w/a.ts' as WorkspaceUri, kind: 'code', sessionId: 's1', pinned: true })
    // 3. só agora o centro existe
    const host = document.createElement('div')
    modulo.mountCodeEditor?.(host, { sessionId: 's1' })
    expect(modulo.activeFile?.getActiveUri?.()).toBe('file:///w/a.ts')
    // O consumidor PRECISA saber: sem isso a lista de símbolos fica invisível
    // mesmo estando calculada. O limite de tempo é da REAÇÃO (o módulo reage ao
    // evento do serviço, que é síncrono), não uma espera arbitrária.
    expect(vistos.filter(Boolean)).toContain('file:///w/a.ts')
    desinscrever?.()
    modulo.dispose()
  })

  it('continua avisando só quando MUDA (o contrato original fica de pé)', async () => {
    const { modulo } = moduloDeTeste()
    const host = document.createElement('div')
    modulo.mountCodeEditor?.(host, { sessionId: 's1' })
    const vistos: (string | null)[] = []
    expect(typeof modulo.activeFile?.onActiveChanged).toBe('function')
    const desinscrever = modulo.activeFile?.onActiveChanged?.((uri) => vistos.push(uri ? String(uri) : null))
    await modulo.attach.open?.({ uri: 'file:///w/a.ts' as WorkspaceUri, kind: 'code', sessionId: 's1', pinned: true })
    await modulo.attach.open?.({ uri: 'file:///w/b.ts' as WorkspaceUri, kind: 'code', sessionId: 's1', pinned: true })
    // reabrir a mesma uri não é mudança
    await modulo.attach.open?.({ uri: 'file:///w/b.ts' as WorkspaceUri, kind: 'code', sessionId: 's1', pinned: true })
    const naoNulos = vistos.filter(Boolean)
    expect(naoNulos).toEqual(['file:///w/a.ts', 'file:///w/b.ts'])
    desinscrever?.()
    modulo.dispose()
  })
})
