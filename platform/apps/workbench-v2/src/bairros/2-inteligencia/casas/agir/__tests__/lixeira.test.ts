// ============================================================================
// Casa Agir — provas da lixeira (FATIA 12, RNF12-1): mover arquivo/pasta no
// Linux (XDG feito à mão), colisão de nome, bilhete .trashinfo, falha =
// nada some; Windows via comando puro + execução injetável (sem Windows).
// ============================================================================
import { readFileSync, statSync } from 'node:fs'
import { lstat, mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import * as disco from 'node:fs/promises'
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
      validar: async () => true,
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

// ════════════════════════════════════════════════════════════════════════════
// DEBT-24 / D128 (2026-10-31) — correções SOBRE a versão homologada em D97.
// Os testes acima são a versão restaurada de `90fe21d` (C4 da FATIA 12), sem
// alteração de conteúdo. Os testes abaixo provam as três correções de risco
// comprovado na auditoria F2:
//   K1 — link simbólico/junction é recusado, nunca seguido;
//   K2 — identidade dev:ino conferida antes × depois da movimentação;
//   K3 — REMOVIDO o fallback destrutivo `cp` + `rm(recursive, force)` em EXDEV.
// ════════════════════════════════════════════════════════════════════════════

// Convenção do projeto (ver frontier.test.ts): não usar import.meta.url — sob
// jsdom a URL do módulo não é file://. Testes rodam de platform/apps/workbench-v2.
const FONTE_LIXEIRA = path.resolve(
  process.cwd(),
  'src/bairros/2-inteligencia/casas/agir/server/lixeira.ts',
)

/** K3 só é observável de verdade com dois dispositivos distintos. */
const doisDispositivos = (() => {
  try {
    return statSync(tmpdir()).dev !== statSync(homedir()).dev
  } catch {
    return false
  }
})()

describe('lixeira — correções DEBT-24 (riscos comprovados na auditoria F2)', () => {
  it('K1: link simbólico é RECUSADO e nunca seguido — alvo e link intactos', async () => {
    const trash = await novaPastaTrash()
    const alvoReal = path.join(base, 'k1-real.txt')
    const link = path.join(base, 'k1-link.txt')
    await writeFile(alvoReal, 'não me apague', 'utf8')
    await symlink(alvoReal, link)
    const resultado = await moverParaLixeira(link, { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(false)
    expect(resultado.motivo).toContain('é um link')
    expect(resultado.motivo).toContain('nada sumiu')
    // O ponto da correção: seguir o link teria mandado o ALVO para a lixeira.
    expect(await readFile(alvoReal, 'utf8')).toBe('não me apague')
    expect(await readFile(link, 'utf8')).toBe('não me apague')
    await expect(stat(path.join(trash, 'files', 'k1-link.txt'))).rejects.toThrow()
    await expect(stat(path.join(trash, 'files', 'k1-real.txt'))).rejects.toThrow()
  })

  it('K1: trava de regressão — o alvo é inspecionado com lstat, não com stat cego', () => {
    const fonte = readFileSync(FONTE_LIXEIRA, 'utf8')
    expect(fonte).toContain('info = await lstat(absoluto)')
    expect(fonte).toContain('isSymbolicLink()')
  })

  it('K2: trava de regressão — a identidade dev:ino é conferida depois de mover', () => {
    const fonte = readFileSync(FONTE_LIXEIRA, 'utf8')
    expect(fonte).toContain('identidadeDe')
    expect(fonte).toContain('confirmar a identidade')
  })

  it('K2: movimentação normal preserva a identidade e devolve o destino', async () => {
    const trash = await novaPastaTrash()
    const origem = path.join(base, 'k2-alvo.txt')
    await writeFile(origem, 'identidade estável', 'utf8')
    const antes = await lstat(origem)
    const resultado = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash })
    expect(resultado.ok).toBe(true)
    const destino = String(resultado.destino)
    const depois = await stat(destino)
    expect(depois.ino).toBe(antes.ino)
    expect(await readFile(destino, 'utf8')).toBe('identidade estável')
  })

  it('K3: trava de regressão — o fallback destrutivo (cp + rm force) NÃO existe mais', () => {
    // Era a única operação irreversível do fluxo e a maior superfície de
    // corrida entre validação e movimentação (achado F2).
    const fonte = readFileSync(FONTE_LIXEIRA, 'utf8')
    expect(fonte).not.toContain('force: true')
    expect(fonte).not.toMatch(/\bcp\(/)
    expect(fonte).toContain('outro disco/partição')
  })

  // Condição de ambiente registrada (não é skip silencioso — D79): o caso
  // precisa de dois dispositivos distintos. Neste sandbox tmpdir() é tmpfs e
  // homedir() fica em outro dispositivo, então roda. Onde forem o mesmo
  // dispositivo o caso não roda, e a trava de regressão acima continua valendo.
  it.skipIf(!doisDispositivos)('K3: lixeira em outro dispositivo = recusa honesta e origem INTACTA', async () => {
    const trashOutroDispositivo = path.join(homedir(), '.cache', `agir-k3-trash-${Date.now()}`)
    const origem = path.join(base, 'k3-vitima.txt')
    await writeFile(origem, 'origem em outro dispositivo', 'utf8')
    try {
      const resultado = await moverParaLixeira(origem, {
        plataforma: 'linux',
        pastaTrash: trashOutroDispositivo,
      })
      expect(resultado.ok).toBe(false)
      expect(resultado.motivo).toContain('outro disco/partição')
      expect(resultado.motivo).toContain('Nada sumiu')
      // O essencial: a origem NÃO foi copiada-e-apagada.
      expect(await readFile(origem, 'utf8')).toBe('origem em outro dispositivo')
    } finally {
      await rm(trashOutroDispositivo, { recursive: true, force: true })
    }
  })
})


afterEach(() => vi.restoreAllMocks())

describe('DELETE — reserva exclusiva e falhas reais/injetadas', () => {
  it('duas origens com mesmo nome em paralelo preservam ambos os conteúdos e bilhetes', async () => {
    const trash = await novaPastaTrash()
    const origens = await Promise.all(Array.from({ length: 12 }, async (_, n) => {
      const pasta = path.join(base, 'concorrente-' + n)
      await mkdir(pasta)
      const origem = path.join(pasta, 'igual.txt')
      await writeFile(origem, 'CONTEUDO-' + n)
      return origem
    }))
    let chegadas = 0
    let liberar!: () => void
    const barreira = new Promise<void>((resolve) => { liberar = resolve })
    const mover: typeof disco.rename = async (a, b) => {
      if (++chegadas === origens.length) liberar()
      await barreira // todas as operações selecionam/reservam destino antes de mover
      await disco.rename(a, b)
    }
    const resultados = await Promise.all(origens.map((origem) => moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash, operacoes: { rename: mover } })))
    expect(resultados.every((r) => r.ok)).toBe(true)
    expect(new Set(resultados.map((r) => r.destino)).size).toBe(origens.length)
    for (const [n, resultado] of resultados.entries()) {
      expect(await readFile(resultado.destino!, 'utf8')).toBe('CONTEUDO-' + n)
      const registro = path.join(trash, 'info', path.basename(resultado.destino!) + '.trashinfo')
      expect(await readFile(registro, 'utf8')).toContain(encodeURI(origens[n]))
    }
  })

  it('não sobrescreve registro órfão, arquivo existente ou link pendente no destino', async () => {
    const trash = await novaPastaTrash()
    await mkdir(path.join(trash, 'files'))
    await mkdir(path.join(trash, 'info'))
    await writeFile(path.join(trash, 'info', 'colisao.txt.trashinfo'), 'REGISTRO-ANTIGO')
    await writeFile(path.join(trash, 'files', 'colisao.txt.2'), 'ARQUIVO-ANTIGO')
    await symlink(path.join(base, 'nao-existe'), path.join(trash, 'files', 'colisao.txt.3'))
    const origem = path.join(base, 'colisao.txt')
    await writeFile(origem, 'NOVO')
    const r = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash })
    expect(r.ok).toBe(true)
    expect(r.destino).toBe(path.join(trash, 'files', 'colisao.txt.4'))
    expect(await readFile(path.join(trash, 'info', 'colisao.txt.trashinfo'), 'utf8')).toBe('REGISTRO-ANTIGO')
    expect(await readFile(path.join(trash, 'files', 'colisao.txt.2'), 'utf8')).toBe('ARQUIVO-ANTIGO')
    expect((await lstat(path.join(trash, 'files', 'colisao.txt.3'))).isSymbolicLink()).toBe(true)
  })

  it.each(['writeFile', 'sync'] as const)('falha de %s do bilhete ocorre ANTES de mover: origem intacta e sem rollback', async (metodo) => {
    const trash = await novaPastaTrash()
    const origem = path.join(base, 'registro-' + metodo + '.txt')
    await writeFile(origem, 'ORIGINAL')
    const abrir = disco.open
    const abrirRegistro: typeof disco.open = async (...args) => {
      const handle = await abrir(...args)
      vi.spyOn(handle, metodo).mockRejectedValue(new Error('falha injetada'))
      return handle
    }
    const r = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash, operacoes: { open: abrirRegistro } })
    expect(r.ok).toBe(false)
    expect(r.efeitoIniciado).not.toBe(true)
    expect(await readFile(origem, 'utf8')).toBe('ORIGINAL')
    expect(await disco.readdir(path.join(trash, 'files'))).toEqual([])
    expect(await disco.readdir(path.join(trash, 'info'))).toEqual([])
  })

  it('falha de conferência pós-movimentação informa destino e preserva novo ocupante da origem', async () => {
    const trash = await novaPastaTrash()
    const origem = path.join(base, 'parcial.txt')
    await writeFile(origem, 'MOVIDO')
    const renomear = disco.rename
    let movido = false
    const mover: typeof disco.rename = async (a, b) => {
      await renomear(a, b)
      await writeFile(origem, 'NOVO-OCUPANTE')
      movido = true
    }
    const inspecionar = vi.fn(disco.lstat).mockImplementation(async (...args: Parameters<typeof disco.lstat>) => {
      if (movido) throw new Error('falha de conferência')
      return disco.lstat(...args)
    })
    const r = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash, operacoes: { rename: mover, lstat: inspecionar as typeof disco.lstat } })
    expect(r).toMatchObject({ ok: false, efeitoIniciado: true, destino: path.join(trash, 'files', 'parcial.txt') })
    expect(r.motivo).toContain(r.destino)
    expect(r.motivo).not.toContain('voltou ao lugar')
    expect(await readFile(origem, 'utf8')).toBe('NOVO-OCUPANTE')
    expect(await readFile(r.destino!, 'utf8')).toBe('MOVIDO')
  })

  it.each(['EXDEV', 'EPERM', 'ENOENT'])('erro %s do rename preserva origem e libera só a reserva', async (code) => {
    const trash = await novaPastaTrash()
    const origem = path.join(base, 'erro-' + code + '.txt')
    await writeFile(origem, 'INTEIRO')
    const mover = vi.fn<typeof disco.rename>().mockRejectedValueOnce(Object.assign(new Error(code), { code }))
    const r = await moverParaLixeira(origem, { plataforma: 'linux', pastaTrash: trash, operacoes: { rename: mover } })
    expect(r.ok).toBe(false)
    expect(r.efeitoIniciado).not.toBe(true)
    expect(await readFile(origem, 'utf8')).toBe('INTEIRO')
    expect(await disco.readdir(path.join(trash, 'info'))).toEqual([])
  })
})


