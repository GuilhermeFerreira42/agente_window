// ============================================================================
// Casa Agir — LIXEIRA por sistema (FATIA 12, RNF12-1): o `excluir` NUNCA
// apaga — só move para a lixeira do SO, e restaurar é fora do app.
// Windows = Lixeira real (via PowerShell + FileSystem do .NET, sem
// dependência nova); Linux = XDG Trash (`~/.local/share/Trash`, feito à mão
// — funciona até em servidor sem interface, pois é só pasta + bilhete).
// Sem lixeira no sistema = erro honesto (nunca apagar permanente escondido).
// ============================================================================
import { execFile } from 'node:child_process'
import { cp, mkdir, readdir, rename, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import * as nodePath from 'node:path'

/** Teto da contagem de pasta (passou disso, o cartão diz "mais de…"). */
export const LIMITE_CONTAGEM = 20000

export interface ResultadoLixeira {
  ok: boolean
  /** Onde foi parar dentro da lixeira (só quando ok). */
  destino?: string
  /** Motivo honesto (só quando falha — nada sumiu). */
  motivo?: string
}

export interface OpcoesLixeira {
  /** Injeção para testes (padrão: `process.platform`). */
  plataforma?: NodeJS.Platform
  /** Pasta base da lixeira XDG — testes apontam para temp (padrão: resolve). */
  pastaTrash?: string
  /** Execução do PowerShell — testes injetam falso (padrão: execFile real). */
  executar?: (comando: string, args: string[]) => Promise<{ stdout: string; stderr: string }>
}

/** Resolve a pasta da lixeira XDG (`$XDG_DATA_HOME/Trash` ou `~/.local/share/Trash`). */
export function resolverPastaTrashLinux(casa = homedir(), xdgDataHome = process.env.XDG_DATA_HOME): string {
  const base = xdgDataHome && xdgDataHome !== '' ? xdgDataHome : nodePath.join(casa, '.local', 'share')
  return nodePath.join(base, 'Trash')
}

function fracasso(motivo: string): ResultadoLixeira {
  return { ok: false, motivo }
}

/** Nome livre dentro de uma pasta (colisão vira `nome.2`, `nome.3`…). */
async function nomeLivre(pasta: string, nome: string): Promise<string> {
  let candidato = nome
  for (let n = 2; ; n += 1) {
    try {
      await stat(nodePath.join(pasta, candidato))
      candidato = `${nome}.${n}`
    } catch {
      return candidato
    }
  }
}

/** Data local no formato do bilhete XDG (`AAAA-MM-DDTHH:MM:SS`, sem fuso). */
export function dataBilheteXdg(agora = new Date()): string {
  const dois = (n: number): string => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}T${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}`
}

async function moverXdg(absoluto: string, pastaTrash: string): Promise<ResultadoLixeira> {
  const arquivos = nodePath.join(pastaTrash, 'files')
  const bilhetes = nodePath.join(pastaTrash, 'info')
  try {
    await mkdir(arquivos, { recursive: true })
    await mkdir(bilhetes, { recursive: true })
  } catch {
    return fracasso('Não deu para usar a lixeira do sistema (sem permissão de escrita nela) — nada sumiu.')
  }
  const nome = await nomeLivre(arquivos, nodePath.basename(absoluto))
  const destino = nodePath.join(arquivos, nome)
  try {
    await rename(absoluto, destino)
  } catch (erro) {
    // Outro disco/partição: copia tudo primeiro e só remove a origem depois
    // (ou vai inteiro, ou não vai — RF12-5, nada some pela metade).
    if ((erro as NodeJS.ErrnoException)?.code !== 'EXDEV') {
      return fracasso(`Não deu para mover "${absoluto}" para a lixeira — nada sumiu.`)
    }
    try {
      await cp(absoluto, destino, { recursive: true })
    } catch {
      return fracasso(`Não deu para copiar "${absoluto}" para a lixeira — nada sumiu.`)
    }
    const { rm } = await import('node:fs/promises')
    await rm(absoluto, { recursive: true, force: true })
  }
  const bilhete = `[Trash Info]\nPath=${encodeURI(absoluto)}\nDeletionDate=${dataBilheteXdg()}\n`
  try {
    await writeFile(nodePath.join(bilhetes, `${nome}.trashinfo`), bilhete, 'utf8')
  } catch {
    // O bilhete falhou mas o arquivo JÁ está na lixeira: tenta devolver para
    // não deixar a pasta e a lixeira discordando (melhor esforço honesto).
    await rename(destino, absoluto).catch(() => undefined)
    return fracasso('A lixeira não aceitou o registro — nada sumiu (o item voltou ao lugar).')
  }
  return { ok: true, destino }
}

/**
 * Comando PowerShell que manda UM caminho para a Lixeira real do Windows
 * (pura — testável sem Windows; quem executa é o `executar` injetável).
 */
export function comandoLixeiraWindows(absoluto: string, ehPasta: boolean): { comando: string; args: string[] } {
  const escapado = absoluto.replace(/'/g, "''")
  const verbo = ehPasta ? 'DeleteDirectory' : 'DeleteFile'
  const script = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::${verbo}('${escapado}','OnlyErrorDialogs','SendToRecycleBin')`
  // FATIA 12 C4: os switches são os OFICIAIS do powershell.exe 5.1
  // (about_PowerShell_exe) — `-NonFatal` NÃO existe e fazia o Windows
  // recusar TODA exclusão (o dono provou no teste real).
  return { comando: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-Command', script] }
}

function executarPadrao(comando: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, rejeita) => {
    // Teto de 3 min: lixeira de pasta gigante pode demorar, mas nunca trava o fio para sempre.
    execFile(comando, args, { windowsHide: true, timeout: 180000 }, (erro, stdout, stderr) => {
      if (erro) {
        const rico = erro as NodeJS.ErrnoException & { stdout?: unknown; stderr?: unknown }
        rico.stdout = stdout
        rico.stderr = stderr
        rejeita(rico)
      } else resolve({ stdout: String(stdout), stderr: String(stderr) })
    })
  })
}

