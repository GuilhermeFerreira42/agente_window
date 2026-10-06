import { execFile } from 'node:child_process'
import { access, mkdir, realpath, rm } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import { getAppDir, sanitizePath } from './paths'

const execFileAsync = promisify(execFile)

export interface WorktreeDescriptor {
  slug: string
  path: string
  branch: string
}

function resolveWorktreePath(slug: string, sessionId: string): string {
  const worktreesRoot = resolve(getAppDir(), 'worktrees')
  const safeSlug = sanitizePath(slug)
  const safeSessionId = sanitizePath(sessionId)
  const destination = resolve(worktreesRoot, safeSlug, safeSessionId)
  if (!destination.startsWith(`${worktreesRoot}${sep}`)) throw new Error('Invalid worktree destination')
  return destination
}

async function git(repoRoot: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', repoRoot, ...args], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  })
  return stdout.trim()
}

export async function createWorktree(repoRootInput: string, slugInput: string, sessionId: string): Promise<WorktreeDescriptor> {
  const repoRoot = await realpath(repoRootInput)
  const topLevel = await git(repoRoot, ['rev-parse', '--show-toplevel'])
  if (resolve(topLevel) !== resolve(repoRoot)) throw new Error('Configured workspace root is not the Git repository root')

  const slug = sanitizePath(slugInput)
  const safeSessionId = sanitizePath(sessionId)
  const branch = `agente-window/${safeSessionId}`
  const destination = resolveWorktreePath(slug, safeSessionId)
  await mkdir(dirname(destination), { recursive: true })
  try {
    await access(destination)
    throw new Error('Worktree destination already exists')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }

  try {
    await git(repoRoot, ['worktree', 'add', '-b', branch, destination, 'HEAD'])
  } catch (error) {
    // `git worktree add` pode criar parcialmente o diretório antes de falhar.
    // Só removemos o destino novo e nunca tocamos no repositório de origem.
    await rm(destination, { recursive: true, force: true })
    throw error
  }

  return { slug, path: destination, branch }
}

export async function listWorktrees(repoRootInput: string): Promise<string> {
  return git(await realpath(repoRootInput), ['worktree', 'list', '--porcelain'])
}
