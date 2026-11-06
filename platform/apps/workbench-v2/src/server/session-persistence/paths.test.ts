// ============================================================================
// Fatia 15 — Onda 3 (D167): o isolamento da pasta de dados.
//
// DEFEITO MEDIDO que originou este passo: os specs E2E rodam contra o MESMO
// servidor do app e gravavam no banco REAL. Rodei `diff_sem_travar.spec.ts` com
// 2 sessões no banco e saí com 3 — a nova apontando para `/tmp/diff-travar-ws`,
// que o spec apaga. Resultado no app de verdade: árvore vazia e
// `400 invalid_workspace`. O produto abria quebrado por causa de um teste.
//
// A correção é pequena e opt-in: `AGENTE_WINDOW_DATA_DIR`, quando presente,
// desvia a pasta. Sem ela, o comportamento é exatamente o de antes (produção em
// `~/.agente_window`). Estas provas policiam as duas metades: o desvio e o
// não-desvio — porque "variável nova" que quebra o default seria pior que o bug.
// ============================================================================
import { afterEach, describe, expect, it } from 'vitest'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { getAppDir, getDatabasePath, getProjectsDir } from './paths'

const ORIGINAL = process.env.AGENTE_WINDOW_DATA_DIR

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.AGENTE_WINDOW_DATA_DIR
  else process.env.AGENTE_WINDOW_DATA_DIR = ORIGINAL
})

describe('Fatia 15 Onda 3 (D167) — a pasta de dados aceita desvio por ambiente', () => {
  it('1. sem a variável, nada muda: continua em ~/.agente_window (produção intacta)', () => {
    delete process.env.AGENTE_WINDOW_DATA_DIR
    expect(getAppDir()).toBe(join(homedir(), '.agente_window'))
    expect(getDatabasePath()).toBe(join(homedir(), '.agente_window', 'agente_window.db'))
    expect(getProjectsDir()).toBe(join(homedir(), '.agente_window', 'projects'))
  })

  it('2. com a variável, banco e projetos mudam JUNTO (nunca um sim e outro não)', () => {
    process.env.AGENTE_WINDOW_DATA_DIR = '/tmp/app-de-verdade'
    expect(getAppDir()).toBe(resolve('/tmp/app-de-verdade'))
    expect(getDatabasePath()).toBe(resolve('/tmp/app-de-verdade', 'agente_window.db'))
    expect(getProjectsDir()).toBe(resolve('/tmp/app-de-verdade', 'projects'))
    // O ponto do passo: o banco do app real não é sequer citado.
    expect(getDatabasePath().includes(join(homedir(), '.agente_window'))).toBe(false)
  })

  it('3. valor vazio ou só espaço é IGNORADO (não desvia para a raiz do nada)', () => {
    process.env.AGENTE_WINDOW_DATA_DIR = '   '
    expect(getAppDir()).toBe(join(homedir(), '.agente_window'))
    process.env.AGENTE_WINDOW_DATA_DIR = ''
    expect(getAppDir()).toBe(join(homedir(), '.agente_window'))
  })

  it('4. caminho relativo é resolvido para absoluto (o sqlite não pode depender do cwd)', () => {
    process.env.AGENTE_WINDOW_DATA_DIR = 'dados-do-teste'
    expect(getAppDir()).toBe(resolve('dados-do-teste'))
    expect(resolve(getAppDir())).toBe(getAppDir())
  })
})
