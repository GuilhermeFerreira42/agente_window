// ============================================================================
// Fatia 15 — Onda 3 (D166): o host do painel Changes no centro é PRÓPRIO.
//
// A tentação era reusar `mountScm`: o painel é o mesmo componente. Mas `mountScm`
// guarda UM host e devolve cedo quando recebe o mesmo host de novo — se o centro
// passasse por ali, ou roubava o host da view `scm` da Side Bar, ou era ignorado
// (e a aba Changes do centro ficaria vazia em silêncio, que é o pior dos dois).
// Este teste pinta o que interessa:
//
//   1. `mountChanges` monta o ChangesPane REAL (o mesmo da Side Bar, não um mock);
//   2. montar o centro NÃO tira o painel da Side Bar;
//   3. `unmountChanges` remove só o do centro.
//
// Fronteira: só o barrel do módulo é importado (FT-01/FT-02 do frontier.test.ts).
// ============================================================================
import { describe, expect, it } from 'vitest'
// `act` do @testing-library (não do react): é ele que liga IS_REACT_ACT_ENVIRONMENT
// e evita o aviso "environment is not configured to support act(...)".
import { act } from '@testing-library/react'
import type { WorkspaceUri } from '../index'
import { createExplorerSearchModule } from '../index'
import { FakeFsPort } from './fakeFs'

const S = 'sessao-1'
const RAIZ = 'file:///ws' as WorkspaceUri

/**
 * Porta de fs de verdade, não um objeto pela metade: a fábrica do módulo assina
 * `deps.fs.onEvent` no construtor, e um dublê incompleto derruba a criação antes
 * de qualquer coisa ser provada (foi o que aconteceu na primeira versão deste
 * arquivo — 3 falhas em `deps.fs.onEvent is not a function`). O `FakeFsPort` já
 * existe na casa e tem o contrato inteiro; `seed` dá raiz e um arquivo.
 */
function fsFalso() {
  const fs = new FakeFsPort(RAIZ)
  fs.seed([{ path: '/ws', kind: 'directory' }])
  return fs
}

function criar() {
  return createExplorerSearchModule({
    fs: fsFalso(),
    menus: { register: () => () => {}, execute: async () => {}, setContext: () => {}, getContext: () => undefined },
    contextMenu: { open: () => {} },
    workspaceRoot: RAIZ,
  })
}

const assentar = async (): Promise<void> => {
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}

const host = (): HTMLElement => {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

describe('Fatia 15 Onda 3 (D166) — mountChanges monta o painel real com host próprio', () => {
  it('1. monta o ChangesPane real dentro do host do centro', async () => {
    const mod = criar()
    const raiz = host()
    await act(async () => { mod.mountChanges?.(raiz) })
    await assentar()

    // `scm-view` é a raiz do ChangesPane (ui/attach/changes/ChangesPane.tsx) — o
    // MESMO componente da view `scm`. Um mock nunca teria este testid.
    const painel = raiz.querySelector('[data-testid="scm-view"]')
    expect(painel).not.toBeNull()
    // display:contents no intermediário: o contêiner não pode virar caixa flexível
    // dentro do chassi (Regra 6), igual a mountAttach/mountScm.
    const intermediario = raiz.firstElementChild as HTMLElement
    expect(intermediario.style.display).toBe('contents')
    expect(intermediario.contains(painel)).toBe(true)

    await act(async () => { mod.unmountChanges?.() })
    mod.dispose()
  })

  it('2. montar o centro NÃO esvazia o painel da Side Bar (hosts independentes)', async () => {
    const mod = criar()
    const hostSideBar = host()
    const hostCentro = host()

    await act(async () => { mod.mountScm(hostSideBar) })
    await assentar()
    expect(hostSideBar.querySelector('[data-testid="scm-view"]')).not.toBeNull()

    await act(async () => { mod.mountChanges?.(hostCentro) })
    await assentar()

    // Os dois ao mesmo tempo, cada um no seu host. Antes desta dívida, o centro era
    // uma demonstração vazia; o preço de reusar `mountScm` seria este teste falhar.
    expect(hostSideBar.querySelector('[data-testid="scm-view"]')).not.toBeNull()
    expect(hostCentro.querySelector('[data-testid="scm-view"]')).not.toBeNull()

    await act(async () => { mod.unmountChanges?.() })
    await assentar()
    expect(hostCentro.querySelector('[data-testid="scm-view"]')).toBeNull()
    expect(hostSideBar.querySelector('[data-testid="scm-view"]')).not.toBeNull()

    await act(async () => { mod.unmountScm() })
    mod.dispose()
  })

  it('3. montar duas vezes no MESMO host não duplica o painel', async () => {
    const mod = criar()
    const raiz = host()
    await act(async () => { mod.mountChanges?.(raiz) })
    await assentar()
    await act(async () => { mod.mountChanges?.(raiz) })
    await assentar()
    expect(raiz.querySelectorAll('[data-testid="scm-view"]').length).toBe(1)
    await act(async () => { mod.unmountChanges?.() })
    mod.dispose()
  })
})
