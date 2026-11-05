// FATIA 15, Onda 2, passo 2a — provas do adaptador de fronteira (D146).
// O adaptador é a peça que resolve a duplicação search/diff/changes que a SPEC
// manda resolver, então cada regra do contrato tem prova aqui.
import { describe, expect, it } from 'vitest'
import type { AttachTab, AttachDiffPayload, WorkspaceUri } from '../modules/explorer-search'
// O rótulo de Changes é copiado no adaptador porque changesStrings.ts é interno a
// ui/** e o barrel não o exporta. Este import é de TESTE, não de produção: existe
// só para que deriva silenciosa derrube a suíte em vez de chegar na tela do dono.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// O rótulo da aba Changes é COPIADO no adaptador de propósito: ponteAnexo.ts é puro
// e só faz `import type` do barrel, apagado na compilação. Importar o VALOR traria o
// módulo inteiro (React, Monaco, factory) para dentro do shell em runtime — e para
// dentro deste teste. Copiar texto visível cria risco de deriva, então a conferência
// é feita lendo a FONTE com node:fs, do mesmo jeito que frontier.test.ts lê os
// arquivos que verifica.
//
// CORREÇÃO (Onda 2b): este arquivo importava
// '../modules/explorer-search/ui/attach/changes/changesStrings', o que viola o FT-01
// ("nada fora do módulo importa abaixo do barrel"). A violação passou despercebida no
// passo 2a porque o inventário da Fatia 15 não incluía frontier.test.ts — agora inclui.
const CAMINHO_CHANGES_STRINGS = resolve(
  process.cwd(),
  'src/modules/explorer-search/ui/attach/changes/changesStrings.ts',
)
function rotuloChangesNoModulo(): string {
  const fonte = readFileSync(CAMINHO_CHANGES_STRINGS, 'utf-8')
  const achado = /tabLabel:\s*'([^']+)'/.exec(fonte)
  if (!achado) throw new Error(`tabLabel não encontrado em ${CAMINHO_CHANGES_STRINGS}`)
  return achado[1]
}
import {
  ROTULO_CHANGES,
  SEPARADOR_ID,
  caminhoDaUri,
  dividirIdDoModulo,
  ehIdDoModulo,
  fundirAbas,
  idAtivoDoModulo,
  idDaAbaDoModulo,
  mesmaSuperficie,
  nomeDoArquivo,
  projetarAbasDoModulo,
  tipoParaKind,
  tituloDaAbaDoModulo,
} from './ponteAnexo'
import type { Aba } from './abas'

const uri = (s: string) => s as WorkspaceUri
const doModulo = (parciais: Partial<AttachTab> & { uri: string; kind: AttachTab['kind'] }): AttachTab => ({
  dirty: false,
  ...parciais,
  uri: uri(parciais.uri),
})
const nativa = (id: string, extra: Partial<Aba> = {}): Aba => ({ id, type: 'file', title: id, ...extra })

describe('fronteira: esquema de id (D146 §2)', () => {
  it('é estável — a mesma uri na mesma sessão dá o mesmo id', () => {
    expect(idDaAbaDoModulo('s1', 'file:///a.ts')).toBe(idDaAbaDoModulo('s1', 'file:///a.ts'))
    expect(idDaAbaDoModulo('s1', 'file:///a.ts')).toBe(`s1${SEPARADOR_ID}file:///a.ts`)
  })

  it('é único entre sessões — sem isso "abas de S1 não vazam para S2" quebraria', () => {
    expect(idDaAbaDoModulo('s1', 'file:///a.ts')).not.toBe(idDaAbaDoModulo('s2', 'file:///a.ts'))
  })

  it('é reversível', () => {
    expect(dividirIdDoModulo('s1::file:///a/b.ts')).toEqual({ sessionId: 's1', uri: 'file:///a/b.ts' })
    expect(ehIdDoModulo('s1::file:///a.ts')).toBe(true)
    expect(ehIdDoModulo('file-1730000000-3')).toBe(false)
  })

  it('separa no PRIMEIRO separador, porque uri pode conter :: e sessionId não', () => {
    expect(dividirIdDoModulo('s1::file:///a::b.ts')).toEqual({ sessionId: 's1', uri: 'file:///a::b.ts' })
  })

  it('devolve undefined para id nativo do App e para id degenerado', () => {
    expect(dividirIdDoModulo('file-1730000000-3')).toBeUndefined()
    expect(dividirIdDoModulo('::file:///a.ts')).toBeUndefined()
    expect(dividirIdDoModulo('s1::')).toBeUndefined()
  })
})

