// ============================================================================
// Casa Agir — provas do executor `excluir` (FATIA 12): arquivo e pasta vão
// para a lixeira XDG (temporária nos testes, via $XDG_DATA_HOME); território,
// nomes inválidos e a própria pasta raiz = recusa honesta; falha = nada some.
// ============================================================================
import { lstat, mkdtemp, mkdir, readFile, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PedidoFerramenta } from '../contract'
import { criarExecutoresReais, descreverAlvoExcluir } from '../server/discos'

const base = await mkdtemp(path.join(tmpdir(), 'agir-excluir-'))
const raiz = path.join(base, 'ws')
await mkdir(raiz, { recursive: true })
const xdgAnterior = process.env.XDG_DATA_HOME
const xdgTemp = await mkdtemp(path.join(base, 'xdg-'))

beforeEach(() => {
  process.env.XDG_DATA_HOME = xdgTemp
})
afterEach(() => {
  if (xdgAnterior === undefined) delete process.env.XDG_DATA_HOME
  else process.env.XDG_DATA_HOME = xdgAnterior
})
afterAll(async () => {
  await rm(base, { recursive: true, force: true })
})

function pedidoExcluir(caminho: unknown): PedidoFerramenta {
  return { id: 'e1', ferramenta: 'excluir', argumentos: { caminho } }
}

async function excluirComPrevia(executores: ReturnType<typeof criarExecutoresReais>, caminho: unknown) {
  const pedido = pedidoExcluir(caminho)
  await executores.prepararExclusao(pedido)
  return executores.excluir(pedido)
}

describe('excluir — executor real', () => {
  it('arquivo some da pasta e aparece inteiro na lixeira', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    await writeFile(path.join(raiz, 'alvo.txt'), 'conteúdo do alvo', 'utf8')
    const resultado = await excluirComPrevia(executores, 'alvo.txt')
    expect(resultado.ok).toBe(true)
    expect(resultado.resumo).toContain('lixeira')
    await expect(stat(path.join(raiz, 'alvo.txt'))).rejects.toThrow()
    expect(await readFile(path.join(xdgTemp, 'Trash', 'files', 'alvo.txt'), 'utf8')).toBe('conteúdo do alvo')
  })

  it('pasta com arquivos vai inteira e o resumo conta os itens', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    await mkdir(path.join(raiz, 'caixa', 'sub'), { recursive: true })
    await writeFile(path.join(raiz, 'caixa', 'um.txt'), '1', 'utf8')
    await writeFile(path.join(raiz, 'caixa', 'sub', 'dois.txt'), '2', 'utf8')
    const resultado = await excluirComPrevia(executores, 'caixa')
    expect(resultado.ok).toBe(true)
    expect(resultado.resumo).toContain('3 itens')
    await expect(stat(path.join(raiz, 'caixa'))).rejects.toThrow()
    expect(await readFile(path.join(xdgTemp, 'Trash', 'files', 'caixa', 'sub', 'dois.txt'), 'utf8')).toBe('2')
  })

  it('../fora = recusa de território, mesmo aprovado (RF12-4)', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const resultado = await excluirComPrevia(executores, '../fora.txt')
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('Fora da pasta de trabalho')
  })

  it('a própria pasta de trabalho nunca é alvo (RNF12-3)', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    for (const entrada of ['.', raiz]) {
      const resultado = await excluirComPrevia(executores, entrada)
      expect(resultado.ok).toBe(false)
      expect(resultado.resumo).toContain('pasta de trabalho inteira')
    }
    await expect(stat(raiz)).resolves.toBeDefined() // de pé
  })

  it('caminho vazio e inexistente = recusa honesta, nada some', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const vazio = await excluirComPrevia(executores, '')
    expect(vazio.ok).toBe(false)
    expect(vazio.resumo).toContain('faltou caminho')
    const fantasma = await excluirComPrevia(executores, 'fantasma.txt')
    expect(fantasma.ok).toBe(false)
    expect(fantasma.resumo).toContain('nada sumiu')
  })

  it('falha da lixeira = erro honesto com a origem intacta (RF12-5)', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    process.env.XDG_DATA_HOME = path.join(base, 'xdg-arquivo') // mkdir falha: é arquivo
    await writeFile(process.env.XDG_DATA_HOME, 'não sou pasta', 'utf8')
    await writeFile(path.join(raiz, 'vitima.txt'), 'intacta', 'utf8')
    const resultado = await excluirComPrevia(executores, 'vitima.txt')
    expect(resultado.ok).toBe(false)
    expect(await readFile(path.join(raiz, 'vitima.txt'), 'utf8')).toBe('intacta')
  })
})

