# 02D - Análise de Grafo e Fluxo de Dados

## 1. Fluxo de Eventos: Troca de Viewlet
`User Click (Activity Bar Icon)` $\rightarrow$ `ActivityBarCompositeBar.onAction()` $\rightarrow$ `SidebarPart.setActiveComposite()` $\rightarrow$ `IViewsService.setActiveViewContainer()` $\rightarrow$ `ViewContainer.setVisible(true)` $\rightarrow$ `UI Render`.

## 2. Dependências de Estado (State Graph)
- **Configuração** $\rightarrow$ **Posição da Activity Bar**:
    - `LayoutSettings.ACTIVITY_BAR_LOCATION` $\rightarrow$ `ActivitybarPart.updateStyles()` $\rightarrow$ Alteração de CSS (Vertical vs Horizontal).
- **Visibilidade** $\rightarrow$ **Sash (Divisor)**:
    - `IWorkbenchLayoutService.isVisible(SIDEBAR_PART)` $\rightarrow$ `SidebarPart.setBoundarySashes()` $\rightarrow$ Atribuição de classes ao sash (`primary-sidebar-sash`).

## 3. Ciclo de Vida de Renderização
1. `SidebarPart.constructor` $\rightarrow$ Instancia `ActivitybarPart`.
2. `SidebarPart.createCompositeBar()` $\rightarrow$ Configura as opções de `PaneCompositeBar` (icones, cores, orientação).
3. `ActivitybarPart.createContentArea()` $\rightarrow$ Adiciona o elemento `.content` ao DOM.
4. `ActivitybarPart.show()` $\rightarrow$ Cria a `ActivityBarCompositeBar` e a anexa ao DOM.