describe('fronteira: kind do módulo → tipo do App (D146 §1)', () => {
  it('mapeia os quatro kinds', () => {
    expect(tipoParaKind('code')).toBe('file')
    expect(tipoParaKind('search')).toBe('search')
    expect(tipoParaKind('changes')).toBe('diff')
    expect(tipoParaKind('diff')).toBe('diff-arquivo')
  })

  it('changes vira diff de propósito: o nome do tipo é preservado, o corpo é que troca', () => {
    // Preservar o nome evita quebrar ícone, CSS, MANAGED_TAB_TYPES/DOCKED_TAB_TYPES
    // e os testes que citam 'diff'. E 'diff' do módulo NÃO pode cair no mesmo tipo,
    // senão duas superfícies singleton colidiriam na reutilização de aba.
    expect(tipoParaKind('changes')).not.toBe(tipoParaKind('diff'))
  })
})

describe('fronteira: rótulos espelham a faixa que o dono já vê (EditorTabs.tsx:50)', () => {
  it('changes usa o rótulo do módulo, e este teste é a trava contra deriva', () => {
    expect(ROTULO_CHANGES).toBe(rotuloChangesNoModulo())
    expect(tituloDaAbaDoModulo(doModulo({ uri: 'file:///.explorer-search/changes', kind: 'changes' })))
      .toBe(rotuloChangesNoModulo())
  })

  it('diff usa o título do payload, que já vem resolvido, com fallback honesto', () => {
    const payload: AttachDiffPayload = { resource: uri('file:///a.ts'), title: 'a.ts (Working Tree)', original: '', modified: '' }
    expect(tituloDaAbaDoModulo(doModulo({ uri: 'file:///.explorer-search/diff', kind: 'diff', diff: payload })))
      .toBe('a.ts (Working Tree)')
    expect(tituloDaAbaDoModulo(doModulo({ uri: 'file:///.explorer-search/diff', kind: 'diff' }))).toBe('Diff')
  })

  it('code e search usam o nome do arquivo, não o caminho inteiro', () => {
    expect(tituloDaAbaDoModulo(doModulo({ uri: 'file:///home/user/proj/src/app.ts', kind: 'code' }))).toBe('app.ts')
    expect(tituloDaAbaDoModulo(doModulo({ uri: 'file:///x/resultado.md', kind: 'search' }))).toBe('resultado.md')
  })

  it('nomeDoArquivo e caminhoDaUri se comportam como os helpers do módulo', () => {
    expect(nomeDoArquivo('file:///a/b/c.ts')).toBe('c.ts')
    expect(nomeDoArquivo('sem-barra')).toBe('sem-barra')
    expect(caminhoDaUri('file:///home/user/x.ts')).toBe('/home/user/x.ts')
    // WorkspaceUri é sempre file:// (core/uri.ts: "sem scheme genérico"), e a
    // normalização tem de bater com a do módulo, não só parecer certa.
    expect(caminhoDaUri('file:///a//b/./c/../d.ts')).toBe('/a/b/d.ts')
    expect(caminhoDaUri('file:///a/b/')).toBe('/a/b')
    expect(caminhoDaUri('/a/b.ts')).toBe('/a/b.ts')
    expect(nomeDoArquivo('file:///a/b/')).toBe('b')
  })
})