describe('excluir — prévia do cartão reforçado (descreverAlvoExcluir)', () => {
  it('arquivo mostra o começo do conteúdo; pasta mostra contagem + tamanho', async () => {
    await writeFile(path.join(raiz, 'carta.txt'), 'primeira linha\nsegunda linha', 'utf8')
    const previaArquivo = await descreverAlvoExcluir(raiz, 'carta.txt')
    expect(previaArquivo).toContain('primeira linha')
    await mkdir(path.join(raiz, 'pacote'), { recursive: true })
    await writeFile(path.join(raiz, 'pacote', 'a.txt'), '12345', 'utf8')
    const previaPasta = await descreverAlvoExcluir(raiz, 'pacote')
    expect(previaPasta).toContain('1 item')
    expect(previaPasta).toContain('5 B')
  })

  it('problema vira frase honesta (aprovar não apaga nada)', async () => {
    expect(await descreverAlvoExcluir(raiz, '')).toContain('não apaga nada')
    expect(await descreverAlvoExcluir(raiz, '../fora.txt')).toContain('Fora da pasta')
    expect(await descreverAlvoExcluir(raiz, 'sumido.txt')).toContain('não existe')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// DEBT-24 / D128 (2026-10-31) — provas das correções no EXECUTOR, sobre os
// testes restaurados da versão homologada em D97 (acima, sem alteração).
//
// O que se prova aqui e não se provava antes:
//   C1 — contenção REAL na pasta de trabalho via realpath (D97: "território =
//        pasta ativa"). Sob D121 as cinco ferramentas irmãs aceitam caminho
//        externo; exclusão é destrutiva e permanece contida DE PROPÓSITO.
//   C2 — escape por symlink de componente pai é fechado (achado F2).
//   C3 — link simbólico como alvo é recusado, nunca seguido.
//   C4 — duas exclusões concorrentes do mesmo caminho não correm juntas.
// ════════════════════════════════════════════════════════════════════════════

describe('excluir — correções DEBT-24 (contenção e corrida)', () => {
  it('C2: symlink de componente pai apontando para FORA é recusado e o segredo fica intacto', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const fora = path.join(base, 'fora-da-pasta')
    await mkdir(fora, { recursive: true })
    await writeFile(path.join(fora, 'segredo.txt'), 'FORA-DO-WORKSPACE', 'utf8')
    // O link mora DENTRO da pasta de trabalho; o alvo, FORA.
    await symlink(fora, path.join(raiz, 'ponteiro'))
    const resultado = await excluirComPrevia(executores, 'ponteiro/segredo.txt')
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('Fora da pasta de trabalho')
    expect(resultado.resumo).toContain('Nada sumiu')
    // O essencial: o arquivo externo NÃO foi para a lixeira.
    expect(await readFile(path.join(fora, 'segredo.txt'), 'utf8')).toBe('FORA-DO-WORKSPACE')
    await expect(stat(path.join(xdgTemp, 'Trash', 'files', 'segredo.txt'))).rejects.toThrow()
    executores.fechar()
  })

  it('C3: link simbólico como alvo é recusado — alvo e link intactos', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const alvoReal = path.join(raiz, 'c3-real.txt')
    const link = path.join(raiz, 'c3-link.txt')
    await writeFile(alvoReal, 'não me apague', 'utf8')
    await symlink(alvoReal, link)
    const resultado = await excluirComPrevia(executores, 'c3-link.txt')
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('é um link')
    expect(resultado.resumo).toContain('nada sumiu')
    expect(await readFile(alvoReal, 'utf8')).toBe('não me apague')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    executores.fechar()
  })

  it('C1: caminho absoluto fora da pasta de trabalho é recusado (mais estrito que as irmãs sob D121)', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const fora = path.join(base, 'absoluto-fora.txt')
    await writeFile(fora, 'intacto', 'utf8')
    const resultado = await excluirComPrevia(executores, fora)
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('Fora da pasta de trabalho')
    expect(await readFile(fora, 'utf8')).toBe('intacto')
    executores.fechar()
  })

  it('C4: duas exclusões concorrentes do MESMO caminho — exatamente uma succeeds', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    await writeFile(path.join(raiz, 'c4-alvo.txt'), 'um só vai', 'utf8')
    const [um, dois] = await Promise.all([
      excluirComPrevia(executores, 'c4-alvo.txt'),
      excluirComPrevia(executores, 'c4-alvo.txt'),
    ])
    const sucessos = [um, dois].filter((r) => r.ok).length
    expect(sucessos).toBe(1)
    // A que perdeu diz a verdade: não existia mais. Nenhuma inventa sucesso.
    const perdedora = [um, dois].find((r) => !r.ok)
    expect(String(perdedora?.resumo)).toContain('não existe')
    expect(await readFile(path.join(xdgTemp, 'Trash', 'files', 'c4-alvo.txt'), 'utf8')).toBe('um só vai')
    executores.fechar()
  })

  it('C1: prévia do cartão é honesta para link, para alvo fora da pasta e para alvo legítimo', async () => {
    await symlink(path.join(base, 'fora-da-pasta'), path.join(raiz, 'previa-link'))
    // Ordem homologada: o link é recusado ANTES do realpath — "é um link" é o
    // motivo mais preciso, e a prévia diz que aprovar não apaga nada.
    const previaLink = await descreverAlvoExcluir(raiz, 'previa-link')
    expect(previaLink).toContain('é um link')
    expect(previaLink).toContain('aprovar não apaga nada')
    // Alvo REAL fora da pasta de trabalho → motivo de território.
    expect(await descreverAlvoExcluir(raiz, path.join(base, 'fora-da-pasta', 'segredo.txt'))).toContain(
      'Fora da pasta',
    )
    const alvoReal = path.join(raiz, 'previa-real.txt')
    await writeFile(alvoReal, 'conteúdo visível', 'utf8')
    await symlink(alvoReal, path.join(raiz, 'previa-symlink.txt'))
    expect(await descreverAlvoExcluir(raiz, 'previa-symlink.txt')).toContain('é um link')
    // E a prévia de alvo legítimo volta a mostrar o conteúdo (RF12-6 restaurado).
    expect(await descreverAlvoExcluir(raiz, 'previa-real.txt')).toContain('conteúdo visível')
  })
})


