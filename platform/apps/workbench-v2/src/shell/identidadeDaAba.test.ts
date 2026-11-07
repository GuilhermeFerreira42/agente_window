// ============================================================================
// identidadeDaAba.test.ts — o comportamento EXTRAIDO do App, fixado antes da
// migracao (RNF15-2, D172).
//
// Cada teste abaixo corresponde a uma linha que vivia dentro do `openEditorTab`
// do App. A migracao so e' segura se o comportamento que sai de la' for este,
// exatamente. Se algum destes testes falhar depois da migracao, o App mudou de
// comportamento — e nao e' "ajuste de teste", e' regressao.
// ============================================================================
import { describe, expect, it } from 'vitest'
import type { EditorTab } from '../types'
import type { PedidoDeAba } from './identidadeDaAba'
import {
  abaExistentePara,
  atualizacaoDeAbaReusada,
  idDeAbaNova,
  montarAba,
  sessaoDonaDaAba,
} from './identidadeDaAba'

const sessaoAtiva = 'sess-ativa'

function aba(over: Partial<EditorTab> & Pick<EditorTab, 'id' | 'type' | 'title'>): EditorTab {
  return { ...over }
}

describe('sessaoDonaDaAba — regra de escopo por tipo', () => {
  it('browser e diff pertencem a sessao ativa', () => {
    expect(sessaoDonaDaAba({ type: 'browser' }, sessaoAtiva)).toBe(sessaoAtiva)
    expect(sessaoDonaDaAba({ type: 'diff' }, sessaoAtiva)).toBe(sessaoAtiva)
  })

  it('arquivo so pertence a uma sessao quando o chamador diz', () => {
    expect(sessaoDonaDaAba({ type: 'file' }, sessaoAtiva)).toBeUndefined()
    expect(sessaoDonaDaAba({ type: 'file', sessionId: 'sess-x' }, sessaoAtiva)).toBe('sess-x')
  })

  it('aba global (provedores/config) nunca herda a sessao ativa', () => {
    expect(sessaoDonaDaAba({ type: 'providers' }, sessaoAtiva)).toBeUndefined()
    expect(sessaoDonaDaAba({ type: 'config' }, sessaoAtiva)).toBeUndefined()
  })

  it('sessionId explicito vence a regra do tipo', () => {
    expect(sessaoDonaDaAba({ type: 'diff', sessionId: 'sess-y' }, sessaoAtiva)).toBe('sess-y')
  })
})

describe('abaExistentePara — reusar em vez de duplicar', () => {
  const faixa: EditorTab[] = [
    aba({ id: 'providers-1', type: 'providers', title: 'Provedores' }),
    aba({ id: 'file-a', type: 'file', title: 'a.ts', path: '/a.ts', sessionId: 'sess-ativa' }),
    aba({ id: 'file-b', type: 'file', title: 'b.ts', path: '/b.ts', sessionId: 'sess-ativa' }),
    aba({ id: 'file-c', type: 'file', title: 'a.ts', path: '/a.ts', sessionId: 'outra-sessao' }),
  ]

  it('mesmo tipo global reusa (nao abre segundo Provedores)', () => {
    const achada = abaExistentePara(faixa, { type: 'providers', title: 'Provedores' } as PedidoDeAba, sessaoAtiva)
    expect(achada?.id).toBe('providers-1')
  })

  it('arquivo e identificado pelo path, nao pelo titulo', () => {
    expect(abaExistentePara(faixa, { type: 'file', title: 'x', path: '/a.ts', sessionId: 'sess-ativa' } as PedidoDeAba, sessaoAtiva)?.id).toBe('file-a')
    expect(abaExistentePara(faixa, { type: 'file', title: 'a.ts', path: '/b.ts', sessionId: 'sess-ativa' } as PedidoDeAba, sessaoAtiva)?.id).toBe('file-b')
  })

  it('o mesmo arquivo em OUTRA sessao nao e o mesmo recurso', () => {
    const achada = abaExistentePara(faixa, { type: 'file', title: 'a.ts', path: '/a.ts', sessionId: 'terceira' } as PedidoDeAba, sessaoAtiva)
    expect(achada).toBeUndefined()
  })

  it('arquivo sem dono casa com o de qualquer sessao (comportamento do App, preservado)', () => {
    // Medido no App antes da migracao: o filtro era
    //   (!ownerSessionId || tab.sessionId === ownerSessionId)
    // ou seja, pedido SEM dono casa com qualquer aba do mesmo path. Preservado
    // exatamente assim — mudar isto seria mudar produto no meio de um corte de
    // responsabilidade. Fica registrado como observacao, nao como elogio: um
    // arquivo aberto pela sessao A pode ser reusado por um pedido global.
    expect(abaExistentePara(faixa, { type: 'file', title: 'a.ts', path: '/a.ts' } as PedidoDeAba, sessaoAtiva)?.id).toBe('file-a')
  })

  it('nao existe aba ainda → undefined', () => {
    expect(abaExistentePara(faixa, { type: 'diff', title: 'Changes' } as PedidoDeAba, sessaoAtiva)).toBeUndefined()
  })
})

