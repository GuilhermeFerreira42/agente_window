import { createHash, randomUUID } from 'node:crypto'
import { io } from './io'
import { join } from 'node:path'
import { resolveProjectDir } from './paths'
import { PersistenceProblem } from './sessionMutations'

/** SHA-256 of the effective bytes; the P-B intent journal compares these, not projections. */
export function digestTranscriptBytes(bytes: Buffer | string): string {
  return createHash('sha256').update(typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : bytes).digest('hex')
}

/** Digest of a published/staged file, or null only for a provable ENOENT. */
export async function digestTranscriptFile(path: string): Promise<string | null> {
  try {
    return digestTranscriptBytes(await io.readFile(path))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

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
      if (maxBytes !== undefined && (await io.stat(destination)).size > maxBytes) {
        throw Object.assign(new Error('O histórico excede o limite desta operação.'), { code: 'TRANSCRIPT_TOO_LARGE' })
      }
      const content = await io.readFile(destination, 'utf8')
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
  /**
   * P-B boundary: runs under the destination lock after the complete stage was
   * created with `wx` and BEFORE the rename. Registering the durable write
   * intent here is what makes a crash between JSONL and SQLite recoverable.
   * Throwing aborts publication with the destination untouched.
   */
  prepararIntencao?: (staged: { stagedPath: string; newDigest: string; oldDigest: string | null }) => void | Promise<void>
}): Promise<void> {
  const directory = resolveProjectDir(slug)
  const destination = transcriptPath(slug, sessionId)
  // Capture the payload at admission; callers may mutate their array later.
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n')
  return withTranscript(destination, async () => {
    if (blockedPublications.has(destination)) throw new PersistenceProblem(503, 'session_publication_unavailable', 'A publicação desta conversa está indisponível.')
    await io.mkdir(directory, { recursive: true })
    // Each operation owns its temp file; exclusive creation prevents accidental reuse.
    // Keeping it beside the destination preserves same-filesystem atomic rename.
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`
    const rollback = `${temporary}.rollback`

    let previous: string | undefined
    let previousBytes: Buffer | undefined
    if (options) {
      try { previousBytes = await io.readFile(destination) } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      previous = previousBytes?.toString('utf8')
      const current = previous?.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) ?? []
      if (JSON.stringify(current) !== JSON.stringify(options.expectedEntries)) {
        throw new PersistenceProblem(409, 'transcript_changed', 'O histórico foi alterado fora desta tentativa. Suas edições locais foram preservadas.')
      }
    }
    let published = false
    try {
      if (options && previous !== undefined) await io.writeFile(rollback, previous, { encoding: 'utf8', flag: 'wx' })
      await io.writeFile(temporary, content ? `${content}\n` : '', { encoding: 'utf8', flag: 'wx' })
      if (options?.prepararIntencao) {
        await options.prepararIntencao({
          stagedPath: temporary,
          newDigest: digestTranscriptBytes(content ? `${content}\n` : ''),
          oldDigest: previousBytes ? digestTranscriptBytes(previousBytes) : null,
        })
        // The intent now promises exactly the previous bytes as the base. Re-read
        // the destination under the same lock before replacing it: an unexpected
        // external change blocks instead of being overwritten by a blind retry.
        const expectedOld = previousBytes ? digestTranscriptBytes(previousBytes) : null
        const observed = await digestTranscriptFile(destination)
        if (observed !== expectedOld) {
          throw new PersistenceProblem(409, 'transcript_changed', 'O histórico foi alterado fora desta tentativa. Suas edições locais foram preservadas.')
        }
      }
      await io.rename(temporary, destination)
      published = true
      options?.commit()
      // A cleanup error does not invalidate an already committed ACK.
      if (options && previous !== undefined) await io.unlink(rollback).catch(() => undefined)
    } catch (error) {
      if (published && options) {
        // Live failure compensation under the same file lock. This does not
        // claim recovery from a killed process between JSONL and SQLite (P-B).
        try {
          if (previous === undefined) await io.unlink(destination)
          else await io.rename(rollback, destination)
        } catch {
          blockedPublications.add(destination)
          throw new PersistenceProblem(503, 'session_publication_unavailable', 'Falharam a publicação e a restauração. Os arquivos foram preservados; não feche o aplicativo antes de solicitar revisão.')
        }
      }
      // A hard process kill may leave the unique temp behind; readers ignore it.
      await io.unlink(temporary).catch(() => undefined)
      await io.unlink(rollback).catch(() => undefined)
      throw error
    }
  })
}

/**
 * P-B: publish an already-staged file recorded by a durable intent. Used only
 * by reconciliation under the session queue; verifies the destination still
 * holds the recorded base bytes before replacing it — a divergent destination
 * is never overwritten.
 */
export async function publishStagedTranscript(stagedPath: string, destination: string, expectedOldDigest: string | null): Promise<void> {
  return withTranscript(destination, async () => {
    if (blockedPublications.has(destination)) throw new PersistenceProblem(503, 'session_publication_unavailable', 'A publicação desta conversa está indisponível.')
    const observed = await digestTranscriptFile(destination)
    if (observed !== expectedOldDigest) {
      throw new PersistenceProblem(409, 'transcript_changed', 'O histórico foi alterado fora desta tentativa. A publicação pendente foi preservada sem sobrescrever o destino.')
    }
    await io.rename(stagedPath, destination)
  })
}

/**
 * A durable intent (or this in-memory block) may be released only after the
 * catalog+receipt were committed together — the caller proves consistency.
 */
export function releaseBlockedPublication(slug: string, sessionId: string): void {
  const destination = transcriptPath(slug, sessionId)
  blockedPublications.delete(destination)
}

export async function deleteTranscript(slug: string, sessionId: string): Promise<void> {
  const destination = transcriptPath(slug, sessionId)
  return withTranscript(destination, async () => {
    try {
      await io.unlink(destination)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  })
}