describe('fronteira: projeção carrega o estado, que é o que substitui a Regra 10', () => {
  const abas = projetarAbasDoModulo('s1', [
    doModulo({ uri: 'file:///a.ts', kind: 'code', dirty: true, preview: false, active: true }),
    doModulo({ uri: 'file:///b.ts', kind: 'code', preview: true }),
    doModulo({ uri: 'file:///.explorer-search/changes', kind: 'changes' }),
  ])

  it('preserva uri, dirty e preview — RF15-2 depende disso', () => {
    expect(abas[0].uri).toBe('file:///a.ts')
    expect(abas[0].dirty).toBe(true)
    expect(abas[0].preview).toBe(false)
    expect(abas[1].preview).toBe(true)
    expect(abas[1].dirty).toBe(false)
  })

  it('dá dono de sessão a toda aba do módulo — nunca global', () => {
    expect(abas.every((aba) => aba.sessionId === 's1')).toBe(true)
  })

  it('preenche path e isRealFile só para code, e NÃO inventa content', () => {
    expect(abas[0].path).toBe('/a.ts')
    expect(abas[0].isRealFile).toBe(true)
    expect(abas[0].content).toBeUndefined()
    expect(abas[2].path).toBeUndefined()
    expect(abas[2].isRealFile).toBe(false)
  })

  it('usa o id de fronteira e os tipos mapeados', () => {
    expect(abas.map((aba) => aba.id)).toEqual([
      's1::file:///a.ts',
      's1::file:///b.ts',
      's1::file:///.explorer-search/changes',
    ])
    expect(abas.map((aba) => aba.type)).toEqual(['file', 'file', 'diff'])
  })

  it('idAtivoDoModulo aponta a aba que o módulo tem como ativa', () => {
    const tabs = [
      doModulo({ uri: 'file:///a.ts', kind: 'code', active: true }),
      doModulo({ uri: 'file:///b.ts', kind: 'code' }),
    ]
    expect(idAtivoDoModulo('s1', tabs)).toBe('s1::file:///a.ts')
    expect(idAtivoDoModulo('s1', [doModulo({ uri: 'file:///b.ts', kind: 'code' })])).toBeUndefined()
    expect(idAtivoDoModulo('s1', [])).toBeUndefined()
  })
})

describe('fronteira: o que conta como a mesma superfície', () => {
  it('mesma uri é a mesma superfície, mesmo com ids de origem diferente', () => {
    const doApp = nativa('file-1730-1', { type: 'file', uri: 'file:///a.ts' })
    const doModuloAba = nativa('s1::file:///a.ts', { type: 'file', uri: 'file:///a.ts', sessionId: 's1' })
    expect(mesmaSuperficie(doApp, doModuloAba)).toBe(true)
  })

  it('tipo singleton do mesmo dono é a mesma superfície; de outro dono não é', () => {
    expect(mesmaSuperficie(nativa('x', { type: 'diff', sessionId: 's1' }), nativa('y', { type: 'diff', sessionId: 's1' }))).toBe(true)
    expect(mesmaSuperficie(nativa('x', { type: 'diff', sessionId: 's1' }), nativa('y', { type: 'diff', sessionId: 's2' }))).toBe(false)
    expect(mesmaSuperficie(nativa('x', { type: 'diff' }), nativa('y', { type: 'diff' }))).toBe(true)
    expect(mesmaSuperficie(nativa('x', { type: 'diff' }), nativa('y', { type: 'diff', sessionId: 's1' }))).toBe(false)
    expect(mesmaSuperficie(nativa('x', { type: 'search' }), nativa('y', { type: 'diff' }))).toBe(false)
  })

  it('file sem uri (superfície demo) e browser nunca colidem entre si', () => {
    expect(mesmaSuperficie(nativa('file-1', { type: 'file' }), nativa('file-2', { type: 'file' }))).toBe(false)
    expect(mesmaSuperficie(nativa('b-1', { type: 'browser' }), nativa('b-2', { type: 'browser' }))).toBe(false)
  })
})

