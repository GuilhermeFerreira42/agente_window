# 03 - LAYOUT (R-023 a R-028) - LAYOUT.md

## Original manda:
Topologia fixa:
Title bar
Content
├── Sidebar (Sessions list)
└── Main region
    ├── Sessions Part | Editor | Auxiliary Bar | Custom View Grid | Panel
Grid não-proporcional: Sessions Part é flexível que absorve resize, Sidebar/Editor/Aux/Panel preservam tamanho
Sessions Part contém horizontal grid interno, leaves NÃO são editor groups
Workbench omite Activity Bar, Status Bar, Banner
Posições fixas não por user settings

## Réplica hoje:
- Usa PanelGroup do react-resizable-panels mas partSizesForSession só retorna [50,50] fixo
- Não implementa Custom View Grid (view que substitui tudo)
- Sidebar width salvo mas não restaurado corretamente - clamp funciona mas não aplica no style
- Editor pode ser hidden mas tab bar some junto (deveria ficar visível)

## Arquivos:
- src/App.tsx - workbench-body, PanelGroup
- src/domain/layoutPersistence.ts
- src/components/SessionSidebar.tsx, EditorArea.tsx, AuxiliaryBar.tsx
- src/styles/app.css vs original workbench.css
