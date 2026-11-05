// FATIA 15, Onda 1 — provas do modelo único de aba (shell/abas.ts).
// Cada bloco cita o que espelha, para que uma divergência futura aponte o lado
// errado: os 21 testes de `editorService` são a autoridade do comportamento.
import { describe, expect, it } from 'vitest'
import {
  COLECAO_VAZIA,
  abaFechavel,
  abasVisiveisParaSessao,
  abrirAba,
  barraDeAbasVisivel,
  chatCentralizado,
  conteudoDoEditorVisivel,
  fecharAba,
  marcarEdicao,
  promoverAba,
  registrarAbaAtiva,
  resolverAbaVisivel,
  resolverEstadoDoPainel,
  resolverSucessora,
  type Aba,
  type ColecaoDeAbas,
} from './abas'

const aba = (id: string, extra: Partial<Aba> = {}): Aba => ({ id, type: 'file', title: id, ...extra })

/** [a, b, c] sem histórico de uso — o ponto de partida da maioria das provas. */
const tresAbas: ColecaoDeAbas = { abas: [aba('a'), aba('b'), aba('c')], mru: [] }

describe('modelo único: sucessão ao fechar (D144 §3.1 — MRU vence a vizinha da direita)', () => {
  it('ativa a mais recentemente usada quando há histórico de uso', () => {
    // Caso DISCRIMINANTE: com b ativa e mru [b, a, c], a política antiga (vizinha
    // da direita) entregaria 'c'; a MRU entrega 'a'. Se este teste um dia voltar
    // a esperar 'c', a decisão da D144 foi revertida em silêncio.
    const comUso: ColecaoDeAbas = { abas: tresAbas.abas, mru: ['b', 'a', 'c'] }
    expect(fecharAba(comUso, 'b', 'b').sucessoraId).toBe('a')
  })

  it('cai na vizinha da posição quando não há histórico (espelha editorService.close)', () => {
    // mru vazio => tabs[min(idx, len-1)]. Fechar a do meio (idx 1) deixa [a, c] e
    // entrega c; fechar a última (idx 2) deixa [a, b] e entrega b (clamp).
    expect(fecharAba(tresAbas, 'b', 'b').sucessoraId).toBe('c')
    expect(fecharAba(tresAbas, 'c', 'c').sucessoraId).toBe('b')
    expect(fecharAba(tresAbas, 'a', 'a').sucessoraId).toBe('b')
  })

  it('não devolve sucessora quando a coleção esvazia', () => {
    const uma: ColecaoDeAbas = { abas: [aba('a')], mru: [] }
    const resultado = fecharAba(uma, 'a', 'a')
    expect(resultado.sucessoraId).toBeUndefined()
    expect(resultado.colecao.abas).toEqual([])
  })

  it('não rouba o foco ao fechar aba inativa (propriedade herdada do modelo antigo)', () => {
    const resultado = fecharAba(tresAbas, 'a', 'c')
    expect(resultado.sucessoraId).toBeUndefined()
    expect(resultado.colecao.abas.map((cada) => cada.id)).toEqual(['b', 'c'])
  })

  it('fecha aba inexistente como no-op sem inventar sucessora', () => {
    const resultado = fecharAba(tresAbas, 'fantasma', 'c')
    expect(resultado.inexistente).toBe(true)
    expect(resultado.bloqueado).toBe(false)
    expect(resultado.sucessoraId).toBeUndefined()
    expect(resultado.colecao).toBe(tresAbas)
  })

  it('resolverSucessora prefere mru[0] e só então o índice clampado', () => {
    const apos = { abasAposFecho: [aba('a'), aba('c')], indiceDaFechada: 1 }
    expect(resolverSucessora({ ...apos, mruAposFecho: ['c', 'a'] })).toBe('c')
    expect(resolverSucessora({ ...apos, mruAposFecho: [] })).toBe('c')
    expect(resolverSucessora({ abasAposFecho: [], mruAposFecho: [], indiceDaFechada: 0 })).toBeUndefined()
  })
})

