# TAREFA SINGLE PANE

### Passo 1 - Fix crash Mostrar Editor
- Em App.tsx, ao mostrar editor: usar showEditorRestore na ordem correta: primeiro tabs, depois browserViews
- Usar skipInvariantCheck ref para pular assertWorkbenchInvariants durante transição atômica

### Passo 2 - Browser transient rule
- Em resolveDetailPanelVisible: se activeTabType === 'browser' && editorContentVisible => false (esconde detail temporariamente)
- Se editorHidden=true enquanto browser ativo, detail deve voltar (não deixar em branco)

### Passo 3 - CannotClose managed tabs
- Em EditorArea.tsx onCloseTab: verificar isTabCloseable(tab, sidePaneState) - se false não fechar

### Passo 4 - Bordas residuais R-070
- CSS: ao recolher coluna, remover border-left/right residual

### Critério: Hide/Show editor 10x sem crash, browser tab não deixa painel em branco, Changes/Files não fecham em detail-only
