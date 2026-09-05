# COMPORTAMENTO REAL - LAYOUT TOPOLOGIA

## Vídeo novo [02:35] comparação layout original
Você mostra lado a lado original vs réplica - layout totalmente diferente

## Comportamento original real
1. Topologia fixa: Title bar em cima, Sidebar esquerda com width variável via CSS var, Main region com Sessions Part + Editor + Aux Bar
2. Sessions Part é flexível (flex:1), absorve resize - Sidebar/Editor/Aux/Panel preservam tamanho
3. Custom View Grid: quando CustomizationsView ativa, deve esconder Sessions Part, Editor, Aux Bar, Panel - só Titlebar e Sidebar ficam. Abrir sessão deve dismiss custom view.
4. Tab bar permanece visível mesmo quando editorHidden=true (keepForDockedTabBar)
5. Sessions Part contém horizontal grid interno, leaves NÃO são editor groups
6. Workbench omite Activity Bar, Status Bar, Banner - posições fixas não por user settings

## O que deveria acontecer
- Sidebar width salvo mas restaurado corretamente - clamp funciona mas aplica no style
- Editor pode ser hidden mas tab bar fica visível (não some junto)
- Resize janela, só Sessions Part absorve delta, não Sidebar
- Custom View Grid substitui tudo quando ativo