/** Espreme o motivo REAL do Windows (stderr > stdout > message), em 1 linha de até 300. */
export function detalheErroWindows(erro: unknown): string {
  const e = erro as { message?: unknown; stderr?: unknown; stdout?: unknown } | null
  const texto = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
  const bruto = texto(e?.stderr) !== '' ? texto(e?.stderr) : texto(e?.stdout) !== '' ? texto(e?.stdout) : texto(e?.message)
  const linha = bruto.replace(/\s+/g, ' ')
  if (linha === '') return 'sem detalhe do sistema'
  return linha.length > 300 ? `${linha.slice(0, 300)}…` : linha
}

async function moverWindows(absoluto: string, ehPasta: boolean, executar: OpcoesLixeira['executar']): Promise<ResultadoLixeira> {
  const { comando, args } = comandoLixeiraWindows(absoluto, ehPasta)
  try {
    await (executar ?? executarPadrao)(comando, args)
  } catch (erro) {
    // C4: a recusa agora TRAZ o motivo do Windows (antes era genérica e cega).
    return fracasso(`O Windows não aceitou mandar "${absoluto}" para a Lixeira — nada sumiu. (Detalhe: ${detalheErroWindows(erro)})`)
  }
  return { ok: true }
}

/**
 * Move arquivo ou pasta para a lixeira do SO. Nunca apaga permanente;
 * qualquer falha = `{ ok: false }` com motivo honesto e NADA some.
 */
export async function moverParaLixeira(absoluto: string, opcoes: OpcoesLixeira = {}): Promise<ResultadoLixeira> {
  const plataforma = opcoes.plataforma ?? process.platform
  let info
  try {
    info = await stat(absoluto)
  } catch {
    return fracasso(`Não existe nada em "${absoluto}" — nada sumiu.`)
  }
  if (plataforma === 'win32') {
    return moverWindows(absoluto, info.isDirectory(), opcoes.executar)
  }
  if (plataforma === 'linux') {
    return moverXdg(absoluto, opcoes.pastaTrash ?? resolverPastaTrashLinux())
  }
  return fracasso(`Este sistema (${plataforma}) não tem lixeira conhecida — nada foi apagado.`)
}

/** Contagem honesta de uma pasta (itens + bytes; corta no teto e avisa). */
export interface ContagemPasta {
  itens: number
  bytes: number
  cortada: boolean
}

export async function contarConteudo(pasta: string, limite = LIMITE_CONTAGEM): Promise<ContagemPasta> {
  let itens = 0
  let bytes = 0
  let cortada = false
  const varrer = async (atual: string): Promise<void> => {
    if (cortada) return
    let entradas
    try {
      entradas = await readdir(atual, { withFileTypes: true })
    } catch {
      return // sem permissão: pula, sem derrubar a contagem
    }
    for (const entrada of entradas) {
      if (itens >= limite) {
        cortada = true
        return
      }
      itens += 1
      const cheio = nodePath.join(atual, entrada.name)
      if (entrada.isDirectory()) {
        await varrer(cheio)
      } else {
        try {
          bytes += (await stat(cheio)).size
        } catch {
          // sumiu no meio da contagem: ignora
        }
      }
    }
  }
  await varrer(pasta)
  return { itens, bytes, cortada }
}

/** Bytes em palavras de gente (pt-BR: vírgula decimal, sem ",0" sobrando). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const texto = (v: number): string => v.toFixed(1).replace('.', ',').replace(',0', '')
  const kb = bytes / 1024
  if (kb < 1024) return `${texto(kb)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${texto(mb)} MB`
  return `${texto(mb / 1024)} GB`
}
