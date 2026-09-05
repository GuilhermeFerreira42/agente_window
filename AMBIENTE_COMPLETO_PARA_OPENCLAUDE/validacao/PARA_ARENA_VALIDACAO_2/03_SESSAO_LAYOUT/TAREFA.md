# TAREFA - LAYOUT

### Passo 1 - Topologia fixa
- Garantir ordem: Titlebar em cima, Sidebar esquerda com width variável via --sidebar-width CSS var, Main region com Sessions Part + Editor + Aux Bar
- Sessions Part deve ser flexível (flex:1), absorver resize
- Implementar partSizesForSession salvando tamanhos por sessionId no localStorage (LAYOUT_STORAGE_KEY)

### Passo 2 - Custom View Grid
- Quando CustomizationsView ativa, deve esconder Sessions Part, Editor, Aux Bar, Panel - só Titlebar e Sidebar ficam
- Abrir sessão deve dismiss custom view

### Passo 3 - Tab bar invariante
- Em single-pane, tab bar permanece visível mesmo quando editorHidden=true (keepForDockedTabBar)

### Critério: Layout não quebra ao esconder/mostrar editor, sidebar preserva width após F5