describe('DELETE — resultado Windows corresponde ao efeito observado', () => {
  it('erro depois de movimentar não afirma nada sumiu', async () => {
    const origem = path.join(base, 'win-efeito.txt')
    const destino = path.join(base, 'win-efeito-preservado.txt')
    await writeFile(origem, 'PRESERVADO')
    const r = await moverParaLixeira(origem, {
      plataforma: 'win32', validar: async () => disco.lstat(origem).then(() => true, () => false),
      executar: async () => { await disco.rename(origem, destino); throw new Error('erro após efeito') },
    })
    expect(r).toMatchObject({ ok: false, efeitoIniciado: true })
    expect(r.motivo).not.toContain('nada sumiu')
    expect(r.motivo).toContain('Confira a origem e a Lixeira')
    expect(await readFile(destino, 'utf8')).toBe('PRESERVADO')
  })

  it('exit 0 sem movimentação não se transforma em sucesso do executor', async () => {
    const origem = path.join(base, 'win-sem-efeito.txt')
    await writeFile(origem, 'CONTINUA')
    const r = await moverParaLixeira(origem, {
      plataforma: 'win32', validar: async () => true, executar: async () => ({ stdout: '', stderr: '' }),
    })
    expect(r.ok).toBe(false)
    expect(r.efeitoIniciado).not.toBe(true)
    expect(await readFile(origem, 'utf8')).toBe('CONTINUA')
  })
})
