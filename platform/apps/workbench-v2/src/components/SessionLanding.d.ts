interface SessionLandingProps {
    workspace: string;
    onSubmit: (text: string) => void;
    onChangeMode?: () => void;
    onChangeModel?: () => void;
    onAddContext?: () => void;
    onDictate?: () => void;
    onPickWorkspace?: () => void;
    isFileSystemSupported?: boolean;
}
export declare function SessionLanding({ workspace, onSubmit, onChangeMode, onChangeModel, onAddContext, onDictate, onPickWorkspace, isFileSystemSupported }: SessionLandingProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=SessionLanding.d.ts.map