import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pickWorkspaceDirectory, validateWorkspace } from './workspaces'

function git(cwd: string, ...args: string[]): void { execFileSync('git', ['-C', cwd, ...args]) }

describe('workspace server contract', () => {
  let root: string
  let repo: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'workspace-contract-'))
    repo = join(root, 'Repo Com Espaço')
    await mkdir(repo)
    git(repo, 'init'); git(repo, 'config', 'user.email', 'tests@example.com'); git(repo, 'config', 'user.name', 'Tests')
    await writeFile(join(repo, 'README.md'), 'base\n'); git(repo, 'add', '.'); git(repo, 'commit', '-m', 'base')
  })
  afterEach(async () => { await rm(root, { recursive: true, force: true }) })

  it('valida e canonicaliza uma raiz Git', async () => {
    const value = await validateWorkspace(repo)
    expect(value).toEqual({ path: resolve(repo), name: 'Repo Com Espaço', slug: 'Repo-Com-Espa-o', isGit: true })
  })
  it('rejeita caminho inexistente', async () => {
    await expect(validateWorkspace(join(root, 'ausente'))).rejects.toThrow()
  })
  it('rejeita arquivo', async () => {
    await expect(validateWorkspace(join(repo, 'README.md'))).rejects.toThrow('not a directory')
  })
  it('aceita pasta sem Git no fluxo padrão', async () => {
    const plain = join(root, 'pasta-sem-git'); await mkdir(plain)
    await expect(validateWorkspace(plain)).resolves.toMatchObject({ path: resolve(plain), isGit: false })
  })
  it('exige Git somente quando requireGit está ativo', async () => {
    const plain = join(root, 'pasta-sem-git'); await mkdir(plain)
    await expect(validateWorkspace(plain, true)).rejects.toMatchObject({ code: 'worktree_requires_git' })
  })
  it('não tenta usar FileSystemDirectoryHandle e declara diálogo não suportado fora do Windows', async () => {
    if (process.platform !== 'win32') await expect(pickWorkspaceDirectory()).rejects.toThrow('only available on Windows')
  })
})
