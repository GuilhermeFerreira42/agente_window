// ============================================================================
// Casa Agir — LIXEIRA por sistema (FATIA 12, RNF12-1): o `excluir` NUNCA
// apaga — só move para a lixeira do SO, e restaurar é fora do app.
// Windows = Lixeira real (PowerShell + IFileOperation, sink e destino conferidos, sem
// dependência nova); Linux = XDG Trash (`~/.local/share/Trash`, feito à mão
// — funciona até em servidor sem interface, pois é só pasta + bilhete).
// Sem lixeira no sistema = erro honesto (nunca apagar permanente escondido).
//
// RESTAURAÇÃO DEBT-24 / D128 (2026-10-31): este arquivo é a versão homologada
// por D97 (commit `90fe21d`, C4 da FATIA 12), que foi esvaziada em `f850fc5`
// ("confinar operações Agir no Linux e falhar fechado") como medida
// TEMPORÁRIA do episódio F2. A condição declarada para religar — integrar ao
// "helper de handles" — tornou-se inalcançável: D121 estabeleceu que o helper
// nativo permanece desativado. Restaurada sob o MESMO modelo de contenção que
// D121 aplica às cinco ferramentas irmãs, com as correções abaixo.
//
// CORREÇÕES sobre a versão homologada (riscos comprovados na auditoria F2):
//   K1 — recusa link simbólico/junction como alvo (lstat, nunca stat cego);
//   K2 — confere a identidade dev:ino antes e depois da movimentação;
//   K3 — REMOVIDO o fallback EXDEV que fazia `cp` + `rm(recursive, force)` no
//        caminho de origem. Era a única operação destrutiva irreversível do
//        fluxo e a mais exposta à corrida entre validação e movimentação.
//        Agora: outro disco/partição = recusa honesta, nada some.
// Nenhuma correção acrescenta serviço, dependência ou camada nova.
// ============================================================================
import { execFile } from 'node:child_process'
import type * as FsPromises from 'node:fs/promises'
import { mkdir, readdir, rename, stat, lstat, open, unlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import * as nodePath from 'node:path'
import { CODIGO_LIXEIRA_WINDOWS } from './lixeiraWindows'

/** Teto da contagem de pasta (passou disso, o cartão diz "mais de…"). */
export const LIMITE_CONTAGEM = 20000

export interface ResultadoLixeira {
  ok: boolean
  /** Destino conhecido, inclusive quando a conferência posterior falha. */
  destino?: string
  /** Motivo honesto; efeitoIniciado distingue falha após movimentação. */
  motivo?: string
  efeitoIniciado?: boolean
  requerNovaAprovacao?: boolean
}

export interface OpcoesLixeira {
  /** Injeção para testes (padrão: `process.platform`). */
  plataforma?: NodeJS.Platform
  /** Validação server-side da versão apresentada no cartão. */
  validar?: () => Promise<boolean>
  sinal?: AbortSignal
  /** Operações injetáveis para provar falhas sem afetar o FS global. */
  operacoes?: Partial<Pick<typeof FsPromises, 'open' | 'rename' | 'lstat'>>
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

/** Data local no formato do bilhete XDG (`AAAA-MM-DDTHH:MM:SS`, sem fuso). */
export function dataBilheteXdg(agora = new Date()): string {
  const dois = (n: number): string => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}T${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}`
}

/** K2 — identidade estável do alvo, para conferir antes × depois. */
function identidadeDe(info: { dev: number; ino: number }): string {
  return `${info.dev}:${info.ino}`
}

/** Reserva XDG pelo bilhete exclusivo: operações concorrentes nunca recebem
 * o mesmo nome. lstat também trata links pendentes como colisões. */
async function reservarDestino(pastaTrash: string, nomeOriginal: string, opcoes: OpcoesLixeira) {
  const arquivos = nodePath.join(pastaTrash, 'files')
  const bilhetes = nodePath.join(pastaTrash, 'info')
  await mkdir(arquivos, { recursive: true })
  await mkdir(bilhetes, { recursive: true })
  for (let n = 1; ; n += 1) {
    const nome = n === 1 ? nomeOriginal : nomeOriginal + '.' + n
    const bilhete = nodePath.join(bilhetes, nome + '.trashinfo')
    let registro
    try { registro = await (opcoes.operacoes?.open ?? open)(bilhete, 'wx', 0o600) } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'EEXIST') continue
      throw erro
    }
    const destino = nodePath.join(arquivos, nome)
    try {
      await lstat(destino)
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return { destino, bilhete, registro }
      await registro.close()
      await unlink(bilhete)
      throw erro
    }
    await registro.close()
    await unlink(bilhete) // só o bilhete vazio reservado por esta operação
  }
}

async function validarAntesDeMover(opcoes: OpcoesLixeira): Promise<ResultadoLixeira | undefined> {
  if (opcoes.sinal?.aborted) return fracasso('Cancelada antes da movimentação — nada sumiu.')
  if (opcoes.validar) {
    const valida = await opcoes.validar().catch(() => false)
    if (!valida) return { ...fracasso('O alvo mudou desde a prévia. Confirme novamente antes de excluir — nada sumiu.'), requerNovaAprovacao: true }
  }
  if (opcoes.sinal?.aborted) return fracasso('Cancelada antes da movimentação — nada sumiu.')
}

async function moverXdg(absoluto: string, pastaTrash: string, antes: string, opcoes: OpcoesLixeira): Promise<ResultadoLixeira> {
  let reserva
  try { reserva = await reservarDestino(pastaTrash, nodePath.basename(absoluto), opcoes) } catch {
    return fracasso('Não deu para reservar um destino na lixeira do sistema — nada sumiu.')
  }
  const { destino, bilhete, registro } = reserva
  let movido = false
  let fechado = false
  try {
    // Registro completo e sincronizado ANTES do rename. A falha de .trashinfo
    // não pode mais deixar conteúdo movido nem exigir rollback na origem.
    await registro.writeFile('[Trash Info]\nPath=' + encodeURI(absoluto) + '\nDeletionDate=' + dataBilheteXdg() + '\n', 'utf8')
    await registro.sync()
    await registro.close()
    fechado = true
    const conflito = await validarAntesDeMover(opcoes)
    if (conflito) return conflito
    try { await (opcoes.operacoes?.rename ?? rename)(absoluto, destino) } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'EXDEV') return fracasso('A lixeira está em outro disco/partição — não é feito copiar e apagar. Nada sumiu.')
      return fracasso('Não deu para mover para a lixeira (permissão ou erro do sistema de arquivos) — nada sumiu.')
    }
    movido = true
    try {
      if (identidadeDe(await (opcoes.operacoes?.lstat ?? lstat)(destino)) !== antes) throw new Error('Identidade divergente')
    } catch {
      return { ok: false, efeitoIniciado: true, destino, motivo: 'Houve movimentação, mas não foi possível confirmar a identidade do item em "' + destino + '". Nada foi apagado permanentemente. Confira esse destino e a origem; não houve restauração automática.' }
    }
    return { ok: true, destino, efeitoIniciado: true }
  } catch {
    return fracasso('A lixeira não aceitou o registro; a origem não foi movimentada — nada sumiu.')
  } finally {
    if (!fechado) await registro.close().catch(() => undefined)
    // Nunca toca a origem para rollback: ela pode ter sido ocupada por outro item.
    if (!movido) await unlink(bilhete).catch(() => undefined)
  }
}

/**
 * Comando PowerShell que manda UM caminho para a Lixeira real do Windows
 * (pura — testável sem Windows; quem executa é o `executar` injetável).
 */
export function comandoLixeiraWindows(absoluto: string, _ehPasta: boolean): { comando: string; args: string[] } {
  void _ehPasta // assinatura existente preservada; IFileOperation atende ambos os tipos.
  const escapado = absoluto.replace(/'/g, "''")
  const script = `$ErrorActionPreference='Stop'; [Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false); Add-Type -TypeDefinition @'\n${CODIGO_LIXEIRA_WINDOWS}\n'@; $destino=[AgentWindowTrash.Recycle]::Move('${escapado}'); @{destino=$destino} | ConvertTo-Json -Compress`
  // FATIA 12 C4: os switches são os OFICIAIS do powershell.exe 5.1
  // (about_PowerShell_exe) — `-NonFatal` NÃO existe e fazia o Windows
  // recusar TODA exclusão (o dono provou no teste real).
  return { comando: 'powershell.exe', args: ['-NoProfile', '-NonInteractive', '-STA', '-Command', script] }
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

async function moverWindows(absoluto: string, ehPasta: boolean, antes: string, opcoes: OpcoesLixeira): Promise<ResultadoLixeira> {
  const { comando, args } = comandoLixeiraWindows(absoluto, ehPasta)
  let destino: string | undefined
  try {
    const { stdout } = await (opcoes.executar ?? executarPadrao)(comando, args)
    const retorno = JSON.parse(stdout) as { destino?: unknown }
    if (typeof retorno.destino !== 'string' || !/^[a-z]:\\\$Recycle\.Bin\\/i.test(retorno.destino)) throw new Error('Destino recuperável não confirmado')
    destino = retorno.destino
    if (identidadeDe(await (opcoes.operacoes?.lstat ?? lstat)(destino)) !== antes) throw new Error('Identidade do item na Lixeira divergente')
  } catch (erro) {
    // Timeout/erro de processo não prova ausência de efeito. Só afirmamos
    // origem intacta quando a versão aprovada ainda pode ser observada nela.
    const intacta = opcoes.validar ? await opcoes.validar().catch(() => false) : false
    if (!intacta) return {
      ok: false, efeitoIniciado: true, destino,
      motivo: `O Windows não confirmou a operação sobre "${absoluto}"; pode ter ocorrido movimentação. Confira a origem e a Lixeira do Windows. Não foi feita restauração automática. (Detalhe: ${detalheErroWindows(erro)})`,
    }
    return fracasso(`O Windows não aceitou mandar "${absoluto}" para a Lixeira — nada sumiu. (Detalhe: ${detalheErroWindows(erro)})`)
  }
  if (opcoes.validar && await opcoes.validar().catch(() => false)) {
    return fracasso(`O Windows terminou sem mover "${absoluto}": a versão aprovada continua na origem — nada sumiu.`)
  }
  return { ok: true, efeitoIniciado: true, destino }
}

/**
 * Move arquivo ou pasta para a lixeira do SO. Nunca apaga permanente;
 * Falhas após movimentação informam efeitoIniciado e o destino, sem rollback cego.
 *
 * K1 — o alvo é inspecionado com `lstat`: link simbólico/junction é RECUSADO.
 * Excluir um link não é excluir o conteúdo, e aceitar link é justamente o que
 * permite trocar o alvo entre a validação e a movimentação (achado F2).
 */
export async function moverParaLixeira(absoluto: string, opcoes: OpcoesLixeira = {}): Promise<ResultadoLixeira> {
  const plataforma = opcoes.plataforma ?? process.platform
  let info
  try {
    info = await lstat(absoluto)
  } catch {
    return fracasso(`Não existe nada em "${absoluto}" — nada sumiu.`)
  }
  if (info.isSymbolicLink()) {
    return fracasso(`"${absoluto}" é um link (não um arquivo/pasta real) — recusado: nada sumiu. Peça a exclusão do alvo do link.`)
  }
  if (plataforma === 'win32') {
    const conflito = await validarAntesDeMover(opcoes)
    if (conflito) return conflito
    return moverWindows(absoluto, info.isDirectory(), identidadeDe(info), opcoes)
  }
  if (plataforma === 'linux') {
    return moverXdg(absoluto, opcoes.pastaTrash ?? resolverPastaTrashLinux(), identidadeDe(info), opcoes)
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