describe('DELETE — vínculo server-side entre prévia e execução', () => {
  it.each(['linux', 'win32'] as const)('substituição entre aprovação e execução em %s exige nova confirmação', async (plataforma) => {
    const executores = criarExecutoresReais(raiz, { plataforma, executar: async () => { throw new Error('não deveria chamar PowerShell') } })
    const nome = 'troca-' + plataforma + '.txt'
    const origem = path.join(raiz, nome)
    await writeFile(origem, 'APROVADO-A')
    const pedido = pedidoExcluir(nome)
    expect(await executores.prepararExclusao(pedido)).toContain('APROVADO-A')
    await rename(origem, origem + '.preservado')
    await writeFile(origem, 'SUBSTITUTO-B')
    const r = await executores.excluir(pedido)
    expect(r).toMatchObject({ ok: false, requerNovaAprovacao: true })
    expect(await readFile(origem, 'utf8')).toBe('SUBSTITUTO-B')
    expect(await readFile(origem + '.preservado', 'utf8')).toBe('APROVADO-A')
  })

  it('edição no mesmo arquivo e dentro de subpasta invalida a aprovação', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const pasta = path.join(raiz, 'mudanca-interna')
    await mkdir(path.join(pasta, 'sub'), { recursive: true })
    const arquivo = path.join(pasta, 'sub', 'conteudo.txt')
    await writeFile(arquivo, 'ANTES')
    for (const nome of ['mudanca-interna/sub/conteudo.txt', 'mudanca-interna']) {
      const pedido = pedidoExcluir(nome)
      await executores.prepararExclusao(pedido)
      await writeFile(arquivo, 'DEPOIS-' + nome)
      expect(await executores.excluir(pedido)).toMatchObject({ ok: false, requerNovaAprovacao: true })
      expect(await readFile(arquivo, 'utf8')).toBe('DEPOIS-' + nome)
    }
  })

  it('pedido sem prévia, identidade copiada e reutilização não autorizam movimentação', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const nome = 'previa-unica.txt'
    await writeFile(path.join(raiz, nome), 'UM')
    const pedido = pedidoExcluir(nome)
    expect((await executores.excluir(pedido)).ok).toBe(false)
    await executores.prepararExclusao(pedido)
    expect((await executores.excluir({ ...pedido })).ok).toBe(false)
    expect((await executores.excluir(pedido)).ok).toBe(true)
    await writeFile(path.join(raiz, nome), 'DOIS')
    expect((await executores.excluir(pedido)).ok).toBe(false)
    expect(await readFile(path.join(raiz, nome), 'utf8')).toBe('DOIS')
  })

  it('cancelamento antes da movimentação mantém a origem', async () => {
    const executores = criarExecutoresReais(raiz, { plataforma: 'linux' })
    const pedido = pedidoExcluir('cancelado.txt')
    await writeFile(path.join(raiz, 'cancelado.txt'), 'FICA')
    await executores.prepararExclusao(pedido)
    const controller = new AbortController()
    controller.abort()
    expect((await executores.excluir(pedido, { sinal: controller.signal })).ok).toBe(false)
    expect(await readFile(path.join(raiz, 'cancelado.txt'), 'utf8')).toBe('FICA')
  })
})
