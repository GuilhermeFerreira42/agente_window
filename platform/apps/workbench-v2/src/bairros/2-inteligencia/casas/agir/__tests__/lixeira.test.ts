// ============================================================================
// Casa Agir — provas da lixeira (FATIA 12, RNF12-1): mover arquivo/pasta no
// Linux (XDG feito à mão), colisão de nome, bilhete .trashinfo, falha =
// nada some; Windows via comando puro + execução injetável (sem Windows).
// ============================================================================
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  comandoLixeiraWindows,
  contarConteudo,
  dataBilheteXdg,
  detalheErroWindows,
  formatarTamanho,
  moverParaLixeira,
  resolverPastaTrashLinux,
} from '../server/lixeira'

const base = await mkdtemp(path.join(tmpdir(), 'agir-lixeira-'))
afterAll(async () => {
  await rm(base, { recursive: true, force: true })
})

async function novaPastaTrash(): Promise<string> {
  const dir = await mkdtemp(path.join(base, 'trash-'))
  return dir
}

describe('lixeira — XDG no Linux', () => {
  it('resolve $XDG_DATA_HOME/Trash, ou ~/.local/share/Trash por padrão', () => {
    expect(resolverPastaTrashLinux('/home/ze', '/tmp/xdg')).toBe(path.join('/tmp/xdg', 'Trash'))
    expect(resolverPastaTrashLinux('/home/ze', '')).toBe(path.join('/home/ze', '.local', 'share', 'Trash'))
  })

  it('move arquivo: some da origem, aparece em files/ com bilhete Path+DeletionDate', async () => {
    const trash = await novaPastaTrash()
    const origem = path.join(base, 'alvo.txt')
    await writeFile(origem, 'conteúdo secreto', 'utf8')
    const resultado = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(true)
    await expect(stat(origem)).rejects.toThrow() // sumiu da origem
    const destino = path.join(trash, 'files', 'alvo.txt')
    expect(resultado.destino).toBe(destino)
    expect(await readFile(destino, 'utf8')).toBe('conteúdo secreto') // restaurável: inteiro
    const bilhete = await readFile(path.join(trash, 'info', 'alvo.txt.trashinfo'), 'utf8')
    expect(bilhete).toContain('[Trash Info]')
    expect(bilhete).toContain(`Path=${encodeURI(origem)}`)
    expect(bilhete).toMatch(/DeletionDate=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('move pasta com conteúdo inteiro (subpastas junto)', async () => {
    const trash = await novaPastaTrash()
    const origem = path.join(base, 'pasta-alvo')
    await mkdir(path.join(origem, 'sub'), { recursive: true })
    await writeFile(path.join(origem, 'sub', 'dentro.txt'), 'dentro', 'utf8')
    const resultado = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(true)
    await expect(stat(origem)).rejects.toThrow()
    expect(await readFile(path.join(trash, 'files', 'pasta-alvo', 'sub', 'dentro.txt'), 'utf8')).toBe('dentro')
  })

  it('colisão de nome vira nome.2 (nunca sobrescreve a lixeira)', async () => {
    const trash = await novaPastaTrash()
    await mkdir(path.join(trash, 'files'), { recursive: true })
    await writeFile(path.join(trash, 'files', 'igual.txt'), 'velho', 'utf8')
    const origem = path.join(base, 'igual.txt')
    await writeFile(origem, 'novo', 'utf8')
    const resultado = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(true)
    expect(resultado.destino).toBe(path.join(trash, 'files', 'igual.txt.2'))
    expect(await readFile(path.join(trash, 'files', 'igual.txt'), 'utf8')).toBe('velho') // intacto
  })

  it('origem inexistente → falha honesta, nada some', async () => {
    const trash = await novaPastaTrash()
    const resultado = await moverParaLixeira(path.join(base, 'fantasma.txt'), { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(false)
    expect(resultado.motivo).toContain('nada sumiu')
  })

  it('lixeira sem escrita → falha honesta e a origem fica intacta (RF12-5)', async () => {
    const trash = path.join(base, 'trash-arquivo')
    await writeFile(trash, 'sou um arquivo, não uma pasta', 'utf8') // mkdir falha aqui dentro
    const origem = path.join(base, 'vitima.txt')
    await writeFile(origem, 'não me apague', 'utf8')
    const resultado = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(false)
    expect(await readFile(origem, 'utf8')).toBe('não me apague') // intacta
  })

  it('sistema sem lixeira conhecida → erro honesto, nunca apaga (RNF12-1)', async () => {
    const origem = path.join(base, 'alvo-darwin.txt')
    await writeFile(origem, 'x', 'utf8')
    const resultado = await moverParaLixeira(origem, { plataforma: 'darwin' })
    expect(resultado.ok).toBe(false)
    expect(resultado.motivo).toContain('não tem lixeira conhecida')
    expect(await readFile(origem, 'utf8')).toBe('x')
  })
})

describe('lixeira — Windows (comando puro + execução injetável)', () => {
  it('manda arquivo para a Lixeira real (SendToRecycleBin), com apóstrofo escapado', async () => {
    const chamadas: Array<{ comando: string; args: string[] }> = []
    const origem = path.join(base, "o'neil.txt") // real, com apóstrofo (o stat vem antes do despacho)
    await writeFile(origem, 'x', 'utf8')
    const resultado = await moverParaLixeira(origem, {
      plataforma: 'win32',
      executar: async (comando, args) => {
        chamadas.push({ comando, args })
        return { stdout: '', stderr: '' }
      },
    })
    expect(resultado.ok).toBe(true)
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].comando).toBe('powershell.exe')
    // C4: só switches OFICIAIS do powershell.exe 5.1 (`-NonFatal` não existe).
    expect(chamadas[0].args.slice(0, 3)).toEqual(['-NoProfile', '-NonInteractive', '-Command'])
    expect(chamadas[0].args.join(' ')).not.toContain('NonFatal')
    const script = chamadas[0].args.join(' ')
    expect(script).toContain('DeleteFile')
    expect(script).toContain('SendToRecycleBin')
    expect(script).toContain("o''neil.txt") // apóstrofo dobrado
    expect(script).not.toContain('Remove-Item') // nunca apaga direto
  })

  it('pasta usa DeleteDirectory; falha do PowerShell = nada sumiu', async () => {
    const pasta = comandoLixeiraWindows('C:\\trab\\pasta', true)
    expect(pasta.args.join(' ')).toContain('DeleteDirectory')
    const origem = path.join(base, 'pasta-win')
    await mkdir(origem, { recursive: true })
    const falha = Object.assign(new Error('exit 1'), { stderr: 'DeleteDirectory falhou: caminho longo demais' })
    const resultado = await moverParaLixeira(origem, {
      plataforma: 'win32',
      executar: async () => {
        throw falha
      },
    })
    expect(resultado.ok).toBe(false)
    expect(resultado.motivo).toContain('nada sumiu')
    expect(resultado.motivo).toContain('caminho longo demais') // o detalhe do Windows viaja junto (C4)
    await expect(stat(origem)).resolves.toBeDefined() // de pé
  })
})

describe('lixeira — detalhe do erro Windows (C4: recusa nunca mais cega)', () => {
  it('prefere stderr, cai para stdout/message, corta em 300 e nunca volta vazio', () => {
    expect(detalheErroWindows(Object.assign(new Error('exit 1'), { stderr: '  motivo real  ', stdout: 'outro' }))).toBe('motivo real')
    expect(detalheErroWindows(Object.assign(new Error('exit 1'), { stdout: 'só stdout' }))).toBe('só stdout')
    expect(detalheErroWindows(new Error('só message'))).toBe('só message')
    expect(detalheErroWindows(Object.assign(new Error('x'), { stderr: 'a'.repeat(400) }))).toBe(`${'a'.repeat(300)}…`)
    expect(detalheErroWindows(null)).toBe('sem detalhe do sistema')
  })
})

describe('lixeira — contagem e tamanho (o cartão mostra antes — RF12-6)', () => {
  it('conta itens aninhados + bytes', async () => {
    const pasta = path.join(base, 'contar')
    await mkdir(path.join(pasta, 'sub'), { recursive: true })
    await writeFile(path.join(pasta, 'a.txt'), '12345', 'utf8')
    await writeFile(path.join(pasta, 'sub', 'b.txt'), '12345678', 'utf8')
    const contagem = await contarConteudo(pasta)
    expect(contagem).toEqual({ itens: 3, bytes: 13, cortada: false }) // a.txt + sub + b.txt
  })

  it('corta no teto e avisa (pasta gigante não trava o cartão)', async () => {
    const pasta = path.join(base, 'gigante')
    await mkdir(pasta, { recursive: true })
    await writeFile(path.join(pasta, 'a.txt'), 'x', 'utf8')
    await writeFile(path.join(pasta, 'b.txt'), 'x', 'utf8')
    const contagem = await contarConteudo(pasta, 1)
    expect(contagem.cortada).toBe(true)
    expect(contagem.itens).toBe(1)
  })

  it('formatarTamanho fala pt-BR (vírgula decimal)', () => {
    expect(formatarTamanho(500)).toBe('500 B')
    expect(formatarTamanho(2048)).toBe('2 KB')
    expect(formatarTamanho(1536)).toBe('1,5 KB')
    expect(dataBilheteXdg(new Date(2026, 9, 21, 15, 8, 9))).toBe('2026-10-21T15:08:09')
  })
})
