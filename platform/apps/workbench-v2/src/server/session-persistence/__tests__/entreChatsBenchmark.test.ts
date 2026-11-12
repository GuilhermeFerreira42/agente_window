// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { describe, expect, it } from 'vitest'
import { getDatabase, upsertSessionRecord } from '../database'
import { criarConsultaEntreChats } from '../consultaEntreChats'
import { chaveProjetoHistorico, digestChat, identidadeRaizHistorico, operadorHistoricoLocal, origemChat } from '../origensChats'
import type { TranscriptEntry } from '../transcripts'

const suite = process.env.MC1_BENCH === '1' && process.env.AGENTE_WINDOW_TEST_HOME ? describe : describe.skip
suite('MC16 benchmark reproduzível em dados sintéticos', () => {
  it('100, 1000 e 10000 chats: p50/p95, IO, RSS e parcialidade', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mc1-bench-')), ctx = { sessionId: 'solicitante-bench', chatId: 'main', raiz }
    const owner = operadorHistoricoLocal(), root = identidadeRaizHistorico(raiz)!, db = getDatabase(), arquivos = new Map<string, string>()
    const inserir = db.prepare(`INSERT INTO chat_history_origins VALUES (@sessionId,'main',@epoch,@owner,@key,@root,'verified',@digest,@title,@norm,@title,'Main',@data)`)
    const resultados: unknown[] = []
    try {
      let anterior = 0
      for (const quantidade of [100, 1000, 10000]) {
        const dir = join(raiz, String(quantidade)); await mkdir(dir)
        const lote: Array<{ id: string; title: string; entries: TranscriptEntry[] }> = []
        for (let n = anterior; n < quantidade; n++) {
          const id = `bench-${n}`, title = `Conversa de engenharia ${n}`
          const entries: TranscriptEntry[] = [{ chatId: 'main', uuid: `m-${n}`, type: 'user', timestamp: n, message: { id: `m-${n}`, role: 'user', time: '10:00', content: `Decisão rara benchmark-${n}: SQLite e WAL.` } }]
          const arquivo = join(dir, `${id}.jsonl`); await writeFile(arquivo, entries.map(e => JSON.stringify(e)).join('\n') + '\n'); arquivos.set(id, arquivo)
          lote.push({ id, title, entries })
        }
        db.transaction(() => {
          for (const { id, title, entries } of lote) {
            upsertSessionRecord({ id, slug: id, title, workspacePath: raiz, worktreePath: null, messageCount: 1, createdAt: 1, updatedAt: 1,
              sessionJson: JSON.stringify({ id, title, chats: [{ id: 'main', title: 'Main' }] }) })
            inserir.run({ sessionId: id, epoch: id, owner, key: chaveProjetoHistorico(raiz), root, digest: digestChat(entries, 'main'), title, norm: title.toLowerCase(), data: 1 })
          }
        })()
        const { readFile } = await import('node:fs/promises')
        for (const modo of ['titulo', 'conteudo', 'ausente'] as const) {
          let io = 0, leituras = 0
          const tempos: number[] = [], estados: string[] = []
          for (let rodada = 0; rodada < 12; rodada++) {
            const consultar = criarConsultaEntreChats(ctx, { serializar: async (_id, fn) => fn(), portas: {
              contexto: () => ({ ok: true, raiz, permissoes: [] }), origem: (id, chat) => id === ctx.sessionId ? { ...origemChat('bench-0', chat)!, epoch: 'solicitante-bench' } : origemChat(id, chat),
              ler: async (_slug, id, max, medido) => {
                const texto = await readFile(arquivos.get(id)!, 'utf8'), n = Buffer.byteLength(texto); io += n; leituras++; medido?.(n)
                if (max && n > max) throw new Error('fixture maior que limite')
                return texto.trim().split('\n').map(l => JSON.parse(l) as TranscriptEntry)
              },
            } })
            const inicio = performance.now()
            const r = await consultar({ ferramenta: 'buscar_chats', argumentos: { consulta: modo === 'titulo' ? `Conversa de engenharia ${quantidade - 1}` : modo === 'conteudo' ? 'SQLite' : 'não existe este termo' } })
            tempos.push(performance.now() - inicio); estados.push(r.status)
            expect(r.results.length).toBeLessThanOrEqual(10)
            if (modo === 'titulo') expect(r.status).toBe('ok')
            if (modo === 'ausente' && quantidade > 200) expect(r.partial).toBe(true)
          }
          tempos.sort((a, b) => a - b)
          resultados.push({ chats: quantidade, modo, p50ms: +tempos[6].toFixed(2), p95ms: +tempos[11].toFixed(2), bytesLidos: io, leituras, rssMiB: +(process.memoryUsage().rss / 1048576).toFixed(1), estados: [...new Set(estados)] })
        }
        anterior = quantidade
      }
      console.info('MC1_BENCH_RESULTADO ' + JSON.stringify(resultados))
    } finally {
      db.prepare("DELETE FROM sessions WHERE id LIKE 'bench-%'").run()
      await rm(raiz, { recursive: true, force: true })
    }
  }, 120_000)
})
