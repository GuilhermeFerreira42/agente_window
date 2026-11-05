// ui/attach/attachStrings.ts — 4.7 c5. Strings centralizadas do Editor Anexo
// (sem i18n no workbench; único ponto de troca). Espelham
// textFileSaveErrorHandler / fileEditorInput do VS Code.
export const ATTACH_STRINGS = {
  saveTitle: (name: string) => `Deseja salvar as alterações feitas em ${name}?`,
  saveDetail: 'Suas alterações serão perdidas se você não as salvar.',
  save: 'Salvar',
  dontSave: 'Não Salvar',
  cancel: 'Cancelar',
  conflictTitle: (name: string) => `O arquivo ${name} foi modificado externamente. Deseja recarregar?`,
  conflictDetail: 'Recarregar descarta as alterações não salvas deste editor. Manter mantém o que você editou; ao salvar, o conteúdo do disco será sobrescrito.',
  reload: 'Recarregar',
  keep: 'Manter Alterações',
  saveFailed: (name: string, reason: string) => `Falha ao salvar ${name}: ${reason}`,
  closeDialog: 'Fechar diálogo',
  warning: 'Aviso',
  // c6 — cabeçalho (04_05 §1: ✕ recolher · ⤢ maximizar dentro da sessão)
  maximize: 'Maximizar editor anexo',
  restore: 'Restaurar tamanho do editor anexo',
  collapse: 'Recolher editor anexo',
  // c6 — empty state (editorGroupWatermark: dicas com atalhos REAIS do shell)
  emptyTitle: 'Nenhum arquivo aberto',
  emptyHint: 'Selecione um arquivo na árvore ao lado ou use um atalho:',
  emptyShortcuts: 'Atalhos',
} as const;
