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
  repoRoot: string
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

  return { slug, path: destination, branch, repoRoot }
}

export class WorktreeDirtyError extends Error {
  constructor() {
    super('Worktree has uncommitted changes')
    this.name = 'WorktreeDirtyError'
  }
}

function assertManagedWorktreePath(worktreePath: string): void {
  const managedRoot = resolve(getAppDir(), 'worktrees')
  const candidate = resolve(worktreePath)
  if (!candidate.startsWith(`${managedRoot}${sep}`)) throw new Error('Refusing to remove a worktree outside the managed directory')
}

export async function removeWorktree(repoRootInput: string, worktreePath: string, sessionId: string, force = false): Promise<void> {
  assertManagedWorktreePath(worktreePath)
  let repoRoot = repoRootInput
  try {
    repoRoot = await realpath(repoRootInput)
  } catch {
    // Registros 06.2 antigos gravavam o próprio worktree como workspacePath.
    // Se ele ainda existe, a descoberta do common-dir abaixo encontra a origem.
  }

  try {
    const commonDir = await git(worktreePath, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
    if (commonDir.endsWith(`${sep}.git`) || commonDir.endsWith('/.git')) repoRoot = dirname(commonDir)
  } catch {
    // Diretório ausente: prune idempotente ainda pode ser executado pela origem persistida.
  }

  const status = await git(worktreePath, ['status', '--porcelain']).catch(() => '')
  if (status && !force) throw new WorktreeDirtyError()
  await git(repoRoot, ['worktree', 'remove', ...(force ? ['--force'] : []), worktreePath]).catch(async (error) => {
    try {
      await access(worktreePath)
      throw error
    } catch (accessError) {
      if ((accessError as NodeJS.ErrnoException).code !== 'ENOENT') throw accessError
    }
  })
  await git(repoRoot, ['worktree', 'prune'])
  const branch = `agente-window/${sanitizePath(sessionId)}`
  await git(repoRoot, ['branch', '-D', branch]).catch(() => undefined)
}

export async function listWorktrees(repoRootInput: string): Promise<string> {
  return git(await realpath(repoRootInput), ['worktree', 'list', '--porcelain'])
}