describe('modelo único: dirty protege o trabalho não salvo', () => {
  it('bloqueia fechar dirty sem force e não altera nada', () => {
    const suja: ColecaoDeAbas = { abas: [aba('a', { dirty: true }), aba('b')], mru: [] }
    const resultado = fecharAba(suja, 'a', 'a')
    expect(resultado.bloqueado).toBe(true)
    expect(resultado.colecao).toBe(suja)
    expect(resultado.colecao.abas).toHaveLength(2)
  })

  it('fecha dirty com force (o diálogo do c5 é quem decide forçar)', () => {
    const suja: ColecaoDeAbas = { abas: [aba('a', { dirty: true }), aba('b')], mru: [] }
    const resultado = fecharAba(suja, 'a', 'a', { force: true })
    expect(resultado.bloqueado).toBe(false)
    expect(resultado.colecao.abas.map((cada) => cada.id)).toEqual(['b'])
  })

  it('abaFechavel: limpa sempre fecha, suja só com force', () => {
    expect(abaFechavel(aba('a'))).toBe(true)
    expect(abaFechavel(aba('a', { dirty: false }))).toBe(true)
    expect(abaFechavel(aba('a', { dirty: true }))).toBe(false)
    expect(abaFechavel(aba('a', { dirty: true }), { force: true })).toBe(true)
    expect(abaFechavel(aba('a', { dirty: true }), { force: false })).toBe(false)
  })
})

describe('modelo único: preview único por grupo (espelha editorService.open)', () => {
  it('clique simples abre em preview; duplo clique abre pinado', () => {
    const simples = abrirAba(COLECAO_VAZIA, aba('x'))
    expect(simples.colecao.abas[0].preview).toBe(true)
    const duplo = abrirAba(COLECAO_VAZIA, aba('y'), { pinned: true })
    expect(duplo.colecao.abas[0].preview).toBe(false)
  })

  it('o próximo preview substitui o anterior NA MESMA POSIÇÃO', () => {
    const comPinadas: ColecaoDeAbas = {
      abas: [aba('p1', { preview: false }), aba('prev', { preview: true }), aba('p2', { preview: false })],
      mru: ['prev', 'p1', 'p2'],
    }
    const resultado = abrirAba(comPinadas, aba('nova'))
    expect(resultado.colecao.abas.map((cada) => cada.id)).toEqual(['p1', 'nova', 'p2'])
    expect(resultado.substituidaId).toBe('prev')
    expect(resultado.ativaId).toBe('nova')
    // a substituída sai do MRU, senão uma aba morta ainda ganharia o foco
    expect(resultado.colecao.mru).not.toContain('prev')
    expect(resultado.colecao.mru[0]).toBe('nova')
  })

  it('um preview dirty nunca é substituído (trabalho não salvo não se perde)', () => {
    const suja: ColecaoDeAbas = { abas: [aba('prev', { preview: true, dirty: true })], mru: ['prev'] }
    const resultado = abrirAba(suja, aba('nova'))
    expect(resultado.substituidaId).toBeUndefined()
    expect(resultado.colecao.abas.map((cada) => cada.id)).toEqual(['prev', 'nova'])
  })

  it('pinado novo entra ao final da faixa, sem substituir ninguém', () => {
    const comPreview: ColecaoDeAbas = { abas: [aba('prev', { preview: true })], mru: ['prev'] }
    const resultado = abrirAba(comPreview, aba('fixa'), { pinned: true })
    expect(resultado.substituidaId).toBeUndefined()
    expect(resultado.colecao.abas.map((cada) => cada.id)).toEqual(['prev', 'fixa'])
    expect(resultado.colecao.abas[1].preview).toBe(false)
  })

  it('reabrir aba existente foca sem duplicar', () => {
    const resultado = abrirAba(tresAbas, aba('b'))
    expect(resultado.ativaId).toBe('b')
    expect(resultado.colecao.abas).toHaveLength(3)
  })

  it('pinned promove um preview existente a pinado, sem mover a aba', () => {
    const comPreview: ColecaoDeAbas = { abas: [aba('a', { preview: false }), aba('b', { preview: true })], mru: [] }
    const resultado = abrirAba(comPreview, aba('b'), { pinned: true })
    expect(resultado.colecao.abas.map((cada) => cada.id)).toEqual(['a', 'b'])
    expect(resultado.colecao.abas[1].preview).toBe(false)
  })

  it('promoverAba e marcarEdicao tiram o preview (pin on edit)', () => {
    const comPreview: ColecaoDeAbas = { abas: [aba('a', { preview: true })], mru: [] }
    expect(promoverAba(comPreview, 'a').abas[0].preview).toBe(false)
    const editada = marcarEdicao(comPreview, 'a', { content: 'texto novo' })
    expect(editada.abas[0].preview).toBe(false)
    expect(editada.abas[0].dirty).toBe(true)
    expect(editada.abas[0].content).toBe('texto novo')
  })

  it('marcarEdicao preserva as outras abas por identidade (sem reescrita em massa)', () => {
    const resultado = marcarEdicao(tresAbas, 'b', { content: 'x' })
    expect(resultado.abas[0]).toBe(tresAbas.abas[0])
    expect(resultado.abas[2]).toBe(tresAbas.abas[2])
    expect(resultado.abas[1]).not.toBe(tresAbas.abas[1])
  })

  it('registrarAbaAtiva move o id para a frente e não acumula duplicata', () => {
    const comUso = registrarAbaAtiva({ abas: tresAbas.abas, mru: ['a', 'b', 'c'] }, 'c')
    expect(comUso.mru).toEqual(['c', 'a', 'b'])
    expect(registrarAbaAtiva(tresAbas, undefined)).toBe(tresAbas)
  })
})

