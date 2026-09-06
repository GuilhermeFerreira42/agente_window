import fs from 'node:fs';
import path from 'node:path';
import type { ShellProfile } from './types.js';

interface ShellCandidate {
  id: string;
  label: string;
  paths: string[];
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function detectShellProfiles(platform: NodeJS.Platform = process.platform): Promise<ShellProfile[]> {
  const profiles: ShellProfile[] = [];

  if (platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env.LocalAppData || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';

    const candidates: ShellCandidate[] = [
      {
        id: 'pwsh',
        label: 'PowerShell 7',
        paths: [
          path.join(programFiles, 'PowerShell', '7', 'pwsh.exe'),
          path.join(programFilesX86, 'PowerShell', '7', 'pwsh.exe')
        ]
      },
      {
        id: 'powershell',
        label: 'Windows PowerShell',
        paths: [
          path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
        ]
      },
      {
        id: 'gitbash',
        label: 'Git Bash',
        paths: [
          path.join(programFiles, 'Git', 'bin', 'bash.exe'),
          path.join(programFilesX86, 'Git', 'bin', 'bash.exe'),
          path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe')
        ]
      },
      {
        id: 'cmd',
        label: 'Command Prompt',
        paths: [
          path.join(systemRoot, 'System32', 'cmd.exe')
        ]
      }
    ];

    for (const candidate of candidates) {
      for (const p of candidate.paths) {
        if (await fileExists(p)) {
          profiles.push({
            id: candidate.id,
            label: candidate.label,
            path: p
          });
          break;
        }
      }
    }
  } else {
    const candidates: ShellCandidate[] = [
      {
        id: 'bash',
        label: 'Bash',
        paths: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash']
      },
      {
        id: 'zsh',
        label: 'Zsh',
        paths: ['/bin/zsh', '/usr/bin/zsh', '/usr/local/bin/zsh']
      },
      {
        id: 'sh',
        label: 'sh',
        paths: ['/bin/sh', '/usr/bin/sh']
      }
    ];

    for (const candidate of candidates) {
      for (const p of candidate.paths) {
        if (await fileExists(p)) {
          profiles.push({
            id: candidate.id,
            label: candidate.label,
            path: p
          });
          break;
        }
      }
    }
  }

  return profiles;
}

export async function resolveShell(
  shellId?: string,
  platform: NodeJS.Platform = process.platform
): Promise<{ profile: ShellProfile; allProfiles: ShellProfile[] } | null> {
  const allProfiles = await detectShellProfiles(platform);
  if (allProfiles.length === 0) {
    return null;
  }

  if (shellId) {
    const matched = allProfiles.find((p) => p.id === shellId || p.path.toLowerCase() === shellId.toLowerCase());
    if (matched) {
      return { profile: matched, allProfiles };
    }
  }

  // Default selection
  // On Windows: pwsh -> powershell -> first available
  if (platform === 'win32') {
    const pwsh = allProfiles.find((p) => p.id === 'pwsh');
    if (pwsh) return { profile: pwsh, allProfiles };
    const powershell = allProfiles.find((p) => p.id === 'powershell');
    if (powershell) return { profile: powershell, allProfiles };
  }

  return { profile: allProfiles[0], allProfiles };
}
