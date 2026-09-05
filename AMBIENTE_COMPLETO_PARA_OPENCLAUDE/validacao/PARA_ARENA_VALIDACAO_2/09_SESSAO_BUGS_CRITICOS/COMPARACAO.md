# 09 - BUGS CRÍTICOS (R-066 a R-087) - Faltas graves da Validação 1 + Vídeo

Lista de requisitos que estavam como FALTA/ENFEITE/MOCK na Validação 1 e que aparecem no vídeo:

- R-066/086: Bug tela inicial - esconde laterais em vez de só centralizar meio (vídeo 00:33)
- R-070: Bordas residuais ao recolher colunas
- R-072: SEM menu de contexto (botão direito) em lugar nenhum - CRÍTICO
- R-073: Pill de busca não abre picker flutuante
- R-076: SEM navegação por teclado (roving index)
- R-083: Changes pill não é clicável
- R-085: SEM drag & drop - CRÍTICO
- R-060: Changes view existe mas não abre diff ao clicar
- R-059, R-061, R-071, R-075: Deveriam ser DUVIDA_UI - precisam teste clicando

## Original manda:
- Context menu em SessionRow, NestedChatRow, EditorTab, Workspace Files
- Drag & drop de sessões (reorder) e editor tabs (reorder)
- Keyboard navigation: Tab, ArrowUp/Down, Enter, Escape, roving index
- Search pill abre picker flutuante com filtros
- Changes pill clicável abre Changes view

## Réplica:
- ContextMenu.tsx existe mas nunca usado em SessionSidebar e EditorArea
- dragAndDrop.ts existe com reorderSessions e reorderEditorTabs mas não conectado
- keyboardNavigation.ts existe com isNavigationKey, nextRovingIndex mas não usado
