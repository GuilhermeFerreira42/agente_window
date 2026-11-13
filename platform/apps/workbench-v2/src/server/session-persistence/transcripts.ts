import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveProjectDir } from './paths'
import { PersistenceProblem } from './sessionMutations'

// File coordination, keyed by canonical destination (not a global lock).
// Windows MoveFileExW replacement can fail with EPERM when operations on the
// same destination overlap. Keep direct callers safe, including reads/deletes.
// The session queue separately protects catalog/revision + transcript together.
const transcriptOperations = new Map<string, Promise<unknown>>()
const blockedPublications = new Set<string>()

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
  type: 'user' | 'assistant' | 'agir_event'
  chatId: string
  message: unknown
  uuid: string
  timestamp: number
  sequence?: number
}

export function transcriptPath(slug: string, sessionId: string): string {
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '-')
  return join(resolveProjectDir(slug), `${safeSessionId}.jsonl`)
}

export async function readTranscript(slug: string, sessionId: string, maxBytes?: number, aoLerBytes?: (bytes: number) => void): Promise<TranscriptEntry[]> {
  const destination = transcriptPath(slug, sessionId)
  return withTranscript(destination, async () => {
    if (blockedPublications.has(destination)) throw new PersistenceProblem(503, 'session_publication_unavailable', 'Uma publicação falhou. Preserve os arquivos e solicite revisão antes de continuar.')
    try {
      if (maxBytes !== undefined && (await stat(destination)).size > maxBytes) {
        throw Object.assign(new Error('O histórico excede o limite desta operação.'), { code: 'TRANSCRIPT_TOO_LARGE' })
      }
      const content = await readFile(destination, 'utf8')
      if (maxBytes !== undefined || aoLerBytes) {
        const bytes = Buffer.byteLength(content, 'utf8')
        aoLerBytes?.(bytes)
        if (maxBytes !== undefined && bytes > maxBytes) throw Object.assign(new Error('O histórico excede o limite desta operação.'), { code: 'TRANSCRIPT_TOO_LARGE' })
      }
      return content.split(/\r?\n/).flatMap((line, index) => {
        if (!line) return []
        try {
          const entry = JSON.parse(line) as TranscriptEntry | null
          if (!entry || !['user', 'assistant', 'agir_event'].includes(entry.type)
            || typeof entry.chatId !== 'string' || typeof entry.uuid !== 'string'
            || !Number.isFinite(entry.timestamp) || !entry.message || typeof entry.message !== 'object') {
            throw new Error('invalid entry')
          }
          return [entry]
        } catch {
          // The parser's error can quote arbitrary transcript content.
          throw new Error(`Histórico inválido na linha ${index + 1}.`)
        }
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  })
}

export async function writeTranscript(slug: string, sessionId: string, entries: TranscriptEntry[], options?: {
  expectedEntries: TranscriptEntry[]
  commit: () => void
}): Promise<void> {
  const directory = resolveProjectDir(slug)
  const destination = transcriptPath(slug, sessionId)
  // Capture the payload at admission; callers may mutate their array later.
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n')
  return withTranscript(destination, async () => {
    if (blockedPublications.has(destination)) throw new PersistenceProblem(503, 'session_publication_unavailable', 'A publicação desta conversa está indisponível.')
    await mkdir(directory, { recursive: true })
    // Each operation owns its temp file; exclusive creation prevents accidental reuse.
    // Keeping it beside the destination preserves same-filesystem atomic rename.
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`
    const rollback = `${temporary}.rollback`

    let previous: string | undefined
    if (options) {
      try { previous = await readFile(destination, 'utf8') } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      const current = previous?.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) ?? []
      if (JSON.stringify(current) !== JSON.stringify(options.expectedEntries)) {
        throw new PersistenceProblem(409, 'transcript_changed', 'O histórico foi alterado fora desta tentativa. Suas edições locais foram preservadas.')
      }
    }
    let published = false
    try {
      if (options && previous !== undefined) await writeFile(rollback, previous, { encoding: 'utf8', flag: 'wx' })
      await writeFile(temporary, content ? `${content}\n` : '', { encoding: 'utf8', flag: 'wx' })
      await rename(temporary, destination)
      published = true
      options?.commit()
      // A cleanup error does not invalidate an already committed ACK.
      if (options && previous !== undefined) await unlink(rollback).catch(() => undefined)
    } catch (error) {
      if (published && options) {
        // Live failure compensation under the same file lock. This does not
        // claim recovery from a killed process between JSONL and SQLite (P-B).
        try {
          if (previous === undefined) await unlink(destination)
          else await rename(rollback, destination)
        } catch {
          blockedPublications.add(destination)
          throw new PersistenceProblem(503, 'session_publication_unavailable', 'Falharam a publicação e a restauração. Os arquivos foram preservados; não feche o aplicativo antes de solicitar revisão.')
        }
      }
      // A hard process kill may leave the unique temp behind; readers ignore it.
      await unlink(temporary).catch(() => undefined)
      await unlink(rollback).catch(() => undefined)
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
