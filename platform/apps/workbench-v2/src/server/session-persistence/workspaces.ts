import { execFile } from 'node:child_process'
import { realpath, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { promisify } from 'node:util'
import { sanitizePath } from './paths'

const execFileAsync = promisify(execFile)

export interface WorkspaceDescriptor {
  path: string
  slug: string
  name: string
}

export async function validateWorkspace(pathInput: string): Promise<WorkspaceDescriptor> {
  if (!pathInput?.trim()) throw new Error('Workspace path is required')
  const path = await realpath(pathInput.trim())
  if (!(await stat(path)).isDirectory()) throw new Error('Workspace path is not a directory')
  const { stdout } = await execFileAsync('git', ['-C', path, 'rev-parse', '--show-toplevel'], { windowsHide: true })
  const topLevel = await realpath(stdout.trim())
  if (resolve(topLevel) !== resolve(path)) throw new Error('Selected workspace must be the Git repository root')
  const name = basename(path)
  return { path, name, slug: sanitizePath(name) }
}

export async function pickWorkspaceDirectory(): Promise<string | undefined> {
  if (process.platform !== 'win32') throw new Error('Native workspace picker is only available on Windows')
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$dialog.Description = 'Selecione a raiz de um repositorio Git'",
    '$dialog.ShowNewFolderButton = $false',
    'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
    '  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '  Write-Output $dialog.SelectedPath',
    '}',
  ].join('\n')
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
    windowsHide: true,
    maxBuffer: 64 * 1024,
  })
  return stdout.trim() || undefined
}
