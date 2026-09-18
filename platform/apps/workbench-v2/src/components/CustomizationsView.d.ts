import { type HarnessDescriptor, type EnablementState, type CustomizationItem, type ProjectedItem } from '../domain/aiCustomizations';
interface CustomizationsViewProps {
    items: readonly CustomizationItem[];
    harnesses: readonly HarnessDescriptor[];
    harnessId: string;
    enablement: EnablementState;
    onChangeHarness: (id: string) => void;
    onToggleEnablement: (item: ProjectedItem) => void;
    onRunSkill: (item: ProjectedItem) => void;
    onRevealItem: (item: ProjectedItem) => void;
    /** true quando renderizada dentro do Custom View Grid (o grid já dá o título). */
    embedded?: boolean;
}
export declare function CustomizationsView({ items, harnesses, harnessId, enablement, onChangeHarness, onToggleEnablement, onRunSkill, onRevealItem, embedded, }: CustomizationsViewProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=CustomizationsView.d.ts.map