describe('fronteira: a fusão numa faixa só (entregável (a) da SPEC 2I)', () => {
  it('a superfície REAL vence a casca — o caso Branch Changes', () => {
    // D146 §fato 2: a aba diff do App renderiza DiffView com diffFiles que "nasce e
    // permanece vazio". A do módulo é o ChangesPane real, e carrega uri.
    const casca = nativa('diff-1730-1', { type: 'diff', title: 'Branch Changes', sessionId: 's1' })
    const real = projetarAbasDoModulo('s1', [doModulo({ uri: 'file:///.explorer-search/changes', kind: 'changes' })])
    const fundido = fundirAbas([casca], real)
    expect(fundido).toHaveLength(1)
    expect(fundido[0].uri).toBe('file:///.explorer-search/changes')
    expect(fundido[0].title).toBe(rotuloChangesNoModulo())
  })

  it('a casca NÃO vence quando a ordem é invertida — a regra é pela uri, não pela posição', () => {
    const casca = nativa('diff-1730-1', { type: 'diff', title: 'Branch Changes', sessionId: 's1' })
    const real = projetarAbasDoModulo('s1', [doModulo({ uri: 'file:///.explorer-search/changes', kind: 'changes' })])
    const fundido = fundirAbas(real, [casca])
    expect(fundido).toHaveLength(1)
    expect(fundido[0].uri).toBe('file:///.explorer-search/changes')
  })

  it('o mesmo arquivo aberto pelos dois caminhos vira UMA aba', () => {
    const doApp = nativa('file-1730-1', { type: 'file', title: 'a.ts', path: '/a.ts', uri: 'file:///a.ts', sessionId: 's1' })
    const doModuloAbas = projetarAbasDoModulo('s1', [doModulo({ uri: 'file:///a.ts', kind: 'code', dirty: true })])
    const fundido = fundirAbas([doApp], doModuloAbas)
    expect(fundido).toHaveLength(1)
    expect(fundido[0].dirty).toBe(true)
    expect(fundido[0].id).toBe('s1::file:///a.ts')
  })

  it('entre duas abas COM uri vence a de fronteira, porque é a que o EditorService governa', () => {
    // O mesmo arquivo aberto pelos dois caminhos: as duas abas têm uri, então o
    // critério 1 não decide. Sem o desempate por origem a fusão deixaria na faixa a
    // aba nativa do App, que renderiza o Monaco simples que NÃO salva — e RF15-1
    // (editar+salvar sem F5) ficaria impossível justamente no caso mais comum.
    const doApp = nativa('file-1730-1', { type: 'file', title: 'a.ts', path: '/a.ts', uri: 'file:///a.ts', sessionId: 's1' })
    const doModuloAba = projetarAbasDoModulo('s1', [doModulo({ uri: 'file:///a.ts', kind: 'code' })])[0]
    expect(fundirAbas([doApp], [doModuloAba])[0].id).toBe('s1::file:///a.ts')
    expect(fundirAbas([doModuloAba], [doApp])[0].id).toBe('s1::file:///a.ts')
  })

  it('em empate de peso mantém a que já estava na faixa (fusão determinística)', () => {
    const a = nativa('x', { type: 'diff', sessionId: 's1' })
    const b = nativa('y', { type: 'diff', sessionId: 's1' })
    expect(fundirAbas([a], [b])[0].id).toBe('x')
    expect(fundirAbas([b], [a])[0].id).toBe('y')
  })

  it('preserva a ordem de primeira aparição e não reordena nada', () => {
    const nativas = [nativa('prov', { type: 'providers' }), nativa('br', { type: 'browser' })]
    const projetadas = projetarAbasDoModulo('s1', [
      doModulo({ uri: 'file:///a.ts', kind: 'code' }),
      doModulo({ uri: 'file:///b.ts', kind: 'code' }),
    ])
    expect(fundirAbas(nativas, projetadas).map((aba) => aba.id)).toEqual(['prov', 'br', 's1::file:///a.ts', 's1::file:///b.ts'])
  })

  it('Provedores e arquivo viram abas irmãs — aceite 2 da SPEC e o caso §8.4', () => {
    const projetadas = projetarAbasDoModulo('s1', [doModulo({ uri: 'file:///a.ts', kind: 'code', active: true })])
    const fundido = fundirAbas([nativa('prov', { type: 'providers' })], projetadas)
    expect(fundido).toHaveLength(2)
    expect(fundido.map((aba) => aba.type)).toEqual(['providers', 'file'])
    // o ganho colateral: não existe mais "arquivo aberto + Provedores ao mesmo tempo"
    // como caso especial, porque os dois são abas na mesma faixa
    expect(fundido.filter((aba) => aba.type === 'providers')).toHaveLength(1)
  })

  it('fundir listas vazias não inventa aba', () => {
    expect(fundirAbas([], [])).toEqual([])
    expect(fundirAbas([nativa('a')], [])).toHaveLength(1)
    expect(fundirAbas([], projetarAbasDoModulo('s1', []))).toEqual([])
  })
})
