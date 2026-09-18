import type { ShellProfile } from './types.js';
export declare function detectShellProfiles(platform?: NodeJS.Platform): Promise<ShellProfile[]>;
export declare function resolveShell(shellId?: string, platform?: NodeJS.Platform): Promise<{
    profile: ShellProfile;
    allProfiles: ShellProfile[];
} | null>;
//# sourceMappingURL=shellDetector.d.ts.map