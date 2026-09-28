// diffStrings.ts — textos oficiais do VS Code usados pela aba Diff (4.7-c).
//   "No changes detected"   → diffEditor (accessibleDiffViewer / notification quando os lados são iguais)
//   "(Working Tree)" / "(Index)" → sufixos de título do `git.openChange` (extensão git)
export const DIFF_STRINGS = {
  tabLabel: 'Diff',
  noChanges: 'No changes detected',
  workingTree: 'Working Tree',
  index: 'Index',
  titleWorkingTree: (name: string) => `${name} (Working Tree)`,
  titleIndex: (name: string) => `${name} (Index)`,
} as const;
