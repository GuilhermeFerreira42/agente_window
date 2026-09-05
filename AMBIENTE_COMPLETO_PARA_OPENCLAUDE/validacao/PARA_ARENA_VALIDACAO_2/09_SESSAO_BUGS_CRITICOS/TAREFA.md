# TAREFA - BUGS CRÍTICOS

### R-072 Menu Contexto
Arquivos: SessionSidebar.tsx, EditorArea.tsx, AuxiliaryBar.tsx, ContextMenu.tsx
- Já existe ContextMenu component com state {x,y,items}
- Conectar:
  - SessionRow onContextMenu => setContextMenu({x: e.clientX, y: e.clientY, items: [{label:'Fixar', action:()=>onTogglePinned(id)}, {label:'Renomear', ...}, {label:'Arquivar', ...}, {label:'Excluir', ...}]})
  - NestedChatRow idem
  - EditorArea tab onContextMenu => Fechar, Fechar outros, Fechar à direita
  - Workspace Files file onContextMenu => Abrir, Renomear, Excluir, Revelar no Explorer

### R-085 Drag & Drop
Arquivos: SessionSidebar.tsx, EditorArea.tsx, domain/dragAndDrop.ts
- SessionSidebar:
  - draggable=true no SessionRow
  - onDragStart e.dataTransfer.setData(DragTypes.SESSION, sessionId)
  - onDragOver, onDrop => canReorderSessions, reorderSessions
- EditorArea:
  - Tab draggable, DragTypes.EDITOR_TAB
  - reorderEditorTabs

### R-076 Teclado
Arquivo: domain/keyboardNavigation.ts + SessionSidebar.tsx + EditorArea.tsx
- Implementar roving index:
  - activeIndex state, onKeyDown verifica isNavigationKey
  - ArrowDown/Up => nextRovingIndex
  - Enter => onSelectSession
  - Tab navega entre seções

### R-070 Bordas residuais
- CSS app.css: ao colapsar Panel ou Sidebar, remover border

### R-073 Search Pill
- Pill de busca em ChatPanel? Deve abrir SessionsPicker flutuante (já existe componente SessionsPicker)
- onClick => setSessionPickerOpen(true)

### R-083 Changes Pill
- Pill Changes em Titlebar/AuxiliaryBar deve ser clicável e abrir diff view

### Critério:
- Botão direito em sessão abre menu
- Arrastar sessão muda ordem
- Teclado navega lista
- Sem bordas residuais
