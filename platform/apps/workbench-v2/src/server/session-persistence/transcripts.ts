import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolveProjectDir } from './paths'

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
  try {
    const content = await readFile(transcriptPath(slug, sessionId), 'utf8')
    return content.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as TranscriptEntry)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function writeTranscript(slug: string, sessionId: string, entries: TranscriptEntry[]): Promise<void> {
  const directory = resolveProjectDir(slug)
  await mkdir(directory, { recursive: true })
  const destination = transcriptPath(slug, sessionId)
  const temporary = `${destination}.${process.pid}.tmp`
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n')
  await writeFile(temporary, content ? `${content}\n` : '', 'utf8')
  await rename(temporary, destination)
}

export async function deleteTranscript(slug: string, sessionId: string): Promise<void> {
  try {
    await unlink(transcriptPath(slug, sessionId))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}
