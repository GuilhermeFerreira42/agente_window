import { randomUUID } from 'node:crypto'
import { rmdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { expect, it } from 'vitest'
import { buscarTranscript } from '../buscaTranscript'
import { resolveProjectDir } from '../paths'
import { deleteTranscript, readTranscript, writeTranscript, type TranscriptEntry } from '../transcripts'

it('preserves a large synthetic source and bounds search without creating an index', async () => {
  const benchmark = process.env.M8_BENCHMARK === '1'
  const count = benchmark ? 10_000 : 1_000
  const slug = `m8-volume-${randomUUID()}`
  const sessionId = randomUUID()
  const entries: TranscriptEntry[] = Array.from({ length: count }, (_, index) => ({
    type: index % 2 ? 'assistant' : 'user', chatId: 'a', uuid: `m-${index}`, timestamp: index,
    message: { id: `m-${index}`, role: index % 2 ? 'assistant' : 'user', time: '00:00',
      content: index === 20 ? 'M8_UNIQUE_SYNTHETIC_REFERENCE' : 'synthetic '.repeat(benchmark ? 50 : 6) },
  }))
  const samples: Array<{ writeMs: number; readMs: number; searchMs: number }> = []
  try {
    for (let round = 0; round < (benchmark ? 3 : 1); round++) {
      const start = performance.now()
      await writeTranscript(slug, sessionId, entries)
      const written = performance.now()
      const restored = await readTranscript(slug, sessionId, 16 * 1024 * 1024)
      const read = performance.now()
      const found = buscarTranscript(restored, 'a', 'M8_UNIQUE_SYNTHETIC_REFERENCE')
      const searched = performance.now()
      expect(restored).toEqual(entries)
      expect(found.hits.map(({ messageId }) => messageId)).toEqual(['m-20'])
      expect(found.parcial).toBe(benchmark)
      expect(buscarTranscript(restored, 'b', 'SYNTHETIC').hits).toEqual([])
      samples.push({ writeMs: written - start, readMs: read - written, searchMs: searched - read })
    }
    const bytes = (await stat(join(resolveProjectDir(slug), `${sessionId}.jsonl`))).size
    await expect(readTranscript(slug, sessionId, 1)).rejects.toThrow()
    if (benchmark) console.info('M8_SYNTHETIC_BENCHMARK', JSON.stringify({ messages: count, bytes, samples }))
  } finally {
    await deleteTranscript(slug, sessionId)
    await rmdir(resolveProjectDir(slug))
  }
}, 30_000)
