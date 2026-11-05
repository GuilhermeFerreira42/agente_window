import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveProjectDir } from './paths'

// File coordination, keyed by canonical destination (not a global lock).
// Windows MoveFileExW replacement can fail with EPERM when operations on the
// same destination overlap. Keep direct callers safe, including reads/deletes.
// The session queue separately protects catalog/revision + transcript together.
const transcriptOperations = new Map<string, Promise<unknown>>()

function withTranscript<T>(destination: string, operation: () => Promise<T>): Promise<T> {
  const key = process.platform === 'win32' ? destination.toLowerCase() : destination
  const previous = transcriptOperations.get(key) ?? Promise.resolve()
  const result = previous.catch(() => undefined).then(operation)
  transcriptOperations.set(key, result)
  const clear = () => { if (transcriptOperations.get(key) === result) transcriptOperations.delete(key) }
  void result.then(clear, clear)
  return result
}

export interface TranscriptEntry {
  type: 'user' | 'assistant'
  chatId: string
  message: unknown
  uuid: string
  timestamp: number
}

function transcriptPath(slug: string, sessionId: string): string {
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '-')
  return join(resolveProjectDir(slug), `${safeSessionId}.jsonl`)
}

export async function readTranscript(slug: string, sessionId: string): Promise<TranscriptEntry[]> {
  const destination = transcriptPath(slug, sessionId)
  return withTranscript(destination, async () => {
    try {
      const content = await readFile(destination, 'utf8')
      return content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as TranscriptEntry)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  })
}

export async function writeTranscript(slug: string, sessionId: string, entries: TranscriptEntry[]): Promise<void> {
  const directory = resolveProjectDir(slug)
  const destination = transcriptPath(slug, sessionId)
  // Capture the payload at admission; callers may mutate their array later.
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n')
  return withTranscript(destination, async () => {
    await mkdir(directory, { recursive: true })
    // Each operation owns its temp file; exclusive creation prevents accidental reuse.
    // Keeping it beside the destination preserves same-filesystem atomic rename.
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`

    try {
      await writeFile(temporary, content ? `${content}\n` : '', { encoding: 'utf8', flag: 'wx' })
      await rename(temporary, destination)
    } catch (error) {
      // A hard process kill may leave the unique temp behind; readers ignore it.
      await unlink(temporary).catch(() => undefined)
      throw error
    }
  })
}

export async function deleteTranscript(slug: string, sessionId: string): Promise<void> {
  const destination = transcriptPath(slug, sessionId)
  return withTranscript(destination, async () => {
    try {
      await unlink(destination)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  })
}
