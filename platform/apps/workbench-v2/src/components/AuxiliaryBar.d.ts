import type { DiffFile, Session } from '../types';
import type { FileSystemEntry } from '../domain/fileSystem';
type FolderExpansionState = Readonly<Record<string, boolean>>;
interface AuxiliaryBarProps {
    session: Session;
    visible: boolean;
    diffFiles: DiffFile[];
    tab: 'changes' | 'files';
    checksExpanded: boolean;
    expandedFolders: FolderExpansionState;
    onChangeTab: (tab: 'changes' | 'files') => void;
    onOpenDiff: (fileId?: string) => void;
    onOpenFile: (path: string) => void;
    onToggleChecks: () => void;
    onToggleFolder: (folderName: string) => void;
    onRerunChecks: (checkName?: string) => void;
    onOpenCheck: (checkName: string) => void;
    onPreparePr: () => void;
    onMerge: () => void;
    onOpenTerminal: () => void;
    onClose: () => void;
    fileSystemEntries?: FileSystemEntry[];
    fileSystemRootName?: string;
    fileSystemLoading?: boolean;
    isFileSystemSupported?: boolean;
    onPickDirectory?: () => void;
    onClearDirectory?: () => void;
    onOpenFileHandle?: (entry: FileSystemEntry) => void;
}
export declare function AuxiliaryBar({ session, visible, diffFiles, tab, checksExpanded, expandedFolders, onChangeTab, onOpenDiff, onOpenFile, onToggleChecks, onToggleFolder, onRerunChecks, onOpenCheck, onPreparePr, onMerge, onOpenTerminal, onClose, fileSystemEntries, fileSystemRootName, fileSystemLoading, isFileSystemSupported, onPickDirectory, onClearDirectory, onOpenFileHandle, }: AuxiliaryBarProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=AuxiliaryBar.d.ts.map