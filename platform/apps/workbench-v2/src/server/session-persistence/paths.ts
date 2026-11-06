import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { mkdir, readdir } from 'node:fs/promises'

const APP_DIRECTORY = '.agente_window'
const PROJECTS_DIRECTORY = 'projects'
const MAX_SLUG_LENGTH = 80

function simpleHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/**
 * FATIA 15 Onda 3 (D167) — a pasta de dados pode ser DESVIADA por ambiente.
 *
 * Por que isto existe (defeito medido, não suposto): os specs E2E rodam contra o
 * MESMO servidor do app e gravavam no banco REAL do usuário. Rodei
 * `e2e/diff_sem_travar.spec.ts` com 2 sessões no banco e saí com 3: a nova,
 * "DIFF-TRAVA reclick", apontando para `/tmp/diff-travar-ws` — pasta que o próprio
 * spec cria e APAGA no fim. O efeito no app de verdade: árvore vazia, `400
 * invalid_workspace (ENOENT ... /tmp/diff-travar-ws)` e o agente recusando com
 * "A pasta de trabalho da sessão não está acessível". O usuário abre o produto e
 * ele está quebrado por causa de um teste que rodou antes.
 *
 * A variável é opt-in: sem ela, nada muda (produção continua em `~/.agente_window`).
 * Com ela, quem quiser um app de verdade usa outro caminho e os testes não
 * encostam no estado real.
 */
export function getAppDir(): string {
  const desvio = process.env.AGENTE_WINDOW_DATA_DIR
  if (typeof desvio === 'string' && desvio.trim() !== '') return resolve(desvio.trim())
  return join(homedir(), APP_DIRECTORY)
}

export function getProjectsDir(): string {
  return join(getAppDir(), PROJECTS_DIRECTORY)
}

export function getDatabasePath(): string {
  return join(getAppDir(), 'agente_window.db')
}

export function sanitizePath(value: string): string {
  const sanitized = value.replace(/[^a-zA-Z0-9]/g, '-') || 'untitled'
  if (sanitized.length <= MAX_SLUG_LENGTH) return sanitized
  return `${sanitized.slice(0, MAX_SLUG_LENGTH)}-${simpleHash(value)}`
}

export function resolveProjectDir(slug: string): string {
  const safeSlug = sanitizePath(slug)
  const projectsDir = resolve(getProjectsDir())
  const projectDir = resolve(projectsDir, safeSlug)
  if (projectDir !== projectsDir && !projectDir.startsWith(`${projectsDir}${sep}`)) {
    throw new Error('Invalid project slug')
  }
  return projectDir
}

export async function allProjectDirs(): Promise<string[]> {
  const projectsDir = getProjectsDir()
  await mkdir(projectsDir, { recursive: true })
  const entries = await readdir(projectsDir, { withFileTypes: true })
  return entries.filter((entry) => entry.isDirectory()).map((entry) => join(projectsDir, entry.name))
}
