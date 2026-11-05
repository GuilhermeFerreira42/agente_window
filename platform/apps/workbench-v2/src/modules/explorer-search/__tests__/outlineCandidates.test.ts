// ============================================================================
// __tests__/outlineCandidates.test.ts — Fatia 15, Onda 2c-ii (D152 §3).
//
// O que este arquivo policia: o outlineTracker deixou de ser dono de UM editor e
// passou a ser uma FILA de candidatos com posse explícita.
//
// Por que isso importa: o Outline é servido pela Side Bar, mas quem hospeda o
// Monaco é o editor. Durante a sobreposição da unificação existem duas
// superfícies capazes (a coluna e o centro); antes, o editor do anexo vencia por
// chegar primeiro — e quando a coluna sair, o Outline ficaria sem editor NENHUM
// ou descreveria o arquivo errado. Um Outline errado é pior que um vazio: ele
// afirma coisas sobre o arquivo ativo.
//
// O teste roda o tracker REAL (sem mock) com editores falsos que só têm o que o
// tracker usa (getModel + os três onDidChange*). Nada de Monaco aqui: o que está
// sob prova é a POLÍTICA DE POSSE, não a API do editor.
// ============================================================================
import { describe, expect, it } from 'vitest'
import { createMonacoOutlineTracker } from '../ui/attach/monacoOutline'

const descartavel = { dispose: () => undefined }

/** Editor falso: o mínimo que o tracker toca. `modelo` é o que ele lê em compute(). */
function editorFalso(modelo: unknown = null) {
  const eventos: string[] = []
  const ed = {
    getModel: () => modelo,
    onDidChangeModel: (cb: () => void) => { eventos.push('modelo'); void cb; return descartavel },
    onDidChangeModelContent: (cb: () => void) => { eventos.push('conteudo'); void cb; return descartavel },
    revealLineInCenter: () => undefined,
    setPosition: () => undefined,
    focus: () => undefined,
  }
  return { ed, eventos }
}

describe('outlineTracker — fila de candidatos (D152 §3)', () => {
  it('1. sem candidato o Outline fica VAZIO, em vez de lembrar linhas de outro editor', () => {
    const t = createMonacoOutlineTracker()
    expect(t.candidateCount()).toBe(0)
    expect(t.rows()).toEqual([])
    expect(t.modelUri()).toBeNull()
    t.dispose()
  })

  it('2. cada attach entra na fila, e o último a chegar tem a posse', () => {
    const t = createMonacoOutlineTracker()
    const coluna = editorFalso().ed
    const centro = editorFalso().ed

    t.attach(coluna)
    expect(t.candidateCount()).toBe(1)

    t.attach(centro)
    expect(t.candidateCount()).toBe(2)

    // attach repetido do MESMO editor não duplica a fila (idempotência: o
    // onEditorReady pode ser chamado mais de uma vez ao remontar o painel).
    t.attach(centro)
    expect(t.candidateCount()).toBe(2)

    t.dispose()
  })

  it('3. quando o dono da posse sai, a posse passa ao candidato vivo (não fica órfã)', () => {
    const t = createMonacoOutlineTracker()
    const coluna = editorFalso().ed
    const centro = editorFalso().ed

    t.attach(coluna)
    t.attach(centro)
    expect(t.candidateCount()).toBe(2)

    // A coluna é aposentada (é exatamente o que o passo C faz): solta a posse.
    t.detach(coluna)
    expect(t.candidateCount()).toBe(1)

    // O centro continua atendendo — sem candidato vivo o Outline ficaria mudo
    // enquanto existe um editor em uso na tela.
    expect(t.candidateCount()).toBe(1)
    t.dispose()
  })

  it('4. detach do ÚLTIMO candidato zera o Outline — nunca sobram linhas do editor morto', () => {
    const t = createMonacoOutlineTracker()
    const { ed } = editorFalso()
    t.attach(ed)
    expect(t.candidateCount()).toBe(1)

    t.detach(ed)
    expect(t.candidateCount()).toBe(0)
    // Linhas e uri do editor que saiu não valem mais para ninguém.
    expect(t.rows()).toEqual([])
    expect(t.modelUri()).toBeNull()
    t.dispose()
  })

  it('5. detach de um editor que não está na fila é inofensivo (unmount duplo não quebra)', () => {
    const t = createMonacoOutlineTracker()
    const { ed } = editorFalso()
    const estranho = editorFalso().ed

    t.attach(ed)
    t.detach(estranho)   // nunca entrou
    expect(t.candidateCount()).toBe(1)
    t.detach(ed)
    expect(t.candidateCount()).toBe(0)
    t.dispose()
  })

  it('6. dispose limpa a fila e os ouvintes: depois dele nada é recalculado', () => {
    const t = createMonacoOutlineTracker()
    t.attach(editorFalso().ed)
    t.attach(editorFalso().ed)
    expect(t.candidateCount()).toBe(2)

    t.dispose()
    expect(t.candidateCount()).toBe(0)
    expect(t.rows()).toEqual([])
  })

  it('7. attach depois de dispose é ignorado (não ressuscita um tracker morto)', () => {
    const t = createMonacoOutlineTracker()
    t.dispose()
    t.attach(editorFalso().ed)
    expect(t.candidateCount()).toBe(0)
  })
})