describe('idDeAbaNova — colisao no mesmo milissegundo', () => {
  it('mesmo ms com sequencias diferentes gera ids diferentes', () => {
    const a = idDeAbaNova('file', 1000, 1)
    const b = idDeAbaNova('file', 1000, 2)
    expect(a).not.toBe(b)
  })

  it('formato estavel: tipo-ms-sequencia', () => {
    expect(idDeAbaNova('diff', 42, 7)).toBe('diff-42-7')
  })

  it('tipos diferentes no mesmo ms nao colidem', () => {
    expect(idDeAbaNova('file', 1000, 1)).not.toBe(idDeAbaNova('diff', 1000, 1))
  })
})

describe('montarAba — materializacao', () => {
  it('carrega o dono resolvido e deriva isRealFile do conteudo', () => {
    const montada = montarAba({ type: 'file', title: 'a.ts', path: '/a.ts', content: 'x' }, sessaoAtiva, 'file-1-1')
    expect(montada.sessionId).toBeUndefined()
    expect(montada.isRealFile).toBe(true)
    expect(montada.path).toBe('/a.ts')
  })

  it('preview de imagem conta como arquivo real', () => {
    const montada = montarAba(
      { type: 'file', title: 'a.png', imagePreview: { src: 'data:x', alt: 'a' } as never },
      sessaoAtiva,
      'file-1-2',
    )
    expect(montada.isRealFile).toBe(true)
  })

  it('sem conteudo e sem afirmacao explicita, nao e arquivo real', () => {
    expect(montarAba({ type: 'file', title: 'a.ts' }, sessaoAtiva, 'file-1-3').isRealFile).toBe(false)
  })

  it('afirmacao do chamador vence a derivacao', () => {
    expect(montarAba({ type: 'file', title: 'a.ts', isRealFile: true }, sessaoAtiva, 'file-1-4').isRealFile).toBe(true)
    expect(montarAba({ type: 'file', title: 'a.ts', content: 'x', isRealFile: false }, sessaoAtiva, 'file-1-5').isRealFile).toBe(false)
  })
})

describe('atualizacaoDeAbaReusada — quando reescrever a aba existente', () => {
  const existente = { content: 'antigo', isRealFile: true, readError: undefined }

  it('conteudo igual nao gera atualizacao (nada de setState a toa)', () => {
    expect(atualizacaoDeAbaReusada(existente, { content: 'antigo' })).toBeUndefined()
  })

  it('sem conteudo e sem erro nao gera atualizacao', () => {
    expect(atualizacaoDeAbaReusada(existente, {})).toBeUndefined()
  })

  it('conteudo novo sobrescreve', () => {
    expect(atualizacaoDeAbaReusada(existente, { content: 'novo' })?.content).toBe('novo')
  })

  it('readError substitui o conteudo — os dois sao mutuamente exclusivos', () => {
    const r = atualizacaoDeAbaReusada({ content: 'antigo', isRealFile: true, readError: undefined }, { readError: 'EACCES' })
    expect(r).toEqual({ content: undefined, readError: 'EACCES', isRealFile: true })
  })

  it('salvar depois de erro limpa o readError pendurado', () => {
    const r = atualizacaoDeAbaReusada({ content: undefined, isRealFile: true, readError: 'EACCES' }, { content: 'ok' })
    expect(r).toEqual({ content: 'ok', readError: undefined, isRealFile: true })
  })

  it('isRealFile so muda quando o chamador afirma', () => {
    expect(atualizacaoDeAbaReusada(existente, { content: 'novo' })?.isRealFile).toBe(true)
    expect(atualizacaoDeAbaReusada(existente, { content: 'novo', isRealFile: false })?.isRealFile).toBe(false)
  })
})