describe('modelo único: dono por sessão (docs/06 — "dono: sessão ou global")', () => {
  const mista: ColecaoDeAbas = {
    abas: [aba('global-1'), aba('s1-a', { sessionId: 's1' }), aba('s2-a', { sessionId: 's2' })],
    mru: [],
  }

  it('aba sem dono é global e aparece em qualquer sessão', () => {
    expect(abasVisiveisParaSessao(mista, 's1').map((cada) => cada.id)).toEqual(['global-1', 's1-a'])
    expect(abasVisiveisParaSessao(mista, 's2').map((cada) => cada.id)).toEqual(['global-1', 's2-a'])
  })

  it('aba de outra sessão não vaza (um grupo por sessão)', () => {
    expect(abasVisiveisParaSessao(mista, 's1').some((cada) => cada.sessionId === 's2')).toBe(false)
  })

  it('sem sessão ativa só as globais são visíveis', () => {
    expect(abasVisiveisParaSessao(mista, undefined).map((cada) => cada.id)).toEqual(['global-1'])
  })

  it('resolverAbaVisivel mantém o contrato herdado: pedida vence, senão a primeira', () => {
    expect(resolverAbaVisivel(mista.abas, 's2-a')).toBe('s2-a')
    expect(resolverAbaVisivel(mista.abas, 'fantasma')).toBe('global-1')
    expect(resolverAbaVisivel([], 'fantasma')).toBeUndefined()
  })
})

describe('máquina do painel 4 → 2 (SPEC 2I §2 (d): "tem abas / não tem")', () => {
  it('só existem dois estados, e são os que a SPEC nomeia', () => {
    expect(resolverEstadoDoPainel([])).toBe('sem-abas')
    expect(resolverEstadoDoPainel([aba('a')])).toBe('tem-abas')
    expect(resolverEstadoDoPainel([aba('a'), aba('b')])).toBe('tem-abas')
  })

  it('o chat se centraliza apenas quando é a única superfície', () => {
    expect(chatCentralizado([])).toBe(true)
    expect(chatCentralizado([aba('a')])).toBe(false)
  })

  it('conteúdo e faixa de abas passam a coincidir — é o colapso aparecendo', () => {
    // Nos 4 estados antigos era possível ter faixa sem conteúdo (editorHidden).
    // Com uma barra só, ter abas É ver o conteúdo da aba ativa.
    for (const abas of [[], [aba('a')], [aba('a'), aba('b')]] as readonly Aba[][]) {
      expect(conteudoDoEditorVisivel(abas)).toBe(barraDeAbasVisivel(abas))
      expect(conteudoDoEditorVisivel(abas)).toBe(abas.length > 0)
    }
  })

  it('Changes/Files deixam de ser um MODO e passam a ser dado: a aba ativa', () => {
    // `detail-only` não existe mais como estado. O que era "só a coluna" agora é
    // "a aba ativa é Changes" — e isso não exige nenhum estado de painel novo.
    const comChanges: ColecaoDeAbas = { abas: [aba('arq', { type: 'file' }), aba('ch', { type: 'diff' })], mru: [] }
    expect(resolverEstadoDoPainel(comChanges.abas)).toBe('tem-abas')
    expect(conteudoDoEditorVisivel(comChanges.abas)).toBe(true)
    expect(resolverAbaVisivel(comChanges.abas, 'ch')).toBe('ch')
  })
})
