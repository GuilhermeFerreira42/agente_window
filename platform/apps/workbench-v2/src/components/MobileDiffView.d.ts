import type { DiffFile } from '../types';
interface MobileDiffViewProps {
    files: DiffFile[];
    selectedFileId?: string;
    onSelectFile: (id: string) => void;
    onClose: () => void;
}
export declare function MobileDiffView({ files, selectedFileId, onSelectFile, onClose }: MobileDiffViewProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=MobileDiffView.d.ts.map