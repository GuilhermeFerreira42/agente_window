// Testes práticos das ferramentas com diretórios temporários isolados.
// Nada aponta para documentos pessoais nem para caminhos reais do usuário.
import { link, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { criarExecutoresReais } from '../server/discos'

let raiz: string
let outroProjeto: string
let exec: ReturnType<typeof criarExecutoresReais>
const pedido = (ferramenta: 'ler' | 'listar' | 'buscar' | 'criar' | 'escrever', argumentos: Record<string, unknown>) => ({
  id: `${ferramenta}-fixture`, ferramenta, argumentos,
})

beforeAll(async () => {
  raiz = await mkdtemp(path.join(tmpdir(), 'agir-workspace-fixture-'))
  outroProjeto = await mkdtemp(path.join(tmpdir(), 'agir-outro-projeto-fixture-'))
  exec = criarExecutoresReais(raiz)
  await mkdir(path.join(raiz, 'docs'), { recursive: true })
  await writeFile(path.join(raiz, 'docs', 'nota.md'), 'conteúdo interno original', 'utf8')
  await writeFile(path.join(outroProjeto, 'arquivo-projeto.txt'), 'conteúdo do segundo projeto', 'utf8')
})

afterAll(async () => {
  exec?.fechar()
  if (raiz) await rm(raiz, { recursive: true, force: true })
  if (outroProjeto) await rm(outroProjeto, { recursive: true, force: true })
})

describe('Executores reais de disco — fixtures temporárias', () => {
  it('lê arquivo dentro do workspace por caminho relativo e absoluto', async () => {
    const relativo = await exec.ler(pedido('ler', { caminho: 'docs/nota.md' }))
    const absoluto = await exec.ler(pedido('ler', { caminho: path.join(raiz, 'docs', 'nota.md') }))
    expect(relativo).toMatchObject({ ok: true, conteudo: 'conteúdo interno original' })
    expect(absoluto.ok).toBe(true)
  })

  it('lê, lista e edita um caminho explícito fora do workspace, conforme as permissões do SO', async () => {
    const arquivoExterno = path.join(outroProjeto, 'arquivo-projeto.txt')
    const lido = await exec.ler(pedido('ler', { caminho: arquivoExterno }))
    const listado = await exec.listar(pedido('listar', { caminho: outroProjeto }))
    const editado = await exec.escrever(pedido('escrever', { caminho: arquivoExterno, conteudo: 'edição autorizada no projeto externo' }))
    expect(lido).toMatchObject({ ok: true, conteudo: 'conteúdo do segundo projeto' })
    expect(listado.ok).toBe(true)
    expect(listado.conteudo).toContain('arquivo-projeto.txt')
    expect(editado.ok).toBe(true)
    await expect(readFile(arquivoExterno, 'utf8')).resolves.toBe('edição autorizada no projeto externo')
  })

  it('cria no outro projeto e preserva uma colisão sem sobrescrever', async () => {
    const destino = path.join(outroProjeto, 'novo.txt')
    const criado = await exec.criar(pedido('criar', { caminho: destino, conteudo: 'primeira versão' }))
    const colisao = await exec.criar(pedido('criar', { caminho: destino, conteudo: 'não sobrescrever' }))
    expect(criado.ok).toBe(true)
    expect(colisao.ok).toBe(false)
    expect(colisao.resumo).toContain('já existe')
    await expect(readFile(destino, 'utf8')).resolves.toBe('primeira versão')
  })

  it('duas criações concorrentes no mesmo destino: só uma vence', async () => {
    const destino = path.join(raiz, 'corrida.txt')
    const resultados = await Promise.all([
      exec.criar(pedido('criar', { caminho: destino, conteudo: 'A' })),
      exec.criar(pedido('criar', { caminho: destino, conteudo: 'B' })),
    ])
    expect(resultados.filter((r) => r.ok)).toHaveLength(1)
    expect(resultados.filter((r) => !r.ok && r.resumo.includes('já existe'))).toHaveLength(1)
    await expect(readFile(destino, 'utf8')).resolves.toMatch(/^(A|B)$/)
  })

  it('escrever exige leitura prévia nesta execução e então atualiza o arquivo', async () => {
    const destino = path.join(raiz, 'docs', 'editavel.txt')
    await writeFile(destino, 'antes', 'utf8')
    const semLeitura = await exec.escrever(pedido('escrever', { caminho: destino, conteudo: 'não gravar' }))
    expect(semLeitura.ok).toBe(false)
    expect(semLeitura.resumo).toContain('releia')
    await exec.ler(pedido('ler', { caminho: destino }))
    const gravado = await exec.escrever(pedido('escrever', { caminho: destino, conteudo: 'depois' }))
    expect(gravado.ok).toBe(true)
    await expect(readFile(destino, 'utf8')).resolves.toBe('depois')
  })

  it('escrever detecta alteração desde a leitura e preserva os bytes concorrentes', async () => {
    const destino = path.join(raiz, 'docs', 'conflito.txt')
    await writeFile(destino, 'versão lida', 'utf8')
    await exec.ler(pedido('ler', { caminho: destino }))
    await writeFile(destino, 'versão concorrente', 'utf8')
    const resultado = await exec.escrever(pedido('escrever', { caminho: destino, conteudo: 'tentativa obsoleta' }))
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('Conflito')
    await expect(readFile(destino, 'utf8')).resolves.toBe('versão concorrente')
  })

  it('buscar funciona em outro projeto quando o diretório é explícito', async () => {
    const resultado = await exec.buscar(pedido('buscar', { caminho: outroProjeto, padrao: 'projeto' }))
    expect(resultado.ok).toBe(true)
    expect(resultado.conteudo).toContain('arquivo-projeto.txt')
  })

  it('escrever recusa hard link para não romper a identidade compartilhada', async () => {
    const destino = path.join(raiz, 'docs', 'hardlink-origem.txt')
    const alias = path.join(raiz, 'docs', 'hardlink-alias.txt')
    await writeFile(destino, 'compartilhado', 'utf8')
    await link(destino, alias)
    await exec.ler(pedido('ler', { caminho: destino }))
    const resultado = await exec.escrever(pedido('escrever', { caminho: destino, conteudo: 'não substituir' }))
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('hard links')
    await expect(readFile(destino, 'utf8')).resolves.toBe('compartilhado')
    await expect(readFile(alias, 'utf8')).resolves.toBe('compartilhado')
  })

  it('buscar no workspace não segue symlink para outro projeto', async () => {
    await symlink(outroProjeto, path.join(raiz, 'atalho-externo'))
    const resultado = await exec.buscar(pedido('buscar', { caminho: raiz, padrao: 'arquivo-projeto' }))
    expect(resultado.ok).toBe(true)
    expect(resultado.conteudo).toBe('')
  })

  it('erros e entradas vazias falham sem modificar o fixture', async () => {
    const vazio = await exec.ler(pedido('ler', { caminho: '  ' }))
    const pasta = await exec.ler(pedido('ler', { caminho: raiz }))
    const itens = await readdir(raiz)
    expect(vazio.ok).toBe(false)
    expect(pasta.ok).toBe(false)
    expect(itens).toContain('docs')
  })
})
