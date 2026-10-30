import { spawn, type ChildProcess } from 'node:child_process'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ContextoExecucaoFerramenta, ExecutorFerramenta, ResultadoFerramenta } from '../contract'

export const LIMITE_SAIDA_COMANDO_BYTES = 20 * 1024
export const LIMITE_TEMPO_COMANDO_MS = 2 * 60 * 1000
const LIMITE_COMANDO_CARACTERES = 32_768
const LIMITE_PREVIA_BYTES = 2 * 1024
const INTERVALO_PROGRESSO_MS = 180

const PADROES_DESTRUTIVOS: RegExp[] = [
  /\brm\b(?=[^;&|]*\s-[^\s]*r)(?=[^;&|]*\s-[^\s]*f)/i,
  /\b(?:del|erase)\b(?=[^;&|]*\/s\b)/i,
  /\bformat(?:\.com)?\b/i,
  /\bmkfs(?:\.[\w.-]+)?\b/i,
  /\bgit\s+clean\b(?=[^;&|]*\s-[^\s]*f)(?=[^;&|]*\s-[^\s]*d)(?=[^;&|]*\s-[^\s]*x)/i,
  /\bdrop\s+(?:database|table|schema|index|view)\b/i,
  /\bremove-item\b(?=[^;&|]*\s-recurse)(?=[^;&|]*\s-force)/i,
]

/** Comandos de alto risco que, em Manual, sempre exigem aceite individual. */
export function comandoExigeAprovacaoIndividual(comando: string): boolean {
  return PADROES_DESTRUTIVOS.some((padrao) => padrao.test(comando))
}

export type ResolverShellComando = () => Promise<{
  profile: { id: string; label: string; path: string }
  allProfiles: { id: string; label: string; path: string }[]
} | null>

export interface OpcoesExecutorComando {
  timeoutMs?: number
  shellResolver?: ResolverShellComando
  iniciarProcesso?: typeof spawn
  platform?: NodeJS.Platform
}

interface EstadoFechamento {
  code: number | null
  signal: NodeJS.Signals | null
  spawnError?: Error
}

function decodificar(buffer: Buffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

function montarResultado(
  ok: boolean,
  code: number | null,
  output: string,
  cortada: boolean,
  motivo?: string,
): ResultadoFerramenta {
  const status = motivo ?? (code === 0 ? 'código de saída 0' : `código de saída ${String(code)}`)
  const cabecalho = `Comando finalizado (${status})${cortada ? `; saída limitada aos últimos ${LIMITE_SAIDA_COMANDO_BYTES / 1024} KB` : ''}.`
  return {
    ok,
    resumo: cabecalho,
    efeitoIniciado: true,
    conteudo: `${cabecalho}\n${output || '(sem saída)'}${cortada ? '\n[… saída anterior cortada …]' : ''}`,
  }
}

function argumentosDoShell(shellId: string, comando: string): string[] {
  if (shellId === 'pwsh' || shellId === 'powershell') return ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', comando]
  if (shellId === 'cmd') return ['/d', '/s', '/c', comando]
  if (shellId === 'bash' || shellId === 'gitbash') return ['--noprofile', '--norc', '-lc', comando]
  return ['-c', comando]
}

async function matarArvore(processo: ChildProcess, platform: NodeJS.Platform): Promise<void> {
  const pid = processo.pid
  if (!pid || processo.exitCode !== null || processo.signalCode !== null) return

  if (platform === 'win32') {
    try {
      const taskkill = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      })
      await new Promise<void>((resolvePromise) => {
        taskkill.once('error', () => resolvePromise())
        taskkill.once('close', () => resolvePromise())
      })
    } catch {
      // Fallback para o filho direto se taskkill não estiver disponível.
    }
    try { processo.kill() } catch { /* já terminou */ }
    return
  }

  const timer = setTimeout(() => {
    if (processo.exitCode !== null || processo.signalCode !== null) return
    try { process.kill(-pid, 'SIGKILL') } catch {
      try { processo.kill('SIGKILL') } catch { /* já terminou */ }
    }
  }, 1_500)
  processo.once('close', () => clearTimeout(timer))
  if (typeof timer.unref === 'function') timer.unref()
  try { process.kill(-pid, 'SIGTERM') } catch {
    try { processo.kill('SIGTERM') } catch { /* já terminou */ }
  }
}

