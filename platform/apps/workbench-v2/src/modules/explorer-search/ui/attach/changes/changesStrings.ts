// ui/attach/changes/changesStrings.ts — 4.7-b. Textos OFICIAIS da extensão git /
// Source Control View do VS Code (extensions/git/package.nls.json + dist/main.js
// do runtime 8080 — 04_21 §1.4/§1.5). Único ponto de troca (sem i18n no workbench).
export const CHANGES_STRINGS = {
  tabLabel: 'Changes',
  noRepo: "The folder currently open doesn't have a Git repository.",
  initialize: 'Initialize Repository',
  refresh: 'Refresh',
  openChanges: 'Open Source Control',
  // 4.7-c: lista vazia (repo sem alterações) e tooltip/badge da aba fixa (contagem = provider `.count`)
  noChanges: 'No source control changes detected',
  filesChanged: (n: number) => (n === 1 ? '1 file changed' : `${n} files changed`),
  openDiffFailed: (name: string) => `Could not open changes for '${name}'`,
  // comandos (package.nls.json: command.stage / unstage / clean / stageAll / unstageAll / cleanAll)
  stage: 'Stage Changes',
  unstage: 'Unstage Changes',
  discard: 'Discard Changes',
  stageAll: 'Stage All Changes',
  unstageAll: 'Unstage All Changes',
  discardAll: 'Discard All Changes',
  cancel: 'Cancel',
  // diálogos — VERIFICADOS no dist/main.js da extensão git (runtime 8080, VS Code 1.135):
  //   clean (só rastreados): 1 → "…discard changes in '{0}'?" [Discard File]
  //                          n → "…discard ALL changes in {0} files?\n\nThis is IRREVERSIBLE!…" [Discard All {0} Files]
  //   untracked:             1 → "…DELETE the following untracked file: '{0}'?" + detalhe [Delete File]
  //                          n → "…DELETE the {0} untracked files?" + detalhe [Delete Files]
  //   misto:                 pergunta dos untracked + pergunta dos rastreados [Discard All {0} Files]
  discardOne: (name: string) => `Are you sure you want to discard changes in '${name}'?`,
  discardAllMessage: (n: number) => `Are you sure you want to discard ALL changes in ${n} files?`,
  discardDetail: 'This is IRREVERSIBLE!\nYour current working set will be FOREVER LOST if you proceed.',
  discardFile: 'Discard File',
  discardAllFiles: (n: number) => `Discard All ${n} Files`,
  deleteUntrackedOne: (name: string) => `Are you sure you want to DELETE the following untracked file: '${name}'?`,
  deleteUntrackedMany: (n: number) => `Are you sure you want to DELETE the ${n} untracked files?`,
  deleteUntrackedDetail: 'This is IRREVERSIBLE!\nThis file will be FOREVER LOST if you proceed.',
  deleteUntrackedManyDetail: 'This is IRREVERSIBLE!\nThese files will be FOREVER LOST if you proceed.',
  deleteFile: 'Delete File',
  deleteFiles: 'Delete Files',
} as const;
