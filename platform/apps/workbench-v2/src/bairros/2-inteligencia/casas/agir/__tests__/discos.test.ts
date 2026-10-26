// ============================================================================
// Provas das MÃOS DE VERDADE (conquista 2): disco de verdade em pasta
// temporária — criar/ler/listar/buscar/escrever, escrita atômica e a trava
// de território ligada em cada ferramenta.
// ============================================================================
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { criarExecutoresReais } from '../server/discos'
import { fsSeguroDisponivel } from '../server/fsSeguro'

const raiz = await mkdtemp(path.join(tmpdir(), 'agir-c2-'))
const exec = criarExecutoresReais(raiz)
const caminhoAbsoluto = (relativo: string): string => path.join(raiz, relativo)

afterAll(async () => {
  exec.fechar()
  await rm(raiz, { recursive: true, force: true })
  await rm(`${raiz}-outside`, { recursive: true, force: true })
})

describe.skipIf(!fsSeguroDisponivel)('Executores reais (disco de verdade)', () => {
  it('criar grava o conteúdo exato (e cria subpastas no caminho)', async () => {
    const r = await exec.criar({ id: '1', ferramenta: 'criar', argumentos: { caminho: 'sub/ola.txt', conteudo: 'olá, dono!' } })
    expect(r.ok).toBe(true)
    await expect(readFile(caminhoAbsoluto('sub/ola.txt'), 'utf8')).resolves.toBe('olá, dono!')
  })

  it('ler devolve o conteúdo para o MODELO e o resumo para a TELA', async () => {
    const r = await exec.ler({ id: '2', ferramenta: 'ler', argumentos: { caminho: 'sub/ola.txt' } })
    expect(r.ok).toBe(true)
    expect(r.conteudo).toBe('olá, dono!')
    expect(r.resumo).toContain('caracteres')
  })

  it('aceita caminho ABSOLUTO dentro da pasta (jeito do dono e do modelo)', async () => {
    const r = await exec.ler({ id: '3', ferramenta: 'ler', argumentos: { caminho: caminhoAbsoluto('sub/ola.txt') } })
    expect(r.ok).toBe(true)
  })

  it('listar marca pastas com "/" e ordena', async () => {
    const r = await exec.listar({ id: '4', ferramenta: 'listar', argumentos: { caminho: '.' } })
    expect(r.ok).toBe(true)
    expect(r.conteudo).toContain('sub/')
  })

  it('escrever EXIGE arquivo existente e sobrescreve por completo', async () => {
    const nova = await exec.escrever({ id: '5', ferramenta: 'escrever', argumentos: { caminho: 'novo-aqui.txt', conteudo: 'x' } })
    expect(nova.ok).toBe(false)
    expect(nova.resumo).toContain('"criar"')
    await exec.criar({ id: '6', ferramenta: 'criar', argumentos: { caminho: 'novo-aqui.txt', conteudo: 'primeira versão' } })
    const reescrito = await exec.escrever({ id: '7', ferramenta: 'escrever', argumentos: { caminho: 'novo-aqui.txt', conteudo: 'segunda versão maior' } })
    expect(reescrito.ok).toBe(true)
    await expect(readFile(caminhoAbsoluto('novo-aqui.txt'), 'utf8')).resolves.toBe('segunda versão maior')
  })

  it('buscar acha por pedaço do nome, recursivo, IGNORANDO node_modules', async () => {
    await exec.criar({ id: '8', ferramenta: 'criar', argumentos: { caminho: 'node_modules/armadilha/novo-x.txt', conteudo: 'não' } })
    const r = await exec.buscar({ id: '9', ferramenta: 'buscar', argumentos: { padrao: 'novo' } })
    expect(r.ok).toBe(true)
    expect(r.conteudo?.split('\n')).toEqual(['novo-aqui.txt'])
  })

  it('FORA do território: recusa honesta sem tocar disco', async () => {
    const fora = await exec.criar({ id: '10', ferramenta: 'criar', argumentos: { caminho: '../fora.txt', conteudo: 'não' } })
    expect(fora.ok).toBe(false)
    expect(fora.resumo).toContain('Fora da pasta')
    await expect(readFile(path.resolve(raiz, '../fora.txt'), 'utf8')).rejects.toThrow()
  })

  it('recusa honesta quando falta argumento (nada executa no escuro)', async () => {
    const semCaminho = await exec.criar({ id: '11', ferramenta: 'criar', argumentos: { conteudo: 'x' } })
    const semConteudo = await exec.criar({ id: '12', ferramenta: 'criar', argumentos: { caminho: 'a.txt' } })
    expect(semCaminho.ok).toBe(false)
    expect(semCaminho.resumo).toContain('faltou caminho')
    expect(semConteudo.ok).toBe(false)
    expect(semConteudo.resumo).toContain('faltou conteudo')
  })

  it('ler em pasta (não arquivo): recusa honesta apontando "listar"', async () => {
    const r = await exec.ler({ id: '13', ferramenta: 'ler', argumentos: { caminho: 'sub' } })
    expect(r.ok).toBe(false)
    expect(r.resumo).toContain('tipo de arquivo não permitido')
  })

  it('o resto da pasta fica intacto (pasta temporária só com o que os testes criaram)', async () => {
    const itens = await readdir(raiz)
    expect(itens.sort()).toEqual(['node_modules', 'novo-aqui.txt', 'sub'])
  })

  it('buscar não atravessa symlink para nomes externos', async () => {
    const externo = `${raiz}-outside`
    await mkdir(externo, { recursive: true })
    await writeFile(path.join(externo, 'segredo-externo.txt'), 'sanitizado', 'utf8')
    await symlink(externo, path.join(raiz, 'atalho-externo'))
    const r = await exec.buscar({ id: '14', ferramenta: 'buscar', argumentos: { padrao: 'segredo-externo' } })
    expect(r.ok).toBe(true)
    expect(r.conteudo).toBe('')
    await rm(externo, { recursive: true, force: true })
  })
})
