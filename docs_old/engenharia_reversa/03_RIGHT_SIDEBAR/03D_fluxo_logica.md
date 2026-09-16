# 03D - Fluxo de Lógica e Dados: Right Sidebar

## 1. Fluxo de Alternância de Visibilidade (Toggle)
A sequência de eventos para abrir/fechar a barra:
1. **Trigger**: Usuário clica no ícone de layout ou usa `Ctrl+Alt+B`.
2. **Action**: `ToggleAuxiliaryBarAction.run()` é disparado.
3. **Service**: Chama `IWorkbenchLayoutService.toggleSecondarySideBar()`.
4. **State Update**: O `LayoutService` inverte a visibilidade de `Parts.AUXILIARYBAR_PART`.
5. **UI Update**: O `AuxiliaryBarPart` recebe a notificação de layout e executa `updateStyles()`, ajustando bordas e cores.

## 2. Fluxo de Maximização
O processo de expansão total da barra:
1. **Trigger**: Ação `workbench.action.maximizeAuxiliaryBar`.
2. **Execution**: `layoutService.setAuxiliaryBarMaximized(true)`.
3. **Side Effect**: 
    - `Parts.EDITOR_PART` $\rightarrow$ `setPartHidden(true)`.
    - `Parts.PANEL_PART` $\rightarrow$ `setPartHidden(true)`.
4. **UI Result**: A barra secundária expande para ocupar 100% da largura do container principal.

## 3. Fluxo de Renderização de Conteúdo (Views)
Como as views aparecem na Right Sidebar:
1. **Registration**: Uma extensão registra uma view em `ViewContainerLocation.AuxiliaryBar`.
2. **Discovery**: `IViewDescriptorService` mapeia todas as views atribuídas a esse local.
3. **Composition**: `AuxiliaryBarPart` utiliza `IPaneCompositeBar` para criar os botões de acesso rápido (ícones) no topo da barra.
4. **Activation**: Ao clicar em um ícone, o `PaneCompositePartService` ativa o container correspondente, renderizando a view no corpo da barra.

## 4. Fluxo de Atualização de Configuração
1. **Change**: Usuário altera `workbench.secondarySideBar.showLabels` nas configurações.
2. **Listen**: `AuxiliaryBarPart` ouve `configurationService.onDidChangeConfiguration`.
3. **Update**: O método `resolveConfiguration()` é chamado $\rightarrow$ `updateCompositeBar(true)` é executado para redesenhar a barra de ícones com ou sem texto.
