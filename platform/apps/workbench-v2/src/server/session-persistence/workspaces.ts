import { execFile } from 'node:child_process'
import { readdirSync, realpathSync, statSync } from 'node:fs'
import { readFile, realpath, stat, writeFile, mkdir } from 'node:fs/promises'
import { basename, dirname, join, parse, resolve } from 'node:path'
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
  const existing = current.filter((item) => {
    try { return statSync(item).isDirectory() } catch { return false }
  })
  const next = [path, ...existing.filter((item) => item !== path)].slice(0, 10)
  await mkdir(dirname(recentPath()), { recursive: true })
  await writeFile(recentPath(), `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  return next
}

export async function listRecentWorkspaces(): Promise<string[]> {
  try { return (JSON.parse(await readFile(recentPath(), 'utf8')) as string[]).slice(0, 10) } catch { return [] }
}

export interface WorkspaceDirectoryEntry { name: string; path: string; isDir: true }
export interface WorkspaceDirectoryListing { path: string; realpath: string; parent: string; folders: WorkspaceDirectoryEntry[]; error?: 'permission' | 'not_found' | 'not_directory' }

/** Contrato síncrono e pequeno usado pelo Command-Palette-like workspace switcher. */
export function listWorkspaceDirectories(pathInput: string): WorkspaceDirectoryListing {
  const requested = pathInput.trim() || parse(resolve('.')).root
  try {
    const canonical = realpathSync(requested)
    if (!statSync(canonical).isDirectory()) return { path: requested, realpath: canonical, parent: dirname(canonical), folders: [], error: 'not_directory' }
    const folders = readdirSync(canonical, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ name: entry.name, path: join(canonical, entry.name), isDir: true as const }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    return { path: requested, realpath: canonical, parent: dirname(canonical), folders }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    return { path: requested, realpath: requested, parent: dirname(requested), folders: [], error: code === 'EACCES' || code === 'EPERM' ? 'permission' : 'not_found' }
  }
}

export function validateWorkspacePath(pathInput: string): { valid: boolean; realpath: string; exists: boolean; isDir: boolean } {
  try {
    const canonical = realpathSync(pathInput.trim())
    const isDir = statSync(canonical).isDirectory()
    return { valid: isDir, realpath: canonical, exists: true, isDir }
  } catch {
    return { valid: false, realpath: pathInput.trim(), exists: false, isDir: false }
  }
}

export async function pickWorkspaceDirectory(): Promise<string | undefined> {
  if (process.platform !== 'win32') throw new Error('Native workspace picker is only available on Windows')
  // IFileOpenDialog nativo (Vista+): janela Explorer moderna, com favoritos,
  // breadcrumbs/barra de endereço e resize. Não usar FolderBrowserDialog antigo.
  const script = String.raw`
$source = @'
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")] class FileOpenDialogRCW {}
[ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IFileDialog {
 [PreserveSig] int Show(IntPtr parent); void SetFileTypes(uint c, IntPtr f); void SetFileTypeIndex(uint i); void GetFileTypeIndex(out uint i); void Advise(IntPtr e, out uint c); void Unadvise(uint c); void SetOptions(uint o); void GetOptions(out uint o); void SetDefaultFolder(IntPtr s); void SetFolder(IntPtr s); void GetFolder(out IntPtr s); void GetCurrentSelection(out IntPtr s); void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string n); void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string n); void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string t); void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string t); void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string t); void GetResult(out IShellItem item); void AddPlace(IntPtr s, int f); void SetDefaultExtension(string e); void Close(int hr); void SetClientGuid(ref Guid g); void ClearClientData(); void SetFilter(IntPtr f);
}
[ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IShellItem { void BindToHandler(IntPtr p, ref Guid b, ref Guid r, out IntPtr v); void GetParent(out IShellItem p); void GetDisplayName(uint s, [MarshalAs(UnmanagedType.LPWStr)] out string n); }
public sealed class CommonOpenFileDialog {
 public bool IsFolderPicker { get; set; }
 public string ShowDialog() { IFileDialog d=(IFileDialog)new FileOpenDialogRCW(); uint options=0x40u|0x800u; if(IsFolderPicker) options|=0x20u; d.SetOptions(options); d.SetTitle("Selecione uma pasta de workspace"); if(d.Show(IntPtr.Zero)!=0) return null; IShellItem i; d.GetResult(out i); string p; i.GetDisplayName(0x80058000u,out p); return p; }
}
'@
Add-Type -TypeDefinition $source -Language CSharp
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object CommonOpenFileDialog
$dialog.IsFolderPicker = $true
$p = $dialog.ShowDialog()
if ($p) { Write-Output $p }
`
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { windowsHide: true, maxBuffer: 64 * 1024 })
  return stdout.trim() || undefined
}
