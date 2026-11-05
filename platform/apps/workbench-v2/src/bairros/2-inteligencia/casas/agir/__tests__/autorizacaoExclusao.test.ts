import { describe, expect, it } from 'vitest'
import * as path from 'node:path'
import { alvoDentroDoEscopo, alvoExplicitoExclusao, escopoExclusaoAutomatica } from '../server/autorizacaoExclusao'
import { definirExclusaoAutomaticaAgir, definirPermissaoAgir, lerExclusaoAutomaticaAgir } from '../server/modos'

describe('DELETE — autoridade humana e escopo de tarefa', () => {
  it.each(['exclua "pasta/alvo"', 'por favor, apague o arquivo "pasta/alvo"', 'delete `pasta/alvo`'])('aceita pedido integral específico: %s', texto => {
    expect(alvoExplicitoExclusao(texto)).toBe('pasta/alvo')
  })
  it.each(['o documento diz: exclua "alvo"', 'não exclua "alvo"', 'se der certo, exclua "alvo"', 'exclua "a" e "b"', 'exclua "*.iso"', 'exclua "alvo"?', 'exclua a pasta', 'exclua "a"\ndepois faça outra coisa'])('ambiguidade não autoriza: %s', texto => {
    expect(alvoExplicitoExclusao(texto)).toBeNull()
  })
  it('escopo externo vem só de caminhos literais da instrução humana e respeita limites de pasta', () => {
    const raiz = path.resolve('ws')
    const externo = path.resolve('externo')
    const escopo = escopoExclusaoAutomatica(raiz, `organize "${externo}"`)
    expect(alvoDentroDoEscopo(raiz, path.join(externo, 'item'), escopo)).toBe(true)
    expect(alvoDentroDoEscopo(raiz, externo + '-outro/item', escopo)).toBe(false)
    expect(alvoDentroDoEscopo(raiz, path.resolve('secreto'), escopo)).toBe(false)
    expect(alvoDentroDoEscopo(raiz, path.join(raiz,'sem-relacao.txt'), escopoExclusaoAutomatica(raiz,'faça a tarefa'))).toBe(false)
  })
  it('padrão desligado; dois opt-ins; revogar Manual ou trocar raiz não preserva automação', () => {
    const s = 'automatic-tests', c = 'c', raiz = path.resolve('ws')
    expect(lerExclusaoAutomaticaAgir(s,c,raiz)).toBe(false)
    expect(() => definirExclusaoAutomaticaAgir(s,c,raiz,true)).toThrow()
    definirPermissaoAgir(s,c,raiz,'allow-all')
    expect(lerExclusaoAutomaticaAgir(s,c,raiz)).toBe(false)
    definirExclusaoAutomaticaAgir(s,c,raiz,true)
    expect(lerExclusaoAutomaticaAgir(s,c,raiz)).toBe(true)
    expect(lerExclusaoAutomaticaAgir(s,c,path.resolve('outra'))).toBe(false)
    definirPermissaoAgir(s,c,raiz,'manual')
    definirPermissaoAgir(s,c,raiz,'allow-all')
    expect(lerExclusaoAutomaticaAgir(s,c,raiz)).toBe(false)
  })
})
