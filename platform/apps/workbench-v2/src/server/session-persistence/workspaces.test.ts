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
    expect(value).toEqual({ path: resolve(repo), name: 'Repo Com Espaço', slug: 'Repo-Com-Espa-o' })
  })
  it('rejeita caminho inexistente', async () => {
    await expect(validateWorkspace(join(root, 'ausente'))).rejects.toThrow()
  })
  it('rejeita arquivo', async () => {
    await expect(validateWorkspace(join(repo, 'README.md'))).rejects.toThrow('not a directory')
  })
  it('rejeita subdiretório que não seja a raiz Git', async () => {
    const nested = join(repo, 'src'); await mkdir(nested)
    await expect(validateWorkspace(nested)).rejects.toThrow('Git repository root')
  })
  it('não tenta usar FileSystemDirectoryHandle e declara diálogo não suportado fora do Windows', async () => {
    if (process.platform !== 'win32') await expect(pickWorkspaceDirectory()).rejects.toThrow('only available on Windows')
  })
})
