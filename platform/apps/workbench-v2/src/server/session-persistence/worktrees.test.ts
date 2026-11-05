import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({ appDir: '' }))

vi.mock('./paths', async (importOriginal) => {
  const original = await importOriginal<typeof import('./paths')>()
  return { ...original, getAppDir: () => mocked.appDir }
})

import { createWorktree, removeWorktree, WorktreeDirtyError } from './worktrees'

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim()
}

describe('createWorktree', () => {
  let root: string
  let repo: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'agente-window-worktree-'))
    mocked.appDir = join(root, 'app-data')
    repo = join(root, 'repo')
    await mkdir(repo)
    git(repo, 'init')
    git(repo, 'config', 'user.email', 'tests@example.com')
    git(repo, 'config', 'user.name', 'Tests')
    await writeFile(join(repo, 'README.md'), 'base\n')
    git(repo, 'add', 'README.md')
    git(repo, 'commit', '-m', 'base')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('cria branch e worktree no destino sanitizado', async () => {
    const result = await createWorktree(repo, 'Meu Workspace', 'sessao-1')

    expect(result.slug).toBe('Meu-Workspace')
    expect(result.branch).toBe('agente-window/sessao-1')
    expect(result.path).toBe(join(mocked.appDir, 'worktrees', 'Meu-Workspace', 'sessao-1'))
    expect(await readFile(join(result.path, 'README.md'), 'utf8')).toBe('base\n')
    expect(git(repo, 'worktree', 'list', '--porcelain')).toContain(`worktree ${result.path}`)
  })

  it('rejeita uma origem que não seja a raiz Git', async () => {
    const nested = join(repo, 'nested')
    await mkdir(nested)
    await expect(createWorktree(nested, 'workspace', 'sessao-2'))
      .rejects.toThrow('Configured workspace root is not the Git repository root')
  })

  it('preserva um destino preexistente quando a criação não pode começar', async () => {
    const destination = join(mocked.appDir, 'worktrees', 'workspace', 'sessao-3')
    await mkdir(destination, { recursive: true })
    await writeFile(join(destination, 'sentinela.txt'), 'não remover')
    await expect(createWorktree(repo, 'workspace', 'sessao-3')).rejects.toThrow('Worktree destination already exists')
    expect(await readFile(join(destination, 'sentinela.txt'), 'utf8')).toBe('não remover')
  })

  it('remove worktree limpo e sua branch gerenciada', async () => {
    const value = await createWorktree(repo, 'workspace', 'limpa')
    await removeWorktree(repo, value.path, 'limpa')
    expect(git(repo, 'branch', '--list', 'agente-window/limpa')).toBe('')
    expect(git(repo, 'worktree', 'list', '--porcelain')).not.toContain(value.path)
  })

  it('bloqueia remoção de caminho fora da raiz gerenciada', async () => {
    await expect(removeWorktree(repo, join(root, 'externo'), 'externo')).rejects.toThrow('outside the managed directory')
  })

  it('recusa worktree sujo sem remover seus arquivos', async () => {
    const value = await createWorktree(repo, 'workspace', 'suja')
    await writeFile(join(value.path, 'novo.txt'), 'mudança')
    await expect(removeWorktree(repo, value.path, 'suja')).rejects.toBeInstanceOf(WorktreeDirtyError)
    expect(await readFile(join(value.path, 'novo.txt'), 'utf8')).toBe('mudança')
  })

  it('remove worktree sujo somente quando force é confirmado', async () => {
    const value = await createWorktree(repo, 'workspace', 'forcada')
    await writeFile(join(value.path, 'novo.txt'), 'mudança')
    await removeWorktree(repo, value.path, 'forcada', true)
    expect(git(repo, 'worktree', 'list', '--porcelain')).not.toContain(value.path)
  })

  it('é idempotente quando o diretório gerenciado já desapareceu', async () => {
    const value = await createWorktree(repo, 'workspace', 'ausente')
    await rm(value.path, { recursive: true, force: true })
    await expect(removeWorktree(repo, value.path, 'ausente')).resolves.toBeUndefined()
  })

  it('descobre a origem por git-common-dir para registros antigos 06.2', async () => {
    const value = await createWorktree(repo, 'workspace', 'legada')
    await removeWorktree(value.path, value.path, 'legada')
    expect(git(repo, 'worktree', 'list', '--porcelain')).not.toContain(value.path)
  })
})