/** Executa uma chamada one-shot no shell padrão do PTY, sem usar o PTY humano. */
export function criarExecutorComando(raiz: string, opcoes: OpcoesExecutorComando = {}): ExecutorFerramenta {
  const timeoutMs = opcoes.timeoutMs ?? LIMITE_TEMPO_COMANDO_MS
  const obterShell = opcoes.shellResolver ?? (async () => null)
  const iniciarProcesso = opcoes.iniciarProcesso ?? spawn
  const platform = opcoes.platform ?? process.platform
  const cwd = resolve(raiz)

  return async (pedido, contexto: ContextoExecucaoFerramenta = {}) => {
    const bruto = pedido.argumentos.comando
    if (typeof bruto !== 'string' || bruto.trim() === '') {
      return { ok: false, resumo: 'O comando veio vazio; nenhum processo foi iniciado.' }
    }
    if (bruto.length > LIMITE_COMANDO_CARACTERES || bruto.includes('\0')) {
      return { ok: false, resumo: `Comando inválido: limite de ${LIMITE_COMANDO_CARACTERES} caracteres; nenhum processo foi iniciado.` }
    }
    if (contexto.sinal?.aborted) return { ok: false, resumo: 'Execução cancelada antes de iniciar; nenhum processo foi iniciado.' }

    try {
      const info = await stat(cwd)
      if (!info.isDirectory()) return { ok: false, resumo: 'A pasta de trabalho ativa não é um diretório; nenhum processo foi iniciado.' }
    } catch {
      return { ok: false, resumo: 'A pasta de trabalho ativa está inacessível; nenhum processo foi iniciado.' }
    }

    const resolvido = await obterShell()
    if (!resolvido) return { ok: false, resumo: 'Nenhum shell padrão compatível foi encontrado; nenhum processo foi iniciado.' }

    let processo: ChildProcess
    try {
      processo = iniciarProcesso(resolvido.profile.path, argumentosDoShell(resolvido.profile.id, bruto), {
        cwd,
        env: process.env,
        windowsHide: true,
        detached: platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      })
    } catch (erro) {
      return { ok: false, resumo: `Não foi possível iniciar o shell: ${erro instanceof Error ? erro.message : String(erro)}.` }
    }

    let cauda = Buffer.alloc(0)
    let cortada = false
    let ultimoProgresso = 0
    const adicionarSaida = (origem: 'stdout' | 'stderr', pedaco: Buffer | string): void => {
      const bytes = Buffer.isBuffer(pedaco) ? pedaco : Buffer.from(pedaco)
      const prefixo = origem === 'stderr' ? Buffer.from('[stderr] ') : Buffer.alloc(0)
      const novo = Buffer.concat([cauda, prefixo, bytes])
      if (novo.length > LIMITE_SAIDA_COMANDO_BYTES) {
        cauda = Buffer.from(novo.subarray(novo.length - LIMITE_SAIDA_COMANDO_BYTES))
        cortada = true
      } else {
        cauda = novo
      }
      const agora = Date.now()
      if (contexto.aoProgresso && agora - ultimoProgresso >= INTERVALO_PROGRESSO_MS) {
        ultimoProgresso = agora
        const preview = cauda.subarray(Math.max(0, cauda.length - LIMITE_PREVIA_BYTES))
        contexto.aoProgresso(decodificar(preview))
      }
    }
    processo.stdout?.on('data', (pedaco: Buffer) => adicionarSaida('stdout', pedaco))
    processo.stderr?.on('data', (pedaco: Buffer) => adicionarSaida('stderr', pedaco))

    let terminou = false
    let cancelada = contexto.sinal?.aborted === true
    let paradaPorTempo = false
    let paradaEmAndamento: Promise<void> | undefined
    const fechamento = new Promise<EstadoFechamento>((resolveFechamento) => {
      processo.once('error', (erro) => {
        terminou = true
        resolveFechamento({ code: null, signal: null, spawnError: erro })
      })
      processo.once('close', (code, signal) => {
        terminou = true
        resolveFechamento({ code, signal })
      })
    })

    const encerrar = async (): Promise<void> => {
      if (terminou) return
      paradaEmAndamento ??= matarArvore(processo, platform)
      await paradaEmAndamento
    }
    const abortar = (): void => {
      cancelada = true
      void encerrar()
    }
    contexto.sinal?.addEventListener('abort', abortar, { once: true })

    const vigiarTempo = async (): Promise<void> => {
      while (!terminou && !cancelada) {
        const expirou = await Promise.race([
          new Promise<boolean>((resolveTimer) => {
            const timer = setTimeout(() => resolveTimer(true), timeoutMs)
            fechamento.finally(() => clearTimeout(timer))
          }),
          fechamento.then(() => false),
        ])
        if (!expirou || terminou || cancelada) return
        const continuar = await contexto.aguardarContinuacao?.()
        if (continuar !== true) {
          paradaPorTempo = true
          await encerrar()
          return
        }
      }
    }
    void vigiarTempo()

    let estado: EstadoFechamento
    try {
      estado = await fechamento
    } finally {
      contexto.sinal?.removeEventListener('abort', abortar)
    }
    if (contexto.aoProgresso && cauda.length > 0) contexto.aoProgresso(decodificar(cauda.subarray(Math.max(0, cauda.length - LIMITE_PREVIA_BYTES))))

    if (estado.spawnError) {
      return { ok: false, resumo: `Falha ao iniciar o comando: ${estado.spawnError.message}.` }
    }
    const output = decodificar(cauda)
    if (cancelada) return montarResultado(false, estado.code, output, cortada, 'processo cancelado por Parar')
    if (paradaPorTempo) return montarResultado(false, estado.code, output, cortada, 'processo interrompido após a decisão de não continuar aguardando')
    const code = estado.code
    return montarResultado(code === 0, code, output, cortada, estado.signal ? `sinal ${estado.signal}` : undefined)
  }
}
