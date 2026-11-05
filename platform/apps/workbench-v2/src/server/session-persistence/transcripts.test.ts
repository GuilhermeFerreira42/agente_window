import { randomUUID } from 'node:crypto'
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { deleteTranscript, readTranscript, writeTranscript, type TranscriptEntry } from './transcripts'
import { resolveProjectDir } from './paths'

function makeEntries(marker: string): TranscriptEntry[] {
  return ['first', 'second', 'third'].map((part, index) => ({
    type: index === 1 ? 'assistant' : 'user',
    chatId: 'chat-one',
    message: { id: `${marker}-${part}`, role: index === 1 ? 'assistant' : 'user', content: `${marker}:${part}` },
    uuid: `${marker}-${part}`,
    timestamp: index + 1,
  })) as TranscriptEntry[]
}

describe('JSONL transcript persistence', () => {
  let slug: string
  let sessionId: string
  let directory: string

  beforeEach(async () => {
    slug = `transcript-audit-${randomUUID()}`
    sessionId = `session-${randomUUID()}`
    directory = resolveProjectDir(slug)
    await mkdir(directory, { recursive: true })
  })

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('continues to read the existing one-JSON-object-per-line format', async () => {
    const entries = makeEntries('legacy')
    await writeFile(join(directory, `${sessionId}.jsonl`), `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8')

    await expect(readTranscript(slug, sessionId)).resolves.toEqual(entries)
  })

  it('survives two rounds of 16 concurrent snapshots without ENOENT or a mixed transcript', async () => {
    for (let round = 0; round < 2; round += 1) {
      const snapshots = Array.from({ length: 16 }, (_, index) => makeEntries(`r${round}-w${index}`))
      await expect(Promise.all(snapshots.map((entries) => writeTranscript(slug, sessionId, entries))))
        .resolves.toHaveLength(16)

      const restored = await readTranscript(slug, sessionId)
      expect(snapshots.some((snapshot) => JSON.stringify(snapshot) === JSON.stringify(restored))).toBe(true)
      expect(restored).toEqual(snapshots[15])
      expect(restored).toHaveLength(3)
      expect(restored.map((entry) => entry.timestamp)).toEqual([1, 2, 3])
      expect((await readdir(directory)).filter((name) => name.endsWith('.tmp'))).toEqual([])
    }
  })

  it('coordinates direct reads and deletion in admission order for one file', async () => {
    const first = makeEntries('first')
    const second = makeEntries('second')
    const writing = writeTranscript(slug, sessionId, first)
    const reading = readTranscript(slug, sessionId)
    const replacing = writeTranscript(slug, sessionId, second)
    await expect(reading).resolves.toEqual(first)
    await Promise.all([writing, replacing])
    const deleting = deleteTranscript(slug, sessionId)
    await expect(readTranscript(slug, sessionId)).resolves.toEqual([])
    await deleting
  })

  it('keeps the previous complete transcript when atomic publication fails and ignores an abandoned temp', async () => {
    const previous = makeEntries('previous')
    const destination = join(directory, `${sessionId}.jsonl`)
    const backup = `${destination}.previous`
    await writeTranscript(slug, sessionId, previous)

    // Force the real filesystem rename to reject by placing a directory at the
    // destination after moving the old complete file aside.
    await rename(destination, backup)
    await mkdir(destination)
    await expect(writeTranscript(slug, sessionId, makeEntries('interrupted'))).rejects.toThrow()
    expect((await readdir(directory)).filter((name) => name.endsWith('.tmp'))).toEqual([])
    await rm(destination, { recursive: true, force: true })
    await rename(backup, destination)
    await expect(readTranscript(slug, sessionId)).resolves.toEqual(previous)

    // Models a hard process termination before rename: the complete
    // destination remains authoritative; the orphan partial temp is ignored.
    await writeFile(`${destination}.${process.pid}.interrupted.tmp`, '{"partial":', 'utf8')
    await expect(readTranscript(slug, sessionId)).resolves.toEqual(previous)
    await writeTranscript(slug, sessionId, makeEntries('after-failure'))
    await expect(readTranscript(slug, sessionId)).resolves.toEqual(makeEntries('after-failure'))
  })
})
