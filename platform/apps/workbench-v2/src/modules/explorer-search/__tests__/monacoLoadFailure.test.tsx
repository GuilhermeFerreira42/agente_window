// ============================================================================
// __tests__/monacoLoadFailure.test.tsx — Fatia 15, Onda 3 (D157).
//
// A dívida: `loadMonaco().then(...)` sem `.catch` no CodeEditorPane. Quando o
// carregamento do Monaco falhava — chunk ausente, CSP bloqueando, worker morto,
// rede — a promise rejeitava sem tratador: o painel ficava em BRANCO para sempre,
// sem mensagem, e a suíte morria com "Unhandled Rejection" (sintoma real, visto na
// Onda 2b, contornado no teste em vez de tratado no produto).
//
// O QUE ESTE TESTE PROVA, e o que ele NÃO prova:
//   • PROVA: qualquer falha dentro da cadeia do carregamento — inclusive o próprio
//     `editor.create` lançando — vira ESTADO VISÍVEL (`monaco-load-error`) com a
//     mensagem do erro. É a cláusula `.catch` que falta, exercitada de verdade.
//   • NÃO PROVA: a rejeição do `import()` dinâmico em si. Um módulo ESM não pode
//     rejeitar no import num teste — esse caminho só existe no navegador com o
//     chunk faltando. Fica como homologação humana, e está registrado como tal.
//     O que se pode garantir por código é que o `.catch` cobre os dois casos,
//     porque ambos passam pela MESMA cadeia.
// ============================================================================
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorService } from '../core/editor/editorService'

/** Controla se o `create` explode — é o gatilho da falha dentro do `.then`. */
const criarLanca = { ativo: false, mensagem: 'chunk do editor indisponível' }

vi.mock('monaco-editor', () => {
  const modelo = {
    getValue: () => '', setValue: () => undefined, dispose: () => undefined,
    getValueLength: () => 0, uri: { toString: () => 'file:///stub' },
    onDidChangeContent: () => ({ dispose: () => undefined }),
    getAlternativeVersion: () => modelo, getAlternativeVersionId: () => 1,
    getLineCount: () => 1, findMatches: () => [], updateOptions: () => undefined,
    getFullModelRange: () => ({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }),
    pushEditOperations: () => null,
  }
  const editorFalso = {
    dispose: () => undefined, addCommand: () => undefined,
    onDidChangeCursorPosition: () => ({ dispose: () => undefined }),
    createDecorationsCollection: () => ({ clear: () => undefined, set: () => undefined }),
    setModel: () => undefined, getModel: () => null, layout: () => undefined,
    revealLineInCenter: () => undefined, setPosition: () => undefined, focus: () => undefined,
    saveViewState: () => null, restoreViewState: () => undefined,
  }
  return {
    editor: {
      create: () => {
        if (criarLanca.ativo) throw new Error(criarLanca.mensagem)
        return editorFalso
      },
      createModel: () => modelo,
      setTheme: () => undefined,
      getModel: () => null,
    },
    KeyMod: { CtrlCmd: 2048 }, KeyCode: { KeyS: 49 },
    Uri: { parse: (s: string) => ({ toString: () => s }) },
    languages: { getLanguages: () => [{ id: 'typescript', extensions: ['.ts'] }] },
  }
})

afterEach(() => { cleanup(); criarLanca.ativo = false })

function criarDeps() {
  const editor = new EditorService()
  const fs = {
    readFile: async () => ({ content: 'const a = 1\n', encoding: 'utf-8' }),
    writeFile: async () => undefined,
    watch: async () => undefined,
  } as never
  return { editor, fs }
}

describe('CodeEditorPane — falha ao carregar o editor (D157)', () => {
  it('1. falha na cadeia de carregamento vira aviso VISÍVEL, nunca painel em branco', async () => {
    criarLanca.ativo = true
    const { editor, fs } = criarDeps()
    const { CodeEditorPane } = await import('../ui/attach/CodeEditorPane')

    render(<CodeEditorPane editor={editor} sessionId="s" fs={fs} />)

    const aviso = await screen.findByTestId('monaco-load-error')
    expect(aviso.textContent).toContain('O editor não pôde ser carregado')
    // A mensagem do erro precisa chegar à tela: sem ela o usuário não tem pista.
    expect(aviso.textContent).toContain('chunk do editor indisponível')
    // Anunciado como alerta para leitor de tela, não texto solto.
    expect(aviso.getAttribute('role')).toBe('alert')
  })

  it('2. caminho feliz NÃO mostra aviso (o .catch não pode criar falso positivo)', async () => {
    criarLanca.ativo = false
    const { editor, fs } = criarDeps()
    const { CodeEditorPane } = await import('../ui/attach/CodeEditorPane')

    render(<CodeEditorPane editor={editor} sessionId="s" fs={fs} />)

    await new Promise((r) => setTimeout(r, 60))
    expect(screen.queryByTestId('monaco-load-error')).toBeNull()
  })
})
