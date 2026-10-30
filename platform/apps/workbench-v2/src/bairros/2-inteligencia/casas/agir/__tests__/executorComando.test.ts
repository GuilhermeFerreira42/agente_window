import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import type { PedidoFerramenta } from '../contract'
import { criarExecutorComando, comandoExigeAprovacaoIndividual } from '../server/executorComando'

const raiz = await mkdtemp(path.join(tmpdir(), 'agir-executor-comando-'))
const shellResolver = async () => ({
  profile: { id: 'sh', label: 'sh', path: '/bin/sh' },
  allProfiles: [{ id: 'sh', label: 'sh', path: '/bin/sh' }],
})

const pedido = (comando: string): PedidoFerramenta => ({
  ferramenta: 'executar',
  argumentos: { comando },
  id: 'teste-comando',
})

afterAll(async () => {
  await rm(raiz, { recursive: true, force: true })
})

describe('executor de comando one-shot (shell real, comandos seguros)', () => {
  it('usa shell novo, retorna stdout, stderr e código de saída', async () => {
    const executar = criarExecutorComando(raiz, { shellResolver, platform: 'linux' })
    const resultado = await executar(pedido("printf 'fixture segura'; printf 'aviso-fixture' >&2"))

    expect(resultado.ok).toBe(true)
    expect(resultado.efeitoIniciado).toBe(true)
    expect(resultado.conteudo).toContain('fixture segura')
    expect(resultado.conteudo).toContain('[stderr] aviso-fixture')
    expect(resultado.resumo).toContain('código de saída 0')
  })

  it('retorna o código diferente de zero sem esconder o stderr', async () => {
    const executar = criarExecutorComando(raiz, { shellResolver, platform: 'linux' })
    const resultado = await executar(pedido("printf 'erro-fixture' >&2; exit 7"))

    expect(resultado.ok).toBe(false)
    expect(resultado.conteudo).toContain('[stderr] erro-fixture')
    expect(resultado.resumo).toContain('código de saída 7')
  })

  it('não inicia processo se o pedido já estiver cancelado', async () => {
    const iniciarProcesso = vi.fn()
    const abort = new AbortController()
    abort.abort()
    const executar = criarExecutorComando(raiz, { shellResolver, iniciarProcesso: iniciarProcesso as never, platform: 'linux' })

    const resultado = await executar(pedido("printf 'não executar'"), { sinal: abort.signal })

    expect(resultado.efeitoIniciado).toBeUndefined()
    expect(resultado.resumo).toContain('cancelada antes de iniciar')
    expect(iniciarProcesso).not.toHaveBeenCalled()
  })

  it('aplica o limite de tempo e respeita a decisão de parar de aguardar', async () => {
    const aguardarContinuacao = vi.fn(async () => false)
    const executar = criarExecutorComando(raiz, { shellResolver, timeoutMs: 50, platform: 'linux' })

    const resultado = await executar(pedido('sleep 5'), { aguardarContinuacao })

    expect(aguardarContinuacao).toHaveBeenCalledTimes(1)
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('não continuar aguardando')
  }, 10_000)

  it('cancela o processo one-shot e a sua árvore via AbortSignal', async () => {
    const abort = new AbortController()
    const executar = criarExecutorComando(raiz, { shellResolver, platform: 'linux' })
    const timer = setTimeout(() => abort.abort(), 80)

    try {
      const resultado = await executar(pedido('sleep 5'), { sinal: abort.signal })
      expect(resultado.ok).toBe(false)
      expect(resultado.resumo).toContain('cancelado por Parar')
    } finally {
      clearTimeout(timer)
    }
  }, 10_000)

  it('marca padrões destrutivos para aprovação individual, sem executá-los', () => {
    expect(comandoExigeAprovacaoIndividual('rm -rf ./fixture')).toBe(true)
    expect(comandoExigeAprovacaoIndividual('git clean -fdx')).toBe(true)
    expect(comandoExigeAprovacaoIndividual('printf safe')).toBe(false)
  })
})
