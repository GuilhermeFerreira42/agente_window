import { randomUUID } from 'node:crypto'
import { mkdirSync, renameSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { deleteTranscript, digestTranscriptBytes, publishStagedTranscript, readTranscript, writeTranscript, type TranscriptEntry } from './transcripts'
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

  it('reports corrupt JSONL without returning the contents of the invalid line', async () => {
    const [valid] = makeEntries('valid')
    await writeFile(join(directory, `${sessionId}.jsonl`), `${JSON.stringify(valid)}\nSYNTHETIC_PRIVATE_FRAGMENT\n`)
    await expect(readTranscript(slug, sessionId)).rejects.toThrow(/^Histórico inválido na linha 2\.$/)
  })

  it.each(['null', '[]', '"PRIVATE_SCHEMA"', '{"type":"unknown","private":"PRIVATE_SCHEMA"}'])
  ('rejects a malformed record without rewriting its original bytes (%s)', async (source) => {
    const destination = join(directory, `${sessionId}.jsonl`)
    await writeFile(destination, `${source}\n`)
    await expect(readTranscript(slug, sessionId)).rejects.toThrow(/^Histórico inválido na linha 1\.$/)
    const { readFile } = await import('node:fs/promises')
    expect(await readFile(destination, 'utf8')).toBe(`${source}\n`)
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

  it('P-A: refuses an external transcript change instead of replacing an unrecognized base', async () => {
    const previous = makeEntries('old'), external = makeEntries('external')
    await writeTranscript(slug, sessionId, previous)
    await writeTranscript(slug, sessionId, external)
    let committed = false
    await expect(writeTranscript(slug, sessionId, makeEntries('candidate'), { expectedEntries: previous, commit: () => { committed = true } })).rejects.toMatchObject({ status: 409, code: 'transcript_changed' })
    expect(committed).toBe(false)
    expect(await readTranscript(slug, sessionId)).toEqual(external)
  })

  it('P-A: restores the exact original bytes after a live catalog error', async () => {
    const { readFile } = await import('node:fs/promises')
    const previous = makeEntries('old'), destination = join(directory, `${sessionId}.jsonl`)
    const bytes = previous.map(entry => JSON.stringify(entry)).join('\r\n') + '\r\n'
    await writeFile(destination, bytes)
    await expect(writeTranscript(slug, sessionId, makeEntries('candidate'), { expectedEntries: previous, commit: () => { throw new Error('catalog fixture') } })).rejects.toThrow('catalog fixture')
    expect(await readFile(destination, 'utf8')).toBe(bytes)
    expect((await readdir(directory)).filter(name => name.endsWith('.rollback'))).toEqual([])
  })

  it('P-A: a failed compensation preserves the prior file and blocks further live publication', async () => {
    const { readFile } = await import('node:fs/promises')
    const previous = makeEntries('old'), candidate = makeEntries('candidate')
    const destination = join(directory, `${sessionId}.jsonl`), published = `${destination}.published`
    await writeTranscript(slug, sessionId, previous)
    await expect(writeTranscript(slug, sessionId, candidate, { expectedEntries: previous, commit: () => {
      // Move only this fixture's file, then obstruct rollback with a directory.
      expect(published.startsWith(directory)).toBe(true)
      renameSync(destination, published); mkdirSync(destination)
      throw new Error('catalog failure followed by filesystem failure')
    } })).rejects.toMatchObject({ status: 503, code: 'session_publication_unavailable' })
    const rollback = (await readdir(directory)).find(name => name.endsWith('.rollback'))!
    expect(rollback).toBeDefined()
    expect((await readFile(join(directory, rollback), 'utf8')).trim().split('\n').map(line => JSON.parse(line))).toEqual(previous)
    expect((await readFile(published, 'utf8')).trim().split('\n').map(line => JSON.parse(line))).toEqual(candidate)
    await expect(readTranscript(slug, sessionId)).rejects.toMatchObject({ status: 503 })
    await expect(writeTranscript(slug, sessionId, candidate)).rejects.toMatchObject({ status: 503 })
  })
})

describe('P-B writer boundaries (prepararIntencao)', () => {
  let slug: string
  let sessionId: string
  let directory: string
  let destination: string

  beforeEach(async () => {
    slug = `transcript-pb-${randomUUID()}`
    sessionId = `session-${randomUUID()}`
    directory = resolveProjectDir(slug)
    await mkdir(directory, { recursive: true })
    destination = join(directory, `${sessionId}.jsonl`)
  })
  afterEach(async () => { await rm(directory, { recursive: true, force: true }) })

  const previous = (): TranscriptEntry[] => makeEntries('pb-old')
  const candidate = (): TranscriptEntry[] => [...makeEntries('pb-old'), ...makeEntries('pb-new')]

  it('P-B: runs the intent hook under the lock with a complete stage and the destination untouched', async () => {
    await writeTranscript(slug, sessionId, previous())
    const destinoAntes = await readFile(destination, 'utf8')
    let commitChamado = false
    let stageVisto: string | undefined
    await writeTranscript(slug, sessionId, candidate(), {
      expectedEntries: previous(),
      commit: () => { commitChamado = true },
      prepararIntencao: async ({ stagedPath, newDigest, oldDigest }) => {
        stageVisto = stagedPath
        // hook roda ANTES do rename: destino ainda é a base, stage completo
        expect(await readFile(destination, 'utf8')).toBe(destinoAntes)
        expect(digestTranscriptBytes(await readFile(stagedPath))).toBe(newDigest)
        expect(oldDigest).toBe(digestTranscriptBytes(destinoAntes))
      },
    })
    expect(stageVisto).toMatch(/\.tmp$/)
    expect(commitChamado).toBe(true)
    expect(await readFile(destination, 'utf8')).not.toBe(destinoAntes)
    expect((await readdir(directory)).filter(name => name.includes('.tmp'))).toEqual([])
  })

  it('P-B: a failing intent hook aborts with the destination untouched, no temp files and no commit', async () => {
    await writeTranscript(slug, sessionId, previous())
    const destinoAntes = await readFile(destination, 'utf8')
    let commitChamado = false
    await expect(writeTranscript(slug, sessionId, candidate(), {
      expectedEntries: previous(),
      commit: () => { commitChamado = true },
      prepararIntencao: () => { throw Object.assign(new Error('registro falhou'), { code: 'EIO' }) },
    })).rejects.toThrow('registro falhou')
    expect(commitChamado).toBe(false)
    expect(await readFile(destination, 'utf8')).toBe(destinoAntes)
    expect((await readdir(directory)).filter(name => name.includes('.tmp') || name.includes('.rollback'))).toEqual([])
  })

  it('P-B: publishStagedTranscript refuses a divergent destination without overwriting anything', async () => {
    await writeTranscript(slug, sessionId, previous())
    const destinoAntes = await readFile(destination, 'utf8')
    const stage = `${destination}.stage-fixture.tmp`
    await writeFile(stage, candidate().map(entry => JSON.stringify(entry)).join('\n') + '\n', 'utf8')
    await writeFile(destination, 'MUNDO EXTERNO\n', 'utf8')
    const divergente = await readFile(destination, 'utf8')
    await expect(publishStagedTranscript(stage, destination, digestTranscriptBytes(destinoAntes)))
      .rejects.toMatchObject({ status: 409, code: 'transcript_changed' })
    expect(await readFile(destination, 'utf8')).toBe(divergente)
    // o stage permanece intacto para revisão — nada foi apagado
    expect((await readdir(directory)).some(name => name.endsWith('.stage-fixture.tmp'))).toBe(true)
  })
})
