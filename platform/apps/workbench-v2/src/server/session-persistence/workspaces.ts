import { execFile } from 'node:child_process'
import { readFile, realpath, stat, writeFile, mkdir } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { promisify } from 'node:util'
import { getAppDir, sanitizePath } from './paths'

const execFileAsync = promisify(execFile)
const recentPath = () => `${getAppDir()}/recent-workspaces.json`

export interface WorkspaceDescriptor { path: string; slug: string; name: string; isGit: boolean }

export class WorktreeRequiresGitError extends Error {
  readonly code = 'worktree_requires_git'
  constructor() { super('Worktree mode requires a Git repository root'); this.name = 'WorktreeRequiresGitError' }
}

async function gitRoot(path: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', path, 'rev-parse', '--show-toplevel'], { windowsHide: true })
    return await realpath(stdout.trim())
  } catch { return undefined }
}

export async function validateWorkspace(pathInput: string, requireGit = false): Promise<WorkspaceDescriptor> {
  if (!pathInput?.trim()) throw new Error('Workspace path is required')
  const path = await realpath(pathInput.trim())
  if (!(await stat(path)).isDirectory()) throw new Error('Workspace path is not a directory')
  const root = await gitRoot(path)
  const isGit = Boolean(root && root === path)
  if (requireGit && !isGit) throw new WorktreeRequiresGitError()
  const name = basename(path)
  return { path, name, slug: sanitizePath(name), isGit }
}

export async function rememberWorkspace(path: string): Promise<string[]> {
  let current: string[] = []
  try { current = JSON.parse(await readFile(recentPath(), 'utf8')) as string[] } catch { /* first use */ }
  const next = [path, ...current.filter((item) => item !== path)].slice(0, 10)
  await mkdir(dirname(recentPath()), { recursive: true })
  await writeFile(recentPath(), `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}

export async function listRecentWorkspaces(): Promise<string[]> {
  try { return (JSON.parse(await readFile(recentPath(), 'utf8')) as string[]).slice(0, 10) } catch { return [] }
}

export async function pickWorkspaceDirectory(): Promise<string | undefined> {
  if (process.platform !== 'win32') throw new Error('Native workspace picker is only available on Windows')
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms', '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$dialog.Description = 'Selecione uma pasta de workspace'", '$dialog.ShowNewFolderButton = $true',
    'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
    '  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8', '  Write-Output $dialog.SelectedPath', '}',
  ].join('\n')
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { windowsHide: true, maxBuffer: 64 * 1024 })
  return stdout.trim() || undefined
}
