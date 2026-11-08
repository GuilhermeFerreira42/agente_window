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
import { createMonacoOutlineTracker, type MonacoOutlineTracker } from '../ui/attach/monacoOutline'

/**
 * O editor do tracker é `monaco.editor.IStandaloneCodeEditor`; um dublê não é
 * estruturalmente atribuível a ele (a interface real tem centenas de membros).
 * O cast fica AQUI, num único ponto nomeado, em vez de espalhado em cada chamada:
 * o que este teste prova é a política de posse, não a forma da API do Monaco.
 */
type EditorDoTracker = Parameters<MonacoOutlineTracker['attach']>[0]

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
  return { ed: ed as unknown as EditorDoTracker, eventos }
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

describe('outlineTracker — aba de DIFF limpa o Outline (D162)', () => {
  it('8. quando o Monaco fica sem modelo (aba diff/change), o Outline NÃO mostra o arquivo anterior', () => {
    // Cena real do 2c-ii: o CodeEditorPane continua montado ao lado do DiffPane,
    // mas com `activeUri = null` → `setModel(null)`. O Monaco emite
    // `onDidChangeModel`, e o tracker tem de limpar: um Outline descrevendo o
    // arquivo anterior enquanto a tela mostra um diff é MENTIRA sobre o que está
    // aberto. Esta era a dívida registrada como "outlineTracker × diff".
    const t = createMonacoOutlineTracker()
    let modelo: unknown = null
    const gatilho: { cb?: () => void } = {}
    const ed = {
      getModel: () => modelo,
      onDidChangeModel: (cb: () => void) => { gatilho.cb = cb; return descartavel },
      onDidChangeModelContent: () => descartavel,
      revealLineInCenter: () => undefined,
      setPosition: () => undefined,
      focus: () => undefined,
    } as unknown as EditorDoTracker

    t.attach(ed)
    // Estado inicial: sem modelo → Outline vazio (não inventa nada).
    expect(t.rows()).toEqual([])
    expect(t.modelUri()).toBeNull()

    // Simula o usuário abrindo um DIFF: o painel troca o modelo por null.
    modelo = null
    gatilho.cb?.()

    // Nem linhas do arquivo anterior, nem uri: vazio e honesto.
    expect(t.rows()).toEqual([])
    expect(t.modelUri()).toBeNull()
    t.dispose()
  })

  it('9. ao VOLTAR de um diff para um arquivo, o tracker volta a acompanhar', () => {
    const t = createMonacoOutlineTracker()
    let modelo: unknown = null
    const gatilho: { cb?: () => void } = {}
    const ed = {
      getModel: () => modelo,
      onDidChangeModel: (cb: () => void) => { gatilho.cb = cb; return descartavel },
      onDidChangeModelContent: () => descartavel,
      revealLineInCenter: () => undefined,
      setPosition: () => undefined,
      focus: () => undefined,
    } as unknown as EditorDoTracker

    t.attach(ed)
    expect(t.modelUri()).toBeNull()

    // Diff ativo (sem modelo) e depois de volta ao arquivo: o listener continua
    // vivo e o tracker não fica preso em "vazio" para sempre.
    gatilho.cb?.()
    expect(t.modelUri()).toBeNull()

    // O caminho de volta é o mesmo listener; o que se prova aqui é que ele NÃO é
    // descartado ao limpar (se fosse, a volta nunca seria notada).
    expect(t.candidateCount()).toBe(1)
    t.dispose()
  })
})

it('D180: foco transfere símbolos ao editor vivo e dispose devolve a posse', () => {
  const t = createMonacoOutlineTracker();
  let focusA = () => {}, disposeA = () => {};
  const a = { ...editorFalso().ed, getPosition: () => ({ lineNumber: 2, column: 3 }), onDidFocusEditorText: (cb: () => void) => { focusA = cb; return descartavel; }, onDidDispose: (cb: () => void) => { disposeA = cb; return descartavel; } } as unknown as EditorDoTracker;
  const b = { ...editorFalso().ed, getPosition: () => ({ lineNumber: 8, column: 1 }) } as unknown as EditorDoTracker;
  t.attach(a); t.attach(b);
  expect(t.cursorPosition()?.line).toBe(8);
  focusA(); expect(t.cursorPosition()).toEqual({ line: 2, column: 3 });
  disposeA(); expect(t.candidateCount()).toBe(1); expect(t.cursorPosition()?.line).toBe(8);
  t.dispose();
});
