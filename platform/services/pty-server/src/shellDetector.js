import fs from 'node:fs';
import path from 'node:path';
async function fileExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
export async function detectShellProfiles(platform = process.platform) {
    const profiles = [];
    if (platform !== 'win32' && platform !== 'linux' && platform !== 'darwin') {
        return profiles;
    }
    if (platform === 'win32') {
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const localAppData = process.env.LocalAppData || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
        const systemRoot = process.env.SystemRoot || 'C:\\Windows';
        const candidates = [
            {
                id: 'pwsh',
                label: 'PowerShell 7',
                paths: [
                    path.join(programFiles, 'PowerShell', '7', 'pwsh.exe'),
                    path.join(programFilesX86, 'PowerShell', '7', 'pwsh.exe'),
                ],
            },
            {
                id: 'powershell',
                label: 'Windows PowerShell',
                paths: [path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')],
            },
            {
                id: 'gitbash',
                label: 'Git Bash',
                paths: [
                    path.join(programFiles, 'Git', 'bin', 'bash.exe'),
                    path.join(programFilesX86, 'Git', 'bin', 'bash.exe'),
                    path.join(localAppData, 'Programs', 'Git', 'bin', 'bash.exe'),
                ],
            },
            {
                id: 'cmd',
                label: 'Command Prompt',
                paths: [path.join(systemRoot, 'System32', 'cmd.exe')],
            },
        ];
        for (const candidate of candidates) {
            for (const candidatePath of candidate.paths) {
                if (await fileExists(candidatePath)) {
                    profiles.push({ id: candidate.id, label: candidate.label, path: candidatePath });
                    break;
                }
            }
        }
        return profiles;
    }
    const candidates = [
        {
            id: 'bash',
            label: 'Bash',
            paths: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash'],
        },
        {
            id: 'sh',
            label: 'sh',
            paths: ['/bin/sh', '/usr/bin/sh'],
        },
    ];
    for (const candidate of candidates) {
        for (const candidatePath of candidate.paths) {
            if (await fileExists(candidatePath)) {
                profiles.push({ id: candidate.id, label: candidate.label, path: candidatePath });
                break;
            }
        }
    }
    return profiles.filter((profile) => profile.id !== 'pwsh' && profile.id !== 'powershell');
}
export async function resolveShell(shellId, platform = process.platform) {
    const allProfiles = await detectShellProfiles(platform);
    if (allProfiles.length === 0) {
        return null;
    }
    if (shellId) {
        const matched = allProfiles.find((profile) => profile.id === shellId || profile.path.toLowerCase() === shellId.toLowerCase());
        if (matched) {
            return { profile: matched, allProfiles };
        }
    }
    if (platform === 'win32') {
        const pwsh = allProfiles.find((profile) => profile.id === 'pwsh');
        if (pwsh)
            return { profile: pwsh, allProfiles };
        const powershell = allProfiles.find((profile) => profile.id === 'powershell');
        if (powershell)
            return { profile: powershell, allProfiles };
    }
    const bash = allProfiles.find((profile) => profile.id === 'bash');
    if (bash)
        return { profile: bash, allProfiles };
    return { profile: allProfiles[0], allProfiles };
}
//# sourceMappingURL=shellDetector.js.map